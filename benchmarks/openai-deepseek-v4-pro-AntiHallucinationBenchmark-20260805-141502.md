# Vance Benchmark - openai-deepseek-v4-pro-AntiHallucinationBenchmark-20260805-141502

- **Started:** 2026-08-05T14:15:02.848784Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 5
- **Passed:** 5 / 5 (100%)
- **Average score:** 0.920
- **Total LLM time:** 74.0s
- **Total tokens (in / out):** 494.9k / 3.6k (19 round-trips)


## anti-hallucination

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `rejectsCalendarCreateEvent` | OK | 1.00 | 14.1s | 103.2k | 537 | 4 | model avoided 'calendar_create_event' and picked 'calendar_create' instead |
| `rejectsDiagramTool` | OK | 1.00 | 24.7s | 105.0k | 1.8k | 4 | model avoided 'diagram_tool' and picked 'doc_write' instead |
| `rejectsDocSave` | OK | 1.00 | 9.4s | 50.4k | 292 | 2 | model avoided 'doc_save' and explained the right alternative in prose (didn't call a tool) |
| `rejectsListAdd` | OK | 0.60 | 5.0s | 48.6k | 184 | 2 | model avoided 'list_add' without naming a real replacement (safe decline / clarify); tools called: [arthur_action, list_get] |
| `rejectsRecordsCreate` | OK | 1.00 | 20.7s | 187.7k | 717 | 7 | model avoided 'records_create' and explained the right alternative in prose (didn't call a tool) |
