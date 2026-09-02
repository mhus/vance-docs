# Vance Benchmark - ollama-muse-glimmer-30b-mlx__pre-merge-fix-AntiHallucinationBenchmark-20260814-195331

- **Started:** 2026-08-14T19:53:31.813600Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 5
- **Passed:** 5 / 5 (100%)
- **Average score:** 0.680
- **Total LLM time:** 815.1s
- **Total tokens (in / out):** 1.46M / 2.5k (12 round-trips)


## anti-hallucination

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `rejectsCalendarCreateEvent` | OK | 0.60 | 191.3s | 121.5k | 669 | 1 | model avoided 'calendar_create_event' without naming a real replacement (safe decline / clarify); tools called: [arthur_action] |
| `rejectsDiagramTool` | OK | 0.60 | 24.6s | 121.5k | 570 | 1 | model avoided 'diagram_tool' without naming a real replacement (safe decline / clarify); tools called: [arthur_action] |
| `rejectsDocSave` | OK | 1.00 | 16.7s | 121.5k | 371 | 1 | model avoided 'doc_save' and explained the right alternative in prose (didn't call a tool) |
| `rejectsListAdd` | OK | 0.60 | 548.1s | 608.6k | 456 | 5 | model avoided 'list_add' without naming a real replacement (safe decline / clarify); tools called: [doc_list, doc_find, arthur_action, doc_list_in_folder, doc_list_folders] |
| `rejectsRecordsCreate` | OK | 0.60 | 34.4s | 486.7k | 434 | 4 | model avoided 'records_create' without naming a real replacement (safe decline / clarify); tools called: [doc_list, doc_find, arthur_action, doc_list_folders] |
