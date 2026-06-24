---
# Vance — Voice Mode

> Dynamic per-turn toggle that signals Engines (Arthur, Eddie, later Foot-with-TTS): *"User is listening to this response and/or speaking the next input."* Output becomes shorter, long/structured parts are wrapped in Markdown constructs that the existing `MarkdownToSpeech` stripper skips. Input is interpreted tolerantly for STT artifacts. The toggle is a single boolean — UI may have multiple switches, the Brain receives **one** signal.
>
> See also: [inline-and-embedded-content §10.3](inline-and-embedded-content.md) (MarkdownToSpeech rules) · [recipes §5](recipes.md) (Pebble Render) · [web-ui](web-ui.md) · [mobile-ui](mobile-ui.md) · [arthur-engine](arthur-engine.md) · [eddie-engine](eddie-engine.md)

---

## 1. Purpose

Voice Mode is a **dynamic per-turn property** — not persistent session state. The user can switch in the middle of a conversation; the next turn will see the new flag.

Behavioral changes when `voiceMode=true`:

- **Output shorter & more concise** — 1–3 sentences of prose per response.
- **Output form used for Speak/Show separation** — the LLM wraps material that should be **visible** but **not read aloud** in triple-backtick fences or pipe tables. `MarkdownToSpeech` reduces these to *"(Code block with N lines)"* or *"(Table with X rows, Y columns)"* respectively. The user only hears the prose + this short hint but sees the full block on the screen.
- **Input Tolerance** — the Engine interprets STT output generously (homophones, typos, truncated words). In case of genuine ambiguity → `ASK_USER`.
- **Long-Reply-Routing** — substantial Worker outputs are not read aloud but announced as pointers; the actual material lands in Inbox/Document.

What **does not** change: Action schema, Tool inventory, Engine lifecycle, Recipe selection. Voice Mode is purely an output style variation.

---

## 2. Signal Architecture

**Single Boolean.** On the Brain side, there is only one variable `voiceMode: true|false`. The UI side can show multiple switches (speaker / talk mode / microphone) — these are combined client-side into a single boolean before the WS frame goes to the Brain.

**Mapping Web-UI → voiceMode:**

| Speaker (TTS) | Talk Mode (Hands-Free) | Microphone (STT) | `voiceMode` |
|---|---|---|---|
| off | off | * | **false** |
| on | * | * | **true** |
| * | on | * | **true** |
| off | off | on | **false** *(STT alone does not toggle voice; see §6)* |

Rationale: solo-STT (user dictates, reads the answer visually) does not necessarily benefit from Voice Mode — they do not want a shortened answer but receive it as text anyway. We follow the speaker / talk mode signal.

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

The Pebble render (`SystemPrompts.compose(...)`) is **re-executed with every LLM call** (see `thinkengine/SystemPrompts.java` JavaDoc and `prompt/PromptContextBuilder.java:77`). This means: mid-conversation toggle takes effect in the very next turn, no restart.

---

## 5. Prompt Convention

In the engine-default Prompt (arthur-prompt.md, eddie-prompt.md) at the **end** (see §7 for caching) a Pebble if-block:

```pebble
{% if voiceMode %}
## Voice Mode Active

The user is speaking and/or listening. Output will be read aloud via TTS
(Markdown is stripped client-side).

**Output Form:**

- **Short.** 1–3 sentences of prose = what is spoken.
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
in full. {% if engine == "eddie" %}Use `RELAY_INBOX` —
a short hub sentence + pointer.{% else %}Save via
`doc_create(kind="text", …)` and provide only a pointer sentence
in `ANSWER` ("I've placed the full plan in your Inbox.").
{% endif %}
{% endif %}
```

Engine-specific:

- **Eddie** has `RELAY_INBOX` — speak + save is a native Action Type. The Voice Block tells the model to prefer this for Worker outputs.
- **Arthur** currently has no Inbox equivalent. Fallback: `doc_create(kind="text", …)` + Pointer-`ANSWER`. In v2, Arthur could get analogous routing; for v1, this pattern suffices.

---

## 6. Multi-Message Drain & Edge Cases

`drainPending()` folds multiple Pending Messages into **one** turn. If messages with different `voiceMode` values arrive (e.g., user switches between two messages):

**Rule — last message wins.** Rationale: the UI shows a current toggle state; what the user last had active is their current expectation. An `OR` strategy would also be defensible but leads to voice output even though the user has switched to text in the meantime.

**Off → On / On → Off mid-conversation:** the next turn sees the new flag. No delay, no restart, no state reset.

**Empty / missing toggle (old clients):** `voiceMode=false`. The Pebble if-block renders nothing. Behavior identical to pre-Voice Mode.

**STT-only (microphone active, speaker off):** `voiceMode=false` per UI mapping. The Engine does not notice that the input was originally STT — but this is OK because the user consumes the answer visually and does not want truncation. (If it later turns out that STT tolerance is also needed in solo-STT, a separate `sttTolerance` toggle will be added — not v1.)

---

## 7. Anthropic Prompt Caching

The Voice Block is **variable** — it has two incarnations (on / off). This breaks the cache if it is in the middle of the prompt.

