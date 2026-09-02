# Vance Benchmark - ollama-gemma4-31b-mlx__smallv2-VoiceStyleBenchmark-20260822-144126

- **Started:** 2026-08-22T14:41:26.882704Z
- **Judge:** gemini-gemini-2.5-pro
- **Knobs:** {chatTimeoutS=600, waitBudgetMinS=300}
- **Score model:** v2-graded
- **Total tests:** 13
- **Passed:** 7 / 13 (54%)
- **Average score:** 0.775
- **Total LLM time:** 1296.6s
- **Total tokens (in / out):** 1.26M / 6.7k (42 round-trips)


## voice-style

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `voiceAcronymExpansion` | OK | 1.00 | 62.0s | 79.7k | 628 | 2 | K8s expanded to Kubernetes in speakable text — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | K8s expanded to Kubernetes in speakable text |

</details>

| `voiceFenceForCodePath` | FAIL | 0.50 | 105.8s | 79.5k | 200 | 2 | long path/URL `git clone https://github.com/spring-projects/spring-petclinic.git` left in inline-backticks — TTS would either spell it or read with noise. Belongs in a fence in voice mode. — 50% — 2/3 checks · missed: voice-discipline |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 0.00 | 2.00 | long path/URL `git clone https://github.com/spring-projects/spring-petclinic.git` left in inline-backticks — TTS would either spell it or read with noise. Belongs in a fence in voice mode. |

</details>

| `voiceFenceForLongList` | FAIL | 0.50 | 167.9s | 119.8k | 690 | 6 | no triple-backtick fence found — long list should sit inside a fence so TTS skips it. content head: _I just lost track while passing along the worker's response — if the answer is missing, tell me and I'll restart the worker._ — 50% — 2/3 checks · missed: voice-discipline |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 0.00 | 2.00 | no triple-backtick fence found — long list should sit inside a fence so TTS skips it. content head: _I just lost track while passing along the worker's response — if the answer is missing, tell me and I'll restart the worker._ |

</details>

| `voiceFenceForTable` | FAIL | 0.50 | 186.1s | 170.4k | 929 | 8 | neither pipe-table nor fence found — comparison should sit in a structure the stripper reduces to a hint. content head: _I just lost track while passing along the worker's response — if the answer is missing, tell me and I'll restart the worker._ — 50% — 2/3 checks · missed: voice-discipline |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 0.00 | 2.00 | neither pipe-table nor fence found — comparison should sit in a structure the stripper reduces to a hint. content head: _I just lost track while passing along the worker's response — if the answer is missing, tell me and I'll restart the worker._ |

</details>

| `voiceFenceNotMisused` | OK | 1.00 | 93.9s | 39.6k | 42 | 1 | fence-not-misused (Paris in speakable); judge: The candidate directly and concisely answers the question. — 100% — 4/4 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | fence-not-misused (Paris in speakable) |
| `style` | judged | 3.00 | 3.00 | The candidate directly and concisely answers the question. |

</details>

| `voiceModeOffMidConversation` | OK | 1.00 | 166.9s | 158.3k | 1.2k | 4 | voice-mode toggle respected mid-conversation: voice=1 sentences vs text=15 with markdown structure — 100% — 5/5 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-1-voice` | stage | 1.00 | 1.00 |  |
| `reply-1` | stage | 1.00 | 1.00 | 1 sentences |
| `turn-2-text` | stage | 1.00 | 1.00 |  |
| `reply-2` | stage | 1.00 | 1.00 | 15 sentences |
| `toggle-took-effect` | stage | 2.00 | 2.00 | markdown structure returned |

</details>

| `voiceNumbersSpeakable` | OK | 1.00 | 23.5s | 119.6k | 298 | 3 | no ISO date leaked into speakable text (numbers TTS-safe) — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | no ISO date leaked into speakable text (numbers TTS-safe) |

</details>

| `voiceQuestionEndsOpenly` | OK | 1.00 | 48.0s | 79.7k | 681 | 2 | last sentence closes the turn cleanly (question, invitation, or clear recommendation) — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | last sentence closes the turn cleanly (question, invitation, or clear recommendation) |

</details>

| `voiceShortBulletsAllowedInline` | OK | 1.00 | 57.1s | 79.7k | 542 | 2 | voice short-bullets (0 bullets); judge: The candidate correctly uses the specified German ordinal adverbs for its list. — 100% — 4/4 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | voice short-bullets (0 bullets) |
| `style` | judged | 3.00 | 3.00 | The candidate correctly uses the specified German ordinal adverbs for its list. |

</details>

| `voiceShortProseReply` | FAIL | 0.57 | 4.0s | 39.6k | 49 | 1 | voice short prose (3 sentences); judge: The candidate is an internal error message, not a user-facing answer. — 57% — 3/4 checks · missed: style |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | voice short prose (3 sentences) |
| `style` | judged | 0.00 | 3.00 | The candidate is an internal error message, not a user-facing answer. |

</details>

| `voiceSpokenPartNoMarkdownLeak` | OK | 1.00 | 134.8s | 79.8k | 692 | 2 | speakable text has no markdown markers (572 chars) — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | speakable text has no markdown markers (572 chars) |

</details>

| `voiceSttToleranceCutWord` | FAIL | 0.50 | 93.7s | 39.6k | 43 | 1 | STT cut-off 'münch' should be tolerated as München — reply neither names the full city nor asks for clarification. stripped head: Sorry — internal: tried to delegate without a prompt. Reason was: The user is asking for the current weather in Munich. I need to fetch this information from the web. — 50% — 2/3 checks · missed: voice-discipline |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 0.00 | 2.00 | STT cut-off 'münch' should be tolerated as München — reply neither names the full city nor asks for clarification. stripped head: Sorry — internal: tried to delegate without a prompt. Reason was: The user is asking for the current weather in Munich. I need to fetch this information from the web. |

</details>

| `voiceSttToleranceHomophone` | FAIL | 0.50 | 153.1s | 169.7k | 698 | 8 | STT homophone 'lisa bonn' should map to Lissabon — reply neither mentions Lissabon nor Lisbon. stripped head: I just lost track while passing along the worker's response — if the answer is missing, tell me and I'll restart the worker. — 50% — 2/3 checks · missed: voice-discipline |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 0.00 | 2.00 | STT homophone 'lisa bonn' should map to Lissabon — reply neither mentions Lissabon nor Lisbon. stripped head: I just lost track while passing along the worker's response — if the answer is missing, tell me and I'll restart the worker. |

</details>

