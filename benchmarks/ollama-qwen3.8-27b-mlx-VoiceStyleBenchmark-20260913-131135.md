# Vance Benchmark - ollama-qwen3.8-27b-mlx-VoiceStyleBenchmark-20260913-131135

- **Started:** 2026-09-13T13:11:35.755036Z
- **Judge:** glm-5.3-nvfp4
- **Knobs:** {chatTimeoutS=480, waitBudgetMinS=240}
- **Score model:** v2-graded
- **Total tests:** 13
- **Passed:** 10 / 13 (77%)
- **Average score:** 0.808
- **Total LLM time:** 1585.9s
- **Total tokens (in / out):** 1.29M / 5.8k (31 round-trips)


## voice-style

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `voiceAcronymExpansion` | OK | 1.00 | 15.1s | 44.4k | 330 | 1 | K8s expanded to Kubernetes in speakable text — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | K8s expanded to Kubernetes in speakable text |

</details>

| `voiceFenceForCodePath` | FAIL | 0.00 | - | - | - | - | 0% — 0/1 checks · missed: test-completed |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `test-completed` | stage | 0.00 | 1.00 | HttpTimeoutException: request timed out     at java.net.http/jdk.internal.net.http.HttpClientImpl.send(HttpClientImpl.java:921)     at java.net.http/jdk.internal.net.http.HttpClientFacade.send(HttpClientFacade.java:133)     at de.mhus.vance.aitest.FootProcess.postLine(FootProcess.java:285)     at de.mhus.vance.aitest.FootProcess.chat(FootProcess.java:262)     at de.mhus.vance.benchmark.AbstractBenchmark.sendChatTimed(AbstractBenchmark.java:281)     at de.mhus.vance.benchmark.VoiceStyleBenchmark.runVoiceTurn(VoiceStyleBenchmark.java:588)     at de.mhus.vance.benchmark.VoiceStyleBenchmark.voiceFenceForCodePath(VoiceStyleBenchmark.java:218)     at java.base/jdk.internal.reflect.DirectMethodHandleAccessor.invoke(DirectMethodHandleAccessor.java:104)     at java.base/java.lang.reflect.Method.invoke(Method.java:565)     at org.junit.platform.commons.util.ReflectionUtils.invokeMethod(ReflectionUtils.java:701)     at org.junit.platform.commons.support.ReflectionSupport.invokeMethod(ReflectionSupport.java:502)     at org.junit.jupiter.engine.support.MethodReflectionUtils.invoke(MethodReflectionUtils.java:45)     at org.junit.jupiter.engine.execution.MethodInvocation.proceed(MethodInvocation.java:61)     at org.junit.jupiter.engine.execution.InvocationInterceptorChain$ValidatingInvocation.proceed(InvocationInterceptorChain.java:124)     at de.mhus.vance.benchmark.result.BenchmarkExtension.interceptTestMethod(BenchmarkExtension.java:72)     ... 77 more |

</details>

| `voiceFenceForLongList` | FAIL | 0.25 | 214.1s | 482.4k | 2.2k | 13 | no new ASSISTANT chat-message appeared within 240s — 25% — 1/3 checks · missed: assistant-reply, voice-discipline(skipped) |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 0.00 | 1.00 | no new ASSISTANT chat-message appeared within 240s |
| `voice-discipline` | stage | skipped | 2.00 | chain stopped earlier |

</details>

| `voiceFenceForTable` | OK | 1.00 | 72.2s | 44.5k | 501 | 1 | comparison routed into pipe-table — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | comparison routed into pipe-table |

</details>

| `voiceFenceNotMisused` | OK | 1.00 | 1.8s | 44.4k | 63 | 1 | fence-not-misused (Paris in speakable); judge: Paris is named directly in the spoken part as a short, natural voice-mode reply. — 100% — 4/4 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | fence-not-misused (Paris in speakable) |
| `style` | judged | 3.00 | 3.00 | Paris is named directly in the spoken part as a short, natural voice-mode reply. |

</details>

| `voiceModeOffMidConversation` | OK | 1.00 | 678.9s | 88.4k | 836 | 2 | voice-mode toggle respected mid-conversation: voice=1 sentences vs text=18 with markdown structure — 100% — 5/5 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-1-voice` | stage | 1.00 | 1.00 |  |
| `reply-1` | stage | 1.00 | 1.00 | 1 sentences |
| `turn-2-text` | stage | 1.00 | 1.00 |  |
| `reply-2` | stage | 1.00 | 1.00 | 18 sentences |
| `toggle-took-effect` | stage | 2.00 | 2.00 | markdown structure returned |

</details>

| `voiceNumbersSpeakable` | OK | 1.00 | 2.7s | 44.4k | 91 | 1 | no ISO date leaked into speakable text (numbers TTS-safe) — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | no ISO date leaked into speakable text (numbers TTS-safe) |

</details>

| `voiceQuestionEndsOpenly` | OK | 1.00 | 11.5s | 44.4k | 361 | 1 | last sentence closes the turn cleanly (question, invitation, or clear recommendation) — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | last sentence closes the turn cleanly (question, invitation, or clear recommendation) |

</details>

| `voiceShortBulletsAllowedInline` | OK | 1.00 | 204.1s | 44.4k | 185 | 1 | voice short-bullets (3 bullets); judge: Three on-topic bug-report essentials delivered in natural Erstens/Zweitens/Drittens spoken form with a concise closing summary. — 100% — 4/4 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | voice short-bullets (3 bullets) |
| `style` | judged | 3.00 | 3.00 | Three on-topic bug-report essentials delivered in natural Erstens/Zweitens/Drittens spoken form with a concise closing summary. |

</details>

| `voiceShortProseReply` | OK | 1.00 | 7.5s | 44.4k | 238 | 1 | voice short prose (3 sentences); judge: On-topic Lisbon sights in short speakable enumerated segments, no stock filler, and a natural conversational follow-up question. — 100% — 4/4 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | voice short prose (3 sentences) |
| `style` | judged | 3.00 | 3.00 | On-topic Lisbon sights in short speakable enumerated segments, no stock filler, and a natural conversational follow-up question. |

</details>

| `voiceSpokenPartNoMarkdownLeak` | OK | 1.00 | 85.7s | 232.6k | 418 | 5 | speakable text has no markdown markers (911 chars) — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | speakable text has no markdown markers (911 chars) |

</details>

| `voiceSttToleranceCutWord` | FAIL | 0.25 | 234.0s | 89.0k | 272 | 2 | no new ASSISTANT chat-message appeared within 240s — 25% — 1/3 checks · missed: assistant-reply, voice-discipline(skipped) |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 0.00 | 1.00 | no new ASSISTANT chat-message appeared within 240s |
| `voice-discipline` | stage | skipped | 2.00 | chain stopped earlier |

</details>

| `voiceSttToleranceHomophone` | OK | 1.00 | 58.4s | 89.5k | 378 | 2 | STT homophone tolerated, reply references Lissabon — 100% — 3/3 checks |

<details><summary>checks</summary>

| Check | Kind | Earned | Weight | Note |
|-------|------|--------|--------|------|
| `turn-completed` | stage | 1.00 | 1.00 |  |
| `assistant-reply` | stage | 1.00 | 1.00 |  |
| `voice-discipline` | stage | 2.00 | 2.00 | STT homophone tolerated, reply references Lissabon |

</details>

