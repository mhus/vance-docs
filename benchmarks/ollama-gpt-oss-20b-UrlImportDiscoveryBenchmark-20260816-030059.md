# Vance Benchmark - ollama-gpt-oss-20b-UrlImportDiscoveryBenchmark-20260816-030059

- **Started:** 2026-08-16T03:00:59.458671Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 3
- **Passed:** 3 / 3 (100%)
- **Average score:** 1.000
- **Total LLM time:** 93.9s
- **Total tokens (in / out):** 398.3k / 1.6k (12 round-trips)


## url-import-discovery

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `reachesImportToolRun1` | OK | 1.00 | 65.8s | 132.8k | 815 | 4 | doc_import_url was called directly (tool was reachable without looking) — tools: [doc_import_url] |
| `reachesImportToolRun2` | OK | 1.00 | 8.3s | 99.2k | 338 | 3 | doc_import_url was called directly (tool was reachable without looking) — tools: [arthur_action, doc_import_url] |
| `reachesImportToolRun3` | OK | 1.00 | 19.8s | 166.2k | 442 | 5 | doc_import_url was called directly (tool was reachable without looking) — tools: [doc_import_url] |
