# Vance Benchmark - openai-gpt-oss-20b-UrlImportDiscoveryBenchmark-20260807-133902

- **Started:** 2026-08-07T13:39:02.980164Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 3
- **Passed:** 3 / 3 (100%)
- **Average score:** 1.000
- **Total LLM time:** 32.0s
- **Total tokens (in / out):** 564.7k / 1.9k (14 round-trips)


## url-import-discovery

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `reachesImportToolRun1` | OK | 1.00 | 12.2s | 201.8k | 842 | 5 | doc_import_url was called directly (tool was reachable without looking) — tools: [doc_link, doc_import_url] |
| `reachesImportToolRun2` | OK | 1.00 | 8.5s | 161.1k | 457 | 4 | doc_import_url was called directly (tool was reachable without looking) — tools: [doc_import_url] |
| `reachesImportToolRun3` | OK | 1.00 | 11.3s | 201.8k | 643 | 5 | doc_import_url was called directly (tool was reachable without looking) — tools: [doc_link, doc_import_url] |
