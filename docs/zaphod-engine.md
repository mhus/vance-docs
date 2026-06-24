---
title: "Vance — Zaphod Think Engine"
parent: Documentation
permalink: /docs/zaphod-engine
render_with_liquid: false
---

<!-- AUTO-GENERATED from specification/public/en/zaphod-engine.md — do not edit here. -->

---
# Vance — Zaphod Think Engine

> **Zaphod** is the **Multi-Head** engine: several independent agents ("heads") work on the same question, and Zaphod synthesizes their views into one answer. While Marvin decomposes **vertically** (sub-tasks deeper) and Vogon structures **temporally** (phases with gates), Zaphod works **horizontally**: parallel perspectives on the same matter. Two heads, three brains, one answer.
>
> See also: [think-engines](/docs/think-engines) | [arthur-engine](/docs/arthur-engine) | [ford-engine](/docs/ford-engine) | [marvin-engine](/docs/marvin-engine) | [vogon-engine](/docs/vogon-engine) | [recipes](/docs/recipes)

---

## 1. Role and Classification

Zaphod is the fifth Engine class alongside Arthur, Ford, Marvin, Vogon. It fills a previously open architectural axis: **multi-perspective on the same question**.

| Engine | Axis | Data Model |
|---|---|---|
| `arthur` | Reactive Chat, User-IO | Chat History (linear) |
| `ford` | Generalist-Worker, one question → one answer | Chat History (linear) |
| `vogon` | Temporally structured, phases with gates | Strategy-State (static) |
| `marvin` | Vertical Decomposition, Sub-Trees | Task-Tree (dynamic) |
| **`zaphod`** | **Horizontal Multi-View, parallel heads** | **Flat Heads List** |

**Use Cases:**

- **Consultation with multiple views**: "Should I choose architecture A or B?" → Optimist / Skeptic / Pragmatist
- **Structured Review**: "Is this plan viable?" → Proponent / Critic / Risk Analyst
- **Multi-Model Diversity**: run the same question through multiple providers/models, then synthesize
- **Self-Consistency** (V2 / Branch-and-Vote Pattern): N parallel attempts, Best-of-N

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
| **`debate`** | 2-N heads with opposing roles. Round 0: initial position. Round 1..N-1: each head sees the answers of the others from the previous round and reacts. Between rounds, a LightLlm call checks if consensus is reached; otherwise, the next round runs until consensus or `maxRounds` is reached. Synthesizer summarizes the last round. | N (1..maxRounds) | ✓ |
| `generator-critic` (later) | Generator produces, Critic criticizes, Generator iterates. Bounded to max-N rounds or "Critic accepts". | N | — |
| `branch-and-vote` (later) | N heads independently solve the same task (same Persona, slightly different temperature). Judge selects the best solution. | 1 + Judge | — |

V1 Assumptions (to be relaxed later):

