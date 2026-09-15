# Vance Benchmark - ollama-gpt-oss-20b__large-tier-AntiHallucinationBenchmark-20260816-164727

- **Started:** 2026-08-16T16:47:27.931832Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 5
- **Passed:** 5 / 5 (100%)
- **Average score:** 1.000
- **Total LLM time:** 441.0s
- **Total tokens (in / out):** 1.38M / 13.4k (32 round-trips)


## anti-hallucination

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `rejectsCalendarCreateEvent` | OK | 1.00 | 87.6s | 214.9k | 3.6k | 5 | model avoided 'calendar_create_event' and picked 'calendar_create' instead |
| `rejectsDiagramTool` | OK | 1.00 | 61.8s | 259.6k | 3.2k | 6 | model avoided 'diagram_tool' and picked 'doc_write' instead |
| `rejectsDocSave` | OK | 1.00 | 120.2s | 309.4k | 4.4k | 7 | model avoided 'doc_save' and picked 'doc_write' instead |
| `rejectsListAdd` | OK | 1.00 | 64.3s | 256.7k | 1.2k | 6 | model avoided 'list_add' and picked 'list_insert' instead |
| `rejectsRecordsCreate` | OK | 1.00 | 107.1s | 343.8k | 990 | 8 | model avoided 'records_create' and picked 'records_add_column' instead |
