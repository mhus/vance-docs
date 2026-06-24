---
title: "Vance — Ursahooks"
parent: Documentation
permalink: /docs/ursahooks
---

<!-- AUTO-GENERATED from specification/public/en/ursahooks.md — do not edit here. -->

{% raw %}
---
# Vance — Ursahooks

> **Ursahooks** are project-specific, lifecycle-event-driven triggers.
> Conceptually, they are the same as Schedulers and Events — but with
> a Brain-internal trigger (Process completed, Inbox Item
> created, Insight saved, …) instead of time (Scheduler) or
> HTTP (Event). They are stored as YAML documents under
> `_vance/hooks/<event>/<name>.yaml` in the Document Layer and fire a
> [`TriggerAction`](/docs/trigger-actions) (`recipe:` / `script:` /
> `workflow:`) through the central `ActionExecutorRegistry`.
>
> Ursahook runs are logged in the generic Event Log (see
> [scheduler §7](/docs/scheduler)) with `source = hook:<event>:<name>`.
>
> See also: [trigger-actions](/docs/trigger-actions) | [scheduler](/docs/scheduler) | [events](/docs/events) | [script-engine](/docs/script-engine) | [recipes](/docs/recipes) | [user-interaction](/docs/user-interaction) | [knowledge-graph](/docs/knowledge-graph) | [integrationen-externe-systeme](/docs/integrationen-externe-systeme)

---

## 1. Terms and Delimitation

| Term | What it is |
|---|---|
| **Lifecycle Event** | A Brain-internal point registered in `UrsaHookEventName` (e.g., `insight.saved`, `process.completed`). Statically cataloged, not user-definable. |
| **Ursahook Doc** | YAML document under `_vance/hooks/<event>/<name>.yaml` in the Project or `_tenant`. Filename (without `.yaml`) is the Ursahook name within the Event. |
| **UrsaHookDispatcher** | Spring Bean in `vance-brain` that fans out a fired Lifecycle Event to all active Ursahooks and calls `actionExecutorRegistry.execute(action, ctx, TriggerKind.HOOK)` for each Ursahook. |
| **Ursahook Action** | The `TriggerAction` from the Ursahook YAML — one of three variants (`Recipe`, `Script`, `Workflow`). The Dispatcher passes it unchanged to the Action Executor Pipeline. |

**Relationship to other Trigger Sources:**

| Trigger | Occasion | One YAML per occasion with a `TriggerAction` |
|---|---|---|
| **Scheduler** | Cron / One-time date | `_vance/scheduler/<name>.yaml` |
| **Event** | Inbound HTTP (`POST /brain/.../event/...`) | `_vance/events/<name>.yaml` |
| **Ursahook** | Brain-internal Lifecycle Event | `_vance/hooks/<event>/<name>.yaml` |

All three use the same `TriggerAction` contract and the same
`ActionExecutorRegistry`. Ursahooks are no longer a special form with
their own side-effect surface; they are a full-fledged trigger source.
In particular, Ursahooks may fire **all three Action variants** —
including `recipe:`, which spawns a Think Process. The old
"Ursahooks-may-not-spawn" rule has been dropped with the pipeline unification;
on the sandbox side, the `TRIGGER_SCOPED` mode governs what Scripts
are allowed to do within an Ursahook trigger (see [trigger-actions §8](/docs/trigger-actions)).

---

## 2. Storage Layout & Cascade

```
<project>/_vance/hooks/<event>/<name>.yaml      → Project Ursahook
_vance/hooks/<event>/<name>.yaml                → Tenant Ursahook (applies to all projects of the Tenant)
```

**Lookup** for a fired Event in a specific Project:

```
load(tenantId, projectId, event) → List<UrsaHookDef> :=
  documentService.listByPrefixCascade(tenantId, projectId, "_vance/hooks/" + event + "/")
    1. Project-Layer   → source = PROJECT
    2. _tenant-Layer    → source = TENANT
```

**Merge by Ursahook Name:** A Project Ursahook completely replaces a Tenant Ursahook of the same name (no field merge). Tenant Ursahooks without a Project override of the same name are active in all projects of the Tenant. The execution order per Event is **not specified** — Ursahooks are independent and must not rely on each other.

