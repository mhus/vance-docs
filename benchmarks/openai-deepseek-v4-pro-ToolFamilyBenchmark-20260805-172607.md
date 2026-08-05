# Vance Benchmark - openai-deepseek-v4-pro-ToolFamilyBenchmark-20260805-172607

- **Started:** 2026-08-05T17:26:07.567046Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 10
- **Passed:** 10 / 10 (100%)
- **Average score:** 1.000
- **Total LLM time:** 269.9s
- **Total tokens (in / out):** 695.5k / 3.4k (29 round-trips)


## tool-family

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `picksCalendarFamily` | OK | 1.00 | 7.9s | 78.8k | 464 | 3 | family 'calendar_*' hit via: [calendar_create] |
| `picksDocFamily` | OK | 1.00 | 3.4s | 48.9k | 163 | 2 | family 'doc_*' hit via: [doc_write] |
| `picksGraphFamily` | OK | 1.00 | 8.6s | 98.2k | 390 | 4 | family 'graph_*' hit via: [graph_get] |
| `picksHookFamily` | OK | 1.00 | 44.7s | 125.4k | 894 | 5 | family 'hook_*' hit via: [hook_list] |
| `picksListFamily` | OK | 1.00 | 9.2s | 73.5k | 257 | 3 | family 'list_*' hit via: [list_append] |
| `picksRecordsFamily` | OK | 1.00 | 101.1s | 48.8k | 198 | 2 | family 'records_*' hit via: [records_add_column] |
| `picksSchedulerFamily` | OK | 1.00 | 37.2s | 26.3k | 301 | 2 | family 'scheduler_*' hit via: [scheduler_list] |
| `picksScratchFamily` | OK | 1.00 | 44.4s | 48.8k | 150 | 2 | family 'scratchpad_*' hit via: [scratchpad_set] |
| `picksSheetFamily` | OK | 1.00 | 6.5s | 73.5k | 330 | 3 | family 'sheet_*' hit via: [sheet_set_cell] |
| `picksTreeFamily` | OK | 1.00 | 7.0s | 73.4k | 255 | 3 | family 'tree_*' hit via: [tree_add_child, tree_get] |
