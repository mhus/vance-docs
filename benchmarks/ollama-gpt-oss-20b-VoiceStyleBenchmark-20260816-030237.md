# Vance Benchmark - ollama-gpt-oss-20b-VoiceStyleBenchmark-20260816-030237

- **Started:** 2026-08-16T03:02:37.424223Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 13
- **Passed:** 11 / 13 (85%)
- **Average score:** 0.885
- **Total LLM time:** 208.5s
- **Total tokens (in / out):** 1.03M / 9.5k (31 round-trips)


## voice-style

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `voiceAcronymExpansion` | OK | 1.00 | 2.0s | 33.1k | 142 | 1 | K8s expanded to Kubernetes in speakable text |
| `voiceFenceForCodePath` | OK | 1.00 | 3.3s | 33.2k | 206 | 1 | no long path/URL leaked into inline-code (voice-safe) |
| `voiceFenceForLongList` | FAIL | 0.00 | 28.4s | 100.8k | 2.1k | 3 | no triple-backtick fence found — long list should sit inside a fence so TTS skips it. content head: Hier sind zehn typische Restaurants in Berlin‑Mitte, jeweils mit Hinweis auf den Stadtteil:  1. **Café Einstein Stammhaus** – *Mitte, Tiergarten* 2. **Zur letzten Instanz** – *Mitte, Tiergarten* 3. **Katz & Co.** – *Mitte, Tiergarten* 4. **… |
| `voiceFenceForTable` | OK | 1.00 | 22.4s | 100.7k | 1.5k | 3 | comparison routed into pipe-table |
| `voiceFenceNotMisused` | OK | 1.00 | 1.3s | 33.1k | 72 | 1 | fence-not-misused (Paris in speakable); judge: The candidate provides the correct answer as a single, direct word. |
| `voiceModeOffMidConversation` | OK | 1.00 | 81.2s | 166.9k | 2.3k | 5 | voice-mode toggle respected mid-conversation: voice=1 sentences vs text=19 with markdown structure |
| `voiceNumbersSpeakable` | OK | 1.00 | 9.2s | 100.0k | 617 | 3 | no ISO date leaked into speakable text (numbers TTS-safe) |
| `voiceQuestionEndsOpenly` | OK | 1.00 | 11.8s | 100.4k | 883 | 3 | last sentence closes the turn cleanly (question, invitation, or clear recommendation) |
| `voiceShortBulletsAllowedInline` | OK | 1.00 | 2.2s | 33.1k | 130 | 1 | voice short-bullets (0 bullets); judge: The numbered list reads naturally and the content is on-topic. |
| `voiceShortProseReply` | FAIL | 0.50 | 6.7s | 100.2k | 435 | 3 | voice short prose (0 sentences); judge: The numbered list format sounds robotic in spoken language. |
| `voiceSpokenPartNoMarkdownLeak` | OK | 1.00 | 27.2s | 66.5k | 347 | 2 | speakable text has no markdown markers (345 chars) |
| `voiceSttToleranceCutWord` | OK | 1.00 | 3.6s | 66.4k | 230 | 2 | STT cut-off word tolerated, reply references München |
| `voiceSttToleranceHomophone` | OK | 1.00 | 9.3s | 100.3k | 619 | 3 | STT homophone tolerated, reply references Lissabon |
