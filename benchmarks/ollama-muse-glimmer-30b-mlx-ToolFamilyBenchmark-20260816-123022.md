# Vance Benchmark - ollama-muse-glimmer-30b-mlx-ToolFamilyBenchmark-20260816-123022

- **Started:** 2026-08-16T12:30:22.723252Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 10
- **Passed:** 2 / 10 (20%)
- **Average score:** 0.200
- **Total LLM time:** 992.7s
- **Total tokens (in / out):** 3.59M / 10.0k (90 round-trips)


## tool-family

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `picksCalendarFamily` | FAIL | 0.00 | 134.8s | 80.9k | 887 | 2 | no tool from family 'calendar_*' was called within 30s; tools actually called: [arthur_action, tool_description] |
| `picksDocFamily` | OK | 1.00 | 66.3s | 50.9k | 520 | 2 | family 'doc_*' hit via: [doc_write] |
| `picksGraphFamily` | FAIL | 0.00 | 48.4s | 812.9k | 1.2k | 20 | no tool from family 'graph_*' was called within 30s; tools actually called: [doc_list_trash, doc_list, doc_find, doc_list_in_folder, doc_list_folders, doc_grep_path] |
| `picksHookFamily` | FAIL | 0.00 | 280.2s | 825.0k | 1.7k | 20 | no tool from family 'hook_*' was called within 30s; tools actually called: [doc_list_trash, doc_find, doc_list, event_get, doc_list_in_folder, event_list, tool_description, doc_list_folders, project_current] |
| `picksListFamily` | FAIL | 0.00 | 18.9s | 239.8k | 630 | 6 | no tool from family 'list_*' was called within 30s; tools actually called: [doc_find, doc_append, doc_read, arthur_action, doc_list_in_folder] |
| `picksRecordsFamily` | FAIL | 0.00 | 113.9s | 113.8k | 899 | 5 | no tool from family 'records_*' was called within 30s; tools actually called: [doc_info, doc_edit, doc_read, arthur_action] |
| `picksSchedulerFamily` | FAIL | 0.00 | 86.0s | 79.8k | 858 | 2 | no tool from family 'scheduler_*' was called within 30s; tools actually called: [arthur_action, tool_description] |
| `picksScratchFamily` | FAIL | 0.00 | 138.8s | 815.7k | 1.6k | 20 | no tool from family 'scratchpad_*' was called within 30s; tools actually called: [doc_list_trash, doc_find, doc_list, doc_read, doc_list_by_tag, doc_list_in_folder, doc_list_folders, doc_grep_path] |
| `picksSheetFamily` | FAIL | 0.00 | 34.5s | 199.8k | 477 | 5 | no tool from family 'sheet_*' was called within 30s; tools actually called: [doc_info, doc_find, arthur_action, doc_list_in_folder, doc_list_folders] |
| `picksTreeFamily` | OK | 1.00 | 70.8s | 369.6k | 1.3k | 8 | family 'tree_*' hit via: [tree_get] |