**There are no Resource Layer defaults.** Bundled Ursahooks make no sense — no Vance default should write to external systems. To provide standard Ursahooks for project bootstrap, deliver them via a Kit (see [kits](/docs/kits) — Ursahook files are Documents and are included by the Kit Apply).

---

## 3. Event Catalog (v1)

The catalog is centralized as an Enum `UrsaHookEventName` in `vance-api`; the path key is the wire form (e.g., `process.completed`). New events are added only via spec extension. For each event, the payload schema of the `event` object is defined.

| Event | Status | When it fires | Payload Highlights |
|---|---|---|---|
| `process.completed` | **active** | `ThinkProcessStatusChangedEvent` with `closeReason = DONE` | `event.process.{id, name, title, sessionId, engine, recipe, closeReason, status, parentProcessId}` |
| `process.failed` | **active** | Status change with `closeReason ∈ {STALE, STOPPED, AUTO_CLOSE, ARCHIVED, USER_DELETE, ABANDONED}` | as above |
| `inbox.item.created` | **active** | `InboxItemCreatedEvent` (every `InboxItemService.create(...)`) | `event.item.{id, type, title, body, criticality, tags, requiresAction, recipientUserId, originatorUserId, processId?, sessionId?}` |
| `session.suspended` | **reserved** — Documents are accepted, Ursahook does not fire. No Spring Event in `SessionService.suspend(...)` (v2). | — | `event.session.{id, name, projectId, reason}` (planned) |
| `session.resumed` | **reserved** — as above for `SessionService.resume(...)`. | — | `event.session.{id, name, projectId}` (planned) |
| `insight.saved` | **reserved** — Knowledge Graph Service Layer does not yet exist. | — | `event.insight.{name, title, body, scope, tags, sourceProcessId}` (planned) |
| `relation.created` | **reserved** — as above for Relations. | — | `event.relation.{from, to, type, label, weight}` (planned) |

**Reserved Events** are listed in the Enum and are supported through all cascade/validation paths — an Ursahook document under `_vance/hooks/session.suspended/...` loads cleanly. As soon as the respective Domain Service publishes an `UrsaHookFireableEvent`, the Ursahook fires without code changes to the Ursahook layer.

**What is not an Event (v1):** Tool Calls (`tool.before`/`tool.after`), LLM Calls, Engine Lifecycle steps, User Login, Document Save. Rationale: Outbound for these points is not yet clearly required, and `tool.before` would be an **Inbound Ursahook** (decides whether a call happens) — this is explicitly a v2 topic (see §11).

**Sync vs. Async:** All v1 events fire **asynchronously** via `ApplicationEventPublisher` → `@EventListener @Async` listener of the Dispatcher. There is no synchronous event path in v1; domain operations never block on Ursahook completion.

---

## 4. Ursahook Definition

One YAML file per Ursahook. The Action schema is identical to Scheduler
and Event — see [`specification/trigger-actions.md`](/docs/trigger-actions)
for the complete variant description. Exactly one of the three
Action variants is set at the top level: `recipe:`, `script:` or
`workflow:`.

| Field | Type | Required | Meaning |
|---|---|---|---|
| `recipe` / `script` / `workflow` | — | **exactly one** | The `TriggerAction` variant (disjunction enforced) |
| `params` | `Map<String,Object>` | no | Passed to the executor. The Dispatcher additionally merges the Event Payload under `params.event` |
| `initialMessage` | `String` | only `recipe:` | First USER message for the spawned Think Process |
| `runAs` | `String` | no | User identity. Default: `createdByUserId` of the Ursahook document |
| `enabled` | `boolean` | default `true` | Pause without deletion |
| `description` | `String` | recommended | One line — UI, `hook_list` |
| `timeout` | `Duration` | default `5s` | Per-Ursahook wall-clock ceiling (max. 30s). Per action, the action-specific timeout also applies (e.g., `script.timeoutSeconds`) |
| `tags` | `List<String>` | no | Free for discovery |

### 4.1 Example — Recipe Ursahook

Spawns a Process via Recipe when a Process completes:

```yaml
# _vance/hooks/process.completed/triage-notes.yaml

enabled: true
description: Triage notes for completed Analyze runs
recipe: notes-triage
params:
  parentProcessId: "${event.process.id}"
initialMessage: "Please triage the notes of the parent process."
```

