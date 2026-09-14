# Vance Benchmark - ollama-muse-glimmer-30b-mlx-VogonWorkerBenchmark-20260913-061318

- **Started:** 2026-09-13T06:13:18.014192Z
- **Judge:** glm-5.3-nvfp4
- **Knobs:** {chatTimeoutS=480, waitBudgetMinS=240}
- **Score model:** v2-graded
- **Total tests:** 1
- **Passed:** 1 / 1 (100%)
- **Average score:** 1.000
- **Total LLM time:** 0ms
- **Total tokens (in / out):** 0 / 0 (0 round-trips)


## vogon-worker

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `vogonRunsTwoPhaseWorkflow` | OK | 1.00 | - | - | - | - | full vogon contract: StartRecord → two phase workers → ordered state walk → terminal DONE — 100% — 6/6 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `worker-spawned` | stage | 1.00 | 1.00 | vogon-bench-80508f |
| `engine-vogon` | check | 1.00 | 1.00 | thinkEngine=vogon |
| `workflow-started` | check | 1.00 | 1.00 | StartRecord bound to the spawned process, run 7386737675974de9adae7d65dac794c3 |
| `journal-walked` | check | 2.00 | 2.00 | state walk first → second → accept in order |
| `phase-workers-started` | check | 1.50 | 1.50 | two TaskStartedRecords with subProcessId |
| `run-done` | check | 2.00 | 2.00 | StatusRecord DONE (terminal success) |

</details>

