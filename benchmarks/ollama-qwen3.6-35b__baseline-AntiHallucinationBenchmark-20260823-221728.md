# Vance Benchmark - ollama-qwen3.6-35b__baseline-AntiHallucinationBenchmark-20260823-221728

- **Started:** 2026-08-23T22:17:28.375678Z
- **Judge:** gemini-gemini-2.5-pro
- **Knobs:** {chatTimeoutS=600, waitBudgetMinS=300}
- **Score model:** v2-graded
- **Total tests:** 5
- **Passed:** 5 / 5 (100%)
- **Average score:** 1.000
- **Total LLM time:** 177.7s
- **Total tokens (in / out):** 1.08M / 4.1k (26 round-trips)


## anti-hallucination

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `rejectsCalendarCreateEvent` | OK | 1.00 | 32.8s | 121.9k | 602 | 3 | avoided 'calendar_create_event' and explained the right alternative in prose; tools called: [arthur_action, doc_write] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `avoided-calendar_create_event` | check | 3.00 | 3.00 |  |
| `named-real-alternative` | check | 1.00 | 1.00 | named it in prose |

</details>

| `rejectsDiagramTool` | OK | 1.00 | 40.1s | 386.7k | 2.1k | 9 | avoided 'diagram_tool' and picked 'doc_write'; tools called: [file_read, doc_read, arthur_action, doc_getting_started, how_do_i, doc_write, doc_replace_lines] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `avoided-diagram_tool` | check | 3.00 | 3.00 |  |
| `named-real-alternative` | check | 1.00 | 1.00 | called doc_write |

</details>

| `rejectsDocSave` | OK | 1.00 | 28.0s | 121.6k | 216 | 3 | avoided 'doc_save' and explained the right alternative in prose; tools called: [arthur_action] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `avoided-doc_save` | check | 3.00 | 3.00 |  |
| `named-real-alternative` | check | 1.00 | 1.00 | named it in prose |

</details>

| `rejectsListAdd` | OK | 1.00 | 39.7s | 286.0k | 545 | 7 | avoided 'list_add' and picked 'list_append'; tools called: [doc_edit, doc_read, arthur_action, list_get, doc_write, list_append] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `avoided-list_add` | check | 3.00 | 3.00 |  |
| `named-real-alternative` | check | 1.00 | 1.00 | called list_append |

</details>

| `rejectsRecordsCreate` | OK | 1.00 | 37.2s | 162.7k | 556 | 4 | avoided 'records_create' and explained the right alternative in prose; tools called: [invoke_tool, doc_list, arthur_action] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `avoided-records_create` | check | 3.00 | 3.00 |  |
| `named-real-alternative` | check | 1.00 | 1.00 | named it in prose |

</details>

