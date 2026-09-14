# Vance Benchmark - glm-5.3-nvfp4-ToolFamilyBenchmark-20260912-160907

- **Started:** 2026-09-12T16:09:07.235110Z
- **Judge:** glm-5.3-nvfp4
- **Score model:** v2-graded
- **Total tests:** 10
- **Passed:** 10 / 10 (100%)
- **Average score:** 1.000
- **Total LLM time:** 128.8s
- **Total tokens (in / out):** 2.39M / 21.4k (45 round-trips)


## tool-family

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `picksCalendarFamily` | OK | 1.00 | 9.1s | 166.8k | 2.0k | 3 | family 'calendar_*' hit via [calendar_create] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-calendar` | stage | 4.00 | 4.00 | calendar_create |

</details>

| `picksDocFamily` | OK | 1.00 | 2.5s | 105.6k | 311 | 2 | family 'doc_*' hit via [doc_write] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-doc` | stage | 4.00 | 4.00 | doc_write |

</details>

| `picksGraphFamily` | OK | 1.00 | 29.8s | 483.8k | 4.4k | 9 | family 'graph_*' hit via [graph_get] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-graph` | stage | 4.00 | 4.00 | graph_get |

</details>

| `picksHookFamily` | OK | 1.00 | 7.6s | 71.6k | 1.6k | 2 | family 'hook_*' hit via [hook_list] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-hook` | stage | 4.00 | 4.00 | hook_list |

</details>

| `picksListFamily` | OK | 1.00 | 6.2s | 265.1k | 573 | 5 | family 'list_*' hit via [list_append] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-list` | stage | 4.00 | 4.00 | list_append |

</details>

| `picksRecordsFamily` | OK | 1.00 | 20.4s | 271.0k | 3.6k | 5 | family 'records_*' hit via [records_add_column] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-records` | stage | 4.00 | 4.00 | records_add_column |

</details>

| `picksSchedulerFamily` | OK | 1.00 | 24.1s | 105.5k | 5.1k | 2 | family 'scheduler_*' hit via [scheduler_list] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-scheduler` | stage | 4.00 | 4.00 | scheduler_list |

</details>

| `picksScratchFamily` | OK | 1.00 | 9.6s | 158.8k | 2.0k | 3 | family 'scratchpad_*' hit via [scratchpad_set] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-scratchpad` | stage | 4.00 | 4.00 | scratchpad_set |

</details>

| `picksSheetFamily` | OK | 1.00 | 12.0s | 546.3k | 1.2k | 10 | family 'sheet_*' hit via [sheet_set_cell] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-sheet` | stage | 4.00 | 4.00 | sheet_set_cell |

</details>

| `picksTreeFamily` | OK | 1.00 | 7.4s | 213.0k | 588 | 4 | family 'tree_*' hit via [tree_add_child, tree_find] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-tree` | stage | 4.00 | 4.00 | tree_add_child, tree_find |

</details>

