---
title: "Trigger Actions — Unified Spawning Model"
parent: Specs
permalink: /specs/trigger-actions
---

<!-- AUTO-GENERATED from llm/specification/trigger-actions.md (translated from the German specification/public/trigger-actions.md) — do not edit here. -->

# Trigger Actions — Unified Spawning Model

> Binding schema for all spawn actions triggered from outside the
> Engine layer — Scheduler, Events, Workflow Tasks,
> LLM Tools (`process_spawn`, `script_run_*`,
> `workflow_start`), REST/WS Spawns (`ScriptCortexController`,
> `SessionBootstrapHandler`). A single `TriggerAction` sealed hierarchy
> with three variants (`Recipe`, `Script`, `Workflow`), a central
> `ActionExecutorRegistry`, three `ActionExecutor` beans
> (`SpawnActionExecutor`, `ScriptActionExecutor`, `WorkflowActionExecutor`).
>
> Layers:
> - `vance-api`: DTOs (`TriggerAction` sealed, `ScriptSource`)
> - `vance-shared`: YAML parsing (`TriggerActionParser` + Document loader)
> - `vance-brain`: Executor components + Action registry
>
> Engine-internal child spawns (Marvin Worker Tree, Vogon Phases,
> Slart→Hactar, Zaphod Head, Agrajag) **remain intentionally direct**:
> they have Engine-specific parent inheritance logic and belong
> to the Engine layer, not the Trigger layer. See
> `planning/trigger-pipeline-consolidation.md` §1.3.
>
> See also: [scheduler](/specs/scheduler) | [events](/specs/events) |
> [ursahooks](/specs/ursahooks) | [workflows](/specs/workflows) |
> [script-engine](/specs/script-engine)

## 1. Goal

A single, declarative action surface — regardless of whether a scheduler
initiates a run, an external event triggers a workflow, a
workflow task executes a sub-step, or an LLM tool/REST call
triggers a spawn. Each trigger point parses the same
`TriggerAction` schema and delegates to the same executor.

Four spawn variants:

- **Execute Recipe** — spawns a ThinkProcess via Engine + Recipe.
- **Execute Script, Source Document** — JS via `ScriptExecutor`, code
  resides in the Document layer (Kit/Project/Tenant — cascade as everywhere).
- **Execute Script, Source Workspace** — JS via `ScriptExecutor`, code
  resides in a Workspace RootDir (for generated or
  Workspace-private scripts).
- **Start Workflow** — spawns a Magrathea workflow run.

Additionally, **only** within Workflow Tasks (not as
Trigger Action):

- **Execute Shell** — Shell command via `ExecManager` in a
  Workspace RootDir.

Shell is deliberately not a Trigger Action, but remains at
Workflow Task level. Rationale: Shell runs require a clean
Workspace Scope with a defined RootDir, deterministic
sequencing, and outcome mapping (exitCode→Outcome). This is
Magrathea's job — to run a shell command from a scheduler, call a
workflow that contains a `shell_task`.

**What Trigger Actions are not:** they do not replace the LLM tool set
(tools run *within* an already spawned process), are not
the Ursahook system (Ursahooks react outbound to domain events without
spawning themselves — see §11.2), and are not a permission layer.

## 3. `TriggerAction` Schema

A common YAML/DTO schema. Exactly one of the four top-level fields
is set (disjunction, validated on load).

```yaml
# Variant 1 — Recipe
recipe: analyze
params:
  model: "default:fast"
initialMessage: |
  Please create the daily briefing.
runAs: mike

# Variant 2 — Script (Document source)
script:
  source: document            # required: document | workspace
  path: scripts/daily.js      # for document: doc path relative to project
  params:
    cutoff: "07:55"
  timeoutSeconds: 60
  runAs: mike

# Variant 3 — Script (Workspace source)
script:
  source: workspace
  dirName: scratch            # required for workspace: RootDir name
  path: gen/process.js        # required for workspace: relPath in RootDir
  params: { ... }
  timeoutSeconds: 60
  runAs: mike

# Variant 4 — Workflow
workflow: pr-review
params:
  pr_url: "..."
runAs: mike
```

### 3.1 Common Fields

