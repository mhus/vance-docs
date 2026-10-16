# Vancetope — Wonko Think Engine

> **Wonko** is the **Review-Loop-Engine**: It examines an item —
> one or more documents — for meaning, contradictions, gaps, and vague
> passages, and **clarifies it with the user in rounds** until nothing
> remains to be clarified or the user has had enough. Optionally, it measures
> the item against **reference documents** (regulations, existing
> specs). It decides what its mandate allows and discloses it.
>
> The loop is code; the model is only called at narrow, schema-bound
> edges (LightLlm), each with a fixed result, escape route, and
> mandatory reason. Codename after H2G2: Wonko the Sane, who declares the world
> insane and questions its meaning.
>
> Design plan, decisions, and discarded paths:
> `planning/wonko-engine.md`. Implementation: `readme/wonko-engine.md`.
>
> See also: [think-engines](think-engines.md) | [doc-kind-questions](doc-kind-questions.md) | [light-llm-service](light-llm-service.md) | [benjy-engine](benjy-engine.md) | [frankie-engine](frankie-engine.md) | [skills](skills.md) | [recipes](recipes.md)

---

## 1. Role and Classification

| Engine | operates on … | State | End |
|---|---|---|---|
| `frankie` | completed work | Tool-Loop in the model | natural / terminate / safety-net |
| `benjy` | completed work, small models | Task-Queue | Reflection-Gate |
| `zaphod` | synthesis of multiple views | Brains + Consensus | one answer |
| **`wonko`** | **clarity** | **Checklist + Register of runs** | **no open question left / user stops / convergence** |

Wonko **does not write the solution**. Its result is clarified findings
and decisions. A Worker (§7) can incorporate them upon request.

**Why an Engine and not a Recipe:** The state is a **register of
rounds and runs** (§4) — structurally different from Benjy's Task-Queue, Marvin's
Task-Tree, or Vogon's Phase-Strategy. Variants (other lenses, custom
Skills, different mandate) are Recipes over the single Engine.

| | Who | What |
|---|---|---|
| **External** | Code | Checklist, Register, Mandate rules, Question selection, Convergence, Budget, Quote verification |
| **Internal** | LightLlm calls | check, decompose, select passages, compare, coverage, assign answers, classify messages |

## 2. Item and Standard

- **`subject`** — what is being reviewed: one or more document paths.
  If the parameter is missing, Wonko takes the item from the conversation: the
  document bound in the Cortex or a path/ID in the message. Without
  an item, a chat run waits for the next message instead of blocking.
- **`references`** — what it is measured against: a folder (ending with `/`) or
  document paths. References are **not** reviewed, only used for comparison.
  Only via param/Recipe — from free text, subject and standard cannot
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
start/Message → Subject
  without references:  CHECK
  with  references:  DECOMPOSE → per statement LOCATE → COMPARE (parallel) → COVERAGE per reference
Work loop: process points → findings into the question pool
  Pool ≥ maxQuestionsPerRound → send questionnaire, continue independent points
  Queue empty → ask remaining pool or report
  maxCalls reached → Checkpoint question "continue / stop"
