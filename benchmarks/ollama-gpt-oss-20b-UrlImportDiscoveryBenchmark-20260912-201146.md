# Vance Benchmark - ollama-gpt-oss-20b-UrlImportDiscoveryBenchmark-20260912-201146

- **Started:** 2026-09-12T20:11:46.882791Z
- **Judge:** glm-5.3-nvfp4
- **Knobs:** {chatTimeoutS=480, waitBudgetMinS=240}
- **Score model:** v2-graded
- **Total tests:** 3
- **Passed:** 2 / 3 (67%)
- **Average score:** 0.800
- **Total LLM time:** 126.6s
- **Total tokens (in / out):** 448.2k / 4.5k (12 round-trips)


## url-import-discovery

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `reachesImportToolRun1` | OK | 1.00 | 78.2s | 149.8k | 1.4k | 4 | doc_import_url was called — tools: [doc_import_url] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `reached-doc_import_url` | check | 3.00 | 3.00 | directly, no lookup needed |
| `discovery-or-substitute` | check | 1.00 | 1.00 | neither |

</details>

| `reachesImportToolRun2` | FAIL | 0.40 | 37.5s | 186.4k | 2.5k | 5 | no doc_import_url and no discovery; settled for [web_fetch, doc_write]. Tools: [doc_write, web_fetch] — 40% — 2/3 checks · missed: reached-doc_import_url |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `reached-doc_import_url` | check | 0.00 | 3.00 | not called |
| `discovery-or-substitute` | check | 1.00 | 1.00 | settled for [web_fetch, doc_write] |

</details>

| `reachesImportToolRun3` | OK | 1.00 | 10.9s | 112.0k | 589 | 3 | doc_import_url was called — tools: [arthur_action, doc_import_url] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `reached-doc_import_url` | check | 3.00 | 3.00 | directly, no lookup needed |
| `discovery-or-substitute` | check | 1.00 | 1.00 | neither |

</details>

