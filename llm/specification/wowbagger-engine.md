# Vancetope — Wowbagger Think Engine

> **Wowbagger** is the **bulk processing engine for large, uniform
> record sets**: a source (LINES/JSONL in the project workspace) is
> processed in parallel chunks by fast, tool-less worker models and
> immediately published as a document per chunk. It is **not** preceded
> by a batch robot, but by a **chat agent (Ford-Adapt)** that clarifies
> the setup with the user, analyzes the source, and steers the mechanical
> worker flood via `wowbagger_*` tools.
>
> Codename from the Adams Guide to the Galaxy: Wowbagger the Infinitely
> Prolonged — "You're a jerk". Design history and discarded alternatives:
> `planning/wowbagger-engine.md`, implementation: `readme/wowbagger-engine.md`.

## 1. Role and Classification

| | |
|---|---|
| Engine Name | `wowbagger` |
| Role | Bulk record processor (parallel, crash-safe, conversationally controlled) |
| Model | Ford (Chat-Loop, Streaming, Compaction) — adapted; Skills as in Ford (active skills, word triggers, "Available skills", [skills](skills.md) §4g, §5), since 2026-10-13 |
| Recipe | `wowbagger` (listed, workers) |
| Worker | Lightweight workers behind an SPI (§6a): LightLlm (Default `wowbagger-worker`), Zem (`engine: zem`), Script (`engine: hactar`, `internal: true` or `workerScript`) — never a spawned process |
| Limitation | No record pipelines through a chat engine; Vance is not an ETL framework |

## 2. Core Principle

**Agent over mechanics.** The agent (LLM) decides *what* and *how fast*;
the engine mechanics (runner tick, worker threads, pointer) decide *in
what order records are processed*. The agent **never** processes records
itself — not even for testing; a canary is a pool start with one chunk
and a look at the published chunk document.

Three components:

1. **Agent** (`WowbaggerEngine`, Ford-Adapt): full set of tools plus
   `wowbagger_*` (invisible to other engines via `requiresEngineRoles("wowbagger")`).
   **Status is part of the prompt**: structure, run state, pointer, threads,
   errors, worker model — freshly rendered per turn, the agent knows the
   run's status without a tool call.
2. **Pool** (`WowbaggerPoolService`): Runner thread (500ms tick) keeps
   `threadsDesired` synchronized — **always present, possibly with 0 threads**.
   Each worker rotates: atomically claim window at pointer (retry queue first)
   → worker call (§6a) → reply validation → publish chunk doc → continue.
3. **Structure** (`engineParams.wowbaggerState`, tolerant load): Task,
   source, formats, chunk size, thread count, pointer, counters, ledgers —
   persisted after each chunk transition.

## 3. Workspace as the Only Medium

Source and result reside in the project workspace; Doc/Client/URL import are
**one-time preliminary steps** using normal tools (agent work), not a
streaming target. Chunk = window over the stable file (no payload spool).
Layout: `_wowbagger/<processId>/results/chunk-NNNNNN.jsonl|.txt`,
merge result `_wowbagger/<processId>/result.jsonl|.txt` (or
`outputDoc` in the structure).

**Source durability (opt-in for pod changes):** Workspace files are
pod-local — a pod change loses them. Chunk docs, result doc, and structure
are documents and survive. The source only survives if
`sourceBackupMb > 0` (agent-settable, default 0 = off — single-pod does
not need it): `start()` copies it as document `_wowbagger/<run>/source.*`
(size ≤ threshold, overwritten per start — never stale); if the file is
missing on resume (pod change), the pool automatically restores it from
the backup doc. Sources that are too large: named warning instead of backup
("keep it re-creatable"); the agent suggests the backup once, the user
decides (`wowbagger_configure sourceBackupMb`).

