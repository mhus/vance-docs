# Vance Benchmark - glm-5.3-nvfp4-FordWorkerBenchmark-20260912-150328

- **Started:** 2026-09-12T15:03:28.354741Z
- **Judge:** glm-5.3-nvfp4
- **Score model:** v2-graded
- **Total tests:** 1
- **Passed:** 1 / 1 (100%)
- **Average score:** 1.000
- **Total LLM time:** 4.4s
- **Total tokens (in / out):** 34.8k / 782 (3 round-trips)


## ford-worker

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `fordWritesSummaryDoc` | OK | 1.00 | 4.4s | 34.8k | 782 | 3 | full ford contract: read inputs → natural stop with reply → IDLE, artifact stored — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `worker-spawned` | stage | 1.00 | 1.00 | ford-bench-320150 |
| `engine-ford` | check | 1.00 | 1.00 | thinkEngine=ford |
| `final-reply` | check | 1.50 | 1.50 | natural stop with a reply |
| `worker-settled` | check | 1.50 | 1.50 | IDLE (steered lane) or CLOSED/DONE |
| `artifact-written` | check | 2.00 | 2.00 | doc_write call with path benchmark/ford/summary.md |
| `read-inputs` | check | 0.50 | 0.50 | input docs were read |

</details>