### 4.2 Example — Script Ursahook

Executes a Document Script when an Inbox Item is created. The
Script runs in `TRIGGER_SCOPED` sandbox mode (Read Tools allowed,
Spawn Tools blocked) — details in
[trigger-actions §8](/docs/trigger-actions):

```yaml
# _vance/hooks/inbox.item.created/classify-sales-relevance.yaml

description: Classifies Inbox Items via LightLlm and tags them
script:
  source: document
  path: scripts/triage-inbox.js
  timeoutSeconds: 15
```

```javascript
// scripts/triage-inbox.js
const e = vance.params.event;       // Lifecycle Event Payload
const verdict = vance.lightllm.call({
  recipe: "inbox-triage",
  vars: { title: e.item.title, body: e.item.body }
});
if (verdict.relevance === "high") {
  vance.tools.invoke("inbox_tag", { itemId: e.item.id, tag: "sales-hot" });
}
```

### 4.3 Example — Workflow Ursahook

Starts a Magrathea Workflow when a Process completes:

```yaml
# _vance/hooks/process.completed/post-process.yaml

description: Triggers the post-processing pipeline
workflow: post-process-pipeline
params:
  sourceProcessId: "${event.process.id}"
```

### 4.4 Event Payload Binding

The `UrsaHookDispatcher` merges the Lifecycle Event Payload under the key
`event` into `params`. This is how the three Action variants see it:

| Action | Where the Payload appears |
|---|---|
| `recipe:` | Recipe `params.event` — available in the rendered prompt, in Engine Param Pebble templates |
| `script:` | `vance.params.event` in the Script |
| `workflow:` | Magrathea Workflow Initial State (`state.event`) |

More on the Action Sandbox and the `VanceScriptApi` surface in
[script-engine](/docs/script-engine) and
[trigger-actions §8](/docs/trigger-actions).

---

## 5. Trigger Path

```
1. Domain Service / Lifecycle Listener publishes UrsaHookFireableEvent
   (Spring ApplicationEvent — see UrsaHookProcessLifecycleListener,
   UrsaHookInboxLifecycleListener).

2. UrsaHookDispatcher.onHookFireable(event) — @EventListener @Async.
   Each event tick has its own correlation ID per Ursahook.

3. dispatch(event):
   a. defs = hookRegistry.hooksFor(tenantId, projectId, event)
   b. for each enabled doc in parallel (Bounded Pool, default 4):
        - Event Log: TRIGGERED with source="hook:<event>:<name>",
          payload={actionType: recipe|script|workflow, description}
        - action = def.action() with inserted params.event = event.payload()
        - ctx = TriggerContext(tenant, project, runAs/createdBy,
                               correlationId, sourceTag="hook:<event>:<name>")
        - result = actionExecutorRegistry.execute(action, ctx, TriggerKind.HOOK)
        - Event Log: COMPLETED (for SCHEDULED|SUCCESS) | FAILED + durationMs
          + spawnedId? + output?
```

**No retries** at the Ursahook level. If retries are needed, implement them in the
Script (with its own budget within the `timeout`) or configure
them in the Workflow Action (Magrathea `catch:`).

**No cross-Ursahook order.** Ursahooks must not depend on each other. All matching Ursahooks run in parallel per Event.

**Spawn actions are allowed.** Unlike in the pre-unification spec, a `recipe:` Ursahook may spawn a Think Process. Sandbox constraints
for `script:` Ursahooks (which Tools may be called) are uniformly in the `TRIGGER_SCOPED` mode from
[trigger-actions §8](/docs/trigger-actions).
- **No WebSocket transmission.** Ursahooks are not part of the client protocol.
- **No Pebble templating in JS Ursahook.** Only LLM Ursahooks render templates (for the prompt) — JS has the full language, that is sufficient.

---

## 7. Sandbox & Resource Limits

Ursahooks share the Action Sandbox from
[trigger-actions §8](/docs/trigger-actions). For `script:` Ursahooks, the
`TRIGGER_SCOPED` scope applies: full `VanceScriptApi` with Read Tools and
safe Write Tools, **all `@SpawnTool`-marked Tools are blocked by the
`ScriptToolsApi` filter** (`process_create`, `process_run`,
`scheduler_*`, `event_*`, `hook_*`). Spawning in Ursahooks therefore only happens
explicitly via `recipe:` or `workflow:` Action, not from
Script Action.

