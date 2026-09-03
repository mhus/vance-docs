---
title: "Vancetope — Vogon Think Engine"
parent: Specs
permalink: /specs/vogon-engine
---

<!-- AUTO-GENERATED from llm/specification/vogon-engine.md (translated from the German specification/public/vogon-engine.md) — do not edit here. -->

# Vancetope — Vogon Think Engine

> **Vogon** is the Engine for a **Plan that belongs to someone**. It executes a written state machine—the same one used by workflows—but bound to the Session from which it was started: it can ask questions there and replies back to it.
>
> See also: [workflows](/specs/workflows) | [think-engines](/specs/think-engines) | [arthur-engine](/specs/arthur-engine) | [marvin-engine](/specs/marvin-engine) | [recipes](/specs/recipes)

---

## 1. Role and Classification

Vogon is a Think Engine alongside Arthur, Ford, and Marvin. What it executes is **data**—a plan document, using the same grammar as a workflow (see [workflows.md](/specs/workflows) §2).

| Engine | Character | Example |
|---|---|---|
| `arthur` | Reactive Session Chat Orchestrator | "Talk and delegate" |
| `ford` | Generalist Worker (one task, one answer) | Read file, provide analysis |
| `marvin` | Thinks independently: plans a Task-Tree via model call and expands it on the fly | Complex analysis without a predefined structure |
| `vogon` | Executes a **pre-written** plan and makes no decisions itself | Waterfall with approval gates, write-evaluate-revise loop |

**When to use Vogon instead of Ford or Marvin?**

- One question, one action → Ford Recipe.
- Structure is only known at runtime → Marvin.
- Process is fixed beforehand, with gates and iterations → Vogon.

### 1.1 Vogon and Magrathea

Mechanically, a Vogon run is a Magrathea run: the same Journal, the same Task types, the same deadlines, the same Watchdog. The difference is the **task**, and this is evident in who owns the run:

| | Magrathea Workflow | Vogon Plan |
|---|---|---|
| Belongs to | a Project — no one in particular | a Session with a human |
| Triggered by | Scheduler, Event, Hook, Tool, REST | a Process (typically Arthur) waiting for the result |
| Asks | via the Inbox, and waits for anyone | via the Inbox **plus** in the conversation that started it |
| Result | stored in the Journal | returned as `REPLY` to the Parent |
| Progress | silent | appears in chat |
| Driven by | the plan; a task succeeds or fails | model work; whether a step succeeded is itself a judgment |

The last line explains why Vogon plans look different: where success is an exit code, you need retry and error classes. Where success is a **quality**, you need evaluation and iteration — `score:`, `decide:`, `enterCounter:`.

**The Task inventory is still open.** A Vogon plan may run a script, a workflow may evaluate an answer. The separation is guidance for the author (see the two Slartibartfast presets, §4), not validation.

### 1.2 Vogon does not think independently

Important for distinguishing from Marvin: Vogon's `allowedTools()` is **empty** and remains so. It does not call a model, it makes no decisions—it shapes model work. Every judgment in a run is made by a Worker spawned by the plan, using its own tools.

This is precisely why the mechanics are shareable with Magrathea. With Marvin, they would not be.

### 1.3 Why not a Recipe

Recipes configure what an Engine does. They cannot determine **what is bound at spawn**—Session and Owner-Process—and from this follows every capability above. Therefore, a separate Engine and not a Recipe flag on Magrathea.

---

## 2. Spawn

Vogon is **always started as a Worker**, never as a chat partner. A Recipe names the plan:

```yaml
- name: waterfall-feature
  description: Sequential plan with approval gates and rated review.
  engine: vogon
  params:
    workflow: waterfall          # Plan name, via the Workflow cascade
    planningRecipe: analyze      # everything else are plan parameters
```

| Parameter | Meaning |
|---|---|
| `workflow` | Plan name, resolved via the Cascade (`workflows.md` §6) |
| `workflowPath` | Plan document at a specific path in the Project |
| *everything else* | passed through as Caller-Params to the plan |

`workflow` and `workflowPath` are alternatives. If both are missing and nothing can be read from the task text (§2.1), the spawn fails immediately and the process is closed—no process that idles indefinitely.

### 2.1 Intake — from task text to plan parameters

A Worker receives its task as a sentence, a plan requires named values. Between them is the Intake: **explicit params always win**, a model call only happens if mandatory fields are still missing afterwards and there is text from which they could be read. Those who spawn precisely pay nothing.

If the **plan itself** must come from the text, there are **two** stages: first the choice of the plan (as an enum over the plans that actually resolve—a hallucinated name that coincidentally exists would start the wrong plan), then its parameters. One stage cannot do both: which fields exist is a property of the plan, which the first stage only chooses. If the chosen plan brings nothing that the caller has not already set, the second stage is omitted.

`params.intake: none` disables the entire step—this plan is never fed from prose, and a missing parameter is a start error instead of a question to a model. A document path in the text is adopted without a model; it is already literally present.

After startup, the Run-Id is under `engineParams.workflowRunId`; this is the only connection between process and run. The plan itself is **not** copied: it is frozen as a snapshot in the Journal at `start()` (`workflows.md` §7).

From Arthur's perspective, Vogon plans are **Recipes like any other**—`recipe_list` shows them, the Description decides. There is no `strategy_list` tool.

---

## 3. What Vogon can do that a pure Workflow cannot

Three things, all tied to the binding:

### 3.1 External Representation

