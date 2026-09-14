# Vance Benchmark - glm-5.3-nvfp4-MarvinWorkerBenchmark-20260912-160722

- **Started:** 2026-09-12T16:07:22.440967Z
- **Judge:** glm-5.3-nvfp4
- **Score model:** v2-graded
- **Total tests:** 1
- **Passed:** 1 / 1 (100%)
- **Average score:** 1.000
- **Total LLM time:** 42.8s
- **Total tokens (in / out):** 61.3k / 10.1k (22 round-trips)


## marvin-worker

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `marvinGrowsAndFinishesTaskTree` | OK | 1.00 | 42.8s | 61.3k | 10.1k | 22 | full marvin contract: beyond-root work → five phases → root DONE → reply — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `worker-spawned` | stage | 1.00 | 1.00 | marvin-bench-be1540 |
| `engine-marvin` | check | 1.00 | 1.00 | thinkEngine=marvin |
| `beyond-root-work` | check | 2.00 | 2.00 | tree worked beyond the root: 0 child node(s), 1 specialist call(s) |
| `phases-walked` | check | 1.50 | 1.50 | phaseHistory shows SCOPE and CONCLUDE/VALIDATE iterations |
| `tree-finished` | check | 1.50 | 1.50 | root DONE, no non-terminal nodes |
| `final-reply` | check | 0.50 | 0.50 | worker reported back |

</details>

