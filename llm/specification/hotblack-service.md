# Vancetope — Hotblack Audio Service (TTS, STT, Music)

> Vancetope's single path for **generated and consumed audio documents**: Speech Synthesis (TTS), Transcription (STT), and Music/Sound Generation. Persona: Hotblack Desiato, rockstar of *Disaster Area*, the loudest band in the galaxy (*The Restaurant at the End of the Universe*) — music, stage, sound. Implemented as a **service + tool-set**, not a Worker Engine — just like [Fenchurch](fenchurch-service.md) for images: synchronous, single provider call per operation, no dedicated `ThinkProcess` lifecycle.
>
> Five tools are in every Engine's default tool inventory: `audio_speak` (text → speech document), `audio_transcribe` (audio document → text), `audio_analyze` (audio document + question → description), `audio_music` (prompt → music/sound clip), and `audio_voices` (voice list, read-only). Generated files are written via the normal `DocumentService` path and are thus available to all Document Editors / Markdown Renderers / Players without special handling.
>
> See also: [fenchurch-service](fenchurch-service.md) | [light-llm-service](light-llm-service.md) | [llm-resource-management](llm-resource-management.md) | [voice-mode](voice-mode.md) | [user-progress-channel](user-progress-channel.md) | Design History: `planning/hotblack-audio.md`

---

## 1. Purpose & Scope

**Problem.** Vancetope needs a clearly defined place that answers four questions: "speak this," "what's in this recording," "what kind of piece is this," and "make music for this."

- Chat User: "Read me the summary," "Transcribe this meeting," "A jingle for the intro clip."
- Workflows (Marvin-Plans): Voice-over per slide, transcript per interview, music bed per video.
- `video_transcript` uses the same ASR engine for its fallback.

All three operations are **single-shot** without multi-turn reasoning, without a tool-use loop. A Worker Engine with a `ThinkProcessDocument` lifecycle would be overkill — the pattern is the same as [Fenchurch](fenchurch-service.md), [Discovery](how-do-i.md), [Fook](fook-service.md): a Spring `@Service` that calls an external API with setting cascade context.

**What it is not:**

- **Not a Worker Engine.** No `HotblackEngine`, no spawn path, no Session Browser node. Tool calls appear in the normal tool call history of the caller process.
- **Not a Realtime Voice Assistant.** No audio streaming loop, no WebRTC, no Speech-to-Speech.
- **No Live TTS in Chat.** The chat speaker remains browser TTS (`MarkdownToSpeech` / `speechWeb.ts`, see [voice-mode](voice-mode.md)). Hotblack generates **audio documents**. (Server TTS for the Foot client is a v2 chapter of voice-mode.)
- **No Editing in the Hotblack Service.** No cutting, mixing, mastering, no stem splitting — `audio_music` delivers a finished clip. Editing exists as a **local** counterpart layer outside Hotblack: `AudioManipulationService` + `audio_trim`/`audio_mix`/`audio_concat`/`audio_convert`/`audio_info` (ffmpeg, deterministic, without provider/quota/ledger — analogous to `ImageManipulationService` and the `image_*` tools; report `planning/audio-edit-tools.md`). Hotblack and the edit family only share the `audio_*` tool name family and document I/O.
- **Not a replacement for `video_transcript`.** The tool remains; its ASR fallback calls the same Whisper engine (§4.3).
- **No inline audio understanding in chat dispatch** — the agent-driven `audio_analyze` exists (dedicated analysis model alias); audio attachments directly to a multimodal chat model (`ModelCapability.AUDIO_INPUT`) remains the open P8 remainder (§11).

---

## 2. Architecture

