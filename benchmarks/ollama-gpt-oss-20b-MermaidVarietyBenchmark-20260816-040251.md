# Vance Benchmark - ollama-gpt-oss-20b-MermaidVarietyBenchmark-20260816-040251

- **Started:** 2026-08-16T04:02:51.377355Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 9
- **Passed:** 4 / 9 (44%)
- **Average score:** 0.444
- **Total LLM time:** 2427.4s
- **Total tokens (in / out):** 5.77M / 157.5k (163 round-trips)


## mermaid-variety

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `emitsC4ContextDiagram` | OK | 1.00 | 214.3s | 486.9k | 14.2k | 14 | opener=C4Context produced at benchmark/mermaid/c4-notifications.md (604 chars) |
| `emitsErDiagram` | FAIL | 0.00 | 445.6s | 771.2k | 29.8k | 22 | kind=diagram at benchmark/mermaid/er-shop.md has neither a ```mermaid fence nor a `source` field — content head: erDiagram   CUSTOMER \|\|--o{ ORDER : "places"   ORDER \|\|--o{ ORDERLINE : "contains"   ORDERLINE }o--\|\| PRODUCT : "references"  |
| `emitsGanttDiagram` | OK | 1.00 | 283.2s | 721.1k | 18.1k | 20 | opener=gantt produced at benchmark/mermaid/gantt-onboarding.md (392 chars) |
| `emitsGitGraph` | FAIL | 0.00 | 400.1s | 710.7k | 26.3k | 20 | kind=diagram at benchmark/mermaid/gitflow.md has neither a ```mermaid fence nor a `source` field — content head: gitGraph   commit   branch develop   commit   commit   checkout develop   commit   branch release/1.0   commit   merge feature/awesome   commit   checkout main   merge release/1.0   commit  |
| `emitsJourneyDiagram` | OK | 1.00 | 271.1s | 714.6k | 17.2k | 20 | opener=journey produced at benchmark/mermaid/journey-checkout.md (372 chars) |
| `emitsPieDiagram` | FAIL | 0.00 | 275.9s | 706.6k | 17.8k | 20 | kind=diagram at benchmark/mermaid/pie-languages.md has neither a ```mermaid fence nor a `source` field — content head: pie:   title: Languages   Java: 40   Python: 25   TypeScript: 20   Go: 10   Rust: 5 |
| `emitsSequenceDiagram` | OK | 1.00 | 219.4s | 728.7k | 13.7k | 20 | opener=sequenceDiagram produced at benchmark/mermaid/sequence-oauth.md (638 chars) |
| `emitsStateDiagram` | FAIL | 0.00 | 25.6s | 199.9k | 1.2k | 6 | kind=diagram at benchmark/mermaid/state-order.md has neither a ```mermaid fence nor a `source` field — content head: --- title: Order Lifecycle kind: diagram --- stateDiagram-v2     [*] --> Created     Created --> Paid     Created --> Cancelled     Paid --> Shipped     Paid --> Cancelled     Shipped --> Delivered   … |
| `emitsTimelineDiagram` | FAIL | 0.00 | 292.1s | 732.2k | 18.9k | 21 | kind=diagram at benchmark/mermaid/timeline-web.md has neither a ```mermaid fence nor a `source` field — content head: timeline     title Web History     1991::WWW     1995::JavaScript     2008::Chrome     2014::ES6     2020::WebAssembly stable  |
