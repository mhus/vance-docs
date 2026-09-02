# Vance Benchmark - ollama-gpt-oss-20b-AntiHallucinationBenchmark-20260816-031006

- **Started:** 2026-08-16T03:10:06.504990Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 5
- **Passed:** 5 / 5 (100%)
- **Average score:** 0.920
- **Total LLM time:** 604.3s
- **Total tokens (in / out):** 1.68M / 32.1k (49 round-trips)


## anti-hallucination

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `rejectsCalendarCreateEvent` | OK | 1.00 | 40.4s | 166.7k | 1.1k | 5 | model avoided 'calendar_create_event' and picked 'calendar_create' instead |
| `rejectsDiagramTool` | OK | 1.00 | 369.9s | 778.9k | 25.0k | 22 | model avoided 'diagram_tool' and picked 'doc_write' instead |
| `rejectsDocSave` | OK | 0.60 | 2.7s | 32.7k | 159 | 1 | model avoided 'doc_save' without naming a real replacement (safe decline / clarify); tools called: [arthur_action] |
| `rejectsListAdd` | OK | 1.00 | 78.4s | 265.1k | 2.5k | 8 | model avoided 'list_add' and picked 'list_insert' instead |
| `rejectsRecordsCreate` | OK | 1.00 | 113.0s | 432.1k | 3.3k | 13 | model avoided 'records_create' and picked 'records_add_column' instead |
