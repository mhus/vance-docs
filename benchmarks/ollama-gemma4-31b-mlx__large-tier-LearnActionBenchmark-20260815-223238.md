# Vance Benchmark - ollama-gemma4-31b-mlx__large-tier-LearnActionBenchmark-20260815-223238

- **Started:** 2026-08-15T22:32:38.546075Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 4
- **Passed:** 4 / 4 (100%)
- **Average score:** 1.000
- **Total LLM time:** 300.1s
- **Total tokens (in / out):** 293.2k / 509 (9 round-trips)


## learn-action

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `learnsFactAppend` | OK | 1.00 | 31.0s | 48.9k | 119 | 2 | LEARN(scope=fact) emitted: {"content":"Nutzt Java 25 und Spring Boot 4 als Basis-Stack.","reason":"User provided technical stack details for the team, which is a durable fact.","scope":"fact","type":"LEARN"} |
| `learnsFactReplace` | OK | 1.00 | 116.2s | 48.6k | 64 | 1 | LEARN(scope=fact) emitted: {"content":"Team: platform-core. Arbeitet auf den ms-* Repos.","reason":"User provided team name and repository pattern, which are stable facts about their professional context.","scope":"fact","type"… |
| `learnsPersonaAppend` | OK | 1.00 | 137.8s | 97.9k | 156 | 3 | LEARN(scope=persona, mode=append) emitted: {"content":"Code-Blöcke immer direkt am Anfang der Antwort, ohne Einleitung.","mode":"append","reason":"User requested a specific response style preference.","scope":"persona","type":"LEARN"} |
| `learnsPersonaReplace` | OK | 1.00 | 15.0s | 97.8k | 170 | 3 | LEARN(scope=persona, mode=replace) emitted: {"content":"Antwortstil: Knappe Stichpunkte, technischer Ton, kein Smalltalk. Ganze Sätze vermeiden.","mode":"replace","reason":"User requested a complete change of communication style to concise bull… |
