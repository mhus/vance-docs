---
title: "Vancetope — Benjy Think Engine"
parent: Specs
permalink: /specs/benjy-engine
---

<!-- AUTO-GENERATED from llm/specification/benjy-engine.md (translated from the German specification/public/benjy-engine.md) — do not edit here. -->

# Vancetope — Benjy Think Engine

> **Benjy** is the **iterative orchestration engine for small /
> local models**. It carries the loop control within the **Engine**:
> state, verification, retries, and escalation are deterministic
> code; the model is called only at narrow, schema-bound edges —
> Decide (interpret / route), Do (a fresh Ford worker per item),
> Evaluate (evaluate / reflect).
>
> Where Frankie is the **LM-Agency** variant (the model controls the
> loop itself), Benjy is the **Engine-Agency** variant for setups
> whose models cannot maintain loop discipline. Codename after
> H2G2: Frankie and Benjy are the two lab mice — two
> coding workers, a sibling pair.
>
> Design plan and history (22 decisions with justifications,
> discarded variants): `planning/benjy-engine.md`. Implementation:
> `readme/benjy-engine.md`.
>
> See also: [think-engines](/specs/think-engines) | [frankie-engine](/specs/frankie-engine) | [ford-engine](/specs/ford-engine) | [light-llm-service](/specs/light-llm-service) | [recipes](/specs/recipes)

---

## 1. Role and Classification

| Engine | Agency | Model Assumption | Stop |
|---|---|---|---|
| `arthur` | LLM (conversational) | large — Hub maintains thread | never DONE |
| `frankie` | **LM-Agency** — model controls loop | large — loop discipline in model | natural / terminate / safety-net |
| `marvin` | Upfront-Plan-Tree | large (PLAN call upfront) | DONE when Root completes |
| `vogon` | frozen plan, does not think itself | n/a (judgments = spawned workers) | Plan end |
| **`benjy`** | **Engine-Agency, LLM-validated transitions** | **small/local — discipline in the Engine** | **DONE when Reflection Gate `achieved: yes`** |

**Use Cases:**

- **Iterative tasks with verifiable results** —
  `benjy-coding`: delegate item work to Ford-Doer, mechanically
  verify (Build/Test/Lint as Ground Truth), evaluate against criteria,
  reflect against the goal at the end.
- **Setups without a large model**: all calls run small — the
  Engine degrades gracefully (menu selection instead of planning, retry instead
  of escalation, mechanical fallbacks instead of Route-LLM).

**Three distinguishing sentences** (which every reviewer asks):

- *Why not a `benjy` Recipe on Frankie?* Because Frankie has LM-Agency:
  a small model still **decides** itself when it is overwhelmed.
  The difference is structural (where the loop resides), not parametric —
  Engine vs. Recipe applies correctly here.
- *Why not Marvin with a small model?* Marvin requires a
  large structured PLAN call upfront — exactly what small
  models cannot reliably do. Benjy interprets minimally
  (bound initial batch, `maxInitialItems`) and decomposes
  incrementally at branches.
- *Why not Vogon?* Vogon executes a pre-written,
  frozen plan and does not think itself. Benjy thinks at the
  transitions (Route/Eval are LightLm calls of the Engine), its
  items are runtime data. Combination: Vogon phase can
  delegate `agent_task` with Recipe `benjy-coding` micro-iteration.

## 2. Core Principle

> **Frankie carries loop control in the model. Benjy carries it in
> the Engine.** Mechanics (state, verification, retries, escalation)
> are deterministic code; the model is called only at narrow,
> schema-bound edges.

Consequences:

- Each controller call is a **LightLm single-shot with schema**
  (`callForJson`, Jeltz retry loop) — no tool use, no spawn per
  judgment (unlike Vogon, where each judgment is a worker).
- Each doing call starts with **pristine, tiny context**:
  one item per Ford-Doer spawn; a retry is a **new** spawn
  with error context in the prompt, never a re-steer (worker history
  does not grow).
- **Two-stage evaluation**: mechanical verification first
  (facts, no LLM), LLM-Eval only for the non-mechanizable —
  and Doing small/cheap (many calls), Eval large allowed (few
  calls; one wrong judgment burns all savings).
