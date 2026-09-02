# Vance Benchmark - ollama-qwen3.6-35b__smallv2-DocumentKindsBenchmark-20260822-002207

- **Started:** 2026-08-22T00:22:07.853355Z
- **Judge:** gemini-gemini-2.5-pro
- **Knobs:** {chatTimeoutS=600, waitBudgetMinS=300}
- **Score model:** v2-graded
- **Total tests:** 5
- **Passed:** 3 / 5 (60%)
- **Average score:** 0.686
- **Total LLM time:** 183.0s
- **Total tokens (in / out):** 1.47M / 5.3k (35 round-trips)


## document-kinds

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `createsApplicationKind` | FAIL | 0.14 | 42.4s | 162.5k | 630 | 4 | kind=application (0 chars) — 14% — 1/6 checks · missed: document-of-kind, body-not-empty(skipped), structural-shape(skipped), elements(skipped), quality(skipped) |

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

| `createsChartKind` | FAIL | 0.36 | 60.2s | 417.5k | 2.0k | 10 | kind=chart at benchmark/chart-sales.json (230 chars) — 36% — 3/6 checks · missed: structural-shape, elements(skipped), quality(skipped) |

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
=== full body (230 chars) ===
{
  "chart": {
    "title": "Sales-Zahlen",
    "chartType": "bar",
    "labels": ["Januar", "Februar", "März", "April"],
    "datasets": [
      {
        "label": "Umsatz",
        "values": [10, 25, 15, 30]
      }
    ]
  }
}

```

</details>

| `createsDiagramKind` | OK | 0.93 | 37.6s | 203.8k | 656 | 5 | kind=diagram at benchmark/diagram-login-flow.md (172 chars); judge: All required nodes are present and correctly connected in valid Mermaid syntax. — 93% — 5/6 checks · missed: elements(2/4) |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-of-kind` | stage | 1.00 | 1.00 | benchmark/diagram-login-flow.md |
| `body-not-empty` | stage | 0.50 | 0.50 |  |
| `structural-shape` | stage | 1.50 | 1.50 | must contain a parseable Mermaid flowchart (either inside a ```mermaid fence in markdown, or as a `source` string in a JSON/YAML body) |
| `elements` | counted | 2/4 | 1.00 | 2/4 (missing: Form, Validate) |
| `quality` | judged | 2.00 | 2.00 | All required nodes are present and correctly connected in valid Mermaid syntax. |

</details>

| `createsGraphKind` | OK | 1.00 | 8.2s | 121.3k | 424 | 3 | kind=graph at benchmark/graph-diamond.json (341 chars); judge: Candidate correctly implements the required diamond graph structure. — 100% — 6/6 checks |

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

| `createsMindmapKind` | OK | 1.00 | 34.6s | 568.5k | 1.6k | 13 | kind=mindmap at benchmark/mindmap-languages.md (408 chars); judge: Candidate correctly implements the required nested structure. — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-of-kind` | stage | 1.00 | 1.00 | benchmark/mindmap-languages.md |
| `body-not-empty` | stage | 0.50 | 0.50 |  |
| `structural-shape` | stage | 1.50 | 1.50 | must carry an `items[]` hierarchy (JSON/YAML) OR a nested markdown bullet list |
| `elements` | counted | 12/12 | 1.00 | all 12 present |
| `quality` | judged | 2.00 | 2.00 | Candidate correctly implements the required nested structure. |

</details>

