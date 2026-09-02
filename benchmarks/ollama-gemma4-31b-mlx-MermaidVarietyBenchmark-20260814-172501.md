# Vance Benchmark - ollama-gemma4-31b-mlx-MermaidVarietyBenchmark-20260814-172501

- **Started:** 2026-08-14T17:25:01.649223Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 9
- **Passed:** 4 / 9 (44%)
- **Average score:** 0.422
- **Total LLM time:** 1890.8s
- **Total tokens (in / out):** 2.67M / 7.7k (52 round-trips)


## mermaid-variety

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `emitsC4ContextDiagram` | FAIL | 0.00 | 137.6s | 253.3k | 1.5k | 5 | document at benchmark/mermaid/c4-notifications.md has kind=text (expected diagram) for opener=C4Context |
| `emitsErDiagram` | OK | 1.00 | 149.1s | 353.6k | 987 | 7 | opener=erDiagram produced at benchmark/mermaid/er-shop.md (601 chars) |
| `emitsGanttDiagram` | FAIL | 0.00 | 297.7s | 214.2k | 937 | 4 | no document at path=benchmark/mermaid/gantt-onboarding.md (opener=gantt) within 120s; kinds in project: [application, calendar, chart, diagram, records, text] |
| `emitsGitGraph` | FAIL | 0.00 | 185.0s | 252.2k | 640 | 5 | document at benchmark/mermaid/gitflow.md has kind=text (expected diagram) for opener=gitGraph |
| `emitsJourneyDiagram` | FAIL | 0.00 | 482.2s | 536.0k | 997 | 10 | kind=diagram at benchmark/mermaid/journey-checkout.md has neither a ```mermaid fence nor a `source` field — content head: journey   title Online-Kauf User Journey   section Shopping     Browsen: 5: Kunde     Auswählen: 4: Kunde   section Transaktion     Warenkorb: 3: Kunde     Checkout: 2: Kunde     Bezahlen: 4: Kunde  |
| `emitsPieDiagram` | OK | 0.80 | 161.8s | 151.9k | 276 | 3 | no diagram at benchmark/mermaid/pie-languages.md but the model produced a kind=chart document — a valid rendering of a 'pie' chart |
| `emitsSequenceDiagram` | OK | 1.00 | 391.8s | 357.6k | 1.6k | 7 | opener=sequenceDiagram produced at benchmark/mermaid/sequence-oauth.md (866 chars) |
| `emitsStateDiagram` | OK | 1.00 | 48.4s | 303.1k | 483 | 6 | opener=stateDiagram produced at benchmark/mermaid/state-order.md (232 chars) |
| `emitsTimelineDiagram` | FAIL | 0.00 | 37.2s | 251.8k | 350 | 5 | document at benchmark/mermaid/timeline-web.md has kind=text (expected diagram) for opener=timeline |
