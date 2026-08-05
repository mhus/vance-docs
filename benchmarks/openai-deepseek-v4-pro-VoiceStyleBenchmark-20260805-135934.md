# Vance Benchmark - openai-deepseek-v4-pro-VoiceStyleBenchmark-20260805-135934

- **Started:** 2026-08-05T13:59:34.273323Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 13
- **Passed:** 9 / 13 (69%)
- **Average score:** 0.692
- **Total LLM time:** 469.7s
- **Total tokens (in / out):** 694.0k / 6.8k (31 round-trips)


## voice-style

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `voiceAcronymExpansion` | OK | 1.00 | 4.2s | 24.8k | 222 | 1 | K8s expanded to Kubernetes in speakable text |
| `voiceFenceForCodePath` | FAIL | 0.00 | 9.2s | 49.9k | 209 | 2 | long path/URL `spring-projects/spring-petclinic` left in inline-backticks — TTS would either spell it or read with noise. Belongs in a fence in voice mode. |
| `voiceFenceForLongList` | FAIL | 0.00 | - | - | - | - | HttpTimeoutException: request timed out |
| `voiceFenceForTable` | FAIL | 0.00 | 110.3s | 78.8k | 2.2k | 7 | no new ASSISTANT chat-message appeared within 120s |
| `voiceFenceNotMisused` | OK | 1.00 | 2.0s | 24.8k | 68 | 1 | fence-not-misused (Paris in speakable); judge: The candidate directly and concisely names the capital. |
| `voiceModeOffMidConversation` | OK | 1.00 | 68.1s | 74.5k | 936 | 3 | voice-mode toggle respected mid-conversation: voice=1 sentences vs text=8 with markdown structure |
| `voiceNumbersSpeakable` | OK | 1.00 | 46.7s | 49.7k | 156 | 2 | no ISO date leaked into speakable text (numbers TTS-safe) |
| `voiceQuestionEndsOpenly` | OK | 1.00 | 26.3s | 52.2k | 458 | 2 | last sentence closes the turn cleanly (question, invitation, or clear recommendation) |
| `voiceShortBulletsAllowedInline` | OK | 1.00 | 4.8s | 24.8k | 203 | 1 | voice short-bullets (3 bullets); judge: The candidate provides an on-topic list that reads naturally in spoken German. |
| `voiceShortProseReply` | FAIL | 0.00 | 67.0s | 50.2k | 473 | 2 | voice reply had 10 prose sentences (≤4 allowed); speakable head: Die wichtigsten Sehenswürdigkeiten Lissabons:  Erstens: Alfama – der älteste Stadtteil mit verwinkelten Gassen, Fado-Bars und fantastischen Ausblicken.; Zweitens: Castelo de São Jorge – die maurische … |
| `voiceSpokenPartNoMarkdownLeak` | OK | 1.00 | 58.7s | 162.3k | 986 | 6 | speakable text has no markdown markers (1089 chars) |
| `voiceSttToleranceCutWord` | OK | 1.00 | 58.8s | 49.9k | 206 | 2 | STT cut-off word tolerated, reply references München |
| `voiceSttToleranceHomophone` | OK | 1.00 | 13.6s | 52.1k | 732 | 2 | STT homophone tolerated, reply references Lissabon |
