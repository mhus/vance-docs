---
# Vance — Scheduler

> A **Scheduler** is a time-based trigger definition that spawns a Think Process via a Recipe. Schedulers are YAML documents located under `_vance/scheduler/<name>.yaml` in the Document Layer, loaded during project bootstrap, and re-read via a `scheduler_refresh` trigger. Each run operates in a dedicated system Session of the Scheduler, with a configured `runAs` identity.
>
> The only trigger path is `processCreate(recipe, params, initialMessage)`. Determinism vs. LLM control is decided by the Recipe — the Scheduler does not know this distinction.
>
> Lifecycle events land in a **generic Event Log**, which will later also be used for webhooks and Ursahook mechanisms. There is no separate `SchedulerStateDocument`.
>
> See also: [recipes](recipes.md) | [execution-modes-trigger](execution-modes-trigger.md) | [session-lifecycle](session-lifecycle.md) | [user-interaction](user-interaction.md) | [architektur-scopes-clients](architektur-scopes-clients.md)

---

## 1. Terms

| Term | Definition |
|---|---|
| **Scheduler-Doc** | YAML document under `_vance/scheduler/<name>.yaml` in the Project. The filename (without `.yaml`) is the Scheduler name. |
| **Scheduler-Run** | A single firing: creates (or reuses) the system Session and spawns a Process via a Recipe. |
| **System-Session** | A dedicated Session per Scheduler, with flag `system=true`. Collects run history and is the owner of all Processes created by this Scheduler. |
| **Event-Log** | Append-only Mongo collection for lifecycle events (Scheduler, later also Webhook/Ursahook). Source of truth for "when did it last run". |
| **Source** | Generic trigger identifier in the Event Log: `ursascheduler:<name>`, later `webhook:<id>`, `hook:<key>`. |

**Engine ↔ Recipe ↔ Scheduler:** Engines are code. Recipes are named Process configurations. A Scheduler is only a temporal trigger for a Recipe. A Scheduler provides no logic of its own — it only passes parameters.

---

## 2. Scheduler YAML Schema

```yaml
# _vance/scheduler/morning-briefing.yaml

description: "Spawns a briefing Process with the analyze Recipe every morning."

# --- Schedule ---
# Exactly one of these must be set:
cron: "0 0 8 * * MON-FRI"          # recurring, Quartz-Cron (with seconds field)
# at: "2026-05-14T08:00:00"        # OR: one-time run at a specific time (§13)
timezone: "Europe/Berlin"          # IANA-TZ-ID, optional (default: tenant-Setting `scheduler.timezone`)
enabled: true                      # default true — false stops the Scheduler without deleting it

# --- Trigger Target (exactly one of these) ---
recipe: "analyze"                  # Recipe name (cascade lookup like everywhere else) — spawns a ThinkProcess
# workflow: "daily-audit"          # OR: Workflow name — spawns a Magrathea Workflow Run (see [workflows](workflows.md))
params:                            # optional — for recipe-trigger: merged with Recipe defaults.
  model: "default:fast"            # For workflow-trigger: passed directly to workflow.parameters.
  validation: false
initialMessage: |                  # optional — first user message to the Process.
  Create the daily briefing with the status as of 07:55 AM.
                                   # Only relevant for recipe-trigger; ignored for workflow-trigger.

# --- Identity ---
runAs: "mike"                      # User name. Default: `createdBy` of the Scheduler-Doc.
                                   # Inbox items and notifications go to this user.

# --- Overlap Policy ---
overlap: skip                      # skip | queue | cancelPrevious — default skip
                                   # - skip:           new run is discarded if previous is still running
                                   # - queue:          new run is appended, runs after completion
                                   # - cancelPrevious: previous Process is stopped, new one starts

# --- Free for Discovery ---
tags: [daily, briefing]
```

