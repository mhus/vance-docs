---
title: "Vance — Lunkwill Think Engine"
parent: Specs
permalink: /specs/lunkwill-engine
---

<!-- AUTO-GENERATED from specification/public/en/lunkwill-engine.md — do not edit here. -->

---
# Vance — Lunkwill Think Engine

> **Lunkwill** is the **generic Pi-style Executor Engine**. It
> processes a task in multiple turns — LLM-Call → Tool-Calls →
> next turn — until one of four stop conditions fires. Lunkwill
> knows **no `maxIterations` cap**: it is endless-by-design. Stop
> comes from *natural conversation*, *explicit Tool-Terminate*,
> *external Interrupt*, or *Safety-Net*.
>
> Lunkwill is the Vance adaptation of the Pi-Coding-Agent-Loop-Pattern
> (see `instructions/pi-analyse.md`). Where Arthur is the **Hub/Host**
> and Marvin builds a **dynamic Task-Tree**, Lunkwill is the
> **focused Leaf-Worker**: drainPending → LLM → Tools →
> repeat, until finished.
>
> See also: [think-engines](/specs/think-engines) | [arthur-engine](/specs/arthur-engine) | [marvin-engine](/specs/marvin-engine) | [recipes](/specs/recipes)

---

## 1. Role and Classification

| Engine | Character | Stop |
|---|---|---|
| `arthur` | Reactive Session Chat Hub | never DONE — only STOPPED/SUSPENDED |
| `ford` | Single-purpose Worker, one question → one answer | DONE per Turn |
| `marvin` | Plan-Tree with 5-phase nodes | DONE when Root-WORKER completes |
| **`lunkwill`** | **Multi-Turn-Worker, terminate-driven** | **natural / `_terminate` / external / safety-net** |

**Use Cases:**

- **Coding-Worker** (`coding`-Recipe) — Read/edit files, run tests,
  check build output. The actual validator of the Engine.
- **Service-Recipes** (later) — `lunkwill-repair` (MCP-Reconnect /
  Token-Refresh), `lunkwill-fook-upstream` (GitHub-Ticket-Worker),
  further ones as needs become concrete.

What Lunkwill is **not**:

