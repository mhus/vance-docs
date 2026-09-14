# Vance Benchmark - ollama-laguna-s-2.1-nvfp4-LearnActionBenchmark-20260913-220000

- **Started:** 2026-09-13T22:00:00.303049Z
- **Judge:** glm-5.3-nvfp4
- **Knobs:** {chatTimeoutS=480, waitBudgetMinS=240}
- **Score model:** v2-graded
- **Total tests:** 4
- **Passed:** 4 / 4 (100%)
- **Average score:** 1.000
- **Total LLM time:** 78.7s
- **Total tokens (in / out):** 217.0k / 576 (7 round-trips)


## learn-action

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `learnsFactAppend` | OK | 1.00 | 15.8s | 54.3k | 161 | 2 | LEARN(scope=fact): {"type":"LEARN","reason":"User added Java 25 + Spring Boot 4 as the team's base stack — appending to team facts.","scope":"fact","content":"Team platform-core uses Java 25 + Spring Boot 4 as the base … — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-output` | stage | 0.50 | 0.50 |  |
| `learn-envelope` | stage | 2.00 | 2.00 | {"type":"LEARN","reason":"User added Java 25 + Spring Boot 4 as the team's base stack — appending to team facts.","scope":"fact","content":"Team platform-core uses Java 25 + Spring Boot 4 as the base … |
| `scope-fact` | check | 1.50 | 1.50 |  |
| `mode` | check | 0.75 | 0.75 | no mode pinned by this case |
| `content-present` | check | 1.50 | 1.50 |  |

</details>

| `learnsFactReplace` | OK | 1.00 | 45.5s | 54.0k | 89 | 1 | LEARN(scope=fact): {"type":"LEARN","reason":"User volunteered a stable team fact worth remembering across sessions.","scope":"fact","content":"Team: platform-core. Works on the ms-* repositories."} — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-output` | stage | 0.50 | 0.50 |  |
| `learn-envelope` | stage | 2.00 | 2.00 | {"type":"LEARN","reason":"User volunteered a stable team fact worth remembering across sessions.","scope":"fact","content":"Team: platform-core. Works on the ms-* repositories."} |
| `scope-fact` | check | 1.50 | 1.50 |  |
| `mode` | check | 0.75 | 0.75 | no mode pinned by this case |
| `content-present` | check | 1.50 | 1.50 |  |

</details>

| `learnsPersonaAppend` | OK | 1.00 | 8.6s | 54.4k | 170 | 2 | LEARN(scope=persona, mode=append): {"type":"LEARN","reason":"User wants code blocks at the start of answers, no preamble — appending to persona.","scope":"persona","mode":"append","content":"Code blocks at the start of the answer, no l… — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-output` | stage | 0.50 | 0.50 |  |
| `learn-envelope` | stage | 2.00 | 2.00 | {"type":"LEARN","reason":"User wants code blocks at the start of answers, no preamble — appending to persona.","scope":"persona","mode":"append","content":"Code blocks at the start of the answer, no l… |
| `scope-persona` | check | 1.50 | 1.50 |  |
| `mode` | check | 0.75 | 0.75 |  |
| `content-present` | check | 1.50 | 1.50 |  |

</details>

| `learnsPersonaReplace` | OK | 1.00 | 8.7s | 54.4k | 156 | 2 | LEARN(scope=persona, mode=replace): {"type":"LEARN","reason":"User wants to replace the entire persona summary with a new communication style.","scope":"persona","mode":"replace","content":"Knappe Stichpunkte, technischer Ton, kein Smal… — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-output` | stage | 0.50 | 0.50 |  |
| `learn-envelope` | stage | 2.00 | 2.00 | {"type":"LEARN","reason":"User wants to replace the entire persona summary with a new communication style.","scope":"persona","mode":"replace","content":"Knappe Stichpunkte, technischer Ton, kein Smal… |
| `scope-persona` | check | 1.50 | 1.50 |  |
| `mode` | check | 0.75 | 0.75 |  |
| `content-present` | check | 1.50 | 1.50 |  |

</details>

