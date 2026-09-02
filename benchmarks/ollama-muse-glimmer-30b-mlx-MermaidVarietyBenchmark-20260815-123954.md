# Vance Benchmark - ollama-muse-glimmer-30b-mlx-MermaidVarietyBenchmark-20260815-123954

- **Started:** 2026-08-15T12:39:54.988823Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 9
- **Passed:** 3 / 9 (33%)
- **Average score:** 0.333
- **Total LLM time:** 1202.7s
- **Total tokens (in / out):** 3.64M / 16.1k (73 round-trips)


## mermaid-variety

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `emitsC4ContextDiagram` | FAIL | 0.00 | 78.6s | 61.6k | 1.0k | 2 | document at benchmark/mermaid/c4-notifications.md has kind=text (expected diagram) for opener=C4Context |
| `emitsErDiagram` | FAIL | 0.00 | 50.8s | 61.6k | 1.0k | 2 | kind=diagram at benchmark/mermaid/er-shop.md has neither a ```mermaid fence nor a `source` field — content head: erDiagram     CUSTOMER \|\|--o{ ORDER : places     ORDER \|\|--o{ ORDER_LINE : contains     ORDER_LINE }o--\|\| PRODUCT : references      CUSTOMER {         uuid id PK         string firstName         strin… |
| `emitsGanttDiagram` | FAIL | 0.00 | 35.0s | 99.2k | 1.0k | 2 | document at benchmark/mermaid/gantt-onboarding.md has kind=text (expected diagram) for opener=gantt |
| `emitsGitGraph` | OK | 1.00 | 257.8s | 307.6k | 1.5k | 6 | opener=gitGraph produced at benchmark/mermaid/gitflow.md (1069 chars) |
| `emitsJourneyDiagram` | FAIL | 0.00 | 96.7s | 86.8k | 1.5k | 4 | no document at path=benchmark/mermaid/journey-checkout.md (opener=journey) within 120s; kinds in project: [diagram, text] |
| `emitsPieDiagram` | FAIL | 0.00 | 98.1s | 1.07M | 2.9k | 20 | kind=diagram at benchmark/mermaid/pie-languages.md has neither a ```mermaid fence nor a `source` field — content head: pie title Sprachen-Verteilung im Team   "Java" : 40   "Python" : 25   "TypeScript" : 20   "Go" : 10   "Rust" : 5 |
| `emitsSequenceDiagram` | OK | 1.00 | 174.7s | 203.6k | 1.7k | 4 | opener=sequenceDiagram produced at benchmark/mermaid/sequence-oauth.md (885 chars) |
| `emitsStateDiagram` | OK | 1.00 | 237.6s | 686.3k | 2.8k | 13 | opener=stateDiagram produced at benchmark/mermaid/state-order.md (224 chars) |
| `emitsTimelineDiagram` | FAIL | 0.00 | 173.3s | 1.06M | 2.6k | 20 | kind=diagram at benchmark/mermaid/timeline-web.md has neither a ```mermaid fence nor a `source` field — content head: timeline     title Web History             1991 : WWW             1995 : JavaScript             2008 : Chrome             2014 : ES6             2020 : WebAssembly stable |
