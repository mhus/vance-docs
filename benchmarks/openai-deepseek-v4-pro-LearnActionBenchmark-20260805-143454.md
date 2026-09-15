# Vance Benchmark - openai-deepseek-v4-pro-LearnActionBenchmark-20260805-143454

- **Started:** 2026-08-05T14:34:54.763823Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 4
- **Passed:** 4 / 4 (100%)
- **Average score:** 1.000
- **Total LLM time:** 17.6s
- **Total tokens (in / out):** 98.5k / 632 (8 round-trips)


## learn-action

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `learnsFactAppend` | OK | 1.00 | 3.2s | 24.6k | 161 | 2 | LEARN(scope=fact) emitted: {"reason": "User explicitly stated a durable team fact — Java 25 + Spring Boot 4 as base stack. Append to fact store.", "type": "LEARN", "scope": "fact", "content": "Team 'platform-core' nutzt Java 25… |
| `learnsFactReplace` | OK | 1.00 | 7.0s | 24.5k | 122 | 2 | LEARN(scope=fact) emitted: {"type": "LEARN", "reason": "User volunteered durable facts about their team and work — worth persisting for future context.", "scope": "fact", "content": "Team: 'platform-core'. Arbeitet auf den ms-*… |
| `learnsPersonaAppend` | OK | 1.00 | 3.6s | 24.7k | 164 | 2 | LEARN(scope=persona, mode=append) emitted: {"type": "LEARN", "reason": "User wants code blocks at the very top of replies — persona update.", "scope": "persona", "mode": "append", "content": "Code-Blöcke immer direkt am Anfang der Antwort, kei… |
| `learnsPersonaReplace` | OK | 1.00 | 3.8s | 24.7k | 185 | 2 | LEARN(scope=persona, mode=replace) emitted: {"reason": "User explicitly requests a complete persona replacement — knappe Stichpunkte, technischer Ton, kein Smalltalk.", "type": "LEARN", "scope": "persona", "mode": "replace", "content": "Nur kna… |