**Run-RootDir:** each run has its own persistent RootDir in
`workTargetName` (default `wowbagger-<ProcessId-Prefix>`, auto-generated
on first configure/start, adopted on resume; an explicitly pinned WORK
target name is adopted). The pool always reads the source via this field
— decoupled from the process-wide target. As long as the process-wide
WORK target has no name, it is pinned to the run root (agent tools and
pool share the same root).
**Exception CLIENT** (Foot-Session): the process-wide target remains
CLIENT — the agent retains direct client file access and addresses the
run root via the `dirName` parameter of the file tools.

## 4. Chunk as Unit of Work (Crash-Consistency)

- **Publish = Commit**: `DocumentService.createText` of the chunk doc is
  the atomic step. Doc presence is the truth; `wowbaggerState` is
  only the index.
- **Adopt-on-Resume**: `reconcileWave` — chunk doc present → adopt
  (recordsDone +=); missing → retry queue. Only loss boundary: the gap
  between publication and ledger update (max. 1 chunk, identifiable
  by the missing doc).
- **Retries in the Pool**: fresh worker call per attempt (budget
  `chunkRetries`), exhausted → failure ledger + agent wakeup. The agent
  decides (fix + `reRunFailed`), never the mechanics.
- **Merge idempotent**: Full-write over all chunk docs in index order;
  gaps (missing docs) are counted and logged.

## 5. Wakeups (Agent Connection)

Wakeups are chat history notes (`[pool] …`) **plus** a pending message on the
agent's Lane (auto-wakeup). The agent does not owe every wakeup a response
— action is taken when a decision is pending.

| Type | Trigger | Throttling |
|---|---|---|
| Start/Finish | Pool start, run end (merge, incl. token costs) | — |
| Progress | every `wakeEveryRecords` committed records | `wakeEveryRecords` (0 = off) |
| Failure | Chunk in failure ledger | `failureCooldownSeconds` (default 300) |
| Heartbeat | `wakeEverySeconds` without other wakeups | Base = last wakeup of any kind |
| Failure-Reset | — | `failureCount` counts each failed chunk; Ack = re-run or `resetFailureCount` |

## 6a. Worker

A worker produces exactly one output line per record from a chunk. Pool
(claim, commit, retry, ledger, wakeups, merge) and worker are separate: the
SPI (`de.mhus.vance.brain.wowbagger.worker`) consists of `WowbaggerWorker`
(type, selected by recipe), `PreparedWorker` (prepared once per start,
then called per chunk from multiple threads) and
`WowbaggerWorkerRegistry`. The pool checks the lines identically for all types.

| Type | Worker Recipe | Unit | `task` | Model Gate |
|---|---|---|---|---|
| `llm` | `internal: true` (Default `wowbagger-worker`) | one LightLlm call per chunk | yes | Profile model before run |
| `zem` | `engine: zem` (Zem profile) | one decision per record | no — the questions are the task | Decision model before run |
| `script` | `engine: hactar` + `internal: true` (`params.script` = document) or `workerScript` (file in run-RootDir, profile `wowbagbagger-script-worker`) | one script run per chunk | as `vance.params.task` | **every** `vance.llm`/`vance.zem` call at runtime |

Other recipes (chat, strategy engines) are rejected during `configure`/`check`
— **no spawned process workers**: one Think Process per chunk would be
difficult and expensive and would bring its own problems (parent notification
floods the agent, queries without human intervention, mass processes); what
"Hactar or Vogon as worker" means in bulk is covered by the script worker.

**Zem-Worker:** `ZemService.prepare` once per start, then one `decide` per
record (JSONL record = state, `stateSelect` of the profile projected),
sequentially in the chunk — parallelism is the number of threads, capped by
the Zem throttle. Output: answers by question name (`ZemDecisionJson`, without
distribution); `mergeIntoRecord` appends them as `_zem` to the record. Usage
via `ZemUsageAccumulator`, booked with each chunk commit.

