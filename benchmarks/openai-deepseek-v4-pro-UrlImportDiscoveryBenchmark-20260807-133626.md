# Vance Benchmark - openai-deepseek-v4-pro-UrlImportDiscoveryBenchmark-20260807-133626

- **Started:** 2026-08-07T13:36:26.473663Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 3
- **Passed:** 3 / 3 (100%)
- **Average score:** 1.000
- **Total LLM time:** 37.2s
- **Total tokens (in / out):** 337.8k / 657 (7 round-trips)


## url-import-discovery

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `reachesImportToolRun1` | OK | 1.00 | 9.1s | 96.5k | 195 | 2 | doc_import_url was called directly (tool was reachable without looking) — tools: [arthur_action, doc_import_url] |
| `reachesImportToolRun2` | OK | 1.00 | 21.4s | 96.5k | 196 | 2 | doc_import_url was called directly (tool was reachable without looking) — tools: [arthur_action, doc_import_url] |
| `reachesImportToolRun3` | OK | 1.00 | 6.7s | 144.8k | 266 | 3 | doc_import_url was called directly (tool was reachable without looking) — tools: [arthur_action, doc_import_url, web_fetch] |
