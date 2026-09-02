# Vance Benchmark - ollama-gemma4-31b-mlx-HowDoIReflexBenchmark-20260816-092724

- **Started:** 2026-08-16T09:27:24.735909Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 5
- **Passed:** 3 / 5 (60%)
- **Average score:** 0.480
- **Total LLM time:** 309.7s
- **Total tokens (in / out):** 370.6k / 950 (16 round-trips)


## how-do-i-reflex

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `discoversAmbiguousMetaphor` | OK | 0.70 | 36.5s | 69.6k | 304 | 4 | model skipped discovery but took a concrete real-tool action for an ambiguous storage metaphor (acceptable) — tools called: [doc_list, arthur_action, doc_write] |
| `discoversComposedUnknown` | FAIL | 0.00 | 116.3s | 49.1k | 159 | 2 | no DISCOVER action and no how_do_i tool call; model attempted tool(s): [doc_find, arthur_action] — likely hallucinated against an unknown term in the prompt |
| `discoversInventedFeature` | OK | 1.00 | 18.4s | 115.9k | 225 | 3 | model fired DISCOVER action — discovery reflex worked |
| `discoversJargonRequest` | FAIL | 0.00 | 36.7s | 97.9k | 187 | 6 | no DISCOVER action and no how_do_i tool call; model attempted tool(s): [manual_read, doc_find, arthur_action, memory_search, manual_list] — likely hallucinated against an unknown term in the prompt |
| `discoversUnknownTerm` | OK | 0.70 | 101.9s | 38.2k | 75 | 1 | model skipped discovery but took a concrete real-tool action for an ambiguous storage metaphor (acceptable) — tools called: [arthur_action] |
