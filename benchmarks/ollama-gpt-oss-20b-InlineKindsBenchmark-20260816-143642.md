# Vance Benchmark - ollama-gpt-oss-20b-InlineKindsBenchmark-20260816-143642

- **Started:** 2026-08-16T14:36:42.564484Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 4
- **Passed:** 3 / 4 (75%)
- **Average score:** 0.750
- **Total LLM time:** 29.6s
- **Total tokens (in / out):** 329.0k / 2.0k (10 round-trips)


## inline-kinds

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `rendersChartInline` | FAIL | 0.00 | 8.0s | 65.7k | 613 | 2 | ```chart fence rendered (438 chars); judge: The required 'chart.chartType' key is missing; 'kind' was used instead. |
| `rendersDiagramInline` | OK | 1.00 | 5.1s | 98.7k | 297 | 3 | ```mermaid fence rendered (140 chars); judge: Candidate provides a valid flowchart with all required nodes and connections. |
| `rendersGraphInline` | OK | 1.00 | 10.8s | 98.9k | 647 | 3 | ```graph fence rendered (217 chars); judge: Candidate correctly defines all required nodes and edges. |
| `rendersMindmapInline` | OK | 1.00 | 5.6s | 65.6k | 404 | 2 | ```mindmap fence rendered (163 chars); judge: Candidate correctly implements the required mindmap structure. |
