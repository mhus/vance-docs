# Vance Benchmark - ollama-gemma4-31b-mlx-DelegationBenchmark-20260913-025543

- **Started:** 2026-09-13T02:55:43.493004Z
- **Judge:** glm-5.3-nvfp4
- **Knobs:** {chatTimeoutS=480, waitBudgetMinS=240}
- **Score model:** v2-graded
- **Total tests:** 3
- **Passed:** 1 / 3 (33%)
- **Average score:** 0.708
- **Total LLM time:** 471.2s
- **Total tokens (in / out):** 235.0k / 7.2k (18 round-trips)


## delegation

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `answersSimpleQuestionWithoutWorker` | FAIL | 0.50 | 8.1s | 42.7k | 54 | 1 | trivia was delegated to a worker — the mirror failure of never delegating — 50% — 2/3 checks · missed: no-delegation |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `no-delegation` | check | 0.00 | 2.00 | DELEGATE or worker spawn on a simple question |
| `direct-answer` | check | 1.00 | 1.00 |  |

</details>

| `asksUserOnMissingEssential` | OK | 1.00 | 97.8s | 128.2k | 136 | 3 | escalated a referent-less request to the user — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `ask-user-fired` | check | 2.00 | 2.00 | ASK_USER action |
| `question-text` | check | 1.00 | 1.00 |  |

</details>

| `delegatesLongFormWork` | FAIL | 0.63 | 365.3s | 64.0k | 7.0k | 14 | worker spawned but never settled: slartibartfast-561ee2 status=CLOSED closeReason=STALE — 63% — 3/5 checks · missed: worker-done, artifact-exists |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `delegate-fired` | check | 2.00 | 2.00 | DELEGATE action |
| `worker-spawned` | check | 2.00 | 2.00 | worker(s): slartibartfast-561ee2 |
| `worker-done` | check | 0.00 | 1.50 | slartibartfast-561ee2 status=CLOSED closeReason=STALE |
| `artifact-exists` | check | 0.00 | 1.50 | no document at benchmark/delegation/space-history.md |

</details>