- GraalJS, `HostAccess` with Allow-List (`@HostAccess.Export` on
  `VanceScriptApi`).
- `IOAccess.NONE`, `allowNativeAccess=false`, `allowCreateThread=false`,
  `allowHostClassLoading=false`.
- `ResourceLimits.statementLimit` from setting `vance.hooks.statementLimit`
  (default 200,000 — smaller than the regular Script limit, because
  Ursahooks should remain tight).
- Wall-Clock Timeout from the Ursahook Doc (`timeout`) plus optional
  `script.timeoutSeconds`. Hard via `ctx.close(true)`.
- Fresh context per run, no cross-run leak.

LLM calls within an Ursahook Script run via
`vance.lightllm.call(...)` (see [light-llm-service](/docs/light-llm-service))
or are handled by the spawned Process / Workflow. There is no
hook-specific LLM runner anymore.

### 7.1 Per-Project Budget — v2

In v1, **only** the per-Ursahook wall-clock timeout applies (see §4 `timeout`, hard max. 30 s). There is **no** project-wide or per-event sum budget enforcer.

Sketch for expansion if volume demands it:
- `hooks.budget.perEventMs` — summed wall-clock of all Ursahooks per event tick; overflow → `SKIPPED:budget-exceeded` for Ursahooks not yet started.
- `hooks.budget.perProjectPerHour` — Dispatcher throttle per project; overflow → `SKIPPED:rate-limited` + one collected Inbox Item per hour.

Both settings are **not evaluated** today — setting them changes nothing.

---

## 8. Event Log Integration

Ursahook runs use the generic Event Log from [scheduler §7](/docs/scheduler):

```
EventLogDocument {
  source        = "hook:<event>:<hookName>"   // e.g., "hook:process.completed:notify-slack"
  type          ∈ { TRIGGERED, COMPLETED, FAILED }
  correlationId = unique per Ursahook run ("hook_<uuid>")
  payload       = type-specific:
                    TRIGGERED → { actionType: "recipe"|"script"|"workflow",
                                  description?: <hook-description> }
                    COMPLETED → { durationMs, spawnedId?, output? }
                    FAILED    → { durationMs, outcome, error? }
}
```

`spawnedId` is set if the Action initiated a Process or
Workflow run (Recipe / Workflow variant). `output`
carries the structured response of a `script:` Ursahook or the
soft result of a Recipe Action (e.g., `already_exists`). Detailed schema
see [trigger-actions §5](/docs/trigger-actions).

`correlationId` links `TRIGGERED` and the terminal `COMPLETED`/`FAILED` of a run — the UI run detail can combine both lines. An explicit `triggerCorrelationId` field to the triggering Process/Inbox Event is not in the payload in v1 (cross-reference can be established from the Mongo index `(tenantId, source, timestamp)`).

**Retention/TTL** — Setting key `hooks.eventLog.retentionDays` is reserved as a convention (default suggestion 30 days), but no dedicated cleanup job for Ursahook rows runs in v1. If volume grows, a planned TTL implementation will follow (analogous to Scheduler cleanup, once one is in place there).

---

## 9. Bootstrap & Refresh

### Project Bootstrap

When activating a project on a Brain Pod:

1. `UrsaHookProjectLifecycleListener` listens for `ProjectEnginesStartRequested` and calls `UrsaHookService.bootstrapProject(tenantId, projectId)`.
2. The loader iterates over `UrsaHookEventName` values and for each event calls `documentService.listByPrefixCascade(tenantId, projectId, "_vance/hooks/<event>")` — `listByPrefixCascade` returns exactly one level below the prefix, hence the loop.
3. For each Doc: Parse YAML via `UrsaHookYamlParser` → delegates Action validation to `TriggerActionParser` (Recipe/Script/Workflow disjunction + sub-field validation), checks Ursahook meta fields (`enabled`, `description`, `timeout` ≤ 30 s, `tags`) and throws `UrsaHookParseException` with a clear migration hint if the old `type: js|llm` form is still present.
4. Successful Defs are added to the `UrsaHookRegistry` (in-memory, project-wise atomically reset via `replace(...)`).
5. Parse errors are **logged** and bootstrap continues. `UrsaHookService.reportParseErrors(...)` exists as a helper for Inbox Item dispatch, but is not automatically wired today — bootstrap errors only appear in the Brain Log, not in the User Inbox. Wiring will follow with the WebUI (§10).

