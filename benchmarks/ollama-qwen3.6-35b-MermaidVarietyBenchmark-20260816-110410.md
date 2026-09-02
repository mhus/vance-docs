# Vance Benchmark - ollama-qwen3.6-35b-MermaidVarietyBenchmark-20260816-110410

- **Started:** 2026-08-16T11:04:10.561795Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 9
- **Passed:** 7 / 9 (78%)
- **Average score:** 0.778
- **Total LLM time:** 785.7s
- **Total tokens (in / out):** 3.62M / 22.9k (85 round-trips)


## mermaid-variety

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `emitsC4ContextDiagram` | OK | 1.00 | 34.9s | 119.5k | 865 | 3 | opener=C4Context produced at benchmark/mermaid/c4-notifications.md (1612 chars) |
| `emitsErDiagram` | FAIL | 0.00 | 349.7s | 934.1k | 4.8k | 22 | no document at path=benchmark/mermaid/er-shop.md (opener=erDiagram) within 120s; kinds in project: [diagram, text] |
| `emitsGanttDiagram` | FAIL | 0.00 | 32.5s | 244.1k | 1.9k | 6 | kind=diagram at benchmark/mermaid/gantt-onboarding.md has neither a ```mermaid fence nor a `source` field — content head: --- title: Einwöchiges Onboarding --- gantt     dateFormat  YYYY-MM-DD     section Setup     Maschine bereitstellen       :setup1, 2026-08-17, 1d     Zugänge und Berechtigungen   :setup2, after setup1… |
| `emitsGitGraph` | OK | 1.00 | 44.9s | 471.8k | 2.8k | 11 | opener=gitGraph produced at benchmark/mermaid/gitflow.md (939 chars) |
| `emitsJourneyDiagram` | OK | 1.00 | 113.0s | 727.2k | 6.9k | 16 | opener=journey produced at benchmark/mermaid/journey-checkout.md (916 chars) |
| `emitsPieDiagram` | OK | 1.00 | 132.9s | 728.0k | 2.5k | 17 | opener=pie produced at benchmark/mermaid/pie-languages.md (158 chars) |
| `emitsSequenceDiagram` | OK | 1.00 | 21.1s | 120.6k | 1.4k | 3 | opener=sequenceDiagram produced at benchmark/mermaid/sequence-oauth.md (2763 chars) |
| `emitsStateDiagram` | OK | 1.00 | 9.3s | 118.8k | 459 | 3 | opener=stateDiagram produced at benchmark/mermaid/state-order.md (666 chars) |
| `emitsTimelineDiagram` | OK | 1.00 | 47.5s | 160.2k | 1.2k | 4 | opener=timeline produced at benchmark/mermaid/timeline-web.md (785 chars) |
