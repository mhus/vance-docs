# Vance Benchmark - ollama-qwen3.6-35b__smallv2-LearnActionBenchmark-20260822-034248

- **Started:** 2026-08-22T03:42:48.647785Z
- **Judge:** gemini-gemini-2.5-pro
- **Knobs:** {chatTimeoutS=600, waitBudgetMinS=300}
- **Score model:** v2-graded
- **Total tests:** 4
- **Passed:** 4 / 4 (100%)
- **Average score:** 1.000
- **Total LLM time:** 50.9s
- **Total tokens (in / out):** 405.0k / 1.0k (14 round-trips)


## learn-action

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `learnsFactAppend` | OK | 1.00 | 4.5s | 40.5k | 168 | 2 | LEARN(scope=fact): {"content":"Das Team nutzt Java 25 + Spring Boot 4 als Basis-Stack.","mode":"append","scope":"fact","type":"LEARN","reason":"Der Nutzer hat eine weitere technische Detailinfo zum Team-Stack gegeben"} — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-output` | stage | 0.50 | 0.50 |  |
| `learn-envelope` | stage | 2.00 | 2.00 | {"content":"Das Team nutzt Java 25 + Spring Boot 4 als Basis-Stack.","mode":"append","scope":"fact","type":"LEARN","reason":"Der Nutzer hat eine weitere technische Detailinfo zum Team-Stack gegeben"} |
| `scope-fact` | check | 1.50 | 1.50 |  |
| `mode` | check | 0.75 | 0.75 | no mode pinned by this case |
| `content-present` | check | 1.50 | 1.50 |  |

</details>

| `learnsFactReplace` | OK | 1.00 | 31.0s | 80.7k | 222 | 3 | LEARN(scope=fact): {"content":"Das Team des Nutzers heißt 'platform-core' und es arbeitet an den ms-* Repositories.","reason":"Der Nutzer hat mir explizit mitgeteilt, dass sein Team 'platform-core' heißt und auf ms-* Re… — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-output` | stage | 0.50 | 0.50 |  |
| `learn-envelope` | stage | 2.00 | 2.00 | {"content":"Das Team des Nutzers heißt 'platform-core' und es arbeitet an den ms-* Repositories.","reason":"Der Nutzer hat mir explizit mitgeteilt, dass sein Team 'platform-core' heißt und auf ms-* Re… |
| `scope-fact` | check | 1.50 | 1.50 |  |
| `mode` | check | 0.75 | 0.75 | no mode pinned by this case |
| `content-present` | check | 1.50 | 1.50 |  |

</details>

| `learnsPersonaAppend` | OK | 1.00 | 9.6s | 202.9k | 379 | 6 | LEARN(scope=persona, mode=append): {"content":"Der Nutzer möchte Code-Blöcke immer direkt am Anfang der Antwort, ohne lange Einleitung.","mode":"append","reason":"Persistiere die Präferenz des Nutzers, Code-Blöcke direkt am Anfang zu h… — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-output` | stage | 0.50 | 0.50 |  |
| `learn-envelope` | stage | 2.00 | 2.00 | {"content":"Der Nutzer möchte Code-Blöcke immer direkt am Anfang der Antwort, ohne lange Einleitung.","mode":"append","reason":"Persistiere die Präferenz des Nutzers, Code-Blöcke direkt am Anfang zu h… |
| `scope-persona` | check | 1.50 | 1.50 |  |
| `mode` | check | 0.75 | 0.75 |  |
| `content-present` | check | 1.50 | 1.50 |  |

</details>

| `learnsPersonaReplace` | OK | 1.00 | 5.9s | 80.9k | 232 | 3 | LEARN(scope=persona, mode=replace): {"content":"Präferiert knappe Stichpunkte statt ganzer Sätze, technischer Ton, kein Smalltalk.","mode":"replace","scope":"persona","type":"LEARN","reason":"Der User möchte seinen Antwortstil ändern — … — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-output` | stage | 0.50 | 0.50 |  |
| `learn-envelope` | stage | 2.00 | 2.00 | {"content":"Präferiert knappe Stichpunkte statt ganzer Sätze, technischer Ton, kein Smalltalk.","mode":"replace","scope":"persona","type":"LEARN","reason":"Der User möchte seinen Antwortstil ändern — … |
| `scope-persona` | check | 1.50 | 1.50 |  |
| `mode` | check | 0.75 | 0.75 |  |
| `content-present` | check | 1.50 | 1.50 |  |

</details>

