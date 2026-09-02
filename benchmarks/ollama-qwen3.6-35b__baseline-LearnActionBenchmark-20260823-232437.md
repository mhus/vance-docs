# Vance Benchmark - ollama-qwen3.6-35b__baseline-LearnActionBenchmark-20260823-232437

- **Started:** 2026-08-23T23:24:37.374555Z
- **Judge:** gemini-gemini-2.5-pro
- **Knobs:** {chatTimeoutS=600, waitBudgetMinS=300}
- **Score model:** v2-graded
- **Total tests:** 4
- **Passed:** 3 / 4 (75%)
- **Average score:** 0.922
- **Total LLM time:** 48.7s
- **Total tokens (in / out):** 406.0k / 932 (13 round-trips)


## learn-action

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `learnsFactAppend` | OK | 1.00 | 6.4s | 121.8k | 257 | 4 | LEARN(scope=fact): {"type":"LEARN","content":"Das Team nutzt Java 25 + Spring Boot 4 als Basis-Stack.","mode":"append","reason":"User wants to add the tech stack detail to the team info in per-user memory.","scope":"fac… — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-output` | stage | 0.50 | 0.50 |  |
| `learn-envelope` | stage | 2.00 | 2.00 | {"type":"LEARN","content":"Das Team nutzt Java 25 + Spring Boot 4 als Basis-Stack.","mode":"append","reason":"User wants to add the tech stack detail to the team info in per-user memory.","scope":"fac… |
| `scope-fact` | check | 1.50 | 1.50 |  |
| `mode` | check | 0.75 | 0.75 | no mode pinned by this case |
| `content-present` | check | 1.50 | 1.50 |  |

</details>

| `learnsFactReplace` | OK | 1.00 | 31.4s | 121.8k | 242 | 4 | LEARN(scope=fact): {"scope":"fact","type":"LEARN","reason":"Der Nutzer hat explizit zwei dauerhafte Fakten über sich genannt: Team-Name und die Repos, an denen er arbeitet.","content":"Das Team des Nutzers heißt 'platfo… — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-output` | stage | 0.50 | 0.50 |  |
| `learn-envelope` | stage | 2.00 | 2.00 | {"scope":"fact","type":"LEARN","reason":"Der Nutzer hat explizit zwei dauerhafte Fakten über sich genannt: Team-Name und die Repos, an denen er arbeitet.","content":"Das Team des Nutzers heißt 'platfo… |
| `scope-fact` | check | 1.50 | 1.50 |  |
| `mode` | check | 0.75 | 0.75 | no mode pinned by this case |
| `content-present` | check | 1.50 | 1.50 |  |

</details>

| `learnsPersonaAppend` | OK | 1.00 | 6.0s | 81.3k | 252 | 3 | LEARN(scope=persona, mode=append): {"content":"Der User möchte Code-Blöcke immer direkt am Anfang der Antwort haben, ohne lange Einleitung davor.","mode":"append","scope":"persona","type":"LEARN","reason":"Der User hat explizit eine St… — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-output` | stage | 0.50 | 0.50 |  |
| `learn-envelope` | stage | 2.00 | 2.00 | {"content":"Der User möchte Code-Blöcke immer direkt am Anfang der Antwort haben, ohne lange Einleitung davor.","mode":"append","scope":"persona","type":"LEARN","reason":"Der User hat explizit eine St… |
| `scope-persona` | check | 1.50 | 1.50 |  |
| `mode` | check | 0.75 | 0.75 |  |
| `content-present` | check | 1.50 | 1.50 |  |

</details>

| `learnsPersonaReplace` | FAIL | 0.69 | 5.0s | 81.1k | 181 | 2 | LEARN(scope=persona, mode=replace): {"message":"- Stil: Stichpunkte, technisch, kein Smalltalk.","scope":"persona","type":"LEARN","reason":"User explicitely requested a new answer style (bullet points only, technical tone, no smalltalk)… — 69% — 4/6 checks · missed: mode, content-present |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-output` | stage | 0.50 | 0.50 |  |
| `learn-envelope` | stage | 2.00 | 2.00 | {"message":"- Stil: Stichpunkte, technisch, kein Smalltalk.","scope":"persona","type":"LEARN","reason":"User explicitely requested a new answer style (bullet points only, technical tone, no smalltalk)… |
| `scope-persona` | check | 1.50 | 1.50 |  |
| `mode` | check | 0.00 | 0.75 | expected replace |
| `content-present` | check | 0.00 | 1.50 | missing or blank 'content' |

</details>

