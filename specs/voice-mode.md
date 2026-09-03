---
title: "Vancetope — Voice Mode"
parent: Specs
permalink: /specs/voice-mode
---

<!-- AUTO-GENERATED from llm/specification/voice-mode.md (translated from the German specification/public/voice-mode.md) — do not edit here. -->

# Vancetope — Voice Mode

> A dynamic per-turn toggle that signals Engines (Arthur, Eddie, later Foot-with-TTS): *"User hears this response and/or speaks the next input."* Output becomes shorter, long/structured parts are wrapped in Markdown constructs that the existing `MarkdownToSpeech` stripper skips. Input is interpreted tolerantly for STT artifacts. The toggle is a single boolean — the UI may have multiple switches, but the Brain receives **one** signal.
>
> See also: [inline-and-embedded-content §10.3](/specs/inline-and-embedded-content) (MarkdownToSpeech rules) · [recipes §5](/specs/recipes) (Pebble Render) · [web-ui](/specs/web-ui) · [mobile-ui](/specs/mobile-ui) · [arthur-engine](/specs/arthur-engine) · [eddie-engine](/specs/eddie-engine)

---

## 1. Purpose

Voice Mode is a **dynamic per-turn property** — not a persistent Session state. The user can switch mid-conversation; the next turn will see the new flag.

Behavioral changes when `voiceMode=true`:

- **Output shorter & more concise** — 1–3 sentences of prose per response.
- **Output form used for Speak/Show separation** — the LLM wraps material that should be **visible** but **not read aloud** in triple-backtick fences or pipe tables. `MarkdownToSpeech` reduces these to *"(Code block with N lines)"* or *"(Table with X rows, Y columns)"* respectively. The user only hears the prose + this short hint but sees the full block on screen.
- **Input Tolerance** — the Engine interprets STT output generously (homophones, typos, truncated words). In case of genuine ambiguity → `ASK_USER`.
- **Long-Reply-Routing** — substantial Worker outputs are not read aloud but announced as pointers; the actual material lands in Inbox/Document.

What **does not** change: Action schema, Tool inventory, Engine lifecycle, Recipe selection. Voice Mode is purely an output style variation.

---

## 2. Signal Architecture

**Single Boolean.** On the Brain side, there is only one variable `voiceMode: true|false`. The UI side can show multiple switches (speaker / Talk Mode / microphone) — these are combined client-side into a single boolean before the WS frame goes to the Brain. **Talk Mode** is a purely client-side overarching mode with its own mechanics (hands-free dictation + voice commands) — see §13.

**Mapping Web-UI → voiceMode:**

| Speaker (TTS) | Talk Mode (Hands-Free) | Microphone (STT) | `voiceMode` |
|---|---|---|---|
| off | off | * | **false** |
| on | * | * | **true** |
| * | on | * | **true** |
| off | off | on | **false** *(STT alone does not toggle voice; see §6)* |

Rationale: solo-STT (user dictates, reads the answer visually) does not necessarily benefit from Voice Mode — they don't want a shortened answer, as they receive it as text anyway. We follow the speaker / Talk Mode signal.

**Mobile-UI:** equivalent logic — as soon as TTS is active or a voice-first mode (Push-to-Talk / Headphones) is explicitly active → `voiceMode=true`.

---

## 3. Transport

For each **WS Chat Input Frame**, the client carries the flag:

```jsonc
{
  "type": "USER_CHAT_INPUT",
  "text": "show me pictures of lisbon",
  "voiceMode": true            // ← new, optional, default false
}
```

`ChatInputService` writes the flag to the `PendingMessage` (already exists per Inbox item) — **not** to the ThinkProcess. Rationale: mutating process state would be prone to side effects (all future turns would inherit the mode), per-message is atomic and reversible.

The **WS Frame DTO** is minimally extended — boolean field, `@Nullable`, default `false` for backward compatibility. Old clients send nothing → Engine sees `voiceMode=false`.

---

## 4. Per-Turn Transmission (Pebble Render)

`PromptContextBuilder` gets a new setter:

```java
public PromptContextBuilder voiceMode(boolean voiceMode) {
    map.put("voiceMode", voiceMode);
    return this;
}
```