```
┌─ Engine (Arthur / Eddie / Ford / Marvin-Worker / …) ────────────────┐
│  Tool-Call audio_speak / audio_transcribe / audio_analyze /          │
│             audio_music / audio_voices                              │
└──────────────────────────────┬──────────────────────────────────────┘
                               ▼
┌─ HotblackService (per Pod) ─────────────────────────────────────────┐
│  1. validate + ensure ai.hotblack[.modality].enabled                │
│  2. resolve alias → (provider, instance, model) → catalog gate      │
│     (kind: tts | stt | music | au)                                  │
│  3. language: request > chat.language (TTS/Music/Au), auto (STT)    │
│  4. voice/format-Gates, Text-Length-Gate                            │
│  5. Title + Slug via LightLlm-Recipe `audio-title` (optional)       │
│  6. AudioCallTracker.reserve(...) — Quota slot before the call      │
│  7. ProgressEmitter.emitStatus(WAITING) + Heartbeat Ticker          │
│  8. AiAudioService.<op>(config, …)                                  │
│     └─ DocumentAudioDestinationStream.commit via                    │
│        DocumentService.createOrReplaceBinary                        │
│  9. AudioCallRecord(success|failure) + UsageMeasurement.audio       │
│ 10. reload Document, return typed result                           │
└─────────────────────────────────────────────────────────────────────┘
                               │
              ┌────────────────┼───────────────────────┐
              ▼                ▼                       ▼
   OpenRouterAudioProvider   LocalWhisperProvider   (further providers
   /audio/speech             faster-whisper via      later, e.g.
   /audio/transcriptions     Python wrapper          ElevenLabsMusic)
   chat-shaped music
```

Building blocks (naming analogy to Fenchurch):

- `HotblackService` (`de.mhus.vance.brain.hotblack`) — an entry point per modality: `speak`, `transcribe`, `analyze`, `compose`.
- `AiAudioService` + `AiAudioModelProvider` (`de.mhus.vance.brain.ai.audio`) — provider dispatch layer parallel to `ai/image/`.
- `AudioDestinationStream` (`vance-shared/document/`) + `DocumentAudioDestinationStream` — write target; commit on `close()` via `DocumentService.createOrReplaceBinary` (inherits Document versioning, tags `["audio","ai-generated","hotblack"]`).
- `AudioSource` — read source for STT: bytes + wire format from a document (attachment pipeline) or directly (internal callers).
- `AudioCallTracker` + `audio_call_records` (`vance-shared/hotblack/`) — quota + audit, with `AudioCallProjectDataHandler`/`AudioCallUserDataHandler` for Project/User maintenance.
- Recipe `audio-title` (`internal: true`, LightLlm) — title + slug for the generated documents.

---

## 3. Tool API

All five tools are in the default tool inventory and do not need to be whitelisted in the Recipe.

### 3.1 `audio_speak` (TTS)

| Field | Type | Required | Meaning |
|------|-----|---------|-----------|
| `text` | string | ✓ | Text to be spoken. Markdown is stripped via `MarkdownToSpeech` before the call (otherwise TTS reads "# Headline"). |
| `language` | string | ✗ | ISO-639-1. Default: the `chat.language` setting (the language in which the assistant responds). |
| `voice` | string | ✗ | Voice ID from `audio_voices`; default from `ai.hotblack.default-voice`, otherwise model default. |
| `path` | string | ✗ | Document path; default `audio/<uuid8>-<slug>.<ext>` (`ext` = `mp3`/`wav` per format). Existing file is overwritten (versioning archives). |
| `title` | string | ✗ | Override of the auto-title (Recipe `audio-title`). |
| `format` | enum | ✗ | `mp3` / `wav`. Explicit specification is checked against the model's `supportedFormats` (`pcm` ≙ `wav` — the provider wraps pcm in a WAV container); without specification, `ai.hotblack.default-format` is a **preference** and falls back to `wav` if the model does not serve `mp3`. |
| `speed` | number | ✗ | Only for models with speed support (catalog flag `supportsSpeed`). |

**Response:** `{path, mimeType, sizeBytes, modelUsed, language, voice, durationMs, costUsd, title}`.

### 3.2 `audio_transcribe` (STT)

| Field | Type | Required | Meaning |
|------|-----|---------|-----------|
| `documentId` | string | ✓ | Audio document in the caller's Project. Resolution via the attachment pipeline (scope check, MIME allowlist, size caps). |
| `language` | string | ✗ | ISO-639-1. Default: **auto-detect** (the user speaks what they speak). |
| `path` | string | ✗ | Optional Document path — the transcript is additionally stored as a text document (`text/markdown`). Without `path`, only tool result. |

**Response:** `{text, language, durationSeconds?, modelUsed, costUsd, transcriptPath?, durationMs}`.

### 3.3 `audio_analyze` (Audio Understanding)

