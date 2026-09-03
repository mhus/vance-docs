---
title: "Vancetope — Fook Service"
parent: Specs
permalink: /specs/fook-service
---

<!-- AUTO-GENERATED from llm/specification/fook-service.md (translated from the German specification/public/fook-service.md) — do not edit here. -->

# Vancetope — Fook Service

> Built-in bug/feature triage system: a reporter (LLM or user) sends
> free text, Fook asynchronously decides whether to create a new ticket,
> merge it into an existing one, or discard it. The subsequent processing
> of tickets (status transitions, fixes, PR sync) is handled by
> **Lunkwill** — not in scope here.
>
> Architecture: `LightLlmService` with Recipe `fook` as a
> configuration profile, plus a thin service with an in-memory queue
> and worker tick. No dedicated `ThinkEngine`, no Process spawn, no
> Lane lock.
>
> See also: [light-llm-service](/specs/light-llm-service) |
> [recipes](/specs/recipes) | [user-interaction](/specs/user-interaction) |
> [architecture-scopes-clients](/specs/architektur-scopes-clients)

---

## 1. Purpose & Scope

**Problem.** Vancetope bugs, feature requests, and documentation gaps
require a low-threshold reporting channel — both for running Engines
("I cannot perform this operation, but it should be possible") and for
human users in Web and Foot. Without a built-in path, bugs disappear
into Sessions and user minds.

**Solution.** Three reporter channels all feed into the same pipeline:

- **LLM Tool `vance_support_request(text)`** — any Engine can
  autonomously report if it detects a Vancetope deficiency.
  Rate-limit max. 3 per Process-Lifetime against loop spam.
- **Web Fook Button** in the user menu of `EditorTopbar` (globally
  accessible across all editors), opens a modal with a textarea.
- **Foot `/support` Slash Command** with two modes: inline
  (`/support Brain crashed on boot`) or, without args, a
  Lanterna multi-line form.

All three call the same `FookService.submit()` server-side. The
service queues in-memory, a worker tick calls the
[`LightLlmService`](/specs/light-llm-service) with Recipe `fook`, the
result is applied as a Document side-effect, and an Inbox item is
created for the reporter.

**What Fook is not:**

- Not a ticket editor — tickets are stored as YAML Documents in the
  `_vance` Tenant; UI for this comes with Lunkwill.
- No status lifecycle after `new` — transitions to
  `triaged`/`accepted`/`in_progress`/`resolved`/`closed` are set by
  Lunkwill.
- No GitHub/Jira sync, no fix suggestion, no PR generation — all
  Lunkwill.
- No cross-tenant visibility model — tickets are globally readable in
  the `_vance` Tenant (reporter identity as Document metadata), not
  isolated per-Tenant.

---

## 2. Architecture

```
┌─ Source Tenant A (User Project) ──────────────────────┐
│                                                      │
│  Engine X (Arthur, Eddie, …)                         │
│       │ vance_support_request(text)                  │
│       ▼                                              │
│  VanceSupportRequestTool  ─── FookService.submit() ──┐
│                                                      │
│  User Menu Button in Web Topbar  ─── POST ───────────┤
│  /support in Foot CLI            ─── POST ───────────┤
│  (POST /brain/{tenant}/fook/submit)                  │
└──────────────────────────────────────────────────────┘
                                                       │
                                                       ▼
                       ┌─ FookService (per Brain Pod) ─┐
                       │  in-memory Queue              │
                       │  @Scheduled tick (~2 s)       │
                       │     │                         │
                       │     │ 1. FookTicketService    │
                       │     │      .searchSimilar()   │
                       │     │   → Top-N Candidates    │
                       │     │                         │
                       │     │ 2. LightLlmService      │
                       │     │      .callForJson(      │
                       │     │        recipe="fook")   │
                       │     │   → TriageResult        │
                       │     │                         │
                       │     │ 3. Side-Effect:         │
                       │     │    - new_ticket:        │
                       │     │      createTicket(...)  │
                       │     │    - merge_into:        │
                       │     │      updateRelations(.) │
                       │     │    - discard: nothing   │
                       │     │                         │
                       │     │ 4. MaximegalonService     │
                       │     │      .create(...)       │
                       │     ▼ (tenantId = reporter)   │
                       └───────────────────────────────┘

Storage (read+write by FookTicketService):
  _vance-Tenant / _tenant-Project / Documents:
    _vance/fook/tickets/<uuid>.yaml   ($meta.kind: fook-ticket)
```

