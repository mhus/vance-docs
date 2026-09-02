# Vance Benchmark - ollama-muse-glimmer-30b-mlx-ScriptCapabilityBenchmark-20260815-182457

- **Started:** 2026-08-15T18:24:57.109736Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 5
- **Passed:** 4 / 5 (80%)
- **Average score:** 0.800
- **Total LLM time:** 495.7s
- **Total tokens (in / out):** 869.2k / 4.5k (16 round-trips)


## script-javascript

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `executesJavaScriptJsonTransform` | FAIL | 0.00 | 58.1s | 49.4k | 518 | 1 | no TOOL_RESULT from any of [execute_javascript] within 30s |
| `executesJavaScriptPrimes` | OK | 1.00 | 17.4s | 149.1k | 515 | 3 | tool=execute_javascript produced expected substring(s) [97, 2] |
| `executesJavaScriptSum` | OK | 1.00 | 55.3s | 149.0k | 449 | 3 | tool=execute_javascript produced expected substring(s) [500500] |

## script-python

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `executesPythonPrimes` | OK | 1.00 | 225.6s | 199.5k | 1.3k | 4 | tool=execute_python produced expected substring(s) [97, 2] |
| `executesPythonStringReverse` | OK | 1.00 | 139.4s | 322.2k | 1.7k | 5 | tool=execute_python produced expected substring(s) [kramhcneb] |
