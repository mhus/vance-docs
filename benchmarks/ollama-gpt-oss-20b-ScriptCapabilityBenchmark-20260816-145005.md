# Vance Benchmark - ollama-gpt-oss-20b-ScriptCapabilityBenchmark-20260816-145005

- **Started:** 2026-08-16T14:50:05.541203Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 5
- **Passed:** 5 / 5 (100%)
- **Average score:** 1.000
- **Total LLM time:** 188.2s
- **Total tokens (in / out):** 898.7k / 4.4k (27 round-trips)


## script-javascript

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `executesJavaScriptJsonTransform` | OK | 1.00 | 37.0s | 165.8k | 900 | 5 | tool=execute_javascript produced expected substring(s) [50, Feb] |
| `executesJavaScriptPrimes` | OK | 1.00 | 28.1s | 199.1k | 1.1k | 6 | tool=execute_javascript produced expected substring(s) [97, 2] |
| `executesJavaScriptSum` | OK | 1.00 | 21.8s | 165.0k | 720 | 5 | tool=execute_javascript produced expected substring(s) [500500] |

## script-python

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `executesPythonPrimes` | OK | 1.00 | 31.6s | 133.7k | 685 | 4 | tool=client_exec_run produced expected substring(s) [97, 2] |
| `executesPythonStringReverse` | OK | 1.00 | 69.6s | 235.0k | 1.0k | 7 | tool=client_exec_run produced expected substring(s) [kramhcneb] |
