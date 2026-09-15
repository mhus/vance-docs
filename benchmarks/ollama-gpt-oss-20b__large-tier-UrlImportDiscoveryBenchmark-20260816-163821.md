# Vance Benchmark - ollama-gpt-oss-20b__large-tier-UrlImportDiscoveryBenchmark-20260816-163821

- **Started:** 2026-08-16T16:38:21.462041Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 3
- **Passed:** 3 / 3 (100%)
- **Average score:** 1.000
- **Total LLM time:** 101.3s
- **Total tokens (in / out):** 472.2k / 2.0k (11 round-trips)


## url-import-discovery

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `reachesImportToolRun1` | OK | 1.00 | 68.3s | 128.5k | 218 | 3 | doc_import_url was called directly (tool was reachable without looking) — tools: [arthur_action, doc_import_url] |
| `reachesImportToolRun2` | OK | 1.00 | 12.4s | 171.8k | 577 | 4 | doc_import_url was called directly (tool was reachable without looking) — tools: [doc_import_url] |
| `reachesImportToolRun3` | OK | 1.00 | 20.5s | 171.9k | 1.2k | 4 | doc_import_url was called directly (tool was reachable without looking) — tools: [doc_import_url] |
