# Vancetope — Marvin Think Engine

> **Marvin** is the **deep-think** engine. It builds a
> dynamic, persistent task tree, where each node is an
> **autonomous marvin-worker**. Each node goes through a
> deterministic 5-phase state machine
> (`SCOPE → REFLECT → POST_CHILDREN → CONCLUDE → VALIDATE`).
> The plan IS the tree — there is no separate plan structure;
> before each LLM call, the engine renders a live view
> of the tree as context. Brain the size of a planet, and for once
> it's allowed to use it on the actual problem.
>
> See also: [think-engines](think-engines.md) | [arthur-engine](arthur-engine.md) | [vogon-engine](vogon-engine.md) | [user-interaction](user-interaction.md) | [recipes](recipes.md)

---

## 1. Role and Classification

Marvin v2 differs structurally from the other Engines:

| Engine | Data Model | Character |
|---|---|---|
| `arthur` | Chat History (linear) | Reactive Session Chat |
| `ford` | Chat History (linear) | Generalist Worker, one question → one answer |
| `vogon` | State Machine + Strategy State (static) | Deterministic Multi-Phase Plan |
| **`marvin`** | **Task Tree (dynamically growing, Mongo-persistent)** | **Autonomous Worker Nodes with 5-Phase Lifecycle** |

Marvin's Use Cases:

- "Research nuclear power and write me a report" — Root Worker
  decomposes by aspects (history / tech / ecology), calls
  `web-research` via CALL_RECIPE, synthesizes.
- "Analyze these 5 PDFs for contradictions" — Worker spawns
  per-PDF-Children, each loads its PDF, then POST_CHILDREN
  synthesizes.
- "Plan and implement Feature X" — Worker decomposes into
  requirements analysis → design → tasks per component.

What Marvin is **not**:

