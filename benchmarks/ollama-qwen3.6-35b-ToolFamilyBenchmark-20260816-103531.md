# Vance Benchmark - ollama-qwen3.6-35b-ToolFamilyBenchmark-20260816-103531

- **Started:** 2026-08-16T10:35:31.404100Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 10
- **Passed:** 9 / 10 (90%)
- **Average score:** 0.900
- **Total LLM time:** 560.5s
- **Total tokens (in / out):** 2.86M / 6.9k (71 round-trips)


## tool-family

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `picksCalendarFamily` | OK | 1.00 | 55.4s | 243.9k | 990 | 6 | family 'calendar_*' hit via: [calendar_aggregate, calendar_app_create] |
| `picksDocFamily` | OK | 1.00 | 8.7s | 158.2k | 316 | 4 | family 'doc_*' hit via: [doc_write] |
| `picksGraphFamily` | OK | 1.00 | 44.3s | 412.0k | 854 | 10 | family 'graph_*' hit via: [graph_add_edge] |
| `picksHookFamily` | OK | 1.00 | 149.8s | 696.6k | 2.3k | 17 | family 'hook_*' hit via: [hook_refresh, hook_set] |
| `picksListFamily` | OK | 1.00 | 62.6s | 158.6k | 310 | 4 | family 'list_*' hit via: [list_append] |
| `picksRecordsFamily` | OK | 1.00 | 41.3s | 158.1k | 280 | 4 | family 'records_*' hit via: [records_add_column] |
| `picksSchedulerFamily` | FAIL | 0.00 | 29.9s | 238.0k | 345 | 6 | no tool from family 'scheduler_*' was called within 30s; tools actually called: [how_do_i] |
| `picksScratchFamily` | OK | 1.00 | 69.4s | 158.1k | 247 | 4 | family 'scratchpad_*' hit via: [scratchpad_set] |
| `picksSheetFamily` | OK | 1.00 | 56.9s | 481.5k | 921 | 12 | family 'sheet_*' hit via: [sheet_set_cell] |
| `picksTreeFamily` | OK | 1.00 | 42.3s | 158.3k | 396 | 4 | family 'tree_*' hit via: [tree_add_child, tree_get] |
