# Vance Benchmark - ollama-muse-glimmer-30b-mlx-ScriptCapabilityBenchmark-20260816-121730

- **Started:** 2026-08-16T12:17:30.573694Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 5
- **Passed:** 4 / 5 (80%)
- **Average score:** 0.800
- **Total LLM time:** 633.6s
- **Total tokens (in / out):** 772.7k / 3.7k (19 round-trips)


## script-javascript

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `executesJavaScriptJsonTransform` | OK | 1.00 | 109.4s | 120.1k | 637 | 3 | tool=execute_javascript produced expected substring(s) [50, Feb] |
| `executesJavaScriptPrimes` | OK | 1.00 | 127.0s | 120.1k | 682 | 3 | tool=execute_javascript produced expected substring(s) [97, 2] |
| `executesJavaScriptSum` | OK | 1.00 | 80.2s | 119.9k | 559 | 3 | tool=execute_javascript produced expected substring(s) [500500] |

## script-python

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `executesPythonPrimes` | FAIL | 0.00 | 57.3s | 73.9k | 611 | 4 | no TOOL_RESULT from any of [execute_python, python_run, exec_run, client_exec_run, work_exec_run] within 30s |
| `executesPythonStringReverse` | OK | 1.00 | 259.6s | 338.7k | 1.2k | 6 | tool=execute_python produced expected substring(s) [kramhcneb] |
