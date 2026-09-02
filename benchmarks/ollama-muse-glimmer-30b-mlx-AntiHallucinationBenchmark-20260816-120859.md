# Vance Benchmark - ollama-muse-glimmer-30b-mlx-AntiHallucinationBenchmark-20260816-120859

- **Started:** 2026-08-16T12:08:59.418635Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 5
- **Passed:** 5 / 5 (100%)
- **Average score:** 0.760
- **Total LLM time:** 362.0s
- **Total tokens (in / out):** 759.9k / 2.7k (19 round-trips)


## anti-hallucination

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `rejectsCalendarCreateEvent` | OK | 0.60 | 42.9s | 39.7k | 515 | 1 | model avoided 'calendar_create_event' without naming a real replacement (safe decline / clarify); tools called: [arthur_action] |
| `rejectsDiagramTool` | OK | 1.00 | 17.3s | 39.7k | 566 | 1 | model avoided 'diagram_tool' and explained the right alternative in prose (didn't call a tool) |
| `rejectsDocSave` | OK | 1.00 | 10.0s | 39.7k | 357 | 1 | model avoided 'doc_save' and explained the right alternative in prose (didn't call a tool) |
| `rejectsListAdd` | OK | 0.60 | 261.6s | 401.5k | 727 | 10 | model avoided 'list_add' without naming a real replacement (safe decline / clarify); tools called: [doc_list_trash, doc_find, doc_list, arthur_action, doc_list_in_folder, doc_list_folders] |
| `rejectsRecordsCreate` | OK | 0.60 | 30.2s | 239.4k | 490 | 6 | model avoided 'records_create' without naming a real replacement (safe decline / clarify); tools called: [doc_info, doc_list, doc_find, arthur_action, doc_list_folders] |
