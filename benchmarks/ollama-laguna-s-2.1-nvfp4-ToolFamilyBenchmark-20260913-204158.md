# Vance Benchmark - ollama-laguna-s-2.1-nvfp4-ToolFamilyBenchmark-20260913-204158

- **Started:** 2026-09-13T20:41:58.339336Z
- **Judge:** glm-5.3-nvfp4
- **Knobs:** {chatTimeoutS=480, waitBudgetMinS=240}
- **Score model:** v2-graded
- **Total tests:** 10
- **Passed:** 7 / 10 (70%)
- **Average score:** 0.800
- **Total LLM time:** 1409.8s
- **Total tokens (in / out):** 4.75M / 6.1k (80 round-trips)


## tool-family

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `picksCalendarFamily` | OK | 1.00 | 121.9s | 286.1k | 1.0k | 5 | family 'calendar_*' hit via [calendar_create] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-calendar` | stage | 4.00 | 4.00 | calendar_create |

</details>

| `picksDocFamily` | OK | 1.00 | 76.6s | 162.6k | 191 | 3 | family 'doc_*' hit via [doc_write] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-doc` | stage | 4.00 | 4.00 | doc_write |

</details>

| `picksGraphFamily` | FAIL | 0.33 | 42.1s | 325.8k | 394 | 6 | no 'graph_*' tool within 240s; called: [doc_list, doc_find, doc_read, arthur_action] — 33% — 2/3 checks · missed: family-graph |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-graph` | stage | 0.00 | 4.00 | called instead: [doc_list, doc_find, doc_read, arthur_action] |

</details>

| `picksHookFamily` | OK | 1.00 | 369.7s | 1.23M | 1.2k | 18 | family 'hook_*' hit via [hook_set] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-hook` | stage | 4.00 | 4.00 | hook_set |

</details>

| `picksListFamily` | FAIL | 0.33 | 57.0s | 216.9k | 209 | 4 | no 'list_*' tool within 240s; called: [doc_append, doc_read, arthur_action] — 33% — 2/3 checks · missed: family-list |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-list` | stage | 0.00 | 4.00 | called instead: [doc_append, doc_read, arthur_action] |

</details>

| `picksRecordsFamily` | OK | 1.00 | 86.2s | 326.7k | 423 | 6 | family 'records_*' hit via [records_add_column, records_get_rows, records_update_field] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-records` | stage | 4.00 | 4.00 | records_add_column, records_get_rows, records_update_field |

</details>

| `picksSchedulerFamily` | OK | 1.00 | 177.9s | 1.06M | 1.3k | 17 | family 'scheduler_*' hit via [scheduler_list, scheduler_set] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-scheduler` | stage | 4.00 | 4.00 | scheduler_list, scheduler_set |

</details>

| `picksScratchFamily` | OK | 1.00 | 45.6s | 217.0k | 190 | 4 | family 'scratchpad_*' hit via [scratchpad_set] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-scratchpad` | stage | 4.00 | 4.00 | scratchpad_set |

</details>

| `picksSheetFamily` | FAIL | 0.33 | 383.1s | 548.0k | 717 | 10 | no 'sheet_*' tool within 240s; called: [work_target_get, file_read, work_target_set, file_list, arthur_action, file_find] — 33% — 2/3 checks · missed: family-sheet |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-sheet` | stage | 0.00 | 4.00 | called instead: [work_target_get, file_read, work_target_set, file_list, arthur_action, file_find] |

</details>

| `picksTreeFamily` | OK | 1.00 | 49.8s | 381.6k | 400 | 7 | family 'tree_*' hit via [tree_add_child, tree_get] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-tree` | stage | 4.00 | 4.00 | tree_add_child, tree_get |

</details>

