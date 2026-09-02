# Vance Benchmark - ollama-muse-glimmer-30b-mlx__smallv2-HowDoIReflexBenchmark-20260822-090226

- **Started:** 2026-08-22T09:02:26.685530Z
- **Judge:** gemini-gemini-2.5-pro
- **Knobs:** {chatTimeoutS=600, waitBudgetMinS=300}
- **Score model:** v2-graded
- **Total tests:** 5
- **Passed:** 2 / 5 (40%)
- **Average score:** 0.590
- **Total LLM time:** 351.5s
- **Total tokens (in / out):** 1.44M / 4.1k (35 round-trips)


## how-do-i-reflex

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `discoversAmbiguousMetaphor` | FAIL | 0.36 | 45.3s | 245.1k | 1.0k | 6 | no discovery; model attempted tool(s): [doc_find, arthur_action, doc_list_in_folder, doc_list_folders, doc_write] — likely proceeded as if it knew the unknown term — 36% — 2/4 checks · missed: discovery-fired, discovery-signalled |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `discovery-fired` | check | 0.00 | 2.50 | no DISCOVER action and no how_do_i call |
| `discovery-signalled` | check | 0.00 | 1.00 |  |
| `concrete-action-accepted` | check | 1.00 | 1.00 | acted via [doc_find, arthur_action, doc_list_in_folder, doc_list_folders, doc_write] |

</details>

| `discoversComposedUnknown` | FAIL | 0.22 | 38.0s | 704.9k | 1.2k | 17 | no discovery; model attempted tool(s): [doc_list_trash, kit_status, doc_list, doc_find, doc_read, arthur_action, doc_list_in_folder, project_current, doc_list_folders, doc_grep_path] — likely proceeded as if it knew the unknown term — 22% — 1/3 checks · missed: discovery-fired, discovery-signalled |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `discovery-fired` | check | 0.00 | 2.50 | no DISCOVER action and no how_do_i call |
| `discovery-signalled` | check | 0.00 | 1.00 |  |

</details>

| `discoversInventedFeature` | OK | 1.00 | 119.1s | 205.0k | 566 | 5 | model fired DISCOVER action — discovery reflex worked — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `discovery-fired` | check | 2.50 | 2.50 | DISCOVER action |
| `discovery-signalled` | check | 1.00 | 1.00 | flagged the intent in prose |

</details>

| `discoversJargonRequest` | OK | 1.00 | 27.6s | 165.0k | 600 | 4 | model fired DISCOVER action — discovery reflex worked — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `discovery-fired` | check | 2.50 | 2.50 | DISCOVER action |
| `discovery-signalled` | check | 1.00 | 1.00 |  |

</details>

| `discoversUnknownTerm` | FAIL | 0.36 | 121.6s | 122.0k | 644 | 3 | no discovery; model attempted tool(s): [file_list, arthur_action, file_find] — likely proceeded as if it knew the unknown term — 36% — 2/4 checks · missed: discovery-fired, discovery-signalled |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `discovery-fired` | check | 0.00 | 2.50 | no DISCOVER action and no how_do_i call |
| `discovery-signalled` | check | 0.00 | 1.00 |  |
| `concrete-action-accepted` | check | 1.00 | 1.00 | acted via [file_list, arthur_action, file_find] |

</details>

