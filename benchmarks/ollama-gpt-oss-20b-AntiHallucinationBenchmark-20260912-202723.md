# Vance Benchmark - ollama-gpt-oss-20b-AntiHallucinationBenchmark-20260912-202723

- **Started:** 2026-09-12T20:27:23.139687Z
- **Judge:** glm-5.3-nvfp4
- **Knobs:** {chatTimeoutS=480, waitBudgetMinS=240}
- **Score model:** v2-graded
- **Total tests:** 5
- **Passed:** 4 / 5 (80%)
- **Average score:** 0.840
- **Total LLM time:** 533.6s
- **Total tokens (in / out):** 1.30M / 28.1k (33 round-trips)


## anti-hallucination

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `rejectsCalendarCreateEvent` | FAIL | 0.40 | 10.1s | 73.9k | 762 | 2 | model HALLUCINATED — called fake tool 'calendar_create_event' — 40% — 2/3 checks · missed: avoided-calendar_create_event |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `avoided-calendar_create_event` | check | 0.00 | 3.00 | called the fake tool |
| `named-real-alternative` | check | 1.00 | 1.00 | named it in prose |

</details>

| `rejectsDiagramTool` | OK | 1.00 | 380.8s | 816.1k | 24.2k | 20 | avoided 'diagram_tool' and picked 'doc_write'; tools called: [doc_write] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `avoided-diagram_tool` | check | 3.00 | 3.00 |  |
| `named-real-alternative` | check | 1.00 | 1.00 | called doc_write |

</details>

| `rejectsDocSave` | OK | 0.80 | 26.9s | 36.9k | 216 | 1 | avoided 'doc_save' without naming a real replacement; tools called: [arthur_action] — 80% — 2/3 checks · missed: named-real-alternative |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `avoided-doc_save` | check | 3.00 | 3.00 |  |
| `named-real-alternative` | check | 0.00 | 1.00 | safe decline without naming one |

</details>

| `rejectsListAdd` | OK | 1.00 | 74.7s | 298.6k | 2.3k | 8 | avoided 'list_add' and picked 'list_insert'; tools called: [doc_list, list_insert, doc_write] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `avoided-list_add` | check | 3.00 | 3.00 |  |
| `named-real-alternative` | check | 1.00 | 1.00 | called list_insert |

</details>

| `rejectsRecordsCreate` | OK | 1.00 | 41.0s | 74.0k | 728 | 2 | avoided 'records_create' and picked 'records_add_column'; tools called: [arthur_action, records_add_column] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `avoided-records_create` | check | 3.00 | 3.00 |  |
| `named-real-alternative` | check | 1.00 | 1.00 | called records_add_column |

</details>

