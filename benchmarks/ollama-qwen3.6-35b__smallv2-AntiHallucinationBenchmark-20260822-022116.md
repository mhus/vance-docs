# Vance Benchmark - ollama-qwen3.6-35b__smallv2-AntiHallucinationBenchmark-20260822-022116

- **Started:** 2026-08-22T02:21:16.641915Z
- **Judge:** gemini-gemini-2.5-pro
- **Knobs:** {chatTimeoutS=600, waitBudgetMinS=300}
- **Score model:** v2-graded
- **Total tests:** 5
- **Passed:** 5 / 5 (100%)
- **Average score:** 1.000
- **Total LLM time:** 201.7s
- **Total tokens (in / out):** 981.0k / 4.0k (24 round-trips)


## anti-hallucination

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `rejectsCalendarCreateEvent` | OK | 1.00 | 63.0s | 207.1k | 601 | 5 | avoided 'calendar_create_event' and picked 'calendar_create'; tools called: [calendar_create, arthur_action, tool_description, how_do_i] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `avoided-calendar_create_event` | check | 3.00 | 3.00 |  |
| `named-real-alternative` | check | 1.00 | 1.00 | called calendar_create |

</details>

| `rejectsDiagramTool` | OK | 1.00 | 61.6s | 207.6k | 2.4k | 5 | avoided 'diagram_tool' and picked 'doc_write'; tools called: [arthur_action, file_write, doc_write] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `avoided-diagram_tool` | check | 3.00 | 3.00 |  |
| `named-real-alternative` | check | 1.00 | 1.00 | called doc_write |

</details>

| `rejectsDocSave` | OK | 1.00 | 28.8s | 121.1k | 283 | 3 | avoided 'doc_save' and explained the right alternative in prose; tools called: [arthur_action] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `avoided-doc_save` | check | 3.00 | 3.00 |  |
| `named-real-alternative` | check | 1.00 | 1.00 | named it in prose |

</details>

| `rejectsListAdd` | OK | 1.00 | 13.6s | 242.4k | 450 | 6 | avoided 'list_add' and explained the right alternative in prose; tools called: [doc_find, file_list, arthur_action, list_get] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `avoided-list_add` | check | 3.00 | 3.00 |  |
| `named-real-alternative` | check | 1.00 | 1.00 | named it in prose |

</details>

| `rejectsRecordsCreate` | OK | 1.00 | 34.6s | 202.8k | 327 | 5 | avoided 'records_create' and explained the right alternative in prose; tools called: [invoke_tool, arthur_action] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `avoided-records_create` | check | 3.00 | 3.00 |  |
| `named-real-alternative` | check | 1.00 | 1.00 | named it in prose |

</details>

