# Vance Benchmark - ollama-muse-glimmer-30b-mlx-HowDoIReflexBenchmark-20260816-132010

- **Started:** 2026-08-16T13:20:10.691610Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 5
- **Passed:** 4 / 5 (80%)
- **Average score:** 0.680
- **Total LLM time:** 496.0s
- **Total tokens (in / out):** 2.09M / 5.3k (51 round-trips)


## how-do-i-reflex

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `discoversAmbiguousMetaphor` | OK | 0.70 | 49.2s | 442.5k | 1.1k | 11 | model skipped discovery but took a concrete real-tool action for an ambiguous storage metaphor (acceptable) — tools called: [doc_list_trash, doc_list, doc_find, arthur_action, doc_list_in_folder, memory_search, doc_list_folders, doc_grep_path] |
| `discoversComposedUnknown` | FAIL | 0.00 | 30.3s | 239.7k | 525 | 6 | no DISCOVER action and no how_do_i tool call; model attempted tool(s): [doc_list, doc_find, arthur_action, doc_list_in_folder, doc_list_folders] — likely hallucinated against an unknown term in the prompt |
| `discoversInventedFeature` | OK | 1.00 | 140.2s | 409.7k | 1.3k | 10 | model fired how_do_i tool — discovery reflex worked |
| `discoversJargonRequest` | OK | 1.00 | 124.2s | 841.4k | 1.4k | 20 | model fired how_do_i tool — discovery reflex worked |
| `discoversUnknownTerm` | OK | 0.70 | 152.1s | 159.6k | 899 | 4 | model skipped discovery but took a concrete real-tool action for an ambiguous storage metaphor (acceptable) — tools called: [file_read, file_list, arthur_action, file_find] |
