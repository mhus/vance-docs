# Vance Benchmark - ollama-qwen3.6-35b__large-tier-DocumentKindsBenchmark-20260815-235849

- **Started:** 2026-08-15T23:58:49.063930Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 5
- **Passed:** 4 / 5 (80%)
- **Average score:** 0.860
- **Total LLM time:** 195.7s
- **Total tokens (in / out):** 1.07M / 2.9k (21 round-trips)


## document-kinds

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `createsApplicationKind` | FAIL | 0.30 | 61.1s | 208.5k | 499 | 4 | kind=application at benchmark/calendar-app/_app.yaml (181 chars); judge: The candidate is missing the required calendar.lanes map. |
| `createsChartKind` | OK | 1.00 | 45.0s | 207.1k | 395 | 4 | kind=chart at benchmark/chart-sales.json (248 chars); judge: Candidate meets all criteria. |
| `createsDiagramKind` | OK | 1.00 | 65.9s | 299.7k | 1.2k | 6 | kind=diagram at benchmark/diagram-login-flow.md (310 chars); judge: All required nodes are present in the correct sequence and the syntax is valid. |
| `createsGraphKind` | OK | 1.00 | 15.8s | 205.2k | 530 | 4 | kind=graph at benchmark/graph-diamond.json (263 chars); judge: The candidate correctly implements the requested diamond graph structure. |
| `createsMindmapKind` | OK | 1.00 | 7.9s | 149.0k | 340 | 3 | kind=mindmap at benchmark/mindmap-languages.md (303 chars); judge: Candidate meets all structural requirements. |
