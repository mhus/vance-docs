# Vancetope — Zaphod Think Engine

> **Zaphod** is the **Multi-Head** engine: several independent agents ("heads") work on the same question, and Zaphod synthesizes their views into one answer. While Marvin decomposes **vertically** (sub-tasks deeper) and Vogon structures **temporally** (phases with gates), Zaphod works **horizontally**: parallel perspectives on the same matter. Two heads, three brains, one answer.
>
> See also: [think-engines](think-engines.md) | [arthur-engine](arthur-engine.md) | [ford-engine](ford-engine.md) | [marvin-engine](marvin-engine.md) | [vogon-engine](vogon-engine.md) | [recipes](recipes.md)

---

## 1. Role and Classification

Zaphod is the fifth engine class, alongside Arthur, Ford, Marvin, and Vogon. It fills a previously open architectural axis: **multi-perspective on the same question**.

| Engine | Axis | Data Model |
|---|---|---|
| `arthur` | Reactive Chat, User-IO | Chat History (linear) |
| `ford` | Generalist-Worker, one question → one answer | Chat History (linear) |
| `vogon` | Temporally structured, phases with gates | Strategy-State (static) |
| `marvin` | Vertical Decomposition, Sub-Trees | Task-Tree (dynamic) |
| **`zaphod`** | **Horizontal Multi-View, parallel heads** | **Flat Heads List** |

**Use Cases:**

- **Consultation with multiple perspectives**: "Should I choose architecture A or B?" → Optimist / Skeptic / Pragmatist
- **Structured Review**: "Is this plan viable?" → Proponent / Critic / Risk Analyst
- **Multi-Model Diversity**: run the same question through multiple providers/models, then synthesize
- **Self-Consistency** (V2 / Branch-and-Vote Pattern): N parallel attempts, best-of-N

**What Zaphod is not:**

