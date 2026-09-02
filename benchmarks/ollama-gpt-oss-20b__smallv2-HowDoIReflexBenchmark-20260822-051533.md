# Vance Benchmark - ollama-gpt-oss-20b__smallv2-HowDoIReflexBenchmark-20260822-051533

- **Started:** 2026-08-22T05:15:33.343511Z
- **Judge:** gemini-gemini-2.5-pro
- **Knobs:** {chatTimeoutS=600, waitBudgetMinS=300}
- **Score model:** v2-graded
- **Total tests:** 5
- **Passed:** 0 / 5 (0%)
- **Average score:** 0.279
- **Total LLM time:** 527.7s
- **Total tokens (in / out):** 1.75M / 17.7k (51 round-trips)


## how-do-i-reflex

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `discoversAmbiguousMetaphor` | FAIL | 0.36 | 57.6s | 67.3k | 3.1k | 2 | no discovery; model attempted tool(s): [arthur_action, doc_write] — likely proceeded as if it knew the unknown term — 36% — 2/4 checks · missed: discovery-fired, discovery-signalled |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `discovery-fired` | check | 0.00 | 2.50 | no DISCOVER action and no how_do_i call |
| `discovery-signalled` | check | 0.00 | 1.00 |  |
| `concrete-action-accepted` | check | 1.00 | 1.00 | acted via [arthur_action, doc_write] |

</details>

| `discoversComposedUnknown` | FAIL | 0.22 | 27.6s | 33.5k | 575 | 1 | no discovery; model attempted tool(s): [arthur_action] — likely proceeded as if it knew the unknown term — 22% — 1/3 checks · missed: discovery-fired, discovery-signalled |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `discovery-fired` | check | 0.00 | 2.50 | no DISCOVER action and no how_do_i call |
| `discovery-signalled` | check | 0.00 | 1.00 |  |

</details>

| `discoversInventedFeature` | FAIL | 0.22 | 153.7s | 688.9k | 3.8k | 20 | no discovery; model attempted tool(s): [doc_find, doc_list, doc_read, file_list, doc_get, doc_list_in_folder, file_find, project_list, doc_grep, doc_grep_path] — likely proceeded as if it knew the unknown term — 22% — 1/3 checks · missed: discovery-fired, discovery-signalled |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `discovery-fired` | check | 0.00 | 2.50 | no DISCOVER action and no how_do_i call |
| `discovery-signalled` | check | 0.00 | 1.00 |  |

</details>

| `discoversJargonRequest` | FAIL | 0.22 | 83.3s | 690.7k | 3.5k | 20 | no discovery; model attempted tool(s): [search, doc_find, tool_list, doc_list_in_folder, doc_grep, event_list, tool_description, memory_search, project_current, manual_list, doc_grep_path] — likely proceeded as if it knew the unknown term — 22% — 1/3 checks · missed: discovery-fired, discovery-signalled |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `discovery-fired` | check | 0.00 | 2.50 | no DISCOVER action and no how_do_i call |
| `discovery-signalled` | check | 0.00 | 1.00 |  |

</details>

| `discoversUnknownTerm` | FAIL | 0.36 | 205.6s | 271.2k | 6.7k | 8 | no discovery; model attempted tool(s): [client_file_read, doc_list, arthur_action, doc_list_folders, doc_move, execute_javascript] — likely proceeded as if it knew the unknown term — 36% — 2/4 checks · missed: discovery-fired, discovery-signalled |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `discovery-fired` | check | 0.00 | 2.50 | no DISCOVER action and no how_do_i call |
| `discovery-signalled` | check | 0.00 | 1.00 |  |
| `concrete-action-accepted` | check | 1.00 | 1.00 | acted via [client_file_read, doc_list, arthur_action, doc_list_folders, doc_move, execute_javascript] |

</details>

