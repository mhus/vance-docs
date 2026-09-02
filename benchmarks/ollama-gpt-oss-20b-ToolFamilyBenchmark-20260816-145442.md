# Vance Benchmark - ollama-gpt-oss-20b-ToolFamilyBenchmark-20260816-145442

- **Started:** 2026-08-16T14:54:42.245717Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 10
- **Passed:** 6 / 10 (60%)
- **Average score:** 0.600
- **Total LLM time:** 439.9s
- **Total tokens (in / out):** 2.13M / 19.2k (64 round-trips)


## tool-family

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `picksCalendarFamily` | OK | 1.00 | 20.8s | 133.1k | 1.1k | 4 | family 'calendar_*' hit via: [calendar_create] |
| `picksDocFamily` | OK | 1.00 | 7.1s | 131.6k | 419 | 4 | family 'doc_*' hit via: [doc_write] |
| `picksGraphFamily` | FAIL | 0.00 | 62.8s | 297.6k | 2.3k | 9 | no tool from family 'graph_*' was called within 30s; tools actually called: [doc_list, doc_read, arthur_action, project_list, doc_grep, doc_grep_path] |
| `picksHookFamily` | FAIL | 0.00 | 50.2s | 198.8k | 4.0k | 6 | no tool from family 'hook_*' was called within 30s; tools actually called: [invoke_tool, arthur_action, doc_write, doc_replace_lines] |
| `picksListFamily` | OK | 1.00 | 36.9s | 164.5k | 606 | 5 | family 'list_*' hit via: [list_append] |
| `picksRecordsFamily` | OK | 1.00 | 33.4s | 131.9k | 442 | 4 | family 'records_*' hit via: [records_add_column] |
| `picksSchedulerFamily` | OK | 1.00 | 43.3s | 198.8k | 1.1k | 6 | family 'scheduler_*' hit via: [scheduler_set] |
| `picksScratchFamily` | FAIL | 0.00 | 5.9s | 32.7k | 478 | 1 | no tool from family 'scratchpad_*' was called within 30s; tools actually called: [arthur_action] |
| `picksSheetFamily` | OK | 1.00 | 161.8s | 681.3k | 7.5k | 20 | family 'sheet_*' hit via: [sheet_set_cell] |
| `picksTreeFamily` | FAIL | 0.00 | 17.7s | 164.7k | 1.2k | 5 | no tool from family 'tree_*' was called within 30s; tools actually called: [doc_read, doc_read_lines, arthur_action, doc_replace_lines] |
