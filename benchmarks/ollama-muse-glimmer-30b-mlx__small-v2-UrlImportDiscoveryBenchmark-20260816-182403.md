# Vance Benchmark - ollama-muse-glimmer-30b-mlx__small-v2-UrlImportDiscoveryBenchmark-20260816-182403

- **Started:** 2026-08-16T18:24:03.006234Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 3
- **Passed:** 3 / 3 (100%)
- **Average score:** 1.000
- **Total LLM time:** 148.7s
- **Total tokens (in / out):** 407.2k / 1.7k (10 round-trips)


## url-import-discovery

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `reachesImportToolRun1` | OK | 1.00 | 115.9s | 163.1k | 596 | 4 | doc_import_url was called after discovery via [tool_description] — tools: [arthur_action, doc_import_url, tool_description, project_current] |
| `reachesImportToolRun2` | OK | 1.00 | 18.3s | 122.0k | 639 | 3 | doc_import_url was called after discovery via [tool_description] — tools: [arthur_action, doc_import_url, tool_description] |
| `reachesImportToolRun3` | OK | 1.00 | 14.5s | 122.0k | 500 | 3 | doc_import_url was called after discovery via [tool_description] — tools: [arthur_action, doc_import_url, tool_description] |
