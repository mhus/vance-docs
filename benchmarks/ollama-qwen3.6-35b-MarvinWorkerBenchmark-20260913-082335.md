# Vance Benchmark - ollama-qwen3.6-35b-MarvinWorkerBenchmark-20260913-082335

- **Started:** 2026-09-13T08:23:35.559844Z
- **Judge:** glm-5.3-nvfp4
- **Knobs:** {chatTimeoutS=480, waitBudgetMinS=240}
- **Score model:** v2-graded
- **Total tests:** 1
- **Passed:** 0 / 1 (0%)
- **Average score:** 0.267
- **Total LLM time:** 117.4s
- **Total tokens (in / out):** 2.2k / 12.3k (3 round-trips)


## marvin-worker

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `marvinGrowsAndFinishesTaskTree` | FAIL | 0.27 | 117.4s | 2.2k | 12.3k | 3 | the root answered alone — no decomposition and no specialist call; deep-think without outreach is Ford work in Marvin clothing — 27% — 2/6 checks · missed: beyond-root-work, phases-walked, tree-finished, final-reply |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `worker-spawned` | stage | 1.00 | 1.00 | marvin-bench-33c232 |
| `engine-marvin` | check | 1.00 | 1.00 | thinkEngine=marvin |
| `beyond-root-work` | check | 0.00 | 2.00 | the root answered alone — no children, no specialist call |
| `phases-walked` | check | 0.00 | 1.50 | no node recorded the five-phase machine |
| `tree-finished` | check | 0.00 | 1.50 | root node not DONE |
| `final-reply` | check | 0.00 | 0.50 | no assistant reply from the worker |

</details>

