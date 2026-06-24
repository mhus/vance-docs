---
title: "Vance — Arthur Think Engine"
parent: Documentation
permalink: /docs/arthur-engine
---

<!-- AUTO-GENERATED from specification/public/en/arthur-engine.md — do not edit here. -->

---
# Vance — Arthur Think Engine

> **Arthur** is the reactive **Session Chat Think Engine** — the default engine of the Chat Think Process, which is automatically created when an Interactive Session is established. Arthur is also the **reference implementation example** that fully demonstrates the general Think Engine framework. Anyone building a new Think Engine will find the concrete API that Arthur uses here — other engines (e.g., `deep-think`) implement the same framework.
> See also: [think-engines](/docs/think-engines) (terms, registry, lifecycle contract), architecture-scopes-clients §2 (Session Ownership), execution-and-persistence (memory types, Pod binding), engine-message-routing (Inbox persistence, Working WS)

---

## 1. Role and Classification

An Interactive Session is always coupled to an Arthur Process. This Process:

- Holds the **Session Chat** (`ChatMessage` with `thinkProcessId = <arthurProcessId>`).
- Receives **User Input** via `process-steer`.
- Receives **Events from other Processes** of the Session (Sub-Process finished, blocked, Approval Request).
- Calls Worker Engines (`deep-think` etc.) via the `process_create` tool when needed.
- Summarizes intermediate results and completions for the user **in the chat**.

Arthur is **reactive**: it does nothing without an inbound event (User Input, Event, Tool Result). It never reaches `done` — it only ends via `stopped` (on Session Close or User Stop) or `suspended` (on Session Suspend).

In contrast: `deep-think` is **batch-like**, plans a task tree, processes it, and reaches `done`.

The framework in Chapter 2 makes both worlds operable with the same interface — the difference arises from the prompt, tool pool, and reaction logic, not from type distinction.

Architecturally, Arthur is a **Coordinator**: a chat agent orchestrates worker processes via tool calls (`process_create`) that run as separate engines on their own Lanes; worker results return asynchronously as structured `ProcessEvent` messages to Arthur's Inbox (§3.4–§3.5).

---

## 2. Think Engine Framework

This chapter describes the **general** framework for Think Engines. Arthur is the first implementation; `deep-think` and later engines use the same framework.

### 2.1 The `ThinkEngine` Interface

Every Think Engine is a Spring Bean that implements `ThinkEngine`. The class is **stateless regarding a concrete instance** — all state lives in the `ThinkProcessDocument` and is passed in fresh for each call.

```java
public interface ThinkEngine {

    // ─── Metadata (Registry fields, see think-engines §2) ──────────────
    String name();                              // unique, lowercase-kebab: "arthur", "deep-think"
    String title();                             // Display Name: "Arthur Session Chat"
    String description();
    SemVer version();
    @Nullable SettingsSchema defaultSettings();

    // ─── Lifecycle (see think-engines §3) ──────────────────────────────
    void start(ThinkProcessDocument process, ThinkEngineContext context);
    void resume(ThinkProcessDocument process, ThinkEngineContext context);
    void suspend(ThinkProcessDocument process, ThinkEngineContext context);
    void steer(ThinkProcessDocument process, ThinkEngineContext context, SteerMessage message);
    void stop(ThinkProcessDocument process, ThinkEngineContext context);
}
```

**Discovery.** A dedicated `@ThinkEngineBean` annotation marks the class; the `ThinkEngineRegistry` collects all Beans of this type during Spring startup, indexed by `name()`. No explicit entry in `application.yml`.

**Name Conflicts.** Two Beans with the same `name()` → error during startup (fail-fast).

**Version Check.** When resuming a persisted Process, `process.thinkEngineVersion` is checked against `engine.version()` (SemVer compatibility: Major match). Incompatible → Process goes to `stale`.

### 2.2 `ThinkEngineContext`

The Context is the Engine's **sole access point** to the runtime. It is built **fresh** by the Brain for each lifecycle call and never cached by the Engine.

