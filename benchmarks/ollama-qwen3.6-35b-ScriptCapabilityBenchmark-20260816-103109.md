# Vance Benchmark - ollama-qwen3.6-35b-ScriptCapabilityBenchmark-20260816-103109

- **Started:** 2026-08-16T10:31:09.514317Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 5
- **Passed:** 4 / 5 (80%)
- **Average score:** 0.800
- **Total LLM time:** 177.2s
- **Total tokens (in / out):** 915.3k / 2.1k (23 round-trips)


## script-javascript

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `executesJavaScriptJsonTransform` | OK | 1.00 | 48.4s | 159.0k | 454 | 4 | tool=execute_javascript produced expected substring(s) [50, Feb] |
| `executesJavaScriptPrimes` | OK | 1.00 | 17.6s | 198.8k | 649 | 5 | tool=execute_javascript produced expected substring(s) [97, 2] |
| `executesJavaScriptSum` | OK | 1.00 | 10.5s | 158.4k | 295 | 4 | tool=execute_javascript produced expected substring(s) [500500] |

## script-python

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `executesPythonPrimes` | FAIL | 0.00 | 55.6s | 119.9k | 525 | 3 | no TOOL_RESULT from any of [execute_python, python_run, exec_run, client_exec_run, work_exec_run] within 30s |
| `executesPythonStringReverse` | OK | 1.00 | 45.1s | 279.3k | 223 | 7 | tool=execute_python produced expected substring(s) [kramhcneb] |
