# Vance Benchmark - ollama-muse-glimmer-30b-mlx__small-v2-ScriptCapabilityBenchmark-20260816-190154

- **Started:** 2026-08-16T19:01:54.456411Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 5
- **Passed:** 3 / 5 (60%)
- **Average score:** 0.600
- **Total LLM time:** 384.5s
- **Total tokens (in / out):** 612.7k / 4.1k (14 round-trips)


## script-javascript

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `executesJavaScriptJsonTransform` | OK | 1.00 | 80.6s | 120.9k | 551 | 3 | tool=execute_javascript produced expected substring(s) [50, Feb] |
| `executesJavaScriptPrimes` | FAIL | 0.00 | 86.1s | 104.2k | 1.2k | 2 | no TOOL_RESULT from any of [execute_javascript] within 30s |
| `executesJavaScriptSum` | OK | 1.00 | 52.4s | 120.8k | 1.2k | 3 | tool=execute_javascript produced expected substring(s) [500500] |

## script-python

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `executesPythonPrimes` | FAIL | 0.00 | 43.1s | 40.0k | 253 | 1 | no TOOL_RESULT from any of [execute_python, python_run, exec_run, client_exec_run, work_exec_run] within 30s |
| `executesPythonStringReverse` | OK | 1.00 | 122.3s | 226.8k | 834 | 5 | tool=execute_python produced expected substring(s) [kramhcneb] |
