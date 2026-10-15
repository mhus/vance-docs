# Vancetope — Nutrimat Engine (Loop Lab)

> **Nutrimat** is the experimental Think Engine for researching loop types.
> A framework (`AbstractNutrimat`) provides the turn shell and a closed
> external contract (Ford worker interface); the loop types are contained
> in interchangeable **Natures** — the first five (`janx`, `redbull`,
> `clubmate`, `absint`, `salitos`) and the coffee Natures (`filter`,
> `cappuccino`, `espresso`, `ristretto`, `mokka`, `affogato`, `macchiato`,
> `cortado`, `lungo`). A benchmark lane in `qa/benchmark` measures them
> against each other (§8).
>
> See also: [think-engines](public/think-engines.md) (Registry, Lifecycle),
> [ford-engine](public/ford-engine.md) (the basis of `janx`),
> [structured-engine-output](public/structured-engine-output.md) (Terminal Contract),
> [recipes](public/recipes.md), [light-llm-service](public/light-llm-service.md)
> (Judge Calls). Design History: `planning/nutrimat-engine.md`.

---

## 1. Purpose — and what Nutrimat consciously is not

Nutrimat is a **lab**, not a production line: loop types are implemented,
conserved side-by-side, and compared. Two consequences are binding:

- **Independence.** The loop logic is *adapted*, not linked, against the
  production engines (Ford, `StructuredActionEngine`, `ActionLoopJudgeService`).
  Only infrastructure is shared (AiChat, LightLlm, Chat Log, Memory Compaction,
  Guards). Drift between Nutrimat and Ford is thus a measurement result, not a
  defect — what proves itself in the lab is manually transferred to the
  production line.
- **Conserving broken states.** A Nature may remain in an unfinished state in
  the tree; it must only not break `./wb build`.

The Natures are **examples of openness, not a catalog**: the list is not
intended to be exhaustive. Only the external contract (§3) is closed — every
Nature, whether known or new, can thus be used by Arthur as a worker and
standalone like Ford.

## 2. Architecture: `AbstractNutrimat` + one Bean per Nature

```
vance-addon-brain-nutrimat/                     (Addon module, de.mhus.vance.addon.brain.nutrimat)
  AbstractNutrimat          — Turn shell + loop primitives, runLoop abstract (implements ThinkEngine)
  NutrimatInterruptedException — ESC/Pause from round(), caught by the shell
  NutrimatExhaustedException — the reactivated "exhausted" (exception, not state)
  NutrimatJudge             — LightLlm Judge for clubmate (exhaustion)
  janx/NutrimatJanx + JanxSafetyNet  redbull/NutrimatRedbull  clubmate/NutrimatClubmate  absint/NutrimatAbsint  salitos/NutrimatSalitos
  filter/  cappuccino/  espresso/  ristretto/ (+ RistrettoSafetyNet)  mokka/
  affogato/ (+ AffogatoCritic)  macchiato/  cortado/  lungo/        — the coffee Natures, one package each
  NutrimatCommandHandler      //nutrimat Control Plane (EngineCommandHandler)
```

