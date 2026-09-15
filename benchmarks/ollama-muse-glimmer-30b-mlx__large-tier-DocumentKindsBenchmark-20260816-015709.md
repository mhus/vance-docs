# Vance Benchmark - ollama-muse-glimmer-30b-mlx__large-tier-DocumentKindsBenchmark-20260816-015709

- **Started:** 2026-08-16T01:57:09.226874Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 5
- **Passed:** 4 / 5 (80%)
- **Average score:** 0.800
- **Total LLM time:** 398.2s
- **Total tokens (in / out):** 1.11M / 5.8k (23 round-trips)


## document-kinds

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `createsApplicationKind` | FAIL | 0.00 | 64.6s | 261.5k | 1.2k | 5 | no document of kind=application produced within 120s; kinds in project: [chart, text] |
| `createsChartKind` | OK | 1.00 | 98.6s | 153.8k | 868 | 3 | kind=chart at benchmark/chart-sales.json (237 chars); judge: The chart contains all four required data points with correct labels and values. |
| `createsDiagramKind` | OK | 1.00 | 94.5s | 359.9k | 1.6k | 7 | kind=diagram at benchmark/diagram-login-flow.md (154 chars); judge: The diagram contains all required nodes and connections in valid syntax. |
| `createsGraphKind` | OK | 1.00 | 61.7s | 127.9k | 1.3k | 4 | kind=graph at benchmark/graph-diamond.json (276 chars); judge: Candidate correctly implements the required diamond graph structure. |
| `createsMindmapKind` | OK | 1.00 | 78.8s | 203.9k | 871 | 4 | kind=mindmap at benchmark/mindmap-languages.md (408 chars); judge: The candidate correctly implements the required nested structure. |
