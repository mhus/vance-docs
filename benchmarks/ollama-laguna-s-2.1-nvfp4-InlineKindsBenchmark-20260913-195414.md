# Vance Benchmark - ollama-laguna-s-2.1-nvfp4-InlineKindsBenchmark-20260913-195414

- **Started:** 2026-09-13T19:54:14.948848Z
- **Judge:** glm-5.3-nvfp4
- **Knobs:** {chatTimeoutS=480, waitBudgetMinS=240}
- **Score model:** v2-graded
- **Total tests:** 4
- **Passed:** 4 / 4 (100%)
- **Average score:** 1.000
- **Total LLM time:** 73.2s
- **Total tokens (in / out):** 607.8k / 1.1k (11 round-trips)


## inline-kinds

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `rendersChartInline` | OK | 1.00 | 17.4s | 168.0k | 407 | 3 | ```chart fence, 314 chars; judge: Vance bar chart YAML with chartType bar and all four data points (Jan=10, Feb=25, Maerz=15, Apr=30) correctly labelled. — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `fence-chart` | stage | 1.50 | 1.50 |  |
| `fence-body` | stage | 0.50 | 0.50 |  |
| `elements` | counted | 5/5 | 1.00 | all 5 present |
| `quality` | judged | 2.00 | 2.00 | Vance bar chart YAML with chartType bar and all four data points (Jan=10, Feb=25, Maerz=15, Apr=30) correctly labelled. |

</details>

| `rendersDiagramInline` | OK | 1.00 | 5.1s | 108.2k | 183 | 2 | ```mermaid fence, 99 chars; judge: Well-formed flowchart TD with User, Form, Validate, and Dashboard nodes connected in the required order. — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `fence-mermaid` | stage | 1.50 | 1.50 |  |
| `fence-body` | stage | 0.50 | 0.50 |  |
| `elements` | counted | 4/4 | 1.00 | all 4 present |
| `quality` | judged | 2.00 | 2.00 | Well-formed flowchart TD with User, Form, Validate, and Dashboard nodes connected in the required order. |

</details>

| `rendersGraphInline` | OK | 1.00 | 36.7s | 108.3k | 240 | 2 | ```graph fence, 165 chars; judge: Declares exactly nodes A, B, C, D and the four required directed edges forming the diamond. — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `fence-graph` | stage | 1.50 | 1.50 |  |
| `fence-body` | stage | 0.50 | 0.50 |  |
| `elements` | counted | 4/4 | 1.00 | all 4 present |
| `quality` | judged | 2.00 | 2.00 | Declares exactly nodes A, B, C, D and the four required directed edges forming the diamond. |

</details>

| `rendersMindmapInline` | OK | 1.00 | 14.1s | 223.3k | 248 | 4 | ```mindmap fence, 163 chars; judge: Root with all three branches and all nine language leaves present in nested-bullet form. — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `fence-mindmap` | stage | 1.50 | 1.50 |  |
| `fence-body` | stage | 0.50 | 0.50 |  |
| `elements` | counted | 12/12 | 1.00 | all 12 present |
| `quality` | judged | 2.00 | 2.00 | Root with all three branches and all nine language leaves present in nested-bullet form. |

</details>

