# Vance Benchmark - openai-deepseek-v4-pro-DocumentKindsBenchmark-20260805-142556

- **Started:** 2026-08-05T14:25:56.930620Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 5
- **Passed:** 4 / 5 (80%)
- **Average score:** 0.800
- **Total LLM time:** 151.9s
- **Total tokens (in / out):** 622.6k / 6.1k (50 round-trips)


## document-kinds

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `createsApplicationKind` | OK | 1.00 | 19.1s | 112.8k | 635 | 4 | kind=application at benchmark/calendar-app/_app.yaml (402 chars); judge: All required keys, lanes, and colors are present and correct. |
| `createsChartKind` | OK | 1.00 | 8.2s | 76.9k | 555 | 3 | kind=chart at benchmark/chart-sales.json (382 chars); judge: All required data points are present and correct. |
| `createsDiagramKind` | OK | 1.00 | 10.5s | 103.4k | 552 | 4 | kind=diagram at benchmark/diagram-login-flow.md (220 chars); judge: The diagram contains all required nodes in the correct sequence and is syntactically valid. |
| `createsGraphKind` | OK | 1.00 | 9.7s | 77.7k | 496 | 3 | kind=graph at benchmark/graph-diamond.json (397 chars); judge: Candidate correctly implements the required diamond graph structure. |
| `createsMindmapKind` | FAIL | 0.00 | 104.4s | 251.8k | 3.9k | 36 | no document of kind=mindmap produced within 120s; kinds in project: [application, chart, diagram, graph] |
