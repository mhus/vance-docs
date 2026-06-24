---
title: "Vance — Structured Engine Output"
parent: Specs
permalink: /specs/structured-engine-output
---

<!-- AUTO-GENERATED from specification/public/en/structured-engine-output.md — do not edit here. -->

# Vance — Structured Engine Output

> An Engine ends each turn with a mandatory `respond` tool call. This tool call contains the user-facing message **plus** a boolean flag that explicitly states whether the Engine is waiting for user input. This eliminates language-dependent intent heuristics, and the Engine lifecycle (BLOCKED vs. READY) is structured rather than guessed from free text.
>
> See also: [arthur-engine](/specs/arthur-engine) | [ford-engine](/specs/ford-engine) | [think-engines](/specs/think-engines) | [recipes](/specs/recipes)

## 1. Problem

Currently, Ford (and thus Arthur, Eddie via delegation) uses an **intent-without-action heuristic**: after each LLM turn, the free text is checked against regex patterns like `"Ich werde X tun"` / `"I'll do X"`. If a pattern matches and **no** tool call occurred, the validator triggers: the LLM receives a correction system prompt and must respond again.

**Three problems with this:**

1.  **Language bias**: Patterns are hard-coded for English + German. French, Spanish, Japanese are not recognized → the validator does not trigger there at all (false negative).
2.  **False Positives**: "Soll ich noch etwas für dich tun?" matches the `Soll ich` pattern, but it's a user question, not an action promise. The Engine is forced into unnecessary correction turns.
3.  **Subsequent errors**: During forced correction, some LLM providers (Gemini) respond with an empty answer ("neither text nor function call"), which in turn triggers the resilient retry loop (multiple 40s backoffs).

The heuristic struggles with a **structural deficit**: the LLM currently has two output channels — free text and tool calls — and there are no explicit markers to indicate whether the turn is waiting for user input or if the Engine continues autonomously.

## 2. Solution — `respond` as a Mandatory Tool

Every chat-oriented Engine (Arthur, Ford, Eddie, potentially others later) gets a new built-in tool:

```yaml
name: respond
description: |
  Final user-facing reply for this turn. Call this exactly once per
  turn after any other tool calls. The 'message' is what the user sees;
  'awaiting_user_input' is whether the engine should block on the
  user's next message (true) or keep working autonomously after this
  turn (false, e.g. when handing off to a worker process).
params:
  message:
    type: string
    description: User-facing reply text. Markdown allowed.
  awaiting_user_input:
    type: boolean
    description: |
      true  → engine goes BLOCKED, waits for user. Default.
      false → engine returns to READY/RUNNING, picks up new pending
              messages on the next auto-wakeup. Use when the engine
              has spawned async workers and needs no immediate user
              input.
```

**The tool call has no server-side side effect** — it is an Engine marker. The Engine code recognizes it as the final marker of the turn and:

1.  Sends `message` as a Chat Assistant Message to the client (same path as the final LLM text today).
2.  Sets the Process status according to `respond.awaiting_user_input`:
    -   `true` → `BLOCKED` (waits for user reply via `process-steer` / chat input).
    -   `false` → `READY` (auto-wakeup picks up open Inbox messages).
3.  Ends the turn.

### 2.1. `respond` must stand alone in the turn

`respond` is the **last and only** tool call of its turn. Combining `respond` with other tool calls in the same LLM response is forbidden — and will be structurally rejected by the Engine loop:

-   If the LLM emits `respond` together with, e.g., `web_search`, it has not yet seen the `web_search` results → `respond.message` would be speculative ("I am searching...").
-   Engine behavior in this case: all other tools are executed, their results land in the conversation, and `respond` receives a synthetic tool result error ("respond must be the LAST and ONLY tool call in a turn"). The tool loop continues, the LLM sees the actual results in the next turn and can synthesize cleanly.
-   The system prompt convention makes this explicit: first work tools (Turn N), then `respond` alone (Turn N+1).

Without this separation, the Engine loses the tool results — the `respond` marker terminates the turn before the LLM sees the data. This is not an edge case but a common LLM failure mode (seen with both Gemini and Claude).

## 3. Engine Lifecycle Mapping

| `awaiting_user_input` | Process Status after Turn | When useful |
|---|---|---|
| `true` (Default) | `BLOCKED` | Engine has replied to the user and is waiting for a reaction |
| `false` | `READY` (or remains in Drain-Loop) | Engine has spawned workers, ProcessEvent auto-wakeup follows; or Engine plans multiple autonomous steps |

