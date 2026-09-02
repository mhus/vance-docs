# Vance Benchmark - ollama-qwen3.6-35b__smallv2-MermaidVarietyBenchmark-20260822-034537

- **Started:** 2026-08-22T03:45:37.297026Z
- **Judge:** gemini-gemini-2.5-pro
- **Knobs:** {chatTimeoutS=600, waitBudgetMinS=300}
- **Score model:** v2-graded
- **Total tests:** 9
- **Passed:** 7 / 9 (78%)
- **Average score:** 0.879
- **Total LLM time:** 417.1s
- **Total tokens (in / out):** 2.44M / 21.5k (58 round-trips)


## mermaid-variety

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `emitsC4ContextDiagram` | OK | 1.00 | 92.2s | 343.8k | 4.9k | 8 | opener=C4Context at benchmark/mermaid/c4-notifications.md (2477 chars) — 100% — 7/7 checks |

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

| `emitsErDiagram` | FAIL | 0.47 | 39.5s | 291.0k | 2.0k | 7 | opener=erDiagram at benchmark/mermaid/er-shop.md (707 chars) — 47% — 4/7 checks · missed: mermaid-form, opener-erDiagram(skipped), elements(skipped) |

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
=== full body (707 chars) ===
erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ ORDER_LINE : contains
    PRODUCT ||--o{ ORDER_LINE : "ordered in"

    CUSTOMER {
        int id PK
        string first_name
        string last_name
        string email
        datetime created_at
    }

    ORDER {
        int id PK
        int customer_id FK
        datetime order_date
        string status
        decimal total_amount
    }

    ORDER_LINE {
        int id PK
        int order_id FK
        int product_id FK
        int quantity
        decimal unit_price
    }

    PRODUCT {
        int id PK
        string name
        string description
        decimal price
        string sku
        datetime created_at
    }

```

</details>

| `emitsGanttDiagram` | OK | 1.00 | 14.4s | 121.8k | 788 | 3 | opener=gantt at benchmark/mermaid/gantt-onboarding.md (976 chars) — 100% — 7/7 checks |

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

| `emitsGitGraph` | FAIL | 0.47 | 49.8s | 294.2k | 3.1k | 7 | opener=gitGraph at benchmark/mermaid/gitflow.md (1351 chars) — 47% — 4/7 checks · missed: mermaid-form, opener-gitGraph(skipped), elements(skipped) |

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
=== full body (1351 chars) ===
gitGraph
    commit id: "Initial" tag: "v0.1"
    branch develop
    checkout develop
    commit id: "Setup build system"
    commit id: "Add core libraries"

    branch feature/auth
    checkout feature/auth
    commit id: "Auth module start"
    commit id: "OAuth2 integration"
    commit id: "JWT tokens"

    branch feature/dashboard
    checkout feature/dashboard
    commit id: "Dashboard layout"
    commit id: "Chart components"

    checkout develop
    merge feature/auth id: "Merge feature/auth"
    branch feature/api-v2
    checkout feature/api-v2
    commit id: "REST endpoints v2"
    commit id: "Pagination support"
    checkout develop
    merge feature/dashboard id: "Merge feature/dashboard"
    merge feature/api-v2 id: "Merge feature/api-v2"

    branch release/v1.0
    checkout release/v1.0
    commit id: "Bump version to 1.0-rc1"
    commit id: "Fix critical bugs"
    commit id: "Update docs"
    checkout main
    merge release/v1.0 id: "Release v1.0" tag: "v1.0"
    checkout develop
    merge release/v1.0 id: "Backport to develop"

    branch feature/notifications
    checkout feature/notifications
    commit id: "Push notifications"
    commit id: "Email alerts"
    checkout main
    merge feature/notifications id: "Merge feature/notifications" tag: "v1.1"

    checkout develop
    commit id: "Prepare next sprint"

```

</details>

| `emitsJourneyDiagram` | OK | 1.00 | 41.5s | 209.1k | 2.4k | 5 | opener=journey at benchmark/mermaid/journey-checkout.md (3018 chars) — 100% — 7/7 checks |

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

| `emitsPieDiagram` | OK | 1.00 | 35.6s | 505.4k | 1.9k | 12 | opener=pie at benchmark/mermaid/pie-languages.md (151 chars) — 100% — 7/7 checks |

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

| `emitsSequenceDiagram` | OK | 1.00 | 75.6s | 347.0k | 4.2k | 8 | opener=sequenceDiagram at benchmark/mermaid/sequence-oauth.md (2466 chars) — 100% — 7/7 checks |

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

| `emitsStateDiagram` | OK | 1.00 | 54.7s | 205.6k | 1.4k | 5 | opener=stateDiagram at benchmark/mermaid/state-order.md (774 chars) — 100% — 7/7 checks |

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

| `emitsTimelineDiagram` | OK | 0.98 | 13.8s | 121.7k | 810 | 3 | opener=timeline at benchmark/mermaid/timeline-web.md (785 chars) — 98% — 6/7 checks · missed: elements(9/10) |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-at-path` | stage | 1.00 | 1.00 | benchmark/mermaid/timeline-web.md |
| `kind-diagram` | stage | 1.00 | 1.00 |  |
| `body-not-empty` | stage | 0.50 | 0.50 |  |
| `mermaid-form` | stage | 1.00 | 1.00 |  |
| `opener-timeline` | stage | 1.50 | 1.50 |  |
| `elements` | counted | 9/10 | 1.50 | 9/10 (missing: WWW) |

</details>

