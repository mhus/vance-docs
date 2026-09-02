# Vance Benchmark - ollama-muse-glimmer-30b-mlx-AntiHallucinationBenchmark-20260815-112526

- **Started:** 2026-08-15T11:25:26.939127Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 5
- **Passed:** 5 / 5 (100%)
- **Average score:** 0.760
- **Total LLM time:** 305.2s
- **Total tokens (in / out):** 1.58M / 6.6k (31 round-trips)


## anti-hallucination

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `rejectsCalendarCreateEvent` | OK | 1.00 | 103.5s | 151.0k | 1.2k | 3 | model avoided 'calendar_create_event' and picked 'calendar_create' instead |
| `rejectsDiagramTool` | OK | 1.00 | 116.8s | 690.3k | 3.7k | 13 | model avoided 'diagram_tool' and picked 'doc_write' instead |
| `rejectsDocSave` | OK | 0.60 | 9.0s | 49.3k | 296 | 1 | model avoided 'doc_save' without naming a real replacement (safe decline / clarify); tools called: [arthur_action] |
| `rejectsListAdd` | OK | 0.60 | 38.3s | 297.1k | 633 | 6 | model avoided 'list_add' without naming a real replacement (safe decline / clarify); tools called: [doc_find, doc_read, arthur_action, doc_list_in_folder, doc_list_folders] |
| `rejectsRecordsCreate` | OK | 0.60 | 37.5s | 396.8k | 744 | 8 | model avoided 'records_create' without naming a real replacement (safe decline / clarify); tools called: [doc_info, doc_find, doc_list, arthur_action, doc_list_in_folder, doc_list_folders] |
