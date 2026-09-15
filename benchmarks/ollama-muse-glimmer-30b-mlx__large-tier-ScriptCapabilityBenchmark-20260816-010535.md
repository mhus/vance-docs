# Vance Benchmark - ollama-muse-glimmer-30b-mlx__large-tier-ScriptCapabilityBenchmark-20260816-010535

- **Started:** 2026-08-16T01:05:35.086366Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 5
- **Passed:** 1 / 5 (20%)
- **Average score:** 0.200
- **Total LLM time:** 764.8s
- **Total tokens (in / out):** 690.5k / 3.2k (13 round-trips)


## script-javascript

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `executesJavaScriptJsonTransform` | FAIL | 0.00 | 152.9s | 49.4k | 195 | 1 | no TOOL_RESULT from any of [execute_javascript] within 30s |
| `executesJavaScriptPrimes` | FAIL | 0.00 | 101.7s | 123.1k | 863 | 2 | no TOOL_RESULT from any of [execute_javascript] within 30s |
| `executesJavaScriptSum` | OK | 1.00 | 137.1s | 149.1k | 565 | 3 | tool=execute_javascript produced expected substring(s) [500500] |

## script-python

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `executesPythonPrimes` | FAIL | 0.00 | 148.9s | 147.7k | 985 | 4 | no TOOL_RESULT from any of [execute_python, python_run, exec_run, client_exec_run, work_exec_run] within 30s |
| `executesPythonStringReverse` | FAIL | 0.00 | 224.2s | 221.1k | 633 | 3 | no TOOL_RESULT from any of [execute_python, python_run, exec_run, client_exec_run, work_exec_run] within 30s |