**Script-Worker:** One run per chunk via `GraaljsScriptExecutor` —
`vance.params.records` (objects for JSONL, strings for LINES),
`vance.params.task`, `vance.params.chunk`; the result is — as with any
script here — the value of the **last expression** (a top-level `return`
is a syntax error): a list of the same length (strings = line,
objects = one JSON line, no line breaks). The script sees the tool
interface of its process like any process-bound script — what it does
with it is decided by the caller. Timeout per chunk from
`params.timeoutSeconds` (default 120 s).

**Runtime Gate (`ScriptCallPolicy`):** The script worker attaches a policy
(`ScriptRequest.withCallPolicy`) to each script execution, which asks
`vance.llm` and `vance.zem` **before each provider call**: the resolved
model must be on `wowbagger.allowed-models`, and a chunk may make at most
`maxCallsPerRecord × Records` calls (default 3). Violation = script
error with named model = chunk error; the call does not occur. This allows
the agent to write worker scripts itself without bypassing the cost gate.
`vance.zem.decide` first prepares for this (`prepare`) and then decides.

## 6. Model Gate (Cost Security)

Worker calls are the cost driver (millions of records × model). The recipe name
alone proves nothing — alias remaps and project overrides are behind it.
Therefore:

- The pool resolves the worker model **exactly like the LightLm call**
  (Recipe → `params.model` → alias cascade) and persists it as
  `resolvedWorkerModel` (transparency: status block, `wowbagger_status`).
- `wowbagger_configure`, `wowbagger_start`, and `reRunFailed` **fail-closed**
  if the resolved model is not on the operator allowlist: Setting
  `wowbagger.allowed-models` (comma-separated, `*`-wildcards, matched
  against `providerInstance:modelName` or the bare model name,
  case-insensitive). **No setting = nothing allowed.**
- The allowlist is read **without Think Process Scope** (only Project →
  `_tenant`) — the agent cannot write the approval itself
  (`setting_set` on Process Scope would otherwise be a bypass).
- Approval is conversational: refusal names model and allowlist, user
  decides, operator sets the setting — manually or via the setting form
  `agent-model-allowlists` (together with `trillian.allowed-models`). An
  empty project value falls back to `_tenant`.
- `workerRecipe` in the structure selects the worker per run (§6a) — the
  *resolved* model is always checked; workers with a fixed model (LightLlm, Zem)
  before the run, script workers per call at runtime.
- `maxTokens` in the structure (agent-settable, default: recipe value): the
  output cap per worker call depends on the chunk size — per-run configuration,
  not recipe-fixed. **Attention:** max_tokens is an output cap, not a
  context replacement — gateways clamp it to the context length and reject
  Input+Output > Context with 400 (live lesson: 2000000 killed every call).

## 7. Tools (`wowbagger_*`, Engine-role-gated)

| Tool | Effect |
|---|---|
| `wowbagger_configure` | Set structure (task, source, formats, chunkSize, wakeup intervals, retries, maxTokens, workerRecipe, workerScript, maxCallsPerRecord, mergeIntoRecord, `resetFailureCount`) — only when pool is stopped; prepares the worker and checks the model gate |
| `wowbagger_start` | Live validation + start; `reRunFailed: true` re-fires the failure ledger (implicit failure ack); `force: true` processes the ENTIRE source from record 0 again (pointer/counters/ledger reset, published chunk docs are overwritten — for changed task/worker; exclusive to `reRunFailed`) |
| `wowbagger_stop` | Stop rotation; structure, pointer, and published chunks survive |
| `wowbagger_set_threads` | 0–64, live: 0 parks (structure remains), N>0 scales immediately |
| `wowbagger_check` | Preflight without worker calls: source readable + each record against the input contract (JSONL), record/chunk counting, structure completeness, model approval — after configure, before start |
| `wowbagger_status` | Full structure as JSON including resolvedWorkerModel + approved |

