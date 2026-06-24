---
title: "Vance — Workflows"
parent: Specs
permalink: /specs/workflows
---

<!-- AUTO-GENERATED from specification/public/en/workflows.md — do not edit here. -->

---
# Vance — Workflows

> A **Workflow** is a project-scoped automation: a state-machine plan of typed tasks (Agent / Script / Tool / Gate / Timer / Condition / Sub-Workflow / Terminal) that is started by external triggers and runs via append-only Journal Records. Workflows live as YAML documents under `_vance/workflows/<name>.yaml` in the Document Layer.
>
> Workflows are **not** a replacement for session-driven Chat Engines (Arthur) and **not** a multi-phase plan runner for Sessions (Vogon). They are the layer *above* the Engines: they spawn Jeltz/Ford/Marvin/Vogon as sub-tasks, evaluate conditions on structured outputs, and survive Session boundaries — some Workflows run for weeks.
>
> Each Workflow definition is declarative configuration. At each start, the Engine freezes the complete YAML as a snapshot into the Run — edits to the source document do not affect running Runs.
>
> See also: [kits](/specs/kits) | [scheduler](/specs/scheduler) | [events](/specs/events) | [recipes](/specs/recipes) | [jeltz-engine](/specs/jeltz-engine) | [vogon-engine](/specs/vogon-engine) | [user-interaction](/specs/user-interaction)

---

## 1. Terminology

| Term | Definition |
|---|---|
| **Workflow-Doc** | YAML document under `_vance/workflows/<name>.yaml` in the Project or in the `_tenant`-Tenant-Scope. Filename (without `.yaml`) is the Workflow name. |
| **Workflow-Run** | A running instance, identified by an 8-hex-`workflowRunId`. Persisted as an append-only Journal in the Mongo collection `magrathea_journal`. |
| **State** | Entry under `states:` in the YAML. Carries a Task type, an optional `storeAs:` variable, transitions (`on:`/`catch:`), and potentially a Retry block. |
| **Task** | An execution instance of a State. Persisted in the Mongo collection `magrathea_tasks` while it is pending/claimed/running. |
| **Outcome** | String produced by a Task at the end (`success`, `failure`, or type-specific like `approved`, `business_error`, `timeout`, `fired`). Matched by the Transition Resolver against `on:`/`catch:`. |
| **Journal** | Append-only audit trail of typed Records (`StartRecord`, `StateEnteredRecord`, `TaskStartedRecord`, `TaskResultRecord`, `VarRecord`, `StatusRecord`, `ResultRecord`, …). Source of truth for each Run; all status views are projections. |
| **Frozen Snapshot** | The complete YAML body saved into the `StartRecord` at `start()`. Running Runs read exclusively from it. |

**Workflow ↔ Recipe ↔ Engine:** Engines are code (Arthur/Ford/Vogon/Marvin/Jeltz). Recipes are named Engine configurations. Workflows orchestrate Tasks — some of these Tasks spawn Recipes. A Workflow State definition references a Recipe by name; inline Recipe definitions are not allowed.

---

## 2. Workflow YAML Schema

