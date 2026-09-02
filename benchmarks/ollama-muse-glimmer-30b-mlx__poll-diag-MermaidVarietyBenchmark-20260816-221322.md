# Vance Benchmark - ollama-muse-glimmer-30b-mlx__poll-diag-MermaidVarietyBenchmark-20260816-221322

- **Started:** 2026-08-16T22:13:22.749801Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 9
- **Passed:** 3 / 9 (33%)
- **Average score:** 0.333
- **Total LLM time:** 948.4s
- **Total tokens (in / out):** 548.0k / 8.9k (18 round-trips)


## mermaid-variety

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `emitsC4ContextDiagram` | FAIL | 0.00 | 94.7s | 51.2k | 1.1k | 2 | kind=diagram at benchmark/mermaid/c4-notifications.md has neither a ```mermaid fence nor a `source` field — content head: C4Context title Notification System Context Diagram  Person(user, "User") System(notification_api, "Notification API") System_Ext(email_provider, "Email Provider") System_Ext(sms_provider, "SMS Provid… |
| `emitsErDiagram` | OK | 1.00 | 116.8s | 51.3k | 900 | 2 | opener=erDiagram produced at benchmark/mermaid/er-shop.md (611 chars) |
| `emitsGanttDiagram` | OK | 1.00 | 118.9s | 51.2k | 1.8k | 2 | opener=gantt produced at benchmark/mermaid/gantt-onboarding.md (1505 chars) |
| `emitsGitGraph` | FAIL | 0.00 | 130.9s | 51.2k | 1.7k | 2 | kind=diagram at benchmark/mermaid/gitflow.md has neither a ```mermaid fence nor a `source` field — content head: gitGraph commit id: "Initial commit" branch develop commit id: "Setup develop" checkout develop branch feature/login commit id: "Login implementieren" checkout develop merge feature/login id: "Feature… |
| `emitsJourneyDiagram` | FAIL | 0.00 | 93.7s | 40.0k | 416 | 1 | no document at path=benchmark/mermaid/journey-checkout.md (opener=journey) within 120s; kinds in project: [diagram]; paths: [benchmark/mermaid/c4-notifications.md, benchmark/mermaid/er-shop.md, benchmark/mermaid/gantt-onboarding.md, benchmark/mermaid/gitflow.md, benchmark/mermaid/sequence-oauth.md, benchmark/mermaid/state-order.md, notes/welcome.md, specs/deployment-checklist.md] |
| `emitsPieDiagram` | FAIL | 0.00 | 64.7s | 40.0k | 542 | 1 | no document at path=benchmark/mermaid/pie-languages.md (opener=pie) within 120s; kinds in project: [diagram]; paths: [benchmark/mermaid/c4-notifications.md, benchmark/mermaid/state-order.md, notes/welcome.md, specs/deployment-checklist.md] |
| `emitsSequenceDiagram` | OK | 1.00 | 155.5s | 51.2k | 964 | 2 | opener=sequenceDiagram produced at benchmark/mermaid/sequence-oauth.md (800 chars) |
| `emitsStateDiagram` | FAIL | 0.00 | 82.5s | 51.3k | 1.1k | 2 | kind=diagram at benchmark/mermaid/state-order.md has neither a ```mermaid fence nor a `source` field — content head: stateDiagram-v2     [*] --> Created     Created --> Paid : pay     Created --> Cancelled : cancel     Paid --> Shipped : ship     Paid --> Cancelled : cancel     Shipped --> Delivered : deliver     De… |
| `emitsTimelineDiagram` | FAIL | 0.00 | 90.6s | 160.6k | 444 | 4 | no document at path=benchmark/mermaid/timeline-web.md (opener=timeline) within 120s; kinds in project: [diagram]; paths: [benchmark/mermaid/c4-notifications.md, notes/welcome.md, specs/deployment-checklist.md] |
