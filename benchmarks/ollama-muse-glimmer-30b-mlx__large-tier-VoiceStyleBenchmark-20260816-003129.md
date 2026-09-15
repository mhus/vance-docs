# Vance Benchmark - ollama-muse-glimmer-30b-mlx__large-tier-VoiceStyleBenchmark-20260816-003129

- **Started:** 2026-08-16T00:31:29.929689Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 13
- **Passed:** 9 / 13 (69%)
- **Average score:** 0.692
- **Total LLM time:** 1106.0s
- **Total tokens (in / out):** 1.66M / 9.5k (41 round-trips)


## voice-style

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `voiceAcronymExpansion` | OK | 1.00 | 10.5s | 49.8k | 248 | 1 | K8s expanded to Kubernetes in speakable text |
| `voiceFenceForCodePath` | FAIL | 0.00 | 48.6s | 49.8k | 309 | 1 | long path/URL `https://github.com/spring-projects/spring-petclinic.git` left in inline-backticks — TTS would either spell it or read with noise. Belongs in a fence in voice mode. |
| `voiceFenceForLongList` | FAIL | 0.00 | 69.4s | 97.5k | 1.4k | 5 | no new ASSISTANT chat-message appeared within 120s |
| `voiceFenceForTable` | FAIL | 0.00 | 112.2s | 195.8k | 1.6k | 10 | no new ASSISTANT chat-message appeared within 120s |
| `voiceFenceNotMisused` | OK | 1.00 | 7.8s | 49.8k | 194 | 1 | fence-not-misused (Paris in speakable); judge: The answer is direct and concise, which is natural for a voice reply. |
| `voiceModeOffMidConversation` | OK | 1.00 | 329.9s | 200.6k | 988 | 4 | voice-mode toggle respected mid-conversation: voice=1 sentences vs text=20 with markdown structure |
| `voiceNumbersSpeakable` | OK | 1.00 | 20.6s | 49.8k | 502 | 1 | no ISO date leaked into speakable text (numbers TTS-safe) |
| `voiceQuestionEndsOpenly` | OK | 1.00 | 21.6s | 49.8k | 581 | 1 | last sentence closes the turn cleanly (question, invitation, or clear recommendation) |
| `voiceShortBulletsAllowedInline` | FAIL | 0.50 | 78.6s | 49.8k | 295 | 1 | voice short-bullets (3 bullets); judge: The enumeration 'Eins, Zwei, Drei' is stilted for spoken delivery compared to the more natural 'Erstens, Zweitens, Drittens'. |
| `voiceShortProseReply` | OK | 0.50 | 19.1s | 49.8k | 460 | 1 | voice short prose (1 sentences); judge: The repetitive enumeration sounds robotic and unnatural for spoken language. |
| `voiceSpokenPartNoMarkdownLeak` | OK | 1.00 | 234.7s | 544.7k | 1.3k | 10 | speakable text has no markdown markers (1219 chars) |
| `voiceSttToleranceCutWord` | OK | 1.00 | 130.7s | 220.1k | 1.1k | 4 | STT cut-off word tolerated, reply references München |
| `voiceSttToleranceHomophone` | OK | 1.00 | 22.3s | 49.8k | 555 | 1 | STT homophone tolerated, reply references Lissabon |