```yaml
# _vance/workflows/pr-review.yaml

description: |
  Pull-Request-Review-Flow: Plan, Tests, Review-Gate, Merge.

version: "1"
start: plan

parameters:
  pr_url:    { type: string,  required: true }
  reviewer:  { type: string,  required: false, default: "@maintainers" }

bounds:
  maxTotalCostUsd:     10.0
  maxWallclockSeconds: 604800       # 7 Tage
  maxTaskSpawns:       100

allowedTools:
  - github.merge_pr
  - github.add_comment
  - web_search

tags: [pr, review]

states:
  plan:
    type: agent_task
    recipe: jeltz
    params:
      prompt: "Analyse PR ${params.pr_url}, identify risks, propose review plan."
      schema:
        risk:        { type: string, enum: [low, medium, high] }
        focus_areas: { type: array,  items: { type: string } }
    storeAs: plan_output
    timeoutSeconds: 600
    on:
      success: run_checks
    catch:
      agent_error: human_review

  run_checks:
    type: script_task
    run: "npm test && npm run lint"
    dirName: workspace
    timeoutSeconds: 1800
    retry:
      maxAttempts: 2
      on: [technical_error, timeout]
      backoffSeconds: 60
    on:
      success: route
    catch:
      business_error: debug
      technical_error: escalate

  route:
    type: condition_task
    transitions:
      - if: "#state['plan_output']['risk'] == 'low'"
        to: merge
      - else: human_review

  human_review:
    type: gate_task
    inbox:
      kind: APPROVAL
      title: "PR ${params.pr_url} approve?"
      assignedTo: "${params.reviewer}"
      criticality: NORMAL
    timeoutSeconds: 604800
    storeAs: review_decision
    on:
      approved: merge
      rejected: plan
    catch:
      timeout: escalate

  merge:
    type: tool_task
    tool: github.merge_pr
    params:
      url: "${params.pr_url}"
    on:
      success: done
    catch:
      permission_error: escalate
      technical_error:  retry_or_abort

  debug:
    type: agent_task
    recipe: ford
    params:
      prompt: |
        Diagnose the failing checks and propose a fix.
        stderr: ${state.check_output.stderr}
    on:
      success: run_checks
      failure: escalate

  retry_or_abort:
    type: gate_task
    inbox:
      kind: DECISION
      title: "Merge tool kept failing — retry or abort?"
      options: [retry, abort]
    on:
      retry: merge
      abort: escalate

  done:
    type: terminal
    outcome: success
    result:
      summary: "${state.review_summary}"

  escalate:
    type: terminal
    outcome: failure
```

### 2.1 Top-Level Fields

| Field | Required | Meaning |
|---|---|---|
| `description` | optional | Audit marker, visible in Web UI listings. |
| `version` | optional | Free string, lands in `StartRecord.workflowVersion`. |
| `start` | **yes** | Name of the initial State. Must exist in `states:`. |
| `parameters` | optional | Map of caller parameter schemas. Permissive pass-through: caller parameters outside the schema are passed through. |
| `bounds` | optional | Global guardrails per Run (§9). |
| `allowedTools` | optional | Workflow-specific Tool whitelist; AND-combined with Project + Tenant pools (§10). |
| `tags` | optional | Audit labels. |
| `states` | **yes** | Map state-name → state-spec. At least one State, must contain `start`. |

### 2.2 Common State Fields

| Field | Meaning |
|---|---|
| `type` | Required. One of `agent_task` / `script_task` / `tool_task` / `gate_task` / `timer_task` / `condition_task` / `workflow_task` / `terminal`. |
| `description` | Audit string. |
| `timeoutSeconds` | Task-level Timeout. `script_task` maps to `waitMs`; `gate_task` creates a parallel Timeout Timer (§5.4). |
| `storeAs` | Variable key. For non-null output, the Dispatcher writes a `VarRecord(key, value)` to the Journal. |
| `on:` | Map outcome → next-state. Checked first by the Resolver. |
| `catch:` | Map error-kind → next-state. Outcome interpreted as `ErrorKind`-Enum (case-insensitive, dashes→underscores). |
| `retry:` | Spec with `maxAttempts`, `on: [error-kinds]`, `backoffSeconds`. State-level Retry preempts Resolver routing (§4.3). |

### 2.3 YAML 1.2 Boolean Semantics

The Workflow parser uses a custom resolver with YAML 1.2 Boolean rules: only `true`/`false` are coerced. The barewords `on:`/`off:`/`yes:`/`no:` remain strings — otherwise, SnakeYAML defaults (YAML 1.1) would rewrite the `on:` transition block keyword to `Boolean.TRUE`.

---

## 3. Task Types

Eight types, all sharing the same lifecycle model: each Task produces a `TaskCompletedEvent` with an Outcome string, which triggers the Transition Resolver. Sync vs. Async types differ only in **who** writes the `TaskResultRecord`.

