# Vance Benchmark - ollama-qwen3.6-35b__baseline-InlineKindsBenchmark-20260823-221426

- **Started:** 2026-08-23T22:14:26.282935Z
- **Judge:** gemini-gemini-2.5-pro
- **Knobs:** {chatTimeoutS=600, waitBudgetMinS=300}
- **Score model:** v2-graded
- **Total tests:** 4
- **Passed:** 2 / 4 (50%)
- **Average score:** 0.625
- **Total LLM time:** 47.1s
- **Total tokens (in / out):** 405.5k / 999 (10 round-trips)


## inline-kinds

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `rendersChartInline` | FAIL | 0.29 | 5.6s | 121.7k | 196 | 3 | ```chart fence, 0 chars — 29% — 2/6 checks · missed: fence-chart, fence-body(skipped), elements(skipped), quality(skipped) |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `fence-chart` | stage | 0.00 | 1.50 | no ```chart fence — head: Hi, I'm Arthur. What are we working on? --- Der Chart wurde oben als inline ````chart` Block gerendert — keine Datei gespeichert, direkt im Chat sichtbar. |
| `fence-body` | stage | skipped | 0.50 | chain stopped earlier |
| `elements` | counted | skipped | 1.00 | chain stopped earlier |
| `quality` | judged | skipped | 2.00 | chain stopped earlier |

</details>

| `rendersDiagramInline` | OK | 0.93 | 4.7s | 80.9k | 180 | 2 | ```mermaid fence, 111 chars; judge: The candidate provides a well-formed flowchart with all required nodes connected in the correct order. — 93% — 5/6 checks · missed: elements(2/4) |

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

| `rendersGraphInline` | FAIL | 0.29 | 32.0s | 121.9k | 448 | 3 | ```graph fence, 0 chars — 29% — 2/6 checks · missed: fence-graph, fence-body(skipped), elements(skipped), quality(skipped) |

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

| `rendersMindmapInline` | OK | 1.00 | 4.8s | 80.9k | 175 | 2 | ```mindmap fence, 145 chars; judge: Candidate correctly implements the required mindmap structure and content. — 100% — 6/6 checks |

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

