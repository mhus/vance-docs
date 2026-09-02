# Vance Benchmark - ollama-muse-glimmer-30b-mlx-LearnActionBenchmark-20260815-123532

- **Started:** 2026-08-15T12:35:32.755912Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 4
- **Passed:** 3 / 4 (75%)
- **Average score:** 0.750
- **Total LLM time:** 202.2s
- **Total tokens (in / out):** 495.3k / 1.7k (12 round-trips)


## learn-action

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `learnsFactAppend` | FAIL | 0.00 | 54.9s | 346.9k | 473 | 7 | no `{"type":"LEARN"...}` JSON found in assistant text — head: [tool-call arthur_action] {"type":"ASK_USER","reason":"No team document found yet; need to know where to store the stack info.","message":"Ich habe noch keine Team-Infos im Projekt gefunden. Soll ich … |
| `learnsFactReplace` | OK | 1.00 | 81.4s | 49.2k | 293 | 1 | LEARN(scope=fact) emitted: {"type":"LEARN","reason":"User volunteered stable team information worth remembering.","scope":"fact","content":"Team is 'platform-core' and works on ms-* repositories."} |
| `learnsPersonaAppend` | OK | 1.00 | 55.3s | 49.6k | 529 | 2 | LEARN(scope=persona, mode=append) emitted: {"type":"LEARN","reason":"User explicitly requests code block at start of answers with no long intro.","scope":"persona","mode":"append","content":"Prefers answers to start directly with a code block,… |
| `learnsPersonaReplace` | OK | 1.00 | 10.6s | 49.6k | 382 | 2 | LEARN(scope=persona, mode=replace) emitted: {"type":"LEARN","reason":"User explicitly wants a complete style reset to bullet points, technical tone, no small talk.","scope":"persona","mode":"replace","content":"- Response style: concise bullet … |