| Type | Synchronous? | What it does |
|---|---|---|
| `condition_task` | yes | SpEL branch match via `transitions:` list. Sets `nextStateOverride`. |
| `tool_task` | yes | Calls `tool:` via Tool Dispatcher. Output = Tool Result Map. |
| `script_task` | yes (blocks Lane until `timeoutSeconds`) | Shell command via `ExecManager`. Output = `{status, exitCode, stdout, stderr, durationMs}`. |
| `terminal` | yes | Writes `StatusRecord(DONE/FAILED)` + optional `ResultRecord`. No transitions. |
| `agent_task` | no | Spawns ThinkProcess via Recipe. Completion via ThinkProcess termination event. |
| `gate_task` | no | Creates Inbox item. Completion via Inbox answer event. |
| `timer_task` | no | Schedules entry in `magrathea_timers`. Completion via Timer Scanner. |
| `workflow_task` | no | Spawns Sub-Workflow. Completion via Sub-Run terminal event. |

### 3.1 `agent_task`

```yaml
plan:
  type: agent_task
  recipe: jeltz
  params:
    prompt: "Analyse the PR ..."
    schema: { ... }
  storeAs: plan_output
  timeoutSeconds: 600
  on:
    success: run_checks
  catch:
    agent_error: human_review
```

`recipe:` is required, resolved via the normal Recipe cascade. `params:` lands as `engineParams` on the spawned ThinkProcess. Jeltz consumes `prompt`+`schema` directly; Ford/Vogon/Marvin read Recipe-specific fields.

Outcome mapping:

- **Jeltz**: Wrapper parse from last Assistant message. `success: true` → `outcome=success`, `output=data`. `success: false` → `outcome=agent_error`, `output=lastInvalid`.
- **Other Engines**: Terminal CloseReason to Outcome. `DONE`/`AUTO_CLOSE` → `success` with last Assistant message as output. `STALE` → `technical_error`. `STOPPED`/`ARCHIVED`/`USER_DELETE`/`ABANDONED` → `cancelled`.

Sub-ThinkProcesses run in a dedicated system session `_magrathea_<runId>` analogous to the Scheduler pattern.

### 3.2 `script_task`

```yaml
run_checks:
  type: script_task
  run: "npm test && npm run lint"
  dirName: workspace
  timeoutSeconds: 1800
  on:
    success: review
  catch:
    business_error: debug
    technical_error: escalate
```

Delegates to the existing `ExecManager.submitTrackedAndRender`. `dirName:` references a Workspace RootDir (see `workspace.md`); without it, the submit fails with `technical_error`.

Outcome mapping:

| ExecJob Status | exitCode | Workflow Outcome |
|---|---|---|
| `COMPLETED` | `0` | `success` |
| `COMPLETED` | `≠0` | `business_error` |
| `KILLED` | — | `timeout` (Watchdog Kill) |
| `RUNNING` | — | `timeout` (waitMs exhausted) |
| `FAILED` / `ORPHANED` | — | `technical_error` |

### 3.3 `tool_task`

```yaml
merge:
  type: tool_task
  tool: github.merge_pr
  params:
    url: "${params.pr_url}"
  storeAs: merge_result
  on:
    success: done
  catch:
    permission_error: escalate
    technical_error: retry_or_abort
```

Direct call via `ToolDispatcher`. The Tool Invocation Context carries `tenantId`/`projectId`/`userId=startedBy`, but `sessionId`/`processId` are null — Tools requiring these must validate defensively.

Outcome: `success`, `permission_error` (PermissionDeniedException), `technical_error` (ToolException or others).

### 3.4 `gate_task`

Pause on a User Inbox item. Three variants:

```yaml
review:
  type: gate_task
  inbox:
    kind: APPROVAL                # APPROVAL | DECISION | FEEDBACK
    title: "Approve?"
    body: "${state.summary}"
    assignedTo: "@maintainers"    # or a User Name or Tag
    criticality: NORMAL           # LOW | NORMAL | CRITICAL
    tags: [pr-review]
    options: [approve, reject]    # only for DECISION
  timeoutSeconds: 604800          # optional: parallel Timeout Timer
  storeAs: review_decision
  on:
    approved: merge
    rejected: plan
  catch:
    timeout: escalate
```