Answer → Register; affected statements → COMPARE recheck only for these
```

**Mechanics that are code:**

- **LOCATE in two stages.** Code searches for paragraphs in the references
  (`WonkoPassageSearch`: paragraph with heading path; phrase in text before
  phrase in path before word stem, `maxCandidates`); the model only selects
  from this list and names cross-references (`maxLocateDepth` jumps).
- **Parallel comparisons.** COMPARE calls run simultaneously
  (`parallelism`, virtual threads). Prompts are built on the Lane thread;
  only the model call runs in parallel, incorporation is sequential again.
- **Quote verification.** A finding against a reference only counts if its
  quote actually appears there (`WonkoQuotes`: tolerant of
  whitespace/case/quotes/ellipsis, at least 12 characters).
  Otherwise, it is discarded — with a reason.
- **Budget.** `maxCalls` model calls per run; after that, a
  checkpoint question. The model never decides its own limits.

### 3.1 Output Contract

For **every** model edge:

1. **Fixed result schema** instead of a tool for noting — the code
   reads it and enters it.
2. **Always an escape route** (`cannot_determine`, `none`, `not_applicable`,
   `unclear`). The model never has to invent something to fulfill the format.
   `cannot_determine` in a comparison is **never** silently a finding: the
   topic becomes `UNCLEAR` and appears in the report, not as a question.
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
  save writes a new entry and supersedes the old one — the chain is the
  history. Access only via `WonkoRegisterService`
  (data sovereignty); project delete/rename is covered by the Memory handler.
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
| `ANSWERED` | answered | only with a **new** contradiction |
| `SETTLED` | "it's fine as is" | **no**, no sub-topics either (closes the branch) |
| `DECIDED` | decided within the mandate itself | no — unless the user contradicts |
| `LATER` | "later" | not in the same run, again in the next |
| `UNKNOWN` | "I don't know" | no — open in the report |
| `CONFLICT` | reappeared as a contradiction after a new answer | never a third time — in the report as a conflict |
| `UNCLEAR` | model could not determine it | no — in the report with reason |

Open topics from previous runs (`OPEN`/`ASKED`/`LATER`, not `MINOR`, not
under a `SETTLED` branch) are added to the question pool at the start — a
model call that doesn't find them this time does not close them.

## 5. Mandate — what Wonko is allowed to decide itself

One level per **category**: `decide` (decides itself, justifies,
reports) · `confirm` (proposes, asks for a yes) · `ask` (open
question). Without a category, `default` applies (Recipe default: `confirm`).

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
- `notes` — context for every review prompt.

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
("create a `decide` category, move an `ask` topic into it"). Every change
is recorded in the mandate log and the report. Mandate changes expressed by the
**user** in chat apply without these rules.

## 6. Questions: the Questionnaire

Wonko asks **multiple questions at once**, each with a separate,
structured answer — via the child [`questions`](doc-kind-questions.md):

- **Outbound:** the code generates a ` ```questions `-Fence from the state
  (`QuestionsCodec.toFence`) — no model writes the syntax. The web
  displays it as a wizard, read-only once a subsequent user message follows.
- **Inbound:** typed via `ProcessSteerRequest.questionAnswers`
  (`QuestionSetAnswerDto`); `content` only carries the readable short form. The
  answering message carries `meta.questionsAnswered = <set-id>`.
- **Standard exits** for each question: "it's fine as is" (`SETTLED`), "later"
  (`LATER`), "I don't know" (`UNKNOWN`) — fixed buttons, no text to
  interpret.
- **Selection** (`WonkoQuestionPlanner`): `MINOR` is not asked;
  blockers before important; at most `maxQuestionsPerRound` (default 3 —
  deliberately strict: the biggest risk is an annoying Wonko); nothing
  under a `SETTLED` branch.
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
| `statement` | new information → recheck with this information in mind |
| `question` | question about the review → answer from current state, no review run |
| `work` | task with tools (incorporate, write) → Worker |
| `worker` | answer to the waiting Worker or continuation of its task → unchanged into its Inbox (only offered as long as a Worker is waiting) |
| `unclear` | clarification question to the user |

If the router fails, the message goes to a waiting Worker
(its answer was the last thing said), otherwise it is considered a
`statement`. If an
answer requires knowledge it doesn't have, it names a `lookup` — the
Discovery search ([how-do-i](how-do-i.md)) provides the Manual, the router
answers with it a second time.

**Worker.** Wonko's own calls are single calls without a tool loop.
`work` therefore goes to a Worker (`workRecipe`, default `frankie`) with
the review result and the rule not to invent open items. The Worker
persists; further tasks go into its Inbox. Its answer appears in the chat;
if the item has changed (fingerprint), Wonko checks once.

*Worker's follow-up questions.* A tool loop asks how it answers: It ends
its turn with an answer (`REPLY`) and remains `IDLE` — a
lifecycle event does not follow (`BLOCKED` is deliberately not reported by
`ParentNotificationListener` to the Parent). Therefore, the answer itself is the signal:
After that, the Worker **waits**, and the router receives its last answer
and the `worker` intent. "A" to "A or B?" goes unchanged to the
Worker — not as a new task (`work` would send the review result again)
and not as a `statement` (which would restart the review).
Whether the answer was a question or a result is decided by the router
on the next user message; a message for the review remains with Wonko.

*Change with open questionnaire.* If the Worker changes the item
while a questionnaire is open, the recheck waits until the questionnaire
is answered — Wonko states this in the chat. An immediate new run would
silently discard the questionnaire, and the answers to it would be lost.
First the answers (register), then the new run; if the review ends before
("stop"), the waiting recheck is canceled with it.

