# Vancetope — Frankie Think Engine

> **Frankie** is the **generic Pi-style Executor Engine**. It
> processes a task in multiple turns — LLM call → Tool calls →
> next turn — until one of four stop conditions fires. Frankie
> knows **no `maxIterations` cap**: it is endless-by-design. Stop
> comes from *natural conversation*, *explicit tool terminate*,
> *external interrupt*, or *safety net*.
>
> Frankie is the Vancetope adaptation of the Pi-Coding-Agent-Loop pattern
> (see `instructions/pi-analyse.md`). Where Arthur is the **Hub/Host**
> and Marvin builds a **dynamic Task Tree**, Frankie is the
> **focused Leaf-Worker**: drainPending → LLM → Tools →
> repeat, until finished.
>
> See also: [think-engines](think-engines.md) | [arthur-engine](arthur-engine.md) | [marvin-engine](marvin-engine.md) | [recipes](recipes.md) | [completion-guard](completion-guard.md) (sits on Frankie's two stop paths)

---

## 1. Role and Classification

| Engine | Character | Stop |
|---|---|---|
| `arthur` | Reactive Session Chat Hub | never DONE — only STOPPED/SUSPENDED |
| `ford` | Single-purpose Worker, one question → one answer | DONE per turn |
| `marvin` | Plan Tree with 5-phase nodes | DONE when Root-WORKER completes |
| **`frankie`** | **Multi-Turn Worker, terminate-driven** | **natural / `_terminate` / external / safety-net** |

**Use Cases:**

- **Coding Worker** (`coding` Recipe) — Read/edit files, run tests,
  check build output. The actual validator of the Engine.
- **Service Recipes** (later) — `frankie-repair` (MCP reconnect /
  token refresh), `frankie-fook-upstream` (GitHub ticket worker),
  others as needs become concrete.

What Frankie is **not**:

- Not a Hub (that's Arthur)
- Not a Plan Tree (that's Marvin)
- Not a State Machine Runner (that's Vogon/Slartibartfast)
- Not a Single-Shot with Schema Validation (that's Jeltz/Ford)

## 2. Two Operating Modes

Frankie runs either as a **Worker** under a Parent (classic,
spawned via `process_spawn`) or as a **Session Primary** (directly
at a Session's chat endpoint — bootstrap with
`engine=frankie, recipe=<name>, parentProcessId=null`).

```
isWorker = process.getParentProcessId() != null
```

The loop is identical — the only behavioral difference lies
in the Tool Terminate branch (§4.2). Service wiring, stream behavior,
prompt assembly: identical.

## 3. Data Model

Frankie lives **entirely** within the `ThinkProcessDocument`. No
external state, no dedicated collection footprint.

| Field | Source | Meaning |
|---|---|---|
| `process.engineParams.workTarget` | Recipe default or `work_target_set` Tool | Where generic `file_*` / `exec_*` Tools dispatch — see [work-target-and-tool-rename](../../planning/archive/work-target-and-tool-rename.md) |
| `chatMessageService.activeHistory(...)` | Standard | Conversation history, persistent |
| `engineMessageService.drainInbox(processId)` | Standard | Inbox: USER_CHAT_INPUT, PROCESS_EVENT, TOOL_RESULT, EXTERNAL_COMMAND |

Frankie uses **no** dedicated MongoDB collections. Everything via
existing shared services.

## 4. Stop Paths

Frankie has **four hardcoded stop paths**. There is **no
Recipe field for stop configuration** — no `maxIterations`, no
`stopConditions`. Stop comes from the loop itself.

### 4.1 Natural Stop

LLM responds without Tool calls → persist final answer, status
**`IDLE`** (context remains alive, subsequent input wakes the loop
without state loss). Worker and Session Primary modes are identical.

### 4.2 Tool-Driven Terminate

Tool Result contains key `_terminate: true` (constant
`FrankieTermination.RESULT_TERMINATE_KEY`). If at least one Tool
in the batch terminates: loop exit after this batch.

Behavior is **mode-dependent**:

| Mode | Action |
|---|---|
| **Worker** (`parent ≠ null`) | `CloseReason.DONE` — Process closes, Parent's Delegation Pointer released, DONE event with Last Assistant Reply via `ParentNotificationListener.enrichWithLastReply` |
| **Session Primary** (`parent = null`) | Status `IDLE` — Task finished, Session remains open for next task |

Tool conventions per Recipe. The convention belongs to the **Tool** (it sets `_terminate` in its result), not the Engine — Frankie only checks the key. Accordingly, not every Recipe has such a Tool:

- **trillian-worker-void** / **trillian-worker-adam** — `trillian_done(summary=...)`, optionally with `data` for a structured payload. The second named exit is `trillian_ask(question=...)`, which leaves the Worker parked instead of terminating it.
- **coding** — **none**. The Coding Worker ends via Natural Stop with a text response (what was changed, which files were affected).
- **frankie-repair** / **frankie-fook-upstream** (both planned, Recipe and Tool do not exist) — would bring `repair_complete(component=..., status=...)` or `ticket_handed_off(ticketId=..., action=...)` respectively.

> `task_complete` / `task_failed` / `task_needs_input` are the report-back Tools of the **`trillian-user`** Engine (`taskId` + `result`), not Frankie's. The Engine Manuals had listed them as Frankie conventions until 2026-08-11, additionally naming `summary` instead of `result` — both incorrect, now corrected.

### 4.3 External Interrupt

Process status is set externally to `SUSPENDED` or `CLOSED`
(via [Process Control Tools](#62-control-tools), UI Stop button,
Session Suspend Cascade, Lane Kill). Frankie reads the status at the
beginning of **every** loop iteration from Mongo (`thinkProcessService.
findById(id).getStatus()`) and exits gracefully between turns.

No thread interrupt, no cancellation token. The status read is
an indexed `_id` lookup (<1 ms), negligible compared to LLM latency.

### 4.4 Safety Nets

Both set status `BLOCKED` (no auto-close):

**Wallclock Timeout** (`vance.frankie.maxWallclockMinutes`, default 60,
overridable per Recipe via `params.maxWallclockMinutes`): per
loop iteration, a deadline is checked, which is reset **per turn**
— `runTurn` start plus budget, **not** from
`process.createdAt`. This is crucial: a Worker waiting for a
response and reactivated hours later would otherwise hit the safety net
in the first iteration just because its process is old. The time measured
is the time it *works*, not the time it exists.

The Recipe override exists because one number doesn't fit both cases: a
Coding Worker on a refactoring needs an hour, a Worker meant to list
documents is stuck if it takes ten minutes. `0` is valid and means "immediately
exceeded"; a negative or non-numeric value is a typo and falls back to
the property with a WARN, instead of disabling the safety net.

**Idle-Stuck-Detection** (`vance.frankie.idleStuckThreshold`, default 5):
Sliding window of the last N Tool Call batch hashes (Tool name +
JSON hash of args). If all N hashes are identical → loop is spinning
on the wrong track, BLOCKED with diagnostic hint.

### 4.5 Empty-LLM-Response

Special case: LLM responds **neither text nor Tool calls** (typical
provider collapse with too large a Tool pool or a model bug). Loop
would otherwise interpret "natural stop with 0 chars" — silent drop,
user sees nothing.

Instead: persist a visible error message
(`FrankieEngine.MODEL_COLLAPSE_MESSAGE`) as Assistant Reply, status
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
(prompt assembly, tool dispatch, stream handling). Small and
auditable.

## 6. Service and Tool Wiring

### 6.1 Mandatory Reuse

Frankie shares the following services with Arthur (and all LLM-driven Engines)
— drift-free:

| Service | Purpose |
|---|---|
| `EngineMessageService` | Inbox drain + markDrained |
| `CompactionTriggerService` + `MemoryCompactionService` | 3-tier Compaction (planned for Frankie, not yet active) |
| `EngineChatFactory` | Prompt render + model bind + Tool allowed set |
| `ToolPermissionService` | Recipe check per Tool call |
| `ToolResultStorage` | Output truncation (32 KB threshold) |
| `ResilientStreamingChatModel` | LLM stream with retry / idle timeout |
| `LlmCallTracker` / `LlmTraceRecorder` | Token usage + trace persist (automatically via EngineChatFactory) |
| `MetricService` | Counter / Timer / Distribution |

### 6.2 Control Tools

Frankie is controlled externally via the existing `vance-brain/.../tools/process/` Tool family:

| Tool | Effect on Frankie |
|---|---|
| `ProcessStopTool` | `status = STOPPED` → exit at next iter |
| `ProcessPauseTool` | `status = SUSPENDED` → graceful pause |
| `ProcessResumeTool` | `status = RUNNING` → loop resumes work |
| `ProcessSteerTool` | Steer message in Inbox |

Trigger sources:
- User chat says "stop" → Parent Engine (Arthur) calls `ProcessStopTool`
- Arthur decides autonomously (Worker obsolete, plan changed) → calls `ProcessStopTool`/`ProcessPauseTool`
- UI Stop button (existing REST/WS path)
- Session Suspend Cascade (Session paused → all Children inherit)
- Lane Kill (Operator)

### 6.3 Engine Default Tools (`allowedTools()`)

Frankie overrides `ThinkEngine.allowedTools()` with the
engine-intrinsic baseline set:

| Category | Tools |
|---|---|
| Discovery / Intro | `tool_list`, `tool_description`, `how_do_i`, `manual_read`, `manual_list`, `recipe_describe`, `tool_result_read` |
| Sub-Worker-Spawn | `process_spawn`, `process_status` |
| User-Facing-Signals | `vance_notify` |
| Basics | `current_time`, `whoami` |

12 Tools. Domain-specific Tools (`client_file_*`, `client_exec_*`
for Coding; `tool_probe`/`token_refresh` for Repair; GitHub API for
Fook-Upstream) come from the respective Recipe via
`allowedToolsAdd`.

Effective Tool Set =
`(engineDefault ∪ recipe.allowedToolsAdd) ∖ recipe.allowedToolsRemove`
(see `RecipeResolver.computeAllowed`).

## 7. Prompt Assembly

Frankie uses the standard prompt pipeline pattern:

1. **Engine Default Prompt** — `_vance/prompts/frankie-prompt.md`
   via Document Cascade. Describes both modes (Worker /
   Session Primary) neutrally, loop discipline, anti-patterns.
2. **Recipe Overlay** — `params.promptPrefix` from the Recipe is
   rendered by `SystemPromptComposer` over the Engine Default
   (Pebble template).
3. **Profile Append** — `profiles.<profile>.params.promptPrefixAppend`
4. **Chat History** — `chatMessageService.activeHistory(...)`
5. **Inbox Extras** — Non-UCI messages (ProcessEvent, ToolResult,
   ExternalCommand) as `<process-event>` / `<tool-result>` /
   `<external-command>` XML user messages

Last-resort fallback (`FrankieEngine.ENGINE_FALLBACK_PROMPT`) is
exactly one line long — prevents a misconfigured spawn
from producing an unprompted LLM.

### 7.1 Manual Pool

Frankie has its own Manual Pool:

```
_vance/frankie/manuals/
  frankie-loop.md          # engine-intrinsic
  frankie-task-complete.md # engine-intrinsic
  frankie-spawn.md         # engine-intrinsic
  coding-*.md               # coding-recipe-specific
  repair-*.md               # (planned)
  fook-upstream-*.md        # (planned)
```

Recipes reference via `params.manualPaths`:

```yaml
manualPaths:
  - frankie/manuals/   # engine-intrinsic first
  - manuals/            # global Vancetope as fallback
```

Recipe prefix requirement: Recipe-specific Manuals carry the
Recipe name as a prefix (`coding-bug-fix.md` etc.) — so that during
lazy load via `manual_read('coding-bug-fix')` it is immediately clear
which Recipe the Manual belongs to.

### 7.2 Skills

Frankie supports the engine-agnostic Skill system from
`specification/skills.md`. Skills are YAML bundles in the Kit
(prompt fragment + Tool list + optional scripts) and are activated
in two ways:

**Layer 1 — Recipe Pin (`defaultActiveSkills`)**

```yaml
# e.g., recipes.yaml or Project Recipe Override
coding:
  engine: frankie
  defaultActiveSkills:
    - coding-style
    - project-glossary
```

`RecipeLoader` validates the names against the Skill allowlist;
`ThinkProcessService.seedActiveSkills` pins them into
`ThinkProcessDocument.activeSkills` during spawn. Use this for Skills
that are thematically related to the Recipe and should always be
included (project style guide, domain glossary).

**Layer 2 — Manual at Runtime**

Foot CLI (`/skill add <name>`, `/skill clear`, `/skill list`) and
Web UI connect to `process.activeSkills` via `ProcessSkillCommand`
or remove entries. Engine-agnostic — Frankie Workers
behave identically to Ford Processes here.

**How Skill activation flows into the Turn:**

1. `runTurn` resolves `process.activeSkills` via `SkillResolver`
   through the User → Project → Tenant → Bundled Cascade.
2. `SkillPromptComposer.mergedTools(skills)` is merged onto the per-turn
   `ContextToolsApi` via `withAdditional(...)` — the
   persisted `allowedToolsOverride` remains unchanged.
3. `SkillPromptComposer.compose(skills, pebbleContext)` renders
   a Skill system block, which is appended **after** Engine Default Prompt +
   Recipe Overlay as an additional `SystemMessage`.
4. In the `finally` block: `dropOneShotSkills(process)` removes
   `oneShot` Skills after the turn (analogous to Ford).

**No Auto-Trigger.** Unlike Ford / Arthur, Frankie
**does not** call a `SkillTriggerMatcher`. Reason: Frankie is
endless-by-design and often drains empty or tool-induced Inboxes
without new user input per turn — per-turn triggers
would be spam. If a Skill should automatically dock without explicit
Recipe pin and without `/skill add`, Layer 3 (spawn-time
and ProcessEvent triggers) is the later extension point; it is
intentionally not built in v1.

## 8. Lifecycle / Status Transitions

```
INIT → RUNNING → IDLE (await steer / user)
              ↘ BLOCKED (safety-net / collapse)
              ↘ SUSPENDED (external)
              ↘ CLOSED (worker tool-terminate)

SUSPENDED → RUNNING (resume)
```

No mode transitions (no EXPLORING/PLANNING/EXECUTING — that is
the full Plan Mode concept from [plan-mode.md](plan-mode.md),
which only Hub Engines like Arthur and Eddie manage). Frankie uses the
**reduced Plan Tracking variant** from §9 — a TodoList without
a mode machine. Status values come from the shared
`ThinkProcessStatus` enum.

## 9. Plan Tracking (Reduced Plan Mode Variant)

Frankie gets **TodoList tracking** for large tasks (multi-file refactor,
architectural intervention, longer coding stretches) — visible
structure for the user, self-anchor for the LLM against plan drift.

**Intentionally not the full Plan Mode mechanism from [plan-mode.md](plan-mode.md):**

- No modes (no EXPLORING/PLANNING/EXECUTING)
- No action schema (Frankie `implements ThinkEngine`, not
  `StructuredActionEngine` — see §5)
- No user approval step (the Parent has authorized the Worker,
  a second approval would be duplication)
- No read-only Tool filter

Adopted from Plan Mode: the same **`ThinkProcessDocument.todos`**
persistence, the same **`todos-updated` WS notifications**, the same
**TodoItem granularity** (3-8 entries, logical phases, see
[plan-mode.md §4](plan-mode.md#4-todolist-konvention)).

### 9.1 Three Tools (CRUD)

All three are engine-intrinsic, in `ENGINE_DEFAULT_TOOLS` (§6.3).
LLM schema remains compact — no ID needs to be invented by the LLM,
no hard-rule explanations in the prompt.

| Tool | Schema | Effect |
|---|---|---|
| `todo_create` | `{ items: [{ content, activeForm? }] }` | Append. **IDs are server-assigned** (sequential, `max(existing numeric IDs) + 1`, starting at 1, **never reused** — deleted IDs leave gaps). Status always `PENDING`. Item without `content` is silently discarded. Return: `{ ok, created: [{id, content, activeForm?}, ...] }`. |
| `todo_update` | `{ items: [{ id, status?, content?, activeForm? }] }` | Per-item partial mutate. `id` mandatory. Provided fields overwrite, omitted ones remain. Unknown IDs silently skipped. **Auto-Clear**: if after the update all persisted items are `COMPLETED`, the list is completely cleared. Return: `{ ok, applied, changed, cleared }`. |
| `todo_remove` | `{ ids: ["3", "5"] }` | Per-ID deletion. Unknown IDs silently skipped. Return: `{ ok, removed }`. |

All three are mutating (label `write`). All three delegate to three
new service methods on `ThinkProcessService` — `addTodos`,
`updateTodos(List<TodoPatch>)`, `removeTodos` — each with
optimistic locking retry analogous to the existing
`updateTodoStatuses`. The latter remains in use for Arthur/Eddie Plan Mode;
the new methods are Frankie-specific.

`PlanModeEventEmitter.emitTodosUpdated` is fired after each successful
mutation. `emitPlanProposed` is fired **only** on the very first
`todo_create` of an empty list (banner hint for UI).

### 9.2 Per-Turn Prompt Block

`FrankieEngine.buildTodoListBlock` **always** renders something — either
an empty-state hint or the current list:

**Empty List:**
```
No active plan. Use `todo_create({"items":[{"content":"..."}, ...]})` to start one when the task needs structure.
```

**List with Items** — **only non-`COMPLETED` are rendered**, IDs
visible:

```
## Plan

[~] (id=2) Adding streaming variant
[ ] (id=3) Migrate callers in vance-shared
[ ] (id=4) Run mvn -pl vance-shared test

Use `todo_update` to mark progress, `todo_create` to add steps, `todo_remove` to drop them.
```

Status markers: `[ ]` PENDING, `[~]` IN_PROGRESS. `COMPLETED` is
invisible — the plan **shrinks** in the prompt with each step,
exactly the point of the reduced variant. As soon as all items
are `COMPLETED`, the auto-clear in §9.1 takes over and the block
reverts to the empty state.

No hard-rule explanations in the block, no detailed
Tool examples — all details live in the Manual `frankie-plan`
(§9.3).

### 9.3 Trigger Convention and Manual

Recipe-specific in the `promptPrefix`. `coding` contains a
"Plan-First for large tasks" clause:

> For tasks requiring more than 2-3 file edits or multiple logical phases:
> first `todo_create` with 3-8 steps, then work.
> Small tasks (one file, one fix) do not need a TodoList.

Soft convention — no technical enforcement, no mode lock.

**Manual `frankie-plan`** (`_vance/frankie/manuals/frankie-plan.md`)
provides the LLM with details: when to plan / granularity / Tool shapes /
auto-clear / distinction from Marvin and Arthur Plan Mode. Triggers
cover `plan`, `make plan`, `todolist`, `todo_create`, `multi
step`, `large task` and synonyms, so that both
substring search (`manual_list`) and semantic search
(`how_do_i`) can find it. The Engine Prompt hooks directly to it:
"Before planning a non-trivial task, call
`manual_read('frankie-plan')`."

### 9.4 WS Notifications

Reuse of Plan Mode notification types from
[plan-mode.md §8](../plan-mode.md#8-ws-notifications-an-foot):

| Type | When |
|---|---|
| `todos-updated` (`TodosUpdatedNotification`) | After each `todo_create`, `todo_update`, `todo_remove`; additionally during auto-clear with an empty list |
| `plan-proposed` (`PlanProposedNotification`) | **Only** when `todo_create` is applied to an empty list (hint to Foot/Web UI that a plan is now present) |

No new channel type. Foot and Web UI renderers from Plan Mode
handle notifications engine-agnostically.

### 9.5 What Frankie Plan Tracking Does Not Do

- **No `plan-proposed → User-Approval` pipeline**. The plan is
  written and immediately executed — no PLANNING state, no
  chat question "is the plan okay?". If the user cancels/steers,
  it happens via the normal Control Tools (§6.2).
- **No mode-aware Tool filter**. All Tools allowed in the Recipe
  remain allowed in all phases — even if the plan is empty,
  even if it's full.
- **No `MODE:plan`/`MODE:execute` history tagging**. Frankie has
  no modes; the recompaction hook from [plan-mode.md §15](../plan-mode.md#15-topic-recompaction-hook-am-plan-completion)
  does not apply to Frankie. Worker sessions compact via
  other mechanisms.
- **No `todo_read` Tool**. The per-turn prompt block is the
  read path — a Tool for it would burn tokens without
  information gain.
- **No LLM-supplied IDs**. On `todo_create`, the LLM cannot
  set an ID; the server assigns it. This avoids collisions,
  LLM convention confusion, and stale reference bugs.

## 10. Configuration (`vance.frankie.*`)

```yaml
vance:
  frankie:
    maxWallclockMinutes: 60       # Safety-Net §4.4
    idleStuckThreshold: 5         # Safety-Net §4.4
```

Both are overridable by Tenant settings via Cascade. Recipe fields for
Stop Conditions do **not** exist — Stop is hardcoded (see §4).

## 11. Recipes on Frankie

### 11.1 Default Recipe (`frankie`)

`_vance/recipes/frankie.yaml` — minimal fallback if a Process
is spawned with `engine=frankie` without a more specific Recipe. No
domain Tools, only Engine defaults.

### 11.2 First Productive Recipe (`coding`)

`_vance/recipes/coding.yaml` — Pi-style Coding Worker. Sets
`allowedToolsAdd` for Foot Client Tools (`client_file_*`,
`client_exec_*`), its own `promptPrefix` with Coding Operating Principles
and Anti-Patterns, its own Coding Manuals. Details in
[coding-recipe.md (planning)](../../planning/archive/coding-recipe.md).

### 11.3 Planned Service Recipes

`frankie-repair` (MCP reconnect / token refresh, system-spawned),
`frankie-fook-upstream` (GitHub ticket worker). No Engine code
needed — pure Recipe + Manuals + possibly service trigger wiring.

## 12. Reply Channel and Parent Notification

Frankie emits its responses via standard mechanisms:

- **`ctx.emitReply(text, inResponseToAt, payload)`** — per Natural Stop.
  Push to UI (`PROCESS_PROGRESS`/`REPLY`) always, Parent Inbox Append
  only if Parent exists (Worker mode).
- **`closeProcess(DONE)`** — per Tool Terminate in Worker mode.
  `ParentNotificationListener` queues a DONE `ProcessEvent`,
  `enrichWithLastReply` appends the last Assistant Message.

**Per-Source-Collapse in Arthur**: for Frankie, this typically results
in two events in Arthur's Inbox (Reply + DONE,
both from the same `sourceProcessId`). Arthur's
`resolveRelayEvent`-Tier-2 collapses per `sourceProcessId` to
one representative (BLOCKED > SUMMARY > DONE > FAILED > STOPPED),
so Arthur can perform a clean RELAY without an explicit `eventRef`.
See `arthur-engine.md` §RELAY-Resolution.

## 13. `producesUserFacingOutput()`

Frankie returns `true` (default). Its ASSISTANT messages are
natural language responses — not technical plumbing like with
Hactar/Slart, which would need to be passed through an `engine-output-translator`.

## 14. What Frankie CANNOT Do

- **No full Plan Mode** with modes / approval / read-only
  filter — that remains Arthur/Eddie (see [plan-mode.md](plan-mode.md)).
  Frankie only has the reduced TodoList variant (§9). To
  plan strategically (architectural decision, multi-aspect
  tradeoff), spawn Marvin via `process_spawn(recipe='marvin')` and
  wait for the reply.
- **No multi-phase state machine** — for phases, use
  Vogon / Slartibartfast.
- **No schema output guarantee** — for structured output, use Jeltz.
- **No user hub functionality** — to host user chat, use
  Arthur (or spawn Arthur as a Parent).
- **No auto-trigger for Skills** — Skills are activated exclusively
  via Recipe pin (`defaultActiveSkills`) or manually via
  `/skill add`. Trigger-based activation as in Ford is
  intentionally not implemented (see §7.2).

## 15. Tests

In `vance-brain/src/test/java/.../frankie/`:

- `FrankieEngineSkeletonTest` — Metadata, Lifecycle status writes,
  four stop paths (natural / tool-terminate worker+session /
  external-interrupt / wallclock / idle-stuck), Empty-Response,
  `allowedTools()` baseline.
- `tools/TodoCreateToolTest` — server-assigned IDs (sequential
  max+1), no `id` field on input, `plan-proposed` only on first
  insert into an empty list, malformed-input handling.
- `tools/TodoUpdateToolTest` — per-item partial mutate (status /
  content / activeForm), unknown IDs silent skip, auto-clear when
  every item becomes COMPLETED.
- `tools/TodoRemoveToolTest` — id-list removal, unknown IDs silent
  skip, `removed`-counter return.
- `FrankieTodoBlockTest` — Prompt block renderer: empty list →
  empty-state hint; populated list → only non-COMPLETED items
  rendered; all-COMPLETED defensive fallback to empty-state.

In `vance-brain/src/test/java/.../arthur/`:

- `ArthurEngineRelayCollapseTest` — Per-Source-Event-Collapse logic
  (see §11).

E2E tests per Recipe in `qa/ai-test/` come with the respective
Recipes — not in this Engine spec.

## 16. References

- `instructions/pi-analyse.md` — Pi comparison notes
- `packages/agent/src/agent-loop.ts` — Pi loop reference
- `planning/frankie-engine.md` — Design notes before implementation
- `planning/coding-recipe.md` — Coding Recipe design
- `planning/agent-stop-conditions.md` — Stop path catalog
- `planning/work-target-and-tool-rename.md` — planned work-target /
  generic-dispatch extension (separate chapter)
- `specification/think-engines.md` — Engine framework contract
- `specification/arthur-engine.md` — Comparison Engine (Hub)
- `specification/marvin-engine.md` — Comparison Engine (Plan Tree)
- `specification/recipes.md` — Recipe system
- `specification/prompts-and-manuals.md` — Prompt discipline
- `specification/skills.md` — Skill system (user customization of behavior)
