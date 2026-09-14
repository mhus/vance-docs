# Vance Benchmark - ollama-qwen3.8-27b-mlx-ToolFamilyBenchmark-20260913-145250

- **Started:** 2026-09-13T14:52:50.785805Z
- **Judge:** glm-5.3-nvfp4
- **Knobs:** {chatTimeoutS=480, waitBudgetMinS=240}
- **Score model:** v2-graded
- **Total tests:** 10
- **Passed:** 7 / 10 (70%)
- **Average score:** 0.800
- **Total LLM time:** 1184.8s
- **Total tokens (in / out):** 1.49M / 4.5k (39 round-trips)


## tool-family

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `picksCalendarFamily` | FAIL | 0.33 | 107.2s | 43.9k | 178 | 1 | no 'calendar_*' tool within 240s; called: [arthur_action] — 33% — 2/3 checks · missed: family-calendar |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-calendar` | stage | 0.00 | 4.00 | called instead: [arthur_action] |

</details>

| `picksDocFamily` | OK | 1.00 | 63.5s | 99.3k | 380 | 3 | family 'doc_*' hit via [doc_write] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-doc` | stage | 4.00 | 4.00 | doc_write |

</details>

| `picksGraphFamily` | FAIL | 0.33 | 80.3s | 166.0k | 1.6k | 8 | no 'graph_*' tool within 240s; called: [doc_list, doc_find, tool_list, doc_read, arthur_action, tool_description, doc_list_folders] — 33% — 2/3 checks · missed: family-graph |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-graph` | stage | 0.00 | 4.00 | called instead: [doc_list, doc_find, tool_list, doc_read, arthur_action, tool_description, doc_list_folders] |

</details>

| `picksHookFamily` | OK | 1.00 | 56.5s | 106.9k | 751 | 3 | family 'hook_*' hit via [hook_list] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-hook` | stage | 4.00 | 4.00 | hook_list |

</details>

| `picksListFamily` | OK | 1.00 | 57.7s | 132.5k | 205 | 3 | family 'list_*' hit via [list_append] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-list` | stage | 4.00 | 4.00 | list_append |

</details>

| `picksRecordsFamily` | OK | 1.00 | 380.2s | 176.4k | 240 | 4 | family 'records_*' hit via [records_add_column, records_get_schema] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-records` | stage | 4.00 | 4.00 | records_add_column, records_get_schema |

</details>

| `picksSchedulerFamily` | FAIL | 0.33 | 69.0s | 43.9k | 105 | 1 | no 'scheduler_*' tool within 240s; called: [arthur_action] — 33% — 2/3 checks · missed: family-scheduler |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-scheduler` | stage | 0.00 | 4.00 | called instead: [arthur_action] |

</details>

| `picksScratchFamily` | OK | 1.00 | 60.8s | 132.8k | 165 | 3 | family 'scratchpad_*' hit via [scratchpad_set] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-scratchpad` | stage | 4.00 | 4.00 | scratchpad_set |

</details>

| `picksSheetFamily` | OK | 1.00 | 253.5s | 456.4k | 701 | 10 | family 'sheet_*' hit via [sheet_get_cell, sheet_get_range, sheet_set_cell] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-sheet` | stage | 4.00 | 4.00 | sheet_get_cell, sheet_get_range, sheet_set_cell |

</details>

| `picksTreeFamily` | OK | 1.00 | 56.2s | 132.2k | 209 | 3 | family 'tree_*' hit via [tree_add_child, tree_get] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-tree` | stage | 4.00 | 4.00 | tree_add_child, tree_get |

</details>

