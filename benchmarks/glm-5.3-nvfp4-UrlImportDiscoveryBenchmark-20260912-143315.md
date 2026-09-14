# Vance Benchmark - glm-5.3-nvfp4-UrlImportDiscoveryBenchmark-20260912-143315

- **Started:** 2026-09-12T14:33:15.649639Z
- **Judge:** glm-5.3-nvfp4
- **Score model:** v2-graded
- **Total tests:** 3
- **Passed:** 3 / 3 (100%)
- **Average score:** 1.000
- **Total LLM time:** 20.7s
- **Total tokens (in / out):** 642.0k / 2.9k (12 round-trips)


## url-import-discovery

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `reachesImportToolRun1` | OK | 1.00 | 11.6s | 214.1k | 1.5k | 4 | doc_import_url was called — tools: [arthur_action, doc_link, doc_import_url, tool_description] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `reached-doc_import_url` | check | 3.00 | 3.00 | after discovery via [tool_description] |
| `discovery-or-substitute` | check | 1.00 | 1.00 | discovery: [tool_description] |

</details>

| `reachesImportToolRun2` | OK | 1.00 | 4.1s | 213.9k | 452 | 4 | doc_import_url was called — tools: [arthur_action, doc_link, doc_import_url, tool_description] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `reached-doc_import_url` | check | 3.00 | 3.00 | after discovery via [tool_description] |
| `discovery-or-substitute` | check | 1.00 | 1.00 | discovery: [tool_description] |

</details>

| `reachesImportToolRun3` | OK | 1.00 | 5.0s | 214.0k | 857 | 4 | doc_import_url was called — tools: [arthur_action, doc_link, doc_import_url, tool_description] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `reached-doc_import_url` | check | 3.00 | 3.00 | after discovery via [tool_description] |
| `discovery-or-substitute` | check | 1.00 | 1.00 | discovery: [tool_description] |

</details>