| Field | Type | Required | Meaning |
|---|---|---|---|
| `description` | `String` | yes | A single line — rendered in the Web Editor and in `scheduler_list` |
| `cron` | `String` | see below | Quartz-Cron-Expression (Spring `CronExpression` format, **with** seconds field). Mutually exclusive with `at` |
| `at` | `String` (ISO-8601 datetime) | see below | One-time run at a specific time (§13). Mutually exclusive with `cron` |
| `timezone` | `String` | no | IANA-TZ. Default: tenant-Setting `scheduler.timezone` → Fallback `UTC` |
| `enabled` | `boolean` | default `true` | Pause without deleting |
| `recipe` | `String` | yes | Recipe name, resolved via the normal Cascade (Project → `_tenant` → Resource) |
| `params` | `Map<String,Object>` | no | Override for Recipe defaults — same semantics as `process_create` |
| `initialMessage` | `String` | no | First user message. Without this, the Process runs according to Recipe default (Engine-dependent) |
| `runAs` | `String` | no | User name. Default: `createdBy` of the Scheduler-Doc |
| `overlap` | `enum` | default `skip` | `skip` \| `queue` \| `cancelPrevious` |
| `lockMode` | `enum` | default `full` | `full` \| `protected` \| `hidden` — how much the LLM can access this Scheduler, see §11a |
| `tags` | `List<String>` | no | Free for Discovery |

**Required fields:** `description`, `recipe`, and exactly one of `cron` / `at`. If both are set or both are missing, the load fails.

**There is no separate Mongo collection for Schedulers.** Persistence, audit, soft-delete come from the Document Layer.

---

## 3. Cascade — How Schedulers are Resolved

Unlike Recipes, Schedulers do **not** live in the classic `project → _tenant → resource` override model. Resource default Schedulers make no sense — Schedulers are by definition project-specific (or tenant-wide administrative).

Lookup for a specific Project returns the union of:

```
load(tenantId, projectId) → List<ScheduledTrigger> :=
  documentService.listByPrefixCascade(tenantId, projectId, "_vance/scheduler/")
    1. Project:  <project>/_vance/scheduler/*.yaml   → source = PROJECT
    2. _tenant:   _vance/scheduler/*.yaml             → source = TENANT (applies to all Projects of the Tenant)
```

**Merge by Name:** Project override completely replaces Tenant Schedulers of the same name (no field merge). Tenant Schedulers without a Project override of the same name are active in all Projects of the Tenant.

**Hot-Reload:** Project and `_tenant` Schedulers are not re-parsed on every lookup (that would be a bootstrap per tick). Instead:

- **During Project Bootstrap:** `UrsaSchedulerService` reads all Scheduler-Docs of the Project and registers them with the Spring `TaskScheduler`.
- **Refresh Trigger:** The `scheduler_refresh` tool and WebUI button discard the current registration and re-read. Tenant-wide refresh triggers run across all active Projects of the Tenant.
- **Brain Restart:** covered by the bootstrap path — no special handling.

---

## 4. Trigger Path — What Happens on a Tick

Two spawn variants, which branch based on the trigger target field (`recipe:` or `workflow:`).

### 4.1 Recipe Trigger (Default)

```
1. Tick → SchedulerExecutor.fire(tenantId, projectId, name)
2. Overlap Check (see §5)
3. Resolve (or create, §6) the system Session of the form `_ursascheduler_<name>`
4. RecipeResolver.applyDefaulting(recipeName, null, params)
5. processCreate(session=systemSession, recipe=resolved, initialMessage=...)
   Owner-User of the spawned Process = `runAs`-User
6. Event Log: scheduler:<name> TRIGGERED + STARTED (§7)
7. Process runs in the Scheduler's Lane (Lane-Key = systemSession-ID)
8. Engine lifecycle terminates (done | stopped | failed)
   → ProcessLifecycleListener emits COMPLETED | FAILED to the Event Log
9. Errors or user asks land via Inbox Service at the `runAs`-User
```

There is **no** special path "Scheduler is a Tool" or "Scheduler calls Engine directly". The Scheduler is a client like any other system client (cf. [execution-modes-trigger §2](execution-modes-trigger.md)) — it brings no Tools, lives only briefly, does not close its Session (see §6).

### 4.2 Workflow Trigger

```
1. Tick → SchedulerExecutor.fire(tenantId, projectId, name)
2. Overlap Check (see §5)
3. MagratheaWorkflowService.start(tenantId, projectId, workflowName, params, runAs)
   → 8-Hex workflowRunId, frozen YAML in the StartRecord
4. Event Log: scheduler:<name> TRIGGERED + STARTED with `workflowRunId` in the payload (§7)
5. Workflow Run runs independently — TaskClaimer/ProjectLane/Listeners take over
6. For One-Shot (`at:`): Source document is immediately trashed (analogous to Recipe Path)
```

