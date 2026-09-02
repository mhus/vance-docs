# Vance Benchmark - ollama-gemma4-31b-mlx__smallv2-VoiceStyleBenchmark-20260822-101205

- **Started:** 2026-08-22T10:12:05.346490Z
- **Judge:** gemini-gemini-2.5-pro
- **Knobs:** {chatTimeoutS=600, waitBudgetMinS=300}
- **Score model:** v2-graded
- **Total tests:** 13
- **Passed:** 6 / 13 (46%)
- **Average score:** 0.758
- **Total LLM time:** 1454.0s
- **Total tokens (in / out):** 1.22M / 6.1k (45 round-trips)


## voice-style

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `voiceAcronymExpansion` | OK | 1.00 | 46.8s | 79.5k | 477 | 2 | K8s expanded to Kubernetes in speakable text — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | K8s expanded to Kubernetes in speakable text |

</details>

| `voiceFenceForCodePath` | FAIL | 0.50 | 106.3s | 79.4k | 200 | 2 | long path/URL `git clone https://github.com/spring-projects/spring-petclinic.git` left in inline-backticks — TTS would either spell it or read with noise. Belongs in a fence in voice mode. — 50% — 2/3 checks · missed: voice-discipline |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 0.00 | 2.00 | long path/URL `git clone https://github.com/spring-projects/spring-petclinic.git` left in inline-backticks — TTS would either spell it or read with noise. Belongs in a fence in voice mode. |

</details>

| `voiceFenceForLongList` | FAIL | 0.50 | 171.0s | 130.1k | 722 | 7 | no triple-backtick fence found — long list should sit inside a fence so TTS skips it. content head: _I just lost track while passing along the worker's response — if the answer is missing, tell me and I'll restart the worker._ — 50% — 2/3 checks · missed: voice-discipline |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 0.00 | 2.00 | no triple-backtick fence found — long list should sit inside a fence so TTS skips it. content head: _I just lost track while passing along the worker's response — if the answer is missing, tell me and I'll restart the worker._ |

</details>

| `voiceFenceForTable` | FAIL | 0.50 | 172.3s | 130.4k | 709 | 7 | neither pipe-table nor fence found — comparison should sit in a structure the stripper reduces to a hint. content head: _I just lost track while passing along the worker's response — if the answer is missing, tell me and I'll restart the worker._ — 50% — 2/3 checks · missed: voice-discipline |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 0.00 | 2.00 | neither pipe-table nor fence found — comparison should sit in a structure the stripper reduces to a hint. content head: _I just lost track while passing along the worker's response — if the answer is missing, tell me and I'll restart the worker._ |

</details>

| `voiceFenceNotMisused` | OK | 1.00 | 94.8s | 39.5k | 46 | 1 | fence-not-misused (Paris in speakable); judge: The candidate directly names the capital in a short sentence. — 100% — 4/4 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | fence-not-misused (Paris in speakable) |
| `style` | judged | 3.00 | 3.00 | The candidate directly names the capital in a short sentence. |

</details>

| `voiceModeOffMidConversation` | OK | 1.00 | 186.7s | 158.5k | 1.5k | 4 | voice-mode toggle respected mid-conversation: voice=2 sentences vs text=21 with markdown structure — 100% — 5/5 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-1-voice` | stage | 1.00 | 1.00 |  |
| `reply-1` | stage | 1.00 | 1.00 | 2 sentences |
| `turn-2-text` | stage | 1.00 | 1.00 |  |
| `reply-2` | stage | 1.00 | 1.00 | 21 sentences |
| `toggle-took-effect` | stage | 2.00 | 2.00 | markdown structure returned |

</details>

| `voiceNumbersSpeakable` | OK | 1.00 | 107.4s | 79.4k | 242 | 2 | no ISO date leaked into speakable text (numbers TTS-safe) — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | no ISO date leaked into speakable text (numbers TTS-safe) |

</details>

| `voiceQuestionEndsOpenly` | OK | 1.00 | 21.2s | 79.4k | 301 | 2 | last sentence closes the turn cleanly (question, invitation, or clear recommendation) — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | last sentence closes the turn cleanly (question, invitation, or clear recommendation) |

</details>

| `voiceShortBulletsAllowedInline` | FAIL | 0.79 | 44.5s | 79.5k | 361 | 2 | voice short-bullets (3 bullets); judge: Candidate uses cardinal numbers ('Eins, Zwei, Drei') instead of the more natural ordinal form for enumeration. — 79% — 3/4 checks · missed: style |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | voice short-bullets (3 bullets) |
| `style` | judged | 1.50 | 3.00 | Candidate uses cardinal numbers ('Eins, Zwei, Drei') instead of the more natural ordinal form for enumeration. |

</details>

| `voiceShortProseReply` | FAIL | 0.57 | 151.5s | 129.9k | 715 | 7 | voice short prose (0 sentences); judge: The candidate is an off-topic system error message in the wrong language. — 57% — 3/4 checks · missed: style |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | voice short prose (0 sentences) |
| `style` | judged | 0.00 | 3.00 | The candidate is an off-topic system error message in the wrong language. |

</details>

| `voiceSpokenPartNoMarkdownLeak` | OK | 1.00 | 80.1s | 39.5k | 71 | 1 | speakable text has no markdown markers (301 chars) — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | speakable text has no markdown markers (301 chars) |

</details>

| `voiceSttToleranceCutWord` | FAIL | 0.50 | 95.9s | 39.5k | 68 | 1 | STT cut-off 'münch' should be tolerated as München — reply neither names the full city nor asks for clarification. stripped head: Sorry — internal: tried to delegate without a prompt. Reason was: The user is asking for current weather in Munich. I need to find this information using a tool. Since I don't have a direct weather tool, I'll delegate to a generalist worker… — 50% — 2/3 checks · missed: voice-discipline |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 0.00 | 2.00 | STT cut-off 'münch' should be tolerated as München — reply neither names the full city nor asks for clarification. stripped head: Sorry — internal: tried to delegate without a prompt. Reason was: The user is asking for current weather in Munich. I need to find this information using a tool. Since I don't have a direct weather tool, I'll delegate to a generalist worker… |

</details>

| `voiceSttToleranceHomophone` | FAIL | 0.50 | 175.5s | 159.4k | 731 | 7 | STT homophone 'lisa bonn' should map to Lissabon — reply neither mentions Lissabon nor Lisbon. stripped head: I just lost track while passing along the worker's response — if the answer is missing, tell me and I'll restart the worker. — 50% — 2/3 checks · missed: voice-discipline |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 0.00 | 2.00 | STT homophone 'lisa bonn' should map to Lissabon — reply neither mentions Lissabon nor Lisbon. stripped head: I just lost track while passing along the worker's response — if the answer is missing, tell me and I'll restart the worker. |

</details>

