# Vance Benchmark - ollama-muse-glimmer-30b-mlx__smallv2-ToolFamilyBenchmark-20260822-073906

- **Started:** 2026-08-22T07:39:06.058617Z
- **Judge:** gemini-gemini-2.5-pro
- **Knobs:** {chatTimeoutS=600, waitBudgetMinS=300}
- **Score model:** v2-graded
- **Total tests:** 10
- **Passed:** 3 / 10 (30%)
- **Average score:** 0.533
- **Total LLM time:** 783.0s
- **Total tokens (in / out):** 2.83M / 7.4k (67 round-trips)


## tool-family

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `picksCalendarFamily` | FAIL | 0.33 | 12.1s | 40.5k | 390 | 1 | no 'calendar_*' tool within 300s; called: [arthur_action] — 33% — 2/3 checks · missed: family-calendar |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-calendar` | stage | 0.00 | 4.00 | called instead: [arthur_action] |

</details>

| `picksDocFamily` | OK | 1.00 | 62.2s | 81.2k | 322 | 2 | family 'doc_*' hit via [doc_write] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-doc` | stage | 4.00 | 4.00 | doc_write |

</details>

| `picksGraphFamily` | FAIL | 0.33 | 80.1s | 285.7k | 505 | 7 | no 'graph_*' tool within 300s; called: [doc_list, doc_find, doc_read, arthur_action, doc_list_in_folder, doc_list_folders, project_current] — 33% — 2/3 checks · missed: family-graph |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-graph` | stage | 0.00 | 4.00 | called instead: [doc_list, doc_find, doc_read, arthur_action, doc_list_in_folder, doc_list_folders, project_current] |

</details>

| `picksHookFamily` | FAIL | 0.33 | 200.9s | 287.8k | 947 | 7 | no 'hook_*' tool within 300s; called: [event_get, arthur_action, doc_list_in_folder, event_list, tool_description, doc_list_folders, doc_write] — 33% — 2/3 checks · missed: family-hook |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-hook` | stage | 0.00 | 4.00 | called instead: [event_get, arthur_action, doc_list_in_folder, event_list, tool_description, doc_list_folders, doc_write] |

</details>

| `picksListFamily` | FAIL | 0.33 | 68.7s | 326.9k | 548 | 8 | no 'list_*' tool within 300s; called: [doc_find, doc_append, doc_read, arthur_action, doc_list_in_folder, doc_list_folders] — 33% — 2/3 checks · missed: family-list |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-list` | stage | 0.00 | 4.00 | called instead: [doc_find, doc_append, doc_read, arthur_action, doc_list_in_folder, doc_list_folders] |

</details>

| `picksRecordsFamily` | OK | 1.00 | 72.8s | 245.8k | 864 | 6 | family 'records_*' hit via [records_add_column, records_get_rows] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-records` | stage | 4.00 | 4.00 | records_add_column, records_get_rows |

</details>

| `picksSchedulerFamily` | FAIL | 0.33 | 53.0s | 40.5k | 465 | 1 | no 'scheduler_*' tool within 300s; called: [arthur_action] — 33% — 2/3 checks · missed: family-scheduler |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-scheduler` | stage | 0.00 | 4.00 | called instead: [arthur_action] |

</details>

| `picksScratchFamily` | FAIL | 0.33 | 69.8s | 835.0k | 1.9k | 20 | no 'scratchpad_*' tool within 300s; called: [doc_list_trash, doc_find, doc_list, doc_list_by_tag, doc_list_in_folder, doc_list_folders, doc_grep_path] — 33% — 2/3 checks · missed: family-scratchpad |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-scratchpad` | stage | 0.00 | 4.00 | called instead: [doc_list_trash, doc_find, doc_list, doc_list_by_tag, doc_list_in_folder, doc_list_folders, doc_grep_path] |

</details>

| `picksSheetFamily` | FAIL | 0.33 | 14.5s | 285.6k | 504 | 7 | no 'sheet_*' tool within 300s; called: [doc_list, doc_find, arthur_action, doc_list_in_folder, doc_list_folders] — 33% — 2/3 checks · missed: family-sheet |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-sheet` | stage | 0.00 | 4.00 | called instead: [doc_list, doc_find, arthur_action, doc_list_in_folder, doc_list_folders] |

</details>

| `picksTreeFamily` | OK | 1.00 | 148.7s | 401.8k | 926 | 8 | family 'tree_*' hit via [tree_add_child, tree_get] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-tree` | stage | 4.00 | 4.00 | tree_add_child, tree_get |

</details>

