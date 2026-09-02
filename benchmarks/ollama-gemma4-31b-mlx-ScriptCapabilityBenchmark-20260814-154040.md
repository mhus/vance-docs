# Vance Benchmark - ollama-gemma4-31b-mlx-ScriptCapabilityBenchmark-20260814-154040

- **Started:** 2026-08-14T15:40:40.905835Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 5
- **Passed:** 5 / 5 (100%)
- **Average score:** 1.000
- **Total LLM time:** 837.3s
- **Total tokens (in / out):** 783.2k / 1.3k (16 round-trips)


## script-javascript

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `executesJavaScriptJsonTransform` | OK | 1.00 | 146.3s | 146.8k | 253 | 3 | tool=execute_javascript produced expected substring(s) [50, Feb] |
| `executesJavaScriptPrimes` | OK | 1.00 | 153.1s | 146.7k | 409 | 3 | tool=execute_javascript produced expected substring(s) [97, 2] |
| `executesJavaScriptSum` | OK | 1.00 | 132.2s | 97.5k | 141 | 2 | tool=execute_javascript produced expected substring(s) [500500] |

## script-python

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `executesPythonPrimes` | OK | 1.00 | 243.9s | 196.2k | 338 | 4 | tool=execute_python produced expected substring(s) [97, 2] |
| `executesPythonStringReverse` | OK | 1.00 | 161.9s | 196.0k | 174 | 4 | tool=execute_python produced expected substring(s) [kramhcneb] |