If the run stops at a `gate_task`, the Owner-Process receives a `ProcessEvent(BLOCKED)`. The Parent—typically Arthur—can notify the user in chat. **The run does not do this itself**: Vogon is not an agent, it is not in the conversation, it is subordinate to it.

The Inbox item is always created, in both operating modes. It is the waiting point; the representation is added.

### 3.2 Second Reply Path

In addition to the structured Inbox reply, a chat text passed through by the Parent is accepted as a reply:

| Gate Type | Evaluation |
|---|---|
| `APPROVAL` | Word list (`yes`/`ok`/`continue` → approved, `no`/`stop` → rejected), only for the entire utterance |
| `DECISION` | Match against the declared `options` |
| `FEEDBACK` | Full text |

If nothing matches, **the gate remains open** and the question can be repeated. "Yes, but check X first" is not a yes—that would be an approval no one gave.

Technically, the chat path writes **the same Inbox reply** that the form would have written: a completion path, an audit trail, exactly-once protection.

**Only a human replies via this path.** A `UserChatInput` is not proof of this: an orchestrator controlling via `process_message` sends the same type with `fromUser = "process:<id>"`, a trigger-spawn its source tag. Vogon therefore only allows senders that look like a `UserDocument.name`—no `process:`, no `_`-service-account, no `@system`—and **does not replace a missing sender** with the Session-Owner. This replacement was the loophole: an agent's "ok" ended up as the human's approval in the Inbox item. Whether the named human is allowed to answer *this* item is then decided by the authorization in the Gate Service.

### 3.3 Return Channel

At the terminal, the result is passed to the Parent via `summarizeForParent`—text plus typed payload from the `result:` block. Vogon reads it from the Journal, instead of keeping its own copy: the run is the authority over its result.

### 3.4 Context for Workers

`inheritContext:` on an `agent_task` prepends a `## Parent context` block to the Worker-Prompt (`none` / `summary` / `all` / `last:<n>` / `strength:<min>`), rendered from the Owner-Process's conversation. If there is nothing to inherit, it refers to `process_history_text`—pull instead of push.

This requires an Owner-Process and is checked **at startup**: a plan with `inheritContext:`, started headless, will be rejected instead of running silently without context.

---

## 4. Writing a Plan

Grammar, Task types, Transitions, Bounds, Deadlines: [workflows.md](/specs/workflows). What is typical for a Vogon plan:

```yaml
writer:
  type: agent_task
  recipe: ford
  enterCounter: rounds
  params: { prompt: "Write the chapter. Feedback: ${state.review}" }
  storeAs: draft
  on: { success: review }

review:
  type: agent_task
  recipe: ford
  params: { prompt: "Evaluate the draft. Reply as JSON with score 0.0–1.0." }
  score:
    bands:
      - { atLeast: 0.7, outcome: approved }
      - { default: true, outcome: revise }
  storeAs: review
  on: { approved: publish, revise: check_rounds }

check_rounds:
  type: condition_task
  transitions:
    - if: "#state['rounds'] >= 4"
      to: ask_human
    - else: writer
```

The `resetCounters: [rounds]` belongs to the State that **begins** the section—otherwise, a second pass inherits the counter value of the first and gives up after one round.

**Slartibartfast** writes such plans with the preset `slartibartfast` (Manual: `_vance/manuals/slartibartfast/vogon-architect/SHAPE.md`). The sister preset `magrathea-architect` writes the same grammar for headless automations—the difference is the advice, not the format.

---

## 5. Lifecycle

```
start   → binds Session + Owner-Process, starts the Run, notes the Run-Id, → IDLE
runTurn → UserChatInput  : attempt to answer a waiting Gate (§3.2)
          ProcessEvent   : BLOCKED → Process BLOCKED; DONE/FAILED → Process close
suspend → Pause Run      (pauseRun)      + Process to SUSPENDED
resume  → Resume Run     (resumeRun)     + Process to IDLE
stop    → Stop Run       (stopRun)       + Process close (STOPPED)
```

The second column is not bookkeeping: `ThinkEngineService` only delegates, so the Engine is the only place that writes the status. A process that merely pauses its run remains schedulable in a SUSPENDED session; one that merely stops its run leaves a delegation pointer to something that never finishes with the caller. `stop` therefore also closes even if **no** run had started yet (Intake window, see §2.1).

Conversely, the same applies from below: if the run ends without Task-Completion—Stop, Watchdog-Fail, Bounds exhausted, no suitable transition—the Runner reports this to the Owner-Process via the same `ProcessEvent` path as a regular terminal. Otherwise, Vogon waits for an event that never comes.

Everything else—State transitions, Retries, Counters, Judgments, Bounds, Watchdog—belongs to the Runner and is deliberately not duplicated here.

`planShaped()` is **false**: the run with steps is the run below, and the Run view shows it there (with a Session link back). Listing both would mean showing the same plan twice.

---

## 6. Open Issues

- **Bounds vs. Session-Quota.** The run counts against its Session's quota, the plan brings its own `bounds`. Which takes precedence is not decided.
- **Assignment of the second reply path.** If multiple Vogon runs are subordinate to the same Arthur, a passed-through chat text is ambiguous. Today, the run whose process receives the message gets it; the Inbox path remains open for all.
- **Marvin might need the same startup validation.** It only checks `ctx.userId()` at runtime and lets a node fail in the middle of the run—capability checking at startup is the better answer.

History and justification for the refactoring: `planning/vogon-magrathea-merge.md`.
