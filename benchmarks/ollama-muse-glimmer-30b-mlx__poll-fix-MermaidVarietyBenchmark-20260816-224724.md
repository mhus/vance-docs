# Vance Benchmark - ollama-muse-glimmer-30b-mlx__poll-fix-MermaidVarietyBenchmark-20260816-224724

- **Started:** 2026-08-16T22:47:24.435396Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 9
- **Passed:** 4 / 9 (44%)
- **Average score:** 0.444
- **Total LLM time:** 1595.5s
- **Total tokens (in / out):** 4.36M / 25.9k (103 round-trips)


## mermaid-variety

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `emitsC4ContextDiagram` | OK | 1.00 | 226.6s | 659.5k | 6.0k | 15 | opener=C4Context produced at benchmark/mermaid/c4-notifications.md (1098 chars) |
| `emitsErDiagram` | FAIL | 0.00 | 426.0s | 871.0k | 4.6k | 20 | kind=diagram at benchmark/mermaid/er-shop.md has neither a ```mermaid fence nor a `source` field — content head: erDiagram     CUSTOMER \|\|--o{ ORDER     ORDER \|\|--o{ ORDERLINE     ORDERLINE }o--\|\| PRODUCT      CUSTOMER {         string customer_id PK         string name         string email         string addres… |
| `emitsGanttDiagram` | OK | 1.00 | 78.9s | 51.3k | 2.0k | 2 | opener=gantt produced at benchmark/mermaid/gantt-onboarding.md (879 chars) |
| `emitsGitGraph` | OK | 1.00 | 39.9s | 51.2k | 1.1k | 2 | opener=gitGraph produced at benchmark/mermaid/gitflow.md (716 chars) |
| `emitsJourneyDiagram` | OK | 1.00 | 90.1s | 51.2k | 973 | 2 | opener=journey produced at benchmark/mermaid/journey-checkout.md (294 chars) |
| `emitsPieDiagram` | FAIL | 0.00 | 231.2s | 857.1k | 3.1k | 20 | kind=diagram at benchmark/mermaid/pie-languages.md has neither a ```mermaid fence nor a `source` field — content head: pie title Sprachen-Verteilung im Team     "Java" : 40     "Python" : 25     "TypeScript" : 20     "Go" : 10     "Rust" : 5  |
| `emitsSequenceDiagram` | FAIL | 0.00 | 53.6s | 51.3k | 1.1k | 2 | kind=diagram at benchmark/mermaid/sequence-oauth.md has neither a ```mermaid fence nor a `source` field — content head: sequenceDiagram     participant User     participant App     participant Auth-Server     participant Resource-Server      User->>App: Requests protected resource     App->>User: Redirect to Auth-Serve… |
| `emitsStateDiagram` | FAIL | 0.00 | 157.8s | 880.4k | 3.1k | 20 | kind=diagram at benchmark/mermaid/state-order.md has neither a ```mermaid fence nor a `source` field — content head: stateDiagram-v2     [*] --> Created     Created --> Paid     Created --> Cancelled     Paid --> Shipped     Paid --> Cancelled     Shipped --> Delivered     Delivered --> [*]     Cancelled --> [*] |
| `emitsTimelineDiagram` | FAIL | 0.00 | 291.4s | 889.6k | 3.9k | 20 | kind=diagram at benchmark/mermaid/timeline-web.md has neither a ```mermaid fence nor a `source` field — content head: timeline     title Web-History Meilensteine      1991 : WWW         Tim Berners-Lee veröffentlicht das World Wide Web      1995 : JavaScript         Brendan Eich erstellt JavaScript bei Netscape      … |
