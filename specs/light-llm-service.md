---
title: "Vance — Light LLM Service"
parent: Specs
permalink: /specs/light-llm-service
---

<!-- AUTO-GENERATED from specification/public/en/light-llm-service.md — do not edit here. -->

---
# Vance — Light LLM Service

> A central helper service for **single-shot LLM calls** using Recipes as configuration profiles. No Process spawn, no Lane lock, no dedicated chat audit trail. If you need a quick LLM call (classification, title generation, discovery, anti-hallucination check, summary), use this service instead of writing your own `ThinkEngine` or wiring `ChatModel` directly.
>
> The Recipe system serves as a **configuration layer** (model alias, Pebble template, schema retry budget, fallback models) — exactly the same mechanism that Engines already use today. Tenants can reconfigure individual Light LLM use cases via Recipe overrides without code changes.
>
> See also: [recipes](/specs/recipes) | [llm-resource-management](/specs/llm-resource-management) | [jeltz-engine](/specs/jeltz-engine) | [how-do-i](/specs/how-do-i)

---

## 1. Purpose & Delimitation

**Problem.** Several use cases require a single-shot LLM call with tenant-configurable model selection, a Pebble-templated Prompt, and optional JSON schema validation:

- Discovery (`how_do_i` — Source-Catalog matching, see [how-do-i](/specs/how-do-i))
- Title generation for Sessions
- Intent classification for routing
- Inbox Summary generation
- Anti-hallucination cross-check
- Future: Pseudonymization, keyword extraction, sentiment check

Building each of these calls as its own mini-`ThinkEngine` is expensive overkill: spawn lifecycle, chat history writing, Lane lock, Process event routing. Most use cases don't need any of that — just the LLM call itself.

`JeltzEngine` internally does exactly what we want here — but as a spawned Engine, because it was intended as a user-facing worker. We need the same pattern as a **non-spawned** service API.

**Solution.** A `@Service` bean that centrally encapsulates the pattern *"Recipe as config profile → ChatModel.chat → Schema-Loop"*. First consumer: `DiscoveryService`. Other use cases can be added later without duplicating the pattern.

**What it is not:**

- Not a replacement for `ThinkEngine` — where user-facing workers with lifecycle/audit/chat history are needed, Engines remain.
- No streaming — `LightLlmService` is synchronous, returning the final result. Streaming use cases (chat replies) go through Engines.
- No Tool-Use loop — the LLM is not allowed to call Tools in this call. One-input-one-output model.

---

## 2. API

```java
public interface LightLlmService {

    /** Raw single-shot call. Returns the LLM's reply text verbatim. */
    String call(LightLlmRequest req);

    /**
     * Schema-validated single-shot call. Runs a Jeltz-style retry loop
     * until the LLM returns a JSON object that satisfies the schema.
     * Throws SchemaValidationException on persistent failure.
     */
    Map<String, Object> callForJson(LightLlmRequest req);
}

@Builder
public class LightLlmRequest {
    String recipeName;             // required — recipe used as config profile
    String userPrompt;             // required — user-message content
    Map<String,Object> pebbleVars; // optional — for promptPrefix rendering
    Map<String,Object> schema;     // optional — passed to callForJson()
    Integer maxAttempts;           // optional — overrides recipe.params.maxAttempts
    String tenantId;               // required — tenant scope for settings + API keys
    String projectId;              // optional — project scope for settings cascade
    String processId;              // optional — innermost scope (caller's process)
}

public class SchemaValidationException extends LightLlmException {
    int attempts;
    Object lastInvalidValue;
    String lastError;
}

public class LightLlmException extends RuntimeException { … }
```

**Convention:** `recipeName` MUST be a Recipe marked as an *internal config profile* (Frontmatter `internal: true` or tag). The standard Recipe selector (for `DELEGATE` path) ignores these Recipes; they are only accessible via the service API.

---

## 3. Recipe as Config Profile

The `LightLlmService` reads the following fields from the Recipe:

