---
title: "Vancetope — Workflows"
parent: Specs
permalink: /specs/workflows
---

<!-- AUTO-GENERATED from llm/specification/workflows.md (translated from the German specification/public/workflows.md) — do not edit here. -->

# Vancetope — Workflows

> A **Workflow** is a project-scoped automation: a state-machine plan of typed Tasks (Agent / Shell / Script / Tool / Gate / Timer / Condition / Sub-Workflow / Terminal) that is started by external triggers and runs via append-only Journal Records. Workflows live as YAML documents under `_vance/workflows/<name>.yaml` in the Document Layer.
>
> Workflows are **not** a replacement for Session-driven Chat Engines (Arthur). They are the layer *above* the Engines: they spawn Jeltz/Ford/Marvin as sub-Tasks, evaluate conditions on structured outputs, and survive Session boundaries — some Workflows run for weeks.
>
> **Vogon is the same runner with a different binding**: a run that belongs to a Session and a Process, instead of just a Project. One grammar, one Journal, two modes of operation — see §13a and [vogon-engine](/specs/vogon-engine).
>
> Each Workflow definition is declarative configuration. With each start, the Engine freezes the complete YAML as a snapshot into the Run — edits to the source document do not affect running Runs.
>
> See also: [kits](/specs/kits) | [scheduler](/specs/scheduler) | [events](/specs/events) | [recipes](/specs/recipes) | [jeltz-engine](/specs/jeltz-engine) | [vogon-engine](/specs/vogon-engine) | [user-interaction](/specs/user-interaction)

---

## 1. Terminology

| Term | Definition |
|---|---|
| **Workflow-Doc** | YAML document under `_vance/workflows/<name>.yaml` in the Project or in the `_tenant`-Tenant Scope. Filename (without `.yaml`) is the Workflow name. |
| **Workflow-Run** | A running instance, identified by a `workflowRunId` (full 32-hex UUID, dash-stripped — unique across all Scopes). Persisted as an append-only Journal in the `magrathea_journal` Mongo collection. |
| **State** | Entry under `states:` in the YAML. Carries a Task type, an optional `storeAs:` variable, transitions (`on:`/`catch:`), and potentially a retry block. |
| **Task** | An execution instance of a State. Persisted in the `magrathea_tasks` Mongo collection while it is pending/claimed/running. |
| **Outcome** | String produced by a Task at the end (`success`, `failure`, or type-specific like `approved`, `business_error`, `timeout`, `fired`). Matched by the Transition Resolver against `on:`/`catch:`. |
| **Journal** | Append-only audit trail of typed Records (`StartRecord`, `StateEnteredRecord`, `TaskStartedRecord`, `TaskResultRecord`, `VarRecord`, `StatusRecord`, `ResultRecord`, …). Source of truth for every Run; all status views are projections. |
| **Frozen Snapshot** | The complete YAML body stored in the `StartRecord` at `start()`. Running Runs read exclusively from this. |

**Workflow ↔ Recipe ↔ Engine:** Engines are code (Arthur/Ford/Vogon/Marvin/Jeltz). Recipes are named Engine configurations. Workflows orchestrate Tasks — some of these Tasks spawn Recipes. A Workflow State definition references a Recipe by name; inline Recipe definitions are not allowed.

---

## 2. Workflow YAML Schema

```yaml
# _vance/workflows/pr-review.yaml

description: |
  Pull Request Review Flow: Plan, Tests, Review Gate, Merge.

version: "1"
start: plan

parameters:
  pr_url:    { type: string,  required: true }
  reviewer:  { type: string,  required: false, default: "@maintainers" }

bounds:
  maxTotalCostUsd:     10.0
  maxWallclockSeconds: 604800       # 7 days
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
        type: object                  # Required — Jeltz rejects anything else
        properties:
          risk:        { type: string, enum: [low, medium, high] }
          focus_areas: { type: array,  items: { type: string } }
    storeAs: plan_output
    timeoutSeconds: 600
    on:
      success: run_checks
    catch:
      agent_error: human_review

  run_checks:
    type: shell_task
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
| `$meta` | optional | Reserved header block of the Document Layer. Carries `kind: vance-workflow` (§2.5). Ignored by the Workflow parser. |
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
| `type` | Required. One of `agent_task` / `shell_task` / `script_task` / `tool_task` / `gate_task` / `timer_task` / `condition_task` / `workflow_task` / `terminal`. |
| `description` | Audit string. |
| `timeoutSeconds` | Task-level timeout. Synchronous types (`shell_task`/`script_task`) block the Lane until `waitMs`. Asynchronous ones — `gate_task`, `agent_task`, `workflow_task` — have nothing to block and instead get a parallel timer that the scanner fires with `timeout` outcome (§5.4). If the timer fires first, a waiting `agent_task` is additionally cleared: its ThinkProcess is closed so no Agent continues calculating an answer that no one will read anymore. A `workflow_task` lets its sub-Run continue — stopping a run from outside requires the stop path, which does not yet exist. |
| `storeAs` | Variable key. For non-null output, the Dispatcher writes a `VarRecord(key, value)` to the Journal. |
| `on:` | Map outcome → next-state. Checked first by the Resolver. |
| `catch:` | Map error-kind → next-state. Outcome interpreted as `ErrorKind`-Enum (case-insensitive, dashes→underscores). |
| `retry:` | Spec with `maxAttempts`, `on: [error-kinds]`, `backoffSeconds`. State-level Retry preempts Resolver routing (§4.3). |
| `enterCounter:` | Name of a variable that is incremented by 1 **each time** this State is entered (§2.2a). |
| `resetCounters:` | List of variables that are set to 0 upon entry — before `enterCounter`. |

### 2.2a Counters — How a Plan Counts its Rounds

A back-edge is only a loop if it is bounded. `enterCounter:` counts entries into a State, `resetCounters:` resets. Both are **ordinary variables** (`VarRecord` in the Journal): readable as `#state['rounds']` in a Condition, as `${state.rounds}` in a Prompt, visible in the Run view. No second state concept, no second place to check.

