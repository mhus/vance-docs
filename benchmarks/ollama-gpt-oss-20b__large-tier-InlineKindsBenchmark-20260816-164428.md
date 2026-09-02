# Vance Benchmark - ollama-gpt-oss-20b__large-tier-InlineKindsBenchmark-20260816-164428

- **Started:** 2026-08-16T16:44:28.036324Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 4
- **Passed:** 4 / 4 (100%)
- **Average score:** 1.000
- **Total LLM time:** 35.2s
- **Total tokens (in / out):** 469.4k / 2.2k (11 round-trips)


## inline-kinds

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `rendersChartInline` | OK | 1.00 | 7.9s | 85.1k | 565 | 2 | ```chart fence rendered (206 chars); judge: All specified data points and chart type are correct. |
| `rendersDiagramInline` | OK | 1.00 | 7.4s | 128.0k | 449 | 3 | ```mermaid fence rendered (79 chars); judge: All required nodes and connections are present in valid syntax. |
| `rendersGraphInline` | OK | 1.00 | 12.9s | 128.2k | 822 | 3 | ```graph fence rendered (217 chars); judge: The candidate correctly defines all required nodes and edges. |
| `rendersMindmapInline` | OK | 1.00 | 7.0s | 128.1k | 377 | 3 | ```mindmap fence rendered (163 chars); judge: Candidate correctly structured the mindmap with all required branches and leaves. |