Workflow Runs have **no** dedicated Scheduler system Session — Workflows live outside the Session concept. `agent_task`s within the Workflow create their own `_magrathea_<runId>` Sessions as needed. If `vance.services.magrathea=false` (Magrathea not active), the trigger is marked `FAILED` via the Event Log. See [workflows](workflows.md) §8.4 for the planned Workflow trigger paths in total.

---

## 5. Overlap Policy

Configurable per Scheduler-Doc; default `skip`.

| Policy | Behavior on tick if the last run is still active |
|---|---|
| `skip` | Tick is discarded. Event Log: `SKIPPED` with `reason: "overlap"`. |
| `queue` | Tick is held in the internal queue. On `COMPLETED`/`FAILED` of the active run, the next tick from the queue fires. Multiple queue entries are consolidated into **one** (max. 1 waiting run per Scheduler). |
| `cancelPrevious` | Active Process is terminated via `processStop(reason="scheduler-overlap")`; then the new run starts. |

"Still active" means: a Process exists under the Scheduler's system Session with status ∈ `{ready, running, paused, blocked, suspended}`.

---

## 6. System Session per Scheduler

Each Scheduler has **one** dedicated Session named `_ursascheduler_<scheduler-name>` in the Project Scope:

- Created on the first tick (lazy), not on bootstrap.
- `system=true` flag on the `SessionDocument` → hidden by default in the UI, no auto-title, no user-touch status (cf. [session-lifecycle §3](session-lifecycle.md)).
- `ownerUserId = runAs`. If `runAs` changes, the existing Session is **not** re-assigned — a new Session with the current suffix is created (`_ursascheduler_<name>__<runAs>` is not the schema; instead: old Session remains for history, new Session gets the same name with suffix counter `_ursascheduler_<name>_v2` — details in implementation, not in spec).
- Lifecycle: the Session is **not** closed between runs. It remains `IDLE`/`unbound`, collecting run history. Only when the Scheduler-Doc is deleted (or via explicit admin action) is it archived.
- Lane serialization runs per Session — thus, overlap `queue`/`skip` is naturally covered: two parallel scheduled Processes of the same Session are already sequenced by the Lane (cf. CLAUDE.md "Think-Process / Scope Besonderheiten").

**Why one Session per Scheduler and not one per Project?** Clean history per Scheduler, Inbox items route naturally, Lane serialization is exactly where we want it (no cross-Scheduler blocking). Tradeoff: one "technical" Session-Document per Scheduler — the `system=true` UI filtering makes this manageable.

---

## 7. Event Log (Generic)

Instead of a Scheduler-specific `lastRun` table, there is a **generic Event Log collection** `event_log`, which will later also accommodate webhooks and Ursahook mechanisms.

### Schema

```
EventLogDocument {
  id              Mongo ObjectId
  tenantId        String
  projectId       String?              // nullable for tenant-wide events

  source          String               // "ursascheduler:<name>" | "webhook:<id>" | "hook:<key>"
  type            EventType            // see table below
  timestamp       Instant              // when the event occurred
  correlationId   String?              // connects TRIGGERED → STARTED → COMPLETED/FAILED/SKIPPED of a run

  // Context (optional, schema-light — type-specific)
  sessionId       String?              // which system Session
  processId       String?              // which Process (filled from STARTED)
  runAs           String?              // which user
  payload         Map<String,Object>?  // type-specific fields (e.g., error-message, skip-reason)
}

enum EventType {
  TRIGGERED,    // Trigger fired (Cron tick, Webhook hit, ...)
  STARTED,      // Process created and running
  COMPLETED,    // Process successfully finished (done)
  FAILED,       // Process finished with error
  SKIPPED,      // Trigger fired, but no Process started (Overlap-Skip, disabled-Race, ...)
  CANCELLED     // Process terminated by Overlap-cancelPrevious
}
```

### Indexes