```java
public interface ThinkEngineContext {

    // ─── Identity & Scope ───────────────────────────────────────────────
    ScopeChain scope();                         // Tenant → Group → Project → Session → Process
    UserId user();                              // Owner of the Session

    // ─── Knowledge ──────────────────────────────────────────────────────────
    MemoryApi memory();                         // RAG query with Scope cascade, KG access, documents
    ChatApi chat();                             // Read + write ChatMessages of this Session

    // ─── Execution ──────────────────────────────────────────────────────
    LlmProvider llm();                          // per-call client instantiation (see llm-resource-management)
    ToolDispatcher tools();                     // generic tool call (server/client/MCP, transparent)
    SettingsApi settings();                     // typed settings with Scope cascade

    // ─── Inbound Queue ───────────────────────────────────────────────────
    List<SteerMessage> drainPending();          // pending messages since last Lane turn

    // ─── Outbound ────────────────────────────────────────────────────────
    EventPublisher events();                    // push to bound client (streaming, status updates)
    ProcessOrchestrator processes();            // read/steer sibling processes of the same Session
}
```

The Context makes **tool transport** transparent: whether a tool is executed server-side, via WebSocket at the client, or via an MCP server — the Engine always calls `context.tools().invoke(toolName, params)`. See [mcp-tool-routing](/docs/mcp-tool-routing).

### 2.3 `SteerMessage` — The Inbound Protocol

Every message sent to a Think Process — whether from the user, a sibling process, or as a tool result — is a `SteerMessage`. This is intentionally a sum type (sealed interface) so that Engines explicitly handle all cases.

```java
public sealed interface SteerMessage {

    Instant at();                               // Time of delivery
    @Nullable MessageId idempotencyKey();       // for retry safety

    /** The user typed in the chat. */
    record UserChatInput(
        Instant at, @Nullable MessageId idempotencyKey,
        UserId from, String content
    ) implements SteerMessage {}

    /** A sibling process reports a status change. */
    record ProcessEvent(
        Instant at, @Nullable MessageId idempotencyKey,
        ThinkProcessId sourceProcessId,
        ProcessEventType type,                   // started | blocked | done | failed | stopped | summary
        @Nullable String humanSummary,
        @Nullable Map<String, Object> payload
    ) implements SteerMessage {}

    /** Result of an async dispatched tool call. */
    record ToolResult(
        Instant at, @Nullable MessageId idempotencyKey,
        ToolCallId toolCallId, String toolName,
        ToolCallStatus status,                   // success | error | timeout
        @Nullable Object result, @Nullable String error
    ) implements SteerMessage {}

    /** High-level command directly addressed from the client (e.g., UI button). */
    record ExternalCommand(
        Instant at, @Nullable MessageId idempotencyKey,
        String command, Map<String, Object> params
    ) implements SteerMessage {}
}
```

### 2.4 Pending Message Queue and Lane Serialization

Every Think Process has a **persisted Inbox** in the central `EngineMessageDocument` collection (see engine-message-routing §3). Inbound events are persisted by the sender as a Mongo Document Insert with `targetProcessId = <this>` (atomic) — regardless of whether the Process is currently `running` or idle.

A **Lane Turn** (serialized execution of a lifecycle call) proceeds as follows:

1. Brain acquires the Lane lock for `processId` (Per-Process Queue in `vance-brain`).
2. Process status → `running`.
3. Engine method is called (e.g., `steer` with a message, or `resume`).
4. The Engine drains the Inbox with `context.drainPending()` — query against `EngineMessageDocument` with `targetProcessId = self AND deliveredAt != null AND drainedAt = null`. Processes **all** buffered messages in one turn, not just one.
5. Engine writes Chat Messages, calls Tools, executes LLM calls, persists Memory entries.
6. Engine marks the drained messages as `drainedAt = now`.
7. Engine sets the final status: `ready` (idle), `blocked` (waiting for user), `done` (goal reached), `stopped`.
8. Lane lock is released.

