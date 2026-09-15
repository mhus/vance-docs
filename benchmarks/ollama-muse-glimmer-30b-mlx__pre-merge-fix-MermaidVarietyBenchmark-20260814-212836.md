# Vance Benchmark - ollama-muse-glimmer-30b-mlx__pre-merge-fix-MermaidVarietyBenchmark-20260814-212836

- **Started:** 2026-08-14T21:28:36.608144Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 9
- **Passed:** 0 / 9 (0%)
- **Average score:** 0.000
- **Total LLM time:** 3076.6s
- **Total tokens (in / out):** 1.40M / 10.6k (19 round-trips)


## mermaid-variety

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `emitsC4ContextDiagram` | FAIL | 0.00 | 303.5s | 188.8k | 1.8k | 3 | no document at path=benchmark/mermaid/c4-notifications.md (opener=C4Context) within 120s; kinds in project: [] |
| `emitsErDiagram` | FAIL | 0.00 | 382.9s | 188.9k | 1.3k | 3 | no document at path=benchmark/mermaid/er-shop.md (opener=erDiagram) within 120s; kinds in project: [text] |
| `emitsGanttDiagram` | FAIL | 0.00 | 156.7s | 155.3k | 1.6k | 2 | no document at path=benchmark/mermaid/gantt-onboarding.md (opener=gantt) within 120s; kinds in project: [text] |
| `emitsGitGraph` | FAIL | 0.00 | 384.8s | 155.1k | 1.6k | 2 | document at benchmark/mermaid/gitflow.md has kind=text (expected diagram) for opener=gitGraph |
| `emitsJourneyDiagram` | FAIL | 0.00 | 428.0s | 155.1k | 728 | 2 | no document at path=benchmark/mermaid/journey-checkout.md (opener=journey) within 120s; kinds in project: [diagram, text] |
| `emitsPieDiagram` | FAIL | 0.00 | 387.1s | 155.3k | 1.0k | 2 | document at benchmark/mermaid/pie-languages.md has kind=text (expected diagram) for opener=pie |
| `emitsSequenceDiagram` | FAIL | 0.00 | 539.5s | 121.5k | 681 | 1 | no document at path=benchmark/mermaid/sequence-oauth.md (opener=sequenceDiagram) within 120s; kinds in project: [text] |
| `emitsStateDiagram` | FAIL | 0.00 | 385.4s | 122.4k | 1.1k | 2 | no document at path=benchmark/mermaid/state-order.md (opener=stateDiagram) within 120s; kinds in project: [text] |
| `emitsTimelineDiagram` | FAIL | 0.00 | 108.8s | 155.1k | 887 | 2 | document at benchmark/mermaid/timeline-web.md has kind=text (expected diagram) for opener=timeline |
