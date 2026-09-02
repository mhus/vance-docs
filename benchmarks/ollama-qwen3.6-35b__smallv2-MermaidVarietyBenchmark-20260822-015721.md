# Vance Benchmark - ollama-qwen3.6-35b__smallv2-MermaidVarietyBenchmark-20260822-015721

- **Started:** 2026-08-22T01:57:21.967934Z
- **Judge:** gemini-gemini-2.5-pro
- **Knobs:** {chatTimeoutS=600, waitBudgetMinS=300}
- **Score model:** v2-graded
- **Total tests:** 9
- **Passed:** 5 / 9 (56%)
- **Average score:** 0.739
- **Total LLM time:** 719.1s
- **Total tokens (in / out):** 3.72M / 31.5k (84 round-trips)


## mermaid-variety

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `emitsC4ContextDiagram` | FAIL | 0.27 | 250.8s | 896.6k | 8.9k | 19 | opener=C4Context at benchmark/mermaid/c4-notifications.md (0 chars) — 27% — 2/7 checks · missed: kind-diagram, body-not-empty(skipped), mermaid-form(skipped), opener-C4Context(skipped), elements(skipped) |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-at-path` | stage | 1.00 | 1.00 | benchmark/mermaid/c4-notifications.md |
| `kind-diagram` | stage | 0.00 | 1.00 | kind=null |
| `body-not-empty` | stage | skipped | 0.50 | chain stopped earlier |
| `mermaid-form` | stage | skipped | 1.00 | chain stopped earlier |
| `opener-C4Context` | stage | skipped | 1.50 | chain stopped earlier |
| `elements` | counted | skipped | 1.50 | chain stopped earlier |

</details>


<details><summary>artifacts</summary>

```
=== full body (0 chars) ===

```

</details>

| `emitsErDiagram` | OK | 1.00 | 67.2s | 430.2k | 4.1k | 10 | opener=erDiagram at benchmark/mermaid/er-shop.md (1300 chars) — 100% — 7/7 checks |

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

| `emitsGanttDiagram` | FAIL | 0.47 | 96.1s | 248.2k | 1.7k | 6 | opener=gantt at benchmark/mermaid/gantt-onboarding.md (833 chars) — 47% — 4/7 checks · missed: mermaid-form, opener-gantt(skipped), elements(skipped) |

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
=== full body (833 chars) ===
---
title: Onboarding Gantt-Plan (1 Woche)
$meta:
  kind: diagram
---
gantt
    title Einwöchiges Onboarding
    dateFormat  YYYY-MM-DD
    axisFormat  %a
    excludes    weekends

    section Setup
    Umgebung einrichten          :setup-env, mon1, 1d
    Zugänge & Tools              :setup-access, after setup-env, 1d
    Erstes Commit & PR           :setup-firstpr, after setup-access, 1d

    section Domain-Intro
    Business-Overview             :domain-overview, mon1, 2d
    Architektur-Deep-Dive         :domain-arch, after domain-overview, 2d
    Codebase-Rundgang            :domain-code, after domain-arch, 1d

    section Pairing
    Senior-Junior Pairing S1     :pair-s1, mon3, 2d
    Feature-Praxis mit Begleitung :pair-feature, after pair-s1, 1d
    Retro & Feedback              :pair-retro, after pair-feature, 1d

```

</details>