- Not a chat orchestrator (that's Arthur)
- Not a state machine runner with fixed phases (that's Vogon)
- Not a generalist worker with a tool loop (that's Ford) — Marvin **calls**
  specialized Recipes via CALL_RECIPE; it plans,
  reflects, validates itself.

## 1.1 v1 → v2 Transition

Marvin v2 is a **complete rewrite**. What has changed:

| v1 | v2 |
|---|---|
| TaskKinds: PLAN, WORKER, EXPAND_FROM_DOC, USER_INPUT, AGGREGATE | TaskKinds: WORKER, EXPAND_FROM_DOC, USER_INPUT |
| PLAN node decomposes the entire plan upfront | Root is a WORKER, the plan grows successively |
| AGGREGATE node synthesizes siblings | POST_CHILDREN phase of the Parent synthesizes |
| `WORKER_SCHEMA_POSTFIX` on all Workers | Phase schemas per LLM call; special Recipes unchanged |
| `allowedSubTaskRecipes` / `recipesOnlyViaExpand` | `availableRecipes` (CALL_RECIPE whitelist) |
| Static plan in JSON schemas, KIND blocks in prompts | Dynamic plan snapshot as live view, no KIND boilerplate |

The trigger for the rewrite was a recurring live observation
(2026-05-24): specialized Workers (web-research, analyze, …)
to which the Marvin output contract was appended, reproducibly
chose `NEEDS_SUBTASKS` as a convenient way out, instead of
carrying out their technical mandate. An LLM persona cannot
reliably be "technical worker + routing decision-maker" in one
response. The separation into **marvin-worker** (Orchestrator)
+ **CALL_RECIPE** (specialized Workers in native mode) solves
this structurally.

## 2. Data Model

### 2.1 Engine State

Marvin lives **outside** the `ThinkProcessDocument`. The Process
carries standard fields + `engineParams`. The actual tree is located
in a separate Collection.

```java
// vance-shared/src/main/java/de/mhus/vance/shared/marvin/MarvinNodeDocument.java
@Document(collection = "marvin_nodes")
public class MarvinNodeDocument {
    @Id String id;
    String tenantId;
    String processId;                      // Marvin's ThinkProcess id
    @Nullable String parentId;             // null for root
    int position;                          // sort order among siblings
    String goal;                           // what this node should achieve
    TaskKind taskKind;                     // WORKER | EXPAND_FROM_DOC | USER_INPUT
    Map<String, Object> taskSpec;          // kind-specific spec
    NodeStatus status;                     // PENDING | RUNNING | WAITING | DONE | FAILED | SKIPPED
    Map<String, Object> artifacts;         // result, summary, partialResult, recipeReplies
    @Nullable String failureReason;
    @Nullable String spawnedProcessId;     // for legacy reverse-lookup
    @Nullable String inboxItemId;          // USER_INPUT → inbox-item id

    // ───── State-machine cursor ─────
    @Nullable WorkerPhase currentPhase;    // SCOPE | REFLECT | POST_CHILDREN | CONCLUDE | VALIDATE
    int reflectIter;                       // 0..3
    int validateIter;                      // 0..2
    int concludeRetries;                   // 0..2
    boolean awaitingPostChildren;          // children-fanout in flight
    @Nullable String candidateResult;      // CONCLUDE candidate, awaiting VALIDATE
    List<String> calledSubProcessIds;      // CALL_RECIPE sub-processes
    List<PhaseIteration> phaseHistory;     // audit trail
}
```

`MarvinNodeService` is the only access to the Collection.
Indexes: `(processId, status, position)`, `(processId, parentId,
position)`, `spawnedProcessId`, `inboxItemId`,
`calledSubProcessIds` (sparse).

### 2.2 TaskKind (vance-api)

```java
public enum TaskKind {
    WORKER,           // marvin-worker with 5-phase lifecycle
    EXPAND_FROM_DOC,  // deterministic fanout from list/tree/records-Document
    USER_INPUT        // Inbox-Item Wait-Point
}
```

PLAN and AGGREGATE from v1 are removed without replacement — the Root is
a WORKER, POST_CHILDREN replaces AGGREGATE.

### 2.3 Phase Records (vance-api)

Five records, one per phase. All non-null-by-default
(JSpecify) with explicitly nullable fields:

- `ScopeOutput(action, recipeCall, newTasks, userInput, problem, reason)`
- `ReflectOutput(action, recipeCall, newTasks, userInput, problem, reason)`
- `PostChildrenOutput(action, newTasks, problem, reason)`
- `ConcludeOutput(result, postActions, reason)`
- `ValidateOutput(verdict, issues, hint, reason)`

Plus Action Enums: `ScopeAction`, `ReflectAction`,
`PostChildrenAction`, `ValidateVerdict`.

Plus Helper Records: `RecipeCall`, `NewTaskSpec`, `UserInputSpec`,
`PostActionSpec`, `PhaseIteration`.

## 3. Lifecycle

`MarvinEngine` implements `ThinkEngine`. Lifecycle:

```
start  → createRoot(WORKER) + scheduleTurn
runTurn → drainPending → findNextActionableNode → executeNode → idle
steer  → scheduleTurn  (Marvin async, no synchronous Reply)
stop   → closeProcess(STOPPED)
```

**Important**: Marvin's `asyncSteer() = true`. Parent Engines (Arthur,
Vogon) do NOT block on a Marvin-`process_steer` — they
queue the input and wait for the DONE-ProcessEvent.

## 4. Node Status Transitions

```
PENDING ──→ RUNNING ──(sync done)──→ DONE
              │
              ├──(NEEDS_SUBTASKS)──→ DONE  (awaitingPostChildren=true; DFS-transparent)
              │                       │
              │                       └─(children all terminal, sweeper resurrects)──→
              │                          PENDING (phase=POST_CHILDREN) → RUNNING
              │
              ├──(NEEDS_USER_INPUT)─→ DONE (after USER_INPUT sibling created; sibling holds WAITING)
              │
              ├──(BLOCKED_BY_PROBLEM / HARD_FAIL / parse error)──→ FAILED
              │
              └──(idle / replan)──→ SKIPPED
```

WORKER nodes go directly from PENDING → RUNNING; during the
phase loop, they remain RUNNING.

**Important — no WAITING phase for NEEDS_SUBTASKS parents.**
After NEEDS_SUBTASKS, the Engine marks the Parent as DONE with
`awaitingPostChildren=true`. DONE is DFS-transparent — the
walker descends into the freshly spawned Children. As soon as all
Children are terminal, the `reactivatePostChildrenParents`-
sweeper at the top of each runTurn resets the Parent to
`PENDING + currentPhase=POST_CHILDREN`. The next DFS pick
then drives it through POST_CHILDREN → CONCLUDE → VALIDATE.

WAITING only exists for `USER_INPUT` nodes (Inbox-Item
spawned, waiting for response).

## 5. The Five Phases

Each WORKER node goes through these phases in exactly this
order with hard iteration caps. Phase outputs are
JSON objects with phase-specific schemas.

```
       ┌─────────┐
       │  SCOPE  │  ← what needs to be done?
       └────┬────┘
            │
   ┌────────┼─────────┬─────────────┬──────────────┐
   ▼        ▼         ▼             ▼              ▼
 CALL_     PROCEED  NEEDS_       NEEDS_         BLOCKED_
 RECIPE    TO_      SUBTASKS     USER_INPUT     BY_PROBLEM
   │       CONCLUDE                                (TERMINAL)
   │         │         │             │
   │         │         ▼             ▼
   │         │   [children          USER_INPUT
   │         │    execute]          sibling (TERMINAL)
   │         │         │
   │         │         ▼
   │         │   POST_CHILDREN
   │         │         │
   │         │   ┌─────┴────┬────────────┐
   │         │   ▼          ▼            ▼
   │         │  PROCEED   NEEDS_       BLOCKED_
   │         │  TO_       SUBTASKS    BY_PROBLEM
   │         │  CONCLUDE  (bounded     (TERMINAL)
   │         │            by depth)
   │         │   │          │
   │         │   │          └─→ another level
   │         │   ▼
   │         ▼   ▼
   ▼      CONCLUDE
 REFLECT     │
 (iter ≤ 3)  ▼
   │      VALIDATE (iter ≤ 2)
   │         │
   │   ┌─────┼────────────┬──────────┐
   │   ▼     ▼            ▼          ▼
   │  PASS  RETRY_      NEED_     HARD_
   │   │    CONCLUDE   MORE_      FAIL
   │   ▼      │        DATA       (TERMINAL)
   │  DONE  back to    │
   │       CONCLUDE   back to
   │                  REFLECT (if cap left)
   └──── (CALL_RECIPE next iteration)
```

### 5.1 SCOPE — initial decision

First LLM call. Sees: Goal, availableRecipes list, Live Plan
Snapshot. Immediately decides the initial action.

**Output**:
```json
{"action": "CALL_RECIPE" | "PROCEED_TO_CONCLUDE" | "NEEDS_SUBTASKS"
         | "NEEDS_USER_INPUT" | "BLOCKED_BY_PROBLEM",
 "recipeCall":  {"recipe": "...", "steerContent": "..."},
 "newTasks":    [{"goal":"...","taskKind":"WORKER","taskSpec":{}}],
 "userInput":   {"type":"DECISION","title":"...","body":"..."},
 "problem":     "<short>",
 "reason":      "<one-line>"}
```

### 5.2 REFLECT — post-CALL_RECIPE evaluation

Reached via CALL_RECIPE. Cap: **3 iterations per node**.
Sees Goal + Plan + previous Recipe replies (each as
`<<< Result of CALL_RECIPE('...'): … >>>` blocks).

The reply blocks are present from the first CALL_RECIPE in **every** phase
message, not just here — CONCLUDE and VALIDATE also need this
material (otherwise the candidate synthesizes without evidence and the validator
checks against nothing). Reason: the phase turns are memoryless
(`[system, user]`, no history) — the payload is all the Worker sees.
Persistence alone is not enough: the result must be rendered in
`buildPhaseUserMessage`.

Schema identical to SCOPE (same Actions). If cap exhausted
(3 CALL_RECIPEs already run) → forced PROCEED_TO_CONCLUDE.

### 5.3 POST_CHILDREN — children-fanout synthesis

Reached after NEEDS_SUBTASKS, as soon as **all** Children are terminal.
Sees Plan Snapshot + explicit Children Results block.

**Output**:
```json
{"action": "PROCEED_TO_CONCLUDE" | "NEEDS_SUBTASKS" | "BLOCKED_BY_PROBLEM",
 "newTasks": [...],
 "problem":  "...",
 "reason":   "..."}
```

NEEDS_SUBTASKS here is only allowed if tree depth < `maxTreeDepth`
(default 5). Otherwise forced PROCEED_TO_CONCLUDE.

### 5.4 CONCLUDE — final answer

Synthesis phase. Produces the candidate result + optional
engine-side postActions.

**Output**:
```json
{"result":     "<complete Markdown answer>",
 "postActions": [{"tool":"doc_write",
                  "args":{"path":"...","kind":"text","content":"{{ node.result }}"}}],
 "reason":     "..."}
```

CONCLUDE may go through up to **2 retries** (RETRY_CONCLUDE-
Verdict from VALIDATE).

### 5.5 VALIDATE — critical review

Fresh LLM call with critical prompt. Sees Goal + Candidate
Result + Plan Snapshot. Cap: **2 iterations per node**.

**Output**:
```json
{"verdict": "PASS" | "RETRY_CONCLUDE" | "NEED_MORE_DATA" | "HARD_FAIL",
 "issues":  ["<problem 1>", "<problem 2>"],
 "hint":    "<what to improve>",
 "reason":  "..."}
```

**Verdict Routing**:
- `PASS` → markDone(candidate) + runPostActions → TERMINAL DONE
- `RETRY_CONCLUDE` → back to CONCLUDE; `issues`+`hint` as
  memory hint. If `concludeRetries` < 2.
- `NEED_MORE_DATA` → back to REFLECT with `hint`. If
  `reflectIter` < cap.
- `HARD_FAIL` → markFailed → TERMINAL FAILED. **HARD_FAIL wins
  against Cap-Forced-DONE** — at iter 2 with HARD_FAIL, it remains
  FAILED.

If `validateIter` >= cap: forced markDone(last Candidate) +
Audit Warning.

### 5.6 Iteration Cap Overview

| Phase | Cap | On Cap Hit |
|---|---|---|
| SCOPE | 1 | — |
| REFLECT | 3 CALL_RECIPEs | forced PROCEED_TO_CONCLUDE |
| POST_CHILDREN | 1 + (tree-depth bounded NEEDS_SUBTASKS) | forced PROCEED_TO_CONCLUDE |
| CONCLUDE | 1 initial + 2 Re-Conclude | last Candidate accepted |
| VALIDATE | 2 | see §5.5 |

**Worst-Case LLM Calls per node**: 1+3+1+3+2 = **10 Calls**.
**Best-Case**: 1+1+1 = **3 Calls** (SCOPE→CONCLUDE→VALIDATE PASS).
**Typical**: 1+1+1+1 = **4 Calls** (with 1 Recipe Call).

## 6. Plan Snapshot — the Dynamic Plan

The **tree IS the plan**. There is no separate plan data structure.
Before each LLM call, `PlanSnapshotRenderer` (vance-brain) renders
a compact text view from the Mongo nodes.

### 6.1 Render Format

```
┌─ LIVE PLAN (current state — supersedes any earlier view) ───────┐
│ ROOT (running) — Nuclear Power Deep-Research                    │
│   #1 (DONE) — History & Political Context                       │
│        └ First reactors 1942; Chernobyl 1986; Phase-Out 2011    │
│   #2 (running) — Tech Status of Modern Reactors [YOU ARE HERE]  │
│        #2.1 (DONE) — SMR Concepts                               │
│             └ SMRs are smaller modules, NuScale certified       │
│        #2.2 (running) — ITER Update                             │
│   #3 (planned) — Ecological Impacts                             │
└─ end of plan ───────────────────────────────────────────────────
```

- Line per node: `<path> (<status>) — <title>`
- For DONE: additionally `└ <truncated summary, max 200 chars>`
- Current node: `[YOU ARE HERE]`
- Hard cap: **4000 chars total**

### 6.2 Pruning for Large Trees

If the full render would be > 4000 chars, prune as follows:
1. Path-to-root: full
2. Direct siblings: full with summary
3. Own children: full with summary
4. Distant branches: `#3.2 (+ 5 subtasks, 4 DONE, 1 planned)`

### 6.3 Memory Rotation

Plan snapshots are **ephemeral**. The `MarvinEngine` assembles the
LLM memory freshly for each call from:
- System Prompt (static marvin-worker system prompt)
- Phase Control User Message **with current Plan Snapshot
  embedded**

Previous reasoning turns (Assistant responses, Recipe replies)
remain in the persistent chat history; they are not
patched between turns with outdated Plan Snapshots.

### 6.4 SCOPE Prompt Instruction for the Plan

The System Prompt explicitly states:

```
Before deciding your action, check the PLAN:
- Is your goal already covered by a sibling or cousin node?
  → reply with PROCEED_TO_CONCLUDE pointing to that, or
    BLOCKED_BY_PROBLEM "duplicate of #X.Y".
- Are you a fine-grained branch of an aspect already explored?
  → don't re-decompose; do the work yourself.
- Are there gaps in the PLAN you should NOT spawn because they
  belong to a sibling? → stay in your lane.
```

## 7. CALL_RECIPE Mechanism

The most important routing mechanism. Process for SCOPE or REFLECT
`CALL_RECIPE`:

1. Engine validates: `recipeCall.recipe` ∈ `params.availableRecipes`.
   Otherwise Failure Marker in the Reply.
2. **Block: marvin-via-CALL_RECIPE**. If the called Recipe
   has `engine: marvin` → Reject. Prevents unbounded
   Cross-Marvin-Nesting in v1.
3. **Block: Self-Recursion**. If the called Recipe is identical
   to the running Marvin Recipe → Reject.
4. Engine synchronously spawns a Sub-Process with `recipeCall.recipe`
   and `recipeCall.steerContent` as initial steer.
5. **Special Recipes run in native mode** — the Marvin Phase
   Contract is NOT layered on top.
6. Engine waits until Sub-Process CLOSED (DONE/STOPPED/FAILED).
7. Engine reads the last Assistant text, appends it as a
   USER Message to marvin-worker's Memory (hard-truncated at
   `recipeReplyTruncateChars`, default 8000):

```
<<< Result of CALL_RECIPE('web-research'):
<reply text>
[truncated; full reply persisted in sub-process history]
>>>
```

8. Engine triggers the next LLM Turn in Phase REFLECT.

## 8. NEEDS_SUBTASKS Mechanism

For SCOPE / REFLECT / POST_CHILDREN `NEEDS_SUBTASKS`:

1. Engine appends `newTasks` as WORKER Children (or
   EXPAND_FROM_DOC, USER_INPUT) under the node.
2. Node is marked **DONE** with `awaitingPostChildren=true`
   and `artifacts.spawnedChildren=<count>`. DONE is
   DFS-transparent — the walker descends into the Children.
   (If the node were set to WAITING, the DFS would
   block and never reach the Children — see §4.)
3. Marvin's DFS processes Children pre-order. Each Child
   goes through its own 5-phase state machine.
4. At the top of each `runTurn`, `reactivatePostChildrenParents` runs:
   finds DONE nodes with `awaitingPostChildren=true` whose
   Children are all terminal, resets them to
   `PENDING + currentPhase=POST_CHILDREN`, clears the flag.
5. The next DFS pick drives the re-activated Parent through
   POST_CHILDREN → CONCLUDE → VALIDATE → DONE.

**Tree-Depth-Cap**: NEEDS_SUBTASKS from POST_CHILDREN only allowed
if current depth < `maxTreeDepth`. Otherwise forced
PROCEED_TO_CONCLUDE.

## 9. NEEDS_USER_INPUT Mechanism

For SCOPE / REFLECT `NEEDS_USER_INPUT`:

1. Engine inserts a `USER_INPUT` node as a sibling directly
   after the current node (`insertSiblingAfter`).
2. Current node goes DONE with `artifacts.awaitingUserInputNode`.
3. The `USER_INPUT` node goes to RUNNING in the next runTurn
   (`runUserInput`), creates the Inbox-Item, parks in WAITING.
4. When the User response arrives (`InboxAnswer`-Event),
   `handleInboxAnswer` closes the node DONE.
5. Marvin's DFS continues through the tree.

## 10. EXPAND_FROM_DOC

Unchanged from v1. Deterministic fanout from a
`list`/`tree`/`records`-Document. `DocumentExpander` reads the
Document, iterates the items, spawns a child per item according to
`childTemplate` with `{{ item.text }}` / `{{ record.<field> }}`-
substitution. No LLM call.

`taskSpec`:
```json
{"documentRef": {"path": "essays/outline.md"},
 "treeMode": "FLAT" | "RECURSIVE",
 "childTemplate": {
   "taskKind": "WORKER",
   "goal": "Write chapter: {{ item.text }}",
   "taskSpec": {
     "postActions": [{"tool":"doc_write", "...": "..."}]
   }
 }}
```

## 11. postActions (engine-side persistence)

Worker emits `postActions` as part of the CONCLUDE output.
Engine executes them **deterministically** after VALIDATE PASS —
no LLM tool call, no hallucination risks.

**Supported tools (v1)**:
- `doc_write` — canonical, upsert by path (find → update, else create).
  Required: `path`, `kind`, `content`. See `MarvinEngine.execDocCreate`.

**Arguments**:
- `path` (string, required) — project-relative
- `kind` (string, required) — Document Kind; `"text"` for free-text outputs
- `content` (string, required) — body to write
- `title` (string, optional)

**Pebble Render Context**:
- `{{ node.result }}` — Worker's CONCLUDE Result
- `{{ node.goal }}`
- `{{ node.summary }}` (fallback)
- `{{ process.goal }}` — root process goal
- `{{ process.id }}`
- `| slug` filter — URL-safe slug

**Reserved Path Prefixes** (Engine-owned, must NEVER
be written to): `recipes/`, `_user/`, `_vance/`, `_slart/`,
`_tenant/`, `_zaphod-drafts/`, `_vogon-drafts/`, `_marvin-drafts/`.

## 12. ParentReport (summarizeForParent)

When Marvin runs as a Child Process (typically: Arthur spawns
Marvin via `process_spawn`), it reports to the Parent after `DONE`:

1. Primary: Root-WORKER's `artifacts.result` (this is the final
   CONCLUDE answer).
