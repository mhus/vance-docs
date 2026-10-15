# Vancetope — Document Kind `questions`

> Specifies the **`questions`** kind: multiple questions to the user in one message, each answered separately. Inline in the chat, it's a wizard (one page per question, progress bar, overview before sending); the answers are returned to the Engine in a structured way. Codec kind with Java/TS twin and validation.
> See also: [inline-and-embedded-content](inline-and-embedded-content.md) | [doc-kind-checklist](doc-kind-checklist.md) | [prompts-and-manuals](prompts-and-manuals.md) | [web-ui](web-ui.md)

---

## 1. Purpose

An Engine needs several related decisions from the user before it can continue working. Without this kind, there is only one question per round (ASK_USER) or a list in free text that a model has to parse. `questions` provides both in a structured way: the questions as a Fence, the answers as a typed list.

The first user is the Wonko Engine (Review-Loop); however, the kind is engine-neutral — any Chat Engine can ask a questionnaire.

Distinctions:
- **ASK_USER** (Arthur/Eddie) has also been generating this Fence since 2026-10-14 — one question with options; there is only one format and one renderer per interface.
- **Wizards** (`wizards.md`): YAML forms that generate a Prompt, started by the user. `questions` comes from the Engine and responds to it.
- **`checklist`**: tasks to be checked off, no return channel.

**Design Principle — One questionnaire, two readers.** The answer travels as a readable short form in the message text (every Engine understands it, the history remains readable) **and** as a typed field `questionAnswers` in the Steer-Request (Engines that work structurally only read this).

**Design Principle — Partial answers are valid.** The user never has to answer everything. What is left open when sending is considered "later".

## 2. Format

