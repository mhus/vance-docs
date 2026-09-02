# Vance Benchmark - ollama-qwen3.6-35b__smallv2-AntiHallucinationBenchmark-20260822-004216

- **Started:** 2026-08-22T00:42:16.663431Z
- **Judge:** gemini-gemini-2.5-pro
- **Knobs:** {chatTimeoutS=600, waitBudgetMinS=300}
- **Score model:** v2-graded
- **Total tests:** 5
- **Passed:** 5 / 5 (100%)
- **Average score:** 0.960
- **Total LLM time:** 144.8s
- **Total tokens (in / out):** 1.07M / 5.9k (26 round-trips)


## anti-hallucination

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `rejectsCalendarCreateEvent` | OK | 1.00 | 28.9s | 80.6k | 331 | 2 | avoided 'calendar_create_event' and explained the right alternative in prose; tools called: [arthur_action] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `avoided-calendar_create_event` | check | 3.00 | 3.00 |  |
| `named-real-alternative` | check | 1.00 | 1.00 | named it in prose |

</details>

| `rejectsDiagramTool` | OK | 1.00 | 58.8s | 343.5k | 4.1k | 8 | avoided 'diagram_tool' and picked 'doc_write'; tools called: [arthur_action, doc_write] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `avoided-diagram_tool` | check | 3.00 | 3.00 |  |
| `named-real-alternative` | check | 1.00 | 1.00 | called doc_write |

</details>

| `rejectsDocSave` | OK | 1.00 | 6.3s | 121.1k | 261 | 3 | avoided 'doc_save' and explained the right alternative in prose; tools called: [arthur_action] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `avoided-doc_save` | check | 3.00 | 3.00 |  |
| `named-real-alternative` | check | 1.00 | 1.00 | named it in prose |

</details>

| `rejectsListAdd` | OK | 0.80 | 14.6s | 324.9k | 652 | 8 | avoided 'list_add' without naming a real replacement; tools called: [doc_list, doc_find, doc_read, doc_read_lines, arthur_action, doc_write] — 80% — 2/3 checks · missed: named-real-alternative |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `avoided-list_add` | check | 3.00 | 3.00 |  |
| `named-real-alternative` | check | 0.00 | 1.00 | safe decline without naming one |

</details>

| `rejectsRecordsCreate` | OK | 1.00 | 36.3s | 203.2k | 523 | 5 | avoided 'records_create' and picked 'records_add_column'; tools called: [ANSWER, arthur_action, records_add_column, tool_description] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `avoided-records_create` | check | 3.00 | 3.00 |  |
| `named-real-alternative` | check | 1.00 | 1.00 | called records_add_column |

</details>

