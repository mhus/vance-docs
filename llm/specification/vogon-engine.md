---
# Vance — Vogon Think Engine

> **Vogon** is the Think Engine for **deterministic multi-phase orchestration**. While Arthur reacts and converses with the user, and Ford, as a generalist worker, solves individual tasks, Vogon executes a predefined plan — phases, gates, checkpoints, loops, forks, escalations. It's the bureaucratic engine whose success relies on not being persuaded by any LLM to skip a step.
>
> See also: [think-engines](think-engines.md) | [arthur-engine](arthur-engine.md) | [recipes](recipes.md) | [workflows](workflows.md)

---

## 1. Role and Classification

Vogon is a ThinkEngine **alongside** Arthur and Ford — not an additional architectural layer. Strategies (the plans Vogon executes) are **data**, similar to how Workflows are data for `deep-think` and Recipes are data for every engine.

| Engine | Character | Example Use Case |
|---|---|---|
| `arthur` | Reactive Session Chat Orchestrator | "Talk and delegate" |
| `ford` | Generalist Worker (one task, one answer) | Read file, perform analysis, provide answer |
| `vogon` | Deterministic Multi-Phase Runner | Waterfall feature implementation with Plan→Code→Review phases |
| `deep-think` (planned) | Batch Engine with Task Tree Planning | Complex individual analysis with dynamic task tree |

**When Vogon vs. Ford vs. Arthur?**

- Task is *one* question / *one* action → Ford Recipe (`quick-lookup`, `analyze`)
- Task requires a *strict* multi-phase process with user gates → Vogon Recipe (`waterfall-feature`, `agile-bug-fix`)
- User converses with the system / orchestrates ad-hoc → Arthur (Session Chat)

Arthur **spawns** Vogon Workers when the user request calls for a structured multi-phase workflow. Vogon **itself** spawns Workers via Recipes per phase. This is normal sub-process mechanics from `arthur-engine.md` §3.5; Vogon is just the caller instead of Arthur.

Vogon's state is **deterministic and persistent**. A Vogon Process survives Brain restarts with full state (current phase, loop counter, gate flags) because its plan + snapshot reside in `engineParams.strategyState`.

---

## 2. Primitives

Six atomic building blocks. Code, well-tested, stable. Strategies compose these.

### 2.1 Phase

A named section with entry and exit conditions. A phase typically does one of the following:

- **Worker Spawn**: calls a Worker Recipe (`process_create`) and waits for its `<process-event type="done">`
- **Checkpoint**: blocks on user input
- **Pure State Gate**: checks flags, proceeds

```yaml
- name: planning
  worker: ${params.workerRecipes.planning}    # Recipe name (Recipe Resolver indirection allowed)
  workerInput: |                               # First process_steer message to the Worker
    Plan the implementation of: ${params.goal}
  gate:
    requires: [planning_completed]            # automatically set when Worker DONE
  checkpoint:
    type: approval
    message: "Plan is ready. Proceed to implementation?"
```

> **Naming Convention:** synthetic phase flags use underscores
> (`<phase>_completed`, `<phase>_failed`, `<phase>_checkpointAnswered`).
> Dots are reserved in MongoDB map keys (path separator) — the
> engine therefore sets + persists with `_`. User-defined
> `storeAs` keys should also avoid dots.

### 2.2 Gate

A condition that must be met before the phase is completed. Three sources for gate flags:

| Flag Source | Who sets it | Example |
|---|---|---|
| Worker Status | Vogon's `runWorker` sets `<phase>_completed` if Worker DONE; `<phase>_failed` for STALE/STOPPED or spawn error | `planning_completed` |
| User Answer at Checkpoint | Strategy Engine evaluates the answer against the schema in the checkpoint | `plan_approved` |
| Strategy-internal Flag | Another phase or a fork branch has set it | `loop_continue` |

Gate Spec:

```yaml
gate:
  requires: [planning_completed, plan_approved]   # AND list (Default)
  # or
  requiresAny: [user_satisfied, max_iterations_reached]
  # optional: timeout
  timeoutSeconds: 86400                            # escalation after 24h
```

### 2.3 Checkpoint

A point where the user is involved. Vogon checkpoints are **thin wrappers** over the user interaction subsystem (see [`user-interaction.md`](user-interaction.md)) — Vogon does not create its own user dialog, but rather creates structured InboxItems and waits for their response.

Three types that map directly to Inbox Item Types:

| Vogon Checkpoint Type | InboxItem Type | Strategy State Effect |
|---|---|---|
| `approval` | `APPROVAL` | `flags[<storeAs>] = answer.value.approved` (Boolean) |
| `decision` | `DECISION` | `flags[<storeAs>] = answer.value.chosen` |
| `feedback` | `FEEDBACK` | `flags[<storeAs>] = answer.value.text` |

