# Vance Benchmark - ollama-gpt-oss-20b-DelegationBenchmark-20260912-222321

- **Started:** 2026-09-12T22:23:21.806808Z
- **Judge:** glm-5.3-nvfp4
- **Knobs:** {chatTimeoutS=480, waitBudgetMinS=240}
- **Score model:** v2-graded
- **Total tests:** 3
- **Passed:** 2 / 3 (67%)
- **Average score:** 0.708
- **Total LLM time:** 107.8s
- **Total tokens (in / out):** 336.4k / 2.7k (9 round-trips)


## delegation

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `answersSimpleQuestionWithoutWorker` | OK | 1.00 | 26.6s | 36.9k | 180 | 1 | simple question answered directly — no worker spawn — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `no-delegation` | check | 2.00 | 2.00 | simple question answered without spawning a worker |
| `direct-answer` | check | 1.00 | 1.00 |  |

</details>

| `asksUserOnMissingEssential` | OK | 1.00 | 38.9s | 111.1k | 1.0k | 3 | escalated a referent-less request to the user — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `ask-user-fired` | check | 2.00 | 2.00 | ASK_USER action |
| `question-text` | check | 1.00 | 1.00 |  |

</details>

| `delegatesLongFormWork` | FAIL | 0.13 | 42.3s | 188.3k | 1.4k | 5 | no DELEGATE — long-form work stayed in the chat — 13% — 1/5 checks · missed: delegate-fired, worker-spawned, worker-done, artifact-exists |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `delegate-fired` | check | 0.00 | 2.00 | no DELEGATE action |
| `worker-spawned` | check | 0.00 | 2.00 | no worker process under the chat process |
| `worker-done` | check | 0.00 | 1.50 | no worker process |
| `artifact-exists` | check | 0.00 | 1.50 | no document at benchmark/delegation/space-history.md |

</details>

