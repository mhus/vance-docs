# Vance Benchmark - glm-5.3-nvfp4-DelegationBenchmark-20260912-194755

- **Started:** 2026-09-12T19:47:55.602862Z
- **Judge:** glm-5.3-nvfp4
- **Score model:** v2-graded
- **Total tests:** 3
- **Passed:** 3 / 3 (100%)
- **Average score:** 1.000
- **Total LLM time:** 91.9s
- **Total tokens (in / out):** 568.3k / 21.0k (15 round-trips)


## delegation

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `answersSimpleQuestionWithoutWorker` | OK | 1.00 | 4.5s | 52.7k | 388 | 1 | simple question answered directly — no worker spawn — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `no-delegation` | check | 2.00 | 2.00 | simple question answered without spawning a worker |
| `direct-answer` | check | 1.00 | 1.00 |  |

</details>

| `asksUserOnMissingEssential` | OK | 1.00 | 31.5s | 324.6k | 6.7k | 6 | escalated a referent-less request to the user — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `ask-user-fired` | check | 2.00 | 2.00 | ASK_USER action |
| `question-text` | check | 1.00 | 1.00 |  |

</details>

| `delegatesLongFormWork` | OK | 1.00 | 55.9s | 191.0k | 13.8k | 8 | full delegation: DELEGATE → worker settled, artifact stored — 100% — 5/5 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `delegate-fired` | check | 2.00 | 2.00 | DELEGATE action |
| `worker-spawned` | check | 2.00 | 2.00 | worker(s): default-b85fec |
| `worker-done` | check | 1.50 | 1.50 | worker settled (IDLE or CLOSED/DONE) |
| `artifact-exists` | check | 1.50 | 1.50 | document at benchmark/delegation/space-history.md |

</details>

