---
title: "Vancetope — User Progress Channel"
parent: Specs
permalink: /specs/user-progress-channel
---

<!-- AUTO-GENERATED from llm/specification/user-progress-channel.md (translated from the German specification/public/user-progress-channel.md) — do not edit here. -->

# Vancetope — User Progress Channel

> Live status for the user while Engines are working. **One** message class `PROCESS_PROGRESS` with three payload variants, separate from the authoritative chat stream. Ephemeral, not in conversation history.
>
> Supplement to: [client-protocol-extensibility](/specs/client-protokoll-erweiterbarkeit) | [websocket-protocol](/specs/websocket-protokoll) | [arthur-engine](/specs/arthur-engine) | [eddie-engine](/specs/eddie-engine)

---

## 1. Rationale

Currently, the user sees **nothing** during Engine operation:

- Tool calls (Web-Search, File-Write, `process_spawn`) run as a black box — the user only gets the result after the Lane-Turn ends.
- Sub-Engine spawn (Eddie spawns Arthur) is invisible to the user until the `ProcessEvent(DONE)` returns via `pendingMessages`. Eddie waits on the Lane, the user waits for Eddie.
- Token consumption and LLM roundtrip count are only in the TRACE log (`AiTraceLogger`), not visible to the user.
- Plan-driven Engines (Marvin's Task-Tree, Vogon's Phase-Gate) track their progress internally — the user only sees the final summary.

The existing chat path (`CHAT_MESSAGE_STREAM_CHUNK` → `CHAT_MESSAGE_APPENDED`) is **authoritative**: what passes through it is part of the conversation history, goes back into the LLM context, and is persisted. Status pings, tool start markers, and token counters do not belong there — they would contaminate the context and make the chat unreadable.

Therefore: **a dedicated side channel with its own message class, without context feedback, without persistence**.

**Definition of terms**: "Feedback" describes the requirement ("the user needs feedback"). The solution to this requirement is called `progress` in the system — an ongoing progress channel, both technically and semantically.

---

## 2. One Message, Three Variants

| Variant | Frequency | Content | Who generates? |
|---|---|---|---|
| `metrics` | high (per LLM roundtrip) | numerical: tokens, LLM calls, wall-clock | centrally in the AI layer |
| `plan` | low (on plan mutation) | structured: tree / phase snapshot | engine-specific (Marvin, Vogon) |
| `status` | medium (tool boundaries, status asides) | free text + tag | tool layer + Engine |

**One** `MessageType.PROCESS_PROGRESS`, an envelope with `source` and `kind`, three optional payload fields. The client distinguishes by `kind` discriminator and renders accordingly (counter HUD vs. plan panel vs. toast stream).

Advantages over three separate message types:

- Unified routing/filtering in the client (one subscribe point instead of three).
- `source` block is defined exactly once and sent with every message.
- Later variants (e.g., `quota_warn`, `model_fallback`) are additive without a new top-level type.

---

## 3. Envelope

Every `PROCESS_PROGRESS` message **always** carries the source block. In a session, the user often sees multiple processes in parallel (Eddie + spawned Arthur), and the client must be able to attribute which process produced the update.

```
ProcessProgressNotification {
  // === Source (Mandatory) ===
  processId         String           // Mongo ObjectId — unique
  processName       String           // technical name (e.g., "security_audit")
  processTitle      String?          // display name (e.g., "Security Audit Q2")
  engine            String           // "arthur" | "eddie" | "marvin" | "vogon" | ...
  sessionId         String           // Routing key for ClientEventPublisher
  parentProcessId   String?          // if sub-process — for hierarchy rendering

  // === Discriminator ===
  kind              ProgressKind     // METRICS | PLAN | STATUS

  // === Payload (exactly one set, depending on kind) ===
  metrics           MetricsPayload?
  plan              PlanPayload?
  status            StatusPayload?

  // === Telemetry ===
  emittedAt         Instant          // Server timestamp
}

enum ProgressKind { METRICS, PLAN, STATUS }
```

`processName`/`processTitle`/`engine` are redundant to the `processId` lookup but are **included** so that the client can render without an additional REST call (even for late-join, before it has the process list).

---

## 4. `METRICS` Variant

### Trigger

