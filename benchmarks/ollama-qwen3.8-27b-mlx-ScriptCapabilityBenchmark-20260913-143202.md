# Vance Benchmark - ollama-qwen3.8-27b-mlx-ScriptCapabilityBenchmark-20260913-143202

- **Started:** 2026-09-13T14:32:02.201316Z
- **Judge:** glm-5.3-nvfp4
- **Knobs:** {chatTimeoutS=480, waitBudgetMinS=240}
- **Score model:** v2-graded
- **Total tests:** 5
- **Passed:** 3 / 5 (60%)
- **Average score:** 0.673
- **Total LLM time:** 487.5s
- **Total tokens (in / out):** 443.5k / 1.7k (13 round-trips)


## script-javascript

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `executesJavaScriptJsonTransform` | OK | 1.00 | 226.2s | 132.7k | 300 | 3 | tool=execute_javascript, expected output present — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.50 | 1.50 |  |
| `tool-executed` | check | 2.00 | 2.00 | tool=execute_javascript |
| `expected-output` | counted | 2/2 | 2.00 | all present |

</details>

| `executesJavaScriptPrimes` | FAIL | 0.27 | 6.1s | 43.9k | 195 | 1 | no TOOL_RESULT within 240s — 27% — 1/3 checks · missed: tool-executed, expected-output(0/2) |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.50 | 1.50 |  |
| `tool-executed` | check | 0.00 | 2.00 | no TOOL_RESULT from any of [execute_javascript] |
| `expected-output` | counted | 0/2 | 2.00 | missing [97, 2] |

</details>

| `executesJavaScriptSum` | OK | 1.00 | 65.9s | 132.5k | 248 | 3 | tool=execute_javascript, expected output present — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.50 | 1.50 |  |
| `tool-executed` | check | 2.00 | 2.00 | tool=execute_javascript |
| `expected-output` | counted | 1/1 | 2.00 | all present |

</details>


## script-python

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `executesPythonPrimes` | OK | 0.82 | 106.0s | 90.6k | 806 | 5 | tool=python_run, missing [97] — head: {"id":"bdd2e686","status":"FAILED","command":".venv/bin/python 'primes.py'","durationMs":20,"lastOutputAt":"2026-09-13T14:31:53.678305Z","exitCode":2,"stdoutPath":"/Users/hummel/sources/mhus/vance-wb/… — 82% — 2/3 checks · missed: expected-output(1/2) |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.50 | 1.50 |  |
| `tool-executed` | check | 2.00 | 2.00 | tool=python_run |
| `expected-output` | counted | 1/2 | 2.00 | missing [97] |

</details>

| `executesPythonStringReverse` | FAIL | 0.27 | 83.2s | 43.9k | 103 | 1 | no TOOL_RESULT within 240s — 27% — 1/3 checks · missed: tool-executed, expected-output(0/1) |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.50 | 1.50 |  |
| `tool-executed` | check | 0.00 | 2.00 | no TOOL_RESULT from any of [execute_python, python_run, exec_run, client_exec_run, work_exec_run] |
| `expected-output` | counted | 0/1 | 2.00 | missing [kramhcneb] |

</details>