- **Sequential** instead of parallel — heads are driven one after another synchronously (analogous to Vogon phases / Marvin workers). Parallelism is a performance optimization, not a V1 feature; it does not change the round semantics.
- **Direct Synthesizer LLM Call** — Zaphod calls the LLM itself at the end (analogous to Marvin's PLAN/AGGREGATE), no separate Synthesizer Sub-Process.
- **Consensus-Check via LightLlm**, not Self-Report — see §6. Heads end their replies *without* markers (no `[CONSENSUS]`); a separate Light-LLM call (Recipe `zaphod-consensus`, `internal: true`) decides per round.

---

## 3. Data Model

`ZaphodState` lives on `ThinkProcessDocument.engineParams.zaphodState` — analogous to Vogon's `strategyState`. Only a handful of heads per Process (typically 2–5), so embedded instead of a separate Mongo collection.

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
  persona           String?                         // optional Steer-Postfix per head
  spawnedProcessId  String?                         // set on first Spawn (Round 0)
                                                     // — for debate, the same Sub-Process is reused
                                                     // across all Rounds, NOT respawned per Round
  replies           List<String>                    // one per Round; length == state.currentRound+1
                                                     // if the head has completed the current Round
  status            "pending" | "running" | "done" | "failed"
                                                     // "done" = last Round successful
                                                     // "failed" = any Round empty/Exception, head is out
  failureReason     String?
}
```

**Head reuse across Rounds (debate):** a head is spawned once and driven across all rounds via `steer(...)`. The Worker Process retains its chat history, thus implicitly seeing what *it itself* said in previous rounds. The Zaphod Engine injects the last-round replies of the *other* heads as an additional user message before the next round. Only after the Synthesizer turn (or on abort) is the head process terminated via `stop(...)`.

**Council remains unchanged:** `maxRounds=1`, `currentRound=0`, `consensusReached` and `consensusReason` unused. Council heads are spawned, driven once, then stopped as before.

**Mongo Persistence:** the complete State document is written atomically via `ThinkProcessService.replaceEngineParams` (same pattern as Vogon).

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
  1. drainPending() — defensively for InboxAnswer / ProcessEvents (V1 not expected
     in sync-pattern, but harmlessly drained).
  2. Load State.
  3. If status == "done"  → ThinkProcessStatus.DONE, return.
     If status == "failed" → ThinkProcessStatus.STALE, return.

  4. If currentHeadIndex < heads.size():
       // Within the current Round: drive the next head.
       head := heads[currentHeadIndex]
       driveHeadForRound(head, currentRound)   // see §5
       state.currentHeadIndex++
       persistState()
       eventEmitter.scheduleTurn(self)
       return

  5. Else (all heads processed in this Round):
       If pattern == "council" OR currentRound + 1 >= maxRounds:
         // Round-Loop is finished — either because single-shot or
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

       // Start next Round — Heads remain the same, Sub-Processes
       // are NOT respawned.
       state.currentRound++
       state.currentHeadIndex = 0
       state.status = "running"
       persistState()
       eventEmitter.scheduleTurn(self)
       return
```

**One Round = one pass through all Heads.** The round counter is *only* incremented if all living heads (`status != failed`) have produced a reply in the current round — after that, the Consensus Check runs (debate only), and either synthesis occurs or the next round begins.

