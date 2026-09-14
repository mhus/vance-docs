# Vance Benchmark - ollama-gpt-oss-20b-LearnActionBenchmark-20260912-224815

- **Started:** 2026-09-12T22:48:15.471701Z
- **Judge:** glm-5.3-nvfp4
- **Knobs:** {chatTimeoutS=480, waitBudgetMinS=240}
- **Score model:** v2-graded
- **Total tests:** 4
- **Passed:** 2 / 4 (50%)
- **Average score:** 0.603
- **Total LLM time:** 56.0s
- **Total tokens (in / out):** 297.1k / 2.0k (9 round-trips)


## learn-action

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `learnsFactAppend` | OK | 1.00 | 14.9s | 149.0k | 1.1k | 5 | LEARN(scope=fact): {   "type":"LEARN",   "scope":"fact",   "content":"Team platform-core uses Java 25 + Spring Boot 4 as the base stack.",   "reason":"Add new fact to team information." } — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-output` | stage | 0.50 | 0.50 |  |
| `learn-envelope` | stage | 2.00 | 2.00 | {   "type":"LEARN",   "scope":"fact",   "content":"Team platform-core uses Java 25 + Spring Boot 4 as the base stack.",   "reason":"Add new fact to team information." } |
| `scope-fact` | check | 1.50 | 1.50 |  |
| `mode` | check | 0.75 | 0.75 | no mode pinned by this case |
| `content-present` | check | 1.50 | 1.50 |  |

</details>

| `learnsFactReplace` | OK | 1.00 | 28.2s | 36.9k | 196 | 1 | LEARN(scope=fact): {"type":"LEARN","scope":"fact","content":"Team name: platform-core; working on ms-* repositories.","reason":"User provided a fact to remember."} — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-output` | stage | 0.50 | 0.50 |  |
| `learn-envelope` | stage | 2.00 | 2.00 | {"type":"LEARN","scope":"fact","content":"Team name: platform-core; working on ms-* repositories.","reason":"User provided a fact to remember."} |
| `scope-fact` | check | 1.50 | 1.50 |  |
| `mode` | check | 0.75 | 0.75 | no mode pinned by this case |
| `content-present` | check | 1.50 | 1.50 |  |

</details>

| `learnsPersonaAppend` | FAIL | 0.21 | 3.2s | 37.0k | 218 | 1 | no LEARN action emitted — 21% — 2/6 checks · missed: learn-envelope, scope-persona(skipped), mode(skipped), content-present(skipped) |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-output` | stage | 0.50 | 0.50 |  |
| `learn-envelope` | stage | 0.00 | 2.00 | no `{"type":"LEARN"…}` JSON — head: [tool-call arthur_action] {"type":"ASK_USER","message":"Welchen Codeblock brauchst du, und in welchem Kontext soll er stehen?","reason":"Klärung der Anforderungen"} |
| `scope-persona` | check | skipped | 1.50 | chain stopped earlier |
| `mode` | check | skipped | 0.75 | chain stopped earlier |
| `content-present` | check | skipped | 1.50 | chain stopped earlier |

</details>

| `learnsPersonaReplace` | FAIL | 0.21 | 9.8s | 74.2k | 504 | 2 | no LEARN action emitted — 21% — 2/6 checks · missed: learn-envelope, scope-persona(skipped), mode(skipped), content-present(skipped) |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-output` | stage | 0.50 | 0.50 |  |
| `learn-envelope` | stage | 0.00 | 2.00 | no `{"type":"LEARN"…}` JSON — head: [tool-call arthur_action] {"type":"ANSWER","message":"- Stil: kurze Stichpunkte, keine vollständigen Sätze\n- Technischer Ton, kein Smalltalk\n- Ab jetzt gilt diese Vorgabe für alle Antworten","reason… |
| `scope-persona` | check | skipped | 1.50 | chain stopped earlier |
| `mode` | check | skipped | 0.75 | chain stopped earlier |
| `content-present` | check | skipped | 1.50 | chain stopped earlier |

</details>

