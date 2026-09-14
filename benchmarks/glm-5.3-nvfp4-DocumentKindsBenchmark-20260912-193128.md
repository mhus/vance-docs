# Vance Benchmark - glm-5.3-nvfp4-DocumentKindsBenchmark-20260912-193128

- **Started:** 2026-09-12T19:31:28.381775Z
- **Judge:** glm-5.3-nvfp4
- **Score model:** v2-graded
- **Total tests:** 5
- **Passed:** 5 / 5 (100%)
- **Average score:** 1.000
- **Total LLM time:** 50.7s
- **Total tokens (in / out):** 1.16M / 10.7k (21 round-trips)


## document-kinds

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `createsApplicationKind` | OK | 1.00 | 16.4s | 345.1k | 3.5k | 6 | kind=application at benchmark/calendar-app/_app.yaml (495 chars); judge: Canonical Vance application manifest: $meta carries kind=application and app=calendar, and calendar.lanes is a map with correctly coloured design/backend/frontend lanes. — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-of-kind` | stage | 1.00 | 1.00 | benchmark/calendar-app/_app.yaml |
| `body-not-empty` | stage | 0.50 | 0.50 |  |
| `structural-shape` | stage | 1.50 | 1.50 | must be a YAML manifest with `kind: application` and an `app` discriminator |
| `elements` | counted | 8/8 | 1.00 | all 8 present |
| `quality` | judged | 2.00 | 2.00 | Canonical Vance application manifest: $meta carries kind=application and app=calendar, and calendar.lanes is a map with correctly coloured design/backend/frontend lanes. |

</details>

| `createsChartKind` | OK | 1.00 | 6.9s | 164.0k | 1.2k | 3 | kind=chart at benchmark/chart-sales.json (453 chars); judge: Valid JSON chart document with kind=chart, chartType bar, and all four correctly labelled data points Jan=10, Feb=25, Maerz=15, Apr=30. — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-of-kind` | stage | 1.00 | 1.00 | benchmark/chart-sales.json |
| `body-not-empty` | stage | 0.50 | 0.50 |  |
| `structural-shape` | stage | 1.50 | 1.50 | must be JSON or YAML with a top-level `chart.chartType` and a non-empty `series[]` array |
| `elements` | counted | 5/5 | 1.00 | all 5 present |
| `quality` | judged | 2.00 | 2.00 | Valid JSON chart document with kind=chart, chartType bar, and all four correctly labelled data points Jan=10, Feb=25, Maerz=15, Apr=30. |

</details>

| `createsDiagramKind` | OK | 1.00 | 13.4s | 216.7k | 3.1k | 4 | kind=diagram at benchmark/diagram-login-flow.md (103 chars); judge: Valid flowchart with User, Form (as Login Form), Validate, and Dashboard connected in the required order. — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-of-kind` | stage | 1.00 | 1.00 | benchmark/diagram-login-flow.md |
| `body-not-empty` | stage | 0.50 | 0.50 |  |
| `structural-shape` | stage | 1.50 | 1.50 | must contain a parseable Mermaid flowchart (either inside a ```mermaid fence in markdown, or as a `source` string in a JSON/YAML body) |
| `elements` | counted | 4/4 | 1.00 | all 4 present |
| `quality` | judged | 2.00 | 2.00 | Valid flowchart with User, Form (as Login Form), Validate, and Dashboard connected in the required order. |

</details>

| `createsGraphKind` | OK | 1.00 | 4.0s | 162.7k | 934 | 3 | kind=graph at benchmark/graph-diamond.json (341 chars); judge: Valid JSON graph document with kind=graph, all four nodes A-D and all four directed edges forming the exact diamond. — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-of-kind` | stage | 1.00 | 1.00 | benchmark/graph-diamond.json |
| `body-not-empty` | stage | 0.50 | 0.50 |  |
| `structural-shape` | stage | 1.50 | 1.50 | must be JSON or YAML with top-level `nodes[]` and `edges[]` arrays |
| `elements` | counted | 4/4 | 1.00 | all 4 present |
| `quality` | judged | 2.00 | 2.00 | Valid JSON graph document with kind=graph, all four nodes A-D and all four directed edges forming the exact diamond. |

</details>

| `createsMindmapKind` | OK | 1.00 | 10.0s | 272.3k | 1.9k | 5 | kind=mindmap at benchmark/mindmap-languages.md (164 chars); judge: Nested mindmap has root Programmiersprachen with all three branches and all nine language leaves present. — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-of-kind` | stage | 1.00 | 1.00 | benchmark/mindmap-languages.md |
| `body-not-empty` | stage | 0.50 | 0.50 |  |
| `structural-shape` | stage | 1.50 | 1.50 | must carry an `items[]` hierarchy (JSON/YAML) OR a nested markdown bullet list |
| `elements` | counted | 12/12 | 1.00 | all 12 present |
| `quality` | judged | 2.00 | 2.00 | Nested mindmap has root Programmiersprachen with all three branches and all nine language leaves present. |

</details>

