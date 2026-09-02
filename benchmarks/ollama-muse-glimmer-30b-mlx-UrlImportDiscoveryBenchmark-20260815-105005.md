# Vance Benchmark - ollama-muse-glimmer-30b-mlx-UrlImportDiscoveryBenchmark-20260815-105005

- **Started:** 2026-08-15T10:50:05.174544Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 3
- **Passed:** 2 / 3 (67%)
- **Average score:** 0.667
- **Total LLM time:** 284.1s
- **Total tokens (in / out):** 520.5k / 2.1k (9 round-trips)


## url-import-discovery

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `reachesImportToolRun1` | OK | 1.00 | 129.4s | 149.9k | 529 | 3 | doc_import_url was called after discovery via [tool_description] — tools: [arthur_action, doc_import_url, tool_description] |
| `reachesImportToolRun2` | FAIL | 0.00 | 134.3s | 220.6k | 1.1k | 3 | no discovery and no doc_import_url. Tools: <none> |
| `reachesImportToolRun3` | OK | 1.00 | 20.4s | 149.9k | 521 | 3 | doc_import_url was called after discovery via [tool_description] — tools: [arthur_action, doc_import_url, tool_description] |
