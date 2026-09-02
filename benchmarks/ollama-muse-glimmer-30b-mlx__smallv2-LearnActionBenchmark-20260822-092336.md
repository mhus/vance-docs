# Vance Benchmark - ollama-muse-glimmer-30b-mlx__smallv2-LearnActionBenchmark-20260822-092336

- **Started:** 2026-08-22T09:23:36.048476Z
- **Judge:** gemini-gemini-2.5-pro
- **Knobs:** {chatTimeoutS=600, waitBudgetMinS=300}
- **Score model:** v2-graded
- **Total tests:** 4
- **Passed:** 4 / 4 (100%)
- **Average score:** 1.000
- **Total LLM time:** 259.8s
- **Total tokens (in / out):** 575.9k / 3.0k (17 round-trips)


## learn-action

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `learnsFactAppend` | OK | 1.00 | 84.0s | 453.6k | 1.3k | 12 | LEARN(scope=fact): {"type":"LEARN","reason":"User provided durable team stack detail to persist.","scope":"fact","content":"Team platform-core uses Java 25 + Spring Boot 4 as base stack, works on ms-* repos."} — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-output` | stage | 0.50 | 0.50 |  |
| `learn-envelope` | stage | 2.00 | 2.00 | {"type":"LEARN","reason":"User provided durable team stack detail to persist.","scope":"fact","content":"Team platform-core uses Java 25 + Spring Boot 4 as base stack, works on ms-* repos."} |
| `scope-fact` | check | 1.50 | 1.50 |  |
| `mode` | check | 0.75 | 0.75 | no mode pinned by this case |
| `content-present` | check | 1.50 | 1.50 |  |

</details>

| `learnsFactReplace` | OK | 1.00 | 64.6s | 40.5k | 399 | 1 | LEARN(scope=fact): {"type":"LEARN","reason":"User volunteered durable team context to remember.","scope":"fact","content":"Mein Team heißt 'platform-core' und arbeitet auf den ms-* Repos."} — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-output` | stage | 0.50 | 0.50 |  |
| `learn-envelope` | stage | 2.00 | 2.00 | {"type":"LEARN","reason":"User volunteered durable team context to remember.","scope":"fact","content":"Mein Team heißt 'platform-core' und arbeitet auf den ms-* Repos."} |
| `scope-fact` | check | 1.50 | 1.50 |  |
| `mode` | check | 0.75 | 0.75 | no mode pinned by this case |
| `content-present` | check | 1.50 | 1.50 |  |

</details>

| `learnsPersonaAppend` | OK | 1.00 | 59.3s | 41.0k | 790 | 2 | LEARN(scope=persona, mode=append): {"type":"LEARN","reason":"User wants style change persisted to persona","scope":"persona","mode":"append","content":"Antworten immer mit Code-Block direkt am Anfang, ohne lange Einleitung."} — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-output` | stage | 0.50 | 0.50 |  |
| `learn-envelope` | stage | 2.00 | 2.00 | {"type":"LEARN","reason":"User wants style change persisted to persona","scope":"persona","mode":"append","content":"Antworten immer mit Code-Block direkt am Anfang, ohne lange Einleitung."} |
| `scope-persona` | check | 1.50 | 1.50 |  |
| `mode` | check | 0.75 | 0.75 |  |
| `content-present` | check | 1.50 | 1.50 |  |

</details>

| `learnsPersonaReplace` | OK | 1.00 | 52.0s | 40.8k | 522 | 2 | LEARN(scope=persona, mode=replace): {"type":"LEARN","reason":"User explicitly changes communication style preference.","scope":"persona","mode":"replace","content":"Antwortstil: knappe Stichpunkte statt ganzer Sätze\nTon: technisch\nSma… — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-output` | stage | 0.50 | 0.50 |  |
| `learn-envelope` | stage | 2.00 | 2.00 | {"type":"LEARN","reason":"User explicitly changes communication style preference.","scope":"persona","mode":"replace","content":"Antwortstil: knappe Stichpunkte statt ganzer Sätze\nTon: technisch\nSma… |
| `scope-persona` | check | 1.50 | 1.50 |  |
| `mode` | check | 0.75 | 0.75 |  |
| `content-present` | check | 1.50 | 1.50 |  |

</details>

