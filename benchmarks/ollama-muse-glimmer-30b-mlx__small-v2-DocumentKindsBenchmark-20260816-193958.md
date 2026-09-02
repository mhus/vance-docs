# Vance Benchmark - ollama-muse-glimmer-30b-mlx__small-v2-DocumentKindsBenchmark-20260816-193958

- **Started:** 2026-08-16T19:39:58.276504Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 5
- **Passed:** 4 / 5 (80%)
- **Average score:** 0.966
- **Total LLM time:** 314.4s
- **Total tokens (in / out):** 814.7k / 5.6k (21 round-trips)


## document-kinds

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `createsApplicationKind` | FAIL | 0.83 | 40.2s | 123.8k | 884 | 3 | kind=application at benchmark/calendar-app/_app.yaml (343 chars); judge: The kind and app keys are not at the top level as required. |
| `createsChartKind` | OK | 1.00 | 59.4s | 168.9k | 745 | 4 | kind=chart at benchmark/chart-sales.json (244 chars); judge: All required data points are present and correct. |
| `createsDiagramKind` | OK | 1.00 | 67.8s | 291.2k | 2.3k | 7 | kind=diagram at benchmark/diagram-login-flow.yaml (146 chars); judge: All required nodes are present and the Mermaid syntax is valid. |
| `createsGraphKind` | OK | 1.00 | 45.2s | 64.7k | 945 | 3 | kind=graph at benchmark/graph-diamond.json (228 chars); judge: The candidate correctly implements the required diamond graph structure. |
| `createsMindmapKind` | OK | 1.00 | 101.9s | 166.2k | 797 | 4 | kind=mindmap at benchmark/mindmap-languages.md (164 chars); judge: The candidate correctly implements the required nested structure with all specified nodes. |
