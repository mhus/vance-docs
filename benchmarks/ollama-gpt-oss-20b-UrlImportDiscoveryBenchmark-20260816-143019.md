# Vance Benchmark - ollama-gpt-oss-20b-UrlImportDiscoveryBenchmark-20260816-143019

- **Started:** 2026-08-16T14:30:19.083898Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 3
- **Passed:** 3 / 3 (100%)
- **Average score:** 1.000
- **Total LLM time:** 76.4s
- **Total tokens (in / out):** 365.0k / 1.9k (11 round-trips)


## url-import-discovery

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `reachesImportToolRun1` | OK | 1.00 | 48.6s | 65.8k | 321 | 2 | doc_import_url was called directly (tool was reachable without looking) — tools: [arthur_action, doc_import_url] |
| `reachesImportToolRun2` | OK | 1.00 | 16.9s | 132.8k | 1.1k | 4 | doc_import_url was called directly (tool was reachable without looking) — tools: [doc_import_url] |
| `reachesImportToolRun3` | OK | 1.00 | 10.9s | 166.3k | 510 | 5 | doc_import_url was called directly (tool was reachable without looking) — tools: [doc_link, doc_import_url] |