2. Fallback: Concatenation of the Root-Children-Results with header
   `N of M succeeded`.

Plus `payload` metadata (rootNodeId, nodeCount, failedChildren).

## 13. Recipe Conventions

### 13.1 marvin-worker (`recipes/marvin-worker.yaml`)

The only Worker Recipe — the Engine itself knows its name
as `WORKER_RECIPE_NAME` and uses it implicitly. System Prompt
is located under `prompts/marvin-worker-system.md` (Document Cascade).

### 13.2 Recipe for Marvin Process (`recipes/marvin.yaml`)

Convenience Recipe for `engine: marvin` without further configuration:

```yaml
engine: marvin
params:
  model: default:analyze
  availableRecipes: []      # empty = work directly only
  maxTreeNodes: 200
  maxTreeDepth: 5
  reflectMaxIterations: 3
  validateMaxIterations: 2
  concludeMaxRetries: 2
```

### 13.3 Special Tool Recipes

`web-research`, `analyze`, `code-read`, etc. retain their
native System Prompt. They are NEVER used directly as Marvin-WORKER-
nodes — marvin-worker calls them via CALL_RECIPE.

### 13.4 Slart-Marvin-Architect

Generates Marvin Recipes with:
- `engine: marvin`
- `params.availableRecipes: [recipe1, ...]`
- `promptPrefix` — narrative Goal steering (Pebble Template)
- Optional: `maxTreeDepth`, iteration caps

