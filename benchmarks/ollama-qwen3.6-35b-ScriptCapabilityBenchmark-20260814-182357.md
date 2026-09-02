# Vance Benchmark - ollama-qwen3.6-35b-ScriptCapabilityBenchmark-20260814-182357

- **Started:** 2026-08-14T18:23:57.771333Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 5
- **Passed:** 2 / 5 (40%)
- **Average score:** 0.400
- **Total LLM time:** 312.4s
- **Total tokens (in / out):** 946.3k / 2.3k (19 round-trips)


## script-javascript

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `executesJavaScriptJsonTransform` | FAIL | 0.00 | 52.5s | 149.0k | 309 | 3 | no TOOL_RESULT from any of [execute_javascript] within 30s |
| `executesJavaScriptPrimes` | OK | 1.00 | 14.4s | 149.2k | 518 | 3 | tool=execute_javascript produced expected substring(s) [97, 2] |
| `executesJavaScriptSum` | OK | 1.00 | 11.8s | 248.6k | 309 | 5 | tool=execute_javascript produced expected substring(s) [500500] |

## script-python

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `executesPythonPrimes` | FAIL | 0.00 | 136.2s | 200.2k | 767 | 4 | tool=exec_run ran but result missing expected substring(s) [97] — head: {"ok":false,"error":"TOOL CALL FAILED: Client tool 'client_exec_run' failed: Sandbox: 'client_exec_run' on command 'python3 -c \"\ndef primes_up_to(n):\n    sieve = [True] * (n + 1)\n    sieve[0] = si… |
| `executesPythonStringReverse` | FAIL | 0.00 | 97.5s | 199.4k | 394 | 4 | tool=exec_run ran but result missing expected substring(s) [kramhcneb] — head: {"ok":false,"error":"TOOL CALL FAILED: Client tool 'client_exec_run' failed: Sandbox: 'client_exec_run' on command 'python3 -c \"print('benchmark'[::-1])\"' is not permitted (no matching allow rule, a… |