A push per LLM roundtrip, triggered in the AI layer (hook in / after `AiTraceLogger`). Values are already maintained on the `ThinkProcessDocument` (for later quota evaluation); `metrics` is just the push event on update.

### Payload

```
MetricsPayload {
  tokensInTotal     long             // cumulative since process start
  tokensOutTotal    long             // cumulative
  llmCallCount      int              // cumulative
  elapsedMs         long             // cumulative (wall-clock sum of roundtrips)
  modelAlias        String?          // which model the last call used
  lastCallTokensIn  int?             // delta of the last call (for incremental UI)
  lastCallTokensOut int?
}
```

### Rendering (Recommendation)

CLI / Web shows a compact status indicator ("Iron Man HUD"): `arthur · 4 calls · 12k in / 3k out · 8.2s`. Updates replace the indicator, no scroll.

---

## 5. `PLAN` Variant

Optional and engine-specific. Engines without a plan (Arthur, Eddie) do not emit this.

### Which Engines

- **Marvin** — Task-Tree (PLAN, WORKER, USER_INPUT, AGGREGATE), pre-order DFS
- **Vogon** — Phases with Gates / Checkpoints / Loops / Forks

### Payload

```
PlanPayload {
  rootNode          PlanNode
}

PlanNode {
  id                String           // engine-internal, stable
  kind              String           // engine-specific ("plan", "worker", "phase", "gate")
  title             String           // display
  status            String           // "pending" | "running" | "done" | "failed" | "blocked"
  children          List<PlanNode>?
  meta              Map<String, Object>?  // engine-specific (phase index, loop iteration, …)
}
```

### Frequency

Snapshot push on every plan mutation (node created, status change, node completed). **No diff protocol in v1** — the entire tree is sent. For Marvin with hundreds of nodes, optimization (patch format) is possible later, but not now.

### Persistence

The plan **itself** is persisted (Marvin's `taskTreeNodes` in Mongo, Vogon's phase status on the Engine doc). The `PROCESS_PROGRESS` message is only the push that something has changed — late-joiners can reload the current state via REST.

---

## 6. `STATUS` Variant

### Payload

```
StatusPayload {
  tag               StatusTag        // see below
  text              String           // recommendation: ≤ 120 characters, no hard limit
  detail            String?          // optional, longer context (tooltip / click-to-expand)
  tool              String?          // only for TOOL_START/TOOL_END: the raw tool name
  failed            Boolean?         // only for close pings: operation ended in error
  operationId       String?          // correlates _START ↔ _END / NODE_DONE / PHASE_DONE
  usage             UsageDelta?      // only filled for "done" tags (see §6a)
}
```

`tool` and `failed` are **structured alongside** the prose in `text`, not instead of it. The reason is the client: `text` is an English sentence ("Calling tool: doc_read"), from which neither a compact localized line ("doc_read · 4s") nor a success/failure statement can be derived without parsing the phrasing — thereby making a prose string a wire contract.

`failed` is intentionally tri-state: `null` means *not applicable* (open pings, single pings). If it were a primitive `false`, a client could not distinguish the absence of an error flag on an open ping from a successful completion. The cause is human-readable in `detail`.

```
enum StatusTag {
  TOOL_START,        // "Calling tool: web_search"
  TOOL_END,          // "Tool web_search done (3 results)"
  SEARCH,            // "Searching for: 'iron man helmet specs'"
  FETCH,             // "Fetching: https://example.com/article"
  FILE_WRITE,        // "Writing file: /workspace/notes.md"
  FILE_READ,
  DELEGATING,        // "Spawning sub-process: arthur (security_audit)"
  WAITING,           // "Waiting for user input on inbox item #42"
  NODE_DONE,         // Marvin: Task-Tree node completed (with usage)
  PHASE_DONE,        // Vogon: Phase completed (with usage)
  SCRIPT_PROGRESS,   // explicit `vance.process.progress(...)` from the script (Hactar)
  INFO               // catch-all for engine-specific status asides
}

UsageDelta {
  tokensIn          int              // delta of this operation
  tokensOut         int
  llmCalls          int              // 0 for purely local tools (no LLM involved)
  elapsedMs         long             // measured server-side — operation duration
  modelAlias        String?          // dominant model alias of the operation
  costMicros        long?            // 1/1_000_000 EUR, optional (from ai-models.yaml)
}
```

### Important