For each turn, the Engine (Arthur / Eddie) calls the builder and passes the flag from the current drain batch — see §6 for the multi-message rule.

The Pebble render (`SystemPrompts.compose(...)`) is **re-executed with every LLM call** (see `thinkengine/SystemPrompts.java` JavaDoc and `prompt/PromptContextBuilder.java:77`). This means: a mid-conversation toggle takes effect in the very next turn, no restart.

---

## 5. Prompt Convention

In the engine-default Prompt (arthur-prompt.md, eddie-prompt.md) at the **end** (see §7 for caching) a Pebble-If-Block:

```pebble
&#123;% if voiceMode %}
## Voice Mode Active

The user is speaking and/or listening. Output will be read aloud by TTS
(Markdown is stripped client-side).

**Output Form:**

- **Concise.** 1–3 sentences of prose = what is spoken.
- **Long/structured content in triple-backtick fences or
  pipe tables.** These are skipped by TTS — the user
  sees them on screen, only hears a hint like
  "(Code block with 12 lines)".
- **Short bullet lists (≤3 items) are okay** — they are spoken as
  "First, Second, Third". Longer ones → Fence.
- **Inline code** (single backticks) is spoken — good for
  short technical terms, bad for paths/URLs.

**Example** — User asks about Lisbon sights:

  In Lisbon, Alfama, Belém, and riding Tram 28 are particularly worthwhile.
  The full list here:

  ```
  - Alfama: Old town, Fado bars
  - Belém: Jerónimos Monastery, Pastéis
  - Castelo de São Jorge: Castle + viewpoint
  - Tram 28: Route through the old town
  - Praça do Comércio: Harbor square
  - LX Factory: Galleries
  ```

  Tell me if you want more about any of them.

**STT Input Tolerance:** User input may have typos, homophones,
truncated words (e.g., "Lisa bonn" → "Lisbon").
Interpret generously; in case of genuine ambiguity `ASK_USER`.

**Routing for Substantial Outputs:** Do not read worker responses
in full. &#123;% if engine == "eddie" %}Use `RELAY_INBOX` —
a short hub sentence + pointer.&#123;% else %}Save via
`doc_write(kind="text", …)` and provide only a pointer sentence in `ANSWER`
("I've put the full plan in your Inbox.").
&#123;% endif %}
&#123;% endif %}
```

Engine-specific:

- **Eddie** has `RELAY_INBOX` — speak + save is a native Action Type. The Voice Block tells the model to prefer this for Worker outputs.
- **Arthur** currently has no Inbox equivalent. Fallback: `doc_write(kind="text", …)` + Pointer-`ANSWER`. In v2, Arthur might get analogous routing; for v1, this pattern suffices.

---

## 6. Multi-Message Drain & Edge Cases

`drainPending()` folds multiple Pending Messages into **one** turn. If messages with different `voiceMode` values arrive (e.g., user switches between two messages):

**Rule — last message wins.** Rationale: the UI shows a current toggle state; what the user last had active is their current expectation. An `OR` strategy would also be defensible but leads to voice output even though the user has switched to text in the meantime.

**Off → On / On → Off mid-conversation:** the next turn sees the new flag. No delay, no restart, no state reset.

**Empty / missing toggle (old clients):** `voiceMode=false`. The Pebble-If-Block renders nothing. Behavior identical to pre-Voice Mode.

**STT-only (microphone active, speaker off):** `voiceMode=false` per UI mapping. The Engine does not notice that the input was originally STT — but this is OK because the user consumes the answer visually and does not want truncation. (If it later turns out that STT tolerance is also needed in Solo-STT, a separate `sttTolerance` toggle will be added — not v1.)

---

## 7. Anthropic Prompt Caching

The Voice Block is **variable** — it has two incarnations (on / off). This breaks the cache if it is in the middle of the prompt.

Solution: **Voice Block at the end of the System Prompt**, directly before the Action Schema. The `CacheBoundary.SYSTEM_AND_TOOLS` (default in `prompt-caching.md`) ends the cached prefix before the variable part — the stable prefix (identity + tools + hot-path hooks) remains identical between Voice-on/off turns and continues to cache; only the last bit varies.