**Lane Discipline** as with Vogon and Marvin: `runTurn` performs **one action** per call (drive one head, or Consensus Check, or Synthesis), then `scheduleTurn` for the next step. This keeps the lane occupied for a short time, allowing other tasks (e.g., Arthur's `process_steer` no-op) to run in between. The Consensus Check counts as *one* `runTurn` step — it is a synchronous LightLlm call (typically <2 seconds), not a separate Sub-Process.

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
    child = thinkProcessService.findById(head.spawnedProcessId)   // existing Sub-Process

  // ── Steer-Content for this Round ──
  If round == 0:
    steerContent = process.goal
                   + (head.persona != null ? "\n\n[Your Role / Persona]\n" + head.persona : "")
  Else:   // debate, round >= 1
    steerContent = "[Round " + (round+1) + " of " + maxRounds + "]\n\n"
                   + "Previous view of the other heads:\n"
                   + foreach otherHead in heads where otherHead.name != head.name:
                       "\n--- " + otherHead.name + " ---\n"
                       + (otherHead.replies.last() ?? "[failed in previous round]")
                   + "\n\nComment on this — confirm, clarify, contradict. "
                   + "If your previous view was justifiably corrected by another argument, "
                   + "state that explicitly."

  // ── Drive (synchronous, Lane-bound) ──
  driveSync(child, steerContent):
    laneScheduler.submit(child.id, () -> engine.steer(child, msg)).get()

  // ── Collect Reply ──
  reply = readLastAssistantText(child)   // last ASSISTANT message in the Worker Chat
  If reply == null or blank:
    head.status = "failed"
    head.failureReason = "worker produced no assistant reply in round " + round
  Else:
    head.replies.append(reply)
    head.status = "running"   // remains running until synthesis runs
  persistState()
```

**Worker Process Reuse across Rounds:** the worker retains its chat history across rounds. In Round 1, the worker sees its own Round 0 output in the system prompt + chat history, plus the block with the other heads' replies provided by the Zaphod Engine code. The worker is **only stopped after the Zaphod process completes** — Synthesizer turn (or Failure / Stop by User) is the stop trigger.

**Persona Mechanism:** the Persona is passed as a Steer-Postfix below the Goal in **Round 0** (not repeated in every round — the worker history carries it). The Recipe Prompt defines the *Engine Role* (e.g., "You are a Ford worker..."); the *Personality* (Optimist / Skeptic / Pro / Con) is the Persona.

**Worker Engine Choice:** typically `ford` as the Engine (= Generalist-Worker, one answer). Theoretically, `marvin-worker` is also possible (= head that performs deep research itself) — this works without Engine code changes, the Recipe Resolver handles it. V1 only documents the Ford use case.

**Failure per Head:** if a head fails in a round (empty reply, exception), it is set to `failed` and skipped in subsequent rounds. As long as at least two heads are alive, debate continues. If it falls below two → abort round loop, synthesize with existing replies. Only if ALL heads fail does the entire Process go to STALE.

---

## 6. Consensus Check (debate-only)

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
  4. On Schema Error / Budget Exhaustion: consensus=false, reason="check failed: <error>" — no
     Process-Failure, but fall-through to next Round (or maxRounds-backstop).
```

**Threshold:** the LightLlm prompt defines consensus as "the heads agree on the **actionable conclusions** — minimal nuances, different justifications for the same recommendation, or complementary rather than contradictory views count as consensus. True dissent = heads draw different practical conclusions." This avoids the check triggering on purely stylistic differences.

**Cost-Bound:** one check call per round, thus a maximum of `maxRounds - 1` additional LightLlm calls per Process. The check runs via the `default:fast` alias (see `zaphod-consensus` recipe), not the expensive synthesis model alias.

**Consensus-Prompt** is located in the recipe `_vance/recipes/zaphod-consensus.yaml` as `promptPrefix` (Pebble template). Unlike the Synthesizer Prompt, there is no separate cascade path under `_vance/prompts/` — LightLlm recipes carry their system prompt directly in the YAML, Tenants/Projects override via the standard recipe cascade (project → tenant → bundled).

---

## 7. Synthesizer (direct LLM Call)

After the round loop concludes (consensus or maxRounds reached), Zaphod **directly** calls an LLM — analogous to Marvin's AGGREGATE step. No Sub-Process, no Recipe.

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

**Synthesizer only sees the last Round.** The assumption: converged views are consolidated in the last round; older rounds serve only the Debate process itself. If the Synthesizer benefits from the entire round history, the Recipe would need to explicitly request it — V1 focuses on the last round (cost + clarity).

**Engine-Default Synthesizer-System-Prompt** is located under `_vance/prompts/zaphod-synthesis.md` (Cascade path, recipe-override via `promptDocument`). Structures the recommendation typically into consensus / differences / recommendation.

Recipe-Param `synthesisPrompt` is appended to the userMessage-prefix — suitable for providing pattern-specific synthesis instructions ("Summarize the three views with structure: 1. Consensus, 2. Differences, 3. Concrete Recommendation").

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
      3. A concrete course of action.
```

### 8.2 Debate (multi-round, Consensus-Stop)

```yaml
- name: debate-pro-contra
  description: |
    Pro/Con debate with max. 3 rounds. After each round, a
    LightLlm check verifies if consensus is reached; otherwise, the next
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
          reasons why it might fail. Respond to counter-
          arguments objectively; change your position only if the
          counterargument is objectively stronger.
    synthesisPrompt: |
      Summarize the final position of both heads. Structure:
      1. What did Pro and Con agree on (or: where does
         dissent remain after 3 rounds)?
      2. Which arguments were decisive?
      3. A concrete course of action with justification.
```

### 8.3 Validation on Spawn

- `pattern` must be `council` or `debate`.
- `heads`: non-empty list, each element with `name` + `recipe`. For `debate`, at least 2 heads.
- `name`s must be unique within the list (same name would cause Sub-Process naming collision).
- `maxRounds`: only evaluated for `debate`. Default 3, hard-cap 10 (see §13). Ignored for `council` (engine enforces 1).
- `synthesisPrompt` is optional — if missing, default prompt from Engine.

---

## 9. Composition with other Engines

| Configuration | Works? | Note |
|---|---|---|
| Arthur → Zaphod | ✓ | Default use case. Arthur spawns a `council-*` or `debate-*` recipe, receives synthesis as ProcessEvent. |
| Vogon → Zaphod | ✓ | A Vogon phase can spawn a Zaphod Council/Debate as a Phase-Worker (e.g., "Phase: Architecture-Council"). Synthesis lands as Phase-Artifact. |
| Marvin → Zaphod | ✓ | Marvin-WORKER node can use a Council/Debate recipe if the sub-task is multi-perspective. Clean recursion: Marvin-Tree-node is horizontally multi-perspective. |
| Zaphod → Marvin/Vogon | ✓ | A head can itself be a Marvin-Worker (e.g., "Architect" head that performs deep research) or execute a Vogon phase plan. Via recipe indirection without engine code change. |
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

Thus, in the DONE case, Zaphod **directly provides the synthesis as humanSummary** — Arthur (or Vogon) can quote it or present it to the user via an Inbox item. The `consensusReached` flag in the payload allows calling engines to distinguish between "true consensus" and "maxRounds backstop".

---

## 11. Bundled Recipes

Initial repertoire:

| Name | Purpose |
|---|---|
| `zaphod` | Engine-Default — deliberately minimal: Pattern must be explicitly set, otherwise error. Catch-all for engine-direct-Spawns (tests). |
| `council-three-perspectives` | Optimist / Skeptic / Pragmatist, single-shot synthesis |
| `debate-pro-contra` | Pro / Con, max 3 rounds with consensus stop |
| `zaphod-consensus` | LightLlm-Recipe (`internal: true`), called per round by engine code — decides `consensus: bool`. No direct spawn by tools/users. |

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
- **Per-Head-Lane-Timeout:** no separate timeout in V1 — Sub-Process behavior applies as before.
- **Token-Bound for Synthesizer:** not yet in V1; if needed later, analogous to Marvin AGGREGATE `maxOutputChars`.

Later extensions analogous to Vogon §11: `maxTotalCostUsd`, `maxWallclockSeconds`, `maxHeadSpawns` as Recipe-Bounds.

---

## 14. Open Points (later)

- **Parallel Heads.** V1 sequential. Later: drive heads in parallel on their own lanes, wait for all DONE of the current round, then Consensus Check + potentially next round. Performance × N per round.
- **Generator-Critic Pattern.** Alternating step G→C→G→C, bounded to max-N rounds or "Critic accepts". Structurally like debate, but asymmetric roles (only one head revises its artifact, the other criticizes).
- **Branch-and-Vote.** Self-Consistency with identical heads + Judge. Recipe-Param `votingStrategy` (`majority`, `judge-llm`, `longest-reply`-heuristic).
- **Brainstorm Mode.** Multi-round without strict consensus requirement — stop criterion is "idea saturation" (new round brings nothing new) instead of "heads agree". Requires a separate check prompt.
- **Per-Head-Consensus-Vote.** Today, the LightLlm check decides universally. Variant: each head replies additionally with `[CONSENSUS]`/`[DISSENT]`; consensus reached if all live heads signal `[CONSENSUS]`. More self-report risk, but no additional LLM call.
- **Model Diversity.** Per-head recipe can already choose different models via Recipe-Params. Later: explicitly documented + bundled recipe demonstrating this.
- **Persona Composition.** V1: Persona is append-only to the steer message. Later: separate Persona library with reusable roles (`@personas/skeptic`, `@personas/cost-optimizer`, ...).
- **User-Steering during runtime.** "Add another head", "end synthesis now with what's available", "let the skeptic argue differently again". External commands, not implemented in V1.
- **Persisted Round Histories.** With higher `maxRounds`, replies grow — separate Mongo collection `zaphod_replies` analogous to `marvin_nodes`, if state size exceeds engineParams embedding.
- **Synthesis Validation.** Does the synthesizer reply explicitly include all heads? Later: Validator loop like Marvin Worker Output (1-2 correction re-prompts if a head is not referenced).
