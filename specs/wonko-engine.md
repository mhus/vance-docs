---
title: "Vancetope — Wonko Think Engine"
parent: Specs
permalink: /specs/wonko-engine
---

<!-- AUTO-GENERATED from llm/specification/wonko-engine.md (translated from the German specification/public/wonko-engine.md) — do not edit here. -->

# Vancetope — Wonko Think Engine

> **Wonko** is the **Review-Loop-Engine**: It examines an item —
> one or more documents — for meaning, contradictions, gaps, and vague
> passages, and **clarifies it with the user in rounds** until nothing
> requiring clarification remains or the user has had enough. Optionally, it measures
> the item against **reference documents** (regulations, existing
> specs). What its mandate allows, it decides itself and discloses.
>
> The loop is code; the model is only called at narrow, schema-bound
> edges (LightLlm), each with a fixed result, escape route, and
> mandatory reason. Codename from H2G2: Wonko the Sane, who declares the world
> insane and questions its meaning.
>
> Design plan, decisions, and discarded paths:
> `planning/wonko-engine.md`. Implementation: `readme/wonko-engine.md`.
>
> See also: [think-engines](/specs/think-engines) | [doc-kind-questions](/specs/doc-kind-questions) | [light-llm-service](/specs/light-llm-service) | [benjy-engine](/specs/benjy-engine) | [frankie-engine](/specs/frankie-engine) | [skills](/specs/skills) | [recipes](/specs/recipes)

---

## 1. Role and Classification

| Engine | operates on … | State | End |
|---|---|---|---|
| `frankie` | completed work | Tool-Loop in the model | natural / terminate / safety-net |
| `benjy` | completed work, small models | Task-Queue | Reflection-Gate |
| `zaphod` | synthesis of multiple views | Heads + Consensus | one answer |
| **`wonko`** | **clarity** | **Checklist + Register of runs** | **no open question left / user stops / convergence** |

Wonko **does not write the solution**. Its result is clarified findings
and decisions. A Worker (§7) takes over implementation if desired.

**Why an Engine and not a Recipe:** The state is a **register of
rounds and runs** (§4) — structurally different from Benjy's Task-Queue, Marvin's
Task-Tree, or Vogon's phase strategy. Variants (other lenses, custom
Skills, different mandate) are Recipes over the single Engine.

| | Who | What |
|---|---|---|
| **External** | Code | Checklist, Register, Mandate rules, Question selection, Convergence, Budget, Quote verification |
| **Internal** | LightLlm calls | check, decompose, select passages, compare, coverage, assign answers, classify messages |

## 2. Item and Standard

- **`subject`** — what is being reviewed: one or more document paths.
  If the parameter is missing, Wonko takes the item from the conversation: the
  document bound in Cortex or a path/ID in the message. Without
  an item, a chat run waits for the next message instead of blocking.
- **`references`** — what is being measured against: a folder (ends with `/`) or
  document paths. References are **not** reviewed, only used for comparison.
  Only via Param/Recipe — from free text, subject and standard cannot
  be reliably distinguished.

Reading is exclusively done via permission-checked document tools
(`doc_read`, `doc_list_in_folder`); `process_spawn` starts the Worker (§7).

## 3. The Checklist

The state of a run is a **queue of typed checkpoints**
(`engineParams.wonkoState.queue`). The end is "no point and no question
left open", not "no tool call left".

| Type | When | Result (Core) | Escape |
|---|---|---|---|
| `CHECK` | without `references` — entire subject, one call | Findings + category changes | empty list + reason |
| `DECOMPOSE` | with `references` | verifiable statements with search terms (`maxClaims`) | `not_decomposable` |
| `LOCATE` | per statement | Top passages from the candidate list, cross-references | `none` / `cannot_determine` |
| `COMPARE` | per statement × its passages | `contradicts` / `satisfies` / `not_applicable` + quote | `cannot_determine` |
| `COVERAGE` | per reference document (can be disabled: `coverage: false`) | missing requirements with quote | `complete` / `cannot_determine` |

```
start/message → subject
  without references:  CHECK
  with  references:  DECOMPOSE → per statement LOCATE → COMPARE (parallel) → COVERAGE per reference
Work loop: process points → findings into the question pool
  Pool ≥ maxQuestionsPerRound → send questionnaire, continue independent points
  Queue empty → ask remaining pool or report
  maxCalls reached → Checkpoint question "continue / stop"
Answer → Register; affected statements → COMPARE recheck only for these
```