**Atomicity.** While a Lane Turn is running, further messages can be added to the Inbox via an Insert into `EngineMessageDocument` — they will be processed in the **next** turn. No race, no loss.

**Auto-Wakeup.** If, after a turn, the Inbox is **not empty** (new messages arrived during the turn), another turn is scheduled immediately — until the Inbox is empty.

### 2.5 Persistence Integration

A Think Engine **never directly touches MongoDB**. All write operations go through the Context:

| Where to | Via which Context API |
|----------|-----------------------|
| Chat Messages (visible in UI) | `context.chat().append(...)` |
| Memory Entries (internal working memory, `ThinkProcessMemoryEntry`) | `context.memory().recordTurn(...)` |
| Task Tree Nodes (if the Engine uses a tree) | `context.processes().current().tree().append(...)` |
| Settings Updates | `context.settings().set(...)` |

The `ThinkProcessDocument` itself is managed by the Brain — the Engine returns its intended final status via return value or a dedicated setter; the Brain persists it.

### 2.6 Event Streaming to the Client

During a Lane Turn, the Engine can use `context.events()` to stream intermediate events to the bound client (LLM token chunks, status updates, progress). Types:

```java
public sealed interface ChatStreamEvent {
    record TokenChunk(String text) implements ChatStreamEvent {}
    record ToolCallStarted(ToolCallId id, String toolName, Object params) implements ChatStreamEvent {}
    record ToolCallCompleted(ToolCallId id, ToolCallStatus status) implements ChatStreamEvent {}
    record ProcessSpawned(ThinkProcessId childProcessId, String goal) implements ChatStreamEvent {}
    record StatusChanged(ProcessStatus from, ProcessStatus to) implements ChatStreamEvent {}
}
```

For a suspended Session (no client bound), events are **discarded** — the permanent data (Chat Messages, Memory) is already persistent; events are only a live overlay.

---

## 3. Arthur in Detail

### 3.1 Auto-Start on Session Creation

When creating an **Interactive** Session, the `SessionChatBootstrapper` (vance-brain) atomically creates a Session Chat Think Process, triggered by `SessionCreateHandler` and `SessionBootstrapHandler`. The specific engine used is read from the `session.defaultChatEngine` setting (default: `arthur`):

```
sessionCreate(userId, projectId, type=INTERACTIVE) →
  1. Persist SessionDocument (Status: ready)
  2. engine = settings.get("session.defaultChatEngine")   // default "arthur"
  3. RecipeResolver.applyDefaulting(recipe=null, engine=engine)
     → applies Recipe `<engine>` (e.g., `arthur`) to the spawn
     → returns AppliedRecipe with Prompt override + Validator overrides
  4. Persist ThinkProcessDocument (Name: "chat", recipeName=engine,
                                          plus all Recipe fields mirrored)
  5. SessionDocument.chatProcessId = <new Process> (atomic setChatProcessId)
  6. engine.start(process, context) runs on the Process Lane (synchronously via .get())
```

For **Autonomous** Sessions, **no** Chat Process is created — autonomous sessions do not have a Session Chat.

The Chat Process cannot be created or deleted separately. It exists 1:1 with the Interactive Session as long as the Session lives. Session Close → Chat Process `stopped`. During the Session's lifetime, the chosen Engine is fixed — no runtime swap from Ford to Arthur within the same Session.

### 3.2 System Prompt and Role

Arthur's System Prompt lives in the **bundled `arthur` Recipe** in `vance-brain/src/main/resources/vance-defaults/recipes/arthur.yaml`. When an Arthur Process is spawned (e.g., by `SessionChatBootstrapper` for each new Interactive Session), the `RecipeResolver` automatically resolves `recipe="arthur"` and writes `promptOverride` (Pebble template, unrendered) + Validator overrides to the `ThinkProcessDocument`. Tier/Mode variants live within the template and are rendered per turn; in the source code, Arthur only holds a one-line fallback for the (in practice, non-occurring) case without a Recipe override. See [recipes](/docs/recipes) §5 for composition + render context.

