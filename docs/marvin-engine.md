---
title: "Vance — Marvin Think Engine"
parent: Documentation
permalink: /docs/marvin-engine
---

<!-- AUTO-GENERATED from specification/public/en/marvin-engine.md — do not edit here. -->

---
# Vance — Marvin Think Engine

> **Marvin** is the **deep-think** Engine. It builds a
> dynamic, persistent Task-Tree, where each node is an
> **autonomous marvin-worker**. Each node goes through a
> deterministic 5-phase state machine
> (`SCOPE → REFLECT → POST_CHILDREN → CONCLUDE → VALIDATE`).
> The plan IS the tree — there is no separate plan structure;
> before each LLM call, the Engine renders a live view
> of the tree as context. Brain the size of a planet, and for once
> it's allowed to use it on the actual problem.
>
> See also: [think-engines](/docs/think-engines) | [arthur-engine](/docs/arthur-engine) | [vogon-engine](/docs/vogon-engine) | [user-interaction](/docs/user-interaction) | [recipes](/docs/recipes)

---

## 1. Role and Classification

Marvin v2 differs structurally from the other Engines:

| Engine | Data Model | Character |
|---|---|---|
| `arthur` | Chat History (linear) | Reactive Session-Chat |
| `ford` | Chat History (linear) | Generalist-Worker, one question → one answer |
| `vogon` | State Machine + Strategy-State (static) | Deterministic Multi-Phase Plan |
| **`marvin`** | **Task-Tree (dynamically growing, Mongo-persistent)** | **Autonomous Worker-Nodes with 5-Phase Lifecycle** |

Marvin's Use Cases:

- "Research nuclear power and write me a report" — Root-Worker
  decomposes by aspects (History / Tech / Ecology), calls
  `web-research` via CALL_RECIPE, synthesizes.
- "Analyze these 5 PDFs for contradictions" — Worker spawns
  per-PDF-Children, each loads its PDF, then POST_CHILDREN
  synthesizes.
- "Plan and implement Feature X" — Worker decomposes into
  Requirements Analysis → Design → Tasks per component.

What Marvin is **not**:

