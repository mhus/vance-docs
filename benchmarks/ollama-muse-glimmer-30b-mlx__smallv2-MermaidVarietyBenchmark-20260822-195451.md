# Vance Benchmark - ollama-muse-glimmer-30b-mlx__smallv2-MermaidVarietyBenchmark-20260822-195451

- **Started:** 2026-08-22T19:54:51.013041Z
- **Judge:** gemini-gemini-2.5-pro
- **Knobs:** {chatTimeoutS=600, waitBudgetMinS=300}
- **Score model:** v2-graded
- **Total tests:** 9
- **Passed:** 5 / 9 (56%)
- **Average score:** 0.585
- **Total LLM time:** 2031.0s
- **Total tokens (in / out):** 774.9k / 11.1k (24 round-trips)


## mermaid-variety

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `emitsC4ContextDiagram` | OK | 1.00 | 102.5s | 52.2k | 1.3k | 2 | opener=C4Context at benchmark/mermaid/c4-notifications.md (830 chars) — 100% — 7/7 checks |

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

| `emitsErDiagram` | FAIL | 0.00 | - | - | - | - | 0% — 0/1 checks · missed: test-completed |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `test-completed` | stage | 0.00 | 1.00 | HttpTimeoutException: request timed out |

</details>

| `emitsGanttDiagram` | FAIL | 0.13 | 296.2s | 63.7k | 1.7k | 3 | no document at path=benchmark/mermaid/gantt-onboarding.md (opener=gantt); kinds in project: [diagram]; paths: [benchmark/mermaid/c4-notifications.md, benchmark/mermaid/pie-languages.md, benchmark/mermaid/state-order.md, benchmark/mermaid/state-order.yaml, benchmark/mermaid/timeline-web.md, notes/welcome.md, specs/deployment-checklist.md] — 13% — 1/7 checks · missed: document-at-path, kind-diagram(skipped), body-not-empty(skipped), mermaid-form(skipped), opener-gantt(skipped), elements(skipped) |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-at-path` | stage | 0.00 | 1.00 | nothing at benchmark/mermaid/gantt-onboarding.md within 300s |
| `kind-diagram` | stage | skipped | 1.00 | chain stopped earlier |
| `body-not-empty` | stage | skipped | 0.50 | chain stopped earlier |
| `mermaid-form` | stage | skipped | 1.00 | chain stopped earlier |
| `opener-gantt` | stage | skipped | 1.50 | chain stopped earlier |
| `elements` | counted | skipped | 1.50 | chain stopped earlier |

</details>

| `emitsGitGraph` | OK | 1.00 | 345.5s | 52.1k | 1.6k | 2 | opener=gitGraph at benchmark/mermaid/gitflow.md (1016 chars) — 100% — 7/7 checks |

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

| `emitsJourneyDiagram` | OK | 1.00 | 432.9s | 63.8k | 1.6k | 3 | opener=journey at benchmark/mermaid/journey-checkout.md (531 chars) — 100% — 7/7 checks |

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

| `emitsPieDiagram` | FAIL | 0.00 | - | - | - | - | 0% — 0/1 checks · missed: test-completed |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `test-completed` | stage | 0.00 | 1.00 | HttpTimeoutException: request timed out |

</details>

| `emitsSequenceDiagram` | FAIL | 0.13 | 385.6s | 52.2k | 1.2k | 2 | no document at path=benchmark/mermaid/sequence-oauth.md (opener=sequenceDiagram); kinds in project: [diagram]; paths: [benchmark/mermaid/c4-notifications.md, benchmark/mermaid/er-shop.md, benchmark/mermaid/er-shop.yaml, benchmark/mermaid/gantt-onboarding.md, benchmark/mermaid/gitflow.md, benchmark/mermaid/pie-languages.md, benchmark/mermaid/state-order.md, benchmark/mermaid/state-order.yaml, benchmark/mermaid/timeline-web.md, notes/welcome.md, specs/deployment-checklist.md] — 13% — 1/7 checks · missed: document-at-path, kind-diagram(skipped), body-not-empty(skipped), mermaid-form(skipped), opener-sequenceDiagram(skipped), elements(skipped) |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-at-path` | stage | 0.00 | 1.00 | nothing at benchmark/mermaid/sequence-oauth.md within 300s |
| `kind-diagram` | stage | skipped | 1.00 | chain stopped earlier |
| `body-not-empty` | stage | skipped | 0.50 | chain stopped earlier |
| `mermaid-form` | stage | skipped | 1.00 | chain stopped earlier |
| `opener-sequenceDiagram` | stage | skipped | 1.50 | chain stopped earlier |
| `elements` | counted | skipped | 1.50 | chain stopped earlier |

</details>

| `emitsStateDiagram` | OK | 1.00 | 398.7s | 438.8k | 2.6k | 10 | opener=stateDiagram at benchmark/mermaid/state-order.md (210 chars) — 100% — 7/7 checks |

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

| `emitsTimelineDiagram` | OK | 1.00 | 69.5s | 52.1k | 1.1k | 2 | opener=timeline at benchmark/mermaid/timeline-web.md (133 chars) — 100% — 7/7 checks |

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

