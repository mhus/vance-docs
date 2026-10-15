# Vancetope — Ford Think Engine

> **Ford** is the full-fledged single-LLM engine — the Guide's Field Researcher. Quick response, no frills, knows where its towel is: It receives a user message, calls an LLM (with tools, memory access, RAG/Knowledge-Graph), and writes the answer to the chat. **No workflow properties** — no orchestration of sub-processes, no task tree, no phase gates. Default worker for all orchestrator engines (Arthur/Marvin/Vogon/Zaphod) and also directly usable when no workflow is needed.
> See also: [arthur-engine](arthur-engine.md) (Framework API that Ford implements), [think-engines](think-engines.md) (Registry, Lifecycle)

---

## 1. Purpose

Ford is the **single-LLM engine** in the Vancetope engine set: one turn = one LLM call (with tool loop), no control over multiple phases or sub-processes. This covers two roles:

- **Generalist Worker** for the orchestrator engines. Arthur, Marvin, Vogon, and Zaphod spawn Ford Recipes (`analyze`, `quick-lookup`, `web-research`, `code-read`, `marvin-worker`, …) for the operational individual tasks that arise in the respective workflow.
- **Direct Top-Level Chat** for Sessions that do not require a workflow — short research, quick information, tool-driven lookups. In these cases, Ford is the Session Engine and no orchestrator is in between.

Historically, Ford was also the **Walking Skeleton** for the Think Engine framework: Registry discovery, auto-start on Session Create, Pending Queue, Lane Turn, `ThinkEngineContext`, LLM call, `ChatApi`, WebSocket streaming, Suspend/Resume — everything was first validated end-to-end with Ford. This function remains as a side effect but is no longer the primary reason for its existence.

---

## 2. What Ford CANNOT do (intentionally)

Ford has **no workflow properties**. What a turn does not contain:

- **No orchestration.** Ford does not control external processes and does not execute a workflow. A single sub-worker for a sub-task is allowed via `process_spawn` (part of the Engine Baseline) — but the coordination of multiple workers is Arthur's job (or one of the other orchestrators), who in turn spawns Ford.
- **No task tree.** No `Node` persistence, no planning, no sub-tasks. Marvin does that.
- **No phases / gates / checkpoints.** No deterministic multi-step process. Vogon does that.
- **No multi-head consultation.** No parallel Personas on the same question. Zaphod does that.
- **No foreground/background logic at the Session level.** If Ford is top-level, it is the only process in the Session.

> Memory access (RAG, Knowledge-Graph, Project documents) and Tools are **allowed** and configured via Recipe — Ford is no longer a "dumb" LLM wrapper. What distinguishes it from Arthur is the absence of orchestration and persistent task structure, not the ability to consult external data.

---

## 3. What Ford CAN do

A Lane Turn does exactly this:

1. `drainPending()` → the collected Inbox becomes **one** turn. `UserChatInput` lands in the Chat History; `ProcessEvent`, `ToolResult`, and `ExternalCommand` are turn-local and go into the Prompt as `<process-event>`/`<tool-result>`/`<external-command>` XML (a sub-worker spawned by Ford reports back this way).
2. START-Guards (Shooty), Skill triggers, active Skills.
3. System Prompt from the Recipe (Pebble, document cascade) plus Memory Block, Tool hints, Skill section, Compaction Summaries, Date/Client Env/Scratchpad, then the active Chat History.
4. Memory Compaction if the Prompt threatens to fill the context window — then Prompt rebuild.
5. **Tool Loop** (§4a) with Streaming: Text chunks via `CHAT_MESSAGE_STREAM_CHUNK` live to the client.
6. After the loop: Persist Assistant Message, flush History Tags, Reply via `emitReply` to Parent Inbox and Session Clients.
7. Exit status by role (§4).

Only User Input and final Reply are persisted. Tool Calls and results only live in the turn — they control **this** turn, not the next.

---

## 4. Lifecycle Behavior in Detail

| Method | Behavior |
|---------|-----------|
| `start(process, ctx)` | No greeting (a worker spawned with `steerContent` drains its task immediately). Status → `idle`. No LLM call. |
| `resume(process, ctx)` | Status → `idle`; the queue wakes up the next turn. |
| `suspend(process, ctx)` | No cleanup. Status → `suspended`. |
| `steer` / `runTurn` | Core routine (§3). `runTurn` drains in a loop; before each drain, `haltRequested` is checked (pause contract: the Inbox remains in the queue for resume). After a turn that has closed or parked the process (Worker Safety Stop, ESC/`/pause`, CLOSED/PAUSED/SUSPENDED), the loop ends — mid-turn messages do not trigger another turn on a dead process. |
| `stop(process, ctx)` | Closes the process (`stopped`). |

