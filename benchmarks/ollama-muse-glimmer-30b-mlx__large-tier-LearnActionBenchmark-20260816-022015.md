# Vance Benchmark - ollama-muse-glimmer-30b-mlx__large-tier-LearnActionBenchmark-20260816-022015

- **Started:** 2026-08-16T02:20:15.051842Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 4
- **Passed:** 4 / 4 (100%)
- **Average score:** 1.000
- **Total LLM time:** 327.0s
- **Total tokens (in / out):** 1.00M / 4.0k (23 round-trips)


## learn-action

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `learnsFactAppend` | OK | 1.00 | 107.5s | 855.1k | 2.0k | 18 | LEARN(scope=fact) emitted: {"type":"LEARN","reason":"User provided additional team stack detail to remember.","scope":"fact","content":"Team platform-core uses Java 25 + Spring Boot 4 as base stack."} |
| `learnsFactReplace` | OK | 1.00 | 81.8s | 49.3k | 332 | 1 | LEARN(scope=fact) emitted: {"type":"LEARN","reason":"User provided team name and repository pattern to remember for future context.","scope":"fact","content":"Team: platform-core; works on ms-* repositories."} |
| `learnsPersonaAppend` | OK | 1.00 | 80.9s | 49.7k | 1.2k | 2 | LEARN(scope=persona, mode=append) emitted: {"type":"LEARN","reason":"User requested a persistent style preference to start answers with a code block and no long intro.","scope":"persona","mode":"append","content":"Prefers code block directly a… |
| `learnsPersonaReplace` | OK | 1.00 | 56.8s | 49.7k | 474 | 2 | LEARN(scope=persona, mode=replace) emitted: {"type":"LEARN","reason":"User explicitly requested a complete style replacement to bullet-point technical output.","scope":"persona","mode":"replace","content":"Response style: short bullet points on… |