```yaml
setup:
  type: condition_task
  resetCounters: [rounds]        # on the State that BEGINS the section
  transitions:
    - else: work

work:
  type: agent_task
  enterCounter: rounds
  ...

check:
  type: condition_task
  transitions:
    - if: "#state['rounds'] >= 5"
      to: escalate
    - else: work
```

**The reset is not optional.** A purely monotonic counter is incorrect when re-entering the same section — and this happens as soon as a `catch:` routes back there. The error is silent: the plan gives up after one round instead of five, and nothing indicates it.

Order: first `resetCounters`, then `enterCounter`. A State that begins a section *and* is its first step can therefore declare both and will start at 1.

Non-numeric values (because the plan uses the same variable elsewhere) restart the count instead of killing the run — a broken counter is a plan bug to check in the Journal, not a reason to abort mid-run.

### 2.3 YAML 1.2 Boolean Semantics

The Workflow parser uses a custom resolver with YAML 1.2 Boolean rules: only `true`/`false` are coerced. The barewords `on:`/`off:`/`yes:`/`no:` remain strings — otherwise, SnakeYAML defaults (YAML 1.1) would rewrite the `on:` transition block keyword to `Boolean.TRUE`.

### 2.4 Dataflow — `${params.X}` / `${state.X}`

Any string value in a State spec may contain placeholders that are resolved **immediately before** Task execution (centrally in the Dispatcher across the entire spec map, before the Type Executor sees them):

- `${params.<key>}` — a Run parameter (from `parameters:`).
- `${state.<key>}` — a variable that a **previous** State wrote via `storeAs: <key>`. Nested access works: `${state.review.summary}`.

This is how data flows from Task to Task: a Task writes its output with `storeAs`, a later one reads it via `${state.<key>}` into a Prompt, Tool parameter, Gate title/body, or Terminal `result`. A missing key resolves to an empty string (no crash). Values without `${…}` remain untouched.

This is **different** from SpEL in `condition_task.transitions[].if` (`#state['k']` / `#params['k']`, §3.6) — SpEL evaluates conditions, `${…}` substitutes text.

### 2.5 Document Kind `vance-workflow`

A Workflow document carries the Document Kind **`vance-workflow`** — the first member of the `vance-*` Kind family that types Vance's own configuration documents (later `vance-recipe`, `vance-scheduler`, …). It is set, like any YAML document, via the reserved `$meta` block at the beginning of the file:

```yaml
$meta:
  kind: vance-workflow

start: plan
states:
  …
```

`YamlHeaderStrategy` mirrors `$meta.kind` into the document's `kind` field; the Workflow parser reads only named top-level keys and ignores `$meta`. Existing documents without a header remain valid — they are merely untyped.

**Kind and location are independent.** The Kind states *what the document is*, the path states *whether it is active*:

- A document with `kind: vance-workflow` is a Workflow definition anywhere in the Project — as a draft, template, or archived copy — and is validated identically everywhere.
- Only documents under `_vance/workflows/<name>.yaml` are **resolvable by name**: only there does the Cascade apply (§6). All name-based triggers (§8) — Tool, Scheduler, Ursahook, Sub-Workflow — find a Workflow exclusively there. The path is not part of the type, and the Kind does not make a document startable.
- Conversely, any document is **directly startable** via the path-based start (§8.7) — the path taken by the Flow view's start button.

**Validation.** The `WorkflowKindHandler` (`vance-shared`, Package `magrathea`) delegates to the same parser that `start()` uses (`MagratheaWorkflowLoader.parseYaml`) — a finding therefore means exactly what a start would reject: missing `start:`/`states:`, unknown Task type or Error Kind, transition to an undeclared State. The handler is **not** coupled to `vance.services.magrathea`: the Kind remains known and verifiable on every Pod, even where no Workflow is running. Visible via `kind_validate`, `GET /brain/{tenant}/documents/validate`, and the auto-check of the Body Write Tools.

---

## 3. Task Types

Nine types, all sharing the same lifecycle model: each Task produces a `TaskCompletedEvent` with an Outcome string that triggers the Transition Resolver. Sync vs. Async types differ only in **who** writes the `TaskResultRecord`.

| Type | Synchronous? | What it does |
|---|---|---|
| `condition_task` | yes | SpEL branch match via `transitions:` list. Sets `nextStateOverride`. |
| `tool_task` | yes | Calls `tool:` via Tool Dispatcher. Output = Tool Result Map. |
| `shell_task` | yes (blocks Lane until `timeoutSeconds`) | Shell command via `ExecManager`. Output = `{status, exitCode, stdout, stderr, durationMs}`. |
| `script_task` | yes (blocks Lane until `timeoutSeconds`) | JS script via the Unified Script Executor (`ScriptActionExecutor`). Output = Script return value. |
| `terminal` | yes | Writes `StatusRecord(DONE/FAILED)` + optional `ResultRecord`. No transitions. |
| `agent_task` | no | Spawns ThinkProcess via Recipe. Completion via ThinkProcess Termination Event. |
| `gate_task` | no | Creates Inbox Item. Completion via Inbox Answer Event. |
| `timer_task` | no | Schedules entry in `magrathea_timers`. Completion via Timer Scanner. |
| `workflow_task` | no | Spawns Sub-Workflow. Completion via Sub-Run Terminal Event. |

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

`recipe:` is required, resolved via the normal Recipe Cascade. `params:` lands as `engineParams` on the spawned ThinkProcess. Jeltz consumes `prompt`+`schema` directly; Ford/Vogon/Marvin read Recipe-specific fields.

**`params.prompt` is delivered.** After `start()`, the Executor pushes the Prompt as `USER_CHAT_INPUT` into the spawned process's pending queue — the same seed that `SpawnActionExecutor` lays for `initialMessage`. Reactive Engines need this: they wait for a message and would otherwise idle. Jeltz reads its Prompt from `engineParams` and ignores the queue.

