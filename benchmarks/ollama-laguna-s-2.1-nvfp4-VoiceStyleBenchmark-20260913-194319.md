# Vance Benchmark - ollama-laguna-s-2.1-nvfp4-VoiceStyleBenchmark-20260913-194319

- **Started:** 2026-09-13T19:43:19.482037Z
- **Judge:** glm-5.3-nvfp4
- **Knobs:** {chatTimeoutS=480, waitBudgetMinS=240}
- **Score model:** v2-graded
- **Total tests:** 13
- **Passed:** 11 / 13 (85%)
- **Average score:** 0.907
- **Total LLM time:** 416.9s
- **Total tokens (in / out):** 2.14M / 10.9k (48 round-trips)


## voice-style

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `voiceAcronymExpansion` | OK | 1.00 | 13.3s | 109.4k | 316 | 2 | K8s expanded to Kubernetes in speakable text — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | K8s expanded to Kubernetes in speakable text |

</details>

| `voiceFenceForCodePath` | OK | 1.00 | 3.6s | 109.3k | 121 | 2 | no long path/URL leaked into inline-code (voice-safe) — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | no long path/URL leaked into inline-code (voice-safe) |

</details>

| `voiceFenceForLongList` | FAIL | 0.50 | 140.4s | 384.4k | 3.7k | 16 | neither fence nor pipe-table found — long list must sit in structure the TTS stripper skips. content head: Hier sind die zehn typischen Restaurants in Berlin-Mitte mit Stadtteil-Schwerpunkt:  - **Zur Letzten Instanz** – Mühlendamm 44, 10178 Berlin (historisches Rathaus) – Berliner Gaststätte seit 1621, klassische deutsche Küche wie Sauerbraten u… — 50% — 2/3 checks · missed: voice-discipline |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 0.00 | 2.00 | neither fence nor pipe-table found — long list must sit in structure the TTS stripper skips. content head: Hier sind die zehn typischen Restaurants in Berlin-Mitte mit Stadtteil-Schwerpunkt:  - **Zur Letzten Instanz** – Mühlendamm 44, 10178 Berlin (historisches Rathaus) – Berliner Gaststätte seit 1621, klassische deutsche Küche wie Sauerbraten u… |

</details>

| `voiceFenceForTable` | OK | 1.00 | 78.2s | 164.7k | 1.1k | 3 | comparison routed into pipe-table — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | comparison routed into pipe-table |

</details>

| `voiceFenceNotMisused` | OK | 1.00 | 2.5s | 109.3k | 66 | 2 | fence-not-misused (Paris in speakable); judge: Paris is named directly in a short, natural spoken reply. — 100% — 4/4 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | fence-not-misused (Paris in speakable) |
| `style` | judged | 3.00 | 3.00 | Paris is named directly in a short, natural spoken reply. |

</details>

| `voiceModeOffMidConversation` | OK | 1.00 | 43.0s | 218.3k | 1.9k | 4 | voice-mode toggle respected mid-conversation: voice=1 sentences vs text=17 with markdown structure — 100% — 5/5 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-1-voice` | stage | 1.00 | 1.00 |  |
| `reply-1` | stage | 1.00 | 1.00 | 1 sentences |
| `turn-2-text` | stage | 1.00 | 1.00 |  |
| `reply-2` | stage | 1.00 | 1.00 | 17 sentences |
| `toggle-took-effect` | stage | 2.00 | 2.00 | markdown structure returned |

</details>

| `voiceNumbersSpeakable` | OK | 1.00 | 4.8s | 109.4k | 166 | 2 | no ISO date leaked into speakable text (numbers TTS-safe) — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | no ISO date leaked into speakable text (numbers TTS-safe) |

</details>

| `voiceQuestionEndsOpenly` | OK | 1.00 | 16.0s | 109.6k | 674 | 2 | last sentence closes the turn cleanly (question, invitation, or clear recommendation) — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | last sentence closes the turn cleanly (question, invitation, or clear recommendation) |

</details>

| `voiceShortBulletsAllowedInline` | OK | 1.00 | 8.1s | 109.4k | 309 | 2 | voice short-bullets (3 bullets); judge: Bullets use the natural Erstens/Zweitens/Drittens spoken form and cover three on-topic bug-report essentials. — 100% — 4/4 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | voice short-bullets (3 bullets) |
| `style` | judged | 3.00 | 3.00 | Bullets use the natural Erstens/Zweitens/Drittens spoken form and cover three on-topic bug-report essentials. |

</details>

| `voiceShortProseReply` | FAIL | 0.29 | 27.6s | 219.6k | 1.1k | 4 | voice reply had 12 prose sentences (≤4 allowed); speakable head: Die wichtigsten Sehenswürdigkeiten in Lissabon:  Erstens: Alfama – historisches Viertel mit engen Gassen, fado-Bars und Flussblick.; Zweitens: Castelo de São Jorge – 11. Jahrhundert Festungsburg mit A… — 29% — 2/4 checks · missed: voice-discipline, style(skipped) |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 0.00 | 2.00 | voice reply had 12 prose sentences (≤4 allowed); speakable head: Die wichtigsten Sehenswürdigkeiten in Lissabon:  Erstens: Alfama – historisches Viertel mit engen Gassen, fado-Bars und Flussblick.; Zweitens: Castelo de São Jorge – 11. Jahrhundert Festungsburg mit A… |
| `style` | judged | skipped | 3.00 | chain stopped earlier |

</details>

| `voiceSpokenPartNoMarkdownLeak` | OK | 1.00 | 53.5s | 109.5k | 572 | 2 | speakable text has no markdown markers (715 chars) — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | speakable text has no markdown markers (715 chars) |

</details>

| `voiceSttToleranceCutWord` | OK | 1.00 | 12.4s | 219.2k | 471 | 4 | STT cut-off word tolerated, reply references München — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | STT cut-off word tolerated, reply references München |

</details>

| `voiceSttToleranceHomophone` | OK | 1.00 | 13.3s | 164.3k | 481 | 3 | STT homophone tolerated, reply references Lissabon — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | STT homophone tolerated, reply references Lissabon |

</details>

