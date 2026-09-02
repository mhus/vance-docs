# Vance Benchmark - ollama-qwen3.6-35b__smallv2-ScriptCapabilityBenchmark-20260822-005104

- **Started:** 2026-08-22T00:51:04.614020Z
- **Judge:** gemini-gemini-2.5-pro
- **Knobs:** {chatTimeoutS=600, waitBudgetMinS=300}
- **Score model:** v2-graded
- **Total tests:** 5
- **Passed:** 4 / 5 (80%)
- **Average score:** 0.855
- **Total LLM time:** 218.5s
- **Total tokens (in / out):** 854.0k / 2.9k (21 round-trips)


## script-javascript

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `executesJavaScriptJsonTransform` | FAIL | 0.27 | 44.6s | 204.5k | 851 | 5 | no TOOL_RESULT within 300s — 27% — 1/3 checks · missed: tool-executed, expected-output(0/2) |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.50 | 1.50 |  |
| `tool-executed` | check | 0.00 | 2.00 | no TOOL_RESULT from any of [execute_javascript] |
| `expected-output` | counted | 0/2 | 2.00 | missing [50, Feb] |

</details>

| `executesJavaScriptPrimes` | OK | 1.00 | 18.0s | 203.2k | 707 | 5 | tool=execute_javascript, expected output present — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.50 | 1.50 |  |
| `tool-executed` | check | 2.00 | 2.00 | tool=execute_javascript |
| `expected-output` | counted | 2/2 | 2.00 | all present |

</details>

| `executesJavaScriptSum` | OK | 1.00 | 35.3s | 161.8k | 262 | 4 | tool=execute_javascript, expected output present — 100% — 3/3 checks |

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
| `executesPythonPrimes` | OK | 1.00 | 64.4s | 162.9k | 867 | 4 | tool=execute_python, expected output present — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.50 | 1.50 |  |
| `tool-executed` | check | 2.00 | 2.00 | tool=execute_python |
| `expected-output` | counted | 2/2 | 2.00 | all present |

</details>

| `executesPythonStringReverse` | OK | 1.00 | 56.2s | 121.6k | 163 | 3 | tool=exec_run, expected output present — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.50 | 1.50 |  |
| `tool-executed` | check | 2.00 | 2.00 | tool=exec_run |
| `expected-output` | counted | 1/1 | 2.00 | all present |

</details>

