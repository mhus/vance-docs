# Vance Benchmark - ollama-qwen3.6-35b-ScriptCapabilityBenchmark-20260913-082745

- **Started:** 2026-09-13T08:27:45.334067Z
- **Judge:** glm-5.3-nvfp4
- **Knobs:** {chatTimeoutS=480, waitBudgetMinS=240}
- **Score model:** v2-graded
- **Total tests:** 5
- **Passed:** 4 / 5 (80%)
- **Average score:** 0.855
- **Total LLM time:** 194.1s
- **Total tokens (in / out):** 1.11M / 3.0k (25 round-trips)


## script-javascript

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `executesJavaScriptJsonTransform` | FAIL | 0.27 | 44.3s | 132.7k | 370 | 3 | no TOOL_RESULT within 240s — 27% — 1/3 checks · missed: tool-executed, expected-output(0/2) |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.50 | 1.50 |  |
| `tool-executed` | check | 0.00 | 2.00 | no TOOL_RESULT from any of [execute_javascript] |
| `expected-output` | counted | 0/2 | 2.00 | missing [50, Feb] |

</details>

| `executesJavaScriptPrimes` | OK | 1.00 | 16.6s | 177.8k | 783 | 4 | tool=execute_javascript, expected output present — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.50 | 1.50 |  |
| `tool-executed` | check | 2.00 | 2.00 | tool=execute_javascript |
| `expected-output` | counted | 2/2 | 2.00 | all present |

</details>

| `executesJavaScriptSum` | OK | 1.00 | 8.8s | 176.8k | 286 | 4 | tool=execute_javascript, expected output present — 100% — 3/3 checks |

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
| `executesPythonPrimes` | OK | 1.00 | 78.5s | 267.7k | 992 | 6 | tool=execute_python, expected output present — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.50 | 1.50 |  |
| `tool-executed` | check | 2.00 | 2.00 | tool=execute_python |
| `expected-output` | counted | 2/2 | 2.00 | all present |

</details>

| `executesPythonStringReverse` | OK | 1.00 | 45.9s | 356.5k | 556 | 8 | tool=execute_python, expected output present — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.50 | 1.50 |  |
| `tool-executed` | check | 2.00 | 2.00 | tool=execute_python |
| `expected-output` | counted | 1/1 | 2.00 | all present |

</details>