| Field | Type | Required | Meaning |
|------|-----|---------|-----------|
| `documentId` | string | ✓ | Audio document in the caller's Project. Resolution via the attachment pipeline as with `audio_transcribe`. |
| `prompt` | string | ✓ | What is to be found out ("Describe genre, instruments, tempo, mood and structure", "Does the clip fit as a calm intro?"). The service wraps the question in the analysis role: *describe, not transcribe*. |
| `language` | string | ✗ | ISO-639-1 for the **response**; default `chat.language` (the analysis is user-facing text). |
| `path` | string | ✗ | Optional Document path — the analysis is additionally stored as `text/markdown`. |

**Response:** `{analysis, language, modelUsed, costUsd?, analysisPath?, durationMs}`.

Distinction from `audio_transcribe`: transcribe maps spoken words to text, analyze describes the audio itself (genre, instruments, tempo, mood, structure, quality) — a music piece analysis does not contain lyrics. Typical pairing: `audio_music` generates, `audio_analyze` checks ("is this really calm piano?").

### 3.4 `audio_music` (Music/SFX)

| Field | Type | Required | Meaning |
|------|-----|---------|-----------|
| `prompt` | string | ✓ | Style/content ("gentle piano melody, 8 seconds, calm, instrumental"). |
| `language` | string | ✗ | Lyrics language for vocal music; default `chat.language`, `none` = instrumental. |
| `durationSeconds` | int | ✗ | Target length (hint to the model); catalog gate `maxDurationSeconds`. |
| `path` / `title` / `format` | | ✗ | as `audio_speak`. |

**Response** as `audio_speak` (without `language`/`voice`).

### 3.5 `audio_voices` (Voice List, read-only)

| Field | Type | Required | Meaning |
|------|-----|---------|-----------|
| `alias` | string | ✗ | Default `default:tts`. |
| `language` | string | ✗ | Filter on `locale`-prefix (`de` → `de-DE-*`). |

**Response:** `{model, voices: [{id, locale?, gender?, description?}]}` — source is `TtsModelInfo.supportedVoices` from the catalog. Models without a catalog list respond `{voices: [], hint: …}` instead of guesswork.

### 3.6 Error Response (typed map, no throw)

```json
{ "error": "disabled|quota_exceeded|invalid_choice|audio_too_long|unsupported_format|unsupported_language|text_too_long|timeout|content_policy|provider_error|cancelled",
  "message": "User-readable explanation",
  "retryable": true }
```

`retryable` is fixed per `error` value (§9).

---

## 4. Provider Abstraction

### 4.1 `AiAudioModelProvider`

```java
public interface AiAudioModelProvider {
    ProviderType getType();
    default Optional<String> getInstanceName() { return Optional.empty(); }

    default void synthesize(AiAudioConfig config, TtsRequest request,
                            AudioDestinationStream destination);   // TTS
    default SttResult transcribe(AiAudioConfig config, AudioSource source,
                                 @Nullable String language);       // STT
    default void generateMusic(AiAudioConfig config, String prompt,
                               int durationSeconds,
                               AudioDestinationStream destination); // Music

    default AnalysisResult analyze(AiAudioConfig config, AudioSource source,
                                   String prompt);                   // Analysis
}
```

One interface, four operations — a provider implements only those its backend can; the others retain their default and throw `AiAudioException.unsupportedOperation(...)` (→ `invalid_choice`). Dispatch in `AiAudioService` is **instance-first, protocol-second** (like `AiImageService`): a provider with an `getInstanceName()` claim wins against protocol dispatch.

### 4.2 `OpenRouterAudioProvider` (Bundled-Instance `openrouter`)

Four wire forms, all live verified (TTS/STT/Music 2026-10-05, Analysis 2026-10-12):

- **TTS:** `POST /api/v1/audio/speech` — `{model, input, voice, response_format, speed?}` → raw audio byte stream. **Some models only serve `pcm`** (Gemini-TTS rejects everything else with 400, the message mentions `response_format`) — the provider retries this exact case once as `pcm` and wraps the bytes in a WAV container (`PcmWav`, rate/channels from `Content-Type: audio/pcm;rate=24000;channels=1`).
- **STT:** `POST /api/v1/audio/transcriptions` — `{model, input_audio:{data: base64, format}, language?}` → `{text, usage:{seconds, cost}}`. The vendor costs (`usage.cost`) are returned and booked.
- **Music:** `POST /api/v1/chat/completions` with `modalities:["text","audio"]` and **`stream:true`** (non-streaming responds 400 "Audio output requires stream: true"). The audio bytes come as base64 chunks in `choices[].delta.audio.data`, `usage.cost` in the final chunk. **The requested format value is not a contract:** Lyria responds to `format:"wav"` with MP3 bytes — the committed MIME type is therefore **always sniffed** (`AudioMimeTypeSniffer`: ID3/Frame-Sync → `audio/mpeg`, RIFF → `audio/wav`, fLaC/OggS/ftyp), never assumed.

