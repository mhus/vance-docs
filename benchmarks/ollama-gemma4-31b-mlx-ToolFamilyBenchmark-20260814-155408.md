# Vance Benchmark - ollama-gemma4-31b-mlx-ToolFamilyBenchmark-20260814-155408

- **Started:** 2026-08-14T15:54:08.735453Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 10
- **Passed:** 7 / 10 (70%)
- **Average score:** 0.700
- **Total LLM time:** 1460.5s
- **Total tokens (in / out):** 1.20M / 1.7k (26 round-trips)


## tool-family

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `picksCalendarFamily` | OK | 1.00 | 216.3s | 204.3k | 436 | 4 | family 'calendar_*' hit via: [calendar_create] |
| `picksDocFamily` | OK | 1.00 | 273.9s | 97.2k | 105 | 2 | family 'doc_*' hit via: [doc_write] |
| `picksGraphFamily` | FAIL | 0.00 | - | - | - | - | HttpTimeoutException: request timed out |
| `picksHookFamily` | OK | 1.00 | 85.7s | 109.4k | 262 | 3 | family 'hook_*' hit via: [hook_list] |
| `picksListFamily` | FAIL | 0.00 | 360.4s | 146.0k | 174 | 3 | no tool from family 'list_*' was called within 30s; tools actually called: [doc_append, arthur_action] |
| `picksRecordsFamily` | FAIL | 0.00 | - | - | - | - | HttpTimeoutException: request timed out |
| `picksSchedulerFamily` | OK | 1.00 | 132.7s | 158.1k | 233 | 4 | family 'scheduler_*' hit via: [scheduler_list] |
| `picksScratchFamily` | OK | 1.00 | 169.9s | 195.1k | 172 | 4 | family 'scratchpad_*' hit via: [scratchpad_set] |
| `picksSheetFamily` | OK | 1.00 | 141.2s | 97.6k | 133 | 2 | family 'sheet_*' hit via: [sheet_set_cell] |
| `picksTreeFamily` | OK | 1.00 | 80.4s | 195.2k | 190 | 4 | family 'tree_*' hit via: [tree_add_child] |