| Field | Type | Where | Meaning |
|---|---|---|---|
| `params` | `Map<String,Object>` | all | Freely passed to Recipe/Workflow/Script. For Events, `params.payload` additionally contains the HTTP body |
| `runAs` | `String` | all | User identity. Default: Trigger owner (`createdBy` for Scheduler/Event, Workflow owner for Task, Caller user for Tool/REST) |
| `timeoutSeconds` | `int` | `script` only | Hard wall-clock limit for `ScriptExecutor.run(...)` |
| `initialMessage` | `String` | `recipe` only | First user message to the ThinkProcess |

### 3.2 Disjunction

Exactly one of `recipe:`, `script:`, `workflow:` must be set.
`ActionValidator.validate(action)` fails with:

- `NONE_SET` — no field set
- `MULTIPLE_SET` — more than one
- `MISSING_FIELD` — sub-field missing (e.g., `script.source`)
- `BAD_VALUE` — e.g., `source: foo`, unknown value

Validation occurs during document load (fail-fast, bootstrap path)
**and** during the trigger tick (defensive).

### 3.3 What does not belong here

- **Cron, `at`, Trigger Pattern, Webhook Auth** — Trigger-specific,
  remains in `scheduler.md` / `events.md`. The `TriggerAction` schema is
  only the *action* side.
- **Outcome Mapping** — belongs to the trigger context (Workflow Task has
  one, Scheduler has none, Event responds as HTTP response).
- **Source Tags for Event Log** (`scheduler:<name>`, `event:<name>`,
  …) — remains unchanged at the trigger level.

## 5. Code Architecture

### 5.1 DTO Layer (`vance-api`)

Package `de.mhus.vance.api.action`. Sealed hierarchy with three
nested record variants. The `Recipe` variant is the
spawn surface (both Recipe-driven and Engine-direct via
`engineOverride`), `Script` is the JS execute surface, `Workflow`
spawns a Magrathea workflow run:

```java
public sealed interface TriggerAction
        permits TriggerAction.Recipe,
                TriggerAction.Script,
                TriggerAction.Workflow {

    @Nullable String runAs();
    @Nullable Map<String, Object> params();

    record Recipe(
            @Nullable String recipe,            // XOR with engineOverride
            @Nullable String engineOverride,    // direct-engine-path
            @Nullable String processName,
            @Nullable String title,
            @Nullable String goal,
            @Nullable String inheritContextLevel,
            @Nullable String connectionProfile,
            @Nullable String initialMessage,
            @Nullable Map<String, Object> params,
            @Nullable String runAs) implements TriggerAction {
        // XOR-Validation: exactly one of recipe / engineOverride non-blank
        public static Recipe of(String recipe,
                                @Nullable String initialMessage,
                                @Nullable Map<String, Object> params,
                                @Nullable String runAs);
    }

    record Script(
            ScriptSource source,
            @Nullable String dirName,           // required if source=WORKSPACE
            String path,
            @Nullable Integer timeoutSeconds,
            @Nullable Map<String, Object> params,
            @Nullable String runAs) implements TriggerAction { ... }

    record Workflow(
            String workflow,
            @Nullable Map<String, Object> params,
            @Nullable String runAs) implements TriggerAction { ... }
}

public enum ScriptSource { DOCUMENT, WORKSPACE }
```

`Recipe.of(...)` factory is the minimal form for callers who only need the
Recipe-driven path with caller-merged params (Scheduler,
Event, Workflow Task, Parser). Spawn tools (`process_spawn`,
`process_spawn`, `SessionBootstrapHandler`) use the full
constructor to set Process Name/Title/Goal/Profile themselves.

JSpecify `@NullMarked` in `package-info.java`. Sealed hierarchy makes
pattern matching in Executors readable.

### 5.2 YAML Parsing (`vance-shared`)

New `TriggerActionParser` with:

- `parse(Map<String,Object> yaml) → TriggerAction` — disjunction check,
  sub-field validation, clear error messages.
- `validate(TriggerAction) → List<ActionValidationError>` — defensive
  validation during the trigger tick.

Used by:

- `SchedulerLoader` (currently parses `recipe`/`workflow` fields
  inline) — switch to the parser.
- New `EventLoader` (currently inline in `EventService`) — switch to the parser.
- `MagratheaWorkflowParser` (for the new `script_task` fields).

### 5.3 Executor Components (`vance-brain`)

Four `ActionExecutor` beans, one per variant. Common interface:

