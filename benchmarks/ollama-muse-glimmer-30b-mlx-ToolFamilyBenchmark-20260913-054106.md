# Vance Benchmark - ollama-muse-glimmer-30b-mlx-ToolFamilyBenchmark-20260913-054106

- **Started:** 2026-09-13T05:41:06.877410Z
- **Judge:** glm-5.3-nvfp4
- **Knobs:** {chatTimeoutS=480, waitBudgetMinS=240}
- **Score model:** v2-graded
- **Total tests:** 10
- **Passed:** 6 / 10 (60%)
- **Average score:** 0.733
- **Total LLM time:** 815.8s
- **Total tokens (in / out):** 3.26M / 10.7k (71 round-trips)


## tool-family

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `picksCalendarFamily` | OK | 1.00 | 127.1s | 337.0k | 1.7k | 7 | family 'calendar_*' hit via [calendar_aggregate] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-calendar` | stage | 4.00 | 4.00 | calendar_aggregate |

</details>

| `picksDocFamily` | OK | 1.00 | 30.9s | 55.8k | 396 | 2 | family 'doc_*' hit via [doc_write] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-doc` | stage | 4.00 | 4.00 | doc_write |

</details>

| `picksGraphFamily` | OK | 1.00 | 30.1s | 222.1k | 486 | 5 | family 'graph_*' hit via [graph_get] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-graph` | stage | 4.00 | 4.00 | graph_get |

</details>

| `picksHookFamily` | OK | 1.00 | 79.3s | 990.1k | 2.1k | 20 | family 'hook_*' hit via [hook_list] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-hook` | stage | 4.00 | 4.00 | hook_list |

</details>

| `picksListFamily` | OK | 1.00 | 16.0s | 133.1k | 527 | 3 | family 'list_*' hit via [list_get] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-list` | stage | 4.00 | 4.00 | list_get |

</details>

| `picksRecordsFamily` | OK | 1.00 | 209.6s | 447.3k | 897 | 10 | family 'records_*' hit via [records_add_column, records_get_rows, records_get_schema] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-records` | stage | 4.00 | 4.00 | records_add_column, records_get_rows, records_get_schema |

</details>

| `picksSchedulerFamily` | FAIL | 0.33 | 100.5s | 180.1k | 833 | 4 | no 'scheduler_*' tool within 240s; called: [arthur_action, tool_description, how_do_i, manual_list] — 33% — 2/3 checks · missed: family-scheduler |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-scheduler` | stage | 0.00 | 4.00 | called instead: [arthur_action, tool_description, how_do_i, manual_list] |

</details>

| `picksScratchFamily` | FAIL | 0.33 | 85.5s | 539.2k | 2.8k | 12 | no 'scratchpad_*' tool within 240s; called: [doc_find, arthur_action, doc_list_in_folder, how_do_i, doc_list_folders, memory_search, manual_list, doc_grep_path] — 33% — 2/3 checks · missed: family-scratchpad |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-scratchpad` | stage | 0.00 | 4.00 | called instead: [doc_find, arthur_action, doc_list_in_folder, how_do_i, doc_list_folders, memory_search, manual_list, doc_grep_path] |

</details>

| `picksSheetFamily` | FAIL | 0.33 | 86.4s | 222.2k | 485 | 5 | no 'sheet_*' tool within 240s; called: [doc_info, doc_find, arthur_action, doc_list_in_folder, doc_list_folders] — 33% — 2/3 checks · missed: family-sheet |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-sheet` | stage | 0.00 | 4.00 | called instead: [doc_info, doc_find, arthur_action, doc_list_in_folder, doc_list_folders] |

</details>

| `picksTreeFamily` | FAIL | 0.33 | 50.5s | 133.0k | 542 | 3 | no 'tree_*' tool within 240s; called: [doc_edit, doc_read, arthur_action] — 33% — 2/3 checks · missed: family-tree |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-tree` | stage | 0.00 | 4.00 | called instead: [doc_edit, doc_read, arthur_action] |

</details>

