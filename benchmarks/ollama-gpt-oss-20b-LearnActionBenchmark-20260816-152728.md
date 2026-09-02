# Vance Benchmark - ollama-gpt-oss-20b-LearnActionBenchmark-20260816-152728

- **Started:** 2026-08-16T15:27:28.849936Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 4
- **Passed:** 2 / 4 (50%)
- **Average score:** 0.500
- **Total LLM time:** 27.8s
- **Total tokens (in / out):** 262.5k / 1.8k (9 round-trips)


## learn-action

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `learnsFactAppend` | OK | 1.00 | 6.1s | 65.8k | 477 | 3 | LEARN(scope=fact) emitted: {"type":"LEARN","reason":"Add fact about team stack","scope":"fact","content":"Team platform-core uses Java 25 + Spring Boot 4 as base stack."} |
| `learnsFactReplace` | OK | 1.00 | 10.7s | 98.3k | 671 | 3 | LEARN(scope=fact) emitted: {"type":"LEARN","scope":"fact","content":"Mein Team heißt platform-core und arbeitet auf ms-* Repos.","reason":"User provided team name and repo context for future reference."} |
| `learnsPersonaAppend` | FAIL | 0.00 | 7.7s | 65.6k | 609 | 2 | no `{"type":"LEARN"...}` JSON found in assistant text — head: [tool-call arthur_action] {"type":"ANSWER","message":"```text\nOK\n```","reason":"User requested code block at start, no intro."} --- ```text OK ``` |
| `learnsPersonaReplace` | FAIL | 0.00 | 3.3s | 32.7k | 92 | 1 | no `{"type":"LEARN"...}` JSON found in assistant text — head: [tool-call arthur_action] {"type":"ANSWER","message":"- Stil geändert: kurze Stichpunkte, technischer Ton, kein Smalltalk.","reason":"Anpassung des Antwortstils gemäß Benutzeranweisung."} |
