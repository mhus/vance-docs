# Vance Benchmark - ollama-gpt-oss-20b__smallv2-LearnActionBenchmark-20260822-054315

- **Started:** 2026-08-22T05:43:15.070768Z
- **Judge:** gemini-gemini-2.5-pro
- **Knobs:** {chatTimeoutS=600, waitBudgetMinS=300}
- **Score model:** v2-graded
- **Total tests:** 4
- **Passed:** 2 / 4 (50%)
- **Average score:** 0.603
- **Total LLM time:** 44.8s
- **Total tokens (in / out):** 235.9k / 1.8k (8 round-trips)


## learn-action

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `learnsFactAppend` | OK | 1.00 | 7.9s | 33.8k | 706 | 2 | LEARN(scope=fact): {"type":"LEARN","scope":"fact","content":"Java 25 + Spring Boot 4 as the base stack.","reason":"User requested to add team info about Java and Spring Boot versions."} — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-output` | stage | 0.50 | 0.50 |  |
| `learn-envelope` | stage | 2.00 | 2.00 | {"type":"LEARN","scope":"fact","content":"Java 25 + Spring Boot 4 as the base stack.","reason":"User requested to add team info about Java and Spring Boot versions."} |
| `scope-fact` | check | 1.50 | 1.50 |  |
| `mode` | check | 0.75 | 0.75 | no mode pinned by this case |
| `content-present` | check | 1.50 | 1.50 |  |

</details>

| `learnsFactReplace` | OK | 1.00 | 26.8s | 101.1k | 370 | 3 | LEARN(scope=fact): {"type":"LEARN","reason":"Store user-provided fact about team and repo scope","scope":"fact","content":"User’s team name: platform-core; working on ms-* repos"} — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-output` | stage | 0.50 | 0.50 |  |
| `learn-envelope` | stage | 2.00 | 2.00 | {"type":"LEARN","reason":"Store user-provided fact about team and repo scope","scope":"fact","content":"User’s team name: platform-core; working on ms-* repos"} |
| `scope-fact` | check | 1.50 | 1.50 |  |
| `mode` | check | 0.75 | 0.75 | no mode pinned by this case |
| `content-present` | check | 1.50 | 1.50 |  |

</details>

| `learnsPersonaAppend` | FAIL | 0.21 | 3.7s | 33.6k | 289 | 1 | no LEARN action emitted — 21% — 2/6 checks · missed: learn-envelope, scope-persona(skipped), mode(skipped), content-present(skipped) |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-output` | stage | 0.50 | 0.50 |  |
| `learn-envelope` | stage | 0.00 | 2.00 | no `{"type":"LEARN"…}` JSON — head: [tool-call arthur_action] {"type":"ANSWER","message":"```markdown\nHier ein Beispiel, wie du das machen könntest:\n\n```java\npublic class HelloWorld {\n    public static void main(String[] args) {\n … |
| `scope-persona` | check | skipped | 1.50 | chain stopped earlier |
| `mode` | check | skipped | 0.75 | chain stopped earlier |
| `content-present` | check | skipped | 1.50 | chain stopped earlier |

</details>

| `learnsPersonaReplace` | FAIL | 0.21 | 6.3s | 67.4k | 455 | 2 | no LEARN action emitted — 21% — 2/6 checks · missed: learn-envelope, scope-persona(skipped), mode(skipped), content-present(skipped) |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-output` | stage | 0.50 | 0.50 |  |
| `learn-envelope` | stage | 0.00 | 2.00 | no `{"type":"LEARN"…}` JSON — head: [tool-call arthur_action] {"type":"ANSWER","message":"- Stil: knappe Stichpunkte\n- Ton: technisch\n- Kein Smalltalk\n- Umsetzung: Alle zukünftigen Antworten im genannten Format\n- Status: Bestätigt, … |
| `scope-persona` | check | skipped | 1.50 | chain stopped earlier |
| `mode` | check | skipped | 0.75 | chain stopped earlier |
| `content-present` | check | skipped | 1.50 | chain stopped earlier |

</details>

