---
# Vance — Fook Service

> Built-in bug/feature triage system: a reporter (LLM or User) sends
> free text, Fook asynchronously decides whether to create a new
> ticket, merge it into an existing one, or discard it. The subsequent
> processing of tickets (status transitions, fixes, PR sync) is handled
> by **Lunkwill** — not in scope here.
>
> Architecture: `LightLlmService` with Recipe `fook` as a
> configuration profile, plus a thin service with an in-memory queue
> and a worker tick. No dedicated `ThinkEngine`, no Process spawn, no
> Lane lock.
>
> See also: [light-llm-service](light-llm-service.md) |
> [recipes](recipes.md) | [user-interaction](user-interaction.md) |
> [architektur-scopes-clients](architektur-scopes-clients.md)

---

## 1. Purpose & Scope

**Problem.** Vance bugs, feature requests, and documentation gaps
require a low-threshold reporting channel — both for running Engines
("I cannot perform this operation, but it should be possible") and
for human users in Web and Foot. Without a built-in path, bugs
disappear into Sessions and user minds.

**Solution.** Three reporter channels all land in the same pipeline:

- **LLM Tool `vance_support_request(text)`** — any Engine can
  independently report if it detects a Vance deficiency. Rate-limit
  max. 3 per Process-Lifetime against loop spam.
- **Web Fook Button** in the user menu of `EditorTopbar` (globally
  accessible across all editors), opens a modal with a textarea.
- **Foot `/support` Slash Command** with two modes: inline
  (`/support Brain crashed on boot`) or, without args, a
  Lanterna multi-line form.

All three call the same `FookService.submit()` on the server side.
The service queues in-memory, a worker tick calls the
[`LightLlmService`](light-llm-service.md) with Recipe `fook`, the
result is applied as a Document-Side-Effect, and an Inbox-Item is
created for the reporter.

**What Fook is not:**

- Not a ticket editor — tickets are stored as YAML-Documents in the
  `_vance`-Tenant; UI for this comes with Lunkwill.
- No status lifecycle after `new` — transitions to
  `triaged`/`accepted`/`in_progress`/`resolved`/`closed` are set
  by Lunkwill.
- No GitHub/Jira sync, no fix suggestion, no PR generation — all
  Lunkwill.
- No cross-tenant visibility model — tickets are globally readable
  in the `_vance`-Tenant (reporter identity as Document metadata),
  not isolated per-Tenant.

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
                       ┌─ FookService (per Brain-Pod) ─┐
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
                       │     │ 4. InboxItemService     │
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
- `FookTicketService` — data ownership over `fook-ticket`-Documents
  (CRUD + Similarity-Search). **Not** exposed as LLM-Tools; all
  writes run from FookService after LLM decision.
- `VanceSupportRequestTool` — `@Component` LLM-Tool in the Default-
  Tool-Inventory, with Rate-Limit.
- `FookController` — REST-Surface for UI-Clients.
- Recipe `fook.yaml` — Config-profile for `LightLlmService`,
  located under `_vance/recipes/` and is cascade-overridable.

---

## 3. LLM-Tool-Surface

```
vance_support_request(text: string) → { submissionId, status, remainingBudget, note }
```

- **Default-Tool** (`primary: true`, auto-discovered in
  `BuiltInToolSource`). Every Engine sees it.
- **Labels:** `write` + `side-effect`. Plan-Mode strips it.
- **One parameter:** `text` — free text, anything the LLM wants to
  tell the reporter. Fook (server-side) derives Type
  (bug/feature/question/other), Severity, and Title from it. The
  reporter does not rate their own bugs.
- **Rate-Limit:** max. 3 submissions per `processId` lifecycle,
  `ConcurrentHashMap<String, AtomicInteger>` in the Tool. On
  over-cap throw, the counter is decremented so that failed calls
  do not burn slots.
- **Context-Enrichment:** Tool resolves
  `ThinkProcessService.findById(processId)` and populates
  `TicketContext` with `projectId`/`sessionId`/`processId`/
  `recipe`/`engine` from the Process-Document.
- **Tool-Description:** explicitly states that this is *NOT*
  intended for user project data or ongoing user tasks —
  exclusively for Vance-as-a-system topics.

**Reporter-Kind:** `ENGINE`.

---

## 4. REST-Surface

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

`projectId` and `sessionId` are optional. UI-Surfaces that do not
have a Project-Context (e.g., the user menu on the index page) omit
them.

