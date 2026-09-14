# Vance Benchmark - ollama-muse-glimmer-30b-mlx-LearnActionBenchmark-20260913-071705

- **Started:** 2026-09-13T07:17:05.774314Z
- **Judge:** glm-5.3-nvfp4
- **Knobs:** {chatTimeoutS=480, waitBudgetMinS=240}
- **Score model:** v2-graded
- **Total tests:** 4
- **Passed:** 4 / 4 (100%)
- **Average score:** 1.000
- **Total LLM time:** 297.6s
- **Total tokens (in / out):** 1.04M / 3.3k (26 round-trips)


## learn-action

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `learnsFactAppend` | OK | 1.00 | 104.8s | 909.2k | 1.9k | 21 | LEARN(scope=fact): {"type":"LEARN","reason":"User provided durable team stack detail to persist.","scope":"fact","content":"Team platform-core uses Java 25 + Spring Boot 4 as base stack."} — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-output` | stage | 0.50 | 0.50 |  |
| `learn-envelope` | stage | 2.00 | 2.00 | {"type":"LEARN","reason":"User provided durable team stack detail to persist.","scope":"fact","content":"Team platform-core uses Java 25 + Spring Boot 4 as base stack."} |
| `scope-fact` | check | 1.50 | 1.50 |  |
| `mode` | check | 0.75 | 0.75 | no mode pinned by this case |
| `content-present` | check | 1.50 | 1.50 |  |

</details>

| `learnsFactReplace` | OK | 1.00 | 68.5s | 44.2k | 247 | 1 | LEARN(scope=fact): {"type":"LEARN","reason":"User volunteered durable team and repo information to remember.","scope":"fact","content":"User's team is 'platform-core' and works on the ms-* repositories."} — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-output` | stage | 0.50 | 0.50 |  |
| `learn-envelope` | stage | 2.00 | 2.00 | {"type":"LEARN","reason":"User volunteered durable team and repo information to remember.","scope":"fact","content":"User's team is 'platform-core' and works on the ms-* repositories."} |
| `scope-fact` | check | 1.50 | 1.50 |  |
| `mode` | check | 0.75 | 0.75 | no mode pinned by this case |
| `content-present` | check | 1.50 | 1.50 |  |

</details>

| `learnsPersonaAppend` | OK | 1.00 | 62.6s | 44.6k | 568 | 2 | LEARN(scope=persona, mode=append): {"type":"LEARN","reason":"User added a style preference about starting answers with a code block and no long intro.","scope":"persona","mode":"append","content":"Antwortstil ergänzt: Code-Block direkt… — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-output` | stage | 0.50 | 0.50 |  |
| `learn-envelope` | stage | 2.00 | 2.00 | {"type":"LEARN","reason":"User added a style preference about starting answers with a code block and no long intro.","scope":"persona","mode":"append","content":"Antwortstil ergänzt: Code-Block direkt… |
| `scope-persona` | check | 1.50 | 1.50 |  |
| `mode` | check | 0.75 | 0.75 |  |
| `content-present` | check | 1.50 | 1.50 |  |

</details>

| `learnsPersonaReplace` | OK | 1.00 | 61.6s | 44.5k | 588 | 2 | LEARN(scope=persona, mode=replace): {"type":"LEARN","reason":"User explicitly changed preferred communication style to bullet points, technical tone, no small talk.","scope":"persona","content":"Antwortstil: knappe Stichpunkte statt gan… — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-output` | stage | 0.50 | 0.50 |  |
| `learn-envelope` | stage | 2.00 | 2.00 | {"type":"LEARN","reason":"User explicitly changed preferred communication style to bullet points, technical tone, no small talk.","scope":"persona","content":"Antwortstil: knappe Stichpunkte statt gan… |
| `scope-persona` | check | 1.50 | 1.50 |  |
| `mode` | check | 0.75 | 0.75 |  |
| `content-present` | check | 1.50 | 1.50 |  |

</details>

