# Vance Benchmark - ollama-gpt-oss-20b-ScriptCapabilityBenchmark-20260816-032153

- **Started:** 2026-08-16T03:21:53.567923Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 5
- **Passed:** 3 / 5 (60%)
- **Average score:** 0.600
- **Total LLM time:** 131.7s
- **Total tokens (in / out):** 596.6k / 4.3k (18 round-trips)


## script-javascript

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `executesJavaScriptJsonTransform` | FAIL | 0.00 | 30.0s | 132.2k | 395 | 4 | tool=execute_javascript ran but result missing expected substring(s) [50, Feb] — head: {"value":25,"durationMs":308} |
| `executesJavaScriptPrimes` | FAIL | 0.00 | 34.4s | 166.1k | 1.6k | 5 | no TOOL_RESULT from any of [execute_javascript] within 30s |
| `executesJavaScriptSum` | OK | 1.00 | 6.8s | 65.6k | 191 | 2 | tool=execute_javascript produced expected substring(s) [500500] |

## script-python

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `executesPythonPrimes` | OK | 1.00 | 44.2s | 133.2k | 1.2k | 4 | tool=client_exec_run produced expected substring(s) [97, 2] |
| `executesPythonStringReverse` | OK | 1.00 | 16.2s | 99.5k | 927 | 3 | tool=client_exec_run produced expected substring(s) [kramhcneb] |