**Response 200 OK** (immediate, no waiting for Triage):

```json
{ "submissionId": "<uuid>", "status": "queued" }
```

**Auth & Permission:** `Action.WRITE` on `Resource.Tenant(tenant)`.
JWT-Filter validates upstream that the Path-Tenant matches the
`tid`-Claim. UserId comes from the Subject-Claim and populates the
Reporter as `USER_DIRECT`.

**Consumers:**

- **Web** — `FookSupportModal.vue` in the User-Menu (component
  `EditorTopbar`). Reads `?project=`/`?sessionId=` from the URL,
  calls `brainFetch('POST', 'fook/submit', { body })`.
- **Foot** — `SupportCommand` with inline and Lanterna form path.
  Uses `BrainRestClientService.post()`.

**Reporter-Kind:** `USER_DIRECT`.

---

## 5. Triage-Flow

`FookService.drainQueue()` runs as a Spring-`@Scheduled` with
`fixedDelayString = "${vance.fook.tick:PT2S}"`. Per Submission:

1. **Candidate-Lookup.**
   `FookTicketService.searchSimilar(text, limit=8)` — Mongo full-text
   page over all `fook-ticket`-Documents in the `_vance`-Tenant,
   `_tenant`-Project, path prefix `_vance/fook/tickets/`. In-memory
   Jaccard-ranking on tokens (3+ characters, lowercase), top-N returned
   by score. v1-Cap: 500 scanned tickets per lookup; after that,
   embedding recall must be used.

2. **LightLlm-Call with Tenant-Fallback.**
   Triage runs **preferably in the system tenant `_vance`** —
   uniform model, uniform decision quality independent of the
   reporter. Prerequisite: the `_vance`-Tenant has
   `ai.default.provider`/`ai.default.model`-Settings configured
   (set by admin, one-time).

   If `_vance` is *not* configured (Day-1-Default, or conscious
   Tenant-Pays-Architecture), the first call throws an
   `AiModelResolver.UnknownModelException` — Fook catches it and
   retries **against the reporter tenant**. This keeps Fook
   operational even without admin setup, with the trade-off that
   triage quality may then vary depending on the reporter tenant.

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
   is in the Bundled-Resources and is found by every Tenant via
   Cascade — `tenantId` only controls the Credential-/Settings-
   Lookup, not the Recipe-Lookup.

   **If the fallback also fails** (reporter tenant is `_vance`
   itself or empty): the exception bubbles to the Failure-Inbox.

   **Other Failures** (Schema-Validation after `maxAttempts`,
   Provider 5xx, …) do *not* trigger a fallback — only
   `UnknownModelException` triggers the retry. Otherwise, a
   temporarily down LLM would be paid for twice.

3. **Decision-Switch.**
   - `new_ticket` → `FookTicketService.createTicket(payload)` with
     LLM-`derivedTitle`/`derivedType`/`derivedSeverity`, new
     UUID, Reporter-Identity, Origin-Context.
   - `merge_into` → `FookTicketService.updateRelations(targetId,
     patch)` — `relation` from the LLM controls whether extra links
     are merged under `relatedTo` or `rootCauseOf`.
   - `discard` → no Document-Operation.

4. **Inbox-Item.**
   `InboxItemService.create(InboxItemDocument)` with
   `tenantId = reporter.tenantId` (cross-tenant — `InboxItemService`
   does not validate against Caller-Scope, the `tenantId` on the
   Document is Source of Truth). `originatorUserId = "fook"` as an
   Audit-Marker. Type `OUTPUT_TEXT`, Criticality `LOW`,
   `requiresAction=false`, Tag `["fook"]`, Payload with
   `decision`/`ticketId`/`submissionId` for UI-Deep-Link.

**Crash Behavior:** Queue lives only in the JVM-Heap. Pod-Restart
loses pending Submissions without Inbox-Feedback — consciously
accepted, the alternative would be a persistent queue with replay
logic.

**Race-Conditions:** Two Pods triage without Cross-Pod-Sync.
Simultaneous reports of the same problem can create two separate
tickets. Consciously accepted — Lunkwill cleans up duplicates later.

---

## 6. TriageResult-Schema

The LightLlm-Call returns a Map<String,Object>, parsed into
`TriageResult`. Three variants, tagged by `decision`:

### 6.1 new_ticket