Ford **never** reaches `done` (just like Arthur). Ford has **two modes**, derived from its role — there is no mode flag:

| Turn End | **Worker** (Parent present) | **Chat** (Primary, no Parent) |
|---|---|---|
| Natural Stop (Answer) | Reply → `idle` (the Parent can steer again) | Reply → `idle` (ready for the next message) |
| Safety Stop (§4a) | Reply "⚠️ TASK FAILED — …" with reason + partial work → **terminal `incomplete`** (FAILED-ProcessEvent to the Parent) | Reply "⚠️ I stopped this turn because …" with reason + partial work → `blocked`; "continue" resumes |
| ESC / `/pause` | no Reply; Halt flag → `paused`, Status flip → remains as set | same |

**`blocked` means "obstacle", not "finished".** An answer leaves Ford `idle` in both modes (like Frankie); `blocked` only exists for a chat safety stop. Orchestrators read `blocked` as a question: Magrathea maps `RUNNING → BLOCKED` to `needs_input` (→ `gate_task`), `RUNNING → IDLE` to `success` — a Ford `agent_task` (spawned without a Parent) thus delivers `success` for an answer and `needs_input` only for a stuck agent. (Until 2026-10, a Primary-Ford also parked `blocked` after an answer, so every Magrathea-Ford step ended as `needs_input`.)

Why the Worker **closes** instead of parking resumable: A `blocked` Worker is a questioning Worker for the orchestrators — Arthur automatically forwards the next User Message to it (`activeDelegationWorkerId`), synchronous drivers (Marvin `CALL_RECIPE`, Zaphod heads, `process_spawn wait=true`) read the stop text as a result, and the delegation watchdog cleans it up as `stopped` after inactivity. A Worker that cannot complete its task therefore reports this clearly and ends; to continue means: a fresh Worker with a narrower Scope. In chat mode, the user is present — there, continuing is the correct outcome.

Ford is `asyncSteer = false` — the default. `process_steer` blocks the calling Lane until Ford's turn is complete and returns the Reply as `newMessages`. Exactly what Arthur and other orchestrators expect. Terminal contract details: [structured-engine-output §3](structured-engine-output.md).

### 4a. Tool Loop and Safety Nets

The turn ends via **Natural Stop**: As long as the model emits Tool Calls, they are executed and the loop iterates; the first Assistant Message **without** a Tool Call **is** the Reply. There is no mandatory terminal tool and **no routine round limit** — a long, healthy task runs until its Natural Stop.

Each round first checks the **Interrupt** (status SUSPENDED/PAUSED/CLOSED or Halt flag) — before the next LLM call, i.e., promptly. The Safety Nets measure **stuckness, not volume**; the time net is the generous last resort:

| Net | Trigger | Configuration |
|---|---|---|
| Idle-Stuck | the same Tool Batch (name + arguments) N times in a row. Pure status polls (`exec_status`, `client_exec_status`, `work_exec_status`) are excluded and instead throttled (growing pause between polls, ESC-capable) | `vance.engine-loop.idle-stuck-threshold` (Default 5, `0` = off); `vance.engine-loop.poll-throttle-step-ms` / `poll-throttle-max-ms` |
| Empty Reply | neither text nor tool call — no clean stop, but collapse; without a net, the turn would end without a Reply and an asynchronous Parent would wait forever | — |
| LLM Error | Stream error / Retry budget exhausted — even without previous text, there is a stop text (formerly: Exception) | — |
| Wallclock | per **turn** (not per process lifetime) | `vance.engine-loop.max-wallclock-minutes` (Default 60), per Recipe `params.maxWallclockMinutes` |
| Round Limit | **opt-in**: only Recipes with a deliberately hard limit | `params.maxIterations` (missing/`0` = off); set by `quick-lookup` (3), `council-member` (15), `feeds-digest` (8), Benjy-Doer (`maxToolCalls`) |

Every Safety Stop extracts the **best free text** of the rounds as partial work and always has a non-empty stop text — the Reply is often the only signal for the Parent (for Working-WS-Parents, the FAILED-Event is suppressed).

The nets are a common component (`thinkengine/loop`: `ToolLoopSafetyNet`, `LoopLimits`, `SafetyStop`, Properties `vance.engine-loop.*`), which are also used by the Ford-adapted Wowbagger Agent (Pool status polls `wowbagger_status` additionally excluded, same outputs as Ford) and the Session Identities via `AbstractEngineSessionLoop` (Hactar/Vogon/Marvin) — there, a Safety Stop parks the Identity in **both** forms resumable `blocked`, because the machine (Run, phases, tree) owns the lifecycle, not the Agent Turn. Frankie has its own, similar nets (`vance.frankie.*`); Nutrimat remains intentionally independent.