Solution: **Voice Block at the end of the System Prompt**, directly before the Action Schema. The `CacheBoundary.SYSTEM_AND_TOOLS` (default in `prompt-caching.md`) ends the cached prefix before the variable part — the stable prefix (identity + tools + hot-path hooks) remains identical between Voice-on/off turns and continues to cache; only the last bit varies.

In practice: the Voice Block is one of the **last** sections in the respective `*-prompt.md`. If the `CacheBoundary` is `SYSTEM_AND_TOOLS` today, the block will be included outside the cache anyway. Recipe authors who want to pin their cache more aggressively (`CacheBoundary.MESSAGE`) must consciously place the Voice Block after the marker.

---

## 8. Engines in Scope

| Engine | v1 | v2 |
|---|---|---|
| **Arthur** | ✓ Pebble block, `doc_create(kind="text", …)` fallback for long outputs | optional: add `RELAY_INBOX` analog |
| **Eddie** | ✓ Pebble block, uses native `RELAY_INBOX` | — |
| **Foot (TTS-Client)** | — | TTS listens in the client, ChatInputService reads the WS flag like Web |
| **Worker (Ford, Vogon, Marvin, …)** | no | Workers respond to Arthur/Eddie, not directly to the user — no Voice need |

---

## 9. Action Schema Implications

No new Action Types. Voice Mode changes **how** existing actions are formulated, not **which** ones are available. Specifically:

- **Eddie**: `RELAY_INBOX` already exists → Voice Mode promotes its use.
- **Arthur**: `doc_create(kind="text", …)` + Pointer-`ANSWER` is the v1 workaround; no schema patch needed.
- **`ANSWER`-message form**: consciously designed shorter/more structured by the LLM — no Engine code intervention.

A later `ANSWER_VOICE` with separate `speakText`/`displayText` fields is conceivable, but **only** if the Markdown convention is insufficient. V1 says: it is sufficient.

---

## 10. Phased Rollout

| Phase | Result | Effort |
|---|---|---|
| **V1.1** | WS-Frame-DTO + `ChatInputService` + `PendingMessage` extended with `voiceMode` boolean | small |
| **V1.2** | `PromptContextBuilder.voiceMode()` + Drain logic (last wins) in Arthur and Eddie | small |
| **V1.3** | Integrate Pebble Voice Block into `arthur-prompt.md` + `eddie-prompt.md` (at the end, after potential cache marker) | small |
| **V1.4** | Web-UI: Map speaker + talk mode switches to `voiceMode` in the WS frame; microphone toggle excluded | small |
| **V1.5** | Live test: Lisbon-like question in Voice Mode, output short + code block for list | manual |
| **V2** | potentially Mobile Voice analog, potentially `ANSWER_VOICE` with explicit Speak/Show split, potentially STT-Tolerance-Solo-Toggle | open |

---

## 11. Failure Modes

| Situation | Behavior |
|---|---|
| Old client without `voiceMode` field | `voiceMode=false` — Voice Block does not render, same behavior as pre-V1 |
| LLM ignores Voice Block (too long response) | Cosmetic, not an error. `MarkdownToSpeech` still strips Markdown formatting; long prose will simply be read aloud — user feedback guides prompt sharpening |
| LLM puts important content in a fence block (TTS skips) | User hears nothing substantial. Voice Block example shows the correct pattern (prose + visible attachments); correction via prompt iteration |
| Mid-conversation toggle not delivered (WS connection glitch) | Next frame carries the current flag → synchronized in at most 1 turn |
| `voiceMode=true` but `ANSWER`-reply is very long | Accepted. Note only: `MarkdownToSpeech` will still prepare the Markdown for TTS. There are no length hard caps in v1 |

---

## 12. Open Questions (for v2)

- **Voice Profile** — should the user persist voice style preferences (e.g., *"very concise"*, *"explanatory"*)? Today: only on/off.
- **Inline Code in Voice Output** — single-backtick code is removed by the stripper as markup, the text is spoken. Unpleasant for long paths / URLs; prompt convention already advises fences.
- **Per-Engine Voice Sharpness** — some Engines (e.g., Marvin as a Deep-Think-Worker) should possibly **ignore** Voice Mode because their responses go to Arthur, not directly to the user. V1 ignores this — Workers do not render a Voice Block.
- **STT Tolerance without TTS Out** — if it turns out that solo-STT (dictation without reading aloud) also needs tolerance: separate `sttTolerance` toggle. Not today.

---

## Status

Spec is Draft as of 2026-05-26. Design decisions:

- **Single Boolean** `voiceMode` — UI may show multiple switches, Brain sees one.
- **Speaker + Talk Mode trigger**, Microphone-Solo does not.
- **Per-WS-Frame**, not Session-/Process-State.
- **Last message wins** in multi-drain.
- **Pebble Block at the end** of the prompt due to Anthropic cache.
- **No new Action Type** in v1 — Eddie uses `RELAY_INBOX`, Arthur uses `doc_create(kind="text", …)` fallback.
- **Workers** (Ford/Vogon/Marvin/…) ignore the flag in v1.