- **Not in the conversation history.** The text does NOT flow into `pendingMessages`, NOT into the LLM context on the next roundtrip. Pure side-channel push.
- **Ephemeral.** If you miss the moment, you don't see it. No Mongo persist, no reconnect replay. Past status is irrelevant — `status` is a real-time ping, not an audit log.
- **Soft limit 120 characters.** Recommendation in engine implementation; no server-side cut. A hard 140-character cut led to cryptic abbreviations, which we want to avoid.
- **`usage` is optional.** Server overhead per operation is a subtraction from process totals — no additional measurement. If values are unknown or uninteresting (e.g., pure filesystem tool), omit the field. The `metrics` variant remains the high-frequency push per LLM roundtrip; `status.usage` is the less frequent "stage completed" view.

### Tool Reporting in Detail

**Local Tools** (executed in `vance-brain` — `web_search`, `process_spawn`, `process_steer`, etc.):

- A wrapper / listener on the Tool Executor (analogous to `ArthurEngine.invokeOne`) emits `status(TOOL_START)` before execution, `status(TOOL_END)` afterward. For `TOOL_END`, `usage` is calculated from the token delta of the process totals since the start (see §6a) — for tools with nested LLM calls (sub-engines, summarize, RAG), these are the true costs of this tool; for pure FS tools, `tokensIn=tokensOut=llmCalls=0` with `elapsedMs` filled.
- Tool implementation can additionally send engine-specific pings (e.g., `web_search` pushes `status(SEARCH, query)` with the specific query string, not just the tool name).

