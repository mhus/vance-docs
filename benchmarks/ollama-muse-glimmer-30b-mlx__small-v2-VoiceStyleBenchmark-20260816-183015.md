# Vance Benchmark - ollama-muse-glimmer-30b-mlx__small-v2-VoiceStyleBenchmark-20260816-183015

- **Started:** 2026-08-16T18:30:15.207181Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 13
- **Passed:** 10 / 13 (77%)
- **Average score:** 0.769
- **Total LLM time:** 1227.2s
- **Total tokens (in / out):** 1.74M / 13.0k (53 round-trips)


## voice-style

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `voiceAcronymExpansion` | OK | 1.00 | 23.0s | 40.4k | 265 | 1 | K8s expanded to Kubernetes in speakable text |
| `voiceFenceForCodePath` | OK | 1.00 | 64.1s | 40.4k | 305 | 1 | no long path/URL leaked into inline-code (voice-safe) |
| `voiceFenceForLongList` | FAIL | 0.00 | 115.6s | 222.5k | 1.9k | 12 | no triple-backtick fence found — long list should sit inside a fence so TTS skips it. content head: Ich habe derzeit keinen Zugriff auf Web- oder Dokumentenquellen in diesem Projekt, deshalb kann ich die Liste nicht aus verifizierten Quellen belegen. Soll ich dir eine allgemein bekannte, typische Auswahl von zehn Restaurants in Berlin-Mit… |
| `voiceFenceForTable` | FAIL | 0.00 | 107.7s | 126.8k | 1.9k | 6 | no new ASSISTANT chat-message appeared within 120s |
| `voiceFenceNotMisused` | OK | 1.00 | 4.0s | 40.4k | 131 | 1 | fence-not-misused (Paris in speakable); judge: The candidate directly and concisely names the capital. |
| `voiceModeOffMidConversation` | OK | 1.00 | 331.3s | 186.5k | 2.7k | 4 | voice-mode toggle respected mid-conversation: voice=1 sentences vs text=23 with markdown structure |
| `voiceNumbersSpeakable` | OK | 1.00 | 72.9s | 40.4k | 608 | 1 | no ISO date leaked into speakable text (numbers TTS-safe) |
| `voiceQuestionEndsOpenly` | OK | 1.00 | 16.5s | 40.4k | 470 | 1 | last sentence closes the turn cleanly (question, invitation, or clear recommendation) |
| `voiceShortBulletsAllowedInline` | OK | 1.00 | 103.6s | 105.2k | 400 | 2 | voice short-bullets (0 bullets); judge: The numbered list is on-topic and reads naturally in spoken German. |
| `voiceShortProseReply` | FAIL | 0.00 | 98.1s | 124.2k | 1.7k | 7 | no new ASSISTANT chat-message appeared within 120s |
| `voiceSpokenPartNoMarkdownLeak` | OK | 1.00 | 218.8s | 552.9k | 1.5k | 12 | speakable text has no markdown markers (1131 chars) |
| `voiceSttToleranceCutWord` | OK | 1.00 | 55.4s | 182.6k | 597 | 4 | STT cut-off word tolerated, reply references München |
| `voiceSttToleranceHomophone` | OK | 1.00 | 16.2s | 40.4k | 481 | 1 | STT homophone tolerated, reply references Lissabon |
