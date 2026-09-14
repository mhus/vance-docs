# Vance Benchmark - ollama-laguna-s-2.1-nvfp4-DocumentKindsBenchmark-20260913-214102

- **Started:** 2026-09-13T21:41:02.329548Z
- **Judge:** glm-5.3-nvfp4
- **Knobs:** {chatTimeoutS=480, waitBudgetMinS=240}
- **Score model:** v2-graded
- **Total tests:** 5
- **Passed:** 5 / 5 (100%)
- **Average score:** 1.000
- **Total LLM time:** 206.1s
- **Total tokens (in / out):** 1.48M / 4.0k (26 round-trips)


## document-kinds

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `createsApplicationKind` | OK | 1.00 | 49.6s | 239.7k | 1.1k | 4 | kind=application at benchmark/calendar-app/_app.yaml (749 chars); judge: Manifest has $meta with kind=application and app=calendar, and a calendar block with a lanes map containing design/blue, backend/green, frontend/purple. — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-of-kind` | stage | 1.00 | 1.00 | benchmark/calendar-app/_app.yaml |
| `body-not-empty` | stage | 0.50 | 0.50 |  |
| `structural-shape` | stage | 1.50 | 1.50 | must be a YAML manifest with `kind: application` and an `app` discriminator |
| `elements` | counted | 8/8 | 1.00 | all 8 present |
| `quality` | judged | 2.00 | 2.00 | Manifest has $meta with kind=application and app=calendar, and a calendar block with a lanes map containing design/blue, backend/green, frontend/purple. |

</details>

| `createsChartKind` | OK | 1.00 | 76.8s | 225.6k | 565 | 4 | kind=chart at benchmark/chart-sales.json (486 chars); judge: JSON chart document with kind=chart, chartType bar, and all four correctly labelled data points Jan=10, Feb=25, Maerz=15, Apr=30. — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-of-kind` | stage | 1.00 | 1.00 | benchmark/chart-sales.json |
| `body-not-empty` | stage | 0.50 | 0.50 |  |
| `structural-shape` | stage | 1.50 | 1.50 | must be JSON or YAML with a top-level `chart.chartType` and a non-empty `series[]` array |
| `elements` | counted | 5/5 | 1.00 | all 5 present |
| `quality` | judged | 2.00 | 2.00 | JSON chart document with kind=chart, chartType bar, and all four correctly labelled data points Jan=10, Feb=25, Maerz=15, Apr=30. |

</details>

| `createsDiagramKind` | OK | 1.00 | 22.6s | 275.6k | 710 | 5 | kind=diagram at benchmark/diagram-login-flow.md (142 chars); judge: All four required nodes appear in the correct order (User -> Form -> Validate -> Dashboard) with a valid, parseable flowchart declaration and well-formed edge lines. — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-of-kind` | stage | 1.00 | 1.00 | benchmark/diagram-login-flow.md |
| `body-not-empty` | stage | 0.50 | 0.50 |  |
| `structural-shape` | stage | 1.50 | 1.50 | must contain a parseable Mermaid flowchart (either inside a ```mermaid fence in markdown, or as a `source` string in a JSON/YAML body) |
| `elements` | counted | 4/4 | 1.00 | all 4 present |
| `quality` | judged | 2.00 | 2.00 | All four required nodes appear in the correct order (User -> Form -> Validate -> Dashboard) with a valid, parseable flowchart declaration and well-formed edge lines. |

</details>

| `createsGraphKind` | OK | 1.00 | 17.5s | 163.0k | 649 | 3 | kind=graph at benchmark/graph-diamond.json (362 chars); judge: JSON graph with kind=graph, all 4 nodes and the exact 4 directed diamond edges present. — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-of-kind` | stage | 1.00 | 1.00 | benchmark/graph-diamond.json |
| `body-not-empty` | stage | 0.50 | 0.50 |  |
| `structural-shape` | stage | 1.50 | 1.50 | must be JSON or YAML with top-level `nodes[]` and `edges[]` arrays |
| `elements` | counted | 4/4 | 1.00 | all 4 present |
| `quality` | judged | 2.00 | 2.00 | JSON graph with kind=graph, all 4 nodes and the exact 4 directed diamond edges present. |

</details>

| `createsMindmapKind` | OK | 1.00 | 39.6s | 578.8k | 989 | 10 | kind=mindmap at benchmark/mindmap-languages.md (194 chars); judge: YAML mindmap with root Programmiersprachen and all three branches (Compiled, Interpreted, JVM) each containing the correct nested language leaves. — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-of-kind` | stage | 1.00 | 1.00 | benchmark/mindmap-languages.md |
| `body-not-empty` | stage | 0.50 | 0.50 |  |
| `structural-shape` | stage | 1.50 | 1.50 | must carry an `items[]` hierarchy (JSON/YAML) OR a nested markdown bullet list |
| `elements` | counted | 12/12 | 1.00 | all 12 present |
| `quality` | judged | 2.00 | 2.00 | YAML mindmap with root Programmiersprachen and all three branches (Compiled, Interpreted, JVM) each containing the correct nested language leaves. |

</details>

