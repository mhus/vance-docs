# Vance Benchmark - ollama-qwen3.6-35b__smallv2-InlineKindsBenchmark-20260822-003845

- **Started:** 2026-08-22T00:38:45.951732Z
- **Judge:** gemini-gemini-2.5-pro
- **Knobs:** {chatTimeoutS=600, waitBudgetMinS=300}
- **Score model:** v2-graded
- **Total tests:** 4
- **Passed:** 3 / 4 (75%)
- **Average score:** 0.789
- **Total LLM time:** 46.9s
- **Total tokens (in / out):** 322.3k / 1.0k (8 round-trips)


## inline-kinds

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `rendersChartInline` | OK | 0.94 | 7.0s | 80.6k | 350 | 2 | ```chart fence, 211 chars; judge: Candidate used 'type: bar' instead of the required 'chart.chartType: bar'. — 94% — 4/6 checks · missed: elements(4/5), quality |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `fence-chart` | stage | 1.50 | 1.50 |  |
| `fence-body` | stage | 0.50 | 0.50 |  |
| `elements` | counted | 4/5 | 1.00 | 4/5 (missing: März) |
| `quality` | judged | 1.80 | 2.00 | Candidate used 'type: bar' instead of the required 'chart.chartType: bar'. |

</details>

| `rendersDiagramInline` | OK | 0.93 | 4.7s | 80.5k | 175 | 2 | ```mermaid fence, 111 chars; judge: The candidate provides a well-formed flowchart with all required nodes connected in the correct order. — 93% — 5/6 checks · missed: elements(2/4) |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `fence-mermaid` | stage | 1.50 | 1.50 |  |
| `fence-body` | stage | 0.50 | 0.50 |  |
| `elements` | counted | 2/4 | 1.00 | 2/4 (missing: Form, Validate) |
| `quality` | judged | 2.00 | 2.00 | The candidate provides a well-formed flowchart with all required nodes connected in the correct order. |

</details>

| `rendersGraphInline` | FAIL | 0.29 | 30.4s | 80.6k | 309 | 2 | ```graph fence, 0 chars — 29% — 2/6 checks · missed: fence-graph, fence-body(skipped), elements(skipped), quality(skipped) |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `fence-graph` | stage | 0.00 | 1.50 | no ```graph fence — head: Hi, I'm Arthur. What are we working on? --- ```yaml kind: graph directed: true nodes:   - id: A     label: "A"   - id: B     label: "B"   - id: C     label: "C"   - id: D     label: "D" edges:   - sou… |
| `fence-body` | stage | skipped | 0.50 | chain stopped earlier |
| `elements` | counted | skipped | 1.00 | chain stopped earlier |
| `quality` | judged | skipped | 2.00 | chain stopped earlier |

</details>

| `rendersMindmapInline` | OK | 1.00 | 4.8s | 80.5k | 178 | 2 | ```mindmap fence, 145 chars; judge: Candidate correctly implements the required mindmap structure and content. — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `fence-mindmap` | stage | 1.50 | 1.50 |  |
| `fence-body` | stage | 0.50 | 0.50 |  |
| `elements` | counted | 12/12 | 1.00 | all 12 present |
| `quality` | judged | 2.00 | 2.00 | Candidate correctly implements the required mindmap structure and content. |

</details>

