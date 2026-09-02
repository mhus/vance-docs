# Vance Benchmark - ollama-qwen3.6-35b__large-tier-ScriptCapabilityBenchmark-20260815-233855

- **Started:** 2026-08-15T23:38:55.278700Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 5
- **Passed:** 2 / 5 (40%)
- **Average score:** 0.400
- **Total LLM time:** 183.9s
- **Total tokens (in / out):** 997.4k / 2.2k (20 round-trips)


## script-javascript

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `executesJavaScriptJsonTransform` | FAIL | 0.00 | 49.8s | 149.1k | 300 | 3 | tool=execute_javascript ran but result missing expected substring(s) [50, Feb] — head: {"value":null,"durationMs":345} |
| `executesJavaScriptPrimes` | FAIL | 0.00 | 15.1s | 248.9k | 642 | 5 | no TOOL_RESULT from any of [execute_javascript] within 30s |
| `executesJavaScriptSum` | FAIL | 0.00 | 11.5s | 199.0k | 298 | 4 | no TOOL_RESULT from any of [execute_javascript] within 30s |

## script-python

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `executesPythonPrimes` | OK | 1.00 | 92.5s | 200.8k | 727 | 4 | tool=exec_run produced expected substring(s) [97, 2] |
| `executesPythonStringReverse` | OK | 1.00 | 15.0s | 199.5k | 241 | 4 | tool=exec_run produced expected substring(s) [kramhcneb] |
