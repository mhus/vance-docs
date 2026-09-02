# Vance Benchmark - ollama-muse-glimmer-30b-mlx__small-v2-LearnActionBenchmark-20260816-200732

- **Started:** 2026-08-16T20:07:32.500058Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 4
- **Passed:** 3 / 4 (75%)
- **Average score:** 0.750
- **Total LLM time:** 217.2s
- **Total tokens (in / out):** 688.9k / 2.5k (19 round-trips)


## learn-action

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `learnsFactAppend` | FAIL | 0.00 | 91.3s | 568.3k | 1.1k | 14 | no `{"type":"LEARN"...}` JSON found in assistant text — head: [tool-call arthur_action] {"type":"ASK_USER","reason":"No existing team info document found in current project; need location to store stack detail.","message":"Ich habe im Projekt 'Instant Hole' kein… |
| `learnsFactReplace` | OK | 1.00 | 39.0s | 39.9k | 256 | 1 | LEARN(scope=fact) emitted: {"type":"LEARN","reason":"User volunteered durable team and repo information to remember.","scope":"fact","content":"User's team is 'platform-core' and works on the ms-* repositories."} |
| `learnsPersonaAppend` | OK | 1.00 | 55.4s | 40.4k | 521 | 2 | LEARN(scope=persona, mode=append) emitted: {"type":"LEARN","reason":"User requests code block at start of answers with no long intro.","scope":"persona","mode":"append","content":"Code-Block immer direkt am Anfang der Antwort, ohne lange Einle… |
| `learnsPersonaReplace` | OK | 1.00 | 31.4s | 40.3k | 636 | 2 | LEARN(scope=persona, mode=replace) emitted: {"type":"LEARN","reason":"User explicitly requests a complete replacement of response style.","scope":"persona","mode":"replace","content":"Antwortstil: knappe Stichpunkte statt ganzer Sätze, technisc… |
