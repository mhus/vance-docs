# Vance Benchmark - ollama-gpt-oss-20b__smallv2-ToolFamilyBenchmark-20260822-042029

- **Started:** 2026-08-22T04:20:29.383779Z
- **Judge:** gemini-gemini-2.5-pro
- **Knobs:** {chatTimeoutS=600, waitBudgetMinS=300}
- **Score model:** v2-graded
- **Total tests:** 10
- **Passed:** 7 / 10 (70%)
- **Average score:** 0.800
- **Total LLM time:** 502.4s
- **Total tokens (in / out):** 1.76M / 11.6k (52 round-trips)


## tool-family

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `picksCalendarFamily` | OK | 1.00 | 90.0s | 171.7k | 977 | 5 | family 'calendar_*' hit via [calendar_create] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-calendar` | stage | 4.00 | 4.00 | calendar_create |

</details>

| `picksDocFamily` | OK | 1.00 | 7.9s | 135.2k | 299 | 4 | family 'doc_*' hit via [doc_write] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-doc` | stage | 4.00 | 4.00 | doc_write |

</details>

| `picksGraphFamily` | FAIL | 0.33 | 46.2s | 202.6k | 900 | 6 | no 'graph_*' tool within 300s; called: [doc_find, doc_read, doc_list_in_folder] — 33% — 2/3 checks · missed: family-graph |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-graph` | stage | 0.00 | 4.00 | called instead: [doc_find, doc_read, doc_list_in_folder] |

</details>

| `picksHookFamily` | OK | 1.00 | 106.0s | 204.5k | 3.6k | 6 | family 'hook_*' hit via [hook_set] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-hook` | stage | 4.00 | 4.00 | hook_set |

</details>

| `picksListFamily` | OK | 1.00 | 54.8s | 202.9k | 543 | 6 | family 'list_*' hit via [list_append] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-list` | stage | 4.00 | 4.00 | list_append |

</details>

| `picksRecordsFamily` | OK | 1.00 | 41.2s | 169.2k | 704 | 5 | family 'records_*' hit via [records_add_column] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-records` | stage | 4.00 | 4.00 | records_add_column |

</details>

| `picksSchedulerFamily` | OK | 1.00 | 52.3s | 203.3k | 1.4k | 6 | family 'scheduler_*' hit via [scheduler_set] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-scheduler` | stage | 4.00 | 4.00 | scheduler_set |

</details>

| `picksScratchFamily` | FAIL | 0.33 | 23.9s | 101.2k | 1.8k | 3 | no 'scratchpad_*' tool within 300s; called: [arthur_action] — 33% — 2/3 checks · missed: family-scratchpad |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-scratchpad` | stage | 0.00 | 4.00 | called instead: [arthur_action] |

</details>

| `picksSheetFamily` | OK | 1.00 | 45.5s | 170.3k | 714 | 5 | family 'sheet_*' hit via [sheet_set_cell] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-sheet` | stage | 4.00 | 4.00 | sheet_set_cell |

</details>

| `picksTreeFamily` | FAIL | 0.33 | 34.6s | 203.1k | 709 | 6 | no 'tree_*' tool within 300s; called: [doc_read, doc_replace_lines] — 33% — 2/3 checks · missed: family-tree |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-tree` | stage | 0.00 | 4.00 | called instead: [doc_read, doc_replace_lines] |

</details>

