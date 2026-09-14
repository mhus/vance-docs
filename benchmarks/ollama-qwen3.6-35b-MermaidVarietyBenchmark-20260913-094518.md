# Vance Benchmark - ollama-qwen3.6-35b-MermaidVarietyBenchmark-20260913-094518

- **Started:** 2026-09-13T09:45:18.930341Z
- **Judge:** glm-5.3-nvfp4
- **Knobs:** {chatTimeoutS=480, waitBudgetMinS=240}
- **Score model:** v2-graded
- **Total tests:** 9
- **Passed:** 9 / 9 (100%)
- **Average score:** 1.000
- **Total LLM time:** 401.5s
- **Total tokens (in / out):** 3.36M / 21.0k (72 round-trips)


## mermaid-variety

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `emitsC4ContextDiagram` | OK | 1.00 | 46.5s | 178.3k | 1.2k | 4 | opener=C4Context at benchmark/mermaid/c4-notifications.md (1020 chars) — 100% — 7/7 checks |

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

| `emitsErDiagram` | OK | 1.00 | 28.8s | 319.8k | 1.6k | 7 | opener=erDiagram at benchmark/mermaid/er-shop.md (725 chars) — 100% — 7/7 checks |

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

| `emitsGanttDiagram` | OK | 1.00 | 29.4s | 271.6k | 1.9k | 6 | opener=gantt at benchmark/mermaid/gantt-onboarding.md (1325 chars) — 100% — 7/7 checks |

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

| `emitsGitGraph` | OK | 1.00 | 11.9s | 132.9k | 607 | 3 | opener=gitGraph at benchmark/mermaid/gitflow.md (678 chars) — 100% — 7/7 checks |

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

| `emitsJourneyDiagram` | OK | 1.00 | 132.5s | 692.1k | 7.0k | 14 | opener=journey at benchmark/mermaid/journey-checkout.md (1016 chars) — 100% — 7/7 checks |

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

| `emitsPieDiagram` | OK | 1.00 | 49.0s | 846.2k | 2.7k | 18 | opener=pie at benchmark/mermaid/pie-languages.md (163 chars) — 100% — 7/7 checks |

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

| `emitsSequenceDiagram` | OK | 1.00 | 65.4s | 426.0k | 3.7k | 9 | opener=sequenceDiagram at benchmark/mermaid/sequence-oauth.md (1281 chars) — 100% — 7/7 checks |

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

| `emitsStateDiagram` | OK | 1.00 | 8.7s | 132.6k | 436 | 3 | opener=stateDiagram at benchmark/mermaid/state-order.md (648 chars) — 100% — 7/7 checks |

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

| `emitsTimelineDiagram` | OK | 1.00 | 29.4s | 363.3k | 1.8k | 8 | opener=timeline at benchmark/mermaid/timeline-web.md (560 chars) — 100% — 7/7 checks |

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

