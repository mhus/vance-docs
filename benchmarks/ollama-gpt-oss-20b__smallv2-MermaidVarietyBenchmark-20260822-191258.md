# Vance Benchmark - ollama-gpt-oss-20b__smallv2-MermaidVarietyBenchmark-20260822-191258

- **Started:** 2026-08-22T19:12:58.649927Z
- **Judge:** gemini-gemini-2.5-pro
- **Knobs:** {chatTimeoutS=600, waitBudgetMinS=300}
- **Score model:** v2-graded
- **Total tests:** 9
- **Passed:** 1 / 9 (11%)
- **Average score:** 0.489
- **Total LLM time:** 2033.2s
- **Total tokens (in / out):** 5.48M / 133.7k (151 round-trips)


## mermaid-variety

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `emitsC4ContextDiagram` | FAIL | 0.47 | 71.4s | 207.3k | 3.3k | 6 | opener=C4Context at benchmark/mermaid/c4-notifications.md (600 chars) — 47% — 4/7 checks · missed: mermaid-form, opener-C4Context(skipped), elements(skipped) |

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
=== full body (600 chars) ===
---
diagram: |
  c4Context
    title Notification System
    Person(user, "User")
    System_Boundary(notificationAPI, "Notification API") {
        System(notificationService, "Notification Service")
    }
    System(emailProvider, "Email Provider")
    System(smsProvider, "SMS Provider")
    System(pushProvider, "Push Provider")
    Rel(user, notificationAPI, "Sends notification requests")
    Rel(notificationAPI, emailProvider, "Sends email notifications")
    Rel(notificationAPI, smsProvider, "Sends SMS notifications")
    Rel(notificationAPI, pushProvider, "Sends push notifications")
---

```

</details>

| `emitsErDiagram` | FAIL | 0.47 | 323.2s | 720.5k | 19.6k | 20 | opener=erDiagram at benchmark/mermaid/er-shop.md (454 chars) — 47% — 4/7 checks · missed: mermaid-form, opener-erDiagram(skipped), elements(skipped) |

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
=== full body (454 chars) ===
erDiagram
    CUSTOMER {
        int id
        string name
        string email
    }
    ORDER {
        int id
        date orderDate
        int customerId
    }
    ORDERLINE {
        int id
        int orderId
        int productId
        int quantity
    }
    PRODUCT {
        int id
        string name
        decimal price
    }
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--o{ ORDERLINE : contains
    ORDERLINE }o--|| PRODUCT : refers

```

</details>

| `emitsGanttDiagram` | FAIL | 0.13 | 28.6s | 170.7k | 821 | 5 | no document at path=benchmark/mermaid/gantt-onboarding.md (opener=gantt); kinds in project: [diagram]; paths: [benchmark/mermaid/c4-notifications.md, benchmark/mermaid/pie-languages.md, benchmark/mermaid/state-order.md, benchmark/mermaid/timeline-web.md, notes/welcome.md, specs/deployment-checklist.md] — 13% — 1/7 checks · missed: document-at-path, kind-diagram(skipped), body-not-empty(skipped), mermaid-form(skipped), opener-gantt(skipped), elements(skipped) |

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

| `emitsGitGraph` | FAIL | 0.47 | 307.0s | 737.6k | 20.6k | 20 | opener=gitGraph at benchmark/mermaid/gitflow.md (398 chars) — 47% — 4/7 checks · missed: mermaid-form, opener-gitGraph(skipped), elements(skipped) |

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
=== full body (398 chars) ===
gitGraph
  commit id: "Start"
  branch develop
  commit id: "dev1"
  branch feature-1
  commit id: "feat1-1"
  commit id: "feat1-2"
  checkout develop
  merge feature-1
  commit id: "dev2"
  branch feature-2
  commit id: "feat2-1"
  checkout develop
  merge feature-2
  commit id: "dev3"
  branch release
  commit id: "rel1"
  commit id: "rel2"
  checkout main
  merge release
  commit id: "main1"

```

</details>

| `emitsJourneyDiagram` | OK | 1.00 | 207.4s | 727.4k | 14.0k | 20 | opener=journey at benchmark/mermaid/journey-checkout.md (116 chars) — 100% — 7/7 checks |

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

| `emitsPieDiagram` | FAIL | 0.47 | 210.3s | 686.4k | 11.9k | 19 | opener=pie at benchmark/mermaid/pie-languages.md (119 chars) — 47% — 4/7 checks · missed: mermaid-form, opener-pie(skipped), elements(skipped) |

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
=== full body (119 chars) ===
pie:
    title: "Language Distribution"
    "Java": 40
    "Python": 25
    "TypeScript": 20
    "Go": 10
    "Rust": 5
```

</details>

| `emitsSequenceDiagram` | FAIL | 0.47 | 392.4s | 758.1k | 27.1k | 20 | opener=sequenceDiagram at benchmark/mermaid/sequence-oauth.md (688 chars) — 47% — 4/7 checks · missed: mermaid-form, opener-sequenceDiagram(skipped), elements(skipped) |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-at-path` | stage | 1.00 | 1.00 | benchmark/mermaid/sequence-oauth.md |
| `kind-diagram` | stage | 1.00 | 1.00 |  |
| `body-not-empty` | stage | 0.50 | 0.50 |  |
| `mermaid-form` | stage | 0.00 | 1.00 | neither a ```mermaid fence nor a `source` field |
| `opener-sequenceDiagram` | stage | skipped | 1.50 | chain stopped earlier |
| `elements` | counted | skipped | 1.50 | chain stopped earlier |

</details>


<details><summary>artifacts</summary>

```
=== full body (688 chars) ===
sequenceDiagram
    participant User
    participant App
    participant Auth-Server
    participant Resource-Server

    User->>App: Open login page
    App->>Auth-Server: Redirect to authorization endpoint (client_id, redirect_uri, scope, state)
    Auth-Server->>User: Prompt login & consent
    User->>Auth-Server: Submit credentials & consent
    Auth-Server->>App: Redirect with authorization code (state)
    App->>Auth-Server: Exchange code for access token (client_secret, redirect_uri)
    Auth-Server->>App: Return access token (and optionally refresh token)
    App->>Resource-Server: Access protected resource with Bearer token
    Resource-Server->>App: Return resource data
```

</details>

| `emitsStateDiagram` | FAIL | 0.47 | 156.2s | 717.0k | 11.1k | 20 | opener=stateDiagram at benchmark/mermaid/state-order.md (152 chars) — 47% — 4/7 checks · missed: mermaid-form, opener-stateDiagram(skipped), elements(skipped) |

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
=== full body (152 chars) ===
stateDiagram-v2
    [*] --> Created
    Created --> Paid
    Created --> Cancelled
    Paid --> Shipped
    Paid --> Cancelled
    Shipped --> Delivered
```

</details>

| `emitsTimelineDiagram` | FAIL | 0.47 | 336.8s | 754.8k | 25.4k | 21 | opener=timeline at benchmark/mermaid/timeline-web.md (139 chars) — 47% — 4/7 checks · missed: mermaid-form, opener-timeline(skipped), elements(skipped) |

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
=== full body (139 chars) ===
timeline
  title Web History
  "1991" : World Wide Web
  "1995" : JavaScript
  "2008" : Chrome
  "2014" : ES6
  "2020" : WebAssembly stable
```

</details>

