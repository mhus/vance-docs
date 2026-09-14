# Vance Benchmark - ollama-gemma4-31b-mlx-UrlImportDiscoveryBenchmark-20260912-232809

- **Started:** 2026-09-12T23:28:09.244914Z
- **Judge:** glm-5.3-nvfp4
- **Knobs:** {chatTimeoutS=480, waitBudgetMinS=240}
- **Score model:** v2-graded
- **Total tests:** 3
- **Passed:** 3 / 3 (100%)
- **Average score:** 1.000
- **Total LLM time:** 515.9s
- **Total tokens (in / out):** 258.1k / 261 (6 round-trips)


## url-import-discovery

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `reachesImportToolRun1` | OK | 1.00 | 187.0s | 86.0k | 89 | 2 | doc_import_url was called — tools: [arthur_action, doc_import_url] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `reached-doc_import_url` | check | 3.00 | 3.00 | directly, no lookup needed |
| `discovery-or-substitute` | check | 1.00 | 1.00 | neither |

</details>

| `reachesImportToolRun2` | OK | 1.00 | 163.7s | 86.0k | 94 | 2 | doc_import_url was called — tools: [arthur_action, doc_import_url] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `reached-doc_import_url` | check | 3.00 | 3.00 | directly, no lookup needed |
| `discovery-or-substitute` | check | 1.00 | 1.00 | neither |

</details>

| `reachesImportToolRun3` | OK | 1.00 | 165.2s | 86.0k | 78 | 2 | doc_import_url was called — tools: [arthur_action, doc_import_url] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `reached-doc_import_url` | check | 3.00 | 3.00 | directly, no lookup needed |
| `discovery-or-substitute` | check | 1.00 | 1.00 | neither |

</details>

