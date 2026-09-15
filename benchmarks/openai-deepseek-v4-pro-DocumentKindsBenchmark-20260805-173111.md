# Vance Benchmark - openai-deepseek-v4-pro-DocumentKindsBenchmark-20260805-173111

- **Started:** 2026-08-05T17:31:11.749349Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 5
- **Passed:** 5 / 5 (100%)
- **Average score:** 1.000
- **Total LLM time:** 48.5s
- **Total tokens (in / out):** 468.3k / 2.5k (18 round-trips)


## document-kinds

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `createsApplicationKind` | OK | 1.00 | 11.1s | 105.4k | 551 | 4 | kind=application at benchmark/calendar-app/_app.yaml (402 chars); judge: All required fields and values are present. |
| `createsChartKind` | OK | 1.00 | 9.3s | 77.2k | 536 | 3 | kind=chart at benchmark/chart-sales.json (382 chars); judge: All required data points are present and correct. |
| `createsDiagramKind` | OK | 1.00 | 11.1s | 130.4k | 545 | 5 | kind=diagram at benchmark/diagram-login-flow.md (147 chars); judge: All required nodes and connections are present in valid Mermaid syntax. |
| `createsGraphKind` | OK | 1.00 | 9.5s | 77.9k | 497 | 3 | kind=graph at benchmark/graph-diamond.json (397 chars); judge: Candidate correctly implements the required diamond graph structure. |
| `createsMindmapKind` | OK | 1.00 | 7.5s | 77.3k | 325 | 3 | kind=mindmap at benchmark/mindmap-languages.md (163 chars); judge: The candidate correctly implements the required nested structure. |
