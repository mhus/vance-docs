# Vance Benchmark - ollama-gpt-oss-20b-DocumentKindsBenchmark-20260912-221157

- **Started:** 2026-09-12T22:11:57.887816Z
- **Judge:** glm-5.3-nvfp4
- **Knobs:** {chatTimeoutS=480, waitBudgetMinS=240}
- **Score model:** v2-graded
- **Total tests:** 5
- **Passed:** 2 / 5 (40%)
- **Average score:** 0.571
- **Total LLM time:** 463.0s
- **Total tokens (in / out):** 1.63M / 20.9k (43 round-trips)


## document-kinds

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `createsApplicationKind` | FAIL | 0.14 | 19.8s | 149.0k | 986 | 4 | kind=application (0 chars) — 14% — 1/6 checks · missed: document-of-kind, body-not-empty(skipped), structural-shape(skipped), elements(skipped), quality(skipped) |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-of-kind` | stage | 0.00 | 1.00 | nothing of kind=application within 240s; kinds in project: [chart, text] |
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

| `createsChartKind` | FAIL | 0.36 | 195.4s | 529.5k | 11.3k | 13 | kind=chart at benchmark/chart-min.json (59 chars) — 36% — 3/6 checks · missed: structural-shape, elements(skipped), quality(skipped) |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-of-kind` | stage | 1.00 | 1.00 | benchmark/chart-min.json |
| `body-not-empty` | stage | 0.50 | 0.50 |  |
| `structural-shape` | stage | 0.00 | 1.50 | body must be JSON or YAML with a top-level `chart.chartType` and a non-empty `series[]` array; miss: missing top-level `series[]` array |
| `elements` | counted | skipped | 1.00 | chain stopped earlier |
| `quality` | judged | skipped | 2.00 | chain stopped earlier |

</details>


<details><summary>artifacts</summary>

```
=== full body (59 chars) ===
$meta:
  kind: chart
chart:
  chartType: bar
  title: Test

```

</details>

| `createsDiagramKind` | FAIL | 0.36 | 27.8s | 224.7k | 1.9k | 6 | kind=diagram at benchmark/diagram-login-flow.md (194 chars) — 36% — 3/6 checks · missed: structural-shape, elements(skipped), quality(skipped) |

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
=== full body (194 chars) ===
$meta:
  kind: diagram

diagram: |
  flowchart TD
    User(User)
    Form[Form]
    Validate(Validate)
    Dashboard[Dashboard]
    User --> Form
    Form --> Validate
    Validate --> Dashboard
```

</details>

| `createsGraphKind` | OK | 1.00 | 18.0s | 149.5k | 1.2k | 4 | kind=graph at benchmark/graph-diamond.json (393 chars); judge: Valid JSON graph with all 4 nodes and the exact 4 directed diamond edges. — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-of-kind` | stage | 1.00 | 1.00 | benchmark/graph-diamond.json |
| `body-not-empty` | stage | 0.50 | 0.50 |  |
| `structural-shape` | stage | 1.50 | 1.50 | must be JSON or YAML with top-level `nodes[]` and `edges[]` arrays |
| `elements` | counted | 4/4 | 1.00 | all 4 present |
| `quality` | judged | 2.00 | 2.00 | Valid JSON graph with all 4 nodes and the exact 4 directed diamond edges. |

</details>

| `createsMindmapKind` | OK | 1.00 | 202.0s | 578.4k | 5.5k | 16 | kind=mindmap at benchmark/mindmap-languages.md (165 chars); judge: Full nested mindmap structure present: root with Compiled, Interpreted, and JVM branches each containing all required language leaves. — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-of-kind` | stage | 1.00 | 1.00 | benchmark/mindmap-languages.md |
| `body-not-empty` | stage | 0.50 | 0.50 |  |
| `structural-shape` | stage | 1.50 | 1.50 | must carry an `items[]` hierarchy (JSON/YAML) OR a nested markdown bullet list |
| `elements` | counted | 12/12 | 1.00 | all 12 present |
| `quality` | judged | 2.00 | 2.00 | Full nested mindmap structure present: root with Compiled, Interpreted, and JVM branches each containing all required language leaves. |

</details>

