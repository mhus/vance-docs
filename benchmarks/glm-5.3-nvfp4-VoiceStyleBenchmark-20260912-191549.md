# Vance Benchmark - glm-5.3-nvfp4-VoiceStyleBenchmark-20260912-191549

- **Started:** 2026-09-12T19:15:49.179563Z
- **Judge:** glm-5.3-nvfp4
- **Score model:** v2-graded
- **Total tests:** 13
- **Passed:** 13 / 13 (100%)
- **Average score:** 1.000
- **Total LLM time:** 147.9s
- **Total tokens (in / out):** 2.09M / 26.0k (37 round-trips)


## voice-style

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `voiceAcronymExpansion` | OK | 1.00 | 2.4s | 53.2k | 265 | 1 | K8s expanded to Kubernetes in speakable text — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | K8s expanded to Kubernetes in speakable text |

</details>

| `voiceFenceForCodePath` | OK | 1.00 | 4.8s | 160.9k | 940 | 3 | no long path/URL leaked into inline-code (voice-safe) — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | no long path/URL leaked into inline-code (voice-safe) |

</details>

| `voiceFenceForLongList` | OK | 1.00 | 22.5s | 106.8k | 4.5k | 2 | long list routed into fence; speakable kept 0 inline bullets — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | long list routed into fence; speakable kept 0 inline bullets |

</details>

| `voiceFenceForTable` | OK | 1.00 | 12.0s | 107.8k | 2.8k | 2 | comparison routed into pipe-table — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | comparison routed into pipe-table |

</details>

| `voiceFenceNotMisused` | OK | 1.00 | 1.1s | 53.3k | 92 | 1 | fence-not-misused (Paris in speakable); judge: Paris is named directly as a short, natural spoken reply. — 100% — 4/4 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | fence-not-misused (Paris in speakable) |
| `style` | judged | 3.00 | 3.00 | Paris is named directly as a short, natural spoken reply. |

</details>

| `voiceModeOffMidConversation` | OK | 1.00 | 6.3s | 106.1k | 1.1k | 2 | voice-mode toggle respected mid-conversation: voice=1 sentences vs text=10 with markdown structure — 100% — 5/5 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-1-voice` | stage | 1.00 | 1.00 |  |
| `reply-1` | stage | 1.00 | 1.00 | 1 sentences |
| `turn-2-text` | stage | 1.00 | 1.00 |  |
| `reply-2` | stage | 1.00 | 1.00 | 10 sentences |
| `toggle-took-effect` | stage | 2.00 | 2.00 | markdown structure returned |

</details>

| `voiceNumbersSpeakable` | OK | 1.00 | 2.2s | 53.3k | 320 | 1 | no ISO date leaked into speakable text (numbers TTS-safe) — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | no ISO date leaked into speakable text (numbers TTS-safe) |

</details>

| `voiceQuestionEndsOpenly` | OK | 1.00 | 9.6s | 106.6k | 1.4k | 2 | last sentence closes the turn cleanly (question, invitation, or clear recommendation) — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | last sentence closes the turn cleanly (question, invitation, or clear recommendation) |

</details>

| `voiceShortBulletsAllowedInline` | OK | 1.00 | 1.6s | 53.3k | 241 | 1 | voice short-bullets (3 bullets); judge: Three on-topic bug-report essentials introduced with Erstens/Zweitens/Drittens, reading naturally in spoken form. — 100% — 4/4 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | voice short-bullets (3 bullets) |
| `style` | judged | 3.00 | 3.00 | Three on-topic bug-report essentials introduced with Erstens/Zweitens/Drittens, reading naturally in spoken form. |

</details>

| `voiceShortProseReply` | OK | 1.00 | 19.0s | 214.1k | 3.0k | 4 | voice short prose (2 sentences); judge: Short, natural, on-topic sentences about Lisbon sights with a helpful follow-up question and no stock filler phrases. — 100% — 4/4 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | voice short prose (2 sentences) |
| `style` | judged | 3.00 | 3.00 | Short, natural, on-topic sentences about Lisbon sights with a helpful follow-up question and no stock filler phrases. |

</details>

| `voiceSpokenPartNoMarkdownLeak` | OK | 1.00 | 51.9s | 798.9k | 8.6k | 13 | speakable text has no markdown markers (1058 chars) — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | speakable text has no markdown markers (1058 chars) |

</details>

| `voiceSttToleranceCutWord` | OK | 1.00 | 7.4s | 220.5k | 1.2k | 4 | STT cut-off word tolerated, reply references München — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | STT cut-off word tolerated, reply references München |

</details>

| `voiceSttToleranceHomophone` | OK | 1.00 | 7.0s | 53.3k | 1.5k | 1 | STT homophone tolerated, reply references Lissabon — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | STT homophone tolerated, reply references Lissabon |

</details>