- Not a Hub (that's Arthur)
- Not a Plan-Tree (that's Marvin)
- Not a State-Machine-Runner (that's Vogon/Slartibartfast)
- Not a Single-Shot with Schema-Validation (that's Jeltz/Ford)

## 2. Two Operating Modes

Lunkwill runs either as a **Worker** under a Parent (classic,
spawned via `process_create`) or as a **Session-Primary** (directly
at a Session's chat endpoint — Bootstrap with
`engine=lunkwill, recipe=<name>, parentProcessId=null`).

```
isWorker = process.getParentProcessId() != null
```

The loop is identical — the only behavioral difference lies
in the Tool-Terminate-Branch (§4.2). Service-Wiring, Stream-Behaviour,
Prompt-Assembly: identical.

## 3. Data Model

Lunkwill lives **entirely** within the `ThinkProcessDocument`. No
external state, no own Collection-Footprint.

| Field | Source | Meaning |
|---|---|---|
| `process.engineParams.workTarget` | Recipe-Default or `work_target_set`-Tool | Where generic `file_*` / `exec_*` Tools dispatch — see work-target-and-tool-rename |
| `chatMessageService.activeHistory(...)` | Standard | Conversation history, persistent |
| `engineMessageService.drainInbox(processId)` | Standard | Inbox: USER_CHAT_INPUT, PROCESS_EVENT, TOOL_RESULT, EXTERNAL_COMMAND |

Lunkwill uses **no** own MongoDB collections. Everything via
existing Shared-Services.

## 4. Stop Paths

Lunkwill has **four hardcoded stop paths**. There is **no
Recipe field for stop configuration** — no `maxIterations`, no
`stopConditions`. Stop comes from the loop itself.

### 4.1 Natural Stop

LLM responds without Tool-Calls → persist final answer, status
**`IDLE`** (context remains alive, subsequent input wakes the loop
without state loss). Worker and Session-Primary modes are identical.

### 4.2 Tool-Driven Terminate

Tool-Result contains key `_terminate: true` (constant
`LunkwillTermination.RESULT_TERMINATE_KEY`). If at least one Tool
in the batch terminates: loop exit after this batch.

Behavior is **mode-dependent**:

| Mode | Action |
|---|---|
| **Worker** (`parent ≠ null`) | `CloseReason.DONE` — Process closes, Parent's Delegation-Pointer released, DONE-Event with Last-Assistant-Reply via `ParentNotificationListener.enrichWithLastReply` |
| **Session-Primary** (`parent = null`) | Status `IDLE` — Task finished, Session remains open for next task |

Tool conventions per Recipe:
- **coding** — `task_complete(summary=...)`
- **lunkwill-repair** (planned) — `repair_complete(component=..., status=...)`
- **lunkwill-fook-upstream** (planned) — `ticket_handed_off(ticketId=..., action=...)`

### 4.3 External Interrupt

Process status is set externally to `SUSPENDED` or `CLOSED`
(via [Process-Control-Tools](#62-control-tools), UI Stop button,
Session-Suspend-Cascade, Lane-Kill). Lunkwill reads the status at the
beginning of **each** loop iteration from Mongo (`thinkProcessService.
findById(id).getStatus()`) and exits gracefully between turns.

No thread interrupt, no cancellation token. The status read is
an indexed `_id`-lookup (<1 ms), negligible compared to LLM latency.

### 4.4 Safety-Nets

Both hardcoded, both set status `BLOCKED` (no auto-close):

**Wallclock-Timeout** (`vance.lunkwill.maxWallclockMinutes`, Default 60):
Per loop iteration, `System.currentTimeMillis() - process.startedAt`
is checked against the deadline. Counts wall-time including suspends —
prevents suspend-resume gaming.

**Idle-Stuck-Detection** (`vance.lunkwill.idleStuckThreshold`, Default 5):
Sliding-window of the last N Tool-Call-Batch-Hashes (Tool-Name +
JSON-Hash of Args). If all N hashes are identical → loop is spinning
on the wrong track, BLOCKED with diagnostic hint.

### 4.5 Empty-LLM-Response

Special case: LLM responds **neither text nor Tool-Calls** (typical
provider collapse with too large a Tool-Pool or a model bug). The loop
would otherwise interpret "natural stop with 0 chars" — silent drop,
user sees nothing.

Instead: persist a visible error message
(`LunkwillEngine.MODEL_COLLAPSE_MESSAGE`) as Assistant-Reply, status
`BLOCKED`. This makes the Worker visible in the Inbox and not IDLE-still.

## 5. Loop Sketch

```java
public void runTurn(ThinkProcessDocument process, ThinkEngineContext ctx) {
    long deadlineMs = process.startedAt + maxWallclockMillis;
    boolean isWorker = process.getParentProcessId() != null;
    ThinkProcessStatus exitStatus = IDLE;
    Deque<String> recentToolHashes = new ArrayDeque<>();

    updateStatus(process.getId(), RUNNING);
    try {
        List<SteerMessage> drained = ctx.drainPending();
        List<SteerMessage> extras = persistUserInputAndCollectExtras(...);
        EngineChatBundle bundle = engineChatFactory.forProcess(process, ctx, NAME);
        List<ToolSpec> toolSpecs = ctx.tools().primaryAsLc4j();
        List<ChatMessage> messages = buildPromptMessages(...);

        while (true) {
            // External interrupt (§4.3)
            ThinkProcessStatus current = thinkProcessService.readStatus(process.getId());
            if (current == SUSPENDED || current == CLOSED) {
                exitStatus = null;  // already set externally
                return;
            }
            // Wallclock safety net (§4.4)
            if (System.currentTimeMillis() > deadlineMs) {
                exitStatus = BLOCKED;
                return;
            }

            AiMessage reply = streamOneIteration(bundle, messages, ctx, ...);

            // Natural stop (§4.1) — plus empty-response sub-branch (§4.5)
            if (!reply.hasToolExecutionRequests()) {
                String text = reply.text() == null ? "" : reply.text();
                if (text.isBlank()) {
                    persistAssistantReply(process, MODEL_COLLAPSE_MESSAGE, ...);
                    exitStatus = BLOCKED;
                } else {
                    persistAssistantReply(process, text, ...);
                    exitStatus = IDLE;
                }
                return;
            }

            // Idle-stuck safety net (§4.4)
            String batchHash = hashToolCalls(reply.toolExecutionRequests());
            if (isIdleStuck(recentToolHashes, batchHash)) {
                exitStatus = BLOCKED;
                return;
            }

            messages.add(reply);
            boolean terminate = executeToolBatch(reply.toolExecutionRequests(), ...);

            // Tool-driven terminate (§4.2)
            if (terminate) {
                if (isWorker) {
                    thinkProcessService.closeProcess(process.getId(), CloseReason.DONE);
                    exitStatus = null;
                } else {
                    exitStatus = IDLE;
                }
                return;
            }
            // Loop continues: next iter's LLM call sees the tool results.
        }
    } finally {
        if (exitStatus != null) updateStatus(process.getId(), exitStatus);
    }
}
```

Total productive scope: ~150 lines of loop + ~300 lines of helpers
(Prompt-Assembly, Tool-Dispatch, Stream-Handling). Small and
auditable.

## 6. Service and Tool Wiring

### 6.1 Mandatory Reuse

Lunkwill shares the following services with Arthur (and all LLM-driven Engines) — drift-free:

| Service | Purpose |
|---|---|
| `EngineMessageService` | Inbox-Drain + markDrained |
| `CompactionTriggerService` + `MemoryCompactionService` | 3-tier Compaction (planned for Lunkwill, not yet active) |
| `EngineChatFactory` | Prompt-Render + Model-Bind + Tool-Allowed-Set |
| `ToolPermissionService` | Recipe-Check per Tool-Call |
| `ToolResultStorage` | Output-Truncation (32 KB Threshold) |
| `ResilientStreamingChatModel` | LLM-Stream with Retry / Idle-Timeout |
| `LlmCallTracker` / `LlmTraceRecorder` | Token-Usage + Trace-Persist (automatically via EngineChatFactory) |
| `MetricService` | Counter / Timer / Distribution |

### 6.2 Control Tools

Lunkwill is controlled externally via the existing `vance-brain/.../tools/process/`-Tool family:

| Tool | Effect on Lunkwill |
|---|---|
| `ProcessStopTool` | `status = STOPPED` → exit at next iter |
| `ProcessPauseTool` | `status = SUSPENDED` → graceful pause |
| `ProcessResumeTool` | `status = RUNNING` → Loop resumes work |
| `ProcessSteerTool` | Steer-Message in Inbox |

Trigger sources:
- User chat says "stop" → Parent-Engine (Arthur) calls `ProcessStopTool`
- Arthur decides autonomously (Worker obsolete, plan changed) → calls `ProcessStopTool`/`ProcessPauseTool`
- UI Stop button (existing REST/WS path)
- Session-Suspend-Cascade (Session paused → all Children inherit)
- Lane-Kill (Operator)

### 6.3 Engine-Default-Tools (`allowedTools()`)

Lunkwill overrides `ThinkEngine.allowedTools()` with the
engine-intrinsic baseline set:

| Category | Tools |
|---|---|
| Discovery / Intro | `find_tools`, `describe_tool`, `how_do_i`, `manual_read`, `manual_list`, `recipe_describe`, `tool_result_read` |
| Sub-Worker-Spawn | `process_create`, `process_status` |
| User-Facing-Signals | `vance_notify` |
| Basics | `current_time`, `whoami` |

12 Tools. Domain-specific Tools (`client_file_*`, `client_exec_*`
for Coding; `tool_probe`/`token_refresh` for Repair; GitHub-API for
Fook-Upstream) come from the respective Recipe via
`allowedToolsAdd`.

Effective Tool-Set =
`(engineDefault ∪ recipe.allowedToolsAdd) ∖ recipe.allowedToolsRemove`
(see `RecipeResolver.computeAllowed`).

## 7. Prompt-Assembly

Lunkwill uses the standard Prompt-Pipeline-Pattern:

1. **Engine-Default-Prompt** — `_vance/prompts/lunkwill-prompt.md`
   via Document-Cascade. Describes both modes (Worker /
   Session-Primary) neutrally, loop discipline, anti-patterns.
2. **Recipe-Overlay** — `params.promptPrefix` from the Recipe is
   rendered by `SystemPromptComposer` over the Engine-Default
   (Pebble-Template).
3. **Profile-Append** — `profiles.<profile>.params.promptPrefixAppend`
4. **Chat-History** — `chatMessageService.activeHistory(...)`
5. **Inbox-Extras** — Non-UCI-Messages (ProcessEvent, ToolResult,
   ExternalCommand) as `<process-event>` / `<tool-result>` /
   `<external-command>` XML-User-Messages

Last-Resort-Fallback (`LunkwillEngine.ENGINE_FALLBACK_PROMPT`) is
exactly one line long — prevents a misconfigured Spawn
from producing an unprompted LLM.

### 7.1 Manual-Pool

Lunkwill has its own Manual-Pool:

```
_vance/lunkwill/manuals/
  lunkwill-loop.md          # engine-intrinsic
  lunkwill-task-complete.md # engine-intrinsic
  lunkwill-spawn.md         # engine-intrinsic
  coding-*.md               # coding-recipe-specific
  repair-*.md               # (planned)
  fook-upstream-*.md        # (planned)
```

Recipes reference via `params.manualPaths`:

```yaml
manualPaths:
  - lunkwill/manuals/   # engine-intrinsic first
  - manuals/            # global Vance as fallback
```

Recipe-prefix requirement: Recipe-specific Manuals carry the
Recipe name as a prefix (`coding-bug-fix.md` etc.) — so that during
lazy-load via `manual_read('coding-bug-fix')` it is immediately clear
which Recipe the Manual belongs to.

### 7.2 Skills

Lunkwill supports the engine-agnostic Skill system from
`specification/skills.md`. Skills are YAML bundles in the Kit
(Prompt-Fragment + Tool-List + optional Scripts) and are activated
in two ways:

**Layer 1 — Recipe-Pin (`defaultActiveSkills`)**

```yaml
# e.g. recipes.yaml or Project-Recipe-Override
coding:
  engine: lunkwill
  defaultActiveSkills:
    - coding-style
    - project-glossary
```

`RecipeLoader` validates the names against the Skill-Allowlist;
`ThinkProcessService.seedActiveSkills` pins them into the
`ThinkProcessDocument.activeSkills` during spawn. Use this for Skills
that are thematically related to the Recipe and should always be included
(Project Style Guide, Domain Glossary).

**Layer 2 — Manually at Runtime**

Foot-CLI (`/skill add <name>`, `/skill clear`, `/skill list`) and
Web-UI connect via `ProcessSkillCommand` to `process.activeSkills`
or remove entries. Engine-agnostic — Lunkwill-Workers
behave identically to Ford-Processes here.

**How Skill activation flows into the Turn:**

1. `runTurn` resolves `process.activeSkills` via `SkillResolver`
   through the User → Project → Tenant → Bundled Cascade.
2. `SkillPromptComposer.mergedTools(skills)` is merged onto the per-turn
   `ContextToolsApi` via `withAdditional(...)` — the
   persisted `allowedToolsOverride` remains unchanged.
3. `SkillPromptComposer.compose(skills, pebbleContext)` renders
   a Skill-System-Block, which is appended **after** Engine-Default-Prompt +
   Recipe-Overlay as an additional `SystemMessage`.
4. In the `finally`-block: `dropOneShotSkills(process)` removes
   `oneShot`-Skills after the turn (analogous to Ford).

**No Auto-Trigger.** Unlike Ford / Arthur, Lunkwill
**does not** call a `SkillTriggerMatcher`. Reason: Lunkwill is
endless-by-design and often drains empty or
tool-induced Inboxes without new user input per turn — per-turn triggers
would be spam. If a Skill should automatically dock without explicit
Recipe-Pin and without `/skill add`, Layer 3 (Spawn-Time-
and ProcessEvent-Trigger) is the later extension point; it is
intentionally not built in v1.

## 8. Lifecycle / Status Transitions

```
INIT → RUNNING → IDLE (await steer / user)
              ↘ BLOCKED (safety-net / collapse)
              ↘ SUSPENDED (external)
              ↘ CLOSED (worker tool-terminate)

SUSPENDED → RUNNING (resume)
```

No mode transitions (no EXPLORING/PLANNING/EXECUTING — this is
the complete Plan-Mode concept from [plan-mode.md](/specs/plan-mode),
which only Hub-Engines like Arthur and Eddie manage). Lunkwill uses the
**reduced Plan-Tracking variant** from §9 — a TodoList without
a mode machine. Status values come from the shared
`ThinkProcessStatus`-Enum.

## 9. Plan-Tracking (Reduced Plan-Mode Variant)

Lunkwill gets **TodoList-Tracking** for large tasks (multi-file refactor, architectural
intervention, longer coding stretches) — visible
structure for the user, self-anchor for the LLM against plan drift.

**Intentionally not the full Plan-Mode mechanism from [plan-mode.md](/specs/plan-mode):**

- No modes (no EXPLORING/PLANNING/EXECUTING)
- No Action-Schema (Lunkwill `implements ThinkEngine`, not
  `StructuredActionEngine` — see §5)
- No User-Approval step (the Parent has authorized the Worker,
  a second approval would be a duplication)
- No Read-Only-Tool-Filter

Adopted from Plan-Mode: the same **`ThinkProcessDocument.todos`**-
persistence, the same **`todos-updated`-WS-Notifications**, the same
**TodoItem-Granularity** (3-8 entries, logical phases, see
[plan-mode.md §4](/specs/plan-mode#4-todolist-konvention)).

### 9.1 Two Tools

Both engine-intrinsic, in `ENGINE_DEFAULT_TOOLS` (§6.3).

| Tool | Effect |
|---|---|
| `todo_write` | Full-replace of the TodoList. Sets initial plan or rewrites on structural plan drift. Schema: `{ items: [{ id, content, activeForm?, status? }] }`. Items without `id` or `content` are ignored (no crash). Status defaults to `PENDING`. |
| `todo_update` | Per-Item Status-Update with Optimistic-Locking-Retry. Items not in `updates` remain untouched. Items in `updates` but not in the document are silently ignored. Schema: `{ updates: [{ id, status }] }`. |

Both Tools delegate to the existing service methods
`ThinkProcessService.setTodos` and `ThinkProcessService.
updateTodoStatuses` (also used by Plan-Mode — no duplicate architecture).
Both emit `todos-updated` via the existing
`PlanModeEventEmitter`. `todo_write` additionally emits
`plan-proposed` so that the Web-UI/Foot can display the plan banner.

Both Tools are **mutating** (no `read-only`-label) — they change
TodoList-State in the Process document.

### 9.2 Per-Turn Prompt-Block

If `process.getTodos()` is non-empty, Lunkwill injects a `SystemMessage`
with the current list before each LLM-Call:

```
## Active Plan

[✓] (id=1) Read existing parser implementation
[~] (id=2) Add streaming variant alongside
[ ] (id=3) Migrate callers in vance-shared
[ ] (id=4) Verify with mvn -pl vance-shared test

Current step: **(id=2)** Add streaming variant alongside

To mark progress: `todo_update({"updates":[{"id":"2","status":"COMPLETED"}]})`.
To revise structurally: `todo_write({"items":[...]})`.
When every step is [✓] COMPLETED, call the recipe's task-complete tool
(e.g. `task_complete(summary=...)`) to end cleanly.

Hard rules:
- Never downgrade a [✓] COMPLETED item.
- Never edit todos through any tool other than `todo_write` / `todo_update`.
```

Build-Site: `LunkwillEngine.buildTodoListBlock(process)`. If no
Todos are persisted → empty string → no block (Plan-Tracking
is opt-in, no block spam for short tasks). Status markers
identical to Plan-Mode §7.1 (`[ ]` / `[~]` / `[✓]`) — Foot/Web-UI
can use the same renderer.

### 9.3 Trigger Convention

Recipe-specific in `promptPrefix`. `coding` contains a
"Plan-First for large tasks" clause:

> For tasks that require more than 2-3 file edits or multiple logical phases:
> first `todo_write` with 3-8 steps, then work.
> Small tasks (one file, one fix) do not need a TodoList.

Soft convention — no technical enforcement, no mode lock.
Violations lead to unstructuredness, not build failure.

**Manual `lunkwill-plan`** (`_vance/lunkwill/manuals/lunkwill-plan.md`)
provides the LLM with details: When to plan / granularity / tool shapes /
hard rules / distinction from Marvin and Arthur-Plan-Mode. Triggers
cover `plan`, `make plan`, `todolist`, `multi step`, `large
task` and German/English synonyms, so that both
substring search (`manual_list`) and semantic search (`how_do_i`)
can find it. The Engine-Prompt hooks directly to it: "Before planning a
non-trivial task, call `manual_read('lunkwill-plan')`."

### 9.4 WS-Notifications

Reuse of Plan-Mode notification types from
[plan-mode.md §8](/specs/plan-mode#8-ws-notifications-an-foot):

| Type | When |
|---|---|
| `todos-updated` (`TodosUpdatedNotification`) | After every `todo_write` and every `todo_update` |
| `plan-proposed` (`PlanProposedNotification`) | After `todo_write` with summary `null` and `planVersion=1` (Hint to Foot/Web-UI that a plan is now present) |

No new channel type. Foot and Web-UI renderers from Plan-Mode
handle notifications engine-agnostically.

### 9.5 What Lunkwill-Plan-Tracking does not do

- **No `plan-proposed → User-Approval` pipeline**. The plan is
  written and immediately executed — no PLANNING-State, no
  chat question "is the plan suitable?". If the user cancels/steers,
  this happens via the normal Control-Tools (§6.2).
- **No Mode-aware Tool-Filter**. All Tools allowed in the Recipe
  remain allowed in all phases — even if `todo_write`
  has not yet been called, even if the list is empty.
- **No `MODE:plan`/`MODE:execute`-History-Tagging**. Lunkwill has
  no modes; the Recompaction-Hook from [plan-mode.md §15](/specs/plan-mode#15-topic-recompaction-hook-am-plan-completion)
  does not apply to Lunkwill. This is OK — Worker-Sessions
  compact via other mechanisms.
- **No Auto-Mode-Reset**. If all Todos are `COMPLETED`,
  the list remains visible — the next `todo_write`-Call replaces
  it. The `task_complete`-Tool-Call is the clean end trigger.

## 10. Configuration (`vance.lunkwill.*`)

```yaml
vance:
  lunkwill:
    maxWallclockMinutes: 60       # Safety-Net §4.4
    idleStuckThreshold: 5         # Safety-Net §4.4
```

Both are Tenant-Setting-overridable via Cascade. Recipe fields for
Stop-Conditions do **not** exist — Stop is hardcoded (see §4).

## 11. Recipes on Lunkwill

### 11.1 Default-Recipe (`lunkwill`)

`_vance/recipes/lunkwill.yaml` — minimal fallback if a Process
is spawned with `engine=lunkwill` without a more specific Recipe. No
domain tools, only engine defaults.

### 11.2 First Productive Recipe (`coding`)

`_vance/recipes/coding.yaml` — Pi-Style Coding-Worker. Sets
`allowedToolsAdd` for Foot-Client-Tools (`client_file_*`,
`client_exec_*`), its own `promptPrefix` with Coding-Operating-Principles
and Anti-Patterns, its own Coding-Manuals. Details in
coding-recipe.md (planning).

### 11.3 Planned Service-Recipes

`lunkwill-repair` (MCP-Reconnect / Token-Refresh, system-spawned),
`lunkwill-fook-upstream` (GitHub-Ticket-Worker). No engine code
needed — pure Recipe + Manuals + possibly service trigger wiring.

## 12. Reply-Channel and Parent-Notification

Lunkwill emits its responses via standard mechanisms:

- **`ctx.emitReply(text, inResponseToAt, payload)`** — per Natural-Stop.
  Push to UI (`PROCESS_PROGRESS`/`REPLY`) always, Parent-Inbox-Append
  only if Parent exists (Worker-Mode).
- **`closeProcess(DONE)`** — per Tool-Terminate in Worker-Mode.
  `ParentNotificationListener` queues a DONE-`ProcessEvent`,
  `enrichWithLastReply` appends the last Assistant-Message.

**Per-Source-Collapse in Arthur**: with Lunkwill, typically two events
land in Arthur's Inbox (Reply + DONE,
both from the same `sourceProcessId`). Arthur's
`resolveRelayEvent`-Tier-2 collapses per `sourceProcessId` to
one representative (BLOCKED > SUMMARY > DONE > FAILED > STOPPED),
so that Arthur can perform a clean RELAY without explicit `eventRef`.
See `arthur-engine.md` §RELAY-Resolution.

## 13. `producesUserFacingOutput()`

Lunkwill returns `true` (Default). Its ASSISTANT-Messages are
natural language responses — not technical plumbing like with
Hactar/Slart, which would need to be passed through an `engine-output-translator`.

## 14. What Lunkwill CANNOT do

- **No full Plan-Mode** with Modes / Approval / Read-Only-
  Filter — that remains Arthur/Eddie (see [plan-mode.md](/specs/plan-mode)).
  Lunkwill only has the reduced TodoList variant (§9). To
  plan strategically (architectural decision, multi-aspect
  tradeoff), spawn Marvin via `process_create(recipe='marvin')` and
  wait for the Reply.
- **No Multi-Phase-State-Machine** — for phases, use
  Vogon / Slartibartfast.
- **No Schema-Output-Guarantee** — for structured output,
  use Jeltz.
- **No User-Hub functionality** — to host user chat, use
  Arthur (or spawn Arthur as Parent).
- **No Auto-Trigger for Skills** — Skills are activated exclusively
  via Recipe-Pin (`defaultActiveSkills`) or manually via
  `/skill add`. Trigger-based activation as in Ford is
  intentionally not implemented (see §7.2).

## 15. Tests

In `vance-brain/src/test/java/.../lunkwill/`:

- `LunkwillEngineSkeletonTest` — Metadata, Lifecycle-Status-Writes,
  four Stop-Paths (natural / tool-terminate worker+session /
  external-interrupt / wallclock / idle-stuck), Empty-Response,
  `allowedTools()`-Baseline
- `LunkwillTodoToolTest` — `todo_write` full-replace + WS-Emit;
  `todo_update` per-Item-Update + WS-Emit; missing-id / malformed-
  input handling
- `LunkwillTodoBlockTest` — Prompt-Block-Renderer: empty Todos → no
  block; populated Todos → block with current-step and Tool hints

In `vance-brain/src/test/java/.../arthur/`:

- `ArthurEngineRelayCollapseTest` — Per-Source-Event-Collapse-Logic
  (see §11)

E2E-Tests per Recipe in `qa/ai-test/` come with the respective
Recipes — not in this Engine-Spec.

## 16. References

- `instructions/pi-analyse.md` — Pi comparison notes
- `packages/agent/src/agent-loop.ts` — Pi-Loop reference
- `planning/lunkwill-engine.md` — Design notes before implementation
- `planning/coding-recipe.md` — Coding-Recipe design
- `planning/agent-stop-conditions.md` — Stop path catalog
- `planning/work-target-and-tool-rename.md` — planned work-target /
  generic-dispatch extension (separate chapter)
- `specification/think-engines.md` — Engine framework contract
- `specification/arthur-engine.md` — Comparison Engine (Hub)
- `specification/marvin-engine.md` — Comparison Engine (Plan-Tree)
- `specification/recipes.md` — Recipe system
- `specification/prompts-and-manuals.md` — Prompt discipline
- `specification/skills.md` — Skill system (User retrofitting of behavior)
