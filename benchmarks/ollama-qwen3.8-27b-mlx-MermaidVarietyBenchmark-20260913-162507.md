# Vance Benchmark - ollama-qwen3.8-27b-mlx-MermaidVarietyBenchmark-20260913-162507

- **Started:** 2026-09-13T16:25:07.342480Z
- **Judge:** glm-5.3-nvfp4
- **Knobs:** {chatTimeoutS=480, waitBudgetMinS=240}
- **Score model:** v2-graded
- **Total tests:** 9
- **Passed:** 4 / 9 (44%)
- **Average score:** 0.556
- **Total LLM time:** 1616.7s
- **Total tokens (in / out):** 854.5k / 7.5k (25 round-trips)


## mermaid-variety

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `emitsC4ContextDiagram` | FAIL | 0.13 | 93.6s | 88.3k | 847 | 2 | no document at path=benchmark/mermaid/c4-notifications.md (opener=C4Context); kinds in project: []; paths: [notes/welcome.md, specs/deployment-checklist.md] — 13% — 1/7 checks · missed: document-at-path, kind-diagram(skipped), body-not-empty(skipped), mermaid-form(skipped), opener-C4Context(skipped), elements(skipped) |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-at-path` | stage | 0.00 | 1.00 | nothing at benchmark/mermaid/c4-notifications.md within 240s |
| `kind-diagram` | stage | skipped | 1.00 | chain stopped earlier |
| `body-not-empty` | stage | skipped | 0.50 | chain stopped earlier |
| `mermaid-form` | stage | skipped | 1.00 | chain stopped earlier |
| `opener-C4Context` | stage | skipped | 1.50 | chain stopped earlier |
| `elements` | counted | skipped | 1.50 | chain stopped earlier |

</details>

| `emitsErDiagram` | OK | 1.00 | 202.2s | 181.9k | 579 | 4 | opener=erDiagram at benchmark/mermaid/er-shop.md (574 chars) — 100% — 7/7 checks |

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

| `emitsGanttDiagram` | FAIL | 0.47 | 169.1s | 56.1k | 902 | 2 | opener=gantt at benchmark/mermaid/gantt-onboarding.md (1032 chars) — 47% — 4/7 checks · missed: mermaid-form, opener-gantt(skipped), elements(skipped) |

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
=== full body (1032 chars) ===
gantt
    title Onboarding Week 2026-09-14 – 2026-09-18
    dateFormat YYYY-MM-DD
    axisFormat %a %d

    section Setup
    Account creation & SSO            :s1, 2026-09-14, 1d
    Toolchain install                 :s2, after s1, 1d
    Repo setup & first build          :s3, after s2, 1d
    Access provisioning (prod/staging):s4, 2026-09-15, 1d
    Environment smoke test            :s5, after s4, 1d

    section Domain-Intro
    Team & org overview               :d1, 2026-09-14, 1d
    Architecture walkthrough          :d2, 2026-09-15, 1d
    Domain deep-dive                  :d3, 2026-09-16, 1d
    Data model & API tour             :d4, 2026-09-17, 1d
    Domain Q&A session                :d5, 2026-09-18, 1d

    section Pairing
    Pair with mentor (intro)          :p1, 2026-09-14, 1d
    First joint task                  :p2, 2026-09-15, 1d
    Code review pairing               :p3, 2026-09-16, 1d
    Shadow a production incident      :p4, 2026-09-17, 1d
    1:1 feedback & next steps         :p5, 2026-09-18, 1d
```

</details>