- **Analysis:** `POST /api/v1/chat/completions` with a text block **first** and an `input_audio` block (base64 + format) afterwards, non-streaming. The block order is a contract: GPT-Audio refuses description if audio comes before the question, Voxtral accepts both. `usage.cost` travels in the non-stream response. The provider does not enforce an input format (Voxtral silently accepted `format:"xyz"`) — the `supportedFormats` catalog gate is the only real format check.

Failures travel as `{error:{message, code}}`; the message is passed through verbatim so the service classifier maps timeouts/policy rejections. Vendor-specific costs (`usage.cost`) always win over catalog estimates (`effectiveCostUsd` pattern like Fenchurch).

### 4.3 `LocalWhisperProvider` (Bundled-Instance `local`, offline)

`WhisperTranscriber` (faster-whisper via `python3`, setup: `readme/video-transcript-setup.md`) — relocated from `tools/video` to `ai/audio/local`. Model docs `local:faster-whisper-small|medium`, unpriced in the Ledger. **One ASR engine, two consumers:** the Hotblack adapter and the ASR fallback of `video_transcript`. The tool continues to call the engine directly because it formats segment timestamps and progress pings, which the lean `SttResult` deliberately does not carry — once `detail:"segments"` (v1.1) exists, it can switch to provider dispatch.

---

## 5. Language & Voices

**Language is First-Class**, with three defaults:

| Modality | Default | Reason |
|---|---|---|
| `audio_speak` | `chat.language`-Cascade (`LanguageResolver`) | TTS speaks the language in which the assistant responds — without the LLM having to set the parameter |
| `audio_transcribe` | **auto-detect** | the user speaks what they speak |
| `audio_music` | `chat.language` for lyrics, `none` = instrumental | |
| `audio_analyze` | `chat.language`-Cascade | The analysis is user-facing text. **No** `supportedLanguages`-gate: input is arbitrary audio, the output language is a prompt instruction (the service composes it from the effective language). |

All defaults are overridable per call. The catalog field `supportedLanguages` gates before the call (`unsupported_language`, empty = any language); prefix matching makes `de` valid for `de-DE-*`.

**Voices** live in the catalog (`supportedVoices`: id, locale, gender, description) and are made visible to the LLM via `audio_voices`. An explicit `voice` parameter is checked against the list (`invalid_choice`, with reference to `audio_voices`); a voice without a matching `locale` for the selected language is rejected with `unsupported_language`. `ai.hotblack.default-voice` is the Scope default. Persistent voice presets (`audio_voice_set/get`, Fenchurch-style counterpart) are v1.1.

---

## 6. Model Catalog & Aliases

Discriminator `kind`: `chat | image | tts | stt | music | au` — disjoint lookups (`lookupTts`/`lookupStt`/`lookupMusic`/`lookupAu`, `listAll*`); the chat picker remains clean, an audio model without a matching `kind` entry is rejected **before** the provider call with `invalid_choice` ("No TTS model entry … add it with kind: tts").

Info records:

- `TtsModelInfo`: `supportedVoices`, `supportedLanguages`, `supportedFormats`, `maxInputChars`, `supportsSpeed`, `costPerChar`/`costPerSecond`, `timeoutSeconds`.
- `SttModelInfo`: `supportedFormats`, `maxDurationSeconds`, `supportedLanguages`, `costPerSecond`/`costPerMinute`, `timeoutSeconds`.
- `MusicModelInfo`: `maxDurationSeconds`, `supportedLanguages`, `costPerSecond`/`costPerTrack`, `supportedFormats`.
- `AuModelInfo`: `supportedFormats` (the only real format check), `maxDurationSeconds` (own cost/payload limit, no provider contract), `costPerSecond`, `timeoutSeconds`. Deliberately **without** `supportedLanguages` — analysis input is arbitrary audio.

**Bundled Model Docs** (all live verified — TTS/STT/Music 2026-10-05, Analysis 2026-10-12):

