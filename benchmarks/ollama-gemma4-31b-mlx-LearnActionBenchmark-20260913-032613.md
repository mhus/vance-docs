# Vance Benchmark - ollama-gemma4-31b-mlx-LearnActionBenchmark-20260913-032613

- **Started:** 2026-09-13T03:26:13.941875Z
- **Judge:** glm-5.3-nvfp4
- **Knobs:** {chatTimeoutS=480, waitBudgetMinS=240}
- **Score model:** v2-graded
- **Total tests:** 4
- **Passed:** 3 / 4 (75%)
- **Average score:** 0.922
- **Total LLM time:** 130.0s
- **Total tokens (in / out):** 214.3k / 377 (6 round-trips)


## learn-action

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `learnsFactAppend` | OK | 1.00 | 13.5s | 43.0k | 119 | 2 | LEARN(scope=fact): {"content":"Basis-Stack: Java 25 + Spring Boot 4.","mode":"append","reason":"User provided durable information about their team's technical stack.","scope":"fact","type":"LEARN"} — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-output` | stage | 0.50 | 0.50 |  |
| `learn-envelope` | stage | 2.00 | 2.00 | {"content":"Basis-Stack: Java 25 + Spring Boot 4.","mode":"append","reason":"User provided durable information about their team's technical stack.","scope":"fact","type":"LEARN"} |
| `scope-fact` | check | 1.50 | 1.50 |  |
| `mode` | check | 0.75 | 0.75 | no mode pinned by this case |
| `content-present` | check | 1.50 | 1.50 |  |

</details>

| `learnsFactReplace` | OK | 1.00 | 100.7s | 42.7k | 74 | 1 | LEARN(scope=fact): {"reason":"The user volunteered durable personal/team facts about their team name and work repos, which should be persisted in per-user memory.","scope":"fact","content":"Team name: 'platform-core'. W… — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-output` | stage | 0.50 | 0.50 |  |
| `learn-envelope` | stage | 2.00 | 2.00 | {"reason":"The user volunteered durable personal/team facts about their team name and work repos, which should be persisted in per-user memory.","scope":"fact","content":"Team name: 'platform-core'. W… |
| `scope-fact` | check | 1.50 | 1.50 |  |
| `mode` | check | 0.75 | 0.75 | no mode pinned by this case |
| `content-present` | check | 1.50 | 1.50 |  |

</details>

| `learnsPersonaAppend` | OK | 1.00 | 11.4s | 85.8k | 136 | 2 | LEARN(scope=persona, mode=append): {"content":"Bevorzugt Code-Blöcke direkt am Anfang der Antwort, ohne lange Einleitung.","mode":"append","reason":"User requested to add a style preference to their persona.","scope":"persona","type":"… — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-output` | stage | 0.50 | 0.50 |  |
| `learn-envelope` | stage | 2.00 | 2.00 | {"content":"Bevorzugt Code-Blöcke direkt am Anfang der Antwort, ohne lange Einleitung.","mode":"append","reason":"User requested to add a style preference to their persona.","scope":"persona","type":"… |
| `scope-persona` | check | 1.50 | 1.50 |  |
| `mode` | check | 0.75 | 0.75 |  |
| `content-present` | check | 1.50 | 1.50 |  |

</details>

| `learnsPersonaReplace` | FAIL | 0.69 | 4.6s | 42.8k | 48 | 1 | LEARN(scope=persona, mode=replace): {"reason":"User requested a complete change of communication style to concise bullet points, technical tone, and no small talk.","scope":"persona","type":"LEARN"} — 69% — 4/6 checks · missed: mode, content-present |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-output` | stage | 0.50 | 0.50 |  |
| `learn-envelope` | stage | 2.00 | 2.00 | {"reason":"User requested a complete change of communication style to concise bullet points, technical tone, and no small talk.","scope":"persona","type":"LEARN"} |
| `scope-persona` | check | 1.50 | 1.50 |  |
| `mode` | check | 0.00 | 0.75 | expected replace |
| `content-present` | check | 0.00 | 1.50 | missing or blank 'content' |

</details>

