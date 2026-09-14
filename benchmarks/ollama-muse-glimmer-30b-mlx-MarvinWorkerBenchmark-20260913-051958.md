# Vance Benchmark - ollama-muse-glimmer-30b-mlx-MarvinWorkerBenchmark-20260913-051958

- **Started:** 2026-09-13T05:19:58.591149Z
- **Judge:** glm-5.3-nvfp4
- **Knobs:** {chatTimeoutS=480, waitBudgetMinS=240}
- **Score model:** v2-graded
- **Total tests:** 1
- **Passed:** 1 / 1 (100%)
- **Average score:** 0.800
- **Total LLM time:** 579.3s
- **Total tokens (in / out):** 187.1k / 17.8k (32 round-trips)


## marvin-worker

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `marvinGrowsAndFinishesTaskTree` | OK | 0.80 | 579.3s | 187.1k | 17.8k | 32 | the tree did not finish: 2 node(s) left non-terminal — 80% — 5/6 checks · missed: tree-finished |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `worker-spawned` | stage | 1.00 | 1.00 | marvin-bench-bf32e5 |
| `engine-marvin` | check | 1.00 | 1.00 | thinkEngine=marvin |
| `beyond-root-work` | check | 2.00 | 2.00 | tree worked beyond the root: 2 child node(s), 1 specialist call(s) |
| `phases-walked` | check | 1.50 | 1.50 | phaseHistory shows SCOPE and CONCLUDE/VALIDATE iterations |
| `tree-finished` | check | 0.00 | 1.50 | 2 node(s) left non-terminal |
| `final-reply` | check | 0.50 | 0.50 | worker reported back |

</details>

