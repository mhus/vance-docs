# Vancetope — LLM Resource Management

> Defines how LLM access is managed: providers, keys, quotas, routing.
> Core principle: Every LLM call runs under an account. Credentials and quotas can be defined at any Scope level.
> See also: [identity-credentials](identity-credentials.md) | [architektur-scopes-clients](architektur-scopes-clients.md) | [mcp-tool-routing](mcp-tool-routing.md)

---

## 1. The Problem

The Brain makes LLM calls. However:
- Different Accounts have different provider access
- Different Projects can have their own budgets (e.g., research grant)
- Some Accounts do not have their own key (they use a Project, Team, or Tenant key)
- The Brain must instantiate the correct provider with the correct key for each call
- Token consumption must be trackable per Account AND per Project

---

## 2. LLM Configuration at Each Scope Level

LLM providers, keys, and quotas can be defined at **any level**:

| Level | Example | Use Case |
|-------|---------|----------|
| **Account** | Mike's personal Claude key | Personal use |
| **Project** | Research project has 5M tokens/month from grant | Budget per Project |
| **Team** | NLP team has a shared Anthropic key | Shared access |
| **Tenant** | Company-wide Google AI Key | Default for all |
| **Local** | Ollama on the server | Free fallback |

### LLM Config at the Account

```yaml
account:
  id: acc_mike
  llm_config:
    providers:
      - provider: anthropic
        model: claude-sonnet-4
        api_key_ref: cred_mike_anthropic
        priority: 1
      - provider: google
        model: gemini-2.5-pro
        api_key_ref: cred_mike_google
        priority: 2
    quota:
      daily_tokens: 500000
      monthly_tokens: 10000000
      max_tokens_per_call: 8192
    preferences:
      default_model: claude-sonnet-4
      planning_model: claude-sonnet-4
      execution_model: claude-sonnet-4
      light_model: gemini-2.5-flash
```

### LLM Config at the Project

```yaml
project:
  id: proj_transformer_review
  llm_config:
    providers:
      - provider: anthropic
        model: claude-sonnet-4
        api_key_ref: cred_proj_grant_anthropic   # Key from the research grant
        priority: 1
    quota:
      monthly_tokens: 5000000                     # 5M Tokens/month, grant budget
      max_tokens_per_call: 16384                  # Larger contexts for papers
    preferences:
      planning_model: claude-sonnet-4
      execution_model: claude-sonnet-4
      light_model: gemini-2.5-flash               # falls back to Account/Team/Tenant
```

### LLM Config at the Team

```yaml
team:
  id: team_nlp_research
  llm_config:
    providers:
      - provider: anthropic
        api_key_ref: cred_team_anthropic           # Team key
    quota:
      monthly_tokens: 20000000                     # 20M Team budget
```

### LLM Config at the Tenant

```yaml
tenant:
  id: tenant_acme
  llm_config:
    providers:
      - provider: google
        model: gemini-2.5-pro
        api_key_ref: cred_tenant_google            # Company key
        priority: 10
      - provider: local_ollama
        model: llama-3.3-70b
        endpoint: http://localhost:11434
        api_key: null
        priority: 99                                # last fallback
        quota: unlimited
```

---

## 3. Provider Resolution Cascade

```
Account → Project → Team → Tenant → Local LLM → Error
```

When the Brain wants to make an LLM call:

```
1. Session has Account (acc_mike) + Project (proj_transformer_review)

2. Which model do we need?
   → Purpose (planning/execution/light) → Determine model

3. Find Provider + Key (Cascade):
   a. Does Account have a provider for this model?      → use Account key
   b. Does Project have a provider for this model?       → use Project key
   c. Does Team have a provider for this model?          → use Team key
   d. Does Tenant have a provider for this model?        → use Tenant key
   e. Can local LLM provide this model (or equivalent)? → use local
   f. Nothing? → Task failed

4. Check quota (ALL applicable levels):
   → Account quota OK?    (Mike's personal budget)
   → Project quota OK?    (Grant budget for this Project)
   → Team quota OK?       (Team budget)
   → Tenant quota OK?     (Company budget)
   → ALL must be OK. One exceeded = blocked.

5. Execute call, track usage at all levels
```

### Model Alias Resolution

Before the provider cascade takes effect, it must be clear *which* specific model is meant. Recipes (see `recipes.md`) and Engine defaults typically reference **aliases** instead of direct provider model strings — so that the same configuration works on any Tenant, regardless of which provider keys it has.

Implemented in `AiModelResolver` (vance-brain). Format: `<prefix>:<rest>`.

```
input := <prefix>:<rest>

  prefix ∈ AiModelService.listProviders() (gemini, anthropic, …)
    → Use DIRECTLY: (prefix, rest) as (provider, model)

  Setting `ai.alias.<prefix>.<rest>` is set
    → Resolve RECURSIVELY with the resolved value
       (Cycle detection + depth limit 8)

  prefix == "default" and no alias configured
    → Fallback: (ai.default.provider, ai.default.model)

  else
    → UnknownModelException
```

The `default:` namespace has the safety net fallback: as long as a Tenant has `ai.default.provider` + `ai.default.model` configured, bundled Recipes like `default:fast`, `default:analyze` work without further setup steps.

**Example settings for a Tenant with a multi-provider setup:**

```yaml
acme:
  ai.default.provider:        { type: STRING, value: gemini }
  ai.default.model:           { type: STRING, value: gemini-2.5-flash }

  ai.alias.default.fast:      { type: STRING, value: gemini:gemini-2.5-flash }
  ai.alias.default.analyze:   { type: STRING, value: anthropic:claude-sonnet-4-5 }
  ai.alias.default.deep:      { type: STRING, value: anthropic:claude-opus-4 }
  ai.alias.default.web:       { type: STRING, value: gemini:gemini-2.5-pro }
  ai.alias.default.code:      { type: STRING, value: anthropic:claude-sonnet-4-5 }
```

**When the mechanism runs relative to the §3 cascade:** the alias resolver runs *before* provider resolution. First, the logical model label (e.g., `default:analyze`) is resolved to a concrete `(provider, model)`, then §3 searches for the appropriate key in the Account/Project/Team/Tenant cascade. Aliases and quota cascade are orthogonal concepts: alias decides *which model*, cascade decides *whose key*.

**Model size as a Tier-Hint:** `ai-models.yaml` additionally declares `size: SMALL|LARGE` per model. This is used for Recipe prompt variant selection (see `recipes.md` §5.1). Aliases do not change the classification — the tier information always comes from the *resolved* model.

#### Comma Cascade over Multiple Specs

The input of a model spec can be a **list**, separated by commas. The first element that is *configured* wins. Example in a Recipe:

```yaml
params:
  model: default:arthur,default:chat
```

This reads as: "take the engine-specific `default:arthur` if the Tenant has defined it — otherwise fall back to the generic `default:chat`." This allows a Recipe to signal a preferred model tier for an Engine without every Tenant having to explicitly set the alias.

**Backward-Compat:** A single element (no comma) behaves identically to today — `default:chat` is syntactically a 1-element cascade.

**Resolution per element** (same rule set as above, but with different miss semantics):

- Element is a direct `<provider>:<model>` → wins immediately.
- Element is a named provider instance (`ai.provider.<prefix>.type` is set) → wins immediately.
- Element is an alias and `ai.alias.<prefix>.<rest>` is configured → recursively resolve with the resolved value (which itself can be a cascade).
- Element is **not** configured → *not* the `default:` safety-net fallback as usual, but jump to the next cascade element.

