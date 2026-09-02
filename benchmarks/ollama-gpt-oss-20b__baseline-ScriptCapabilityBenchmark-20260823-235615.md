# Vance Benchmark - ollama-gpt-oss-20b__baseline-ScriptCapabilityBenchmark-20260823-235615

- **Started:** 2026-08-23T23:56:15.519857Z
- **Judge:** gemini-gemini-2.5-pro
- **Knobs:** {chatTimeoutS=600, waitBudgetMinS=300}
- **Score model:** v2-graded
- **Total tests:** 5
- **Passed:** 4 / 5 (80%)
- **Average score:** 0.818
- **Total LLM time:** 269.0s
- **Total tokens (in / out):** 1.06M / 8.7k (31 round-trips)


## script-javascript

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `executesJavaScriptJsonTransform` | OK | 1.00 | 34.4s | 136.2k | 470 | 4 | tool=execute_javascript, expected output present — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.50 | 1.50 |  |
| `tool-executed` | check | 2.00 | 2.00 | tool=execute_javascript |
| `expected-output` | counted | 2/2 | 2.00 | all present |

</details>

| `executesJavaScriptPrimes` | OK | 1.00 | 67.7s | 205.5k | 1.1k | 6 | tool=execute_javascript, expected output present — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.50 | 1.50 |  |
| `tool-executed` | check | 2.00 | 2.00 | tool=execute_javascript |
| `expected-output` | counted | 2/2 | 2.00 | all present |

</details>

| `executesJavaScriptSum` | FAIL | 0.27 | 31.7s | 136.0k | 1.9k | 4 | no TOOL_RESULT within 300s — 27% — 1/3 checks · missed: tool-executed, expected-output(0/1) |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.50 | 1.50 |  |
| `tool-executed` | check | 0.00 | 2.00 | no TOOL_RESULT from any of [execute_javascript] |
| `expected-output` | counted | 0/1 | 2.00 | missing [500500] |

</details>


## script-python

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `executesPythonPrimes` | OK | 0.82 | 83.1s | 413.2k | 4.3k | 12 | tool=execute_python, missing [97] — head: {"id":"96f6822b","status":"RUNNING","command":".venv/bin/python '_inline_1787529366863.py'","durationMs":0,"lastOutputAt":"2026-08-23T23:56:06.864688Z","stdoutPath":"/Users/hummel/sources/mhus/vance-w… — 82% — 2/3 checks · missed: expected-output(1/2) |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.50 | 1.50 |  |
| `tool-executed` | check | 2.00 | 2.00 | tool=execute_python |
| `expected-output` | counted | 1/2 | 2.00 | missing [97] |

</details>

| `executesPythonStringReverse` | OK | 1.00 | 52.0s | 171.9k | 1.0k | 5 | tool=client_exec_run, expected output present — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.50 | 1.50 |  |
| `tool-executed` | check | 2.00 | 2.00 | tool=client_exec_run |
| `expected-output` | counted | 1/1 | 2.00 | all present |

</details>

