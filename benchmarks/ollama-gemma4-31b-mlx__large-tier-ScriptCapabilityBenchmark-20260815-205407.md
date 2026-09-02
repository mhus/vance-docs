# Vance Benchmark - ollama-gemma4-31b-mlx__large-tier-ScriptCapabilityBenchmark-20260815-205407

- **Started:** 2026-08-15T20:54:07.375370Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 5
- **Passed:** 5 / 5 (100%)
- **Average score:** 1.000
- **Total LLM time:** 862.8s
- **Total tokens (in / out):** 833.6k / 1.4k (17 round-trips)


## script-javascript

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `executesJavaScriptJsonTransform` | OK | 1.00 | 151.8s | 147.0k | 261 | 3 | tool=execute_javascript produced expected substring(s) [50, Feb] |
| `executesJavaScriptPrimes` | OK | 1.00 | 157.5s | 146.9k | 400 | 3 | tool=execute_javascript produced expected substring(s) [97, 2] |
| `executesJavaScriptSum` | OK | 1.00 | 144.4s | 147.1k | 226 | 3 | tool=execute_javascript produced expected substring(s) [500500] |

## script-python

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `executesPythonPrimes` | OK | 1.00 | 240.3s | 196.4k | 340 | 4 | tool=execute_python produced expected substring(s) [97, 2] |
| `executesPythonStringReverse` | OK | 1.00 | 168.9s | 196.2k | 190 | 4 | tool=execute_python produced expected substring(s) [kramhcneb] |
