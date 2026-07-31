# Vancetope — Plan-Mode

> **Plan-Mode** is Vancetope's mechanism for *exploration-before-execution*
> for non-trivial requests. Plan, TodoList, and explicit transition
> to execution are modeled as distinct Actions in the schema.
>
> Plan-Mode lives as a **shared Layer** under
> `vance-brain.thinkengine.plan` (`PlanModeActionSchema` +
> `PlanModeService`). Engines that support it (currently Arthur and
> Eddie) union the four Action types into their own schema and
> call `PlanModeService.dispatch(...)` at the beginning of their Action loop.
> Only Persona prompts, Tool filters, and the dispatch stub remain
> Engine-specific. Ford, Marvin, Vogon do not use Plan-Mode.
>
> See also: [arthur-engine](arthur-engine.md) (Engine framework,
> Action lifecycle), [eddie-engine](eddie-engine.md) (Hub Engine),
> [think-engines](think-engines.md) (Mode/Status separation),
> [recipes](recipes.md) (`planMode` property), [user-progress-channel](user-progress-channel.md)
> (complementary side-channel — Plan-Mode is **not** progress).

---

## 1. Role and Classification

Plan-Mode is a **property of a Plan-Mode-capable Think Process**,
not a separate Process type. The respective Engine autonomously decides per
user request (via system prompt trigger) whether the task is
worth a Plan-Mode run. Currently, Arthur (Worker Chat) and
Eddie (Voice Hub) support Plan-Mode; they consume the same
`PlanModeService` and behave structurally identically.

**What Plan-Mode solves:**

- For complex implementation tasks (architectural intervention,
  multi-module change, unclear requirement), the Engine shows the user
  **a plan in advance**, obtains **approval**, and then executes
  structurally.
- During exploration, the Engine **cannot physically call write tools**
  (Tool filter), so the model cannot even be tempted.
- During execution, the Engine maintains a **TodoList** that the
  user sees live.

**What Plan-Mode is not:**

- Not a replacement for direct answers / simple delegation. For
  trivial requests, the Engine runs unchanged in NORMAL-Mode.
- Not a universal Engine feature — Worker Engines (Ford, Marvin,
  Vogon) do not use it. Plan-Mode requires an LLM-driven
  Action loop, which only the Chat/Hub Engines have.