**Components** (all in `vance-brain/.../fook/`):

- `FookService` — `submit()` enqueued, `@Scheduled` Tick drained,
  per-submission processing.
- `FookTicketService` — data ownership over `fook-ticket` Documents
  (CRUD + Similarity Search). **Not** exposed as LLM Tools; all
  writes run from FookService after LLM decision.
- `VanceSupportRequestTool` — `@Component` LLM Tool in the default
  Tool Inventory, with rate limit.
- `FookController` — REST surface for UI clients.
- Recipe `fook.yaml` — config profile for `LightLlmService`,
  located under `_vance/recipes/` and cascade-overridable.

### 2.1 Master Switch `vance.fook.enabled`

The entire Fook subsystem can be disabled per Brain instance via the
boot property **`vance.fook.enabled`** (default `true`). The switch
does not deactivate the Beans (no `@ConditionalOnProperty`), but
rather makes them do nothing internally — thus, behavior per surface
remains controlled:

- **LLM Tool** `vance_support_request` remains visible in the Tool
  Inventory, but returns `{ status: "disabled", note }` on each call
  — no enqueue, no budget consumption. The model thus explicitly
  learns that feedback is disabled, instead of repeating it
  unsuccessfully.
- **REST** `POST /brain/{tenant}/fook/submit` responds with
  **503 Service Unavailable** (`"Feedback (Fook) is disabled on this
  brain"`). Web modal and Foot `/support` display the error text —
  the web menu remains visible intentionally, the error only appears
  upon sending.
- **Central Bottleneck:** `FookService.submit()` throws if Fook is
  disabled (defense-in-depth); however, the surfaces short-circuit
  before that.
- **Worker Ticks** (Triage drain, Session Analysis drain, Upstream
  send/poll) exit early — nothing is triaged, analyzed, or forwarded
  upstream.

On boot, `FookService` logs exactly one info line
(`Fook feedback disabled (vance.fook.enabled=false) …`) if the
switch is off, so it remains clear that feedback is intentionally
disabled and not silently broken.

The five affected Beans (`FookService`, `FookController`,
`VanceSupportRequestTool`, `FookSessionAnalysisService`,
`FookUpstreamService`) each read the property via
`@Value("${vance.fook.enabled:true}")` — one source, one key.

---

## 3. LLM Tool Surface

```
vance_support_request(text: string) → { submissionId, status, remainingBudget, note }
```

- **Default Tool** (`primary: true`, auto-discovered in
  `BuiltInToolSource`). Every Engine sees it.
- **Labels:** `write` + `side-effect`. Plan Mode strips it.
- **One Parameter:** `text` — free text, anything the LLM wants to
  tell the reporter. Fook (server-side) derives Type
  (bug/feature/question/other), Severity, and Title from it. The
  reporter does not rate their own bugs.
- **Rate Limit:** max. 3 submissions per `processId` lifecycle,
  `ConcurrentHashMap<String, AtomicInteger>` in the Tool. On over-cap
  throw, the counter is decremented so failed calls do not burn slots.
- **Context Enrichment:** Tool resolves
  `ThinkProcessService.findById(processId)` and populates
  `TicketContext` with `projectId`/`sessionId`/`processId`/
  `recipe`/`engine` from the Process Document.
- **Tool Description:** explicitly states that this is *NOT* intended
  for user project data or ongoing user tasks — exclusively for
  Vancetope-as-a-system topics.

**Reporter Kind:** `ENGINE`.

---

## 4. REST Surface

```
POST /brain/{tenant}/fook/submit
Authorization: Bearer <jwt>
Content-Type: application/json
```

**Request:**

```json
{
  "text": "Brain crashes on boot when recipes.yaml is missing.",
  "projectId": "web-redesign",
  "sessionId": "sess-42"
}
```

