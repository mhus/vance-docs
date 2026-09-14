# Vance Benchmark - ollama-muse-glimmer-30b-mlx-HowDoIReflexBenchmark-20260913-065555

- **Started:** 2026-09-13T06:55:55.298796Z
- **Judge:** glm-5.3-nvfp4
- **Knobs:** {chatTimeoutS=480, waitBudgetMinS=240}
- **Score model:** v2-graded
- **Total tests:** 5
- **Passed:** 3 / 5 (60%)
- **Average score:** 0.717
- **Total LLM time:** 603.5s
- **Total tokens (in / out):** 3.13M / 5.7k (68 round-trips)


## how-do-i-reflex

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `discoversAmbiguousMetaphor` | OK | 1.00 | 49.7s | 930.3k | 1.1k | 20 | model fired how_do_i tool — discovery reflex worked — 100% — 4/4 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `discovery-fired` | check | 2.50 | 2.50 | how_do_i tool |
| `discovery-signalled` | check | 1.00 | 1.00 | flagged the intent in prose |
| `concrete-action-accepted` | check | 1.00 | 1.00 | acted via [manual_read, doc_find, doc_list, doc_read, doc_list_by_tag, doc_list_in_folder, doc_list_folders, how_do_i, manual_list, doc_grep_path] |

</details>

| `discoversComposedUnknown` | FAIL | 0.22 | 29.4s | 356.7k | 735 | 8 | no discovery; model attempted tool(s): [doc_list, doc_find, arthur_action, doc_list_in_folder, doc_list_folders] — likely proceeded as if it knew the unknown term — 22% — 1/3 checks · missed: discovery-fired, discovery-signalled |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `discovery-fired` | check | 0.00 | 2.50 | no DISCOVER action and no how_do_i call |
| `discovery-signalled` | check | 0.00 | 1.00 |  |

</details>

| `discoversInventedFeature` | OK | 1.00 | 90.2s | 948.1k | 1.6k | 20 | model fired how_do_i tool — discovery reflex worked — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `discovery-fired` | check | 2.50 | 2.50 | how_do_i tool |
| `discovery-signalled` | check | 1.00 | 1.00 | flagged the intent in prose |

</details>

| `discoversJargonRequest` | OK | 1.00 | 80.4s | 223.8k | 563 | 5 | model fired DISCOVER action — discovery reflex worked — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `discovery-fired` | check | 2.50 | 2.50 | DISCOVER action |
| `discovery-signalled` | check | 1.00 | 1.00 | flagged the intent in prose |

</details>

| `discoversUnknownTerm` | FAIL | 0.36 | 353.9s | 674.8k | 1.7k | 15 | no discovery; model attempted tool(s): [doc_list_trash, doc_find, doc_list, file_list, arthur_action, file_find, doc_list_in_folder, doc_list_folders, doc_grep_path] — likely proceeded as if it knew the unknown term — 36% — 2/4 checks · missed: discovery-fired, discovery-signalled |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `discovery-fired` | check | 0.00 | 2.50 | no DISCOVER action and no how_do_i call |
| `discovery-signalled` | check | 0.00 | 1.00 |  |
| `concrete-action-accepted` | check | 1.00 | 1.00 | acted via [doc_list_trash, doc_find, doc_list, file_list, arthur_action, file_find, doc_list_in_folder, doc_list_folders, doc_grep_path] |

</details>

