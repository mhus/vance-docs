# Vance Benchmark - ollama-qwen3.6-35b__large-tier-ToolFamilyBenchmark-20260815-234223

- **Started:** 2026-08-15T23:42:23.723066Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 10
- **Passed:** 10 / 10 (100%)
- **Average score:** 1.000
- **Total LLM time:** 576.5s
- **Total tokens (in / out):** 2.57M / 5.7k (52 round-trips)


## tool-family

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `picksCalendarFamily` | OK | 1.00 | 77.1s | 253.3k | 1.3k | 5 | family 'calendar_*' hit via: [calendar_create] |
| `picksDocFamily` | OK | 1.00 | 8.6s | 148.7k | 261 | 3 | family 'doc_*' hit via: [doc_write] |
| `picksGraphFamily` | OK | 1.00 | 58.3s | 348.1k | 752 | 7 | family 'graph_*' hit via: [graph_find_node, graph_get] |
| `picksHookFamily` | OK | 1.00 | 82.3s | 557.6k | 1.3k | 11 | family 'hook_*' hit via: [hook_set] |
| `picksListFamily` | OK | 1.00 | 48.4s | 149.0k | 244 | 3 | family 'list_*' hit via: [list_append] |
| `picksRecordsFamily` | OK | 1.00 | 62.0s | 248.4k | 365 | 5 | family 'records_*' hit via: [records_add_column, records_get_schema] |
| `picksSchedulerFamily` | OK | 1.00 | 10.8s | 62.3k | 301 | 2 | family 'scheduler_*' hit via: [scheduler_list] |
| `picksScratchFamily` | OK | 1.00 | 102.8s | 248.6k | 316 | 5 | family 'scratchpad_*' hit via: [scratchpad_set] |
| `picksSheetFamily` | OK | 1.00 | 64.0s | 301.5k | 530 | 6 | family 'sheet_*' hit via: [sheet_set_cell] |
| `picksTreeFamily` | OK | 1.00 | 62.0s | 248.9k | 346 | 5 | family 'tree_*' hit via: [tree_add_child, tree_get] |
