# Vance Benchmark - ollama-qwen3.6-35b-DocumentKindsBenchmark-20260913-090956

- **Started:** 2026-09-13T09:09:56.053522Z
- **Judge:** glm-5.3-nvfp4
- **Knobs:** {chatTimeoutS=480, waitBudgetMinS=240}
- **Score model:** v2-graded
- **Total tests:** 5
- **Passed:** 4 / 5 (80%)
- **Average score:** 0.934
- **Total LLM time:** 105.9s
- **Total tokens (in / out):** 1.37M / 4.2k (30 round-trips)


## document-kinds

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `createsApplicationKind` | FAIL | 0.74 | 8.1s | 177.0k | 406 | 4 | kind=application at benchmark/calendar-app/_app.yaml (171 chars); judge: No calendar block, lanes as a list instead of a map, and app sits at top level instead of under $meta. — 74% — 5/6 checks · missed: quality |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-of-kind` | stage | 1.00 | 1.00 | benchmark/calendar-app/_app.yaml |
| `body-not-empty` | stage | 0.50 | 0.50 |  |
| `structural-shape` | stage | 1.50 | 1.50 | must be a YAML manifest with `kind: application` and an `app` discriminator |
| `elements` | counted | 8/8 | 1.00 | all 8 present |
| `quality` | judged | 0.20 | 2.00 | No calendar block, lanes as a list instead of a map, and app sits at top level instead of under $meta. |

</details>


<details><summary>artifacts</summary>

```
=== full body (171 chars) ===
$meta:
  name: _app.yaml
  kind: application
app: calendar
lanes:
  - name: design
    color: blue
  - name: backend
    color: green
  - name: frontend
    color: purple

```

</details>

| `createsChartKind` | OK | 1.00 | 41.2s | 230.1k | 663 | 5 | kind=chart at benchmark/chart-sales.json (371 chars); judge: JSON chart document with kind=chart, chartType bar, and all four data points Jan=10, Feb=25, Maerz(Maer)=15, Apr=30 correctly labelled. — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-of-kind` | stage | 1.00 | 1.00 | benchmark/chart-sales.json |
| `body-not-empty` | stage | 0.50 | 0.50 |  |
| `structural-shape` | stage | 1.50 | 1.50 | must be JSON or YAML with a top-level `chart.chartType` and a non-empty `series[]` array |
| `elements` | counted | 5/5 | 1.00 | all 5 present |
| `quality` | judged | 2.00 | 2.00 | JSON chart document with kind=chart, chartType bar, and all four data points Jan=10, Feb=25, Maerz(Maer)=15, Apr=30 correctly labelled. |

</details>

| `createsDiagramKind` | OK | 0.93 | 25.7s | 415.3k | 1.5k | 9 | kind=diagram at benchmark/diagram-login-flow.md (138 chars); judge: All four required nodes appear in the correct order (Form and Validate rendered as German labels Login-Formular and Validierung) and the flowchart syntax is well-formed. — 93% — 5/6 checks · missed: elements(2/4) |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-of-kind` | stage | 1.00 | 1.00 | benchmark/diagram-login-flow.md |
| `body-not-empty` | stage | 0.50 | 0.50 |  |
| `structural-shape` | stage | 1.50 | 1.50 | must contain a parseable Mermaid flowchart (either inside a ```mermaid fence in markdown, or as a `source` string in a JSON/YAML body) |
| `elements` | counted | 2/4 | 1.00 | 2/4 (missing: Form, Validate) |
| `quality` | judged | 2.00 | 2.00 | All four required nodes appear in the correct order (Form and Validate rendered as German labels Login-Formular and Validierung) and the flowchart syntax is well-formed. |

</details>

| `createsGraphKind` | OK | 1.00 | 9.4s | 177.2k | 526 | 4 | kind=graph at benchmark/graph-diamond.json (341 chars); judge: JSON graph contains all four nodes A-D and the four directed edges forming the exact diamond shape. — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-of-kind` | stage | 1.00 | 1.00 | benchmark/graph-diamond.json |
| `body-not-empty` | stage | 0.50 | 0.50 |  |
| `structural-shape` | stage | 1.50 | 1.50 | must be JSON or YAML with top-level `nodes[]` and `edges[]` arrays |
| `elements` | counted | 4/4 | 1.00 | all 4 present |
| `quality` | judged | 2.00 | 2.00 | JSON graph contains all four nodes A-D and the four directed edges forming the exact diamond shape. |

</details>

| `createsMindmapKind` | OK | 1.00 | 21.4s | 367.2k | 1.1k | 8 | kind=mindmap at benchmark/mindmap-languages.md (326 chars); judge: YAML mindmap with root Programmiersprachen and all three branches (Compiled, Interpreted, JVM) each containing the correct language leaves. — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-of-kind` | stage | 1.00 | 1.00 | benchmark/mindmap-languages.md |
| `body-not-empty` | stage | 0.50 | 0.50 |  |
| `structural-shape` | stage | 1.50 | 1.50 | must carry an `items[]` hierarchy (JSON/YAML) OR a nested markdown bullet list |
| `elements` | counted | 12/12 | 1.00 | all 12 present |
| `quality` | judged | 2.00 | 2.00 | YAML mindmap with root Programmiersprachen and all three branches (Compiled, Interpreted, JVM) each containing the correct language leaves. |

</details>

