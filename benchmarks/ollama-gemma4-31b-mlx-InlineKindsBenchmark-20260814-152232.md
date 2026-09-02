# Vance Benchmark - ollama-gemma4-31b-mlx-InlineKindsBenchmark-20260814-152232

- **Started:** 2026-08-14T15:22:32.991146Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 4
- **Passed:** 0 / 4 (0%)
- **Average score:** 0.000
- **Total LLM time:** 96.1s
- **Total tokens (in / out):** 395.5k / 930 (8 round-trips)


## inline-kinds

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `rendersChartInline` | FAIL | 0.00 | 35.3s | 152.1k | 359 | 3 | no ```chart fence found in assistant reply — head: Hi, I'm Arthur. What are we working on? --- User requested a bar chart inline; providing the data in the correct Vance chart YAML format within a fence. |
| `rendersDiagramInline` | FAIL | 0.00 | 15.8s | 97.4k | 206 | 2 | no ```mermaid fence found in assistant reply — head: Hi, I'm Arthur. What are we working on? --- Hier ist der gewünschte Login-Flow. |
| `rendersGraphInline` | FAIL | 0.00 | 28.2s | 48.6k | 136 | 1 | no ```graph fence found in assistant reply — head: Hi, I'm Arthur. What are we working on? --- User asked for an inline graph; provided it in the message. |
| `rendersMindmapInline` | FAIL | 0.00 | 16.8s | 97.4k | 229 | 2 | no ```mindmap fence found in assistant reply — head: Hi, I'm Arthur. What are we working on? --- Hier ist die gewünschte Mindmap zu den Programmiersprachen. |
