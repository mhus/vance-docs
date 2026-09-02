# Vance Benchmark - ollama-gemma4-31b-mlx-ToolFamilyBenchmark-20260816-083237

- **Started:** 2026-08-16T08:32:37.303900Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 10
- **Passed:** 10 / 10 (100%)
- **Average score:** 1.000
- **Total LLM time:** 1970.6s
- **Total tokens (in / out):** 1.14M / 1.8k (31 round-trips)


## tool-family

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `picksCalendarFamily` | OK | 1.00 | 285.3s | 116.6k | 293 | 3 | family 'calendar_*' hit via: [calendar_create] |
| `picksDocFamily` | OK | 1.00 | 192.2s | 76.5k | 107 | 2 | family 'doc_*' hit via: [doc_write] |
| `picksGraphFamily` | OK | 1.00 | 312.2s | 153.7k | 172 | 4 | family 'graph_*' hit via: [graph_add_edge] |
| `picksHookFamily` | OK | 1.00 | 77.3s | 87.5k | 232 | 3 | family 'hook_*' hit via: [hook_list] |
| `picksListFamily` | OK | 1.00 | 125.3s | 115.1k | 186 | 3 | family 'list_*' hit via: [list_append] |
| `picksRecordsFamily` | OK | 1.00 | 538.1s | 192.0k | 157 | 5 | family 'records_*' hit via: [records_add_column] |
| `picksSchedulerFamily` | OK | 1.00 | 68.9s | 49.1k | 119 | 2 | family 'scheduler_*' hit via: [scheduler_list] |
| `picksScratchFamily` | OK | 1.00 | 139.7s | 114.9k | 142 | 3 | family 'scratchpad_*' hit via: [scratchpad_set] |
| `picksSheetFamily` | OK | 1.00 | 130.1s | 77.1k | 220 | 2 | family 'sheet_*' hit via: [sheet_set_cell] |
| `picksTreeFamily` | OK | 1.00 | 101.4s | 153.6k | 171 | 4 | family 'tree_*' hit via: [tree_add_child, tree_get] |
