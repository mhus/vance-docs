# Vance Benchmark - ollama-gemma4-31b-mlx-DocumentKindsBenchmark-20260814-165958

- **Started:** 2026-08-14T16:59:58.226731Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 5
- **Passed:** 4 / 5 (80%)
- **Average score:** 0.800
- **Total LLM time:** 321.4s
- **Total tokens (in / out):** 955.3k / 1.6k (19 round-trips)


## document-kinds

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `createsApplicationKind` | FAIL | 0.00 | 12.5s | 97.3k | 152 | 2 | kind=application at benchmark/calendar-app/_app.yaml (155 chars); judge: The manifest uses a top-level 'lanes' list instead of the required 'calendar.lanes' map. |
| `createsChartKind` | OK | 1.00 | 126.2s | 151.9k | 255 | 3 | kind=chart at benchmark/chart-sales.json (251 chars); judge: All criteria are fully met. |
| `createsDiagramKind` | OK | 1.00 | 59.0s | 251.7k | 403 | 5 | kind=diagram at benchmark/diagram-login-flow.md (187 chars); judge: All required nodes are present and connected in the correct order. |
| `createsGraphKind` | OK | 1.00 | 49.3s | 150.6k | 216 | 3 | kind=graph at benchmark/graph-diamond.json (210 chars); judge: The candidate correctly implements the required diamond graph structure. |
| `createsMindmapKind` | OK | 1.00 | 74.4s | 303.8k | 562 | 6 | kind=mindmap at benchmark/mindmap-languages.md (407 chars); judge: Candidate correctly implements the required nested structure. |
