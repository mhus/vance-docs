# Vance Benchmark - ollama-gpt-oss-20b__smallv2-InlineKindsBenchmark-20260822-040142

- **Started:** 2026-08-22T04:01:42.559707Z
- **Judge:** gemini-gemini-2.5-pro
- **Knobs:** {chatTimeoutS=600, waitBudgetMinS=300}
- **Score model:** v2-graded
- **Total tests:** 4
- **Passed:** 3 / 4 (75%)
- **Average score:** 0.821
- **Total LLM time:** 29.6s
- **Total tokens (in / out):** 303.6k / 1.9k (9 round-trips)


## inline-kinds

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `rendersChartInline` | OK | 1.00 | 8.4s | 67.3k | 622 | 2 | ```chart fence, 161 chars; judge: All criteria are fully met. — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `fence-chart` | stage | 1.50 | 1.50 |  |
| `fence-body` | stage | 0.50 | 0.50 |  |
| `elements` | counted | 5/5 | 1.00 | all 5 present |
| `quality` | judged | 2.00 | 2.00 | All criteria are fully met. |

</details>

| `rendersDiagramInline` | OK | 1.00 | 6.5s | 101.3k | 418 | 3 | ```mermaid fence, 139 chars; judge: Candidate added an unrequested failure path. — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `fence-mermaid` | stage | 1.50 | 1.50 |  |
| `fence-body` | stage | 0.50 | 0.50 |  |
| `elements` | counted | 4/4 | 1.00 | all 4 present |
| `quality` | judged | 2.00 | 2.00 | Candidate added an unrequested failure path. |

</details>

| `rendersGraphInline` | FAIL | 0.29 | 12.4s | 101.5k | 662 | 3 | ```graph fence, 0 chars — 29% — 2/6 checks · missed: fence-graph, fence-body(skipped), elements(skipped), quality(skipped) |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `fence-graph` | stage | 0.00 | 1.50 | no ```graph fence — head: Hi, I'm Arthur. What are we working on? --- ```yaml # Graph definition kind: graph directed: true nodes:   - id: A     label: A   - id: B     label: B   - id: C     label: C   - id: D     label: D edg… |
| `fence-body` | stage | skipped | 0.50 | chain stopped earlier |
| `elements` | counted | skipped | 1.00 | chain stopped earlier |
| `quality` | judged | skipped | 2.00 | chain stopped earlier |

</details>

| `rendersMindmapInline` | OK | 1.00 | 2.4s | 33.5k | 174 | 1 | ```mindmap fence, 142 chars; judge: The candidate correctly implements the required mindmap structure. — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `fence-mindmap` | stage | 1.50 | 1.50 |  |
| `fence-body` | stage | 0.50 | 0.50 |  |
| `elements` | counted | 12/12 | 1.00 | all 12 present |
| `quality` | judged | 2.00 | 2.00 | The candidate correctly implements the required mindmap structure. |

</details>