| Recipe Field | Meaning in Light LLM Path |
|---|---|
| `params.model` | Model alias (e.g., `default:fast`, `default:analyze`) |
| `params.fallbackModels` | Resilient Layer fallback list |
| `params.maxAttempts` | Schema retry budget (default 3) |
| `params.temperature`, `topP`, `topK` | Standard LLM parameters (passed through to `ChatModel`) |
| `promptPrefix` | Pebble template → rendered with `pebbleVars` and standard render context; forms the **System Message** |
| `engine` | **documentary** — not used for spawning (should be `jeltz` or `light-llm` as a convention) |
| `internal` *(new)* | Frontmatter marker `true` — the Recipe selector skips these Recipes |
| `allowedTools`, `manualPaths` | **ignored** — Light LLM calls have no Tool-Use, no Manual loads |

**What is not read:** all Engine lifecycle fields (Validators, Action-Schemas, Plan-Mode hints) — Light LLM is single-shot without Engine behavior.

---

## 4. Pebble Rendering

The `promptPrefix` of the Recipe is a Pebble template. During rendering, it receives:

- All standard variables (`tier`, `model`, `provider`, `mode`, `lang`, `params` — see [recipes §5](/specs/recipes#5)).
- Plus the `pebbleVars` from the `LightLlmRequest`.

Example (Discovery):

```yaml
promptPrefix: |
  You are the Discovery component. Catalog:
  
  &#123;{ sources }}
  
  Caller's intent:
  
  > &#123;{ intent }}
  
  Respond with one of these JSON shapes: …
```

If the caller provides `pebbleVars=Map.of("sources", catalogMarkdown, "intent", intentString)`, both variables are available.

**Conflict behavior:** Caller variables overwrite standard variables if the key is the same. Defensive convention: Custom variables in a namespace (e.g., `vars.sources` instead of `sources`) if there is a risk of collision.

---

## 5. Schema Validation Loop

For `callForJson(...)`:

```
attempt = 1
loop:
  reply = ChatModel.chat(systemMessage, userMessage + corrections)
  parsed = parseJson(reply.text)          // strip code fences if present
  if parsed not a JSON object:
    correction = "reply must be a JSON object"
    attempt++; continue
  result = JsonSchemaLight.validate(parsed, schema)
  if result.valid:
    return parsed
  correction = "Schema validation failed: " + result.errorsJoined()
  attempt++; continue
if attempt > maxAttempts:
  throw SchemaValidationException(attempts, lastInvalid, lastError)
```

**Default `maxAttempts`:** 3. Overridable from `recipe.params.maxAttempts` or `LightLlmRequest.maxAttempts`.

**JSON Extraction:** the LLM sometimes writes Markdown code fences or prose around the JSON. We extract the first valid JSON object block — same `extractJson` heuristic as in `JeltzEngine.extractJson`.

**Correction Message Append:** appended as an additional `AiMessage` + `UserMessage("Schema validation failed: ...")` to the `messages` list, so the LLM sees what it got wrong the first time. Identical pattern to Jeltz.

**Schema Format:** `Map<String,Object>` in the JSON-Schema-light dialect (see `JsonSchemaLight.java`). Supports: `object`, `array`, `string`, `boolean`, `integer`, `number`, `enum`, `required`, `properties`, `items`. No full JSON schema support (no `oneOf`, `allOf`, …) — intentionally minimal.

---

## 6. Resilient Layer & Fallback Models

`LightLlmService` uses the **same** Resilient Layer as regular Engines:

- `EngineChatFactory.buildAdHoc(params, ctx)` builds the `ChatModel` with primary + fallback configuration.
- In case of 5xx, quota exhaustion, provider timeout: automatic fallthrough to the `params.fallbackModels` aliases.
- Per-call client (no shared session state), same Anthropic prompt cache layer.

This means: Tenants configure `default:fast` with, for example, `[default:standard, default:slow]` as fallbacks, and this also applies to Light LLM calls — no special path.

---

## 7. Metrics & Audit

**Metrics** (Micrometer, low-cardinality tags):

| Metric | Tags | What |
|---|---|---|
| `vance.lightllm.calls` | `recipe`, `outcome` (`success`, `schema_failed`, `llm_error`) | Counter of all Light LLM calls |
| `vance.lightllm.attempts` | `recipe` | DistributionSummary of the number of attempts per call |
| `vance.lightllm.duration` | `recipe`, `outcome` | Timer |

**Audit:** by default, no dedicated chat history entry (that's the point — no Process spawn, no dedicated Lane). If needed, individual use cases (Discovery, for example) can write the result to their own Audit Document — this is the caller's responsibility, not the service's.

---

## 8. Settings

All under `lightllm.*`, Cascade Project → Tenant → Default:

| Key | Type | Default | Status | Meaning |
|---|---|---|---|---|
| `lightllm.enabled` | bool | true | v1 | Master switch |
| `lightllm.maxAttempts.default` | int | 3 | v1 | Schema retry default if neither Recipe nor Request override |
| `lightllm.timeoutSeconds` | int | 30 | v2 | Per-call timeout (before provider layer timeouts). Currently not implemented — langchain4j has no direct timeout hook; provider-specific timeouts apply. |

Per-use-case settings (e.g., `discovery.recipe`) reside in the respective consumer specs.

---

## 9. Failure Modes

| Situation | Behavior |
|---|---|
| `recipeName` unknown | `LightLlmException("recipe not found: …")` |
| `recipeName` not marked as `internal: true` | `LightLlmException("recipe is not an internal config profile")` — prevents accidental invocation of a spawn Recipe |
| `userPrompt` empty | `LightLlmException("userPrompt required")` |
| `ctx.tenantId` missing | `LightLlmException("tenant scope required")` |
| Pebble render error (syntax error in template) | `LightLlmException` with template position |
| Primary Model error → Fallbacks successful | success, logged `vance.llm.calls{outcome=fallback}` |
| Primary + all Fallbacks failed | `LightLlmException("LLM call failed: …")` |
| Schema loop fails after `maxAttempts` | `SchemaValidationException(attempts, lastInvalidValue, lastError)` |

---

## 10. Relationship to ThinkEngines

`LightLlmService` and `ThinkEngine` are **orthogonal**:

| Property | LightLlmService | ThinkEngine |
|---|---|---|
| Lifecycle | none — Service call | Spawn → Lane → Status transitions → Termination |
| Chat History | none | dedicated Mongo Doc trace |
| Tool-Use | no | yes |
| Multi-Turn | no | yes |
| Audit Trail | optional via Caller | mandatory via Process |
| Use Case | Classification, Discovery, Title Gen, … | User-Facing Chat, Worker, Plan Execution |

**Long-term (not v1):** Jeltz, Hactar-Framing/Drafting, Zaphod-Synthesis could consolidate their internal schema loops on `LightLlmService` — the spawn wrapper remains for audit trail use cases. Migration **only** when `LightLlmService` is stable in production.

---

## 11. Phased Rollout

| Phase | Result | Status |
|---|---|---|
| **L1** | `LightLlmService` interface + impl + `LightLlmRequest` + Exceptions. Pebble rendering via existing `PromptTemplateRenderer`. Schema loop adapted from `JeltzEngine.extractJson` + `JsonSchemaLight.validate`. Recipe `internal: true` marker. | completed 2026-05-26 |
| **L2** | Unit tests: Mock-ChatModel, Schema validation cases (valid/invalid/markdown-wrapped), Provider error path | completed — 18 tests green |
| **L3** | Metrics (`vance.lightllm.calls`/`attempts`/`duration`) + Master Switch setting + Spring configuration | completed |
| **L4** | First consumer: `DiscoveryService` (see [how-do-i](/specs/how-do-i)) | completed — Discovery runs on LightLlm |
| **L5** *(v2)* | Implement `lightllm.timeoutSeconds` via HttpClient wrapper | open, low priority |

After L1–L4, the service is in production and Discovery runs on it. Further consumers (Title Generation, Intent Classification, …) will follow on-demand.

---

## Status

Spec is in Draft as of 2026-05-26. Design decisions:

- **Single-shot, no Tool-Use, no streaming** — intentionally minimal scope.
- **Recipe as config profile, not as spawn vehicle** — new frontmatter marker `internal: true` prevents accidental spawn.
- **Schema loop identical to `JeltzEngine`** — no second validation implementation.
- **Resilient Layer + Prompt Caching used for free** — no special path.
- **Engines remain separate** — migration only when LightLlmService is stable.
