# Vance Benchmark - glm-5.3-nvfp4-PlanTodoBenchmark-20260912-163036

- **Started:** 2026-09-12T16:30:36.113930Z
- **Judge:** glm-5.3-nvfp4
- **Score model:** v2-graded
- **Total tests:** 2
- **Passed:** 2 / 2 (100%)
- **Average score:** 1.000
- **Total LLM time:** 203.6s
- **Total tokens (in / out):** 899.4k / 41.7k (23 round-trips)


## plan-todo

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `noPlanModeForSimpleRequest` | OK | 1.00 | 3.9s | 52.8k | 370 | 1 | simple question stayed out of plan mode — direct answer — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `no-plan-mode` | check | 2.00 | 2.00 | simple question answered without plan mode |
| `direct-answer` | check | 1.00 | 1.00 |  |

</details>

| `planModeForMultiStepWork` | OK | 1.00 | 199.7s | 846.6k | 41.3k | 22 | full plan flow: START_PLAN → PROPOSE_PLAN → approval → START_EXECUTION, todos walked to completion, final answer delivered — 100% — 8/8 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn1-completed` | stage | 1.00 | 1.00 |  |
| `start-plan-fired` | check | 1.50 | 1.50 | START_PLAN |
| `plan-proposed` | check | 1.50 | 1.50 | PROPOSE_PLAN with 4 todo(s) |
| `approval-turn-completed` | stage | 1.00 | 1.00 |  |
| `execution-started` | check | 1.50 | 1.50 | START_EXECUTION |
| `todos-walked` | check | 1.50 | 1.50 | todo items progressed (todo_update tool or TODO_UPDATE action) |
| `todos-completed` | check | 1.50 | 1.50 | final todo_update marks COMPLETED (auto-clear by design) or TODO_UPDATE action with final answer |
| `final-answer` | check | 1.00 | 1.00 |  |

</details>

