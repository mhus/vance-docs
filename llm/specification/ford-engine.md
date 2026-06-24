# Vance — Ford Think Engine

> **Ford** is the full-fledged single-LLM engine — the Guide's field researcher. Quick response, no frills, knows where its towel is: It receives a user message, calls an LLM (with tools, memory access, RAG/Knowledge-Graph), and writes the answer to the chat. **No workflow properties** — no orchestration of sub-processes, no task tree, no phase gates. Default worker for all orchestrator engines (Arthur/Marvin/Vogon/Zaphod) and also directly usable when no workflow is needed.
> See also: [arthur-engine](arthur-engine.md) (Framework API that Ford implements), [think-engines](think-engines.md) (Registry, Lifecycle)

---

## 1. Purpose

Ford is the **single-LLM engine** in the Vance engine set: one turn = one LLM call (with tool loop), no control over multiple phases or sub-processes. This covers two roles:

- **Generalist Worker** for the orchestrator engines. Arthur, Marvin, Vogon, and Zaphod spawn Ford Recipes (`analyze`, `quick-lookup`, `web-research`, `code-read`, `marvin-worker`, …) for the operational individual tasks that arise in the respective workflow.
- **Direct Top-Level Chat** for Sessions that do not require a workflow — short research, quick information, tool-driven lookups. In these cases, Ford is the Session Engine, and no orchestrator is in between.

Historically, Ford was also the **Walking Skeleton** for the Think Engine framework: Registry discovery, auto-start on Session-Create, Pending-Queue, Lane-Turn, `ThinkEngineContext`, LLM call, `ChatApi`, WebSocket streaming, Suspend/Resume — everything was first validated end-to-end with Ford. This function remains as a side effect but is no longer the primary reason for its existence.

---

## 2. What Ford CANNOT do (intentionally)

Ford has **no workflow properties**. What a turn does not include:

- **No orchestration.** Ford does not start sub-processes or control external processes. If sub-workers are needed, that is Arthur's job (or one of the other orchestrators), which in turn spawns Ford.
- **No task tree.** No `Node` persistence, no planning, no sub-tasks. Marvin does that.
- **No phases / gates / checkpoints.** No deterministic multi-step process. Vogon does that.
- **No multi-head consultation.** No parallel Personas on the same question. Zaphod does that.
- **No foreground/background logic at the Session level.** If Ford is top-level, it is the only process in the Session.

> Memory access (RAG, Knowledge-Graph, Project documents) and Tools are **allowed** and configured via Recipe — Ford is no longer a "dumb" LLM wrapper. What distinguishes it from Arthur is the absence of orchestration and persistent task structure, not the inability to consult external data.

---

## 3. What Ford CAN do

A Lane-Turn does exactly this:

1. `context.drainPending()` → typically a `UserChatInput`.
2. `context.chat().history()` → read the chat history of its own process / session.
3. System prompt from the current Recipe (e.g., `analyze`, `web-research`, `marvin-worker`).
4. Optional memory consultation via Recipe configuration: RAG query over Project/Session memory, Knowledge-Graph lookup, Project documents. Results are appended to the prompt as context.
5. `context.aiModelService().createChat(...)` → Default LLM via settings cascade. Recipe parameters can override the model.
6. LLM call with `[systemPrompt, memoryContext?, ...history, newUserMessage]` → Assistant text. Tool loop if Recipe allows tools.
7. During the call: Token chunks via `context.events().publish(CHAT_MESSAGE_STREAM_CHUNK, ...)`.
8. After the call: `context.chat().append(ChatMessage.assistant(...))`.
9. Status → `ready`.

Other `SteerMessage` variants (`ProcessEvent`, `ToolResult`, `ExternalCommand`) must **not** arrive at Ford — it has no workers and does not make async tool calls. If they do arrive (regression error), Ford logs a warning and discards them.

---

## 4. Detailed Lifecycle Behavior

