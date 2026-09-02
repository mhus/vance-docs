# Vance Benchmark - ollama-gpt-oss-20b__large-tier-VoiceStyleBenchmark-20260816-164023

- **Started:** 2026-08-16T16:40:23.677615Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 13
- **Passed:** 11 / 13 (85%)
- **Average score:** 0.846
- **Total LLM time:** 192.3s
- **Total tokens (in / out):** 1.25M / 7.8k (29 round-trips)


## voice-style

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `voiceAcronymExpansion` | OK | 1.00 | 2.7s | 42.9k | 180 | 1 | K8s expanded to Kubernetes in speakable text |
| `voiceFenceForCodePath` | OK | 1.00 | 1.5s | 42.9k | 78 | 1 | no long path/URL leaked into inline-code (voice-safe) |
| `voiceFenceForLongList` | FAIL | 0.00 | 23.6s | 129.3k | 1.8k | 3 | no triple-backtick fence found — long list should sit inside a fence so TTS skips it. content head: **10 typische Restaurants in Berlin‑Mitte (nach Stadtteil‑Schwerpunkt)**  \| Restaurant \| Stadtteil‑Schwerpunkt (Unterviertel) \| \|------------\|-------------------------------------\| \| Zur letzten Instanz \| Nikolaiviertel \| \| Katz & Co. \| Nik… |
| `voiceFenceForTable` | OK | 1.00 | 23.3s | 129.1k | 1.7k | 3 | comparison routed into pipe-table |
| `voiceFenceNotMisused` | OK | 1.00 | 1.5s | 42.9k | 82 | 1 | fence-not-misused (Paris in speakable); judge: The candidate provides the correct answer as a single, direct word. |
| `voiceModeOffMidConversation` | OK | 1.00 | 52.3s | 171.8k | 1.1k | 4 | voice-mode toggle respected mid-conversation: voice=1 sentences vs text=26 with markdown structure |
| `voiceNumbersSpeakable` | OK | 1.00 | 17.9s | 172.5k | 578 | 4 | no ISO date leaked into speakable text (numbers TTS-safe) |
| `voiceQuestionEndsOpenly` | OK | 1.00 | 3.8s | 42.9k | 282 | 1 | last sentence closes the turn cleanly (question, invitation, or clear recommendation) |
| `voiceShortBulletsAllowedInline` | OK | 0.50 | 2.8s | 42.9k | 193 | 1 | voice short-bullets (3 bullets); judge: The enumeration 'Eins, Zwei, Drei' is stilted for spoken German. |
| `voiceShortProseReply` | FAIL | 0.50 | 2.7s | 42.9k | 190 | 1 | voice short prose (1 sentences); judge: The candidate is a single long sentence with several incorrect names for landmarks. |
| `voiceSpokenPartNoMarkdownLeak` | OK | 1.00 | 41.5s | 129.7k | 731 | 3 | speakable text has no markdown markers (591 chars) |
| `voiceSttToleranceCutWord` | OK | 1.00 | 14.5s | 219.5k | 600 | 5 | STT cut-off word tolerated, reply references München |
| `voiceSttToleranceHomophone` | OK | 1.00 | 4.1s | 42.9k | 308 | 1 | STT homophone tolerated, reply references Lissabon |
