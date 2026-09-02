# Vance Benchmark - ollama-gpt-oss-20b__large-tier-HowDoIReflexBenchmark-20260816-174636

- **Started:** 2026-08-16T17:46:36.127612Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 5
- **Passed:** 2 / 5 (40%)
- **Average score:** 0.280
- **Total LLM time:** 147.0s
- **Total tokens (in / out):** 854.3k / 6.0k (20 round-trips)


## how-do-i-reflex

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `discoversAmbiguousMetaphor` | OK | 0.70 | 13.9s | 171.0k | 917 | 4 | model skipped discovery but took a concrete real-tool action for an ambiguous storage metaphor (acceptable) — tools called: [doc_write] |
| `discoversComposedUnknown` | FAIL | 0.00 | 20.1s | 213.3k | 1.2k | 5 | no DISCOVER action and no how_do_i tool call; model attempted tool(s): [discover, ask_user] — likely hallucinated against an unknown term in the prompt |
| `discoversInventedFeature` | FAIL | 0.00 | 21.5s | 170.8k | 1.3k | 4 | no DISCOVER action and no how_do_i tool call; model attempted tool(s): [discover] — likely hallucinated against an unknown term in the prompt |
| `discoversJargonRequest` | FAIL | 0.00 | 33.6s | 128.3k | 1.6k | 3 | no DISCOVER action, no how_do_i tool call, no other tool, no discovery prose — head: { "type": "ASK_USER", "reason": "Need details about the reference specification and its location to configure drift detection.", "message": "Um Drift‑Detection mit einer Schwelle von 0,3 zu aktivieren… |
| `discoversUnknownTerm` | OK | 0.70 | 57.8s | 171.0k | 1.0k | 4 | model skipped discovery but took a concrete real-tool action for an ambiguous storage metaphor (acceptable) — tools called: [doc_move] |
