# Vance Benchmark - ollama-gpt-oss-20b__baseline-ToolFamilyBenchmark-20260824-000555

- **Started:** 2026-08-24T00:05:55.038818Z
- **Judge:** gemini-gemini-2.5-pro
- **Knobs:** {chatTimeoutS=600, waitBudgetMinS=300}
- **Score model:** v2-graded
- **Total tests:** 10
- **Passed:** 7 / 10 (70%)
- **Average score:** 0.800
- **Total LLM time:** 752.8s
- **Total tokens (in / out):** 2.02M / 25.3k (62 round-trips)


## tool-family

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `picksCalendarFamily` | OK | 1.00 | 74.2s | 102.5k | 1.7k | 3 | family 'calendar_*' hit via [calendar_create] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-calendar` | stage | 4.00 | 4.00 | calendar_create |

</details>

| `picksDocFamily` | OK | 1.00 | 8.5s | 135.8k | 373 | 4 | family 'doc_*' hit via [doc_write] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-doc` | stage | 4.00 | 4.00 | doc_write |

</details>

| `picksGraphFamily` | OK | 1.00 | 115.6s | 376.2k | 2.8k | 11 | family 'graph_*' hit via [graph_add_edge] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-graph` | stage | 4.00 | 4.00 | graph_add_edge |

</details>

| `picksHookFamily` | FAIL | 0.33 | 102.2s | 205.6k | 5.5k | 6 | no 'hook_*' tool within 300s; called: [arthur_action, event_set, doc_write, vance_notify] — 33% — 2/3 checks · missed: family-hook |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-hook` | stage | 0.00 | 4.00 | called instead: [arthur_action, event_set, doc_write, vance_notify] |

</details>

| `picksListFamily` | FAIL | 0.33 | 14.1s | 135.6k | 752 | 4 | no 'list_*' tool within 300s; called: [doc_append] — 33% — 2/3 checks · missed: family-list |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-list` | stage | 0.00 | 4.00 | called instead: [doc_append] |

</details>

| `picksRecordsFamily` | OK | 1.00 | 120.7s | 207.0k | 3.7k | 9 | family 'records_*' hit via [records_add_column] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-records` | stage | 4.00 | 4.00 | records_add_column |

</details>

| `picksSchedulerFamily` | OK | 1.00 | 46.9s | 170.4k | 1.5k | 5 | family 'scheduler_*' hit via [scheduler_set] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-scheduler` | stage | 4.00 | 4.00 | scheduler_set |

</details>

| `picksScratchFamily` | FAIL | 0.33 | 77.2s | 169.7k | 1.1k | 5 | no 'scratchpad_*' tool within 300s; called: [doc_append, doc_write] — 33% — 2/3 checks · missed: family-scratchpad |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-scratchpad` | stage | 0.00 | 4.00 | called instead: [doc_append, doc_write] |

</details>

| `picksSheetFamily` | OK | 1.00 | 131.5s | 344.1k | 5.0k | 10 | family 'sheet_*' hit via [sheet_set_cell] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-sheet` | stage | 4.00 | 4.00 | sheet_set_cell |

</details>

| `picksTreeFamily` | OK | 1.00 | 61.9s | 169.6k | 2.8k | 5 | family 'tree_*' hit via [tree_add_child, tree_find, tree_get] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-tree` | stage | 4.00 | 4.00 | tree_add_child, tree_find, tree_get |

</details>

