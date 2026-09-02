# Vance Benchmark - ollama-muse-glimmer-30b-mlx-LearnActionBenchmark-20260816-132946

- **Started:** 2026-08-16T13:29:46.995717Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 4
- **Passed:** 3 / 4 (75%)
- **Average score:** 0.750
- **Total LLM time:** 255.4s
- **Total tokens (in / out):** 936.6k / 3.1k (25 round-trips)


## learn-action

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `learnsFactAppend` | FAIL | 0.00 | 103.6s | 816.9k | 1.1k | 20 | no `{"type":"LEARN"...}` JSON found in assistant text — head: [tool-call foreign_project_list] {} --- [tool-call doc_grep_path] {"caseInsensitive":true,"pathPrefix":"*","pattern":"platform"} --- [tool-call doc_grep_path] {"caseInsensitive":true,"pattern":"platfo… |
| `learnsFactReplace` | OK | 1.00 | 40.7s | 39.7k | 408 | 1 | LEARN(scope=fact) emitted: {"type":"LEARN","reason":"User asked to remember team name and repo pattern","scope":"fact","content":"User's team is 'platform-core' and works on ms-* repositories."} |
| `learnsPersonaAppend` | OK | 1.00 | 85.0s | 40.0k | 1.3k | 2 | LEARN(scope=persona, mode=append) emitted: {"type":"LEARN","reason":"Persist user's formatting preference for future answers","scope":"persona","mode":"append","content":"Always start answer with code block directly at beginning, no long intro… |
| `learnsPersonaReplace` | OK | 1.00 | 26.1s | 40.0k | 385 | 2 | LEARN(scope=persona, mode=replace) emitted: {"type":"LEARN","reason":"User explicitly requested a complete style replacement.","scope":"persona","mode":"replace","content":"Communication style: concise bullet points only, no full sentences. Tec… |
