# Vance Benchmark - ollama-qwen3.6-35b-LearnActionBenchmark-20260814-185749

- **Started:** 2026-08-14T18:57:49.415763Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 4
- **Passed:** 4 / 4 (100%)
- **Average score:** 1.000
- **Total LLM time:** 57.2s
- **Total tokens (in / out):** 397.1k / 832 (10 round-trips)


## learn-action

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `learnsFactAppend` | OK | 1.00 | 4.8s | 49.6k | 143 | 2 | LEARN(scope=fact) emitted: {"type":"LEARN","reason":"User added team tech stack details (Java 25 + Spring Boot 4).","scope":"fact","content":"Tech stack: Java 25 + Spring Boot 4."} |
| `learnsFactReplace` | OK | 1.00 | 36.6s | 49.3k | 122 | 1 | LEARN(scope=fact) emitted: {"message":"Ich habe mir gemerkt, dass dein Team **platform-core** heißt und auf den **ms-*** Repos arbeitet.","reason":"User shared team name and repo convention as a persistent preference/fact.","sc… |
| `learnsPersonaAppend` | OK | 1.00 | 6.9s | 149.0k | 197 | 3 | LEARN(scope=persona, mode=append) emitted: {   "type": "LEARN",   "reason": "User requested that I always start responses with a code block directly at the beginning, without long introductions — this is a persistent formatting preference.",  … |
| `learnsPersonaReplace` | OK | 1.00 | 8.9s | 149.1k | 370 | 4 | LEARN(scope=persona, mode=replace) emitted: {"content":"Prefers responses in brief bullet points only, technical tone, no smalltalk or pleasantries.","mode":"replace","reason":"User explicitly requested a permanent change to their communication… |
