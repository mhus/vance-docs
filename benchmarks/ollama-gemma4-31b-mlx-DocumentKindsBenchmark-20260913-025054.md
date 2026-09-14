# Vance Benchmark - ollama-gemma4-31b-mlx-DocumentKindsBenchmark-20260913-025054

- **Started:** 2026-09-13T02:50:54.529567Z
- **Judge:** glm-5.3-nvfp4
- **Knobs:** {chatTimeoutS=480, waitBudgetMinS=240}
- **Score model:** v2-graded
- **Total tests:** 5
- **Passed:** 5 / 5 (100%)
- **Average score:** 0.966
- **Total LLM time:** 259.9s
- **Total tokens (in / out):** 835.7k / 1.7k (19 round-trips)


## document-kinds

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `createsApplicationKind` | OK | 0.83 | 17.6s | 85.7k | 148 | 2 | kind=application at benchmark/calendar-app/_app.yaml (155 chars); judge: $meta is correct, but lanes are a top-level list instead of a map under a calendar: block, so all three lanes count as missing (1.0 - 0.6). — 83% — 5/6 checks · missed: quality |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-of-kind` | stage | 1.00 | 1.00 | benchmark/calendar-app/_app.yaml |
| `body-not-empty` | stage | 0.50 | 0.50 |  |
| `structural-shape` | stage | 1.50 | 1.50 | must be a YAML manifest with `kind: application` and an `app` discriminator |
| `elements` | counted | 8/8 | 1.00 | all 8 present |
| `quality` | judged | 0.80 | 2.00 | $meta is correct, but lanes are a top-level list instead of a map under a calendar: block, so all three lanes count as missing (1.0 - 0.6). |

</details>

| `createsChartKind` | OK | 1.00 | 136.5s | 178.1k | 452 | 4 | kind=chart at benchmark/chart-sales.json (361 chars); judge: Valid JSON chart with chartType bar and all four correctly labelled data points Jan=10, Feb=25, Maerz=15, Apr=30. — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-of-kind` | stage | 1.00 | 1.00 | benchmark/chart-sales.json |
| `body-not-empty` | stage | 0.50 | 0.50 |  |
| `structural-shape` | stage | 1.50 | 1.50 | must be JSON or YAML with a top-level `chart.chartType` and a non-empty `series[]` array |
| `elements` | counted | 5/5 | 1.00 | all 5 present |
| `quality` | judged | 2.00 | 2.00 | Valid JSON chart with chartType bar and all four correctly labelled data points Jan=10, Feb=25, Maerz=15, Apr=30. |

</details>

| `createsDiagramKind` | OK | 1.00 | 40.3s | 264.8k | 408 | 6 | kind=diagram at benchmark/diagram-login-flow.yaml (166 chars); judge: All four required nodes (User, Form, Validate, Dashboard) are connected in order with valid, parseable flowchart syntax. — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-of-kind` | stage | 1.00 | 1.00 | benchmark/diagram-login-flow.yaml |
| `body-not-empty` | stage | 0.50 | 0.50 |  |
| `structural-shape` | stage | 1.50 | 1.50 | must contain a parseable Mermaid flowchart (either inside a ```mermaid fence in markdown, or as a `source` string in a JSON/YAML body) |
| `elements` | counted | 4/4 | 1.00 | all 4 present |
| `quality` | judged | 2.00 | 2.00 | All four required nodes (User, Form, Validate, Dashboard) are connected in order with valid, parseable flowchart syntax. |

</details>

| `createsGraphKind` | OK | 1.00 | 19.1s | 85.8k | 248 | 2 | kind=graph at benchmark/graph-diamond.json (340 chars); judge: JSON graph contains all four nodes and the exact four directed edges forming the diamond A-B/A-C to D. — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-of-kind` | stage | 1.00 | 1.00 | benchmark/graph-diamond.json |
| `body-not-empty` | stage | 0.50 | 0.50 |  |
| `structural-shape` | stage | 1.50 | 1.50 | must be JSON or YAML with top-level `nodes[]` and `edges[]` arrays |
| `elements` | counted | 4/4 | 1.00 | all 4 present |
| `quality` | judged | 2.00 | 2.00 | JSON graph contains all four nodes and the exact four directed edges forming the diamond A-B/A-C to D. |

</details>

| `createsMindmapKind` | OK | 1.00 | 46.4s | 221.5k | 435 | 5 | kind=mindmap at benchmark/mindmap-languages.md (407 chars); judge: YAML mindmap has root Programmiersprachen with all three branches (Compiled, Interpreted, JVM) and all nine language leaves. — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-of-kind` | stage | 1.00 | 1.00 | benchmark/mindmap-languages.md |
| `body-not-empty` | stage | 0.50 | 0.50 |  |
| `structural-shape` | stage | 1.50 | 1.50 | must carry an `items[]` hierarchy (JSON/YAML) OR a nested markdown bullet list |
| `elements` | counted | 12/12 | 1.00 | all 12 present |
| `quality` | judged | 2.00 | 2.00 | YAML mindmap has root Programmiersprachen with all three branches (Compiled, Interpreted, JVM) and all nine language leaves. |

</details>