`projectId` and `sessionId` are optional. UI surfaces that do not
have a Project context (e.g., the user menu on the index page) omit
them.

**Response 200 OK** (immediate, no waiting for triage):

```json
{ "submissionId": "<uuid>", "status": "queued" }
```

**Auth & Permission:** `Action.WRITE` on `Resource.Tenant(tenant)`.
JWT filter validates upstream that the path tenant matches the
`tid` claim. UserId comes from the subject claim and populates the
reporter as `USER_DIRECT`.

**Consumers:**

- **Web** — `FookSupportModal.vue` in the user menu (component
  `EditorTopbar`). Reads `?project=`/`?sessionId=` from the URL,
  calls `brainFetch('POST', 'fook/submit', { body })`.
- **Foot** — `SupportCommand` with inline and Lanterna form path.
  Uses `BrainRestClientService.post()`.

**Reporter Kind:** `USER_DIRECT`.

---

## 5. Triage Flow

`FookService.drainQueue()` runs as a Spring `@Scheduled` with
`fixedDelayString = "${vance.fook.tick:PT2S}"`. Per submission:

1. **Candidate Lookup.**
   `FookTicketService.searchSimilar(text, limit=8)` — Mongo full-text
   page over all `fook-ticket` Documents in the `_vance` Tenant,
   `_tenant` Project, path prefix `_vance/fook/tickets/`. In-memory
   Jaccard ranking on tokens (3+ chars, lowercase), top-N by score
   returned. v1-Cap: 500 scanned tickets per lookup; after that,
   embedding recall must be used.

2. **LightLlm Call with Tenant Fallback.**
   Triage runs **preferably in the system Tenant `_vance`** —
   uniform model, uniform decision quality independent of the
   reporter. Prerequisite: the `_vance` Tenant has
   `ai.default.provider`/`ai.default.model` settings configured
   (set by admin, once).

   If `_vance` is *not* configured (Day-1 default, or intentional
   Tenant-Pays architecture), the first call throws an
   `AiModelResolver.UnknownModelException` — Fook catches it and
   retries **against the reporter Tenant**. This keeps Fook
   operational even without admin setup, with the trade-off that
   triage quality may then vary depending on the reporter Tenant.

   ```
   try {
     LightLlmService.callForJson(
       recipe   = "fook",
       pebbleVars = { text, candidates },
       schema   = { type: "object" },
       tenantId = "_vance"        // primary
     )
   } catch (UnknownModelException) {
     LightLlmService.callForJson(
       recipe   = "fook",
       pebbleVars = { text, candidates },
       schema   = { type: "object" },
       tenantId = reporter.tenantId,    // fallback
       projectId = context.projectId
     )
   }
   ```

   Recipe is `internal: true`, `engine: jeltz`. The `fook.yaml`
   is in the bundled resources and found by every Tenant via
   cascade — `tenantId` only controls credential/settings lookup,
   not recipe lookup.

   **If the fallback also fails** (reporter Tenant is `_vance` itself
   or empty): the exception bubbles to the Failure Inbox.

   **Other Failures** (schema validation after `maxAttempts`, provider
   5xx, …) do *not* trigger a fallback — only `UnknownModelException`
   triggers the retry. Otherwise, a temporarily down LLM would be
   paid for twice.

3. **Decision Switch.**
   - `new_ticket` → `FookTicketService.createTicket(payload)` with
     LLM-`derivedTitle`/`derivedType`/`derivedSeverity`, new
     UUID, reporter identity, origin context. If
     `needSessionReport=true` **and** the origin context carries a
     Session + Process, an analysis job is additionally queued in
     `FookSessionAnalysisService` (§11).
   - `merge_into` → `FookTicketService.updateRelations(targetId,
     patch)` — `relation` from the LLM controls whether extra links
     are merged under `relatedTo` or `rootCauseOf`.
   - `discard` → no Document operation.