| Doc | kind | Note |
|---|---|---|
| `openrouter/google/gemini-3.8-flash-lite-tts` | tts | 30 Voices (API list), only `pcm`, `costPerChar` |
| `openrouter/openai/gpt-transcribe` | stt | unpriced — Vendor `usage.cost` is booked |
| `openrouter/google/lyria-3-clip-preview` | music | `maxDurationSeconds: 300`, `costPerTrack: 0.04` (estimate; Vendor cost wins) |
| `openrouter/mistralai/voxtral-small-24b-2507` | au | ~1 audio token/s; `costPerSecond: 0.0001` |
| `openrouter/openai/gpt-audio` | au | ~10 audio tokens/s; `costPerSecond: 0.00032`; needs text-first/audio-last; `gpt-audio-mini` generally refuses analysis and is deliberately not bundled |
| `local/faster-whisper-small` / `-medium` | stt | offline, unpriced |

**Aliases** `ai.alias.default.tts` / `.stt` / `.music` / `.au` — fields in `llm-setup.yaml` with `choicesFrom` sources `ai-tts-models` / `ai-stt-models` / `ai-music-models` / `ai-au-models`.

**`kind: au` only for audio-native models.** The catalog keys Docs as `(providerInstance, modelName)` — an au-Doc for a chat model (e.g., Gemini) would be silently overwritten by its chat-Doc, and the alias would lose its model. Bundled-Docs therefore only for models without a chat twin; Gemini as an analysis model remains reserved for the chat path (§11). **Without a set alias, the `ai.default.*`-chat fallback applies, and the kind-gate cleanly rejects** — a fresh Tenant configures the three aliases once via the LLM setup form (same known Fenchurch mechanism).

---

## 7. Quota & Tracking

**`audio_call_records`** (append-only, `vance-shared/hotblack/`): `tenantId`, `accountId`, `projectId`, `processId`, `modality` (`tts|stt|music|au`), `modelUsed`, `alias`, `costUsd`, `inputUnits` (characters or seconds), `outcome`, `at`, `durationMs`. The indices and maintenance handlers (`audio-calls`) follow `image_call_records`.

**Quota gate per modality and per call:** `ai.hotblack.daily-tts-calls` / `monthly-tts-calls`, `daily-stt-calls` / `monthly-stt-calls`, `daily-music-calls` / `monthly-music-calls`, `daily-au-calls` / `monthly-au-calls` (tenant-wide count, cascade overrides possible). Limits count **calls, not units** — the reserve pattern (pending row before the call, finalize in-place, TOCTOU-safe as with Fenchurch) cannot know the character/second amount before the call. Units are in `inputUnits` in the audit log and are the basis for a later units-based limit. Orphaned `pending` rows (cancellation/crash between reserve and finalize) are finalized as `cancelled` by an hourly sweep (`AudioCallTracker.sweepAbandonedReserves`, after 24h) — the attempt still counts against the limit but does not disappear as an open `pending` row; a later finalize of the same row overwrites the outcome.

**Usage Ledger:** each call books a `UsageMeasurement.audio(...)` with `CALLER_HOTBLACK` (in addition to the quota row — one is a permit, the other a fact). Costs: Vendor `usage.cost` (STT/Music) > catalog estimate (`costPerChar` × characters, `costPerTrack`) > `null` (unpriced, counted not calculated).

**Metrics:** `vance.hotblack.calls` (Tags: `outcome`, `modality`, `model` = Alias).

---

## 8. Settings (`ai.hotblack.*`, kebab-case)

| Key | Type | Default | Cascade |
|-----|-----|---------|---------|
| `ai.hotblack.enabled` | boolean | `true` | Tenant → System |
| `ai.hotblack.tts.enabled` / `.stt.enabled` / `.music.enabled` / `.au.enabled` | boolean | `true` | Tenant → System |
| `ai.hotblack.default-voice` | string | empty | Process → Project → User → Tenant |
| `ai.hotblack.default-format` | string | `mp3` (preference, no gate — falls back to `wav` if the model does not serve `mp3`; see §3 `format`) | Process → Project → User → Tenant |
| `ai.hotblack.timeout` | int (sec) | from Model Info | Process → Project → User → Tenant |
| `ai.hotblack.heartbeat-interval-sec` | int | `30` | Tenant |
| `ai.hotblack.daily-tts-calls` / `monthly-tts-calls` / `daily-stt-calls` / `monthly-stt-calls` / `daily-music-calls` / `monthly-music-calls` / `daily-au-calls` / `monthly-au-calls` | long | 0 (= unlimited) | Process → User → Project → Tenant |
| `ai.hotblack.auto-title-from-prompt` | boolean | `true` | Process → Project → User → Tenant |

