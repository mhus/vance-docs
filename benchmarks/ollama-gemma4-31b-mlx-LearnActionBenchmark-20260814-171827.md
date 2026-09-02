# Vance Benchmark - ollama-gemma4-31b-mlx-LearnActionBenchmark-20260814-171827

- **Started:** 2026-08-14T17:18:27.458596Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 4
- **Passed:** 4 / 4 (100%)
- **Average score:** 1.000
- **Total LLM time:** 287.0s
- **Total tokens (in / out):** 292.9k / 499 (9 round-trips)


## learn-action

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `learnsFactAppend` | OK | 1.00 | 29.8s | 48.9k | 116 | 2 | LEARN(scope=fact) emitted: {"content":"Basis-Stack: Java 25 + Spring Boot 4.","reason":"User provided technical stack details for their team; persisting as a fact.","scope":"fact","type":"LEARN"} |
| `learnsFactReplace` | OK | 1.00 | 111.1s | 48.5k | 59 | 1 | LEARN(scope=fact) emitted: {"content":"Team-Name: platform-core; Arbeitet auf den ms-* Repos.","reason":"User provided stable facts about their team and workspace.","scope":"fact","type":"LEARN"} |
| `learnsPersonaAppend` | OK | 1.00 | 131.4s | 97.8k | 155 | 3 | LEARN(scope=persona, mode=append) emitted: {"content":"Code-Blöcke immer direkt am Anfang der Antwort, ohne Einleitung.","mode":"append","reason":"User requested a specific response style preference.","scope":"persona","type":"LEARN"} |
| `learnsPersonaReplace` | OK | 1.00 | 14.7s | 97.7k | 169 | 3 | LEARN(scope=persona, mode=replace) emitted: {"content":"Antwortstil: Knappe Stichpunkte statt ganzer Sätze. Technischer Ton. Kein Smalltalk.","mode":"replace","reason":"User requested a complete change of communication style to technical bullet… |