4. **Inbox Item.**
   `MaximegalonService.create(MaximegalonDocument)` with
   `tenantId = reporter.tenantId` (cross-tenant — `MaximegalonService`
   does not validate against caller scope, the `tenantId` on the
   Document is the Source of Truth). `originatorUserId = "fook"` as an
   audit marker. Type `OUTPUT_TEXT`, Criticality `LOW`,
   `requiresAction=false`, Tag `["fook"]`, Payload with
   `decision`/`ticketId`/`submissionId` for UI deep-link.

**Crash Behavior:** Queue lives only in the JVM heap. Pod restart
loses pending submissions without Inbox feedback — consciously
accepted, alternative would be a persistent queue with replay logic.

**Race Conditions:** Two Pods triage without cross-Pod sync.
Simultaneous reports of the same problem can create two separate
tickets. Consciously accepted — Lunkwill cleans up duplicates later.

---

## 6. TriageResult Schema

The LightLlm call returns a Map<String,Object>, parsed into
`TriageResult`. Three variants, tagged by `decision`:

### 6.1 new_ticket

```json
{
  "decision": "new_ticket",
  "derivedType": "bug" | "feature" | "question" | "other",
  "derivedSeverity": "low" | "medium" | "high",
  "derivedTitle": "Brain crash on boot",
  "englishTranslation": "<English body translation, or \"\" if already English>",
  "needSessionReport": true | false,
  "relatedTickets": ["<uuid>", ...],
  "triageNote": "1–3 sentences (optional, English)",
  "reason": "1 sentence for Inbox item"
}
```

`needSessionReport` is the triage's hint that a distilled analysis
of the reporter's Session would help the fixer (details in §11). If
the field is missing, `false` applies. Only a hint — the analysis
path has a second gate.

Severity heuristic: `high` = crash/data loss/security/user-blocking,
`medium` = degraded behavior, `low` = cosmetic. For non-bug types,
the Recipe defaults to `medium`.

**Language Handling.** Vancetope tickets go to an English-speaking
upstream tracker (see [`fook-upstream.md`](/specs/fook-upstream)).
So maintainers can read without translation effort:

- `derivedTitle` is **always English** — the LLM translates inline
  if necessary (titles are short, no separate field needed)
- `englishTranslation` is a complete English translation of the
  report body. If the original is already English: empty string
- The backend assembles the final ticket description as
  `<englishTranslation>\n\n--- Original:\n\n<originalText>` if
  translation is set, otherwise original verbatim. Code snippets,
  file paths, and log lines are not translated — only natural
  language prose.
- `triageNote` is always English (maintainer-oriented)
- `reason` may remain in reporter's language (reporter-oriented)

### 6.2 merge_into

```json
{
  "decision": "merge_into",
  "targetTicketId": "<uuid>",
  "relation": "duplicateOf" | "rootCauseOf" | "relatedTo",
  "relatedTickets": ["<uuid>", ...],
  "triageNote": "1–3 sentences",
  "reason": "1 sentence for Inbox item"
}
```

`targetTicketId` must appear verbatim in the candidate list —
the Recipe prompt explicitly requires this, the Recipe loader checks
the JSON response against an `object` schema (Jeltz-style with
retry-on-violation).

### 6.3 discard

```json
{
  "decision": "discard",
  "category": "project_data" | "documentation_question"
              | "unrelated" | "nonsense" | "self_loop" | "other",
  "reason": "1–2 sentences for Inbox item"
}
```

**Discard Categories:**

- `project_data` — reporter talks about user project content
  ("Document X is missing"), not about Vancetope.
- `documentation_question` — genuine question about Vancetope, but
  answerable from existing Manuals; reporter is referred to
  `manual_read`/`how_do_i`.
- `unrelated` — off-topic, has nothing to do with Vancetope.
- `nonsense` — gibberish, no signal, "asdf", empty noise.
- `self_loop` — Fook submitted via Fook (recursion).
- `other` — fallback if nothing fits.

**On Failure** (LightLlm exception, missing/unknown
`decision` field), FookService writes a Failure Inbox item with
payload `{ decision: "failed", error: <ExceptionClassName>,
submissionId }` and performs no Document side-effect action.

---

## 7. Ticket Document Schema

