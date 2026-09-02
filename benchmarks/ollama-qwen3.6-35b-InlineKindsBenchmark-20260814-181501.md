# Vance Benchmark - ollama-qwen3.6-35b-InlineKindsBenchmark-20260814-181501

- **Started:** 2026-08-14T18:15:01.916528Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 4
- **Passed:** 4 / 4 (100%)
- **Average score:** 1.000
- **Total LLM time:** 72.3s
- **Total tokens (in / out):** 500.9k / 1.2k (10 round-trips)


## inline-kinds

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `rendersChartInline` | OK | 1.00 | 15.5s | 204.1k | 522 | 4 | ```chart fence rendered (337 chars); judge: All criteria were met. |
| `rendersDiagramInline` | OK | 1.00 | 5.9s | 98.9k | 183 | 2 | ```mermaid fence rendered (118 chars); judge: The candidate provides a well-formed flowchart with all required nodes and connections. |
| `rendersGraphInline` | OK | 1.00 | 44.9s | 98.9k | 258 | 2 | ```graph fence rendered (217 chars); judge: The candidate correctly defines all required nodes and edges. |
| `rendersMindmapInline` | OK | 1.00 | 6.1s | 98.9k | 193 | 2 | ```mindmap fence rendered (163 chars); judge: Candidate correctly implements the required mindmap structure. |
