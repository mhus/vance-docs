# Vance Benchmark - ollama-qwen3.6-35b-ToolFamilyBenchmark-20260913-083608

- **Started:** 2026-09-13T08:36:08.341008Z
- **Judge:** glm-5.3-nvfp4
- **Knobs:** {chatTimeoutS=480, waitBudgetMinS=240}
- **Score model:** v2-graded
- **Total tests:** 10
- **Passed:** 9 / 10 (90%)
- **Average score:** 0.933
- **Total LLM time:** 618.8s
- **Total tokens (in / out):** 2.78M / 5.3k (62 round-trips)


## tool-family

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `picksCalendarFamily` | OK | 1.00 | 5.7s | 43.9k | 215 | 1 | family 'calendar_*' hit via [calendar_create] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-calendar` | stage | 4.00 | 4.00 | calendar_create |

</details>

| `picksDocFamily` | OK | 1.00 | 42.8s | 176.7k | 290 | 4 | family 'doc_*' hit via [doc_write] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-doc` | stage | 4.00 | 4.00 | doc_write |

</details>

| `picksGraphFamily` | OK | 1.00 | 74.4s | 132.5k | 373 | 3 | family 'graph_*' hit via [graph_add_edge] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-graph` | stage | 4.00 | 4.00 | graph_add_edge |

</details>

| `picksHookFamily` | OK | 1.00 | 147.0s | 630.5k | 1.5k | 14 | family 'hook_*' hit via [hook_get, hook_list, hook_set] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-hook` | stage | 4.00 | 4.00 | hook_get, hook_list, hook_set |

</details>

| `picksListFamily` | OK | 1.00 | 41.6s | 176.6k | 251 | 4 | family 'list_*' hit via [list_append, list_get] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-list` | stage | 4.00 | 4.00 | list_append, list_get |

</details>

| `picksRecordsFamily` | OK | 1.00 | 41.1s | 132.5k | 194 | 3 | family 'records_*' hit via [records_add_column] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-records` | stage | 4.00 | 4.00 | records_add_column |

</details>

| `picksSchedulerFamily` | OK | 1.00 | 65.5s | 176.9k | 391 | 4 | family 'scheduler_*' hit via [scheduler_set] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-scheduler` | stage | 4.00 | 4.00 | scheduler_set |

</details>

| `picksScratchFamily` | OK | 1.00 | 67.1s | 220.8k | 274 | 5 | family 'scratchpad_*' hit via [scratchpad_list, scratchpad_set] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-scratchpad` | stage | 4.00 | 4.00 | scratchpad_list, scratchpad_set |

</details>

| `picksSheetFamily` | OK | 1.00 | 124.2s | 917.6k | 1.3k | 20 | family 'sheet_*' hit via [sheet_set_cell] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-sheet` | stage | 4.00 | 4.00 | sheet_set_cell |

</details>

| `picksTreeFamily` | FAIL | 0.33 | 9.5s | 176.6k | 412 | 4 | no 'tree_*' tool within 240s; called: [doc_edit, doc_read, arthur_action] — 33% — 2/3 checks · missed: family-tree |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-tree` | stage | 0.00 | 4.00 | called instead: [doc_edit, doc_read, arthur_action] |

</details>