**Format YAML** (not Markdown — tickets are structured,
prose content is small). Storage convention uses the
`$meta:` wrapper pattern from `vance-shared/document/YamlHeaderStrategy`
— scalar fields in `$meta`, all nested/prose as top-level keys
next to it.

Path: `_vance/fook/tickets/<uuid>.yaml` in the `_vance` Tenant,
`_tenant` Project.

```yaml
$meta:
  kind: fook-ticket
  id: 7e3f1c2a-...
  title: "Brain crash on boot"
  type: bug                  # bug | feature | question | other
  severity: high             # low | medium | high
  status: new                # Lunkwill manages later lifecycle
  duplicateOf: null          # only relation as scalar in $meta
  reporterKind: engine       # engine | user_direct | service_account
  reporterUserId: alice
  reporterTenantId: acme
  reporterServiceAccount: null
  createdAt: 2026-06-09T12:34:56Z
  triagedAt: 2026-06-09T12:34:58Z
  triagedBy: fook            # always "fook" in v1
  analysisRef: _vance/fook/tickets/7e3f1c2a-....analysis.md  # if Report written (§11)
  analysisStatus: written    # written | skipped | failed (missing = never requested)

description: |
  Original submission text from the reporter, verbatim.

triageNote: |
  Optional. What led Fook to the decision.

context:
  projectId: web-redesign
  sessionId: sess-...
  processId: proc-...
  recipe: arthur
  engine: arthur

relations:
  rootCauseOf:
    - <uuid>
  relatedTo:
    - <uuid>
```

**Field Distribution — Rule:**

- `$meta` — all scalars suitable for `searchSimilar` or for
  Lunkwill as a filter. The *one* scalar relation
  `duplicateOf` remains here for quick lookups.
- Body Keys — prose (`description`, `triageNote`) and nested
  structures (`context`, `relations`).

**Status Value Range v1:** only `new`. Fook sets to `new` once
and then exits.

**`kind`-Indexing:** `DocumentService.applyHeader()` extracts
`$meta.kind` and writes it to the indexed
`DocumentDocument.kind` column. `listByProjectPaged(..., kind =
"fook-ticket")` filters directly on this.

---

## 8. Reporter Identity

| Kind              | Source                                         | Inbox Target                            |
|-------------------|------------------------------------------------|-----------------------------------------|
| `ENGINE`          | `vance_support_request` from running Process | `process.userId` in `process.tenantId`  |
| `USER_DIRECT`     | Web Fook Button / Foot `/support`             | Active User in Path Tenant              |
| `SERVICE_ACCOUNT` | Tool call from Daemon/Scheduler without User | v1: no Inbox item, only log             |

Service Account submissions are correctly triaged and create
tickets — only the Inbox feedback is omitted because there is no
human recipient.

---

## 9. Inbox Item

Exactly one `MaximegalonDocument` per submission (except
`service_account` path).

| Field                | Value                                             |
|----------------------|---------------------------------------------------|
| `tenantId`           | `reporter.tenantId` (NOT `_vance`)              |
| `assignedToUserId`   | `reporter.userId`                                 |
| `originatorUserId`   | `"fook"` (Audit marker)                           |
| `originProcessId`    | `context.processId` if available                  |
| `originSessionId`    | `context.sessionId` if available                  |
| `type`               | `OUTPUT_TEXT`                                     |
| `criticality`        | `LOW`                                             |
| `requiresAction`     | `false`                                           |
| `tags`               | `["fook"]`                                        |
| `title`              | "Ticket created" / "Merged into existing ticket" / "Submission not opened as a ticket" / "Submission could not be triaged" |
| `body`               | 1–2 sentences with outcome + reason + ticket ID if available |
| `payload`            | `{ decision, ticketId?, category?, submissionId, error? }` for UI deep-link |

The Inbox component in `user-interaction.md` recognizes the tag
`"fook"` as a filter criterion.

---

## 10. Recipe `fook`

Located under
`vance-brain/src/main/resources/vance-defaults/_vance/recipes/fook.yaml`.
Cascade-overridable per Tenant/Project — Tenants can override the
Recipe in their `_vance/recipes/fook.yaml` (e.g., to add their own
discard categories or sharpen the severity mapping).