```json
{
  "decision": "new_ticket",
  "derivedType": "bug" | "feature" | "question" | "other",
  "derivedSeverity": "low" | "medium" | "high",
  "derivedTitle": "Brain crash on boot",
  "englishTranslation": "<English body translation, or \"\" if already English>",
  "relatedTickets": ["<uuid>", ...],
  "triageNote": "1–3 sentences (optional, English)",
  "reason": "1 sentence for Inbox-Item"
}
```

Severity heuristic: `high` = crash/data loss/security/user-blocking,
`medium` = degraded behavior, `low` = cosmetic. For non-bug-Types,
the Recipe defaults to `medium`.

**Language Handling.** Vance tickets go to an English-speaking
upstream tracker (see [`fook-upstream.md`](fook-upstream.md)).
So that maintainers can read without translation effort:

- `derivedTitle` is **always English** — the LLM translates inline
  if necessary (titles are short, no separate field needed)
- `englishTranslation` is a complete English translation of the
  report body. If the original is already English: empty string
- The Backend assembles the final Ticket-Description as
  `<englishTranslation>\n\n--- Original:\n\n<originalText>` if
  translation is set, otherwise the original verbatim. Code snippets,
  file paths, and log lines are not translated — only natural-
  language prose.
- `triageNote` is always English (maintainer-oriented)
- `reason` may remain in the reporter's language (reporter-oriented)

### 6.2 merge_into

```json
{
  "decision": "merge_into",
  "targetTicketId": "<uuid>",
  "relation": "duplicateOf" | "rootCauseOf" | "relatedTo",
  "relatedTickets": ["<uuid>", ...],
  "triageNote": "1–3 sentences",
  "reason": "1 sentence for Inbox-Item"
}
```

`targetTicketId` must appear verbatim in the candidate list —
the Recipe-Prompt explicitly requires this, the Recipe-Loader checks
the JSON response against an `object`-schema (Jeltz-style with
retry-on-violation).

### 6.3 discard

```json
{
  "decision": "discard",
  "category": "project_data" | "documentation_question"
              | "unrelated" | "nonsense" | "self_loop" | "other",
  "reason": "1–2 sentences for Inbox-Item"
}
```

**Discard Categories:**

- `project_data` — Reporter talks about user project content
  ("Document X is missing"), not about Vance.
- `documentation_question` — genuine question about Vance, but
  answerable from existing Manuals; reporter is referred to
  `manual_read`/`how_do_i`.
- `unrelated` — Off-topic, has nothing to do with Vance.
- `nonsense` — Gibberish, no signal, "asdf", empty noise.
- `self_loop` — Fook submitted via Fook (recursion).
- `other` — Fallback if nothing fits.

**On Failure** (LightLlm-Exception, missing/unknown
`decision`-field), FookService writes a Failure-Inbox-Item with
Payload `{ decision: "failed", error: <ExceptionClassName>,
submissionId }` and performs no Document-Side-Effect action.

---

## 7. Ticket-Document-Schema

**Format YAML** (not Markdown — tickets are structured,
prose content is small). Storage convention uses the
`$meta:`-wrapper pattern from `vance-shared/document/YamlHeaderStrategy`
— scalar fields in `$meta`, all nested/prose as top-level keys
next to it.

Path: `_vance/fook/tickets/<uuid>.yaml` in the `_vance`-Tenant,
`_tenant`-Project.

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
- Body-Keys — prose (`description`, `triageNote`) and nested
  structures (`context`, `relations`).

**Status Value Range v1:** only `new`. Fook sets it to
`new` once and is then out.

**`kind`-Indexing:** `DocumentService.applyHeader()` extracts
`$meta.kind` and writes it to the indexed
`DocumentDocument.kind`-column. `listByProjectPaged(..., kind =
"fook-ticket")` filters directly on it.

---

## 8. Reporter-Identity

| Kind              | Source                                         | Inbox Target                            |
|-------------------|------------------------------------------------|-----------------------------------------|
| `ENGINE`          | `vance_support_request` from running Process   | `process.userId` in `process.tenantId`  |
| `USER_DIRECT`     | Web Fook-Button / Foot `/support`              | Active User in Path-Tenant              |
| `SERVICE_ACCOUNT` | Tool-Call from Daemon/Scheduler without User   | v1: no Inbox-Item, only Log             |

Service-Account-Submissions are correctly triaged and create
tickets — only the Inbox feedback is omitted because there is no
human recipient.

---

## 9. Inbox-Item

