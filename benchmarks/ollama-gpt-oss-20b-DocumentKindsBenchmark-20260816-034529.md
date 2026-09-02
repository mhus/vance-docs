# Vance Benchmark - ollama-gpt-oss-20b-DocumentKindsBenchmark-20260816-034529

- **Started:** 2026-08-16T03:45:29.253946Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 5
- **Passed:** 2 / 5 (40%)
- **Average score:** 0.400
- **Total LLM time:** 129.3s
- **Total tokens (in / out):** 830.8k / 9.0k (25 round-trips)


## document-kinds

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `createsApplicationKind` | FAIL | 0.00 | 9.4s | 132.0k | 565 | 4 | no document of kind=application produced within 120s; kinds in project: [chart, text] |
| `createsChartKind` | FAIL | 0.00 | 24.5s | 132.8k | 1.8k | 4 | kind=chart at benchmark/chart-sales.json — body must be JSON or YAML with a top-level `chart.chartType` and a non-empty `series[]` array; structural miss: missing top-level `series[]` array — head: {   "chart": {     "chartType": "bar",     "data": {       "labels": ["Jan", "Feb", "März", "Apr"],       "datasets": [         {           "label": "Sales",           "data": [10, 25, 15, 30],       … |

<details><summary>artifacts</summary>

```
=== full body (432 chars) ===
{
  "chart": {
    "chartType": "bar",
    "data": {
      "labels": ["Jan", "Feb", "März", "Apr"],
      "datasets": [
        {
          "label": "Sales",
          "data": [10, 25, 15, 30],
          "backgroundColor": ["#4e73df", "#1cc88a", "#36b9cc", "#f6c23e"]
        }
      ]
    },
    "options": {
      "responsive": true,
      "title": {
        "display": true,
        "text": "Sales per Month"
      }
    }
  }
}

```

</details>

| `createsDiagramKind` | FAIL | 0.00 | 54.7s | 268.0k | 4.1k | 8 | kind=diagram at benchmark/diagram-login-flow.md — body must contain a parseable Mermaid flowchart (either inside a ```mermaid fence in markdown, or as a `source` string in a JSON/YAML body); structural miss: parsed as JSON/YAML but no `source` string holds the Mermaid DSL — head: --- $meta:   kind: diagram   title: Login Flow Diagram --- flowchart TD     User((User)) --> Form[Login Form]     Form --> Validate{Validate Credentials}     Validate -- Success --> Dashboard((Dashboa… |

<details><summary>artifacts</summary>

```
=== full body (238 chars) ===
---
$meta:
  kind: diagram
  title: Login Flow Diagram
---
flowchart TD
    User((User)) --> Form[Login Form]
    Form --> Validate{Validate Credentials}
    Validate -- Success --> Dashboard((Dashboard))
    Validate -- Failure --> Form

```

</details>

| `createsGraphKind` | OK | 1.00 | 12.2s | 132.2k | 609 | 4 | kind=graph at benchmark/graph-diamond.json (325 chars); judge: Candidate correctly implements the required diamond graph structure. |
| `createsMindmapKind` | OK | 1.00 | 28.4s | 165.8k | 2.0k | 5 | kind=mindmap at benchmark/mindmap-languages.md (319 chars); judge: Candidate correctly implements the required nested structure. |
