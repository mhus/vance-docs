# Vance Benchmark - ollama-qwen3.6-35b-PlanTodoBenchmark-20260913-081110

- **Started:** 2026-09-13T08:11:10.882158Z
- **Judge:** glm-5.3-nvfp4
- **Knobs:** {chatTimeoutS=480, waitBudgetMinS=240}
- **Score model:** v2-graded
- **Total tests:** 2
- **Passed:** 1 / 2 (50%)
- **Average score:** 0.548
- **Total LLM time:** 61.7s
- **Total tokens (in / out):** 267.0k / 2.3k (6 round-trips)


## plan-todo

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `noPlanModeForSimpleRequest` | OK | 1.00 | 11.3s | 88.2k | 745 | 2 | simple question stayed out of plan mode — direct answer — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `no-plan-mode` | check | 2.00 | 2.00 | simple question answered without plan mode |
| `direct-answer` | check | 1.00 | 1.00 |  |

</details>

| `planModeForMultiStepWork` | FAIL | 0.10 | 50.3s | 178.7k | 1.5k | 4 | no START_PLAN — model skipped plan mode despite the approval gate — 10% — 1/8 checks · missed: start-plan-fired, plan-proposed, approval-turn-completed, execution-started(skipped), todos-walked(skipped), todos-completed(skipped), final-answer(skipped) |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn1-completed` | stage | 1.00 | 1.00 |  |
| `start-plan-fired` | check | 0.00 | 1.50 | no START_PLAN action |
| `plan-proposed` | check | 0.00 | 1.50 | no PROPOSE_PLAN action |
| `approval-turn-completed` | stage | 0.00 | 1.00 |  |
| `execution-started` | check | skipped | 1.50 | chain stopped earlier |
| `todos-walked` | check | skipped | 1.50 | chain stopped earlier |
| `todos-completed` | check | skipped | 1.50 | chain stopped earlier |
| `final-answer` | check | skipped | 1.00 | chain stopped earlier |

</details>

