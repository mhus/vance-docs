# Vance Benchmark - ollama-qwen3.6-35b__smallv2-InlineKindsBenchmark-20260822-021725

- **Started:** 2026-08-22T02:17:25.560055Z
- **Judge:** gemini-gemini-2.5-pro
- **Knobs:** {chatTimeoutS=600, waitBudgetMinS=300}
- **Score model:** v2-graded
- **Total tests:** 4
- **Passed:** 3 / 4 (75%)
- **Average score:** 0.804
- **Total LLM time:** 46.5s
- **Total tokens (in / out):** 322.3k / 970 (8 round-trips)


## inline-kinds

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `rendersChartInline` | OK | 1.00 | 6.4s | 80.6k | 297 | 2 | ```chart fence, 212 chars; judge: Candidate correctly specifies a bar chart with all required data points. — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `fence-chart` | stage | 1.50 | 1.50 |  |
| `fence-body` | stage | 0.50 | 0.50 |  |
| `elements` | counted | 5/5 | 1.00 | all 5 present |
| `quality` | judged | 2.00 | 2.00 | Candidate correctly specifies a bar chart with all required data points. |

</details>

| `rendersDiagramInline` | OK | 0.93 | 5.2s | 80.5k | 198 | 2 | ```mermaid fence, 129 chars; judge: The candidate correctly implements the requested flowchart with all nodes and connections. — 93% — 5/6 checks · missed: elements(2/4) |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `fence-mermaid` | stage | 1.50 | 1.50 |  |
| `fence-body` | stage | 0.50 | 0.50 |  |
| `elements` | counted | 2/4 | 1.00 | 2/4 (missing: Form, Validate) |
| `quality` | judged | 2.00 | 2.00 | The candidate correctly implements the requested flowchart with all nodes and connections. |

</details>

| `rendersGraphInline` | FAIL | 0.29 | 30.1s | 80.6k | 295 | 2 | ```graph fence, 0 chars — 29% — 2/6 checks · missed: fence-graph, fence-body(skipped), elements(skipped), quality(skipped) |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `fence-graph` | stage | 0.00 | 1.50 | no ```graph fence — head: Hi, I'm Arthur. What are we working on? --- ```yaml kind: graph directed: true nodes:   - id: A     label: A   - id: B     label: B   - id: C     label: C   - id: D     label: D edges:   - source: A  … |
| `fence-body` | stage | skipped | 0.50 | chain stopped earlier |
| `elements` | counted | skipped | 1.00 | chain stopped earlier |
| `quality` | judged | skipped | 2.00 | chain stopped earlier |

</details>

| `rendersMindmapInline` | OK | 1.00 | 4.8s | 80.6k | 180 | 2 | ```mindmap fence, 127 chars; judge: Candidate provided the complete and correct mindmap structure. — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `fence-mindmap` | stage | 1.50 | 1.50 |  |
| `fence-body` | stage | 0.50 | 0.50 |  |
| `elements` | counted | 12/12 | 1.00 | all 12 present |
| `quality` | judged | 2.00 | 2.00 | Candidate provided the complete and correct mindmap structure. |

</details>