**Last-resort fallback only at the end:** The **last** element of the cascade still falls back to the `default:` safety-net rule (`ai.default.provider` / `ai.default.model`). Thus, `default:arthur,default:chat` in the worst case (neither Arthur nor Chat alias configured) lands on the Tenant default — it does not throw an error.

**Cascade also in alias values:** The comma cascade applies wherever a spec string is resolved — including in the *target* of an alias. `ai.alias.default.chat = anthropic:claude-haiku-4-5,openai:gpt-4o-mini` is valid and acts as a two-stage cascade from the alias target. Cycle detection works per cascade element with its own `seen` set; the depth limit (`MAX_DEPTH=8`) remains unchanged.

**When the cascade continues:** Today, **only in case of missing definition** (no direct provider match, no instance type, no alias setting). **Runtime errors** (provider down, quota exhausted, model deactivated) do *not* abort the cascade and fail hard as before. Disable logic will later move into the **same** resolver method, so all cascade consumers automatically benefit — without API changes.

**Distinction from `params.fallbackModels`:** `fallbackModels` (`ChatBehaviorBuilder`) is a **runtime fallback chain** at the provider level — the primary model is actually called, and only in case of quota/provider failure does the chain continue. The comma cascade is a **setup-time cascade** at the alias definition level — it selects the first *configured* model *before* the first API call. Both mechanisms are orthogonal and combinable: an entry in `fallbackModels` can itself be a comma cascade.

**Example settings + Recipe:**

```yaml
# Tenant Settings (acme)
ai.alias.default.arthur:  { type: STRING, value: anthropic:claude-opus-4 }
ai.alias.default.chat:    { type: STRING, value: gemini:gemini-2.5-flash }
```

```yaml
# Recipe arthur (bundled)
arthur:
  engine: arthur
  params:
    model: default:arthur,default:chat
```

Tenant `acme` has `default:arthur` configured → arthur Recipe uses `claude-opus-4`. Another Tenant without a `default:arthur` setting automatically falls back to `default:chat` → `gemini-2.5-flash`. No one needs to create empty alias entries just for the Engine defaulting mechanism.

**Whitespace and empty elements:** Whitespace around comma separators is trimmed (`a , b` ≡ `a,b`). Empty elements (`a,,b`) are skipped.

**Model Metadata — Catalog Storage:** Model metadata (Context-Window, Default-Max-Output, `size`, `capabilities`, `stripThinkTags`, Pricing) is not stored in a monolithic file, but lives as a **separate document per model** under two parallel paths: `_vance/model/<provider>/<slug>.yaml` (Operator-managed) and `_vance/model-auto/<provider>/<slug>.yaml` (Discovery-Service-managed). Storage, cascade, cache strategy, and Discovery Service are described in §3a.

---

### Named Provider Instances

The left part of a model spec (`<prefix>:<model>`) is semantically a **provider instance**, not necessarily the protocol type. Default: instance name == `ProviderType.wireName()` (`openai`, `anthropic`, …) — so all existing specs and settings remain valid.

Tenants can define additional **named instances** to, for example, use multiple OpenAI-compatible endpoints (real OpenAI, DeepSeek-Direct, OpenRouter, local vLLM) in parallel — each with its own `apiKey` and `baseUrl`, but the same wire protocol:

```yaml
acme:
  # Standard instance "openai" → real OpenAI
  ai.provider.openai.apiKey:           { type: PASSWORD, value: sk-... }

  # Additional instance "deepseek-direct" → OpenAI-Wire, but DeepSeek endpoint
  ai.provider.deepseek-direct.type:    { type: STRING,   value: openai }
  ai.provider.deepseek-direct.baseUrl: { type: STRING,   value: https://api.deepseek.com/v1 }
  ai.provider.deepseek-direct.apiKey:  { type: PASSWORD, value: sk-... }

  # Alias references the instance directly
  ai.alias.default.analyze:            { type: STRING,   value: deepseek-direct:deepseek-v4-flash }
```

**Resolution order** in `AiModelResolver` (extended):

```
input := <prefix>:<rest>

  prefix ∈ ProviderType.wireName() (openai, anthropic, …)
    → (protocolType=prefix, instance=prefix, model=rest)

  Setting `ai.provider.<prefix>.type` is set
    → instance recognized; (protocolType=<value>, instance=prefix, model=rest)
       Unknown type-wireName → IllegalArgumentException

  Setting `ai.alias.<prefix>.<rest>` is set
    → recursively resolve with resolved value

  prefix == "default" and no alias
    → Fallback (ai.default.provider, ai.default.model)

  else
    → UnknownModelException
```

**What the instance selects:**
- **`AiChatConfig.providerInstance`** decides under which path `ai.provider.<instance>.{apiKey,baseUrl}` is read.
- **`ModelCatalog`** indexes its YAML sections by instance name. A named instance carries its own metadata section:
  ```yaml
  deepseek-direct:
    deepseek-v4-flash:
      contextWindowTokens: 1048576
      size: SMALL
  ```
- **`AiChatConfig.providerType`** still provides the protocol for adapter dispatch in `AiModelService` (which `AiModelProvider` bean builds the chat).

**What the instance does not change:** the wire model name sent to the API (`rest` part). To use the same model designation with different metadata configs, create two instances with the same `type` that differ per instance under `_vance/model/<instance>/<modelName>.yaml` (see §3a).

### Scope-Pinning: `params.aiScope`

Alias, `ai.default.*`, `ai.provider.<instance>.apiKey`, `.baseUrl`, and the `ModelCatalog` view are **separate** cascade lookups (`think-process → project → _tenant`). A Project that only overrides a part of this mixes layers: if it sets `ai.provider.openai.baseUrl` to a different endpoint but inherits the model name from `_tenant`, the Tenant model goes to the Project endpoint (symptom: 404 "model does not exist" despite valid config at both levels).

A Recipe can therefore pin its AI config to the outermost layer via a parameter:

```yaml
params:
  aiScope: tenant     # Default: cascade
```

`tenant` means: **all** mentioned lookups run with `projectId=null`/`processId=null`, so the cascade collapses to `_tenant`. Model and endpoint thus come from the same level by design. There is deliberately **no** fallback to the Project level if the Tenant has not configured anything — "sometimes Tenant, sometimes Project, depending on which key is set" would be exactly the non-determinism that pinning eliminates. The pinned Engine will then fail (for best-effort services, this means no execution).

The **criterion for pinning** is not "Service-Engine", but *is the output control data for others*: [Agrajag](agrajag-engine.md) marks Tools UNAVAILABLE and sets cooldowns that slow down other processes — this decision must not depend on a Project's experimental model. User-facing helpers (`how_do_i`, `follow-up`) intentionally remain on `cascade` and follow the Project model. The process itself remains in its Project; only the AI config (`AiConfigScope`, read in `ChatBehaviorBuilder`/`EngineChatFactory`) is pinned.

---

## 3a. Model Catalog Storage — Per-Model Documents

Model metadata is **not** kept in a monolithic `ai-models.yaml`. Each model is a separate document — separated into two path prefixes per Scope: `_vance/model/**` (Operator-managed, "manual") and `_vance/model-auto/**` (`ModelDiscoveryService`-managed, "auto"). This makes single-model overrides trivial, avoids merge conflicts in a single file, and makes the Discovery Service (§3a.6) safe against Operator edits.

### 3a.1 Path Convention

The catalog knows **two parallel path prefixes** per Scope — deliberately separated by path and not by flag, so that auto-writes can never overwrite manual data and vice versa:

```
_vance/model/<providerInstance>/<filenameSlug>.yaml          ← MANUAL  (Operator/Maintainer)
_vance/model-auto/<providerInstance>/<filenameSlug>.yaml     ← AUTO    (Discovery Job, §3a.6)
_vance/model/<providerInstance>/<sub>/<filenameSlug>.yaml    ← nested for '/' in wire model name
```

