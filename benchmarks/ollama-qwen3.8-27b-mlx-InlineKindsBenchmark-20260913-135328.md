# Vance Benchmark - ollama-qwen3.8-27b-mlx-InlineKindsBenchmark-20260913-135328

- **Started:** 2026-09-13T13:53:28.440001Z
- **Judge:** glm-5.3-nvfp4
- **Knobs:** {chatTimeoutS=480, waitBudgetMinS=240}
- **Score model:** v2-graded
- **Total tests:** 4
- **Passed:** 4 / 4 (100%)
- **Average score:** 0.964
- **Total LLM time:** 89.9s
- **Total tokens (in / out):** 175.6k / 656 (4 round-trips)


## inline-kinds

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `rendersChartInline` | OK | 0.86 | 9.7s | 43.9k | 157 | 1 | ```chart fence, 66 chars; judge: Not Vance format (type: bar instead of chart.chartType: bar) and third label abbreviated (Maer, not Maerz/Mar); 3 of 4 data points correct. — 86% — 5/6 checks · missed: quality |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `fence-chart` | stage | 1.50 | 1.50 |  |
| `fence-body` | stage | 0.50 | 0.50 |  |
| `elements` | counted | 5/5 | 1.00 | all 5 present |
| `quality` | judged | 1.00 | 2.00 | Not Vance format (type: bar instead of chart.chartType: bar) and third label abbreviated (Maer, not Maerz/Mar); 3 of 4 data points correct. |

</details>

| `rendersDiagramInline` | OK | 1.00 | 4.5s | 43.9k | 158 | 1 | ```mermaid fence, 151 chars; judge: Valid flowchart TD with all four nodes User, Form, Validate, Dashboard connected in order and well-formed syntax. — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `fence-mermaid` | stage | 1.50 | 1.50 |  |
| `fence-body` | stage | 0.50 | 0.50 |  |
| `elements` | counted | 4/4 | 1.00 | all 4 present |
| `quality` | judged | 2.00 | 2.00 | Valid flowchart TD with all four nodes User, Form, Validate, Dashboard connected in order and well-formed syntax. |

</details>

| `rendersGraphInline` | OK | 1.00 | 66.3s | 43.9k | 203 | 1 | ```graph fence, 232 chars; judge: Declares exactly the four nodes A-D and the four directed edges A->B, A->C, B->D, C->D, matching the required diamond. — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `fence-graph` | stage | 1.50 | 1.50 |  |
| `fence-body` | stage | 0.50 | 0.50 |  |
| `elements` | counted | 4/4 | 1.00 | all 4 present |
| `quality` | judged | 2.00 | 2.00 | Declares exactly the four nodes A-D and the four directed edges A->B, A->C, B->D, C->D, matching the required diamond. |

</details>

| `rendersMindmapInline` | OK | 1.00 | 9.5s | 43.9k | 138 | 1 | ```mindmap fence, 145 chars; judge: Root with all three branches (Compiled, Interpreted, JVM) and all nine language leaves present in nested mindmap form. — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `fence-mindmap` | stage | 1.50 | 1.50 |  |
| `fence-body` | stage | 0.50 | 0.50 |  |
| `elements` | counted | 12/12 | 1.00 | all 12 present |
| `quality` | judged | 2.00 | 2.00 | Root with all three branches (Compiled, Interpreted, JVM) and all nine language leaves present in nested mindmap form. |

</details>

