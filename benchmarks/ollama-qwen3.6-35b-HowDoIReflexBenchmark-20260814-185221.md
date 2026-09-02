# Vance Benchmark - ollama-qwen3.6-35b-HowDoIReflexBenchmark-20260814-185221

- **Started:** 2026-08-14T18:52:21.343992Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 5
- **Passed:** 3 / 5 (60%)
- **Average score:** 0.480
- **Total LLM time:** 166.7s
- **Total tokens (in / out):** 943.2k / 2.2k (19 round-trips)


## how-do-i-reflex

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `discoversAmbiguousMetaphor` | OK | 0.70 | 48.3s | 198.7k | 317 | 4 | model skipped discovery but took a concrete real-tool action for an ambiguous storage metaphor (acceptable) — tools called: [arthur_action, scratchpad_set] |
| `discoversComposedUnknown` | FAIL | 0.00 | 7.2s | 148.7k | 279 | 3 | no DISCOVER action, no how_do_i tool call, no other tool, no discovery prose — head: {type: "ASK_USER", reason: "Benötige Klärung, welches Board/Tool gemeint ist — es gibt keine kanban-Integration in diesem Projekt.", message: "Welches Board meinst du?\n\n- **Jira** (Projektname?)\n- … |
| `discoversInventedFeature` | OK | 1.00 | 45.8s | 198.8k | 624 | 4 | model fired how_do_i tool — discovery reflex worked |
| `discoversJargonRequest` | FAIL | 0.00 | 12.9s | 198.6k | 450 | 4 | no DISCOVER action and no how_do_i tool call; model attempted tool(s): [doc_list, file_list, arthur_action, ASK_USER] — likely hallucinated against an unknown term in the prompt |
| `discoversUnknownTerm` | OK | 0.70 | 52.6s | 198.5k | 507 | 4 | model skipped discovery but took a concrete real-tool action for an ambiguous storage metaphor (acceptable) — tools called: [file_read, arthur_action, file_find] |
