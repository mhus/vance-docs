# Vance Benchmark - ollama-gemma4-31b-mlx-InlineKindsBenchmark-20260816-080349

- **Started:** 2026-08-16T08:03:49.866381Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 4
- **Passed:** 3 / 4 (75%)
- **Average score:** 0.750
- **Total LLM time:** 59.1s
- **Total tokens (in / out):** 229.6k / 677 (6 round-trips)


## inline-kinds

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `rendersChartInline` | OK | 1.00 | 9.0s | 38.2k | 136 | 1 | ```chart fence rendered (132 chars); judge: All criteria are met. |
| `rendersDiagramInline` | OK | 1.00 | 12.5s | 76.6k | 173 | 2 | ```mermaid fence rendered (152 chars); judge: The candidate provides a well-formed flowchart with all required nodes and connections. |
| `rendersGraphInline` | FAIL | 0.00 | 23.0s | 38.2k | 155 | 1 | no ```graph fence found in assistant reply — head: Hi, I'm Arthur. What are we working on? --- The user requested a simple directed graph to be displayed inline in the chat without saving any documents. I have provided the YAML representation in a gra… |
| `rendersMindmapInline` | OK | 1.00 | 14.5s | 76.7k | 213 | 2 | ```mindmap fence rendered (171 chars); judge: The candidate provides the complete and correct mindmap structure. |