**No delegation in the step.** The Executor takes `process_spawn` from the Agent's Tool surface. An Agent that opens its own workers builds a second plan next to the written one — invisible in the diagram, invisible in the Run view, and bypassing `bounds.maxTaskSpawns`, which counts Workflow Tasks and not agent-owned processes. Fan-out belongs in the Workflow: additional States or a `workflow_task`. Side effect, on which the completion criterion below depends: without delegation, `IDLE` is unambiguously "finished" and not "I'm waiting for my child".

Outcome mapping:

- **Jeltz**: Wrapper parse from the last Assistant message. `success: true` → `outcome=success`, `output=data`. `success: false` → `outcome=agent_error`, `output=lastInvalid`.
- **Turn End (all other Engines)**: Only Jeltz terminates itself — Ford, Vogon, Marvin, and Arthur end a turn at `IDLE` or `BLOCKED` and wait for the next message, which never comes in the Workflow. Therefore, the **end of the turn** is the completion criterion, not the closing of the process: `RUNNING → IDLE` → `success`, `RUNNING → BLOCKED` → `needs_input`. Output is the last Assistant message; Magrathea closes the process itself afterwards. The **previous** status is crucial: `INIT → IDLE` is a started Agent that has not yet done anything, and should not count as completion.
- **Terminal Close**: `DONE`/`AUTO_CLOSE` → `success`. `STALE` → `technical_error`. `STOPPED`/`ARCHIVED`/`USER_DELETE`/`ABANDONED` → `cancelled`.

**Judgments: `decide:` and `score:`.** An `agent_task` whose purpose is an assessment can declare how its answer should be read. The reading becomes the **Outcome**, so `on:` routes it like any other — no second branching vocabulary.

```yaml
classify:
  type: agent_task
  recipe: ford
  params: { prompt: "Is the outline unambiguous, ambiguous, or contradictory?" }
  decide:
    options: [unambiguous, ambiguous, contradictory]   # without options: [yes, no]
    maxCorrections: 2
  storeAs: clarity
  on: { unambiguous: write, ambiguous: ask_human, contradictory: rebuild }
```

```yaml
review:
  type: agent_task
  recipe: ford
  params: { prompt: "Rate. Respond as a JSON object with score 0.0–1.0." }
  score:
    bands:
      - { atLeast: 0.7, outcome: approved }
      - { atLeast: 0.2, outcome: revise }
      - { default: true, outcome: rejected }
    maxCorrections: 2
  storeAs: review          # the entire object, not just the score
  on: { approved: publish, revise: writer, rejected: escalate }
```

Rules:

- **Exactly one of the two** per State. Two judgments from one step would contend for the Outcome; whoever needs both writes two States.
- **The scale is fixed `[0.0, 1.0]`.** An answer outside is rejected instead of mapped — otherwise `0.7` would mean something different in every plan. The score is read from the **last** JSON object in the response.
- **Bands are matched from top to bottom**, the first matching one wins. So write **descending**, `default:` last. Ascending thresholds or a `default:` before other bands are rejected when loading the plan — otherwise a `0.9` would silently fall into the lowest band, and the plan would route differently than it reads.
- **`decide:` matches whole words**, case-insensitive, first occurrence wins. "noise" is not "no". A word also includes `_` and `-`: `needs_work` is **one** token, from which no `work` is read.
- **Malformed answers are re-prompted**, not evaluated: up to `maxCorrections` times (default 2) in the **same** process, so the model sees its own attempt and the objection. Only then does the State end as `agent_error`. A model that provides prose instead of a token has not failed the task — it has misunderstood the question.
- **No matching band and no `default:`** is an authoring gap, not a model error: the State ends as `agent_error`, re-prompting could not change anything.

`needs_input` is **not** an Error Kind, but a regular Outcome for `on:` — the Agent asked a clarifying question instead of failing. The Workflow typically routes it to a `gate_task`:

```yaml
  work:
    type: agent_task
    recipe: ford
    params:
      prompt: "…"
    on:
      success: review
      needs_input: ask_human
```

Sub-ThinkProcesses run in a dedicated system Session `_magrathea_<runId>` analogous to the Scheduler pattern.

### 3.2 `shell_task` & `script_task`

Two separate Task types — historically `script_task` was shell-only; JS execution is now its own type, and the Shell Executor is now called `shell_task` (rename in `MagratheaTaskType`, symmetrical to `trigger-actions.md` §4).

**`shell_task`** — Shell command via `ExecManager`:

```yaml
run_checks:
  type: shell_task
  run: "npm test && npm run lint"
  dirName: workspace
  timeoutSeconds: 1800
  on:
    success: review
  catch:
    business_error: debug
    technical_error: escalate
```

Delegates to the existing `ExecManager.submitTrackedAndRender`. `dirName:` references a Workspace RootDir (see `workspace.md`); without it, the submit fails with `technical_error`. Output = `{status, exitCode, stdout, stderr, durationMs}`.

Outcome mapping:

| ExecJob Status | exitCode | Workflow Outcome |
|---|---|---|
| `COMPLETED` | `0` | `success` |
| `COMPLETED` | `≠0` | `business_error` |
| `KILLED` | — | `timeout` (Watchdog kill) |
| `RUNNING` | — | `timeout` (waitMs exhausted) |
| `FAILED` / `ORPHANED` | — | `technical_error` |

**`script_task`** — JS script via the Unified Script Executor (`ScriptActionExecutor`, same path as Script Trigger Actions — see `trigger-actions.md` §4.4):

```yaml
transform:
  type: script_task
  source: document          # document | workspace
  path: _vance/scripts/transform.js
  dirName: workspace        # optional Workspace RootDir
  timeoutSeconds: 120
  on:
    success: next
  catch:
    technical_error: escalate
```

The Script return value is the Task output (readable via `storeAs`). Outcomes: `success` / `technical_error`.

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

