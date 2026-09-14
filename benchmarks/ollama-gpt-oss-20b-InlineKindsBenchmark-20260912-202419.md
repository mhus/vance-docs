# Vance Benchmark - ollama-gpt-oss-20b-InlineKindsBenchmark-20260912-202419

- **Started:** 2026-09-12T20:24:19.973976Z
- **Judge:** glm-5.3-nvfp4
- **Knobs:** {chatTimeoutS=480, waitBudgetMinS=240}
- **Score model:** v2-graded
- **Total tests:** 4
- **Passed:** 4 / 4 (100%)
- **Average score:** 0.929
- **Total LLM time:** 23.4s
- **Total tokens (in / out):** 296.7k / 1.4k (8 round-trips)


## inline-kinds

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `rendersChartInline` | OK | 0.86 | 7.2s | 74.1k | 515 | 2 | ```chart fence, 77 chars; judge: All four data points are present and correct, but the required Vance structure chart.chartType: bar is missing; candidate uses a top-level type: bar instead. — 86% — 5/6 checks · missed: quality |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `fence-chart` | stage | 1.50 | 1.50 |  |
| `fence-body` | stage | 0.50 | 0.50 |  |
| `elements` | counted | 5/5 | 1.00 | all 5 present |
| `quality` | judged | 1.00 | 2.00 | All four data points are present and correct, but the required Vance structure chart.chartType: bar is missing; candidate uses a top-level type: bar instead. |

</details>

| `rendersDiagramInline` | OK | 0.86 | 5.1s | 111.5k | 288 | 3 | ```mermaid fence, 77 chars; judge: All four nodes appear in the correct order with valid syntax, but it uses the 'graph TD' declaration instead of the required 'flowchart' keyword. — 86% — 5/6 checks · missed: quality |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `fence-mermaid` | stage | 1.50 | 1.50 |  |
| `fence-body` | stage | 0.50 | 0.50 |  |
| `elements` | counted | 4/4 | 1.00 | all 4 present |
| `quality` | judged | 1.00 | 2.00 | All four nodes appear in the correct order with valid syntax, but it uses the 'graph TD' declaration instead of the required 'flowchart' keyword. |

</details>

| `rendersGraphInline` | OK | 1.00 | 9.3s | 74.1k | 521 | 2 | ```graph fence, 217 chars; judge: Declares exactly the four nodes A-D and the four directed edges of the diamond. — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `fence-graph` | stage | 1.50 | 1.50 |  |
| `fence-body` | stage | 0.50 | 0.50 |  |
| `elements` | counted | 4/4 | 1.00 | all 4 present |
| `quality` | judged | 2.00 | 2.00 | Declares exactly the four nodes A-D and the four directed edges of the diamond. |

</details>

| `rendersMindmapInline` | OK | 1.00 | 1.7s | 37.0k | 110 | 1 | ```mindmap fence, 122 chars; judge: Root with all three branches (compiled, interpreted, jvm) and all nine required leaves present in nested form. — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `fence-mindmap` | stage | 1.50 | 1.50 |  |
| `fence-body` | stage | 0.50 | 0.50 |  |
| `elements` | counted | 12/12 | 1.00 | all 12 present |
| `quality` | judged | 2.00 | 2.00 | Root with all three branches (compiled, interpreted, jvm) and all nine required leaves present in nested form. |

</details>

