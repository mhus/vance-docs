---
title: "Vancetope — Structured Engine Output"
parent: Specs
permalink: /specs/structured-engine-output
---

<!-- AUTO-GENERATED from specification/public/en/structured-engine-output.md — do not edit here. -->

---
# Vancetope — Structured Engine Output

> How a conversational Think Engine **ends** a turn and derives its post-turn status (`BLOCKED` vs. `IDLE`) from it. Two mechanisms are currently in production: **structured action** (Arthur, Eddie) and **Natural-Stop** (Ford). Both are language-agnostic — the turn-end and the "am I waiting for the user?" signal are determined **structurally**, not guessed from free text.
>
> See also: [arthur-engine](/specs/arthur-engine) | [ford-engine](/specs/ford-engine) | [think-engines](/specs/think-engines) | [recipes](/specs/recipes)

---

## 1. The Problem Being Solved

An LLM has two output channels per turn: free text and tool calls. An Engine that builds a chat turn from these needs two decisions **reliably**:

1. **Is the turn over** or should the model continue working (next tool)?
2. **Does the Engine then wait for user input** (`BLOCKED`) or does it continue autonomously (`IDLE`, auto-wakeup on the next pending message)?

Historically, (1) was guessed via an **intent-without-action regex heuristic** (free text against patterns like "I'll do X" / "Ich werde X tun") and (2) via similar text patterns. This was language-biased (only EN/DE recognized), produced false positives on user queries, and led some providers (Gemini) to empty responses. Both mechanisms below replace this with a **structural** signal.

## 2. Mechanism A — Structured Action (Arthur, Eddie)

Arthur and Eddie inherit from `StructuredActionEngine`. Each turn ends with **exactly one** call to the engine's own Action Tool — `arthur_action` or `eddie_action` — which carries a typed object:

- `type` — the chosen action (`ANSWER`, `DELEGATE`, `ASK_USER`, `RELAY`, …).
- `reason` — short justification (for logs/trace).
- `message` — the user-facing text (for answering actions).
- The chosen `type` determines the post-turn status (e.g., `ANSWER`/`ASK_USER` → `BLOCKED`, continuing actions → continue in the loop).

The Action Loop, the Judge (extends as needed without a fixed upper limit), the Mid-Loop-ESC, and the Wallclock-Net are described in [arthur-engine.md §3.4](/specs/arthur-engine); the shared core is in `StructuredActionEngine`.

**Why a Tool Call instead of free text?** The `type`/`awaiting` discriminator comes explicitly from the model and is typed — no guessing from prose, language-independent. A turn without an Action Call is a breach of contract and is corrected with a language-agnostic correction (max. `actionLoopCorrections` rounds).

## 3. Mechanism B — Natural-Stop (Ford)

Ford implements `ThinkEngine` directly (no `*_action` tool). Ford ends a turn via **Natural-Stop**, like Frankie / the Claude code agent loop:

- As long as the model emits Tool Calls, the loop executes them and iterates further.
- The **first** Assistant Message **without** a Tool Call is the turn end — this text **is** the Reply. There is no mandatory terminal tool.
- `awaiting_user_input` is **derived from the role**: a Worker (has a Parent) is finished → `IDLE` (the Parent can control again); a Primary (no Parent) waits for the next User Message → `BLOCKED`.

Backstops: `maxIterations` is now only a high safety net (default 100) against a model that never stops calling tools; a Mid-Loop-ESC/`/pause` and an LLM collapse lead to a clean termination. Details in [ford-engine.md](/specs/ford-engine) and `planning/ford-natural-stop.md`.

## 4. Why Two Mechanisms

- Arthur/Eddie are **conversational orchestrators** with a fixed vocabulary of actions (answer, delegate, ask, relay). The typed `*_action` discriminator directly maps this vocabulary and controls delegation/lifecycle structurally.
- Ford is a **reflex worker**: it works with tools and is finished when it has nothing left to do. A mandatory terminal tool would be unnatural overhead; Natural-Stop is the simpler, more robust contract. The role-derived `awaiting` covers its dual role (Worker vs. Primary) without an extra signal.

## 5. History — the `respond` approach (retired)

An earlier iteration introduced a mandatory `respond(message, awaiting_user_input)` tool that **every** chat-oriented turn (Arthur, Ford, Eddie) had to call at the end. This approach is **completely superseded**:

- Arthur/Eddie migrated to the typed `*_action` tool (Mechanism A).
- Ford migrated to Natural-Stop (Mechanism B).

The `RespondTool` still exists as a class but is no longer used by any Engine. The contract "a turn must end with `respond`" is **no longer valid**.

## 6. Relation to Other Specs

- [arthur-engine §3.4](/specs/arthur-engine) — Action Loop, Judge, ESC, Wallclock (Mechanism A, shared with Eddie).
- [ford-engine](/specs/ford-engine) — Natural-Stop Loop (Mechanism B).
- [think-engines §2.1](/specs/think-engines) — `pause` contract (turn stops at the next safe boundary; fulfilled by all loops via Mid-Loop-Interrupt).
- [recipes.md](/specs/recipes) — `maxIterations` as a per-Recipe budget/safety net.
