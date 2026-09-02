# Vance Benchmark - ollama-gpt-oss-20b-DocumentKindsBenchmark-20260816-151428

- **Started:** 2026-08-16T15:14:28.757703Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 5
- **Passed:** 2 / 5 (40%)
- **Average score:** 0.400
- **Total LLM time:** 106.3s
- **Total tokens (in / out):** 829.3k / 7.7k (25 round-trips)


## document-kinds

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `createsApplicationKind` | FAIL | 0.00 | 14.7s | 131.8k | 1.0k | 4 | no document of kind=application produced within 120s; kinds in project: [chart, text] |
| `createsChartKind` | FAIL | 0.00 | 33.3s | 199.7k | 2.4k | 6 | kind=chart at benchmark/chart-sales.json — body must be JSON or YAML with a top-level `chart.chartType` and a non-empty `series[]` array; structural miss: missing top-level `series[]` array — head: {   "chart": {     "chartType": "bar",     "data": {       "labels": ["Jan", "Feb", "März", "Apr"],       "datasets": [         {           "label": "Sales",           "data": [10, 25, 15, 30]        … |

<details><summary>artifacts</summary>

```
=== full body (222 chars) ===
{
  "chart": {
    "chartType": "bar",
    "data": {
      "labels": ["Jan", "Feb", "März", "Apr"],
      "datasets": [
        {
          "label": "Sales",
          "data": [10, 25, 15, 30]
        }
      ]
    }
  }
}
```

</details>

| `createsDiagramKind` | FAIL | 0.00 | 32.2s | 199.7k | 2.6k | 6 | kind=diagram at benchmark/diagram-login-flow.md — body must contain a parseable Mermaid flowchart (either inside a ```mermaid fence in markdown, or as a `source` string in a JSON/YAML body); structural miss: parsed as JSON/YAML but no `source` string holds the Mermaid DSL — head: --- title: Login Flow --- flowchart TD     User("User") --> Form("Login Form")     Form --> Validate("Validate Credentials")     Validate --> Dashboard("Dashboard") |

<details><summary>artifacts</summary>

```
=== full body (164 chars) ===
---
title: Login Flow
---
flowchart TD
    User("User") --> Form("Login Form")
    Form --> Validate("Validate Credentials")
    Validate --> Dashboard("Dashboard")
```

</details>

| `createsGraphKind` | OK | 1.00 | 13.7s | 132.2k | 935 | 4 | kind=graph at benchmark/graph-diamond.json (305 chars); judge: The candidate correctly implements the required diamond graph structure. |
| `createsMindmapKind` | OK | 1.00 | 12.4s | 165.9k | 741 | 5 | kind=mindmap at benchmark/mindmap-languages.md (362 chars); judge: Candidate correctly implements the required nested structure. |
