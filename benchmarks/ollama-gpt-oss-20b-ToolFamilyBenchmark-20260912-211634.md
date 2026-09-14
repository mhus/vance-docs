# Vance Benchmark - ollama-gpt-oss-20b-ToolFamilyBenchmark-20260912-211634

- **Started:** 2026-09-12T21:16:34.993597Z
- **Judge:** glm-5.3-nvfp4
- **Knobs:** {chatTimeoutS=480, waitBudgetMinS=240}
- **Score model:** v2-graded
- **Total tests:** 10
- **Passed:** 5 / 10 (50%)
- **Average score:** 0.650
- **Total LLM time:** 564.4s
- **Total tokens (in / out):** 2.35M / 15.3k (65 round-trips)


## tool-family

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `picksCalendarFamily` | FAIL | 0.33 | 84.3s | 187.4k | 811 | 5 | no 'calendar_*' tool within 240s; called: [invoke_tool, defaults_read] — 33% — 2/3 checks · missed: family-calendar |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-calendar` | stage | 0.00 | 4.00 | called instead: [invoke_tool, defaults_read] |

</details>

| `picksDocFamily` | OK | 1.00 | 14.2s | 74.0k | 1.1k | 2 | family 'doc_*' hit via [doc_write] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-doc` | stage | 4.00 | 4.00 | doc_write |

</details>

| `picksGraphFamily` | FAIL | 0.33 | 71.5s | 678.6k | 1.7k | 18 | no 'graph_*' tool within 240s; called: [search, doc_list, doc_find, project_switch, doc_read, project_list, project_current] — 33% — 2/3 checks · missed: family-graph |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-graph` | stage | 0.00 | 4.00 | called instead: [search, doc_list, doc_find, project_switch, doc_read, project_list, project_current] |

</details>

| `picksHookFamily` | FAIL | 0.33 | 98.1s | 301.8k | 4.4k | 8 | no 'hook_*' tool within 240s; called: [doc_write, doc_replace_lines] — 33% — 2/3 checks · missed: family-hook |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-hook` | stage | 0.00 | 4.00 | called instead: [doc_write, doc_replace_lines] |

</details>

| `picksListFamily` | FAIL | 0.33 | 34.6s | 148.5k | 673 | 4 | no 'list_*' tool within 240s; called: [doc_append] — 33% — 2/3 checks · missed: family-list |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-list` | stage | 0.00 | 4.00 | called instead: [doc_append] |

</details>

| `picksRecordsFamily` | OK | 1.00 | 40.4s | 148.8k | 893 | 4 | family 'records_*' hit via [records_add_column] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-records` | stage | 4.00 | 4.00 | records_add_column |

</details>

| `picksSchedulerFamily` | FAIL | 0.17 | 12.2s | 111.5k | 697 | 3 | no 'scheduler_*' tool within 240s; called: <none> — 17% — 1/3 checks · missed: any-tool-called, family-scheduler(skipped) |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 0.00 | 1.00 | no tool call at all |
| `family-scheduler` | stage | skipped | 4.00 | chain stopped earlier |

</details>

| `picksScratchFamily` | OK | 1.00 | 97.1s | 175.1k | 3.0k | 7 | family 'scratchpad_*' hit via [scratchpad_set] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-scratchpad` | stage | 4.00 | 4.00 | scratchpad_set |

</details>

| `picksSheetFamily` | OK | 1.00 | 56.1s | 262.6k | 1.2k | 7 | family 'sheet_*' hit via [sheet_set_cell] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-sheet` | stage | 4.00 | 4.00 | sheet_set_cell |

</details>

| `picksTreeFamily` | OK | 1.00 | 55.8s | 261.6k | 1.0k | 7 | family 'tree_*' hit via [tree_add_child, tree_get] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-tree` | stage | 4.00 | 4.00 | tree_add_child, tree_get |

</details>

