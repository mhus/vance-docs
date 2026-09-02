# Vance Benchmark - ollama-qwen3.6-35b-VoiceStyleBenchmark-20260816-101642

- **Started:** 2026-08-16T10:16:42.054716Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 13
- **Passed:** 11 / 13 (85%)
- **Average score:** 0.846
- **Total LLM time:** 242.6s
- **Total tokens (in / out):** 1.79M / 7.6k (40 round-trips)


## voice-style

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `voiceAcronymExpansion` | OK | 1.00 | 7.1s | 79.8k | 373 | 2 | K8s expanded to Kubernetes in speakable text |
| `voiceFenceForCodePath` | OK | 1.00 | 5.1s | 79.7k | 127 | 2 | no long path/URL leaked into inline-code (voice-safe) |
| `voiceFenceForLongList` | OK | 1.00 | 15.2s | 120.5k | 828 | 3 | long list routed into a fence; speakable kept 0 inline bullets |
| `voiceFenceForTable` | OK | 1.00 | 91.1s | 713.9k | 2.7k | 13 | comparison routed into fence |
| `voiceFenceNotMisused` | OK | 1.00 | 4.2s | 79.7k | 145 | 2 | fence-not-misused (Paris in speakable); judge: The candidate provides a short, direct answer. |
| `voiceModeOffMidConversation` | OK | 1.00 | 50.5s | 159.0k | 1.2k | 4 | voice-mode toggle respected mid-conversation: voice=1 sentences vs text=8 with markdown structure |
| `voiceNumbersSpeakable` | OK | 1.00 | 4.2s | 79.7k | 132 | 2 | no ISO date leaked into speakable text (numbers TTS-safe) |
| `voiceQuestionEndsOpenly` | OK | 1.00 | 8.8s | 79.9k | 511 | 2 | last sentence closes the turn cleanly (question, invitation, or clear recommendation) |
| `voiceShortBulletsAllowedInline` | OK | 0.50 | 6.7s | 79.8k | 245 | 2 | voice short-bullets (3 bullets); judge: The enumeration 'Eins, Zwei, Drei' sounds stilted in spoken German. |
| `voiceShortProseReply` | FAIL | 0.50 | 7.4s | 79.9k | 393 | 2 | voice short prose (1 sentences); judge: The response is on-topic but sounds robotic and the final question uses the wrong pronoun. |
| `voiceSpokenPartNoMarkdownLeak` | OK | 1.00 | 30.3s | 79.9k | 500 | 2 | speakable text has no markdown markers (826 chars) |
| `voiceSttToleranceCutWord` | FAIL | 0.00 | 6.6s | 79.7k | 249 | 2 | STT cut-off 'münch' should be tolerated as München — reply neither names the full city nor asks for clarification. stripped head: Ich kann leider nicht direkt auf Live-Wetterdaten zugreifen, da dafür kein Tool konfiguriert ist. Du kannst aber schnell wetter.com oder einen ähnlichen Dienst aufrufen – oder sag mir, ob ich dir etwas anderes dazu erstellen soll (z.B. eine… |
| `voiceSttToleranceHomophone` | OK | 1.00 | 5.3s | 79.8k | 232 | 2 | STT homophone tolerated, reply references Lissabon |