- `(tenantId, source, timestamp DESC)` — primary lookup "last run of Scheduler X"
- `(tenantId, projectId, timestamp DESC)` — Project event stream for UI
- `(correlationId)` — Run detail page

### Usage by the Scheduler

- **Last Run:** `eventLog.findLatest(source="ursascheduler:<name>", type∈{STARTED, COMPLETED, FAILED, SKIPPED})` — no `lastRun` cache.
- **Next Run:** calculated from the Cron expression, not persisted (Spring `CronExpression.next(...)`).
- **Run History for the UI:** filter by `source` and time range.

### Future Usage

- Webhooks (`source="webhook:<id>"`): `TRIGGERED` on HTTP hit, `STARTED`/`COMPLETED`/`FAILED` analogously.
- System Ursahooks (`source="hook:<key>"`): generic lifecycle Ursahooks (e.g., "Project started", "Session closed") that spawn a Recipe.
- External Events (`source="external:<source>"`): events explicitly pushed by the user, e.g., via REST.

**Retention:** Default TTL 90 days (`scheduler.eventLog.retentionDays` as a setting). Cleanup job runs daily.

---

## 8. Bootstrap & Refresh

### Project Bootstrap

When activating a Project on a Brain Pod (see [project-lifecycle](project-lifecycle.md)):

1. `UrsaSchedulerService.bootstrapProject(tenantId, projectId)` runs.
2. `documentService.listByPrefixCascade(tenantId, projectId, "_vance/scheduler/")` returns all Scheduler-Docs.
3. For each Doc: parse YAML, validate (Cron expression, Recipe existence, `runAs` user existence), on success register a `ScheduledFuture` with the Spring `TaskScheduler`.
4. Validation errors are logged **and** sent as an Inbox item to the `createdBy` of the Doc — no bootstrap delay due to a single broken Doc.

### Project Unload

On Pod change or Project suspend: all `ScheduledFuture`s of the Project are canceled. System Sessions remain in Mongo, are reused on the next bootstrap.

### Refresh

Three paths trigger a refresh:

- **Tool `scheduler_refresh`** — callable by the Agent (cf. §9).
- **WebUI button** in the Scheduler editor ("Reload").
- **Automatically after `scheduler_set`/`scheduler_delete`** — the respective Tool handler calls refresh only for the affected Scheduler name (delta refresh, not full re-bootstrap).

---

## 9. Agent Tools

Five tools in the `scheduler` toolset, available by default for Engines with worker spawn rights (Eddie, Arthur). All mutations go through the `lockMode` gate (§10b) before any write operation — `protected`/`hidden` entries are read-only or invisible from the Tool's perspective.

| Tool | Label | Effect |
|---|---|---|
| `scheduler_list` | `read-only` | Returns all non-`hidden` Schedulers of the current Project (name, description, Cron or `at`, enabled, last run, `locked: true` for `protected`). |
| `scheduler_get(name)` | `read-only` | Returns the complete YAML of a Scheduler. `hidden` responds like a missing address ("not found"). |
| `scheduler_set(name, yaml)` | `write` | Upsert: validates YAML, creates the Document or completely replaces the body (previous state is auto-archived by the Document Layer), triggers delta refresh. Response includes `created: true|false`. Rejected if a cascade-resolved entry with the name has `lockMode ≠ full`. |
| `scheduler_delete(name)` | `write` | Removes the Document and cancels the `ScheduledFuture`; same gate check. |
| `scheduler_refresh` | `admin` | Force-reloads all Schedulers of the Project. Disabled in the standard Engine toolset, included in the `admin` toolset. |
| `scheduler_fire(name)` | `admin` | Triggers a registered Scheduler immediately, bypassing the Cron schedule. Goes through the same `fire()` path as a Cron tick (Overlap Policy, Event Log, Scheduler Log, metrics) — only difference: the Scheduler Log Document carries `trigger: manual` instead of `trigger: cron`. Response provides `correlationId` + `logPath` of the run Document, which the Engine can then view via `document_read`. |

---

## 9a. Scheduler Log Documents

Each run creates a **Markdown document per Correlation ID** under

```
_vance/logs/scheduler/<name>/<isoStamp>-<correlationId>.md
```