Three templates (`research-aggregate-write`, `doc-driven-chapters`,
`decide-with-user-input`) cover the most common patterns. Details
in `vance-brain/.../slartibartfast/architect/MarvinArchitect.java`.

## 14. Engine Params (`params:`)

| Param | Default | Description |
|---|---|---|
| `model` | `default:analyze` | LLM model alias |
| `availableRecipes` | `[]` | Whitelist for CALL_RECIPE |
| `maxTreeNodes` | 200 | Global tree size cap |
| `maxTreeDepth` | 5 | NEEDS_SUBTASKS depth cap |
| `reflectMaxIterations` | 3 | REFLECT loop cap per node |
| `validateMaxIterations` | 2 | VALIDATE loop cap per node |
| `concludeMaxRetries` | 2 | CONCLUDE retry cap per node |
| `parseCorrectionMax` | 2 | Parse error correction loop per phase call (see §17) |
| `defaultExecutionMode` | (kind-default) | SEQUENTIAL/PARALLEL for DFS |
| `defaultExecutionModePerKind` | — | Per-TaskKind override |
| `sessionMode` | `false` | Enables chat identity (§20) — tree walk remains unchanged |

## 15. Persistence / Audit

### 15.1 PhaseHistory

Each LLM call creates an entry in `node.phaseHistory`:

