# Vance Benchmark - ollama-muse-glimmer-30b-mlx-UrlImportDiscoveryBenchmark-20260913-041807

- **Started:** 2026-09-13T04:18:07.249476Z
- **Judge:** glm-5.3-nvfp4
- **Knobs:** {chatTimeoutS=480, waitBudgetMinS=240}
- **Score model:** v2-graded
- **Total tests:** 3
- **Passed:** 2 / 3 (67%)
- **Average score:** 0.800
- **Total LLM time:** 290.5s
- **Total tokens (in / out):** 478.9k / 3.3k (15 round-trips)


## url-import-discovery

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `reachesImportToolRun1` | OK | 1.00 | 126.2s | 134.8k | 599 | 3 | doc_import_url was called — tools: [arthur_action, doc_import_url, tool_description] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `reached-doc_import_url` | check | 3.00 | 3.00 | after discovery via [tool_description] |
| `discovery-or-substitute` | check | 1.00 | 1.00 | discovery: [tool_description] |

</details>

| `reachesImportToolRun2` | OK | 1.00 | 17.5s | 134.8k | 562 | 3 | doc_import_url was called — tools: [arthur_action, doc_import_url, tool_description] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `reached-doc_import_url` | check | 3.00 | 3.00 | after discovery via [tool_description] |
| `discovery-or-substitute` | check | 1.00 | 1.00 | discovery: [tool_description] |

</details>

| `reachesImportToolRun3` | FAIL | 0.40 | 146.9s | 209.4k | 2.1k | 9 | no doc_import_url despite discovery [how_do_i, tool_description, tool_list]; settled for [web_fetch, doc_write]. Tools: [tool_list, arthur_action, tool_description, how_do_i, doc_write, web_fetch] — 40% — 2/3 checks · missed: reached-doc_import_url |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `reached-doc_import_url` | check | 0.00 | 3.00 | not called |
| `discovery-or-substitute` | check | 1.00 | 1.00 | discovery: [how_do_i, tool_description, tool_list] |

</details>

