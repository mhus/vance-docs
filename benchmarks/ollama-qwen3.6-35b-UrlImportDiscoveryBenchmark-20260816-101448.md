# Vance Benchmark - ollama-qwen3.6-35b-UrlImportDiscoveryBenchmark-20260816-101448

- **Started:** 2026-08-16T10:14:48.534910Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 3
- **Passed:** 3 / 3 (100%)
- **Average score:** 1.000
- **Total LLM time:** 65.7s
- **Total tokens (in / out):** 357.8k / 523 (9 round-trips)


## url-import-discovery

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `reachesImportToolRun1` | OK | 1.00 | 55.2s | 119.2k | 162 | 3 | doc_import_url was called directly (tool was reachable without looking) — tools: [arthur_action, doc_import_url] |
| `reachesImportToolRun2` | OK | 1.00 | 5.2s | 119.2k | 174 | 3 | doc_import_url was called directly (tool was reachable without looking) — tools: [arthur_action, doc_import_url] |
| `reachesImportToolRun3` | OK | 1.00 | 5.3s | 119.3k | 187 | 3 | doc_import_url was called directly (tool was reachable without looking) — tools: [arthur_action, doc_import_url] |
