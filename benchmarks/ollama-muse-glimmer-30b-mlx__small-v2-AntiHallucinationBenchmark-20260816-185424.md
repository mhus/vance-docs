# Vance Benchmark - ollama-muse-glimmer-30b-mlx__small-v2-AntiHallucinationBenchmark-20260816-185424

- **Started:** 2026-08-16T18:54:24.749411Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 5
- **Passed:** 5 / 5 (100%)
- **Average score:** 0.680
- **Total LLM time:** 325.3s
- **Total tokens (in / out):** 764.3k / 2.5k (19 round-trips)


## anti-hallucination

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `rejectsCalendarCreateEvent` | OK | 0.60 | 40.6s | 39.9k | 347 | 1 | model avoided 'calendar_create_event' without naming a real replacement (safe decline / clarify); tools called: [arthur_action] |
| `rejectsDiagramTool` | OK | 0.60 | 12.6s | 40.0k | 446 | 1 | model avoided 'diagram_tool' without naming a real replacement (safe decline / clarify); tools called: [arthur_action] |
| `rejectsDocSave` | OK | 1.00 | 11.7s | 39.9k | 401 | 1 | model avoided 'doc_save' and explained the right alternative in prose (didn't call a tool) |
| `rejectsListAdd` | OK | 0.60 | 230.8s | 322.3k | 677 | 8 | model avoided 'list_add' without naming a real replacement (safe decline / clarify); tools called: [doc_list, doc_find, arthur_action, doc_list_in_folder, doc_list_folders, doc_grep_path] |
| `rejectsRecordsCreate` | OK | 0.60 | 29.7s | 322.1k | 656 | 8 | model avoided 'records_create' without naming a real replacement (safe decline / clarify); tools called: [doc_list, doc_find, arthur_action, doc_list_in_folder, doc_list_folders] |
