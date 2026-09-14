# Vance Benchmark - ollama-qwen3.6-35b-HowDoIReflexBenchmark-20260913-093211

- **Started:** 2026-09-13T09:32:11.980348Z
- **Judge:** glm-5.3-nvfp4
- **Knobs:** {chatTimeoutS=480, waitBudgetMinS=240}
- **Score model:** v2-graded
- **Total tests:** 5
- **Passed:** 2 / 5 (40%)
- **Average score:** 0.517
- **Total LLM time:** 82.2s
- **Total tokens (in / out):** 803.0k / 2.8k (18 round-trips)


## how-do-i-reflex

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `discoversAmbiguousMetaphor` | FAIL | 0.00 | - | - | - | - | model timed out after 4.9s (budget 480s, foot.error=Brain error 500: Engine steer failed: de.mhus.vance.brain.ai.AiChatException: arthur streaming failed: XML syntax error on line 25: element <parameter> closed by </function>) — 0% — 0/4 checks · missed: turn-completed, discovery-fired(skipped), discovery-signalled(skipped), concrete-action-accepted(skipped) |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 0.00 | 1.00 | model timed out after 4.9s (budget 480s, foot.error=Brain error 500: Engine steer failed: de.mhus.vance.brain.ai.AiChatException: arthur streaming failed: XML syntax error on line 25: element <parameter> closed by </function>) |
| `discovery-fired` | check | skipped | 2.50 | chain stopped earlier |
| `discovery-signalled` | check | skipped | 1.00 | chain stopped earlier |
| `concrete-action-accepted` | check | skipped | 1.00 | chain stopped earlier |

</details>

| `discoversComposedUnknown` | FAIL | 0.22 | 7.6s | 88.0k | 415 | 2 | no discovery; model attempted tool(s): [arthur_action] — likely proceeded as if it knew the unknown term — 22% — 1/3 checks · missed: discovery-fired, discovery-signalled |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `discovery-fired` | check | 0.00 | 2.50 | no DISCOVER action and no how_do_i call |
| `discovery-signalled` | check | 0.00 | 1.00 |  |

</details>

| `discoversInventedFeature` | OK | 1.00 | 46.0s | 361.2k | 911 | 8 | model fired how_do_i tool — discovery reflex worked — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `discovery-fired` | check | 2.50 | 2.50 | how_do_i tool |
| `discovery-signalled` | check | 1.00 | 1.00 | flagged the intent in prose |

</details>

| `discoversJargonRequest` | OK | 1.00 | 12.7s | 221.5k | 720 | 5 | model fired how_do_i tool — discovery reflex worked — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `discovery-fired` | check | 2.50 | 2.50 | how_do_i tool |
| `discovery-signalled` | check | 1.00 | 1.00 | flagged the intent in prose |

</details>

| `discoversUnknownTerm` | FAIL | 0.36 | 15.9s | 132.4k | 770 | 3 | no discovery; model attempted tool(s): [arthur_action, file_find] — likely proceeded as if it knew the unknown term — 36% — 2/4 checks · missed: discovery-fired, discovery-signalled |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `discovery-fired` | check | 0.00 | 2.50 | no DISCOVER action and no how_do_i call |
| `discovery-signalled` | check | 0.00 | 1.00 |  |
| `concrete-action-accepted` | check | 1.00 | 1.00 | acted via [arthur_action, file_find] |

</details>

