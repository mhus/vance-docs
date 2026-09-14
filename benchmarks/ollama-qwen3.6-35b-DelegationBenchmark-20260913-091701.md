# Vance Benchmark - ollama-qwen3.6-35b-DelegationBenchmark-20260913-091701

- **Started:** 2026-09-13T09:17:01.707396Z
- **Judge:** glm-5.3-nvfp4
- **Knobs:** {chatTimeoutS=480, waitBudgetMinS=240}
- **Score model:** v2-graded
- **Total tests:** 3
- **Passed:** 2 / 3 (67%)
- **Average score:** 0.667
- **Total LLM time:** 317.4s
- **Total tokens (in / out):** 398.2k / 1.3k (9 round-trips)


## delegation

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `answersSimpleQuestionWithoutWorker` | OK | 1.00 | 39.0s | 88.3k | 824 | 2 | simple question answered directly — no worker spawn — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `no-delegation` | check | 2.00 | 2.00 | simple question answered without spawning a worker |
| `direct-answer` | check | 1.00 | 1.00 |  |

</details>

| `asksUserOnMissingEssential` | OK | 1.00 | 278.4s | 309.9k | 468 | 7 | escalated a referent-less request to the user — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `ask-user-fired` | check | 2.00 | 2.00 | ASK_USER action |
| `question-text` | check | 1.00 | 1.00 |  |

</details>

| `delegatesLongFormWork` | FAIL | 0.00 | - | - | - | - | 0% — 0/1 checks · missed: test-completed |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `test-completed` | stage | 0.00 | 1.00 | HttpTimeoutException: request timed out     at java.net.http/jdk.internal.net.http.HttpClientImpl.send(HttpClientImpl.java:921)     at java.net.http/jdk.internal.net.http.HttpClientFacade.send(HttpClientFacade.java:133)     at de.mhus.vance.aitest.FootProcess.postLine(FootProcess.java:285)     at de.mhus.vance.aitest.FootProcess.chat(FootProcess.java:262)     at de.mhus.vance.benchmark.AbstractBenchmark.sendChatTimed(AbstractBenchmark.java:281)     at de.mhus.vance.benchmark.AbstractBenchmark.sendChatTimed(AbstractBenchmark.java:267)     at de.mhus.vance.benchmark.DelegationBenchmark.delegatesLongFormWork(DelegationBenchmark.java:61)     at java.base/jdk.internal.reflect.DirectMethodHandleAccessor.invoke(DirectMethodHandleAccessor.java:104)     at java.base/java.lang.reflect.Method.invoke(Method.java:565)     at org.junit.platform.commons.util.ReflectionUtils.invokeMethod(ReflectionUtils.java:701)     at org.junit.platform.commons.support.ReflectionSupport.invokeMethod(ReflectionSupport.java:502)     at org.junit.jupiter.engine.support.MethodReflectionUtils.invoke(MethodReflectionUtils.java:45)     at org.junit.jupiter.engine.execution.MethodInvocation.proceed(MethodInvocation.java:61)     at org.junit.jupiter.engine.execution.InvocationInterceptorChain$ValidatingInvocation.proceed(InvocationInterceptorChain.java:124)     at de.mhus.vance.benchmark.result.BenchmarkExtension.interceptTestMethod(BenchmarkExtension.java:72)     ... 77 more |

</details>

