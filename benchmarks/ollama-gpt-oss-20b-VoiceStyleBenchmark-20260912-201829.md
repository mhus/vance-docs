# Vance Benchmark - ollama-gpt-oss-20b-VoiceStyleBenchmark-20260912-201829

- **Started:** 2026-09-12T20:18:29.690957Z
- **Judge:** glm-5.3-nvfp4
- **Knobs:** {chatTimeoutS=480, waitBudgetMinS=240}
- **Score model:** v2-graded
- **Total tests:** 13
- **Passed:** 11 / 13 (85%)
- **Average score:** 0.907
- **Total LLM time:** 207.3s
- **Total tokens (in / out):** 1.36M / 9.8k (36 round-trips)


## voice-style

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `voiceAcronymExpansion` | OK | 1.00 | 2.2s | 37.5k | 144 | 1 | K8s expanded to Kubernetes in speakable text — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | K8s expanded to Kubernetes in speakable text |

</details>

| `voiceFenceForCodePath` | OK | 1.00 | 13.1s | 154.1k | 403 | 4 | no long path/URL leaked into inline-code (voice-safe) — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | no long path/URL leaked into inline-code (voice-safe) |

</details>

| `voiceFenceForLongList` | FAIL | 0.50 | 22.4s | 113.8k | 1.5k | 3 | neither fence nor pipe-table found — long list must sit in structure the TTS stripper skips. content head: Hier eine komplette Liste von zehn typischen Restaurants in Berlin-Mitte, jeweils mit Fokus auf den jeweiligen Stadtteil:  1. **Zur letzten Instanz** – Mitte (historisches Restaurant, seit 1621, klassische deutsche Küche) 2. **Restaurant Ti… — 50% — 2/3 checks · missed: voice-discipline |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 0.00 | 2.00 | neither fence nor pipe-table found — long list must sit in structure the TTS stripper skips. content head: Hier eine komplette Liste von zehn typischen Restaurants in Berlin-Mitte, jeweils mit Fokus auf den jeweiligen Stadtteil:  1. **Zur letzten Instanz** – Mitte (historisches Restaurant, seit 1621, klassische deutsche Küche) 2. **Restaurant Ti… |

</details>

| `voiceFenceForTable` | OK | 1.00 | 21.6s | 114.3k | 1.5k | 3 | comparison routed into pipe-table — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | comparison routed into pipe-table |

</details>

| `voiceFenceNotMisused` | OK | 1.00 | 1.4s | 37.5k | 79 | 1 | fence-not-misused (Paris in speakable); judge: Paris is named directly as the entire spoken reply with no filler or code fence, which is a natural short voice answer. — 100% — 4/4 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | fence-not-misused (Paris in speakable) |
| `style` | judged | 3.00 | 3.00 | Paris is named directly as the entire spoken reply with no filler or code fence, which is a natural short voice answer. |

</details>

| `voiceModeOffMidConversation` | OK | 1.00 | 55.5s | 150.7k | 2.1k | 4 | voice-mode toggle respected mid-conversation: voice=1 sentences vs text=23 with markdown structure — 100% — 5/5 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-1-voice` | stage | 1.00 | 1.00 |  |
| `reply-1` | stage | 1.00 | 1.00 | 1 sentences |
| `turn-2-text` | stage | 1.00 | 1.00 |  |
| `reply-2` | stage | 1.00 | 1.00 | 23 sentences |
| `toggle-took-effect` | stage | 2.00 | 2.00 | markdown structure returned |

</details>

| `voiceNumbersSpeakable` | OK | 1.00 | 4.7s | 75.1k | 285 | 2 | no ISO date leaked into speakable text (numbers TTS-safe) — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | no ISO date leaked into speakable text (numbers TTS-safe) |

</details>

| `voiceQuestionEndsOpenly` | OK | 1.00 | 5.4s | 75.1k | 355 | 2 | last sentence closes the turn cleanly (question, invitation, or clear recommendation) — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | last sentence closes the turn cleanly (question, invitation, or clear recommendation) |

</details>

| `voiceShortBulletsAllowedInline` | OK | 1.00 | 6.0s | 113.0k | 360 | 3 | voice short-bullets (3 bullets); judge: Bullets use the natural spoken ordinal pattern (Erstens/Zweitens/Drittens) and cover three correct, on-topic bug-report essentials. — 100% — 4/4 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | voice short-bullets (3 bullets) |
| `style` | judged | 3.00 | 3.00 | Bullets use the natural spoken ordinal pattern (Erstens/Zweitens/Drittens) and cover three correct, on-topic bug-report essentials. |

</details>

| `voiceShortProseReply` | FAIL | 0.29 | 14.2s | 113.6k | 904 | 3 | voice reply had 15 prose sentences (≤4 allowed); speakable head: In Lissabon gibt es einige besonders bekannte Sehenswürdigkeiten:  Erstens: Alfama – das älteste Viertel mit engen Gassen, Fado‑Lokal und dem São Jorge‑Schloss.; Zweitens: Belém – hier findest du das … — 29% — 2/4 checks · missed: voice-discipline, style(skipped) |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 0.00 | 2.00 | voice reply had 15 prose sentences (≤4 allowed); speakable head: In Lissabon gibt es einige besonders bekannte Sehenswürdigkeiten:  Erstens: Alfama – das älteste Viertel mit engen Gassen, Fado‑Lokal und dem São Jorge‑Schloss.; Zweitens: Belém – hier findest du das … |
| `style` | judged | skipped | 3.00 | chain stopped earlier |

</details>

| `voiceSpokenPartNoMarkdownLeak` | OK | 1.00 | 38.7s | 113.4k | 878 | 3 | speakable text has no markdown markers (515 chars) — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | speakable text has no markdown markers (515 chars) |

</details>

| `voiceSttToleranceCutWord` | OK | 1.00 | 8.8s | 150.8k | 484 | 4 | STT cut-off word tolerated, reply references München — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | STT cut-off word tolerated, reply references München |

</details>

| `voiceSttToleranceHomophone` | OK | 1.00 | 13.5s | 113.4k | 836 | 3 | STT homophone tolerated, reply references Lissabon — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | STT homophone tolerated, reply references Lissabon |

</details>

