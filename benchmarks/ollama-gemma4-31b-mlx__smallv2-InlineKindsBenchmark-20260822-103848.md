# Vance Benchmark - ollama-gemma4-31b-mlx__smallv2-InlineKindsBenchmark-20260822-103848

- **Started:** 2026-08-22T10:38:48.049258Z
- **Judge:** gemini-gemini-2.5-pro
- **Knobs:** {chatTimeoutS=600, waitBudgetMinS=300}
- **Score model:** v2-graded
- **Total tests:** 4
- **Passed:** 3 / 4 (75%)
- **Average score:** 0.921
- **Total LLM time:** 115.3s
- **Total tokens (in / out):** 432.9k / 1.4k (11 round-trips)


## inline-kinds

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `rendersChartInline` | FAIL | 0.69 | 30.3s | 118.2k | 431 | 3 | ```chart fence, 96 chars; judge: Candidate is not valid Vance chart-YAML and is missing the chart type. — 69% — 4/6 checks · missed: elements(4/5), quality |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `fence-chart` | stage | 1.50 | 1.50 |  |
| `fence-body` | stage | 0.50 | 0.50 |  |
| `elements` | counted | 4/5 | 1.00 | 4/5 (missing: bar) |
| `quality` | judged | 0.00 | 2.00 | Candidate is not valid Vance chart-YAML and is missing the chart type. |

</details>

| `rendersDiagramInline` | OK | 1.00 | 21.5s | 118.0k | 292 | 3 | ```mermaid fence, 164 chars; judge: The candidate provides a valid flowchart with all required nodes and connections. — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `fence-mermaid` | stage | 1.50 | 1.50 |  |
| `fence-body` | stage | 0.50 | 0.50 |  |
| `elements` | counted | 4/4 | 1.00 | all 4 present |
| `quality` | judged | 2.00 | 2.00 | The candidate provides a valid flowchart with all required nodes and connections. |

</details>

| `rendersGraphInline` | OK | 1.00 | 49.5s | 118.3k | 517 | 3 | ```graph fence, 232 chars; judge: Candidate correctly defines all required nodes and edges. — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `fence-graph` | stage | 1.50 | 1.50 |  |
| `fence-body` | stage | 0.50 | 0.50 |  |
| `elements` | counted | 4/4 | 1.00 | all 4 present |
| `quality` | judged | 2.00 | 2.00 | Candidate correctly defines all required nodes and edges. |

</details>

| `rendersMindmapInline` | OK | 1.00 | 14.0s | 78.4k | 190 | 2 | ```mindmap fence, 171 chars; judge: The candidate provides the complete and correct mindmap structure. — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `fence-mindmap` | stage | 1.50 | 1.50 |  |
| `fence-body` | stage | 0.50 | 0.50 |  |
| `elements` | counted | 12/12 | 1.00 | all 12 present |
| `quality` | judged | 2.00 | 2.00 | The candidate provides the complete and correct mindmap structure. |

</details>