Direct call via `ToolDispatcher`. The Tool Invocation Context carries `tenantId`/`projectId`/`userId=startedBy`, but `sessionId`/`processId` are null — Tools that need these must validate defensively.

Outcome: `success`, `permission_error` (PermissionDeniedException), `technical_error` (ToolException or others).

### 3.4 `gate_task`

Pause on a User Inbox Item. Three variants:

```yaml
review:
  type: gate_task
  inbox:
    kind: APPROVAL                # APPROVAL | DECISION | FEEDBACK
    title: "Approve?"
    body: "${state.summary}"
    assignedTo: "@maintainers"    # or a User name or Tag
    criticality: NORMAL           # LOW | NORMAL | CRITICAL
    tags: [pr-review]
    options: [approve, reject]    # only for DECISION
  timeoutSeconds: 604800          # optional: parallel timeout timer
  storeAs: review_decision
  on:
    approved: merge
    rejected: plan
  catch:
    timeout: escalate
```

**`assignedTo` fallback:** Spec value → `startedBy` → `"@system"`.

**Outcome mapping by Answer Outcome × MaximegalonType:**

| Type \ Answer | DECIDED | INSUFFICIENT_INFO | UNDECIDABLE |
|---|---|---|---|
| APPROVAL | `approved`/`rejected` (from `value.approved` bool) | `insufficient_info` | `undecidable` |
| DECISION | `<chosen option>` (from `value.chosen` string) | `insufficient_info` | `undecidable` |
| FEEDBACK | `success` (text in `value.text`) | `insufficient_info` | `undecidable` |

The Inbox Item carries `payload.kind = "workflow.gate"` as a discriminator plus `workflowRunId`, `workflowName`, `workflowState` for the UI.

**Timeout mechanism:** if `timeoutSeconds:` is set, the Executor creates a timer entry with `firedOutcome = "timeout"` in addition to the Inbox Item. Two race paths compete:

- User answers first → Inbox Listener fires Outcome → Timer fire is later discarded by `appendIfAbsent` idempotence.
- Timer fires first → `outcome=timeout`, Run advanced via `catch.timeout:`. Subsequent User answer still lands in the Inbox, but the Run no longer reacts.

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

Pure SpEL evaluation. First matching rule wins; `else:` must be the last rule (Loader validation).

SpEL variables:

- `#state['<key>']` — Workflow variables from previous `storeAs:` writes.
- `#params['<key>']` — Caller parameters (set at `start()`).
- `#tasks['<state>']['output']` — reserved for future use.

Sandbox: `T(...)`, `new ...`, and method calls are blocked. Operators `==`, `!=`, `<`, `<=`, `>`, `>=`, `&&`, `||`, `!`, `in {...}`, `matches '<regex>'`, ternary `? :`, Elvis `?:` are allowed.

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

Spawns a sub-Run and waits for its Terminal. Variable transfer:

- **Incoming** (Parent → Sub): only via `params:`. No implicit inheritance mechanism.
- **Outgoing** (Sub → Parent): the Sub-Run's Terminal State writes `ResultRecord(result)`. The Parent captures this via `storeAs:`.

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

Multiple Terminal States are allowed and common — typical names: `done`, `merged`, `escalated`, `aborted`.

---

## 4. State Transitions

### 4.1 Resolver Order

1. **`nextStateOverride`** — only `condition_task` sets this.
2. **`on:`** — exact string match against Outcome.
3. **`catch:`** — Outcome interpreted as `ErrorKind`-Enum.
4. No Match → Run failed with `StatusRecord(FAILED, reason="no transition for outcome '<x>'")`.

### 4.2 ErrorKind Vocabulary

Seven categories that `catch:` can understand:

| Kind | When |
|---|---|
| `technical_error` | Tool/API/Shell infra broken (IOException, 5xx, …). |
| `business_error` | Expected business error (exit !=0, Validation Fail). |
| `agent_error` | LLM produced invalid output (Jeltz `schema_violation`). |
| `timeout` | Task timeout or Gate timeout. |
| `permission_error` | Tool not allowed for this Workflow/Caller. |
| `human_rejected` | Alias for gate-`rejected` if uniform catching is desired. |
| `cancelled` | Workflow stopped by `cancel`/Bounds exhaustion. |

### 4.3 Retry Preempts Resolution

```yaml
flaky:
  type: shell_task
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
4. **Retry check**: if Outcome matches `retry.on:` and `retryCount+1 < maxAttempts` → re-enqueue in the same State with `retryCount+1` and `backoffSeconds`. Catch is skipped.
5. **Bounds check** (§9).
6. Transition resolver (on → catch → fail).

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
    Retry check → re-enqueue same state
    Bounds check → fail run
    Transition resolve → enqueue next state
  ↓
  ... until Terminal State
  ↓
StatusRecord(DONE/FAILED) — Run completed.
```

Each Run has its own `workflowRunId` (full 32-hex UUID, dash-stripped). A maximum of one Task runs simultaneously per Run — Tasks are serialized via the Project Lane (§11).

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

At `start()`, the Service copies the entire YAML body into `StartRecord.definitionYaml`. Every subsequent Task execution re-parses from this snapshot.

**Consequences:**

- Edits to the source document **do not** affect running Runs.
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
  name:   { type: string, optional }   # via the Cascade
  path:   { type: string, optional }   # exactly this document (§8.7)
  params: { type: object, optional }
