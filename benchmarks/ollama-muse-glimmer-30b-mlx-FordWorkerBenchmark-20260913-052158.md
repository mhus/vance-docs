# Vance Benchmark - ollama-muse-glimmer-30b-mlx-FordWorkerBenchmark-20260913-052158

- **Started:** 2026-09-13T05:21:58.978444Z
- **Judge:** glm-5.3-nvfp4
- **Knobs:** {chatTimeoutS=480, waitBudgetMinS=240}
- **Score model:** v2-graded
- **Total tests:** 1
- **Passed:** 1 / 1 (100%)
- **Average score:** 1.000
- **Total LLM time:** 42.8s
- **Total tokens (in / out):** 44.9k / 1.2k (4 round-trips)


## ford-worker

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `fordWritesSummaryDoc` | OK | 1.00 | 42.8s | 44.9k | 1.2k | 4 | full ford contract: read inputs → natural stop with reply → IDLE, artifact stored — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `worker-spawned` | stage | 1.00 | 1.00 | ford-bench-f0a305 |
| `engine-ford` | check | 1.00 | 1.00 | thinkEngine=ford |
| `final-reply` | check | 1.50 | 1.50 | natural stop with a reply |
| `worker-settled` | check | 1.50 | 1.50 | IDLE (steered lane) or CLOSED/DONE |
| `artifact-written` | check | 2.00 | 2.00 | doc_write call with path benchmark/ford/summary.md |
| `read-inputs` | check | 0.50 | 0.50 | input docs were read |

</details>

