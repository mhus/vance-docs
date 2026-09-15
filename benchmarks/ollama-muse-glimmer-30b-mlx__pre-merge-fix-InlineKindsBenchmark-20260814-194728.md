# Vance Benchmark - ollama-muse-glimmer-30b-mlx__pre-merge-fix-InlineKindsBenchmark-20260814-194728

- **Started:** 2026-08-14T19:47:28.604272Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 4
- **Passed:** 3 / 4 (75%)
- **Average score:** 0.875
- **Total LLM time:** 301.3s
- **Total tokens (in / out):** 734.2k / 1.6k (6 round-trips)


## inline-kinds

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `rendersChartInline` | OK | 1.00 | 45.7s | 245.9k | 562 | 2 | ```chart fence rendered (279 chars); judge: All criteria are met. |
| `rendersDiagramInline` | FAIL | 0.50 | 11.0s | 121.5k | 253 | 1 | ```mermaid fence rendered (197 chars); judge: Candidate includes an extra node and path not specified in the criteria. |
| `rendersGraphInline` | OK | 1.00 | 221.1s | 245.2k | 590 | 2 | ```graph fence rendered (262 chars); judge: The candidate correctly defines the four required nodes and four directed edges. |
| `rendersMindmapInline` | OK | 1.00 | 23.5s | 121.5k | 221 | 1 | ```mindmap fence rendered (137 chars); judge: Candidate correctly provides the full required mindmap structure. |
