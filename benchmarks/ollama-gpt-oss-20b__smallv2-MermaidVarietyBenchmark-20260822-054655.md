# Vance Benchmark - ollama-gpt-oss-20b__smallv2-MermaidVarietyBenchmark-20260822-054655

- **Started:** 2026-08-22T05:46:55.150253Z
- **Judge:** gemini-gemini-2.5-pro
- **Knobs:** {chatTimeoutS=600, waitBudgetMinS=300}
- **Score model:** v2-graded
- **Total tests:** 9
- **Passed:** 0 / 9 (0%)
- **Average score:** 0.444
- **Total LLM time:** 1622.7s
- **Total tokens (in / out):** 4.65M / 111.3k (129 round-trips)


## mermaid-variety

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `emitsC4ContextDiagram` | FAIL | 0.47 | 107.9s | 205.9k | 7.5k | 6 | opener=C4Context at benchmark/mermaid/c4-notifications.md (618 chars) — 47% — 4/7 checks · missed: mermaid-form, opener-C4Context(skipped), elements(skipped) |

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
=== full body (618 chars) ===
title: C4 Context Diagram for Notification System
diagram: |
  C4Context
    Person(user, "User", "Person using the system.")
    System(notificationAPI, "Notification API", "Handles notifications.")
    System_Ext(emailProvider, "Email Provider", "Sends emails.")
    System_Ext(smsProvider, "SMS Provider", "Sends SMS.")
    System_Ext(pushProvider, "Push Provider", "Sends push notifications.")
    Rel(user, notificationAPI, "Sends notification request")
    Rel(notificationAPI, emailProvider, "Sends email")
    Rel(notificationAPI, smsProvider, "Sends SMS")
    Rel(notificationAPI, pushProvider, "Sends push")

```

</details>

| `emitsErDiagram` | FAIL | 0.47 | 275.3s | 719.4k | 19.4k | 20 | opener=erDiagram at benchmark/mermaid/er-shop.md (122 chars) — 47% — 4/7 checks · missed: mermaid-form, opener-erDiagram(skipped), elements(skipped) |

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
=== full body (122 chars) ===
erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--o{ ORDERLINE : contains
    ORDERLINE }o--|| PRODUCT : contains
```

</details>

| `emitsGanttDiagram` | FAIL | 0.47 | 49.9s | 206.1k | 2.9k | 6 | opener=gantt at benchmark/mermaid/gantt-onboarding.md (390 chars) — 47% — 4/7 checks · missed: mermaid-form, opener-gantt(skipped), elements(skipped) |

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
=== full body (390 chars) ===
---
$meta:
  kind: diagram
---
gantt
    title Onboarding Gantt
    dateFormat  YYYY-MM-DD
    section Setup
    Welcome & Accounts :a1, 2026-08-22, 2d
    Tool Setup :a2, 2026-08-24, 1d
    section Domain-Intro
    Intro to Domain :b1, 2026-08-23, 3d
    Deep Dive :b2, 2026-08-26, 2d
    section Pairing
    Pairing Session 1 :c1, 2026-08-25, 1d
    Pairing Session 2 :c2, 2026-08-27, 1d

```

</details>

| `emitsGitGraph` | FAIL | 0.47 | 173.9s | 463.4k | 10.9k | 13 | opener=gitGraph at benchmark/mermaid/gitflow.md (485 chars) — 47% — 4/7 checks · missed: mermaid-form, opener-gitGraph(skipped), elements(skipped) |

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
=== full body (485 chars) ===
diagram: |
  gitGraph
    commit id: "main" msg: "Initial commit"
    branch develop
    commit id: "develop" msg: "Setup develop"
    branch feature/login
    commit id: "feature/login" msg: "Add login feature"
    merge develop
    commit id: "develop" msg: "Merge login"
    branch release/v1.0
    commit id: "release/v1.0" msg: "Prepare release 1.0"
    merge develop
    commit id: "develop" msg: "Merge release"
    merge main
    commit id: "main" msg: "Merge release to main"

```

</details>

| `emitsJourneyDiagram` | FAIL | 0.47 | 278.0s | 721.7k | 19.6k | 20 | opener=journey at benchmark/mermaid/journey-checkout.md (225 chars) — 47% — 4/7 checks · missed: mermaid-form, opener-journey(skipped), elements(skipped) |

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
=== full body (225 chars) ===
journey
  title Online Kauf Journey
  section Browsen
    Entdecken: 0.8
  section Auswählen
    Auswahl: 0.9
  section Warenkorb
    Hinzufügen: 0.7
  section Checkout
    Überprüfung: 0.5
  section Bezahlen
    Zahlung: 0.6
```

</details>

| `emitsPieDiagram` | FAIL | 0.47 | 214.0s | 714.6k | 15.0k | 20 | opener=pie at benchmark/mermaid/pie-languages.md (141 chars) — 47% — 4/7 checks · missed: mermaid-form, opener-pie(skipped), elements(skipped) |

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
=== full body (141 chars) ===
---
kind: diagram
---
pie title "Language Distribution"
    "Java" : 40
    "Python" : 25
    "TypeScript" : 20
    "Go" : 10
    "Rust" : 5

```

</details>

| `emitsSequenceDiagram` | FAIL | 0.47 | 307.0s | 758.2k | 20.9k | 20 | opener=sequenceDiagram at benchmark/mermaid/sequence-oauth.md (789 chars) — 47% — 4/7 checks · missed: mermaid-form, opener-sequenceDiagram(skipped), elements(skipped) |

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
=== full body (789 chars) ===
---
title: OAuth 2.0 Login Flow
kind: diagram
---
sequenceDiagram
    participant User
    participant App
    participant AuthServer as Auth-Server
    participant ResourceServer as Resource-Server

    User->>App: Open App
    App->>AuthServer: Redirect to /authorize?client_id=APP_ID&redirect_uri=APP_URI&response_type=code
    User->>AuthServer: Authenticate (login)
    AuthServer->>User: Authorization Prompt
    User->>AuthServer: Grant Permission
    AuthServer->>App: Redirect with ?code=AUTH_CODE
    App->>AuthServer: POST /token?grant_type=authorization_code&code=AUTH_CODE&redirect_uri=APP_URI
    AuthServer->>App: {access_token, token_type, expires_in, refresh_token}
    App->>ResourceServer: GET /resource?access_token=ACCESS_TOKEN
    ResourceServer->>App: Resource Data

```

</details>

| `emitsStateDiagram` | FAIL | 0.47 | 178.6s | 723.2k | 12.7k | 20 | opener=stateDiagram at benchmark/mermaid/state-order.md (250 chars) — 47% — 4/7 checks · missed: mermaid-form, opener-stateDiagram(skipped), elements(skipped) |

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
=== full body (250 chars) ===
$meta:
  kind: diagram
  diagram: mermaid
content: |
  stateDiagram
    [*] --> Created
    Created --> Paid : Payment
    Created --> Cancelled : Cancel
    Paid --> Shipped : Ship
    Paid --> Cancelled : Cancel
    Shipped --> Delivered : Deliver

```

</details>

| `emitsTimelineDiagram` | FAIL | 0.27 | 38.0s | 135.4k | 2.5k | 4 | opener=timeline at benchmark/mermaid/timeline-web.md (0 chars) — 27% — 2/7 checks · missed: kind-diagram, body-not-empty(skipped), mermaid-form(skipped), opener-timeline(skipped), elements(skipped) |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-at-path` | stage | 1.00 | 1.00 | benchmark/mermaid/timeline-web.md |
| `kind-diagram` | stage | 0.00 | 1.00 | kind=text |
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

