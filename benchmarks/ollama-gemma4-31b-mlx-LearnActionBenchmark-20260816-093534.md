# Vance Benchmark - ollama-gemma4-31b-mlx-LearnActionBenchmark-20260816-093534

- **Started:** 2026-08-16T09:35:34.679775Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 4
- **Passed:** 2 / 4 (50%)
- **Average score:** 0.500
- **Total LLM time:** 122.7s
- **Total tokens (in / out):** 192.0k / 471 (7 round-trips)


## learn-action

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `learnsFactAppend` | OK | 1.00 | 22.1s | 38.5k | 136 | 2 | LEARN(scope=fact) emitted: {"content":"Team 'platform-core' nutzt Java 25 und Spring Boot 4 als Basis-Stack.","reason":"The user provided technical stack details for their team and requested to add them to the team information.… |
| `learnsFactReplace` | OK | 1.00 | 79.5s | 38.2k | 63 | 1 | LEARN(scope=fact) emitted: {"reason":"User provided persona/fact information about their team and work focus.","scope":"fact","content":"User's team is 'platform-core' and they work on ms-* repositories.","type":"LEARN"} |
| `learnsPersonaAppend` | FAIL | 0.00 | 15.6s | 77.1k | 203 | 3 | LEARN JSON has wrong mode (expected 'append') — json: {"content":"Stil: Knappe Stichpunkte. Kein Smalltalk. Technischer Ton. Keine ganzen Sätze. Code-Blöcke immer direkt am Anfang der Antwort, ohne Einleitung.","mode":"replace","reason":"Update persona w… |
| `learnsPersonaReplace` | FAIL | 0.00 | 5.5s | 38.3k | 69 | 1 | LEARN JSON has wrong mode (expected 'replace') — json: {"reason":"User requested a complete change in communication style to concise bullet points and technical tone.","scope":"persona","content":"Stil: Knappe Stichpunkte. Kein Smalltalk. Technischer Ton.… |
