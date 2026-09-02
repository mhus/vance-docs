# Vance Benchmark - ollama-gpt-oss-20b__baseline-VoiceStyleBenchmark-20260823-233607

- **Started:** 2026-08-23T23:36:07.305521Z
- **Judge:** gemini-gemini-2.5-pro
- **Knobs:** {chatTimeoutS=600, waitBudgetMinS=300}
- **Score model:** v2-graded
- **Total tests:** 13
- **Passed:** 10 / 13 (77%)
- **Average score:** 0.890
- **Total LLM time:** 245.3s
- **Total tokens (in / out):** 964.6k / 9.8k (28 round-trips)


## voice-style

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `voiceAcronymExpansion` | OK | 1.00 | 2.2s | 34.2k | 152 | 1 | K8s expanded to Kubernetes in speakable text — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | K8s expanded to Kubernetes in speakable text |

</details>

| `voiceFenceForCodePath` | OK | 1.00 | 2.2s | 34.2k | 140 | 1 | no long path/URL leaked into inline-code (voice-safe) — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | no long path/URL leaked into inline-code (voice-safe) |

</details>

| `voiceFenceForLongList` | FAIL | 0.50 | 46.6s | 104.7k | 1.5k | 3 | no triple-backtick fence found — long list should sit inside a fence so TTS skips it. content head: Hier sind zehn typische Restaurants in Berlin‑Mitte, jeweils mit Hinweis auf den Stadtteil, in dem sie liegen:  \| # \| Restaurant \| Stadtteil \| \|---\|------------\|-----------\| \| 1 \| **Zur letzten Instanz** \| Mitte (Alt‑Mitte) \| 2 \| **Katz Ora… — 50% — 2/3 checks · missed: voice-discipline |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 0.00 | 2.00 | no triple-backtick fence found — long list should sit inside a fence so TTS skips it. content head: Hier sind zehn typische Restaurants in Berlin‑Mitte, jeweils mit Hinweis auf den Stadtteil, in dem sie liegen:  \| # \| Restaurant \| Stadtteil \| \|---\|------------\|-----------\| \| 1 \| **Zur letzten Instanz** \| Mitte (Alt‑Mitte) \| 2 \| **Katz Ora… |

</details>

| `voiceFenceForTable` | OK | 1.00 | 47.4s | 68.7k | 3.2k | 2 | comparison routed into pipe-table — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | comparison routed into pipe-table |

</details>

| `voiceFenceNotMisused` | OK | 1.00 | 1.3s | 34.2k | 72 | 1 | fence-not-misused (Paris in speakable); judge: The answer is stated directly and concisely. — 100% — 4/4 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | fence-not-misused (Paris in speakable) |
| `style` | judged | 3.00 | 3.00 | The answer is stated directly and concisely. |

</details>

| `voiceModeOffMidConversation` | OK | 1.00 | 38.7s | 136.9k | 941 | 4 | voice-mode toggle respected mid-conversation: voice=1 sentences vs text=11 with markdown structure — 100% — 5/5 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-1-voice` | stage | 1.00 | 1.00 |  |
| `reply-1` | stage | 1.00 | 1.00 | 1 sentences |
| `turn-2-text` | stage | 1.00 | 1.00 |  |
| `reply-2` | stage | 1.00 | 1.00 | 11 sentences |
| `toggle-took-effect` | stage | 2.00 | 2.00 | markdown structure returned |

</details>

| `voiceNumbersSpeakable` | OK | 1.00 | 4.6s | 68.6k | 293 | 2 | no ISO date leaked into speakable text (numbers TTS-safe) — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | no ISO date leaked into speakable text (numbers TTS-safe) |

</details>

| `voiceQuestionEndsOpenly` | OK | 1.00 | 3.4s | 34.2k | 249 | 1 | last sentence closes the turn cleanly (question, invitation, or clear recommendation) — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | last sentence closes the turn cleanly (question, invitation, or clear recommendation) |

</details>

| `voiceShortBulletsAllowedInline` | FAIL | 0.79 | 6.7s | 103.4k | 378 | 3 | voice short-bullets (3 bullets); judge: The enumeration 'Eins, Zwei, Drei' is stilted in spoken German. — 79% — 3/4 checks · missed: style |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | voice short-bullets (3 bullets) |
| `style` | judged | 1.50 | 3.00 | The enumeration 'Eins, Zwei, Drei' is stilted in spoken German. |

</details>

| `voiceShortProseReply` | FAIL | 0.29 | 4.9s | 34.2k | 373 | 1 | voice reply had 21 prose sentences (≤4 allowed); speakable head: Die wichtigsten Sehenswürdigkeiten in Lissabon sind: 1. Das Kloster Mosteiro dos Jerónimos in Belém – ein UNESCO‑Weltkulturerbe mit beeindruckender Manuelinik. 2. Der Turm von Belém – ein Symbol der E… — 29% — 2/4 checks · missed: voice-discipline, style(skipped) |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 0.00 | 2.00 | voice reply had 21 prose sentences (≤4 allowed); speakable head: Die wichtigsten Sehenswürdigkeiten in Lissabon sind: 1. Das Kloster Mosteiro dos Jerónimos in Belém – ein UNESCO‑Weltkulturerbe mit beeindruckender Manuelinik. 2. Der Turm von Belém – ein Symbol der E… |
| `style` | judged | skipped | 3.00 | chain stopped earlier |

</details>

| `voiceSpokenPartNoMarkdownLeak` | OK | 1.00 | 40.1s | 103.7k | 1.0k | 3 | speakable text has no markdown markers (582 chars) — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | speakable text has no markdown markers (582 chars) |

</details>

| `voiceSttToleranceCutWord` | OK | 1.00 | 31.9s | 103.9k | 402 | 3 | STT cut-off word tolerated, reply references München — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | STT cut-off word tolerated, reply references München |

</details>

| `voiceSttToleranceHomophone` | OK | 1.00 | 15.4s | 103.7k | 1.1k | 3 | STT homophone tolerated, reply references Lissabon — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | STT homophone tolerated, reply references Lissabon |

</details>

