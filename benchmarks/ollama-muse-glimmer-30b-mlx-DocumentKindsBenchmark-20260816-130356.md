# Vance Benchmark - ollama-muse-glimmer-30b-mlx-DocumentKindsBenchmark-20260816-130356

- **Started:** 2026-08-16T13:03:56.135449Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 5
- **Passed:** 3 / 5 (60%)
- **Average score:** 0.600
- **Total LLM time:** 551.1s
- **Total tokens (in / out):** 539.7k / 4.3k (16 round-trips)


## document-kinds

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `createsApplicationKind` | FAIL | 0.00 | 133.8s | 85.8k | 1.6k | 5 | no document of kind=application produced within 120s; kinds in project: [chart] |
| `createsChartKind` | OK | 1.00 | 75.7s | 124.9k | 875 | 3 | kind=chart at benchmark/chart-sales.json (353 chars); judge: The candidate correctly represents all four required data points as a bar chart. |
| `createsDiagramKind` | FAIL | 0.00 | 117.3s | 39.7k | 353 | 1 | no document of kind=diagram produced within 120s; kinds in project: [application, chart] |
| `createsGraphKind` | OK | 1.00 | 142.6s | 123.9k | 712 | 3 | kind=graph at benchmark/graph-diamond.json (276 chars); judge: The candidate correctly implements the requested diamond graph structure. |
| `createsMindmapKind` | OK | 1.00 | 81.7s | 165.4k | 709 | 4 | kind=mindmap at benchmark/mindmap-languages.md (163 chars); judge: The candidate correctly implements the required nested structure. |