| Path Prefix | Owner | Provenance | Who writes |
|---|---|---|---|
| `_vance/model/**` | Operator / Maintainer | Hand-maintained; carries pricing, capabilities, custom overrides | UI/Setting-Forms, Eddie via `manual_read('ai-model-catalog')`, direct Doc edits |
| `_vance/model-auto/**` | Automation | Provider listing output; only what the vendor API provides | `ModelDiscoveryService` (§3a.6); **never manual** |

Both paths live in every Scope (Project, `_tenant`, `_vance`). Within a Scope, **manual is applied after auto** — manual thus wins field-wise (see §3a.4). Discovery can freely overwrite in its own subtree half.

**Naming Convention** (applies identically to both prefixes):

- **`providerInstance`** — Instance name from §3 (Default: `ProviderType.wireName()` like `anthropic`, `openai`, `gemini`, `ollama`, `lmstudio`, `ollama-cloud`; or named like `deepseek-direct`). Directory name must match `[a-z0-9._-]+`.
- **`filenameSlug`** — Filename without `.yaml`. Must match `[A-Za-z0-9._-]+`. Subdirectories under the provider directory carry the `/` part of a wire model name (see next point).
- **Wire model name** (what goes to the provider API):
  - Default: relative path under the provider directory, without `.yaml` extension. Example: `_vance/model/lmstudio/mlx-community/Qwen3.6-35B-A3B-4bit.yaml` → Wire name `mlx-community/Qwen3.6-35B-A3B-4bit`.
  - Override via YAML field `wireName: ...` — for model names with `:` (Ollama tags like `qwen3:30b`) or other filename-unsafe characters. Example: `_vance/model/ollama/qwen3-30b.yaml` with `wireName: "qwen3:30b"`.
- **No provider metadata sidecar.** Provider config (wire type, API key, base URL) lives exclusively in settings (`ai.provider.<instance>.{type,apiKey,baseUrl}`, see §3 "Named Provider Instances"). A second source for this would be double-entry bookkeeping and a source of drift.
- Validation happens during catalog build. Invalid provider names or file slugs → Skip + WARN log, so a single typo does not block the entire catalog.

### 3a.2 Model Document — YAML Schema

Identical schema for MANUAL and AUTO paths — what differs is only *which* fields are typically set.

```yaml
# _vance/model/anthropic/claude-sonnet-4-6.yaml         (manual example)
wireName: "claude-sonnet-4-6"    # only if different from path (e.g., Ollama tags)
contextWindowTokens: 200000
defaultMaxOutputTokens: 8192
size: LARGE                      # SMALL | LARGE — Recipe tier hint
kind: chat                       # chat | image (default chat)
capabilities:                    # List, replaced as a whole
  - vision
  - pdf
  - thinking
stripThinkTags: false            # default false — see §4.1
messageParser: null              # optional — Name of a registered MessageParser bean
                                 # (gemma4, deepseek-v4, …). Falls back to model-quirks.yaml
                                 # pattern match, see §4.1.1.
outputTokenParam: max_tokens     # optional — OpenAI-Wire field for output cap
                                 # (max_tokens | max_completion_tokens), see §4.1.2
pricing:                         # Hand-maintained in the manual layer (auto never writes this)
  currency: USD
  inputPerMTok: 3.00
  outputPerMTok: 15.00
  cacheReadPerMTok: 0.30
  cacheWritePerMTok: 3.75
discoveredBy: manual             # "manual" in manual path, "discovery-job" in auto path
discoveredAt: "2026-06-27T10:00:00Z"
```

**Fields typically per layer:**

