# Vance Benchmark - glm-5.3-nvfp4-MermaidVarietyBenchmark-20260912-192420

- **Started:** 2026-09-12T19:24:20.658977Z
- **Judge:** glm-5.3-nvfp4
- **Score model:** v2-graded
- **Total tests:** 9
- **Passed:** 9 / 9 (100%)
- **Average score:** 1.000
- **Total LLM time:** 344.7s
- **Total tokens (in / out):** 2.80M / 86.1k (51 round-trips)


## mermaid-variety

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `emitsC4ContextDiagram` | OK | 1.00 | 34.8s | 329.6k | 8.7k | 6 | opener=C4Context at benchmark/mermaid/c4-notifications.md (890 chars) — 100% — 7/7 checks |

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

| `emitsErDiagram` | OK | 1.00 | 30.5s | 272.7k | 6.3k | 5 | opener=erDiagram at benchmark/mermaid/er-shop.md (574 chars) — 100% — 7/7 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-at-path` | stage | 1.00 | 1.00 | benchmark/mermaid/er-shop.md |
| `kind-diagram` | stage | 1.00 | 1.00 |  |
| `body-not-empty` | stage | 0.50 | 0.50 |  |
| `mermaid-form` | stage | 1.00 | 1.00 |  |
| `opener-erDiagram` | stage | 1.50 | 1.50 |  |
| `elements` | counted | 4/4 | 1.50 | all 4 present |

</details>

| `emitsGanttDiagram` | OK | 1.00 | 97.3s | 503.2k | 23.7k | 9 | opener=gantt at benchmark/mermaid/gantt-onboarding.md (708 chars) — 100% — 7/7 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-at-path` | stage | 1.00 | 1.00 | benchmark/mermaid/gantt-onboarding.md |
| `kind-diagram` | stage | 1.00 | 1.00 |  |
| `body-not-empty` | stage | 0.50 | 0.50 |  |
| `mermaid-form` | stage | 1.00 | 1.00 |  |
| `opener-gantt` | stage | 1.50 | 1.50 |  |
| `elements` | counted | 3/3 | 1.50 | all 3 present |

</details>

| `emitsGitGraph` | OK | 1.00 | 57.7s | 331.0k | 15.5k | 6 | opener=gitGraph at benchmark/mermaid/gitflow.md (1217 chars) — 100% — 7/7 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-at-path` | stage | 1.00 | 1.00 | benchmark/mermaid/gitflow.md |
| `kind-diagram` | stage | 1.00 | 1.00 |  |
| `body-not-empty` | stage | 0.50 | 0.50 |  |
| `mermaid-form` | stage | 1.00 | 1.00 |  |
| `opener-gitGraph` | stage | 1.50 | 1.50 |  |
| `elements` | counted | 4/4 | 1.50 | all 4 present |

</details>

| `emitsJourneyDiagram` | OK | 1.00 | 39.3s | 386.7k | 10.0k | 7 | opener=journey at benchmark/mermaid/journey-checkout.md (917 chars) — 100% — 7/7 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-at-path` | stage | 1.00 | 1.00 | benchmark/mermaid/journey-checkout.md |
| `kind-diagram` | stage | 1.00 | 1.00 |  |
| `body-not-empty` | stage | 0.50 | 0.50 |  |
| `mermaid-form` | stage | 1.00 | 1.00 |  |
| `opener-journey` | stage | 1.50 | 1.50 |  |
| `elements` | counted | 5/5 | 1.50 | all 5 present |

</details>

| `emitsPieDiagram` | OK | 1.00 | 11.7s | 216.8k | 3.0k | 4 | opener=pie at benchmark/mermaid/pie-languages.md (128 chars) — 100% — 7/7 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-at-path` | stage | 1.00 | 1.00 | benchmark/mermaid/pie-languages.md |
| `kind-diagram` | stage | 1.00 | 1.00 |  |
| `body-not-empty` | stage | 0.50 | 0.50 |  |
| `mermaid-form` | stage | 1.00 | 1.00 |  |
| `opener-pie` | stage | 1.50 | 1.50 |  |
| `elements` | counted | 5/5 | 1.50 | all 5 present |

</details>

| `emitsSequenceDiagram` | OK | 1.00 | 17.1s | 217.5k | 4.4k | 4 | opener=sequenceDiagram at benchmark/mermaid/sequence-oauth.md (736 chars) — 100% — 7/7 checks |

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

| `emitsStateDiagram` | OK | 1.00 | 13.4s | 272.2k | 3.2k | 5 | opener=stateDiagram at benchmark/mermaid/state-order.md (281 chars) — 100% — 7/7 checks |

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

| `emitsTimelineDiagram` | OK | 1.00 | 42.7s | 272.2k | 11.3k | 5 | opener=timeline at benchmark/mermaid/timeline-web.md (193 chars) — 100% — 7/7 checks |

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

