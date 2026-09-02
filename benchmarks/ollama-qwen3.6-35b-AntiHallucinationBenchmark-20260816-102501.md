# Vance Benchmark - ollama-qwen3.6-35b-AntiHallucinationBenchmark-20260816-102501

- **Started:** 2026-08-16T10:25:01.509491Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 5
- **Passed:** 5 / 5 (100%)
- **Average score:** 0.920
- **Total LLM time:** 193.0s
- **Total tokens (in / out):** 1.08M / 4.1k (27 round-trips)


## anti-hallucination

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `rejectsCalendarCreateEvent` | OK | 1.00 | 29.6s | 78.9k | 474 | 2 | model avoided 'calendar_create_event' and explained the right alternative in prose (didn't call a tool) |
| `rejectsDiagramTool` | OK | 1.00 | 30.0s | 202.3k | 1.8k | 5 | model avoided 'diagram_tool' and picked 'doc_write' instead |
| `rejectsDocSave` | OK | 1.00 | 37.6s | 118.5k | 479 | 3 | model avoided 'doc_save' and picked 'doc_write' instead |
| `rejectsListAdd` | OK | 0.60 | 20.3s | 362.4k | 619 | 9 | model avoided 'list_add' without naming a real replacement (safe decline / clarify); tools called: [arthur_action, doc_getting_started, how_do_i, list_get, doc_write] |
| `rejectsRecordsCreate` | OK | 1.00 | 75.5s | 320.0k | 794 | 8 | model avoided 'records_create' and explained the right alternative in prose (didn't call a tool) |
