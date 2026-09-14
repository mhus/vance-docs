# Vance Benchmark - ollama-qwen3.6-35b-VoiceStyleBenchmark-20260913-075036

- **Started:** 2026-09-13T07:50:36.276373Z
- **Judge:** glm-5.3-nvfp4
- **Knobs:** {chatTimeoutS=480, waitBudgetMinS=240}
- **Score model:** v2-graded
- **Total tests:** 13
- **Passed:** 11 / 13 (85%)
- **Average score:** 0.907
- **Total LLM time:** 239.7s
- **Total tokens (in / out):** 1.38M / 5.6k (31 round-trips)


## voice-style

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `voiceAcronymExpansion` | OK | 1.00 | 8.2s | 89.2k | 432 | 2 | K8s expanded to Kubernetes in speakable text — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | K8s expanded to Kubernetes in speakable text |

</details>

| `voiceFenceForCodePath` | OK | 1.00 | 4.6s | 44.5k | 99 | 1 | no long path/URL leaked into inline-code (voice-safe) — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | no long path/URL leaked into inline-code (voice-safe) |

</details>

| `voiceFenceForLongList` | FAIL | 0.50 | 8.8s | 134.0k | 441 | 3 | neither fence nor pipe-table found — long list must sit in structure the TTS stripper skips. content head: Ich recherchiere gerade zehn typische Restaurants in Berlin-Mitte mit Stadtteil-Schwerpunkt und stelle sie als komplette Liste zusammen. — 50% — 2/3 checks · missed: voice-discipline |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 0.00 | 2.00 | neither fence nor pipe-table found — long list must sit in structure the TTS stripper skips. content head: Ich recherchiere gerade zehn typische Restaurants in Berlin-Mitte mit Stadtteil-Schwerpunkt und stelle sie als komplette Liste zusammen. |

</details>

| `voiceFenceForTable` | OK | 1.00 | 23.8s | 89.7k | 1.1k | 2 | comparison routed into fence — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | comparison routed into fence |

</details>

| `voiceFenceNotMisused` | OK | 1.00 | 4.9s | 89.0k | 145 | 2 | fence-not-misused (Paris in speakable); judge: Paris is named directly in the spoken part as a short, natural reply. — 100% — 4/4 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | fence-not-misused (Paris in speakable) |
| `style` | judged | 3.00 | 3.00 | Paris is named directly in the spoken part as a short, natural reply. |

</details>

| `voiceModeOffMidConversation` | OK | 1.00 | 98.7s | 222.1k | 972 | 5 | voice-mode toggle respected mid-conversation: voice=1 sentences vs text=9 with markdown structure — 100% — 5/5 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-1-voice` | stage | 1.00 | 1.00 |  |
| `reply-1` | stage | 1.00 | 1.00 | 1 sentences |
| `turn-2-text` | stage | 1.00 | 1.00 |  |
| `reply-2` | stage | 1.00 | 1.00 | 9 sentences |
| `toggle-took-effect` | stage | 2.00 | 2.00 | markdown structure returned |

</details>

| `voiceNumbersSpeakable` | OK | 1.00 | 5.1s | 89.1k | 166 | 2 | no ISO date leaked into speakable text (numbers TTS-safe) — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | no ISO date leaked into speakable text (numbers TTS-safe) |

</details>

| `voiceQuestionEndsOpenly` | OK | 1.00 | 8.3s | 89.2k | 424 | 2 | last sentence closes the turn cleanly (question, invitation, or clear recommendation) — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | last sentence closes the turn cleanly (question, invitation, or clear recommendation) |

</details>

| `voiceShortBulletsAllowedInline` | OK | 1.00 | 8.0s | 89.1k | 235 | 2 | voice short-bullets (3 bullets); judge: Three on-topic bug-report bullets use the natural Erstens/Zweitens/Drittens spoken enumeration. — 100% — 4/4 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | voice short-bullets (3 bullets) |
| `style` | judged | 3.00 | 3.00 | Three on-topic bug-report bullets use the natural Erstens/Zweitens/Drittens spoken enumeration. |

</details>

| `voiceShortProseReply` | FAIL | 0.29 | 8.3s | 89.2k | 429 | 2 | voice reply had 5 prose sentences (≤4 allowed); speakable head: In Lissabon sind die wichtigsten Sehenswürdigkeiten:  Erstens das Alfama, der älteste Stadtteil mit verwinkelten Gassen, Fado-Bars und dem Castelo de São Jorge. Zweitens Belém mit dem Mosteiro dos Jer… — 29% — 2/4 checks · missed: voice-discipline, style(skipped) |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 0.00 | 2.00 | voice reply had 5 prose sentences (≤4 allowed); speakable head: In Lissabon sind die wichtigsten Sehenswürdigkeiten:  Erstens das Alfama, der älteste Stadtteil mit verwinkelten Gassen, Fado-Bars und dem Castelo de São Jorge. Zweitens Belém mit dem Mosteiro dos Jer… |
| `style` | judged | skipped | 3.00 | chain stopped earlier |

</details>

| `voiceSpokenPartNoMarkdownLeak` | OK | 1.00 | 38.2s | 89.3k | 511 | 2 | speakable text has no markdown markers (891 chars) — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | speakable text has no markdown markers (891 chars) |

</details>

| `voiceSttToleranceCutWord` | OK | 1.00 | 16.7s | 179.0k | 343 | 4 | STT cut-off word tolerated, reply references München — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | STT cut-off word tolerated, reply references München |

</details>

| `voiceSttToleranceHomophone` | OK | 1.00 | 6.0s | 89.1k | 232 | 2 | STT homophone tolerated, reply references Lissabon — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | STT homophone tolerated, reply references Lissabon |

</details>

