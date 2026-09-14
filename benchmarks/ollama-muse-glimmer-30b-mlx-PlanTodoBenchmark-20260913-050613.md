# Vance Benchmark - ollama-muse-glimmer-30b-mlx-PlanTodoBenchmark-20260913-050613

- **Started:** 2026-09-13T05:06:13.511124Z
- **Judge:** glm-5.3-nvfp4
- **Knobs:** {chatTimeoutS=480, waitBudgetMinS=240}
- **Score model:** v2-graded
- **Total tests:** 2
- **Passed:** 2 / 2 (100%)
- **Average score:** 0.929
- **Total LLM time:** 415.9s
- **Total tokens (in / out):** 1.74M / 5.0k (43 round-trips)


## plan-todo

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `noPlanModeForSimpleRequest` | OK | 1.00 | 91.0s | 44.2k | 427 | 1 | simple question stayed out of plan mode — direct answer — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `no-plan-mode` | check | 2.00 | 2.00 | simple question answered without plan mode |
| `direct-answer` | check | 1.00 | 1.00 |  |

</details>

| `planModeForMultiStepWork` | OK | 0.86 | 324.9s | 1.70M | 4.6k | 42 | no START_PLAN — model skipped plan mode despite the approval gate — 86% — 7/8 checks · missed: start-plan-fired |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn1-completed` | stage | 1.00 | 1.00 |  |
| `start-plan-fired` | check | 0.00 | 1.50 | no START_PLAN action |
| `plan-proposed` | check | 1.50 | 1.50 | PROPOSE_PLAN with 5 todo(s) |
| `approval-turn-completed` | stage | 1.00 | 1.00 |  |
| `execution-started` | check | 1.50 | 1.50 | START_EXECUTION |
| `todos-walked` | check | 1.50 | 1.50 | todo items progressed (todo_update tool or TODO_UPDATE action) |
| `todos-completed` | check | 1.50 | 1.50 | final todo_update marks COMPLETED (auto-clear by design) or TODO_UPDATE action with final answer |
| `final-answer` | check | 1.00 | 1.00 |  |

</details>

