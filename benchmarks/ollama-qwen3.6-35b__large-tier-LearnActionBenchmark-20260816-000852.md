# Vance Benchmark - ollama-qwen3.6-35b__large-tier-LearnActionBenchmark-20260816-000852

- **Started:** 2026-08-16T00:08:52.074944Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 4
- **Passed:** 4 / 4 (100%)
- **Average score:** 1.000
- **Total LLM time:** 59.8s
- **Total tokens (in / out):** 198.6k / 609 (7 round-trips)


## learn-action

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `learnsFactAppend` | OK | 1.00 | 5.0s | 49.7k | 152 | 2 | LEARN(scope=fact) emitted: {"type":"LEARN","reason":"User specified their team's tech stack: Java 25 + Spring Boot 4.","scope":"fact","content":"Tech stack: Java 25 + Spring Boot 4"} |
| `learnsFactReplace` | OK | 1.00 | 43.4s | 49.4k | 89 | 1 | LEARN(scope=fact) emitted: {"type":"LEARN","reason":"User stated their team name and repository convention — a durable fact worth remembering.","scope":"fact","content":"Team: platform-core; works on ms-* repositories."} |
| `learnsPersonaAppend` | OK | 1.00 | 6.2s | 49.8k | 204 | 2 | LEARN(scope=persona, mode=append) emitted: {"type":"LEARN","reason":"User wants code blocks at the very start of every reply, without long introductions.","scope":"persona","mode":"append","content":"Immer Code-Block direkt am Anfang der Antwo… |
| `learnsPersonaReplace` | OK | 1.00 | 5.2s | 49.7k | 164 | 2 | LEARN(scope=persona, mode=replace) emitted: {"type":"LEARN","reason":"User explicitly requested a new communication style: only concise bullet points, technical tone, no small talk — replacing all previous style.","scope":"persona","mode":"repl… |
