# Vance Benchmark - ollama-gemma4-31b-mlx-InlineKindsBenchmark-20260913-000739

- **Started:** 2026-09-13T00:07:39.141144Z
- **Judge:** glm-5.3-nvfp4
- **Knobs:** {chatTimeoutS=480, waitBudgetMinS=240}
- **Score model:** v2-graded
- **Total tests:** 4
- **Passed:** 4 / 4 (100%)
- **Average score:** 0.929
- **Total LLM time:** 110.6s
- **Total tokens (in / out):** 430.2k / 1.4k (10 round-trips)


## inline-kinds

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `rendersChartInline` | OK | 0.86 | 15.6s | 42.7k | 138 | 1 | ```chart fence, 152 chars; judge: All four data points are correct, but the required Vance structure with chart.chartType: bar is absent; candidate uses kind: bar instead. — 86% — 5/6 checks · missed: quality |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `fence-chart` | stage | 1.50 | 1.50 |  |
| `fence-body` | stage | 0.50 | 0.50 |  |
| `elements` | counted | 5/5 | 1.00 | all 5 present |
| `quality` | judged | 1.00 | 2.00 | All four data points are correct, but the required Vance structure with chart.chartType: bar is absent; candidate uses kind: bar instead. |

</details>

| `rendersDiagramInline` | OK | 0.86 | 23.0s | 129.0k | 265 | 3 | ```mermaid fence, 142 chars; judge: All four nodes appear in the correct order and the syntax is valid, but it uses a 'graph TD' declaration instead of the required 'flowchart' declaration. — 86% — 5/6 checks · missed: quality |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `fence-mermaid` | stage | 1.50 | 1.50 |  |
| `fence-body` | stage | 0.50 | 0.50 |  |
| `elements` | counted | 4/4 | 1.00 | all 4 present |
| `quality` | judged | 1.00 | 2.00 | All four nodes appear in the correct order and the syntax is valid, but it uses a 'graph TD' declaration instead of the required 'flowchart' declaration. |

</details>

| `rendersGraphInline` | OK | 1.00 | 39.5s | 129.3k | 513 | 3 | ```graph fence, 217 chars; judge: All four nodes A-D and all four directed edges of the diamond are present. — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `fence-graph` | stage | 1.50 | 1.50 |  |
| `fence-body` | stage | 0.50 | 0.50 |  |
| `elements` | counted | 4/4 | 1.00 | all 4 present |
| `quality` | judged | 2.00 | 2.00 | All four nodes A-D and all four directed edges of the diamond are present. |

</details>

| `rendersMindmapInline` | OK | 1.00 | 32.5s | 129.2k | 442 | 3 | ```mindmap fence, 171 chars; judge: Full structure present: root with Compiled, Interpreted, and JVM branches and all nine language leaves; the extra top title line removes nothing. — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `fence-mindmap` | stage | 1.50 | 1.50 |  |
| `fence-body` | stage | 0.50 | 0.50 |  |
| `elements` | counted | 12/12 | 1.00 | all 12 present |
| `quality` | judged | 2.00 | 2.00 | Full structure present: root with Compiled, Interpreted, and JVM branches and all nine language leaves; the extra top title line removes nothing. |

</details>