| Method | Behavior |
|---------|-----------|
| `start(process, ctx)` | Writes a short greeting `ChatMessage.assistant` (e.g., "Ford here. Ask me anything."). Status → `ready`. No LLM call. |
| `resume(process, ctx)` | Drains the queue. If empty, immediately returns to `ready` (no turn). If not empty, executes a turn as with `steer`. |
| `suspend(process, ctx)` | No cleanup. Chat history is persistent anyway. Status is set to `suspended` by the Brain. |
| `steer(process, ctx, msg)` | Core routine: drain, LLM call, Assistant response (see §3). |
| `stop(process, ctx)` | No cleanup. Status → `stopped`. |

Ford **never** reaches `done` (just like Arthur) and does not use `blocked` either — it has no approval workflow. Actual status set: `ready` · `running` · `suspended` · `stopped` · `stale`.

Ford is `asyncSteer = false` — the default. `process_steer` blocks the calling Lane until Ford's turn is complete and returns the reply as `newMessages`. This is exactly what Arthur and other orchestrators expect.

---

## 5. Current Role in the Architecture

Ford has two productive uses:

**As a Worker for Orchestrator Engines:**

- **Arthur** → spawns Ford Recipes (`analyze`, `quick-lookup`, `web-research`, `code-read`) for operational user requests.
- **Marvin** → spawns `marvin-worker` (Engine: ford, with JSON output schema in the system prompt) for each WORKER node in the Tree.
- **Vogon** → spawns phase-specific Ford Recipes (one per phase).
- **Zaphod** → spawns Ford Recipes per head (with per-head Persona append).

**As a Top-Level Engine without Workflow:** Sessions where no orchestrator, no task tree, and no phases are needed — typical for quick research, tool-driven lookups, and simple chat tasks with Memory/RAG context.

Ford itself knows nothing of these constellations — it simply does "one question → one answer" with a tool loop and optional Memory context. Which tools are allowed, which system prompt, which Persona, which Memory sources — all are Recipe matters.

---

## 6. What Ford Validates as a Test

When Ford runs in a real CLI session, the following paths are proven functional:

- [x] `ThinkEngineRegistry` finds Beans, indexed by `name()`.
- [x] `SessionService.create(type=INTERACTIVE)` atomically creates Session + Process.
- [x] CLI connects via WebSocket, handshake including client fingerprint.
- [x] `process-steer` command atomically lands in `ThinkProcessDocument.pendingMessages`.
- [x] Lane scheduler starts Turn → Status `running` → Engine-Steer → Status `ready`.
- [x] `ThinkEngineContext` is freshly built per Turn, all sub-APIs accessible.
- [x] `AiChat` provider delivers a functional client (settings cascade, trace logging).
- [x] `ChatMessageService` writes/reads to MongoDB in order.
- [x] `ClientEventPublisher.publish(CHAT_MESSAGE_STREAM_CHUNK)` lands live at the client.
- [x] Client disconnect → Session/Process `suspended`. Reconnect → resume.

This is the **foundation plate**. Arthur (Tools + Orchestration), Marvin (Tree-Runner), Vogon (Strategy), Zaphod (Multi-Head) stand on it.

---

## 7. Transition to Arthur (Historical)

As long as Arthur was not ready, **Ford was the default** for Interactive Sessions. With Arthur becoming production-ready, this default was changed — Arthur takes over Sessions that require orchestration. However, Ford remains available both as a worker engine in the pool **and** as a top-level engine for Sessions without workflow requirements (see §5).

---

## 8. Open Points

- **LLM Error Handling.** If the LLM call fails (quota, network, over-limit), Ford writes an Error-`ChatMessage.system` and returns to `ready`. Detailed semantics (retry vs. fail-fast, user communication) will be defined with the first implementation.
- **Memory Compaction.** First implementation exists (`MemoryCompactionService` triggers via Token-Estimate). Path validation still needs to be part of the test plan.
- **Validator Loop.** Currently pattern-based (intent-without-action, data-relay-gap). Structured JSON output validator like Marvin's `marvin-worker` is Recipe-specific, not an Engine concept.
