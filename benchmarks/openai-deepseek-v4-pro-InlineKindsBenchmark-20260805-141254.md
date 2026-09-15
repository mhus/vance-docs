# Vance Benchmark - openai-deepseek-v4-pro-InlineKindsBenchmark-20260805-141254

- **Started:** 2026-08-05T14:12:54.589436Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 4
- **Passed:** 4 / 4 (100%)
- **Average score:** 1.000
- **Total LLM time:** 107.0s
- **Total tokens (in / out):** 202.3k / 891 (8 round-trips)


## inline-kinds

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `rendersChartInline` | OK | 1.00 | 12.1s | 50.5k | 243 | 2 | ```chart fence rendered (250 chars); judge: All criteria are fully met. |
| `rendersDiagramInline` | OK | 1.00 | 6.8s | 50.4k | 186 | 2 | ```mermaid fence rendered (207 chars); judge: The candidate contains all required nodes and connections, plus valid extra logic. |
| `rendersGraphInline` | OK | 1.00 | 83.4s | 50.9k | 255 | 2 | ```graph fence rendered (262 chars); judge: The candidate correctly defines the four required nodes and four directed edges. |
| `rendersMindmapInline` | OK | 1.00 | 4.7s | 50.6k | 207 | 2 | ```mindmap fence rendered (163 chars); judge: Candidate correctly implements the required mindmap structure. |
