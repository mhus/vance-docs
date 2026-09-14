# Vance Benchmark - ollama-muse-glimmer-30b-mlx-DelegationBenchmark-20260913-064935

- **Started:** 2026-09-13T06:49:35.598632Z
- **Judge:** glm-5.3-nvfp4
- **Knobs:** {chatTimeoutS=480, waitBudgetMinS=240}
- **Score model:** v2-graded
- **Total tests:** 3
- **Passed:** 3 / 3 (100%)
- **Average score:** 1.000
- **Total LLM time:** 203.9s
- **Total tokens (in / out):** 169.5k / 2.6k (6 round-trips)


## delegation

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `answersSimpleQuestionWithoutWorker` | OK | 1.00 | 65.8s | 44.2k | 324 | 1 | simple question answered directly — no worker spawn — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `no-delegation` | check | 2.00 | 2.00 | simple question answered without spawning a worker |
| `direct-answer` | check | 1.00 | 1.00 |  |

</details>

| `asksUserOnMissingEssential` | OK | 1.00 | 56.5s | 44.2k | 213 | 1 | escalated a referent-less request to the user — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `ask-user-fired` | check | 2.00 | 2.00 | ASK_USER action |
| `question-text` | check | 1.00 | 1.00 |  |

</details>

| `delegatesLongFormWork` | OK | 1.00 | 81.6s | 81.2k | 2.1k | 4 | full delegation: DELEGATE → worker settled, artifact stored — 100% — 5/5 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `delegate-fired` | check | 2.00 | 2.00 | DELEGATE action |
| `worker-spawned` | check | 2.00 | 2.00 | worker(s): delegated-31e82c |
| `worker-done` | check | 1.50 | 1.50 | worker settled (IDLE or CLOSED/DONE) |
| `artifact-exists` | check | 1.50 | 1.50 | document at benchmark/delegation/space-history.md |

</details>

