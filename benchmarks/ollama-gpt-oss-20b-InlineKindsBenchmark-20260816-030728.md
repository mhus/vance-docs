# Vance Benchmark - ollama-gpt-oss-20b-InlineKindsBenchmark-20260816-030728

- **Started:** 2026-08-16T03:07:28.946695Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 4
- **Passed:** 2 / 4 (50%)
- **Average score:** 0.850
- **Total LLM time:** 51.2s
- **Total tokens (in / out):** 262.4k / 2.0k (8 round-trips)


## inline-kinds

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `rendersChartInline` | FAIL | 0.90 | 10.1s | 65.6k | 746 | 2 | ```chart fence rendered (128 chars); judge: The chart type key is 'type' instead of the required 'chartType'. |
| `rendersDiagramInline` | FAIL | 0.50 | 4.2s | 65.6k | 277 | 2 | ```mermaid fence rendered (139 chars); judge: The candidate uses an incorrect diagram type declaration instead of 'flowchart'. |
| `rendersGraphInline` | OK | 1.00 | 32.1s | 65.6k | 676 | 2 | ```graph fence rendered (165 chars); judge: Candidate correctly defines all nodes and edges. |
| `rendersMindmapInline` | OK | 1.00 | 4.9s | 65.6k | 312 | 2 | ```mindmap fence rendered (156 chars); judge: All required branches and leaves are present in the correct structure. |
