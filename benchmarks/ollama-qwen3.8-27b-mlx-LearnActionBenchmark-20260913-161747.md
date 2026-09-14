# Vance Benchmark - ollama-qwen3.8-27b-mlx-LearnActionBenchmark-20260913-161747

- **Started:** 2026-09-13T16:17:47.056476Z
- **Judge:** glm-5.3-nvfp4
- **Knobs:** {chatTimeoutS=480, waitBudgetMinS=240}
- **Score model:** v2-graded
- **Total tests:** 4
- **Passed:** 4 / 4 (100%)
- **Average score:** 1.000
- **Total LLM time:** 102.0s
- **Total tokens (in / out):** 177.0k / 835 (8 round-trips)


## learn-action

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `learnsFactAppend` | OK | 1.00 | 12.0s | 44.2k | 206 | 2 | LEARN(scope=fact): {"content":"[2026-09-13] Basis-Stack des Teams platform-core: Java 25 + Spring Boot 4.","mode":"append","reason":"Durable user fact about the team's tech stack — worth persisting to per-user memory.",… — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-output` | stage | 0.50 | 0.50 |  |
| `learn-envelope` | stage | 2.00 | 2.00 | {"content":"[2026-09-13] Basis-Stack des Teams platform-core: Java 25 + Spring Boot 4.","mode":"append","reason":"Durable user fact about the team's tech stack — worth persisting to per-user memory.",… |
| `scope-fact` | check | 1.50 | 1.50 |  |
| `mode` | check | 0.75 | 0.75 | no mode pinned by this case |
| `content-present` | check | 1.50 | 1.50 |  |

</details>

| `learnsFactReplace` | OK | 1.00 | 74.5s | 44.1k | 165 | 2 | LEARN(scope=fact): {"content":"Team heißt 'platform-core', arbeitet auf den ms-* Repos (monolithische/microservice-Repositories mit ms-Präfix).","mode":"append","reason":"User volunteers a durable fact about their team … — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-output` | stage | 0.50 | 0.50 |  |
| `learn-envelope` | stage | 2.00 | 2.00 | {"content":"Team heißt 'platform-core', arbeitet auf den ms-* Repos (monolithische/microservice-Repositories mit ms-Präfix).","mode":"append","reason":"User volunteers a durable fact about their team … |
| `scope-fact` | check | 1.50 | 1.50 |  |
| `mode` | check | 0.75 | 0.75 | no mode pinned by this case |
| `content-present` | check | 1.50 | 1.50 |  |

</details>

| `learnsPersonaAppend` | OK | 1.00 | 8.1s | 44.4k | 242 | 2 | LEARN(scope=persona, mode=append): {"content":"Kommunikation erfolgt ausschließlich in knappen Stichpunkten, nicht in ganzen Sätzen.\nTechnischer Ton, ohne Smalltalk oder Fülltext.\nKeine Einleitungen oder Höflichkeitsformeln.\nDirekt … — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-output` | stage | 0.50 | 0.50 |  |
| `learn-envelope` | stage | 2.00 | 2.00 | {"content":"Kommunikation erfolgt ausschließlich in knappen Stichpunkten, nicht in ganzen Sätzen.\nTechnischer Ton, ohne Smalltalk oder Fülltext.\nKeine Einleitungen oder Höflichkeitsformeln.\nDirekt … |
| `scope-persona` | check | 1.50 | 1.50 |  |
| `mode` | check | 0.75 | 0.75 |  |
| `content-present` | check | 1.50 | 1.50 |  |

</details>

| `learnsPersonaReplace` | OK | 1.00 | 7.4s | 44.3k | 222 | 2 | LEARN(scope=persona, mode=replace): {"reason":"User explicitly requests a durable change to their preferred communication style — a persona trait. Replace the existing persona summary with the new style directive.","content":"Antwortsti… — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-output` | stage | 0.50 | 0.50 |  |
| `learn-envelope` | stage | 2.00 | 2.00 | {"reason":"User explicitly requests a durable change to their preferred communication style — a persona trait. Replace the existing persona summary with the new style directive.","content":"Antwortsti… |
| `scope-persona` | check | 1.50 | 1.50 |  |
| `mode` | check | 0.75 | 0.75 |  |
| `content-present` | check | 1.50 | 1.50 |  |

</details>

