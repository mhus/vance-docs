# Vance Benchmark - ollama-qwen3.6-35b-ToolFamilyBenchmark-20260814-183025

- **Started:** 2026-08-14T18:30:25.850297Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 10
- **Passed:** 9 / 10 (90%)
- **Average score:** 0.900
- **Total LLM time:** 799.8s
- **Total tokens (in / out):** 3.58M / 7.1k (71 round-trips)


## tool-family

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `picksCalendarFamily` | OK | 1.00 | 78.0s | 262.7k | 1.1k | 5 | family 'calendar_*' hit via: [calendar_create] |
| `picksDocFamily` | OK | 1.00 | 8.3s | 148.5k | 264 | 3 | family 'doc_*' hit via: [doc_write] |
| `picksGraphFamily` | OK | 1.00 | 54.5s | 247.6k | 394 | 5 | family 'graph_*' hit via: [graph_find_node, graph_get] |
| `picksHookFamily` | OK | 1.00 | 227.9s | 505.0k | 2.1k | 10 | family 'hook_*' hit via: [hook_get, hook_list, hook_set] |
| `picksListFamily` | FAIL | 0.00 | 8.5s | 198.1k | 257 | 4 | no tool from family 'list_*' was called within 30s; tools actually called: [doc_append, doc_read, arthur_action] |
| `picksRecordsFamily` | OK | 1.00 | 55.2s | 298.1k | 208 | 6 | family 'records_*' hit via: [records_add_column, records_get_schema] |
| `picksSchedulerFamily` | OK | 1.00 | 113.8s | 1.03M | 1.4k | 20 | family 'scheduler_*' hit via: [scheduler_get, scheduler_list, scheduler_set] |
| `picksScratchFamily` | OK | 1.00 | 91.5s | 248.3k | 251 | 5 | family 'scratchpad_*' hit via: [scratchpad_set] |
| `picksSheetFamily` | OK | 1.00 | 109.0s | 401.7k | 645 | 8 | family 'sheet_*' hit via: [sheet_set_cell] |
| `picksTreeFamily` | OK | 1.00 | 53.2s | 248.8k | 441 | 5 | family 'tree_*' hit via: [tree_add_child] |