Hot-swappable: Edit Recipe YAML → Restart Brain → the new prompt is active from the next spawn. Running Processes retain their snapshot (Recipe content is copied to the Process on spawn, not referenced).

Content-wise, the Recipe positions Arthur as:

- A conversational partner for the user in the Session.
- An **orchestrator** for deep-work: if a request requires more than one LLM turn, Arthur starts a Worker Process (`process_create` tool, ideally with a Recipe name).
- A synthesizer: it reads worker results/events and summarizes them for the user **in the chat**.
- **Not** a deep worker: Arthur does not plan task trees or perform multi-stage analyses itself. It prefers to delegate.

Arthur explicitly stays out of Sub-Process Memory — it only sees worker results in the summary form that the Worker Process reports via `ProcessEvent`.

### 3.3 Arthur's Tool Pool

Arthur has a deliberately **limited** tool pool (set in `ArthurEngine.allowedTools()`):

| Tool | What it does |
|------|--------------|
| `process_create` | Start a Worker Process in this Session. Preferably with `recipe`, optionally `engine` directly |
| `process_steer` | Send a Steer Message to a Worker Process |
| `process_stop` | Stop a Worker Process |
| `process_list` | List all sibling processes of the Session (status, engine, goal). Default: without terminal states, `--all` for audit |
| `process_status` | Details of a single Process |
| `recipe_list` | Available Worker Recipes (Cascade Project → Tenant → Bundled). Primary, so Arthur can consult the catalog at any time |
| `recipe_describe` | Full Recipe Document (default params, prompt, tool adaptations). Secondary |
| `manual_list` | List of recipe-configured Markdown Manuals (instructions, spec excerpts). Path list comes from `params.manualPaths` |
| `manual_read` | Content of a specific Manual (by name) |

**Not v1 in Arthur's Pool** (originally planned in arthur-spec): `memory.query`, `memory.read`, `knowledge.graph`. These Memory and Knowledge Graph tools do not yet exist as server tools; they will be added when the associated subsystems are ready.

**Discovery via `DISCOVER` Action.** Arthur also has a structural discovery entry point: the continuing action `type=DISCOVER` with `intent: "<term>"` synchronously calls `DiscoveryService` and passes the result as a Tool Result to the Action Loop. Used when the user input contains a term Arthur doesn't know (Vance jargon, Kit feature, invented word). The `how_do_i` tool remains available for proactive mid-turn lookups. Full description: [how-do-i §1a](/docs/how-do-i).

What Arthur **does not** have: Filesystem, Shell, Web-Fetch, direct LLM calls (except its own turn), MCP tools. The actual worker is a Worker. This keeps Arthur's context small and its LLM call fast/cheap.

### 3.4 Inbound Handling (the Turn Loop)

All methods ultimately land in the same core routine. Pseudocode sketch:

```java
void steer(process, context, message) {
    runTurn(process, context);
}
void resume(process, context) {
    runTurn(process, context);
}

private void runTurn(process, context) {
    List<SteerMessage> inbox = context.drainPending();

    // Inbox → translate new Chat Messages + internal signals
    List<Message> llmInput = buildLlmInput(process, context, inbox);

    // LLM call with tool definitions
    ChatLanguageModel llm = context.llm().acquire(/* per-call */);
    AiResponse response = llm.respond(llmInput, arthurToolSpecs());

    // Process tool calls (sequentially in v1). `respond` is the
    // structured final marker — see structured-engine-output.md.
    for (ToolCall call : response.toolCalls()) {
        ToolCallResult result = context.tools().invoke(call);
        // Result → next LLM iteration, or, for process_create, async via ProcessEvent
    }

    // `respond` must stand alone in its turn. If `respond`
    // arrives together with work tools, the work tools are executed,
    // `respond` is rejected with a Tool Result Error, and the loop
    // continues — otherwise the LLM does not see the Tool Results.
    // In the clean case, `respond` delivers Message + awaiting flag.
    RespondArgs respond = response.respondCall();   // Mandatory tool
    context.chat().append(ChatMessage.assistant(respond.message()));

    // Status decision — explicitly from respond.awaiting_user_input,
    // not guessed from free text:
    process.setStatus(respond.awaitingUserInput() ? BLOCKED : READY);
}
```

