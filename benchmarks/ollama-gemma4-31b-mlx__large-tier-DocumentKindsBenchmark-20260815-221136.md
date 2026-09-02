# Vance Benchmark - ollama-gemma4-31b-mlx__large-tier-DocumentKindsBenchmark-20260815-221136

- **Started:** 2026-08-15T22:11:36.488974Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 5
- **Passed:** 4 / 5 (80%)
- **Average score:** 0.800
- **Total LLM time:** 370.1s
- **Total tokens (in / out):** 957.1k / 1.5k (19 round-trips)


## document-kinds

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `createsApplicationKind` | FAIL | 0.00 | 12.2s | 97.4k | 156 | 2 | kind=application at benchmark/calendar-app/_app.yaml (155 chars); judge: The manifest structure is incorrect; it lacks the required top-level calendar.lanes map. |
| `createsChartKind` | OK | 1.00 | 136.7s | 204.2k | 378 | 4 | kind=chart at benchmark/chart-sales.json (251 chars); judge: All criteria are fully met. |
| `createsDiagramKind` | OK | 1.00 | 39.1s | 303.4k | 383 | 6 | kind=diagram at benchmark/diagram-login-flow.md (199 chars); judge: All required nodes are present and correctly connected with valid syntax. |
| `createsGraphKind` | OK | 1.00 | 26.5s | 150.8k | 226 | 3 | kind=graph at benchmark/graph-diamond.json (211 chars); judge: Candidate correctly implements the required diamond graph structure. |
| `createsMindmapKind` | OK | 1.00 | 155.7s | 201.3k | 370 | 4 | kind=mindmap at benchmark/mindmap-languages.md (407 chars); judge: The mindmap structure is complete and correct. |
