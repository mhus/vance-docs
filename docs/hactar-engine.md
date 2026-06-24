---
title: "Hactar Engine — Script Executor"
parent: Documentation
permalink: /docs/hactar-engine
---

<!-- AUTO-GENERATED from specification/public/en/hactar-engine.md — do not edit here. -->

---
# Hactar Engine — Script Executor

> **Status: production (v2.0).** Hactar is the pure script-execution
> engine in Vance. Authoring of JavaScript orchestrators happens in
> [Slartibartfast](/docs/slartibartfast-engine) via
> `outputSchemaType=SCRIPT_JS`; Hactar just loads, validates, and
> runs the persisted body in a sandboxed [GraalJS context](/docs/script-engine).
>
> Historical note: pre-v2.0 Hactar was a script-architect engine
> with FRAMING / DRAFTING / REVIEWING / VALIDATING phases. The
> authoring/executor split (`planning/script-architect-executor-split.md`)
> moved the authoring half to Slartibartfast and reduced Hactar to
> the executor pipeline below.

## 1. Role and Boundary

Hactar's responsibilities:

1. **Load** a script body from a project document path.
2. **Validate** the body for pre-flight safety — parse, JSDoc
   header, tool-allowlist intersect.
3. **Execute** the body in a sandboxed GraalJS context.
4. Optionally **deep-validate** (LLM semantic review) when the
   caller opts in.

Hactar's non-responsibilities:

