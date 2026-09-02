# Vance Benchmark - ollama-qwen3.6-35b-LearnActionBenchmark-20260816-110200

- **Started:** 2026-08-16T11:02:00.375742Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 4
- **Passed:** 4 / 4 (100%)
- **Average score:** 1.000
- **Total LLM time:** 45.8s
- **Total tokens (in / out):** 356.3k / 1.0k (13 round-trips)


## learn-action

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `learnsFactAppend` | OK | 1.00 | 6.3s | 79.2k | 297 | 3 | LEARN(scope=fact) emitted: {"content":"Das Team nutzt Java 25 + Spring Boot 4 als Basis-Stack.","message":"Team-Infos aktualisiert: Java 25 + Spring Boot 4 hinzugefügt.","reason":"User hat ein neues Detail zum Team-Stack hinzug… |
| `learnsFactReplace` | OK | 1.00 | 27.6s | 118.6k | 233 | 4 | LEARN(scope=fact) emitted: {"scope":"fact","type":"LEARN","reason":"Der Nutzer hat explizit gebeten, diese Info zu speichern.","content":"Das Team des Nutzers heißt 'platform-core' und es arbeitet an Repos mit dem Präfix ms-*."… |
| `learnsPersonaAppend` | OK | 1.00 | 6.2s | 79.3k | 270 | 3 | LEARN(scope=persona, mode=append) emitted: {"content":"Der Nutzer erwartet, dass Code-Blöcke direkt am Anfang der Antwort stehen, ohne lange Einleitung. Die Antwort soll knapp in Stichpunkten sein, technisch und sachlich.","mode":"append","rea… |
| `learnsPersonaReplace` | OK | 1.00 | 5.6s | 79.2k | 227 | 3 | LEARN(scope=persona, mode=replace) emitted: {"content":"- Antwortstil: knappe Stichpunkte, keine ganzen Sätze\n- Ton: technisch, sachlich\n- Kein Smalltalk","mode":"replace","scope":"persona","type":"LEARN","reason":"User requested new communic… |