Details per message type:

- **`UserChatInput`** → pushed as a User-Role Message into the LLM input. Additionally persisted via `context.chat().append(ChatMessage.user(...))` — this is the same channel from which later turns read the Chat History.
- **`ProcessEvent`** with `type=done|failed|blocked` → as a User-Role Message with an XML wrapper `<process-event sourceProcessId="..." type="...">summary</process-event>` into the LLM input. Arthur recognizes from the tag: this is **not** the user, but a sibling process. XML wrapper is used because LLMs reliably recognize structured tags as "not user text" without needing an additional role.
- **`ToolResult`** → assigned to the LLM as a Tool Result content block (matching `toolCallId`). Standard LLM protocol.
- **`ExternalCommand`** → Mapping to internal action type, possibly direct dispatch without an LLM turn (e.g., "User clicked Approve button" → `process-steer` to the target process without detour through Arthur).

### 3.5 Spawning Other Processes

When the LLM calls `process_create(recipe="<X>", name="<...>", goal="<...>")` (or `engine="..."` directly):

1. `RecipeResolver.applyDefaulting` resolves the spec: Recipe → Cascade Project/Tenant/Bundled → `AppliedRecipe` with default params + caller merge + prompt override + validator templates.
2. Engine is retrieved from `appliedRecipe.engine()` (not from tool param) — the Recipe author decides which Engine drives the worker.
3. A new `ThinkProcessDocument` is persisted (Status: `ready`, `sessionId` = current Session, `parentProcessId` = Arthur's id, plus `recipeName`, `promptOverride`, `engineParams` etc.).
4. `engine.start(..)` runs on the new Process's own Lane — Arthur does not block on it, as `process_create` waits synchronously on the tool caller's Lane, but the Engine start goes to the Worker Lane (LaneScheduler).
5. Arthur synchronously receives the final `name`, `status`, `engine`, and optionally `recipe` fields as a Tool Result. "Started."
6. When the Worker becomes terminal (DONE/BLOCKED/STOPPED/STALE), the `ParentNotificationListener` automatically creates an `EngineMessageDocument` with `senderProcessId = <Worker>`, `targetProcessId = <Arthur>`, `type = PROCESS_EVENT`. A wakeup is scheduled on Arthur's Lane; in the next Lane Turn, Arthur drains the Inbox and sees the event as `SteerMessage.ProcessEvent`.

The pattern is: Launch via `process_create` → Tool Result returns immediately ("started, Name X, Status ready") → later, when the Worker becomes terminal, the `<process-event>` arrives as a User-Role Message in Arthur's next turn. Spawning and result consumption are decoupled by the Inbox; Arthur never blocks on a running Worker.

### 3.6 Message Addressing from the Client

Every `ChatMessage` in the system carries `thinkProcessId`. The client types input in the chat — which Process receives it?

| Client State | Addressee |
|--------------|-----------|
| No Process focused (Default) | **Arthur** (Arthur's `thinkProcessId`) |
| User has Worker Process focused (UI selection) | **Worker Process** directly — Message is steered as `UserChatInput` to the Worker |

The focus state lives **on the client**, but the client explicitly sends `targetThinkProcessId` with each input message. The server routes strictly. No server-side "active process" state per Session.

For Autonomous Sessions (no Arthur): Input must **always** be explicitly addressed to a Process, otherwise an error occurs.

**Structured Asks via Inbox** (optional): For clearly defined decision asks ("pick one of these recipes for the worker"), Arthur may create an Inbox item of type `DECISION` instead of a plaintext question. Advantage: the user sees an options menu, the LLM does not have to re-parse the answer from free text, and the item remains with an audit trail. Not mandatory in v1 — Arthur may continue to use plaintext chat; the Inbox subsystem ([`user-interaction.md`](/docs/user-interaction)) is primarily built for Vogon checkpoints and tool-driven item posting; Arthur can opt-in to use it if the Recipe / use case suggests it.

### 3.7 Foreground/Background

Arthur itself is always "in the foreground" (it is the Session Chat). Worker Processes are **Background** by default: they appear in the UI as a status card/pill in the Session Chat with current status + last event summary. The user can "foreground" a Worker (client-side UI concept), then:

- The Worker Chat Transcript is displayed primarily.
- Input addressing switches to the Worker (§3.6).
- Arthur continues to run in the background but no longer receives new user input until the user switches back.

Server-side, this is pure client state — no additional field on the `SessionDocument`.

### 3.8 LLM Context Management

Arthur's LLM context for each turn:

1. **System Prompt** (static; content from resource file)
2. **Session Context** from `context.scope()`: current Tenant/Group/Project, User Name, Date
3. **Project Memory Summary** (top-relevant entries via RAG query on Project Scope) — optional, can be disabled via settings
4. **Project RAG AutoInject** (Variant C / Pre-Turn Hybrid) — if the Recipe sets `rag.autoInject: true` (or Cascade Setting `rag.autoInject.enabled` overrides), Arthur embeds the Inbox user texts against the `_documents`-RAG and inserts a dynamic `<rag-context>` block into the System Prompt. Threshold via `rag.minScore`, Top-K via `rag.topK`. Silent skip for missing RAG / embed error / empty Inbox. See [rag.md §5](/docs/rag).
5. **Chat History** of the Session (all `ChatMessage` with `thinkProcessId = arthurId` or `targetThinkProcessId = arthurId`, chronologically)
6. **Tool Definitions** (Arthur's Tool Pool, §3.3)
7. **Current-Turn-Input** (the drained `SteerMessage`s as User-Role Messages)

**Limit Handling.** If Chat History becomes too long:

- **v1:** hard token budget per turn (via setting `arthur.maxContextTokens`, default 64k). If exceeded, oldest messages are truncated (no compaction) and a system note is inserted: "Earlier conversation was truncated."
- **v2:** Rolling Summary — every N turns, a summary of the older history is generated (via LLM call) and replaces the old messages. Not v1, but field `chatHistorySummary` on `ThinkProcessDocument` should already be provided.

### 3.9 Arthur's Status Behavior

| Initial Status | Event | New Status |
|----------------|-------|------------|
| `ready` | UserChatInput / ProcessEvent / ToolResult | `running` (in turn) → `ready` (idle) |
| `running` | (all inbound messages are queued) | remains `running` until turn end |
| `ready`/`running` | Arthur's LLM formulates open question to user | `blocked` |
| `blocked` | UserChatInput with answer | `running` → `ready` |
| `ready`/`running` | Session Suspend (cascaded) | `suspended` |
| `suspended` | Session Resume | `ready` (no automatic turn) |
| any | Session Close | `stopped` |

Arthur **never** reaches `done` — an open chat has no goal-done criterion.

---

## 4. Example Flow

```
T+0   User connected Desktop Client, creates new Interactive Session in project "Literature Review"
      Brain: SessionDocument(sess_7) + ThinkProcessDocument(arth_42, engine=arthur) persisted
      Arthur.start(arth_42, ctx) in Lane Turn:
        → Greeting message in Chat: "Hi, I'm Arthur. How can I help?"
        → Status: ready

T+30s User types: "Analyze the 5 PDFs in the /papers/ folder for contradictions"
      Client sends WS: { type: "process-steer", targetThinkProcessId: arth_42,
                          message: UserChatInput(content: "...") }
      Brain: Append queue to arth_42, Lane Turn scheduled
      
      Arthur.runTurn(...) Turn:
        → drainPending: [UserChatInput(...)]
        → LLM call with Tool Pool
        → LLM responds: tool_use process_create(recipe="analyze",
                                                 goal="Analyze 5 PDFs for contradictions",
                                                 name="paper-diff")
        → context.tools().invoke(...) → RecipeResolver applies "analyze"
                                       → new ThinkProcess(dp_99, engine=ford,
                                          sessionId=sess_7, recipeName="analyze")
        → Tool Result: { name: "paper-diff", status: "READY", engine: "ford",
                         recipe: "analyze" }
        → LLM formulates final Assistant Message: "Starting DeepThink analysis for the 5 PDFs.
           Id: dp_99. I'll let you know when the result is available."
        → ChatMessage(role=assistant, thinkProcessId=arth_42) persisted + streamed
        → Status: ready
      
      (in parallel, the DeepThink Process runs with its own Lane Turn, plans its task tree, ...)

T+3min DeepThink emits ProcessEvent(type=blocked, summary="May I assume the paper Vaswani2017
                                                                as a baseline?")
       Brain routes to Arthur's Inbox, Lane Turn scheduled
       
       Arthur.steer(...) Turn:
         → drain: [ProcessEvent(source=dp_99, type=blocked, summary="...")]
         → LLM call: reads the event as <process-event>-tag
         → LLM responds directly (without tool call): "DeepThink (paper-diff) asks: 'May I
            assume the paper Vaswani2017 as a baseline?'"
         → ChatMessage persisted
         → Status: ready

T+4min User types: "Yes, do it."
       Arthur.steer(UserChatInput(...)):
         → drain: [UserChatInput("Yes, do it.")]
         → LLM decides: Answer should go to DeepThink → tool_use process_steer(
              targetProcessId="dp_99", message="Yes, use Vaswani2017 as baseline")
         → Tool Result: { ok: true }
         → Final Assistant Message: "Forwarded."
         → Status: ready

T+15min DeepThink finished, emits ProcessEvent(type=done, summary="3 contradictions found",
                                                  payload: { report_id: "mem_abc" })
       Arthur.steer(...) Turn:
         → LLM formulates: "DeepThink is finished. Three contradictions: ... (reads payload)"
         → Status: ready (waiting for next user interaction)
```

---

## 5. Open Issues

- **Spring Beans vs. Plugins.** Arthur is a fixed Spring Bean in the `vance-brain` module in v1. A plugin mechanism (third parties dynamically loading their own Think Engines) is v2+ and explicitly marked as non-v1 in `think-engines §2`.
- **Streaming Protocol to the Client.** WebSocket frames for `ChatStreamEvent` are not yet finalized — concrete wire format to be added in [websocket-protokoll](/docs/websocket-protokoll) once the first implementation is ready.
- **Multi-User Visibility of Arthur Chat.** If multi-user is added later: can other users read the chat history of a foreign session (read-only)? Currently no — Session is per-user. The rules in `multi-user-collaboration.md §3.4` apply.
- **Arthur Settings.** Concrete settings (`arthur.maxContextTokens`, `arthur.includeProjectMemorySummary`, `arthur.llmProvider`, `arthur.llmModel`) are defined in the Settings System (`settings-system.md`) — only mentioned here, default values to be set with the first implementation.
- **Rolling Summary (v2).** When to trigger, how to store, how to reconstruct after resume — detailed spec during implementation.
- **Parallel Tool Calls.** In v1, Arthur serializes tool calls within an LLM turn. Whether provider-side parallel tool use features are activated remains a later performance decision.
- **User Focus Switch in the Middle of a Worker Turn.** If the user foregrounds a worker while Arthur is `running` — what happens to unfinished Assistant Messages in Arthur's chat? In v1: finish writing, user sees the result later when switching back to Arthur. Finer UX (abort-and-resume) v2.
