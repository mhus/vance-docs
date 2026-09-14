# Vance Benchmark - ollama-laguna-s-2.1-nvfp4-MermaidVarietyBenchmark-20260913-220317

- **Started:** 2026-09-13T22:03:17.526697Z
- **Judge:** glm-5.3-nvfp4
- **Knobs:** {chatTimeoutS=480, waitBudgetMinS=240}
- **Score model:** v2-graded
- **Total tests:** 9
- **Passed:** 8 / 9 (89%)
- **Average score:** 0.919
- **Total LLM time:** 915.6s
- **Total tokens (in / out):** 4.73M / 16.0k (82 round-trips)


## mermaid-variety

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `emitsC4ContextDiagram` | OK | 1.00 | 70.3s | 340.4k | 1.3k | 6 | opener=C4Context at benchmark/mermaid/c4-notifications.md (771 chars) — 100% — 7/7 checks |

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

| `emitsErDiagram` | OK | 1.00 | 47.3s | 337.5k | 1.3k | 6 | opener=erDiagram at benchmark/mermaid/er-shop.md (571 chars) — 100% — 7/7 checks |

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

| `emitsGanttDiagram` | OK | 1.00 | 80.3s | 583.9k | 2.6k | 10 | opener=gantt at benchmark/mermaid/gantt-onboarding.md (766 chars) — 100% — 7/7 checks |

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

| `emitsGitGraph` | OK | 1.00 | 54.7s | 457.8k | 1.8k | 8 | opener=gitGraph at benchmark/mermaid/gitflow.md (873 chars) — 100% — 7/7 checks |

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

| `emitsJourneyDiagram` | OK | 1.00 | 142.7s | 714.7k | 2.6k | 12 | opener=journey at benchmark/mermaid/journey-checkout.md (829 chars) — 100% — 7/7 checks |

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

| `emitsPieDiagram` | OK | 1.00 | 35.4s | 387.0k | 857 | 7 | opener=pie at benchmark/mermaid/pie-languages.md (128 chars) — 100% — 7/7 checks |

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

| `emitsSequenceDiagram` | OK | 1.00 | 57.0s | 338.3k | 2.2k | 6 | opener=sequenceDiagram at benchmark/mermaid/sequence-oauth.md (766 chars) — 100% — 7/7 checks |

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

| `emitsStateDiagram` | OK | 1.00 | 81.5s | 403.2k | 832 | 7 | opener=stateDiagram at benchmark/mermaid/state-order.md (271 chars) — 100% — 7/7 checks |

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

| `emitsTimelineDiagram` | FAIL | 0.27 | 346.4s | 1.17M | 2.6k | 20 | opener=timeline at benchmark/mermaid/timeline-web.md (0 chars) — 27% — 2/7 checks · missed: kind-diagram, body-not-empty(skipped), mermaid-form(skipped), opener-timeline(skipped), elements(skipped) |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-at-path` | stage | 1.00 | 1.00 | benchmark/mermaid/timeline-web.md |
| `kind-diagram` | stage | 0.00 | 1.00 | kind=null |
| `body-not-empty` | stage | skipped | 0.50 | chain stopped earlier |
| `mermaid-form` | stage | skipped | 1.00 | chain stopped earlier |
| `opener-timeline` | stage | skipped | 1.50 | chain stopped earlier |
| `elements` | counted | skipped | 1.50 | chain stopped earlier |

</details>


<details><summary>artifacts</summary>

```
=== full body (0 chars) ===

```

</details>

