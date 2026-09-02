# Vance Benchmark - ollama-gpt-oss-20b__baseline-UrlImportDiscoveryBenchmark-20260823-233421

- **Started:** 2026-08-23T23:34:21.897933Z
- **Judge:** gemini-gemini-2.5-pro
- **Knobs:** {chatTimeoutS=600, waitBudgetMinS=300}
- **Score model:** v2-graded
- **Total tests:** 3
- **Passed:** 3 / 3 (100%)
- **Average score:** 1.000
- **Total LLM time:** 71.4s
- **Total tokens (in / out):** 376.0k / 981 (11 round-trips)


## url-import-discovery

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `reachesImportToolRun1` | OK | 1.00 | 50.9s | 136.9k | 291 | 4 | doc_import_url was called — tools: [doc_import_url] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `reached-doc_import_url` | check | 3.00 | 3.00 | directly, no lookup needed |
| `discovery-or-substitute` | check | 1.00 | 1.00 | neither |

</details>

| `reachesImportToolRun2` | OK | 1.00 | 15.7s | 171.2k | 522 | 5 | doc_import_url was called — tools: [doc_import_url] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `reached-doc_import_url` | check | 3.00 | 3.00 | directly, no lookup needed |
| `discovery-or-substitute` | check | 1.00 | 1.00 | neither |

</details>

| `reachesImportToolRun3` | OK | 1.00 | 4.8s | 67.9k | 168 | 2 | doc_import_url was called — tools: [arthur_action, doc_import_url] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `reached-doc_import_url` | check | 3.00 | 3.00 | directly, no lookup needed |
| `discovery-or-substitute` | check | 1.00 | 1.00 | neither |

</details>