- **"Well solved" is a verifiable list at all times** in the
  Process-Doc: the Interpret call defines goal interpretation and
  acceptance criteria; everything that follows is measured against it.

## 3. Architecture: The Task Queue is the State

Benjy's state is a **persisted FIFO queue of Tasks** in
`engineParams.benjyState`; every LLM call, every worker spawn, every
check is a Task. The loop: `pop → dispatch → Result-Handler
enqueued successor`.

```
┌─ INTERPRET  LightLm: Goal → taskType, criteria, first item batch
├─ DO         Spawn Ford-Doer (async) → IDLE; Reply wakes the Lane
├─ CHECK      exec_run over WorkTarget (Ground Truth, no LLM)
├─ EVALUATE   LightLm: Item-Result vs criteria → pass|fail|needs_change
├─ CLOSE      Mechanics: Close item, Todos projection
├─ REFLECT    LightLm: Goal level — achieved? (Gate before DONE)
├─ ROUTE      LightLm: ONLY at branches → Queue operations
└─ DONE       Mechanics: Final synthesis, closeProcess(DONE)
```

**Where the intelligence resides:**

- **Happy-path successors are mechanics** — Chain template per
  `taskType` (§4): `do → check → evaluate → close` for coding etc.
  Eval-`fail` is a **mechanical retry** with error context up to
  the attempt cap — no Route call.
- **Route fires only at branches**: Check failed,
  Item cap reached, new inbound message, Reflect gaps, Queue empty
  with open items. Route **emits Queue operations**
  (`retry | split | revise | escalate | ask_parent | done | reset |
  blocked`), there is no abstract action type.
- **Persistence order** (crash consistency): each Queue transition
  is first atomically persisted in `benjyState` (a Mongo doc),
  only then do side effects run (Todos projection, Journal,
  Spawn). Queue and Items are authority; Todos and Journal are
  projections and regenerate from the replayed
  Result handling. Stop/Restart anytime: Resume = continue popping.

**Async boundaries**: A `do` task spawns the Doer (parented to Benjy)
and ends the turn (Status IDLE). The Doer's response comes as
`SteerMessage.Reply` via the Pending-Queue and wakes the Lane
(Auto-Wakeup); the Reply handler enqueues the rest of the item's chain.
`ask_parent` parks on BLOCKED — the question runs as a ProcessEvent
to the Parent, the answer comes as a Steer back into the drain.

**Inbound → Queue operations** (two layers, one translation point;
drained at the cycle edge):

| Inbound | Queue Operation |
|---|---|
| First User Message (Goal) | Set Goal, Interpret enqueued |
| Message during run | Route Task with the message |
| Answer to `ask_parent` | Question cleared, Route Task with the answer |
| Reply of in-flight Doer | Rest of chain enqueued, Doer closed |
| Terminal event of Doer without Reply | Route Task (Worker ended before reply) |
| Everything else (ToolResult, PeerEvent …) | ignored (logged) |

## 4. Chain Templates and Features

Verification stages apply per `taskType` (§4c classification —
the Interpret call provides `taskType` as a field, no separate call):

| taskType | Chain | Per-Item-Eval |
|---|---|---|
| `info` | `do → close` | no |
| `coding` | `do → check → evaluate → close` | yes |
| `planning` / `analysis` | `do → evaluate → close` | yes (quality) |

Features are **Recipe configuration** (mechanics fixed, semantics as
feature, composition in the Recipe):

```yaml
params:
  doRecipe: benjy-do-coding            # Required
  taskTypes: [info, coding, planning, analysis]
  features:
    interpret:   { recipe: benjy-interpret }    # Required
    route:       { recipe: benjy-route }         # off = mechanical fallback policy
    check:       { command: "mvn test" }          # off = no mechanical verification
    evaluate:    { recipe: benjy-evaluate }
    reflect:     { recipe: benjy-reflect }        # off = DONE when queue empty
    escalation:  { recipe: coding }               # Delegation to Frankie
  criteriaSources: [{ ref: "req/checkliste.yaml" }]   # optional
  maxStagnation: 15         # Safety-Net, see §6 — Tasks without progress, not volume
  maxReflectNo: 3           # Convergence cap, see §6 — reflect verdicts without DONE
  maxItemAttempts: 3
  maxWallclockMinutes: 30
  maxTokens: 2000000
  maxToolCalls: 15          # → Doer-maxIterations (Tool budget per item)
  maxInitialItems: 5        # structural cap per item batch (#23)
  workTarget: { kind: WORK }
```

