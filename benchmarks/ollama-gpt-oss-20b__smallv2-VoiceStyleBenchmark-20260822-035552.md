# Vance Benchmark - ollama-gpt-oss-20b__smallv2-VoiceStyleBenchmark-20260822-035552

- **Started:** 2026-08-22T03:55:52.583838Z
- **Judge:** gemini-gemini-2.5-pro
- **Knobs:** {chatTimeoutS=600, waitBudgetMinS=300}
- **Score model:** v2-graded
- **Total tests:** 13
- **Passed:** 7 / 13 (54%)
- **Average score:** 0.813
- **Total LLM time:** 258.0s
- **Total tokens (in / out):** 1.99M / 9.5k (46 round-trips)


## voice-style

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `voiceAcronymExpansion` | OK | 1.00 | 1.7s | 34.0k | 111 | 1 | K8s expanded to Kubernetes in speakable text — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | K8s expanded to Kubernetes in speakable text |

</details>

| `voiceFenceForCodePath` | FAIL | 0.50 | 6.9s | 102.5k | 216 | 3 | long path/URL `git clone https://github.com/spring-projects/spring-petclinic.git` left in inline-backticks — TTS would either spell it or read with noise. Belongs in a fence in voice mode. — 50% — 2/3 checks · missed: voice-discipline |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 0.00 | 2.00 | long path/URL `git clone https://github.com/spring-projects/spring-petclinic.git` left in inline-backticks — TTS would either spell it or read with noise. Belongs in a fence in voice mode. |

</details>

| `voiceFenceForLongList` | FAIL | 0.50 | 11.4s | 68.5k | 844 | 2 | no triple-backtick fence found — long list should sit inside a fence so TTS skips it. content head: Hier eine kompakte Liste von zehn typischen Restaurants in Berlin‑Mitte, jeweils mit dem Stadtteil‑Schwerpunkt:  1. **Café Einstein Stammhaus** – Mitte (Friedrichshain‑Strecke) – klassisches Kaffee‑Restaurant mit bayerischer Küche. 2. **Zur… — 50% — 2/3 checks · missed: voice-discipline |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 0.00 | 2.00 | no triple-backtick fence found — long list should sit inside a fence so TTS skips it. content head: Hier eine kompakte Liste von zehn typischen Restaurants in Berlin‑Mitte, jeweils mit dem Stadtteil‑Schwerpunkt:  1. **Café Einstein Stammhaus** – Mitte (Friedrichshain‑Strecke) – klassisches Kaffee‑Restaurant mit bayerischer Küche. 2. **Zur… |

</details>

| `voiceFenceForTable` | FAIL | 0.50 | 110.4s | 1.11M | 2.8k | 20 | neither pipe-table nor fence found — comparison should sit in a structure the stripper reduces to a hint. content head: Ich konnte leider keine ausreichenden, verlässlichen Quellen finden, um alle fünf Achsen für OpenAI, Anthropic und Google mit konkreten Zahlen oder Bewertungen zu füllen. Hier ein Überblick, was ich gefunden habe:  - Für alle drei Anbieter … — 50% — 2/3 checks · missed: voice-discipline |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 0.00 | 2.00 | neither pipe-table nor fence found — comparison should sit in a structure the stripper reduces to a hint. content head: Ich konnte leider keine ausreichenden, verlässlichen Quellen finden, um alle fünf Achsen für OpenAI, Anthropic und Google mit konkreten Zahlen oder Bewertungen zu füllen. Hier ein Überblick, was ich gefunden habe:  - Für alle drei Anbieter … |

</details>

| `voiceFenceNotMisused` | OK | 1.00 | 1.3s | 34.0k | 73 | 1 | fence-not-misused (Paris in speakable); judge: The answer is a short, natural, and direct utterance. — 100% — 4/4 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | fence-not-misused (Paris in speakable) |
| `style` | judged | 3.00 | 3.00 | The answer is a short, natural, and direct utterance. |

</details>

| `voiceModeOffMidConversation` | OK | 1.00 | 57.7s | 136.8k | 2.2k | 4 | voice-mode toggle respected mid-conversation: voice=1 sentences vs text=28 with markdown structure — 100% — 5/5 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-1-voice` | stage | 1.00 | 1.00 |  |
| `reply-1` | stage | 1.00 | 1.00 | 1 sentences |
| `turn-2-text` | stage | 1.00 | 1.00 |  |
| `reply-2` | stage | 1.00 | 1.00 | 28 sentences |
| `toggle-took-effect` | stage | 2.00 | 2.00 | markdown structure returned |

</details>

| `voiceNumbersSpeakable` | OK | 1.00 | 3.3s | 34.0k | 247 | 1 | no ISO date leaked into speakable text (numbers TTS-safe) — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | no ISO date leaked into speakable text (numbers TTS-safe) |

</details>

| `voiceQuestionEndsOpenly` | FAIL | 0.50 | 10.5s | 137.0k | 692 | 4 | voice reply ends without a clear turn signal (no question, open invitation, or decisive recommendation) — user is left guessing whether the model is done. tail: Kurz gesagt:  Erstens: Für Kultur & Architektur, längere Aufenthalte: Lissabon; Zweitens: Für ein kompakteres, gemütliches Erlebnis & Portwein: Porto — 50% — 2/3 checks · missed: voice-discipline |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 0.00 | 2.00 | voice reply ends without a clear turn signal (no question, open invitation, or decisive recommendation) — user is left guessing whether the model is done. tail: Kurz gesagt:  Erstens: Für Kultur & Architektur, längere Aufenthalte: Lissabon; Zweitens: Für ein kompakteres, gemütliches Erlebnis & Portwein: Porto |

</details>

| `voiceShortBulletsAllowedInline` | FAIL | 0.79 | 4.1s | 68.1k | 249 | 2 | voice short-bullets (3 bullets); judge: The enumeration 'Eins, Zwei, Drei' is stilted for spoken delivery. — 79% — 3/4 checks · missed: style |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | voice short-bullets (3 bullets) |
| `style` | judged | 1.50 | 3.00 | The enumeration 'Eins, Zwei, Drei' is stilted for spoken delivery. |

</details>

| `voiceShortProseReply` | FAIL | 0.79 | 4.4s | 34.0k | 350 | 1 | voice short prose (1 sentences); judge: The numbered list format is robotic and unnatural for spoken language. — 79% — 3/4 checks · missed: style |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | voice short prose (1 sentences) |
| `style` | judged | 1.50 | 3.00 | The numbered list format is robotic and unnatural for spoken language. |

</details>

| `voiceSpokenPartNoMarkdownLeak` | OK | 1.00 | 30.5s | 68.3k | 527 | 2 | speakable text has no markdown markers (652 chars) — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | speakable text has no markdown markers (652 chars) |

</details>

| `voiceSttToleranceCutWord` | OK | 1.00 | 6.3s | 68.1k | 468 | 2 | STT cut-off word tolerated, reply references München — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | STT cut-off word tolerated, reply references München |

</details>

| `voiceSttToleranceHomophone` | OK | 1.00 | 9.6s | 102.8k | 653 | 3 | STT homophone tolerated, reply references Lissabon — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | STT homophone tolerated, reply references Lissabon |

</details>