**`assignedTo`-Fallback:** Spec value → `startedBy` → `"@system"`.

**Outcome mapping by Answer Outcome × InboxItemType:**

| Type \ Answer | DECIDED | INSUFFICIENT_INFO | UNDECIDABLE |
|---|---|---|---|
| APPROVAL | `approved`/`rejected` (from `value.approved` bool) | `insufficient_info` | `undecidable` |
| DECISION | `<chosen option>` (from `value.chosen` string) | `insufficient_info` | `undecidable` |
| FEEDBACK | `success` (text in `value.text`) | `insufficient_info` | `undecidable` |

The Inbox item carries `payload.kind = "workflow.gate"` as a discriminator plus `workflowRunId`, `workflowName`, `workflowState` for the UI.

**Timeout mechanism:** if `timeoutSeconds:` is set, the Executor creates a timer entry in addition to the Inbox item with `firedOutcome = "timeout"`. Two race paths compete:

- User answers first → Inbox Listener fires Outcome → Timer fire is later discarded by `appendIfAbsent` idempotence.
- Timer fires first → `outcome=timeout`, Run advanced via `catch.timeout:`. Subsequent User answer still lands in Inbox, but the Run no longer reacts.

### 3.5 `timer_task`

```yaml
wait_for_feedback:
  type: timer_task
  duration: "7d"
  on:
    fired: send_reminder
```

`duration:` parser format: ISO-8601 (`P7D`, `PT5M30S`) or shortcuts (`7d`, `4h`, `30m`, `45s`, `250ms`).

Outcome: always `fired`. Timers do not fail — the scanner path is deterministic.

### 3.6 `condition_task`

```yaml
route_by_risk:
  type: condition_task
  transitions:
    - if: "#state['plan_output']['risk'] == 'low'"
      to: merge
    - if: "#state['plan_output']['risk'] == 'high'"
      to: review
    - else: triage
```

Pure SpEL evaluation. First matching rule wins; `else:` must be the last rule (loader validation).

SpEL variables:

- `#state['<key>']` — Workflow variables from previous `storeAs:` writes.
- `#params['<key>']` — Caller parameters (set at `start()`).
- `#tasks['<state>']['output']` — reserved for future use.

Sandbox: `T(...)`, `new ...` and method calls are blocked. Operators `==`, `!=`, `<`, `<=`, `>`, `>=`, `&&`, `||`, `!`, `in {...}`, `matches '<regex>'`, ternary `? :`, Elvis `?:` are allowed.

### 3.7 `workflow_task`

```yaml
build_subprojects:
  type: workflow_task
  workflow: build-and-test
  params:
    repo_url: "${state.repo_url}"
  storeAs: build_result
  timeoutSeconds: 3600
  on:
    success: deploy
  catch:
    failure: escalate
```

Spawns a Sub-Run and waits for its terminal. Variable passing:

- **Incoming** (Parent → Sub): only via `params:`. No implicit inheritance mechanism.
- **Outgoing** (Sub → Parent): the Sub-Run's terminal State writes `ResultRecord(result)`. The Parent captures this via `storeAs:`.

Parent identity (`workflowRunId`, `state-name`) is persisted in `StartRecord.parentMagratheaProcessId` + `parentState` of the Sub-Run — audit chain through arbitrarily deep nesting.

Outcome: `success` (Sub `DONE`), `failure` (Sub `FAILED`/`TERMINATED`).

### 3.8 `terminal`

```yaml
done:
  type: terminal
  outcome: success                # success | failure (Default success)
  result:
    summary: "..."
```

End node. Writes:
- `StatusRecord(DONE)` if `outcome: success`, `StatusRecord(FAILED)` otherwise.
- `ResultRecord(state, result)` if `result:` is set.
- For Sub-Workflows: triggers `WorkflowCompletedEvent` to the Parent.