Optionally (`params.validation: true`), Ford corrects a suspiciously short Natural Stop after large Tool results up to twice (Data-Relay-Gap) before it is accepted.

---

## 5. Current Role in the Architecture

Ford has two productive use cases:

**As a Worker for Orchestrator Engines:**

- **Arthur** → spawns Ford Recipes (`analyze`, `quick-lookup`, `web-research`, `code-read`) for operational user requests.
- **Marvin** → spawns `marvin-worker` (Engine: ford, with JSON output schema in the System Prompt) for each WORKER node in the Tree.
- **Vogon** → spawns phase-specific Ford Recipes (one per phase).
- **Zaphod** → spawns Ford Recipes per head (with per-head Persona append).

**As a Top-Level Engine without Workflow:** Sessions where no orchestrator, no task tree, and no phases are needed — typical for quick research, tool-driven lookups, and simple chat tasks with Memory/RAG context.

Ford itself knows nothing of these constellations — it simply does "one question → one answer" with a Tool Loop and optional Memory context. Which tools are allowed, which System Prompt, which Persona, which Memory sources — all are Recipe matters.

**Tool Surface.** Ford shares the Worker core (`WorkerEngineTools.CORE` — the manifest) with Frankie and adds the Worker Pool per turn: every tool with label `worker` is deferred accessible ([server-tools.md §15](server-tools.md)). Recipes add tools to the manifest via `allowedToolsAdd` or remove them via `allowedToolsRemove`; `params.toolPool: false` intentionally keeps a Worker lean (Zaphod-Heads and Magrathea-`agent_task` set it because they remove delegation).

---

## 6. What Ford Validates as a Test

When Ford runs in a real CLI session, the following paths are proven functional:

- [x] `ThinkEngineRegistry` finds Beans, indexed by `name()`.
- [x] `SessionService.create(type=INTERACTIVE)` atomically creates Session + Process.
- [x] CLI connects via WebSocket, handshake including Client Fingerprint.
- [x] `process-steer` command atomically lands in `ThinkProcessDocument.pendingMessages`.
- [x] Lane Scheduler starts Turn → Status `running` → Engine Steer → Status `ready`.
- [x] `ThinkEngineContext` is freshly built per turn, all sub-APIs accessible.
- [x] `AiChat` provider delivers a functional client (Settings cascade, Trace logging).
- [x] `ChatMessageService` writes/reads to MongoDB in order.
- [x] `ClientEventPublisher.publish(CHAT_MESSAGE_STREAM_CHUNK)` lands live at the client.
- [x] Client Disconnect → Session/Process `suspended`. Reconnect → resume.

The Tool Loop itself is doubly secured:

- `FordLoopTest` (vance-brain, Unit, scripted Streaming model) — each Safety Net in both modes, status poll exception, halt at drain head, drain abort after close; plus a 60-round turn without cap.
- `FordLoopLlmTest` (qa/ai-test, `@Tag("llm")`, real provider) — Chat Turn with Tool Round ends via Natural Stop → `idle`; opt-in `maxIterations: 1` forces the Safety Stop: in chat resumable `blocked` with stop text, as Arthur-Worker "⚠️ TASK FAILED" + `closed`/`incomplete`.

This is the **foundation plate**. On it stand Arthur (Tools + Orchestration), Marvin (Tree Runner), Vogon (Strategy), Zaphod (Multi-Head).

---

## 7. Transition to Arthur (Historically)

As long as Arthur was not finished, **Ford was the default** for Interactive Sessions. With Arthur becoming production-ready, this default was changed — Arthur takes over Sessions that need orchestration. However, Ford remains available both as a Worker Engine in the pool **and** as a Top-Level Engine for Sessions without workflow requirements (see §5).

---

## 8. Open Issues

- **Memory Compaction.** First implementation exists (`MemoryCompactionService` triggers via Token Estimate, once per turn before the loop — not mid-loop like Frankie). Validation of the path still belongs in the test plan.
- **Validator Loop.** Today pattern-based (data-relay-gap). Structured JSON output validator like Marvin's `marvin-worker` is Recipe-specific, not an Engine concept.
- **Error Marker on the Reply.** Synchronous drivers (Marvin `CALL_RECIPE`, Zaphod heads, `process_spawn wait=true`) currently recognize a Safety Stop only by text or process status, not by a structured flag.
