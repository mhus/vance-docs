# Vance Benchmark - ollama-gemma4-31b-mlx-VoiceStyleBenchmark-20260816-074114

- **Started:** 2026-08-16T07:41:14.255879Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 13
- **Passed:** 7 / 13 (54%)
- **Average score:** 0.577
- **Total LLM time:** 1172.2s
- **Total tokens (in / out):** 1.12M / 7.0k (40 round-trips)


## voice-style

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `voiceAcronymExpansion` | OK | 1.00 | 58.4s | 77.9k | 593 | 2 | K8s expanded to Kubernetes in speakable text |
| `voiceFenceForCodePath` | FAIL | 0.00 | 158.2s | 116.9k | 297 | 3 | long path/URL `git clone https://github.com/spring-projects/spring-petclinic.git` left in inline-backticks — TTS would either spell it or read with noise. Belongs in a fence in voice mode. |
| `voiceFenceForLongList` | FAIL | 0.00 | 83.1s | 89.0k | 807 | 6 | no new ASSISTANT chat-message appeared within 120s |
| `voiceFenceForTable` | FAIL | 0.00 | 86.3s | 128.2k | 805 | 7 | no new ASSISTANT chat-message appeared within 120s |
| `voiceFenceNotMisused` | OK | 1.00 | 130.5s | 38.7k | 39 | 1 | fence-not-misused (Paris in speakable); judge: The candidate provides the correct answer as a single, direct word. |
| `voiceModeOffMidConversation` | OK | 1.00 | 193.0s | 155.0k | 1.5k | 4 | voice-mode toggle respected mid-conversation: voice=1 sentences vs text=13 with markdown structure |
| `voiceNumbersSpeakable` | OK | 1.00 | 12.3s | 77.6k | 144 | 2 | no ISO date leaked into speakable text (numbers TTS-safe) |
| `voiceQuestionEndsOpenly` | OK | 1.00 | 46.6s | 77.8k | 634 | 2 | last sentence closes the turn cleanly (question, invitation, or clear recommendation) |
| `voiceShortBulletsAllowedInline` | FAIL | 0.50 | 47.9s | 77.8k | 436 | 2 | voice short-bullets (3 bullets); judge: The enumeration 'Eins, Zwei, Drei' sounds stilted in spoken German. |
| `voiceShortProseReply` | OK | 1.00 | 46.1s | 77.9k | 613 | 2 | voice short prose (2 sentences); judge: The response is natural, on-topic, and free of filler phrases. |
| `voiceSpokenPartNoMarkdownLeak` | OK | 1.00 | 113.7s | 78.0k | 516 | 2 | speakable text has no markdown markers (135 chars) |
| `voiceSttToleranceCutWord` | FAIL | 0.00 | 140.6s | 38.7k | 44 | 1 | STT cut-off 'münch' should be tolerated as München — reply neither names the full city nor asks for clarification. stripped head: Sorry — internal: tried to delegate without a prompt. Reason was: The user is asking for the current weather in Munich. I need to find this information using a web search. |
| `voiceSttToleranceHomophone` | FAIL | 0.00 | 55.3s | 88.7k | 566 | 6 | no new ASSISTANT chat-message appeared within 120s |
