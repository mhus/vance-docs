# Vance Benchmark - ollama-muse-glimmer-30b-mlx__pre-merge-fix-ToolFamilyBenchmark-20260814-201930

- **Started:** 2026-08-14T20:19:30.719273Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 10
- **Passed:** 4 / 10 (40%)
- **Average score:** 0.400
- **Total LLM time:** 1189.8s
- **Total tokens (in / out):** 5.62M / 6.8k (46 round-trips)


## tool-family

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `picksCalendarFamily` | OK | 1.00 | 280.9s | 494.1k | 1.4k | 4 | family 'calendar_*' hit via: [calendar_create] |
| `picksDocFamily` | FAIL | 0.00 | 15.1s | 121.5k | 338 | 1 | no tool from family 'doc_*' was called within 30s; tools actually called: [arthur_action] |
| `picksGraphFamily` | FAIL | 0.00 | 48.1s | 1.10M | 717 | 9 | no tool from family 'graph_*' was called within 30s; tools actually called: [doc_list, doc_find, arthur_action, doc_list_in_folder, doc_list_folders, doc_grep_path] |
| `picksHookFamily` | OK | 1.00 | 253.2s | 1.23M | 1.1k | 10 | family 'hook_*' hit via: [hook_list] |
| `picksListFamily` | FAIL | 0.00 | 22.4s | 486.7k | 496 | 4 | no tool from family 'list_*' was called within 30s; tools actually called: [doc_edit, doc_find, doc_read, arthur_action] |
| `picksRecordsFamily` | OK | 1.00 | 294.2s | 853.9k | 710 | 7 | family 'records_*' hit via: [records_get_rows, records_get_schema] |
| `picksSchedulerFamily` | FAIL | 0.00 | 186.4s | 121.5k | 454 | 1 | no tool from family 'scheduler_*' was called within 30s; tools actually called: [arthur_action] |
| `picksScratchFamily` | FAIL | 0.00 | 25.1s | 121.5k | 638 | 1 | no tool from family 'scratchpad_*' was called within 30s; tools actually called: <none> |
| `picksSheetFamily` | FAIL | 0.00 | 30.6s | 608.7k | 592 | 5 | no tool from family 'sheet_*' was called within 30s; tools actually called: [doc_list, doc_find, arthur_action, doc_list_in_folder] |
| `picksTreeFamily` | OK | 1.00 | 33.8s | 486.6k | 375 | 4 | family 'tree_*' hit via: [tree_get] |
