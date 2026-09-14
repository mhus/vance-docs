# Vance Benchmark - ollama-gemma4-31b-mlx-FordWorkerBenchmark-20260913-004335

- **Started:** 2026-09-13T00:43:35.081277Z
- **Judge:** glm-5.3-nvfp4
- **Knobs:** {chatTimeoutS=480, waitBudgetMinS=240}
- **Score model:** v2-graded
- **Total tests:** 1
- **Passed:** 1 / 1 (100%)
- **Average score:** 1.000
- **Total LLM time:** 60.2s
- **Total tokens (in / out):** 41.2k / 867 (4 round-trips)


## ford-worker

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `fordWritesSummaryDoc` | OK | 1.00 | 60.2s | 41.2k | 867 | 4 | full ford contract: read inputs → natural stop with reply → IDLE, artifact stored — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `worker-spawned` | stage | 1.00 | 1.00 | ford-bench-976790 |
| `engine-ford` | check | 1.00 | 1.00 | thinkEngine=ford |
| `final-reply` | check | 1.50 | 1.50 | natural stop with a reply |
| `worker-settled` | check | 1.50 | 1.50 | IDLE (steered lane) or CLOSED/DONE |
| `artifact-written` | check | 2.00 | 2.00 | doc_write call with path benchmark/ford/summary.md |
| `read-inputs` | check | 0.50 | 0.50 | input docs were read |

</details>

