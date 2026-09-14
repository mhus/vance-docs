# Vance Benchmark - ollama-qwen3.8-27b-mlx-MarvinWorkerBenchmark-20260913-142642

- **Started:** 2026-09-13T14:26:42.333392Z
- **Judge:** glm-5.3-nvfp4
- **Knobs:** {chatTimeoutS=480, waitBudgetMinS=240}
- **Score model:** v2-graded
- **Total tests:** 1
- **Passed:** 1 / 1 (100%)
- **Average score:** 1.000
- **Total LLM time:** 283.0s
- **Total tokens (in / out):** 59.0k / 10.2k (16 round-trips)


## marvin-worker

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `marvinGrowsAndFinishesTaskTree` | OK | 1.00 | 283.0s | 59.0k | 10.2k | 16 | full marvin contract: beyond-root work → five phases → root DONE → reply — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `worker-spawned` | stage | 1.00 | 1.00 | marvin-bench-8d4ba7 |
| `engine-marvin` | check | 1.00 | 1.00 | thinkEngine=marvin |
| `beyond-root-work` | check | 2.00 | 2.00 | tree worked beyond the root: 2 child node(s), 2 specialist call(s) |
| `phases-walked` | check | 1.50 | 1.50 | phaseHistory shows SCOPE and CONCLUDE/VALIDATE iterations |
| `tree-finished` | check | 1.50 | 1.50 | root DONE, no non-terminal nodes |
| `final-reply` | check | 0.50 | 0.50 | worker reported back |

</details>

