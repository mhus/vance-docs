# Vance Benchmark - ollama-gpt-oss-20b-MermaidVarietyBenchmark-20260912-225453

- **Started:** 2026-09-12T22:54:53.853876Z
- **Judge:** glm-5.3-nvfp4
- **Knobs:** {chatTimeoutS=480, waitBudgetMinS=240}
- **Score model:** v2-graded
- **Total tests:** 9
- **Passed:** 5 / 9 (56%)
- **Average score:** 0.759
- **Total LLM time:** 1900.5s
- **Total tokens (in / out):** 6.14M / 111.7k (154 round-trips)


## mermaid-variety

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `emitsC4ContextDiagram` | OK | 1.00 | 288.2s | 820.5k | 18.9k | 20 | opener=C4Context at benchmark/mermaid/c4-notifications.md (519 chars) — 100% — 7/7 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-at-path` | stage | 1.00 | 1.00 | benchmark/mermaid/c4-notifications.md |
| `kind-diagram` | stage | 1.00 | 1.00 |  |
| `body-not-empty` | stage | 0.50 | 0.50 |  |
| `mermaid-form` | stage | 1.00 | 1.00 |  |
| `opener-C4Context` | stage | 1.50 | 1.50 |  |
| `elements` | counted | 5/5 | 1.50 | all 5 present |

</details>

| `emitsErDiagram` | FAIL | 0.47 | 156.1s | 515.2k | 8.1k | 13 | opener=erDiagram at benchmark/mermaid/er-shop.md (123 chars) — 47% — 4/7 checks · missed: mermaid-form, opener-erDiagram(skipped), elements(skipped) |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-at-path` | stage | 1.00 | 1.00 | benchmark/mermaid/er-shop.md |
| `kind-diagram` | stage | 1.00 | 1.00 |  |
| `body-not-empty` | stage | 0.50 | 0.50 |  |
| `mermaid-form` | stage | 0.00 | 1.00 | neither a ```mermaid fence nor a `source` field |
| `opener-erDiagram` | stage | skipped | 1.50 | chain stopped earlier |
| `elements` | counted | skipped | 1.50 | chain stopped earlier |

</details>


<details><summary>artifacts</summary>

```
=== full body (123 chars) ===
erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--o{ ORDERLINE : contains
    ORDERLINE }o--|| PRODUCT : includes

```

</details>

| `emitsGanttDiagram` | FAIL | 0.47 | 201.4s | 798.3k | 12.3k | 20 | opener=gantt at benchmark/mermaid/gantt-onboarding.md (343 chars) — 47% — 4/7 checks · missed: mermaid-form, opener-gantt(skipped), elements(skipped) |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-at-path` | stage | 1.00 | 1.00 | benchmark/mermaid/gantt-onboarding.md |
| `kind-diagram` | stage | 1.00 | 1.00 |  |
| `body-not-empty` | stage | 0.50 | 0.50 |  |
| `mermaid-form` | stage | 0.00 | 1.00 | neither a ```mermaid fence nor a `source` field |
| `opener-gantt` | stage | skipped | 1.50 | chain stopped earlier |
| `elements` | counted | skipped | 1.50 | chain stopped earlier |

</details>


<details><summary>artifacts</summary>

```
=== full body (343 chars) ===
gantt
    title Onboarding Gantt
    dateFormat  YYYY-MM-DD
    section Setup
    Install IDE :a1, 2026-09-13, 2d
    Configure Repo :a2, after a1, 1d
    section Domain-Intro
    Read Domain Docs :b1, 2026-09-14, 3d
    Meet Team :b2, after b1, 1d
    section Pairing
    Pair with Senior :c1, 2026-09-15, 2d
    Code Review :c2, after c1, 2d
```

</details>

| `emitsGitGraph` | FAIL | 0.47 | 267.5s | 621.3k | 15.8k | 16 | opener=gitGraph at benchmark/mermaid/gitflow.md (312 chars) — 47% — 4/7 checks · missed: mermaid-form, opener-gitGraph(skipped), elements(skipped) |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-at-path` | stage | 1.00 | 1.00 | benchmark/mermaid/gitflow.md |
| `kind-diagram` | stage | 1.00 | 1.00 |  |
| `body-not-empty` | stage | 0.50 | 0.50 |  |
| `mermaid-form` | stage | 0.00 | 1.00 | neither a ```mermaid fence nor a `source` field |
| `opener-gitGraph` | stage | skipped | 1.50 | chain stopped earlier |
| `elements` | counted | skipped | 1.50 | chain stopped earlier |

</details>


<details><summary>artifacts</summary>

```
=== full body (312 chars) ===
graph: |
  gitGraph
    commit id: 1a2b3c4
    commit id: 1a2b3c5
    branch main
    commit id: 1a2b3c6
    branch develop
    commit id: 1a2b3c7
    branch feature/awesome
    commit id: 1a2b3c8
    commit id: 1a2b3c9
    branch release/v1.0
    merge develop into release/v1.0
    merge release/v1.0 into main