No `language` setting — language comes from `chat.language` (§5). Setting form: `_vance/setting_forms/hotblack.yaml` (Availability, Defaults, Quotas, Performance).

---

## 9. Failure Modes

All errors are thrown as `HotblackException(Reason, message)` and mapped by the tools to the JSON error form (§3.6):

| `Reason` | `error`-Wire | `retryable` | Trigger |
|----------|--------------|-------------|----------|
| `DISABLED` | `disabled` | false | `ai.hotblack.enabled` or modality flag off |
| `QUOTA_EXCEEDED` | `quota_exceeded` | false | Daily/monthly limit of the modality |
| `INVALID_CHOICE` | `invalid_choice` | false | Model without `kind` entry / without the operation, unknown voice, duration > `maxDurationSeconds`, contradictory audio source |
| `TEXT_TOO_LONG` | `text_too_long` | false | Text > `maxInputChars` |
| `AUDIO_TOO_LONG` | `audio_too_long` | false | Audio > upload/duration cap |
| `UNSUPPORTED_FORMAT` | `unsupported_format` | false | `format` neither `mp3` nor `wav`, or not served by the model (output) or not accepted (STT input) |
| `UNSUPPORTED_LANGUAGE` | `unsupported_language` | false | `language` not in `supportedLanguages` or voice without matching `locale` |
| `TIMEOUT` | `timeout` | true | Provider timeout (upstream capped ~60s per request) |
| `CONTENT_POLICY` | `content_policy` | false | Provider rejects prompt (music, analysis) |
| `PROVIDER_ERROR` | `provider_error` | true | Generic 5xx / SDK error |
| `CANCELLED` | `cancelled` | false | User/process cancellation |

Provider error classification as with Fenchurch: message heuristic on `timeout`/`safety`/`content`/`policy`/`cancel`; `retryable` fixed per wire value. Non-Hotblack `RuntimeException` is wrapped to `PROVIDER_ERROR`; `IllegalArgumentException` (caller validation) goes as `ToolException` to the tool layer.

---

## 10. Manual & Prompt Hooks

- Manual `_vance/manuals/audio-generation.md`: Tool contracts (including transcribe-vs-analyze distinction), language defaults, voice cheatsheet, costs (music per clip!), error mapping, anti-patterns (reading documents instead of linking, music as an argument, one `audio_speak` per paragraph). Frontmatter `triggers:` DE+EN — the Discovery Catalog finds the manual via `how_do_i('compose music')` or `how_do_i('get audio described')` without special wiring.
- **Prompt Hooks** (English, hook convention: exact `manual_read('audio-generation')` syntax + trigger + negation):
  - `arthur-prompt.md` — "Working with audio" block next to "Generating images".
  - `eddie-prompt.md` — "Working with audio" block next to "Generating images".
  - `ford-prompt.md` — Entry in the manual list next to `image-generation`.
- Worker prompts do not get a mandatory hook, as with Fenchurch — Recipes decide themselves.

---

## 11. Audio Understanding (Tool Path Implemented, Chat Path Prepared)

**Tool Path (implemented):** `audio_analyze` — the agent sends an audio document to a `kind: au` model and asks the question via `prompt` (§3.3). Works with any chat model as an Engine, has quota, ledger, and heartbeat.

**Chat Path (prepared, not implemented):** Audio attachments directly to a multimodal chat model. The attachment path is prepared: `AttachmentResolver` materializes audio MIMEs (`audio/wav`, `audio/mpeg`, `audio/mp4`, `audio/ogg`, `audio/webm`, `audio/flac`, `audio/pcm` …), `AudioSource.formatForMime` maps them to wire formats. The chat content block dispatcher (`StandardAiChat.toContentBlock`) cleanly rejects audio attachments with "Unsupported attachment MIME" — the dispatch (`input_audio` to models with `ModelCapability.AUDIO_INPUT`) is the open P8 remainder and will then bring the capability flag. Until then, there is deliberately **no** unread flag (dead code).

---

## 12. Status & Design Decisions