**Mechanics that are code:**

- **LOCATE two-stage.** Code searches for paragraphs in the references
  (`WonkoPassageSearch`: paragraph with heading path; phrase in text before
  phrase in path before word stem, `maxCandidates`); the model only selects from
  this list and names cross-references (`maxLocateDepth` jumps).
- **Parallel comparisons.** COMPARE calls run simultaneously
  (`parallelism`, virtual threads). Prompts are built on the Lane-Thread,
  only the model call runs in parallel, the processing is sequential again.
- **Quote verification.** A finding against a reference only counts if its
  quote actually appears there (`WonkoQuotes`: tolerant to
  whitespace/case/quotes/ellipsis, at least 12 characters).
  Otherwise, it is discarded — with reason.
- **Budget.** `maxCalls` model calls per run; after that, a
  checkpoint question. The model never decides its own limits.

### 3.1 Output Contract

For **every** model edge:

1. **Fixed result schema** instead of a tool for noting — the code
   reads it and enters it.
2. **Always an escape route** (`cannot_determine`, `none`, `not_applicable`,
   `unclear`). The model never has to invent something to fulfill the format.
   `cannot_determine` in comparison is **never** silently a finding: the topic
   becomes `UNCLEAR` and appears in the report, not as a question.
3. **Every decision with a reason** — including those of the code (mandate,
   discard, duplicate, Settled-Ast). Escape exits, discards, and errors end up
   in the report under "Decisions along the way".

An answer whose evidence is in the same reference triggers a recheck
of an `UNCLEAR` statement; if the recheck reaches a judgment, the point
is resolved.

## 4. The Register

The state **across rounds and runs**, so that a later run on
the same item knows what has been clarified.

- **Storage in Memory**: `MemoryKind.REVIEW`, project-wide, one register per
  item (`metadata.subjectKey` from the normalized refs). Each
  save writes a new entry and supersedes the old one — the chain is the history.
  Access only via `WonkoRegisterService` (data sovereignty); project delete/rename
  is covered by the Memory-Handler.
- **Typed**: `WonkoRegister` with mandate, mandate log, and topics.
- **Topic instead of question.** The concern is recorded under a
  hierarchical key (`retry-policy/backoff`) with an anchor (finding location) and
  type (`contradiction` · `gap` · `vague` · `implausible` · `intent`),
  weight (`BLOCKER` · `IMPORTANT` · `MINOR`) and evidence (reference + quote).
  The register is in the review prompt so that the same concern gets the same key.
- **Duplicate-Gate over the evidence.** The key is model wording, the evidence
  is not: a finding with the same reference and overlapping quote as an
  existing topic or a finding in the pool is the same concern and is
  discarded (reason "duplicate" in the report). This prevents asking twice,
  just because a recheck names the matter differently.

| Status | Meaning | Asked again? |
|---|---|---|
| `OPEN` | found, not yet asked | yes |
| `ASKED` | in the open questionnaire | — |
| `ANSWERED` | answered | only with **new** contradiction |
| `SETTLED` | "that's fine" | **no**, no sub-topics either (closes the branch) |
| `DECIDED` | decided within the mandate itself | no — unless the user contradicts |
| `LATER` | "later" | not in the same run, again in the next |
| `UNKNOWN` | "I don't know" | no — open in the report |
| `CONFLICT` | reappeared as a contradiction after a new answer | never a third time — as a conflict in the report |
| `UNCLEAR` | model could not determine it | no — in the report with reason |

Open topics from previous runs (`OPEN`/`ASKED`/`LATER`, not `MINOR`, not
under a `SETTLED` branch) are added to the question pool at the start — a
model call that doesn't find them this time doesn't close them.

## 5. Mandate — what Wonko is allowed to decide itself

Per **category** one level: `decide` (decides itself, justifies,
reports) · `confirm` (proposes, asks for a yes) · `ask` (open
question). Without a category, `default` applies (Recipe-Default: `confirm`).

```yaml
mandate:
  default: confirm
  categories:
    naming:     { level: decide }
    data-model: { level: ask, locked: true }
    cosmetics:  { level: confirm, ceiling: decide }
  notes: "Prototype — performance does not matter"
```

