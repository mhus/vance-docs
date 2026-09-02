# Vance Benchmark - ollama-gpt-oss-20b__smallv2-DocumentKindsBenchmark-20260822-050535

- **Started:** 2026-08-22T05:05:35.641179Z
- **Judge:** gemini-gemini-2.5-pro
- **Knobs:** {chatTimeoutS=600, waitBudgetMinS=300}
- **Score model:** v2-graded
- **Total tests:** 5
- **Passed:** 4 / 5 (80%)
- **Average score:** 0.843
- **Total LLM time:** 140.7s
- **Total tokens (in / out):** 1.08M / 8.6k (31 round-trips)


## document-kinds

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `createsApplicationKind` | OK | 0.86 | 12.0s | 101.2k | 625 | 3 | kind=application at benchmark/calendar-app/_app.yaml (141 chars); judge: The 'lanes' field must be a map, not a list. — 86% — 5/6 checks · missed: quality |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-of-kind` | stage | 1.00 | 1.00 | benchmark/calendar-app/_app.yaml |
| `body-not-empty` | stage | 0.50 | 0.50 |  |
| `structural-shape` | stage | 1.50 | 1.50 | must be a YAML manifest with `kind: application` and an `app` discriminator |
| `elements` | counted | 8/8 | 1.00 | all 8 present |
| `quality` | judged | 1.00 | 2.00 | The 'lanes' field must be a map, not a list. |

</details>

| `createsChartKind` | OK | 1.00 | 80.2s | 570.3k | 4.9k | 16 | kind=chart at benchmark/chart-sales.json (268 chars); judge: All required data points are present and correct. — 100% — 6/6 checks |

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

| `createsDiagramKind` | FAIL | 0.36 | 21.5s | 204.7k | 1.3k | 6 | kind=diagram at benchmark/diagram-login-flow.md (199 chars) — 36% — 3/6 checks · missed: structural-shape, elements(skipped), quality(skipped) |

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
=== full body (199 chars) ===
$meta:
  kind: diagram
  title: Simple Login Flow
$diagram: |
  graph TD
    User("User") --> Form("Login Form")
    Form --> Validate("Validate Credentials")
    Validate --> Dashboard("Dashboard")

```

</details>

| `createsGraphKind` | OK | 1.00 | 9.2s | 67.3k | 640 | 2 | kind=graph at benchmark/graph-diamond.json (325 chars); judge: Candidate correctly represents the required diamond graph. — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-of-kind` | stage | 1.00 | 1.00 | benchmark/graph-diamond.json |
| `body-not-empty` | stage | 0.50 | 0.50 |  |
| `structural-shape` | stage | 1.50 | 1.50 | must be JSON or YAML with top-level `nodes[]` and `edges[]` arrays |
| `elements` | counted | 4/4 | 1.00 | all 4 present |
| `quality` | judged | 2.00 | 2.00 | Candidate correctly represents the required diamond graph. |

</details>

| `createsMindmapKind` | OK | 1.00 | 17.8s | 135.5k | 1.2k | 4 | kind=mindmap at benchmark/mindmap-languages.md (256 chars); judge: Candidate correctly implements the required nested structure. — 100% — 6/6 checks |

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