| Phase | Result | Status |
|-------|----------|--------|
| **P0** | Music spike: OpenRouter `google/lyria-3-*` via chat-shaped audio output is sufficient; no direct provider needed | Done |
| **P1** | Provider abstraction: `AiAudioModelProvider`/`AiAudioService`/`AudioSource`/`AudioDestinationStream`, `ModelCatalog` `kind: tts/stt/music` | Done |
| **P2** | `OpenRouterAudioProvider` (TTS/STT/Music), Bundled Model Docs, Alias picker `ai-tts/stt/music-models` | Done |
| **P3** | `HotblackService`, `AudioCallTracker` + `audio_call_records`, Recipe `audio-title`, Tools `audio_speak`/`audio_transcribe`/`audio_voices` | Done |
| **P4** | `LocalWhisperProvider` (WhisperTranscriber relocated to `ai/audio/local`) | Done |
| **P5** | `audio_music` + Lyria path | Done |
| **P6** | Setting form `hotblack.yaml`, Manual `audio-generation.md`, Prompt Hooks Arthur/Eddie/Ford | Done |
| **P7** | This spec, `agent/subsystems.md` entry, readme | Done |
| **P7b** | Local audio edit family: `AudioManipulationService` + `FfmpegAudioEditor`, Tools `audio_info`/`audio_trim`/`audio_mix`/`audio_concat`/`audio_convert` (report `planning/audio-edit-tools.md`) | Done |
| **P8a** | Audio understanding as a tool: `audio_analyze` + `kind: au` + `default:au` + provider op `analyze` (OpenRouter `input_audio`-chat wire) | Done (2026-10-12, Plan `planning/audio-analyze.md`) |
| **P8b** *(v1.1)* | Audio understanding in chat dispatch (`ModelCapability.AUDIO_INPUT` + `input_audio`-content block), `detail:"segments"` (STT timestamps/diarization), voice presets, units-based quota, Discovery extension (`output_modalities`, `supported_voices`) | Open |

**Tests:** Unit tests (sniffer, WAV wrap, `AudioSource`, `AudioCallTracker`, service helpers, catalog pins of bundled audio model docs) green; `BundledSettingFormsTest` pins the alias fields of `llm-setup.yaml`. Live test `qa/ai-test/OpenRouterAudioLiveTest` (`@Tag("manual")`, `VANCE_OPENROUTER_LIVE=1 ./wb qa OpenRouterAudioLiveTest`) verifies TTS→STT roundtrip with cost booking, Lyria clip with sniffed MIME + `usage.cost`, the music generator-critic roundtrip (`audio_music` generates the clip, `audio_analyze` describes it via Voxtral, `usage.cost` booked as modality `au`) and the two catalog gate negative paths — 4/4 green (2026-10-12). Edit family: `AudioManipulationServiceTest` (pipeline with mocked editor: validation, limits, target guards, MIME sniffing) and `FfmpegAudioEditorTest` (golden tests against real ffmpeg with generated sine tones — trim/mix/concat/convert including duration assertions; skipped without ffmpeg on `PATH`).

**Design Decisions (clarified):**

- **Tool, not Engine** — Single-shot nature does not justify a ThinkProcess lifecycle (like Fenchurch).
- **A single `audio_*` family** — short, verb-led names with keywords (`speak`/`transcribe`/`music`/`voices`) for robust LLM tool selection.
- **Language defaults from `chat.language`** for generated audio, auto-detect for STT — the user's language controls, not the prompt author's.
- **Quota per call, not per unit** — the TOCTOU-safe reserve pattern counts rows; units are in the audit log (§7).
- **Always sniff MIME, allow format downshifting** — provider responses are not a format contract (Lyria delivers MP3 for `wav`; Gemini-TTS only delivers `pcm`). The adapter retries format-400 once as `pcm` and wraps to WAV.
- **One interface, four operations, default-fail** — providers can have partial capabilities; the catalog gate (§6) catches misconfigurations before the call.
- **Vendor `usage.cost` wins** over catalog estimate — unpriced remains unpriced instead of guessed.
- **Shared ASR engine instead of shared dispatch** for `video_transcript` (§4.3) — feature preservation (timestamps/progress) over pseudo-uniformity; refactoring with `detail:"segments"`.
- **Audio allowlist now, capability flag later** (§11) — the living "provision" is materialization, not an unread flag.