in the firing Project. This is the LLM-/operator-readable materialization of the Event Log — no additional tool needed, the model finds the logs via `document_list` / `document_read`.

### Content

YAML front matter + Markdown body. Example:

```markdown
---
kind: scheduler-log
scheduler: morning-briefing
correlationId: run_550e8400-e29b-41d4-a716-446655440000
trigger: cron        # cron | manual
runAs: user_alice
sessionId: sess_xyz
processId: proc_xyz
firedAt: 2026-06-09T08:15:00Z
completedAt: 2026-06-09T08:15:01.789Z
durationMs: 1789
outcome: completed   # pending | completed | failed | cancelled | skipped_overlap | skipped_overlap_queued
---

# Scheduler 'morning-briefing' — run_550e…

- **Fired:** 2026-06-09T08:15:00Z (cron)
- **Outcome:** completed (1789 ms)
- **RunAs:** user_alice
- **Process:** proc_xyz
- **Session:** sess_xyz

## Timeline

- 2026-06-09T08:15:00.123Z  TRIGGERED  source=ursascheduler:morning-briefing
- 2026-06-09T08:15:00.456Z  STARTED    process=proc_xyz session=sess_xyz
- 2026-06-09T08:15:01.789Z  TERMINATED outcome=completed
```

### Write Pattern

`SchedulerLogService` upserts the Document per lifecycle transition (TRIGGERED → STARTED → TERMINATED or FAILED / SKIPPED / CANCELLED). Until termination, `outcome: pending` — the model can inspect the run mid-flight.

### TTL

`DocumentDocument.expiresAt` carries a MongoDB TTL index (`@Indexed(expireAfterSeconds = 0)`). The Scheduler Log writer sets the field to `firedAt + retentionDays`. Regular Documents leave the field `null` → no expiry.

**Retention Configuration** (Project Cascade, first-match-wins):

1. Setting `scheduler.log.retentionDays` on `project/<projectId>` — configurable per Project (e.g., compliance Project wants 30 days).
2. Setting `scheduler.log.retentionDays` on `project/_tenant` — Tenant-wide default.
3. `vance.scheduler.log.retention-days` from `application.yml` (Operator fallback, default **7**).

**Value Range (tri-state):**
- `> 0` → actual retention in days, clamped to `<= 365`.
- `0` → **Infinite Retention**. Document is written, but `expiresAt` remains `null` — Mongo's TTL monitor never cleans it up. Intended for compliance/audit Projects where run logs should be permanently preserved. Manual deletion possible via the normal Document API.
- `< 0` → **Disabled**. The service completely skips the Document write; Event Log and metrics remain unchanged. This allows disabling the entire materialization path per Tenant/Project without affecting the Scheduler itself.

The value is resolved freshly per upsert — a setting change takes effect immediately on the next lifecycle event of an active Scheduler, without Brain restart.

Important: TTL deletes the Document row **permanently** — no archive, no trash step. A conscious choice, because logs are only for diagnosis and the Event Log remains the source of truth.

### Relationship to Event Log

- **Event Log** (`event_log` collection) remains the source of truth: atomic appends, metric coupling, REST surface (`GET /scheduler/{name}/events`).
- **Scheduler Log Document** is the LLM-readable materialization. In case of a crash between event append and document upsert, the document remains inconsistent (`outcome: pending`) — it will be deleted by TTL anyway, the Event Log preserves the correct trace.

---

## 10. WebUI Editor

In `vance-face`, the Scheduler editor lives alongside the Recipe and Settings editors (cf. [web-ui §7](web-ui.md)):

- Editor entry: `packages/vance-face/scheduler.html`, MPA pattern like the rest.
- Listing: REST snapshot via `GET /brain/{tenant}/project/{project}/scheduler` — no live update in v1 (cf. "Live updates exclusively in the chat editor").
- Editor: CodeMirror 6 with YAML mode, validation against the §2 schema before saving.
- Cron helper: small UI component that renders Cron expressions into "next 5 runs" (purely client-side via Cron parser lib).
- Run history: right panel lists the last 20 entries from the Event Log (REST), clickable to the Run detail view with Process and Session links.

REST endpoints (all in `vance-brain`):