```yaml
checkpoint:
  type: decision
  message: "Which code style convention?"
  options: [google, sun, custom]
  storeAs: codeStyle               # → strategyState.flags.codeStyle = "<choice>"
  criticality: NORMAL              # LOW = default adoption; see user-interaction.md §7
  default: google                  # for criticality=LOW: adopted immediately
  tags: [vogon, code-review]       # → InboxItem.tags
  timeoutSeconds: 3600             # → InboxItem.payload + Auto-Resolver-Hook (v2)
  onTimeout: escalate              # on timeout: escalate | default | abort
```

**Flow**:

1. Vogon Process creates InboxItem (Type `APPROVAL/DECISION/FEEDBACK`, `originProcessId = vogon.id`, `assignedToUserId = session.userId`, all fields from `checkpoint.*` spec)
2. `InboxItemService.create(...)` triggers the `NotificationDispatcher` — user is informed (WS push if online; otherwise pending summary on next resume)
3. Vogon Process goes to `BLOCKED`, writes its `pendingCheckpoint` to `strategyState`
4. `ParentNotificationListener` routes `ProcessEvent(type=BLOCKED, summary=<title>)` to Vogon's parent process (typically Arthur), so Arthur can additionally notify the user in chat
5. User responds via Inbox UI → `InboxAnswerHandler` validates + persists + builds `SteerMessage.InboxAnswer` and `appendPending` to `vogon.id`
6. Vogon's next Lane Turn: `drainPending` sees `InboxAnswer`, evaluates the `outcome` field:

| `answer.outcome` | Vogon's Action |
|---|---|
| `DECIDED` | `flags[storeAs] = answer.value`, proceed to next phase |
| `INSUFFICIENT_INFO` | Trigger escalation: `escalation: on=insufficientInfo`. If none defined → new checkpoint with the reason in the body |
| `UNDECIDABLE` | Trigger escalation: `escalation: on=undecidable`. If none defined → Strategy to `STALE`, ProcessEvent type=FAILED to Parent |

**Auto-Default for LOW**: a checkpoint with `criticality: LOW` and a set `default` will not even be visible as a waiting point — the `InboxItemService` immediately adopts the default upon creation, the item appears directly with `status=ANSWERED` in the Inbox (audit marker), and Vogon receives the answer in the `appendPending` queue without a BLOCKED phase.

**Audit**: each checkpoint leaves an InboxItem with full history (created, assigned, delegated, answered, by whom). Strategy State references the `inboxItemId` per phase, so the run is traceable from both the strategy view and the inbox view.

### 2.4 Loop

Repeats a group of phases until a flag gate is met:

```yaml
- name: write-and-review
  loop:
    until:
      anyOf:                       # OR list of flag names
        - lector_approved          # set by §2.5 Scorer in the lector phase
        - write_and_review_max_iterations_reached
    maxIterations: 5
    onMaxReached: escalate         # or: exit_ok | exit_fail (Default: escalate)
  subPhases:
    - name: writer
      worker: ${params.writerRecipe}
      workerInput: |
        Write chapter ${params.chapter} based on outline ${params.outlineDoc}.
        Existing Lector feedback: ${flags.lector_feedback}
      gate: { requires: [writer_completed] }

    - name: lector
      worker: ${params.lectorRecipe}
      workerInput: "Strictly evaluate the last Writer result according to schema."
      scorer: { … }                # see §2.5 — Switch over Score: high → exitLoop ok,
                                   # medium → setFlag lector_revision_needed (continues loop),
                                   # low → escalateTo Sub-Strategy
      gate: { requires: [lector_completed] }
```

**Mechanics:**

- **Counter:** `strategyState.loopCounters[<loopPhaseName>]` is set to 1 upon entry into the first sub-phase and incremented on each re-entry. `<loopPhaseName>_max_iterations_reached` is automatically set as soon as the counter reaches `maxIterations`.
- **Path Stack:** `strategyState.currentPhasePath` is a list (`["write-and-review", "writer"]`). Vogon's `runTurn` resolves the current phase along the path. Upon exiting the last sub-phase, the engine evaluates the `until` gate: if met → path pop, continue with the subsequent phase at the outer level; if not met → counter++ and return to the first sub-phase. On re-entry, `workerProcessIds` and `phaseArtifacts` of the sub-phases are invalidated (each iteration spawns fresh workers).
- **`until` Form:** exclusively flag-based. Allows `requires: [a, b]` (AND), `anyOf: [a, b]` (OR) and combinations. No mini-expression language — if more complex conditions are needed, use a helper phase to consolidate flags.
- **`onMaxReached` Actions:**
  - `escalate` (Default) — fires `loopExhausted` trigger (see §2.7 Escalation). If no `escalation` rule matches, falls back to `notifyParent BLOCKED`.
  - `exit_ok` — exit loop as if the gate was met; Strategy continues normally.
  - `exit_fail` — loop phase to FAILED, Strategy to STALE, `ProcessEvent type=FAILED` to Parent.

