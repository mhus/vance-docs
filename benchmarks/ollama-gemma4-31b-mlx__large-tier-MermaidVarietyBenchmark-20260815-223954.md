# Vance Benchmark - ollama-gemma4-31b-mlx__large-tier-MermaidVarietyBenchmark-20260815-223954

- **Started:** 2026-08-15T22:39:54.203303Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 9
- **Passed:** 7 / 9 (78%)
- **Average score:** 0.756
- **Total LLM time:** 1453.0s
- **Total tokens (in / out):** 2.66M / 7.8k (52 round-trips)


## mermaid-variety

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `emitsC4ContextDiagram` | OK | 1.00 | 173.2s | 359.1k | 1.8k | 7 | opener=C4Context produced at benchmark/mermaid/c4-notifications.md (1040 chars) |
| `emitsErDiagram` | OK | 1.00 | 100.9s | 354.0k | 1.0k | 7 | opener=erDiagram produced at benchmark/mermaid/er-shop.md (573 chars) |
| `emitsGanttDiagram` | OK | 1.00 | 96.7s | 253.3k | 989 | 5 | opener=gantt produced at benchmark/mermaid/gantt-onboarding.md (595 chars) |
| `emitsGitGraph` | FAIL | 0.00 | - | - | - | - | HttpTimeoutException: request timed out |
| `emitsJourneyDiagram` | FAIL | 0.00 | 291.3s | 462.9k | 1.4k | 9 | kind=diagram at benchmark/mermaid/journey-checkout.md has neither a ```mermaid fence nor a `source` field — content head: journey   title Online-Kauf User-Journey   section Browsen     Produkte suchen: 5     Kategorien durchstöbern: 4   section Auswählen     Produktdetails prüfen: 4     Vergleichen: 3   section Warenkorb… |
| `emitsPieDiagram` | OK | 0.80 | 320.8s | 213.3k | 577 | 4 | no diagram at benchmark/mermaid/pie-languages.md but the model produced a kind=chart document — a valid rendering of a 'pie' chart |
| `emitsSequenceDiagram` | OK | 1.00 | 358.7s | 356.8k | 1.0k | 7 | opener=sequenceDiagram produced at benchmark/mermaid/sequence-oauth.md (608 chars) |
| `emitsStateDiagram` | OK | 1.00 | 55.7s | 303.4k | 442 | 6 | opener=stateDiagram produced at benchmark/mermaid/state-order.md (231 chars) |
| `emitsTimelineDiagram` | OK | 1.00 | 55.9s | 355.5k | 546 | 7 | opener=timeline produced at benchmark/mermaid/timeline-web.md (153 chars) |