```

Exactly one of `name` / `path` — both together is an error, none also. The schema does not state this (`required: []`) because an `anyOf` of models is poorly readable; `invoke()` enforces it with a clear message. A `name` that looks like a path (slash or `.yaml`/`.yml` ending) is read as a path instead of being rejected — the value already indicates how it wants to be resolved, and the alternative an Agent would otherwise resort to is copying the file.

Not in the Recipe pool by default. Engines that should be allowed to start Workflows (typically Marvin/Vogon, not Arthur-Chat) include it in `allowedToolsAdd`.

Return value: `{ workflowRunId, workflowName }`, for path-start additionally `workflowPath`. `workflowName` is then the file stem.

The Run is **always headless** (`MagratheaRunBinding.headless()`) — even if the caller is in a Session. Those waiting for the result spawn the `vogon` Recipe instead (§13a).

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

`GET /runs/{runId}` performs Tenant/Project cross-check and returns 404 (not 403) if the Run belongs to another Scope — existence is not leaked.

### 8.3 WebSocket

`MessageType.WORKFLOW_START` — Symmetrical to REST, runs over the client's bound Session (Foot, Web UI).

```
client → brain: { type: "workflow-start", data: { name, params?, startedBy? } }
brain → client: { type: "workflow-start", data: { workflowRunId, workflowName } }
```

### 8.4 Scheduler Trigger

A Scheduler Doc (`_vance/scheduler/<name>.yaml`) can carry a `workflow:` field instead of `recipe:` — see [scheduler](/specs/scheduler) §4.2. On a Cron tick (or one-shot `at:`), the `UrsaSchedulerService` calls `MagratheaWorkflowService.start(tenantId, projectId, workflowName, params, runAs)`. The Scheduler Event Log receives the `workflowRunId` as a payload field, so the Web UI can reconstruct the connection between Scheduler tick and Workflow Run.

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

The UrsaHookDispatcher pins `tenantId`/`projectId` from the Ursahook Scope — scripts cannot spawn cross-tenant or cross-project. `startedBy` is set to `"hook:<hookName>"` so the Workflow Run can be uniquely attributed to the triggering Ursahook in the Journal.

If Magrathea is not active (`vance.services.magrathea=false`), `workflows.start()` returns `null` and logs WARN — the script decides how to react.

### 8.6 Event Trigger (External, REST)

Events are the external, REST-accessible trigger path — `GET|POST /brain/{tenant}/event/{project}/{event}`, JWT-free, optionally Bearer-authenticated. An Event Doc carries only `workflow:` name + Auth Config + static params; a POST body is passed through to the Workflow under `params.payload`. See [events](/specs/events).

```yaml
# _vance/events/github-pr.yaml
description: "GitHub PR Hook → pr-review"
workflow: pr-review
methods: [POST]
auth:
  tokenSetting: events.github.token
```

Events are explicitly without rate limit, signature validation, or replay protection — operator responsibility, or via a dedicated provider receiver before the Brain.

### 8.7 Path-Based Start (Cortex "Start")

```
POST /brain/{tenant}/project/{project}/workflows/start-document
  Body: { path, params?, startedBy? }
  Reply: { workflowRunId, workflowName }
```

Starts the document **at this path**, instead of resolving a name via the Cascade. This is the
path taken by the Flow view's start button (§13): the user looks at a definition and means
*this one*, regardless of its location.

The location was never a condition for execution — each Task re-parses the frozen YAML from the
`StartRecord`, and the Cascade prefix never appears outside the Loader. Only the expression for it
was missing.

**Same-project by construction:** the project is in the URL path, the document is resolved within it —
a cross-project start cannot be expressed via this route. Authorization is the same as for
name-based start (`Project WRITE`).

**What lands in the Journal:** `workflowName` is the file stem (so Runs continue to group in listings),
additionally `StartRecord.sourcePath` holds the full path. As soon as a Run can start anywhere, the
name no longer uniquely identifies the source — two `helloworld.yaml` in different folders have the
same name. For name-based starts, `sourcePath` remains empty.

**No Kind enforcement:** the parser is the gate, not the `$meta` header. If `kind: vance-workflow`
were required, existing definitions without a header could no longer be started from Cortex, while the
name-based path takes them without complaint. The Kind decides who *offers* the button (§2.5), not
who is allowed to run.

#### 8.7a Via the Tool, the Location is a Condition After All

For `workflow_start(path=…)` — and **only** there, the REST route above remains unchanged — the
document must either be located under `_vance/workflows/` **or** carry `$meta.privileged: true`.
`WorkflowStartTool.requireAuthoredPlan` checks this before starting; otherwise, a `ToolException`
that names both escape routes.

The reason is the difference between the two callers. At the REST route, a **human** with `Project WRITE`
is asking, and there the location was never a condition. At the Tool, an **Agent** is asking — and a
plan is not an inert file: `shell_task` runs via the `ExecManager`, `tool_task` calls the
Dispatcher directly, neither of them passes the Recipe's Tool filter. An Agent allowed to write
`documents/foo.yaml` (any WRITER is allowed to) would have thereby built a way around the exact
Tool set that its Recipe denied it — a `doc_write`, then a `workflow_start`.

The two allowed locations are therefore those that an Agent cannot create itself: the
`_vance/`-prefix is reserved (ADMIN, R4), and setting `$meta.privileged` is also ADMIN
(`DocumentService.enforcePrivilegedAdmin`) — the same word the tree already uses for "this document
may execute on behalf of others" (Ursa's `runAs`-gate). The name-based path always had this
property for free; only the path parameter lost it.

### 8.8 From a JavaScript Script — `vance.workflow`

```js
const run = vance.workflow.start({
    path: "workflows/helloworld.yaml",   // OR: name: "release"
    params: { ticket: vance.params.ticket }
});
run.workflowRunId;

const s = vance.workflow.status(run.workflowRunId);   // null if unknown
s.status;         // "RUNNING" | "WAITING" | "DONE" | …
s.currentState;   // current State name
s.vars.version;   // materialized variables

