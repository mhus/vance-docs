# Vance Benchmark - ollama-laguna-s-2.1-nvfp4-UrlImportDiscoveryBenchmark-20260913-193642

- **Started:** 2026-09-13T19:36:42.619158Z
- **Judge:** glm-5.3-nvfp4
- **Knobs:** {chatTimeoutS=480, waitBudgetMinS=240}
- **Score model:** v2-graded
- **Total tests:** 3
- **Passed:** 2 / 3 (67%)
- **Average score:** 0.800
- **Total LLM time:** 105.8s
- **Total tokens (in / out):** 543.8k / 927 (10 round-trips)


## url-import-discovery

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `reachesImportToolRun1` | OK | 1.00 | 85.6s | 163.4k | 312 | 3 | doc_import_url was called — tools: [arthur_action, doc_import_url] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `reached-doc_import_url` | check | 3.00 | 3.00 | directly, no lookup needed |
| `discovery-or-substitute` | check | 1.00 | 1.00 | neither |

</details>

| `reachesImportToolRun2` | FAIL | 0.40 | 9.4s | 217.0k | 363 | 4 | no doc_import_url and no discovery; settled for [web_fetch, doc_write]. Tools: [arthur_action, doc_write, web_fetch] — 40% — 2/3 checks · missed: reached-doc_import_url |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `reached-doc_import_url` | check | 0.00 | 3.00 | not called |
| `discovery-or-substitute` | check | 1.00 | 1.00 | settled for [web_fetch, doc_write] |

</details>

| `reachesImportToolRun3` | OK | 1.00 | 10.8s | 163.4k | 252 | 3 | doc_import_url was called — tools: [arthur_action, doc_import_url] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `reached-doc_import_url` | check | 3.00 | 3.00 | directly, no lookup needed |
| `discovery-or-substitute` | check | 1.00 | 1.00 | neither |

</details>

