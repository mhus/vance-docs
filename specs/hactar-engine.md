---
title: "Hactar Engine — Script Executor"
parent: Specs
permalink: /specs/hactar-engine
---

<!-- AUTO-GENERATED from llm/specification/hactar-engine.md (translated from the German specification/public/hactar-engine.md) — do not edit here. -->

# Hactar Engine — Script Executor

> **Status: production (v2.1).** Hactar is the pure script-execution
> engine in Vancetope. Authoring of JavaScript orchestrators happens in
> [Slartibartfast](/specs/slartibartfast-engine) via
> `outputSchemaType=SCRIPT_JS`; Hactar just loads, validates, and
> runs the persisted body in a sandboxed [GraalJS context](/specs/script-engine).
> Since v2.1 it has a **dual identity** (§8): headless it is the pure
> executor with zero LLM calls; with `sessionMode: true` a Ford-style
> chat agent operates the same phase machine —
> `planning/hactar-agent-identity.md`.
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
[script-engine.md](/specs/script-engine) §5a). The script's tool
surface is narrowed to `engineParams.scriptAllowedTools` via
`ContextToolsApi`. On exception → FAILED with
`state.executionError` / `state.executionErrorClass` recorded.
On success → DONE with `state.executionResult` carrying the JS
return value.

Long-running scripts (e.g. Mail-Bot iterating 200 mails) keep the
Hactar process RUNNING throughout — GraalJS runs in a Watchdog-
Future. Live progress works via `vance.process.progress(...)` and
`vance.process.notify(...)` (bridged in `ExecutingPhase` to
ProgressEmitter `SCRIPT_PROGRESS` status frames and session-bound
NOTIFY frames; payload flattened, 500-char detail cap). In session
mode the last progress notes are additionally kept in an in-memory
ring (`HactarProgressRing`, 20 entries) so mid-run "how is it going?"
turns and `//hactar` can quote them without a tool call. The script's
Mid-run, an in-memory line ring (`HactarConsoleLog`, fed by the executor's
`consoleLineConsumer` tap — every completed line as it happens, cleared on
kick, kept readable after the terminal) is the live source for the status
block and `//hactar`; each rendered line carries its `HH:mm:ss` arrival time
so a reading model cannot mistake stale transcript replies for current
output (the persisted `consoleTail` only exists at the terminal and is the
fallback after it).

`console.log`/`console.error` output is likewise captured (executor-level,
64 KB tail) and persists on the state as `consoleTail` (8 KB cap) — visible
in the terminal wakeup note, the status block and `//hactar`. The capture
is **secret-masked** with the run's pulled `vance.secret` values — the
same trust boundary as the string return value (a script cannot log a
credential into its own status block); the live line tap is masked too.
In-memory rings (progress, console, run handles) are evicted on process
CLOSE.

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
| `consoleTail` | string | capped tail (8 KB) of the script's console output — captured by the executor, visible in the terminal note, status block and `//hactar` (null when nothing was printed) |
| `status` | HactarStatus | one of READY/LOADING/VALIDATING/EXECUTING/DONE/FAILED |
| `failureReason` | string | human-readable summary for the parent / Cortex run-panel |

## 5. Triggers

Hactar runs are spawnable from multiple surfaces:

| Trigger | Path |
|---|---|
| Direct `process_spawn` | `process_spawn(recipe="hactar-run", params={scriptRef, …})` |
| `hactar_run` tool | convenience wrapper around the `process_spawn` call above |
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

| `hactar-chat` | hactar (`sessionMode: true`, `validateBeforeRun: true`) | The chat identity: spawn without `scriptRef`, operator conversation over many scripts — see §8 |

## 8. Session Mode — the Agent Identity (v2.1)

With `engineParams.sessionMode: true` the engine splits into
**mechanic** and **identity** (the Wowbagger pattern: agent over pool):

