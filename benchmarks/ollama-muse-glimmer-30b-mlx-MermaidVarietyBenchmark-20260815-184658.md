# Vance Benchmark - ollama-muse-glimmer-30b-mlx-MermaidVarietyBenchmark-20260815-184658

- **Started:** 2026-08-15T18:46:58.175080Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 9
- **Passed:** 4 / 9 (44%)
- **Average score:** 0.444
- **Total LLM time:** 1276.9s
- **Total tokens (in / out):** 1.14M / 9.8k (27 round-trips)


## mermaid-variety

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `emitsC4ContextDiagram` | OK | 1.00 | 177.7s | 87.3k | 1.9k | 4 | opener=C4Context produced at benchmark/mermaid/c4-notifications.md (829 chars) |
| `emitsErDiagram` | FAIL | 0.00 | 50.5s | 61.8k | 906 | 2 | kind=diagram at benchmark/mermaid/er-shop.md has neither a ```mermaid fence nor a `source` field — content head: erDiagram     CUSTOMER \|\|--o{ ORDER : places     ORDER \|\|--o{ ORDER_LINE : contains     ORDER_LINE }o--\|\| PRODUCT : references      CUSTOMER {         string customer_id PK         string name        … |
| `emitsGanttDiagram` | FAIL | 0.00 | 49.2s | 49.3k | 1.0k | 1 | no document at path=benchmark/mermaid/gantt-onboarding.md (opener=gantt) within 120s; kinds in project: [diagram] |
| `emitsGitGraph` | OK | 1.00 | 222.7s | 256.4k | 2.0k | 5 | opener=gitGraph produced at benchmark/mermaid/gitflow.md (994 chars) |
| `emitsJourneyDiagram` | FAIL | 0.00 | 92.0s | 74.3k | 1.4k | 3 | no document at path=benchmark/mermaid/journey-checkout.md (opener=journey) within 120s; kinds in project: [diagram] |
| `emitsPieDiagram` | OK | 1.00 | 272.3s | 306.3k | 1.1k | 6 | opener=pie produced at benchmark/mermaid/pie-languages.md (168 chars) |
| `emitsSequenceDiagram` | FAIL | 0.00 | 35.9s | 49.3k | 479 | 1 | no document at path=benchmark/mermaid/sequence-oauth.md (opener=sequenceDiagram) within 120s; kinds in project: [diagram] |
| `emitsStateDiagram` | OK | 1.00 | 376.7s | 255.3k | 986 | 5 | opener=stateDiagram produced at benchmark/mermaid/state-order.md (224 chars) |
| `emitsTimelineDiagram` | FAIL | 0.00 | - | - | - | - | HttpTimeoutException: request timed out |
