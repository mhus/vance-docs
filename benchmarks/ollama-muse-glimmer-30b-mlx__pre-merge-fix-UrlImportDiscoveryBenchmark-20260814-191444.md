# Vance Benchmark - ollama-muse-glimmer-30b-mlx__pre-merge-fix-UrlImportDiscoveryBenchmark-20260814-191444

- **Started:** 2026-08-14T19:14:44.766624Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 3
- **Passed:** 0 / 3 (0%)
- **Average score:** 0.000
- **Total LLM time:** 301.3s
- **Total tokens (in / out):** 1.22M / 2.4k (10 round-trips)


## url-import-discovery

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `reachesImportToolRun1` | FAIL | 0.00 | 241.4s | 486.7k | 748 | 4 | no discovery and no doc_import_url — settled for [web_fetch, doc_write]. Tools: [arthur_action, project_current, doc_write, web_fetch] |
| `reachesImportToolRun2` | FAIL | 0.00 | 35.6s | 365.0k | 950 | 3 | no discovery and no doc_import_url — settled for [web_fetch, doc_write]. Tools: [arthur_action, doc_write, web_fetch] |
| `reachesImportToolRun3` | FAIL | 0.00 | 24.3s | 365.0k | 733 | 3 | no discovery and no doc_import_url — settled for [web_fetch, doc_write]. Tools: [arthur_action, doc_write, web_fetch] |
