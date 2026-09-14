# Vance Benchmark - ollama-qwen3.6-35b-LearnActionBenchmark-20260913-094252

- **Started:** 2026-09-13T09:42:52.843486Z
- **Judge:** glm-5.3-nvfp4
- **Knobs:** {chatTimeoutS=480, waitBudgetMinS=240}
- **Score model:** v2-graded
- **Total tests:** 4
- **Passed:** 3 / 4 (75%)
- **Average score:** 0.802
- **Total LLM time:** 61.2s
- **Total tokens (in / out):** 441.8k / 1.1k (13 round-trips)


## learn-action

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `learnsFactAppend` | OK | 1.00 | 5.0s | 44.2k | 189 | 2 | LEARN(scope=fact): {"message":"Stored","reason":"User wants to persist team technology stack details to memory.","scope":"fact","type":"LEARN","content":"[2026-09-13] Das Team 'platform-core' nutzt Java 25 + Spring Boot… — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-output` | stage | 0.50 | 0.50 |  |
| `learn-envelope` | stage | 2.00 | 2.00 | {"message":"Stored","reason":"User wants to persist team technology stack details to memory.","scope":"fact","type":"LEARN","content":"[2026-09-13] Das Team 'platform-core' nutzt Java 25 + Spring Boot… |
| `scope-fact` | check | 1.50 | 1.50 |  |
| `mode` | check | 0.75 | 0.75 | no mode pinned by this case |
| `content-present` | check | 1.50 | 1.50 |  |

</details>

| `learnsFactReplace` | OK | 1.00 | 37.2s | 88.2k | 223 | 3 | LEARN(scope=fact): {"content":"Das Team des Nutzers heißt 'platform-core' und es arbeitet an Repositorys mit dem Präfix 'ms-*'.","reason":"Der Nutzer hat mir eine dauerhafte Information über sein Team und seine Reposito… — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-output` | stage | 0.50 | 0.50 |  |
| `learn-envelope` | stage | 2.00 | 2.00 | {"content":"Das Team des Nutzers heißt 'platform-core' und es arbeitet an Repositorys mit dem Präfix 'ms-*'.","reason":"Der Nutzer hat mir eine dauerhafte Information über sein Team und seine Reposito… |
| `scope-fact` | check | 1.50 | 1.50 |  |
| `mode` | check | 0.75 | 0.75 | no mode pinned by this case |
| `content-present` | check | 1.50 | 1.50 |  |

</details>

| `learnsPersonaAppend` | OK | 1.00 | 7.7s | 88.5k | 296 | 3 | LEARN(scope=persona, mode=append): {"content":"Der Nutzer möchte, dass ich jeden Code-Block direkt am Anfang meiner Antwort platziere, ohne lange Einleitungen davor. Dies ist eine Präferenz für die Kommunikationsweise und das Format de… — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-output` | stage | 0.50 | 0.50 |  |
| `learn-envelope` | stage | 2.00 | 2.00 | {"content":"Der Nutzer möchte, dass ich jeden Code-Block direkt am Anfang meiner Antwort platziere, ohne lange Einleitungen davor. Dies ist eine Präferenz für die Kommunikationsweise und das Format de… |
| `scope-persona` | check | 1.50 | 1.50 |  |
| `mode` | check | 0.75 | 0.75 |  |
| `content-present` | check | 1.50 | 1.50 |  |

</details>

| `learnsPersonaReplace` | FAIL | 0.21 | 11.3s | 221.0k | 352 | 5 | no LEARN action emitted — 21% — 2/6 checks · missed: learn-envelope, scope-persona(skipped), mode(skipped), content-present(skipped) |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-output` | stage | 0.50 | 0.50 |  |
| `learn-envelope` | stage | 0.00 | 2.00 | no `{"type":"LEARN"…}` JSON — head: [tool-call arthur_action] {"message":"Aktueller Zustand:\n\n- Projekt: `instant-hole` (Instant Hole)\n- Workspace leer — keine Dokumente, keine Dateien\n- Client-Sandbox blockiert Zugriff auf lokalen … |
| `scope-persona` | check | skipped | 1.50 | chain stopped earlier |
| `mode` | check | skipped | 0.75 | chain stopped earlier |
| `content-present` | check | skipped | 1.50 | chain stopped earlier |

</details>

