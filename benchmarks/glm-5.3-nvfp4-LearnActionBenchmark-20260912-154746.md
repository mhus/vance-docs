# Vance Benchmark - glm-5.3-nvfp4-LearnActionBenchmark-20260912-154746

- **Started:** 2026-09-12T15:47:46.055518Z
- **Judge:** glm-5.3-nvfp4
- **Score model:** v2-graded
- **Total tests:** 4
- **Passed:** 4 / 4 (100%)
- **Average score:** 1.000
- **Total LLM time:** 15.5s
- **Total tokens (in / out):** 211.8k / 2.8k (7 round-trips)


## learn-action

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `learnsFactAppend` | OK | 1.00 | 2.8s | 53.0k | 654 | 2 | LEARN(scope=fact): {"type": "LEARN", "reason": "User nennt den Basis-Stack des Teams — dauerhafte Team-Tatsache, zur Journal hinzugefügt.", "scope": "fact", "content": "Team 'platform-core' nutzt Java 25 + Spring Boot 4… — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-output` | stage | 0.50 | 0.50 |  |
| `learn-envelope` | stage | 2.00 | 2.00 | {"type": "LEARN", "reason": "User nennt den Basis-Stack des Teams — dauerhafte Team-Tatsache, zur Journal hinzugefügt.", "scope": "fact", "content": "Team 'platform-core' nutzt Java 25 + Spring Boot 4… |
| `scope-fact` | check | 1.50 | 1.50 |  |
| `mode` | check | 0.75 | 0.75 | no mode pinned by this case |
| `content-present` | check | 1.50 | 1.50 |  |

</details>

| `learnsFactReplace` | OK | 1.00 | 3.9s | 52.7k | 465 | 1 | LEARN(scope=fact): {"content": "Team: 'platform-core'; arbeitet an den ms-* Repositories.", "message": "Notiert — Team 'platform-core', ms-* Repos.", "reason": "User nennt Team-Zugehörigkeit und Repo-Basis — dauerhafte … — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-output` | stage | 0.50 | 0.50 |  |
| `learn-envelope` | stage | 2.00 | 2.00 | {"content": "Team: 'platform-core'; arbeitet an den ms-* Repositories.", "message": "Notiert — Team 'platform-core', ms-* Repos.", "reason": "User nennt Team-Zugehörigkeit und Repo-Basis — dauerhafte … |
| `scope-fact` | check | 1.50 | 1.50 |  |
| `mode` | check | 0.75 | 0.75 | no mode pinned by this case |
| `content-present` | check | 1.50 | 1.50 |  |

</details>

| `learnsPersonaAppend` | OK | 1.00 | 4.8s | 53.1k | 1.0k | 2 | LEARN(scope=persona, mode=append): {"type": "LEARN", "reason": "User wants a durable style addition: code blocks first, no preamble — appending to existing persona.", "scope": "persona", "mode": "append", "content": "Antworten beginnen… — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-output` | stage | 0.50 | 0.50 |  |
| `learn-envelope` | stage | 2.00 | 2.00 | {"type": "LEARN", "reason": "User wants a durable style addition: code blocks first, no preamble — appending to existing persona.", "scope": "persona", "mode": "append", "content": "Antworten beginnen… |
| `scope-persona` | check | 1.50 | 1.50 |  |
| `mode` | check | 0.75 | 0.75 |  |
| `content-present` | check | 1.50 | 1.50 |  |

</details>

| `learnsPersonaReplace` | OK | 1.00 | 3.9s | 53.0k | 638 | 2 | LEARN(scope=persona, mode=replace): {"content": "Antwortstil: ausschließlich knappe Stichpunkte statt ganzer Sätze. Technischer Ton. Kein Smalltalk, keine Floskeln, keine Höflichkeitsbeigaben. Gilt für alle Antworten.", "mode": "replace… — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-output` | stage | 0.50 | 0.50 |  |
| `learn-envelope` | stage | 2.00 | 2.00 | {"content": "Antwortstil: ausschließlich knappe Stichpunkte statt ganzer Sätze. Technischer Ton. Kein Smalltalk, keine Floskeln, keine Höflichkeitsbeigaben. Gilt für alle Antworten.", "mode": "replace… |
| `scope-persona` | check | 1.50 | 1.50 |  |
| `mode` | check | 0.75 | 0.75 |  |
| `content-present` | check | 1.50 | 1.50 |  |

</details>