```java
record PhaseIteration(
    WorkerPhase phase,
    int iterationIndex,
    String outputJson,       // parsed output, JSON-serialized
    String model,            // "provider:modelName" alias
    @Nullable Integer promptTokens,
    @Nullable Integer completionTokens,
    Instant timestamp)
```

Not displayed in LLM memory — only for UI/Audit/Replay.

### 15.2 CalledSubProcessIds

For CALL_RECIPE, the Sub-Process ID is appended to
`node.calledSubProcessIds`. Reverse lookup via
`MarvinNodeRepository.findByCalledSubProcessIdsContaining`.

### 15.3 Draft Persistence (`_marvin-drafts/`)

Every WORKER node that passes VALIDATE PASS (or Cap-Forced-DONE) with
a substantial `result` automatically writes a Markdown file under:

```
_marvin-drafts/<processId>/<position-path>__<slug>.md
```

`position-path` is the hyphen-separated path of positions
from the root to the node (e.g., `0-1-2` = Root.child[1].child[2]).
`slug` is the slug version of the node's Goal (URL-safe, max 60 chars).

Content: YAML front matter with node metadata (`nodeId`, `taskKind`,
`status`, `currentPhase`, iteration counter, `completedAt`,
`phaseHistory` overview) + raw Markdown result.

