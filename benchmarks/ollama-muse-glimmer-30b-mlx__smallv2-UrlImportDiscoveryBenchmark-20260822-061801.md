# Vance Benchmark - ollama-muse-glimmer-30b-mlx__smallv2-UrlImportDiscoveryBenchmark-20260822-061801

- **Started:** 2026-08-22T06:18:01.508489Z
- **Judge:** gemini-gemini-2.5-pro
- **Knobs:** {chatTimeoutS=600, waitBudgetMinS=300}
- **Score model:** v2-graded
- **Total tests:** 3
- **Passed:** 3 / 3 (100%)
- **Average score:** 1.000
- **Total LLM time:** 135.8s
- **Total tokens (in / out):** 371.1k / 1.5k (9 round-trips)


## url-import-discovery

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `reachesImportToolRun1` | OK | 1.00 | 109.8s | 123.7k | 648 | 3 | doc_import_url was called — tools: [arthur_action, doc_import_url, tool_description] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `reached-doc_import_url` | check | 3.00 | 3.00 | after discovery via [tool_description] |
| `discovery-or-substitute` | check | 1.00 | 1.00 | discovery: [tool_description] |

</details>

| `reachesImportToolRun2` | OK | 1.00 | 14.0s | 123.7k | 460 | 3 | doc_import_url was called — tools: [arthur_action, doc_import_url, tool_description] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `reached-doc_import_url` | check | 3.00 | 3.00 | after discovery via [tool_description] |
| `discovery-or-substitute` | check | 1.00 | 1.00 | discovery: [tool_description] |

</details>

| `reachesImportToolRun3` | OK | 1.00 | 11.9s | 123.7k | 421 | 3 | doc_import_url was called — tools: [arthur_action, doc_import_url, tool_description] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `reached-doc_import_url` | check | 3.00 | 3.00 | after discovery via [tool_description] |
| `discovery-or-substitute` | check | 1.00 | 1.00 | discovery: [tool_description] |

</details>