- **Frankie uses a reduced variant** ([frankie-engine §9](frankie-engine.md#9-plan-tracking-reduzierte-plan-mode-variante)):
  TodoList persistence + per-turn prompt block + two
  Tools (`todo_write`, `todo_update`), but **no** mode switch,
  **no** approval, **no** read-only filter. Same `todos`-
  persistence and WS notifications, different mechanism.
- Not an Inbox approval workflow. User response to the presented plan
  returns as a normal chat message, no dedicated
  approval item. (Exception: the Topic Recompaction Hook §15 uses
  an Inbox item, but that happens *after* Plan completion.)

Architecturally, Plan-Mode is its own `ProcessMode` enum value on
the Process, supplemented by a mode-aware Action schema and a
mode-aware prompt variant — not a permission layer flag, but a
true mode dimension alongside `status`.

---

## 2. Mode Model

New field `mode: ProcessMode` on
[`ThinkProcessDocument`](../repos/vance/server/vance-shared/src/main/java/de/mhus/vance/shared/thinkprocess/ThinkProcessDocument.java).
Orthogonal to `status` — Status says what the Lane is currently doing (RUNNING /
IDLE / BLOCKED / …), Mode says **what kind of work** Arthur is performing.

| Value | Meaning |
|---|---|
| `NORMAL` | Default. Arthur answers directly, delegates, or triggers Plan-Mode. |
| `EXPLORING` | Exploration phase. Tool filter active (read-only). Action set: `PROPOSE_PLAN`, `ANSWER` (query), `START_PLAN` (sub-exploration). |
| `PLANNING` | Plan submitted, waiting for user response. Tool filter remains read-only. Action set: `START_EXECUTION`, `PROPOSE_PLAN` (edit), `ANSWER`, `START_PLAN` (re-explore). |
| `EXECUTING` | User has accepted plan. Tool filter relaxed. Action set: all Arthur actions including `TODO_UPDATE`. Upon completion → `NORMAL`. |

Mode transitions are atomic DB updates via
`ThinkProcessService.updateMode(processId, mode)`. Persistent and
race-free.

**Worker Engines** (Ford, Marvin, Vogon, Slartibartfast, Zaphod)
ignore `mode` — the default implementation of
`ThinkEngine.filterAllowedToolsForMode(...)` leaves the Tool set
unchanged. Plan-Mode-capable Engines (Arthur, Eddie) override
the filter analogously: in `EXPLORING` / `PLANNING`, the
read-only whitelist applies (see §5).

---

## 3. Action Vocabulary

Four new Action types supplement Arthur's existing schema (see
[arthur-engine §3](arthur-engine.md)):

### 3.1 `START_PLAN`

Optional: `goal` — goal summary formulated by the model.

**Allowed in:** NORMAL, EXPLORING, PLANNING, EXECUTING.
**Effect:** `process.mode = EXPLORING`. Read-only Tool filter active from
next turn. Engine runs auto-continue (see §6) without user input.

### 3.2 `PROPOSE_PLAN`

Required: `plan` (Markdown), `summary` (one-liner), `todos` (list).

**Allowed in:** EXPLORING, PLANNING (edit variant).
**Effect:**
- TodoList is atomically persisted (full replace, no merge).
- `process.mode = PLANNING`.
- Plan Markdown is added as a `role=ASSISTANT` ChatMessage.
- WS notifications: `TODOS_UPDATED`, `PLAN_PROPOSED`, possibly
  `PROCESS_MODE_CHANGED`.
- `awaitingUserInput=true` → status = BLOCKED. **No** auto-continuation.
  The user must respond.

### 3.3 `START_EXECUTION`

Optional: `notes` — hint from user approval (e.g., "variant B
chosen").

**Allowed in:** PLANNING.
**Effect:** `process.mode = EXECUTING`. Tool filter relaxed. Engine
continues auto-continue — the next iteration processes the first
PENDING Todo.

### 3.4 `TODO_UPDATE`

Required: `updates` — list `{id, status}`. Status: `PENDING |
IN_PROGRESS | COMPLETED`.

**Allowed in:** EXECUTING (NORMAL tolerated; otherwise rejected).
**Effect:** Atomic per-item update with optimistic locking retry. Items
not in `updates` remain untouched. WS notification:
`TODOS_UPDATED` with the complete updated list.

**Auto-Promote PLANNING → EXECUTING.** If the LLM, after user approval,
starts directly with `TODO_UPDATE` without first emitting `START_EXECUTION`
(Gemini occasionally does this — sees user "ok" + the
plan in history and just starts), `PlanModeService.
handleTodoUpdate` implicitly promotes the mode to `EXECUTING`, emits the
same `MODE_CHANGED` event as an explicit `START_EXECUTION`, and
sets the `MODE:execute` history tag. Without this, the Process
gets stuck in PLANNING — the Web UI continues to show the approval banner, and
mode-aware Tool filters remain in the read-only phase.

### 3.5 Per-Mode Permission

`ArthurActionSchema.typesForMode(mode)` (or the analogous
Eddie counterpart) contains the allowed subset per mode. The mode gate
in the Engine (`ArthurEngine.handleAction` /
`EddieEngine.handleAction`) checks this before dispatch — if an
action is not allowed, a re-prompt hint is returned to the model.
The actual Action handlers are in the shared
`PlanModeService`; the Engine calls `dispatch(action, process, ctx)`
at the beginning of its Action loop and only delegates to its own
switch if `dispatch` returns `null` (action was not a Plan-Mode
type).

The schema itself is **flat** (all Action types always visible in the
Engine's `*_action` Tool). Reason: schema stability for
prompt caching. The mode-specific system prompt tells the model
which subset it may currently use.

---

## 4. TodoList Convention

Embedded list `todos: List<TodoItem>` on
`ThinkProcessDocument`. Persistent; survives suspend/resume.

**TodoItem Schema:**

```java
record TodoItem(
    String id,                  // stable across status updates and edits
    TodoStatus status,          // PENDING | IN_PROGRESS | COMPLETED
    String content,             // Imperative, e.g., "Migrate token storage"
    @Nullable String activeForm // Progressive form for spinner/UI
) {}
```

**Granularity (Mandatory Convention):**

- **3 to 8 entries** per list.
- Each entry is a **logical phase with intrinsic value** — typically 1–3
  Tool calls or a sub-delegation.
- **Not** atomic Tool calls ("doc_read on X.java" → wrong).
- **Not** over-generalization ("Perform refactoring" → wrong).

System prompt block in
[`prompts/arthur-prompt-exploring.md`](../../repos/vance/server/vance-brain/src/main/resources/vance-defaults/_vance/prompts/arthur-prompt-exploring.md)
specifies examples of good / bad lists.

When processing a Todo, Arthur decides situationally: call tools himself,
delegate to a Worker, or split further. Convention: before each
non-trivial Tool call, set the current Todo to `IN_PROGRESS`,
then to `COMPLETED` (via `TODO_UPDATE` action).

---

## 5. Tool Filter (Plan-Mode Security)

`ArthurEngine.filterAllowedToolsForMode(baseAllowed, mode, ctx)`
reduces the Engine's `allowedTools()` set to a **label-driven**
read-only whitelist if `mode ∈ {EXPLORING, PLANNING}`.

### 5.1 Label Convention `read-only`

Tools that **do not mutate state** (no writing to MongoDB /
filesystem / Workspace, no spawn process, no Inbox post, no
Tool loop trigger) carry the label `"read-only"`:

- **Server Tools** override `Tool.labels()` and include
  `"read-only"` in the set — alongside other selector labels
  (`"eddie"`, `"kind-data"`, …).
- **Client-pushed Tools** (Foot-`ClientTool`) pass the label via
  `ToolSpec.labels`; `ClientToolSource.ClientTool.labels()`
  mirrors this on the Brain side, making them visible for
  selector-driven filters just like server beans.

Filter algorithm:

```
readOnly = ⋃ { t.name() | t ∈ toolDispatcher.resolveAll(ctx),
                          "read-only" ∈ t.labels() }
        ∪ READ_ONLY_TOOLS_FALLBACK            // Safety net, see below

if mode ∈ {EXPLORING, PLANNING}:
    if baseAllowed empty:                    // unrestrict + Plan-Mode
        return readOnly
    return baseAllowed ∩ readOnly
else:
    return baseAllowed                      // NORMAL / EXECUTING
```

The lookup runs **live** per per-call context — newly registered
Tools (e.g., a Foot that just connected) are
immediately considered, without Brain restart.

### 5.2 What `read-only` means

Currently tagged with label (as of first Plan-Mode release):

| Family | Tools |
|---|---|
| Discovery / Identity | `current_time`, `whoami`, `find_tools`, `describe_tool` |
| Web | `web_search`, `web_fetch` |
| Documents (read) | `doc_read`, `doc_list`, `doc_find`, `cross_doc_list_projects` |
| Scratchpad (read) | `scratchpad_get`, `scratchpad_list` |
| Catalog | `project_list`, `project_current`, `recipe_list`, `recipe_describe`, `manual_list`, `manual_read` |
| Data (read) | `data_get` |
| Knowledge-Graph (read) | `relations_find` |
| Process / Status (read) | `process_list`, `process_status` |
| RAG / Kit / Exec (status) | `rag_list`, `kit_status`, `work_exec_status` |
| Foot Workspace (read) | `client_file_read`, `client_file_list`, `client_exec_status` |

**Deliberately without label:** everything that writes, spawns, inboxes,
delegates, or executes code — `doc_create`, `process_create*`,
`process_steer`, `process_stop/pause/resume`, `inbox_post`,
`scratchpad_set/delete`, `data_set`, `relations_add`, `rag_create`,
`rag_add_*`, `kit_install/apply/export`, `work_exec_run`/`work_exec_kill`, `respond`,
`client_file_edit/write`, `client_exec_run/kill`, `client_javascript`,
`workspace_execute_javascript`, `git_checkout`, `workspace_delete`.

`respond` is deliberately blocked — the purpose of Plan-Mode is
exploration-before-execution, not a final answer in exploration mode.

### 5.3 Fallback List

`ArthurEngine.READ_ONLY_TOOLS_FALLBACK` is a hardcoded
safety net with the same Tool names as §5.2. As long as individual
read Tools are not yet tagged with `read-only` (e.g., newly
added, tagging migration incomplete), the list applies.
Once all relevant Tools are tagged, it can be cleaned up
— the filter will then be purely label-driven.

### 5.4 Recipe Override

Properties `readOnlyToolsAdd` / `readOnlyToolsRemove` on
[`arthur.yaml`](../repos/vance/server/vance-brain/src/main/resources/vance-defaults/recipes/arthur.yaml)
modify the set per Recipe. Use case: a "Code Review" Recipe
may use `relations_add` during exploration (via
`readOnlyToolsAdd`), or a particularly defensive pipeline can
remove `web_fetch` (via `readOnlyToolsRemove`).

### 5.5 Mode of Operation

Filter acts **physically in the Action schema**: the model does not
even see the blocked Tool in the Tool manifest of its LLM call and
cannot call it via Action schema or free-form Tool call.
Advantage over permission layer denial: no re-prompt loops, no
"model tries again with different wording".

---

## 6. Auto-Continuation after Mode Change

Mode transitions like `START_PLAN` and `START_EXECUTION` set
`awaitingUserInput=false` — meaning the Engine **does not** wait for the user.
But it still needs a subsequent turn to apply the new mode prompt.

`ArthurEngine.runTurn` and `EddieEngine.runTurn` solve this with a
**continuation budget**: after a mode change, another
turn with an empty inbox is triggered, provided the Process is in
`IDLE` status after the current turn (not `BLOCKED`). Budget: max 8
continuation turns per runTurn call — the natural progression
NORMAL → EXPLORING → PLANNING → EXECUTING needs 3, the rest buffers
step-by-step TODO_UPDATE sequences during EXECUTING.

`PROPOSE_PLAN` sets `awaitingUserInput=true` → Status `BLOCKED` →
**no** continuation. The user must respond, then the
Engine continues via the normal pending pipeline.

**Silent-Turn-Guard.** In addition to the continuation budget, there is a
sharper circuit breaker: three silent turns in a row (no
ASSISTANT chat, no Tool calls) → Process to BLOCKED, user
takes over. Stops LLM stuck loops before the full budget is used
(Gemini sometimes delivers STOP with empty content, which would otherwise
continue silently — see §14a).

**Continuing-Actions (in-loop apply).** Some Plan-Mode actions
do not end the LLM turn, but are applied directly in the Action loop
and their result is injected as a Tool result message into the ongoing
conversation — the model immediately sees the new situation and
can continue in the same turn. Without in-loop apply, the
model gets LLM amnesia: the next turn rebuilds the prompt from
the chat history, sees no trace of the just-emitted action, and
emits it idempotently again.

| Engine | Continuing-Actions | Reason |
|---|---|---|
| Arthur | `TODO_UPDATE` | START_PLAN / START_EXECUTION remain terminal because Arthur's Recipe has mode-aware Tool sets (EXPLORING/PLANNING strip `@write`/`@executive`). An in-loop mode change would leave the LLM with the old Tool manifest — the outer continuation rebuilds the next turn with the correct mode Tool set. |
| Eddie | `START_PLAN`, `START_EXECUTION`, `TODO_UPDATE` | Eddie's Recipe only defines the NORMAL-Mode block (Tool set does not change on mode change) — in-loop mode transitions are safe and save a continuation round trip. Observed effect: Eddie starts directly with the first TODO_UPDATE + the first Tool call in the same turn after `START_EXECUTION`. |

In-loop apply is implemented via `StructuredActionEngine.
applyContinuingAction(...)` + `isTerminalAction(...)`. Subclasses
declare their Continuing set via `CONTINUING_ACTIONS` and
return a feedback string (typically: rendered TodoList +
"next step" hint); this feedback is added as a
Tool result message in the LLM context.

---

## 7. System Prompts per Mode

Three separate prompt documents in
`vance-brain/src/main/resources/vance-defaults/prompts/`:

| File | Mode | Content |
|---|---|---|
| `arthur-prompt.md` | NORMAL, EXECUTING | Standard Arthur + trigger block for `START_PLAN` + `TODO_UPDATE` documentation |
| `arthur-prompt-exploring.md` | EXPLORING | "You are read-only. 0–3 read Tools, then `PROPOSE_PLAN`." |
| `arthur-prompt-planning.md` | PLANNING | "User has responded. Interpret as Approval/Edit/Reject." |

`EnginePromptResolver.resolveForMode(process, basePath, mode,
javaFallback)` selects based on the current mode; cascade (project →
`_tenant` → classpath) remains unchanged. Tier/model variants
live within the template (Pebble), not in suffix files —
see `recipes.md` §5.

Trigger block in `arthur-prompt.md` lists 5 GOOD categories
(architectural intervention, multi-module, behavioral change, unclear
requirement, Worker pipeline) and 5 BAD categories
(research/lookup, clear delegation, trivial fix, specific
instruction, "Let's continue"). Default rule of thumb: "When in doubt,
plan."

### 7.1 Dynamic TodoList Block

In addition to the static mode prompts, Arthur and Eddie build a
**dynamic** Plan state system message per turn:

- **Mode Header:** `## Current TodoList (mode=<X>)`.
- **TodoList:** all items with status marker (`[ ]` PENDING, `[~]`
  IN_PROGRESS, `[✓]` COMPLETED) and ID.
- **Guidance:** "take the first non-COMPLETED, set to
  IN_PROGRESS, do the work, then COMPLETED" + strict rules
  ("NEVER downgrade", "NEVER re-emit START_EXECUTION").
- **Empty-Todos-Fallback (Eddie):** if the Process is in EXPLORING /
  PLANNING without Todos (fresh after START_PLAN or after
  PROPOSE_PLAN before Todos are persisted), the renderer
  provides mode-specific single-liner instructions instead of an empty
  TodoList. Prevents the observed LLM idempotency loop where
  the model emits the same mode transition repeatedly because it
  has no in-prompt hint that it is **already** in the
  target mode.

Build sites: `ArthurEngine.buildTodoListBlock` and
`EddieEngine.buildTodoListBlock`. Content is nearly identical; the
recommended Tool families differ (Arthur:
`client_file_*` / `exec_*`; Eddie: `web_search` / `doc_create`
/ `DELEGATE_PROJECT`).

### 7.2 Progress Chat Hits per COMPLETED

Visible Plan progress for the user: after each `TODO_UPDATE` that
flips an item to `COMPLETED`, the Engine posts a single-line
ASSISTANT message "`✓ <step-content>`" to the chat. This sits between
the silent TODO_UPDATE actions and the final `ANSWER` and
closes the UX gap that previously made a 2+ minute Plan execution
visually indistinguishable from "stuck".

Implemented in the Engine-specific `applyContinuingAction`-
override via `appendProgressChatForCompletions(...)` —
diff-based against the pre-update Todos, so that re-emitted
TODO_UPDATEs on already-COMPLETED items do not generate spam.

---

## 8. WS Notifications to Foot

Three new message types in `vance-api/ws/MessageType`:

| Type | Payload | Trigger |
|---|---|---|
| `process-mode-changed` | `ProcessModeChangedNotification` (oldMode, newMode) | Every mode transition |
| `todos-updated` | `TodosUpdatedNotification` (full list) | `PROPOSE_PLAN`, `TODO_UPDATE` |
| `plan-proposed` | `PlanProposedNotification` (summary, planVersion) | `PROPOSE_PLAN` |

`PlanModeEventEmitter` is the central emit path; Foot handlers
each render a compact status block in the scrollback. TUI
polish (persistent status block above the prompt via
`LineReader.printAbove()`, mode indicator in the prompt itself) is
a subsequent step.

---

## 9. Recipe Properties

New in [`arthur.yaml`](../repos/vance/server/vance-brain/src/main/resources/vance-defaults/recipes/arthur.yaml):

```yaml
engine: arthur
params:
  planMode: auto              # auto | required | disabled (default auto)
  planOutputViaInbox: false   # if true: Plan in Inbox, not Chat (Edge case)
  readOnlyToolsAdd: []        # additionally allowed in EXPLORING/PLANNING
  readOnlyToolsRemove: []     # removed from default
```

**`planMode` values:**

- `auto` (Default) — Arthur decides per request via the
  trigger logic in the system prompt.
- `required` — Arthur must first choose `START_PLAN` for every
  non-conversational request. Useful for high-risk production pipelines.
- `disabled` — `START_PLAN` is rejected in the Action handler with
  a re-prompt hint. Plan-Mode is effectively off.

**Rollback:** global setting `vance.engine.planMode.globalDefault:
disabled` (default `auto`) deactivates Plan-Mode tenant-wide without
Recipe edits, if production issues occur.

---

## 10. User Approval Path

Plan approval is **chat-driven**, not via Inbox items:

1. Arthur emits `PROPOSE_PLAN` with `plan` + `todos`.
2. Plan Markdown is rendered as a normal Assistant ChatMessage.
   Foot additionally shows the `═══ Plan ═══` banner via
   `plan-proposed` notification.
3. User responds in chat:
   - **"ok" / "do it" / "sounds good"** → Arthur emits
     `START_EXECUTION`.
   - **"not X, but Y"** → Arthur emits `PROPOSE_PLAN` with
     revised plan + Todos. Old plan message remains in
     chat history (audit), new one is appended. TodoList is
     replaced.
   - **"no, rethink"** → Arthur emits `START_PLAN`,
     switches back to EXPLORING.

Recognition is the LLM's task (controlled by
`arthur-prompt-planning.md`). In case of ambiguity, Arthur
emits `ANSWER` with a brief query, no erratic auto-routing.

**Engine parameter `planOutputViaInbox: true`** is an optional
override for cases where the plan recipient is different from the
chat user. Edge case, not default.

---

## 11. Plan Drift during Execution

If Arthur in EXECUTING needs a Tool call not in the
original plan:

- **Small** (additional reading, auxiliary Tool): do directly.
- **Medium** (TodoList extension by 1–2 entries): `TODO_UPDATE`
  with the new entry, brief `ANSWER` as user hint.
- **Large** (plan architecture changes): `START_PLAN` again, new
  exploration + `PROPOSE_PLAN`.

Pure convention in the system prompt (`arthur-prompt.md`,
EXECUTING block). No technical enforcement — audit via the
emitted actions in the trace log.

---

## 12. Interface to Eddie

If Eddie is in front of Arthur as a Voice Hub (cross-project delegation):

- Arthur emits `PROPOSE_PLAN` as a normal ChatMessage of the
  delegated Worker Process.
- `ParentNotificationListener` (see
  [eddie-engine](eddie-engine.md)) forwards this as a ProcessEvent to
  Eddie's pending queue.
- Eddie's output routing (see `eddie-engine.md` §6) decides whether
  the plan is passed through 1:1 or redirected to the Inbox.
- User response to Eddie is routed back to Arthur via `STEER_PROJECT(arthur, "...")`. Arthur receives it as a regular
  `process_steer`, recognizes Approval/Edit/Reject in the
  PLANNING-Mode prompt.

**No special path needed in Arthur.** Plan-Mode mechanics are
Eddie-agnostic.

---

## 13. Mode + Status — Orthogonal Fields

| | mode | status |
|---|---|---|
| What does it describe? | What kind of work | Where the Lane currently is |
| Values | NORMAL / EXPLORING / PLANNING / EXECUTING | INIT / RUNNING / IDLE / BLOCKED / PAUSED / SUSPENDED / CLOSED |
| Who changes? | `START_PLAN` / `PROPOSE_PLAN` / `START_EXECUTION` / Engine reset to NORMAL | Engine-internal after each turn |
| Persistent | yes | yes |
| In WS notification | `process-mode-changed` | `process-progress` (status-tag) |

A PROPOSE_PLAN action, for example, sets mode=PLANNING **and** triggers
status=BLOCKED (via `awaitingUserInput=true`). Both fields
evolve in their own lifecycles.

---

## 14. Telemetry

Plan-Mode telemetry is part of the existing `llm_traces` log (see
[llm-resource-management](llm-resource-management.md) §7). From the
emitted Action types, it is possible to reconstruct:

- How often was Plan-Mode autonomously triggered?
- How many plan edits per approval phase?
- How many reject loops before user accepts?
- Average TodoList size.

Aggregation in an Insights dashboard (see
[multi-user-collaboration](multi-user-collaboration.md)) is
a subsequent step. Data basis is available.

---

## 14a. Pacemaker — Per-Model Action Loop Corrections

Plan execution drives the LLM through long Tool call sequences
(Marvin/Eddie plans can easily accumulate 10+ Tool invocations per plan).
With Gemini 2.5 Pro, an **empty STOP** occasionally occurs after such sequences:
the model stops with `finishReason=STOP`, without free text, without a Tool call.
The Action loop treats this as "free text without action call" and re-prompts
with `noActionCorrection()`. With 2 default corrections, this is often
not enough — the model responds empty 2 times in a row and the
Action loop falls back to free-text diagnosis.

**Pacemaker Pattern.** `ai-models.yaml` contains an optional
`actionLoopCorrections: <int>` value per model entry; default 2,
parsed via `ModelCatalog.buildInfo` into `ModelInfo.
actionLoopCorrections()`. `StructuredActionEngine.
runStructuredActionLoop` takes this as a parameter; Engines pass the
per-model value when called (`modelInfo.actionLoopCorrections()`).
The Action loop uses this value instead of the global constant
`MAX_ACTION_CORRECTIONS` for "free text" and "invalid action"
corrections.

**Set values (today):**

| Model | actionLoopCorrections | Reason |
|---|---|---|
| Default global | 2 | conservative, on average costs no extra turn |
| `gemini:gemini-2.5-pro` | 4 | empty-STOP observed after long Tool chains — 4 corrections allow the model to reliably find its way back into the Action loop |

Tenants can increase the value via document override in the `_tenant` project
or per project (same cascade as all ai-models.yaml fields).

**Graceful Fallback.** If, even after `actionLoopCorrections` attempts,
no Tool call comes AND the LLM has delivered nothing at all
(`bestFreeText` empty), the Engine must not replace the user response
with an internal diagnostic string ("internal: action loop produced no
usable output"). Instead:

1. **LLM has delivered free text** → post this text as ANSWER.
2. **EXECUTING + all Todos COMPLETED** → synthesize an automatic plan
   completion summary from the TodoList ("Plan completed — all steps
   done: …").
3. **Otherwise** → friendly placeholder ("`_I seem to have lost my way — please tell me briefly where to continue._`"); the
   technical diagnosis goes into a WARN log line with
   `loopResult.fallbackReason()` as trace.

Currently implemented in `EddieEngine.runTurnFor`; analogous handling in
Arthur is Phase 1 (see §17 Implementation Path).

---

## 15. Topic Recompaction Hook at Plan Completion

When the last Todo of a plan flips to `COMPLETED` and there was
substantial pre-plan history before the `MODE:plan` marker (≥ 2 USER turns),
`PlanModeService.maybeOfferRecompaction(process)` automatically posts
a **Recompaction Offer Inbox Item** (`type=APPROVAL`, tag
`RECOMPACTION_OFFER`) to the user:

> "Plan completed — roll topic into memory?"

User response:

- **Accept** (`outcome=DECIDED, value={"approved": true}`) →
  `RecompactionOfferAnsweredListener` calls
  `MemoryCompactionService.compactRange(process, planStart, now,
  topicLabel)`. The plan range (from the `MODE:plan` marker until now)
  is summarized into an `ARCHIVED_CHAT` Memory, the
  original ChatMessages get `archivedInMemoryId` set
  (fall out of `activeHistory()`, remain audit-readable in
  `history()`), and a SYSTEM marker with tag
  `RECOMPACTION:<topicLabel>` is inserted at the range end.
- **Reject** / **other outcome** → no-op.

**Why here:** Plan-Mode segments are natural sub-topics —
isolated explorations with a clear beginning (`MODE:plan`) and end
(last `PLAN_STEP_DONE`). The Inbox offer pattern (instead of
LLM Tool call) is more robust — the LLM would otherwise
unreliably set the trigger ("is a problem" — see
`planning/topic-recompaction.md` §11).

**Threshold:** `MIN_PRE_PLAN_USER_TURNS = 2` (hardcoded in
`PlanModeService`). With fewer USER turns before plan start, the
plan *was* the conversation — recompaction would empty it.

**What Plan-Mode Engines do not need to do:** nothing. The hook is
structural (in the `handleTodoUpdate` path after successful
status update), not a Tool call. Eddie and Arthur get the
functionality by simply using the shared Service.

Details: `planning/topic-recompaction.md`,
[memory-knowledge-management](memory-knowledge-management.md).

---

## 16. What Plan-Mode does not do in v1

- **No Foot TUI integration** (persistent status block above
  the prompt, mode indicator in the prompt string). v1 renders
  plan banner and TodoList as scrollback lines. Polish is
  a subsequent step.
- **No plan versioning UI.** `planVersion` in
  `PlanProposedNotification` counts (1, 2, 3, …), but old
  plan ChatMessages remain visible — the user can
  compare themselves.
- **No approval routing via Inbox** by default. Optional via
  `planOutputViaInbox: true`.
- **No automatic mode reset** to NORMAL after EXECUTING
  completion. Arthur emits an `ANSWER` upon plan completion and
  logically remains in NORMAL for the next user request; an explicit
  mode reset comes with the next turn.

---

## 17. Implementation Path

| Layer | Where | Spec Reference |
|---|---|---|
| `ProcessMode` enum, `TodoItem`, `TodoStatus` | `vance-api/thinkprocess/` | §2, §4 |
| Embedded fields `mode` + `todos`, atomic service methods | `vance-shared/thinkprocess/` | §2, §4 |
| `ThinkEngine.filterAllowedToolsForMode(base, mode, ctx)` | `vance-brain/thinkengine/` | §5 |
| **`PlanModeActionSchema` + `PlanModeService`** (shared dispatcher + 4 Action handlers) | `vance-brain/thinkengine/plan/` | §3 |
| `READ_ONLY_TOOLS_FALLBACK`, label-driven filter | `vance-brain/arthur/` | §3, §5 |
| `ArthurActionSchema` unions the Plan-Mode types, plus `typesForMode()` | `vance-brain/arthur/` | §3 |
| `EddieActionSchema` unions the Plan-Mode types | `vance-brain/eddie/` | §3 |
| `Tool.labels()` tagged with `"read-only"` — 25 server read Tools | `vance-brain/tools/**/` | §5 |
| `ToolSpec.labels` + `ClientToolSource.ClientTool.labels()` (wire passthrough) | `vance-api/tools/`, `vance-brain/tools/client/` | §5 |
| `ClientTool.labels()` (Foot default + `toSpec()`) — 3 read Tools tagged | `vance-foot/tools/` | §5 |
| `EnginePromptResolver.resolveForMode` + 2 new prompts | `vance-brain/thinkengine/`, `vance-defaults/prompts/` | §7 |
| Auto-continuation in `runTurn` (budget 4, status gate) | `vance-brain/arthur/` | §6 |
| `PlanModeEventEmitter` + 3 notification DTOs | `vance-brain/arthur/`, `vance-api/thinkprocess/` | §8 |
| `ProcessModeChangedHandler`, `TodosUpdatedHandler`, `PlanProposedHandler` | `vance-foot/connection/handlers/` | §8 |
| **`maybeOfferRecompaction`-Hook in `handleTodoUpdate`** | `vance-brain/thinkengine/plan/` | §15 |
| **`RecompactionTags`** (constants for Inbox offer tag + payload keys) | `vance-brain/memory/` | §15 |
| **`RecompactionOfferAnsweredListener`** + filter in `InboxAnsweredListener` | `vance-brain/memory/`, `vance-brain/inbox/` | §15 |
| **`MemoryCompactionService.compactRange`** + `ChatMessageService.findActiveInRange` | `vance-brain/memory/`, `vance-shared/chat/` | §15 |
| **Eddie self-continuation + silent-turn-guard in `runTurn`** (budget 8) | `vance-brain/eddie/` | §6 |
| **`EddieEngine.buildTodoListBlock`** (mirror Arthur, plus empty-todo mode hints) | `vance-brain/eddie/` | §7.1 |
| **Continuing-Actions in Eddie** (`CONTINUING_ACTIONS = {START_PLAN, START_EXECUTION, TODO_UPDATE}`, `applyContinuingAction` override) | `vance-brain/eddie/` | §6 (Table) |
| **Auto-Promote PLANNING → EXECUTING in `handleTodoUpdate`** | `vance-brain/thinkengine/plan/PlanModeService` | §3.4 |
| **Progress-Chat-Append (`appendProgressChatForCompletions`) in Eddie**, **Arthur** Phase 1 (todo) | `vance-brain/eddie/`, `vance-brain/arthur/` | §7.2 |
| **`ModelInfo.actionLoopCorrections`** + parser in `ModelCatalog.buildInfo` | `vance-brain/ai/` | §14a |
| **`StructuredActionEngine.runStructuredActionLoop(...)` with `maxCorrections` parameter** | `vance-brain/thinkengine/action/` | §14a |
| **`actionLoopCorrections`-Override for gemini-2.5-pro** | `vance-defaults/ai-models.yaml` | §14a |
| **Graceful action-loop fallback** (Free-Text → use, all-COMPLETED → synthesize, else → friendly placeholder) in Eddie, **Arthur** Phase 1 (todo) | `vance-brain/eddie/`, `vance-brain/arthur/` | §14a |
| **`ASK_USER.options` + Picker-Renderer + Gate-Relaxation** in Eddie, **Arthur** Phase 1 (todo) | `vance-brain/eddie/`, `vance-brain/arthur/` | [eddie-engine.md §5.6](eddie-engine.md), [§5.8](eddie-engine.md) |
| **`relayableActionParams` on `ProcessEvent`** + Worker-Filler + Eddie-RELAY-Reader (Phase 2, todo) | `vance-shared/enginemessage/`, `vance-brain/arthur/`, `vance-brain/eddie/` | [eddie-engine.md §5.8](eddie-engine.md) |
| **Web-UI Picker-Buttons** (Phase 3, todo) | `client_web/packages/vance-face/src/chat/` | [eddie-engine.md §11 Offene Punkte](eddie-engine.md) |

---

## 18. Reference

- **End-to-End Test:**
  `qa/ai-test/.../ArthurPlanModeAutoTriggerTest` (LLM-driven,
  provider-agnostic).
- **Deterministic Tests:**
  `vance-brain/.../arthur/ArthurReadOnlyToolFilterTest`,
  `ArthurActionSchemaTest`,
  `vance-shared/.../thinkprocess/ThinkProcessServiceTest` (Plan-Mode
  section).
