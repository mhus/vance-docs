# Vance Benchmark - ollama-gemma4-31b-mlx__large-tier-ToolFamilyBenchmark-20260815-210748

- **Started:** 2026-08-15T21:07:48.186178Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 10
- **Passed:** 8 / 10 (80%)
- **Average score:** 0.800
- **Total LLM time:** 1895.6s
- **Total tokens (in / out):** 1.30M / 1.7k (28 round-trips)


## tool-family

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `picksCalendarFamily` | OK | 1.00 | 286.9s | 204.5k | 441 | 4 | family 'calendar_*' hit via: [calendar_create] |
| `picksDocFamily` | OK | 1.00 | 304.2s | 97.3k | 102 | 2 | family 'doc_*' hit via: [doc_write] |
| `picksGraphFamily` | OK | 1.00 | 591.2s | 244.4k | 208 | 5 | family 'graph_*' hit via: [graph_add_edge] |
| `picksHookFamily` | OK | 1.00 | 83.6s | 109.6k | 244 | 3 | family 'hook_*' hit via: [hook_list] |
| `picksListFamily` | FAIL | 0.00 | 82.0s | 146.2k | 169 | 3 | no tool from family 'list_*' was called within 30s; tools actually called: [doc_append, arthur_action] |
| `picksRecordsFamily` | FAIL | 0.00 | - | - | - | - | HttpTimeoutException: request timed out |
| `picksSchedulerFamily` | OK | 1.00 | 148.6s | 60.7k | 133 | 2 | family 'scheduler_*' hit via: [scheduler_list] |
| `picksScratchFamily` | OK | 1.00 | 175.2s | 146.2k | 134 | 3 | family 'scratchpad_*' hit via: [scratchpad_set] |
| `picksSheetFamily` | OK | 1.00 | 144.3s | 97.8k | 133 | 2 | family 'sheet_*' hit via: [sheet_set_cell] |
| `picksTreeFamily` | OK | 1.00 | 79.7s | 195.3k | 162 | 4 | family 'tree_*' hit via: [tree_add_child, tree_get] |
