# Vance Benchmark - ollama-gpt-oss-20b__large-tier-ScriptCapabilityBenchmark-20260816-170330

- **Started:** 2026-08-16T17:03:30.753671Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 5
- **Passed:** 4 / 5 (80%)
- **Average score:** 0.800
- **Total LLM time:** 777.0s
- **Total tokens (in / out):** 2.10M / 12.8k (48 round-trips)


## script-javascript

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `executesJavaScriptJsonTransform` | OK | 1.00 | 123.3s | 301.5k | 2.1k | 7 | tool=execute_javascript produced expected substring(s) [50, Feb] |
| `executesJavaScriptPrimes` | OK | 1.00 | 32.8s | 214.8k | 909 | 5 | tool=execute_javascript produced expected substring(s) [97, 2] |
| `executesJavaScriptSum` | OK | 1.00 | 28.4s | 128.0k | 917 | 3 | tool=execute_javascript produced expected substring(s) [500500] |

## script-python

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `executesPythonPrimes` | FAIL | 0.00 | 529.1s | 1.24M | 7.9k | 28 | tool=python_run ran but result missing expected substring(s) [97, 2] — head: {"ok":false,"error":"TOOL CALL FAILED: Unknown RootDir: instant-hole"} |
| `executesPythonStringReverse` | OK | 1.00 | 63.4s | 216.4k | 1.0k | 5 | tool=client_exec_run produced expected substring(s) [kramhcneb] |
