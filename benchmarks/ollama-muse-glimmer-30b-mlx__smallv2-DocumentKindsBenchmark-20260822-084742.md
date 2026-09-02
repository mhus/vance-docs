# Vance Benchmark - ollama-muse-glimmer-30b-mlx__smallv2-DocumentKindsBenchmark-20260822-084742

- **Started:** 2026-08-22T08:47:42.109646Z
- **Judge:** gemini-gemini-2.5-pro
- **Knobs:** {chatTimeoutS=600, waitBudgetMinS=300}
- **Score model:** v2-graded
- **Total tests:** 5
- **Passed:** 3 / 5 (60%)
- **Average score:** 0.700
- **Total LLM time:** 649.1s
- **Total tokens (in / out):** 882.1k / 5.8k (27 round-trips)


## document-kinds

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `createsApplicationKind` | FAIL | 0.14 | 284.8s | 316.2k | 2.3k | 12 | kind=application (0 chars) — 14% — 1/6 checks · missed: document-of-kind, body-not-empty(skipped), structural-shape(skipped), elements(skipped), quality(skipped) |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-of-kind` | stage | 0.00 | 1.00 | nothing of kind=application within 300s; kinds in project: [chart, text] |
| `body-not-empty` | stage | skipped | 0.50 | chain stopped earlier |
| `structural-shape` | stage | skipped | 1.50 | chain stopped earlier |
| `elements` | counted | skipped | 1.00 | chain stopped earlier |
| `quality` | judged | skipped | 2.00 | chain stopped earlier |

</details>


<details><summary>artifacts</summary>

```
=== full body (0 chars) ===

```

</details>

| `createsChartKind` | OK | 1.00 | 79.8s | 127.5k | 839 | 3 | kind=chart at benchmark/chart-sales.json (437 chars); judge: All required data points are present and correct. — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-of-kind` | stage | 1.00 | 1.00 | benchmark/chart-sales.json |
| `body-not-empty` | stage | 0.50 | 0.50 |  |
| `structural-shape` | stage | 1.50 | 1.50 | must be JSON or YAML with a top-level `chart.chartType` and a non-empty `series[]` array |
| `elements` | counted | 5/5 | 1.00 | all 5 present |
| `quality` | judged | 2.00 | 2.00 | All required data points are present and correct. |

</details>

| `createsDiagramKind` | FAIL | 0.36 | 173.0s | 246.5k | 861 | 6 | kind=diagram at benchmark/diagram-login-flow.md (119 chars) — 36% — 3/6 checks · missed: structural-shape, elements(skipped), quality(skipped) |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-of-kind` | stage | 1.00 | 1.00 | benchmark/diagram-login-flow.md |
| `body-not-empty` | stage | 0.50 | 0.50 |  |
| `structural-shape` | stage | 0.00 | 1.50 | body must contain a parseable Mermaid flowchart (either inside a ```mermaid fence in markdown, or as a `source` string in a JSON/YAML body); miss: parsed as JSON/YAML but no `source` string holds the Mermaid DSL |
| `elements` | counted | skipped | 1.00 | chain stopped earlier |
| `quality` | judged | skipped | 2.00 | chain stopped earlier |

</details>


<details><summary>artifacts</summary>

```
=== full body (119 chars) ===
flowchart LR
    User --> Form
    Form --> Validate
    Validate -->|success| Dashboard
    Validate -->|failure| Form
```

</details>

| `createsGraphKind` | OK | 1.00 | 45.4s | 126.3k | 946 | 3 | kind=graph at benchmark/graph-diamond.json (276 chars); judge: Candidate correctly implements the required diamond graph structure. — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-of-kind` | stage | 1.00 | 1.00 | benchmark/graph-diamond.json |
| `body-not-empty` | stage | 0.50 | 0.50 |  |
| `structural-shape` | stage | 1.50 | 1.50 | must be JSON or YAML with top-level `nodes[]` and `edges[]` arrays |
| `elements` | counted | 4/4 | 1.00 | all 4 present |
| `quality` | judged | 2.00 | 2.00 | Candidate correctly implements the required diamond graph structure. |

</details>

| `createsMindmapKind` | OK | 1.00 | 66.1s | 65.7k | 837 | 3 | kind=mindmap at benchmark/mindmap-languages.md (164 chars); judge: The candidate correctly implements the requested nested structure with all specified nodes. — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-of-kind` | stage | 1.00 | 1.00 | benchmark/mindmap-languages.md |
| `body-not-empty` | stage | 0.50 | 0.50 |  |
| `structural-shape` | stage | 1.50 | 1.50 | must carry an `items[]` hierarchy (JSON/YAML) OR a nested markdown bullet list |
| `elements` | counted | 12/12 | 1.00 | all 12 present |
| `quality` | judged | 2.00 | 2.00 | The candidate correctly implements the requested nested structure with all specified nodes. |

</details>

