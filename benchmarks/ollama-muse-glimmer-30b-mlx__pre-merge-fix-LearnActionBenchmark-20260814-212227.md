# Vance Benchmark - ollama-muse-glimmer-30b-mlx__pre-merge-fix-LearnActionBenchmark-20260814-212227

- **Started:** 2026-08-14T21:22:27.354150Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 4
- **Passed:** 1 / 4 (25%)
- **Average score:** 0.250
- **Total LLM time:** 218.6s
- **Total tokens (in / out):** 121.5k / 235 (1 round-trips)


## learn-action

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `learnsFactAppend` | FAIL | 0.00 | - | - | - | - | model timed out after 0.6s (budget 600s, foot.error=Brain error 500: Engine steer failed: de.mhus.vance.brain.ai.AiChatException: arthur streaming failed: All 2 chat-model chain entries exhausted) |
| `learnsFactReplace` | OK | 1.00 | 218.6s | 121.5k | 235 | 1 | LEARN(scope=fact) emitted: {"type":"LEARN","reason":"User provided team name and repo pattern to remember.","scope":"fact","content":"Team name: platform-core. Works on ms-* repositories."} |
| `learnsPersonaAppend` | FAIL | 0.00 | - | - | - | - | model timed out after 0.6s (budget 600s, foot.error=Brain error 500: Engine steer failed: de.mhus.vance.brain.ai.AiChatException: arthur streaming failed: All 2 chat-model chain entries exhausted) |
| `learnsPersonaReplace` | FAIL | 0.00 | - | - | - | - | model timed out after 0.6s (budget 600s, foot.error=Brain error 500: Engine steer failed: de.mhus.vance.brain.ai.AiChatException: arthur streaming failed: All 2 chat-model chain entries exhausted) |
