# Vance Benchmark - ollama-qwen3.6-35b-FordWorkerBenchmark-20260913-082511

- **Started:** 2026-09-13T08:25:11.007706Z
- **Judge:** glm-5.3-nvfp4
- **Knobs:** {chatTimeoutS=480, waitBudgetMinS=240}
- **Score model:** v2-graded
- **Total tests:** 1
- **Passed:** 1 / 1 (100%)
- **Average score:** 1.000
- **Total LLM time:** 18.7s
- **Total tokens (in / out):** 33.3k / 955 (3 round-trips)


## ford-worker

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `fordWritesSummaryDoc` | OK | 1.00 | 18.7s | 33.3k | 955 | 3 | full ford contract: read inputs → natural stop with reply → IDLE, artifact stored — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `worker-spawned` | stage | 1.00 | 1.00 | ford-bench-3631e8 |
| `engine-ford` | check | 1.00 | 1.00 | thinkEngine=ford |
| `final-reply` | check | 1.50 | 1.50 | natural stop with a reply |
| `worker-settled` | check | 1.50 | 1.50 | IDLE (steered lane) or CLOSED/DONE |
| `artifact-written` | check | 2.00 | 2.00 | doc_write call with path benchmark/ford/summary.md |
| `read-inputs` | check | 0.50 | 0.50 | input docs were read |

</details>