### Refresh

Three paths:

- **Tool `hook_refresh`** — callable by the Agent (analogous to `scheduler_refresh`).
- **WebUI button** in the Ursahook editor.
- **Automatically after `hook_set`/`hook_delete`** — Delta refresh only for the affected `<event>/<name>`.

Hot-reload is delta-based, not full re-bootstrap.

---

## 10. Agent Tools & REST

Five tools in the `hook` toolset, implemented in v1:

| Tool | Labels | Effect |
|---|---|---|
| `hook_list` | `read-only, hook` | All Ursahooks of the project (Event, Name, `actionType`, enabled, Source, last run from Event Log). |
| `hook_get(event, name)` | `read-only, hook` | Complete YAML of an Ursahook plus the shaped metadata (`UrsaHookDto` with the Action variant). |
| `hook_set(event, name, yaml)` | `write, hook` | Upsert: validates YAML via `UrsaHookYamlParser` (Action disjunction + Event existence + timeout ceiling), creates the Ursahook or completely replaces the body (previous state is auto-archived by the Document Layer), triggers Delta Refresh. Response carries `created: true|false`. |
| `hook_delete(event, name)` | `write, hook` | Trashes the Document, removes the entry from `UrsaHookRegistry`. |
| `hook_refresh` | `admin, hook` | Full reload of all Ursahooks of the project; not included in the standard toolset. |

REST endpoints (all in `vance-brain`, Tenant Authority via `RequestAuthority.enforce`):

```
GET    /brain/{tenant}/project/{project}/hooks                              # all Ursahooks, sorted
GET    /brain/{tenant}/project/{project}/hooks/{event}                      # Ursahooks for an Event
GET    /brain/{tenant}/project/{project}/hooks/{event}/{name}               # Detail (UrsaHookDto)
PUT    /brain/{tenant}/project/{project}/hooks/{event}/{name}               # create/update (idempotent)
DELETE /brain/{tenant}/project/{project}/hooks/{event}/{name}
POST   /brain/{tenant}/project/{project}/hooks/refresh
GET    /brain/{tenant}/project/{project}/hooks/{event}/{name}/events        # Event Log, paginated via `limit`
```

**WebUI Editor — planned, not built in v1.** Tooling plan (`packages/vance-face/hooks.html`, MPA pattern):
- List per Event with activated/deactivated toggle
- CodeMirror 6 for the YAML body
- Action Type dropdown (Recipe / Script / Workflow), analogous to Scheduler editor
- Run history per Ursahook (right panel) from the Event Log
- No live update (analogous to Scheduler — REST snapshots are sufficient)

The REST surface is ready; a UI consumer can build upon it once the web roadmap addresses it.

---

## 11. What v1 DOES NOT do