```java
public interface ActionExecutor<A extends TriggerAction> {
    Class<A> actionType();
    ActionResult execute(ActionInvocation<A> invocation);
}

public record ActionInvocation<A extends TriggerAction>(
        A action,
        TriggerContext context,        // tenantId, projectId, runAs, correlationId, sourceTag
        TriggerKind triggerKind        // SCHEDULER | EVENT | WORKFLOW_TASK | TOOL | MANUAL
) { }

public record ActionResult(
        ActionOutcome outcome,         // SUCCESS | FAILURE | SCHEDULED (async)
        @Nullable String spawnedId,    // processId | workflowRunId — if async
        @Nullable Map<String,Object> output,   // sync output (Script return, Tool result)
        @Nullable String errorMessage
) { }
```

Specifically:

- **`SpawnActionExecutor`** — encapsulates currently distributed spawn logic
  (`SchedulerService.spawnRecipeProcess`,
  `WorkflowAgentTaskExecutor.spawnRecipeProcess`,
  `ProcessCreateTool.execute`). Path: `RecipeResolver.applyDefaulting`
  + `ThinkProcessService.create`. Outcome: `SCHEDULED` with
  `spawnedId = processId`.

  Also writes — for **every** trigger type, not just for hooks —
  `ThinkProcessDocument.triggerOrigin` (`kind` / `source` / `runId` /
  `runAs`, the latter as a snapshot of the identity at spawn time). This is
  the answer to "who started this process" without having to query a log:
  the hook cycle brake reads `kind`, the
  scheduler termination listener reads `source` + `runId`. `TriggerKind` is
  therefore in `vance-api` (next to `TriggerAction`) instead of `vance-brain` —
  a persisted field in `vance-shared` must not depend on `vance-brain`.
  Derivation: `planning/megadodo.md`.

- **`ScriptActionExecutor`** — new. Path:
  1. `source == DOCUMENT` → `DocumentService.read(...)` with
     cascade lookup. `source == WORKSPACE` →
     `WorkspaceService.readablePath(...)` + `Files.readString(...)`.
  2. Instantiate `VanceScriptApi` with `scopeLevel` from `TriggerKind`
     (TRIGGER_SCOPED for SCHEDULER/EVENT/MANUAL,
     PROCESS_SCOPED for WORKFLOW_TASK/TOOL — see §8).
  3. `ScriptExecutor.run(source, params, vanceScriptApi, timeout)`.
  4. Package script return into `ActionResult` via outcome mapping
     (see table below).
  Sandbox: same GraalJS setup as today (`script-engine.md` §7) —
  `IOAccess.NONE`, `allowNativeAccess=false`, statement limit, fresh
  context per run.

  **Outcome Mapping** (applies wherever a script is executed —
  Workflow `script_task`, Scheduler `script:`, Event `script:`,
  `script_run_*` tool):

  | Script Return | Outcome | `output` (= `state[<storeAs>]` in Workflows) |
  |---|---|---|
  | `{success: true, ...payload}` | `success` | `payload` (without `success` field) |
  | `{success: false, ...payload}` | `business_error` | `payload` (incl. potential `error`) |
  | Object without `success` field, e.g., `{foo: 1}` | `success` | the entire object |
  | Object with `success` as non-boolean (e.g., `{success: "yes"}`) | `technical_error` | `{error: "invalid-success-type"}` |
  | `null` / `undefined` / void | `success` | `{}` |
  | Primitive (String, Number, Boolean) | `success` | `{value: <primitive>}` |
  | Array | `success` | `{value: <array>}` |
  | Function / Promise / other non-serializable | `technical_error` | `{error: "non-serializable-return:<type>"}` |
  | `throw new Error("…")` (User exception) | `business_error` | `{error: e.message}` |
  | GraalJS sandbox crash (statement limit, native crash) | `technical_error` | `{error: "<kind>"}` |
  | Wall-clock timeout (`timeoutSeconds` exceeded) | `timeout` | `{error: "timeout"}` |
  | Script path not found | `technical_error` | `{error: "script-not-found:<path>"}` |

  Convention: permissively structured. Explicit `{success: bool}`
  signals the outcome; without a `success` field, everything plausible
  is `success`, the return becomes the `output`. Strict `technical_error` only
  for broken returns (wrong `success` types, non-serializables) and
  sandbox issues.

