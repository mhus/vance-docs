# Vance Benchmark - ollama-muse-glimmer-30b-mlx__large-tier-MermaidVarietyBenchmark-20260816-022752

- **Started:** 2026-08-16T02:27:52.302532Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 9
- **Passed:** 5 / 9 (56%)
- **Average score:** 0.556
- **Total LLM time:** 1604.8s
- **Total tokens (in / out):** 1.71M / 11.7k (39 round-trips)


## mermaid-variety

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `emitsC4ContextDiagram` | FAIL | 0.00 | 125.6s | 87.1k | 1.7k | 4 | no document at path=benchmark/mermaid/c4-notifications.md (opener=C4Context) within 120s; kinds in project: [] |
| `emitsErDiagram` | FAIL | 0.00 | 192.3s | 74.3k | 1.3k | 3 | no document at path=benchmark/mermaid/er-shop.md (opener=erDiagram) within 120s; kinds in project: [diagram] |
| `emitsGanttDiagram` | OK | 1.00 | 77.1s | 61.9k | 1.7k | 2 | opener=gantt produced at benchmark/mermaid/gantt-onboarding.md (1327 chars) |
| `emitsGitGraph` | FAIL | 0.00 | 99.2s | 49.3k | 525 | 1 | no document at path=benchmark/mermaid/gitflow.md (opener=gitGraph) within 120s; kinds in project: [diagram] |
| `emitsJourneyDiagram` | OK | 1.00 | 95.4s | 61.8k | 1.1k | 2 | opener=journey produced at benchmark/mermaid/journey-checkout.md (720 chars) |
| `emitsPieDiagram` | OK | 1.00 | 490.7s | 1.06M | 2.9k | 20 | opener=pie produced at benchmark/mermaid/pie-languages.md (138 chars) |
| `emitsSequenceDiagram` | OK | 1.00 | 189.2s | 61.8k | 1.1k | 2 | opener=sequenceDiagram produced at benchmark/mermaid/sequence-oauth.md (820 chars) |
| `emitsStateDiagram` | FAIL | 0.00 | 34.2s | 49.4k | 459 | 1 | no document at path=benchmark/mermaid/state-order.md (opener=stateDiagram) within 120s; kinds in project: [diagram] |
| `emitsTimelineDiagram` | OK | 1.00 | 301.1s | 203.4k | 946 | 4 | opener=timeline produced at benchmark/mermaid/timeline-web.md (146 chars) |