Deterministic, engine-side, no LLM tool call. Failures are
logged and ignored — Drafts do not break the Engine.

Usage: Audit & Debugging — an operator can inspect every
intermediate state without digging into Mongo / Chat Logs.

### 15.4 Chat History

Engine also writes CALL_RECIPE replies as USER messages to
the normal Chat History (`ChatMessageService.append`) — best
effort, Inspector/Web UI visibility. Failures are logged
and ignored (the source of truth remains
`node.artifacts.recipeReplies`).

## 16. Plan Snapshot to Progress Channel

At the end of each runTurn, `emitPlanSnapshot` pushes a
`PlanPayload` to the User Progress Side Channel (see
`user-progress-channel.md`). The Web UI renders the tree
live from this. Format: `PlanNode` records with `id`, `kind`, `title`,
`status`, `meta.phase`, `meta.failureReason`, `children`.

## 17. Failure Modes and Limits

| Failure | Detection | Effect |
|---|---|---|
| Phase Parser Error | invalid JSON / missing required fields / unknown enum token (e.g., `NEEDS_MORE_DATA` instead of `NEED_MORE_DATA`) | Correction loop: error returned to LLM, retry until `parseCorrectionMax` (like `StructuredActionEngine` for malformed JSON); only then node FAILED with Parse Error |
| BLOCKED_BY_PROBLEM | LLM emits in SCOPE/REFLECT/POST_CHILDREN | Node FAILED with `problem` |
| HARD_FAIL (VALIDATE) | LLM critique | Node FAILED |
| Cap Exhausted (REFLECT/CONCLUDE) | Counter reaches cap | Forced PROCEED_TO_CONCLUDE / forced markDone |
| Cap Exhausted (VALIDATE) | Counter reaches cap | Forced markDone + Audit Warning |
| `maxTreeNodes` exceeded | runTurn check | Node FAILED, finalizeIdle |
| `maxTreeDepth` reached | POST_CHILDREN check | Forced PROCEED_TO_CONCLUDE |
| CALL_RECIPE on unknown Recipe | RecipeResolver lookup | Failure marker in reply, REFLECT evaluates |
| CALL_RECIPE on marvin Recipe | Engine check | Failure marker, REFLECT evaluates |
| Self-Recursion (same Recipe) | Engine check | Failure marker, REFLECT evaluates |
| Sub-Process FAILED/STOPPED | ProcessEvent | Failure marker in reply, REFLECT evaluates |

