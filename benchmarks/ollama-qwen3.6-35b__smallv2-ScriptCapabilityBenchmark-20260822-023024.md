# Vance Benchmark - ollama-qwen3.6-35b__smallv2-ScriptCapabilityBenchmark-20260822-023024

- **Started:** 2026-08-22T02:30:24.278506Z
- **Judge:** gemini-gemini-2.5-pro
- **Knobs:** {chatTimeoutS=600, waitBudgetMinS=300}
- **Score model:** v2-graded
- **Total tests:** 5
- **Passed:** 3 / 5 (60%)
- **Average score:** 0.709
- **Total LLM time:** 237.9s
- **Total tokens (in / out):** 813.1k / 2.0k (20 round-trips)


## script-javascript

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `executesJavaScriptJsonTransform` | OK | 1.00 | 40.0s | 162.2k | 381 | 4 | tool=execute_javascript, expected output present — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.50 | 1.50 |  |
| `tool-executed` | check | 2.00 | 2.00 | tool=execute_javascript |
| `expected-output` | counted | 2/2 | 2.00 | all present |

</details>

| `executesJavaScriptPrimes` | FAIL | 0.27 | 39.7s | 122.7k | 589 | 3 | no TOOL_RESULT within 300s — 27% — 1/3 checks · missed: tool-executed, expected-output(0/2) |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.50 | 1.50 |  |
| `tool-executed` | check | 0.00 | 2.00 | no TOOL_RESULT from any of [execute_javascript] |
| `expected-output` | counted | 0/2 | 2.00 | missing [97, 2] |

</details>

| `executesJavaScriptSum` | OK | 1.00 | 58.6s | 161.8k | 245 | 4 | tool=execute_javascript, expected output present — 100% — 3/3 checks |

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
| `executesPythonPrimes` | OK | 1.00 | 59.0s | 122.5k | 514 | 3 | tool=exec_run, expected output present — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.50 | 1.50 |  |
| `tool-executed` | check | 2.00 | 2.00 | tool=exec_run |
| `expected-output` | counted | 2/2 | 2.00 | all present |

</details>

| `executesPythonStringReverse` | FAIL | 0.27 | 40.6s | 243.9k | 235 | 6 | no TOOL_RESULT within 300s — 27% — 1/3 checks · missed: tool-executed, expected-output(0/1) |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.50 | 1.50 |  |
| `tool-executed` | check | 0.00 | 2.00 | no TOOL_RESULT from any of [execute_python, python_run, exec_run, client_exec_run, work_exec_run] |
| `expected-output` | counted | 0/1 | 2.00 | missing [kramhcneb] |

</details>

