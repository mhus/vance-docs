# Vance Benchmark - ollama-gpt-oss-20b__baseline-InlineKindsBenchmark-20260823-234053

- **Started:** 2026-08-23T23:40:53.598873Z
- **Judge:** gemini-gemini-2.5-pro
- **Knobs:** {chatTimeoutS=600, waitBudgetMinS=300}
- **Score model:** v2-graded
- **Total tests:** 4
- **Passed:** 4 / 4 (100%)
- **Average score:** 0.982
- **Total LLM time:** 30.5s
- **Total tokens (in / out):** 270.7k / 2.4k (8 round-trips)


## inline-kinds

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `rendersChartInline` | OK | 0.93 | 5.8s | 67.6k | 425 | 2 | ```chart fence, 126 chars; judge: The chart type was specified with the key 'type' instead of 'chart.chartType'. — 93% — 5/6 checks · missed: quality |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `fence-chart` | stage | 1.50 | 1.50 |  |
| `fence-body` | stage | 0.50 | 0.50 |  |
| `elements` | counted | 5/5 | 1.00 | all 5 present |
| `quality` | judged | 1.50 | 2.00 | The chart type was specified with the key 'type' instead of 'chart.chartType'. |

</details>

| `rendersDiagramInline` | OK | 1.00 | 7.0s | 135.6k | 415 | 4 | ```mermaid fence, 81 chars; judge: The flowchart correctly implements the required nodes and connections. — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `fence-mermaid` | stage | 1.50 | 1.50 |  |
| `fence-body` | stage | 0.50 | 0.50 |  |
| `elements` | counted | 4/4 | 1.00 | all 4 present |
| `quality` | judged | 2.00 | 2.00 | The flowchart correctly implements the required nodes and connections. |

</details>

| `rendersGraphInline` | OK | 1.00 | 6.3s | 33.7k | 518 | 1 | ```graph fence, 217 chars; judge: Candidate correctly defines all required nodes and edges. — 100% — 6/6 checks |

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

| `rendersMindmapInline` | OK | 1.00 | 11.4s | 33.7k | 999 | 1 | ```mindmap fence, 146 chars; judge: Candidate correctly structured the mindmap with all required branches and leaves. — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `fence-mindmap` | stage | 1.50 | 1.50 |  |
| `fence-body` | stage | 0.50 | 0.50 |  |
| `elements` | counted | 12/12 | 1.00 | all 12 present |
| `quality` | judged | 2.00 | 2.00 | Candidate correctly structured the mindmap with all required branches and leaves. |

</details>

