# Vance Benchmark - openai-deepseek-v4-pro-HowDoIReflexBenchmark-20260805-181343

- **Started:** 2026-08-05T18:13:43.342355Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 5
- **Passed:** 5 / 5 (100%)
- **Average score:** 0.940
- **Total LLM time:** 96.4s
- **Total tokens (in / out):** 527.2k / 2.7k (21 round-trips)


## how-do-i-reflex

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `discoversAmbiguousMetaphor` | OK | 0.70 | 4.7s | 49.0k | 236 | 2 | model skipped discovery but took a concrete real-tool action for an ambiguous storage metaphor (acceptable) — tools called: [arthur_action, doc_write] |
| `discoversComposedUnknown` | OK | 1.00 | 55.1s | 152.2k | 720 | 6 | model fired how_do_i tool — discovery reflex worked |
| `discoversInventedFeature` | OK | 1.00 | 13.4s | 100.2k | 790 | 4 | model fired how_do_i tool — discovery reflex worked |
| `discoversJargonRequest` | OK | 1.00 | 16.0s | 152.1k | 591 | 6 | model fired how_do_i tool — discovery reflex worked |
| `discoversUnknownTerm` | OK | 1.00 | 7.2s | 73.7k | 403 | 3 | model didn't call how_do_i but flagged discovery intent in prose (soft pass) — tools called: [doc_find, arthur_action, client_file_list] |
