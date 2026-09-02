# Vance Benchmark - ollama-muse-glimmer-30b-mlx-InlineKindsBenchmark-20260816-120533

- **Started:** 2026-08-16T12:05:33.129012Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 4
- **Passed:** 4 / 4 (100%)
- **Average score:** 1.000
- **Total LLM time:** 100.6s
- **Total tokens (in / out):** 201.2k / 1.6k (5 round-trips)


## inline-kinds

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `rendersChartInline` | OK | 1.00 | 37.7s | 82.2k | 814 | 2 | ```chart fence rendered (309 chars); judge: Candidate correctly provides all four requested data points in the specified chart format. |
| `rendersDiagramInline` | OK | 1.00 | 7.4s | 39.7k | 256 | 1 | ```mermaid fence rendered (179 chars); judge: Candidate contains all required nodes and connections, with additional valid logic. |
| `rendersGraphInline` | OK | 1.00 | 39.0s | 39.7k | 279 | 1 | ```graph fence rendered (232 chars); judge: Candidate correctly defines the four nodes and four directed edges. |
| `rendersMindmapInline` | OK | 1.00 | 16.6s | 39.7k | 238 | 1 | ```mindmap fence rendered (137 chars); judge: All required branches and leaves are present in the correct structure. |
