# Vance Benchmark - ollama-qwen3.6-35b__large-tier-HowDoIReflexBenchmark-20260816-000331

- **Started:** 2026-08-16T00:03:31.442001Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 5
- **Passed:** 5 / 5 (100%)
- **Average score:** 0.940
- **Total LLM time:** 203.4s
- **Total tokens (in / out):** 1.46M / 3.3k (29 round-trips)


## how-do-i-reflex

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `discoversAmbiguousMetaphor` | OK | 0.70 | 8.3s | 149.0k | 328 | 3 | model skipped discovery but took a concrete real-tool action for an ambiguous storage metaphor (acceptable) — tools called: [arthur_action, doc_write] |
| `discoversComposedUnknown` | OK | 1.00 | 53.1s | 354.1k | 563 | 7 | model fired how_do_i tool — discovery reflex worked |
| `discoversInventedFeature` | OK | 1.00 | 47.4s | 149.6k | 487 | 3 | model fired how_do_i tool — discovery reflex worked |
| `discoversJargonRequest` | OK | 1.00 | 25.3s | 307.9k | 885 | 6 | model fired how_do_i tool — discovery reflex worked |
| `discoversUnknownTerm` | OK | 1.00 | 69.2s | 500.6k | 998 | 10 | model didn't call how_do_i but flagged discovery intent in prose (soft pass) — tools called: [work_target_get, file_read, work_exec_list, file_list, arthur_action, file_find, project_current] |
