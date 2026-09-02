# Vance Benchmark - ollama-muse-glimmer-30b-mlx-UrlImportDiscoveryBenchmark-20260816-112231

- **Started:** 2026-08-16T11:22:31.617163Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 3
- **Passed:** 1 / 3 (33%)
- **Average score:** 0.333
- **Total LLM time:** 301.7s
- **Total tokens (in / out):** 354.5k / 2.7k (11 round-trips)


## url-import-discovery

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `reachesImportToolRun1` | OK | 1.00 | 129.6s | 161.1k | 734 | 4 | doc_import_url was called after discovery via [tool_description] — tools: [arthur_action, doc_import_url, tool_description] |
| `reachesImportToolRun2` | FAIL | 0.00 | 42.8s | 73.8k | 894 | 4 | no discovery and no doc_import_url — settled for [web_fetch, doc_write]. Tools: [arthur_action, doc_write, web_fetch] |
| `reachesImportToolRun3` | FAIL | 0.00 | 129.3s | 119.5k | 1.1k | 3 | no discovery and no doc_import_url — settled for [web_fetch, doc_write]. Tools: [arthur_action, doc_write, web_fetch] |
