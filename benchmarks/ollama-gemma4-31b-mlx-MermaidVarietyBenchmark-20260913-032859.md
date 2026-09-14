# Vance Benchmark - ollama-gemma4-31b-mlx-MermaidVarietyBenchmark-20260913-032859

- **Started:** 2026-09-13T03:28:59.823205Z
- **Judge:** glm-5.3-nvfp4
- **Knobs:** {chatTimeoutS=480, waitBudgetMinS=240}
- **Score model:** v2-graded
- **Total tests:** 9
- **Passed:** 6 / 9 (67%)
- **Average score:** 0.681
- **Total LLM time:** 1495.3s
- **Total tokens (in / out):** 999.9k / 3.4k (25 round-trips)


## mermaid-variety

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `emitsC4ContextDiagram` | OK | 1.00 | 57.0s | 54.6k | 709 | 2 | opener=C4Context at benchmark/mermaid/c4-notifications.md (875 chars) — 100% — 7/7 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-at-path` | stage | 1.00 | 1.00 | benchmark/mermaid/c4-notifications.md |
| `kind-diagram` | stage | 1.00 | 1.00 |  |
| `body-not-empty` | stage | 0.50 | 0.50 |  |
| `mermaid-form` | stage | 1.00 | 1.00 |  |
| `opener-C4Context` | stage | 1.50 | 1.50 |  |
| `elements` | counted | 5/5 | 1.50 | all 5 present |

</details>

| `emitsErDiagram` | FAIL | 0.00 | - | - | - | - | 0% — 0/1 checks · missed: test-completed |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `test-completed` | stage | 0.00 | 1.00 | HttpTimeoutException: request timed out     at java.net.http/jdk.internal.net.http.HttpClientImpl.send(HttpClientImpl.java:921)     at java.net.http/jdk.internal.net.http.HttpClientFacade.send(HttpClientFacade.java:133)     at de.mhus.vance.aitest.FootProcess.postLine(FootProcess.java:285)     at de.mhus.vance.aitest.FootProcess.chat(FootProcess.java:262)     at de.mhus.vance.benchmark.AbstractBenchmark.sendChatTimed(AbstractBenchmark.java:281)     at de.mhus.vance.benchmark.AbstractBenchmark.sendChatTimed(AbstractBenchmark.java:267)     at de.mhus.vance.benchmark.MermaidVarietyBenchmark.runMermaidCase(MermaidVarietyBenchmark.java:242)     at de.mhus.vance.benchmark.MermaidVarietyBenchmark.runMermaidCase(MermaidVarietyBenchmark.java:221)     at de.mhus.vance.benchmark.MermaidVarietyBenchmark.emitsErDiagram(MermaidVarietyBenchmark.java:99)     at java.base/jdk.internal.reflect.DirectMethodHandleAccessor.invoke(DirectMethodHandleAccessor.java:104)     at java.base/java.lang.reflect.Method.invoke(Method.java:565)     at org.junit.platform.commons.util.ReflectionUtils.invokeMethod(ReflectionUtils.java:701)     at org.junit.platform.commons.support.ReflectionSupport.invokeMethod(ReflectionSupport.java:502)     at org.junit.jupiter.engine.support.MethodReflectionUtils.invoke(MethodReflectionUtils.java:45)     at org.junit.jupiter.engine.execution.MethodInvocation.proceed(MethodInvocation.java:61)     ... 79 more |

</details>

| `emitsGanttDiagram` | OK | 1.00 | 53.5s | 53.4k | 475 | 2 | opener=gantt at benchmark/mermaid/gantt-onboarding.md (580 chars) — 100% — 7/7 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-at-path` | stage | 1.00 | 1.00 | benchmark/mermaid/gantt-onboarding.md |
| `kind-diagram` | stage | 1.00 | 1.00 |  |
| `body-not-empty` | stage | 0.50 | 0.50 |  |
| `mermaid-form` | stage | 1.00 | 1.00 |  |
| `opener-gantt` | stage | 1.50 | 1.50 |  |
| `elements` | counted | 3/3 | 1.50 | all 3 present |

</details>

| `emitsGitGraph` | FAIL | 0.00 | - | - | - | - | 0% — 0/1 checks · missed: test-completed |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `test-completed` | stage | 0.00 | 1.00 | HttpTimeoutException: request timed out     at java.net.http/jdk.internal.net.http.HttpClientImpl.send(HttpClientImpl.java:921)     at java.net.http/jdk.internal.net.http.HttpClientFacade.send(HttpClientFacade.java:133)     at de.mhus.vance.aitest.FootProcess.postLine(FootProcess.java:285)     at de.mhus.vance.aitest.FootProcess.chat(FootProcess.java:262)     at de.mhus.vance.benchmark.AbstractBenchmark.sendChatTimed(AbstractBenchmark.java:281)     at de.mhus.vance.benchmark.AbstractBenchmark.sendChatTimed(AbstractBenchmark.java:267)     at de.mhus.vance.benchmark.MermaidVarietyBenchmark.runMermaidCase(MermaidVarietyBenchmark.java:242)     at de.mhus.vance.benchmark.MermaidVarietyBenchmark.runMermaidCase(MermaidVarietyBenchmark.java:221)     at de.mhus.vance.benchmark.MermaidVarietyBenchmark.emitsGitGraph(MermaidVarietyBenchmark.java:128)     at java.base/jdk.internal.reflect.DirectMethodHandleAccessor.invoke(DirectMethodHandleAccessor.java:104)     at java.base/java.lang.reflect.Method.invoke(Method.java:565)     at org.junit.platform.commons.util.ReflectionUtils.invokeMethod(ReflectionUtils.java:701)     at org.junit.platform.commons.support.ReflectionSupport.invokeMethod(ReflectionSupport.java:502)     at org.junit.jupiter.engine.support.MethodReflectionUtils.invoke(MethodReflectionUtils.java:45)     at org.junit.jupiter.engine.execution.MethodInvocation.proceed(MethodInvocation.java:61)     ... 79 more |

