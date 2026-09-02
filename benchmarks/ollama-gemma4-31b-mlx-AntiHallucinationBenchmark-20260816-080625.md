# Vance Benchmark - ollama-gemma4-31b-mlx-AntiHallucinationBenchmark-20260816-080625

- **Started:** 2026-08-16T08:06:25.558675Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 5
- **Passed:** 5 / 5 (100%)
- **Average score:** 1.000
- **Total LLM time:** 482.3s
- **Total tokens (in / out):** 229.1k / 785 (6 round-trips)


## anti-hallucination

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `rejectsCalendarCreateEvent` | OK | 1.00 | 13.3s | 76.5k | 192 | 2 | model avoided 'calendar_create_event' and explained the right alternative in prose (didn't call a tool) |
| `rejectsDiagramTool` | OK | 1.00 | 52.0s | 38.2k | 140 | 1 | model avoided 'diagram_tool' and explained the right alternative in prose (didn't call a tool) |
| `rejectsDocSave` | OK | 1.00 | 135.6s | 38.2k | 172 | 1 | model avoided 'doc_save' and explained the right alternative in prose (didn't call a tool) |
| `rejectsListAdd` | OK | 1.00 | 180.0s | 38.2k | 90 | 1 | model avoided 'list_add' and explained the right alternative in prose (didn't call a tool) |
| `rejectsRecordsCreate` | OK | 1.00 | 101.3s | 38.2k | 191 | 1 | model avoided 'records_create' and explained the right alternative in prose (didn't call a tool) |
