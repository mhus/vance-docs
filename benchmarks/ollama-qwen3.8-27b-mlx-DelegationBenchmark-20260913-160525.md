# Vance Benchmark - ollama-qwen3.8-27b-mlx-DelegationBenchmark-20260913-160525

- **Started:** 2026-09-13T16:05:25.220081Z
- **Judge:** glm-5.3-nvfp4
- **Knobs:** {chatTimeoutS=480, waitBudgetMinS=240}
- **Score model:** v2-graded
- **Total tests:** 3
- **Passed:** 3 / 3 (100%)
- **Average score:** 1.000
- **Total LLM time:** 328.7s
- **Total tokens (in / out):** 250.9k / 7.1k (9 round-trips)


## delegation

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `answersSimpleQuestionWithoutWorker` | OK | 1.00 | 95.9s | 43.9k | 407 | 1 | simple question answered directly — no worker spawn — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `no-delegation` | check | 2.00 | 2.00 | simple question answered without spawning a worker |
| `direct-answer` | check | 1.00 | 1.00 |  |

</details>

| `asksUserOnMissingEssential` | OK | 1.00 | 23.9s | 88.0k | 333 | 2 | escalated a referent-less request to the user — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `ask-user-fired` | check | 2.00 | 2.00 | ASK_USER action |
| `question-text` | check | 1.00 | 1.00 |  |

</details>

| `delegatesLongFormWork` | OK | 1.00 | 208.9s | 119.1k | 6.4k | 6 | full delegation: DELEGATE → worker settled, artifact stored — 100% — 5/5 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `delegate-fired` | check | 2.00 | 2.00 | DELEGATE action |
| `worker-spawned` | check | 2.00 | 2.00 | worker(s): delegated-f7e015 |
| `worker-done` | check | 1.50 | 1.50 | worker settled (IDLE or CLOSED/DONE) |
| `artifact-exists` | check | 1.50 | 1.50 | document at benchmark/delegation/space-history.md |

</details>

