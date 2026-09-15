# Vance Benchmark - ollama-qwen3.6-35b__large-tier-VoiceStyleBenchmark-20260815-232242

- **Started:** 2026-08-15T23:22:42.378185Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 13
- **Passed:** 11 / 13 (85%)
- **Average score:** 0.846
- **Total LLM time:** 403.4s
- **Total tokens (in / out):** 3.03M / 8.2k (51 round-trips)


## voice-style

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `voiceAcronymExpansion` | OK | 1.00 | 6.6s | 100.0k | 234 | 2 | K8s expanded to Kubernetes in speakable text |
| `voiceFenceForCodePath` | OK | 1.00 | 5.9s | 100.0k | 121 | 2 | no long path/URL leaked into inline-code (voice-safe) |
| `voiceFenceForLongList` | FAIL | 0.00 | 15.2s | 100.3k | 800 | 2 | no triple-backtick fence found — long list should sit inside a fence so TTS skips it. content head: Die folgenden zehn Restaurants liegen allesamt in Berlin-Mitte und decken die wichtigsten Stadtteile des Bezirks ab (Mitte proper, Prenzlauer Berg, Wedding, Moabit, Friedrichshain). Sie repräsentieren eine Mischung aus Alltagsküchen und bek… |
| `voiceFenceForTable` | OK | 1.00 | 195.7s | 1.42M | 3.2k | 19 | comparison routed into pipe-table |
| `voiceFenceNotMisused` | OK | 1.00 | 5.8s | 150.1k | 128 | 3 | fence-not-misused (Paris in speakable); judge: The answer is direct and concise, which is natural for a voice reply. |
| `voiceModeOffMidConversation` | OK | 1.00 | 64.9s | 199.4k | 960 | 4 | voice-mode toggle respected mid-conversation: voice=1 sentences vs text=9 with markdown structure |
| `voiceNumbersSpeakable` | OK | 1.00 | 5.5s | 99.9k | 131 | 2 | no ISO date leaked into speakable text (numbers TTS-safe) |
| `voiceQuestionEndsOpenly` | OK | 1.00 | 14.2s | 150.8k | 718 | 3 | last sentence closes the turn cleanly (question, invitation, or clear recommendation) |
| `voiceShortBulletsAllowedInline` | OK | 0.50 | 7.7s | 100.0k | 254 | 2 | voice short-bullets (3 bullets); judge: The enumeration 'Eins, Zwei, Drei' is less natural in spoken form than the suggested 'Erstens, zweitens, drittens'. |
| `voiceShortProseReply` | FAIL | 0.50 | 10.0s | 100.1k | 457 | 2 | voice short prose (1 sentences); judge: The response uses a robotic enumeration style that is unnatural for spoken language. |
| `voiceSpokenPartNoMarkdownLeak` | OK | 1.00 | 50.8s | 100.2k | 678 | 2 | speakable text has no markdown markers (1171 chars) |
| `voiceSttToleranceCutWord` | OK | 1.00 | 15.1s | 309.0k | 398 | 6 | STT cut-off word tolerated, reply references München |
| `voiceSttToleranceHomophone` | OK | 1.00 | 5.9s | 100.0k | 172 | 2 | STT homophone tolerated, reply references Lissabon |
