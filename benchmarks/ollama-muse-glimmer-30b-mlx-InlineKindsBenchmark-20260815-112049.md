# Vance Benchmark - ollama-muse-glimmer-30b-mlx-InlineKindsBenchmark-20260815-112049

- **Started:** 2026-08-15T11:20:49.334003Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 4
- **Passed:** 4 / 4 (100%)
- **Average score:** 1.000
- **Total LLM time:** 125.0s
- **Total tokens (in / out):** 300.4k / 2.1k (6 round-trips)


## inline-kinds

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `rendersChartInline` | OK | 1.00 | 20.6s | 101.4k | 519 | 2 | ```chart fence rendered (274 chars); judge: The chart contains all four correct data points. |
| `rendersDiagramInline` | OK | 1.00 | 7.7s | 49.3k | 289 | 1 | ```mermaid fence rendered (119 chars); judge: All required nodes and connections are present and syntactically correct. |
| `rendersGraphInline` | OK | 1.00 | 65.1s | 49.3k | 559 | 1 | ```graph fence rendered (217 chars); judge: Candidate correctly defines all required nodes and edges. |
| `rendersMindmapInline` | OK | 1.00 | 31.6s | 100.5k | 732 | 2 | ```mindmap fence rendered (163 chars); judge: Candidate correctly implements the required mindmap structure. |
