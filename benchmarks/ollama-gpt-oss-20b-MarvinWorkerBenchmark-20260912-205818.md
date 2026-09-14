# Vance Benchmark - ollama-gpt-oss-20b-MarvinWorkerBenchmark-20260912-205818

- **Started:** 2026-09-12T20:58:18.520127Z
- **Judge:** glm-5.3-nvfp4
- **Knobs:** {chatTimeoutS=480, waitBudgetMinS=240}
- **Score model:** v2-graded
- **Total tests:** 1
- **Passed:** 1 / 1 (100%)
- **Average score:** 0.800
- **Total LLM time:** 162.6s
- **Total tokens (in / out):** 87.3k / 15.7k (29 round-trips)


## marvin-worker

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `marvinGrowsAndFinishesTaskTree` | OK | 0.80 | 162.6s | 87.3k | 15.7k | 29 | the tree did not finish: root node not DONE — 80% — 5/6 checks · missed: tree-finished |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `worker-spawned` | stage | 1.00 | 1.00 | marvin-bench-4e5451 |
| `engine-marvin` | check | 1.00 | 1.00 | thinkEngine=marvin |
| `beyond-root-work` | check | 2.00 | 2.00 | tree worked beyond the root: 2 child node(s), 2 specialist call(s) |
| `phases-walked` | check | 1.50 | 1.50 | phaseHistory shows SCOPE and CONCLUDE/VALIDATE iterations |
| `tree-finished` | check | 0.00 | 1.50 | root node not DONE |
| `final-reply` | check | 0.50 | 0.50 | worker reported back |

</details>

