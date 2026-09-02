# Vance Benchmark - ollama-qwen3.6-35b-UrlImportDiscoveryBenchmark-20260814-180649

- **Started:** 2026-08-14T18:06:49.420576Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 3
- **Passed:** 3 / 3 (100%)
- **Average score:** 1.000
- **Total LLM time:** 102.4s
- **Total tokens (in / out):** 498.4k / 474 (10 round-trips)


## url-import-discovery

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `reachesImportToolRun1` | OK | 1.00 | 93.0s | 199.7k | 150 | 4 | doc_import_url was called directly (tool was reachable without looking) — tools: [doc_import_url] |
| `reachesImportToolRun2` | OK | 1.00 | 6.3s | 149.4k | 174 | 3 | doc_import_url was called directly (tool was reachable without looking) — tools: [arthur_action, doc_import_url] |
| `reachesImportToolRun3` | OK | 1.00 | 3.1s | 149.4k | 150 | 3 | doc_import_url was called directly (tool was reachable without looking) — tools: [arthur_action, doc_import_url] |
