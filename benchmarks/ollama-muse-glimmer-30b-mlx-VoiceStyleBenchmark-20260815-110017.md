# Vance Benchmark - ollama-muse-glimmer-30b-mlx-VoiceStyleBenchmark-20260815-110017

- **Started:** 2026-08-15T11:00:17.903222Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 13
- **Passed:** 9 / 13 (69%)
- **Average score:** 0.769
- **Total LLM time:** 1163.4s
- **Total tokens (in / out):** 1.73M / 9.9k (40 round-trips)


## voice-style

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `voiceAcronymExpansion` | OK | 1.00 | 66.4s | 49.7k | 268 | 1 | K8s expanded to Kubernetes in speakable text |
| `voiceFenceForCodePath` | OK | 1.00 | 82.7s | 49.8k | 232 | 1 | no long path/URL leaked into inline-code (voice-safe) |
| `voiceFenceForLongList` | FAIL | 0.00 | 100.3s | 148.5k | 2.2k | 9 | no new ASSISTANT chat-message appeared within 120s |
| `voiceFenceForTable` | FAIL | 0.00 | 82.0s | 74.0k | 1.2k | 3 | no new ASSISTANT chat-message appeared within 120s |
| `voiceFenceNotMisused` | OK | 1.00 | 5.6s | 49.7k | 142 | 1 | fence-not-misused (Paris in speakable); judge: The candidate directly and concisely answers the question. |
| `voiceModeOffMidConversation` | OK | 1.00 | 234.7s | 99.2k | 690 | 2 | voice-mode toggle respected mid-conversation: voice=1 sentences vs text=6 with markdown structure |
| `voiceNumbersSpeakable` | OK | 1.00 | 17.6s | 49.7k | 453 | 1 | no ISO date leaked into speakable text (numbers TTS-safe) |
| `voiceQuestionEndsOpenly` | OK | 1.00 | 21.9s | 49.7k | 554 | 1 | last sentence closes the turn cleanly (question, invitation, or clear recommendation) |
| `voiceShortBulletsAllowedInline` | FAIL | 0.50 | 51.5s | 49.8k | 262 | 1 | voice short-bullets (3 bullets); judge: The enumeration style is stilted for spoken German. |
| `voiceShortProseReply` | FAIL | 0.50 | 22.6s | 49.7k | 580 | 1 | voice short prose (2 sentences); judge: The repetitive 'Erstens, Zweitens...' list structure sounds robotic. |
| `voiceSpokenPartNoMarkdownLeak` | OK | 1.00 | 318.8s | 863.6k | 2.2k | 15 | speakable text has no markdown markers (1177 chars) |
| `voiceSttToleranceCutWord` | OK | 1.00 | 139.3s | 149.5k | 520 | 3 | STT cut-off word tolerated, reply references München |
| `voiceSttToleranceHomophone` | OK | 1.00 | 19.9s | 49.7k | 519 | 1 | STT homophone tolerated, reply references Lissabon |