```yaml
engine: jeltz
internal: true
params:
  model: default:analyze
  maxAttempts: 3
  temperature: 0.0
promptPrefix: |
  <Pebble-Template with &#123;{ text }} and &#123;{ candidates }}>
tags: [internal, fook, triage]
```

`internal: true` is mandatory — `LightLlmService` rejects
non-internal Recipes. `engine: jeltz` is also mandatory: the
LightLlm call runs through Jeltz's single-shot schema loop.

The `promptPrefix` template is compile-validated during Recipe load
(Pebble syntax failure = fail-fast boot error).

---

## 11. Session Analysis Report

Optional second step: for a newly created ticket, Fook generates a
distilled analysis report from the reporter's Session and attaches it
as a sidecar document.

**Why.** The ticket fixer **Lunkwill** potentially runs on a different
system and has **no access to the Session**. The report is thus the
*only* bridge over which Session context (what the Engine attempted,
where it broke) can cross the system boundary to the fixer. Fook holds
the Session reference at triage time — this step uses it while it is
fresh.

**Trigger + Double Gate.**

1. The Triage LLM sets `needSessionReport` in the `new_ticket` branch
   (§6.1) — a hint that an analysis would help.
2. `FookService` queues the analysis job only if a Session **and**
   Process context is additionally present. This is the Engine report
   path (`vance_support_request` carries both); user-direct reports
   without Process are v2. Requested-but-not-analyzable →
   `$meta.analysisStatus = skipped`.
3. The analysis model may return `useful=false` after viewing the
   Session (Session contained nothing valuable) → no sidecar. Two
   gates: triage heuristic + actual Session view.

**Execution — `FookSessionAnalysisService`, agentic loop.** Own
in-memory queue + own `@Scheduled` tick (`vance.fook.analysis.tick`,
default 5s), separate from the triage tick, so Session loading does not
slow down triage throughput. Timing is non-critical.

A Session can be **much larger than a context window**. Therefore, the
report is **not** generated from a truncated transcript in one shot,
but in a **bounded ReAct loop** where the model works with tools over
the data — like a human analyst:

1. Load active chat history **once** via
   `ChatMessageService.activeHistory(tenantId, sessionId, processId)`
   (data ownership — never directly on the chat collection). Contains,
   where available, the compaction summary as a regular message; empty
   → `skipped`. Messages are stored server-side as an indexed list
   (index `[i]`); this is *not* a context window problem — only the
   prompt must never contain the entire Session.
2. Per turn, a `LightLlmService.callForJson` (Recipe
   `fook-session-analysis`) that returns **exactly one action**:
   - `overview` — count/roles/time span/index range + first/last
     snippets (provided as a seed before turn 1).
   - `search{query}` — keyword search → hit indices + snippets.
   - `grep{regex}` — Java regex search → hit indices + snippets.
   - `read{from,to}` — full text of an index range (truncated,
     pageable).
   - `finish{useful, report}` — end.
   Fook executes the action against the in-memory list (plain grep/slice)
   and appends the observation to a scratchpad, which is passed to the
   next turn as an `observations` var. The model extracts excerpts —
   it **never** gets the Session completely.
3. **Runs in the reporter Tenant/Project**, not `_vance` — that's where
   the Session is located, and potentially sensitive content remains with
   the user-configured provider. (Asymmetric to triage, which prefers
   `_vance`.)
4. Bounds: step budget (`vance.fook.analysis.max-steps`, default **24**,
   visible to the model per turn as `stepsLeft`) — safety net against
   runaway, not a goal; a targeted analysis typically needs 4–10
   investigative calls + `finish`, the model finishes early. Plus
   match/snippet/read caps + scratchpad cap (oldest observations fall
   out, seed overview remains). `finish` with `useful && report`
   non-blank → `FookTicketService.writeAnalysis`; `finish` not-useful/blank
   → `skipped`; `MAX_STEPS` without `finish` → `skipped` (outcome
   `exhausted`).

