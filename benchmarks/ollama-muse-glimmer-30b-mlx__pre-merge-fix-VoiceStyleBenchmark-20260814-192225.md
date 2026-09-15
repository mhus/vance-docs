# Vance Benchmark - ollama-muse-glimmer-30b-mlx__pre-merge-fix-VoiceStyleBenchmark-20260814-192225

- **Started:** 2026-08-14T19:22:25.954274Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 13
- **Passed:** 7 / 13 (54%)
- **Average score:** 0.577
- **Total LLM time:** 1143.3s
- **Total tokens (in / out):** 2.67M / 7.6k (27 round-trips)


## voice-style

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `voiceAcronymExpansion` | OK | 1.00 | 25.6s | 122.0k | 214 | 1 | K8s expanded to Kubernetes in speakable text |
| `voiceFenceForCodePath` | FAIL | 0.00 | 78.0s | 122.0k | 262 | 1 | long path/URL `https://github.com/spring-projects/spring-petclinic.git` left in inline-backticks — TTS would either spell it or read with noise. Belongs in a fence in voice mode. |
| `voiceFenceForLongList` | FAIL | 0.00 | 87.2s | 306.7k | 966 | 7 | no new ASSISTANT chat-message appeared within 120s |
| `voiceFenceForTable` | FAIL | 0.00 | 176.3s | 152.6k | 1.0k | 2 | no new ASSISTANT chat-message appeared within 120s |
| `voiceFenceNotMisused` | OK | 1.00 | 6.4s | 122.0k | 131 | 1 | fence-not-misused (Paris in speakable); judge: The candidate directly and concisely names the capital. |
| `voiceModeOffMidConversation` | OK | 1.00 | 360.7s | 365.7k | 964 | 3 | voice-mode toggle respected mid-conversation: voice=1 sentences vs text=19 with markdown structure |
| `voiceNumbersSpeakable` | OK | 1.00 | 16.9s | 122.0k | 361 | 1 | no ISO date leaked into speakable text (numbers TTS-safe) |
| `voiceQuestionEndsOpenly` | OK | 1.00 | 22.3s | 122.0k | 500 | 1 | last sentence closes the turn cleanly (question, invitation, or clear recommendation) |
| `voiceShortBulletsAllowedInline` | FAIL | 0.50 | 28.7s | 122.0k | 236 | 1 | voice short-bullets (3 bullets); judge: The enumeration 'Eins, Zwei, Drei' is stilted for spoken German. |
| `voiceShortProseReply` | FAIL | 0.00 | 24.4s | 122.0k | 529 | 1 | voice reply had 10 prose sentences (≤4 allowed); speakable head: Die wichtigsten Sehenswürdigkeiten in Lissabon im Überblick:  Erstens: Castelo de São Jorge – mittelalterliche Burg mit Panoramablick über die Altstadt und den Tejo.; Zweitens: Alfama – ältestes Viert… |
| `voiceSpokenPartNoMarkdownLeak` | OK | 1.00 | 265.6s | 747.5k | 1.5k | 6 | speakable text has no markdown markers (1333 chars) |
| `voiceSttToleranceCutWord` | FAIL | 0.00 | 22.4s | 122.0k | 307 | 1 | no new ASSISTANT chat-message appeared within 120s |
| `voiceSttToleranceHomophone` | OK | 1.00 | 28.7s | 122.0k | 622 | 1 | STT homophone tolerated, reply references Lissabon |
