# Vance Benchmark - ollama-gemma4-31b-mlx-PlanTodoBenchmark-20260913-002845

- **Started:** 2026-09-13T00:28:45.182498Z
- **Judge:** glm-5.3-nvfp4
- **Knobs:** {chatTimeoutS=480, waitBudgetMinS=240}
- **Score model:** v2-graded
- **Total tests:** 2
- **Passed:** 1 / 2 (50%)
- **Average score:** 0.714
- **Total LLM time:** 283.3s
- **Total tokens (in / out):** 345.0k / 1.4k (9 round-trips)


## plan-todo

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `noPlanModeForSimpleRequest` | OK | 1.00 | 17.7s | 42.7k | 272 | 1 | simple question stayed out of plan mode — direct answer — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `no-plan-mode` | check | 2.00 | 2.00 | simple question answered without plan mode |
| `direct-answer` | check | 1.00 | 1.00 |  |

</details>

| `planModeForMultiStepWork` | FAIL | 0.43 | 265.5s | 302.3k | 1.1k | 8 | no START_PLAN — model skipped plan mode despite the approval gate — 43% — 4/8 checks · missed: start-plan-fired, execution-started, todos-walked, todos-completed |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn1-completed` | stage | 1.00 | 1.00 |  |
| `start-plan-fired` | check | 0.00 | 1.50 | no START_PLAN action |
| `plan-proposed` | check | 1.50 | 1.50 | PROPOSE_PLAN with 0 todo(s) |
| `approval-turn-completed` | stage | 1.00 | 1.00 |  |
| `execution-started` | check | 0.00 | 1.50 | no START_EXECUTION action |
| `todos-walked` | check | 0.00 | 1.50 | no todo progression observed |
| `todos-completed` | check | 0.00 | 1.50 | no completion evidence in the todo walk |
| `final-answer` | check | 1.00 | 1.00 |  |

</details>

