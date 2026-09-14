# Vance Benchmark - ollama-qwen3.6-35b-UrlImportDiscoveryBenchmark-20260913-074832

- **Started:** 2026-09-13T07:48:32.402236Z
- **Judge:** glm-5.3-nvfp4
- **Knobs:** {chatTimeoutS=480, waitBudgetMinS=240}
- **Score model:** v2-graded
- **Total tests:** 3
- **Passed:** 3 / 3 (100%)
- **Average score:** 1.000
- **Total LLM time:** 97.1s
- **Total tokens (in / out):** 399.2k / 509 (9 round-trips)


## url-import-discovery

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `reachesImportToolRun1` | OK | 1.00 | 87.1s | 133.1k | 191 | 3 | doc_import_url was called — tools: [arthur_action, doc_import_url] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `reached-doc_import_url` | check | 3.00 | 3.00 | directly, no lookup needed |
| `discovery-or-substitute` | check | 1.00 | 1.00 | neither |

</details>

| `reachesImportToolRun2` | OK | 1.00 | 5.1s | 133.1k | 162 | 3 | doc_import_url was called — tools: [arthur_action, doc_import_url] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `reached-doc_import_url` | check | 3.00 | 3.00 | directly, no lookup needed |
| `discovery-or-substitute` | check | 1.00 | 1.00 | neither |

</details>

| `reachesImportToolRun3` | OK | 1.00 | 4.9s | 133.1k | 156 | 3 | doc_import_url was called — tools: [arthur_action, doc_import_url] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `reached-doc_import_url` | check | 3.00 | 3.00 | directly, no lookup needed |
| `discovery-or-substitute` | check | 1.00 | 1.00 | neither |

</details>