Multiple terminal States are allowed and common — typical names: `done`, `merged`, `escalated`, `aborted`.

---

## 4. State Transitions

### 4.1 Resolver Order

1. **`nextStateOverride`** — only `condition_task` sets this.
2. **`on:`** — exact string match against Outcome.
3. **`catch:`** — Outcome interpreted as `ErrorKind`-Enum.
4. No match → Run failed with `StatusRecord(FAILED, reason="no transition for outcome '<x>'")`.

### 4.2 ErrorKind Vocabulary

Seven categories that `catch:` can understand:

| Kind | When |
|---|---|
| `technical_error` | Tool/API/Shell infra broken (IOException, 5xx, …). |
| `business_error` | Expected business error (exit !=0, Validation Fail). |
| `agent_error` | LLM produced invalid output (Jeltz `schema_violation`). |
| `timeout` | Task timeout or Gate timeout. |
| `permission_error` | Tool not allowed for this Workflow/Caller. |
| `human_rejected` | Alias for gate-`rejected` for uniform catching. |
| `cancelled` | Workflow stopped by `cancel`/Bounds exhaustion. |

### 4.3 Retry preempts Resolution

```yaml
flaky:
  type: script_task
  run: "npm test"
  retry:
    maxAttempts: 3
    on: [technical_error, timeout]
    backoffSeconds: 60
  on:
    success: review
  catch:
    technical_error: escalate
```

Order in `handleCompletion`:

1. `TaskResultRecord` writes (idempotent).
2. `VarRecord` for `storeAs:`.
3. Terminal special case (StatusRecord+ResultRecord if `type: terminal`).
4. **Retry Check**: if Outcome matches `retry.on:` and `retryCount+1 < maxAttempts` → re-enqueue in the same State with `retryCount+1` and `backoffSeconds`. Catch is skipped.
5. **Bounds Check** (§9).
6. Transition Resolver (on → catch → fail).

`maxAttempts` counts **including** the first attempt. `maxAttempts: 3` = original + 2 retries.

---

## 5. Lifecycle of a Workflow Run

```
start(name, params, startedBy)
  ↓
  StartRecord (with Frozen-YAML, parent-Identity if Sub-Run)
  StateEnteredRecord(<start-state>)
  magrathea_tasks.insert(PENDING)
  ↓
Claim-Scanner (every 2s, per Pod):
  CLAIMED → ProjectLane.submit(execute)
  ↓
TaskExecutor:
  TaskStartedRecord
  TypeExecutor.execute()
  ↓
  ├── Sync: TaskCompletedEvent directly
  └── Async: WAITING_*, Listener fires later
  ↓
handleCompletion (on the Project Lane):
  TaskResultRecord (idempotent appendIfAbsent)
  VarRecord for storeAs
  Terminal special case OR:
    Retry Check → re-enqueue same state
    Bounds Check → fail run
    Transition resolve → enqueue next state
  ↓
  ... until Terminal State
  ↓
StatusRecord(DONE/FAILED) — Run completed.
```

Each Run has its own `workflowRunId` (8-hex-UUIDv4-prefix). A maximum of one Task runs simultaneously per Run — Tasks are serialized via the Project Lane (§11).

---

## 6. Cascade — How Workflows are Resolved

```
project/_vance/workflows/<name>.yaml   (project-local override)
  ↓ falls back to
_tenant-tenant/_vance/workflows/<name>.yaml   (tenant-wide)
  ↓ falls back to
UnknownWorkflowException
```

**There is no Resource Tier** (Classpath/Bundled) for Workflows. Workflows are always project- or tenant-specific. Bundled examples are distributed via **Kits** (see [kits](/specs/kits)) — a Kit copies its `documents/_vance/workflows/*.yaml` into the Document Layer of the target Project.

The Resolver reads directly from Mongo for each `start()`. There is **no** refresh endpoint — unlike Schedulers, where the Cron Registry must be maintained separately.

---

## 7. Frozen Snapshot

