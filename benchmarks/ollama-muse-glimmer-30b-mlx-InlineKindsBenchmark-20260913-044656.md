# Vance Benchmark - ollama-muse-glimmer-30b-mlx-InlineKindsBenchmark-20260913-044656

- **Started:** 2026-09-13T04:46:56.556292Z
- **Judge:** glm-5.3-nvfp4
- **Knobs:** {chatTimeoutS=480, waitBudgetMinS=240}
- **Score model:** v2-graded
- **Total tests:** 4
- **Passed:** 4 / 4 (100%)
- **Average score:** 1.000
- **Total LLM time:** 90.4s
- **Total tokens (in / out):** 223.9k / 1.6k (5 round-trips)


## inline-kinds

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `rendersChartInline` | OK | 1.00 | 25.3s | 91.2k | 589 | 2 | ```chart fence, 281 chars; judge: Vance bar chart YAML with chart.chartType: bar and all four data points (Jan=10, Feb=25, Maerz=15, Apr=30) correctly labelled. — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `fence-chart` | stage | 1.50 | 1.50 |  |
| `fence-body` | stage | 0.50 | 0.50 |  |
| `elements` | counted | 5/5 | 1.00 | all 5 present |
| `quality` | judged | 2.00 | 2.00 | Vance bar chart YAML with chart.chartType: bar and all four data points (Jan=10, Feb=25, Maerz=15, Apr=30) correctly labelled. |

</details>

| `rendersDiagramInline` | OK | 1.00 | 8.5s | 44.2k | 307 | 1 | ```mermaid fence, 185 chars; judge: Well-formed flowchart with all four nodes User, Form, Validate, Dashboard connected in the required order. — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `fence-mermaid` | stage | 1.50 | 1.50 |  |
| `fence-body` | stage | 0.50 | 0.50 |  |
| `elements` | counted | 4/4 | 1.00 | all 4 present |
| `quality` | judged | 2.00 | 2.00 | Well-formed flowchart with all four nodes User, Form, Validate, Dashboard connected in the required order. |

</details>

| `rendersGraphInline` | OK | 1.00 | 43.0s | 44.2k | 333 | 1 | ```graph fence, 232 chars; judge: Declares exactly the four nodes A, B, C, D and the four directed edges A->B, A->C, B->D, C->D, matching the required diamond. — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `fence-graph` | stage | 1.50 | 1.50 |  |
| `fence-body` | stage | 0.50 | 0.50 |  |
| `elements` | counted | 4/4 | 1.00 | all 4 present |
| `quality` | judged | 2.00 | 2.00 | Declares exactly the four nodes A, B, C, D and the four directed edges A->B, A->C, B->D, C->D, matching the required diamond. |

</details>

| `rendersMindmapInline` | OK | 1.00 | 13.6s | 44.2k | 355 | 1 | ```mindmap fence, 179 chars; judge: Root with all three branches (Compiled, Interpreted, JVM) and all nine language leaves present in nested form. — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `fence-mindmap` | stage | 1.50 | 1.50 |  |
| `fence-body` | stage | 0.50 | 0.50 |  |
| `elements` | counted | 12/12 | 1.00 | all 12 present |
| `quality` | judged | 2.00 | 2.00 | Root with all three branches (Compiled, Interpreted, JVM) and all nine language leaves present in nested form. |

</details>