- Not a Tree-Builder — the heads are a *flat* list, not a hierarchy. (Marvin's job)
- No phases — all heads work on the same step. (Vogon's job)
- No direct user chat — user only sees the synthesis, via Arthur. (Arthur's job)

---

## 2. Patterns

Zaphod currently supports **two** patterns (synonym: "modes"). Two more remain open points for later:

| Pattern | Mechanism | Rounds | Implemented |
|---|---|---|---|
| **`council`** | All heads receive the same question once. Synthesizer LLM call summarizes: consensus + dissent + recommendation. | 1 (single-shot) | ✓ |
| **`debate`** | 2-N heads with opposing roles. Round 0: initial position. Round 1..N-1: each head sees the other's answers from the previous round and reacts. Between rounds, a LightLlm call checks if consensus is reached; otherwise, the next round runs until consensus or `maxRounds` is reached. Synthesizer summarizes the last round. | N (1..maxRounds) | ✓ |
| `generator-critic` (later) | Generator produces, Critic criticizes, Generator iterates. Bounded to max-N rounds or "Critic accepts". | N | — |
| `branch-and-vote` (later) | N heads independently solve the same task (same Persona, slightly different temperature). Judge selects the best solution. | 1 + Judge | — |

V1 Assumptions (to be relaxed later):

- **Sequential** instead of parallel — heads are driven synchronously one after another (analogous to Vogon phases / Marvin workers). Parallelism is a performance optimization, not a V1 feature; it does not change the round semantics.
- **Direct Synthesizer LLM Call** — Zaphod calls the LLM itself at the end (analogous to Marvin's PLAN/AGGREGATE), no separate Synthesizer sub-process.
- **Consensus-Check via LightLlm**, not Self-Report — see §6. Heads end their replies *without* markers (no `[KONSENS]`); a separate Light-LLM call (Recipe `zaphod-consensus`, `internal: true`) decides per round.

---

## 3. Data Model

`ZaphodState` lives on `ThinkProcessDocument.engineParams.zaphodState` — analogous to Vogon's `strategyState`. Only a handful of heads per process (typically 2–5), hence embedded instead of a separate Mongo collection.

```
ZaphodState {
  pattern             "council" | "debate"
  heads               List<ZaphodHead>
  currentHeadIndex    int                // 0..heads.size()-1, Cursor within the current Round
  currentRound        int                // 0-indexed; always 0 for council
  maxRounds           int                // from Recipe; council=1, debate default=3
  consensusReached    boolean            // set by Consensus-Check (debate only)
  consensusReason     String?            // explanation from LightLlm-Check, audit/debug
  synthesizerPrompt   String?            // taken from Recipe, or null = engine-default
  synthesis           String?            // final result, after Synthesizer-Call
  status              "spawning" | "running" | "checking_consensus" | "synthesizing" | "done" | "failed"
  failureReason       String?
}

ZaphodHead {
  name              "optimist" | "skeptiker" | …    // unique within the heads list
  recipe            String                          // Ford-Recipe that implements the head
  persona           String?                         // optional steer postfix per head
  spawnedProcessId  String?                         // set on first spawn (Round 0)
                                                     // — for debate, the same sub-process is reused
                                                     // across all rounds, NOT respawned per round
  replies           List<String>                    // one per round; length == state.currentRound+1
                                                     // if the head has completed the current round
  status            "pending" | "running" | "done" | "failed"
                                                     // "done" = last round successful
                                                     // "failed" = any round empty/exception, head is out
  failureReason     String?
}
```

**Head reuse across rounds (debate):** a head is spawned once and driven across all rounds via `steer(...)`. The worker process retains its chat history, thus implicitly seeing what *it itself* said in previous rounds. The Zaphod engine injects the last-round replies of the *other* heads as an additional user message before the next round. Only after the synthesizer turn (or on abort) is the head process terminated via `stop(...)`.

**Council remains unchanged:** `maxRounds=1`, `currentRound=0`, `consensusReached` and `consensusReason` unused. Council heads are spawned, driven once, then stopped as before.

**Mongo Persistence:** the complete state document is written atomically via `ThinkProcessService.replaceEngineParams` (same pattern as Vogon).

---

## 4. Engine Lifecycle

```
start(process, ctx):
  1. Load Pattern + Heads-Spec from Recipe-Params (engineParams).
  2. Validate:
       - pattern in {"council", "debate"}.
       - heads non-empty, each head has name+recipe, name unique.
       - for debate: heads.size() >= 2 (single-head-debate is pointless).
       - maxRounds: council always 1; debate from Recipe-Param maxRounds
         (default 3, hard-cap 10 — see §13).
  3. Initialize ZaphodState:
       pattern: from Recipe
       heads: List<ZaphodHead> with status=pending, replies=[] per head
       currentHeadIndex: 0
       currentRound: 0
       maxRounds: 1 (council) | params.maxRounds (debate)
       consensusReached: false
       synthesizerPrompt: from params.synthesisPrompt (or null)
       status: "running"
  4. persistState(); ThinkProcessStatus.READY
  5. eventEmitter.scheduleTurn(self) — Lane is started

runTurn(process, ctx):
  1. drainPending() — defensively for InboxAnswer / ProcessEvents (not expected in V1
     in sync-pattern, but harmlessly drained).
  2. Load state.
  3. If status == "done"  → ThinkProcessStatus.DONE, return.
     If status == "failed" → ThinkProcessStatus.STALE, return.

  4. If currentHeadIndex < heads.size():
       // Within the current round: drive the next head.
       head := heads[currentHeadIndex]
       driveHeadForRound(head, currentRound)   // see §5
       state.currentHeadIndex++
       persistState()
       eventEmitter.scheduleTurn(self)
       return

  5. Else (all heads processed in this round):
       If pattern == "council" OR currentRound + 1 >= maxRounds:
         // Round loop is over — either because single-shot or
         // because maxRounds was reached (backstop without consensus).
         runSynthesis()                         // §7
         finalizeDone()
         return

       // pattern == "debate" AND rounds are left — Consensus-Check.
       state.status = "checking_consensus"; persistState()
       result := runConsensusCheck()           // §6
       state.consensusReached = result.consensus
       state.consensusReason  = result.reason
       persistState()

       If result.consensus:
         runSynthesis(); finalizeDone(); return

       // Start next round — Heads remain the same, Sub-Processes
       // are NOT respawned.
       state.currentRound++
       state.currentHeadIndex = 0
       state.status = "running"
       persistState()
       eventEmitter.scheduleTurn(self)
       return
```

**One Round = one pass through all Heads.** The round counter is *only* incremented if all living heads (`status != failed`) have produced a reply in the current round — after that, the Consensus-Check runs (debate only), and either synthesis occurs or the next round begins.

**Lane Discipline** as with Vogon and Marvin: `runTurn` performs **one action** per call (drive one head, or Consensus-Check, or Synthesis), then `scheduleTurn` for the next step. This keeps the lane occupied for a short time, allowing other tasks (e.g., Arthur's `process_steer` no-op) to run in between. The Consensus-Check counts as *one* `runTurn` step — it is a synchronous LightLlm call (typically <2 seconds), not a separate sub-process.

---

## 5. Head Spawn and Sync-Drive

```
driveHeadForRound(head, round):
  // ── Spawn (only in Round 0, or if debate later allows re-runs — not in V1) ──
  If head.spawnedProcessId == null:
    Resolve Recipe via RecipeResolver.apply(tenantId, projectId, head.recipe).
    Spawn Sub-Process (parentProcessId = zaphod.id):
       name = "zaphod-<zaphodId>-<head.name>"
       title = "Zaphod head: <head.name>"
       goal = process.goal     // same question for all heads
    head.spawnedProcessId = child.id; persistState().
    thinkEngineService.start(child).

  Else:
    child = thinkProcessService.findById(head.spawnedProcessId)   // existing sub-process

  // ── Steer-Content for this Round ──
  If round == 0:
    steerContent = process.goal
                   + (head.persona != null ? "\n\n[Your Role / Persona]\n" + head.persona : "")
  Else:   // debate, round >= 1
    steerContent = "[Round " + (round+1) + " of " + maxRounds + "]\n\n"
                   + "Previous views of the other heads:\n"
                   + foreach otherHead in heads where otherHead.name != head.name:
                       "\n--- " + otherHead.name + " ---\n"
                       + (otherHead.replies.last() ?? "[failed in previous round]")
                   + "\n\nComment on this — confirm, clarify, or contradict. "
                   + "If your previous view was legitimately corrected by another argument, "
                   + "state that explicitly."

  // ── Drive (synchronous, Lane-bound) ──
  driveSync(child, steerContent):
    laneScheduler.submit(child.id, () -> engine.steer(child, msg)).get()

  // ── Collect Reply ──
  reply = readLastAssistantText(child)   // last ASSISTANT message in worker chat
  If reply == null or blank:
    head.status = "failed"
    head.failureReason = "worker produced no assistant reply in round " + round
  Else:
    head.replies.append(reply)
    head.status = "running"   // remains running until synthesis runs
  persistState()
```

**Worker Process Reuse Across Rounds:** the worker retains its chat history across rounds. In Round 1, the worker sees its own Round 0 output in the system prompt + chat history, plus the block with the other heads' replies provided by the Zaphod engine code. The worker is **only stopped after the Zaphod process completes** — the Synthesizer turn (or Failure / Stop by user) is the stop trigger.

**Persona Mechanism:** the Persona is passed as a steer postfix below the Goal in **Round 0** (not repeated in every round — the worker history carries it). The Recipe prompt defines the *engine role* (e.g., "You are a Ford worker..."); the *personality* (Optimist / Skeptic / Pro / Con) is the Persona.

**Worker Engine Choice:** typically `ford` as the engine (= generalist worker, one answer). Theoretically, `marvin-worker` is also possible (= head that conducts deep research itself) — this works without engine code changes, the Recipe Resolver handles it. V1 only documents the Ford use case.

**Failure per Head:** if a head fails in a round (empty reply, exception), it is set to `failed` and skipped in subsequent rounds. As long as at least two heads are alive, debate continues. If it falls below two → abort round loop, synthesize with available replies. Only if ALL heads have failed does the entire process go to STALE.

---

## 6. Consensus-Check (debate-only)

After each complete round (all living heads have replied in the current round), Zaphod checks if consensus has already been reached. Implementation: a synchronous call against `LightLlmService` with the bundled recipe `zaphod-consensus` (`internal: true` — ignored by the standard recipe selector).

```
runConsensusCheck() -> { consensus: bool, reason: string }:
  1. Collect the Last-Round-Replies (replies[currentRound]) of all Heads with status != failed.
  2. Render User-Message:
       Question: <process.goal>

       Current Views (Round <currentRound+1> of <maxRounds>):
       --- <head1.name> ---
       <head1.replies[currentRound]>
       --- <head2.name> ---
       <head2.replies[currentRound]>
       ...

       Do the heads agree substantively? Provide JSON
       { "consensus": true|false, "reason": "<a single sentence explanation>" }.
  3. lightLlmService.call(recipe="zaphod-consensus", user=<above block>, schema=ConsensusCheckResult.class)
  4. On schema error / budget exhaustion: consensus=false, reason="check failed: <error>" — no
     process failure, but fall-through to next round (or maxRounds backstop).
```

**Threshold:** the LightLlm prompt defines consensus as "the heads agree on the **actionable conclusions** — minimal nuances, different justifications for the same recommendation, or complementary rather than contradictory views count as consensus. True dissent = heads draw different practical conclusions." This prevents the check from triggering on purely stylistic differences.

**Cost-Bound:** one check call per round, thus a maximum of `maxRounds - 1` additional LightLlm calls per process. The check runs using the `default:fast` alias (see `zaphod-consensus` recipe), not the expensive synthesis model alias.

**Consensus-Prompt** is located in the recipe `_vance/recipes/zaphod-consensus.yaml` as `promptPrefix` (Pebble template). Unlike the Synthesizer prompt, there is no separate cascade path under `_vance/prompts/` — LightLlm recipes carry their system prompt directly in the YAML, Tenants/Projects override via the standard recipe cascade (project → tenant → bundled).

---

## 7. Synthesizer (Direct LLM Call)

After the round loop completes (consensus or maxRounds reached), Zaphod **directly** calls an LLM — analogous to Marvin's AGGREGATE step. No sub-process, no recipe.

```
runSynthesis():
  1. Collect all Heads with replies.last() != null. Failed Heads are
     either omitted or mentioned with "[head failed: <reason>]" marker
     so the Synthesizer understands why a view is missing.
  2. Build prompt:
       systemMessage  = SYNTHESIS_SYSTEM_PROMPT  (engine-default; Cascade
                                                    from _vance/prompts/zaphod-synthesis.md,
                                                    recipe-override via promptDocument)
       userMessage    = (state.synthesizerPrompt ?: "")
                        + "\n\nQuestion: " + process.goal
                        + (pattern == "debate"
                            ? "\n\n[Debate over " + (state.currentRound+1)
                              + " Round(s), Consensus="
                              + (state.consensusReached ? "yes — " : "no (maxRounds reached) — ")
                              + (state.consensusReason ?? "—") + "]"
                            : "")
                        + "\n\nFinal Head Replies:\n"
                        + foreach head in heads:
                            "--- " + head.name + " ---\n"
                            + (head.replies.last() ?? "[head failed: " + head.failureReason + "]")
  3. AiChat.chatModel().chat(request)   — non-streaming, like Marvin AGGREGATE.
  4. state.synthesis = response.text (via structured JSON, see ZaphodEngine.java §6).
  5. state.status = "done".
  6. persistState().
```

**Synthesizer only sees the last round.** The assumption: converged views are consolidated in the last round; older rounds only serve the debate process itself. If the synthesizer benefits from the entire round history, the recipe would need to explicitly request it — V1 focuses on the last round (cost + clarity).

**Engine-Default Synthesizer System Prompt** is located under `_vance/prompts/zaphod-synthesis.md` (cascade path, recipe-override via `promptDocument`). It typically structures the recommendation into consensus / differences / recommendation.

Recipe-Param `synthesisPrompt` is appended to the userMessage prefix — suitable for providing pattern-specific synthesis instructions ("Summarize the three views with the structure: 1. Consensus, 2. Differences, 3. Recommendation").

---

## 8. Recipe Schema

### 8.1 Council (single-shot)

```yaml
- name: council-three-perspectives
  description: |
    3-person consultation on a decision question: Optimist, Skeptic,
    Pragmatist. Each provides their view, then synthesis.
  engine: zaphod
  params:
    pattern: council
    heads:
      - name: optimist
        recipe: ford
        persona: |
          You are an optimistic consultant. Actively look for opportunities,
          positive effects, feasible solutions.
      - name: skeptiker
        recipe: ford
        persona: |
          You are a skeptical reviewer. Question assumptions, look for
          risks, identify worst-case scenarios.
      - name: pragmatiker
        recipe: ford
        persona: |
          You provide the grounded view: what is feasible with the
          available resources, in what time, at what cost?
    synthesisPrompt: |
      Summarize the three views. Structure:
      1. What do all agree on?
      2. What are the central differences?
      3. A concrete recommendation for action.
```

### 8.2 Debate (multi-round, Consensus-Stop)

```yaml
- name: debate-pro-contra
  description: |
    Pro/Con debate with max. 3 rounds. After each round, a
    LightLlm check determines if consensus is reached; otherwise, the next
    round runs. Synthesizer summarizes the final position.
  engine: zaphod
  params:
    pattern: debate
    maxRounds: 3              # optional — default 3, hard-cap 10
    heads:
      - name: pro
        recipe: ford
        persona: |
          You argue FOR the proposal. Find the strongest
          reasons why it works. Respond to counterarguments
          objectively; change your position only if the counterargument
          is objectively stronger.
      - name: contra
        recipe: ford
        persona: |
          You argue AGAINST the proposal. Find the strongest
          reasons why it might fail. Respond to counterarguments
          objectively; change your position only if the
          counterargument is objectively stronger.
    synthesisPrompt: |
      Summarize the final position of both heads. Structure:
      1. What did Pro and Con agree on (or: where does
         dissent remain after 3 rounds)?
      2. Which arguments were decisive?
      3. A concrete recommendation for action with justification.
```

### 8.3 Validation on Spawn

- `pattern` must be `council` or `debate`.
- `heads`: non-empty list, each element with `name` + `recipe`. For `debate`, at least 2 heads.
- `name`s must be unique within the list (same name would cause sub-process name collision).
- `maxRounds`: only evaluated for `debate`. Default 3, hard-cap 10 (see §13). Ignored for `council` (engine enforces 1).
- `synthesisPrompt` is optional — if missing, default prompt from engine.

---

## 9. Composition with other Engines

| Configuration | Works? | Note |
|---|---|---|
| Arthur → Zaphod | ✓ | Default use case. Arthur spawns a `council-*` or `debate-*` recipe, receives synthesis as a ProcessEvent. |
| Vogon → Zaphod | ✓ | A Vogon phase can spawn a Zaphod Council/Debate as a phase worker (e.g., "Phase: Architecture-Council"). Synthesis becomes a phase artifact. |
| Marvin → Zaphod | ✓ | Marvin-WORKER node can use a Council/Debate recipe if the sub-task is multi-perspective. Clean recursion: Marvin tree node is horizontally multi-perspective. |
| Zaphod → Marvin/Vogon | ✓ | A head can itself be a Marvin worker (e.g., "Architect" head that researches deeply) or execute a Vogon phase plan. Via recipe indirection without engine code change. |
| Zaphod-in-Zaphod | technically ✓, questionable | Double synthesis dilutes information. Only useful for significantly different patterns (e.g., outer Council with inner Debate head — rather exotic). |

---

## 10. summarizeForParent

Zaphod overrides the hook (analogous to Marvin/Vogon):

```java
ParentReport summarizeForParent(process, eventType):
  state := loadState(process)
  payload := {
    eventType,
    pattern,
    rounds: state.currentRound + 1,        // 1-based for readability
    maxRounds: state.maxRounds,
    consensusReached: state.consensusReached,
    consensusReason: state.consensusReason,
    heads: [{name, status, replyCount: replies.size()}, ...],
    synthesisChars: state.synthesis?.length ?? 0
  }
  if (state.status == "done" && state.synthesis != null):
    return new ParentReport(state.synthesis, payload)
  if (state.status == "failed"):
    return new ParentReport(
        "Zaphod " + pattern + " failed: " + state.failureReason,
        payload)
  // Intermediate event (STOPPED by User; otherwise not expected in V1)
  int doneCount = state.heads.count(h -> h.replies.size() > state.currentRound)
  return new ParentReport(
      "Zaphod " + pattern + " in progress (round " + (state.currentRound+1)
        + "/" + state.maxRounds + ", " + doneCount + "/" + state.heads.size()
        + " heads done in this round)",
      payload)
```

Thus, in the DONE case, Zaphod directly provides the synthesis as `humanSummary` — Arthur (or Vogon) can quote it or present it to the user via an Inbox item. The `consensusReached` flag in the payload allows calling engines to distinguish between "true consensus" and "maxRounds backstop".

---

## 11. Bundled Recipes

Initial repertoire:

| Name | Purpose |
|---|---|
| `zaphod` | Engine default — deliberately minimal: pattern must be explicitly set, otherwise error. Catch-all for engine-direct spawns (tests). |
| `council-three-perspectives` | Optimist / Skeptic / Pragmatist, single-shot synthesis |
| `debate-pro-contra` | Pro / Con, max 3 rounds with consensus stop |
| `zaphod-consensus` | LightLlm-Recipe (`internal: true`), called per round by engine code — decides `consensus: bool`. No direct spawn by tools/users. |
| `council-chat` | SESSION mode session chat (§15): 3 heads (Optimist/Skeptic/Pragmatist), `listed`, category `council` |
| `philosophical-council` | SESSION mode session chat (§15): 7 philosophers from Socrates to Laozi, `listed`, category `council` |
| `council-member` | Ford-Worker for heads: `default:fast`, `inheritContext: none` — cost regulator, referenced by council recipes |

Specialists will be added with experience — analogous to recipe series for Marvin/Vogon. Plausible V1.5 candidates:
- `council-architecture-review` (Architecture / Security / UX)
- `council-decision-quick` (two views, shorter synthesis — for quick decisions)
- `debate-buy-vs-build`, `debate-now-vs-later`

---

## 12. State Machine Status Mapping

`ThinkProcessStatus` is derived from `ZaphodState` — analogous to Marvin's Tree → Status:

```
state.status == "spawning" / "running" / "checking_consensus" / "synthesizing"
                                                          → RUNNING (transient during Lane-Turn)
                                                          → READY  (between Lane-Turns)
state.status == "done"                                   → DONE
state.status == "failed"                                 → STALE
ALL heads failed AND no synthesis                        → STALE
```

The `ParentNotificationListener` reacts to the transition to DONE and calls `summarizeForParent` (see §10).

---

## 13. Bounds and Quotas

- **Max-Heads per Process:** soft-cap 10 (warning + cut-off, no hard exception). More than 10 heads is usually a configuration error.
- **Min-Heads for debate:** 2 (single-head-debate is pointless — rejected on spawn).
- **Max-Rounds for debate:** Recipe-Param `maxRounds`, default 3, hard-cap 10. Values > 10 are clamped to 10 + Warning.
- **Consensus-Check-Budget:** one call per round, thus `maxRounds - 1` additional LightLlm calls maximum. Model default: `default:fast` via `zaphod-consensus` recipe.
- **Per-Head-Lane-Timeout:** no separate timeout in V1 — sub-process behavior applies as before.
- **Token-Bound for Synthesizer:** not yet in V1; if needed later, analogous to Marvin AGGREGATE `maxOutputChars`.

Later extensions analogous to Vogon §11: `maxTotalCostUsd`, `maxWallclockSeconds`, `maxHeadSpawns` as Recipe bounds.

---

## 14. Open Points (Later)

- **Parallel Heads.** V1 sequential. Later: drive heads in parallel on their own lanes, wait for all DONE in the current round, then Consensus-Check + possibly next round. Performance × N per round.
- **Generator-Critic Pattern.** Alternating step G→C→G→C, bounded to max-N rounds or "Critic accepts". Structurally like debate, but asymmetric roles (only one head revises its artifact, the other criticizes).
- **Branch-and-Vote.** Self-consistency with identical heads + Judge. Recipe-Param `votingStrategy` (`majority`, `judge-llm`, `longest-reply`-heuristic).
- **Brainstorm Mode.** Multi-round without strict consensus requirement — stop criterion is "idea saturation" (new round brings nothing new) instead of "heads agree". Requires a separate check prompt.
- **Per-Head Consensus Vote.** Today, the LightLlm check decides universally. Variant: each head additionally replies with `[CONSENSUS]`/`[DISSENS]`; consensus reached if all live heads signal `[CONSENSUS]`. More self-report risk, but no additional LLM call.
- **Model Diversity.** Per-head recipe can already choose different models via Recipe-Params. Later: explicitly documented + bundled recipe demonstrating this.
- **Persona Composition.** V1: Persona is append-only to the steer message. Later: separate Persona library with reusable roles (`@personas/skeptic`, `@personas/cost-optimizer`, ...).
- **User Steering During Run.** "Add another head", "end synthesis now with what's available", "let the skeptic argue differently again". External commands, not implemented in V1.
- **Persisted Round Histories.** With higher `maxRounds`, replies grow — separate Mongo collection `zaphod_replies` analogous to `marvin_nodes`, if state size exceeds engineParams embedding.
- **Synthesis Validation.** Does the synthesizer reply explicitly include all heads? Later: validator loop like Marvin Worker output (1-2 correction re-prompts if a head is not referenced).

---

## 15. Session Mode (Reactive Council Chat)

> Implemented 2026-09-11. Design plan with decision path:
> `planning/zaphod-session-mode.md`; Implementation documentation:
> `readme/zaphod-session-mode.md`.

Session mode (`ZaphodMode.SESSION`, Recipe-Param `sessionMode: true`)
turns a Zaphod process into a **reactive session chat**: The user starts
a session with a Council recipe (`SessionBootstrapRequest.chatRecipe`
or the Session Picker), and **every** user message is deterministically
driven through the Council — no LLM decides whether the Council
convenes. `ZaphodMode.BATCH` is the previous one-time behavior
(still default; persisted old states load as BATCH).

**Core Rule:** *A session turn is a batch run.* The round/head/
synthesis machinery remains unchanged; session mode adds three
things: it **waits** instead of autostarting, it folds user input at the
**turn boundary** into a `turnGoal`, and it **re-arms** instead of
terminating.

### 15.1 Lifecycle

```
start:   Greeting as ASSISTANT chat message (with head names),
         Status IDLE, NO scheduleTurn — wait for input.
runTurn: Turn-Boundary (State not mid-turn):
             drainPending → fold all UserChatInput into turnGoal
             (Multi-Sender with [name]-prefix; no User-Input → IDLE)
             heads reset (PENDING, replies=[], failureReason=null;
                 failed/lost Children → Respawn, healthy ones retain
                 their spawnedProcessId = Persona continuity)
             turnIndex++, set TodoList (N heads + Conclusion, PENDING)
             → next runTurn drives the heads as in Batch.
Mid-turn: DO NOT drain — messages received while a head is being driven
             remain in the queue and start the NEXT Turn
             (Turn-End checks pendingSize and schedules after).
Turn-End: Synthesis as chat reply, clear TodoList, Status IDLE —
             NO closeProcess. Crash/All-heads-failed → Turn FAILED
             with chat note, session remains open.
stop:    stopAllHeads + closeProcess (Session-Close cascade).
```

**Validation:** `sessionMode` only with `pattern: COUNCIL` in v1 (DEBATE
per turn would be mechanically free, but the cost profile will only be
adjusted with experience). `maxRounds` remains Batch-only.

### 15.2 Long-Lived Heads

Heads are spawned on the first turn and live across all turns — their
own chat history carries the conversation (the Optimist *remembers*
what it said in Turn 3). The Round 0 steer content uses `turnGoal`
instead of `process.goal`. Auto-compaction by Ford limits head histories
(triggered at 90% of the context window — condition: `contextWindowTokens
> 0` in ModelCatalog, otherwise the trigger silently never fires).

### 15.3 Visibility

| Channel | Content |
|---|---|
| Chat, `KIND_INTERIM` | **per head reply** a readable, attributed note `**<Name>:** …` on the Council chat process — live visible, dimmed in scrollback, excluded from any LLM replay/compaction path (Frankie's `persistInterimAssistantReply` pattern). |
| Chat (ASSISTANT) | Greeting once; per turn exactly **one** actual message: the synthesis (without draft footer — session mode writes **no** draft documents; chat + head histories are the visible surfaces, BATCH continues to write drafts). |
| TodoList | Turn progress: one item per head + `Conclusion`, ticks per head, cleared at turn end. Uses the generic `todos` checklist (cf. [plan-mode](plan-mode.md) §4, Frankie §9) — the UI renders it engine-agnostic. |
| Head Raw Transcripts | **Silent machinery**: `ThinkProcessDocument.silent` (set on spawn) filters internal steer/reply rows from live push and session scrollback — this also contains the internal single-voice framing text. Audit remains via `//zaphod info <head>` and `process_history_text`. BATCH heads remain visible. |

### 15.4 Synthesis Continuity

The synthesizer is stateless; from Turn 2, the user message carries a
context block `[Previous council conclusion (turn N)]` with title + summary
of the previous turn (state fields, consistently small). The heads do not
need it — their histories carry the conversation.

### 15.5 Engine Command `//zaphod`

Read-only diagnostic verb (Guard style, one verb `zaphod` with subcommand in
the `text` arg; empty defaults to `info`):

- `//zaphod` or `//zaphod info` — Head list: pattern, mode, turn/round-
  cursor, per head status/recipe/reply count/process name/failureReason,
  plus title + summary of the last synthesis.
- `//zaphod info <head>` — Head details: Persona preview, Recipe, Status,
  Failure Reason, last Reply (~300 characters preview), Head Process Name
  (pointer for Runs view / `process_history`).
- Unknown head / foreign engine / missing state → defined
  ERROR outcome, no crash. `runsOnLane() = false` — pure read, the
  verb must not wait behind a hanging head turn.

Mutating verbs (`//zaphod add`, `//zaphod reset`, …) are reserved for §14
User-Steering and will then run on the lane.

### 15.6 Bounds

Fixed per turn: N head turns + 1 synthesis (Council) — in the
`council-chat` default 4, in `philosophical-council` 8 calls per
user message; all captured by `llmCallTracker` quota/metrics. No
turn cap — a chat is unbounded by design, the quota system is the
damper. Recipes explicitly pin synthesis models
(`model: default:analyze,default:fast`), so a broken tenant-
default pair (provider instance without wire type) cannot hard-
crash the turn; heads pin via `council-member` `default:fast`.
