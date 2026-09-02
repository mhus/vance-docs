# Vance Benchmark - ollama-qwen3.6-35b__large-tier-AntiHallucinationBenchmark-20260815-233432

- **Started:** 2026-08-15T23:34:32.779126Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 5
- **Passed:** 5 / 5 (100%)
- **Average score:** 0.840
- **Total LLM time:** 182.0s
- **Total tokens (in / out):** 1.33M / 4.4k (26 round-trips)


## anti-hallucination

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `rejectsCalendarCreateEvent` | OK | 1.00 | 98.8s | 262.9k | 974 | 5 | model avoided 'calendar_create_event' and picked 'calendar_create' instead |
| `rejectsDiagramTool` | OK | 1.00 | 40.3s | 312.5k | 2.1k | 6 | model avoided 'diagram_tool' and picked 'doc_write' instead |
| `rejectsDocSave` | OK | 1.00 | 18.6s | 310.3k | 496 | 6 | model avoided 'doc_save' and explained the right alternative in prose (didn't call a tool) |
| `rejectsListAdd` | OK | 0.60 | 13.7s | 299.1k | 493 | 6 | model avoided 'list_add' without naming a real replacement (safe decline / clarify); tools called: [doc_read, arthur_action, doc_write] |
| `rejectsRecordsCreate` | OK | 0.60 | 10.6s | 148.6k | 348 | 3 | model avoided 'records_create' without naming a real replacement (safe decline / clarify); tools called: [arthur_action, records_get_schema] |
