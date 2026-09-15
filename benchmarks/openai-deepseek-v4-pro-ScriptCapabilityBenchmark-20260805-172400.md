# Vance Benchmark - openai-deepseek-v4-pro-ScriptCapabilityBenchmark-20260805-172400

- **Started:** 2026-08-05T17:24:00.690083Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 5
- **Passed:** 5 / 5 (100%)
- **Average score:** 1.000
- **Total LLM time:** 49.1s
- **Total tokens (in / out):** 269.9k / 1.5k (11 round-trips)


## script-javascript

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `executesJavaScriptJsonTransform` | OK | 1.00 | 9.5s | 49.0k | 265 | 2 | tool=execute_javascript produced expected substring(s) [50, Feb] |
| `executesJavaScriptPrimes` | OK | 1.00 | 11.2s | 49.1k | 379 | 2 | tool=execute_javascript produced expected substring(s) [97, 2] |
| `executesJavaScriptSum` | OK | 1.00 | 9.9s | 49.0k | 171 | 2 | tool=execute_javascript produced expected substring(s) [500500] |

## script-python

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `executesPythonPrimes` | OK | 1.00 | 9.0s | 49.3k | 392 | 2 | tool=client_exec_run produced expected substring(s) [97, 2] |
| `executesPythonStringReverse` | OK | 1.00 | 9.4s | 73.5k | 261 | 3 | tool=execute_python produced expected substring(s) [kramhcneb] |