```
GET    /brain/{tenant}/project/{project}/scheduler                # List
GET    /brain/{tenant}/project/{project}/scheduler/{name}         # Detail
PUT    /brain/{tenant}/project/{project}/scheduler/{name}         # create/update (idempotent)
DELETE /brain/{tenant}/project/{project}/scheduler/{name}
POST   /brain/{tenant}/project/{project}/scheduler/refresh        # explicit refresh
POST   /brain/{tenant}/project/{project}/scheduler/{name}/fire    # manual trigger (returns correlationId + logPath)
GET    /brain/{tenant}/project/{project}/scheduler/{name}/events  # Event Log, paginated
```

---

## 10a. One-Shot Trigger (`at`)

Instead of `cron:`, a Scheduler may set `at:` — an ISO-8601 date-time that fires exactly once. The use case is "Eddie/Arthur says: start the morning program tomorrow morning at 8 AM" — the Engine writes a Scheduler-Doc with `at: "2026-05-14T08:00:00"` via the `scheduler_set` tool, the Brain fires exactly once and disables itself.

```yaml
description: "Morning program — one-time tomorrow morning."
at: "2026-05-14T08:00:00"          # local time; resolved against `timezone:`
timezone: "Europe/Berlin"
recipe: "morning-briefing"
```

**Time formats** (all SnakeYAML-tolerant — strings may remain unquoted):

| Form | Example | Zone |
|---|---|---|
| LocalDateTime | `2026-05-14T08:00:00` | `timezone:` field → Fallback UTC |
| ZonedDateTime | `2026-05-14T08:00:00+02:00` | from the offset |
| Instant (UTC-Z) | `2026-05-14T06:00:00Z` | UTC |

**Registration:** instead of `CronTrigger`, `UrsaSchedulerService` calls Spring `TaskScheduler.schedule(Runnable, Instant)`. After the single fire, the `ScheduledFuture` is automatically terminated — no subsequent ticks.

**Source of Truth for "already fired":** the `event_log`. If a `STARTED` event exists for the source `ursascheduler:<name>`, the one-shot is considered consumed. This rule makes the path crash-safe: a Brain restart exactly between spawn and Doc cleanup does not lead to a second run.

**Bootstrap logic for `at`-Schedulers:**

```
register(at-scheduler):
  hasFired = eventLog.findLatest(source="ursascheduler:<name>", types=[STARTED]).isPresent()
  if hasFired:
    skip + move Doc to _bin (self-healing)
  elif at < now():
    fire immediately (catch-up after Brain down-time)
  else:
    taskScheduler.schedule(runnable, at)
```

**After successful fire:** the Executor moves the Scheduler-Doc via [`DocumentService.trash`](../repos/vance/server/vance-shared/src/main/java/de/mhus/vance/shared/document/DocumentService.java) to the Project trash (`_bin/<uuid>_<name>.yaml`). The Doc thus disappears from the `_vance/scheduler/` prefix — no re-register on the next bootstrap, no "expired" entry in the list. The run history remains in the Event Log; the original content is soft-deleted in `_bin/` and can be restored via `DocumentService.restore` if needed.

**Overlap Policy** is irrelevant for `at`-Schedulers (only one fire possible) — the value is parsed but not used.

---

## 10b. LLM Lockdown (`lockMode`)

The Agent (Eddie/Arthur) has full CRUD rights on the Scheduler via the `scheduler` toolset in the standard setup. For admin-maintained Schedulers (backups, security scans, compliance checks), the LLM should **not** be able to touch anything — neither edit nor delete, possibly not even see. This is controlled by `lockMode:` in the Scheduler YAML.

| `lockMode` | `scheduler_list` (Tool) | `scheduler_get` (Tool) | create / update / delete (Tool) | WebUI / REST |
|---|---|---|---|---|
| `full` (Default) | visible | visible | allowed | visible, editable |
| `protected` | visible, with `"locked": true` marker | visible | **rejected** (`ToolException`) | visible, editable |
| `hidden` | **filtered out** | **"not found"** | **rejected** (`ToolException`) | visible, editable |

**Gate Rule for Mutations:** Before each `scheduler_set` / `scheduler_delete`, the Tool Layer loads the Scheduler via the normal Cascade. If an entry with that name exists and its `lockMode` ≠ `full`, the operation is rejected. This prevents the Agent from circumventing a protected Tenant Scheduler by creating a project-local override with the same name.