Rules:

- **Fail-fast at first loop entry**: unknown feature keys,
  unknown TaskTypes, missing Interpret/Do-Recipe message with
  clear message — Recipe snapshot semantics as everywhere.
- Disabled stages **fall out of the chain** — the chain
  never references an inactive stage. `route: false` is the
  cheap mode ("Vogon-light for dynamic item lists"): Retry until
  cap → escalation → BLOCKED, purely mechanical.
- `criteriaSources`: Documents (Brain) are injected via `doc_read`;
  each criterion optionally carries `sourceRef`
  (traceability). The plan decides per criterion: item
  or end-check.
- `maxToolCalls` is the tool budget per item (#16): `>0` cap,
  iteration belongs to Benjy, not the Doer.
- `maxInitialItems` is the **structural item batch cap** (#23):
  interpret-`initialItems` as well as route-`split`/`revise`-items are
  capped to this value (truncate + journal entry — never silent; cap < 1
  = explicitly "no cap"). This number replaces the previous purely
  prompt-based minimal rule ("first 1–3 items"): the form of the question
  limits the form of the answer. The remainder of a larger task
  comes via reflect-gaps → route-split later — with the facts of the
  previous items in the digest. Default 5 instead of 3, because reflect is the
  continuation organ and a premature-DONE is the more expensive error;
  those who know the structure of a task raise the value. Per-task `thinking`
  (Reasoning-Level) can set the Route; small local models
  automatically degrade to OFF via capability downgrade.
- **Variants are Recipe configuration** — mechanics remain, only
  Doer and stage set change. Bundled: `benjy-coding` (full
  pipeline, check-Command pins the project), `benjy-research`
  (Research-Doer `benjy-do-research` via `research_*`-tools,
  taskTypes info/planning/analysis), `benjy-batch` (route-off
  cheap mode, `maxInitialItems: 10` — structure from the
  task text). Project-specific variants arise as
  Project-Recipe or via Slart (`benjy-architect`,
  `OutputSchemaType.BENJY_RECIPE`): the Architect validates against
  the same `BenjyFeatureConfig` fail-fast and resolves every
  reference — a broken variant Recipe fails at the authoring
  gate, not only at the first loop entry.

## 5. State Model: `benjyState` and Chat Memory

**Two memories with different protection needs** (only one is compactable):

| | where | why |
|---|---|---|
| **Machine data**: Queue, Items, Criteria, Counters, in-flight-Worker-Ref, taskType | `engineParams.benjyState` (structured) | Compaction must **never** touch it — a compacted counter is a deleted counter; after resume, the machine must continue exactly |
| **Knowledge**: Route decisions with `reason`, Check facts, Eval verdicts, Doer summaries, **Dialog** | **own Process Chat History** | Compactable **intentionally**; the digest renders bounded anyway |

The Chat History is **a chronological thread with three
entry types** (Journal + Dialog, one medium):

- **Journal entries** (engine-written): short task records
  (type, item ref, result), always end with the **open remainder**
  (worklist from the queue — lab book principle; older worklist blocks
  are history). Formatted as **Markdown** — both interfaces
  render it (Web: MarkdownView, foot: MarkdownAnsiRenderer), and
  nothing parses the journal back, so style is free: record header
  (stage + item ref, up to the first `": "`) bold, worklist as
  `**Open:**` line with inline code chips (`·`-separated).
- **User turns** (Framework): Spawn-Goal as first message, each
  Steer message in **raw wording** — the journal summarizes,
  the dialog must not ("things in sequence" needs the wording).
- **Assistant turns** (engine-written): ask_parent question,
  BLOCKED diagnoses, final synthesis.

The LLM **never** writes itself. Execution authority remains the
Queue; the journal is never parsed back.

**Todos as projection** (§9): Benjy uses `TodoItem` /
`ThinkProcessService.addTodos|updateTodos|removeTodos` with the same
server IDs (sequential, never reused). The service only persists —
the Engine emits the derived `TODOS_UPDATED` frame to the Session
after each mutation (`PlanModeEventEmitter`, the same emit path as
Frankie's `todo_*`-tools), so foot/Web show the same progress box.
The LLM gets **no** `todo_*`-tools; each mutation is a derived effect
of validated Route/Eval results. Upon DONE, Benjy discards the projection
(`setTodos` empty + Empty-Frame): the final report carries the item list,
foot keeps the last box in the scrollback; upon Reset, the Engine also
emits the cleared list. `TodoItem`/`TodoStatus` remain untouched — Fails,
escalation, counters are `benjyState`-internal.

**Three-layer rule**: Client sees Todos (projection) → Engine
holds `benjyState` (authority) → Route/Eval calls read a
**bounded Digest** from the authority (small, structurally stable
window for small models, never the raw history; open
dialog turns verbatim — as long as they are open, they are at the
tail and survive the sliding window).

## 6. Safety-Nets (Mechanics, no Prompt Admonitions)

**Volume is not a danger — stagnation is.** A round counter measures the
wrong quantity: too low, it cuts off legitimate work; too high, a loop
burns quota before dying — there is no good value. The nets therefore measure
state progress and cost, never the amount of tasks executed.

**Two effects, clearly separated:**

- **Checkpoint question** (BLOCKED with question instead of judgment): the diagnosis goes as
  `pendingQuestion` to User/Parent (ProcessEvent). The answer **grants
  new** (streak/convergence counter reset, token budget re-baselined from current
  consumption, wallclock phase restarts) and flows as a
  Route trigger into the loop — the model is never asked to
  judge its own limit. No one answers or "stop" → the process remains
  BLOCKED.
- **BLOCKED with diagnosis** (terminal): only the last exit — Route
  decides `blocked`, Route-Stuck, schema exhaustion, Engine error.

| Path | Source | Effect |
|---|---|---|
| Stagnation Streak | `maxStagnation` tasks **without observable progress** | first mechanical escalation of open items to `escalation.recipe` (once), otherwise Checkpoint question |
| Wallclock per phase | `maxWallclockMinutes` (Frankie semantics: per ongoing work) | Checkpoint question + diagnosis |
| Controller Token Budget | Consumption (Tokens − Grant-Baseline) > `maxTokens` | Checkpoint question + diagnosis — LightLm bypasses Lane locks, the budget protects the Tenant quota; answer re-granted |
| Convergence Cap | `maxReflectNo`× reflect-`partially/no` without DONE | Checkpoint question — the controller's judgment does not converge (the "no loop") |
| Route-Stuck | identical Route decision 3× on unchanged state | BLOCKED + diagnosis |
| Item Attempt Cap | mechanical retries > `maxItemAttempts` | Route (branch) → escalation; Route-`retry` on capped item is mechanically discarded: item `failed`, reflection gate decides the outcome |
| Schema Exhaustion | LightLm retry budget of a controller call exhausted | BLOCKED — escalation trigger, no loop |

**Progress (stagnation metric)** is explicit and exclusively: item reaches terminal state, criterion changes status, new items or criteria arise, reflection/DONE gate runs. Everything else — spawn, check, verdict without state effect, retry — counts as stagnation. The terminal gates always run (their convergence is guarded by the Reflect counter, not stagnation). All counters live in `benjyState` (compaction-free); an answered question resets streak and convergence counter, only a token checkpoint shifts the grant baseline — the cost counters remain truthful for the final report.

Escalation is **error-based** (the small model fails), not a performance optimization: fires via Route, after item cap or after stagnation (pending Do tasks of open items are switched to `escalation.recipe` instead of duplicating them), delegation to e.g. Frankie's `coding`.

## 7. Lifecycle and Status

- `start`: Initialize state; if goal exists, Interpret enqueued; Status IDLE. No greeting — the first message drives.
- `runTurn` / `steer`: Inbox drain → translate into Queue operations and dialog turns → loop until queue empty or async boundary (IDLE if Doer waiting, BLOCKED if question).
- `resume`: **continue popping** — the queue can hold ready tasks from before suspend; resume does not mean "wait for message".
- `suspend`/`stop`: Framework status flips; the loop checks live status at the head of each iteration (like Frankie).
- `asyncSteer() = true` (like Marvin): Steers do not block the parent lane; completion via ProcessEvent, `summarizeForParent` provides the final synthesis (or the open question if BLOCKED).
- **DONE path**: `llm:reflect` gate has precedence over Routes `done`
  — `achieved: yes` sets all open criteria to pass and
  closes with DONE; `partially/no` goes as a branch to Route
  (Gaps → Items), the no-loop is caught by the convergence cap (`maxReflectNo`, §6). The
  DONE report is a deterministic final synthesis from the
  state (Goal, criteria with evidence, items, counters) — no
  additional LLM call.

**Spawner**: Arthur (`process_spawn`, Recipe `benjy-coding`) and
Vogon plans (`agent_task`). Nothing in Arthur is Benjy-specific;
the choice Frankie-vs-Benjy is a spawner matter (model landscape
of the Tenant), never Benjy runtime. A delegation manual for
orchestrators is located under `_vance/manuals/benjy-delegation.md`.

**Workspace Pinning**: A WORK target without `targetName` resolves
process-locally (lazy temp RootDir). Benjy resolves the RootDir name
once per Do-Spawn and pins it into the Doer params — Check and
Doer share a workspace. (Without pinning, the Check verified a directory
that no one had written to.) Artifacts that should survive the DONE-Close
require a **named** RootDir (set `workTarget.targetName`) — Temp-RootDirs
are disposed of when the creator process closes.

## 8. Model Strategy (heterogeneous, per alias)

| Call Type | Frequency | Model |
|---|---|---|
| `benjy-route` | medium (branches only) | small (e.g., `default:fast`) |
| Doing (Ford-Doer) | high | small with fallback chain (`default:code`) |
| `benjy-evaluate` | low (1× per item) | medium/large allowed (`default:analyze`) |
| `benjy-interpret` | 1× per task | medium/large allowed |
| `benjy-reflect` | 1–2× per task | medium/large allowed |

All alias-based via the settings cascade; the Tenant reconfigures,
Benjy code remains unchanged. On a purely local setup, all
calls run small — feasibility is the primary goal (speed is
not a selection criterion against Frankie).

## 9. What Benjy is NOT / v1 Limits

- **No Hub** — no user chat; ambiguity goes out as `ask_parent`.
- **No Upfront-Plan-Tree** (Marvin), **no Phase-YAML** (Vogon),
  **no LM-Agency-Loop** (Frankie — remains the cheaper coding worker for large models: a turn on Frankie costs less than three LightLm calls if the model can maintain discipline).
- **No `todo_*`-tools**, no tool use in controller calls
  (LightLm is single-shot), no direct access to MongoDB.
- **v1 is serial and worker mode**. Named v2 points (mode table
  in plan §12.1): Session-Primary (session remains open for
  subsequent tasks), parallel items (two ready tasks pop), `plan`-
  feature (step templates), `report` (compliance matrix as doc),
  Engine-Commands (`/benjy …`), Lunkwill integration.

## 10. Tests

- **Unit** (deterministic — Engine-Agency advantage: LightLm responses
  are mockable single-shots, queue handlers are pure functions):
  State-Codec roundtrip, Feature-Config fail-fast + Chain-Templates,
  Digest-Bounding, Recipe consistency of bundled Recipes,
  Checkpoint-Grant semantics (answer re-granted, counters remain true).
- **E2E** (`qa/ai-test`, `@Tag("llm")`, `BenjyCodingAiTest`): real
  task, full chain to DONE; triple acceptance — mechanical
  (files + test run of the test), structural (Doer processes,
  criteria pass, journal) and an **independent LLM judge**.
- **Implementation boundary** (Plan §11a): other Think Engines and
  framework surfaces remain untouched; shared LightLm additions
  (`params.thinking`, Usage in `LightLlmJsonAnswer`) are additive.

## 11. References

- `planning/benjy-engine.md` — Design plan and history (binding
  for *why*; this spec is the product truth for *what*)
- `readme/benjy-engine.md` — Implementation documentation (files, details)
- [think-engines](/specs/think-engines) — Lifecycle contract, Registry
- [frankie-engine](/specs/frankie-engine) — Sibling (LM-Agency)
- [light-llm-service](/specs/light-llm-service) — Controller calls
- [recipes](/specs/recipes) — Recipe system, spawn path
- Belcak et al. (NVIDIA Research 2025), arXiv 2506.02153 — analyzed
  basis (without the ML path)
