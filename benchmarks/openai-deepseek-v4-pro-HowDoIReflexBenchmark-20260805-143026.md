# Vance Benchmark - openai-deepseek-v4-pro-HowDoIReflexBenchmark-20260805-143026

- **Started:** 2026-08-05T14:30:26.612877Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 5
- **Passed:** 3 / 5 (60%)
- **Average score:** 0.600
- **Total LLM time:** 112.5s
- **Total tokens (in / out):** 421.0k / 2.4k (17 round-trips)


## how-do-i-reflex

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `discoversAmbiguousMetaphor` | FAIL | 0.00 | 6.0s | 48.8k | 240 | 2 | no DISCOVER action and no how_do_i tool call; model attempted tool(s): [arthur_action, doc_write] — likely hallucinated against an unknown term in the prompt |
| `discoversComposedUnknown` | OK | 1.00 | 66.8s | 151.3k | 600 | 6 | model fired how_do_i tool — discovery reflex worked |
| `discoversInventedFeature` | OK | 1.00 | 12.2s | 74.2k | 544 | 3 | model fired how_do_i tool — discovery reflex worked |
| `discoversJargonRequest` | FAIL | 0.00 | 7.2s | 48.9k | 659 | 2 | no DISCOVER action and no how_do_i tool call; model attempted tool(s): [doc_find, doc_list, arthur_action, memory_search] — likely hallucinated against an unknown term in the prompt |
| `discoversUnknownTerm` | OK | 1.00 | 20.4s | 97.9k | 378 | 4 | model didn't call how_do_i but flagged discovery intent in prose (soft pass) — tools called: [doc_find, client_file_find, arthur_action] |
