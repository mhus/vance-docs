# Vance Benchmark - ollama-gpt-oss-20b-MermaidVarietyBenchmark-20260816-153101

- **Started:** 2026-08-16T15:31:01.424616Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 9
- **Passed:** 1 / 9 (11%)
- **Average score:** 0.111
- **Total LLM time:** 2239.1s
- **Total tokens (in / out):** 5.72M / 137.6k (161 round-trips)


## mermaid-variety

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `emitsC4ContextDiagram` | FAIL | 0.00 | 117.6s | 304.6k | 4.7k | 9 | kind=diagram at benchmark/mermaid/c4-notifications.md has neither a ```mermaid fence nor a `source` field — content head: --- title: Notification System Context --- c4Context     title Notification System Context     Person(user, "User", "Uses the Notification API to receive updates via various channels.")     System_Bou… |
| `emitsErDiagram` | FAIL | 0.00 | 236.8s | 697.8k | 15.6k | 20 | kind=diagram at benchmark/mermaid/er-shop.md has neither a ```mermaid fence nor a `source` field — content head: erDiagram   CUSTOMER \|\|--o{ ORDER : places   ORDER \|\|--o{ ORDERLINE : contains   ORDERLINE }o--\|\| PRODUCT : references |
| `emitsGanttDiagram` | FAIL | 0.00 | 205.9s | 534.9k | 12.1k | 15 | kind=diagram at benchmark/mermaid/gantt-onboarding.md has neither a ```mermaid fence nor a `source` field — content head: --- kind: diagram --- gantt     title Einwöchiges Onboarding     dateFormat  YYYY-MM-DD     section Setup     Installieren von Tools          :a1, 2024-08-20, 1d     Accounts erstellen              :a… |
| `emitsGitGraph` | FAIL | 0.00 | 190.2s | 700.9k | 12.4k | 20 | kind=diagram at benchmark/mermaid/gitflow.md has neither a ```mermaid fence nor a `source` field — content head: --- kind: diagram title: GitFlow Diagram ---  gitGraph   commit id:main tag:main   branch develop   commit id:develop tag:develop   branch feature/xyz   commit id:feature-xyz   branch feature/xyz2   c… |
| `emitsJourneyDiagram` | OK | 1.00 | 516.1s | 818.2k | 35.3k | 23 | opener=journey produced at benchmark/mermaid/journey-checkout.md (316 chars) |
| `emitsPieDiagram` | FAIL | 0.00 | 271.9s | 1.10M | 14.8k | 30 | kind=diagram at benchmark/mermaid/pie-languages.md has neither a ```mermaid fence nor a `source` field — content head: --- kind: diagram --- pie     title "Language distribution"     "Java" : 40     "Python" : 25     "TypeScript" : 20     "Go" : 10     "Rust" : 5 |
| `emitsSequenceDiagram` | FAIL | 0.00 | 330.6s | 698.0k | 18.8k | 19 | kind=diagram at benchmark/mermaid/sequence-oauth.md has neither a ```mermaid fence nor a `source` field — content head: kind: diagram diagram: \|   sequenceDiagram     participant U as User     participant A as App     participant AS as Auth-Server     participant RS as Resource-Server      U->>A: Opens app     A->>AS: … |
| `emitsStateDiagram` | FAIL | 0.00 | 33.7s | 165.9k | 1.9k | 5 | kind=diagram at benchmark/mermaid/state-order.md has neither a ```mermaid fence nor a `source` field — content head: diagram: \|   stateDiagram-v2   [*] --> Created   Created --> Paid   Created --> Cancelled   Paid --> Shipped   Paid --> Cancelled   Shipped --> Delivered |
| `emitsTimelineDiagram` | FAIL | 0.00 | 336.2s | 708.4k | 22.0k | 20 | kind=diagram at benchmark/mermaid/timeline-web.md has neither a ```mermaid fence nor a `source` field — content head: timeline     title Web History Timeline     1991 : World Wide Web invented     1995 : JavaScript released     2008 : Chrome launched     2014 : ES6 (ECMAScript 2015) released     2020 : WebAssembly st… |
