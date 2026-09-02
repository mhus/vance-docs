# Vance Benchmark - ollama-gemma4-31b-mlx-AntiHallucinationBenchmark-20260814-152822

- **Started:** 2026-08-14T15:28:22.406408Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 5
- **Passed:** 5 / 5 (100%)
- **Average score:** 0.920
- **Total LLM time:** 534.5s
- **Total tokens (in / out):** 991.5k / 1.7k (20 round-trips)


## anti-hallucination

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `rejectsCalendarCreateEvent` | OK | 1.00 | 197.1s | 98.2k | 144 | 2 | model avoided 'calendar_create_event' and picked 'calendar_create' instead |
| `rejectsDiagramTool` | OK | 1.00 | 99.2s | 252.4k | 908 | 5 | model avoided 'diagram_tool' and picked 'doc_write' instead |
| `rejectsDocSave` | OK | 1.00 | 78.7s | 251.4k | 341 | 5 | model avoided 'doc_save' and picked 'doc_write' instead |
| `rejectsListAdd` | OK | 0.60 | 21.5s | 194.6k | 160 | 4 | model avoided 'list_add' without naming a real replacement (safe decline / clarify); tools called: [doc_list, doc_find, doc_read, arthur_action] |
| `rejectsRecordsCreate` | OK | 1.00 | 138.1s | 194.9k | 151 | 4 | model avoided 'records_create' and picked 'records_add_column' instead |
