# Vance Benchmark - ollama-qwen3.6-35b-InlineKindsBenchmark-20260913-075619

- **Started:** 2026-09-13T07:56:19.058771Z
- **Judge:** glm-5.3-nvfp4
- **Knobs:** {chatTimeoutS=480, waitBudgetMinS=240}
- **Score model:** v2-graded
- **Total tests:** 4
- **Passed:** 4 / 4 (100%)
- **Average score:** 0.946
- **Total LLM time:** 52.7s
- **Total tokens (in / out):** 352.2k / 970 (8 round-trips)


## inline-kinds

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `rendersChartInline` | OK | 0.86 | 5.8s | 88.0k | 261 | 2 | ```chart fence, 154 chars; judge: Values are correct, but the required chart.chartType: bar structure is missing (uses type: bar) and the March label is misabbreviated. — 86% — 5/6 checks · missed: quality |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `fence-chart` | stage | 1.50 | 1.50 |  |
| `fence-body` | stage | 0.50 | 0.50 |  |
| `elements` | counted | 5/5 | 1.00 | all 5 present |
| `quality` | judged | 1.00 | 2.00 | Values are correct, but the required chart.chartType: bar structure is missing (uses type: bar) and the March label is misabbreviated. |

</details>

| `rendersDiagramInline` | OK | 0.93 | 5.2s | 88.0k | 191 | 2 | ```mermaid fence, 111 chars; judge: Well-formed flowchart connecting User, Form (Login-Formular), Validate (Valid?) and Dashboard in order, with a valid retry edge. — 93% — 5/6 checks · missed: elements(2/4) |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `fence-mermaid` | stage | 1.50 | 1.50 |  |
| `fence-body` | stage | 0.50 | 0.50 |  |
| `elements` | counted | 2/4 | 1.00 | 2/4 (missing: Form, Validate) |
| `quality` | judged | 2.00 | 2.00 | Well-formed flowchart connecting User, Form (Login-Formular), Validate (Valid?) and Dashboard in order, with a valid retry edge. |

</details>

| `rendersGraphInline` | OK | 1.00 | 36.8s | 88.1k | 333 | 2 | ```graph fence, 288 chars; judge: All four nodes A-D and all four directed edges of the diamond are present, with directed explicitly true. — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `fence-graph` | stage | 1.50 | 1.50 |  |
| `fence-body` | stage | 0.50 | 0.50 |  |
| `elements` | counted | 4/4 | 1.00 | all 4 present |
| `quality` | judged | 2.00 | 2.00 | All four nodes A-D and all four directed edges of the diamond are present, with directed explicitly true. |

</details>

| `rendersMindmapInline` | OK | 1.00 | 5.0s | 88.0k | 185 | 2 | ```mindmap fence, 145 chars; judge: Root with all three branches (Compiled, Interpreted, JVM) and all nine language leaves present in nested mindmap form. — 100% — 6/6 checks |

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

