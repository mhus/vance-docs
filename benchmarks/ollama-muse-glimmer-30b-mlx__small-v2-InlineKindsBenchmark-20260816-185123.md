# Vance Benchmark - ollama-muse-glimmer-30b-mlx__small-v2-InlineKindsBenchmark-20260816-185123

- **Started:** 2026-08-16T18:51:23.511084Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 4
- **Passed:** 4 / 4 (100%)
- **Average score:** 1.000
- **Total LLM time:** 99.0s
- **Total tokens (in / out):** 202.7k / 1.6k (5 round-trips)


## inline-kinds

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `rendersChartInline` | OK | 1.00 | 35.5s | 82.8k | 741 | 2 | ```chart fence rendered (317 chars); judge: All criteria were met. |
| `rendersDiagramInline` | OK | 1.00 | 8.5s | 40.0k | 298 | 1 | ```mermaid fence rendered (156 chars); judge: The candidate provides a well-formed flowchart with all required nodes and connections. |
| `rendersGraphInline` | OK | 1.00 | 38.1s | 40.0k | 272 | 1 | ```graph fence rendered (232 chars); judge: The candidate correctly defines the requested nodes and directed edges. |
| `rendersMindmapInline` | OK | 1.00 | 17.0s | 40.0k | 256 | 1 | ```mindmap fence rendered (137 chars); judge: Candidate correctly provides the full required mindmap structure. |
