# Vance Benchmark - ollama-gemma4-31b-mlx__large-tier-InlineKindsBenchmark-20260815-203024

- **Started:** 2026-08-15T20:30:24.439834Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 4
- **Passed:** 1 / 4 (25%)
- **Average score:** 0.250
- **Total LLM time:** 113.1s
- **Total tokens (in / out):** 396.0k / 1.1k (8 round-trips)


## inline-kinds

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `rendersChartInline` | OK | 1.00 | 48.8s | 152.3k | 508 | 3 | ```chart fence rendered (254 chars); judge: Candidate provided all four required data points correctly. |
| `rendersDiagramInline` | FAIL | 0.00 | 15.9s | 97.5k | 204 | 2 | no ```mermaid fence found in assistant reply — head: Hi, I'm Arthur. What are we working on? --- Hier ist der gewünschte Login-Flow. |
| `rendersGraphInline` | FAIL | 0.00 | 30.6s | 48.6k | 140 | 1 | no ```graph fence found in assistant reply — head: Hi, I'm Arthur. What are we working on? --- User requested an inline graph; provided the YAML structure within a graph fence as requested. |
| `rendersMindmapInline` | FAIL | 0.00 | 17.7s | 97.5k | 240 | 2 | no ```mindmap fence found in assistant reply — head: Hi, I'm Arthur. What are we working on? --- Hier ist die gewünschte Mindmap zu den Programmiersprachen. |