- `locked` — Wonko never changes the category.
- `ceiling` — up to what level Wonko can loosen itself.
- `notes` — context for each review prompt.

**Self-decided never means silently decided:** Every `decide`
decision is recorded with a reason in the register and the report. A user's
contradiction reopens the topic.

### 5.1 Wonko maintains its categories — under code rules

The review call may propose category changes
(`categoryChanges`: create, describe, rename, split,
merge, level, reassign topic) — each with a reason. Whether they apply
is decided by `WonkoMandateRules`:

| Change | Result |
|---|---|
| create, describe, rename, split, merge | applied |
| **tighten** level | applied |
| **loosen** level up to `ceiling` | applied |
| loosen beyond `ceiling` | **proposal** — confirmation question to the user |
| change `locked` category | rejected |
| reassign topic to a looser category | counts as loosening — same rule |
| split | child inherits level, `ceiling`, and `locked` |
| merge different levels | the **stricter** applies |

The reassignment and inheritance rules prevent the workaround of self-empowerment
("create `decide`-category, move `ask`-topic into it"). Every change
is recorded in the mandate log and the report. Mandate changes that the **user**
states in the chat apply without these rules.

## 6. Questions: the Questionnaire

Wonko asks **multiple questions at once**, each with a separate,
structured answer — via the child [`questions`](/specs/doc-kind-questions):

