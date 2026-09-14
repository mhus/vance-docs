# Vance Benchmark - ollama-muse-glimmer-30b-mlx-VoiceStyleBenchmark-20260913-042802

- **Started:** 2026-09-13T04:28:02.592239Z
- **Judge:** glm-5.3-nvfp4
- **Knobs:** {chatTimeoutS=480, waitBudgetMinS=240}
- **Score model:** v2-graded
- **Total tests:** 13
- **Passed:** 10 / 13 (77%)
- **Average score:** 0.849
- **Total LLM time:** 885.4s
- **Total tokens (in / out):** 1.86M / 12.0k (53 round-trips)


## voice-style

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `voiceAcronymExpansion` | OK | 1.00 | 15.8s | 44.7k | 220 | 1 | K8s expanded to Kubernetes in speakable text — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | K8s expanded to Kubernetes in speakable text |

</details>

| `voiceFenceForCodePath` | OK | 1.00 | 9.8s | 44.7k | 273 | 1 | no long path/URL leaked into inline-code (voice-safe) — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | no long path/URL leaked into inline-code (voice-safe) |

</details>

| `voiceFenceForLongList` | FAIL | 0.25 | 143.5s | 244.2k | 2.8k | 13 | no new ASSISTANT chat-message appeared within 240s — 25% — 1/3 checks · missed: assistant-reply, voice-discipline(skipped) |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 0.00 | 1.00 | no new ASSISTANT chat-message appeared within 240s |
| `voice-discipline` | stage | skipped | 2.00 | chain stopped earlier |

</details>

| `voiceFenceForTable` | OK | 1.00 | 98.3s | 44.8k | 653 | 1 | comparison routed into pipe-table — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | comparison routed into pipe-table |

</details>

| `voiceFenceNotMisused` | OK | 1.00 | 5.5s | 44.7k | 136 | 1 | fence-not-misused (Paris in speakable); judge: Paris is named directly as the entire spoken reply with no filler, fully answering the question. — 100% — 4/4 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | fence-not-misused (Paris in speakable) |
| `style` | judged | 3.00 | 3.00 | Paris is named directly as the entire spoken reply with no filler, fully answering the question. |

</details>

| `voiceModeOffMidConversation` | OK | 1.00 | 64.5s | 89.0k | 772 | 2 | voice-mode toggle respected mid-conversation: voice=1 sentences vs text=11 with markdown structure — 100% — 5/5 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-1-voice` | stage | 1.00 | 1.00 |  |
| `reply-1` | stage | 1.00 | 1.00 | 1 sentences |
| `turn-2-text` | stage | 1.00 | 1.00 |  |
| `reply-2` | stage | 1.00 | 1.00 | 11 sentences |
| `toggle-took-effect` | stage | 2.00 | 2.00 | markdown structure returned |

</details>

| `voiceNumbersSpeakable` | OK | 1.00 | 17.5s | 44.7k | 509 | 1 | no ISO date leaked into speakable text (numbers TTS-safe) — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | no ISO date leaked into speakable text (numbers TTS-safe) |

</details>

| `voiceQuestionEndsOpenly` | FAIL | 0.50 | 22.3s | 44.7k | 570 | 1 | voice reply ends without a clear turn signal (no question, open invitation, or decisive recommendation) — user is left guessing whether the model is done. tail: Lissabon – für dich, wenn du willst: Erstens: Erstmal die Klassiker: Alfama, Belém mit Jerónimos und Pastéis de Belém, Castelo de São Jorge, Tram 28; Zweitens: … — 50% — 2/3 checks · missed: voice-discipline |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 0.00 | 2.00 | voice reply ends without a clear turn signal (no question, open invitation, or decisive recommendation) — user is left guessing whether the model is done. tail: Lissabon – für dich, wenn du willst: Erstens: Erstmal die Klassiker: Alfama, Belém mit Jerónimos und Pastéis de Belém, Castelo de São Jorge, Tram 28; Zweitens: … |

</details>

| `voiceShortBulletsAllowedInline` | OK | 1.00 | 9.1s | 44.7k | 254 | 1 | voice short-bullets (3 bullets); judge: On-topic three-bullet bug-report reply that follows the natural Erstens/Zweitens/Drittens spoken pattern with a brief closing summary. — 100% — 4/4 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | voice short-bullets (3 bullets) |
| `style` | judged | 3.00 | 3.00 | On-topic three-bullet bug-report reply that follows the natural Erstens/Zweitens/Drittens spoken pattern with a brief closing summary. |

</details>

| `voiceShortProseReply` | FAIL | 0.29 | 165.8s | 152.5k | 1.8k | 7 | voice reply had 20 prose sentences (≤4 allowed); speakable head: Hier eine kurze, prägnante Top-Liste der wichtigsten Sehenswürdigkeiten in Lissabon:  Erstens: Castelo de São Jorge / São Jorge Castle  Das mittelalterliche Festungsgelände auf dem Hügel über der Alfa… — 29% — 2/4 checks · missed: voice-discipline, style(skipped) |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 0.00 | 2.00 | voice reply had 20 prose sentences (≤4 allowed); speakable head: Hier eine kurze, prägnante Top-Liste der wichtigsten Sehenswürdigkeiten in Lissabon:  Erstens: Castelo de São Jorge / São Jorge Castle  Das mittelalterliche Festungsgelände auf dem Hügel über der Alfa… |
| `style` | judged | skipped | 3.00 | chain stopped earlier |

</details>

| `voiceSpokenPartNoMarkdownLeak` | OK | 1.00 | 186.9s | 794.0k | 2.2k | 15 | speakable text has no markdown markers (1110 chars) — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | speakable text has no markdown markers (1110 chars) |

</details>

| `voiceSttToleranceCutWord` | OK | 1.00 | 125.2s | 222.9k | 1.3k | 8 | STT cut-off word tolerated, reply references München — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | STT cut-off word tolerated, reply references München |

</details>

| `voiceSttToleranceHomophone` | OK | 1.00 | 21.1s | 44.7k | 575 | 1 | STT homophone tolerated, reply references Lissabon — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | STT homophone tolerated, reply references Lissabon |

</details>

