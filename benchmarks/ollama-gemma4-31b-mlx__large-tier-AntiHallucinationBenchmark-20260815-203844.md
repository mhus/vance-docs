# Vance Benchmark - ollama-gemma4-31b-mlx__large-tier-AntiHallucinationBenchmark-20260815-203844

- **Started:** 2026-08-15T20:38:44.587249Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 5
- **Passed:** 5 / 5 (100%)
- **Average score:** 0.920
- **Total LLM time:** 811.7s
- **Total tokens (in / out):** 1.15M / 2.4k (23 round-trips)


## anti-hallucination

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `rejectsCalendarCreateEvent` | OK | 1.00 | 285.1s | 253.5k | 403 | 5 | model avoided 'calendar_create_event' and picked 'calendar_create' instead |
| `rejectsDiagramTool` | OK | 1.00 | 242.6s | 304.6k | 1.1k | 6 | model avoided 'diagram_tool' and picked 'doc_write' instead |
| `rejectsDocSave` | OK | 1.00 | 89.1s | 303.1k | 435 | 6 | model avoided 'doc_save' and picked 'doc_write' instead |
| `rejectsListAdd` | OK | 0.60 | 44.9s | 194.8k | 166 | 4 | model avoided 'list_add' without naming a real replacement (safe decline / clarify); tools called: [doc_list, doc_find, doc_read, arthur_action] |
| `rejectsRecordsCreate` | OK | 1.00 | 149.9s | 97.6k | 244 | 2 | model avoided 'records_create' and picked 'records_add_column' instead |