At `start()`, the service copies the entire YAML body into `StartRecord.definitionYaml`. Every subsequent Task execution re-parses from this snapshot.

**Consequences:**

- Edits to the source document do **not** affect running Runs.
- Long Workflows (days/weeks with Gates) are robust against mid-flight schema drift.
- Bug fix rollouts: new Run first, old Runs must be explicitly canceled.
- Audit: `StartRecord.definitionYaml` is the authoritative answer to "what did this Run execute", even if the source document was deleted or rewritten.

---

## 8. Trigger Paths

### 8.1 Agent Tool `workflow_start`

```yaml
# Tool Schema
name: workflow_start
params:
  name:   { type: string }
  params: { type: object, optional }
```

Not in the Recipe Pool by default. Engines that should be allowed to start Workflows (typically Marvin/Vogon, not Arthur-Chat) include it in `allowedToolsAdd`.

Return value: `{ workflowRunId, workflowName }`.

### 8.2 REST

```
POST /brain/{tenant}/project/{project}/workflows/{name}/start
  Body: { params: {...}, startedBy: "..." }
  Reply: { workflowRunId, workflowName }

GET  /brain/{tenant}/project/{project}/workflows/runs/{runId}
  Reply: MagratheaProcessDto (status, currentState, vars, params, result, timestamps)

GET  /brain/{tenant}/project/{project}/workflows/runs?workflow=<name>
  Reply: List<MagratheaProcessDto>, newest first, max 100
```

`GET /runs/{runId}` performs Tenant/Project cross-check and returns 404 (not 403) if the Run belongs to another scope — existence is not leaked.

### 8.3 WebSocket

`MessageType.WORKFLOW_START` — Symmetrical to REST, runs over the client's bound Session (Foot, Web-UI).

```
client → brain: { type: "workflow-start", data: { name, params?, startedBy? } }
brain → client: { type: "workflow-start", data: { workflowRunId, workflowName } }
```

### 8.4 Scheduler Trigger

A Scheduler-Doc (`_vance/scheduler/<name>.yaml`) can have a `workflow:` field instead of `recipe:` — see [scheduler](/specs/scheduler) §4.2. At the cron tick (or one-shot `at:`), the `UrsaSchedulerService` calls `MagratheaWorkflowService.start(tenantId, projectId, workflowName, params, runAs)`. The Scheduler Event Log receives the `workflowRunId` as a payload field, allowing the Web-UI to reconstruct the connection between Scheduler tick and Workflow Run.

```yaml
# _vance/scheduler/daily-audit.yaml
description: "Start Daily Audit Workflow at 06:00"
cron: "0 0 6 * * *"
workflow: daily-audit                  # instead of recipe:
params:
  scope: "production"
runAs: "ops"
```

`recipe:` and `workflow:` are mutually exclusive — setting both results in a parse error from the UrsaSchedulerLoader.

### 8.5 Ursahook Trigger

Ursahooks (see [ursahooks](/specs/ursahooks)) can start Workflows from their host API — both JS Ursahooks and LLM Ursahooks (via the `workflow.start` action in the structured action schema).

**JS Ursahook:**

```javascript
// hooks.js
const runId = workflows.start("pr-review", { pr_url: event.pr.url });
log.info("started workflow", { runId });
```

**LLM Ursahook (structured action):**

```json
{ "kind": "workflow.start", "name": "pr-review", "params": { "pr_url": "..." } }
```

The UrsaHookDispatcher pins `tenantId`/`projectId` from the Ursahook scope — scripts cannot spawn cross-tenant or cross-project. `startedBy` is set to `"hook:<hookName>"` so that the Workflow Run in the Journal can be uniquely attributed to the triggering Ursahook.

If Magrathea is not active (`vance.services.magrathea=false`), `workflows.start()` returns `null` and logs WARN — the script decides how to react.

### 8.6 Event Trigger (external, REST)

Events are the external, REST-accessible trigger path — `GET|POST /brain/{tenant}/event/{project}/{event}`, JWT-free, optionally Bearer-authenticated. An Event-Doc carries only `workflow:` name + Auth config + static params; a POST body is passed to the Workflow under `params.payload`. See [events](/specs/events).