**Follow-up work.** "Review X and incorporate it": Wonko remembers this
postscript and offers it at the end of the run as a confirmation question
(open blockers in the quote). **Confirmed** — `ANSWERED` without value (confirm button) or with
the proposal itself (this is how `wonko-interpret` writes an agreement) — it
goes into the input like a new message. **Free text** instead of confirmation is
not an agreement ("no, not now"): The offer is closed, the
text goes as a free message to the router, with the closed offer
in mind; only if the router reads an agreement in it, it becomes
`work`. Any other outcome discards the postscript.

## 8. Skills

Param `skills` (default `["@wonko"]`): names, `@label` against the `tags:`
of the Skills, `!`-exclusions — the same grammar as `relevantSkills`
([skills](skills.md)). Additionally, Skills activated on the process
(`/skill`, START-Guard) are included. Composable Skills go into **every**
model call; unusable ones are listed once per run with a reason in the report.
Thus, Wonko becomes a compliance or spec review via Recipe, without code.

## 9. Lifecycle and End

- **Start:** Load or create register, resolve mandate from param/Recipe +
  register, take over open topics, queue first checkpoints.
- **Progress:** one TODO line "completed/total" per point type plus
  open questions via the existing TODO display; upon completion, the
  final status is sent, then the list is cleared.
- **Status:** `RUNNING` during work, `BLOCKED` as long as a
  questionnaire is open.
- **Convergence** (`WonkoConvergence`) — the run ends before another
  round of questions if
  - `maxRounds` is reached (`max-rounds`, with remaining list);
  - two rounds were answered predominantly "later" (`fatigue`);
  - three rounds show no decrease in open topics (`no-progress`).
- **End:** Queue and question pool empty, user stops, convergence or
  budget stop → **Report** (`WonkoReportRenderer`) with evidence and
  reasons, save register. As a **Worker** (with Parent), the
  process closes with `DONE`; in **Chat**, it remains `IDLE` — a new message
  restarts the loop.

## 10. Recipes and Parameters

| Recipe | Type |
|---|---|
| `wonko` | Engine default, user-facing |
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

## 11. What Wonko is NOT / v1-Limits

- **Not a Fixer.** Wonko does not change the item itself — only
  the Worker does so on explicit instruction.
- **Not a One-Shot Review.** The `code-review` Skill provides a report;
  Wonko conducts a **dialogue about intentions** with mandate and memory.
- **Documents only.** `code` and `design` items are planned, not
  built.
- **Not yet built:** Questionnaire display in Foot (fence as text, answer via free text), Inbox type `QUESTIONNAIRE` and
  channel dispatcher (questions to Parent/Inbox), topic gate for findings
  **without** evidence (without `references`, only the register prompt applies, no
  similarity matching), mandate as free text, Engine command
  `/mandate`, register export as Markdown.

## 12. Tests

- Unit: `vance-brain/src/test/java/de/mhus/vance/brain/wonko/*Test`,
  plus the Codec/Mapper tests for the questionnaire (`QuestionsCodecTest`,
  `QuestionsCodecParityTest`, `SteerMessageCodecQuestionAnswersTest`,
  `PendingMessageMapperTest`; Web: `questionsCodec.parity.test.ts`).
- E2E (`@Tag("llm")`, `./wb qa …`):
  `WonkoComplianceLlmTest` — requirement against 14 artificial rules
  (relevant, irrelevant, one only reachable via cross-reference);
  `WonkoReviewLlmTest` — spec with built-in contradiction, typed
  answers, free text stop, second run on the same item.
  What the code guarantees is tested (Settled topics never reappear,
  register chain, report, verified quotes).
- Unit focus: Mandate rules, convergence, question selection,
  duplicate gate, passage search, and quote verification.

## 13. References

- Framework: [think-engines](think-engines.md), [recipes](recipes.md),
  [light-llm-service](light-llm-service.md)
- Questionnaire: [doc-kind-questions](doc-kind-questions.md)
- Related patterns: [benjy-engine](benjy-engine.md) (Queue as state),
  [wowbagger-engine](wowbagger-engine.md) (parallel single calls),
  [frankie-engine](frankie-engine.md) (Worker)
