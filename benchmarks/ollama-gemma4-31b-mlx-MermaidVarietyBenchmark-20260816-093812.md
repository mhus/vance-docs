# Vance Benchmark - ollama-gemma4-31b-mlx-MermaidVarietyBenchmark-20260816-093812

- **Started:** 2026-08-16T09:38:12.527924Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 9
- **Passed:** 4 / 9 (44%)
- **Average score:** 0.444
- **Total LLM time:** 1975.1s
- **Total tokens (in / out):** 837.0k / 4.0k (26 round-trips)


## mermaid-variety

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `emitsC4ContextDiagram` | OK | 1.00 | 41.2s | 48.5k | 481 | 2 | opener=C4Context produced at benchmark/mermaid/c4-notifications.md (892 chars) |
| `emitsErDiagram` | FAIL | 0.00 | 71.8s | 48.5k | 229 | 2 | kind=diagram at benchmark/mermaid/er-shop.md has neither a ```mermaid fence nor a `source` field — content head: erDiagram     Customer \|\|--o{ Order : places     Order \|\|--\|{ OrderLine : contains     Product \|\|--o{ OrderLine : included_in  |
| `emitsGanttDiagram` | OK | 1.00 | 76.0s | 48.5k | 693 | 2 | opener=gantt produced at benchmark/mermaid/gantt-onboarding.md (644 chars) |
| `emitsGitGraph` | FAIL | 0.00 | 188.1s | 49.6k | 458 | 2 | kind=diagram at benchmark/mermaid/gitflow.md has neither a ```mermaid fence nor a `source` field — content head: gitGraph     commit id: "Initial"     branch develop     checkout develop     commit id: "Dev Start"     branch feature-1     checkout feature-1     commit id: "f1-1"     commit id: "f1-2"     checkou… |
| `emitsJourneyDiagram` | FAIL | 0.00 | 225.4s | 38.2k | 143 | 1 | no document at path=benchmark/mermaid/journey-checkout.md (opener=journey) within 120s; kinds in project: [diagram] |
| `emitsPieDiagram` | OK | 1.00 | 510.5s | 273.2k | 681 | 7 | opener=pie produced at benchmark/mermaid/pie-languages.md (137 chars) |
| `emitsSequenceDiagram` | FAIL | 0.00 | 272.2s | 48.6k | 590 | 2 | kind=diagram at benchmark/mermaid/sequence-oauth.md has neither a ```mermaid fence nor a `source` field — content head: sequenceDiagram     participant User     participant App     participant AuthServer as Auth-Server     participant ResourceServer as Resource-Server      User->>App: Request access/login     App->>Use… |
| `emitsStateDiagram` | OK | 1.00 | 52.2s | 48.5k | 246 | 2 | opener=stateDiagram produced at benchmark/mermaid/state-order.md (211 chars) |
| `emitsTimelineDiagram` | FAIL | 0.00 | 537.6s | 233.4k | 490 | 6 | kind=diagram at benchmark/mermaid/timeline-web.md has neither a ```mermaid fence nor a `source` field — content head: timeline     1991 : WWW     1995 : JavaScript     2008 : Chrome     2014 : ES6     2020 : WebAssembly stable |
