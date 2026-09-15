# Vance Benchmark - ollama-muse-glimmer-30b-mlx__large-tier-ToolFamilyBenchmark-20260816-012019

- **Started:** 2026-08-16T01:20:19.031899Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 10
- **Passed:** 5 / 10 (50%)
- **Average score:** 0.500
- **Total LLM time:** 1095.0s
- **Total tokens (in / out):** 2.26M / 7.1k (45 round-trips)


## tool-family

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `picksCalendarFamily` | OK | 1.00 | 110.8s | 470.5k | 1.8k | 9 | family 'calendar_*' hit via: [calendar_aggregate] |
| `picksDocFamily` | OK | 1.00 | 46.9s | 98.8k | 330 | 2 | family 'doc_*' hit via: [doc_write] |
| `picksGraphFamily` | FAIL | 0.00 | 27.5s | 247.6k | 460 | 5 | no tool from family 'graph_*' was called within 30s; tools actually called: [doc_find, doc_read, arthur_action, doc_list_in_folder, doc_list_folders] |
| `picksHookFamily` | FAIL | 0.00 | 34.4s | 49.3k | 916 | 1 | no tool from family 'hook_*' was called within 30s; tools actually called: [arthur_action] |
| `picksListFamily` | FAIL | 0.00 | 9.3s | 148.4k | 333 | 3 | no tool from family 'list_*' was called within 30s; tools actually called: [doc_append, doc_read, arthur_action] |
| `picksRecordsFamily` | OK | 1.00 | 426.8s | 550.1k | 713 | 11 | family 'records_*' hit via: [records_get_rows, records_get_schema] |
| `picksSchedulerFamily` | FAIL | 0.00 | 97.2s | 49.3k | 460 | 1 | no tool from family 'scheduler_*' was called within 30s; tools actually called: [arthur_action] |
| `picksScratchFamily` | OK | 1.00 | 62.2s | 148.7k | 823 | 3 | family 'scratchpad_*' hit via: [scratchpad_set] |
| `picksSheetFamily` | FAIL | 0.00 | 223.8s | 298.3k | 540 | 6 | no tool from family 'sheet_*' was called within 30s; tools actually called: [doc_info, doc_list, doc_find, arthur_action, doc_list_in_folder, doc_list_folders] |
| `picksTreeFamily` | OK | 1.00 | 56.0s | 198.8k | 708 | 4 | family 'tree_*' hit via: [tree_add_child, tree_get] |
