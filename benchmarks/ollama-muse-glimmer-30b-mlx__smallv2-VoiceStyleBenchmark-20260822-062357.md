# Vance Benchmark - ollama-muse-glimmer-30b-mlx__smallv2-VoiceStyleBenchmark-20260822-062357

- **Started:** 2026-08-22T06:23:57.458122Z
- **Judge:** gemini-gemini-2.5-pro
- **Knobs:** {chatTimeoutS=600, waitBudgetMinS=300}
- **Score model:** v2-graded
- **Total tests:** 13
- **Passed:** 7 / 13 (54%)
- **Average score:** 0.698
- **Total LLM time:** 1683.1s
- **Total tokens (in / out):** 2.78M / 14.5k (89 round-trips)


## voice-style

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `voiceAcronymExpansion` | OK | 1.00 | 20.3s | 41.0k | 225 | 1 | K8s expanded to Kubernetes in speakable text — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | K8s expanded to Kubernetes in speakable text |

</details>

| `voiceFenceForCodePath` | OK | 1.00 | 101.3s | 41.0k | 321 | 1 | no long path/URL leaked into inline-code (voice-safe) — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | no long path/URL leaked into inline-code (voice-safe) |

</details>

| `voiceFenceForLongList` | FAIL | 0.25 | 230.5s | 232.1k | 2.5k | 16 | no new ASSISTANT chat-message appeared within 300s — 25% — 1/3 checks · missed: assistant-reply, voice-discipline(skipped) |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 0.00 | 1.00 | no new ASSISTANT chat-message appeared within 300s |
| `voice-discipline` | stage | skipped | 2.00 | chain stopped earlier |

</details>

| `voiceFenceForTable` | FAIL | 0.25 | 282.7s | 888.8k | 2.8k | 24 | no new ASSISTANT chat-message appeared within 300s — 25% — 1/3 checks · missed: assistant-reply, voice-discipline(skipped) |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 0.00 | 1.00 | no new ASSISTANT chat-message appeared within 300s |
| `voice-discipline` | stage | skipped | 2.00 | chain stopped earlier |

</details>

| `voiceFenceNotMisused` | OK | 1.00 | 5.8s | 41.0k | 172 | 1 | fence-not-misused (Paris in speakable); judge: The answer is stated directly and concisely. — 100% — 4/4 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | fence-not-misused (Paris in speakable) |
| `style` | judged | 3.00 | 3.00 | The answer is stated directly and concisely. |

</details>

| `voiceModeOffMidConversation` | FAIL | 0.00 | - | - | - | - | HttpTimeoutException: request timed out |
| `voiceNumbersSpeakable` | OK | 1.00 | 14.5s | 41.0k | 478 | 1 | no ISO date leaked into speakable text (numbers TTS-safe) — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | no ISO date leaked into speakable text (numbers TTS-safe) |

</details>

| `voiceQuestionEndsOpenly` | FAIL | 0.50 | 228.2s | 323.9k | 2.5k | 13 | voice reply ends without a clear turn signal (no question, open invitation, or decisive recommendation) — user is left guessing whether the model is done. tail: [source: https://en.wikipedia.org/wiki/Porto]  Wenn du magst, plane ich dir einen 3-Tage-Ablauf für die Stadt, die dir besser passt. — 50% — 2/3 checks · missed: voice-discipline |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 0.00 | 2.00 | voice reply ends without a clear turn signal (no question, open invitation, or decisive recommendation) — user is left guessing whether the model is done. tail: [source: https://en.wikipedia.org/wiki/Porto]  Wenn du magst, plane ich dir einen 3-Tage-Ablauf für die Stadt, die dir besser passt. |

</details>

| `voiceShortBulletsAllowedInline` | FAIL | 0.79 | 219.1s | 106.8k | 378 | 2 | voice short-bullets (3 bullets); judge: The enumeration 'Eins, Zwei, Drei' is stilted and not the requested natural spoken form. — 79% — 3/4 checks · missed: style |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | voice short-bullets (3 bullets) |
| `style` | judged | 1.50 | 3.00 | The enumeration 'Eins, Zwei, Drei' is stilted and not the requested natural spoken form. |

</details>

| `voiceShortProseReply` | FAIL | 0.29 | 134.4s | 190.8k | 2.3k | 11 | voice reply had 7 prose sentences (≤4 allowed); speakable head: Hier ist eine kurze deutschsprachige Übersicht der wichtigsten Sehenswürdigkeiten Lissabons:  Erstens: São Jorge Castle / Castelo de São Jorge – Mittelalterliche Festung auf einem Hügel über der Altst… — 29% — 2/4 checks · missed: voice-discipline, style(skipped) |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 0.00 | 2.00 | voice reply had 7 prose sentences (≤4 allowed); speakable head: Hier ist eine kurze deutschsprachige Übersicht der wichtigsten Sehenswürdigkeiten Lissabons:  Erstens: São Jorge Castle / Castelo de São Jorge – Mittelalterliche Festung auf einem Hügel über der Altst… |
| `style` | judged | skipped | 3.00 | chain stopped earlier |

</details>

| `voiceSpokenPartNoMarkdownLeak` | OK | 1.00 | 235.5s | 631.4k | 1.7k | 13 | speakable text has no markdown markers (1127 chars) — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | speakable text has no markdown markers (1127 chars) |

</details>

| `voiceSttToleranceCutWord` | OK | 1.00 | 185.2s | 164.7k | 465 | 4 | STT cut-off word tolerated, reply references München — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | STT cut-off word tolerated, reply references München |

</details>

| `voiceSttToleranceHomophone` | OK | 1.00 | 25.5s | 82.1k | 786 | 2 | STT homophone tolerated, reply references Lissabon — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | STT homophone tolerated, reply references Lissabon |

</details>

