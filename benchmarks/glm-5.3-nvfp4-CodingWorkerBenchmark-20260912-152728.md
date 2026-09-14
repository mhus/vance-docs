# Vance Benchmark - glm-5.3-nvfp4-CodingWorkerBenchmark-20260912-152728

- **Started:** 2026-09-12T15:27:28.407546Z
- **Judge:** glm-5.3-nvfp4
- **Score model:** v2-graded
- **Total tests:** 1
- **Passed:** 1 / 1 (100%)
- **Average score:** 1.000
- **Total LLM time:** 2.2s
- **Total tokens (in / out):** 35.1k / 295 (3 round-trips)


## coding-worker

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `frankieFixesBuggyFibonacci` | OK | 1.00 | 2.2s | 35.1k | 295 | 3 | full coding contract: read → hash-guarded surgical edit → settled, bug fixed — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `worker-spawned` | stage | 1.00 | 1.00 | coding-bench-09ba2d |
| `engine-frankie` | check | 1.00 | 1.00 | thinkEngine=frankie |
| `read-before-edit` | check | 1.50 | 1.50 | file_read on fib.js chronologically before file_edit |
| `hash-guard` | check | 1.50 | 1.50 | file_edit carried expectedContentHash |
| `surgical-fix` | check | 2.00 | 2.00 | bug fixed, structure intact |
| `worker-settled` | check | 0.50 | 0.50 | IDLE (steered lane) or CLOSED/DONE |

</details>