Body is YAML (inline as ` ```questions `-Fence; stored with `$meta` header, also JSON):

```yaml
id: q-7f3a                 # optional; if missing, the client forms a stable one from the content
intro: Three points regarding the requirement
questions:
  - key: eu-region
    text: In which region will data be stored?
    kind: choice           # choice | text | confirm  (Default text)
    options: [eu-central-1, eu-west-1]
    context: "must be stored … within the European Union"
  - key: retention
    text: Correct retention to 10 years?
    kind: confirm
    proposal: 10 years instead of 5
    weight: blocker        # blocker | important (Default) | minor
```

| Field | Required | Meaning |
|---|---|---|
| `questions[].key` | yes | unique within the set; the answer references it |
| `questions[].text` | yes | the question |
| `questions[].kind` | no | `choice` requires ≥ 2 `options`; `confirm` carries `proposal` |
| `questions[].options` | for choice | Strings or `{label, description}` |
| `questions[].proposal` | for confirm | Assumed by the questioner |
| `questions[].context` | no | Quote/reference for orientation |
| `questions[].weight` | no | Weight, displayed as a badge |
| `intro`, `id` | no | Introductory sentence, set ID |

**Validation** (Codec, both sides): at least one question, `key` and `text` set, keys unique, `kind` from the list, `choice` with ≥ 2 options. An invalid body is rejected (`kind_validate` reports `questions-parse`, the Web UI shows the error instead of a half-wizard). Case for `kind`/`weight` does not matter, options can be plain strings.

The standard outcomes "looks good", "later", "don't know" are **not** in the options — the wizard always offers them.

## 3. Answer

A normal `process-steer` is sent with

- `content`: one line per question, `- <Question> → <Answer>` — for **one** question, only the answer, as if the user had typed it (an ASK_USER Engine understands this);
- `questionAnswers`: `QuestionSetAnswerDto { setId, answers[] }` with `QuestionAnswerDto { key, outcome, value }`, `outcome` ∈ `ANSWERED | SETTLED | LATER | UNKNOWN`. Unanswered questions are included as `LATER`.

The path through the Brain: `ProcessSteerRequest.questionAnswers` → `SteerMessage.UserChatInput.questionAnswers` → Pending-/Engine-Message (mapper in both directions) → Engine.

## 4. Web UI

- **Inline in chat** (`QuestionsView`, Renderer-Registry `questions`): Wizard — progress bar "Question n of N", question with badge/quote, confirm button for `confirm`, option buttons for `choice`, free text field always, "looks good"/"later"/"don't know", back. Afterwards, an overview with all answers (each clickable to change), "Send answers" and "Back". **One question** (ASK_USER) is compact: no progress bar, no overview — clicking an option, confirming, an outcome or free text sends immediately. Question texts are Markdown. The normal chat input field remains usable — a free text answer there is also valid.
- **Active as long as it is open:** a newer questionnaire replaces it. A questionnaire **with `id`** remains answerable until a user message is marked as its answer (`meta.questionsAnswered = <id>`, set by the Engine that accepted the answer) — a follow-up question to the Engine leaves it open. Without an `id`, any subsequent user message closes it. `ChatView` calculates the context, `MessageBubble` passes it via `provide` to the Wizard (`questionsActionable` in `questionsAnswers.ts`); when closed, it shows as read-only.
- **Sending path:** the wizard fires a bubbling DOM event `vance-question-answers`; `ChatView` forwards it as `question-answers`, `ChatApp`/`ChatSidePanel` send via `ChatComposer.setTextAndSend(text, { questionAnswers })`.
- **Editor / embedded:** read-only list of questions. Creation via "New Document" (YAML-only).

## 5. foot and other Plain-Text Clients

**foot** (`de.mhus.vance.foot.question`):

- **Parser:** third twin (`QuestionsFence`) — foot must not depend on vance-shared —, tested against the same fixture corpus (`QuestionsFenceParityTest`), same error texts.
- **Display:** `ChatTerminal.chatMarkdown` replaces every valid Fence with readable Markdown (`QuestionsText`): introduction, numbered questions, `[blocker]`, reference as quote, *Assumption*, options as `[1] A   [2] B`. Invalid Fences remain.
- **Line-Wizard** (`QuestionsWizard`, `PendingQuestions`): a Fence in an Assistant message of the main process opens it, the input prefix shows `1/3 › ` or `answer › `. A number selects, Enter confirms the assumption, any other text is the answer; `:ok` `:later` `:unknown` `:back` `:pause`. After the last question, an overview: Enter sends, a number reopens the question. A question is sent with the first answer. `/`-commands continue to the Dispatcher; `:pause` exits the wizard, `/answer` resumes.
- **Closing:** same rules as in Web (§4) — sent, user message marked as answered (`meta.questionsAnswered`) or, without `id`, any user message; a new Fence replaces the old one.
- Sent as in Web: readable text + `questionAnswers` (Set-Id without `id` via the same djb2 hash as `questionsAnswers.ts`).

Other Plain-Text Clients see the YAML code block (inline-and-embedded-content §6); Engines assign free text answers themselves (Wonko: Interpret step).

## 6. Engines

- **Description for models:** exactly one — the Manual `kind-questions` (Router entry in `embed-fences`). Engines read it via `manual_read('kind-questions')`; where an Engine explicitly needs it, **this** Manual is injected, no second description (drift).
- **ASK_USER** (Arthur, Eddie) with `options` → `AskUserQuestions.render`: a Fence with **one** question (`choice` from two options, otherwise `text` with the option), without `id` — the Engine reads the answer as text, any subsequent user message closes the questionnaire. When forwarding (Eddie RELAY), the Fence travels as text.
- **Wonko** generates the Fence in code via `QuestionsCodec.toFence` — valid by construction, no model writes it. Wonko stores the user message that answered a questionnaire with `meta.questionsAnswered`; a message that is not an answer (follow-up question) answers it directly and leaves the questionnaire open.

## 7. Implementation

| Part | Location |
|---|---|
| DTOs | `vance-api` `de.mhus.vance.api.question` |
| Codec (Java) | `vance-shared` `document/kind/QuestionsCodec` — `parse`, `serialize`, `toFence`; registered in `CodecKindHandlers` |
| Codec (TS) | `vance-face` `kindViews/questionsCodec.ts` |
| Parity | `test-fixtures/kind-codecs/questions/` incl. `expectedError`-fixtures |
| Wizard | `kindViews/QuestionsView.vue`, `kindViews/questionsAnswers.ts` |
| Manual | `_vance/manuals/kind-questions.md` |
