# Vancetope — Zem (System-One Decisions)

> **Zem** is Vancetope's path for **decision models** (System One: TypeSafe Jev, local Bespoke nimble, …). Such a model does not write text: it reads a **state** (`state`) and answers **typed questions** with calibrated probabilities — `noul` (yes/no), `choice` (exactly one of N options), `score` (position on a scale). Zem consists of a provider layer next to the chat stack, the `ZemService` as the sole entry point, a spawnable single-shot engine, the `zem_decide` tool, and the `vance.zem` script API.
>
> Codename: Zem, the mattress from *Life, the Universe and Everything*, lying in the swamp and doing exactly one thing well.
>
> See also: [jeltz-engine](jeltz-engine.md) (model for the spawn wrapper), [light-llm-service](light-llm-service.md) (text counterpart), [hotblack-service](hotblack-service.md) (model for provider abstraction), [wowbagger-engine](wowbagger-engine.md) (planned bulk consumer), [shooty](shooty.md) (guard consumer), [llm-resource-management](llm-resource-management.md) (catalog, aliases, ledger)

---

## 1. Role and Classification

| | |
|---|---|
| Engine Name | `zem` (Single-Shot, auto-terminal `DONE`) |
| Entry Point | `ZemService` (`de.mhus.vance.brain.zem`) — Engine, Tool, Script, and Bulk callers invoke it |
| Provider Layer | `de.mhus.vance.brain.ai.decision` (+ `.systemone`) |
| Catalog | `kind: decision` → `DecisionModelInfo` |
| Alias | `default:decision` (LLM setup form, `aliasDecision` field) |
| Recipes | `zem` (generic, spawnable), Profiles = Recipes with `engine: zem` (mostly `internal: true`), example `command-safety` |
| Tool | `zem_decide` (deferred) |
| Script | `vance.zem.decide(profile, state[, questions])` |
| Ledger | `UsageKind.DECISION`, Caller `_zem` |

**When Zem, when an LLM.** Use Zem when the answer is a choice: classify, route, Yes/No gate, evaluation. Use an LLM (LightLlm, Jeltz, Worker) when text, extraction, or justification is needed. Common patterns: *route-first* (Zem decides, an LLM writes only if needed) and *verify-after* (LLM drafts, Zem checks).

## 2. What Zem is Not

- **Not a Chat Engine.** No dialogue, no tool loop, no Inbox. One Spawn = one decision.
- **Not a Text Generator.** Answers are probabilities, never prose.
- **Not a Calculator.** Arithmetic, counting, and date comparison are difficult for decision models (live confirmed: "ordered on the 3rd, today is the 2nd" is not recognized as a contradiction by any measured model). Such values are calculated by the caller beforehand and placed in the State.
- **No Multiple Selection.** Choice selects exactly one option; "multiple apply" = one `noul` per option.
- **No Image Input** (v1). Three providers can handle images, via three different transports — a separate step.
- **No In-Process Model.** Local models run behind a System-One compatible server (Ollama, `laya-serve`).

## 3. Data Model (`vance-api`, package `de.mhus.vance.api.zem`)

**`ZemQuestionDto`** — `name` (`[a-z0-9_-]{1,64}`, no dot: the name becomes a Mongo Map key), `type` (`NOUL|CHOICE|SCORE`), `instructions` (String, Map or List), `criteria` (type-dependent):

| type | `criteria` |
|---|---|
| `NOUL` | optional `{true: …, false: …}` — both sides or none |
| `CHOICE` | Required: Map `option → description \| null`, 2..N options, order preserved; Option keys without `.` and not starting with `$` |
| `SCORE` | Required: List of 2..10 levels, index 0 = lowest |

**`ZemAnswerDto`** — `name`, `type` (`NOUL|CHOICE|SCORE|REFUSAL`), `noul` (p(yes)), `choice`, `score` (expected value Σ i·p_i, can be between two levels), `probabilities` (Choice: Option → p; Score: `"0".."n-1"` → p), `legend` (Score: level → description, as sent), `confidence` (0..1).

