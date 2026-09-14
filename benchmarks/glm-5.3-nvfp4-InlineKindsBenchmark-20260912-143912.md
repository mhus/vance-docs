# Vance Benchmark - glm-5.3-nvfp4-InlineKindsBenchmark-20260912-143912

- **Started:** 2026-09-12T14:39:12.363594Z
- **Judge:** glm-5.3-nvfp4
- **Score model:** v2-graded
- **Total tests:** 4
- **Passed:** 4 / 4 (100%)
- **Average score:** 1.000
- **Total LLM time:** 13.4s
- **Total tokens (in / out):** 430.4k / 2.1k (8 round-trips)


## inline-kinds

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `rendersChartInline` | OK | 1.00 | 2.6s | 108.3k | 530 | 2 | ```chart fence, 268 chars; judge: Valid Vance chart-YAML with chart.chartType bar and all four data points (Jan=10, Feb=25, Maerz=15, Apr=30) correctly labelled. — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `fence-chart` | stage | 1.50 | 1.50 |  |
| `fence-body` | stage | 0.50 | 0.50 |  |
| `elements` | counted | 5/5 | 1.00 | all 5 present |
| `quality` | judged | 2.00 | 2.00 | Valid Vance chart-YAML with chart.chartType bar and all four data points (Jan=10, Feb=25, Maerz=15, Apr=30) correctly labelled. |

</details>

| `rendersDiagramInline` | OK | 1.00 | 3.8s | 107.2k | 656 | 2 | ```mermaid fence, 107 chars; judge: Well-formed flowchart with User, Form, Validate, and Dashboard connected in the required order; the extra invalid-loop edge is valid syntax. — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `fence-mermaid` | stage | 1.50 | 1.50 |  |
| `fence-body` | stage | 0.50 | 0.50 |  |
| `elements` | counted | 4/4 | 1.00 | all 4 present |
| `quality` | judged | 2.00 | 2.00 | Well-formed flowchart with User, Form, Validate, and Dashboard connected in the required order; the extra invalid-loop edge is valid syntax. |

</details>

| `rendersGraphInline` | OK | 1.00 | 4.5s | 107.6k | 489 | 2 | ```graph fence, 262 chars; judge: All four nodes A-D and all four directed edges of the diamond are declared exactly, with directedness set to true. — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `fence-graph` | stage | 1.50 | 1.50 |  |
| `fence-body` | stage | 0.50 | 0.50 |  |
| `elements` | counted | 4/4 | 1.00 | all 4 present |
| `quality` | judged | 2.00 | 2.00 | All four nodes A-D and all four directed edges of the diamond are declared exactly, with directedness set to true. |

</details>

| `rendersMindmapInline` | OK | 1.00 | 2.6s | 107.3k | 385 | 2 | ```mindmap fence, 163 chars; judge: Root with all three branches (Compiled, Interpreted, JVM) and all nine language leaves present in nested-bullet form. — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `fence-mindmap` | stage | 1.50 | 1.50 |  |
| `fence-body` | stage | 0.50 | 0.50 |  |
| `elements` | counted | 12/12 | 1.00 | all 12 present |
| `quality` | judged | 2.00 | 2.00 | Root with all three branches (Compiled, Interpreted, JVM) and all nine language leaves present in nested-bullet form. |

</details>

