# Vance Benchmark - ollama-qwen3.6-35b-InlineKindsBenchmark-20260816-102242

- **Started:** 2026-08-16T10:22:42.773072Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 4
- **Passed:** 2 / 4 (50%)
- **Average score:** 0.500
- **Total LLM time:** 45.9s
- **Total tokens (in / out):** 355.1k / 1.2k (9 round-trips)


## inline-kinds

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `rendersChartInline` | FAIL | 0.00 | 7.0s | 78.9k | 377 | 2 | no ```chart fence found in assistant reply — head: Hi, I'm Arthur. What are we working on? --- Hier sind die Sales-Zahlen als Inline-Chart:  ```yaml kind: chart data:   - Monat: Jan     Umsatz: 10   - Monat: Feb     Umsatz: 25   - Monat: Mär     Umsat… |
| `rendersDiagramInline` | OK | 1.00 | 6.2s | 118.5k | 263 | 3 | ```mermaid fence rendered (154 chars); judge: The flowchart correctly implements the required nodes and connections. |
| `rendersGraphInline` | FAIL | 0.00 | 27.7s | 78.9k | 326 | 2 | no ```graph fence found in assistant reply — head: Hi, I'm Arthur. What are we working on? --- Hier ist der gewünschte gerichtete Graph als inline graph-Block:  ```yaml kind: graph directed: true nodes:   - id: A     label: A   - id: B     label: B   … |
| `rendersMindmapInline` | OK | 1.00 | 4.9s | 78.8k | 194 | 2 | ```mindmap fence rendered (163 chars); judge: The candidate correctly implements the required mindmap structure. |
