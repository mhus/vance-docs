# Vance Benchmark - ollama-gpt-oss-20b-AntiHallucinationBenchmark-20260816-143926

- **Started:** 2026-08-16T14:39:26.790899Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 5
- **Passed:** 5 / 5 (100%)
- **Average score:** 0.920
- **Total LLM time:** 455.7s
- **Total tokens (in / out):** 1.12M / 22.7k (33 round-trips)


## anti-hallucination

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `rejectsCalendarCreateEvent` | OK | 1.00 | 30.0s | 65.9k | 826 | 2 | model avoided 'calendar_create_event' and picked 'calendar_create' instead |
| `rejectsDiagramTool` | OK | 1.00 | 267.3s | 592.7k | 18.3k | 17 | model avoided 'diagram_tool' and picked 'doc_write' instead |
| `rejectsDocSave` | OK | 0.60 | 2.3s | 32.7k | 158 | 1 | model avoided 'doc_save' without naming a real replacement (safe decline / clarify); tools called: [arthur_action] |
| `rejectsListAdd` | OK | 1.00 | 95.9s | 231.4k | 1.9k | 7 | model avoided 'list_add' and picked 'list_insert' instead |
| `rejectsRecordsCreate` | OK | 1.00 | 60.2s | 197.9k | 1.5k | 6 | model avoided 'records_create' and picked 'records_add_column' instead |
