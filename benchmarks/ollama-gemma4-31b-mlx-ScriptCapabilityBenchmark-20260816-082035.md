# Vance Benchmark - ollama-gemma4-31b-mlx-ScriptCapabilityBenchmark-20260816-082035

- **Started:** 2026-08-16T08:20:35.681799Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 5
- **Passed:** 5 / 5 (100%)
- **Average score:** 1.000
- **Total LLM time:** 780.6s
- **Total tokens (in / out):** 577.1k / 1.6k (15 round-trips)


## script-javascript

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `executesJavaScriptJsonTransform` | OK | 1.00 | 147.2s | 115.4k | 331 | 3 | tool=execute_javascript produced expected substring(s) [50, Feb] |
| `executesJavaScriptPrimes` | OK | 1.00 | 147.7s | 115.4k | 408 | 3 | tool=execute_javascript produced expected substring(s) [97, 2] |
| `executesJavaScriptSum` | OK | 1.00 | 134.5s | 115.2k | 227 | 3 | tool=execute_javascript produced expected substring(s) [500500] |

## script-python

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `executesPythonPrimes` | OK | 1.00 | 207.0s | 115.7k | 426 | 3 | tool=execute_python produced expected substring(s) [97, 2] |
| `executesPythonStringReverse` | OK | 1.00 | 144.2s | 115.4k | 197 | 3 | tool=execute_python produced expected substring(s) [kramhcneb] |