| `emitsGitGraph` | FAIL | 0.13 | 444.1s | 82.9k | 781 | 4 | no document at path=benchmark/mermaid/gitflow.md (opener=gitGraph); kinds in project: [diagram]; paths: [benchmark/mermaid/er-shop.md, benchmark/mermaid/gantt-onboarding.md, benchmark/mermaid/pie-languages.md, benchmark/mermaid/timeline-web.md, notes/welcome.md, specs/deployment-checklist.md] — 13% — 1/7 checks · missed: document-at-path, kind-diagram(skipped), body-not-empty(skipped), mermaid-form(skipped), opener-gitGraph(skipped), elements(skipped) |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-at-path` | stage | 0.00 | 1.00 | nothing at benchmark/mermaid/gitflow.md within 240s |
| `kind-diagram` | stage | skipped | 1.00 | chain stopped earlier |
| `body-not-empty` | stage | skipped | 0.50 | chain stopped earlier |
| `mermaid-form` | stage | skipped | 1.00 | chain stopped earlier |
| `opener-gitGraph` | stage | skipped | 1.50 | chain stopped earlier |
| `elements` | counted | skipped | 1.50 | chain stopped earlier |

</details>

| `emitsJourneyDiagram` | OK | 1.00 | 284.8s | 100.0k | 1.4k | 3 | opener=journey at benchmark/mermaid/journey-checkout.md (1549 chars) — 100% — 7/7 checks |

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

| `emitsPieDiagram` | OK | 1.00 | 190.5s | 112.9k | 643 | 4 | opener=pie at benchmark/mermaid/pie-languages.md (138 chars) — 100% — 7/7 checks |

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

| `emitsSequenceDiagram` | FAIL | 0.13 | 174.0s | 88.5k | 1.1k | 2 | no document at path=benchmark/mermaid/sequence-oauth.md (opener=sequenceDiagram); kinds in project: [diagram]; paths: [benchmark/mermaid/er-shop.md, benchmark/mermaid/gantt-onboarding.md, benchmark/mermaid/gitflow.md, benchmark/mermaid/pie-languages.md, benchmark/mermaid/timeline-web.md, notes/welcome.md, specs/deployment-checklist.md] — 13% — 1/7 checks · missed: document-at-path, kind-diagram(skipped), body-not-empty(skipped), mermaid-form(skipped), opener-sequenceDiagram(skipped), elements(skipped) |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-at-path` | stage | 0.00 | 1.00 | nothing at benchmark/mermaid/sequence-oauth.md within 240s |
| `kind-diagram` | stage | skipped | 1.00 | chain stopped earlier |
| `body-not-empty` | stage | skipped | 0.50 | chain stopped earlier |
| `mermaid-form` | stage | skipped | 1.00 | chain stopped earlier |
| `opener-sequenceDiagram` | stage | skipped | 1.50 | chain stopped earlier |
| `elements` | counted | skipped | 1.50 | chain stopped earlier |

</details>

| `emitsStateDiagram` | FAIL | 0.13 | 8.9s | 43.9k | 108 | 1 | no document at path=benchmark/mermaid/state-order.md (opener=stateDiagram); kinds in project: [diagram]; paths: [benchmark/mermaid/timeline-web.md, notes/welcome.md, specs/deployment-checklist.md] — 13% — 1/7 checks · missed: document-at-path, kind-diagram(skipped), body-not-empty(skipped), mermaid-form(skipped), opener-stateDiagram(skipped), elements(skipped) |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-at-path` | stage | 0.00 | 1.00 | nothing at benchmark/mermaid/state-order.md within 240s |
| `kind-diagram` | stage | skipped | 1.00 | chain stopped earlier |
| `body-not-empty` | stage | skipped | 0.50 | chain stopped earlier |
| `mermaid-form` | stage | skipped | 1.00 | chain stopped earlier |
| `opener-stateDiagram` | stage | skipped | 1.50 | chain stopped earlier |
| `elements` | counted | skipped | 1.50 | chain stopped earlier |

</details>

| `emitsTimelineDiagram` | OK | 1.00 | 49.4s | 100.0k | 1.1k | 3 | opener=timeline at benchmark/mermaid/timeline-web.md (457 chars) — 100% — 7/7 checks |

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

