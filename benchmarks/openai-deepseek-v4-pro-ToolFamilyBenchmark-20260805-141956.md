# Vance Benchmark - openai-deepseek-v4-pro-ToolFamilyBenchmark-20260805-141956

- **Started:** 2026-08-05T14:19:56.143249Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 10
- **Passed:** 9 / 10 (90%)
- **Average score:** 0.900
- **Total LLM time:** 238.6s
- **Total tokens (in / out):** 1.24M / 5.3k (48 round-trips)


## tool-family

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `picksCalendarFamily` | OK | 1.00 | 18.5s | 78.7k | 532 | 3 | family 'calendar_*' hit via: [calendar_create] |
| `picksDocFamily` | OK | 1.00 | 6.7s | 48.7k | 163 | 2 | family 'doc_*' hit via: [doc_write] |
| `picksGraphFamily` | OK | 1.00 | 9.5s | 73.2k | 349 | 3 | family 'graph_*' hit via: [graph_find_node] |
| `picksHookFamily` | OK | 1.00 | 113.6s | 375.6k | 1.8k | 13 | family 'hook_*' hit via: [hook_get, hook_set] |
| `picksListFamily` | OK | 1.00 | 7.1s | 73.2k | 267 | 3 | family 'list_*' hit via: [list_append, list_get] |
| `picksRecordsFamily` | OK | 1.00 | 12.2s | 73.0k | 270 | 3 | family 'records_*' hit via: [records_add_column] |
| `picksSchedulerFamily` | OK | 1.00 | 16.5s | 151.1k | 698 | 6 | family 'scheduler_*' hit via: [scheduler_set] |
| `picksScratchFamily` | OK | 1.00 | 5.8s | 48.6k | 145 | 2 | family 'scratchpad_*' hit via: [scratchpad_set] |
| `picksSheetFamily` | OK | 1.00 | 7.2s | 73.3k | 365 | 3 | family 'sheet_*' hit via: [sheet_set_cell] |
| `picksTreeFamily` | FAIL | 0.00 | 41.6s | 249.4k | 724 | 10 | no tool from family 'tree_*' was called within 30s; tools actually called: [manual_read, doc_find, doc_read, arthur_action, doc_list_in_folder, how_do_i, doc_list_folders, doc_write] |