- **No Inbound Ursahooks.** In particular, no `tool.before`/`llm.before` (Policy Gate). Rationale: a gate that synchronously blocks the Tool Loop is a latency and correctness risk (Ursahook crash blocks Process). If Policy Gates are introduced, they need their own spec including default allow behavior on Ursahook crash, audit trail, and separate timeout class.
- **No Ursahook chains.** Ursahook A does not trigger Ursahook B — `event` firing in an Ursahook is not in the surface. With `recipe:`/`workflow:` Actions that can internally trigger other Lifecycle Events (e.g., `process.completed` by the spawned worker), a de-facto chain is created — but the Ursahook mechanism itself does not know cross-Ursahook order or dependency.
- **No Field-Level Merges** between Tenant and Project Ursahooks of the same name (override is all-or-nothing).
- **No Ursahook Quota Override per Ursahook.** Budgets are project-wide settings, not Ursahook Doc fields.
- **No Ursahook Versioning.** Document Layer carries audit/history; an Ursahook has no explicit `version` semantics.
- **No Sub-Selection on Event Payload.** To filter "only if `process.recipe == 'analyze'`", implement this in the Script body or use a pre-step in the Workflow — no declarative `when:` field in v1, as that would be a second language.
- **No Resource Layer Default.** Bundled Ursahooks do not exist.
- **No Streaming Output** from the Ursahook. The return value of an Ursahook is not relevant for the triggering domain operation — the triggering service does not wait for the Ursahook.
- **No Auto-Disable after Error Quorum.** FAILED runs are logged in the Event Log, the Ursahook remains active. Operators can set a noisy Ursahook to `enabled: false` via `hook_set` (or the Document directly). Soft-disable with a threshold (e.g., 5 FAILEDs/10 min) is a v2 topic (see §12).
- **No Per-Event/Per-Project Budget.** Only the per-Ursahook wall-clock timeout applies (§4, max. 30 s). The settings outlined in §7.1 are reserved conventions, but not enforced.
- **No TTL Cleanup for Ursahook Event Log Rows.** `hooks.eventLog.retentionDays` is a reserved key — without a dedicated pruning job, rows in `event_log` will grow until a cleanup is implemented.
- **No Inbox Item for Bootstrap Parse Errors.** Helper method exists (`UrsaHookService.reportParseErrors(...)`), but is not called by the bootstrap path today — errors only appear in the Brain Log.
- **No WebUI Editor.** REST surface is available, the MPA editor (`hooks.html`) will follow with the web roadmap (§10).
- **No Session/Knowledge Triggers.** `session.suspended/resumed` and `insight.saved/relation.created` are reserved as event names in the catalog, but do not fire in v1 — the respective Domain Services do not publish an `UrsaHookFireableEvent` today (§3).

---

## 12. Open Issues

1. **Sync Ursahooks.** Do we ever need an event type that runs **synchronously** to the triggering operation (e.g., Ursahook MUST have run before `insight.saved` commit)? Current spec: no. If yes, this would be a new event suffix `*.before` with its own timeout/default allow semantics.
2. **Ursahook Subscription Filter.** Instead of `<event>` as a path component, perhaps `events: [a, b]` in the Doc plus a `when:` expression in the long term. v1 sticks to one Ursahook per event path, easier to reason about.
3. **Dead-Letter Queue.** Today, a FAILED Ursahook goes into the Event Log, no retry. If use cases arise ("Slack was down for 2min, send me again"), a separate DLQ spec.
4. **Per-Ursahook Identity.** Currently, each Ursahook runs under the `createdBy` of its document (or `system:hook` if the field is empty). Should an Ursahook run under an explicit user identity (analogous to Scheduler `runAs`)? Relevant once `inbox.create` recipient validation applies.
5. **HTTP Tool Security for Ursahook Scripts.** Ursahooks use the standard `web_fetch` tool. The old Ursahook-specific settings (`vance.hooks.http.allowPrivateNetworks`, `vance.brain.publicHosts`-block) are not evaluated in the standard tool. Backlog: Add allowlist + private network block to `web_fetch` as soon as an Ursahook needs the self-hosted VPN scenario.
6. **Auto-Disable after Error Quorum.** Noisy Ursahooks should automatically switch to `enabled: false` after, e.g., 5 FAILEDs in 10 min and send an Inbox Item to `createdBy` (see §11). Counter storage and reset strategy still open.
7. **Bundled Convention Ursahooks.** Spec currently says "no Bundled Ursahooks". If we want to deliver a small standard library (e.g., "Slack webhook from setting X"), the Resource Layer must be opened for it.
8. **Project Owner Resolution.** `inbox.create({recipient: "owner"})` is currently an alias for `createdBy`. As soon as `ProjectDocument` has an owner field, `"owner"` should switch to it — to be decided with the Multi-User Spec update.

---

*See also: [scheduler](/docs/scheduler) | [script-engine](/docs/script-engine) | [recipes](/docs/recipes) | [user-interaction](/docs/user-interaction) | [knowledge-graph](/docs/knowledge-graph) | [llm-resource-management](/docs/llm-resource-management) | [settings-system](/docs/settings-system) | [kits](/docs/kits) | [integrationen-externe-systeme](/docs/integrationen-externe-systeme)*
{% endraw %}