**Lector Pattern as Standard Use Case:** Sub-phases `writer` (creative worker) + `lector` (scorer phase, §2.5). The scorer switch branches directly: high score `exitLoop: ok`, medium score `setFlag: lector_revision_needed` (loop continues, next writer iteration sees `${flags.lector_issues}` as feedback in input), low score `escalateTo: <recovery-strategy>`. The loop gate is only a safety net for the max-iter path — the actual convergence decision sits in the scorer block.

### 2.5 Scorer

Structured LLM evaluation with continuous score and switch branching. The Scorer is **not a separate phase type**, but a block on a worker phase: after Worker-DONE, Vogon parses the last JSON block from the reply, validates the schema, persists fields as flags, and executes **the first matching case rule** based on the score float. Each rule can fire multiple actions from the common [Branch Action Vocabulary](#branch-actions).

**Score Contract (strict):** `score` is a float from `[0.0, 1.0]`. 0 = completely unusable, 1 = perfect. Other scales are not allowed — this makes thresholds comparable across all Recipes and Strategy YAML domain-independent.

```yaml
- name: lector
  worker: ${params.lectorRecipe}
  workerInput: |
    Evaluate the chapter from phases.write_and_review_writer.result strictly according to schema.
    Score scale: 0.0 (unusable) to 1.0 (perfect).
  scorer:
    schema:                                # belongs in the Recipe system prompt;
      score: float                         # here only as a contract reminder.
      summary: string
      issues: list<{severity, location, fix}>
    storeAs: lector                        # → flags.lector = <parsed object>
                                           #   plus flags.lector_score, lector_summary
    cases:                                 # switch — first matching rule wins.
      - when: { scoreBelow: 0.2 }
        do:                                # multiple actions allowed per case.
          - setFlag: lector_rejected_hard
          - escalateTo: { strategy: deeper-review-with-coach,
                          params: { issues: ${flags.lector_issues} } }
      - when: { scoreAtLeast: 0.7 }
        do:
          - setFlag: lector_approved
          - exitLoop: ok                   # exit loop immediately instead of gate path.
      - when: { default: true }            # 0.2 ≤ score < 0.7 → revise
        do:
          - setFlag: lector_revision_needed
    maxCorrections: 2                      # format re-prompts on schema violation
                                           # (Default: 2; analogous to Marvin Validator Loop)
```

**Mechanics:**

1. Worker reaches DONE. Vogon reads last reply.
2. `JsonExtractor.extractLast(reply)` (common mechanic with Marvin's `MarvinWorkerOutputParser`) retrieves the last top-level JSON object.
3. **Schema Check:** `score` is a `[0..1]` float and all mandatory fields declared in `schema` are present. On violation → re-prompt (max `maxCorrections` times) with specific error. Exhausted → Phase-FAIL with "scorer schema invalid after N corrections" message.
4. **Persist:** `flags[<storeAs>]` becomes the parsed object, `flags[<storeAs>_score]` the score float, plus for each scalar top-level field `flags[<storeAs>_<field>]`. This makes every field directly referencable in `gate.requires`/`fork.when`. The full object is additionally in `phaseArtifacts[<phase>].scorerOutput` for audit/UI.
5. **Switch Eval:** `cases` are matched against the score float in declared order, **first matching rule** fires the actions from `do:` (in list order — `setFlag` before `escalateTo` etc., if relevant). `default: true` is the catch-all rule and must be last if used. Without a catch-all and no match, nothing happens (no error) — loop gate then continues via max-iter path.

**Match Operators:**

| Operator | Meaning |
|---|---|
| `scoreAtLeast: <n>` | Score ≥ n |
| `scoreBelow: <n>` | Score < n |
| `scoreBetween: [<lo>, <hi>]` | lo ≤ Score < hi |
| `default: true` | Catch-all — must be the last rule if used |

> **Why Switch instead of Threshold Pyramid?** Three reaction classes (escalate, continue loop, exit cleanly) require three different actions, not just three different flags. If each case could only set a flag, the Strategy would need an additional `escalation:`/`fork:` block for each reaction to re-read the flag — a switch in-place saves the indirection and makes the branch effect locally readable. The consequence: the same action vocabulary now appears in multiple places (Scorer Cases, Decider Cases, Escalation Reactions). This is intentional — see §2.6 Decider and §2.8 Escalation.

#### <a name="branch-actions"></a>Branch Action Vocabulary

Shared between Scorer Cases (§2.5), Decider Cases (§2.6), Fork Branches (§2.7), and Escalation Reactions (§2.8). An action is a map entry with the action name as key.

| Action | Effect |
|---|---|
| `setFlag: <name>` | `flags[name] = true` |
| `setFlag: { <name>: <value> }` | `flags[name] = value` (string/bool/number) |
| `setFlags: [<name>, <name>]` | multiple Boolean flags `= true` in one step |
| `notifyParent: { type, summary }` | `ProcessEvent` to the parent process; Strategy continues |
| `escalateTo: { strategy, params? }` | spawns sub-strategy as sibling process, original strategy remains RUNNING until sub-strategy finishes (sub-result flows back via ProcessEvent) |
| `jumpToPhase: <name>` | sets `currentPhasePath` to the named phase on the same path level; jumping outside the current loop is allowed (exits loop) |
| `pause: { reason? }` | Strategy to BLOCKED, waits for user resume via `process_resume` |
| `exitLoop: <ok\|fail>` | exit the enclosing loop — `ok` continues with the phase after the loop, `fail` sets `<loopName>_failed` and triggers escalation block if applicable |
| `exitStrategy: <ok\|fail>` | terminate the entire strategy; `ok` → Process-DONE with summary, `fail` → Process-FAILED |

**Action Lists:** Each branch has a `do: [...]` array. Actions are executed in list order. Terminal actions (`exitLoop`, `exitStrategy`, `escalateTo`, `jumpToPhase`, `pause`) **abort the list** — if `setFlag` follows an `escalateTo`, the flag will never take effect, hence validation during Strategy Load (Warning).

### 2.6 Decider

Binary or categorical LLM decision. While the Scorer produces a continuous value and evaluates it in a switch-like manner, the Decider asks an `if/else` or `match` question and routes to named cases. The output contract is a classifying string, **not a float**.

```yaml
- name: ambiguity-check
  worker: ${params.deciderRecipe}
  workerInput: |
    Assess whether the outline from phases.outline.result is unambiguous enough
    for writing. Respond with exactly one token from the options.
  decider:
    options: [unambiguous, ambiguous, contradictory]
    storeAs: outline_clarity
    cases:
      - when: unambiguous
        do:
          - setFlag: outline_ok
      - when: ambiguous
        do:
          - setFlag: outline_needs_user
          - jumpToPhase: outline-clarification-checkpoint
      - when: contradictory
        do:
          - setFlag: outline_broken
          - escalateTo: { strategy: outline-rebuild }
    maxCorrections: 2                      # re-prompt if token not in options
```

**Special form of binary Decider:** if `options` is omitted, `[yes, no]` applies. Reply must contain exactly `yes` or `no` (case-insensitive). This makes the classic "LLM, yes or no?" a single line of YAML.

```yaml
decider:
  storeAs: should_continue
  cases:
    - when: yes
      do: [{ setFlag: continue_writing }]
    - when: no
      do: [{ exitLoop: ok }]
```

**Mechanics:**

1. Worker DONE → read reply.
2. **Classification:** Token match against `options` (or `[yes, no]` by default), case-insensitive, first occurrence wins. If no match → re-prompt (max `maxCorrections` times) with "please provide exactly one of the following tokens: ...". Exhausted → Phase-FAIL.
3. **Persist:** `flags[<storeAs>] = <chosen token as string>`. Full reply additionally in `phaseArtifacts[<phase>].result`.
4. **Match Eval:** `cases` are matched against the token value (string equality), first matching rule fires its `do:` action list. Action vocabulary: identical to Scorer (see §2.5). No implicit default — if not all options are covered and the LLM responds outside the expected, it falls through (no match, no action, Strategy continues normally — usually not the desired behavior, hence Strategy Load Validation checks coverage).

**Decider vs. Scorer — when to use which:**

| Question to the LLM | Pattern |
|---|---|
| "How good is this?" (gradual) | **Scorer** with `scoreBelow`/`scoreAtLeast` cases |
| "Is this okay?" (binary) | **Decider** with `[yes, no]` default |
| "Which category is this?" (3..N classes) | **Decider** with explicit `options` |
| "How bad is category X?" | Scorer with domain-specific scale definition in the Recipe |

Both blocks are **mutually exclusive** on a worker phase — either `scorer:` or `decider:`, not both. If both are needed (classification *and* score), formulate two consecutive worker phases.

### 2.7 Fork

Condition-based path change within or at the end of a phase:

```yaml
fork:
  when: codeStyle == "custom"
  then: jumpToPhase(custom-style-config)
  else: jumpToPhase(implementation)
```

Or the match style from the Strategy Manager proposal:

```yaml
fork:
  satisfied: exit_loop
  changes_needed: continue_loop
```

— if the preceding checkpoint stored a variable with the value `satisfied` or `changes_needed`. The match evaluates the `storeAs` field of the checkpoint.

### 2.8 Escalation

Switch to a different model or strategy in case of problems. Trigger × Action:

| Trigger | Action |
|---|---|
| `workerFailed` (Worker to STALE/STOPPED) | `retryWith: { recipe: <other-worker> }` — new worker, different configuration |
| `gateTimedOut` | `escalateTo: { strategy: deeper-investigation }` — sub-strategy |
| `loopExhausted` (max iterations) | `notifyParent: { type: BLOCKED, summary: "Convergence failed" }` — Parent (Arthur) decides |
| `costThresholdExceeded` | `pause` — Vogon goes to BLOCKED, waits for user approval for further expenses |

```yaml
escalation:
  - on: workerFailed
    action:
      retryWith:
        recipe: ${params.workerRecipes.planning}
        params: { model: default:deep, validation: true }
  - on: loopExhausted
    action: notifyParent
```

---

## 3. Strategy Plan Schema

A Strategy is a YAML document that composes phases + primitives:

```yaml
- name: waterfall
  description: Sequential plan: Planning → Implementation → Review
  version: "1"
  parameters:                              # Schema for strategy-specific caller params
    workerRecipes:
      type: map
      required: [planning, implementation, review]
    goal:
      type: string
      required: true
  phases:
    - name: planning
      worker: ${params.workerRecipes.planning}
      workerInput: "Plan: ${params.goal}"
      gate: { requires: [planning_completed] }
      checkpoint: { type: approval, message: "Plan is ready. Proceed?" }

    - name: implementation
      worker: ${params.workerRecipes.implementation}
      workerInput: "Implement the plan from phase planning."
      gate: { requires: [implementation_completed] }

    - name: review
      worker: ${params.workerRecipes.review}
      workerInput: "Review the implementation."
      gate: { requires: [review_completed] }
      checkpoint: { type: approval, message: "Accept review result?" }
```

**Variable Substitution** (`${params.X}`, `${state.X}`, `${phases.X.output}`) is resolved when reading from the Strategy State — not as a generic templating engine, but with a small, well-specified selection of substitution sources.

### 3.1 Spawn Modes: Name vs. Inline

When spawning a Vogon Process, the plan can be provided in two ways — in both cases, the engine freezes the complete plan once as a YAML snapshot in `engineParams.strategyPlanYaml`, after which `runTurn` reads exclusively from the snapshot.

| Mode | `engineParams` | When |
|---|---|---|
| **By Name** | `strategy: <strategy-name>` | Standard case — the strategy exists as a persisted document (`strategies/<name>.yaml` in the Project or `_tenant` cascade) |
| **Inline** | `strategyPlanYaml: <yaml-string>` | One-off / dynamic plans — no document needed, caller passes the entire plan as YAML text. Allows, e.g., a Strategy Generator (separate engine, separate topic) without document pollution |

**Both fields simultaneously** is a spawn error (`IllegalArgumentException`). The frozen snapshot in `strategyPlanYaml` is identically formed in both modes; tooling that performs later audit reads against the plan does not need to distinguish between sources.

**Snapshot Semantics (§6 reaffirmed):** if the source document is edited after spawning, the running process does **not** see the change — the frozen YAML text remains stable until the process ends. To change a plan mid-run, a new Vogon Process must be explicitly spawned.

**Lazy Migration for Old Processes:** if a process is still running with the old v1 form (only `strategy: <name>`, no `strategyPlanYaml` field), the engine resolves the plan once from the document on the first `runTurn` and persists the snapshot — all subsequent turns take the fast path.

### 3.2 Result Block — Explicit Result Declaration

A Strategy can optionally declare a top-level `result:` block. If present, it replaces the default `summarizeForParent` Markdown concatenation of phase outputs as what is sent to the Parent at the end of the Strategy (REPLY body + payload). Without the block, the current default behavior remains — backward compatible, no migration pressure for existing strategies.

**Motivation:** Vogon Strategies often produce artifacts (written documents, set flags, structured verdicts), not free-form response text. The default concatenation of all phase outputs is redundant and LLM token-expensive in the Parent. An explicit `result:` block allows the Strategy author to precisely state: *"here is the result, here is the sentence for the user, here is the structured payload for deterministic consumers"*.

#### Form

```yaml
- name: write-research-report
  parameters: {...}
  phases: [...]
  result:
    fields:
      documentPath:   "${flags.draftPath}"
      wordCount:      "${flags.draftWordCount}"
      sources:        "${phases.research.artifacts.sources}"
    text: |
      I have created the report on **${params.topic}** at
      `${result.documentPath}` — ${result.wordCount} words,
      ${result.sources} sources.
    onFailure:
      fields:
        failedPhase: "${state.lastFailedPhase}"
        reason:      "${flags.failureReason}"
      text: |
        Strategy aborted in phase **${result.failedPhase}** —
        Reason: ${result.reason}.
```

#### Evaluation Order

On DONE transition (CloseReason.DONE):

1. **`result.fields`** is evaluated — each entry is a `${...}` template that resolves against `params` / `state` / `phases.<x>.artifacts` / `flags`.
2. **`result.text`** is evaluated — in addition to standard sources, `${result.X}` is available and references the `fields` evaluated in step 1.
3. Engine emits `REPLY(content=text, payload=fields)` to the Parent (see `planning/process-engine-reply-channel.md`).
4. Status transition → CLOSED → DONE lifecycle event (content-free) fires as always.

On FAILED (CloseReason.STALE with `state.status=FAILED` or similar):

- If `result.onFailure:` is set — evaluated analogously (fields → text → REPLY).
- If not set — default behavior: existing `summarizeForParent` FAILED path with failure block and phase overview.

STOPPED (external abort) → no REPLY, only the lifecycle STOPPED event with optional reason.

#### Substitution Sources

| Source | Where available | Example |
|---|---|---|
| `${params.X}` | everywhere | `${params.topic}` |
| `${state.X}` | everywhere | `${state.iterations[0].score}` |
| `${phases.<phase>.artifacts.<key>}` | everywhere | `${phases.research.artifacts.result}` |
| `${flags.<flag>}` | everywhere | `${flags.draftPath}` (e.g., set via PostAction-`storeAs`) |
| `${result.<field>}` | **only in `result.text` and `result.onFailure.text`** | `${result.documentPath}` |

`${result.X}` references in `fields:` are a Strategy Load error (cyclic scope). Cross-field references must go through existing state sources.

#### Type Preservation in `fields`

Currently, the substitution resolver resolves everything to `String` (§12 Open Point). For `result.fields`, we need type preservation — a list-of-sources remains a list, a number remains a number. Specifically:

- A template that **only** contains a single `${...}` (`"${flags.draftWordCount}"`) adopts the source type verbatim. This means: `Number`, `Boolean`, `List`, `Map`, `null` — all are possible.
- A template with interpolated text (`"${params.topic} report"`) is always `String` (coercion).
- The payload to the Parent contains the type-preserved form. Deterministic consumers (Vogon-as-Parent, JS script) can evaluate this directly.

In `result.text`, normal string coercion then applies to all `${...}` substitutions — the text is always a string.

#### Strategy Load Validation

During `BundledStrategyRegistry` boot and spawn-time plan resolve (see §3.1), the `result:` block is statically checked:

- All `${...}` references in `fields:` point to valid substitution sources (`params` schema, `state` fields, declared phase outputs, flags set somewhere). Unknown paths → boot fail with clear error.
- All `${result.X}` references in `text:` point to keys declared in `fields:`.
- `${result.X}` in `fields:` → boot fail (cyclic scope).
- `result.onFailure:` goes through the same checks independently.

#### Runtime Error Handling

If evaluation fails at runtime — a phase was skipped via Decider, an expected flag was not set, a cast fails:

- WARN log with the unresolvable path
- Fallback to the existing `summarizeForParent` default (Markdown concatenation of successful phases + failure block if present)
- REPLY is still emitted, with the default content
- Lifecycle DONE/FAILED event fires normally

This means a broken `result:` block does not sabotage a successfully run Strategy — the output quality is degraded to the pre-result-spec level, the run itself is considered successful.

#### If `result:` is missing

Strategies without a `result:` block run unchanged as today: `summarizeForParent` builds the Markdown concatenation, the Listener-DONE path transports it to the Parent. Backward compatibility is the default assumption — no one needs to set `result:`.

---

## 4. Bundled Registry and Cascade

Just like with Recipes:

```
resolveStrategy(tenantId, projectId, name) :=
  1. mongo `strategies` collection (project, tenant)         — first match wins
  2. classpath `vance-brain/src/main/resources/strategies.yaml` — fail-fast on Boot
  3. throw UnknownStrategyException
```

`BundledStrategyRegistry` loads fail-fast on Brain boot. Mongo strategies for Tenant/Project are hot-reloaded (read on each resolve).

**Initial Repertoire** (Working Set):

| Name | Purpose |
|---|---|
| `waterfall` | Plan → Build → Review with approval gates in between |
| `agile-iteration` | Loop of `implement → feedback` until user satisfied, max N |
| `research-and-write` | Collect sources → Outline → Draft → Review |
| `bug-fix-flow` | Reproduce → Diagnose → Fix → Verify |

More will be added with experience.

---

## 5. Vogon Engine — Lifecycle and runTurn

Vogon is a ThinkEngine. It follows the normal lifecycle (`start`, `resume`, `steer`, `stop`) plus the `runTurn` from Stage 4.

```
start(process, ctx):
  1. Load Strategy Plan from engineParams.strategy via StrategyResolver
  2. Validate Caller Params against plan.parameters
  3. Initialize strategyState:
       currentPhasePath: <first-phase>
       loopCounters: {}
       flags: {}
       artifacts: {}
       workerProcessIds: {}
  4. Persist state, status → READY
  5. Schedule Lane Turn (self, via emitter.scheduleTurn)

runTurn(process, ctx):
  Loop:
    drained := ctx.drainPending()              // first check Inbox
    integrate(drained, strategyState)          // incorporate ProcessEvents + UserChatInputs
    nextAction := evaluatePlan(strategyState)  // State Machine one step

    case nextAction:
      SPAWN_WORKER(phase) →
        spawnWorkerProcess(phase)              // synchronously via process_create-equivalent
        return                                  // wait for ProcessEvent from Worker

      ASK_USER(checkpoint) →
        appendChatMessage(checkpoint.message)
        status → BLOCKED
        return                                  // ParentNotificationListener routes to Parent

      EVALUATE_GATE(gate) →
        if all flags set → advance to next phase
        else → return (wait for Flag Setter)

      LOOP_DECIDE → see §2.4
      SCORE_PARSE → see §2.5
      DECIDER_PARSE → see §2.6
      FORK_DECIDE → see §2.7
      ESCALATE → see §2.8
      DONE → status → DONE; ParentNotify type=DONE with summary from state.artifacts

resume(process, ctx):
  // strategyState is already in the Process — just call runTurn(),
  // which will determine what to do from the state path.
```

---

## 6. State on the Process

`ThinkProcessDocument.engineParams` contains three Vogon fields side-by-side:

| Key | Content | When set |
|---|---|---|
| `strategy` | Strategy Name (audit marker, optional) | Spawn-by-Name; not set for inline spawn |
| `strategyPlanYaml` | Frozen YAML snapshot of the complete plan | Always set on `start()` — engine reads exclusively from it |
| `strategyState` | Mutable Runtime State (path, counters, flags, artifacts) | Initialized on `start()`, updated with each turn |

`strategyState` as an embedded sub-document:

```
strategyState := {
  strategy:           "waterfall",            // Plan Name + Version (Snapshot)
  strategyVersion:    "1",
  currentPhasePath:   ["write-and-review", "lector"],   // Stack — top = active phase
  phaseHistory:       [ "planning", "write-and-review/writer" ],
  flags: {
    plan_approved:        true,
    planning_completed:   true,
    lector_score:         0.82,               // Scorer fields: <storeAs>_<field>
    lector_summary:       "...",
    lector_approved:      true                // set by Threshold Rule
  },
  loopCounters: {
    write_and_review:     3                   // one iteration per Loop Re-Entry
  },
  workerProcessIds: {
    planning:                       "69ee8eb...",
    "write-and-review/writer":      "69ee8ef...",
    "write-and-review/lector":      "69ee900..."
  },
  phaseArtifacts: {
    planning:                       { result: "<assistant-text>" },
    "write-and-review/writer":      { result: "<chapter-text>" },
    "write-and-review/lector":      { result: "<assistant-text>",
                                      scorerOutput: { score: 0.82, … } }
  },
  pendingCheckpoint: null                     // or { type, message, askedAt }
}
```

**Path Convention:** Phases within loops are addressed in `workerProcessIds`/`phaseArtifacts` with `<loopName>/<subPhaseName>`, in `currentPhasePath` as a list. `phaseHistory` also records entered phases qualified; on loop re-entry, the previous worker entry is overwritten (each iteration starts with fresh workers), but the history contains a separate entry with a counter suffix for each iteration.

Snapshot Model: Strategy YAML can be edited after spawn, running Vogon Processes remain on their frozen plan version. The `strategyVersion` tag makes this auditable.

---

## 7. Worker Spawning from a Phase

Vogon uses **the Java API**, not the `process_create` tool — deterministically, without tool call overhead:

```java
RecipeResolver + ThinkProcessService.create + ThinkEngineService.start
   → child Process with parentProcessId = vogon.id
   → vogon registers child.id in strategyState.workerProcessIds[phaseName]
   → first process_steer with phase.workerInput (to child via PendingQueue)
```

In v1, the Worker is driven **synchronously** (laneScheduler.submit + .get()): Vogon spawns → submits Steer to Worker Lane → waits until Turn ends → reads last Assistant Reply → saves to `phaseArtifacts[phaseName].result` → sets `<phaseName>_completed` → stops Worker. This means it does not depend on a terminal DONE event from the Worker (Reactive Engines like Ford never reach DONE anyway). Later versions can extend this with event-based Worker routing for long-running Workers.

**Tool Pool for Vogon (`allowedTools()`)**: deliberately empty / minimal. Vogon decides **deterministically**, not via LLM. The only reason for an optional LLM in Vogon is the evaluation of `feedback` checkpoints ("did the user implicitly agree?") — this could become a dedicated `vogon-classifier` Recipe call, not a tool in the pool.

---

## 8. Checkpoint Answer Evaluation

A user steer (via Arthur) lands as `UserChatInput` in Vogon's Inbox. If `pendingCheckpoint != null`:

| Checkpoint Type | Evaluation |
|---|---|
| `approval` | Default classifier: `yes/y/ja/ok/weiter` → `true`; `no/n/nein/stop` → `false`; anything else → BLOCKED remains, "please answer with yes/no" |
| `decision` | Match against `options`. If no match: BLOCKED remains, list options again |
| `feedback` | Saves completely to `flags[storeAs]`; optionally additional classification via LLM Recipe (for Fork conditions like "contains 'fits'") |

Classification: simple string matches suffice for `approval` and `decision`. For `feedback` with semantic evaluation, Vogon can call a light LLM Recipe (`quick-lookup`-class) — deliberately not its own tool pool, but the same spawn mechanisms as for phase workers.

---

## 9. Discovery

From Arthur's perspective, Vogon plans are just **Recipes like any other**. A Recipe `waterfall-feature`:

```yaml
- name: waterfall-feature
  description: Waterfall plan for feature implementation with Plan/Build/Review gates
  engine: vogon
  params:
    strategy: waterfall
    workerRecipes:
      planning: analyze
      implementation: code-write
      review: code-read
    model: default:deep        # for Vogon's internal LLM calls (feedback classification etc.)
  promptPrefix: |
    You are Vogon executing the waterfall plan. Follow phases strictly.
  tags: [strategy, waterfall, feature]
```

`recipe_list` shows it to Arthur. Arthur decides based on the description whether the user task requires a Vogon Recipe (multi-phase, strict) or a Ford Recipe (one-shot). **No additional `strategy_list` tool** — strategies are an implementation detail of the Recipes.

Optional: a `strategy_describe(name)` tool for debugging/admin, returns the full plan YAML. Not v1.

---

## 10. Composition with Workflows

A phase of a Vogon Strategy can spawn a `deep-think` Worker with a Workflow Template:

```yaml
- name: literature-review
  worker: deep-research-with-workflow            # Recipe that combines deep-think + workflow-name
  workerInput: "Topic: ${params.topic}"
  gate: { requires: [literature-review_completed] }
```

Workflows (see `workflows.md`) remain deep-think specific; Vogon consumes them indirectly via the Recipe. Strategies and Workflows do not compete — they sit on different levels:

| Level | Responsibility |
|---|---|
| Vogon Strategy | Choreography over multiple Worker spawns |
| Workflow (deep-think) | Task tree within a Worker |
| Recipe | Worker configuration (Engine, Params, Prompt) |

---

## 11. Bounds and Quotas

A Vogon Strategy needs global guardrails, otherwise it becomes a money-burning trap:

```yaml
- name: waterfall
  bounds:
    maxTotalCostUsd: 5.0          # cumulative cost across all worker phases
    maxWallclockSeconds: 86400    # 24h hard limit
    maxWorkerSpawns: 20           # absolute cap
  phases: ...
```

On exceeding: `escalation: on=costThresholdExceeded` trigger fires (see §2.8). Quota integration with `llm-resource-management.md` §3 — Vogon is the first engine consumer that needs per-strategy budgets.

---

## 12. Open Points

- **State Machine Implementation**. langgraph4j is planned for the stack — Vogon is the first real use case. Alternative: handcoded State Machine in the `Phase`/`Gate` POJOs. Decision for/against langgraph4j will be made during the first implementation stage.
- **Variable Substitution**. `${params.X}` / `${state.X}` / `${phases.X.artifacts}` / `${flags.X}` need a clear resolver with cycle detection and type coercion. We start with string substitution; structured values (lists, maps) will come if needed. §3.2 (Result Block) introduces type preservation for `result.fields` — once implemented, this extension of the resolver will be available; other substitution sites remain string-only until a concrete need arises.
- **Strategy Versioning**. Snapshot on spawn has been implemented since Phase F (see §3.1) — edits to the source document no longer affect running processes. It remains open whether/how we want to introduce versioned plan names (`waterfall@2`) for parallel co-existence of old and new versions, should `strategies/` become a rapidly-changing working set.
- **Sub-Strategy Escalation**. An escalation can start another Strategy (`escalateTo: deeper-investigation`). How is state transferred? V1: no transfer, sub-strategy only receives the bounds and an `escalationReason` param. More complex hand-over semantics if needed.
- **Plan Validation on Boot**. Bundled strategies should be checked for consistency during `BundledStrategyRegistry` load: all referenced `worker` recipe names exist, all `requires` flags are set at some point, no unreachable phases, threshold order consistent (`default: true` last, no overlapping score ranges). Static analysis if needed. §3.2 (Result Block) extends this with mandatory validation for `result.fields`/`result.text` substitutions (`${result.X}` in `fields` is a boot fail, all `${result.X}` in `text` must be declared in `fields`).
- **User-Editable Strategies**. UI wish: user defines own Strategy via form ("3 phases, approval after each, max 60min") → system generates Strategy YAML. Outside v1; the plan's schema property is tailored for YAML authoring, a form generator can build on that.
- **Fork and State Snapshots**. For a `fork` with parallel branches: do they run in parallel, sequentially, or one and the rest discarded? V1: only sequential forks (`when/then/else`), no true parallel branches. Parallelism via loop or via multiple phase workers per phase if needed.
- **Score Aggregation over Iterations**. Currently, only the last loop iteration saves its scorer output (each re-entry overwrites). If a Strategy wants to evaluate trends ("score increases monotonically, abort if plateau"), we need iteration history per phase. Outside v1.
- **Implementation Status**. Phases A–E (DTOs, Loop, Scorer, Decider, Branch Actions, Plan Snapshot) are implemented with unit and AI test coverage. Open stub points: §2.8 Escalation block — loop exhaustion with `onMaxReached: escalate` and Scorer branch `escalateTo` currently terminate the process with STALE instead of spawning a sub-strategy; full wiring is a separate stage.