1. **`HactarRunService` (mechanic)** — one background job per kick drives
   the phase machine off the engine lane (the lane is never blocked by a
   phase, so mid-run steers can be answered). Every phase transition
   persists the state; terminal transitions wake the agent (chat-history
   note plus pending message, sender `hactar-run` — the engine dedups
   the drained copy). The kick itself is a history-only note (no pending):
   the kicker already knows, and a pending would fire an agent turn on a
   worker spawn nobody asked for.
2. **`HactarSessionLoop` (identity)** — a Ford-adapted chat loop
   (streaming, compaction, guards, history-strength filtering; no skills).
   The run status is part of the prompt (status block: phase, elapsed,
   progress-ring tail, last result/failure). **Lazy identity**: no pending
   message, no turn — a session-mode process without traffic makes zero
   LLM calls.

**Spawn forms (F1)** — lifetime follows the spawn:

| Form | Spawn | Terminal behavior |
|---|---|---|
| Worker | WITH `scriptRef` (auto-kick) | process ENDS at the run's terminal — reply to the parent, `closeProcess`, like the headless path; the identity is a mid-run steer luxury |
| Chat | WITHOUT `scriptRef` (`hactar-chat` recipe) | process SURVIVES run terminals (re-arm, Ford-parallel); the agent reports and takes the next instruction |

The form persists on the state as `chatIdentity`.

**Tools** (role-gated on `hactar`, invisible to other engines):

| Tool | Effect |
|---|---|
| `hactar_start` | Kick a run: `scriptRef` (state keeps it) + optional `validateBeforeRun`/`timeout`/`scriptParams`/`scriptAllowedTools`. **F2:** refuses while a run is live (stop first); after terminal a restart is free, including switching the script. Named `start` because the general-pool `hactar_run` tool SPAWNS a process — a session agent sees both. |
| `hactar_stop` | Interrupts the runner: between phases cleanly, mid-EXECUTING via the executor's `CANCELLED` path (watchdog cancel + context close — partial side effects possible, like a timeout). Idempotent. |

**Stop and restart semantics**: a stopped run is terminal with a
stop-named failure reason; `hactar_start` begins a FRESH run (a run is
never resumed mid-flight — unlike Wowbagger's chunk adopt, a Hactar run
is not resumable). A Brain restart orphans a mid-run state; the next
resume marks it FAILED ("interrupted") instead of pretending continuity.
Session/process close hard-cancels a live run (`engine.stop`), it does
not drain-wait. A suspend does NOT cancel — the script is server-side
work, only the conversational lane parks.

**Agent = operator, never author**: the agent never WRITES script code —
authoring is always a Slartibartfast spawn, for NEW scripts (`mode=Create`
via the `slart-script-author` recipe, `planOnly: true` — Slart persists to
its versioned `_vance/scripts/_slart/<runId>/<name>.js` sandbox without
in-place overwrite, and its DONE event carries the path back via the
`recipePath` payload, so the operator can `hactar_start` it) AND for
changes (`mode=Update` with the current script ref + the user's request
in, new version out). The header's tool allowlist is a trust boundary;
the v2 authoring/executor split stays intact. "Zero LLM calls during a
run" becomes "the phase machine makes zero LLM calls; the identity
steering it can speak."

**Diagnostics**: `//hactar state` (one-liner: phase, elapsed, script,
run state) and `//hactar` (full picture incl. progress-ring tail) —
read-only, `runsOnLane=false`, working in BOTH modes (Zaphod argument:
a diagnostic that queues behind a hanging agent turn is useless exactly
when needed).

## 9. Reference

- `planning/hactar-agent-identity.md` — design of the v2.1 session mode (mechanic/identity split, F1–F4 decisions)
- `planning/script-architect-executor-split.md` — full design
  rationale of the v2 refactor (Phase 1–5 + open points).
- [script-engine.md](/specs/script-engine) — GraalJS runtime layer
  Hactar's EXECUTING phase calls into.
- [slartibartfast-engine.md](/specs/slartibartfast-engine) — the
  authoring engine that produces scripts Hactar executes.
- [recipe-routing.md](/specs/recipe-routing) — how the routing-
  fallback hits `slart-and-run` by default.
