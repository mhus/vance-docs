# Vance Benchmark - ollama-qwen3.6-35b__smallv2-LearnActionBenchmark-20260822-015145

- **Started:** 2026-08-22T01:51:45.057016Z
- **Judge:** gemini-gemini-2.5-pro
- **Knobs:** {chatTimeoutS=600, waitBudgetMinS=300}
- **Score model:** v2-graded
- **Total tests:** 4
- **Passed:** 3 / 4 (75%)
- **Average score:** 0.922
- **Total LLM time:** 59.5s
- **Total tokens (in / out):** 662.9k / 1.5k (19 round-trips)


## learn-action

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `learnsFactAppend` | OK | 1.00 | 5.9s | 80.9k | 252 | 3 | LEARN(scope=fact): {"content":"Das Team nutzt Java 25 + Spring Boot 4 als Basis-Stack.","reason":"Der Nutzer hat ein neues technisches Detail zum Team-Stack hinzugefügt, das in den Team-Infos gespeichert werden soll.","… — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-output` | stage | 0.50 | 0.50 |  |
| `learn-envelope` | stage | 2.00 | 2.00 | {"content":"Das Team nutzt Java 25 + Spring Boot 4 als Basis-Stack.","reason":"Der Nutzer hat ein neues technisches Detail zum Team-Stack hinzugefügt, das in den Team-Infos gespeichert werden soll.","… |
| `scope-fact` | check | 1.50 | 1.50 |  |
| `mode` | check | 0.75 | 0.75 | no mode pinned by this case |
| `content-present` | check | 1.50 | 1.50 |  |

</details>

| `learnsFactReplace` | OK | 1.00 | 27.7s | 80.7k | 224 | 3 | LEARN(scope=fact): {"content":"Das Team des Nutzers heißt 'platform-core'. Sie arbeiten auf den ms-* Repositories.","mode":"append","reason":"Der Nutzer hat explizit gebeten, diese Information dauerhaft zu speichern.","… — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-output` | stage | 0.50 | 0.50 |  |
| `learn-envelope` | stage | 2.00 | 2.00 | {"content":"Das Team des Nutzers heißt 'platform-core'. Sie arbeiten auf den ms-* Repositories.","mode":"append","reason":"Der Nutzer hat explizit gebeten, diese Information dauerhaft zu speichern.","… |
| `scope-fact` | check | 1.50 | 1.50 |  |
| `mode` | check | 0.75 | 0.75 | no mode pinned by this case |
| `content-present` | check | 1.50 | 1.50 |  |

</details>

| `learnsPersonaAppend` | FAIL | 0.69 | 19.9s | 420.4k | 786 | 10 | LEARN(scope=persona, mode=append): {     "type": "LEARN",     "scope": "fact",     "content": "Der User möchte, dass Code-Blöcke immer direkt am Anfang seiner Antworten stehen, ohne lange Einleitung.",     "reason": "Speichert die Form… — 69% — 4/6 checks · missed: scope-persona, mode |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-output` | stage | 0.50 | 0.50 |  |
| `learn-envelope` | stage | 2.00 | 2.00 | {     "type": "LEARN",     "scope": "fact",     "content": "Der User möchte, dass Code-Blöcke immer direkt am Anfang seiner Antworten stehen, ohne lange Einleitung.",     "reason": "Speichert die Form… |
| `scope-persona` | check | 0.00 | 1.50 | wrong or missing scope |
| `mode` | check | 0.00 | 0.75 | expected append |
| `content-present` | check | 1.50 | 1.50 |  |

</details>

| `learnsPersonaReplace` | OK | 1.00 | 6.0s | 80.9k | 246 | 3 | LEARN(scope=persona, mode=replace): {"content":"- Antwortstil: nur knappe Stichpunkte, keine ganzen Sätze\n- Ton: technisch, sachlich\n- Kein Smalltalk","mode":"replace","scope":"persona","type":"LEARN","reason":"User explicitely reques… — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-output` | stage | 0.50 | 0.50 |  |
| `learn-envelope` | stage | 2.00 | 2.00 | {"content":"- Antwortstil: nur knappe Stichpunkte, keine ganzen Sätze\n- Ton: technisch, sachlich\n- Kein Smalltalk","mode":"replace","scope":"persona","type":"LEARN","reason":"User explicitely reques… |
| `scope-persona` | check | 1.50 | 1.50 |  |
| `mode` | check | 0.75 | 0.75 |  |
| `content-present` | check | 1.50 | 1.50 |  |

</details>

