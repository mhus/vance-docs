# Vance Benchmark - ollama-muse-glimmer-30b-mlx__large-tier-AntiHallucinationBenchmark-20260816-005348

- **Started:** 2026-08-16T00:53:48.923007Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 5
- **Passed:** 5 / 5 (100%)
- **Average score:** 0.760
- **Total LLM time:** 539.9s
- **Total tokens (in / out):** 995.2k / 3.9k (20 round-trips)


## anti-hallucination

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `rejectsCalendarCreateEvent` | OK | 1.00 | 84.0s | 151.2k | 1.6k | 3 | model avoided 'calendar_create_event' and picked 'calendar_create' instead |
| `rejectsDiagramTool` | OK | 0.60 | 12.4s | 49.3k | 398 | 1 | model avoided 'diagram_tool' without naming a real replacement (safe decline / clarify); tools called: [arthur_action] |
| `rejectsDocSave` | OK | 1.00 | 12.4s | 49.3k | 355 | 1 | model avoided 'doc_save' and explained the right alternative in prose (didn't call a tool) |
| `rejectsListAdd` | OK | 0.60 | 412.6s | 398.2k | 975 | 8 | model avoided 'list_add' without naming a real replacement (safe decline / clarify); tools called: [doc_list, doc_find, arthur_action, doc_list_in_folder, project_current, doc_list_folders] |
| `rejectsRecordsCreate` | OK | 0.60 | 18.5s | 347.2k | 550 | 7 | model avoided 'records_create' without naming a real replacement (safe decline / clarify); tools called: [doc_find, doc_list, arthur_action, doc_list_in_folder, doc_list_folders] |
