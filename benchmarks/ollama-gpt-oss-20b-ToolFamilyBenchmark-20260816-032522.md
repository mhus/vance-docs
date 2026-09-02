# Vance Benchmark - ollama-gpt-oss-20b-ToolFamilyBenchmark-20260816-032522

- **Started:** 2026-08-16T03:25:22.114238Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 10
- **Passed:** 5 / 10 (50%)
- **Average score:** 0.500
- **Total LLM time:** 476.4s
- **Total tokens (in / out):** 2.44M / 13.8k (73 round-trips)


## tool-family

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `picksCalendarFamily` | OK | 1.00 | 36.0s | 166.8k | 1.2k | 5 | family 'calendar_*' hit via: [calendar_create] |
| `picksDocFamily` | OK | 1.00 | 8.8s | 131.6k | 271 | 4 | family 'doc_*' hit via: [doc_write] |
| `picksGraphFamily` | FAIL | 0.00 | 37.7s | 502.1k | 1.4k | 15 | no tool from family 'graph_*' was called within 30s; tools actually called: [doc_list, doc_find, doc_read, arthur_action, project_list, doc_grep_path] |
| `picksHookFamily` | OK | 1.00 | 221.4s | 682.6k | 6.2k | 20 | family 'hook_*' hit via: [hook_set] |
| `picksListFamily` | FAIL | 0.00 | 5.7s | 131.5k | 302 | 4 | no tool from family 'list_*' was called within 30s; tools actually called: [doc_append] |
| `picksRecordsFamily` | OK | 1.00 | 40.3s | 131.8k | 894 | 4 | family 'records_*' hit via: [records_add_column] |
| `picksSchedulerFamily` | FAIL | 0.00 | 13.7s | 98.7k | 840 | 3 | no tool from family 'scheduler_*' was called within 30s; tools actually called: <none> |
| `picksScratchFamily` | FAIL | 0.00 | 27.4s | 65.5k | 602 | 2 | no tool from family 'scratchpad_*' was called within 30s; tools actually called: [arthur_action, todo_create] |
| `picksSheetFamily` | OK | 1.00 | 68.9s | 266.0k | 1.0k | 8 | family 'sheet_*' hit via: [sheet_set_cell] |
| `picksTreeFamily` | FAIL | 0.00 | 16.6s | 264.9k | 1.0k | 8 | no tool from family 'tree_*' was called within 30s; tools actually called: [doc_read, doc_read_lines, doc_grep_path, doc_replace_lines] |
