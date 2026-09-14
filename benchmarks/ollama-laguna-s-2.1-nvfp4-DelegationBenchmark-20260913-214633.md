# Vance Benchmark - ollama-laguna-s-2.1-nvfp4-DelegationBenchmark-20260913-214633

- **Started:** 2026-09-13T21:46:33.545507Z
- **Judge:** glm-5.3-nvfp4
- **Knobs:** {chatTimeoutS=480, waitBudgetMinS=240}
- **Score model:** v2-graded
- **Total tests:** 3
- **Passed:** 2 / 3 (67%)
- **Average score:** 0.708
- **Total LLM time:** 159.3s
- **Total tokens (in / out):** 447.1k / 5.8k (8 round-trips)


## delegation

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `answersSimpleQuestionWithoutWorker` | OK | 1.00 | 40.5s | 108.4k | 648 | 2 | simple question answered directly — no worker spawn — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `no-delegation` | check | 2.00 | 2.00 | simple question answered without spawning a worker |
| `direct-answer` | check | 1.00 | 1.00 |  |

</details>

| `asksUserOnMissingEssential` | OK | 1.00 | 8.6s | 167.8k | 236 | 3 | escalated a referent-less request to the user — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `ask-user-fired` | check | 2.00 | 2.00 | ASK_USER action |
| `question-text` | check | 1.00 | 1.00 |  |

</details>

| `delegatesLongFormWork` | FAIL | 0.13 | 110.2s | 170.9k | 4.9k | 3 | no DELEGATE — long-form work stayed in the chat — 13% — 1/5 checks · missed: delegate-fired, worker-spawned, worker-done, artifact-exists |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `delegate-fired` | check | 0.00 | 2.00 | no DELEGATE action |
| `worker-spawned` | check | 0.00 | 2.00 | no worker process under the chat process |
| `worker-done` | check | 0.00 | 1.50 | no worker process |
| `artifact-exists` | check | 0.00 | 1.50 | no document at benchmark/delegation/space-history.md |

</details>

