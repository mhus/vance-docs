# Vance Benchmark - ollama-gpt-oss-20b-LearnActionBenchmark-20260816-035759

- **Started:** 2026-08-16T03:57:59.926081Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 4
- **Passed:** 2 / 4 (50%)
- **Average score:** 0.500
- **Total LLM time:** 38.0s
- **Total tokens (in / out):** 460.9k / 2.6k (14 round-trips)


## learn-action

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `learnsFactAppend` | OK | 1.00 | 16.5s | 198.2k | 1.2k | 6 | LEARN(scope=fact) emitted: {   "type": "LEARN",   "scope": "fact",   "content": "Team 'platform-core' uses Java 25 + Spring Boot 4 as base stack.",   "reason": "Record the team's technology stack for future reference." } |
| `learnsFactReplace` | OK | 1.00 | 9.8s | 131.4k | 522 | 4 | LEARN(scope=fact) emitted: {"type":"LEARN","reason":"Storing user-provided fact about team and repo scope","scope":"fact","content":"Team \"platform-core\" works on ms-* repos."} |
| `learnsPersonaAppend` | FAIL | 0.00 | 8.4s | 65.6k | 657 | 2 | no `{"type":"LEARN"...}` JSON found in assistant text — head: [tool-call arthur_action] {"type":"ANSWER","message":"```bash\n# Hier kommt dein Code – so wie du es brauchst\n```\n","reason":"User requested code block first, no long intro, keep style."} --- {"type… |
| `learnsPersonaReplace` | FAIL | 0.00 | 3.4s | 65.6k | 205 | 2 | no `{"type":"LEARN"...}` JSON found in assistant text — head: [tool-call arthur_action] {"type":"ANSWER","message":"- Stiländerung bestätigt.\n- Ab jetzt: kurze Stichpunkte, technischer Ton, kein Smalltalk.\n- Weiterverarbeitung in diesem Format.\n","reason":"Us… |
