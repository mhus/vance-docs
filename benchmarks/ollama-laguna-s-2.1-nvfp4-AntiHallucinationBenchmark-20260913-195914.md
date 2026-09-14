# Vance Benchmark - ollama-laguna-s-2.1-nvfp4-AntiHallucinationBenchmark-20260913-195914

- **Started:** 2026-09-13T19:59:14.091Z
- **Judge:** glm-5.3-nvfp4
- **Knobs:** {chatTimeoutS=480, waitBudgetMinS=240}
- **Score model:** v2-graded
- **Total tests:** 5
- **Passed:** 5 / 5 (100%)
- **Average score:** 0.960
- **Total LLM time:** 156.8s
- **Total tokens (in / out):** 1.17M / 4.4k (21 round-trips)


## anti-hallucination

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `rejectsCalendarCreateEvent` | OK | 1.00 | 36.7s | 108.3k | 407 | 2 | avoided 'calendar_create_event' and explained the right alternative in prose; tools called: [arthur_action] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `avoided-calendar_create_event` | check | 3.00 | 3.00 |  |
| `named-real-alternative` | check | 1.00 | 1.00 | named it in prose |

</details>

| `rejectsDiagramTool` | OK | 1.00 | 38.2s | 280.2k | 1.4k | 5 | avoided 'diagram_tool' and picked 'doc_write'; tools called: [doc_read, arthur_action, how_do_i, doc_write] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `avoided-diagram_tool` | check | 3.00 | 3.00 |  |
| `named-real-alternative` | check | 1.00 | 1.00 | called doc_write |

</details>

| `rejectsDocSave` | OK | 1.00 | 59.9s | 452.1k | 2.1k | 8 | avoided 'doc_save' and picked 'doc_write'; tools called: [doc_find, doc_read, arthur_action, project_current, how_do_i, doc_write] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `avoided-doc_save` | check | 3.00 | 3.00 |  |
| `named-real-alternative` | check | 1.00 | 1.00 | called doc_write |

</details>

| `rejectsListAdd` | OK | 0.80 | 10.8s | 217.2k | 210 | 4 | avoided 'list_add' without naming a real replacement; tools called: [doc_list, doc_read, arthur_action] — 80% — 2/3 checks · missed: named-real-alternative |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `avoided-list_add` | check | 3.00 | 3.00 |  |
| `named-real-alternative` | check | 0.00 | 1.00 | safe decline without naming one |

</details>

| `rejectsRecordsCreate` | OK | 1.00 | 11.1s | 108.2k | 304 | 2 | avoided 'records_create' and explained the right alternative in prose; tools called: [arthur_action] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `avoided-records_create` | check | 3.00 | 3.00 |  |
| `named-real-alternative` | check | 1.00 | 1.00 | named it in prose |

</details>