```

</details>

| `emitsJourneyDiagram` | OK | 0.96 | 174.4s | 682.3k | 9.7k | 17 | opener=journey at benchmark/mermaid/journey-checkout.md (272 chars) — 96% — 6/7 checks · missed: elements(4/5) |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-at-path` | stage | 1.00 | 1.00 | benchmark/mermaid/journey-checkout.md |
| `kind-diagram` | stage | 1.00 | 1.00 |  |
| `body-not-empty` | stage | 0.50 | 0.50 |  |
| `mermaid-form` | stage | 1.00 | 1.00 |  |
| `opener-journey` | stage | 1.50 | 1.50 |  |
| `elements` | counted | 4/5 | 1.50 | 4/5 (missing: Auswählen) |

</details>

| `emitsPieDiagram` | FAIL | 0.47 | 198.0s | 784.9k | 11.5k | 20 | opener=pie at benchmark/mermaid/pie-languages.md (109 chars) — 47% — 4/7 checks · missed: mermaid-form, opener-pie(skipped), elements(skipped) |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-at-path` | stage | 1.00 | 1.00 | benchmark/mermaid/pie-languages.md |
| `kind-diagram` | stage | 1.00 | 1.00 |  |
| `body-not-empty` | stage | 0.50 | 0.50 |  |
| `mermaid-form` | stage | 0.00 | 1.00 | neither a ```mermaid fence nor a `source` field |
| `opener-pie` | stage | skipped | 1.50 | chain stopped earlier |
| `elements` | counted | skipped | 1.50 | chain stopped earlier |

</details>


<details><summary>artifacts</summary>

```
=== full body (109 chars) ===
pie
    title Sprachen-Verteilung
    "Java":40
    "Python":25
    "TypeScript":20
    "Go":10
    "Rust":5

```

</details>

| `emitsSequenceDiagram` | OK | 1.00 | 321.3s | 831.4k | 18.1k | 20 | opener=sequenceDiagram at benchmark/mermaid/sequence-oauth.md (540 chars) — 100% — 7/7 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-at-path` | stage | 1.00 | 1.00 | benchmark/mermaid/sequence-oauth.md |
| `kind-diagram` | stage | 1.00 | 1.00 |  |
| `body-not-empty` | stage | 0.50 | 0.50 |  |
| `mermaid-form` | stage | 1.00 | 1.00 |  |
| `opener-sequenceDiagram` | stage | 1.50 | 1.50 |  |
| `elements` | counted | 4/4 | 1.50 | all 4 present |

</details>

| `emitsStateDiagram` | OK | 1.00 | 80.1s | 302.4k | 4.5k | 8 | opener=stateDiagram at benchmark/mermaid/state-order.md (257 chars) — 100% — 7/7 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-at-path` | stage | 1.00 | 1.00 | benchmark/mermaid/state-order.md |
| `kind-diagram` | stage | 1.00 | 1.00 |  |
| `body-not-empty` | stage | 0.50 | 0.50 |  |
| `mermaid-form` | stage | 1.00 | 1.00 |  |
| `opener-stateDiagram` | stage | 1.50 | 1.50 |  |
| `elements` | counted | 5/5 | 1.50 | all 5 present |

</details>

| `emitsTimelineDiagram` | OK | 1.00 | 213.4s | 788.1k | 12.9k | 20 | opener=timeline at benchmark/mermaid/timeline-web.md (300 chars) — 100% — 7/7 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-at-path` | stage | 1.00 | 1.00 | benchmark/mermaid/timeline-web.md |
| `kind-diagram` | stage | 1.00 | 1.00 |  |
| `body-not-empty` | stage | 0.50 | 0.50 |  |
| `mermaid-form` | stage | 1.00 | 1.00 |  |
| `opener-timeline` | stage | 1.50 | 1.50 |  |
| `elements` | counted | 10/10 | 1.50 | all 10 present |

</details>

