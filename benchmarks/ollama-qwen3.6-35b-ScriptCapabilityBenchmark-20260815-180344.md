# Vance Benchmark - ollama-qwen3.6-35b-ScriptCapabilityBenchmark-20260815-180344

- **Started:** 2026-08-15T18:03:44.941576Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 5
- **Passed:** 4 / 5 (80%)
- **Average score:** 0.800
- **Total LLM time:** 192.8s
- **Total tokens (in / out):** 996.9k / 2.2k (20 round-trips)


## script-javascript

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `executesJavaScriptJsonTransform` | OK | 1.00 | 58.3s | 199.2k | 459 | 4 | tool=execute_javascript produced expected substring(s) [50, Feb] |
| `executesJavaScriptPrimes` | FAIL | 0.00 | 15.8s | 149.2k | 544 | 3 | tool=execute_javascript ran but result missing expected substring(s) [97] — head: {"value":null,"durationMs":24} |
| `executesJavaScriptSum` | OK | 1.00 | 13.4s | 248.7k | 338 | 5 | tool=execute_javascript produced expected substring(s) [500500] |

## script-python

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `executesPythonPrimes` | OK | 1.00 | 91.5s | 150.1k | 612 | 3 | tool=exec_run produced expected substring(s) [97, 2] |
| `executesPythonStringReverse` | OK | 1.00 | 13.8s | 249.6k | 285 | 5 | tool=exec_run produced expected substring(s) [kramhcneb] |