In practice: the Voice Block is one of the **last** sections in the respective `*-prompt.md`. If the `CacheBoundary` is `SYSTEM_AND_TOOLS` today, the block is included outside the cache anyway. Recipe authors who want to pin their cache more aggressively (`CacheBoundary.MESSAGE`) must consciously place the Voice Block after the marker.

---

## 8. Engines in Scope

| Engine | v1 | v2 |
|---|---|---|
| **Arthur** | ✓ Pebble block, `doc_write(kind="text", …)` fallback for long outputs | optional: add `RELAY_INBOX` analog |
| **Eddie** | ✓ Pebble block, uses native `RELAY_INBOX` | — |
| **Foot (TTS Client)** | — | TTS listens in the client, ChatInputService reads the WS flag like Web |
| **Worker (Ford, Vogon, Marvin, …)** | no | Workers respond to Arthur/Eddie, not directly to the user — no voice need |

---

## 9. Action Schema Implications

No new Action Types. Voice Mode changes **how** existing actions are formulated, not **which** are available. Specifically:

- **Eddie**: `RELAY_INBOX` already exists → Voice Mode promotes its use.
- **Arthur**: `doc_write(kind="text", …)` + Pointer-`ANSWER` is the v1 workaround; no schema patch needed.
- **`ANSWER`-message form**: consciously designed to be shorter/more structured by the LLM — no Engine code intervention.

A later `ANSWER_VOICE` with separate `speakText`/`displayText` fields is conceivable, but **only** if the Markdown convention is insufficient. V1 says: it's sufficient.

---

## 10. Phased Rollout

| Phase | Result | Effort |
|---|---|---|
| **V1.1** | WS Frame DTO + `ChatInputService` + `PendingMessage` extended with `voiceMode` boolean | small |
| **V1.2** | `PromptContextBuilder.voiceMode()` + Drain logic (last wins) in Arthur and Eddie | small |
| **V1.3** | Integrate Pebble Voice Block into `arthur-prompt.md` + `eddie-prompt.md` (at the end, after potential cache marker) | small |
| **V1.4** | Web-UI: Map Speaker + Talk Mode switches to `voiceMode` in the WS frame; microphone toggle excluded | small |
| **V1.5** | Live Test: Lisbon-like question in Voice Mode, output short + code block for list | manual |
| **V2** | possibly Mobile Voice analog, possibly `ANSWER_VOICE` with explicit Speak/Show split, possibly STT-Tolerance-Solo-Toggle | open |

---

## 11. Failure Modes

| Situation | Behavior |
|---|---|
| Old client without `voiceMode` field | `voiceMode=false` — Voice Block does not render, same behavior as pre-V1 |
| LLM ignores Voice Block (too long response) | Cosmetic, not an error. `MarkdownToSpeech` still strips Markdown formatting; long prose is simply read aloud — user feedback guides prompt refinement |
| LLM puts important content in a fence block (TTS skips) | User hears nothing substantial. Voice Block example shows the correct pattern (prose + visible attachments); correction via prompt iteration |
| Mid-conversation toggle not delivered (WS connection hiccup) | Next frame carries the current flag → synchronized in at most 1 turn |
| `voiceMode=true` but `ANSWER`-reply is very long | Accepted. Note: `MarkdownToSpeech` will still prepare the Markdown for TTS. There are no hard caps on length in v1 |

---

## 12. Open Questions (for v2)

- **Voice Profile** — should the user persist voice style preferences (e.g., *"very concise"*, *"explanatory"*)? Today: only on/off.
- **Inline Code in Voice Output** — single-backtick code is removed by the stripper as markup, the text is spoken. Unpleasant for long paths / URLs; prompt convention already advises fences.
- **Per-Engine Voice Sharpness** — some Engines (e.g., Marvin as a Deep-Think-Worker) might **ignore** Voice Mode because their responses go to Arthur, not directly to the user. V1 ignores this — Workers do not render a Voice Block.
- **STT Tolerance without TTS Out** — if it turns out that solo-STT (dictation without reading aloud) also needs tolerance: a separate `sttTolerance` toggle. Not today.

---

## 13. Talk Mode (Client, Web-UI)

