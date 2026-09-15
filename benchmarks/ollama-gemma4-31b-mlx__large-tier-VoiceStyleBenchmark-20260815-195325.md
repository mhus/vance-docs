# Vance Benchmark - ollama-gemma4-31b-mlx__large-tier-VoiceStyleBenchmark-20260815-195325

- **Started:** 2026-08-15T19:53:25.923400Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 13
- **Passed:** 6 / 13 (46%)
- **Average score:** 0.500
- **Total LLM time:** 1899.5s
- **Total tokens (in / out):** 2.48M / 6.9k (61 round-trips)


## voice-style

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `voiceAcronymExpansion` | OK | 1.00 | 87.9s | 148.7k | 798 | 3 | K8s expanded to Kubernetes in speakable text |
| `voiceFenceForCodePath` | FAIL | 0.00 | 324.8s | 246.4k | 196 | 5 | long path/URL `git clone https://github.com/spring-projects/spring-petclinic.git` left in inline-backticks — TTS would either spell it or read with noise. Belongs in a fence in voice mode. |
| `voiceFenceForLongList` | FAIL | 0.00 | 76.5s | 252.8k | 816 | 9 | no new ASSISTANT chat-message appeared within 120s |
| `voiceFenceForTable` | FAIL | 0.00 | 228.1s | 342.0k | 1.1k | 10 | no new ASSISTANT chat-message appeared within 120s |
| `voiceFenceNotMisused` | OK | 1.00 | 33.4s | 98.4k | 84 | 2 | fence-not-misused (Paris in speakable); judge: The answer is direct and concise, which is natural for a voice reply. |
| `voiceModeOffMidConversation` | OK | 1.00 | 231.8s | 196.9k | 1.7k | 4 | voice-mode toggle respected mid-conversation: voice=1 sentences vs text=12 with markdown structure |
| `voiceNumbersSpeakable` | OK | 1.00 | 184.9s | 98.5k | 195 | 2 | no ISO date leaked into speakable text (numbers TTS-safe) |
| `voiceQuestionEndsOpenly` | FAIL | 0.00 | 10.2s | 147.6k | 101 | 3 | voice reply ends without a clear turn signal (no question, open invitation, or decisive recommendation) — user is left guessing whether the model is done. tail: Reason was: User wants a recommendation between Lisbon and Porto; this requires multi-source synthesis and comparison, which is best handled by a research worke… |
| `voiceShortBulletsAllowedInline` | FAIL | 0.50 | 152.9s | 98.6k | 376 | 2 | voice short-bullets (3 bullets); judge: The bullet enumeration is stilted and not idiomatic German. |
| `voiceShortProseReply` | FAIL | 0.00 | 55.7s | 203.2k | 464 | 8 | no new ASSISTANT chat-message appeared within 120s |
| `voiceSpokenPartNoMarkdownLeak` | OK | 1.00 | 146.4s | 252.2k | 646 | 5 | speakable text has no markdown markers (653 chars) |
| `voiceSttToleranceCutWord` | FAIL | 0.00 | 192.1s | 147.5k | 125 | 3 | STT cut-off 'münch' should be tolerated as München — reply neither names the full city nor asks for clarification. stripped head: Ich kann leider momentan keine Live-Wetterdaten abrufen, da mir der Zugriff auf eine entsprechende Wetter-Quelle fehlt. |
| `voiceSttToleranceHomophone` | OK | 1.00 | 174.7s | 246.3k | 303 | 5 | STT homophone tolerated, reply references Lissabon |
