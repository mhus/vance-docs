# Vance Benchmark - ollama-qwen3.6-35b-MermaidVarietyBenchmark-20260815-181256

- **Started:** 2026-08-15T18:12:56.217840Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 9
- **Passed:** 9 / 9 (100%)
- **Average score:** 0.978
- **Total LLM time:** 520.6s
- **Total tokens (in / out):** 2.98M / 15.9k (57 round-trips)


## mermaid-variety

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `emitsC4ContextDiagram` | OK | 1.00 | 131.4s | 427.7k | 2.3k | 8 | opener=C4Context produced at benchmark/mermaid/c4-notifications.md (2095 chars) |
| `emitsErDiagram` | OK | 1.00 | 20.4s | 200.3k | 959 | 4 | opener=erDiagram produced at benchmark/mermaid/er-shop.md (740 chars) |
| `emitsGanttDiagram` | OK | 1.00 | 165.9s | 368.5k | 3.6k | 7 | opener=gantt produced at benchmark/mermaid/gantt-onboarding.md (2902 chars) |
| `emitsGitGraph` | OK | 1.00 | 17.6s | 199.5k | 810 | 4 | opener=gitGraph produced at benchmark/mermaid/gitflow.md (965 chars) |
| `emitsJourneyDiagram` | OK | 1.00 | 35.5s | 202.6k | 1.9k | 4 | opener=journey produced at benchmark/mermaid/journey-checkout.md (4044 chars) |
| `emitsPieDiagram` | OK | 0.80 | 27.3s | 314.1k | 1.1k | 6 | document at benchmark/mermaid/pie-languages.md is a kind=chart — a valid rendering of a 'pie' chart |
| `emitsSequenceDiagram` | OK | 1.00 | 41.8s | 367.4k | 1.9k | 7 | opener=sequenceDiagram produced at benchmark/mermaid/sequence-oauth.md (1071 chars) |
| `emitsStateDiagram` | OK | 1.00 | 34.8s | 365.7k | 1.5k | 7 | opener=stateDiagram produced at benchmark/mermaid/state-order.md (442 chars) |
| `emitsTimelineDiagram` | OK | 1.00 | 45.9s | 529.4k | 2.0k | 10 | opener=timeline produced at benchmark/mermaid/timeline-web.md (517 chars) |