## 18. What is deliberately NOT included in v1

- **Per-Child-Supervisor**: Parent gets a mini-Reflect phase after EVERY Child. Tricky to prompt correctly.
- **Different models per phase**: VALIDATE could use a smaller, faster model. Engine param `phaseModels: {validate: "default:fast"}`.
- **Custom Phase Prompts**: Recipe could override phase-specific System Prompts.
- **Marvin-via-CALL_RECIPE**: blocked. v2 could limit and allow Cross-Marvin depth.
- **Streaming output during CONCLUDE**: currently batch reply.
- **NEEDS_USER_INPUT mid-VALIDATE**: currently modeled as HARD_FAIL.

## 19. Example Flow

Goal: "Research nuclear power and write a report."
Recipe: `params.availableRecipes: [web-research]`.

```
Tick 1 (root WORKER, Phase SCOPE):
  LLM sees: Goal, [web-research] available, Plan Snapshot (Root running).
  Output: action=CALL_RECIPE, recipeCall={web-research, "Research Nuclear Power History"}
  → Engine spawns web-research-Sub-Process.

Tick 2 (root WORKER, Phase REFLECT iter 1/3):
  LLM sees: Goal, Plan, "<<< Result of CALL_RECIPE('web-research'): ... >>>".
  Output: action=CALL_RECIPE, recipeCall={web-research, "Research Tech Status"}.
  → Sub-Process #2.

Tick 3 (root WORKER, Phase REFLECT iter 2/3):
  LLM sees: Goal, Plan, 2 Recipe Replies.
  Output: action=PROCEED_TO_CONCLUDE, reason="sufficient material".

Tick 4 (root WORKER, Phase CONCLUDE):
  LLM sees: Goal, Plan, 2 Recipe Replies (in chat history).
  Output: result="# Nuclear Power Report\n...",
          postActions=[{doc_write, path="research/nuclear-power/report.md",
                         kind="text", content="{{ node.result }}"}].

Tick 5 (root WORKER, Phase VALIDATE iter 1/2):
  LLM sees: Goal, Plan, Candidate.
  Output: verdict=PASS, reason="complete and well-structured".

→ markDone(result), runPostActions(write file), Node TERMINAL DONE.
→ Tree terminal → process CLOSED.
→ Parent (Arthur) receives ParentReport with the report text.
```

5 LLM calls total, 2 Recipe calls, one file written. Worker
saw no siblings in the Plan Snapshot → knew it was
responsible alone.

## 20. Session Mode — the Chat Identity

Modelled after Vogon §6 (and before that Hactar): with `params.sessionMode: true`,
the tree walk remains unchanged, but Marvin additionally gains a
chat identity — `MarvinSessionLoop`, a Ford-adapted agent loop
above the node machine. The user speaks in chat **with the supervisor
of the deep-think run**, not with a node: The identity starts and
stops runs, relays open Inbox questions, narrates the terminal result,
and accepts the next Goal. Plan, location, and state:

- **Spawn form is the Parent** (Decision F1): a spawn without
  Parent = Chat form (persisted as `engineParams.chatIdentity: true`) —
  survives run terminals, the terminal result is narrated in chat, the
  next Goal comes via `marvin_start`. A spawn WITH Parent retains the
  headless result contract (REPLY to the Parent, `closeProcess(DONE)`) and
  is merely steerable mid-run.
- **Turn fork** (F3): a drain with chat input goes to the identity —
  the tree step skips this turn (identity's tools take precedence:
  `marvin_stop`, new Goal); everything else is the normal walk. The
  walk itself is split (`walkTreeStep`), headless remains byte-identical.
- **`[tree]` notes** (F3): Tree events (Child DONE/FAILED, open
  questions, Terminal) are only the wake-up trigger — the loop writes the
  permanent copy as a `[tree]` note to the chat history. An agent turn
  that fails due to an LLM error does not lose the result
  (`process_history_text` forensics).
- **Terminal narration instead of Close** (F4): Chat-form tree becomes
  terminal → no `closeProcess(DONE)`, but a wake-up event with the
  full `summarizeForParent` result; the identity narrates it in chat,
  the process parks IDLE. Idempotent via the `claimFinalReplyEmission`
  latch (headless path uses the same), `marvin_start` re-arms it for
  the next run (`resetFinalReplyEmission`).
