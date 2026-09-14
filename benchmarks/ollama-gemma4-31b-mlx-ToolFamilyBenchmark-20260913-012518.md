# Vance Benchmark - ollama-gemma4-31b-mlx-ToolFamilyBenchmark-20260913-012518

- **Started:** 2026-09-13T01:25:18.543434Z
- **Judge:** glm-5.3-nvfp4
- **Knobs:** {chatTimeoutS=480, waitBudgetMinS=240}
- **Score model:** v2-graded
- **Total tests:** 10
- **Passed:** 8 / 10 (80%)
- **Average score:** 0.800
- **Total LLM time:** 1963.9s
- **Total tokens (in / out):** 1.04M / 1.3k (26 round-trips)


## tool-family

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `picksCalendarFamily` | FAIL | 0.00 | - | - | - | - | 0% — 0/1 checks · missed: test-completed |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `test-completed` | stage | 0.00 | 1.00 | HttpTimeoutException: request timed out     at java.net.http/jdk.internal.net.http.HttpClientImpl.send(HttpClientImpl.java:921)     at java.net.http/jdk.internal.net.http.HttpClientFacade.send(HttpClientFacade.java:133)     at de.mhus.vance.aitest.FootProcess.postLine(FootProcess.java:285)     at de.mhus.vance.aitest.FootProcess.chat(FootProcess.java:262)     at de.mhus.vance.benchmark.AbstractBenchmark.sendChatTimed(AbstractBenchmark.java:281)     at de.mhus.vance.benchmark.AbstractBenchmark.sendChatTimed(AbstractBenchmark.java:267)     at de.mhus.vance.benchmark.ToolFamilyBenchmark.runFamilyCase(ToolFamilyBenchmark.java:207)     at de.mhus.vance.benchmark.ToolFamilyBenchmark.runFamilyCase(ToolFamilyBenchmark.java:181)     at de.mhus.vance.benchmark.ToolFamilyBenchmark.picksCalendarFamily(ToolFamilyBenchmark.java:47)     at java.base/jdk.internal.reflect.DirectMethodHandleAccessor.invoke(DirectMethodHandleAccessor.java:104)     at java.base/java.lang.reflect.Method.invoke(Method.java:565)     at org.junit.platform.commons.util.ReflectionUtils.invokeMethod(ReflectionUtils.java:701)     at org.junit.platform.commons.support.ReflectionSupport.invokeMethod(ReflectionSupport.java:502)     at org.junit.jupiter.engine.support.MethodReflectionUtils.invoke(MethodReflectionUtils.java:45)     at org.junit.jupiter.engine.execution.MethodInvocation.proceed(MethodInvocation.java:61)     ... 79 more |

</details>

| `picksDocFamily` | OK | 1.00 | 302.2s | 128.7k | 119 | 3 | family 'doc_*' hit via [doc_write] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-doc` | stage | 4.00 | 4.00 | doc_write |

</details>

| `picksGraphFamily` | FAIL | 0.00 | - | - | - | - | 0% — 0/1 checks · missed: test-completed |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `test-completed` | stage | 0.00 | 1.00 | HttpTimeoutException: request timed out     at java.net.http/jdk.internal.net.http.HttpClientImpl.send(HttpClientImpl.java:921)     at java.net.http/jdk.internal.net.http.HttpClientFacade.send(HttpClientFacade.java:133)     at de.mhus.vance.aitest.FootProcess.postLine(FootProcess.java:285)     at de.mhus.vance.aitest.FootProcess.chat(FootProcess.java:262)     at de.mhus.vance.benchmark.AbstractBenchmark.sendChatTimed(AbstractBenchmark.java:281)     at de.mhus.vance.benchmark.AbstractBenchmark.sendChatTimed(AbstractBenchmark.java:267)     at de.mhus.vance.benchmark.ToolFamilyBenchmark.runFamilyCase(ToolFamilyBenchmark.java:207)     at de.mhus.vance.benchmark.ToolFamilyBenchmark.runFamilyCase(ToolFamilyBenchmark.java:181)     at de.mhus.vance.benchmark.ToolFamilyBenchmark.picksGraphFamily(ToolFamilyBenchmark.java:102)     at java.base/jdk.internal.reflect.DirectMethodHandleAccessor.invoke(DirectMethodHandleAccessor.java:104)     at java.base/java.lang.reflect.Method.invoke(Method.java:565)     at org.junit.platform.commons.util.ReflectionUtils.invokeMethod(ReflectionUtils.java:701)     at org.junit.platform.commons.support.ReflectionSupport.invokeMethod(ReflectionSupport.java:502)     at org.junit.jupiter.engine.support.MethodReflectionUtils.invoke(MethodReflectionUtils.java:45)     at org.junit.jupiter.engine.execution.MethodInvocation.proceed(MethodInvocation.java:61)     ... 79 more |

</details>

| `picksHookFamily` | OK | 1.00 | 98.3s | 79.1k | 167 | 3 | family 'hook_*' hit via [hook_list] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-hook` | stage | 4.00 | 4.00 | hook_list |

</details>

| `picksListFamily` | OK | 1.00 | 286.1s | 172.2k | 247 | 4 | family 'list_*' hit via [list_append] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-list` | stage | 4.00 | 4.00 | list_append |

</details>

| `picksRecordsFamily` | OK | 1.00 | 376.6s | 214.8k | 156 | 5 | family 'records_*' hit via [records_add_column] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-records` | stage | 4.00 | 4.00 | records_add_column |

</details>

| `picksSchedulerFamily` | OK | 1.00 | 96.9s | 60.1k | 114 | 2 | family 'scheduler_*' hit via [scheduler_list] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-scheduler` | stage | 4.00 | 4.00 | scheduler_list |

</details>

| `picksScratchFamily` | OK | 1.00 | 161.9s | 128.6k | 139 | 3 | family 'scratchpad_*' hit via [scratchpad_set] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-scratchpad` | stage | 4.00 | 4.00 | scratchpad_set |

</details>

| `picksSheetFamily` | OK | 1.00 | 436.3s | 86.2k | 226 | 2 | family 'sheet_*' hit via [sheet_set_cell] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-sheet` | stage | 4.00 | 4.00 | sheet_set_cell |

</details>

| `picksTreeFamily` | OK | 1.00 | 205.7s | 171.8k | 170 | 4 | family 'tree_*' hit via [tree_add_child, tree_get] — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `any-tool-called` | stage | 1.00 | 1.00 |  |
| `family-tree` | stage | 4.00 | 4.00 | tree_add_child, tree_get |

</details>

