# Vance Benchmark - ollama-muse-glimmer-30b-mlx__small-v2-ToolFamilyBenchmark-20260816-191047

- **Started:** 2026-08-16T19:10:47.533730Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 10
- **Passed:** 4 / 10 (40%)
- **Average score:** 0.400
- **Total LLM time:** 712.7s
- **Total tokens (in / out):** 2.68M / 8.3k (64 round-trips)


## tool-family

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `picksCalendarFamily` | FAIL | 0.00 | 23.2s | 39.9k | 744 | 1 | no tool from family 'calendar_*' was called within 30s; tools actually called: [arthur_action] |
| `picksDocFamily` | OK | 1.00 | 9.5s | 80.1k | 309 | 2 | family 'doc_*' hit via: [doc_write] |
| `picksGraphFamily` | FAIL | 0.00 | 35.8s | 200.8k | 444 | 5 | no tool from family 'graph_*' was called within 30s; tools actually called: [doc_info, doc_list, doc_find, arthur_action, doc_list_folders] |
| `picksHookFamily` | OK | 1.00 | 270.6s | 855.7k | 1.8k | 20 | family 'hook_*' hit via: [hook_get, hook_list] |
| `picksListFamily` | FAIL | 0.00 | 13.6s | 241.3k | 457 | 6 | no tool from family 'list_*' was called within 30s; tools actually called: [doc_find, doc_append, doc_read, arthur_action, doc_list_in_folder, doc_list_folders] |
| `picksRecordsFamily` | OK | 1.00 | 73.1s | 487.4k | 1.0k | 12 | family 'records_*' hit via: [records_add_column, records_get_rows, records_get_schema] |
| `picksSchedulerFamily` | FAIL | 0.00 | 83.6s | 80.4k | 798 | 2 | no tool from family 'scheduler_*' was called within 30s; tools actually called: [arthur_action, tool_description] |
| `picksScratchFamily` | FAIL | 0.00 | 12.1s | 39.9k | 442 | 1 | no tool from family 'scratchpad_*' was called within 30s; tools actually called: [arthur_action] |
| `picksSheetFamily` | FAIL | 0.00 | 126.3s | 405.8k | 1.2k | 10 | no tool from family 'sheet_*' was called within 30s; tools actually called: [doc_list, doc_find, file_list, arthur_action, doc_list_in_folder, doc_list_folders, doc_grep_path] |
| `picksTreeFamily` | OK | 1.00 | 64.8s | 249.5k | 1.1k | 5 | family 'tree_*' hit via: [tree_get] |