| `emitsGitGraph` | FAIL | 0.47 | 37.8s | 293.3k | 2.2k | 7 | opener=gitGraph at benchmark/mermaid/gitflow.md (1037 chars) — 47% — 4/7 checks · missed: mermaid-form, opener-gitGraph(skipped), elements(skipped) |

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
=== full body (1037 chars) ===
gitGraph
    commit id: "Initial"
    branch develop
    checkout develop
    commit id: "Start dev"
    branch feature/login
    checkout feature/login
    commit id: "Login UI"
    commit id: "Login logic"
    checkout develop
    merge feature/login id: "Merge login"
    branch feature/signup
    checkout feature/signup
    commit id: "Signup form"
    checkout develop
    merge feature/signup id: "Merge signup"
    branch feature/password-reset
    checkout feature/password-reset
    commit id: "Reset flow"
    checkout develop
    merge feature/password-reset id: "Merge reset"
    branch release/1.0
    checkout release/1.0
    commit id: "Bump version"
    commit id: "Fix critical bug"
    checkout main
    branch hotfix/critical
    checkout hotfix/critical
    commit id: "Hotfix deploy"
    checkout main
    merge hotfix/critical id: "Merge hotfix to main" tag: "v1.0-hotfix"
    checkout develop
    merge release/1.0 id: "Merge release to dev"
    checkout main
    merge release/1.0 id: "Release v1.0" tag: "v1.0"

```

</details>

| `emitsJourneyDiagram` | OK | 1.00 | 136.4s | 732.7k | 7.5k | 16 | opener=journey at benchmark/mermaid/journey-checkout.md (3911 chars) — 100% — 7/7 checks |

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

| `emitsPieDiagram` | OK | 1.00 | 12.4s | 121.3k | 457 | 3 | opener=pie at benchmark/mermaid/pie-languages.md (230 chars) — 100% — 7/7 checks |

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

| `emitsSequenceDiagram` | OK | 1.00 | 19.0s | 122.4k | 1.1k | 3 | opener=sequenceDiagram at benchmark/mermaid/sequence-oauth.md (1136 chars) — 100% — 7/7 checks |

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

| `emitsStateDiagram` | FAIL | 0.47 | 90.0s | 750.4k | 5.1k | 17 | opener=stateDiagram at benchmark/mermaid/state-order.md (667 chars) — 47% — 4/7 checks · missed: mermaid-form, opener-stateDiagram(skipped), elements(skipped) |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-at-path` | stage | 1.00 | 1.00 | benchmark/mermaid/state-order.md |
| `kind-diagram` | stage | 1.00 | 1.00 |  |
| `body-not-empty` | stage | 0.50 | 0.50 |  |
| `mermaid-form` | stage | 0.00 | 1.00 | neither a ```mermaid fence nor a `source` field |
| `opener-stateDiagram` | stage | skipped | 1.50 | chain stopped earlier |
| `elements` | counted | skipped | 1.50 | chain stopped earlier |

</details>


<details><summary>artifacts</summary>

```
=== full body (667 chars) ===
stateDiagram-v2
  [*] --> Created
  state Created {
    [*] --> PendingPayment
    PendingPayment --> PaymentRequired
  }
  state Paid {
    [*] --> Confirmed
  }
  state Shipped {
    [*] --> InTransit
  }
  state Delivered {
    [*] --> Received
  }
  Created --> Paid
  Created --> Cancelled
  Paid --> Shipped
  Paid --> Cancelled
  Shipped --> Delivered
  Cancelled --> [*]
  Delivered --> [*]
  note right of PendingPayment: timeout
  note right of Created: cancel
  note right of Paid: fulfillment_started / cancel_before_shipment
  note right of Shipped: package_delivered
  note right of Cancelled: order_closed
  note right of Delivered: lifecycle_complete

```

</details>

| `emitsTimelineDiagram` | OK | 0.98 | 9.4s | 121.4k | 406 | 3 | opener=timeline at benchmark/mermaid/timeline-web.md (714 chars) — 98% — 6/7 checks · missed: elements(9/10) |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-at-path` | stage | 1.00 | 1.00 | benchmark/mermaid/timeline-web.md |
| `kind-diagram` | stage | 1.00 | 1.00 |  |
| `body-not-empty` | stage | 0.50 | 0.50 |  |
| `mermaid-form` | stage | 1.00 | 1.00 |  |
| `opener-timeline` | stage | 1.50 | 1.50 |  |
| `elements` | counted | 9/10 | 1.50 | 9/10 (missing: 2014) |

</details>

