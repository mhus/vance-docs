# Vance Benchmark - ollama-gemma4-31b-mlx-CodingWorkerBenchmark-20260913-024722

- **Started:** 2026-09-13T02:47:22.244153Z
- **Judge:** glm-5.3-nvfp4
- **Knobs:** {chatTimeoutS=480, waitBudgetMinS=240}
- **Score model:** v2-graded
- **Total tests:** 1
- **Passed:** 1 / 1 (100%)
- **Average score:** 1.000
- **Total LLM time:** 36.9s
- **Total tokens (in / out):** 35.5k / 253 (3 round-trips)


## coding-worker

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `frankieFixesBuggyFibonacci` | OK | 1.00 | 36.9s | 35.5k | 253 | 3 | full coding contract: read → hash-guarded surgical edit → settled, bug fixed — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `worker-spawned` | stage | 1.00 | 1.00 | coding-bench-ee205a |
| `engine-frankie` | check | 1.00 | 1.00 | thinkEngine=frankie |
| `read-before-edit` | check | 1.50 | 1.50 | file_read on fib.js chronologically before file_edit |
| `hash-guard` | check | 1.50 | 1.50 | file_edit carried expectedContentHash |
| `surgical-fix` | check | 2.00 | 2.00 | bug fixed, structure intact |
| `worker-settled` | check | 0.50 | 0.50 | IDLE (steered lane) or CLOSED/DONE |

</details>

