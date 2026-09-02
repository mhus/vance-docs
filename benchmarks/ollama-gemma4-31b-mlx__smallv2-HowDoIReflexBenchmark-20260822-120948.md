# Vance Benchmark - ollama-gemma4-31b-mlx__smallv2-HowDoIReflexBenchmark-20260822-120948

- **Started:** 2026-08-22T12:09:48.353502Z
- **Judge:** gemini-gemini-2.5-pro
- **Knobs:** {chatTimeoutS=600, waitBudgetMinS=300}
- **Score model:** v2-graded
- **Total tests:** 5
- **Passed:** 3 / 5 (60%)
- **Average score:** 0.745
- **Total LLM time:** 496.9s
- **Total tokens (in / out):** 438.3k / 1.1k (14 round-trips)


## how-do-i-reflex

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `discoversAmbiguousMetaphor` | FAIL | 0.36 | 120.9s | 99.5k | 312 | 4 | no discovery; model attempted tool(s): [arthur_action, doc_write] — likely proceeded as if it knew the unknown term — 36% — 2/4 checks · missed: discovery-fired, discovery-signalled |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `discovery-fired` | check | 0.00 | 2.50 | no DISCOVER action and no how_do_i call |
| `discovery-signalled` | check | 0.00 | 1.00 |  |
| `concrete-action-accepted` | check | 1.00 | 1.00 | acted via [arthur_action, doc_write] |

</details>

| `discoversComposedUnknown` | OK | 1.00 | 215.6s | 118.6k | 262 | 3 | model fired DISCOVER action — discovery reflex worked — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `discovery-fired` | check | 2.50 | 2.50 | DISCOVER action |
| `discovery-signalled` | check | 1.00 | 1.00 |  |

</details>

| `discoversInventedFeature` | OK | 1.00 | 37.3s | 118.7k | 291 | 3 | model fired DISCOVER action — discovery reflex worked — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `discovery-fired` | check | 2.50 | 2.50 | DISCOVER action |
| `discovery-signalled` | check | 1.00 | 1.00 |  |

</details>

| `discoversJargonRequest` | OK | 1.00 | 105.6s | 62.6k | 149 | 3 | model fired how_do_i tool — discovery reflex worked — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `discovery-fired` | check | 2.50 | 2.50 | how_do_i tool |
| `discovery-signalled` | check | 1.00 | 1.00 | flagged the intent in prose |

</details>

| `discoversUnknownTerm` | FAIL | 0.36 | 17.6s | 39.0k | 73 | 1 | no discovery; model attempted tool(s): [arthur_action] — likely proceeded as if it knew the unknown term — 36% — 2/4 checks · missed: discovery-fired, discovery-signalled |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `discovery-fired` | check | 0.00 | 2.50 | no DISCOVER action and no how_do_i call |
| `discovery-signalled` | check | 0.00 | 1.00 |  |
| `concrete-action-accepted` | check | 1.00 | 1.00 | acted via [arthur_action] |

</details>

