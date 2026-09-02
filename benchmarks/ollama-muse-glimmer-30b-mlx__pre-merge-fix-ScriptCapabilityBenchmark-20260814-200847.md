# Vance Benchmark - ollama-muse-glimmer-30b-mlx__pre-merge-fix-ScriptCapabilityBenchmark-20260814-200847

- **Started:** 2026-08-14T20:08:47.531624Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 5
- **Passed:** 2 / 5 (40%)
- **Average score:** 0.400
- **Total LLM time:** 500.7s
- **Total tokens (in / out):** 1.10M / 2.7k (9 round-trips)


## script-javascript

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `executesJavaScriptJsonTransform` | OK | 1.00 | 216.4s | 366.6k | 479 | 3 | tool=execute_javascript produced expected substring(s) [50, Feb] |
| `executesJavaScriptPrimes` | OK | 1.00 | 45.0s | 366.6k | 787 | 3 | tool=execute_javascript produced expected substring(s) [97, 2] |
| `executesJavaScriptSum` | FAIL | 0.00 | 34.7s | 121.5k | 805 | 1 | no TOOL_RESULT from any of [execute_javascript] within 30s |

## script-python

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `executesPythonPrimes` | FAIL | 0.00 | 180.8s | 121.5k | 127 | 1 | no TOOL_RESULT from any of [execute_python, python_run, exec_run, client_exec_run, work_exec_run] within 30s |
| `executesPythonStringReverse` | FAIL | 0.00 | 23.7s | 121.5k | 509 | 1 | no TOOL_RESULT from any of [execute_python, python_run, exec_run, client_exec_run, work_exec_run] within 30s |
