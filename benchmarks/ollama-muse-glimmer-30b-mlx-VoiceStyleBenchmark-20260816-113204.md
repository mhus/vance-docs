# Vance Benchmark - ollama-muse-glimmer-30b-mlx-VoiceStyleBenchmark-20260816-113204

- **Started:** 2026-08-16T11:32:04.530544Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 13
- **Passed:** 7 / 13 (54%)
- **Average score:** 0.577
- **Total LLM time:** 1651.2s
- **Total tokens (in / out):** 1.55M / 9.6k (55 round-trips)


## voice-style

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `voiceAcronymExpansion` | OK | 1.00 | 21.1s | 40.1k | 243 | 1 | K8s expanded to Kubernetes in speakable text |
| `voiceFenceForCodePath` | OK | 1.00 | 78.9s | 40.1k | 264 | 1 | no long path/URL leaked into inline-code (voice-safe) |
| `voiceFenceForLongList` | FAIL | 0.00 | 155.8s | 83.8k | 851 | 5 | no new ASSISTANT chat-message appeared within 120s |
| `voiceFenceForTable` | FAIL | 0.00 | 84.9s | 50.9k | 454 | 2 | no new ASSISTANT chat-message appeared within 120s |
| `voiceFenceNotMisused` | OK | 1.00 | 56.4s | 40.1k | 151 | 1 | fence-not-misused (Paris in speakable); judge: The candidate directly and concisely answers the question. |
| `voiceModeOffMidConversation` | OK | 1.00 | 585.5s | 203.3k | 883 | 5 | voice-mode toggle respected mid-conversation: voice=1 sentences vs text=13 with markdown structure |
| `voiceNumbersSpeakable` | OK | 1.00 | 38.7s | 40.1k | 526 | 1 | no ISO date leaked into speakable text (numbers TTS-safe) |
| `voiceQuestionEndsOpenly` | FAIL | 0.00 | 83.6s | 157.7k | 1.6k | 9 | no new ASSISTANT chat-message appeared within 120s |
| `voiceShortBulletsAllowedInline` | FAIL | 0.50 | 46.3s | 40.1k | 281 | 1 | voice short-bullets (3 bullets); judge: The enumeration uses 'Eins, Zwei, Drei' instead of the more natural 'Erstens, zweitens, drittens'. |
| `voiceShortProseReply` | FAIL | 0.00 | 132.1s | 144.2k | 1.3k | 10 | no new ASSISTANT chat-message appeared within 120s |
| `voiceSpokenPartNoMarkdownLeak` | OK | 1.00 | 228.1s | 565.3k | 1.8k | 12 | speakable text has no markdown markers (1122 chars) |
| `voiceSttToleranceCutWord` | FAIL | 0.00 | 96.3s | 106.3k | 774 | 6 | no new ASSISTANT chat-message appeared within 120s |
| `voiceSttToleranceHomophone` | OK | 1.00 | 43.5s | 40.1k | 487 | 1 | STT homophone tolerated, reply references Lissabon |