- **Outbound:** the code generates a ` ```questions `-Fence from the state
  (`QuestionsCodec.toFence`) — no model writes the syntax. The web
  displays it as a wizard, read-only once a later user message follows.
- **Inbound:** typed via `ProcessSteerRequest.questionAnswers`
  (`QuestionSetAnswerDto`); `content` only carries the readable short form. The
  answering message carries `meta.questionsAnswered = <set-id>`.
- **Standard exits** for each question: "that's fine" (`SETTLED`), "later"
  (`LATER`), "I don't know" (`UNKNOWN`) — fixed buttons, no text to
  interpret.
- **Selection** (`WonkoQuestionPlanner`): `MINOR` is not asked;
  Blockers before important ones; at most `maxQuestionsPerRound` (Default 3 —
  deliberately strict: the biggest risk is an annoying Wonko); nothing under a
  `SETTLED` branch.
- **Free text instead of questionnaire** → `wonko-interpret` assigns the answer to
  the questions (escape `unclear` → question remains open); "stop" ends the
  round.

## 7. Free Messages: Input, Work Loop, Worker

A turn has two parts: the **input** (receives every message, assigns
it, changes the state) and the **work loop** (processes the
checklist). Every message outside a questionnaire answer goes through
the router `wonko-route` (LightLlm, with the last chat turns, the
current text of the item, and the report):

| Intent | Effect |
|---|---|
| `recheck` | Subject changed / "check again" → new run, register remains |
| `statement` | new information → Recheck with this information in mind |
| `question` | Question about the review → Answer from current state, no review run |
| `work` | Task with tools (implement, write) → Worker |
| `unclear` | Clarification question to the user |

If the router fails, the message is considered a `statement`. If an
answer requires knowledge it doesn't have, it names a `lookup` — the
Discovery search ([how-do-i](/specs/how-do-i)) provides the Manual, the router
answers with it a second time.

**Worker.** Wonko's own calls are single calls without a tool loop.
`work` therefore goes to a Worker (`workRecipe`, Default `frankie`) with
the review result and the rule not to invent open items. The Worker
is retained; further tasks go into its Inbox. Its answer appears
in the chat; if the item has changed (fingerprint), Wonko checks
once. `BLOCKED` → its question in the chat, the next
user message goes to it.

**Follow-up.** "Review X and implement it": Wonko remembers this addendum
and offers it at the end of the run as a confirmation question (open blockers
in the quote). If confirmed, it goes into the input like a new message.

## 8. Skills

Param `skills` (Default `["@wonko"]`): names, `@label` against the `tags:`
of the Skills, `!`-exclusions — the same grammar as `relevantSkills`
([skills](/specs/skills)). Additionally, Skills activated on the process
(`/skill`, START-Guard) are included. Composable Skills go into **every**
model call; unusable ones are listed once per run with a reason in the report.
Thus, Wonko becomes a compliance or spec review via Recipe, without code.

## 9. Lifecycle and End

- **Start:** Load or create register, resolve mandate from Param/Recipe +
  register, take over open topics, enqueue first checkpoints.
- **Progress:** for each point type, a TODO line "completed/total" plus
  open questions via the existing TODO display; upon completion, the
  final status is sent, then the list is cleared.
- **Status:** `RUNNING` during work, `BLOCKED` as long as a
  questionnaire is open.
- **Convergence** (`WonkoConvergence`) — the run ends before another
  round of questions if
  - `maxRounds` is reached (`max-rounds`, with remaining list);
  - two rounds were answered predominantly "later" (`fatigue`);
  - three rounds the open topics do not decrease (`no-progress`).
- **End:** Queue and question pool empty, user stops, convergence or
  budget stop → **Report** (`WonkoReportRenderer`) with evidence and
  reasons, save register. As a **Worker** (with parent), the
  process closes with `DONE`; in **Chat**, it remains `IDLE` — a new message
  starts the loop again.

## 10. Recipes and Parameters

| Recipe | Type |
|---|---|
| `wonko` | Engine-Default, user-facing |
| `wonko-check`, `wonko-decompose`, `wonko-locate`, `wonko-compare`, `wonko-coverage`, `wonko-interpret`, `wonko-route` | internal LightLlm profiles — one model edge each |

| Param | Meaning | Default |
|---|---|---|
| `subject` | Document paths | from the conversation |
| `references` | Folder (`…/`) or document paths | — |
| `mandate` | §5 | `{default: confirm}` |
| `skills` | §8 | `["@wonko"]` |
| `workRecipe` | Worker for `work` | `frankie` |
| `maxQuestionsPerRound` | Questions per questionnaire | 3 |
| `maxRounds` | Question rounds per run | 6 |
| `maxCalls` | Model calls until checkpoint | 300 |
| `parallelism` | Concurrent comparisons | 4 |
| `maxClaims` / `maxPassagesPerClaim` / `maxCandidates` / `maxLocateDepth` | Scope of reference review | 25 / 4 / 12 / 1 |
| `coverage` | Generate COVERAGE points | `true` |
| `*Recipe` | Replace internal profiles | see above |

## 11. What Wonko is NOT / v1-limits

- **Not a Fixer.** Wonko does not change the item itself — only
  the Worker does so on explicit instruction.
- **Not a One-Shot-Review.** The Skill `code-review` provides a report;
  Wonko conducts a **dialogue about intentions** with mandate and memory.
- **Documents only.** Items `code` and `design` are planned, not
  built.
- **Not yet built:** Questionnaire display in foot (fence as text there,
  answer via free text), Inbox type `QUESTIONNAIRE` and
  channel dispatcher (questions to Parent/Inbox), topic gate for findings
  **without** evidence (without `references` only the register prompt applies, no
  similarity matching), mandate as free text, Engine command
  `/mandate`, register export as Markdown.

## 12. Tests

- Unit: `vance-brain/src/test/java/de/mhus/vance/brain/wonko/*Test`,
  plus the Codec/Mapper tests of the questionnaire (`QuestionsCodecTest`,
  `QuestionsCodecParityTest`, `SteerMessageCodecQuestionAnswersTest`,
  `PendingMessageMapperTest`; Web: `questionsCodec.parity.test.ts`).
- E2E (`@Tag("llm")`, `./wb qa …`):
  `WonkoComplianceLlmTest` — requirement against 14 artificial rules
  (relevant, irrelevant, one reachable only via cross-reference);
  `WonkoReviewLlmTest` — spec with built-in contradiction, typed
  answers, free text stop, second run on the same item.
  What the code guarantees is tested (Settled topics never reappear,
  register chain, report, verified quotes).
- Unit focus: Mandate rules, convergence, question selection,
  duplicate gate, passage search, and quote verification.

## 13. Reference

- Framework: [think-engines](/specs/think-engines), [recipes](/specs/recipes),
  [light-llm-service](/specs/light-llm-service)
- Questionnaire: [doc-kind-questions](/specs/doc-kind-questions)
- Pattern relatives: [benjy-engine](/specs/benjy-engine) (Queue as state),
  [wowbagger-engine](/specs/wowbagger-engine) (parallel single calls),
  [frankie-engine](/specs/frankie-engine) (Worker)