Today, the same mapping is implicit in the heuristic (`hasPendingUserQuestion(response)` or similar). With `respond`, it is **explicitly controlled by the LLM** — not guessed from the text.

## 4. What is removed — and what remains

**Removed:**

-   **`Ford.INTENT_PATTERNS`** plus `matchIntent` — the regex-based intent heuristic is out.
-   **`INTENT_CORRECTION_TEMPLATE`** as language-specific correction — out (also the `intentCorrection` override in Recipes).

**Remains — but structurally, not linguistically:**

-   **`MAX_VALIDATION_CORRECTIONS`** and the correction loop remain, but with two language-agnostic triggers instead of the old regex tests:
    1.  **No-Tool-Call**: Free text without *any* tool call. Hard contract violation — every turn must end with at least one tool (work tool or `respond`). A free-text reply is never correct. Correction: System message "VALIDATION CHECK: your previous response had no tool call. … emit the action tool now, or `respond` now."
    2.  **Data-relay-too-brief**: Tool result large (≥ 500 characters), reply short (≤ 200 characters). Indicates that the Engine did not relay the tool result. Configurable via `dataRelayCorrection` override.
-   Both validator gates on the `validation: true` Recipe flag (default for chat Recipes like `arthur`, `web-research`).

Important: The No-Tool-Call validator replaces the old intent heuristic **structurally** — it checks for the presence of tool calls, not the content of free text. This makes it language-agnostic and prevents false positives on user-facing inquiries.

## 5. Recipe Convention

Every chat Recipe (`arthur.yaml`, `ford.yaml`, `default.yaml`, ...) loads `respond` into the tool pool and explains the convention in the system prompt:

```
You always end your turn with exactly one call to the `respond` tool.
The `message` field carries the user-facing reply; set
`awaiting_user_input` to true when you expect the user to react,
false when you've kicked off background work and don't need a reply
right now (the user will see your message and can answer if they want
to interject; the engine will just keep going on the next auto-wakeup).
Never put the user-facing answer in plain assistant text — always go
through `respond`.

`respond` MUST be the LAST and ONLY tool call in its turn. Never
emit `respond` together with other tool calls in the same response.
The correct loop is:

  1. Call work tools (e.g. web_search, file_read). End the turn with
     ONLY those calls — no `respond`.
  2. The runtime executes them and feeds the results back.
  3. On the next turn, call `respond` alone with the synthesised
     answer.
```

Recipes can adjust the wording. Engines that do not follow the convention fall back to the old behavior (LLM final text → Chat, status heuristic via `hasPendingUserQuestion`). This allows for incremental migration.

## 6. Migration Plan

Step-by-step instead of big-bang:

1.  **Define Tool**: `RespondTool` as built-in (vance-brain).
2.  **Extend Ford.java**: recognizes `respond` in the tool call loop, treats it as a final marker, sets status, ends turn.
3.  **Remove Validator**: `INTENT_PATTERNS`, `matchIntent`, intent correction loop out of Ford.
4.  **Adjust Recipes**: `arthur.yaml`, `ford.yaml`, `default.yaml`, `marvin-worker.yaml` — add `respond` to the tool pool, add system prompt block.
5.  **Other Engines** (Marvin, Vogon, Zaphod): Extend Recipe system prompt; adjust engine-specific status mappings if necessary. Marvin's Task-Tree is orthogonal — `respond` is only for chat user output, not for sub-task aggregation.
6.  **Tests**: Remove / rewrite validator tests. AI tests continue to run unchanged because the LLM learns the new convention from the system prompt.

## 7. What this Spec does **not** solve

-   **LLM Discipline**: The LLM must follow the convention in the system prompt. If it does not (some models respond unreliably to "always end with X"), there is no longer an auto-correction loop. This is a tradeoff: fewer heuristic bugs, more prompt engineering responsibility.
-   **Other structured Engine outputs** (e.g., Confidence Score, Citations, Reasoning Trace) — separate discussion.
-   **Marvin's Task-Tree Aggregation** — Marvin internally emits status transitions to its Task-Tree. `respond` is for the user's view, not for internal use.

## 8. Relation to other Specs

-   [arthur-engine §2.4](/specs/arthur-engine) — Drain-Loop remains unchanged; only the final output path changes.
-   [ford-engine](/specs/ford-engine) — Validator section will be removed, tool pool extended with `respond`.
-   [think-engines §3](/specs/think-engines) — Process status transitions: `respond.awaiting_user_input` becomes the explicit source for `BLOCKED` vs. `READY`.
-   [recipes.md](/specs/recipes) — Tool pool convention, new system prompt convention.
