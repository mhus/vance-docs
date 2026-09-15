# Vance Benchmark - ollama-gpt-oss-20b__large-tier-ToolFamilyBenchmark-20260816-170941

- **Started:** 2026-08-16T17:09:41.042989Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 10
- **Passed:** 6 / 10 (60%)
- **Average score:** 0.600
- **Total LLM time:** 652.4s
- **Total tokens (in / out):** 2.29M / 19.4k (54 round-trips)


## tool-family

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `picksCalendarFamily` | OK | 1.00 | 72.4s | 172.4k | 1.1k | 4 | family 'calendar_*' hit via: [calendar_create] |
| `picksDocFamily` | OK | 1.00 | 29.0s | 170.7k | 425 | 4 | family 'doc_*' hit via: [doc_write] |
| `picksGraphFamily` | FAIL | 0.00 | 60.2s | 572.2k | 2.5k | 13 | no tool from family 'graph_*' was called within 30s; tools actually called: [search, manual_read, doc_find, doc_list, doc_read, project_list, project_current, doc_write] |
| `picksHookFamily` | OK | 1.00 | 118.5s | 181.4k | 5.0k | 5 | family 'hook_*' hit via: [hook_list] |
| `picksListFamily` | FAIL | 0.00 | 10.5s | 127.6k | 495 | 3 | no tool from family 'list_*' was called within 30s; tools actually called: [doc_append, arthur_action] |
| `picksRecordsFamily` | OK | 1.00 | 70.0s | 170.8k | 1.2k | 4 | family 'records_*' hit via: [records_add_column] |
| `picksSchedulerFamily` | FAIL | 0.00 | 42.6s | 128.0k | 788 | 3 | no tool from family 'scheduler_*' was called within 30s; tools actually called: <none> |
| `picksScratchFamily` | OK | 1.00 | 58.2s | 213.5k | 1.1k | 5 | family 'scratchpad_*' hit via: [scratchpad_set] |
| `picksSheetFamily` | OK | 1.00 | 114.6s | 301.0k | 1.0k | 7 | family 'sheet_*' hit via: [sheet_set_cell] |
| `picksTreeFamily` | FAIL | 0.00 | 76.3s | 256.0k | 5.8k | 6 | no tool from family 'tree_*' was called within 30s; tools actually called: [doc_edit, doc_read] |
