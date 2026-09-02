# Vance Benchmark - ollama-qwen3.6-35b-VoiceStyleBenchmark-20260814-180834

- **Started:** 2026-08-14T18:08:34.001441Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 13
- **Passed:** 10 / 13 (77%)
- **Average score:** 0.808
- **Total LLM time:** 309.7s
- **Total tokens (in / out):** 2.18M / 8.0k (43 round-trips)


## voice-style

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `voiceAcronymExpansion` | OK | 1.00 | 9.5s | 100.0k | 463 | 2 | K8s expanded to Kubernetes in speakable text |
| `voiceFenceForCodePath` | OK | 1.00 | 5.7s | 99.8k | 123 | 2 | no long path/URL leaked into inline-code (voice-safe) |
| `voiceFenceForLongList` | FAIL | 0.00 | 35.0s | 322.8k | 1.1k | 6 | no triple-backtick fence found — long list should sit inside a fence so TTS skips it. content head: 10 typische Restaurants in Berlin-Mitte mit Stadtteil-Schwerpunkt:  1. **Zur Letzten Instanz** (Mitte, Waisenstraße) – Berlins ältestes Restaurant (seit 1621), klassische deutsche Küche 2. **Borchardt** (Mitte, Dorotheenstraße) – renommiert… |
| `voiceFenceForTable` | OK | 1.00 | 25.5s | 151.0k | 1.4k | 3 | comparison routed into pipe-table |
| `voiceFenceNotMisused` | OK | 1.00 | 4.6s | 99.8k | 87 | 2 | fence-not-misused (Paris in speakable); judge: The candidate provides a short, direct answer. |
| `voiceModeOffMidConversation` | OK | 1.00 | 80.5s | 250.3k | 2.1k | 5 | voice-mode toggle respected mid-conversation: voice=1 sentences vs text=16 with markdown structure |
| `voiceNumbersSpeakable` | OK | 1.00 | 6.6s | 150.0k | 193 | 3 | no ISO date leaked into speakable text (numbers TTS-safe) |
| `voiceQuestionEndsOpenly` | OK | 1.00 | 12.5s | 100.1k | 670 | 2 | last sentence closes the turn cleanly (question, invitation, or clear recommendation) |
| `voiceShortBulletsAllowedInline` | FAIL | 0.50 | 7.5s | 99.9k | 243 | 2 | voice short-bullets (3 bullets); judge: The enumeration 'Eins, Zwei, Drei' is stilted for spoken German. |
| `voiceShortProseReply` | FAIL | 0.00 | 8.8s | 99.9k | 395 | 2 | voice reply had 6 prose sentences (≤4 allowed); speakable head: Hier sind die wichtigsten Sehenswürdigkeiten in Lissabon:  Erstens: Alfama: Das älteste Viertel der Stadt mit engen Gassen, Fado-Bars und dem Castelo de São Jorge.; Zweitens: Belém: Bekannt für das Mo… |
| `voiceSpokenPartNoMarkdownLeak` | OK | 1.00 | 46.9s | 100.0k | 483 | 2 | speakable text has no markdown markers (776 chars) |
| `voiceSttToleranceCutWord` | OK | 1.00 | 60.5s | 504.0k | 557 | 10 | STT cut-off word tolerated, reply references München |
| `voiceSttToleranceHomophone` | OK | 1.00 | 6.1s | 99.8k | 191 | 2 | STT homophone tolerated, reply references Lissabon |
