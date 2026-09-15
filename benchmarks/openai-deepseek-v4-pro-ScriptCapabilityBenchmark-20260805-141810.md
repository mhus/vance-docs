# Vance Benchmark - openai-deepseek-v4-pro-ScriptCapabilityBenchmark-20260805-141810

- **Started:** 2026-08-05T14:18:10.630659Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 5
- **Passed:** 4 / 5 (80%)
- **Average score:** 0.800
- **Total LLM time:** 40.6s
- **Total tokens (in / out):** 293.6k / 1.7k (12 round-trips)


## script-javascript

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `executesJavaScriptJsonTransform` | OK | 1.00 | 6.6s | 48.8k | 261 | 2 | tool=execute_javascript produced expected substring(s) [50, Feb] |
| `executesJavaScriptPrimes` | OK | 1.00 | 5.1s | 49.0k | 391 | 2 | tool=execute_javascript produced expected substring(s) [97, 2] |
| `executesJavaScriptSum` | OK | 1.00 | 9.2s | 48.8k | 218 | 2 | tool=execute_javascript produced expected substring(s) [500500] |

## script-python

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `executesPythonPrimes` | FAIL | 0.00 | 10.5s | 73.7k | 523 | 3 | no TOOL_RESULT from any of [execute_python, python_run, exec_run] within 30s |
| `executesPythonStringReverse` | OK | 1.00 | 9.2s | 73.3k | 265 | 3 | tool=execute_python produced expected substring(s) [kramhcneb] |
