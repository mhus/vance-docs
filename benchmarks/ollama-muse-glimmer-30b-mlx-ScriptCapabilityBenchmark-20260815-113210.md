# Vance Benchmark - ollama-muse-glimmer-30b-mlx-ScriptCapabilityBenchmark-20260815-113210

- **Started:** 2026-08-15T11:32:10.797027Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 5
- **Passed:** 3 / 5 (60%)
- **Average score:** 0.600
- **Total LLM time:** 870.0s
- **Total tokens (in / out):** 815.2k / 4.2k (16 round-trips)


## script-javascript

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `executesJavaScriptJsonTransform` | OK | 1.00 | 217.6s | 149.0k | 559 | 3 | tool=execute_javascript produced expected substring(s) [50, Feb] |
| `executesJavaScriptPrimes` | OK | 1.00 | 105.5s | 149.0k | 618 | 3 | tool=execute_javascript produced expected substring(s) [97, 2] |
| `executesJavaScriptSum` | OK | 1.00 | 137.8s | 148.9k | 1.3k | 3 | tool=execute_javascript produced expected substring(s) [500500] |

## script-python

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `executesPythonPrimes` | FAIL | 0.00 | 116.5s | 147.5k | 963 | 4 | no TOOL_RESULT from any of [execute_python, python_run, exec_run, client_exec_run, work_exec_run] within 30s |
| `executesPythonStringReverse` | FAIL | 0.00 | 292.6s | 220.8k | 755 | 3 | no TOOL_RESULT from any of [execute_python, python_run, exec_run, client_exec_run, work_exec_run] within 30s |
