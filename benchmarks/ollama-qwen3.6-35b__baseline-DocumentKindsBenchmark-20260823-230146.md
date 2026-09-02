# Vance Benchmark - ollama-qwen3.6-35b__baseline-DocumentKindsBenchmark-20260823-230146

- **Started:** 2026-08-23T23:01:46.753385Z
- **Judge:** gemini-gemini-2.5-pro
- **Knobs:** {chatTimeoutS=600, waitBudgetMinS=300}
- **Score model:** v2-graded
- **Total tests:** 5
- **Passed:** 2 / 5 (40%)
- **Average score:** 0.566
- **Total LLM time:** 144.8s
- **Total tokens (in / out):** 1.04M / 3.3k (25 round-trips)


## document-kinds

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `createsApplicationKind` | FAIL | 0.14 | 38.6s | 163.2k | 437 | 4 | kind=application (0 chars) — 14% — 1/6 checks · missed: document-of-kind, body-not-empty(skipped), structural-shape(skipped), elements(skipped), quality(skipped) |

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

| `createsChartKind` | OK | 0.97 | 41.7s | 254.7k | 939 | 6 | kind=chart at benchmark/chart-sales.json (399 chars); judge: All required data points are present and correctly labelled. — 97% — 5/6 checks · missed: elements(4/5) |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-of-kind` | stage | 1.00 | 1.00 | benchmark/chart-sales.json |
| `body-not-empty` | stage | 0.50 | 0.50 |  |
| `structural-shape` | stage | 1.50 | 1.50 | must be JSON or YAML with a top-level `chart.chartType` and a non-empty `series[]` array |
| `elements` | counted | 4/5 | 1.00 | 4/5 (missing: März) |
| `quality` | judged | 2.00 | 2.00 | All required data points are present and correctly labelled. |

</details>

| `createsDiagramKind` | FAIL | 0.36 | 43.7s | 292.0k | 882 | 7 | kind=diagram at benchmark/diagram-login-flow.md (123 chars) — 36% — 3/6 checks · missed: structural-shape, elements(skipped), quality(skipped) |

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
=== full body (123 chars) ===
flowchart TD
    A[User] --> B[Login-Formular]
    B --> C{Validierung}
    C -->|Fehler| B
    C -->|Erfolg| D[Dashboard]

```

</details>

| `createsGraphKind` | OK | 1.00 | 8.8s | 121.9k | 457 | 3 | kind=graph at benchmark/graph-diamond.json (393 chars); judge: Candidate correctly implements the required diamond graph structure. — 100% — 6/6 checks |

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

| `createsMindmapKind` | FAIL | 0.36 | 11.9s | 204.9k | 627 | 5 | kind=mindmap at benchmark/mindmap-languages.md (127 chars) — 36% — 3/6 checks · missed: structural-shape, elements(skipped), quality(skipped) |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-of-kind` | stage | 1.00 | 1.00 | benchmark/mindmap-languages.md |
| `body-not-empty` | stage | 0.50 | 0.50 |  |
| `structural-shape` | stage | 0.00 | 1.50 | body must carry an `items[]` hierarchy (JSON/YAML) OR a nested markdown bullet list; miss: no recognisable hierarchy form (items[], bullets, tree-drawing, numbered list, or header outline) |
| `elements` | counted | skipped | 1.00 | chain stopped earlier |
| `quality` | judged | skipped | 2.00 | chain stopped earlier |

</details>


<details><summary>artifacts</summary>

```
=== full body (127 chars) ===
title: Programmiersprachen

Compiled:
  C
  Rust
  Go

Interpreted:
  Python
  Ruby
  JavaScript

JVM:
  Java
  Kotlin
  Scala

```

</details>

