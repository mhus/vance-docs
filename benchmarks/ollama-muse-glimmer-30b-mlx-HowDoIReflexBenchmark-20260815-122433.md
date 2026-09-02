# Vance Benchmark - ollama-muse-glimmer-30b-mlx-HowDoIReflexBenchmark-20260815-122433

- **Started:** 2026-08-15T12:24:33.371660Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 5
- **Passed:** 4 / 5 (80%)
- **Average score:** 0.680
- **Total LLM time:** 439.9s
- **Total tokens (in / out):** 2.13M / 3.8k (42 round-trips)


## how-do-i-reflex

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `discoversAmbiguousMetaphor` | OK | 0.70 | 11.1s | 49.3k | 351 | 1 | model skipped discovery but took a concrete real-tool action for an ambiguous storage metaphor (acceptable) — tools called: [arthur_action] |
| `discoversComposedUnknown` | OK | 1.00 | 127.6s | 1.03M | 1.0k | 20 | model fired how_do_i tool — discovery reflex worked |
| `discoversInventedFeature` | OK | 1.00 | 54.6s | 149.1k | 433 | 3 | model fired DISCOVER action — discovery reflex worked |
| `discoversJargonRequest` | FAIL | 0.00 | 129.0s | 703.2k | 1.2k | 14 | no DISCOVER action and no how_do_i tool call; model attempted tool(s): [doc_info, doc_list_trash, doc_list, doc_read, arthur_action, doc_list_in_folder, doc_list_folders, project_current, doc_version_list] — likely hallucinated against an unknown term in the prompt |
| `discoversUnknownTerm` | OK | 0.70 | 117.7s | 198.0k | 799 | 4 | model skipped discovery but took a concrete real-tool action for an ambiguous storage metaphor (acceptable) — tools called: [file_list, arthur_action, file_find] |
