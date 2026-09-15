# Vance Benchmark - ollama-qwen3.6-35b__large-tier-MermaidVarietyBenchmark-20260816-001110

- **Started:** 2026-08-16T00:11:10.323621Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 9
- **Passed:** 7 / 9 (78%)
- **Average score:** 0.778
- **Total LLM time:** 585.3s
- **Total tokens (in / out):** 3.75M / 23.8k (70 round-trips)


## mermaid-variety

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `emitsC4ContextDiagram` | OK | 1.00 | 71.9s | 258.8k | 1.9k | 5 | opener=C4Context produced at benchmark/mermaid/c4-notifications.md (1015 chars) |
| `emitsErDiagram` | OK | 1.00 | 33.0s | 361.8k | 1.4k | 7 | opener=erDiagram produced at benchmark/mermaid/er-shop.md (606 chars) |
| `emitsGanttDiagram` | FAIL | 0.00 | 296.9s | 1.17M | 12.3k | 20 | kind=diagram at benchmark/mermaid/gantt-onboarding.md has neither a ```mermaid fence nor a `source` field — content head: # Gantt-Plan: Ein-wöchiges Onboarding  ## Overview  Drei Tracks über 5 Tage (Mo–Fr): **Setup**, **Domain-Intro** und **Pairing**.  ---  ## Mermaid Gantt-Diagramm  gantt     title Einwöchiges Onboardin… |
| `emitsGitGraph` | OK | 1.00 | 37.8s | 364.1k | 1.7k | 7 | opener=gitGraph produced at benchmark/mermaid/gitflow.md (1016 chars) |
| `emitsJourneyDiagram` | OK | 1.00 | 31.1s | 204.7k | 1.4k | 4 | opener=journey produced at benchmark/mermaid/journey-checkout.md (750 chars) |
| `emitsPieDiagram` | FAIL | 0.00 | 44.7s | 615.1k | 2.1k | 12 | kind=diagram at benchmark/mermaid/pie-languages.md has neither a ```mermaid fence nor a `source` field — content head: # Sprachen-Verteilung im Team  pie showTitle     "Java" : 40     "Python" : 25     "TypeScript" : 20     "Go" : 10     "Rust" : 5  |
| `emitsSequenceDiagram` | OK | 1.00 | 23.1s | 201.8k | 866 | 4 | opener=sequenceDiagram produced at benchmark/mermaid/sequence-oauth.md (1305 chars) |
| `emitsStateDiagram` | OK | 1.00 | 24.2s | 256.7k | 1.1k | 5 | opener=stateDiagram produced at benchmark/mermaid/state-order.md (604 chars) |
| `emitsTimelineDiagram` | OK | 1.00 | 22.7s | 308.6k | 982 | 6 | opener=timeline produced at benchmark/mermaid/timeline-web.md (352 chars) |