vance.workflow.current;   // null — except in a script_task, see below
```

`start(...)` is a thin wrapper over `vance.tools.call("workflow_start", …)` — just like
`vance.process.spawn` over `process_spawn`. The call therefore goes through the same `ToolDispatcher`, and
thus Allow Set, Server Tool Cascade, quotas, and the trigger-scoped Spawn lock apply unchanged.
A script cannot start anything via this path that the executing Process could not also start in the
LLM Tool loop. Bypassing the Dispatcher would be more convenient and would hand over precisely the
one capability that a Scheduler script should be denied.

`status(...)` on the other hand reads directly the Journal projection (`MagratheaStateProjector`) — there is
deliberately **no** `workflow_status` Tool. The Manual `plans` explicitly tells Agents *not* to poll a Run,
and a Tool is precisely the invitation to do so; a script that started itself and needs the judgment
is a different case than a model that wants to check. If Magrathea is missing on this Brain, `status`
throws a named error instead of silently returning `null`. A Run from a foreign Tenant/Project reads
as unknown (`null`) — the same form as the REST route, so existence does not leak across the Scope boundary.

**A snapshot, no waiting.** A script runs straight through and ends; it cannot block on a Run.
If a step needs to wait for another plan, that is a `workflow_task` (§3.7) in the
surrounding plan.

**Where `start` works is decided by the Scope level** of the script run, not the caller:
`workflow_start` carries `@SpawnTool`, and in `TRIGGER_SCOPED` runs, Spawn Tools are strictly rejected
(`trigger-actions.md` §8).

| Script Context | Scope | `workflow_start` |
|---|---|---|
| Cortex-/Hactar-Run (`ExecutingPhase`) | `PROCESS_SCOPED` | yes |
| `script_task` in a Workflow | `PROCESS_SCOPED` (`TriggerKind.WORKFLOW`) | yes |
| Damogran-`js`-Task, Skill Script, `execute_javascript` | `PROCESS_SCOPED` (`TriggerKind.TOOL`) | yes |
| Scheduler-, Hook-, Event-Trigger Script | `TRIGGER_SCOPED` | **no** — `ScriptHostException` |
| Completion Guard Script | `PROCESS_SCOPED`, but Supervisor Tool Set | only with `allowTools: true` |

Additionally, `vance.services.magrathea=true` must be set (otherwise the Tool Bean does not exist) and
`workflow_start` must be in the effective Allow Set — an empty Allow Set means unrestricted, an
`@allowTools`-header can only narrow (`script-engine.md` §3.5.6). The fact that the Tool is `deferred()`
does not matter: the direct call activates it. `status` and `current` are **not** affected by the Spawn lock —
they do not start anything.

#### 8.8.1 `vance.workflow.current` — The Own Run in `script_task`

In a `script_task`, `current` is populated, everywhere else `null`:

```js
const run = vance.workflow.current;
if (run) {
    run.runId;         // workflowRunId
    run.workflowName;  // Definition name (file stem for path-start)
    run.state;         // Name of the running State — i.e., this Task
    run.taskId;        // Line in magrathea_tasks
    run.startedBy;     // null for headless
    run.params.version;  // Caller parameters of the Run
    run.vars.sha;        // variables written so far via storeAs
}
```

Until then, a Task only saw what the Plan author substituted into it via `params:` with `${state.X}`/`${params.X}` —
a forgotten variable resolved to an empty string and appeared as bad data, not an error.
`current` closes this on the **read** side.

**There is no setter, and that is intentional.** Variables are a projection of the Journal, and
`MagratheaTaskContext` formulates the rule on which the subsystem rests: Type Executors do not touch
the Journal — the `MagratheaTaskExecutor` derives every persistent effect from the
returned `TaskOutcome`. An out-of-band write from a script would require its own
Record type and would weaken replayability. The write path remains return value + `storeAs:` (§3.2).

### 8.9 Planned (Outside v1)

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

The Bounds check runs **after each Task completion** and **before** the next enqueue. If a Bound is exceeded, the Service writes `StatusRecord(FAILED, reason="bounds exhausted: …")` and terminates the Run. Bounds do **not** route via `catch:` — they are a hard stop.

> **Bounds are not a deadlock protection.** They are only evaluated when something completes — a Run in which nothing completes never reaches its `maxWallclockSeconds`. Deadlock is addressed by the deadlines and watchdog from §12a, which come from the scanner instead of the completion path.

| Bound | What it checks |
|---|---|
| `maxWallclockSeconds` | `now - firstJournalEntry.createdAt > maxWallclockSeconds`. |
| `maxTaskSpawns` | Number of `TaskStartedRecord` entries in the Journal. Retries count. |
| `maxTotalCostUsd` | **Reserved** for LLM resource management integration; not enforced in v1. |

---

## 10. Tool Permission Cascade

```
allowed = tenant.allowedTools  ∩  project.allowedTools  ∩  workflow.allowedTools
denied  = tenant.denied  ∪  project.denied  (overrides any allow)
```

Three layers, AND-combined. Workflow definitions can only **narrow** the Project pool, never expand it. Those who do not declare `allowedTools:` get the default pool without side effects (`web_search`, `doc_read`, `doc_list`, `inbox_read`).

Tool calls in `tool_task` and indirectly from `agent_task` sub-Engines are checked against this pool.

---

## 11. Pod Lane Serialization

A maximum of **one** `ProjectLane` runs simultaneously per Project — a single-thread Executor per `(projectId)`. Every Task execution, every completion processing, and every transition resolution runs on this Lane. Race protection for the variable map and the Task queue comes from Lane serialization.

Tasks are claimed cross-pod via Mongo optimistic locking (CAS on `version`). A `TaskClaimer` runs per Pod (every 2s) that claims `PENDING` Tasks and throws them into the local ProjectLane. If a Pod dies, the next claim attempt by another Pod takes over (see §12).

Within-Run serialization: for each `workflowRunId`, at most one Task is in the queue at any time, because the next Task is only enqueued upon completion of the current one.

---

## 12. Reclaim & Heartbeat

Pod crash resilience:

- **WAITING_*-Tasks** (`agent_task`/`gate_task`/`timer_task`/`workflow_task`) normally **do not** need reclaim — their completion listeners fire independently of the Pod. A 7-day Gate on a dead Pod is carried forward by the Inbox Listener on another Pod. **Exception `WAITING_SUBPROCESS`:** if the in-memory completion event is lost during a Pod crash, the Task would permanently deadlock — a recovery scanner (`ReclaimScanner.recoverLostSubprocessCompletions`, after a 5-minute grace period) reconciles such Tasks against the persisted ThinkProcess status.
- **Sync-Tasks** (`condition_task`/`tool_task`/`shell_task`/`script_task`/`terminal`) with `runStatus = null` can become stale if the Pod dies in the middle of execution. The `ReclaimScanner` (every 60s, per Pod) finds `CLAIMED` Tasks with `claimedAt < now - 5min` and re-queues them as `PENDING` (Optimistic-CAS).
- **Heartbeat** for long-running Sync Executors: the Dispatcher (`MagratheaTaskExecutor`) automatically pings `touchHeartbeat(taskId)` every 60s while a synchronous Type Executor is running — no Executor calls this itself. The scanner respects `heartbeatAt`, so a Task running longer than the reclaim grace is not falsely executed twice; a crash stops the Heartbeat, so a truly dead Task will still become stale.
- **Exhausted attempts**: after `maxClaimAttempts` (default 3), the Task fails terminally with `outcome=technical_error` — the `catch:` block routes if declared.

---

## 12a. Stagnation — The Two Nets

§12 addresses **named** errors: the Pod died, the completion event was lost. However, the list of such errors is not finite — a defect in the Type Executor, a deadlocked Lane, a Timer that could not be inserted, a `catch:` that routes back into the same deadlock. Each leaves a Run that is alive but not moving, and each is a different bug. A net that only catches when the cause can be named will not catch the next cause.

Therefore, two cause-blind barriers that only ask *how long*:

### 12a.1 Default Deadline per Task Type (Recoverable)

A **missing** `timeoutSeconds:` does not mean "no deadline". The three types that hand control outwards — `agent_task`, `gate_task`, `workflow_task` — receive the configured type-default deadline without declaration:

| Property | Default | Waits for |
|---|---|---|
| `vance.magrathea.default-agent-timeout` | `2h` | a ThinkProcess |
| `vance.magrathea.default-gate-timeout` | `7d` | a human |
| `vance.magrathea.default-sub-workflow-timeout` | `24h` | a Sub-Run |

The deadlines differ by orders of magnitude because the waiting party does. A declared `timeoutSeconds:` always wins — **even 0**, which is precisely for saying "this one is really allowed to wait forever".

An expired Timer is **recoverable**: it carries `outcome: timeout` into the State's `on:`/`catch:` routing, so the Workflow can react instead of simply dying.

### 12a.2 Watchdog (Terminal)

Behind this is the `MagratheaWatchdogScanner` (`vance.magrathea.watchdog-interval`, default hourly): a Task that sits in a non-terminal status for longer than `vance.magrathea.stall-ceiling` (default `14d`) means its Run is stalled — no matter why. The Run is `FAILED` with the same handling as a stop (Agents closed, Gates discarded, Sub-Runs stopped) and the reason `watchdog: no progress for …` in the `StatusRecord`.

The Ceiling is deliberately far beyond the type deadlines: they should take effect first. Reaching the Watchdog means that the net above it has also failed — therefore its judgment is terminal and not recoverable.

Tick and Ceiling are two different questions: the tick decides how **late** a judgment may be, not when it is due. Compared to 14 days, an hour's delay is nothing — a run that has been stalled for two weeks is no more urgent because it has been stalled for two weeks and five minutes.

All five values are available as defaults in `application.yml` under `vance.magrathea:`.

`HELD`-Tasks are excluded: a paused Run is intentionally stalled.

**Also excluded is a State with declared `timeoutSeconds: 0`** — for the same reason. 0 is the only way an author says "this one is really allowed to wait forever" (§12a.1); without this exception, the two nets would contradict each other, and the Watchdog would win: an intentionally open Gate would be terminated after the Ceiling with the reason "no progress", thus reported as a defect, even though it was the written intention. For this, the scan reads the frozen plan per candidate (one Journal read plus one YAML parse, hourly, maximum 64 lines). A plan that **cannot** be parsed is **not** considered excluded: an unreadable Run document is precisely the kind of defect this net is for.

**Master-only.** The Watchdog runs — unlike Claimer and Reclaim Scanner — on **one** Pod. The other two may run pod-locally because each of their steps is a Mongo CAS, and a race simply produces a winner. Watchdog handling, however, is a chain of side effects without compare-and-set: closing processes, discarding Inbox Items, stopping Sub-Runs, appending a terminal Record. Two Pods simultaneously would handle the same Run twice and journal two terminal Records. It therefore takes the Master Lease like the other cluster-wide sweeps (`ClusterCleanupTick` & Co.); without `ClusterMasterService` (feature off ⇒ single-Pod), it runs unconditionally.

Not Project Home Pod: Magrathea has no Project Pod affinity — Tasks are claimed cross-pod via CAS, the `ProjectLane` only serializes pod-locally. A Home Pod assignment just for the Watchdog would be a concept the subsystem has nowhere else.

`FAILED` instead of `TERMINATED` is not a cosmetic difference. A stop is a decision someone made; a stagnation is a defect. A Run list that shows both equally hides precisely what needs to be examined.

Setting any of these values to null disables the respective net.

---

## 13. Web UI

- **Listing**: `GET /workflows/runs` returns a MagratheaProcessDto list, newest first.
- **Detail**: `GET /workflows/runs/{runId}` provides status, currentState, vars, params, result, timestamps.
- **Workflow YAML Editor**: runs via the generic Document Editor (path `_vance/workflows/`).
- **Flow View**: a document with `kind: vance-workflow` (§2.5) gets a View tab in Cortex that draws the State machine as a diagram (`WorkflowFlowView`, VueFlow + Dagre auto-layout, Top-Down or Left-Right). Read-only and purely derived: there are no stored node positions, editing is done in the Edit tab on the YAML. Nodes carry Task type, start marker, retry marker, and the type-specific core information (Recipe / Tool / Command / Duration / …); edges are distinguished by origin — `on:` solid, `catch:` dashed-warm, `condition:` branches in accent color. Structural problems that the image can show (transition to an undeclared State, unknown Task type, `start` without a target) appear as a banner above the canvas plus ghost nodes — the binding check remains server-side.

Cancel, Event Stream, and Live Updates are v2 — the snapshot endpoint is sufficient for the v1 "what's running now?" view and is inexpensive (one Journal read).

---

## 13a. Process-Bound Operation (Vogon)

The same Runner, the same grammar, a different start: if a Run is started by a **ThinkProcess** instead of a Scheduler, Event, or Tool, it belongs to that Session and that Process. This is the [Vogon Engine](/specs/vogon-engine).

What depends on it:

| | headless | process-bound |
|---|---|---|
| Gate | Inbox Item | Inbox Item **plus** `ProcessEvent(BLOCKED)` to the Owner; answer also as passed-through chat text |
| Result | `ResultRecord` in the Journal | additionally `REPLY` to the Owner Process |
| Progress | silent | a status per State entry (except `condition_task`/`terminal` — control flow, not progress) |
| Session of the `agent_task` workers | `_magrathea_<runId>` (system) | the Owner's Session |
| `inheritContext:` | not available | available |

**Capabilities.** A State can declare that it *cannot* run without a specific binding (`MagratheaTypeExecutor.requires`) — today, exactly one case: `inheritContext:` requires an Owner Process. This is checked **at start**, across all States, not just reachable ones: a plan that runs or dies depending on the path is worse than one that is rejected while someone is looking.

To handle the case, declare `catch: { capability_missing: <state> }` — then the start is allowed, and the impossibility is an Outcome that the author has planned for.

Capabilities are frozen into the `StartRecord` at start. A later deleted Session must not retroactively make a running plan illegal.

**Visibility.** A bound Run belongs to a human's Session; the `RunController`'s project check does not cover this. `MagratheaRunSource.visibleTo` therefore only allows it for the Session Owner or a Project Admin, and attaches a Session link to the detail view.

## 14. Implementation Notes

Java implementation under `de.mhus.vance.brain.magrathea.*` (Service Layer) and `de.mhus.vance.shared.magrathea.*` (Persistence). The designation **Magrathea** (Adams universe: a computer made of sub-computers that solves tasks by composition) is the internal naming; user-facing, all surfaces remain named "Workflow".

Mongo Collections:

| Collection | Content |
|---|---|
| `magrathea_journal` | Append-only audit records per Run. Indexed on `(tenantId, projectId, workflowRunId, createdAt)`, plus partial-unique index on `(tenantId, projectId, workflowRunId, taskId, type=TaskResultRecord)` for idempotent completion append. Reads are consistently tenant/project-scoped (no longer purely via `workflowRunId`). |
| `magrathea_tasks` | Pending/Claimed/Done Tasks. Indexed on `(projectId, status, nextAttemptAt)` for Claim Scan, `(claimedBy, claimedAt)` for Reclaim. |
| `magrathea_timers` | Pending Timers with `linkedTaskId` + `firedOutcome`. Indexed on `(firedAt, fireAt)` for Scanner, unique on `linkedTaskId`. |

Service activation via `vance.services.magrathea: true` in `application.yml`. Anus modules (CLI bootstrap) do not start the Workflow Service.

Full implementation details: `planning/workflow-service.md`.

---

## 15. What v1 Does NOT Do

- **External Webhooks.** External HTTP calls would require a Gateway module with Auth/Rate Limit/Tenant Routing — the Event subsystem for this does not yet exist.
- **Cross-Project Workflows.** A Workflow lives within the scope of a Project. Cross-Project is only possible via `workflow_start` Tool calls with explicit cross-Project routing.
- **Inline Recipe Definitions** in YAML. Tasks only reference Recipe names.
- **Parallel Branches** (Fan-Out / Fan-In). Currently only sequential transitions. For parallelism: multiple `workflow_task` sub-spawns + manual aggregation.
- **Versioned Run Migration.** If a Workflow definition is changed, active Runs continue on their Frozen Snapshot.
- **Cost Aggregation per Run.** `bounds.maxTotalCostUsd` requires LLM resource management integration.
- **Live Event Stream in the Web UI.** Snapshot refresh instead of push.
- **Visual Workflow Editor.** YAML authoring via the Document Editor.

---

## 16. Open Items

- **Cross-Project Global Locks.** Variables live per Run; a "only one deploy at a time" lock across multiple Workflows requires a separate Project-level Lock Collection.
- **Cross-Pod ThinkProcess Termination.** Currently, the ThinkProcess must live on the same Pod as its parent Workflow (Project Lane affinity). If ThinkProcesses are later deployed cross-pod, the `ThinkProcessCompletionListener` needs a Mongo-mediated sync path.
- **`condition_task` Fast-Path.** v1 writes a `TaskStartedRecord` + `TaskResultRecord` for every 1-µs eval. A hot path could combine both Records into a single Mongo write.
- **Auto-Default for `criticality: LOW` Gates.** Vogon §2.3 has the pattern; Magrathea v1 does not implement it.
- **Listing Pagination.** `GET /runs` is capped at 100 results. True pagination will come when a Project regularly has many Runs.

---

## 17. Predecessor Concept (Historical)

Before the Magrathea Workflow subsystem, there was another "Workflow" concept: **Templates for Marvin Task Trees** with `fixed:` nodes that the LLM was not allowed to restructure. This idea has been absorbed into the Marvin Engine itself — see [marvin-engine](/specs/marvin-engine). The term "Workflow" has since belonged to the Magrathea State Machine subsystem.

`instructions/workflows.md` (design discussion from 2026-05-14) is the source of the Magrathea concept documented here.