- Not a Chat Orchestrator (that's Arthur)
- Not a State Machine Runner with fixed phases (that's Vogon)
- Not a Generalist-Worker with Tool-Loop (that's Ford) — Marvin **calls**
  specialized Recipes via CALL_RECIPE; it plans,
  reflects, validates itself.

## 1.1 v1 → v2 Transition

Marvin v2 is a **complete rewrite**. What has changed:

| v1 | v2 |
|---|---|
| TaskKinds: PLAN, WORKER, EXPAND_FROM_DOC, USER_INPUT, AGGREGATE | TaskKinds: WORKER, EXPAND_FROM_DOC, USER_INPUT |
| PLAN-Node decomposed the entire plan upfront | Root is a WORKER, the plan grows successively |
| AGGREGATE-Node synthesized siblings | POST_CHILDREN phase of the Parent synthesizes |
| `WORKER_SCHEMA_POSTFIX` on all Workers | Phase-Schemas per LLM-Call; Special-Recipes unchanged |
| `allowedSubTaskRecipes` / `recipesOnlyViaExpand` | `availableRecipes` (CALL_RECIPE-Whitelist) |
| Static plan in JSON schemas, KIND-Blocks in Prompts | Dynamic plan snapshot as live view, no KIND-boilerplate |

The trigger for the rewrite was a recurring live observation
(2026-05-24): specialized Workers (web-research, analyze, …)
to which the Marvin-Output-Contract was appended, reproducibly
chose `NEEDS_SUBTASKS` as an easy way out, instead of
completing their specific mandate. An LLM personality cannot
reliably be "specialized Worker + Routing Decision-Maker" in
one response. The separation into **marvin-worker** (Orchestrator)
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

Plus Action-Enums: `ScopeAction`, `ReflectAction`,
`PostChildrenAction`, `ValidateVerdict`.

Plus Helper-Records: `RecipeCall`, `NewTaskSpec`, `UserInputSpec`,
`PostActionSpec`, `PhaseIteration`.

## 3. Lifecycle

`MarvinEngine` implements `ThinkEngine`. Lifecycle:

```
start  → createRoot(WORKER) + scheduleTurn
runTurn → drainPending → findNextActionableNode → executeNode → idle
steer  → scheduleTurn  (Marvin async, no synchronous Reply)
stop   → closeProcess(STOPPED)
```

**Important**: Marvin's `asyncSteer() = true`. Parent-Engines (Arthur,
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

WORKER-Nodes go directly from PENDING → RUNNING; they remain RUNNING
during the phase loop.

**Important — no WAITING phase for NEEDS_SUBTASKS-Parents.**
After NEEDS_SUBTASKS, the Engine marks the Parent as DONE with
`awaitingPostChildren=true`. DONE is DFS-transparent — the
walker descends into the newly spawned Children. As soon as all
Children are terminal, the `reactivatePostChildrenParents`-
Sweeper at the top of each runTurn resets the Parent to
`PENDING + currentPhase=POST_CHILDREN`. The next DFS-Pick
then drives it through POST_CHILDREN → CONCLUDE → VALIDATE.

WAITING only exists for `USER_INPUT`-Nodes (Inbox-Item
spawned, waiting for response).

## 5. The Five Phases

Each WORKER-Node goes through these phases in exactly this
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

First LLM call. Sees: Goal, availableRecipes list, Live-Plan-
Snapshot. Immediately decides the initial move.

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
Sees Goal + Plan + previous Recipe-Replies (each as
`<<< Result of CALL_RECIPE('...'): … >>>` blocks).

Schema identical to SCOPE (same Actions). If Cap exhausted
(3 CALL_RECIPEs already run) → forced PROCEED_TO_CONCLUDE.

### 5.3 POST_CHILDREN — children-fanout synthesis

Reached after NEEDS_SUBTASKS, as soon as **all** Children are terminal.
Sees Plan-Snapshot + explicit Children-Results-Block.

**Output**:
```json
{"action": "PROCEED_TO_CONCLUDE" | "NEEDS_SUBTASKS" | "BLOCKED_BY_PROBLEM",
 "newTasks": [...],
 "problem":  "...",
 "reason":   "..."}
```

NEEDS_SUBTASKS here only allowed if Tree-Depth < `maxTreeDepth`
(default 5). Otherwise forced PROCEED_TO_CONCLUDE.

### 5.4 CONCLUDE — final answer

Synthesis phase. Produces the candidate result + optional
engine-side postActions.

**Output**:
```json
{"result":     "<complete Markdown response>",
 "postActions": [{"tool":"doc_create",
                  "args":{"path":"...","kind":"text","content":"&#123;{ node.result }}"}}],
 "reason":     "..."}
```

CONCLUDE may go through up to **2 Retries** (RETRY_CONCLUDE-
Verdict from VALIDATE).

### 5.5 VALIDATE — critical review

Fresh LLM call with critical prompt. Sees Goal + Candidate-
Result + Plan-Snapshot. Cap: **2 iterations per node**.

**Output**:
```json
{"verdict": "PASS" | "RETRY_CONCLUDE" | "NEED_MORE_DATA" | "HARD_FAIL",
 "issues":  ["<problem 1>", "<problem 2>"],
 "hint":    "<what to improve>",
 "reason":  "..."}
```

**Verdict-Routing**:
- `PASS` → markDone(candidate) + runPostActions → TERMINAL DONE
- `RETRY_CONCLUDE` → back to CONCLUDE; `issues`+`hint` as
  Memory-Hint. If `concludeRetries` < 2.
- `NEED_MORE_DATA` → back to REFLECT with `hint`. If
  `reflectIter` < cap.
- `HARD_FAIL` → markFailed → TERMINAL FAILED. **HARD_FAIL wins
  against Cap-Forced-DONE** — at iter 2 with HARD_FAIL, it remains
  FAILED.

If `validateIter` >= cap: forced markDone(last Candidate) +
Audit-Warning.

### 5.6 Iteration-Cap Overview

| Phase | Cap | On Cap Hit |
|---|---|---|
| SCOPE | 1 | — |
| REFLECT | 3 CALL_RECIPEs | forced PROCEED_TO_CONCLUDE |
| POST_CHILDREN | 1 + (tree-depth bounded NEEDS_SUBTASKS) | forced PROCEED_TO_CONCLUDE |
| CONCLUDE | 1 initial + 2 Re-Conclude | last Candidate accepted |
| VALIDATE | 2 | see §5.5 |

**Worst-Case LLM-Calls per node**: 1+3+1+3+2 = **10 Calls**.
**Best-Case**: 1+1+1 = **3 Calls** (SCOPE→CONCLUDE→VALIDATE PASS).
**Typical**: 1+1+1+1 = **4 Calls** (with 1 Recipe-Call).

## 6. Plan-Snapshot — the dynamic Plan

The **Tree IS the Plan**. There is no separate Plan data structure.
Before each LLM call, `PlanSnapshotRenderer` (vance-brain)
renders a compact text view from the Mongo nodes.

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
- Hard-Cap: **4000 chars total**

### 6.2 Pruning for Large Trees

If the full render would be > 4000 chars, prune as follows:
1. Path-to-root: full
2. Direct siblings: full with Summary
3. Own children: full with Summary
4. Distant branches: `#3.2 (+ 5 subtasks, 4 DONE, 1 planned)`

### 6.3 Memory Rotation

Plan-Snapshots are **ephemeral**. The `MarvinEngine`
assembles the LLM-Memory fresh for each call from:
- System-Prompt (static marvin-worker-System-Prompt)
- Phase-Control-User-Message **with current Plan-Snapshot
  embedded**

Previous Reasoning-Turns (Assistant responses, Recipe-Replies)
remain in the persistent Chat-History; they are not
patched between turns with outdated Plan-Snapshots.

### 6.4 SCOPE-Prompt Instruction for the Plan

The System-Prompt explicitly states:

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
   Otherwise Failure-Marker in the Reply.
2. **Block: marvin-via-CALL_RECIPE**. If the called Recipe
   has `engine: marvin` → Reject. Prevents unbounded
   Cross-Marvin-Nesting in v1.
3. **Block: Self-Recursion**. If the called Recipe is identical
   to the running Marvin-Recipe → Reject.
4. Engine synchronously spawns a Sub-Process with `recipeCall.recipe`
   and `recipeCall.steerContent` as initial steer.
5. **Special-Recipes run in native mode** — the Marvin-Phase-
   Contract is NOT layered on top.
6. Engine waits until Sub-Process CLOSED (DONE/STOPPED/FAILED).
7. Engine reads the last Assistant-Text, appends it as
   USER-Message to marvin-worker's Memory (hard-truncated at
   `recipeReplyTruncateChars`, default 8000):

```
<<< Result of CALL_RECIPE('web-research'):
<reply text>
[truncated; full reply persisted in sub-process history]
>>>
```

8. Engine triggers next LLM-Turn in Phase REFLECT.

## 8. NEEDS_SUBTASKS Mechanism

For SCOPE / REFLECT / POST_CHILDREN `NEEDS_SUBTASKS`:

1. Engine appends `newTasks` as WORKER-Children (or
   EXPAND_FROM_DOC, USER_INPUT) under the node.
2. Node is marked **DONE** with `awaitingPostChildren=true`
   and `artifacts.spawnedChildren=<count>`. DONE is
   DFS-transparent — the walker descends into the Children.
   (If the node were set to WAITING, the DFS
   would block and never reach the Children — see §4.)
3. Marvin's DFS processes Children pre-order. Each Child
   goes through its own 5-phase state machine.
4. At the top of each `runTurn`, `reactivatePostChildrenParents` runs:
   finds DONE-nodes with `awaitingPostChildren=true` whose
   Children are all terminal, resets them to
   `PENDING + currentPhase=POST_CHILDREN`, clears the flag.
5. The next DFS-Pick drives the re-activated Parent through
   POST_CHILDREN → CONCLUDE → VALIDATE → DONE.

**Tree-Depth-Cap**: NEEDS_SUBTASKS from POST_CHILDREN only allowed
if current depth < `maxTreeDepth`. Otherwise forced
PROCEED_TO_CONCLUDE.

## 9. NEEDS_USER_INPUT Mechanism

For SCOPE / REFLECT `NEEDS_USER_INPUT`:

1. Engine inserts a `USER_INPUT`-node as a sibling directly
   after the current node (`insertSiblingAfter`).
2. Current node goes DONE with `artifacts.awaitingUserInputNode`.
3. The `USER_INPUT`-node goes to RUNNING in the next runTurn
   (`runUserInput`), creates the Inbox-Item, parks in WAITING.
4. When the User response arrives (`InboxAnswer`-Event),
   `handleInboxAnswer` closes the node DONE.
5. Marvin's DFS continues through the tree.

## 10. EXPAND_FROM_DOC

Unchanged from v1. Deterministic fanout from a
`list`/`tree`/`records`-Document. `DocumentExpander` reads the
Document, iterates items, spawns a child per item according to
`childTemplate` with `&#123;{ item.text }}` / `&#123;{ record.<field> }}`-
substitution. No LLM call.

`taskSpec`:
```json
{"documentRef": {"path": "essays/outline.md"},
 "treeMode": "FLAT" | "RECURSIVE",
 "childTemplate": {
   "taskKind": "WORKER",
   "goal": "Write chapter: &#123;{ item.text }}",
   "taskSpec": {
     "postActions": [{"tool":"doc_create", "...": "..."}]
   }
 }}
```

## 11. postActions (engine-side persistence)

Worker emits `postActions` as part of the CONCLUDE-Output.
Engine executes them **deterministically** after VALIDATE PASS —
no LLM-Tool-Call, no hallucination risks.

**Supported tools (v1)**:
- `doc_create` — canonical, upsert by path (find → update, else create).
  Required: `path`, `kind`, `content`. See `MarvinEngine.execDocCreate`.

**Arguments**:
- `path` (string, required) — project-relative
- `kind` (string, required) — Document-Kind; `"text"` for free-text outputs
- `content` (string, required) — body to write
- `title` (string, optional)

**Pebble-Render-Context**:
- `&#123;{ node.result }}` — Worker's CONCLUDE-Result
- `&#123;{ node.goal }}`
- `&#123;{ node.summary }}` (fallback)
- `&#123;{ process.goal }}` — root process goal
- `&#123;{ process.id }}`
- `| slug` filter — URL-safe slug

**Reserved Path-Prefixes** (Engine-owned, must NEVER
be written): `recipes/`, `_user/`, `_vance/`, `_slart/`,
`_tenant/`, `_zaphod-drafts/`, `_vogon-drafts/`, `_marvin-drafts/`.

## 12. ParentReport (summarizeForParent)

When Marvin runs as a Child-Process (typically: Arthur spawns
Marvin via `process_create`), it reports to the Parent after `DONE`:

1. Primary: Root-WORKER's `artifacts.result` (this is the final
   CONCLUDE-response).
2. Fallback: Concatenation of the Root-Children-Results with Header
   `N of M succeeded`.

Plus `payload`-metadata (rootNodeId, nodeCount, failedChildren).

## 13. Recipe Conventions

### 13.1 marvin-worker (`recipes/marvin-worker.yaml`)

The only Worker-Recipe — the Engine itself knows its name
as `WORKER_RECIPE_NAME` and uses it implicitly. System-Prompt
is located under `prompts/marvin-worker-system.md` (Document-Cascade).

### 13.2 Recipe for Marvin-Process (`recipes/marvin.yaml`)

Convenience-Recipe for `engine: marvin` without further configuration:

```yaml
engine: marvin
params:
  model: default:analyze
  availableRecipes: []      # empty = only direct work
  maxTreeNodes: 200
  maxTreeDepth: 5
  reflectMaxIterations: 3
  validateMaxIterations: 2
  concludeMaxRetries: 2
```

### 13.3 Special Tool Recipes

`web-research`, `analyze`, `code-read`, etc. retain their
native System-Prompt. They are NEVER used directly as Marvin-WORKER-
Nodes — marvin-worker calls them via CALL_RECIPE.

### 13.4 Slart-Marvin-Architect

Generates Marvin-Recipes with:
- `engine: marvin`
- `params.availableRecipes: [recipe1, ...]`
- `promptPrefix` — narrative Goal-steering (Pebble-Template)
- Optional: `maxTreeDepth`, Iteration-Caps

Three templates (`research-aggregate-write`, `doc-driven-chapters`,
`decide-with-user-input`) cover the most common patterns. Details
in `vance-brain/.../slartibartfast/architect/MarvinArchitect.java`.

## 14. Engine-Params (`params:`)

| Param | Default | Description |
|---|---|---|
| `model` | `default:analyze` | LLM-Model-Alias |
| `availableRecipes` | `[]` | Whitelist for CALL_RECIPE |
| `maxTreeNodes` | 200 | Global Tree-Size-Cap |
| `maxTreeDepth` | 5 | NEEDS_SUBTASKS-Depth-Cap |
| `reflectMaxIterations` | 3 | REFLECT-Loop-Cap per node |
| `validateMaxIterations` | 2 | VALIDATE-Loop-Cap per node |
| `concludeMaxRetries` | 2 | CONCLUDE-Retry-Cap per node |
| `defaultExecutionMode` | (kind-default) | SEQUENTIAL/PARALLEL for DFS |
| `defaultExecutionModePerKind` | — | Per-TaskKind override |

## 15. Persistence / Audit

### 15.1 PhaseHistory

Each LLM-Call creates an entry in `node.phaseHistory`:

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

Not displayed in LLM-Memory — only for UI/Audit/Replay.

### 15.2 CalledSubProcessIds

For CALL_RECIPE, the Sub-Process-Id is appended to
`node.calledSubProcessIds`. Reverse-Lookup via
`MarvinNodeRepository.findByCalledSubProcessIdsContaining`.

### 15.3 Draft Persistence (`_marvin-drafts/`)

Every WORKER-Node that passes VALIDATE (or Cap-Forced-DONE) with
substantial `result` automatically writes a
Markdown file under:

```
_marvin-drafts/<processId>/<position-path>__<slug>.md
```

`position-path` is the hyphen-separated path of positions
from the root to the node (e.g., `0-1-2` = Root.child[1].child[2]).
`slug` is the slug-version of the node's Goal (URL-safe, max 60 chars).

Content: YAML-Front-Matter with node metadata (`nodeId`, `taskKind`,
`status`, `currentPhase`, Iteration-Counter, `completedAt`,
`phaseHistory`-overview) + raw Markdown-Result.

Deterministic, engine-side, no LLM-Tool-Call. Failures are
logged and ignored — Drafts do not break the Engine.

Usage: Audit & Debugging — an operator can inspect every
intermediate state without digging into Mongo / Chat-Logs.

### 15.4 Chat-History

Engine also writes CALL_RECIPE-Replies as USER-Messages to
the normal Chat-History (`ChatMessageService.append`) — best
effort, Inspector-/Web-UI-visibility. Failures are logged
and ignored (the source of truth remains
`node.artifacts.recipeReplies`).

## 16. Plan-Snapshot to Progress-Channel

At the end of each runTurn, `emitPlanSnapshot` pushes a
`PlanPayload` to the User-Progress-Side-Channel (see
`user-progress-channel.md`). The Web-UI renders the tree
live from this. Format: `PlanNode`-Records with `id`, `kind`, `title`,
`status`, `meta.phase`, `meta.failureReason`, `children`.

## 17. Failure Modes and Limits

| Failure | Detection | Effect |
|---|---|---|
| Phase-Parser-Error | invalid JSON / missing mandatory fields | Node FAILED with Parse-Error |
| BLOCKED_BY_PROBLEM | LLM emits in SCOPE/REFLECT/POST_CHILDREN | Node FAILED with `problem` |
| HARD_FAIL (VALIDATE) | LLM-Critique | Node FAILED |
| Cap-Exhausted (REFLECT/CONCLUDE) | Counter reaches Cap | Forced PROCEED_TO_CONCLUDE / forced markDone |
| Cap-Exhausted (VALIDATE) | Counter reaches Cap | Forced markDone + Audit-Warning |
| `maxTreeNodes` exceeded | runTurn-Check | Node FAILED, finalizeIdle |
| `maxTreeDepth` reached | POST_CHILDREN-Check | Forced PROCEED_TO_CONCLUDE |
| CALL_RECIPE on unknown Recipe | RecipeResolver-Lookup | Failure-Marker in Reply, REFLECT evaluates |
| CALL_RECIPE on marvin-Recipe | Engine-Check | Failure-Marker, REFLECT evaluates |
| Self-Recursion (same Recipe) | Engine-Check | Failure-Marker, REFLECT evaluates |
| Sub-Process FAILED/STOPPED | ProcessEvent | Failure-Marker in Reply, REFLECT evaluates |

## 18. What is deliberately NOT included in v1

- **Per-Child-Supervisor**: Parent gets a mini-Reflect-Phase after EVERY Child.
  Tricky to prompt correctly.
- **Different Models per Phase**: VALIDATE could use a smaller,
  faster model. Engine-Param `phaseModels: {validate: "default:fast"}`.
- **Custom Phase-Prompts**: Recipe could override phase-specific
  System-Prompts.
- **Marvin-via-CALL_RECIPE**: blocked. v2 could limit and allow
  Cross-Marvin-Depth.
- **Streaming-Output during CONCLUDE**: currently batch-Reply.
- **NEEDS_USER_INPUT mid-VALIDATE**: currently modeled as HARD_FAIL.

## 19. Example Flow

Goal: "Research nuclear power and write a report."
Recipe: `params.availableRecipes: [web-research]`.

```
Tick 1 (root WORKER, Phase SCOPE):
  LLM sees: Goal, [web-research] available, Plan-Snapshot (Root running).
  Output: action=CALL_RECIPE, recipeCall={web-research, "Research Nuclear Power History"}
  → Engine spawns web-research-Sub-Process.

Tick 2 (root WORKER, Phase REFLECT iter 1/3):
  LLM sees: Goal, Plan, "<<< Result of CALL_RECIPE('web-research'): ... >>>".
  Output: action=CALL_RECIPE, recipeCall={web-research, "Research Tech Status"}.
  → Sub-Process #2.

Tick 3 (root WORKER, Phase REFLECT iter 2/3):
  LLM sees: Goal, Plan, 2 Recipe-Replies.
  Output: action=PROCEED_TO_CONCLUDE, reason="sufficient material".

Tick 4 (root WORKER, Phase CONCLUDE):
  LLM sees: Goal, Plan, 2 Recipe-Replies (in chat history).
  Output: result="# Nuclear Power Report\n...",
          postActions=[{doc_create, path="research/nuclear-power/report.md",
                         kind="text", content="&#123;{ node.result }}"}].

Tick 5 (root WORKER, Phase VALIDATE iter 1/2):
  LLM sees: Goal, Plan, Candidate.
  Output: verdict=PASS, reason="complete and well-structured".

→ markDone(result), runPostActions(write file), Node TERMINAL DONE.
→ Tree terminal → process CLOSED.
→ Parent (Arthur) receives ParentReport with the report text.
```

5 LLM-Calls total, 2 Recipe-Calls, one file written. Worker
saw no siblings in the Plan-Snapshot → knew it was solely responsible.

## 20. References

- Plan-Doc: `planning/marvin-node-state-machine.md` — development-
  accompanying architectural sketch (covers the model).
- Implementation: `vance-brain/.../marvin/MarvinEngine.java`,
  `PlanSnapshotRenderer.java`, `MarvinNodeStateMachine.java`,
  `PhaseOutputParser.java`.
- vance-api: `de.mhus.vance.api.marvin.*` (Records + Enums).
- vance-shared: `MarvinNodeDocument`, `MarvinNodeService`.
- marvin-worker-System-Prompt: `prompts/marvin-worker-system.md`
  (overridable by tenant in Document-Cascade).
- Slart-Marvin-Architect-Manual:
  `manuals/slartibartfast/marvin-architect/SHAPE.md`.
- Tests: `vance-brain/.../marvin/PlanSnapshotRendererTest`,
  `PhaseOutputParserTest`, `MarvinNodeStateMachineTest`;
  `qa/ai-test/.../ArthurMarvinRecipeTest`,
  `SlartibartfastMarvinRecipeLlmTest`.