- **No LLM-authoring.** Hactar makes zero LLM calls during a run.
  All validation calls happen via `HactarService` (deep-validate
  uses `LightLlmService` with the `script-review` recipe — Hactar
  itself doesn't drive the LLM dialog).
- **No recovery loop.** Any failure (load miss, validation reject,
  executor exception, script throw) is terminal. The caller's next
  step is a fresh Slart spawn with `mode=UPDATE` and the captured
  `failureReason` (manual, per
  `planning/script-architect-executor-split.md` §6.3).
- **No script generation.** Use Slart for that.

## 2. Lifecycle

```
READY → LOADING → [VALIDATING] → EXECUTING → DONE
            │           │            │
            └───────────┴────────────┴→ FAILED
          (any failure is terminal — no recovery loop)
```

`VALIDATING` is opt-in via `engineParams.validateBeforeRun=true`.
Otherwise LOADING transitions directly to EXECUTING.

### 2.1 LOADING

`LoadingPhase` (`vance-brain/.../hactar/phases/LoadingPhase.java`):

1. Read `state.scriptRef` (mirror of the engine-param).
2. `documentService.lookupCascade(...)` resolves the body.
3. `HactarService.validate(...)` runs the minimal gate (parse +
   `ScriptHeaderParser` + tool-allowlist intersect).
4. On any ERROR-severity issue → FAILED with the aggregated
   issues recorded on `state.validationIssues` and the first 5
   surfaced in `state.failureReason`.
5. On pass → VALIDATING if `validateBeforeRun=true`, else
   EXECUTING.

### 2.2 VALIDATING (opt-in)

`ValidatingPhase` calls `HactarService.deepValidate(...)` — runs
a `LightLlmService` call with the bundled `script-review` recipe.
The LLM reviews the script for semantic / logic / API-misuse
issues. On reject → FAILED with the LLM issues merged into
`state.validationIssues`.

Reasons to opt in:
- Cortex "Test Run" button (user wants quick semantic sanity-check
  before side-effects).
- Untrusted source — hand-edited script in production, or
  scheduler firing an externally-supplied path.

Reasons to skip (the default):
- Scheduler-driven cron run of a proven script (Mail-Bot, daily-
  briefing).
- Slart-self-execute (script just survived Slart's VALIDATING
  loop, redundant).

### 2.3 EXECUTING

`ExecutingPhase` calls `ScriptExecutor.run(...)` (see
[script-engine.md](/docs/script-engine) §5a). The script's tool
surface is narrowed to `engineParams.scriptAllowedTools` via
`ContextToolsApi`. On exception → FAILED with
`state.executionError` / `state.executionErrorClass` recorded.
On success → DONE with `state.executionResult` carrying the JS
return value.

Long-running scripts (e.g. Mail-Bot iterating 200 mails) keep the
Hactar process RUNNING throughout — GraalJS runs in a Watchdog-
Future. Heartbeats via `vance.process.progress(...)` are planned
(`planning/script-architect-executor-split.md` §6.5 — pending,
not yet implemented).

## 3. Engine Parameters

`vance-brain/.../hactar/HactarEngine.java` exposes the following
keys (re-exported from the phase classes where appropriate):

| Param | Type | Default | Effect |
|---|---|---|---|
| `scriptRef` | string (path) | **required** | Document path of the script body |
| `language` | string | `js` | Only `"js"` accepted in v2; reserved for future Python |
| `validateBeforeRun` | bool | `false` | Opt-in `HactarService.deepValidate` before EXECUTING |
| `scriptAllowedTools` | list<string> | `[]` | Tool names the script may call via `vance.tools.call(...)` |
| `scriptParams` | map | `{}` | Bindings the script sees as `vance.params.*` |
| `timeout` | int (seconds) or `"30s"`/`"5m"`/`"1h"` | 5 minutes | Wall-clock cap (clamps against header `@timeout`) |

`buildInitialState` validates inputs: missing `scriptRef`
or `language != "js"` → `IllegalStateException` at spawn time.

## 4. State

`HactarState` (`vance-api/.../hactar/HactarState.java`),
persisted on `engineParams.deepThoughtState` (legacy key name kept
for Mongo-document backwards compatibility).

| Field | Type | Effect |
|---|---|---|
| `scriptRef` | string | mirror of the engine-param |
| `language` | string | `"js"` |
| `scriptBody` | string | loaded body (set by LOADING) |
| `validateBeforeRun` | bool | controls the LOADING → VALIDATING vs. LOADING → EXECUTING branch |
| `validationIssues` | list<ValidationIssue> | accumulated from LOADING + (if enabled) VALIDATING |
| `executionResult` | object | JS return value on success |
| `executionError` | string | `ScriptExecutionException.getMessage()` on failure |
| `executionErrorClass` | string | `ScriptExecutionException.ErrorClass` enum name on failure |
| `executionDurationMs` | long | wall-clock duration of the EXECUTING pass |
| `status` | HactarStatus | one of READY/LOADING/VALIDATING/EXECUTING/DONE/FAILED |
| `failureReason` | string | human-readable summary for the parent / Cortex run-panel |

## 5. Triggers

Hactar runs are spawnable from multiple surfaces:

| Trigger | Path |
|---|---|
| Direct `process_create` | `process_create(recipe="hactar-run", params={scriptRef, …})` |
| `hactar_run` tool | convenience wrapper around the `process_create` call above |
| Scheduler | `_vance/scheduler/<name>.yaml` with `recipe: hactar-run` + `params.scriptRef: "<path>"` |
| Slart self-execute | `slart-and-run` recipe → Slart writes SCRIPT_JS → Slart's EXECUTING spawns Hactar via `JsScriptArchitect.directExecutionSpawn` |
| Cortex Run-Button (`▶ Run JS`) | bypasses Hactar (uses `ScriptCortexExecutionService` directly) — Hactar's role here is covered by the same `ScriptExecutor`; the Cortex path skips the LOADING/VALIDATING ceremony because the body is already in the editor |

## 6. HactarService — Shared Validation Surface

`HactarService` (`vance-brain/.../hactar/HactarService.java`) is
the single owner of "is this script valid?". Two methods:

- `validate(code, language, sourceName, callerAllowedTools, …)`
  → minimal gate (parse + header + allow-set intersect). Local,
  no LLM. ~ms. Used by Hactar's LOADING, Slart's
  `JsScriptArchitect.validateDraftShape`, and Cortex's
  `POST /scripts/validate`.
- `deepValidate(...)` → LLM semantic review via
  `LightLlmService` + bundled `script-review` recipe. Used by
  Hactar's optional VALIDATING phase and Cortex's
  `POST /scripts/validate-deep`.

Rationale for the split (script-execution being the owner): the
executor is the trust boundary. If a "valid" script crashes at
runtime, the validation logic is broken — that's a Hactar issue.
Slart and Cortex are consumers of this truth, not parallel
implementations. See
`planning/script-architect-executor-split.md` §5.6.

## 7. Bundled Recipes

| Recipe | Engine | Use case |
|---|---|---|
| `hactar` | hactar | Engine-default; selector hits this on triggers like "run script" |
| `hactar-run` | hactar | Pass-through wrapper used by the scheduler, the `hactar_run` tool, and Slart-self-execute |
| `slart-and-run` | slartibartfast | Generate + execute in one step (default `routing.fallback.recipe`) |
| `script-review` | jeltz (internal LightLlm config) | Used by `HactarService.deepValidate` — not spawnable |

## 8. Reference

- `planning/script-architect-executor-split.md` — full design
  rationale of the v2 refactor (Phase 1–5 + open points).
- [script-engine.md](/docs/script-engine) — GraalJS runtime layer
  Hactar's EXECUTING phase calls into.
- [slartibartfast-engine.md](/docs/slartibartfast-engine) — the
  authoring engine that produces scripts Hactar executes.
- [recipe-routing.md](/docs/recipe-routing) — how the routing-
  fallback hits `slart-and-run` by default.
