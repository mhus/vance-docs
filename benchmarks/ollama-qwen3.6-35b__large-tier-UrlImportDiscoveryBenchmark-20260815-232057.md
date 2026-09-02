# Vance Benchmark - ollama-qwen3.6-35b__large-tier-UrlImportDiscoveryBenchmark-20260815-232057

- **Started:** 2026-08-15T23:20:57.584066Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 3
- **Passed:** 3 / 3 (100%)
- **Average score:** 1.000
- **Total LLM time:** 95.8s
- **Total tokens (in / out):** 499.1k / 596 (10 round-trips)


## url-import-discovery

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `reachesImportToolRun1` | OK | 1.00 | 84.7s | 149.6k | 185 | 3 | doc_import_url was called directly (tool was reachable without looking) — tools: [arthur_action, doc_import_url] |
| `reachesImportToolRun2` | OK | 1.00 | 6.3s | 149.6k | 174 | 3 | doc_import_url was called directly (tool was reachable without looking) — tools: [arthur_action, doc_import_url] |
| `reachesImportToolRun3` | OK | 1.00 | 4.8s | 200.0k | 237 | 4 | doc_import_url was called directly (tool was reachable without looking) — tools: [arthur_action, doc_import_url] |
