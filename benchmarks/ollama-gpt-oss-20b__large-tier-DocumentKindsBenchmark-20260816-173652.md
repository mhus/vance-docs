# Vance Benchmark - ollama-gpt-oss-20b__large-tier-DocumentKindsBenchmark-20260816-173652

- **Started:** 2026-08-16T17:36:52.598393Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 5
- **Passed:** 4 / 5 (80%)
- **Average score:** 0.850
- **Total LLM time:** 486.1s
- **Total tokens (in / out):** 1.79M / 23.3k (40 round-trips)


## document-kinds

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `createsApplicationKind` | FAIL | 0.25 | 59.1s | 215.2k | 1.2k | 5 | kind=application at benchmark/calendar-app/_app.yaml (142 chars); judge: The 'lanes' field must be a map, but a list was provided. |
| `createsChartKind` | OK | 1.00 | 48.8s | 215.1k | 1.2k | 5 | kind=chart at benchmark/chart-sales.json (283 chars); judge: All required data points are present and correct. |
| `createsDiagramKind` | OK | 1.00 | 281.6s | 918.6k | 16.3k | 20 | kind=diagram at benchmark/diagram-login-flow.yaml (115 chars); judge: All required nodes are present and correctly connected with valid syntax. |
| `createsGraphKind` | OK | 1.00 | 17.2s | 171.2k | 812 | 4 | kind=graph at benchmark/graph-diamond.json (300 chars); judge: Candidate correctly implements the required diamond graph structure. |
| `createsMindmapKind` | OK | 1.00 | 79.4s | 266.7k | 3.8k | 6 | kind=mindmap at benchmark/mindmap-languages.md (407 chars); judge: The mindmap structure is complete and correct. |