</details>

| `emitsJourneyDiagram` | OK | 1.00 | 410.6s | 53.5k | 333 | 2 | opener=journey at benchmark/mermaid/journey-checkout.md (500 chars) — 100% — 7/7 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-at-path` | stage | 1.00 | 1.00 | benchmark/mermaid/journey-checkout.md |
| `kind-diagram` | stage | 1.00 | 1.00 |  |
| `body-not-empty` | stage | 0.50 | 0.50 |  |
| `mermaid-form` | stage | 1.00 | 1.00 |  |
| `opener-journey` | stage | 1.50 | 1.50 |  |
| `elements` | counted | 5/5 | 1.50 | all 5 present |

</details>

| `emitsPieDiagram` | OK | 1.00 | 52.7s | 265.4k | 562 | 6 | opener=pie at benchmark/mermaid/pie-languages.md (137 chars) — 100% — 7/7 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-at-path` | stage | 1.00 | 1.00 | benchmark/mermaid/pie-languages.md |
| `kind-diagram` | stage | 1.00 | 1.00 |  |
| `body-not-empty` | stage | 0.50 | 0.50 |  |
| `mermaid-form` | stage | 1.00 | 1.00 |  |
| `opener-pie` | stage | 1.50 | 1.50 |  |
| `elements` | counted | 5/5 | 1.50 | all 5 present |

</details>

| `emitsSequenceDiagram` | FAIL | 0.13 | 378.9s | 42.7k | 220 | 1 | no document at path=benchmark/mermaid/sequence-oauth.md (opener=sequenceDiagram); kinds in project: [diagram]; paths: [benchmark/mermaid/c4-notifications.md, benchmark/mermaid/er-shop.md, benchmark/mermaid/er-shop.yaml, benchmark/mermaid/gantt-onboarding.md, benchmark/mermaid/gitflow.md, benchmark/mermaid/pie-languages.md, benchmark/mermaid/pie-languages.yaml, benchmark/mermaid/state-order.md, benchmark/mermaid/state-order.yaml, benchmark/mermaid/timeline-web.md, benchmark/mermaid/timeline-web.yaml, notes/welcome.md, specs/deployment-checklist.md] — 13% — 1/7 checks · missed: document-at-path, kind-diagram(skipped), body-not-empty(skipped), mermaid-form(skipped), opener-sequenceDiagram(skipped), elements(skipped) |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-at-path` | stage | 0.00 | 1.00 | nothing at benchmark/mermaid/sequence-oauth.md within 240s |
| `kind-diagram` | stage | skipped | 1.00 | chain stopped earlier |
| `body-not-empty` | stage | skipped | 0.50 | chain stopped earlier |
| `mermaid-form` | stage | skipped | 1.00 | chain stopped earlier |
| `opener-sequenceDiagram` | stage | skipped | 1.50 | chain stopped earlier |
| `elements` | counted | skipped | 1.50 | chain stopped earlier |

</details>

| `emitsStateDiagram` | OK | 1.00 | 58.3s | 265.1k | 556 | 6 | opener=stateDiagram at benchmark/mermaid/state-order.md (211 chars) — 100% — 7/7 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-at-path` | stage | 1.00 | 1.00 | benchmark/mermaid/state-order.md |
| `kind-diagram` | stage | 1.00 | 1.00 |  |
| `body-not-empty` | stage | 0.50 | 0.50 |  |
| `mermaid-form` | stage | 1.00 | 1.00 |  |
| `opener-stateDiagram` | stage | 1.50 | 1.50 |  |
| `elements` | counted | 5/5 | 1.50 | all 5 present |

</details>

| `emitsTimelineDiagram` | OK | 1.00 | 484.2s | 265.2k | 500 | 6 | opener=timeline at benchmark/mermaid/timeline-web.md (123 chars) — 100% — 7/7 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `document-at-path` | stage | 1.00 | 1.00 | benchmark/mermaid/timeline-web.md |
| `kind-diagram` | stage | 1.00 | 1.00 |  |
| `body-not-empty` | stage | 0.50 | 0.50 |  |
| `mermaid-form` | stage | 1.00 | 1.00 |  |
| `opener-timeline` | stage | 1.50 | 1.50 |  |
| `elements` | counted | 10/10 | 1.50 | all 10 present |

</details>