- **`WorkflowActionExecutor`** — encapsulates currently distributed spawn logic
  (`SchedulerService.spawnWorkflow`, `EventService.dispatchEvent`,
  `WorkflowStartTool`, `WorkflowTaskExecutor`). Path:
  `MagratheaRunService.start(workflowName, params, ownerUserId,
  startedBy)`. Outcome: `SCHEDULED` with `spawnedId = runId`.

- **`ShellActionExecutor`** — extract from current
  `ScriptTaskExecutor` (which will be renamed `shell_task`). Called only by
  Workflow Tasks.

Dispatch via `ActionExecutorRegistry.executorFor(action.getClass())` —
sealed types enforce exhaustive Spring bean discovery.

### 5.4 Trigger Integration (sequential refactoring)

Migration order:

1. **Scheduler** — currently `SchedulerService` parses and spawns itself.
   Switch to `actionExecutorRegistry.executorFor(action).execute(...)`.
2. **Workflow Tasks** — Rename `ScriptTaskExecutor` to `ShellTaskExecutor`,
   new `ScriptTaskExecutor` (with
   `TriggerAction.Script`). `AgentTaskExecutor` remains
   independent (it has Magrathea-specific outcome mapping that does not
   belong in the `ActionExecutor` interface — it internally calls the
   `SpawnActionExecutor` and adds the Magrathea layer on top).
3. **Events** — `EventService.dispatchEvent` currently hardcoded to Workflow.
   Switch to `actionExecutorRegistry`, enable new spec fields.
4. **LLM Tools** — `ProcessRunTool` (currently Skill Scripts) becomes
   `ScriptRunTool` (with `source` param). `ProcessCreateTool` and
   `WorkflowStartTool` remain unchanged (they are already single-variant).
5. **Manual REST/WS** — no new endpoint needed, current REST
   and WS spawns are variant-specific and remain so. If a
   unified `POST /action` endpoint is desired later, it can be built
   on top — not a v1 goal.

## 6. Trigger-Specific Restrictions

Not every trigger can meaningfully execute every variant:

| Trigger | recipe | script:doc | script:ws | workflow |
|---|---|---|---|---|
| Scheduler | ✅ | ✅ | ✅ | ✅ |
| Event | ✅ | ✅ | ⚠️ see §6.1 | ✅ |
| Workflow Task | ✅ (as `agent_task`) | ✅ (as `script_task`) | ✅ (as `script_task`) | ✅ (as `workflow_task`) |
| LLM Tool | ✅ (`process_spawn`) | ✅ (`script_run`) | ✅ (`script_run`) | ✅ (`workflow_start`) |
| Manual | ✅ | ✅ | ⚠️ see §6.1 | ✅ |

### 6.1 Workspace Scripts without Process Scope

Workspaces currently belong to a `creatorProcessId` (see
`WorkspaceService` §7.3 — Temp-RootDir per Creator). A standalone
trigger (Scheduler tick, Event hit) has no process — where does the
RootDir come from?

**Decision:** RootDirs remain strictly project-scoped. Triggers
reference an *existing* long-lived RootDir
(`deleteOnCreatorClose: false`) created by a previous process or the
Kit setup. If the RootDir does not exist → Trigger tick
fails with `SKIPPED:rootdir-missing` in the event log. No auto-create,
no wrapper process, no trigger-specific cleanup responsibility.

Consequences:

- Cleanup happens during project `dispose` — `WorkspaceService.dispose`
  deletes all RootDirs of the project. Trigger scripts are consumers,
  not owners.
- Workspace scripts from triggers are the rarer variant. Mostly,
  trigger scripts reside in the Document layer — the Workspace path is
  intended for cases where a workflow or process has generated code
  that a later trigger continues to consume.
- Creation of the persistent RootDir occurs via `workspace_create` tool
  from a normal process or in the Kit setup path.

### 6.2 Recipe in Events

Currently, Events only spawn Workflows. With `recipe:` extension,
webhooks can also directly initiate ThinkProcesses — use case: Slack command
"analyze this link" as a REST event that spawns an `analyze` recipe.
Outcome to the caller: `202 Accepted + processId`, the same
response format as today for workflow spawns.

## 8. Sandbox & Surface

Scripts in Trigger Actions share the sandbox configuration from
`script-engine.md`:

- GraalJS, `HostAccess` with allow-list
- `IOAccess.NONE`, `allowNativeAccess=false`, `allowCreateThread=false`
- Statement limit from setting `script.statementLimit`
- Wall-clock timeout from `action.timeoutSeconds`
- `VanceScriptApi` as top-level binding