- **Relay-only for Inbox questions** (F6): if a node parks on
  NEEDS_USER_INPUT, the engine wakes the identity once per question
  (Node flag `chatRelayEmitted`, persisted) — the identity tells the
  user what is being asked; the answer is provided via the Inbox form.
  The identity has no tool that could write the answer, and the
  status block lists open questions in every turn (Re-Assert).
- **Subsequent run rule**: the tree reads ONLY the Goal — its phases are
  memoryless and a chat process has no Parent whose history
  `inheritContext` could read. `marvin_start` therefore requires a
  self-contained Goal; if the user builds on a previous run,
  the identity distills its findings into the new Goal.
- **One run per process** (F2): `marvin_start` refuses if the
  tree is alive; after a terminal, restart is free — the old (terminal)
  tree is deleted (one root per process keeps every node query unique),
  the result lives on as `[tree]` notes + narration.
  `marvin_stop` marks RUNNING/WAITING FAILED / PENDING SKIPPED, stops
  spawned CALL_RECIPE processes, and resolves open Inbox questions UNDECIDABLE
  — Partial remains Partial.

**TodoList Projection** (F8): `updateTreeTodos` projects the tree into
the process TodoList — Item ID = Node ID, open frontier first, Cap 12,
FAILED → COMPLETED (TodoStatus knows no Failed, Zaphod convention).
Mode-independent: the run view shows headless and session the same
frontier. Hook is the runTurn-finally next to the Plan Snapshot.

**Identity Tools** (role-gated to `roles() = ["marvin"]`):
`marvin_start` (Goal mandatory, Overrides `availableRecipes`/`maxTreeNodes`/
`maxTreeDepth` are persisted), `marvin_stop`, `marvin_status`
(full diagnostic report beyond the status block).

**`//marvin state|info`**: read-only diagnosis without Lane Queue — shows the
tree even headless (where there is no identity) and when the
agent turn is stuck.

**Recipe**: `recipes/marvin.yaml` carries `sessionMode: true` (F7) +
`promptDocument: _vance/prompts/marvin-prompt.md`. Prompt:
`prompts/marvin-prompt.md` — supervisor role, relay discipline,
subsequent run rule.

### 20.1 Engine Params (Session Mode only)

| Param | Description |
|---|---|---|
| `sessionMode` | `true` enables the identity; the walk remains unchanged |
| `chatIdentity` | persisted spawn form (F1), written at `start()`. If key is missing: Parent check as fallback |

### 20.2 What v1 deliberately CANNOT do

- **Chat response parser**: a response in chat does NOT fill an Inbox question
  (risk of misunderstanding with ambiguous answers) —
  relay-only, answer via Inbox form.
- **Tree extraction**: `MarvinSessionLoop` is a deliberately lean
  fourth copy of the Session Loop pattern (Ford→Hactar→Vogon→Marvin), not
  a shared extract. An extraction is a separate follow-up step, once
  a fourth engine needs the same pattern.
- **Stop is prompt, not instant**: Node phases run on the same
  Lane as the identity — `marvin_stop` takes effect between phases.

## 20. References

- Plan Doc: `planning/marvin-node-state-machine.md` —
  architectural sketch accompanying development (covers the model).
- Implementation: `vance-brain/.../marvin/MarvinEngine.java`,
  `PlanSnapshotRenderer.java`, `MarvinNodeStateMachine.java`,
  `PhaseOutputParser.java`.
- vance-api: `de.mhus.vance.api.marvin.*` (Records + Enums).
- vance-shared: `MarvinNodeDocument`, `MarvinNodeService`.
- marvin-worker System Prompt: `prompts/marvin-worker-system.md`
  (tenant-overridable in the Document Cascade).
- Slart-Marvin-Architect Manual:
  `manuals/slartibartfast/marvin-architect/SHAPE.md`.
- Tests: `vance-brain/.../marvin/PlanSnapshotRendererTest`,
  `PhaseOutputParserTest`, `MarvinNodeStateMachineTest`;
  `qa/ai-test/.../ArthurMarvinRecipeTest`,
  `SlartibartfastMarvinRecipeLlmTest`.
- Session Mode: `planning/marvin-agent-identity.md` (Decisions
  F1–F8), `vance-brain/.../marvin/MarvinSessionLoop.java`,
  `MarvinStartTool`/`MarvinStopTool`/`MarvinStatusTool`,
  `command/MarvinCommandHandler.java`; Tests
  `MarvinEngineSessionTest`, `MarvinSessionLoopSplitInboxTest`,
  `MarvinStartToolTest`, `MarvinTreeTodoProjectionTest`,
  `MarvinCommandHandlerTest`.
