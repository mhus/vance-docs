# Vance Benchmark - ollama-gemma4-31b-mlx__smallv2-MermaidVarietyBenchmark-20260822-123108

- **Started:** 2026-08-22T12:31:08.211166Z
- **Judge:** gemini-gemini-2.5-pro
- **Knobs:** {chatTimeoutS=600, waitBudgetMinS=300}
- **Score model:** v2-graded
- **Total tests:** 9
- **Passed:** 1 / 9 (11%)
- **Average score:** 0.437
- **Total LLM time:** 2209.0s
- **Total tokens (in / out):** 916.5k / 4.5k (26 round-trips)


## mermaid-variety

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `emitsC4ContextDiagram` | OK | 1.00 | 45.6s | 50.6k | 483 | 2 | opener=C4Context at benchmark/mermaid/c4-notifications.md (1086 chars) — 100% — 7/7 checks |

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

| `emitsErDiagram` | FAIL | 0.47 | 111.2s | 49.5k | 326 | 2 | opener=erDiagram at benchmark/mermaid/er-shop.md (570 chars) — 47% — 4/7 checks · missed: mermaid-form, opener-erDiagram(skipped), elements(skipped) |

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
=== full body (570 chars) ===
erDiagram
    Customer ||--o{ Order : places
    Order ||--|{ OrderLine : contains
    Product ||--o{ OrderLine : "is ordered in"

    Customer {
        string customerId PK
        string name
        string email
    }
    Order {
        string orderId PK
        datetime orderDate
        string customerId FK
    }
    OrderLine {
        string orderLineId PK
        string orderId FK
        string productId FK
        int quantity
        float priceAtTime
    }
    Product {
        string productId PK
        string name
        float currentPrice
    }

```

</details>

| `emitsGanttDiagram` | FAIL | 0.13 | 325.6s | 161.9k | 1.1k | 4 | no document at path=benchmark/mermaid/gantt-onboarding.md (opener=gantt); kinds in project: [application, calendar, diagram, records]; paths: [benchmark/mermaid/c4-notifications.md, benchmark/mermaid/c4-notifications.yaml, benchmark/mermaid/onboarding-app/_app.yaml, benchmark/mermaid/onboarding-app/_conflicts.yaml, benchmark/mermaid/onboarding-app/_gantt.md, benchmark/mermaid/onboarding-app/domain-intro/work.yaml, benchmark/mermaid/onboarding-app/pairing/work.yaml, benchmark/mermaid/onboarding-app/setup/work.yaml, benchmark/mermaid/pie-languages.md, benchmark/mermaid/state-order.md, benchmark/mermaid/state-order.yaml, benchmark/mermaid/timeline-web.md, notes/welcome.md, specs/deployment-checklist.md] — 13% — 1/7 checks · missed: document-at-path, kind-diagram(skipped), body-not-empty(skipped), mermaid-form(skipped), opener-gantt(skipped), elements(skipped) |

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

| `emitsGitGraph` | FAIL | 0.47 | 76.5s | 49.5k | 395 | 2 | opener=gitGraph at benchmark/mermaid/gitflow.md (590 chars) — 47% — 4/7 checks · missed: mermaid-form, opener-gitGraph(skipped), elements(skipped) |

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
=== full body (590 chars) ===
gitGraph
    commit id: "Initial"
    branch develop
    checkout develop
    commit id: "Dev-1"
    branch feature-1
    checkout feature-1
    commit id: "F1-1"
    commit id: "F1-2"
    checkout develop
    merge feature-1
    branch feature-2
    checkout feature-2
    commit id: "F2-1"
    checkout develop
    commit id: "Dev-2"
    branch release-1.0
    checkout release-1.0
    commit id: "Rel-1.1"
    checkout main
    merge release-1.0 tag: "v1.0"
    checkout develop
    merge release-1.0
    checkout feature-2
    commit id: "F2-2"
    checkout develop
    merge feature-2

```

</details>

| `emitsJourneyDiagram` | FAIL | 0.47 | 185.7s | 49.5k | 274 | 2 | opener=journey at benchmark/mermaid/journey-checkout.md (216 chars) — 47% — 4/7 checks · missed: mermaid-form, opener-journey(skipped), elements(skipped) |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-at-path` | stage | 1.00 | 1.00 | benchmark/mermaid/journey-checkout.md |
| `kind-diagram` | stage | 1.00 | 1.00 |  |
| `body-not-empty` | stage | 0.50 | 0.50 |  |
| `mermaid-form` | stage | 0.00 | 1.00 | neither a ```mermaid fence nor a `source` field |
| `opener-journey` | stage | skipped | 1.50 | chain stopped earlier |
| `elements` | counted | skipped | 1.50 | chain stopped earlier |

</details>


<details><summary>artifacts</summary>

```
=== full body (216 chars) ===
journey
    title User-Journey Online-Kauf
    section Einkaufsphase
      Browsen: 3: User
      Auswählen: 4: User
    section Abschlussphase
      Warenkorb: 3: User
      Checkout: 2: User
      Bezahlen: 4: User
```

</details>

| `emitsPieDiagram` | FAIL | 0.47 | 516.0s | 238.8k | 593 | 6 | opener=pie at benchmark/mermaid/pie-languages.md (113 chars) — 47% — 4/7 checks · missed: mermaid-form, opener-pie(skipped), elements(skipped) |

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
=== full body (113 chars) ===
pie title Sprachen-Verteilung im Team
    "Java" 40
    "Python" 25
    "TypeScript" 20
    "Go" 10
    "Rust" 5

```

</details>

| `emitsSequenceDiagram` | FAIL | 0.47 | 598.4s | 158.7k | 899 | 4 | opener=sequenceDiagram at benchmark/mermaid/sequence-oauth.md (665 chars) — 47% — 4/7 checks · missed: mermaid-form, opener-sequenceDiagram(skipped), elements(skipped) |

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
=== full body (665 chars) ===
sequenceDiagram
    participant User
    participant App
    participant AuthServer as Auth-Server
    participant ResourceServer as Resource-Server

    User->>App: Login Request
    App->>AuthServer: Redirect to Auth-Server (Client ID, Scope, State)
    AuthServer->>User: Prompt for Credentials/Consent
    User->>AuthServer: Provide Credentials & Consent
    AuthServer->>App: Redirect to App with Authorization Code
    App->>AuthServer: Exchange Code for Access Token (Client Secret)
    AuthServer->>App: Return Access Token (& Refresh Token)
    App->>ResourceServer: Request Resource (with Access Token)
    ResourceServer->>App: Return Protected Resource

```

</details>

| `emitsStateDiagram` | FAIL | 0.47 | 350.2s | 158.0k | 485 | 4 | opener=stateDiagram at benchmark/mermaid/state-order.md (260 chars) — 47% — 4/7 checks · missed: mermaid-form, opener-stateDiagram(skipped), elements(skipped) |

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
=== full body (260 chars) ===
$meta.kind: diagram
$meta.title: Order Lifecycle State Diagram

stateDiagram-v2
    [*] --> Created
    Created --> Paid
    Created --> Cancelled
    Paid --> Shipped
    Paid --> Cancelled
    Shipped --> Delivered
    Delivered --> [*]
    Cancelled --> [*]
```

</details>

| `emitsTimelineDiagram` | FAIL | 0.00 | - | - | - | - | HttpTimeoutException: request timed out |
