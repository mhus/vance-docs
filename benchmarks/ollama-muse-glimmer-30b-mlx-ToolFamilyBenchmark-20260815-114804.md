# Vance Benchmark - ollama-muse-glimmer-30b-mlx-ToolFamilyBenchmark-20260815-114804

- **Started:** 2026-08-15T11:48:04.126295Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 10
- **Passed:** 5 / 10 (50%)
- **Average score:** 0.500
- **Total LLM time:** 1075.1s
- **Total tokens (in / out):** 3.69M / 7.4k (71 round-trips)


## tool-family

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `picksCalendarFamily` | FAIL | 0.00 | 139.7s | 101.2k | 636 | 2 | no tool from family 'calendar_*' was called within 30s; tools actually called: [manual_read, arthur_action] |
| `picksDocFamily` | OK | 1.00 | 12.7s | 98.7k | 318 | 2 | family 'doc_*' hit via: [doc_write] |
| `picksGraphFamily` | FAIL | 0.00 | 38.3s | 1.01M | 1.2k | 20 | no tool from family 'graph_*' was called within 30s; tools actually called: [doc_list_trash, doc_list, doc_find, doc_list_in_folder, doc_list_folders, doc_grep_path] |
| `picksHookFamily` | OK | 1.00 | 259.5s | 1.05M | 1.7k | 20 | family 'hook_*' hit via: [hook_list] |
| `picksListFamily` | FAIL | 0.00 | 13.2s | 247.4k | 437 | 5 | no tool from family 'list_*' was called within 30s; tools actually called: [doc_find, doc_append, doc_read, arthur_action, doc_list_in_folder] |
| `picksRecordsFamily` | OK | 1.00 | 71.1s | 371.4k | 638 | 7 | family 'records_*' hit via: [records_get_schema] |
| `picksSchedulerFamily` | FAIL | 0.00 | 92.6s | 49.3k | 422 | 1 | no tool from family 'scheduler_*' was called within 30s; tools actually called: [arthur_action] |
| `picksScratchFamily` | OK | 1.00 | 79.1s | 148.5k | 721 | 3 | family 'scratchpad_*' hit via: [scratchpad_set] |
| `picksSheetFamily` | FAIL | 0.00 | 223.5s | 247.4k | 451 | 5 | no tool from family 'sheet_*' was called within 30s; tools actually called: [doc_info, doc_find, doc_list, arthur_action, doc_list_folders] |
| `picksTreeFamily` | OK | 1.00 | 145.3s | 371.2k | 930 | 6 | family 'tree_*' hit via: [tree_add_child, tree_get] |
