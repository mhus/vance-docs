# Vance Benchmark - ollama-gpt-oss-20b__large-tier-LearnActionBenchmark-20260816-175149

- **Started:** 2026-08-16T17:51:49.142684Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 4
- **Passed:** 2 / 4 (50%)
- **Average score:** 0.500
- **Total LLM time:** 62.9s
- **Total tokens (in / out):** 646.2k / 3.3k (16 round-trips)


## learn-action

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `learnsFactAppend` | OK | 1.00 | 23.2s | 259.5k | 1.3k | 7 | LEARN(scope=fact) emitted: {"type":"LEARN","reason":"User supplied new team stack details to record for future reference.","scope":"fact","content":"Team uses Java 25 + Spring Boot 4 as the base stack."} |
| `learnsFactReplace` | OK | 1.00 | 18.0s | 216.2k | 932 | 5 | LEARN(scope=fact) emitted: {"type":"LEARN","reason":"User provided team name and repo pattern to remember.","scope":"fact","content":"Team: platform-core, repos: ms-*" } |
| `learnsPersonaAppend` | FAIL | 0.00 | 16.9s | 128.0k | 926 | 3 | no `{"type":"LEARN"...}` JSON found in assistant text — head: {"type":"ANSWER","reason":"User requested concise code-block-first style with no long intro.","message":"Got it. From now on, code blocks will start each answer without a long intro."} --- {"type":"AN… |
| `learnsPersonaReplace` | FAIL | 0.00 | 4.9s | 42.5k | 131 | 1 | no `{"type":"LEARN"...}` JSON found in assistant text — head: [tool-call arthur_action] {"type":"ANSWER","reason":"User requested change to short bullet points, technical tone, no small talk.","message":"- Style: bullet points only\n- Technical language\n- No sm… |
