# Vance Benchmark - ollama-muse-glimmer-30b-mlx__smallv2-VoiceStyleBenchmark-20260822-134546

- **Started:** 2026-08-22T13:45:46.735102Z
- **Judge:** gemini-gemini-2.5-pro
- **Knobs:** {chatTimeoutS=600, waitBudgetMinS=300}
- **Score model:** v2-graded
- **Total tests:** 13
- **Passed:** 8 / 13 (62%)
- **Average score:** 0.734
- **Total LLM time:** 2765.9s
- **Total tokens (in / out):** 1.88M / 8.9k (57 round-trips)


## voice-style

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `voiceAcronymExpansion` | OK | 1.00 | 82.7s | 41.0k | 214 | 1 | K8s expanded to Kubernetes in speakable text — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | K8s expanded to Kubernetes in speakable text |

</details>

| `voiceFenceForCodePath` | OK | 1.00 | 114.5s | 41.0k | 267 | 1 | no long path/URL leaked into inline-code (voice-safe) — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | no long path/URL leaked into inline-code (voice-safe) |

</details>

| `voiceFenceForLongList` | FAIL | 0.25 | 288.5s | 62.8k | 699 | 3 | no new ASSISTANT chat-message appeared within 300s — 25% — 1/3 checks · missed: assistant-reply, voice-discipline(skipped) |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 0.00 | 1.00 | no new ASSISTANT chat-message appeared within 300s |
| `voice-discipline` | stage | skipped | 2.00 | chain stopped earlier |

</details>

| `voiceFenceForTable` | FAIL | 0.25 | 214.9s | 51.9k | 571 | 2 | no new ASSISTANT chat-message appeared within 300s — 25% — 1/3 checks · missed: assistant-reply, voice-discipline(skipped) |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 0.00 | 1.00 | no new ASSISTANT chat-message appeared within 300s |
| `voice-discipline` | stage | skipped | 2.00 | chain stopped earlier |

</details>

| `voiceFenceNotMisused` | OK | 1.00 | 83.8s | 41.0k | 160 | 1 | fence-not-misused (Paris in speakable); judge: The answer is a short, natural, and direct utterance. — 100% — 4/4 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | fence-not-misused (Paris in speakable) |
| `style` | judged | 3.00 | 3.00 | The answer is a short, natural, and direct utterance. |

</details>

| `voiceModeOffMidConversation` | OK | 1.00 | 475.1s | 232.2k | 1.8k | 5 | voice-mode toggle respected mid-conversation: voice=1 sentences vs text=28 with markdown structure — 100% — 5/5 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-1-voice` | stage | 1.00 | 1.00 |  |
| `reply-1` | stage | 1.00 | 1.00 | 1 sentences |
| `turn-2-text` | stage | 1.00 | 1.00 |  |
| `reply-2` | stage | 1.00 | 1.00 | 28 sentences |
| `toggle-took-effect` | stage | 2.00 | 2.00 | markdown structure returned |

</details>

| `voiceNumbersSpeakable` | OK | 1.00 | 114.3s | 41.0k | 485 | 1 | no ISO date leaked into speakable text (numbers TTS-safe) — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | no ISO date leaked into speakable text (numbers TTS-safe) |

</details>

| `voiceQuestionEndsOpenly` | OK | 1.00 | 24.8s | 41.0k | 450 | 1 | last sentence closes the turn cleanly (question, invitation, or clear recommendation) — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | last sentence closes the turn cleanly (question, invitation, or clear recommendation) |

</details>

| `voiceShortBulletsAllowedInline` | FAIL | 0.79 | 139.4s | 41.0k | 250 | 1 | voice short-bullets (3 bullets); judge: The bullet enumeration 'Eins, Zwei, Drei' is stilted and not the natural 'Erstens, zweitens, drittens'. — 79% — 3/4 checks · missed: style |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | voice short-bullets (3 bullets) |
| `style` | judged | 1.50 | 3.00 | The bullet enumeration 'Eins, Zwei, Drei' is stilted and not the natural 'Erstens, zweitens, drittens'. |

</details>

| `voiceShortProseReply` | FAIL | 0.25 | 253.8s | 96.3k | 875 | 6 | no new ASSISTANT chat-message appeared within 300s — 25% — 1/3 checks · missed: assistant-reply, voice-discipline(skipped) |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 0.00 | 1.00 | no new ASSISTANT chat-message appeared within 300s |
| `voice-discipline` | stage | skipped | 2.00 | chain stopped earlier |

</details>

| `voiceSpokenPartNoMarkdownLeak` | OK | 1.00 | 902.9s | 1.15M | 2.6k | 34 | speakable text has no markdown markers (245 chars) — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | speakable text has no markdown markers (245 chars) |

</details>

| `voiceSttToleranceCutWord` | FAIL | 0.00 | - | - | - | - | 0% — 0/1 checks · missed: test-completed |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `test-completed` | stage | 0.00 | 1.00 | HttpTimeoutException: request timed out |

</details>

| `voiceSttToleranceHomophone` | OK | 1.00 | 71.1s | 41.0k | 538 | 1 | STT homophone tolerated, reply references Lissabon — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | STT homophone tolerated, reply references Lissabon |

</details>