```yaml
# _vance/events/github-pr.yaml
description: "GitHub PR Hook → pr-review"
workflow: pr-review
methods: [POST]
auth:
  tokenSetting: events.github.token
```

Events are explicitly without rate limit, signature validation, or replay protection — operator responsibility, or via a dedicated provider receiver before the Brain.

### 8.7 Planned (outside v1)

- **Provider-specific Webhook Receivers** (GitHub `X-Hub-Signature-256`, Stripe signature, …) with built-in signature verification, pre-pended before the Event endpoint.
- **Async/SSE response** for Events that want to wait for Workflow completion.

---

## 9. Bounds

```yaml
bounds:
  maxTotalCostUsd:     5.0           # reserved, see below
  maxWallclockSeconds: 604800        # 7 days hard limit
  maxTaskSpawns:       100           # absolute cap including retries
```

The Bounds Check runs **after each Task completion** and **before** the next enqueue. If a Bound is exceeded, the service writes `StatusRecord(FAILED, reason="bounds exhausted: …")` and terminates the Run. Bounds do **not** route via `catch:` — they are a hard stop.

| Bound | What it checks |
|---|---|
| `maxWallclockSeconds` | `now - firstJournalEntry.createdAt > maxWallclockSeconds`. |
| `maxTaskSpawns` | Number of `TaskStartedRecord` entries in the Journal. Retries count. |
| `maxTotalCostUsd` | **Reserved** for LLM resource management integration; not enforced in v1. |

---

## 10. Tool Permission Cascade

```
allowed = tenant.allowedTools  ∩  project.allowedTools  ∩  workflow.allowedTools
denied  = tenant.denied  ∪  project.denied  (overwrites any allow)
```

Three layers, AND-combined. Workflow definitions can only **narrow** the Project pool, never expand it. If no `allowedTools:` is declared, the default pool is used without side effects (`web_search`, `doc_read`, `doc_list`, `inbox_read`).

Tool calls in `tool_task` and indirectly from `agent_task` sub-Engines are checked against this pool.

---

## 11. Pod Lane Serialization

A maximum of **one** `ProjectLane` runs simultaneously per Project — a single-thread executor per `(projectId)`. Every Task execution, every completion processing, and every transition resolution runs on this Lane. Race protection for the variable map and the Task queue comes from Lane serialization.

Tasks are claimed cross-pod via Mongo optimistic locking (CAS on `version`). A `TaskClaimer` runs per Pod (every 2s) that claims `PENDING` tasks and throws them into the local ProjectLane. If a Pod dies, the next claim attempt by another Pod takes over (see §12).

Within-Run serialization: for each `workflowRunId`, at most one Task is in the queue at any time, because the next Task is only enqueued upon completion of the current one.

---

## 12. Reclaim & Heartbeat

Pod crash resilience:

- **WAITING_*-Tasks** (`agent_task`/`gate_task`/`timer_task`/`workflow_task`) do **not** need reclaim — their completion listeners fire independently of the Pod. A 7-day Gate on a dead Pod is carried forward by the Inbox Listener on another Pod.
- **Sync-Tasks** (`condition_task`/`tool_task`/`script_task`/`terminal`) with `runStatus = null` can become stale if the Pod dies in the middle of execution. The `ReclaimScanner` (every 60s, per Pod) finds `CLAIMED`-Tasks with `claimedAt < now - 5min` and re-enqueues them as `PENDING` (Optimistic-CAS).
- **Heartbeat** for long-running Sync-Executors: Type-Executor can call `touchHeartbeat(taskId)`, which updates `heartbeatAt`. Scanner respects `heartbeatAt`.
- **Exhausted attempts**: after `maxClaimAttempts` (default 3), the Task fails terminally with `outcome=technical_error` — the `catch:` block routes if declared.

---

## 13. Web-UI