**`hidden` vs. `protected`:**
- `protected` is the normal choice: the Agent knows the Scheduler exists but cannot change it. Listing shows it as "read-only", which the LLM can incorporate into its decisions ("there's already a nightly-cleanup at 03:00, I don't need to create a second one").
- `hidden` is intended for audit savers / compliance triggers whose existence should not even be known to the Agent. `scheduler_list` filters them out, `scheduler_get` responds as if the entry were deleted, and mutations fail with the same lock error — so the *existence* inevitably leaks as soon as an Agent guesses the name and tries to write. To circumvent this, give the entry a hard-to-guess name or use the second line of defense: remove tools entirely from the worker's toolset via Recipe `allowedToolsRemove`.

**REST and WebUI** do **not** check `lockMode` — they already run behind `Resource.Project` + `Action.WRITE/ADMIN` authority. The lock model is explicitly an LLM protection layer, not an RBAC replacement.

**Setting via the Tools themselves:** The Agent can set `lockMode: full` (default) when creating a new Scheduler — they may also write `protected` or `hidden`, as this would be self-restriction and is not dangerous. Escalating an existing `full` Scheduler to `protected` via update is allowed for the same reason; the Agent merely loses future access to it.

---

## 11. What v1 Does NOT Do

- **No Resource default Schedulers.** Schedulers are always project- or tenant-specific.
- **No field-level merges** between Tenant and Project Schedulers (override is all-or-nothing by name).
- Webhooks (`POST /brain/.../event/...`) and Ursahooks (lifecycle-event-driven) are separate trigger sources with their own specs ([events](events.md), [ursahooks](ursahooks.md)) — they use the same `ActionExecutorRegistry` as the Scheduler. The Event Log records their rows with `source = "event:<name>"` or `source = "hook:<event>:<name>"`.
- **No "run now" button with override params** — the WebUI button fires exactly like the Cron tick, without ad-hoc parameter adjustment. To vary parameters, edit the Doc or spawn directly via `process_create`.
- **No dependency chains** (Scheduler A triggers Scheduler B). If this is needed, write a spawn step in the Recipe.
- **No Kit integration.** Schedulers are not part of the Kit inherit chain — Kits provide Recipes/Skills/Settings/Tools (cf. [kits §2](kits.md)), Scheduler remains user/agent domain. If a need arises later for "standard Schedulers from a Kit", `scheduler/` will be added as a fourth top-level directory.

---

## 12. Open Points

The following topics are **not yet** marked as binding in the spec — the respective defaults are set in the text, but the v2 behavior is intentionally open:

1. **TTL default for the Event Log** (§7): currently 90 days as a suggestion; perhaps a tenant setting with a more conservative default (e.g., 30 days). Cleanup job runs daily, the volume will only be decided after real operation.
2. **Multi-Pod coordination**: the Project runs on exactly one Pod at any given time (cf. [project-lifecycle](project-lifecycle.md)), so the Spring `TaskScheduler` locally suffices. If a Project is later to be active on multiple Pods, we will need Mongo-based lock acquisition per tick — explicitly not in v1.
3. **Notification hook for `at`-catch-up** (§10a): a one-shot that starts several hours late due to Brain downtime currently runs silently. An Inbox item to `runAs` with a note "ran X minutes late" would be useful — will come later if the need becomes concrete.

### Decisions Cemented Since Spec Creation

- **`runAs` change** (§6): old system Session remains as an audit trail, a new one is created with a suffix (`_ursascheduler_<name>_v2` etc.). Implemented in `SystemSessionResolver`.
- **Cron syntax**: Quartz with 6 fields (seconds in the required field) — Spring `CronExpression` is native, and second resolution allows the 20-second heartbeats used in ai-test. Web-UI renders the next runs as a helper.

---

*See also: [recipes](recipes.md) | [execution-modes-trigger](execution-modes-trigger.md) | [session-lifecycle](session-lifecycle.md) | [user-interaction](user-interaction.md) | [project-lifecycle](project-lifecycle.md) | [web-ui](web-ui.md)*
