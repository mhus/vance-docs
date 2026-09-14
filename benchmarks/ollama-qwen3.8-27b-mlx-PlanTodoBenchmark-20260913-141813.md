# Vance Benchmark - ollama-qwen3.8-27b-mlx-PlanTodoBenchmark-20260913-141813

- **Started:** 2026-09-13T14:18:13.734512Z
- **Judge:** glm-5.3-nvfp4
- **Knobs:** {chatTimeoutS=480, waitBudgetMinS=240}
- **Score model:** v2-graded
- **Total tests:** 2
- **Passed:** 1 / 2 (50%)
- **Average score:** 0.857
- **Total LLM time:** 358.3s
- **Total tokens (in / out):** 333.6k / 2.1k (9 round-trips)


## plan-todo

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `noPlanModeForSimpleRequest` | OK | 1.00 | 87.2s | 43.9k | 322 | 1 | simple question stayed out of plan mode — direct answer — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `no-plan-mode` | check | 2.00 | 2.00 | simple question answered without plan mode |
| `direct-answer` | check | 1.00 | 1.00 |  |

</details>

| `planModeForMultiStepWork` | FAIL | 0.71 | 271.1s | 289.8k | 1.8k | 8 | execution ran without walking the todo list — 71% — 6/8 checks · missed: todos-walked, todos-completed |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn1-completed` | stage | 1.00 | 1.00 |  |
| `start-plan-fired` | check | 1.50 | 1.50 | START_PLAN |
| `plan-proposed` | check | 1.50 | 1.50 | PROPOSE_PLAN with 4 todo(s) |
| `approval-turn-completed` | stage | 1.00 | 1.00 |  |
| `execution-started` | check | 1.50 | 1.50 | START_EXECUTION |
| `todos-walked` | check | 0.00 | 1.50 | no todo progression observed |
| `todos-completed` | check | 0.00 | 1.50 | no completion evidence in the todo walk |
| `final-answer` | check | 1.00 | 1.00 |  |

</details>

