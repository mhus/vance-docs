# Vance Benchmark - ollama-muse-glimmer-30b-mlx-DocumentKindsBenchmark-20260913-063936

- **Started:** 2026-09-13T06:39:36.713177Z
- **Judge:** glm-5.3-nvfp4
- **Knobs:** {chatTimeoutS=480, waitBudgetMinS=240}
- **Score model:** v2-graded
- **Total tests:** 5
- **Passed:** 5 / 5 (100%)
- **Average score:** 1.000
- **Total LLM time:** 443.6s
- **Total tokens (in / out):** 1.17M / 5.0k (26 round-trips)


## document-kinds

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `createsApplicationKind` | OK | 1.00 | 39.9s | 229.1k | 976 | 5 | kind=application at benchmark/calendar-app/_app.yaml (456 chars); judge: Canonical Vance app manifest: $meta carries kind=application and app=calendar, and calendar.lanes is a map with correctly coloured design/blue, backend/green, frontend/purple lanes. — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-of-kind` | stage | 1.00 | 1.00 | benchmark/calendar-app/_app.yaml |
| `body-not-empty` | stage | 0.50 | 0.50 |  |
| `structural-shape` | stage | 1.50 | 1.50 | must be a YAML manifest with `kind: application` and an `app` discriminator |
| `elements` | counted | 8/8 | 1.00 | all 8 present |
| `quality` | judged | 2.00 | 2.00 | Canonical Vance app manifest: $meta carries kind=application and app=calendar, and calendar.lanes is a map with correctly coloured design/blue, backend/green, frontend/purple lanes. |

</details>

| `createsChartKind` | OK | 1.00 | 74.1s | 138.6k | 731 | 3 | kind=chart at benchmark/chart-sales.json (433 chars); judge: Valid JSON chart document with kind=chart, chartType bar, and all four correctly labelled data points Jan=10, Feb=25, Maerz=15, Apr=30. — 100% — 6/6 checks |

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

| `createsDiagramKind` | OK | 1.00 | 39.2s | 55.9k | 674 | 2 | kind=diagram at benchmark/diagram-login-flow.md (134 chars); judge: All required nodes (User, Form, Validate, Dashboard) are connected in order with valid, parseable flowchart syntax. — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-of-kind` | stage | 1.00 | 1.00 | benchmark/diagram-login-flow.md |
| `body-not-empty` | stage | 0.50 | 0.50 |  |
| `structural-shape` | stage | 1.50 | 1.50 | must contain a parseable Mermaid flowchart (either inside a ```mermaid fence in markdown, or as a `source` string in a JSON/YAML body) |
| `elements` | counted | 4/4 | 1.00 | all 4 present |
| `quality` | judged | 2.00 | 2.00 | All required nodes (User, Form, Validate, Dashboard) are connected in order with valid, parseable flowchart syntax. |

</details>

| `createsGraphKind` | OK | 1.00 | 48.8s | 137.3k | 871 | 3 | kind=graph at benchmark/graph-diamond.json (276 chars); judge: Valid JSON graph document with kind=graph, all four nodes A-D and the exact four directed diamond edges. — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-of-kind` | stage | 1.00 | 1.00 | benchmark/graph-diamond.json |
| `body-not-empty` | stage | 0.50 | 0.50 |  |
| `structural-shape` | stage | 1.50 | 1.50 | must be JSON or YAML with top-level `nodes[]` and `edges[]` arrays |
| `elements` | counted | 4/4 | 1.00 | all 4 present |
| `quality` | judged | 2.00 | 2.00 | Valid JSON graph document with kind=graph, all four nodes A-D and the exact four directed diamond edges. |

</details>

| `createsMindmapKind` | OK | 1.00 | 241.6s | 605.5k | 1.8k | 13 | kind=mindmap at benchmark/mindmap-languages.md (358 chars); judge: YAML mindmap has root Programmiersprachen with all three branches (Compiled, Interpreted, JVM) and all nine language leaves nested correctly. — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-of-kind` | stage | 1.00 | 1.00 | benchmark/mindmap-languages.md |
| `body-not-empty` | stage | 0.50 | 0.50 |  |
| `structural-shape` | stage | 1.50 | 1.50 | must carry an `items[]` hierarchy (JSON/YAML) OR a nested markdown bullet list |
| `elements` | counted | 12/12 | 1.00 | all 12 present |
| `quality` | judged | 2.00 | 2.00 | YAML mindmap has root Programmiersprachen with all three branches (Compiled, Interpreted, JVM) and all nine language leaves nested correctly. |

</details>

