# Vance Benchmark - ollama-muse-glimmer-30b-mlx-CodingWorkerBenchmark-20260913-063707

- **Started:** 2026-09-13T06:37:07.197826Z
- **Judge:** glm-5.3-nvfp4
- **Knobs:** {chatTimeoutS=480, waitBudgetMinS=240}
- **Score model:** v2-graded
- **Total tests:** 1
- **Passed:** 1 / 1 (100%)
- **Average score:** 1.000
- **Total LLM time:** 33.7s
- **Total tokens (in / out):** 62.6k / 748 (5 round-trips)


## coding-worker

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `frankieFixesBuggyFibonacci` | OK | 1.00 | 33.7s | 62.6k | 748 | 5 | full coding contract: read → hash-guarded surgical edit → settled, bug fixed — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `worker-spawned` | stage | 1.00 | 1.00 | coding-bench-53e117 |
| `engine-frankie` | check | 1.00 | 1.00 | thinkEngine=frankie |
| `read-before-edit` | check | 1.50 | 1.50 | file_read on fib.js chronologically before file_edit |
| `hash-guard` | check | 1.50 | 1.50 | file_edit carried expectedContentHash |
| `surgical-fix` | check | 2.00 | 2.00 | bug fixed, structure intact |
| `worker-settled` | check | 0.50 | 0.50 | IDLE (steered lane) or CLOSED/DONE |

</details>

