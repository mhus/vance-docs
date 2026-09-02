# Vance Benchmark - ollama-muse-glimmer-30b-mlx__smallv2-MermaidVarietyBenchmark-20260822-093056

- **Started:** 2026-08-22T09:30:56.341052Z
- **Judge:** gemini-gemini-2.5-pro
- **Knobs:** {chatTimeoutS=600, waitBudgetMinS=300}
- **Score model:** v2-graded
- **Total tests:** 9
- **Passed:** 4 / 9 (44%)
- **Average score:** 0.652
- **Total LLM time:** 1147.1s
- **Total tokens (in / out):** 2.88M / 18.0k (70 round-trips)


## mermaid-variety

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `emitsC4ContextDiagram` | FAIL | 0.47 | 180.5s | 892.0k | 6.2k | 20 | opener=C4Context at benchmark/mermaid/c4-notifications.md (711 chars) — 47% — 4/7 checks · missed: mermaid-form, opener-C4Context(skipped), elements(skipped) |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-at-path` | stage | 1.00 | 1.00 | benchmark/mermaid/c4-notifications.md |
| `kind-diagram` | stage | 1.00 | 1.00 |  |
| `body-not-empty` | stage | 0.50 | 0.50 |  |
| `mermaid-form` | stage | 0.00 | 1.00 | neither a ```mermaid fence nor a `source` field |
| `opener-C4Context` | stage | skipped | 1.50 | chain stopped earlier |
| `elements` | counted | skipped | 1.50 | chain stopped earlier |

</details>


<details><summary>artifacts</summary>

```
=== full body (711 chars) ===
C4Context
title Notification-System Kontext

Person(user, "User", "Möchte Benachrichtigungen erhalten")

System(notification_api, "Notification-API", "Orchestriert und verteilt Benachrichtigungen an externe Anbieter")

System_Ext(email_provider, "Email-Provider", "Externer E-Mail Versanddienst")
System_Ext(sms_provider, "SMS-Provider", "Externer SMS Versanddienst")
System_Ext(push_provider, "Push-Provider", "Externer Push-Benachrichtigungsdienst")

Rel(user, notification_api, "fordert Benachrichtigungen an", "HTTPS")
Rel(notification_api, email_provider, "sendet E-Mails", "SMTP/API")
Rel(notification_api, sms_provider, "sendet SMS", "SMPP/API")
Rel(notification_api, push_provider, "sendet Push", "API")
```

</details>

| `emitsErDiagram` | FAIL | 0.47 | 89.9s | 51.9k | 839 | 2 | opener=erDiagram at benchmark/mermaid/er-shop.md (632 chars) — 47% — 4/7 checks · missed: mermaid-form, opener-erDiagram(skipped), elements(skipped) |

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
=== full body (632 chars) ===
erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--o{ ORDERLINE : contains
    PRODUCT ||--o{ ORDERLINE : supplied_as

    CUSTOMER {
        string customer_id PK
        string name
        string email
        string address
    }

    ORDER {
        string order_id PK
        date order_date
        string status
        string customer_id FK
    }

    ORDERLINE {
        string order_id FK
        string product_id FK
        int quantity
        decimal unit_price
        string orderline_id PK
    }

    PRODUCT {
        string product_id PK
        string name
        decimal price
        int stock
    }

```

</details>

| `emitsGanttDiagram` | OK | 1.00 | 77.7s | 51.9k | 1.6k | 2 | opener=gantt at benchmark/mermaid/gantt-onboarding.md (1171 chars) — 100% — 7/7 checks |

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

| `emitsGitGraph` | OK | 1.00 | 125.5s | 51.9k | 1.2k | 2 | opener=gitGraph at benchmark/mermaid/gitflow.md (1209 chars) — 100% — 7/7 checks |

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

| `emitsJourneyDiagram` | OK | 1.00 | 321.4s | 51.9k | 1.3k | 2 | opener=journey at benchmark/mermaid/journey-checkout.md (1927 chars) — 100% — 7/7 checks |

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

| `emitsPieDiagram` | OK | 1.00 | 43.9s | 51.9k | 852 | 2 | opener=pie at benchmark/mermaid/pie-languages.md (155 chars) — 100% — 7/7 checks |

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

| `emitsSequenceDiagram` | FAIL | 0.00 | - | - | - | - | HttpTimeoutException: request timed out |
| `emitsStateDiagram` | FAIL | 0.47 | 204.8s | 871.8k | 3.5k | 20 | opener=stateDiagram at benchmark/mermaid/state-order.md (289 chars) — 47% — 4/7 checks · missed: mermaid-form, opener-stateDiagram(skipped), elements(skipped) |

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
=== full body (289 chars) ===
stateDiagram
    [*] --> Created
    Created --> Paid : payment received
    Created --> Cancelled : user cancels
    Paid --> Shipped : items picked
    Paid --> Cancelled : payment failed / cancel
    Shipped --> Delivered : delivery confirmed
    Delivered --> [*]
    Cancelled --> [*]
```

</details>

| `emitsTimelineDiagram` | FAIL | 0.47 | 103.3s | 858.6k | 2.5k | 20 | opener=timeline at benchmark/mermaid/timeline-web.md (154 chars) — 47% — 4/7 checks · missed: mermaid-form, opener-timeline(skipped), elements(skipped) |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-at-path` | stage | 1.00 | 1.00 | benchmark/mermaid/timeline-web.md |
| `kind-diagram` | stage | 1.00 | 1.00 |  |
| `body-not-empty` | stage | 0.50 | 0.50 |  |
| `mermaid-form` | stage | 0.00 | 1.00 | neither a ```mermaid fence nor a `source` field |
| `opener-timeline` | stage | skipped | 1.50 | chain stopped earlier |
| `elements` | counted | skipped | 1.50 | chain stopped earlier |

</details>


<details><summary>artifacts</summary>

```
=== full body (154 chars) ===
timeline
    title Web-History Meilensteine
      1991 : WWW
      1995 : JavaScript
      2008 : Chrome
      2014 : ES6
      2020 : WebAssembly stable

```

</details>

