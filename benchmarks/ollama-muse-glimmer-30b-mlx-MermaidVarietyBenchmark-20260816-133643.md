# Vance Benchmark - ollama-muse-glimmer-30b-mlx-MermaidVarietyBenchmark-20260816-133643

- **Started:** 2026-08-16T13:36:43.601148Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 9
- **Passed:** 4 / 9 (44%)
- **Average score:** 0.444
- **Total LLM time:** 1233.1s
- **Total tokens (in / out):** 569.7k / 6.8k (20 round-trips)


## mermaid-variety

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `emitsC4ContextDiagram` | OK | 1.00 | 108.1s | 74.1k | 1.6k | 4 | opener=C4Context produced at benchmark/mermaid/c4-notifications.md (803 chars) |
| `emitsErDiagram` | OK | 1.00 | 195.3s | 62.5k | 1.0k | 3 | opener=erDiagram produced at benchmark/mermaid/er-shop.md (539 chars) |
| `emitsGanttDiagram` | OK | 1.00 | 121.0s | 51.0k | 1.3k | 2 | opener=gantt produced at benchmark/mermaid/gantt-onboarding.md (1113 chars) |
| `emitsGitGraph` | FAIL | 0.00 | 91.1s | 39.7k | 389 | 1 | no document at path=benchmark/mermaid/gitflow.md (opener=gitGraph) within 120s; kinds in project: [diagram] |
| `emitsJourneyDiagram` | OK | 1.00 | 305.3s | 51.0k | 1.1k | 2 | opener=journey produced at benchmark/mermaid/journey-checkout.md (648 chars) |
| `emitsPieDiagram` | FAIL | 0.00 | - | - | - | - | HttpTimeoutException: request timed out |
| `emitsSequenceDiagram` | FAIL | 0.00 | - | - | - | - | HttpTimeoutException: request timed out |
| `emitsStateDiagram` | FAIL | 0.00 | 87.9s | 51.2k | 895 | 2 | kind=diagram at benchmark/mermaid/state-order.md has neither a ```mermaid fence nor a `source` field — content head: stateDiagram-v2     [*] --> Created     Created --> Paid     Created --> Cancelled     Paid --> Shipped     Paid --> Cancelled     Shipped --> Delivered     Delivered --> [*]  |
| `emitsTimelineDiagram` | FAIL | 0.00 | 324.5s | 240.4k | 452 | 6 | no document at path=benchmark/mermaid/timeline-web.md (opener=timeline) within 120s; kinds in project: [diagram] |
