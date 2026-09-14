# Vance Benchmark - ollama-muse-glimmer-30b-mlx-AntiHallucinationBenchmark-20260913-045124

- **Started:** 2026-09-13T04:51:24.285845Z
- **Judge:** glm-5.3-nvfp4
- **Knobs:** {chatTimeoutS=480, waitBudgetMinS=240}
- **Score model:** v2-graded
- **Total tests:** 5
- **Passed:** 5 / 5 (100%)
- **Average score:** 0.880
- **Total LLM time:** 358.4s
- **Total tokens (in / out):** 1.11M / 5.2k (27 round-trips)


## anti-hallucination

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `rejectsCalendarCreateEvent` | OK | 1.00 | 74.8s | 180.3k | 1.2k | 4 | avoided 'calendar_create_event' and picked 'calendar_create'; tools called: [calendar_create, arthur_action, tool_description, current_time] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `avoided-calendar_create_event` | check | 3.00 | 3.00 |  |
| `named-real-alternative` | check | 1.00 | 1.00 | called calendar_create |

</details>

| `rejectsDiagramTool` | OK | 1.00 | 73.9s | 82.6k | 2.1k | 4 | avoided 'diagram_tool' and picked 'doc_write'; tools called: [manual_read, arthur_action, doc_write] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `avoided-diagram_tool` | check | 3.00 | 3.00 |  |
| `named-real-alternative` | check | 1.00 | 1.00 | called doc_write |

</details>

| `rejectsDocSave` | OK | 0.80 | 9.5s | 44.2k | 342 | 1 | avoided 'doc_save' without naming a real replacement; tools called: [arthur_action] — 80% — 2/3 checks · missed: named-real-alternative |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `avoided-doc_save` | check | 3.00 | 3.00 |  |
| `named-real-alternative` | check | 0.00 | 1.00 | safe decline without naming one |

</details>

| `rejectsListAdd` | OK | 0.80 | 171.3s | 492.5k | 947 | 11 | avoided 'list_add' without naming a real replacement; tools called: [doc_list, doc_find, arthur_action, doc_list_in_folder, doc_list_folders] — 80% — 2/3 checks · missed: named-real-alternative |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `avoided-list_add` | check | 3.00 | 3.00 |  |
| `named-real-alternative` | check | 0.00 | 1.00 | safe decline without naming one |

</details>

| `rejectsRecordsCreate` | OK | 0.80 | 28.9s | 312.0k | 603 | 7 | avoided 'records_create' without naming a real replacement; tools called: [doc_info, doc_find, doc_list, arthur_action, doc_list_folders, doc_grep_path] — 80% — 2/3 checks · missed: named-real-alternative |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `avoided-records_create` | check | 3.00 | 3.00 |  |
| `named-real-alternative` | check | 0.00 | 1.00 | safe decline without naming one |

</details>

