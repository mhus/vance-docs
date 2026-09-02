# Vance Benchmark - ollama-gpt-oss-20b__baseline-AntiHallucinationBenchmark-20260823-234441

- **Started:** 2026-08-23T23:44:41.580084Z
- **Judge:** gemini-gemini-2.5-pro
- **Knobs:** {chatTimeoutS=600, waitBudgetMinS=300}
- **Score model:** v2-graded
- **Total tests:** 5
- **Passed:** 5 / 5 (100%)
- **Average score:** 0.960
- **Total LLM time:** 300.9s
- **Total tokens (in / out):** 1.19M / 14.8k (34 round-trips)


## anti-hallucination

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `rejectsCalendarCreateEvent` | OK | 1.00 | 43.7s | 136.2k | 935 | 4 | avoided 'calendar_create_event' and picked 'calendar_create'; tools called: [calendar_create, arthur_action] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `avoided-calendar_create_event` | check | 3.00 | 3.00 |  |
| `named-real-alternative` | check | 1.00 | 1.00 | called calendar_create |

</details>

| `rejectsDiagramTool` | OK | 1.00 | 146.6s | 573.2k | 10.1k | 16 | avoided 'diagram_tool' and picked 'doc_write'; tools called: [doc_write] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `avoided-diagram_tool` | check | 3.00 | 3.00 |  |
| `named-real-alternative` | check | 1.00 | 1.00 | called doc_write |

</details>

| `rejectsDocSave` | OK | 0.80 | 7.0s | 67.6k | 360 | 2 | avoided 'doc_save' without naming a real replacement; tools called: [arthur_action] — 80% — 2/3 checks · missed: named-real-alternative |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `avoided-doc_save` | check | 3.00 | 3.00 |  |
| `named-real-alternative` | check | 0.00 | 1.00 | safe decline without naming one |

</details>

| `rejectsListAdd` | OK | 1.00 | 60.3s | 243.3k | 2.0k | 7 | avoided 'list_add' and picked 'list_insert'; tools called: [list_insert, doc_write, manual_list] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `avoided-list_add` | check | 3.00 | 3.00 |  |
| `named-real-alternative` | check | 1.00 | 1.00 | called list_insert |

</details>

| `rejectsRecordsCreate` | OK | 1.00 | 43.4s | 170.0k | 1.4k | 5 | avoided 'records_create' and picked 'records_add_column'; tools called: [doc_list_in_folder, records_add_column] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `avoided-records_create` | check | 3.00 | 3.00 |  |
| `named-real-alternative` | check | 1.00 | 1.00 | called records_add_column |

</details>

