# Vance Benchmark - ollama-muse-glimmer-30b-mlx-DocumentKindsBenchmark-20260815-121846

- **Started:** 2026-08-15T12:18:46.002612Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 5
- **Passed:** 4 / 5 (80%)
- **Average score:** 0.800
- **Total LLM time:** 167.8s
- **Total tokens (in / out):** 863.2k / 3.3k (17 round-trips)


## document-kinds

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `createsApplicationKind` | FAIL | 0.00 | 14.6s | 98.8k | 490 | 2 | no document of kind=application produced within 120s; kinds in project: [chart, text] |
| `createsChartKind` | OK | 1.00 | 86.5s | 153.7k | 684 | 3 | kind=chart at benchmark/chart-sales.json (444 chars); judge: All required data points are present and correct. |
| `createsDiagramKind` | OK | 1.00 | 25.3s | 254.9k | 864 | 5 | kind=diagram at benchmark/diagram-login-flow.md (154 chars); judge: All required nodes and connections are present in valid syntax. |
| `createsGraphKind` | OK | 1.00 | 18.0s | 152.4k | 543 | 3 | kind=graph at benchmark/graph-diamond.json (276 chars); judge: The candidate correctly implements the requested diamond graph structure. |
| `createsMindmapKind` | OK | 1.00 | 23.2s | 203.5k | 734 | 4 | kind=mindmap at benchmark/mindmap-languages.md (163 chars); judge: The candidate correctly implements the required nested structure. |
