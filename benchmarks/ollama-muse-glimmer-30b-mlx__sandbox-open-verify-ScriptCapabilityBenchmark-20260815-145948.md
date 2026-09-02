# Vance Benchmark - ollama-muse-glimmer-30b-mlx__sandbox-open-verify-ScriptCapabilityBenchmark-20260815-145948

- **Started:** 2026-08-15T14:59:48.195061Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 5
- **Passed:** 4 / 5 (80%)
- **Average score:** 0.800
- **Total LLM time:** 537.7s
- **Total tokens (in / out):** 796.4k / 4.0k (16 round-trips)


## script-javascript

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `executesJavaScriptJsonTransform` | OK | 1.00 | 112.9s | 149.1k | 596 | 3 | tool=execute_javascript produced expected substring(s) [50, Feb] |
| `executesJavaScriptPrimes` | OK | 1.00 | 23.2s | 149.1k | 690 | 3 | tool=execute_javascript produced expected substring(s) [97, 2] |
| `executesJavaScriptSum` | OK | 1.00 | 62.6s | 149.0k | 620 | 3 | tool=execute_javascript produced expected substring(s) [500500] |

## script-python

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `executesPythonPrimes` | OK | 1.00 | 267.2s | 299.8k | 1.8k | 6 | tool=execute_python produced expected substring(s) [97, 2] |
| `executesPythonStringReverse` | FAIL | 0.00 | 71.8s | 49.4k | 327 | 1 | no TOOL_RESULT from any of [execute_python, python_run, exec_run, client_exec_run, work_exec_run] within 30s |
