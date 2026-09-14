# Vance Benchmark - ollama-gpt-oss-20b-HowDoIReflexBenchmark-20260912-223141

- **Started:** 2026-09-12T22:31:41.814286Z
- **Judge:** glm-5.3-nvfp4
- **Knobs:** {chatTimeoutS=480, waitBudgetMinS=240}
- **Score model:** v2-graded
- **Total tests:** 5
- **Passed:** 2 / 5 (40%)
- **Average score:** 0.590
- **Total LLM time:** 210.0s
- **Total tokens (in / out):** 1.88M / 9.7k (48 round-trips)


## how-do-i-reflex

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `discoversAmbiguousMetaphor` | FAIL | 0.36 | 23.5s | 186.6k | 1.3k | 5 | no discovery; model attempted tool(s): [doc_write] — likely proceeded as if it knew the unknown term — 36% — 2/4 checks · missed: discovery-fired, discovery-signalled |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `discovery-fired` | check | 0.00 | 2.50 | no DISCOVER action and no how_do_i call |
| `discovery-signalled` | check | 0.00 | 1.00 |  |
| `concrete-action-accepted` | check | 1.00 | 1.00 | acted via [doc_write] |

</details>

| `discoversComposedUnknown` | FAIL | 0.22 | 49.0s | 564.5k | 2.8k | 15 | no discovery; model attempted tool(s): [search, doc_list, doc_find, project_list, doc_grep_path] — likely proceeded as if it knew the unknown term — 22% — 1/3 checks · missed: discovery-fired, discovery-signalled |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `discovery-fired` | check | 0.00 | 2.50 | no DISCOVER action and no how_do_i call |
| `discovery-signalled` | check | 0.00 | 1.00 |  |

</details>

| `discoversInventedFeature` | OK | 1.00 | 50.4s | 382.7k | 2.7k | 10 | model fired how_do_i tool — discovery reflex worked — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `discovery-fired` | check | 2.50 | 2.50 | how_do_i tool |
| `discovery-signalled` | check | 1.00 | 1.00 | flagged the intent in prose |

</details>

| `discoversJargonRequest` | OK | 1.00 | 74.7s | 596.0k | 2.2k | 14 | model fired how_do_i tool — discovery reflex worked — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `discovery-fired` | check | 2.50 | 2.50 | how_do_i tool |
| `discovery-signalled` | check | 1.00 | 1.00 | flagged the intent in prose |

</details>

| `discoversUnknownTerm` | FAIL | 0.36 | 12.3s | 148.5k | 844 | 4 | no discovery; model attempted tool(s): [kit_list] — likely proceeded as if it knew the unknown term — 36% — 2/4 checks · missed: discovery-fired, discovery-signalled |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `discovery-fired` | check | 0.00 | 2.50 | no DISCOVER action and no how_do_i call |
| `discovery-signalled` | check | 0.00 | 1.00 |  |
| `concrete-action-accepted` | check | 1.00 | 1.00 | acted via [kit_list] |

</details>