- **Listing**: `GET /workflows/runs` returns a MagratheaProcessDto list, newest first.
- **Detail**: `GET /workflows/runs/{runId}` provides status, currentState, vars, params, result, timestamps.
- **Workflow YAML Editor**: runs via the generic Document Editor (path `_vance/workflows/`).

Cancel, event stream, and live updates are v2 — the snapshot endpoint is sufficient for the v1 "what's running now?" view and is inexpensive (one Journal read).

---

## 14. Implementation Notes

Java implementation under `de.mhus.vance.brain.magrathea.*` (Service Layer) and `de.mhus.vance.shared.magrathea.*` (Persistence). The name **Magrathea** (Adams universe: a computer of sub-computers that solves tasks by composition) is the internal naming; user-facing, all surfaces remain named "Workflow".

Mongo Collections:

| Collection | Content |
|---|---|
| `magrathea_journal` | Append-only Audit Records per Run. Indexed on `(workflowRunId, createdAt)`, plus partial-unique-index on `(workflowRunId, taskId, type=TaskResultRecord)` for idempotent completion append. |
| `magrathea_tasks` | Pending/Claimed/Done Tasks. Indexed on `(projectId, status, nextAttemptAt)` for Claim Scan, `(claimedBy, claimedAt)` for Reclaim. |
| `magrathea_timers` | Pending Timers with `linkedTaskId` + `firedOutcome`. Indexed on `(firedAt, fireAt)` for Scanner, unique on `linkedTaskId`. |

Service activation via `vance.services.magrathea: true` in `application.yml`. Anus modules (CLI bootstrap) do not start the Workflow Service.

Full implementation details: `planning/workflow-service.md`.

---

## 15. What v1 does NOT do

- **External Webhooks.** External HTTP calls would require a gateway module with Auth/Rate-Limit/Tenant-Routing — the event subsystem for this does not yet exist.
- **Cross-Project Workflows.** A Workflow lives within the scope of a Project. Cross-Project is only possible via `workflow_start` Tool calls with explicit cross-Project routing.
- **Inline Recipe Definitions** in YAML. Tasks only reference Recipe names.
- **Parallel Branches** (Fan-Out / Fan-In). Currently only sequential transitions. For parallelism: multiple `workflow_task` sub-spawns + manual aggregation.
- **Versioned Run Migration.** If a Workflow definition is changed, active Runs continue on their Frozen Snapshot.
- **Cost Aggregation per Run.** `bounds.maxTotalCostUsd` requires LLM resource management integration.
- **Live Event Stream in the Web-UI.** Snapshot refresh instead of push.
- **Visual Workflow Editor.** YAML authoring via the Document Editor.

---

## 16. Open Issues

- **Cross-Project Global Locks.** Variables live per Run; a "only one deploy at a time" lock across multiple Workflows requires a separate Project-level Lock Collection.
- **Cross-Pod ThinkProcess Termination.** Currently, the ThinkProcess must live on the same Pod as its parent Workflow (Project Lane affinity). If ThinkProcesses are later deployed cross-pod, the `ThinkProcessCompletionListener` needs a Mongo-mediated sync path.
- **`condition_task`-Fast-Path.** v1 writes a `TaskStartedRecord` + `TaskResultRecord` for every 1-µs eval. A hot path could combine both records into a single Mongo write.
- **Auto-Default for `criticality: LOW` Gates.** Vogon §2.3 has the pattern; Magrathea v1 does not implement it.
- **Listing Pagination.** `GET /runs` is capped at 100 results. True pagination will come when a Project regularly has many Runs.

---

## 17. Predecessor Concept (historical)

Before the Magrathea Workflow subsystem, there was another "Workflow" concept: **Templates for Marvin Task Trees** with `fixed:` nodes that the LLM was not allowed to restructure. This idea was absorbed into the Marvin Engine itself — see [marvin-engine](/specs/marvin-engine). The term "Workflow" has since belonged to the Magrathea State Machine subsystem.

`instructions/workflows.md` (design discussion from 2026-05-14) is the source of the Magrathea concept documented here.
