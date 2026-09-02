# Vance Benchmark - ollama-gemma4-31b-mlx-DocumentKindsBenchmark-20260816-092009

- **Started:** 2026-08-16T09:20:09.086081Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 5
- **Passed:** 2 / 5 (40%)
- **Average score:** 0.400
- **Total LLM time:** 290.9s
- **Total tokens (in / out):** 510.0k / 1.5k (14 round-trips)


## document-kinds

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `createsApplicationKind` | FAIL | 0.00 | 11.5s | 76.5k | 153 | 2 | no document of kind=application produced within 120s; kinds in project: [chart, text] |
| `createsChartKind` | FAIL | 0.00 | 107.6s | 154.5k | 507 | 4 | kind=chart at benchmark/chart-sales.json — body must be JSON or YAML with a top-level `chart.chartType` and a non-empty `series[]` array; structural miss: missing top-level `series[]` array — head: {   "$meta": {     "kind": "chart",     "title": "Sales Zahlen"   },   "chart": {     "chartType": "bar",     "data": [       {"label": "Jan", "value": 10},       {"label": "Feb", "value": 25},       … |

<details><summary>artifacts</summary>

```
=== full body (279 chars) ===
{
  "$meta": {
    "kind": "chart",
    "title": "Sales Zahlen"
  },
  "chart": {
    "chartType": "bar",
    "data": [
      {"label": "Jan", "value": 10},
      {"label": "Feb", "value": 25},
      {"label": "März", "value": 15},
      {"label": "Apr", "value": 30}
    ]
  }
}
```

</details>

| `createsDiagramKind` | FAIL | 0.00 | 18.8s | 115.2k | 267 | 3 | kind=diagram at benchmark/diagram-login-flow.md — body must contain a parseable Mermaid flowchart (either inside a ```mermaid fence in markdown, or as a `source` string in a JSON/YAML body); structural miss: parsed as JSON/YAML but no `source` string holds the Mermaid DSL — head: --- $meta:   kind: diagram --- graph TD     User --> Form[Login Form]     Form --> Validate{Validate Credentials}     Validate -- Success --> Dashboard[User Dashboard]     Validate -- Failure --> Form… |

<details><summary>artifacts</summary>

```
=== full body (201 chars) ===
---
$meta:
  kind: diagram
---
graph TD
    User --> Form[Login Form]
    Form --> Validate{Validate Credentials}
    Validate -- Success --> Dashboard[User Dashboard]
    Validate -- Failure --> Form

```

</details>

| `createsGraphKind` | OK | 1.00 | 31.9s | 48.5k | 274 | 2 | kind=graph at benchmark/graph-diamond.json (248 chars); judge: Candidate correctly implements the required diamond graph structure. |
| `createsMindmapKind` | OK | 1.00 | 121.0s | 115.3k | 258 | 3 | kind=mindmap at benchmark/mindmap-languages.md (194 chars); judge: The mindmap contains the correct root, branches, and leaves in the required nested structure. |
