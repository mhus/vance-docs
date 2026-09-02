# Vance Benchmark - ollama-gpt-oss-20b-HowDoIReflexBenchmark-20260816-151953

- **Started:** 2026-08-16T15:19:53.514179Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 5
- **Passed:** 2 / 5 (40%)
- **Average score:** 0.280
- **Total LLM time:** 260.3s
- **Total tokens (in / out):** 1.23M / 8.5k (37 round-trips)


## how-do-i-reflex

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `discoversAmbiguousMetaphor` | OK | 0.70 | 35.1s | 231.9k | 1.2k | 7 | model skipped discovery but took a concrete real-tool action for an ambiguous storage metaphor (acceptable) — tools called: [project_current, doc_write] |
| `discoversComposedUnknown` | FAIL | 0.00 | 84.1s | 536.0k | 3.1k | 16 | no DISCOVER action and no how_do_i tool call; model attempted tool(s): [search, doc_list, doc_read, project_switch, project_list, doc_grep_path] — likely hallucinated against an unknown term in the prompt |
| `discoversInventedFeature` | FAIL | 0.00 | 13.1s | 32.7k | 1.2k | 1 | no DISCOVER action and no how_do_i tool call; model attempted tool(s): [arthur_action] — likely hallucinated against an unknown term in the prompt |
| `discoversJargonRequest` | FAIL | 0.00 | 44.8s | 269.2k | 1.7k | 8 | no DISCOVER action and no how_do_i tool call; model attempted tool(s): [search, tool_list, ask_user, tool_description, doc_grep_path] — likely hallucinated against an unknown term in the prompt |
| `discoversUnknownTerm` | OK | 0.70 | 83.2s | 164.7k | 1.4k | 5 | model skipped discovery but took a concrete real-tool action for an ambiguous storage metaphor (acceptable) — tools called: [client_file_read, arthur_action, doc_list_in_folder, doc_move] |
