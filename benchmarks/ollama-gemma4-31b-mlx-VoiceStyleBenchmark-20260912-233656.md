# Vance Benchmark - ollama-gemma4-31b-mlx-VoiceStyleBenchmark-20260912-233656

- **Started:** 2026-09-12T23:36:56.569240Z
- **Judge:** glm-5.3-nvfp4
- **Knobs:** {chatTimeoutS=480, waitBudgetMinS=240}
- **Score model:** v2-graded
- **Total tests:** 13
- **Passed:** 5 / 13 (38%)
- **Average score:** 0.720
- **Total LLM time:** 1681.4s
- **Total tokens (in / out):** 1.40M / 7.6k (45 round-trips)


## voice-style

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `voiceAcronymExpansion` | OK | 1.00 | 58.9s | 87.2k | 707 | 2 | K8s expanded to Kubernetes in speakable text — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | K8s expanded to Kubernetes in speakable text |

</details>

| `voiceFenceForCodePath` | FAIL | 0.50 | 126.1s | 86.9k | 217 | 2 | long path/URL `git clone https://github.com/spring-projects/spring-petclinic.git` left in inline-backticks — TTS would either spell it or read with noise. Belongs in a fence in voice mode. — 50% — 2/3 checks · missed: voice-discipline |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 0.00 | 2.00 | long path/URL `git clone https://github.com/spring-projects/spring-petclinic.git` left in inline-backticks — TTS would either spell it or read with noise. Belongs in a fence in voice mode. |

</details>

| `voiceFenceForLongList` | FAIL | 0.50 | 179.5s | 171.8k | 989 | 7 | neither fence nor pipe-table found — long list must sit in structure the TTS stripper skips. content head: _I just lost track while passing along the worker's response — if the answer is missing, tell me and I'll restart the worker._ — 50% — 2/3 checks · missed: voice-discipline |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 0.00 | 2.00 | neither fence nor pipe-table found — long list must sit in structure the TTS stripper skips. content head: _I just lost track while passing along the worker's response — if the answer is missing, tell me and I'll restart the worker._ |

</details>

| `voiceFenceForTable` | FAIL | 0.50 | 265.2s | 164.9k | 2.1k | 6 | neither pipe-table nor fence found — comparison should sit in a structure the stripper reduces to a hint. content head: _I just lost track while passing along the worker's response — if the answer is missing, tell me and I'll restart the worker._ — 50% — 2/3 checks · missed: voice-discipline |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 0.00 | 2.00 | neither pipe-table nor fence found — comparison should sit in a structure the stripper reduces to a hint. content head: _I just lost track while passing along the worker's response — if the answer is missing, tell me and I'll restart the worker._ |

</details>

| `voiceFenceNotMisused` | OK | 1.00 | 114.4s | 43.3k | 44 | 1 | fence-not-misused (Paris in speakable); judge: Paris is named directly in a short natural sentence with no code fences. — 100% — 4/4 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | fence-not-misused (Paris in speakable) |
| `style` | judged | 3.00 | 3.00 | Paris is named directly in a short natural sentence with no code fences. |

</details>

| `voiceModeOffMidConversation` | OK | 1.00 | 158.9s | 129.6k | 741 | 3 | voice-mode toggle respected mid-conversation: voice=1 sentences vs text=2 — 100% — 5/5 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-1-voice` | stage | 1.00 | 1.00 |  |
| `reply-1` | stage | 1.00 | 1.00 | 1 sentences |
| `turn-2-text` | stage | 1.00 | 1.00 |  |
| `reply-2` | stage | 1.00 | 1.00 | 2 sentences |
| `toggle-took-effect` | stage | 2.00 | 2.00 | reply grew |

</details>

| `voiceNumbersSpeakable` | OK | 1.00 | 119.1s | 43.3k | 107 | 1 | no ISO date leaked into speakable text (numbers TTS-safe) — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | no ISO date leaked into speakable text (numbers TTS-safe) |

</details>

| `voiceQuestionEndsOpenly` | FAIL | 0.50 | 33.7s | 130.9k | 426 | 3 | voice reply ends without a clear turn signal (no question, open invitation, or decisive recommendation) — user is left guessing whether the model is done. tail: Ich schaue kurz nach und melde mich gleich bei dir. — 50% — 2/3 checks · missed: voice-discipline |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 0.00 | 2.00 | voice reply ends without a clear turn signal (no question, open invitation, or decisive recommendation) — user is left guessing whether the model is done. tail: Ich schaue kurz nach und melde mich gleich bei dir. |

</details>

| `voiceShortBulletsAllowedInline` | FAIL | 0.79 | 34.0s | 87.0k | 347 | 2 | voice short-bullets (3 bullets); judge: On-topic with Erstens/Zweitens/Drittens markers, but stray '.;' punctuation and doubled colons make the spoken form stilted. — 79% — 3/4 checks · missed: style |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | voice short-bullets (3 bullets) |
| `style` | judged | 1.50 | 3.00 | On-topic with Erstens/Zweitens/Drittens markers, but stray '.;' punctuation and doubled colons make the spoken form stilted. |

</details>

| `voiceShortProseReply` | FAIL | 0.57 | 169.3s | 138.2k | 624 | 7 | voice short prose (0 sentences); judge: Off-topic meta-message about a worker error; contains no answer about Lisbon sights. — 57% — 3/4 checks · missed: style |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | voice short prose (0 sentences) |
| `style` | judged | 0.00 | 3.00 | Off-topic meta-message about a worker error; contains no answer about Lisbon sights. |

</details>

| `voiceSpokenPartNoMarkdownLeak` | OK | 1.00 | 123.0s | 87.2k | 503 | 2 | speakable text has no markdown markers (139 chars) — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | speakable text has no markdown markers (139 chars) |

</details>

| `voiceSttToleranceCutWord` | FAIL | 0.50 | 111.4s | 43.3k | 42 | 1 | STT cut-off 'münch' should be tolerated as München — reply neither names the full city nor asks for clarification. stripped head: Sorry — internal: tried to delegate without a prompt. Reason was: The user is asking for current weather in Munich. This requires real-time information from the web. — 50% — 2/3 checks · missed: voice-discipline |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 0.00 | 2.00 | STT cut-off 'münch' should be tolerated as München — reply neither names the full city nor asks for clarification. stripped head: Sorry — internal: tried to delegate without a prompt. Reason was: The user is asking for current weather in Munich. This requires real-time information from the web. |

</details>

| `voiceSttToleranceHomophone` | FAIL | 0.50 | 188.0s | 181.7k | 740 | 8 | STT homophone 'lisa bonn' should map to Lissabon — reply neither mentions Lissabon nor Lisbon. stripped head: I just lost track while passing along the worker's response — if the answer is missing, tell me and I'll restart the worker. — 50% — 2/3 checks · missed: voice-discipline |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 0.00 | 2.00 | STT homophone 'lisa bonn' should map to Lissabon — reply neither mentions Lissabon nor Lisbon. stripped head: I just lost track while passing along the worker's response — if the answer is missing, tell me and I'll restart the worker. |

</details>