- **`AbstractNutrimat` is a mandatory inheritance.** The lifecycle methods
  (`start`/`steer`/`runTurn`/`resume`/`suspend`/`stop`) are `final` and
  implement the Ford worker contract; a Nature cannot break the shell.
  **The base provides the framework and mechanics, the Nature owns the loop:**
  each Nature implements `runLoop` itself and builds it from the primitives —
  `round()` (a model call; **first** checks for interrupt and throws
  `NutrimatInterruptedException`, the shell parks the turn — ESC thus works
  in every loop without its own check), `dispatchTools()`,
  `appendInterimRoundText()`, `narrate()`/`narrateRound()`, `report()`
  (accounting channel: noted in loop state, pushed as NOTIFY),
  `jsonObjectOf()` (read model's JSON judgment, tolerant of fences/prose),
  `haltRequested()`, `invokeTool()` (dispatch a single call without
  appending anything — for a loop with its own control tool, cortado),
  `withModel()` (the same turn inputs with a second model; shares messages
  and tools, resolves via `EngineChatFactory.forModelSpec` — macchiato) and
  `LoopInputs.withToolSpecs()` (different tool surface on the same message
  list, e.g., `List.of()` for a tool-less planning or reflection round).
  Output is a `TurnOutcome` (`terminal`, `failed` — hard failure with literal
  text, worker → `INCOMPLETE`; `recovered` — partial work, framed as "TASK
  FAILED ... partial" to a parent). Stop policy, budget, nets, and outputs
  belong to the Nature; duplicating code between Natures is explicitly allowed
  — Natures are independent experiments, a property of one never propagates
  through the base to another. The base only knows two nature-side queries:
  `iterationBudget()` (for `//nutrimat status`/`set maxturns`, `0` = no budget
  — enforced in the Nature's loop) and `exhaustedStopsUntilUserInput()`
  (shell's continue gate, redbull only).
- **One `ThinkEngine`-Bean per Nature**, name `nutrimat-<nature>`. Pinned
  identity per Nature (no sliding `nutrimat` alias — Trillian lesson); a
  process is thus always assigned to its loop. The Nature ID must match
  `[a-z0-9]+` (name is parsed once, ID lands in Recipe names) — violation
  fails during boot via registry indexing.
- **State** of the shell: per turn in the turn frame; what survives the turn
  is in `engineParams.nutrimatState` (tolerant load, Zaphod lesson). There is
  **no** new `ThinkProcessStatus` — `exhausted` lives in the turn, not in the DB.

## 3. External Contract (the Ford Interface)

What a spawner sees from **every** Nature — regardless of the loop:

| Aspect | Contract |
|---|---|
| `steer` | Blocks the Lane until the turn is complete and delivers the reply (`asyncSteer = false`) |
| Turn End | The reply is the Assistant message; user input + final reply and interim round texts are persisted as interim work log (`kind=interim`, filtered from every LLM path — see §7) |
| Status | A reply leaves the process `IDLE` in both roles (Ford status: `BLOCKED` means obstacle, not "finished" — orchestrators read it as a question) |
| Runaway / Hard Case | Per Nature (§4): redbull/clubmate their budget, janx the Ford nets, clubmate additionally a 30-min wallclock against a perpetually extending Judge, salitos/absint consciously none (endless, interrupt remains). An **empty reply** ends in every Nature as a hard failure with text, never as a silent turn without reply. Hard exits close a worker `INCOMPLETE` (FAILED ProcessEvent to the parent) |
| Drain after Turn | **Every drained Inbox is processed exactly once as a turn** (Live finding 2026-10-04: the double call caused the original order to restart as a second turn after exhausted — the continue gate saw a UserChatInput and opened correctly, the second processing of the same Inbox was the error). The auto-wakeup loop stops if a turn has closed/parked the process (hard-failure turn, ESC/`/pause`, CLOSED/PAUSED/SUSPENDED) — mid-turn messages from sub-workers remain in the queue, they **do not** trigger another turn on a terminated process (Live finding redbull: the exhausted error was sent, but the drain loop continued) |
| Continue Gate (redbull) | After a hard-failure turn of a **Primary**, the shell discards incoming background events (exec_finished & friends) with a narration note, instead of spinning a new loop — only a user input (e.g., "continue") starts the next loop run. Such a kick **resets the run state immediately** (not just at turn end): narration "loop reopened by user input", `nutrimatState` new with `turns=0`, `awaitingUserContinue=false`, `lastOutcome=running` — `//nutrimat status` shows the open run in the middle of the new run, not the expired closed one. Marker: `nutrimatState.awaitingUserContinue`, Hook `exhaustedStopsUntilUserInput()` (Default `false` = Ford baseline; only redbull `true`) |
| Mid-Loop ESC / `/pause` | Before every model call — structurally in `round()`, thus for every Nature, even with its own loop |
| Flags | `planShaped=false`, `producesUserFacingOutput=true`, `roles={}`, `allowedTools` = Ford worker baseline (Discovery, Spawn, Doc-Read, Research, Settings-Read, Work-Target-Layer) |
| SteerMessage | Only `UserChatInput`; anything else = Warning + discard |

The terminal contract remains the existing one
([structured-engine-output §3](public/structured-engine-output.md),
[think-engines §5](public/think-engines.md)).

## 4. Loop Taxonomy

Each Nature is an **independent experiment** with its own loop; the reference
is `janx`. Common to all is only what the base provides: natural stop as the
basic form (the first message without a tool call ends the round), interrupt
from `round()`, reply → `IDLE`, empty reply → hard failure. A comparison
against `janx` measures an entire loop.

| Nature | Loop |
|---|---|
| `janx` | **The Ford Worker Loop** (as of 2026-10, [ford-engine §4/§4a](public/ford-engine.md)), copied, not linked: tool calls until the first message without a tool call **is** the reply; no routine round limit. Nets (`JanxSafetyNet`) measure getting stuck: idle stuck (same batch 5×, `params.idleStuckThreshold`; status polls excluded + throttled), empty reply, model error, wallclock per turn 60 min (`params.maxWallclockMinutes`); `params.maxIterations` only opt-in. Safety stop → worker "⚠️ TASK FAILED" + `INCOMPLETE`, chat continuable `BLOCKED` ("continue"). Optional `params.validation` (data relay correction, up to 2×) |
| `redbull` | **Hard Budget:** at most `params.maxIterations` rounds (Default 40, Recipe 12). Reached → `NutrimatExhaustedException`, the turn ends as a **visible error** — no continuation, no partial work rescue (not even model errors). On a Primary, exhausted ends the process's **work**: subsequent background events are discarded (continue gate, §3), only a user input starts the next run. Otherwise no nets — the budget limits |
| `clubmate` | **Budget with Judge:** a budget segment of `params.maxIterations` rounds (Default 12); exhausted → a **Judge** (a LightLlm call, §5) sees the work (longest text **and** the tool calls) and decides: fresh budget with nudge (`extend`, without a fixed upper limit) or reply (`synthesize`, normal turn completion). Own 30-min wallclock net per turn slows down a perpetually extending Judge; model error rescues partial work |
| `absint` | **The stop is an accounting that the loop itself provides:** a turn-local system instruction requires exactly one JSON object with a string field at the stop — `{"report": "…"}` (what the loop did and what came out). The report **is** the reply, is appended to the loop state (`nutrimatState.roundReports`, capped) and pushed as NOTIFY; no continuation decision. No JSON → format correction, after 2 corrections the raw text is considered the report (the accountability is never empty). Round note with the model's words. No nets except the interrupt |
| `salitos` | **The stop is a decision that the loop itself makes:** at the stop exactly one JSON object `{"done": true\|false, "reason": "…", "answer": "…"}` (turn-local system instruction). `done=false` → continue, its own reasoning is the nudge; `done=true` → `answer` is the reply (without `answer` = format error). **Endless by design:** no round, no decision limit. Every decision is published via `report()`. No JSON → format correction, after 2 corrections the raw text is considered the reply. No nets except the interrupt |

### 4.1 The Coffee Natures

Each tests **one hypothesis** and has a metric in the benchmark lane (§8);
planning document with hypotheses and order: `planning/nutrimat-coffee-natures.md`.
Protocols are turn-local system instructions — the shared prompt remains the same for all.

| Nature | Loop | Hypothesis |
|---|---|---|
| `filter` | **Fresh context per round:** before each round, the working context is rebuilt — prompt + turn history, a note message (protocol + "YOUR NOTES SO FAR"), plus **only** the previous round's exchange (Assistant message + its tool results). Older tool outputs are gone; what the agent wants to keep, it writes into a `NOTES:` block (if the marker is missing, the entire round text becomes the note). Natural stop = reply. Net only opt-in `maxIterations` → partial work (the notes) | Short fresh context beats growing history for long tasks / small models |
| `cappuccino` | **Visible Budget:** the redbull loop (hard `maxIterations`, Default 20, Recipe 12 like redbull; exhausted → exhausted error), but before each round a transient budget message ("round 7 of 12 (5 left), 4 min elapsed", in the last round "LAST ROUND: answer now without calling tools"), which is removed after the call. **No** continue gate — that is redbull's property | A visible budget changes behavior (answer earlier, less often exhausted) — counter-test to redbull |
| `espresso` | **Plan first:** Round 1 without tools provides a numbered plan (in context, via `report()`), then execution with `STEP <n>:` prefix per round; `PLAN REVISED:` reports a changed plan. Natural stop = reply. Net only opt-in `maxIterations` | Prior planning helps with multi-step tasks, costs for short ones |
| `ristretto` | **Mandatory Reflection:** the janx loop with janx's nets (copy `RistrettoSafetyNet`), plus after every `reflectEvery` tool rounds (Default 3; `0` = off) a tool-less reflection round ("what worked, where are you stuck, what is the next step"), which remains in context and is published via `report()`. Default 3, not 5: at 5, the idle-stuck net (threshold 5) fired before the first reflection | Regular reflection prevents getting stuck earlier than janx's idle-stuck net |
| `mokka` | **Prediction:** each tool round names `EXPECT: …`, the follow-up message starts with `MATCH: yes\|no` — the model evaluates its own prediction. Missing `EXPECT` → reminder (not blocking). `mismatchThreshold` (Default 2) consecutive misses → tool-less reflection round. At stop `report("predictions: H hits, M misses, X missing EXPECT")`; a leading `MATCH:` line is removed from the reply. Nets: opt-in `maxIterations`, wallclock `maxWallclockMinutes` (Default 60) | Prediction errors are a signal of confusion that a hash comparison does not provide |
| `affogato` | **External Critic:** at the natural stop, a LightLlm critic (§5) attacks the answer — it sees goal, draft **and** tool calls with results. `revise` → the critique goes back as a user message, the loop continues (tools allowed); `accept` → reply. `maxCritiques` (Default 3, `0` = unlimited), after which the next draft is taken without critique. Every judgment via `report()`. Nets: opt-in `maxIterations`, wallclock 60 min | An external opponent improves the answer more than salitos' self-decision |
| `macchiato` | **Two Models:** `macchiatoMode: worker-first` (Default) — the `workerModel` does the tool rounds, at the stop the `answerModel` writes the answer from the work in a tool-less round (if it fails/is empty, the worker draft applies); `planner-first` — the `answerModel` plans tool-less, the `workerModel` executes and answers. If a model param is missing, the role takes the Recipe `model`. Narration names role + model per round. Nets: opt-in `maxIterations` (worker rounds), wallclock 60 min | Quality comes from answer or plan; tool work can be done by a small model |
| `cortado` | **salitos with Tool instead of JSON:** the decision runs via a loop control tool `loop_decide(done, reason, answer)`, which the Nature itself answers (never dispatched via the tool layer). `loop_decide` alongside other calls is rejected; `done=false` → continue with its own reasoning; `done=true` + `answer` → reply. Plain-text stop → correction, after 2 corrections the raw text applies. Endless by design | Does the form of the protocol (tool vs. JSON) influence the decision? |
| `lungo` | **absint in every round:** each tool round begins with `REPORT: …` (published via `report("round n: …")`; if missing → reminder), at the stop the absint JSON `{"report": …}` as reply. No nets except the interrupt | Does formulating in every round improve the work? |

The `exhausted` mechanism is an **exception** (the historical form of the old
Ford implementation), not a persisted state — the turn shell catches it and
maps it to the existing terminal vocabulary.

## 5. The Judge

`NutrimatJudge` is an independent implementation (independence rule) with an
internal LightLlm Recipe, only for clubmate:

- `nutrimat-judge-clubmate` — Judgment `extend` (with `nudge`) vs. `synthesize`
  (with `answer`); Pebble vars `userGoal`/`gatheredText`/`iterations`.
  `gatheredText` is the longest text of the model plus the tool calls of the
  turn (name + truncated arguments, the last 30) — without the calls, the
  Judge would judge "is more work worthwhile?" without knowing the work.

**A Judge that cannot deliver never blocks the turn:** it degrades to
`synthesize` with the collected work — refusing to stop would create exactly
the deadlock the Judge is supposed to prevent. The Recipe is `internal: true`
(no spawn, no Recipe selector).

`affogato` has its **own critic** (`AffogatoCritic`, Recipe
`nutrimat-critic-affogato`, `internal: true`) — consciously not in
`NutrimatJudge`, so the two experiments do not touch. Judgment
`{"verdict": "accept"|"revise", "critique": "…"}`; Pebble vars
`userGoal`/`draftText`/`toolTrace`. The tool trace contains for each call
name, arguments (≤ 300 characters) and result (≤ 1500 characters); from 12,000
characters, the **oldest** entries are dropped (the draft builds on the most
recent work). Fail-open: error, unknown judgment or `revise` without critique
→ `accept`.
salitos and absint **no longer have** a Judge (until 2026-10:
`nutrimat-judge-salitos`/`-absint`): decision and accounting come from the
loop itself, as JSON (§4).

## 6. Recipes, Prompt, Category

- **One Recipe per Nature:** `nutrimat-<nature>` for all fourteen Natures —
  `listed: true`, `category: experimental`, bundled in the Addon
  (`vance-defaults/_vance/recipes/`). Internal LightLlm Recipes:
  `nutrimat-judge-clubmate`, `nutrimat-critic-affogato`.
- **A shared prompt** `_vance/prompts/nutrimat-prompt.md` (adapted from
  `ford-prompt.md`) for all Natures: a loop comparison is only honest if the
  prompt does not vary with the loop. Nature-specific words run via
  `promptPrefix` in the Recipe.
- **Category `experimental`** in the bundled `recipe_categories.yaml`
  (en: "Experimental", de: "Experimentell").
- **Spawnable as Worker:** each calling Recipe explicitly names the Nature
  (`process_spawn(recipe="nutrimat-janx", …)`) — no movable alias. Arthur can
  thus start Nutrimat instead of Ford as a worker, without code changes.
- **Model chain like Ford:** `model: default:analyze,default:fast` +
  `fallbackModels: [default:fast]` (Judge reciprocal). The comma form is an
  **alias resolution cascade** (first *defined* alias wins — one model!), not
  a runtime fallback chain; that is in `params.fallbackModels` (Live finding
  2026-10-04: provider threw `deepseek-v4-pro` with 404, the chain had only
  one entry — "All 1 chat-model chain entries exhausted" killed every turn
  after exhausted, the working flash fallback was never attempted).

## 7. Diagnosis and Control Plane: `//nutrimat`

A command handler (`verb: nutrimat`) applies to **all** Natures — the
commands are properties of the lab, not of a loop:

| Command | Effect |
|---|---|
| `//nutrimat` / `//nutrimat status` | Nature, loop type, effective budget **with source** (default / recipe / runtime override), override list, loop stats of the last turn |
| `//nutrimat set maxturns <n>` | Runtime override of the iteration budget — takes effect from the next turn |
| `//nutrimat set maxturns` | Delete override, revert to Recipe default |
| `//nutrimat set validation on\|off` | Data relay validation (janx path) |

`set` writes to the **runtime overlay** (`engineParamOverrides`, precedence
Override > Recipe) via atomic `$set` per key — the Recipe remains the
baseline, and the same overlay is also used by `//llm`, so they do not
interfere with the source. The handler is consciously **not** attached to the
Lane (`runsOnLane=false`, `//wowbagger info` argument): a status that is
queued behind a hanging turn is useless precisely when it is needed.

The shell persists the turn's loop stats after each turn (iterations consumed,
stop candidates, extensions, turn counter **of the current run** (reset to 0
when the continue gate is reopened — see §3; the iteration budget is fresh per
turn anyway, only the persisted counter needed the reset), last outcome,
continue gate marker `awaitingUserContinue`) in `engineParams.nutrimatState`
— tolerantly read like any Nutrimat state.

**Loop Narration** (experiment observability): the shell persists a dimmed
interim note (`kind=interim` — filtered from every LLM replay/compaction/Prak/RAG
path, never model context, never parent inbox) per iteration round and live-emits
it to the user progress channel. The **wording of the round note is Nature property**
(the Nature calls `narrateRound` with its wording, budget vocabulary does not
belong in the base class): a naked counter (`[janx] round 3`, salitos),
`redbull`/`clubmate` count against the hard budget (`[redbull] round 3/40`,
`[clubmate] round 3/40 (extended 2×)`), `absint` quotes the model's words
(`[absint] round 12: TypeScript 7 removed baseUrl. …` — text of the previous
round, naked counter for textless rounds); plus the loop decisions —
`[salitos] stop decision: continue — <own reasoning>`,
`[clubmate] judge: extend — <judge-reason>`, `[janx] safety net: …`. Recipe knob
`params.loopNarration`: `all` (Default) | `rounds` (only round notes,
decisions suppressed — structurally separated, no string filter) | `off`.

**Round Work Log:** Each interim round (tool dispatch, Judge continuation)
persists its text as an interim message (`kind=interim`) — the round whose
text becomes the reply is never persisted (the reply commits the shell).
The client renders interim dimmed and never speaks it; the streaming draft of
the round is replaced by the identical interim message (`isDraftCommit`) — no
freeze, no duplicate. A narration note instead freezes the visible draft as a
live-only transcript entry (`working-` prefix) until a canonical commit with
identical content replaces it (janx ACCEPT) (Live finding 2026-10-04: every
round note deleted the text the user was currently reading). Interim is
filtered from every LLM replay/compaction/Prak/RAG path
(`ChatMessageService.activeHistory`), but remains in the scrollback — visible
dimmed after reload — and does not flow into export or follow-up context.
Implementation: `AbstractNutrimat.appendInterimRoundText` (Server),
`vance-face/src/chat/workingLog.ts` (Client).

## 8. Tests

- **Unit tests in the Addon** (149, 79 for the coffee Natures): framework
  contract (naming, ID validation, tool baseline, worker flags, budget default),
  the loop primitives (`NutrimatPrimitivesTest`: working log persistence, tool
  dispatch, interrupt from `round()`, report channel, narration modes,
  `jsonObjectOf`), per Nature a loop test with scripted streaming model via the
  shared `NutrimatLoopHarness` (janx: nets + validation; redbull: budget →
  exhausted, no rescue; clubmate: extend/synthesize, Judge sees tool work;
  salitos: JSON decision, endless, format correction; absint: JSON report,
  format fallback), Judge parsing + degradation, `//nutrimat` commands (incl.
  budget-less Natures), drain loop (one Inbox = one turn, continue gate).
- **E2E (`qa/ai-test`, `@Tag("llm")`)** with real model calls:
  `NutrimatLoopsLlmTest` (all five Natures reply standalone to a bootstrapped
  Session), `NutrimatWorkerLlmTest` (Arthur spawns `nutrimat-janx` as a worker
  and gets the reply — the Ford contract proven E2E). The coffee Natures are
  consciously not registered there (`llm`-tests are opt-in); their E2E path is
  the benchmark lane.
- **Benchmark Lane (`qa/benchmark`, Package `…benchmark.nutrimat`):**
  `AbstractNutrimatLoopBenchmark` carries a fixed set of tasks, a three-line
  subclass per Nature (`Nutrimat<Nature>Benchmark`) — the class is the Nature,
  the method the task, the report reads as a matrix Nature × Task. Each task
  spawns the Nature as a **Worker** (`process_spawn`, Recipe
  `nutrimat-<nature>`) and waits until it is `IDLE`/`BLOCKED`/`CLOSED`. Tasks:
  short without tool (17 × 23), short with tool (`current_time`), long (summarize
  two documents), trap missing data (honest "not found" instead of invented
  number), trap open search (all documents with "parachute"), ambiguous task
  (query instead of guessing). Evaluation per task (4.0): settled 1.0, reply
  1.0, task-specific check 2.0 — mechanical, without Judge. The detail line
  carries status, rounds, outcome, and reports from `nutrimatState`; usage
  (tokens/costs) from the process tree. Call:
  `./wb qa benchmark -Dtest='Nutrimat*Benchmark'` (or a class); results like
  any benchmark after `qa/benchmark/results/`.

## 9. Creating a new Nature

1. Subclass `AbstractNutrimat` (`natureId()` = `[a-z0-9]+`, `loopType()` =
   single line), `@Component` — the Registry finds it on boot.
2. Build `runLoop` from the primitives — copy `janx` (or the Nature closest
   to the experiment) as a template. `round()` provides the interrupt; never
   swallow `NutrimatInterruptedException` (rethrow before every broad `catch`).
   Never accept an empty reply as a reply.
3. A Recipe `nutrimat-<n>` (`listed: true`, `category: experimental`) +
   optional own prompt section in `promptPrefix`.
4. Unit test for the policy + optionally an E2E call in `NutrimatLoopsLlmTest`.

## 10. History

- `planning/nutrimat-engine.md` — design plan, decisions, open points (naming
  world of drinks/teas from `instructions/nutrimat-engine.md`).
- Built 2026-10: Framework + `janx` (Commit "feat(nutrimat): loop-lab
  framework"), `redbull`/`mate`/`salitos` (Commit "feat(nutrimat):
  redbull/mate/salitos loop natures"), E2E lanes, this document.
- Renamed 2026-10: Nature `mate` → `clubmate` — Engine `nutrimat-clubmate`,
  Recipes `nutrimat-clubmate`/`nutrimat-judge-clubmate`, Class
  `NutrimatClubmate` in package `…nutrimat.clubmate`. Running processes with
  old engine names are not migrated (experiment lane, not production line).
- New 2026-10: Nature `absint` — the natural stop with accountability: a
  non-empty LightLlm round report per stop (`nutrimat-judge-absint`), noted
  in `nutrimatState.roundReports` and as NOTIFY to the client.
- Refactored 2026-10: **Loop form is Nature property.** `iterationBudget()`
  replaces the base budget (`maxIterations` has since been a property of
  redbull/clubmate, each with its own default; janx/salitos/absint run
  unlimited until natural stop, the wallclock net caps each turn per round).
  The accounting channel became the Nature call `report(state, text)` — the
  Nature sends whenever it makes sense (absint per stop, salitos with the
  judgment), the base notes live in `nutrimatState` (`//nutrimat status` sees
  reports mid-turn) and notifies; the round note wording is Nature hook
  (`roundNarration`).
- Refactored 2026-10: **`janx` is the reference with its own loop.** The base
  received the loop primitives (`round()` with built-in interrupt,
  `dispatchTools()`, `haltRequested()`; narration/work log `protected`),
  `runLoop` is overridable, the previous kernel remains the default for the
  hook Natures. `janx` mimics the Ford loop after its refactoring (safety nets
  instead of round cap, reply → `IDLE`, worker safety stop → `INCOMPLETE`, chat
  → `BLOCKED`); previously `janx` was the kernel with wallclock rescue — a
  Ford state that no longer exists.
- Refactored 2026-10: **Each Nature owns its loop**, the default kernel and
  the loop hooks (`onNaturalStopCandidate`, `onExhausted`, `onLlmFailure`,
  `roundNarration`, `LoopState`/`StopDecision`/`ExhaustionDecision`, base
  validation, base wallclock) are removed — they pulled properties of individual
  Natures through all (validation was silently inherited by redbull/clubmate,
  salitos/absint lost it; budget segments and extensions belonged only to
  clubmate). salitos decides itself via JSON instead of via Judge and no longer
  has `maxDecisions` (that was a hidden round limit); absint reports itself via
  JSON instead of via Judge, who summarized the draft without seeing the tool
  work. Kernel errors also fixed: an empty reply ended silently without reply
  (an asynchronous parent waited forever), a Primary parked `BLOCKED` after
  each reply.
- New 2026-10: **the coffee Natures** `filter`, `cappuccino`, `espresso`,
  `ristretto`, `mokka`, `affogato`, `macchiato`, `cortado`, `lungo` (§4.1)
  and the **benchmark lane** in `qa/benchmark` (§8). For this, three base
  primitives were added (`invokeTool`, `withModel`, `LoopInputs.withToolSpecs`)
  and in `vance-brain` `EngineChatFactory.forModelSpec` /
  `ChatBehaviorBuilder.forSpec` (a second model per turn with the same defaults
  and the same accounting). New Natures are named after coffee drinks; the first
  five retain their names.
- Open: `//nutrimat info` diagnosis; first lane runs (baseline across all
  fourteen Natures).
