# Vance Benchmark - ollama-gemma4-31b-mlx__smallv2-DocumentKindsBenchmark-20260822-115538

- **Started:** 2026-08-22T11:55:38.854949Z
- **Judge:** gemini-gemini-2.5-pro
- **Knobs:** {chatTimeoutS=600, waitBudgetMinS=300}
- **Score model:** v2-graded
- **Total tests:** 5
- **Passed:** 2 / 5 (40%)
- **Average score:** 0.571
- **Total LLM time:** 539.7s
- **Total tokens (in / out):** 591.8k / 1.6k (15 round-trips)


## document-kinds

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `createsApplicationKind` | FAIL | 0.14 | 11.2s | 78.3k | 140 | 2 | kind=application (0 chars) — 14% — 1/6 checks · missed: document-of-kind, body-not-empty(skipped), structural-shape(skipped), elements(skipped), quality(skipped) |

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

| `createsChartKind` | FAIL | 0.36 | 114.5s | 158.1k | 537 | 4 | kind=chart at benchmark/chart-sales.json (287 chars) — 36% — 3/6 checks · missed: structural-shape, elements(skipped), quality(skipped) |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-of-kind` | stage | 1.00 | 1.00 | benchmark/chart-sales.json |
| `body-not-empty` | stage | 0.50 | 0.50 |  |
| `structural-shape` | stage | 0.00 | 1.50 | body must be JSON or YAML with a top-level `chart.chartType` and a non-empty `series[]` array; miss: missing top-level `series[]` array |
| `elements` | counted | skipped | 1.00 | chain stopped earlier |
| `quality` | judged | skipped | 2.00 | chain stopped earlier |

</details>


<details><summary>artifacts</summary>

```
=== full body (287 chars) ===
{
  "$meta": {
    "kind": "chart",
    "title": "Sales Zahlen"
  },
  "chart": {
    "chartType": "bar",
    "data": [
      { "label": "Jan", "value": 10 },
      { "label": "Feb", "value": 25 },
      { "label": "März", "value": 15 },
      { "label": "Apr", "value": 30 }
    ]
  }
}
```

</details>

| `createsDiagramKind` | FAIL | 0.36 | 93.7s | 117.9k | 245 | 3 | kind=diagram at benchmark/diagram-login-flow.md (192 chars) — 36% — 3/6 checks · missed: structural-shape, elements(skipped), quality(skipped) |

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
=== full body (192 chars) ===
---
kind: diagram
---
graph TD
    User --> Form[Login Form]
    Form --> Validate{Validate Credentials}
    Validate -- Success --> Dashboard[User Dashboard]
    Validate -- Failure --> Form

```

</details>

| `createsGraphKind` | OK | 1.00 | 246.8s | 119.6k | 424 | 3 | kind=graph at benchmark/graph-diamond.json (251 chars); judge: The candidate correctly implements the requested diamond graph structure. — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-of-kind` | stage | 1.00 | 1.00 | benchmark/graph-diamond.json |
| `body-not-empty` | stage | 0.50 | 0.50 |  |
| `structural-shape` | stage | 1.50 | 1.50 | must be JSON or YAML with top-level `nodes[]` and `edges[]` arrays |
| `elements` | counted | 4/4 | 1.00 | all 4 present |
| `quality` | judged | 2.00 | 2.00 | The candidate correctly implements the requested diamond graph structure. |

</details>

| `createsMindmapKind` | OK | 1.00 | 73.4s | 117.9k | 240 | 3 | kind=mindmap at benchmark/mindmap-languages.md (179 chars); judge: Candidate correctly implements the requested nested structure. — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-of-kind` | stage | 1.00 | 1.00 | benchmark/mindmap-languages.md |
| `body-not-empty` | stage | 0.50 | 0.50 |  |
| `structural-shape` | stage | 1.50 | 1.50 | must carry an `items[]` hierarchy (JSON/YAML) OR a nested markdown bullet list |
| `elements` | counted | 12/12 | 1.00 | all 12 present |
| `quality` | judged | 2.00 | 2.00 | Candidate correctly implements the requested nested structure. |

</details>