**Recipe `fook-session-analysis`.** Bundled under
`_vance/recipes/fook-session-analysis.yaml`, `engine: jeltz`,
`internal: true`, model `default:analyze`. It is the **per-turn prompt**
of the loop: tool description + action schema + goal; Pebble vars
`ticketTitle`/`ticketType`/`reason`/`triageNote`/`engine`/`recipe` plus
`stepsLeft` + `observations`. The prompt explicitly targets
**Vancetope system behavior**, not user content dump.

**Storage — Sidecar.** Report as a sibling document
`_vance/fook/tickets/<uuid>.analysis.md` with Markdown front matter
`kind: fook-ticket-analysis` (separate Kind → does not appear in any
`fook-ticket` scan). The ticket `$meta` gets `analysisRef` +
`analysisStatus=written`. Not inline, so the ticket YAML remains lean
(`searchSimilar` scans it) and upstream transport can handle the
attachment separately.

**Privacy — Critical Path.** The report distills potentially the same
sensitive data for which the Session is *not* attached. It is
secret-scrubbed during writing like the description
(`FookTicketAnonymizer.scrubSecretsAtRest`) and must undergo the same
`fook-upstream` scrub (reporter hash + regex) during external transport
— see [`fook-upstream.md`](/specs/fook-upstream).

**Failure + Crash.** Analysis failure is non-fatal — ticket + Inbox
item already exist; ticket is stamped `analysisStatus=failed`, no
failure Inbox item. Queue is JVM-heap-only like the triage queue; Pod
restart loses pending analyses (ticket survives, only the report is
missing).

**v2 (consciously postponed):** Reports for `merge_into` (multiple
analyses per ticket), persistent analysis queue, user-direct
session-wide analysis without Process.

Design Trail: `planning/fook-session-report.md`.

---

## 12. Lifecycle after `new` — Out of Scope (Lunkwill)

The following is explicitly not in this spec — Vancetope only prepares
tickets locally:

- Status transitions after transfer (`triaged` → `accepted` →
  `in_progress` → `resolved` → `closed`) happen in the external
  ticket system (GitHub Issues), not in Vancetope. Vancetope only
  mirrors the open/closed state back.
- Aggregate reports on tickets.
- Knowledge graph entries for ticket relations.
- Cross-Pod queue synchronization.
- Web UI for ticket browsing in Vancetope — the canonical UI is the
  external ticket system.

**Outbound transport** (local triage → external system) is covered by
[`fook-upstream.md`](/specs/fook-upstream). **Lifecycle after transfer**
is Lunkwill's responsibility and happens in the external system.

---

## 13. Quotas, Metrics, Observability

**Quotas:** Hard rate limit on the Tool side (3 per Process). REST/UI
are not hard-limited in v1 — user-direct submissions are
trustworthy.

**Micrometer Counters** (see `CLAUDE.md` metrics convention):

- `vance.fook.submissions` with tag `source` ∈
  `{engine, user_direct, service_account}`
- `vance.fook.triage` with tag `outcome` ∈
  `{new_ticket, merge_into, discard, failed}`
- `vance.fook.analysis` with tag `outcome` ∈
  `{written, skipped_not_useful, skipped_no_session, exhausted, failed}` (§11)
- `vance.fook.tickets.scanned` (distribution — how large was the
  candidate search?)

No high-cardinality tags (no `tenantId`/`projectId`).

**Audit Trail:** Each ticket creation logs with
`reporter.kind/userId` at INFO level. Each cross-tenant Inbox write
logs with `targetTenant`. Ticket Documents carry
`reporterKind`/`reporterUserId`/`reporterTenantId` in `$meta`.

---

## 14. References

- [light-llm-service](/specs/light-llm-service) — Single-shot LLM call
  helper, consumed by Fook.
- [recipes](/specs/recipes) — Recipe system, `internal: true` marker.
- [user-interaction](/specs/user-interaction) — Inbox subsystem.
- [architecture-scopes-clients](/specs/architektur-scopes-clients) —
  `_vance` Tenant + `_tenant` Project convention.
- [web-ui](/specs/web-ui) — `EditorShell`/`EditorTopbar`, user menu.
- java-cli-modulstruktur — Foot
  Slash Command pattern.
