# Vance Benchmark - openai-deepseek-v4-pro-MermaidVarietyBenchmark-20260805-143613

- **Started:** 2026-08-05T14:36:13.206588Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 9
- **Passed:** 8 / 9 (89%)
- **Average score:** 0.889
- **Total LLM time:** 168.7s
- **Total tokens (in / out):** 1.08M / 8.8k (42 round-trips)


## mermaid-variety

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `emitsC4ContextDiagram` | OK | 1.00 | 21.0s | 104.2k | 1.2k | 4 | opener=C4Context produced at benchmark/mermaid/c4-notifications.md (991 chars) |
| `emitsErDiagram` | OK | 1.00 | 30.6s | 130.7k | 931 | 5 | opener=erDiagram produced at benchmark/mermaid/er-shop.md (726 chars) |
| `emitsGanttDiagram` | OK | 1.00 | 13.6s | 52.4k | 993 | 3 | opener=gantt produced at benchmark/mermaid/gantt-onboarding.md (1102 chars) |
| `emitsGitGraph` | OK | 1.00 | 20.6s | 130.8k | 1.2k | 5 | opener=gitGraph produced at benchmark/mermaid/gitflow.md (766 chars) |
| `emitsJourneyDiagram` | OK | 1.00 | 23.8s | 137.7k | 1.3k | 5 | opener=journey produced at benchmark/mermaid/journey-checkout.md (404 chars) |
| `emitsPieDiagram` | FAIL | 0.00 | 11.0s | 77.0k | 504 | 3 | no document at path=benchmark/mermaid/pie-languages.md (opener=pie) within 120s; kinds in project: [chart, diagram] |
| `emitsSequenceDiagram` | OK | 1.00 | 18.9s | 130.9k | 1.1k | 5 | opener=sequenceDiagram produced at benchmark/mermaid/sequence-oauth.md (761 chars) |
| `emitsStateDiagram` | OK | 1.00 | 15.0s | 189.2k | 731 | 7 | opener=stateDiagram produced at benchmark/mermaid/state-order.md (247 chars) |
| `emitsTimelineDiagram` | OK | 1.00 | 14.2s | 130.7k | 780 | 5 | opener=timeline produced at benchmark/mermaid/timeline-web.md (220 chars) |
