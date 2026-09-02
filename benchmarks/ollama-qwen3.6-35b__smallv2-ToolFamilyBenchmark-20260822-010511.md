# Vance Benchmark - ollama-qwen3.6-35b__smallv2-ToolFamilyBenchmark-20260822-010511

- **Started:** 2026-08-22T01:05:11.935004Z
- **Judge:** gemini-gemini-2.5-pro
- **Knobs:** {chatTimeoutS=600, waitBudgetMinS=300}
- **Score model:** v2-graded
- **Total tests:** 10
- **Passed:** 8 / 10 (80%)
- **Average score:** 0.850
- **Total LLM time:** 341.5s
- **Total tokens (in / out):** 1.87M / 4.1k (46 round-trips)


## tool-family

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `picksCalendarFamily` | OK | 1.00 | 77.2s | 253.5k | 1.0k | 6 | family 'calendar_*' hit via [calendar_app_create, calendar_create] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-calendar` | stage | 4.00 | 4.00 | calendar_app_create, calendar_create |

</details>

| `picksDocFamily` | OK | 1.00 | 6.0s | 120.9k | 249 | 3 | family 'doc_*' hit via [doc_write] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-doc` | stage | 4.00 | 4.00 | doc_write |

</details>

| `picksGraphFamily` | OK | 1.00 | 36.2s | 201.7k | 477 | 5 | family 'graph_*' hit via [graph_find_node] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-graph` | stage | 4.00 | 4.00 | graph_find_node |

</details>

| `picksHookFamily` | FAIL | 0.17 | 7.1s | 121.1k | 281 | 3 | no 'hook_*' tool within 300s; called: <none> — 17% — 1/3 checks · missed: any-tool-called, family-hook(skipped) |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 0.00 | 1.00 | no tool call at all |
| `family-hook` | stage | skipped | 4.00 | chain stopped earlier |

</details>

| `picksListFamily` | OK | 1.00 | 41.3s | 325.3k | 436 | 8 | family 'list_*' hit via [list_append] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-list` | stage | 4.00 | 4.00 | list_append |

</details>

| `picksRecordsFamily` | OK | 1.00 | 29.6s | 121.1k | 176 | 3 | family 'records_*' hit via [records_add_column] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-records` | stage | 4.00 | 4.00 | records_add_column |

</details>

| `picksSchedulerFamily` | FAIL | 0.33 | 32.2s | 161.5k | 397 | 4 | no 'scheduler_*' tool within 300s; called: [arthur_action, how_do_i] — 33% — 2/3 checks · missed: family-scheduler |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-scheduler` | stage | 0.00 | 4.00 | called instead: [arthur_action, how_do_i] |

</details>

| `picksScratchFamily` | OK | 1.00 | 62.3s | 161.6k | 244 | 4 | family 'scratchpad_*' hit via [scratchpad_set] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-scratchpad` | stage | 4.00 | 4.00 | scratchpad_set |

</details>

| `picksSheetFamily` | OK | 1.00 | 11.5s | 202.7k | 487 | 5 | family 'sheet_*' hit via [sheet_get_cell] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-sheet` | stage | 4.00 | 4.00 | sheet_get_cell |

</details>

| `picksTreeFamily` | OK | 1.00 | 38.1s | 202.7k | 366 | 5 | family 'tree_*' hit via [tree_add_child, tree_get] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-tree` | stage | 4.00 | 4.00 | tree_add_child, tree_get |

</details>

