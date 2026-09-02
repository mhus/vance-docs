# Vance Benchmark - ollama-gpt-oss-20b-HowDoIReflexBenchmark-20260816-035057

- **Started:** 2026-08-16T03:50:57.172700Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 5
- **Passed:** 2 / 5 (40%)
- **Average score:** 0.280
- **Total LLM time:** 258.5s
- **Total tokens (in / out):** 1.16M / 9.0k (35 round-trips)


## how-do-i-reflex

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `discoversAmbiguousMetaphor` | OK | 0.70 | 8.1s | 131.9k | 453 | 4 | model skipped discovery but took a concrete real-tool action for an ambiguous storage metaphor (acceptable) — tools called: [arthur_action, doc_write] |
| `discoversComposedUnknown` | FAIL | 0.00 | 47.2s | 463.3k | 2.8k | 14 | no DISCOVER action and no how_do_i tool call; model attempted tool(s): [search, doc_list, doc_find, doc_read, arthur_action, project_current] — likely hallucinated against an unknown term in the prompt |
| `discoversInventedFeature` | FAIL | 0.00 | 13.3s | 98.6k | 878 | 3 | no DISCOVER action, no how_do_i tool call, no other tool, no discovery prose — head: {"type":"REJECT","message":"Der Synchron-Modus für Live-Broadcasts ist in dieser Version nicht verfügbar.","reason":"Feature unsupported"} --- {"type":"REJECT","message":"Der Synchron-Modus für Live-B… |
| `discoversJargonRequest` | FAIL | 0.00 | 20.3s | 99.0k | 1.1k | 3 | no DISCOVER action, no how_do_i tool call, no other tool, no discovery prose — head: {"type":"ASK_USER","message":"Um die Drift‑Detection einzurichten, brauche ich ein paar Details: \n1. Welches Dokument soll als Referenz‑Spezifikation dienen? \n2. Welche Dokumente (oder Ordner) solle… |
| `discoversUnknownTerm` | OK | 0.70 | 169.7s | 365.2k | 3.8k | 11 | model skipped discovery but took a concrete real-tool action for an ambiguous storage metaphor (acceptable) — tools called: [work_target_get, client_file_read, doc_find, doc_read, arthur_action, doc_list_in_folder, project_current, client_file_list, transfer_client_to_work] |
