# Vance Benchmark - ollama-qwen3.6-35b-DocumentKindsBenchmark-20260816-105039

- **Started:** 2026-08-16T10:50:39.833511Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 5
- **Passed:** 4 / 5 (80%)
- **Average score:** 0.780
- **Total LLM time:** 165.5s
- **Total tokens (in / out):** 1.67M / 6.2k (40 round-trips)


## document-kinds

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `createsApplicationKind` | FAIL | 0.00 | 42.8s | 239.2k | 626 | 6 | no document of kind=application produced within 120s; kinds in project: [chart, text] |
| `createsChartKind` | OK | 1.00 | 42.6s | 289.5k | 1.1k | 7 | kind=chart at benchmark/chart-sales.json (383 chars); judge: All required data points are present and correct. |
| `createsDiagramKind` | OK | 1.00 | 37.8s | 688.3k | 2.0k | 16 | kind=diagram at benchmark/diagram-login-flow.mmd (133 chars); judge: The diagram contains all required nodes in the correct order with valid syntax. |
| `createsGraphKind` | OK | 1.00 | 8.3s | 118.7k | 438 | 3 | kind=graph at benchmark/graph-diamond.json (321 chars); judge: Candidate correctly implements the required nodes and edges. |
| `createsMindmapKind` | OK | 0.90 | 34.0s | 333.8k | 2.0k | 8 | kind=mindmap at benchmark/mindmap-languages.md (1579 chars); judge: The required languages were included as branches, not leaves. |
