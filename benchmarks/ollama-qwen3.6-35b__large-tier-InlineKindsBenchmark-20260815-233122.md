# Vance Benchmark - ollama-qwen3.6-35b__large-tier-InlineKindsBenchmark-20260815-233122

- **Started:** 2026-08-15T23:31:22.997870Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 4
- **Passed:** 4 / 4 (100%)
- **Average score:** 1.000
- **Total LLM time:** 67.2s
- **Total tokens (in / out):** 500.3k / 975 (10 round-trips)


## inline-kinds

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `rendersChartInline` | OK | 1.00 | 6.4s | 99.0k | 220 | 2 | ```chart fence rendered (135 chars); judge: All criteria are met. |
| `rendersDiagramInline` | OK | 1.00 | 6.3s | 99.0k | 214 | 2 | ```mermaid fence rendered (188 chars); judge: All required nodes and connections are present. |
| `rendersGraphInline` | OK | 1.00 | 48.5s | 203.2k | 355 | 4 | ```graph fence rendered (230 chars); judge: Candidate correctly defines all nodes and edges. |
| `rendersMindmapInline` | OK | 1.00 | 6.0s | 99.0k | 186 | 2 | ```mindmap fence rendered (163 chars); judge: Candidate correctly implements the required mindmap structure. |
