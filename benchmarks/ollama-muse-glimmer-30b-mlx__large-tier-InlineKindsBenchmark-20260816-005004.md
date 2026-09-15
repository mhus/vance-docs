# Vance Benchmark - ollama-muse-glimmer-30b-mlx__large-tier-InlineKindsBenchmark-20260816-005004

- **Started:** 2026-08-16T00:50:04.917641Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 4
- **Passed:** 4 / 4 (100%)
- **Average score:** 1.000
- **Total LLM time:** 110.7s
- **Total tokens (in / out):** 352.3k / 2.1k (7 round-trips)


## inline-kinds

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `rendersChartInline` | OK | 1.00 | 25.9s | 101.5k | 705 | 2 | ```chart fence rendered (273 chars); judge: All criteria are fully met. |
| `rendersDiagramInline` | OK | 1.00 | 7.6s | 49.3k | 241 | 1 | ```mermaid fence rendered (119 chars); judge: All required nodes and connections are present in a valid flowchart. |
| `rendersGraphInline` | OK | 1.00 | 55.1s | 100.9k | 534 | 2 | ```graph fence rendered (262 chars); judge: Candidate correctly defines the required nodes and edges for the diamond graph. |
| `rendersMindmapInline` | OK | 1.00 | 22.1s | 100.6k | 595 | 2 | ```mindmap fence rendered (163 chars); judge: The candidate correctly implements the required mindmap structure. |
