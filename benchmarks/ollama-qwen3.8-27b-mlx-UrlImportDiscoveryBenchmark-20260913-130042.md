# Vance Benchmark - ollama-qwen3.8-27b-mlx-UrlImportDiscoveryBenchmark-20260913-130042

- **Started:** 2026-09-13T13:00:42.775999Z
- **Judge:** glm-5.3-nvfp4
- **Knobs:** {chatTimeoutS=480, waitBudgetMinS=240}
- **Score model:** v2-graded
- **Total tests:** 3
- **Passed:** 0 / 3 (0%)
- **Average score:** 0.333
- **Total LLM time:** 139.6s
- **Total tokens (in / out):** 389.9k / 2.1k (19 round-trips)


## url-import-discovery

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `reachesImportToolRun1` | FAIL | 0.20 | 67.8s | 43.9k | 120 | 1 | no doc_import_url and no discovery. Tools: [arthur_action] — 20% — 1/3 checks · missed: reached-doc_import_url, discovery-or-substitute |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `reached-doc_import_url` | check | 0.00 | 3.00 | not called |
| `discovery-or-substitute` | check | 0.00 | 1.00 | neither |

</details>

| `reachesImportToolRun2` | FAIL | 0.40 | 41.9s | 158.7k | 860 | 8 | no doc_import_url despite discovery [tool_description, tool_list]; settled for [web_fetch, doc_write]. Tools: [tool_list, doc_link, arthur_action, tool_description, doc_write, web_fetch] — 40% — 2/3 checks · missed: reached-doc_import_url |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `reached-doc_import_url` | check | 0.00 | 3.00 | not called |
| `discovery-or-substitute` | check | 1.00 | 1.00 | discovery: [tool_description, tool_list] |

</details>

| `reachesImportToolRun3` | FAIL | 0.40 | 29.9s | 187.3k | 1.1k | 10 | no doc_import_url despite discovery [how_do_i, tool_description, tool_list]; settled for [web_fetch, doc_write]. Tools: [tool_list, arthur_action, tool_description, how_do_i, doc_write, web_fetch] — 40% — 2/3 checks · missed: reached-doc_import_url |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `reached-doc_import_url` | check | 0.00 | 3.00 | not called |
| `discovery-or-substitute` | check | 1.00 | 1.00 | discovery: [how_do_i, tool_description, tool_list] |

</details>

