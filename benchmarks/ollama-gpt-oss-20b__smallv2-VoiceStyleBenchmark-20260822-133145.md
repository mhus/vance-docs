# Vance Benchmark - ollama-gpt-oss-20b__smallv2-VoiceStyleBenchmark-20260822-133145

- **Started:** 2026-08-22T13:31:45.439785Z
- **Judge:** gemini-gemini-2.5-pro
- **Knobs:** {chatTimeoutS=600, waitBudgetMinS=300}
- **Score model:** v2-graded
- **Total tests:** 13
- **Passed:** 10 / 13 (77%)
- **Average score:** 0.890
- **Total LLM time:** 232.6s
- **Total tokens (in / out):** 1.18M / 8.2k (34 round-trips)


## voice-style

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `voiceAcronymExpansion` | OK | 1.00 | 2.0s | 34.0k | 136 | 1 | K8s expanded to Kubernetes in speakable text — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | K8s expanded to Kubernetes in speakable text |

</details>

| `voiceFenceForCodePath` | OK | 1.00 | 2.3s | 34.0k | 148 | 1 | no long path/URL leaked into inline-code (voice-safe) — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | no long path/URL leaked into inline-code (voice-safe) |

</details>

| `voiceFenceForLongList` | FAIL | 0.50 | 40.6s | 174.1k | 1.2k | 5 | no triple-backtick fence found — long list should sit inside a fence so TTS skips it. content head: Hier eine komplette Liste von zehn typischen Restaurants in Berlin‑Mitte (Stadtteil‑Schwerpunkt):  1. **Zur letzten Instanz** – Mitte (Alt‑Berlin) 2. **Restaurant Tim Raue** – Mitte 3. **Café Einstein Stammhaus** – Charlottenburg‑West (Mitt… — 50% — 2/3 checks · missed: voice-discipline |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 0.00 | 2.00 | no triple-backtick fence found — long list should sit inside a fence so TTS skips it. content head: Hier eine komplette Liste von zehn typischen Restaurants in Berlin‑Mitte (Stadtteil‑Schwerpunkt):  1. **Zur letzten Instanz** – Mitte (Alt‑Berlin) 2. **Restaurant Tim Raue** – Mitte 3. **Café Einstein Stammhaus** – Charlottenburg‑West (Mitt… |

</details>

| `voiceFenceForTable` | OK | 1.00 | 24.3s | 103.6k | 1.6k | 3 | comparison routed into pipe-table — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | comparison routed into pipe-table |

</details>

| `voiceFenceNotMisused` | OK | 1.00 | 1.3s | 34.0k | 77 | 1 | fence-not-misused (Paris in speakable); judge: The answer is stated directly and concisely. — 100% — 4/4 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | fence-not-misused (Paris in speakable) |
| `style` | judged | 3.00 | 3.00 | The answer is stated directly and concisely. |

</details>

| `voiceModeOffMidConversation` | OK | 1.00 | 72.4s | 136.3k | 1.6k | 4 | voice-mode toggle respected mid-conversation: voice=1 sentences vs text=16 with markdown structure — 100% — 5/5 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-1-voice` | stage | 1.00 | 1.00 |  |
| `reply-1` | stage | 1.00 | 1.00 | 1 sentences |
| `turn-2-text` | stage | 1.00 | 1.00 |  |
| `reply-2` | stage | 1.00 | 1.00 | 16 sentences |
| `toggle-took-effect` | stage | 2.00 | 2.00 | markdown structure returned |

</details>

| `voiceNumbersSpeakable` | OK | 1.00 | 2.5s | 34.0k | 181 | 1 | no ISO date leaked into speakable text (numbers TTS-safe) — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | no ISO date leaked into speakable text (numbers TTS-safe) |

</details>

| `voiceQuestionEndsOpenly` | OK | 1.00 | 4.8s | 34.0k | 398 | 1 | last sentence closes the turn cleanly (question, invitation, or clear recommendation) — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | last sentence closes the turn cleanly (question, invitation, or clear recommendation) |

</details>

| `voiceShortBulletsAllowedInline` | FAIL | 0.79 | 5.8s | 102.7k | 329 | 3 | voice short-bullets (3 bullets); judge: The enumeration 'Eins, Zwei, Drei' is stilted for spoken delivery. — 79% — 3/4 checks · missed: style |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | voice short-bullets (3 bullets) |
| `style` | judged | 1.50 | 3.00 | The enumeration 'Eins, Zwei, Drei' is stilted for spoken delivery. |

</details>

| `voiceShortProseReply` | FAIL | 0.29 | 7.0s | 68.4k | 523 | 2 | voice reply had 9 prose sentences (≤4 allowed); speakable head: In Lissabon gibt es viele Highlights – hier sind die wichtigsten: 1. Belém-Turm (Torre de Belém) – barocker Palast mit Fresken; 2. Jerónimos-Kloster – UNESCO‑Weltkulturerbe, gotische Architektur; 3. A… — 29% — 2/4 checks · missed: voice-discipline, style(skipped) |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 0.00 | 2.00 | voice reply had 9 prose sentences (≤4 allowed); speakable head: In Lissabon gibt es viele Highlights – hier sind die wichtigsten: 1. Belém-Turm (Torre de Belém) – barocker Palast mit Fresken; 2. Jerónimos-Kloster – UNESCO‑Weltkulturerbe, gotische Architektur; 3. A… |
| `style` | judged | skipped | 3.00 | chain stopped earlier |

</details>

| `voiceSpokenPartNoMarkdownLeak` | OK | 1.00 | 34.0s | 68.4k | 624 | 2 | speakable text has no markdown markers (902 chars) — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | speakable text has no markdown markers (902 chars) |

</details>

| `voiceSttToleranceCutWord` | OK | 1.00 | 26.8s | 216.4k | 815 | 6 | STT cut-off word tolerated, reply references München — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | STT cut-off word tolerated, reply references München |

</details>

| `voiceSttToleranceHomophone` | OK | 1.00 | 8.9s | 137.0k | 572 | 4 | STT homophone tolerated, reply references Lissabon — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | STT homophone tolerated, reply references Lissabon |

</details>

