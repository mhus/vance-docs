# Vance Benchmark - ollama-qwen3.6-35b__smallv2-VoiceStyleBenchmark-20260822-003432

- **Started:** 2026-08-22T00:34:32.916711Z
- **Judge:** gemini-gemini-2.5-pro
- **Knobs:** {chatTimeoutS=600, waitBudgetMinS=300}
- **Score model:** v2-graded
- **Total tests:** 13
- **Passed:** 11 / 13 (85%)
- **Average score:** 0.942
- **Total LLM time:** 173.3s
- **Total tokens (in / out):** 1.23M / 7.1k (30 round-trips)


## voice-style

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `voiceAcronymExpansion` | OK | 1.00 | 8.9s | 81.6k | 516 | 2 | K8s expanded to Kubernetes in speakable text — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | K8s expanded to Kubernetes in speakable text |

</details>

| `voiceFenceForCodePath` | OK | 1.00 | 4.2s | 81.5k | 126 | 2 | no long path/URL leaked into inline-code (voice-safe) — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | no long path/URL leaked into inline-code (voice-safe) |

</details>

| `voiceFenceForLongList` | FAIL | 0.50 | 13.6s | 81.8k | 901 | 2 | no triple-backtick fence found — long list should sit inside a fence so TTS skips it. content head: Ich kann keine echten, aktuellen Restaurant-Empfehlungen aus eigener Kenntnis liefern, da sich Öffnungszeiten, Bewertungen und Existenz ständig ändern. Stattdessen zeige ich dir, wie du zuverlässig eine aktuelle Liste bekommst:  **Schnellst… — 50% — 2/3 checks · missed: voice-discipline |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 0.00 | 2.00 | no triple-backtick fence found — long list should sit inside a fence so TTS skips it. content head: Ich kann keine echten, aktuellen Restaurant-Empfehlungen aus eigener Kenntnis liefern, da sich Öffnungszeiten, Bewertungen und Existenz ständig ändern. Stattdessen zeige ich dir, wie du zuverlässig eine aktuelle Liste bekommst:  **Schnellst… |

</details>

| `voiceFenceForTable` | OK | 1.00 | 32.3s | 165.7k | 2.3k | 4 | comparison routed into fence — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | comparison routed into fence |

</details>

| `voiceFenceNotMisused` | OK | 1.00 | 3.4s | 81.4k | 67 | 2 | fence-not-misused (Paris in speakable); judge: The candidate directly and concisely answers the question. — 100% — 4/4 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | fence-not-misused (Paris in speakable) |
| `style` | judged | 3.00 | 3.00 | The candidate directly and concisely answers the question. |

</details>

| `voiceModeOffMidConversation` | OK | 1.00 | 43.7s | 162.5k | 1.0k | 4 | voice-mode toggle respected mid-conversation: voice=1 sentences vs text=10 with markdown structure — 100% — 5/5 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-1-voice` | stage | 1.00 | 1.00 |  |
| `reply-1` | stage | 1.00 | 1.00 | 1 sentences |
| `turn-2-text` | stage | 1.00 | 1.00 |  |
| `reply-2` | stage | 1.00 | 1.00 | 10 sentences |
| `toggle-took-effect` | stage | 2.00 | 2.00 | markdown structure returned |

</details>

| `voiceNumbersSpeakable` | OK | 1.00 | 4.4s | 81.5k | 145 | 2 | no ISO date leaked into speakable text (numbers TTS-safe) — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | no ISO date leaked into speakable text (numbers TTS-safe) |

</details>

| `voiceQuestionEndsOpenly` | OK | 1.00 | 7.6s | 81.6k | 393 | 2 | last sentence closes the turn cleanly (question, invitation, or clear recommendation) — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | last sentence closes the turn cleanly (question, invitation, or clear recommendation) |

</details>

| `voiceShortBulletsAllowedInline` | FAIL | 0.79 | 6.4s | 81.5k | 303 | 2 | voice short-bullets (3 bullets); judge: The enumeration 'Eins, Zwei, Drei' is stilted and does not use the requested natural form 'Erstens, zweitens, drittens'. — 79% — 3/4 checks · missed: style |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | voice short-bullets (3 bullets) |
| `style` | judged | 1.50 | 3.00 | The enumeration 'Eins, Zwei, Drei' is stilted and does not use the requested natural form 'Erstens, zweitens, drittens'. |

</details>

| `voiceShortProseReply` | OK | 0.96 | 6.7s | 81.5k | 341 | 2 | voice short prose (2 sentences); judge: The final sentence contains a grammatical error. — 96% — 3/4 checks · missed: style |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | voice short prose (2 sentences) |
| `style` | judged | 2.70 | 3.00 | The final sentence contains a grammatical error. |

</details>

| `voiceSpokenPartNoMarkdownLeak` | OK | 1.00 | 30.4s | 81.6k | 428 | 2 | speakable text has no markdown markers (724 chars) — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | speakable text has no markdown markers (724 chars) |

</details>

| `voiceSttToleranceCutWord` | OK | 1.00 | 5.0s | 81.5k | 204 | 2 | STT cut-off word tolerated, reply references München — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | STT cut-off word tolerated, reply references München |

</details>

| `voiceSttToleranceHomophone` | OK | 1.00 | 6.8s | 81.6k | 351 | 2 | STT homophone tolerated, reply references Lissabon — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | STT homophone tolerated, reply references Lissabon |

</details>

