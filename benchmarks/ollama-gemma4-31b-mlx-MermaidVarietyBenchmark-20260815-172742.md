# Vance Benchmark - ollama-gemma4-31b-mlx-MermaidVarietyBenchmark-20260815-172742

- **Started:** 2026-08-15T17:27:42.555378Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 9
- **Passed:** 8 / 9 (89%)
- **Average score:** 0.867
- **Total LLM time:** 1762.2s
- **Total tokens (in / out):** 2.96M / 9.0k (58 round-trips)


## mermaid-variety

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `emitsC4ContextDiagram` | OK | 1.00 | 228.7s | 357.9k | 1.7k | 7 | opener=C4Context produced at benchmark/mermaid/c4-notifications.md (858 chars) |
| `emitsErDiagram` | OK | 1.00 | 90.2s | 353.5k | 1.0k | 7 | opener=erDiagram produced at benchmark/mermaid/er-shop.md (576 chars) |
| `emitsGanttDiagram` | OK | 1.00 | 108.2s | 305.1k | 1.1k | 6 | opener=gantt produced at benchmark/mermaid/gantt-onboarding.md (657 chars) |
| `emitsGitGraph` | OK | 1.00 | 100.7s | 252.4k | 1.1k | 5 | opener=gitGraph produced at benchmark/mermaid/gitflow.md (490 chars) |
| `emitsJourneyDiagram` | FAIL | 0.00 | 136.2s | 409.5k | 1.3k | 8 | kind=diagram at benchmark/mermaid/journey-checkout.md has neither a ```mermaid fence nor a `source` field — content head: journey   title Online-Kauf User-Journey   section Browsen     Produkte suchen: 5     Kategorien durchstöbern: 4   section Auswählen     Produktdetails prüfen: 4     Vergleichen: 3   section Warenkorb… |
| `emitsPieDiagram` | OK | 0.80 | 178.3s | 213.2k | 467 | 4 | no diagram at benchmark/mermaid/pie-languages.md but the model produced a kind=chart document — a valid rendering of a 'pie' chart |
| `emitsSequenceDiagram` | OK | 1.00 | 502.4s | 357.5k | 1.2k | 7 | opener=sequenceDiagram produced at benchmark/mermaid/sequence-oauth.md (863 chars) |
| `emitsStateDiagram` | OK | 1.00 | 72.8s | 303.3k | 502 | 6 | opener=stateDiagram produced at benchmark/mermaid/state-order.md (231 chars) |
| `emitsTimelineDiagram` | OK | 1.00 | 344.7s | 407.4k | 636 | 8 | opener=timeline produced at benchmark/mermaid/timeline-web.md (121 chars) |
