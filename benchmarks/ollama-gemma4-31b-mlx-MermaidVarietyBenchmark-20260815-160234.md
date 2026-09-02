# Vance Benchmark - ollama-gemma4-31b-mlx-MermaidVarietyBenchmark-20260815-160234

- **Started:** 2026-08-15T16:02:34.503038Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 9
- **Passed:** 3 / 9 (33%)
- **Average score:** 0.333
- **Total LLM time:** 1909.7s
- **Total tokens (in / out):** 2.65M / 7.5k (52 round-trips)


## mermaid-variety

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `emitsC4ContextDiagram` | FAIL | 0.00 | 227.9s | 305.5k | 1.4k | 6 | document at benchmark/mermaid/c4-notifications.md has kind=text (expected diagram) for opener=C4Context |
| `emitsErDiagram` | OK | 1.00 | 326.3s | 352.3k | 795 | 7 | opener=erDiagram produced at benchmark/mermaid/er-shop.md (140 chars) |
| `emitsGanttDiagram` | FAIL | 0.00 | 234.2s | 305.3k | 1.3k | 6 | document at benchmark/mermaid/gantt-onboarding.md has kind=text (expected diagram) for opener=gantt |
| `emitsGitGraph` | OK | 1.00 | 257.8s | 367.7k | 1.2k | 7 | opener=gitGraph produced at benchmark/mermaid/gitflow.md (488 chars) |
| `emitsJourneyDiagram` | FAIL | 0.00 | 232.9s | 304.3k | 853 | 6 | document at benchmark/mermaid/journey-checkout.md has kind=text (expected diagram) for opener=journey |
| `emitsPieDiagram` | FAIL | 0.00 | 181.8s | 352.3k | 582 | 7 | kind=diagram at benchmark/mermaid/pie-languages.md has neither a ```mermaid fence nor a `source` field — content head: pie title Sprachen-Verteilung im Team     "Java" : 40     "Python" : 25     "TypeScript" : 20     "Go" : 10     "Rust" : 5 |
| `emitsSequenceDiagram` | FAIL | 0.00 | - | - | - | - | HttpTimeoutException: request timed out |
| `emitsStateDiagram` | OK | 1.00 | 224.2s | 303.4k | 744 | 6 | opener=stateDiagram produced at benchmark/mermaid/state-order.md (231 chars) |
| `emitsTimelineDiagram` | FAIL | 0.00 | 224.5s | 363.6k | 759 | 7 | document at benchmark/mermaid/timeline-web.md has kind=text (expected diagram) for opener=timeline |
