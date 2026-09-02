# Vance Benchmark - ollama-gpt-oss-20b-VoiceStyleBenchmark-20260816-143222

- **Started:** 2026-08-16T14:32:22.970732Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 13
- **Passed:** 10 / 13 (77%)
- **Average score:** 0.769
- **Total LLM time:** 164.8s
- **Total tokens (in / out):** 766.0k / 7.5k (23 round-trips)


## voice-style

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `voiceAcronymExpansion` | OK | 1.00 | 2.0s | 33.1k | 148 | 1 | K8s expanded to Kubernetes in speakable text |
| `voiceFenceForCodePath` | FAIL | 0.00 | 2.4s | 33.2k | 172 | 1 | long path/URL `git clone https://github.com/spring-projects/spring-petclinic.git` left in inline-backticks — TTS would either spell it or read with noise. Belongs in a fence in voice mode. |
| `voiceFenceForLongList` | FAIL | 0.00 | 9.9s | 66.8k | 773 | 2 | no triple-backtick fence found — long list should sit inside a fence so TTS skips it. content head: Hier die komplette Liste von zehn typischen Restaurants in Berlin‑Mitte, jeweils mit Stadtteil‑Schwerpunkt:  1. **Restaurant Tim Raue** – Mitte, Michelin‑Sterne‑Asian‑Fusion 2. **Zur letzten Instanz** – Mitte, traditionelles deutsches Hausr… |
| `voiceFenceForTable` | OK | 1.00 | 12.9s | 66.8k | 1.0k | 2 | comparison routed into pipe-table |
| `voiceFenceNotMisused` | OK | 1.00 | 1.3s | 33.1k | 72 | 1 | fence-not-misused (Paris in speakable); judge: The candidate provides the correct answer as a single, direct word. |
| `voiceModeOffMidConversation` | OK | 1.00 | 51.9s | 99.6k | 2.2k | 3 | voice-mode toggle respected mid-conversation: voice=1 sentences vs text=23 with markdown structure |
| `voiceNumbersSpeakable` | OK | 1.00 | 4.4s | 33.1k | 191 | 1 | no ISO date leaked into speakable text (numbers TTS-safe) |
| `voiceQuestionEndsOpenly` | OK | 1.00 | 31.4s | 134.1k | 761 | 4 | last sentence closes the turn cleanly (question, invitation, or clear recommendation) |
| `voiceShortBulletsAllowedInline` | FAIL | 0.50 | 1.4s | 33.1k | 86 | 1 | voice short-bullets (3 bullets); judge: The bullet enumeration 'Eins, Zwei, Drei' is stilted for spoken German. |
| `voiceShortProseReply` | OK | 0.50 | 2.7s | 33.1k | 194 | 1 | voice short prose (0 sentences); judge: The numbered list format sounds robotic in spoken language. |
| `voiceSpokenPartNoMarkdownLeak` | OK | 1.00 | 23.4s | 33.1k | 269 | 1 | speakable text has no markdown markers (342 chars) |
| `voiceSttToleranceCutWord` | OK | 1.00 | 4.4s | 66.4k | 303 | 2 | STT cut-off word tolerated, reply references München |
| `voiceSttToleranceHomophone` | OK | 1.00 | 16.6s | 100.3k | 1.3k | 3 | STT homophone tolerated, reply references Lissabon |