Talk Mode is the hands-free mode of the Chat Editor (📞 button in `ChatComposer.vue`): the user speaks continuously, without keyboard or mouse. It is **purely client-side** — the Brain only sees the combined `voiceMode` flag (§2). No backend call, no LLM in command recognition.

### 13.1 Two-Stage Pipeline

Talk Mode does **not** rely on STT silence detection as an end-of-sentence signal — this is unreliable (the user pauses mid-sentence to think). Instead:

- **Stage 1 — Capture (Block Mode):** The Composer runs in multiline; each final STT phrase is only **appended** to the buffer. Nothing is automatically sent during a speaking pause. The user sees the growing prompt and commits explicitly.
- **Stage 2 — Analyze:** Each phrase is checked against a **status-gated command table**. A match executes the action; the command text is stripped from the dictated content (tail-match, so the command is recognized even at the end of a sentence: *"…that was the plan, computer send"*).

A later **Direct Mode** (silence-based auto-send) is conceivable as a second mode — v1 is deliberately Block-only.

### 13.2 Status Model

| Status | Behavior |
|---|---|
| `OFF` | Talk Mode off. Microphone button dictates (if active) without command interpretation. |
| `ACTIVE` | Collects speech; honors `send` / `clear` / `pause` / `end`. |
| `PAUSED` | Microphone continues, but dictation is **discarded** and the assistant remains silent; honors only `resume` / `clear` / `end`. For side conversations in the room or thinking. |

### 13.3 Voice Commands

A command is `<trigger-name> <word>`, e.g., **"Computer send"**. The default trigger is **"Computer"** (speech recognition transcribes this reliably, unlike Engine names like "Arthur") plus "Vancetope".

| Action | Default Words | Allowed in |
|---|---|---|
| `send` | send, submit, abschicken | ACTIVE |
| `clear` | correction, discard, verwerfen, korrektur | ACTIVE, PAUSED |
| `pause` | pause, stop, stopp | ACTIVE |
| `resume` | continue, resume, weiter, fortsetzen | PAUSED |
| `end` | end, beenden, ende | everywhere |

DE and EN synonyms are both in the default because the STT language follows the chat language.

### 13.4 Configuration

The command config is a profile-persistent Web-UI setting `webui.speech.talkCommands` (JSON, cookie-backed like the other `webui.speech.*` prefs). The default is bundled; an override merges per field (synonym lists completely replace the default list). Editing is done in **Profile → Language & Audio → Talk Mode Voice Commands** (trigger names, "Name required", words per action). Malformed JSON fails safe to the default, so a broken setting never disables Talk Mode.

The `requireTriggerName` default is **true**: a naked "send" spoken flows in as text, only "Computer send" commits — protection against false triggers.

### 13.5 Further Rules

- **Idle Timeout:** 120s without microphone input *and* without Assistant output → Talk Mode hard off.
- **Manual 🎤/🔊 tap** when Talk Mode is active → hard off (user takes control).
- **Persistence:** tab-scoped `sessionStorage`; survives a session change (Composer remount), not a tab restart.
- **voiceMode Coupling:** Talk Mode on (ACTIVE or PAUSED) ⇒ `voiceMode=true` (§2).
- **Implementation:** Status/orchestration in `ChatComposer.vue`; the pure matching logic (`matchTalkCommand`/`stripCommandTail`/`normalizeForMatch`) is side-effect-free in `chat/talkCommands.ts` with unit tests.

---

## Status

Spec is in Draft as of 2026-05-26. Design decisions:

- **Single Boolean** `voiceMode` — UI may show multiple switches, Brain sees one.
- **Speaker + Talk Mode trigger**, microphone-solo does not.
- **Per-WS-Frame**, not Session-/Process-State.
- **Last message wins** in multi-drain.
- **Pebble Block at the end** of the prompt due to Anthropic cache.
- **No new Action Type** in v1 — Eddie uses `RELAY_INBOX`, Arthur uses `doc_write(kind="text", …)` fallback.
- **Workers** (Ford/Vogon/Marvin/…) ignore the flag in v1.
- **Talk Mode (§13)** is client-side, Block Mode (no silence auto-send), deterministic voice commands `<Name> <Word>` with default trigger "Computer"; Direct Mode is v2.
