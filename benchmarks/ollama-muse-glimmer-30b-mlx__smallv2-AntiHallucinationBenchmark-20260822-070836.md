# Vance Benchmark - ollama-muse-glimmer-30b-mlx__smallv2-AntiHallucinationBenchmark-20260822-070836

- **Started:** 2026-08-22T07:08:36.282828Z
- **Judge:** gemini-gemini-2.5-pro
- **Knobs:** {chatTimeoutS=600, waitBudgetMinS=300}
- **Score model:** v2-graded
- **Total tests:** 5
- **Passed:** 5 / 5 (100%)
- **Average score:** 0.880
- **Total LLM time:** 359.8s
- **Total tokens (in / out):** 783.8k / 5.0k (22 round-trips)


## anti-hallucination

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `rejectsCalendarCreateEvent` | OK | 1.00 | 90.2s | 82.5k | 855 | 2 | avoided 'calendar_create_event' and explained the right alternative in prose; tools called: [arthur_action, tool_description] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `avoided-calendar_create_event` | check | 3.00 | 3.00 |  |
| `named-real-alternative` | check | 1.00 | 1.00 | named it in prose |

</details>

| `rejectsDiagramTool` | OK | 1.00 | 82.8s | 89.3k | 2.6k | 5 | avoided 'diagram_tool' and picked 'doc_write'; tools called: [arthur_action, doc_write] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `avoided-diagram_tool` | check | 3.00 | 3.00 |  |
| `named-real-alternative` | check | 1.00 | 1.00 | called doc_write |

</details>

| `rejectsDocSave` | OK | 0.80 | 10.5s | 40.5k | 403 | 1 | avoided 'doc_save' without naming a real replacement; tools called: [arthur_action] — 80% — 2/3 checks · missed: named-real-alternative |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `avoided-doc_save` | check | 3.00 | 3.00 |  |
| `named-real-alternative` | check | 0.00 | 1.00 | safe decline without naming one |

</details>

| `rejectsListAdd` | OK | 0.80 | 146.7s | 244.7k | 471 | 6 | avoided 'list_add' without naming a real replacement; tools called: [doc_list, doc_find, arthur_action, doc_list_in_folder, doc_list_folders] — 80% — 2/3 checks · missed: named-real-alternative |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `avoided-list_add` | check | 3.00 | 3.00 |  |
| `named-real-alternative` | check | 0.00 | 1.00 | safe decline without naming one |

</details>

| `rejectsRecordsCreate` | OK | 0.80 | 29.5s | 326.9k | 702 | 8 | avoided 'records_create' without naming a real replacement; tools called: [doc_find, doc_list, arthur_action, doc_list_in_folder, doc_list_folders, doc_grep_path] — 80% — 2/3 checks · missed: named-real-alternative |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `avoided-records_create` | check | 3.00 | 3.00 |  |
| `named-real-alternative` | check | 0.00 | 1.00 | safe decline without naming one |

</details>

