# Vance Benchmark - ollama-gpt-oss-20b-FordWorkerBenchmark-20260912-205946

- **Started:** 2026-09-12T20:59:46.553884Z
- **Judge:** glm-5.3-nvfp4
- **Knobs:** {chatTimeoutS=480, waitBudgetMinS=240}
- **Score model:** v2-graded
- **Total tests:** 1
- **Passed:** 1 / 1 (100%)
- **Average score:** 1.000
- **Total LLM time:** 10.3s
- **Total tokens (in / out):** 33.6k / 585 (4 round-trips)


## ford-worker

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `fordWritesSummaryDoc` | OK | 1.00 | 10.3s | 33.6k | 585 | 4 | full ford contract: read inputs → natural stop with reply → IDLE, artifact stored — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `worker-spawned` | stage | 1.00 | 1.00 | ford-bench-eaeddc |
| `engine-ford` | check | 1.00 | 1.00 | thinkEngine=ford |
| `final-reply` | check | 1.50 | 1.50 | natural stop with a reply |
| `worker-settled` | check | 1.50 | 1.50 | IDLE (steered lane) or CLOSED/DONE |
| `artifact-written` | check | 2.00 | 2.00 | doc_write call with path benchmark/ford/summary.md |
| `read-inputs` | check | 0.50 | 0.50 | input docs were read |

</details>