Exactly one `InboxItemDocument` per Submission (except
`service_account`-path).

| Field                | Value                                             |
|----------------------|---------------------------------------------------|
| `tenantId`           | `reporter.tenantId` (NOT `_vance`)                |
| `assignedToUserId`   | `reporter.userId`                                 |
| `originatorUserId`   | `"fook"` (Audit-Marker)                           |
| `originProcessId`    | `context.processId` if available                  |
| `originSessionId`    | `context.sessionId` if available                  |
| `type`               | `OUTPUT_TEXT`                                     |
| `criticality`        | `LOW`                                             |
| `requiresAction`     | `false`                                           |
| `tags`               | `["fook"]`                                        |
| `title`              | "Ticket created" / "Merged into existing ticket" / "Submission not opened as a ticket" / "Submission could not be triaged" |
| `body`               | 1–2 sentences with Outcome + Reason + Ticket-ID if available |
| `payload`            | `{ decision, ticketId?, category?, submissionId, error? }` for UI-Deep-Link |

The Inbox component in `user-interaction.md` knows the tag
`"fook"` as a filter criterion.

---

## 10. Recipe `fook`

Located under
`vance-brain/src/main/resources/vance-defaults/_vance/recipes/fook.yaml`.
Cascade-overridable per Tenant/Project — Tenants can override the
Recipe in their `_vance/recipes/fook.yaml` (e.g., to add their own
Discard categories or sharpen the Severity mapping).

```yaml
engine: jeltz
internal: true
params:
  model: default:analyze
  maxAttempts: 3
  temperature: 0.0
promptPrefix: |
  <Pebble-Template with {{ text }} and {{ candidates }}>
tags: [internal, fook, triage]
```

`internal: true` is mandatory — `LightLlmService` rejects
non-internal Recipes. `engine: jeltz` is also mandatory: the
LightLlm-Call runs through Jeltz' single-shot schema loop.

The `promptPrefix`-Template is compile-validated during Recipe-Load
(Pebble-syntax-fail = fail-fast Boot-Error).

---

## 11. Lifecycle after `new` — Out of Scope (Lunkwill)

The following is explicitly not in this spec — Vance only prepares
tickets locally:

- Status transitions after transfer (`triaged` → `accepted` →
  `in_progress` → `resolved` → `closed`) happen in the external
  ticket system (GitHub Issues), not in Vance. Vance only mirrors
  the Open/Closed state back.
- Aggregate reports on tickets.
- Knowledge-Graph entries for ticket relations.
- Cross-Pod queue synchronization.
- Web-UI for ticket browsing in Vance — the canonical UI is the
  external ticket system.

**Outbound transport** (local triage → external system) is covered
by [`fook-upstream.md`](fook-upstream.md). **Lifecycle after transfer**
is Lunkwill's responsibility and happens in the external system.

---

## 12. Quotas, Metrics, Observability

**Quotas:** Hard rate-limit on the tool side (3 per Process). REST/UI
are not hard-limited in v1 — User-Direct-Submissions are trustworthy.

**Micrometer-Counter** (see `CLAUDE.md` metrics convention):

- `vance.fook.submissions` with tag `source` ∈
  `{engine, user_direct, service_account}`
- `vance.fook.triage` with tag `outcome` ∈
  `{new_ticket, merge_into, discard, failed}`
- `vance.fook.tickets.scanned` (distribution — how large was the
  candidate search?)

No tags with high cardinality (no `tenantId`/`projectId`).

**Audit-Trail:** Every ticket creation logs with
`reporter.kind/userId` at INFO. Every Cross-Tenant-Inbox-Write
logs with `targetTenant`. Ticket-Documents carry
`reporterKind`/`reporterUserId`/`reporterTenantId` in `$meta`.

---

## 13. References

- [light-llm-service](light-llm-service.md) — Single-Shot-LLM-Call-
  Helper, consumed by Fook.
- [recipes](recipes.md) — Recipe-System, `internal: true`-marker.
- [user-interaction](user-interaction.md) — Inbox-Subsystem.
- [architektur-scopes-clients](architektur-scopes-clients.md) —
  `_vance`-Tenant + `_tenant`-Project convention.
- [web-ui](web-ui.md) — `EditorShell`/`EditorTopbar`, User-Menu.
- [java-cli-modulstruktur](../java-cli-modulstruktur.md) — Foot
  Slash-Command-Pattern.