| Field | Bundled (manual) | _tenant manual | _tenant auto | project manual | project auto |
|---|---|---|---|---|---|
| `contextWindowTokens` | yes | on override | on override (Gemini provides it) | on override | on override |
| `pricing` | yes (vendor standard) | yes (enterprise deals) | **never** | yes | **never** |
| `capabilities` | yes | on override | **never** (API listing doesn't know this) | on override | **never** |
| `kind` | yes | on override | if listing provides it | on override | if listing provides it |
| `stripThinkTags` | yes (Reasoning models) | on override | **never** | on override | **never** |
| `messageParser` | rarely (only if pattern in `model-quirks.yaml` is insufficient) | on override | **never** | on override | **never** |

**Required fields**: `contextWindowTokens`, `size` (effectively via cascade resolve — an auto-doc alone does not need them as long as bundled/manual provides them). Everything else is optional. `pricing` null means "unpriced" for Cost-Tracking: the call **still** lands in the ledger (tokens, calls, model, caller), only the cost columns remain 0 and `currency` null. An unpriced model must never look like an unused one in usage statistics.

Missing `pricing` means **"price unknown", not "free"** — the daily bucket counts such calls in `unpricedCalls` and the report shows its coverage, instead of silently adding a zero to the sum. To keep this unambiguous, locally running models (ollama/lmstudio) carry an **explicit zero rate** (`inputPerMTok: 0.0`) instead of no block at all.

**`defaultMaxOutputTokens` for Reasoning models.** On the OpenAI wire, `reasoning_content` tokens count **against** `max_tokens`. A cap measured only for the visible answer is therefore eaten up by the Thinking pass: the provider responds with HTTP 200, `finish_reason: "length"` and **completely empty** content — no text, no tool call. For every reasoning-capable model, the cap must therefore cover Thinking **plus** answer (bundled value for GLM-/DeepSeek families: 32768). The resilience layer treats exactly this combination (empty + `finish=LENGTH`) as **not retryable** — an identical re-request hits the same wall — and passes the `finishReason` to the Engine so that the user message says "Output limit reached" instead of "transient provider glitch" (see §8).

**No separate provider documents.** Unlike in earlier spec versions, there is **no** `_provider.yaml` sidecar. Provider endpoint config (wire type, API key, base URL) is the domain of settings (§3 "Named Provider Instances"); UI display names are derived client-side from the instance name or configured via optional settings (`ai.provider.<instance>.displayName`).

### 3a.3 Override Cascade

`ModelCatalog` merges **seven layers** per `(providerInstance, modelName)` — three Scope levels × {auto, manual} plus Bundled as the base. Innermost wins, manual wins within a Scope over auto:

```
project-manual  ← innermost, beats everything
project-auto
_tenant-manual
_tenant-auto
_vance-manual   (system tenant, global Maintainer layer)
_vance-auto     (typically empty — Discovery runs per-Tenant)
bundled         ← outermost (classpath)
```

Pseudo-code of application order (outer → inner; each layer overwrites fields it sets):

```
apply bundled
apply (_vance, _tenant) auto      then manual
if tenant given:
  apply (tenant, _tenant) auto    then manual
  if project != _tenant:
    apply (tenant, project) auto  then manual
```

- **Merge is deep, per field.** An override only provides the fields it changes; unset fields are inherited.
- **Lists are replaced as a whole** (especially `capabilities`, `supportedAspectRatios`) — so owners can both add and remove individual values. Concatenation semantics would be ambiguous.
- **Manual over Auto per Scope.** Within a `(tenant, project)` Scope, the manual layer is applied *after* the auto layer — manual hand-edits thus win field-wise against fresh Discovery data at the same Scope. Discovery can freely overwrite in its subtree (`_vance/model-auto/**`) without manual overrides being lost.
- **Inner-Scope-Auto beats Outer-Scope-Manual.** Example: `(tenant, project)` auto sets `contextWindowTokens = 50000`; `(tenant, _tenant)` manual has `100000`. Lookup at `(tenant, project)` yields `50000` — Project is the inner Scope. This is intentional: Project-specific reality beats Tenant default, regardless of who wrote it.
- **Bundled layer** is located under `vance-brain/src/main/resources/vance-defaults/_vance/model/<providerInstance>/<filenameSlug>.yaml` (path mirror in the classpath, same convention as `DocumentService.RESOURCE_PREFIX = "vance-defaults/"`). There is **no** bundled layer for `model-auto/**` — bundled is always manual-shaped. With a new Brain version, bundled updates are **not** automatically mirrored in Tenant docs.

Engines automatically pass `tenantId`/`projectId` from the Process via `AiChatOptions` to the per-call providers, so their capability lookups (Vision/PDF packaging) also see the scope-specific view.

### 3a.4 Cache — Atomic-Swap Refresh

`ModelCatalog` holds Bundled + Per-Scope layers (manual and auto separately) in memory as an immutable `Snapshot`. Lookup is O(1) and in the hot path of every LLM call; a memoized merged view per `(tenantId, projectId)` is built lazily on first access and cached in the Snapshot.

**Initial Load** on boot:
1. Classpath scan over `vance-defaults/_vance/model/**/*.yaml` → Bundled layer (manual-shaped).
2. `findAllByPathPrefix("_vance/model/")` → a map `(tenantId, projectId) → Manual layer`.
3. `findAllByPathPrefix("_vance/model-auto/")` → a map `(tenantId, projectId) → Auto layer`.
4. Build a complete new `Snapshot` in a local variable, then assign it to the active cache pointer with **one atomic volatile write**.

**Refresh (every 30 minutes, scheduled):** identical loader — new Snapshot built completely, then atomic swap. **No partial updates to the running cache**, so readers never see an inconsistent intermediate state.

**Refresh on Demand:**
- REST: `POST /brain/{tenant}/admin/ai-models/refresh` (Admin right via `RequestAuthority.enforce(Tenant, ADMIN)`). Empty body. Response: `{ refreshedAt, bundledModelsLoaded, bundledProvidersLoaded, overrideScopes, durationMs }`. Synchronous — response only after swap.
- UI: Button in the Profile Editor (`Actions` section) calls the same endpoint and shows the counters as a toast.

**Deliberately no `DocumentChangedEvent` invalidation.** Catalog contents change infrequently (models per Tenant in the order of dozens, update frequency days to weeks). A 30-min sliding freshness plus explicit trigger is enough — and avoids a listener path that would have to react to every settings/wizard write.

**Pod Locality:** Each Pod has its own cache. Refresh is not coordinated — in multi-Pod setups, a refresh drifts by a maximum of 30 minutes between Pods, which is acceptable for model catalog data. For cluster-wide immediate consistency, call the REST endpoint per Pod (or via a cluster broadcast, which is not part of v1).

### 3a.5 Bootstrap & Migration

**First-Boot Bootstrap:** A `ModelCatalogBootstrapper` runs once at Brain startup. If the `_vance` Tenant contains **no** documents under `_vance/model/**`, it copies all bundled files there. This makes the initial Tenant productive without anyone having to manually write YAML beforehand. Later Brain versions execute the bootstrap again, but **only add missing** models — existing Tenant edits are not overwritten. **`_vance/model-auto/`** is never populated by the bootstrapper — that is Discovery's domain.

**No migration path from old monolithic `ai-models.yaml`.** The old format is replaced with this spec — Brain reads neither `_vance/ai-models.yaml`, `_tenant/ai-models.yaml`, nor Project `ai-models.yaml`. Existing bundled `ai-models.yaml` was converted to the new directory structure during the build (one-time code change, no runtime fallback).

### 3a.6 Discovery Service

`ModelDiscoveryService` deterministically populates the auto layer (`_vance/model-auto/**`) from the vendor listing APIs. Operator edits under `_vance/model/**` are never touched — the two layers are physically separated by the path prefix.

**Trigger:**
- REST `POST /brain/{tenant}/admin/ai-models/discover` (Admin right). Synchronous, returns counters.
- UI: "Discover AI Models" button in the Profile Editor next to "Refresh".
- (Optional) UrsaScheduler Recipe for scheduled runs (Default off).

**Scope Symmetry:** Discovery reads provider credentials non-cascaded per `(tenant, project)` and writes the auto-docs to the *same* Scope. This means: settings in Project `_tenant` produce auto-docs in Project `_tenant`; settings in Project `acme-research` produce auto-docs in Project `acme-research`. No cross-scope bleeding.

**Per Scope:**
1. `SettingService.findAll(tenant, "project", projectId)` returns all settings in the Scope. Keys `ai.provider.<instance>.{type,apiKey,baseUrl}` are grouped per `<instance>`.
2. Read protocol type from `ai.provider.<instance>.type` (Fallback: `instance == ProviderType.wireName()`). Unknown `type` → skip + WARN.
3. Decrypt API key via `SettingService.getDecryptedPassword(...)`. For providers with `requiresApiKey()` and empty key → skip + DEBUG.
4. Call `AiModelService.findProvider(type).listAvailableModels(ProviderListingRequest)`. Each provider bean implements the same SPI; internally, the respective listing API is called:

   | Provider | Endpoint | Data Fields |
   |---|---|---|
   | Anthropic | `GET /v1/models` (`x-api-key`) | id only |
   | OpenAI / OpenAI-wire Gateways | `GET /v1/models` (`Bearer`) | id only |
   | Gemini | `GET /v1beta/models?key=...` | id + `inputTokenLimit` |
   | Ollama | `GET /api/tags` (no auth) | id (with `:`-tag convention) |
   | OllamaCloud | `GET /api/tags` (`Bearer`) | id (with `:`-tag) |
   | LM Studio | `GET /v1/models` (no auth needed) | id only |

5. For each found model, write a YAML doc to `_vance/model-auto/<instance>/<slug>.yaml`. Slug encoding: `:` → `-` plus `wireName:` field; `/` → nested subdirectories. Content: `wireName` (if necessary), `contextWindowTokens` (if API provides it), `discoveredBy: discovery-job`, `discoveredAt: <ISO-8601>`.

**Failure Isolation:** Per-instance `try/catch` — a 401 or a hanging provider does not block the others. Failed instances land in `DiscoveryResult.skippedInstances` with the error message and are displayed by the UI as a WARN list; the entire pass result is still `200 OK`.

**Pricing — deliberately not auto-discovered.** No vendor listing API provides prices; a LightLlm/Web-Search path is not included in v1 (hallucination risk, complexity without clear gain). Pricing comes from the **manual** layer (Bundled for known models, Operator edit for new ones), and is overlaid field-wise onto an auto-doc by the cascade merge. New models without a bundled entry appear as "unpriced" after Discovery until an Operator writes a manual doc (see Eddie manual `manuals/ai-model-catalog` for the workflow).

**`kind` — also deliberately not auto-discovered.** Discovery writes only **observations** (wire name, context window), never **classifications** (`kind`, pricing, `capabilities`). The reason is the cascade direction: the auto layer is *above* the bundled layer, so an asserted `kind: chat` would overwrite a correctly bundled `kind: image`. Specifically: Gemini lists `gemini-2.5-flash-image` with `generateContent` — it fits any "chat-capable" filter, but it's an image model. Before this fix, a Discovery run reclassified it as a chat model, causing it to disappear from `listAllImages` and thus from the Fenchurch alias pickers, while `ai.alias.default.image` still pointed to it → `invalid_choice` when saving the LLM form. Providers no longer report `kind` at all (`DiscoveredModelInfo` has no such field).

**Idempotence:** Auto-docs are always overwritable; each Discovery run writes them anew. Operator edits live in the disjoint `_vance/model/**` path and are thus automatically safe — no `discoveredBy` check needed.

**Refresh after job end:** `ModelCatalog.refresh()` is called internally directly, so the new auto-docs become visible without a second REST call.

---

### Quota Check: All Levels Simultaneously

This is important: a call consumes quota at **every level**. If Mike works in Project X:

```
Call: 3000 Tokens
  → Account acc_mike: 142k → 145k / 500k   ✓
  → Project proj_X: 890k → 893k / 5000k    ✓
  → Team team_nlp: 4.2M → 4.203M / 20M     ✓
  → Tenant: no limit                       ✓
  → All OK → Call allowed
```

If the Project budget is exhausted but Mike's personal budget is not:
```
  → Account acc_mike: 142k / 500k          ✓
  → Project proj_X: 4.998M / 5000k         ✗ OVER
  → Blocked: "Project quota exhausted"
```

---

## 4. A New LLM Object Per Call

The Brain holds **no global ChatClient**. For each LLM call, a fresh client is created with the correct credentials:

```java
public class LlmFactory {

    public ChatClient createForSession(Session session, String purpose) {
        Account account = session.getAccount();
        Project project = session.getProject();
        
        // Determine model based on purpose — Preferences cascade
        String model = resolveModel(purpose, account, project);
        
        // Find provider and key — Cascade
        ProviderCredential cred = resolveProvider(model, account, project);
        
        // Check quota — all levels
        quotaService.checkAllLevels(account, project, estimatedTokens);
        
        // Build a fresh ChatClient
        return ChatClient.builder()
            .model(cred.getProvider(), model)
            .apiKey(cred.decryptApiKey())
            .build();
    }
}
```

### 4.1 Provider Decorator Chain

Each per-call `AiChat` (built via `StandardAiChat`) stacks an optional decorator layer around the langchain4j `ChatModel` of the provider. This same layer performs two tasks on the raw response — Think tag stripping and model-specific message parsing — and is hooked in only when at least one of the two is active:

```
engine / Light-LLM / StandardAiChat.ask
  ↑ cleaned ChatResponse  ←  engines never know which markup was stripped
                          ←  or which inline tool-call format was rewritten
SanitizingChatModel       ←  optional — wrapped iff modelInfo.stripThinkTags = true
                          ←  OR a MessageParser is bound for the model
  ↑ raw ChatResponse
LoggingChatModel          ←  AiTraceLogger debug-log + LlmTraceRecorder persistence
                          ←  Trace sees RAW (forensic audit, training-data analysis)
  ↑ raw ChatResponse
provider ChatModel        ←  AnthropicDirectChatModel / GoogleAiGeminiChatModel /
                          ←  OpenAiChatModel / OllamaChatModel / …
```

Streaming has the same topology with `SanitizingStreamingChatModel` as the outermost layer — it is only hooked in if a `MessageParser` is bound; the parser acts in the `onCompleteResponse` callback, partial tokens pass through unchanged.

**Contract of the layers:**

- **`LoggingChatModel`** is always active. Writes every request/response to `de.mhus.vance.brain.ai.trace` logger plus optionally via `LlmTraceWriter` to the `LlmTraceDocument` collection. ALWAYS sees the raw model response including any existing reasoning markup or inline emitted tool calls.
- **`SanitizingChatModel`** processes the response in two stages:
  1. **Message Parser Stage** (if a `MessageParser` is bound, see §4.1.1): rewriting of the `AiMessage` — typically synthesizes `ToolExecutionRequest`s from inline emitted tool call text (Gemma-4) or repairs malformed `function.arguments` (DeepSeek-V4).
  2. **Think-Tag-Strip Stage** (if `modelInfo.stripThinkTags() == true`): clones the `ChatResponse` with a cleaned `AiMessage` (Tool-Execution-Requests remain untouched), so that all consumers above (Engines, chat_messages persistence, History replay, Judges) only see the final user text.

  Default behavior (both flags inactive, no parser bound): no wrap, no overhead.

**Why not in the Engine:** Engines (Arthur, Eddie, Ford, Marvin, …) consume `response.aiMessage().text()` and `aiMessage().toolExecutionRequests()` and should NOT have to know per provider/model which markup to expect or which model emits text instead of structured tool calls. Sanitizer and MessageParser are *cross-cutting* and belong on the provider side — analogous to the trace logger.

**Raw-Thoughts-Capture (instead of pure discarding).** The raw narration that the model streams during the turn (for reasoning models, the `<think>…</think>` monologues from Qwen3/DeepSeek-R1/Granite or Harmony-`analysis`-channels for GPT-OSS) is valuable to the user — they want to be able to reread their live-seen thoughts later. Instead of discarding them, the Engines of the Structured-Action family (Arthur, Eddie) accumulate the **raw response text of each loop iteration verbatim** per turn (analogous to the `historyTagSink` pattern, in the `TurnReasoningBuffer`) and write it as a separate `thinking` field to the `ChatMessageDocument` during persistence — separate from the final `content` (which comes from the structured action `message` field). **Nothing is filtered**: the `thinking` value is exactly the text the client saw streaming. Models that only emit the action tool call without free text (typically non-reasoning models like Claude) provide empty text → `null`, no field. The `thinking` content goes to clients via `ChatMessageDto`/`ChatMessageAppendedData`; the Web UI displays it as an expandable, verbatim rendered "thoughts" area below the response (see [web-ui.md](web-ui.md) §6.5). Important: on the **streaming path**, the strip stage does not apply (partial tokens pass through raw), so the raw narration for the chat turn is in the aggregated `aiMessage().text()` and is encapsulated there.

### 4.1.1 MessageParser SPI

Some LLMs do not reliably provide structured tool calls (Gemma-4 family via LM Studio/llama.cpp serializes them as text with Gemma-internal `<|"|>` quote tokens; DeepSeek-V4-Pro appends trailing garbage to valid `function.arguments`). Instead of burdening every Engine path with fallback logic, there is a small SPI:

```java
package de.mhus.vance.brain.ai.parser;

public interface MessageParser {
    String name();                          // e.g., "gemma4", "deepseek-v4"
    ChatResponse parse(ChatResponse raw);   // pure transform, no I/O
}
```

Concrete `@Component` implementations (`Gemma4MessageParser`, `DeepSeekV4MessageParser`) live under `de.mhus.vance.brain.ai.parser`. The `MessageParserRegistry` (also a Spring bean) collects them by `name()`. `AbstractChatProvider.createChat` resolves the parser from `modelInfo.messageParser()` and passes it to `StandardAiChat`.

**Contract of each implementation:**

- **Pure** — no I/O, no Mongo access, no Engine state reads.
- **Defensive** — if the response already looks good (e.g., `aiMessage().hasToolExecutionRequests() == true`), the parser MUST return the input verbatim. The cascade can enable the parser for a model that *usually* has the quirk; occasional clean turns must pass through unchanged.
- **Stateless** — Spring instantiates one bean per parser; many chat calls run concurrently.

**Resolution Cascade for `messageParser`** (outermost → innermost; innermost wins):

```
1. Project-Layer YAML    _vance/model/<provider>/<model>.yaml    (explicit)
2. _tenant-Layer YAML    _vance/model/<provider>/<model>.yaml    (explicit)
3. _vance-Layer YAML     _vance/model/<provider>/<model>.yaml    (explicit)
4. Bundled per-model    vance-defaults/_vance/model/<...>.yaml  (explicit)
5. Bundled Quirks-File   vance-defaults/model-quirks.yaml        (Pattern match by Name)
6. null  (no parser — pass-through)
```

Layers 1–4 are the normal [§3a.3](#3a3-override-cascade) cascade over the `messageParser` field. Layer 5 is the **Quirks Default Layer** — a single bundled YAML with glob patterns that applies across providers:

```yaml
# vance-brain/src/main/resources/vance-defaults/model-quirks.yaml
rules:
  - match: "deepseek-v4*"
    messageParser: "deepseek-v4"
  - match: "gemma-4*"
    messageParser: "gemma4"
```

`match` is a case-insensitive glob (`*` = 0+ characters, `?` = 1 character) against the wire model name. First match wins. Provider-agnostic — the same `deepseek-v4-pro` via real DeepSeek, OpenRouter, local vLLM gets the same parser.

**Why this way:**

- **Zero-Config for the default case.** New models of the Gemma-4 or DeepSeek-V4 family are automatically recognized without having to maintain per-model YAMLs anywhere.
- **One place for "known quirks".** `model-quirks.yaml` is versioned with the Brain code and visible in code review — no scattered settings.
- **Specific beats general.** An override in the per-model YAML (`messageParser: null` or a different parser name) wins against the pattern.
- **No auto-detection in the hot path.** Selection is data-driven and resolved once during model resolution — no per-turn regex race. Defensive `canParse`-checks live *within* the concrete parser implementation, not in the routing.

**Adding a new parser:**

1. `@Component` under `de.mhus.vance.brain.ai.parser` with `MessageParser` implementation.
2. A line in `model-quirks.yaml` with `match` pattern + `messageParser` name (if cross-provider).
3. Unit test with the concrete LLM output snippet (preferably verbatim from Brain log).

The `name()` is validated by `MessageParserRegistry` on boot; unknown names in `messageParser` fields produce a WARN log line, but no boot error — the response then simply passes through unchanged.

#### 4.1.2 Request Quirks — `outputTokenParam`, `unsupportedParams`, `reasoningEffortWhenOff`

The same quirks file carries not only response rewrites but also **request** quirks: three `ModelInfo` fields that describe the dialect a model requires on the wire. All three were verified against `openai:gpt-5.6-sol` on 2026-08-10 (`ModelWireProbeAiTest`, see below) — each one was a hard HTTP 400 that killed the turn.

**`outputTokenParam`** (`max_tokens` | `max_completion_tokens`, Default `max_tokens`) — which field carries the output cap; the `OpenAiProvider` reads it when building the request builder. OpenAI's reasoning models (o-series, gpt-5 upwards) reject `max_tokens` with HTTP 400 and require `max_completion_tokens`; all other OpenAI-wire endpoints (cortecs, LM Studio, Ollama, GLM, DeepSeek) only know the historical field. This makes it a **per-model fact**, not a provider switch.

**`unsupportedParams`** (list of `temperature`/`top_p`/`top_k`/`frequency_penalty`/`presence_penalty`/`seed`/`stop`, Default empty) — sampling knobs that the model rejects. `AbstractChatProvider` nulls them **centrally** before `buildModels`, i.e., uniformly for every provider; the model then runs on its own defaults instead of refusing the request. This is not cosmetic: `AiChatOptions` sets `temperature` via builder default, so a reasoning model without this entry is dead in **every** turn. An **empty list in YAML is a statement** ("accepts everything") and beats the pattern; a missing field inherits it.

**`reasoningEffortWhenOff`** (String, Default unset) — what is sent when Vance *does not* want reasoning. Normal case: send nothing. Reasoning-native models (gpt-5.x) think by default and then refuse this in combination with function tools (`"Function tools with reasoning_effort are not supported … set reasoning_effort to 'none'"`) — since every Engine turn carries a tool manifest, the "off" must be explicitly stated. Consequence in the catalog: the `gpt-5.6-*` models **deliberately do not** have a `thinking` capability, otherwise a `thinking: medium` Recipe could override the pin again.

```yaml
rules:
  - match: "gpt-5*"
    outputTokenParam: "max_completion_tokens"
    unsupportedParams: ["temperature", "top_p", "frequency_penalty", "presence_penalty", "stop"]
    reasoningEffortWhenOff: "none"
```

Cascade identical to `messageParser` (per-model YAML beats pattern beats default), with two additions:

- **Resolution per field.** A rule can carry `messageParser`, `outputTokenParam`, or both; it searches for the first rule that sets the *requested* field. This prevents a parser rule from obscuring a later token rule for the same model.
- **Patterns apply even without a catalog entry.** The synthetic `ModelInfo` fallback for an unknown model also goes through the quirks — an uncataloged gpt-5 derivative would otherwise die on the 400 error just because no one wrote its YAML.

**Onboarding a new model — `ModelWireProbeAiTest`.** The dialect facts above were not guessed, but measured. `qa/ai-test/.../ModelWireProbeAiTest` (opt-in via `VANCE_MODEL_PROBE=1`) boots a Brain, resolves the default model configured via settings, and fires **one** single-sentence call per request parameter — without Engine, without Session, without tool manifest. Each parameter is a separate test method, so the Surefire report is the compatibility matrix; the provider error message in the assert is the phrasing that belongs in the model YAML.

```bash
VANCE_MODEL_PROBE=1 \
VANCE_INIT_SETTINGS_FILE=$PWD/confidential/init-settings-<model>.yaml \
    ./wb qa ModelWireProbeAiTest
```

The probe covers the parameter level; the tool level (e.g., the `reasoning_effort`-with-tools conflict) only shows up in a real Engine turn — for this, a small E2E like `EddieLearnAiTest` with the same init-settings file is sufficient.

### 4.2 Provider Implementation Convention — `AbstractChatProvider`

Each concrete provider (`AnthropicProvider`, `GeminiProvider`, `OpenAiProvider`, `OllamaProvider`, `OllamaCloudProvider`, `LmStudioProvider`) inherits from `AbstractChatProvider`. The base class handles the recurring orchestration:

```
final AiChat createChat(config, options):
  1. validate getType().wireName() == config.provider()
  2. modelInfo = modelCatalog.lookupOrDefault(...)
  3. effective = applyOptionGates(options, modelInfo)  ← optional override
  4. parser   = messageParserRegistry.get(modelInfo.messageParser()).orElse(null)
  5. built    = buildModels(config, effective, modelInfo) ← abstract
  6. return new StandardAiChat(... modelInfo.stripThinkTags(), responseSanitizer, parser)
  7. catch RuntimeException → AiChatException wrap
```

Subclasses only implement `buildModels(...)` (langchain4j `ChatModel`/`StreamingChatModel` construction) and optionally override `applyOptionGates(...)` for provider-specific option transformations (e.g., Anthropic's Capability/Cache-Kill). Provider-specific `@Value` configs (BaseURL, cacheEnabled) remain in the concrete class.

**What this pattern buys:** new cross-cutting layers (e.g., a future rate-limiter decorator, a new trace layer) land in **one** place (`AbstractChatProvider.createChat` or `StandardAiChat`) instead of sixfold in each provider. Concrete examples:

- `stripThinkTags` field + `SanitizingChatModel` layer was retrofitted without any of the six providers getting their own logic for it.
- `messageParser` field + `MessageParserRegistry` lookup + Gemma-4-/DeepSeek-V4-Parser (see §4.1.1) were later also added exclusively in the template method — provider constructors only received the registry as an additional parameter.

---

## 5. Token Tracking

Every LLM call is tracked — with reference to all Scope levels:

```yaml
usage_record:
  id: usage_001
  account_id: acc_mike
  project_id: proj_5               # for Project budget tracking
  team_id: team_nlp                # for Team budget tracking
  tenant_id: tenant_acme
  session_id: sess_abc123
  thinkProcessId: tp_12
  node_id: node_7_1
  provider: anthropic
  model: claude-sonnet-4
  purpose: execution
  tokens_input: 2450
  tokens_output: 890
  tokens_total: 3340
  cost_usd: 0.012
  credential_source: project       # where the key came from: account | project | team | tenant | local
  duration_ms: 2340
  timestamp: 2026-04-23T14:30:00
```

### Quota Status per Level

```yaml
quota_status:
  - scope: account/acc_mike
    period: daily
    tokens_used: 142000
    tokens_limit: 500000

  - scope: project/proj_5
    period: monthly
    tokens_used: 890000
    tokens_limit: 5000000

  - scope: team/team_nlp
    period: monthly
    tokens_used: 4200000
    tokens_limit: 20000000
```

### Warning Thresholds (configurable per level)

| Threshold | Action |
|----------|--------|
| 80% | Notification to affected Accounts |
| 95% | Notification + Brain switches to Light model |
| 100% | Tasks blocked, only local LLM (if available) |

---

## 6. Local LLM as Free-Tier

```yaml
tenant:
  llm_providers:
    - provider: local_ollama
      model: llama-3.3-70b
      endpoint: http://localhost:11434
      api_key: null
      priority: 99
      quota: unlimited
      capabilities:
        planning: adequate
        execution: limited
        light: good
```

Free Accounts without their own key only use the local LLM. Projects with grant budgets use Cloud LLMs. The fallback to local works transparently.

---

## 7. Model Routing per Task Type

| Task Type | Typical Model | Why |
|----------|-----------------|-------|
| **Tree Planning** | Strong (Claude Sonnet) | Tree structure requires Reasoning |
| **Extract** | Medium (Gemini Flash) | Simpler |
| **Analyze / Verify** | Strong | Requires critical thinking |
| **Synthesize** | Strong | Creative + analytical |
| **Tag / Classify** | Light (local LLM) | Simple categorization |
| **Brain Linker** | Medium | Many calls, budget-friendly |

Configurable per Account, Project, and Think Process:

```yaml
engine:
  id: tp_12
  llm_overrides:
    extract: gemini-2.5-flash
    synthesize: claude-sonnet-4
```

Preferences cascade for model selection: Think Process override → Project preferences → Account preferences → Tenant default.

---

## 7a. Model Characteristics: Context-Discipline vs. Training-Trust

Models of the same performance class behave **differently disciplined** when tool outputs or user corrections contradict their training snapshot. For Vancetope, this is not academic — the architecture is designed for Workers to fetch fresh data and for the model to *synthesize* an answer from it. If the model ignores fresh data in favor of its training, the entire research pipeline is ineffective.

### Two Dimensions

| Dimension | Description | Failure Mode |
|---|---|---|
| **Context-Discipline** | How strongly does the model respect the content of its context window (tool outputs, previous Assistant replies with source attribution, user corrections) against its training? | Model rejects fresh facts as "not official" / "does not exist", even though its own web research confirmed them in a previous message |
| **Tool-Loop-Persistence** | Can the model sustain a multi-stage tool loop until an answer (Decompose → Call Recipe → Use Result)? | Model runs dozens of LLM calls without a single tool call because it "knows" what the answer is |

### Observed Profiles (as of 2026-06-15)

This table is **empirical**, not exhaustive. It is based on Vancetope-internal research sessions (see `analysis/sess_*/COMPARISON.md` for the underlying traces) and is explicitly allowed to be falsified as soon as vendor releases change behavior. Model character drift is real — Anthropic / OpenAI / Google regularly patch tool-use behavior.

| Model | Context-Discipline | Tool-Loop-Persistence | Vancetope Recommendation |
|---|---|---|---|
| `gemini:gemini-2.5-pro` | **Weak** — known training override bias for factual questions | Medium | Codegen / Boilerplate / Language translation. **Not** to be set as default `analyze`/`web` alias for research workflows. |
| `gemini:gemini-2.5-flash` | Weak (same bias mechanism as Pro) | Strong | Cheap tier for classification, tag recognition, Inbox triage — where training knowledge already provides the answer |
| `openai:gemma-4-26b-a4b-it` (via cortecs) | **Strong** — explicitly documents its own conflicts between research and training, decides in favor of research | Strong | Research default, `analyze` / `web` / `code` alias suitable |
| `openai:deepseek-v4-pro` | Strong (in observed sessions) | Strong | Frontier research, Deep-Think (Marvin) |
| `anthropic:claude-sonnet-4-6` | Strong | Strong | Frontier research, Deep-Think — preferred if budget available |
| `anthropic:claude-opus-4-7` / `4-8` | Strong | Very Strong | Premium research, agentic tool loops |
| Local Ollama models (qwen3:30b, gemma4:31b-mlx, …) | Variable per model — test | Variable | Free tier; verify suitability per model before setting them to a research alias |

### Consequence for Recipe Defaults

Vancetope Recipes have a sensible default model alias (`default:analyze`, `default:web`, `default:deep`). Tenant Operators configure the *binding* of these aliases. The recommendation to Operators:

- `default:fast` may be a model with weak Context-Discipline (classification / triage benefits from training trust)
- `default:analyze`, `default:web`, `default:deep` **should** be bound to models with strong Context-Discipline, otherwise Ford Workers and Marvin Trees are self-serving theater

In Vancetope v1, this is **not** enforced by an automatic selector — Tenants have their own provider contracts. The character information in this table is decision support for `init-settings-*.yaml` and Web UI setting forms, not code.

### Symptoms in the Trace (Diagnostic Heuristics)

If a Tenant complains about poor research results, check in this order:

1. **Tool-Loop-Persistence** — how many LLM calls per tool call? If ratio > 20:1 in a Marvin/Ford session: model is self-occupied. Change.
2. **Context-Discipline** — search the Final-Reply for phrases like "does not exist", "not publicly available", "no official model", even though earlier Assistant replies or Tool Results prove the opposite. If such a passage is found: model is overriding Context with Training. Change.
3. **Source Attribution** — Final-Reply without `[source: url]` anchor in research tasks means: model did not take its own tool outputs seriously as evidence. Marginal case — can predict symptom 2.

### What this table does NOT do

- **No** general "Model A is better than Model B" ranking. Gemini 2.5 Pro is excellent for many tasks (code generation, language, multi-modal); just not for research workflows that need to reconcile fresh facts against training.
- **No** promise that profiles remain stable. Vendor updates can reverse behavior within weeks.
- **No** default action — Operations decides per Tenant what binds.

---

## 8. Multi-Provider Failover

```
Provider A (Priority 1) → Error → Retry → Error
  → Provider B (Priority 2) → Success
  → Log: "Failover from anthropic to google"
```

```yaml
llm_config:
  failover:
    max_retries: 2
    retry_delay_ms: 2000
    fallback_enabled: true
    fallback_to_local: true
```

### 8.1 Empty Completions — Retryable vs. Deterministic

`ResilientStreamingChatModel` retries not only exceptions, but also **successful but empty** completions (no text, no tool call) — these come via `onCompleteResponse` and would never reach the exception path. Two causes, two treatments:

| Case | Symptom | Treatment |
|---|---|---|
| Provider glitch / Model collapse | empty, `finish` ≠ `LENGTH` (e.g., Gemini with `STOP`) | retry, max. 3 attempts with backoff, then chain advance |
| Output cap exhausted | empty, `finish = LENGTH` | **no** retry — chain advance directly, otherwise deliver empty response |

The `LENGTH` case is deterministic: the model has exhausted its `max_tokens` budget (for reasoning models, typically completely in `reasoning_content`), an identical re-request hits the same wall. Retries only cost tokens and wall-clock there. Chain advance remains allowed — a fallback entry can carry a larger cap and save the turn.

In both cases, the empty response is delivered **unchanged** to the caller (including `finishReason`), not converted into an error. The Engine decides what happens next.

**Engine side: `StreamedReply`.** Engines no longer reduce a completion directly to its `AiMessage` — that discarded the `finishReason`, precisely the information needed to distinguish the two cases. Instead, `StreamedReply` (`vance-brain/.../ai/`) encapsulates `message` + `finishReason` + `maxOutputTokens` (the latter read from the request, not from the model config — the user should see the value that was actually on the wire) and offers `isEmpty()`, `atOutputCap()`, and `emptyReplyMessage(collapseMessage, stateNote)`. The truncation text is formulated **once** there (diagnosis + buttons are the same everywhere); the non-truncation formulation remains per Engine because how it's parked and whether a rephrase helps at all differs.

Consumers:

- **Frankie** — persists the Assistant message and parks `BLOCKED`.
- **Trillian-Control** — has *in addition* to the resilience layer its own one-time retry; this is skipped for `LENGTH` and the message says "Output limit" instead of "Rephrase the question". Exit remains `IDLE`.
- **Trillian-User** — headless, a silent turn is normal and there is no user to notify. Instead of a message, there is a WARN line for `LENGTH` so that the config cause does not disappear as a "quiet turn" in the log.

---

## 9. LLM Usage Dashboard

**Built (v2):** two levels, one write path.

**Usage is recorded at the seam, not at the call site.** A `UsageAccountingChatModel` sits as a decorator in the model chain, attached in `AbstractChatProvider.createChat` — the only place through which every chat is built. It is **within** `ResilientChatModel` and **below** the trace log, thus seeing every attempt: retries, chain fallbacks, aborted streams, and failed attempts, all of which were previously invisible. Previously, callers booked themselves, and those who didn't book didn't exist — Jeltz (and thus Magrathea's `agent_task`), Agrajag, Eddie's LLM triage, and Cortex Deep-Validate ran completely unbilled.

**Who pays is a mandatory parameter.** `createChat(config, options, attribution)` takes a `CallAttribution` (`vance-shared`, an object instead of six loose fields, unpacked all the way to the ledger write). A caller who does not provide it will cause a compile error. **Not to be confused with `AiChatOptions.tenantId/projectId`** — these indicate against which level the model catalog resolves (a tenant-pinned Process deliberately leaves `projectId` empty there), while billing must still name the Project that consumed the tokens. Two questions, two fields.

Instead of `engineName`, the dimension is called **`caller`**: Think Engines by their name, everything else names itself — `_light` (single-shot helpers: Discovery, Follow-Up, Title-Gen), `_triage`, `_compaction`, `_fenchurch` (images), `_rag` (embeddings), `_deep-validate`. "Engine" hasn't been accurate for a while. Not `source`: that word in this tree means the opposite direction (Zarniwoop/Centauri/Jaglan — external data coming in).

**Two levels, two lifespans:**

- **`llm_usage_daily`** is the billing: a bucket per `(tenant, UTC-day, project, caller, recipe, model, currency, kind)`, incremented live via atomic `$inc`-upsert (deterministic `bucketId` = the key itself, hashed; duplicate-key race → one retry). No night job, no lease, no watermark — and "today" is complete, instead of needing permanent special treatment in the report. Default retention: forever.
  **Amounts are integer micro-units** (`cost*Micros`, 1e-6 of the currency), not `double`. These fields are added via `$inc` once per attempt and never recalculated — and when the detail lines are gone after 60 days, they are the only remaining proof. IEEE-754 accumulation is lossy *and* order-dependent; irrelevant for a diagnostic counter, but not for the number on the invoice. `LlmUsageService.toMicros/fromMicros` are the only converters, conversion happens only on read. Detail lines retain `double` — nothing sums there. Migration: `2026-08-24_001`.
- **`llm_usage_records`** is the diagnosis: one line per attempt with Session/Process/Attempt/Rate snapshot. Short-lived (60 days success, 14 days failed attempts) and switchable via setting — which is only possible now that the daily balance is the billing.

Retention via the cascade (`usage.retentionDays`, `usage.detailRetentionDays`, `usage.detailRetentionDaysFailed`) plus TTL index, as with the Megadodo feed. Detail is tri-state (`>0` days / `0` forever / `<0` do not write at all), the daily balance is bi-state — billing cannot be turned off by a number.

**Coverage is reported, not smoothed.** A model without a `pricing:` block is *unknown*, not *free*; the line carries actual tokens and 0 cost, and the bucket counts `unpricedCalls` so the report can say "the amount covers 94% of calls". To ensure "no block" unambiguously means "price missing", locally running models (ollama/lmstudio) declare an **explicit zero rate**. Failed attempts are counted separately and never included in the amount.

One level below is `unmeasuredCalls`: a successful call for which the provider **did not report any** token numbers (some Ollama/LM Studio endpoints). Such calls were initially *discarded* — "a zero line adds no information". The discarded information was that the call **did happen**: the endpoint completely disappeared from the report, and a missing line reads as "nothing ran there". Now it is booked and marked. The difference from `unpricedCalls` is the question that is open: there, the *rate* is missing, here, the *tokens* are missing.

Read side: `GET /brain/{tenant}/usage/{summary,by-project,by-model,by-caller,by-recipe}` (Tenant-`ADMIN`, `by-engine` remains as an alias), rendered in the Insights tab "Usage & Cost". All five are projections of the same bucket key, summed over buckets instead of millions of individual lines — therefore, a multi-year window can also be answered. `detailHorizon` in the DTO indicates when drill-down is still available; it is read from the oldest existing detail line, not calculated from the setting (which would lie after every change).

`LlmCallTracker` maintains the live HUD and Prometheus counters — these need the Process and are not billing.

The following mockup is the **target sketch** (quotas/warnings are not yet built):

```
Token Usage — Today (Account: Mike)
  ├── Total: 142k / 500k (28%)
  ├── By Project:
  │     Transformer Review: 89k / 5M monthly (1.8%)
  │     Vancetope Architecture: 53k / no project limit
  ├── By Provider:
  │     Anthropic (project key): 89k
  │     Google (personal key): 53k
  └── Estimated daily cost: $0.48

Token Usage — This Month (Project: Transformer Review)
  ├── Total: 890k / 5M (17.8%)
  ├── By Account:
  │     Mike: 540k
  │     Sarah: 350k
  └── Estimated monthly cost: $3.20
```

---

## 10. Summary

```
LLM Credentials + Quotas at every level:
  Account → Project → Team → Tenant → Local

Per Call:
  1. Determine model (Purpose → Preferences cascade)
  2. Find Provider + Key (Credential cascade)
  3. Check quota (ALL levels, all must be OK)
  4. Instantiate a fresh ChatClient
  5. Execute call
  6. Track usage at all levels
```

> **Every LLM call is a fresh client.**
> Credentials and budgets can be at Account, Project, Team, or Tenant level.
> All applicable quotas are checked and charged simultaneously.

---

## 11. Implementation Phases

| Phase | What |
|-------|-----|
| **v1** | One Provider, one Key (Environment), global tracking |
| **v1.5** | Account-Level Keys, Provider Resolution, Quota per Account |
| **v2** | Project-Level Keys + Quotas, Multi-Provider, Failover |
| **v2** | Local LLM as Free-Tier, Model Routing per Task Type |
| **v3** | Team/Tenant-Level Sharing, Usage Dashboard, Warnings |

---

*See also: [identity-credentials](identity-credentials.md) | [architektur-scopes-clients](architektur-scopes-clients.md) | [execution-modes-trigger](execution-modes-trigger.md)*
