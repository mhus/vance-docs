# Vance Benchmark - ollama-muse-glimmer-30b-mlx__pre-merge-fix-DocumentKindsBenchmark-20260814-205215

- **Started:** 2026-08-14T20:52:15.475351Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 5
- **Passed:** 5 / 5 (100%)
- **Average score:** 1.000
- **Total LLM time:** 405.0s
- **Total tokens (in / out):** 2.34M / 4.6k (19 round-trips)


## document-kinds

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `createsApplicationKind` | OK | 1.00 | 67.7s | 614.9k | 1.0k | 5 | kind=application at benchmark/calendar-app/_app.yaml (343 chars); judge: All required fields and values are present. |
| `createsChartKind` | OK | 1.00 | 209.9s | 370.4k | 734 | 3 | kind=chart at benchmark/chart-sales.json (244 chars); judge: All required data points are present and correct. |
| `createsDiagramKind` | OK | 1.00 | 61.3s | 492.1k | 1.3k | 4 | kind=diagram at benchmark/diagram-login-flow.md (239 chars); judge: The diagram contains all required nodes and valid syntax. |
| `createsGraphKind` | OK | 1.00 | 28.7s | 369.1k | 627 | 3 | kind=graph at benchmark/graph-diamond.json (228 chars); judge: Candidate correctly implements the required diamond graph structure. |
| `createsMindmapKind` | OK | 1.00 | 37.4s | 492.6k | 911 | 4 | kind=mindmap at benchmark/mindmap-languages.md (408 chars); judge: The candidate correctly implements the required nested structure. |
