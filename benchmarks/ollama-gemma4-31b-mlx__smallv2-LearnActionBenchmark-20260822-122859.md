# Vance Benchmark - ollama-gemma4-31b-mlx__smallv2-LearnActionBenchmark-20260822-122859

- **Started:** 2026-08-22T12:28:59.937546Z
- **Judge:** gemini-gemini-2.5-pro
- **Knobs:** {chatTimeoutS=600, waitBudgetMinS=300}
- **Score model:** v2-graded
- **Total tests:** 4
- **Passed:** 3 / 4 (75%)
- **Average score:** 0.922
- **Total LLM time:** 130.5s
- **Total tokens (in / out):** 195.9k / 369 (6 round-trips)


## learn-action

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `learnsFactAppend` | OK | 1.00 | 23.7s | 39.4k | 109 | 2 | LEARN(scope=fact): {"content":"Basis-Stack: Java 25 + Spring Boot 4","reason":"User provided durable information about their team's technical stack.","scope":"fact","type":"LEARN"} — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-output` | stage | 0.50 | 0.50 |  |
| `learn-envelope` | stage | 2.00 | 2.00 | {"content":"Basis-Stack: Java 25 + Spring Boot 4","reason":"User provided durable information about their team's technical stack.","scope":"fact","type":"LEARN"} |
| `scope-fact` | check | 1.50 | 1.50 |  |
| `mode` | check | 0.75 | 0.75 | no mode pinned by this case |
| `content-present` | check | 1.50 | 1.50 |  |

</details>

| `learnsFactReplace` | OK | 1.00 | 92.1s | 39.0k | 82 | 1 | LEARN(scope=fact): {"reason":"The user volunteered durable personal/team information (\"my team is called 'platform-core' and works on the ms-* repos\") which should be persisted in per-user memory.","scope":"fact","con… — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-output` | stage | 0.50 | 0.50 |  |
| `learn-envelope` | stage | 2.00 | 2.00 | {"reason":"The user volunteered durable personal/team information (\"my team is called 'platform-core' and works on the ms-* repos\") which should be persisted in per-user memory.","scope":"fact","con… |
| `scope-fact` | check | 1.50 | 1.50 |  |
| `mode` | check | 0.75 | 0.75 | no mode pinned by this case |
| `content-present` | check | 1.50 | 1.50 |  |

</details>

| `learnsPersonaAppend` | OK | 1.00 | 10.4s | 78.4k | 129 | 2 | LEARN(scope=persona, mode=append): {"content":"Code-Blöcke immer direkt am Anfang der Antwort, ohne lange Einleitung.","mode":"append","reason":"User requested a specific communication style preference to be persisted.","scope":"person… — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-output` | stage | 0.50 | 0.50 |  |
| `learn-envelope` | stage | 2.00 | 2.00 | {"content":"Code-Blöcke immer direkt am Anfang der Antwort, ohne lange Einleitung.","mode":"append","reason":"User requested a specific communication style preference to be persisted.","scope":"person… |
| `scope-persona` | check | 1.50 | 1.50 |  |
| `mode` | check | 0.75 | 0.75 |  |
| `content-present` | check | 1.50 | 1.50 |  |

</details>

| `learnsPersonaReplace` | FAIL | 0.69 | 4.3s | 39.1k | 49 | 1 | LEARN(scope=persona, mode=replace): {"reason":"User requested a complete change of persona/style to concise bullet points, technical tone, and no small talk.","scope":"persona","type":"LEARN"} — 69% — 4/6 checks · missed: mode, content-present |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-output` | stage | 0.50 | 0.50 |  |
| `learn-envelope` | stage | 2.00 | 2.00 | {"reason":"User requested a complete change of persona/style to concise bullet points, technical tone, and no small talk.","scope":"persona","type":"LEARN"} |
| `scope-persona` | check | 1.50 | 1.50 |  |
| `mode` | check | 0.00 | 0.75 | expected replace |
| `content-present` | check | 0.00 | 1.50 | missing or blank 'content' |

</details>