**However:** the extent of `VanceScriptApi` (calling tools, reading documents,
etc.) depends on the caller context. Two scope levels:

- **`TRIGGER_SCOPED`** (Scheduler/Event action without process, manual
  REST trigger): Tool calls are filtered. Spawn tools are strictly
  rejected (see deny-list below). Read surface remains full
  (`vance.doc.read`, `vance.setting`, `vance.context`, `vance.log`).
- **`PROCESS_SCOPED`** (`script_run_*` tool from a ThinkProcess,
  `script_task` from a Workflow): full `VanceScriptApi` with
  tool calls, sub-process spawn, workspace write access — as today.

`VanceScriptApi` gets an additional constructor param
`ScopeLevel scopeLevel` (default `PROCESS_SCOPED` for
backward compatibility). `ScriptToolsApi.call(name, params)` checks in
`TRIGGER_SCOPED` mode if the tool has the `@SpawnTool` marker annotation —
if found → `ScriptHostException("Tool '<name>' not allowed
in trigger-scoped script — wrap in a workflow if you need it")`.

**Spawn Tool Marker.** New annotation `@SpawnTool` on the tool class
(or on the `name()` return). Tools bearing this annotation:

- `process_spawn`, `process_create_delegate`
- `process_spawn` (or `script_run_doc`, `script_run_work` after
  rename)
- `workflow_start`
- `scheduler_create`, `scheduler_update`, `scheduler_delete`
- `event_create`, `event_update`, `event_delete`
- `hook_create`, `hook_update`, `hook_delete`

A static test (`AllSpawnToolsAnnotatedTest` in `vance-brain`) scans
all tool implementations reflection-based and matches against an
explicit expectation list — if someone forgets the annotation for a
new spawn tool, the test fails with a clear message.

Trade-off: the annotation must be maintained. The static test
catches drift — without annotation, a tool cannot be in the
`@SpawnTool`-allowed set because the test reflects against the expectation list.

## 9. Telemetry & Event Log

`event_log` schema remains unchanged. For each trigger variant (a
common `TriggerAction`, but three different spawning paths),
the executor writes:

- `STARTED` — with `payload.actionType: recipe|script|workflow`
- `COMPLETED` / `FAILED` — with `payload.spawnedId` (Process or
  Workflow Run ID; for `script` with `null` and instead
  `payload.scriptOutput`)
- Optional `SKIPPED` — for overlap policy, validation failure, missing
  RootDir.

Source tag remains trigger-specific (`scheduler:<name>`,
`event:<name>`, `workflow:<runId>:<taskState>`).

## 11. What Trigger Actions DO NOT do

### 11.1 No Inline Script Block

A fourth `source: inline` with script body directly in the trigger YAML
is **not** supported. Rationale:

- YAML is a poor editor for code (no syntax highlighting, no
  linting).
- Documents and Workspace are the two sources where code belongs —
  both have versioning (Document layer), diff tools, and are
  independently editable.
- Ursahooks have inline scripts (`script:` field), but that is a different
  use case (short outbound reaction ≤ 30s). Trigger Actions are
  potentially long-lived and should use common paths.

### 11.2 Ursahook Unification — done

Ursahooks (`ursahooks.md`) have been routed through the same
`ActionExecutorRegistry` as Scheduler and Event since pipeline consolidation. An
Ursahook YAML contains a `TriggerAction` (`recipe:` / `script:` /
`workflow:`); the `UrsaHookDispatcher` is a thin adapter
(lifecycle event → `actionExecutorRegistry.execute(action, ctx,
TriggerKind.HOOK)`). The old bespoke runners (`JsHookRunner`,
`LlmHookRunner`) and the Ursahook-specific host API (`HookHostApi` with
`http`/`inbox`/`workflows`/`log`) are removed — Ursahook scripts use
the full `VanceScriptApi` in `TRIGGER_SCOPED` mode, LLM Ursahooks
are modeled as script Ursahooks with `vance.lightllm.call(...)`.

See `specification/ursahooks.md` for the current Ursahook YAML schema
and `planning/hook-trigger-unification.md` for the refactoring history.

### 11.3 No Universal `POST /action` Endpoint

Manual REST calls remain variant-specific (`POST
/projects/{p}/processes`, `POST /projects/{p}/workflows/{w}/start`).
A generic endpoint that takes `TriggerAction` as body and selects an
executor is conceivable, but not a v1 goal. The REST surface is
currently separated by domain concept — this fits the web UI editor
structure (one endpoint per editor).

