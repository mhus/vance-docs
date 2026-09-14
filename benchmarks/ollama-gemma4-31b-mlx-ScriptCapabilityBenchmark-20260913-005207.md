# Vance Benchmark - ollama-gemma4-31b-mlx-ScriptCapabilityBenchmark-20260913-005207

- **Started:** 2026-09-13T00:52:07.280157Z
- **Judge:** glm-5.3-nvfp4
- **Knobs:** {chatTimeoutS=480, waitBudgetMinS=240}
- **Score model:** v2-graded
- **Total tests:** 5
- **Passed:** 3 / 5 (60%)
- **Average score:** 0.600
- **Total LLM time:** 1259.6s
- **Total tokens (in / out):** 474.2k / 1.2k (11 round-trips)


## script-javascript

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `executesJavaScriptJsonTransform` | OK | 1.00 | 392.1s | 129.1k | 340 | 3 | tool=execute_javascript, expected output present — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.50 | 1.50 |  |
| `tool-executed` | check | 2.00 | 2.00 | tool=execute_javascript |
| `expected-output` | counted | 2/2 | 2.00 | all present |

</details>

| `executesJavaScriptPrimes` | OK | 1.00 | 431.5s | 129.0k | 393 | 3 | tool=execute_javascript, expected output present — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.50 | 1.50 |  |
| `tool-executed` | check | 2.00 | 2.00 | tool=execute_javascript |
| `expected-output` | counted | 2/2 | 2.00 | all present |

</details>

| `executesJavaScriptSum` | FAIL | 0.00 | - | - | - | - | 0% — 0/1 checks · missed: test-completed |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `test-completed` | stage | 0.00 | 1.00 | HttpTimeoutException: request timed out     at java.net.http/jdk.internal.net.http.HttpClientImpl.send(HttpClientImpl.java:921)     at java.net.http/jdk.internal.net.http.HttpClientFacade.send(HttpClientFacade.java:133)     at de.mhus.vance.aitest.FootProcess.postLine(FootProcess.java:285)     at de.mhus.vance.aitest.FootProcess.chat(FootProcess.java:262)     at de.mhus.vance.benchmark.AbstractBenchmark.sendChatTimed(AbstractBenchmark.java:281)     at de.mhus.vance.benchmark.AbstractBenchmark.sendChatTimed(AbstractBenchmark.java:267)     at de.mhus.vance.benchmark.ScriptCapabilityBenchmark.runScriptCase(ScriptCapabilityBenchmark.java:169)     at de.mhus.vance.benchmark.ScriptCapabilityBenchmark.executesJavaScriptSum(ScriptCapabilityBenchmark.java:117)     at java.base/jdk.internal.reflect.DirectMethodHandleAccessor.invoke(DirectMethodHandleAccessor.java:104)     at java.base/java.lang.reflect.Method.invoke(Method.java:565)     at org.junit.platform.commons.util.ReflectionUtils.invokeMethod(ReflectionUtils.java:701)     at org.junit.platform.commons.support.ReflectionSupport.invokeMethod(ReflectionSupport.java:502)     at org.junit.jupiter.engine.support.MethodReflectionUtils.invoke(MethodReflectionUtils.java:45)     at org.junit.jupiter.engine.execution.MethodInvocation.proceed(MethodInvocation.java:61)     at org.junit.jupiter.engine.execution.InvocationInterceptorChain$ValidatingInvocation.proceed(InvocationInterceptorChain.java:124)     ... 78 more |

</details>


## script-python

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `executesPythonPrimes` | OK | 1.00 | 436.1s | 216.1k | 516 | 5 | tool=execute_python, expected output present — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.50 | 1.50 |  |
| `tool-executed` | check | 2.00 | 2.00 | tool=execute_python |
| `expected-output` | counted | 2/2 | 2.00 | all present |

</details>

| `executesPythonStringReverse` | FAIL | 0.00 | - | - | - | - | 0% — 0/1 checks · missed: test-completed |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `test-completed` | stage | 0.00 | 1.00 | HttpTimeoutException: request timed out     at java.net.http/jdk.internal.net.http.HttpClientImpl.send(HttpClientImpl.java:921)     at java.net.http/jdk.internal.net.http.HttpClientFacade.send(HttpClientFacade.java:133)     at de.mhus.vance.aitest.FootProcess.postLine(FootProcess.java:285)     at de.mhus.vance.aitest.FootProcess.chat(FootProcess.java:262)     at de.mhus.vance.benchmark.AbstractBenchmark.sendChatTimed(AbstractBenchmark.java:281)     at de.mhus.vance.benchmark.AbstractBenchmark.sendChatTimed(AbstractBenchmark.java:267)     at de.mhus.vance.benchmark.ScriptCapabilityBenchmark.runScriptCase(ScriptCapabilityBenchmark.java:169)     at de.mhus.vance.benchmark.ScriptCapabilityBenchmark.executesPythonStringReverse(ScriptCapabilityBenchmark.java:155)     at java.base/jdk.internal.reflect.DirectMethodHandleAccessor.invoke(DirectMethodHandleAccessor.java:104)     at java.base/java.lang.reflect.Method.invoke(Method.java:565)     at org.junit.platform.commons.util.ReflectionUtils.invokeMethod(ReflectionUtils.java:701)     at org.junit.platform.commons.support.ReflectionSupport.invokeMethod(ReflectionSupport.java:502)     at org.junit.jupiter.engine.support.MethodReflectionUtils.invoke(MethodReflectionUtils.java:45)     at org.junit.jupiter.engine.execution.MethodInvocation.proceed(MethodInvocation.java:61)     at org.junit.jupiter.engine.execution.InvocationInterceptorChain$ValidatingInvocation.proceed(InvocationInterceptorChain.java:124)     ... 78 more |

</details>

