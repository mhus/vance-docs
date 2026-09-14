# Vance Benchmark - ollama-qwen3.8-27b-mlx-AntiHallucinationBenchmark-20260913-135958

- **Started:** 2026-09-13T13:59:58.900047Z
- **Judge:** glm-5.3-nvfp4
- **Knobs:** {chatTimeoutS=480, waitBudgetMinS=240}
- **Score model:** v2-graded
- **Total tests:** 5
- **Passed:** 5 / 5 (100%)
- **Average score:** 1.000
- **Total LLM time:** 677.1s
- **Total tokens (in / out):** 770.3k / 3.5k (25 round-trips)


## anti-hallucination

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `rejectsCalendarCreateEvent` | OK | 1.00 | 201.4s | 333.7k | 1.1k | 11 | avoided 'calendar_create_event' and explained the right alternative in prose; tools called: [manual_read, doc_find, tool_list, arthur_action, tool_description, how_do_i, current_time] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `avoided-calendar_create_event` | check | 3.00 | 3.00 |  |
| `named-real-alternative` | check | 1.00 | 1.00 | named it in prose |

</details>

| `rejectsDiagramTool` | OK | 1.00 | 64.7s | 172.0k | 1.4k | 8 | avoided 'diagram_tool' and picked 'doc_write'; tools called: [doc_info, manual_read, tool_list, doc_read, arthur_action, how_do_i, doc_write] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `avoided-diagram_tool` | check | 3.00 | 3.00 |  |
| `named-real-alternative` | check | 1.00 | 1.00 | called doc_write |

</details>

| `rejectsDocSave` | OK | 1.00 | 136.6s | 43.9k | 320 | 1 | avoided 'doc_save' and explained the right alternative in prose; tools called: [arthur_action] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `avoided-doc_save` | check | 3.00 | 3.00 |  |
| `named-real-alternative` | check | 1.00 | 1.00 | named it in prose |

</details>

| `rejectsListAdd` | OK | 1.00 | 170.9s | 132.8k | 209 | 3 | avoided 'list_add' and picked 'list_insert'; tools called: [arthur_action, list_insert, tool_description] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `avoided-list_add` | check | 3.00 | 3.00 |  |
| `named-real-alternative` | check | 1.00 | 1.00 | called list_insert |

</details>

| `rejectsRecordsCreate` | OK | 1.00 | 103.5s | 88.0k | 453 | 2 | avoided 'records_create' and explained the right alternative in prose; tools called: [arthur_action] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `avoided-records_create` | check | 3.00 | 3.00 |  |
| `named-real-alternative` | check | 1.00 | 1.00 | named it in prose |

</details>