Diagnosis for humans: `//wowbagger state` — the one-liner
(`100/20000 processed (1%), 4 threads, running`; failed chunks only if
present) for a quick glance; `//wowbagger` (or `//wowbagger info`)
the full picture — read-only, without Lane (`runsOnLane=false`, Zaphod argument: a diagnostic verb that
waits behind a hanging agent turn is useless exactly when you need it).
Shows run state, task/source, progress, worker model + approval,
wakeup intervals, failure ledger with chunk reasons, and result doc —
live from the pool (handle during run, otherwise persisted).

**Switch worker without agent:** `//wowbagger worker` shows the worker (type,
recipe, script, model, approval); `//wowbagger worker <recipe> | --script
<path> | default [--check]` switches. Same preparation and gates as
`wowbagger_configure`, only when the pool is stopped (a switch in the middle
of a run would mix two workers in one result — for a complete restart
`wowbagger_start force: true`). The write operation runs under the
pool lock instead of on the Lane — the command remains operable even behind a
hanging agent turn. A switch leaves a `[pool]` note in the history,
without wakeup.

## 8. What Wowbagger is NOT / v1 Limitations

- Not ETL: no joins, no transformations between records, no
  schema mapping — one record in, one record out.
- **Canonical JSONL instead of CSV support:** any source that is not LINES/JSONL
  (CSV, Parquet export, Doc) is converted by the agent before starting with
  a script (`execute_python`) into a JSONL file in the run-RootDir —
  mechanically, no LLM cost per record — and declares
  `inputFormat: jsonl`. The pool enforces the contract: each claimed
  record must be a JSON object (validation before the worker call,
  chunk fail with named record number, no provider calls for
  deterministically broken input).
- No record hash idempotency in v1 (§6.2 of the plan remains a variant point);
  idempotency boundary is the chunk (doc adopt).
- The agent does not process records itself — not even "just a few
  for testing".

## 9. Tests

- `WowbaggerReplyValidationTest` — Reply contract (line per record,
  JSONL object per line), state roundtrip + tolerant legacy load
  (Zaphod lesson), `modelApproved`-wildcard/comma/fail-closed.
- `WowbaggerPoolServiceTest` — Rotation + merge, failure ledger with
  cooldown wakeups, re-run with counter reset, heartbeat, parking,
  model gate refusal (pool remains idle, resolution persisted).
- `qa/ai-test/WowbagbaggerBulkAiTest` — E2E with real models: agent flow
  (configure → check → start), pool rotation, chunk publish, merge;
  **mechanical verification of each output record** (deterministic
  transform, 12 records / 2 chunks), structure/cost/gate asserts
  against the persisted `wowbaggerState`. Only via `wb qa` (real calls).
- Worker-SPI: `WowbaggerWorkerRegistryTest` (selection, rejection
  of non-lightweight recipes), `LightLlmWorkerTest`, `ZemWorkerTest`,
  `ScriptWorkerTest` (contract, script sources, gate via policy),
  `WorkerCallPolicyTest`, `GraaljsScriptExecutorCallPolicyTest` (policy passes
  through the real executor into `vance.llm`), pool test with stub worker
  (commit hook per chunk, no `task`/no allowlist without fixed model),
  `switchWorker` + `//wowbagger worker` in `WowbaggerPoolServiceTest` /
  `WowbaggerCommandHandlerTest`.
- `qa/ai-test/WowbaggerWorkersLiveTest` (`@Tag("manual")`,
  `VANCE_OLLAMA_LIVE=1`) — Pool without agent against local `nimble`: Zem worker
  with `mergeIntoRecord`, script worker with `vance.zem`, runtime gate rejects
  an unapproved model.

## 10. References

- Design history, discarded alternatives, live test findings:
  `planning/wowbagger-engine.md` (§4a pivot, §4a.1 extensions)
- Worker-SPI (LightLlm/Zem/Script, discarded process workers):
  `planning/wowbagger-workers.md`; Zem: `specification/public/zem-engine.md`
- Implementation: `readme/wowbagger-engine.md`
- Framework: `specification/public/think-engines.md`,
  `specification/public/light-llm-service.md`,
  `specification/public/recipes.md`
