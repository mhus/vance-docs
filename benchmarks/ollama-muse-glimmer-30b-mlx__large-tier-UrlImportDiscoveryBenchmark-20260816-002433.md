# Vance Benchmark - ollama-muse-glimmer-30b-mlx__large-tier-UrlImportDiscoveryBenchmark-20260816-002433

- **Started:** 2026-08-16T00:24:33.641548Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 3
- **Passed:** 2 / 3 (67%)
- **Average score:** 0.667
- **Total LLM time:** 271.5s
- **Total tokens (in / out):** 571.1k / 2.6k (10 round-trips)


## url-import-discovery

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `reachesImportToolRun1` | FAIL | 0.00 | 186.7s | 270.8k | 1.3k | 4 | no discovery and no doc_import_url — settled for [web_fetch, doc_write]. Tools: [arthur_action, doc_write, web_fetch] |
| `reachesImportToolRun2` | OK | 1.00 | 65.6s | 150.1k | 732 | 3 | doc_import_url was called after discovery via [tool_description] — tools: [arthur_action, doc_import_url, tool_description] |
| `reachesImportToolRun3` | OK | 1.00 | 19.2s | 150.1k | 579 | 3 | doc_import_url was called after discovery via [tool_description] — tools: [arthur_action, doc_import_url, tool_description] |