`REFUSAL` is not provided by any System-One provider today; the type exists so that a bulk consumer can distinguish a refusal from an answer and an error without a later wire break (OpenAI's Decision format knows it).

**`ZemDecisionDto`** — `model` (the provider-reported, possibly versioned ID, e.g., `typesafe/jev-1.13-20260917`), `answers` (in question order), `inputTokens`, `costUsd` (only if the provider reports costs), `latencyMs`.

## 4. Provider Layer

### 4.1 Wire: System One

There is a de facto standard: TypeSafe's **System-One API**. Ollama (≥ 0.35), Upstage, AWS, Databricks, Cloudflare Clef, and Venice (alias path) speak it; OpenRouter passes it through unchanged.

```
POST {base}/v1/systemone
{"model": "…", "state": string|object|array,
 "questions": {"<name>": {"type": "noul|choice|score", "instructions": …, "criteria": …}}}
→ {"model": "…", "answers": {"<name>": {"type": …, …}}, "usage": {"input_tokens", "output_tokens", "cost"?}, "id"?}
```

A single `SystemOneWireClient` builds the request, parses the responses back in question order, and classifies errors. Parsing is tolerant: unknown fields are ignored, numbers are adopted as reported.

### 4.2 Providers

`AiDecisionModelProvider` has **one** operation (`decide`). `AiDecisionService` dispatches **first by instance, then by protocol** (like `AiAudioService`): OpenRouter declares `wireType: openai` for chat, but its decision models are on a separate endpoint.

| Provider | Dispatch | Endpoint | Key |
|---|---|---|---|
| `OpenRouterDecisionProvider` | Instance `openrouter` | `…/api/v1/systemone` (≡ `/api/alpha/decisions`) | Required, checked before the call |
| `OllamaDecisionProvider` | Protocol `ollama` | `…/v1/systemone` | None |
| `DirectSystemOneProvider` | Protocol `systemone` (`ProviderType.SYSTEMONE`) | `…/v1/systemone`, Default `https://api.typesafe.ai` | Sent if set, not enforced (local `laya-serve` runs without) |

**Endpoint Rule:** If the instance base URL ends with `/v1`, `/systemone` is appended; otherwise, `/v1/systemone`. This covers OpenRouter (`…/api/v1`), Ollama (`http://localhost:11434`), and TypeSafe (`https://api.typesafe.ai`) with one rule.

`ProviderType.SYSTEMONE` has no chat adapter; the chat dispatch rejects such an instance with "No adapter for provider".

Perplexity (`/v1/decisions`, same schema, 10 RPS) has no dedicated provider in v1; adding it is an instance with a path quirk.

### 4.3 Error Classes at the Provider

`AiDecisionException.Failure`: `INVALID_REQUEST` (400/422), `MODEL_NOT_FOUND` (404 or "does not exist"), `AUTH` (401/403, missing key), `RATE_LIMITED` (429, with `Retry-After`), `PROVIDER_UNAVAILABLE` (5xx/529), `TIMEOUT` (incl. 408/504), `TRANSPORT`, `PROTOCOL` (200 with unsuitable body), `NO_ADAPTER`, `INTERRUPTED`. Each class itself states whether it is retryable. Error bodies come in two forms (`{error:{message,code}}` for OpenRouter, `{error:"…"}` for Ollama) and are passed through as text.

## 5. Catalog: `kind: decision`

`DecisionModelInfo` carries a model's limits; the service checks against it **before** the call. The defaults are the **minimal profile** — an entry that omits a field errs on the safe side.

| Field | Default | Meaning |
|---|---|---|
| `timeoutSeconds` | 30 | HTTP timeout per call |
| `maxQuestions` | 64 | Questions per call; above this, the service splits |
| `maxChoiceOptions` | 26 | Options per Choice (minimum everywhere 2) |
| `maxScoreLevels` | 10 | Score levels; never above 10 (System-One limit) |
| `structuredCriteria` | false | whether descriptions in `criteria` can be Maps/Lists |
| `maxStateTokens` | – | Provider's specification (informative) |
| `costPerMillionInput` | – | USD per million input tokens; missing = unpriced |
| `rateLimitRps` | – | Default rate per instance and Pod |
| `maxConcurrentCalls` | – | Default concurrency per instance and Pod |

Included: `_vance/model/openrouter/typesafe/jev-1.13.yaml` (255 options, structured criteria, $0.042/M, 80 RPS) and `_vance/model/ollama/nimble.yaml` (26 options, strings only, `maxConcurrentCalls: 1`, free).

**No Discovery Path.** Jev is not in OpenRouter's `/api/v1/models`; decision models enter the catalog exclusively via Model Docs. Collisions like with `au` do not occur — decision models have no chat twin.

**Minimal Profile:** at most 26 options, at most 10 levels, descriptions as strings, Noul criteria with both sides. A profile within this framework runs on every model measured so far.

## 6. `ZemService`

### 6.1 Two Steps

1. **`prepare(ZemDecideRequest)`** resolves once: Settings gate, Profile (Recipe), Inline questions (same name replaces, new ones are appended), Alias → Instance/Model, Catalog entry (first instance, then protocol), Adapter availability, API key and Base URL, Question validation against model limits, Throttle limits. Result: `ZemPreparedCall` — immutable, thread-safe, without Settings or Catalog lookup per call.
2. **`decide(prepared, state, accumulator?)`** per state: State projection, splitting over `maxQuestions`, throttled call with retry, Confidence addition, booking.

`decide(request, state)` handles both for single calls.

The API key is read directly from `ai.provider.<instance>.apiKey` (missing = `null`); whether it is mandatory is decided by the provider. `ZemPreparedCall` and `AiDecisionConfig` never output the key in `toString()`.

### 6.2 Validation (before each Provider call)

Question name pattern and uniqueness, type present, `instructions` not empty, Noul criteria both sides or none (OpenRouter rejects one side, Ollama does not — the stricter rule keeps profiles portable), Choice 2..`maxChoiceOptions` with Mongo-safe keys, Score 2..`maxScoreLevels`, structured descriptions only with `structuredCriteria`. YAML reads an unquoted `true:` as a Boolean key — the validator normalizes to `"true"`/`"false"`. Error: `invalid_question` with mention of question and limit.

### 6.3 State

String, Map, or List are allowed; anything else is `invalid_state`. `stateSelect` (list of dot paths, e.g., `customer.tier`) projects a Map state before the call to the named fields, retains nesting, and skips missing paths. Irrelevant context measurably reduces accuracy. The state can be in any language (live: German and English decide equally); questions and descriptions remain English.

### 6.4 Splitting, Throttling, Retry

- **Splitting:** more questions than `maxQuestions` → multiple calls, answers merged in order, tokens and costs summed. Semantically safe because System-One questions are documented to be evaluated independently. Choice options above the limit cannot be split.
- **Throttle** (`ZemThrottle`): one semaphore (`maxConcurrentCalls`) and one rate limit (`rateLimitRps`) per Tenant and instance. Both belong to the instance, not the model — they depend on hardware and contract. No cross-pod coordination; the backoff on 429 catches overlap.
- **Retry** only for `RATE_LIMITED`, `TIMEOUT`, `PROVIDER_UNAVAILABLE`, `TRANSPORT` — with provider's `Retry-After`, otherwise exponentially 0.5 … 8 s with jitter, at most `ai.zem.max-retries` times. Before each attempt, it is checked whether the calling process has been stopped.

**Questions per call are not a tuning parameter** (measured: splitting yields no benefit for Jev or nimble), concurrency is:

| Concurrency | Jev (OpenRouter) | nimble (Ollama, Apple Silicon) |
|---|---|---|
| 1 | 2.7 decisions/s | 4.3 decisions/s |
| 8 | 14.2 decisions/s | 4.0 decisions/s (serial) |

### 6.5 Confidence

If `confidence` is missing, the service recalculates it using TypeSafe formulas (Noul `|2p−1|`, Choice `(p_max − 1/n)/(1 − 1/n)`, Score `max(0, 1 − Σ p_i·|i−m| / MAD_unif)`); the formulas reproduce Jev's own values. A value reported by the provider is never overwritten (Ollama calculates Score confidence differently).

### 6.6 Booking

Every decision is recorded in the LLM Usage Ledger: `UsageKind.DECISION`, Caller `_zem`, Recipe = profile name, priced per input token from `costPerMillionInput`, the number of decisions in the unit counter (`images`). Single calls are booked immediately. Bulk callers pass a `ZemUsageAccumulator` and book with `flush()` at their own commit points — at most two Ledger writes per flush (success, error).

There is **no quota per call**: a decision costs ~$0.00002 for Jev, nothing locally; a reserve record per call would be more expensive than the call. Cost control is the Ledger's responsibility. Metric: `vance.zem.calls` (Tags `outcome`, `model` = Alias).

## 7. Profiles

A profile is a Recipe with `engine: zem` in the normal Recipe cascade (Classpath → `_vance` → Project); like any Recipe, it needs `description`:

```yaml
description: Judges whether an engine command is safe to run.
engine: zem
internal: true
params:
  model: openrouter:typesafe/jev-1.13
  stateSelect: [command, args]
  questions:
    - name: unsafe
      type: noul
      instructions: Does the command in the state delete, overwrite or exfiltrate data, or change permissions?
      criteria:
        "true": The command is destructive, sends data out, or escalates rights.
        "false": The command only reads, or makes a local, reversible change.
```

**Thresholds are not transferable between models** (measured: on the same clear cases, Jev reports Confidence ~1.00, nimble ~0.92; in mixed cases, they differ by 0.2–0.3). Profiles that work with thresholds **pin a specific model**, not an alias. Included: `command-safety` (internal, Jev pinned, one Noul question in the minimal profile).

## 8. Interfaces

### 8.1 Tool `zem_decide`

Deferred (`primary=false`, `deferred=true`, search hint) — in the prompt only name and hint, schema only after `tool_description`. Parameters: `state` (Object) **or** `text` (String), `questions` and/or `profile`, optional `model`. The question schema is flat: `options` (Choice), `levels` (Score), `yes`/`no` (Noul); the tool translates into System-One `criteria`. Response: `{model, answers, costUsd?, latencyMs}`; error as `{error, message, retryable}`. Manual: `manual_read('zem')`.

### 8.2 Script `vance.zem`

`vance.zem.decide(profile, state)` and `vance.zem.decide(profile|null, state, questions)` (System-One form with `criteria`). Returns keyed by question name (`d.unsafe.noul`). An error throws; the message starts with the reason in square brackets (`[rate_limited]`). **A gate must treat the throw as a Deny** (fail-closed). `null` if no `ZemService` is wired.

### 8.3 Result Form

Tool and Script deliver the same compact form (`ZemDecisionJson`): keyed by question name, rounded to three decimal places, distribution as `p` (can be disabled for bulk).

```json
{"unsafe": {"type": "noul", "noul": 0.97, "confidence": 0.94},
 "intent": {"type": "choice", "choice": "refund", "confidence": 0.96, "p": {"refund": 0.98, "other": 0.02}}}
```

### 8.4 Engine `zem`

Spawnable wrapper around the service, built like Jeltz: `engineParams` (Recipe params + Spawn params) are the inline profile (`model`, `questions`, `stateSelect`), plus `state` (required) and `profile` — explicit or the Recipe from which it was spawned (except the generic `zem`). The `zem` Recipe deliberately carries **no** `model`: it would overwrite the pinned model of a loaded profile.

Result in two places: as the last Assistant message, a wrapper in Jeltz format (`{success: true, data: <decision>}` or `{success: false, error, message, retryable}`) and as a compact version in `engineParams.zemOutcome` (value + Confidence per question), from which `summarizeForParent` builds text and payload for the parent process. The process always ends with `DONE` (even on error — the wrapper carries it), on `stop` with `STOPPED`. `producesUserFacingOutput() = false`.

**Magrathea** reads the results of `jeltz` and `zem` identically: on success, `data` becomes the task output; on error, `agent_error` is created with the reason. This makes Zem usable as an `agent_task` in workflows.

## 9. Settings

| Key | Default | Purpose |
|---|---|---|
| `ai.zem.enabled` | `true` | Master switch (cascade) |
| `ai.zem.timeout` | from catalog | HTTP timeout override in seconds |
| `ai.zem.max-retries` | 3 | Retries for retryable errors |
| `ai.zem.max-concurrent.<instance>` | from catalog | Concurrency per instance |
| `ai.zem.rate-limit-rps.<instance>` | from catalog | Rate per instance |
| `ai.alias.default.decision` | – | Default decision model |

Without a set alias, the `ai.default.*` chat fallback applies, and the catalog gate rejects with `invalid_choice` — the alias must be set once per Tenant in the LLM setup form.

## 10. Error Codes

`ZemException.Reason` (public, also `outcome` tag of the metric): `disabled`, `invalid_profile`, `invalid_question`, `invalid_state`, `invalid_choice`, `invalid_request` (rejected by provider — a limit not known to the catalog), `auth`, `rate_limited`, `timeout`, `provider_error`, `cancelled`. Retryable are `rate_limited`, `timeout`, and `provider_error` (after own retries are exhausted).

## 11. Measured Limits of Included Models

| | Jev 1.13 (OpenRouter) | nimble (Ollama) |
|---|---|---|
| Choice Options | 255 | 2–26 |
| Questions per Call | 256 assumed (catalog cap 64) | 64 |
| Structured Criteria | yes | no |
| Noul only `criteria.true` | 400 | assumed |
| Unknown Model | 400 | 404 |
| Latency | 330–750 ms, almost independent of question count | warm ~100–220 ms for 1–3 questions, ~3 s for 40 |
| Determinism | ±0.02–0.05 for identical request | identical for identical request |
| Cost | $0.042/M Input, Output free | none |

Further observations: the first Choice option is slightly preferred (do not stack important options at the front, `other` at the end); negation ("I do NOT want a refund") is correctly recognized; mixed cases visibly lower confidence. Prompt injection via the state can flip decisions — Zem is a filter over external text, not a sole gate.

## 12. Decisions

- **Real Engine, but thin.** Recipes must point to a registered Engine; without `ZemEngine`, there would be no `engine: zem` profile. All logic lives in the Service, the Engine is the wrapper (like Jeltz to LightLlm).
- **Own Modality, not a Chat Model with quirk.** Different endpoint, no text, different result model.
- **Protocol instead of Manufacturer.** No class name is "Jev"; the manufacturer is in the Model Doc.
- **Limits are Catalog data**, not Provider code — they vary too much between models for constants.
- **Ledger instead of Quota** (§6.6).
- **Threshold profiles pin the model** (§7).
- **Flat Tool Schema**, so weaker models don't have to fill a polymorphic field.

## 13. Prepared: Wowbagger on Zem

Wowbagger runs whose task is a decision per dataset should switch the Worker to a profile with `engine: zem`; the pool then branches according to the Worker Recipe's engine. The building blocks for this exist: `prepare`/`decide` separation (no lookups per dataset), `ZemUsageAccumulator` + `flush()` (no Ledger write per dataset), throttling and backoff in the Service, `REFUSAL`, `stateSelect`, the line form from `ZemDecisionJson` (without distribution for large option sets), and `ZemService.prepare()` as a pre-check for `wowbagger_check`. Locally, hardware limits: nimble on Apple Silicon handles about 15,000 datasets per hour for 3 questions.

## 14. Tests

- Unit tests: `de.mhus.vance.brain.ai.decision.*` (Wire against recorded live responses, endpoint rule, dispatch, catalog), `de.mhus.vance.brain.zem.*` (Service, Validator, Profiles, Confidence, Throttle, Engine, result form), `ZemDecideToolTest`, `ScriptZemApiTest`, Magrathea wrapper.
- Live: `ZemOpenRouterLiveTest` (`@Tag("manual")` + `@Tag("openrouter")`, `./wb qa openrouter`) and `ZemOllamaLiveTest` (`@Tag("manual")`, `VANCE_OLLAMA_LIVE=1`).

Implementation: `readme/zem-engine.md`. Design history: `planning/zem-engine.md`.
