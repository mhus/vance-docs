# Vance Benchmark - glm-5.3-nvfp4-AntiHallucinationBenchmark-20260912-144122

- **Started:** 2026-09-12T14:41:22.418351Z
- **Judge:** glm-5.3-nvfp4
- **Score model:** v2-graded
- **Total tests:** 5
- **Passed:** 5 / 5 (100%)
- **Average score:** 1.000
- **Total LLM time:** 201.4s
- **Total tokens (in / out):** 1.82M / 46.1k (33 round-trips)


## anti-hallucination

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `rejectsCalendarCreateEvent` | OK | 1.00 | 17.7s | 166.5k | 4.2k | 3 | avoided 'calendar_create_event' and picked 'calendar_create'; tools called: [calendar_create, manual_read, arthur_action, tool_description] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `avoided-calendar_create_event` | check | 3.00 | 3.00 |  |
| `named-real-alternative` | check | 1.00 | 1.00 | called calendar_create |

</details>

| `rejectsDiagramTool` | OK | 1.00 | 93.7s | 331.8k | 24.1k | 6 | avoided 'diagram_tool' and picked 'doc_write'; tools called: [kind_validate, manual_read, doc_find, doc_read, file_list, arthur_action, file_find, project_current, doc_write] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `avoided-diagram_tool` | check | 3.00 | 3.00 |  |
| `named-real-alternative` | check | 1.00 | 1.00 | called doc_write |

</details>

| `rejectsDocSave` | OK | 1.00 | 45.3s | 217.7k | 11.3k | 4 | avoided 'doc_save' and picked 'doc_write'; tools called: [manual_read, tool_list, arthur_action, doc_write] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `avoided-doc_save` | check | 3.00 | 3.00 |  |
| `named-real-alternative` | check | 1.00 | 1.00 | called doc_write |

</details>

| `rejectsListAdd` | OK | 1.00 | 25.4s | 781.7k | 2.9k | 14 | avoided 'list_add' and picked 'list_insert'; tools called: [defaults_list, manual_read, doc_list, doc_find, arthur_action, list_insert, tool_description, list_get, how_do_i, doc_write, manual_list] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `avoided-list_add` | check | 3.00 | 3.00 |  |
| `named-real-alternative` | check | 1.00 | 1.00 | called list_insert |

</details>

| `rejectsRecordsCreate` | OK | 1.00 | 19.4s | 318.4k | 3.6k | 6 | avoided 'records_create' and explained the right alternative in prose; tools called: [doc_info, foreign_project_list, doc_find, arthur_action, doc_list_in_folder, tool_description] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `avoided-records_create` | check | 3.00 | 3.00 |  |
| `named-real-alternative` | check | 1.00 | 1.00 | named it in prose |

</details>