### 11.4 No Automatic Retry

`ActionResult.outcome = FAILURE` remains terminal. Retry logic belongs in
the trigger context (Scheduler overlap, Workflow `catch:` branches), not
in the executor.

### 11.5 No Cross-Trigger Data Passing

Trigger Actions are isolated. A scheduler cannot "pass on" the result
of a previous tick — that belongs in workflows
(Magrathea state).

## 12. Decisions

The five questions that were open during plan writing — all decided:

### 12.1 `agent_task` remains as its own Workflow Task Type

`agent_task` is **not** consolidated into `task_type: action` with
`action: { recipe: … }`. Rationale: `agent_task` carries
Magrathea-specific fields (`storeAs:`, `catch:` branches per outcome,
Jeltz wrapper parsing from last Assistant message, CloseReason →
Outcome mapping) that do not belong to the generic `TriggerAction` schema.
Consolidation would either bloat the schema or
force a wrapper layer that would then call an executor again.

Specifically: `AgentTaskExecutor` internally calls `SpawnActionExecutor.execute(...)`
for the spawn and adds its Magrathea outcome mapping on top. Similarly,
`WorkflowTaskExecutor` internally delegates to `WorkflowActionExecutor`.
The spawn logic is thus centralized, while task-specific semantics
(outcome mapping, completion listener wiring) remain in the
task executors.

### 12.2 Sub-Spawn from Trigger Scripts: explicitly forbidden + code

Trigger-scoped scripts may not spawn ThinkProcesses, Workflows,
Schedulers, or Ursahooks. Enforcement via the `@SpawnTool`
annotation and tool filter in `ScriptToolsApi.call` — see §8.

Anyone who wants "Cron script decides if Analyze runs" should build a
workflow with `condition_task` (SpEL check or pre-`script_task`) and
a subsequent `agent_task`. The decision thus lands in the
Magrathea state and is traceable in the event log — which would not be
the case with a hidden spawn-from-script return.

### 12.3 Workspace RootDir Lifecycle: Project Scope, not Trigger Scope

Trigger scripts reference existing long-lived RootDirs
(`deleteOnCreatorClose: false`) created by a previous process or the
Kit setup. Cleanup happens during project `dispose` —
not during the trigger. Details in §6.1.

### 12.4 `script_run` Tool: two tools for the LLM Surface

Two separate LLM tools instead of one with an enum param:

- `script_run_doc(path, params)` — Doc source
- `script_run_work(dirName, path, params)` — Workspace source

Both internally build the same `TriggerAction.Script` DTO and delegate to
`ScriptActionExecutor`. Rationale: LLM tool selection works
empirically better with clear tool names than with enum params, the
param schema remains clean (`dirName` is only mandatory in the Workspace variant),
and consistency with other tool pairs is maintained
(`doc_write` / `workspace_write` are also separate today).

### 12.5 Outcome Mapping for JS Scripts: permissively structured

Complete table in §5.3. In short:

- `{success: true, ...}` → `success` (wrapper pattern if the author
  wants it).
- `{success: false, ...}` → `business_error`.
- Object without `success` field → `success`, the entire object becomes the
  `output`.
- Primitive/Array → `success` with `{value: <x>}`.
- `null`/`undefined`/void → `success` with `{}`.
- Exception → `business_error`. Sandbox crash → `technical_error`.
  Timeout → own `timeout` outcome (analogous to `shell_task`).
- Broken return (wrong `success` type, non-serializable) →
  `technical_error`.

Convention: the wrapper pattern is optional. Scripts do not necessarily
have to wrap trivial cases, but explicitly signal with `success: false`
if they need workflow `catch:` routing.

## 13. Reference

- `specification/scheduler.md` — Trigger definition + Cron/At path
- `specification/events.md` — Webhook inbound + Auth + Payload routing
- `specification/workflows.md` — Magrathea, Task Types, Outcome Mapping
- `specification/public/script-engine.md` — Sandbox, Statement Limit,
  `VanceScriptApi` surface
- `specification/workspace-management.md` — RootDir lifecycle,
  Workspace layout
- `planning/kit-scripts.md` — Predecessor plan for Skill Script Loop Kits
- `planning/brain-hooks.md` — separate Hook system, remains untouched
