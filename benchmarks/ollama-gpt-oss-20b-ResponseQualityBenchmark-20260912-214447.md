# Vance Benchmark - ollama-gpt-oss-20b-ResponseQualityBenchmark-20260912-214447

- **Started:** 2026-09-12T21:44:47.410429Z
- **Judge:** glm-5.3-nvfp4
- **Knobs:** {chatTimeoutS=480, waitBudgetMinS=240}
- **Score model:** v2-graded
- **Total tests:** 2
- **Passed:** 2 / 2 (100%)
- **Average score:** 1.000
- **Total LLM time:** 15.2s
- **Total tokens (in / out):** 185.9k / 836 (5 round-trips)


## response-quality

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `answersInGermanWhenAskedInGerman` | OK | 1.00 | 6.0s | 36.9k | 293 | 1 | German question, German answer with substance — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `german-reply` | check | 2.00 | 2.00 | German function words dominate (16 vs 2) |
| `answer-body` | check | 0.50 | 0.50 | 1073 chars |

</details>

| `answersWithGroundedCount` | OK | 1.00 | 9.2s | 149.0k | 543 | 4 | grounded answer: checklist read, count correct — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `read-checklist` | check | 1.50 | 1.50 | doc_read on the checklist |
| `correct-count` | check | 2.00 | 2.00 | answer names 8/acht |

</details>

