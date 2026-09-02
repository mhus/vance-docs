# Vance Benchmark - ollama-gemma4-31b-mlx-VoiceStyleBenchmark-20260814-150344

- **Started:** 2026-08-14T15:03:44.668761Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 13
- **Passed:** 7 / 13 (54%)
- **Average score:** 0.577
- **Total LLM time:** 1062.7s
- **Total tokens (in / out):** 2.12M / 4.4k (43 round-trips)


## voice-style

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `voiceAcronymExpansion` | OK | 1.00 | 72.7s | 148.3k | 592 | 3 | K8s expanded to Kubernetes in speakable text |
| `voiceFenceForCodePath` | FAIL | 0.00 | 135.1s | 196.7k | 173 | 4 | long path/URL `git clone https://github.com/spring-projects/spring-petclinic.git` left in inline-backticks — TTS would either spell it or read with noise. Belongs in a fence in voice mode. |
| `voiceFenceForLongList` | FAIL | 0.00 | 12.7s | 147.4k | 135 | 3 | no triple-backtick fence found — long list should sit inside a fence so TTS skips it. content head: Sorry — internal: tried to delegate without a prompt. Reason was: The user wants a list of 10 typical restaurants in Berlin-Mitte. Since direct web search failed (no provider), I will delegate this to a generalist worker who can use their i… |
| `voiceFenceForTable` | FAIL | 0.00 | 132.8s | 197.1k | 184 | 4 | neither pipe-table nor fence found — comparison should sit in a structure the stripper reduces to a hint. content head: Sorry — internal: tried to delegate without a prompt. Reason was: Research tools are failing due to missing provider instances; delegating to a worker with internal knowledge/capabilities to synthesize the comparison. |
| `voiceFenceNotMisused` | OK | 1.00 | 126.7s | 98.3k | 79 | 2 | fence-not-misused (Paris in speakable); judge: The candidate provides the correct answer as a single, direct word. |
| `voiceModeOffMidConversation` | OK | 1.00 | 179.6s | 196.1k | 1.1k | 4 | voice-mode toggle respected mid-conversation: voice=1 sentences vs text=15 with markdown structure |
| `voiceNumbersSpeakable` | OK | 1.00 | 15.8s | 98.4k | 179 | 2 | no ISO date leaked into speakable text (numbers TTS-safe) |
| `voiceQuestionEndsOpenly` | OK | 1.00 | 34.3s | 147.5k | 420 | 3 | last sentence closes the turn cleanly (question, invitation, or clear recommendation) |
| `voiceShortBulletsAllowedInline` | FAIL | 0.50 | 147.7s | 98.5k | 380 | 2 | voice short-bullets (3 bullets); judge: The enumeration 'Eins, Zwei, Drei' is stilted in spoken German. |
| `voiceShortProseReply` | FAIL | 0.00 | 9.7s | 147.4k | 94 | 3 | voice short prose (2 sentences); judge: The candidate is an internal error message and completely off-topic. |
| `voiceSpokenPartNoMarkdownLeak` | OK | 1.00 | 159.9s | 251.9k | 673 | 5 | speakable text has no markdown markers (713 chars) |
| `voiceSttToleranceCutWord` | FAIL | 0.00 | 10.3s | 147.3k | 106 | 3 | STT cut-off 'münch' should be tolerated as München — reply neither names the full city nor asks for clarification. stripped head: Sorry — internal: tried to delegate without a prompt. Reason was: The user asked for the weather in Munich. I tried research_search, but no web provider is configured in this project. I'll use a generalist worker to find the answer. |
| `voiceSttToleranceHomophone` | OK | 1.00 | 25.5s | 246.1k | 288 | 5 | STT homophone tolerated, reply references Lissabon |
