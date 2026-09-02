# Vance Benchmark - ollama-muse-glimmer-30b-mlx__small-v2-MermaidVarietyBenchmark-20260816-201419

- **Started:** 2026-08-16T20:14:19.290197Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 9
- **Passed:** 2 / 9 (22%)
- **Average score:** 0.222
- **Total LLM time:** 961.0s
- **Total tokens (in / out):** 421.9k / 7.1k (17 round-trips)


## mermaid-variety

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `emitsC4ContextDiagram` | FAIL | 0.00 | 124.6s | 74.4k | 1.1k | 4 | no document at path=benchmark/mermaid/c4-notifications.md (opener=C4Context) within 120s; kinds in project: [] |
| `emitsErDiagram` | FAIL | 0.00 | 71.5s | 51.3k | 879 | 2 | kind=diagram at benchmark/mermaid/er-shop.md has neither a ```mermaid fence nor a `source` field — content head: erDiagram     CUSTOMER \|\|--o{ ORDER : places     ORDER \|\|--o{ ORDERLINE : contains     PRODUCT \|\|--o{ ORDERLINE : "is part of"      CUSTOMER {         string customer_id PK         string name        … |
| `emitsGanttDiagram` | OK | 1.00 | 157.1s | 51.2k | 2.0k | 2 | opener=gantt produced at benchmark/mermaid/gantt-onboarding.md (1049 chars) |
| `emitsGitGraph` | FAIL | 0.00 | 136.4s | 62.6k | 666 | 3 | no document at path=benchmark/mermaid/gitflow.md (opener=gitGraph) within 120s; kinds in project: [diagram] |
| `emitsJourneyDiagram` | FAIL | 0.00 | 171.6s | 40.0k | 443 | 1 | no document at path=benchmark/mermaid/journey-checkout.md (opener=journey) within 120s; kinds in project: [diagram] |
| `emitsPieDiagram` | FAIL | 0.00 | - | - | - | - | HttpTimeoutException: request timed out |
| `emitsSequenceDiagram` | FAIL | 0.00 | 156.8s | 40.0k | 599 | 1 | no document at path=benchmark/mermaid/sequence-oauth.md (opener=sequenceDiagram) within 120s; kinds in project: [diagram] |
| `emitsStateDiagram` | FAIL | 0.00 | 37.4s | 51.2k | 681 | 2 | kind=diagram at benchmark/mermaid/state-order.md has neither a ```mermaid fence nor a `source` field — content head: stateDiagram-v2     [*] --> Created     Created --> Paid     Created --> Cancelled     Paid --> Shipped     Paid --> Cancelled     Shipped --> Delivered     Delivered --> [*]     Cancelled --> [*]  |
| `emitsTimelineDiagram` | OK | 1.00 | 105.8s | 51.2k | 755 | 2 | opener=timeline produced at benchmark/mermaid/timeline-web.md (145 chars) |
