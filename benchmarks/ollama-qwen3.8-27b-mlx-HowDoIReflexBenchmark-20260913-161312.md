# Vance Benchmark - ollama-qwen3.8-27b-mlx-HowDoIReflexBenchmark-20260913-161312

- **Started:** 2026-09-13T16:13:12.605343Z
- **Judge:** glm-5.3-nvfp4
- **Knobs:** {chatTimeoutS=480, waitBudgetMinS=240}
- **Score model:** v2-graded
- **Total tests:** 5
- **Passed:** 5 / 5 (100%)
- **Average score:** 1.000
- **Total LLM time:** 198.6s
- **Total tokens (in / out):** 712.8k / 3.0k (16 round-trips)


## how-do-i-reflex

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `discoversAmbiguousMetaphor` | OK | 1.00 | 23.1s | 133.3k | 405 | 3 | model fired DISCOVER action — discovery reflex worked — 100% — 4/4 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `discovery-fired` | check | 2.50 | 2.50 | DISCOVER action |
| `discovery-signalled` | check | 1.00 | 1.00 |  |
| `concrete-action-accepted` | check | 1.00 | 1.00 | acted via [manual_read, arthur_action] |

</details>

| `discoversComposedUnknown` | OK | 1.00 | 18.1s | 133.3k | 391 | 3 | model fired DISCOVER action — discovery reflex worked — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `discovery-fired` | check | 2.50 | 2.50 | DISCOVER action |
| `discovery-signalled` | check | 1.00 | 1.00 |  |

</details>

| `discoversInventedFeature` | OK | 1.00 | 91.6s | 132.4k | 807 | 3 | model fired DISCOVER action — discovery reflex worked — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `discovery-fired` | check | 2.50 | 2.50 | DISCOVER action |
| `discovery-signalled` | check | 1.00 | 1.00 | flagged the intent in prose |

</details>

| `discoversJargonRequest` | OK | 1.00 | 47.0s | 180.8k | 927 | 4 | model fired how_do_i tool — discovery reflex worked — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `discovery-fired` | check | 2.50 | 2.50 | how_do_i tool |
| `discovery-signalled` | check | 1.00 | 1.00 | flagged the intent in prose |

</details>

| `discoversUnknownTerm` | OK | 1.00 | 18.8s | 133.0k | 437 | 3 | model fired DISCOVER action — discovery reflex worked — 100% — 4/4 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `discovery-fired` | check | 2.50 | 2.50 | DISCOVER action |
| `discovery-signalled` | check | 1.00 | 1.00 | flagged the intent in prose |
| `concrete-action-accepted` | check | 1.00 | 1.00 | acted via [manual_read, arthur_action] |

</details>

