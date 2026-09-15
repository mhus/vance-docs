# Vance Benchmark - ollama-gpt-oss-20b__large-tier-MermaidVarietyBenchmark-20260816-175407

- **Started:** 2026-08-16T17:54:07.454817Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 9
- **Passed:** 3 / 9 (33%)
- **Average score:** 0.333
- **Total LLM time:** 839.3s
- **Total tokens (in / out):** 3.53M / 42.2k (79 round-trips)


## mermaid-variety

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `emitsC4ContextDiagram` | FAIL | 0.00 | 49.5s | 215.4k | 2.5k | 5 | kind=diagram at benchmark/mermaid/c4-notifications.md has neither a ```mermaid fence nor a `source` field — content head: $meta:   kind: diagram diagram:   type: mermaid   content: \|     C4Context       title Notification System       Person(user, "User", "A user of the system")       System_Boundary(notification_system,… |
| `emitsErDiagram` | FAIL | 0.00 | 81.8s | 258.5k | 2.5k | 6 | kind=diagram at benchmark/mermaid/er-shop.md has neither a ```mermaid fence nor a `source` field — content head: $meta:   kind: diagram  diagram:   type: mermaid   code: \|     erDiagram       CUSTOMER \|\|--o{ ORDER : places       ORDER \|\|--o{ ORDERLINE : contains       ORDERLINE }o--\|\| PRODUCT : includes  |
| `emitsGanttDiagram` | FAIL | 0.00 | 75.0s | 303.1k | 3.7k | 7 | kind=diagram at benchmark/mermaid/gantt-onboarding.md has neither a ```mermaid fence nor a `source` field — content head: $meta:   kind: diagram diagram: \|   gantt     title Onboarding Week     dateFormat  YYYY-MM-DD     axisFormat  %d %b     section Setup     Initial Setup :a1, 2026-08-21, 2d     Environment Prep :a2, a… |
| `emitsGitGraph` | OK | 1.00 | 51.2s | 302.4k | 2.7k | 7 | opener=gitGraph produced at benchmark/mermaid/gitflow.md (336 chars) |
| `emitsJourneyDiagram` | OK | 1.00 | 237.3s | 829.2k | 12.2k | 18 | opener=journey produced at benchmark/mermaid/journey-checkout.md (328 chars) |
| `emitsPieDiagram` | OK | 1.00 | 213.6s | 931.3k | 11.3k | 20 | opener=pie produced at benchmark/mermaid/pie-languages.md (134 chars) |
| `emitsSequenceDiagram` | FAIL | 0.00 | 44.6s | 260.9k | 2.3k | 6 | kind=diagram at benchmark/mermaid/sequence-oauth.md has neither a ```mermaid fence nor a `source` field — content head: $meta:   kind: diagram  diagram: \|   sequenceDiagram     participant U as User     participant A as App     participant AS as Auth-Server     participant RS as Resource-Server      U->>A: Click "Login… |
| `emitsStateDiagram` | FAIL | 0.00 | 32.4s | 214.7k | 1.9k | 5 | kind=diagram at benchmark/mermaid/state-order.md has neither a ```mermaid fence nor a `source` field — content head: $meta:   kind: diagram  diagram: \|   stateDiagram-v2     [*] --> Created     Created --> Paid     Created --> Cancelled     Paid --> Shipped     Paid --> Cancelled     Shipped --> Delivered     Delive… |
| `emitsTimelineDiagram` | FAIL | 0.00 | 53.9s | 214.6k | 3.0k | 5 | kind=diagram at benchmark/mermaid/timeline-web.md has neither a ```mermaid fence nor a `source` field — content head: $meta:   kind: diagram  diagram: \|   timeline     title Web History     1991 : World Wide Web     1995 : JavaScript     2008 : Chrome     2014 : ES6     2020 : WebAssembly stable  |
