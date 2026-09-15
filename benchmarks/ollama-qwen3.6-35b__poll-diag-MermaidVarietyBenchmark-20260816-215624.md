# Vance Benchmark - ollama-qwen3.6-35b__poll-diag-MermaidVarietyBenchmark-20260816-215624

- **Started:** 2026-08-16T21:56:24.091164Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 9
- **Passed:** 8 / 9 (89%)
- **Average score:** 0.889
- **Total LLM time:** 764.9s
- **Total tokens (in / out):** 3.28M / 25.9k (77 round-trips)


## mermaid-variety

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `emitsC4ContextDiagram` | OK | 1.00 | 76.7s | 296.8k | 3.4k | 7 | opener=C4Context produced at benchmark/mermaid/c4-notifications.md (2488 chars) |
| `emitsErDiagram` | FAIL | 0.00 | 96.3s | 201.0k | 1.5k | 5 | no document at path=benchmark/mermaid/er-shop.md (opener=erDiagram) within 120s; kinds in project: [diagram]; paths: [benchmark/mermaid/c4-notifications.md, benchmark/mermaid/gantt-onboarding.md, benchmark/mermaid/pie-languages.md, benchmark/mermaid/state-order.md, benchmark/mermaid/timeline-web-new.md, benchmark/mermaid/timeline-web.md, notes/welcome.md, specs/deployment-checklist.md] |
| `emitsGanttDiagram` | OK | 1.00 | 15.3s | 120.1k | 827 | 3 | opener=gantt produced at benchmark/mermaid/gantt-onboarding.md (939 chars) |
| `emitsGitGraph` | OK | 1.00 | 57.1s | 326.9k | 1.9k | 8 | opener=gitGraph produced at benchmark/mermaid/gitflow.md (835 chars) |
| `emitsJourneyDiagram` | OK | 1.00 | 107.9s | 352.8k | 7.0k | 8 | opener=journey produced at benchmark/mermaid/journey-checkout.md (3586 chars) |
| `emitsPieDiagram` | OK | 1.00 | 35.5s | 505.4k | 1.5k | 12 | opener=pie produced at benchmark/mermaid/pie-languages.md (174 chars) |
| `emitsSequenceDiagram` | OK | 1.00 | 31.3s | 338.0k | 1.9k | 8 | opener=sequenceDiagram produced at benchmark/mermaid/sequence-oauth.md (1147 chars) |
| `emitsStateDiagram` | OK | 1.00 | 53.8s | 244.3k | 1.4k | 6 | opener=stateDiagram produced at benchmark/mermaid/state-order.md (812 chars) |
| `emitsTimelineDiagram` | OK | 1.00 | 290.9s | 896.4k | 6.4k | 20 | opener=timeline produced at benchmark/mermaid/timeline-web.md (1443 chars) |
