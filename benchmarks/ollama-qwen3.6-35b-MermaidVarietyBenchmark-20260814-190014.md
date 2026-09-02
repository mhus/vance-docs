# Vance Benchmark - ollama-qwen3.6-35b-MermaidVarietyBenchmark-20260814-190014

- **Started:** 2026-08-14T19:00:14.254556Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 9
- **Passed:** 5 / 9 (56%)
- **Average score:** 0.533
- **Total LLM time:** 368.6s
- **Total tokens (in / out):** 2.22M / 10.8k (43 round-trips)


## mermaid-variety

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `emitsC4ContextDiagram` | OK | 1.00 | 76.8s | 309.9k | 1.3k | 6 | opener=C4Context produced at benchmark/mermaid/c4-notifications.md (976 chars) |
| `emitsErDiagram` | FAIL | 0.00 | - | - | - | - | model timed out after 4.0s (budget 600s, foot.error=Brain error 500: Engine steer failed: de.mhus.vance.brain.ai.AiChatException: arthur streaming failed: XML syntax error on line 4: element <parameter> closed by </function>) |
| `emitsGanttDiagram` | OK | 1.00 | 44.7s | 366.0k | 2.7k | 7 | opener=gantt produced at benchmark/mermaid/gantt-onboarding.md (1100 chars) |
| `emitsGitGraph` | FAIL | 0.00 | 15.9s | 149.5k | 870 | 3 | document at benchmark/mermaid/gitflow.md has kind=text (expected diagram) for opener=gitGraph |
| `emitsJourneyDiagram` | OK | 1.00 | 119.0s | 582.6k | 3.0k | 11 | opener=journey produced at benchmark/mermaid/journey-checkout.md (742 chars) |
| `emitsPieDiagram` | OK | 0.80 | 18.5s | 207.1k | 580 | 4 | no diagram at benchmark/mermaid/pie-languages.md but the model produced a kind=chart document — a valid rendering of a 'pie' chart |
| `emitsSequenceDiagram` | OK | 1.00 | 30.3s | 312.1k | 1.5k | 6 | opener=sequenceDiagram produced at benchmark/mermaid/sequence-oauth.md (1045 chars) |
| `emitsStateDiagram` | FAIL | 0.00 | 11.5s | 148.9k | 473 | 3 | document at benchmark/mermaid/state-order.md has kind=text (expected diagram) for opener=stateDiagram |
| `emitsTimelineDiagram` | FAIL | 0.00 | 52.0s | 148.8k | 353 | 3 | document at benchmark/mermaid/timeline-web.md has kind=text (expected diagram) for opener=timeline |
