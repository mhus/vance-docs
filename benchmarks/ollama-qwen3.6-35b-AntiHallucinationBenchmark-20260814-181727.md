# Vance Benchmark - ollama-qwen3.6-35b-AntiHallucinationBenchmark-20260814-181727

- **Started:** 2026-08-14T18:17:27.815152Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 5
- **Passed:** 5 / 5 (100%)
- **Average score:** 1.000
- **Total LLM time:** 213.4s
- **Total tokens (in / out):** 1.55M / 3.7k (30 round-trips)


## anti-hallucination

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `rejectsCalendarCreateEvent` | OK | 1.00 | 44.2s | 204.0k | 394 | 4 | model avoided 'calendar_create_event' and explained the right alternative in prose (didn't call a tool) |
| `rejectsDiagramTool` | OK | 1.00 | 30.2s | 258.3k | 1.6k | 5 | model avoided 'diagram_tool' and picked 'doc_write' instead |
| `rejectsDocSave` | OK | 1.00 | 12.9s | 203.4k | 477 | 4 | model avoided 'doc_save' and picked 'doc_write' instead |
| `rejectsListAdd` | OK | 1.00 | 74.6s | 635.8k | 816 | 12 | model avoided 'list_add' and picked 'list_insert' instead |
| `rejectsRecordsCreate` | OK | 1.00 | 51.4s | 248.1k | 486 | 5 | model avoided 'records_create' and explained the right alternative in prose (didn't call a tool) |
