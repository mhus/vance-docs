# Vance Benchmark - ollama-gemma4-31b-mlx-ScriptCapabilityBenchmark-20260815-153059

- **Started:** 2026-08-15T15:30:59.799918Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 5
- **Passed:** 5 / 5 (100%)
- **Average score:** 1.000
- **Total LLM time:** 925.2s
- **Total tokens (in / out):** 832.5k / 1.4k (17 round-trips)


## script-javascript

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `executesJavaScriptJsonTransform` | OK | 1.00 | 146.7s | 146.8k | 229 | 3 | tool=execute_javascript produced expected substring(s) [50, Feb] |
| `executesJavaScriptPrimes` | OK | 1.00 | 154.4s | 146.7k | 407 | 3 | tool=execute_javascript produced expected substring(s) [97, 2] |
| `executesJavaScriptSum` | OK | 1.00 | 138.3s | 146.5k | 195 | 3 | tool=execute_javascript produced expected substring(s) [500500] |

## script-python

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `executesPythonPrimes` | OK | 1.00 | 320.6s | 196.3k | 350 | 4 | tool=execute_python produced expected substring(s) [97, 2] |
| `executesPythonStringReverse` | OK | 1.00 | 165.1s | 196.1k | 192 | 4 | tool=execute_python produced expected substring(s) [kramhcneb] |