**Workspace Tools** (executed in the client via `CLIENT_TOOL_INVOKE` — file operations on the user's machine):

- **Brain pushes the `status(TOOL_START)` ping** as soon as it sends out the `CLIENT_TOOL_INVOKE`. Rationale: unified code path, the client does not need its own status logic. Cost is an additional WS message — negligible.
- On `CLIENT_TOOL_RESULT` return: `status(TOOL_END)`. `usage.elapsedMs` is the Brain's internal work (sending until result) — not the client-side wall-clock.

---

## 6a. Operation Lifecycle

`operationId` links a `_START` ping to its `_END` ping. This ensures:

- **Tool traces do not get mixed up during parallel operations** (Eddie starts three sub-tools sequentially, `TOOL_END` pings can arrive in any order);
- **The client can measure end-to-end wall-clock time** (see below);
- **The client can render a spinner per operation** (multiple simultaneously, each with its own label).

### Assignment

`ProgressEmitter` assigns a ULID/UUID when creating the `_START` variant and returns it to the caller. The caller (tool wrapper, engine node code) carries the ID until the `_END` call. For `CLIENT_TOOL_INVOKE`, the ID is also passed to the client via the `CLIENT_TOOL_INVOKE` message — the returning `CLIENT_TOOL_RESULT` carries it so the Brain can build the corresponding `TOOL_END` ping.

### Which Tags Open / Close

| Open | Close | Who |
|---|---|---|
| `TOOL_START` | `TOOL_END` | Tool Executor Decorator (Brain) |
| `DELEGATING` | `TOOL_END` (or own `NODE_DONE`) | Eddie / Marvin (Sub-Process Spawn) |
| (Node status `running`) | `NODE_DONE` | Marvin (Node transition `done`/`failed`) |
| (Phase start `INFO`) | `PHASE_DONE` | Vogon (Phase change) |

`SEARCH`, `FETCH`, `FILE_*`, `WAITING`, `SCRIPT_PROGRESS`, `INFO` have **no** lifecycle counterpart — they are single pings without `operationId`. If lifecycle is needed, use `TOOL_START`/`TOOL_END` and describe the tool in `text`.

> **Current state deviates (as of 2026-08-25).** Only `TOOL_START`/`TOOL_END` is actually correlated (`ProgressToolListener`). `DELEGATING` (Marvin, Magrathea), `NODE_DONE` (Marvin), and `PHASE_DONE` (Slartibartfast) all go through simple `emitStatus` **without** `operationId`, and are therefore effectively single pings. Clients must treat them as completed — modeled as open operations, their line would spin forever. The table describes the goal, not the current state; whoever implements it will also implement the client reduction (`chatActivity.ts`, §6b).

### Token Delta Calculation (Server)

The Tool Executor Decorator takes a snapshot of the process totals (`tokensInTotal`, `tokensOutTotal`, `llmCallCount` from `ThinkProcessDocument` — same source as `metrics` variant) before the tool call. After tool end, the difference is calculated and attached to `UsageDelta`. This ensures that LLM calls that occurred _within_ a sub-engine tool are also correctly counted for the calling operation.

Marvin and Vogon nodes maintain the same snapshot at node entry and calculate at the `NODE_DONE`/`PHASE_DONE` ping. Sub-node subtotals roll up via the respective engine's tree aggregation — the spec there is authoritative.

### Wall-Clock in the Client

The client measures wall-clock **itself** from `_START` to `_END` arrival, keyed by `operationId`. This is the latency the user _feels_ (including WS roundtrip, render delay). Server `usage.elapsedMs` shows the Brain's internal work — both values are useful, but the client primarily renders its own measurement. In verbose mode, it can additionally show the server time (`2.8s · brain 2.4s`).

Implementation v1 (vance-foot): `Map<operationId, Instant started>` is populated on `_START`, the difference is rendered on `_END`, and the entry expires after a short fade (~5 s). The spinner repaint loop runs only as long as the map is not empty.

### 6b. Activity Strip (Web UI)

The Web UI renders the channel in **two** places, and the distinction is between lookup and perception:

- **`ProgressFeed`** in the right panel of `/chat` — the complete list of all kinds, to be opened if one wants to know something.
- **`ChatActivityStrip`** in `ChatView` — *one* line between transcript and composer, which answers whether anything is still happening at all. Because it sits in `ChatView`, it applies to `/chat` **and** to the Cortex side panel (`ChatSidePanel`), which previously did not subscribe to the channel at all and thus remained silent during long tool runs.

The strip is **not a chat message**, and this is the crucial decision: the channel is by definition ephemeral (not persisted, no replay). Rendered as bubbles, tool calls would disappear after every reload, leaving gaps in the transcript — a history that lies. A line that collapses into a summary when idle does not have this problem: it never claims to be history.

Reduction in `chatActivity.ts` (framework-agnostic, so correlation is testable without component mount):

- `TOOL_START`/`TOOL_END` are paired via `operationId`; a close without an open counterpart is recorded as an already completed entry instead of being discarded.
- **Single pings** about past events that never start a running clock: `PROVIDER`, `COMPACTION`, `SCRIPT_PROGRESS`, `DELEGATING`, `SEARCH`, `FETCH`, `FILE_READ`, `FILE_WRITE`, `NODE_DONE`, `PHASE_DONE`, `INFO`. The fact that `DELEGATING` and `PHASE_DONE` are listed here **contradicts the lifecycle table in §6a** and follows reality: Marvin, Magrathea, and Slartibartfast send them via simple `emitStatus` without `operationId`. Modeled as correlated opens, their lines would spin forever. (`SEARCH`, `FILE_READ`, `FILE_WRITE` currently have **no** emitter in the tree — included because they belong to the wire enum, not because they occur. `INFO` only reaches the client with `progress=verbose`.)
- `ENGINE_TURN_START`/`_END` serve **only** as a bracket (clear list, switch to summary); they are not displayed as lines. The bracket is counted exclusively by the **own chat process**: the turn end of a worker must not collapse the strip while the chat is still working.
- If something is running **without** an active chat turn (background worker), the strip remains visible — this silence is precisely what it aims to explain.

**`WAITING` gets its own slot** instead of a list line, for two measured reasons. Fenchurch heartbeats the same waiting state every few seconds with *changing* text ("... 1:23 elapsed") — as a list, these would be dozens of near-duplicates. And a waiting state is not an event that happened, but a condition that persists: the interesting number is its **duration**, and that only survives if the ping refreshes a slot instead of creating a line (`since` remains at the first ping of the stretch).

This leads to three rules:

- **Coexistence with the running tool.** An image generation is a running `image_generate` **and** a waiting for the provider. The strip shows both: the tool in the header (it names *what* is happening), the waiting state as a second line (it explains *why it takes time*). The duration in the header always belongs to the text next to it.
- **Cleared process-scoped.** A tool boundary or single ping only clears the slot if it comes from the **same process**. A worker's tool work says nothing about whether the chat process is still stuck at its gate.
- **`ENGINE_TURN_END` does NOT clear the slot.** Parking at the gate *is* how a turn ends (Vogon goes `BLOCKED` and yields) — deleting it there would remove the very line that explains why nothing follows. A waiting state that was only *within* the turn is cleared by the close of its own tool; it does not need the turn bracket for that.

A waiting state is displayed with `⏳`, never with the spinner: waiting is not progress, and a spinner would imply work that is not happening.

---

## 7. Transport — Side Channel via `ClientEventPublisher`

Existing infrastructure is sufficient, no new components needed:

```
Engine / AI Layer / Tool Wrapper
        │
        ▼
ProgressEmitter.emit(notification)         // thin wrapper, sets source block
        │
        ▼
ClientEventPublisher.publish(sessionId, notification)
        │
        ├─► SessionConnectionRegistry.find(sessionId)
        │       │
        │       └─► (no client connected) → silent drop
        │
        └─► WebSocketSender.sendNotification(connection, message)   // non-blocking
```

- **Asynchronous** (non-blocking) — Engine/Lane-Turn is not blocked.
- **Silent-Drop** on missing connection — pings are ephemeral, no buffering.
- **`ProgressEmitter`** is the only caller for `PROCESS_PROGRESS`. Responsibility: populate the source block (`processId`, `processName`, `processTitle`, `engine`, `sessionId`, `parentProcessId`) based on the current engine context. Engines/Tools only build the payload; the envelope is central. This ensures we never see a `PROCESS_PROGRESS` message without a source.
- **Multi-Pod Routing**: as long as `SessionConnectionRegistry` is single-pod, cross-pod pings are lost. If Eddie runs on Pod A and the user is connected to Pod B, the registry lookup requires a cluster backplane (Redis Pub/Sub or similar) — scaling follow-up, not v1.

### New `MessageType` Entry

In `vance-api/src/main/java/de/mhus/vance/api/ws/MessageType.java`:

- `PROCESS_PROGRESS` — Server→Client, without request correlation

**Exactly one**, not three.

---

## 8. Eddie & Sub-Engine Topology

Critical Use Case:

```
User ──"analyze this"──▶ Eddie ──spawn──▶ Arthur (Sub-Process)
                            │
                            waits for ProcessEvent(DONE)
                            via pendingMessages-Lane
```

Today: While Arthur works (minutes range), the user sees nothing. Eddie is parked on its Lane, Arthur communicates "upwards" via Mongo messages.

**Solution**: Arthur (and every Sub-Engine) pushes `PROCESS_PROGRESS` messages **directly to the `sessionId`** via `ProgressEmitter`/`ClientEventPublisher`, **not** via the Eddie Lane. Eddie does not hear this — the user does. `parentProcessId` in the envelope makes the hierarchy visible to the client.

```
Arthur ──PROCESS_PROGRESS (source=arthur, parent=eddie)──▶ User-WS
   │
   └──ProcessEvent(DONE)─────────────────────────────────▶ Eddie's pendingMessages
                                                            (authoritative, Lane-Turn)
```

**Separation**:

- **Side Channel** (`PROCESS_PROGRESS`): direct to session, ephemeral, for user visibility.
- **Lane Channel** (`pendingMessages` / `ProcessEvent`): engine-to-engine, persistent, authoritative.

Eddie reacts to `DONE` on the next Lane-Turn and produces its user-facing response as a regular chat stream. The side channel has no influence on this.

The client can decide, based on `parentProcessId`, whether to render sub-process updates indented under the parent or as a separate HUD entry — a rendering question, not a protocol question.

---

## 9. Configuration

Per Process via Recipe parameter (see [recipes](/specs/recipes)):

```yaml
params:
  progress: normal      # off | normal | verbose
```

- `off` — no `metrics`, no `status`, `plan` still included (plan is structurally important)
- `normal` — `metrics` aggregated, `status` for tool boundaries and explicit `SCRIPT_PROGRESS` from scripts
- `verbose` — additionally engine-specific `INFO` pings, every tool detail

`SCRIPT_PROGRESS` is intentionally not `INFO`: an explicit `vance.process.progress(...)` call in the script is *intended* by the script author — it does not belong in the filterable engine-aside bucket.

Default: `normal`. User-global override later via Settings (`ux.progress.default`), not v1.

---

## 10. v1 Scope

**Included**:

- `MessageType.PROCESS_PROGRESS` + Envelope DTO + three payload classes + `UsageDelta` in `vance-api`
- `ProgressEmitter` service in `vance-brain` (central source block filler, assigns `operationId` for `_START` pings)
- AI layer hook for `metrics` (coupled to `AiTraceLogger` extension)
- Tool Executor Decorator for `status(TOOL_START/END)` with token delta snapshot → `usage` on `TOOL_END`
- `CLIENT_TOOL_INVOKE` path emits `status(TOOL_START)` on sending, `operationId` travels via `CLIENT_TOOL_INVOKE`/`CLIENT_TOOL_RESULT`
- Marvin & Vogon emit `plan` on mutation, plus `status(NODE_DONE)` / `status(PHASE_DONE)` with `usage` at node/phase end
- Arthur emits `status` for tool boundaries and sub-process spawn
- Eddie emits `status(DELEGATING)` on sub-engine spawn (paired with `TOOL_END` on sub-process result)
- vance-foot renders all three variants (HUD line, plan panel, toast stream) and measures wall-clock per `operationId` client-side
- `params.progress` is honored

**Excluded**:

- Web UI rendering (plan panel component, HUD widget) — follow-up with Web UI editor work
- Cross-pod routing via cluster backplane
- Plan diff protocol (full snapshots are sufficient)
- Persistence of `status` history (ephemeral by definition)
- Late-join replay (reconnect shows current `metrics`/`plan` state via REST pull, no event replay)
- Per-user global default setting (`params` override is sufficient for v1)

---

## 11. Implementation Steps

1. `MessageType.PROCESS_PROGRESS` + Envelope DTO (`ProcessProgressNotification`) + Enums (`ProgressKind`, `StatusTag`) + three payload classes (`MetricsPayload`, `PlanPayload`, `StatusPayload`) + `UsageDelta` + `PlanNode` in `vance-api/ws`. All with `@GenerateTypeScript` for Web UI.
2. `ProgressEmitter` in `vance-brain/events`: central service that populates the source block from `ThinkProcessDocument`/Engine context and forwards to `ClientEventPublisher`. Methods: `emitMetrics(...)`, `emitPlan(...)`, `emitStatus(...)` plus `openOperation(tag, text)` (assigns `operationId`, pushes `_START`) / `closeOperation(operationId, tag, text, usage)` (pushes `_END` variant with `usage` filled).
3. AI layer hook (on `AiTraceLogger` or `ChatResponse` wrapper): accumulates tokens on the Process Doc, calls `ProgressEmitter.emitMetrics(...)` after each roundtrip. Token totals on the `ThinkProcessDocument` are the source for `UsageDelta` snapshots in §6a.
4. `ToolExecutionInterceptor` in `vance-brain`: decorator around the Tool Executor path (Arthur's `invokeOne`). Before execution: `openOperation(TOOL_START, …)` + snapshot (`tokensInTotal`, `tokensOutTotal`, `llmCallCount`, `Instant.now()`). After execution: calculate difference, `closeOperation(operationId, TOOL_END, …, usage)`. For pure FS tools, token fields are 0 — `elapsedMs` remains filled.
5. `CLIENT_TOOL_INVOKE` path: Brain pushes `status(TOOL_START)` on sending, attaches `operationId` to the `CLIENT_TOOL_INVOKE` message; on `CLIENT_TOOL_RESULT` return, Brain builds the `TOOL_END` ping with `usage` (`elapsedMs` = Brain roundtrip time).
6. Marvin & Vogon: `emitPlanSnapshot()` at mutation points, calls `ProgressEmitter.emitPlan(...)` with current tree. At node entry, take snapshot of process totals; on node transition to `done`/`failed`, `closeOperation(NODE_DONE, …, usage)` (Marvin) or `PHASE_DONE` (Vogon).
7. `params.progress` in `RecipeResolver` as a default param; `ProgressEmitter` filters before push (no constant check in every engine).
8. vance-foot: three renderers (HUD line with `\r` overwrite, Plan Panel via Lanterna, Toast Stream as ANSI dim lines below the chat) — all subscribe to the same `PROCESS_PROGRESS` point, dispatch by `kind`. For each `operationId`, `Instant started` is held locally; on `_END`, wall-clock difference is rendered (spinner tick ~250 ms, runs only if operation map is not empty).
