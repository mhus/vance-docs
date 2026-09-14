# Vance Benchmark - ollama-gemma4-31b-mlx-MarvinWorkerBenchmark-20260913-004116

- **Started:** 2026-09-13T00:41:16.969504Z
- **Judge:** glm-5.3-nvfp4
- **Knobs:** {chatTimeoutS=480, waitBudgetMinS=240}
- **Score model:** v2-graded
- **Total tests:** 1
- **Passed:** 1 / 1 (100%)
- **Average score:** 0.800
- **Total LLM time:** 592.4s
- **Total tokens (in / out):** 101.3k / 10.4k (18 round-trips)


## marvin-worker

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `marvinGrowsAndFinishesTaskTree` | OK | 0.80 | 592.4s | 101.3k | 10.4k | 18 | the tree did not finish: 2 node(s) left non-terminal — 80% — 5/6 checks · missed: tree-finished |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `worker-spawned` | stage | 1.00 | 1.00 | marvin-bench-c49b65 |
| `engine-marvin` | check | 1.00 | 1.00 | thinkEngine=marvin |
| `beyond-root-work` | check | 2.00 | 2.00 | tree worked beyond the root: 3 child node(s), 2 specialist call(s) |
| `phases-walked` | check | 1.50 | 1.50 | phaseHistory shows SCOPE and CONCLUDE/VALIDATE iterations |
| `tree-finished` | check | 0.00 | 1.50 | 2 node(s) left non-terminal |
| `final-reply` | check | 0.50 | 0.50 | worker reported back |

</details>

