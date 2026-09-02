# Vance Benchmark - ollama-qwen3.6-35b__baseline-ScriptCapabilityBenchmark-20260823-222828

- **Started:** 2026-08-23T22:28:28.363718Z
- **Judge:** gemini-gemini-2.5-pro
- **Knobs:** {chatTimeoutS=600, waitBudgetMinS=300}
- **Score model:** v2-graded
- **Total tests:** 5
- **Passed:** 4 / 5 (80%)
- **Average score:** 0.855
- **Total LLM time:** 345.5s
- **Total tokens (in / out):** 1.23M / 3.6k (30 round-trips)


## script-javascript

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `executesJavaScriptJsonTransform` | FAIL | 0.27 | 68.9s | 122.2k | 326 | 3 | no TOOL_RESULT within 300s — 27% — 1/3 checks · missed: tool-executed, expected-output(0/2) |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.50 | 1.50 |  |
| `tool-executed` | check | 0.00 | 2.00 | no TOOL_RESULT from any of [execute_javascript] |
| `expected-output` | counted | 0/2 | 2.00 | missing [50, Feb] |

</details>

| `executesJavaScriptPrimes` | OK | 1.00 | 14.0s | 163.3k | 589 | 4 | tool=execute_javascript, expected output present — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.50 | 1.50 |  |
| `tool-executed` | check | 2.00 | 2.00 | tool=execute_javascript |
| `expected-output` | counted | 2/2 | 2.00 | all present |

</details>

| `executesJavaScriptSum` | OK | 1.00 | 41.3s | 244.5k | 342 | 6 | tool=execute_javascript, expected output present — 100% — 3/3 checks |

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
| `executesPythonPrimes` | OK | 1.00 | 163.7s | 580.3k | 2.2k | 14 | tool=execute_python, expected output present — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.50 | 1.50 |  |
| `tool-executed` | check | 2.00 | 2.00 | tool=execute_python |
| `expected-output` | counted | 2/2 | 2.00 | all present |

</details>

| `executesPythonStringReverse` | OK | 1.00 | 57.6s | 122.3k | 212 | 3 | tool=exec_run, expected output present — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.50 | 1.50 |  |
| `tool-executed` | check | 2.00 | 2.00 | tool=exec_run |
| `expected-output` | counted | 1/1 | 2.00 | all present |

</details>

