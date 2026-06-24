# Vance — LLM Resource Management

> Defines how LLM access is managed: providers, keys, quotas, routing.
> Core principle: Every LLM call runs under an account. Credentials and quotas can be defined at any Scope level.
> See also: [identity-credentials](identity-credentials.md) | [architektur-scopes-clients](architektur-scopes-clients.md) | [mcp-tool-routing](mcp-tool-routing.md)

---

## 1. The Problem

The Brain makes LLM calls. But:
- Different Accounts have different provider access
- Different Projects can have their own budgets (e.g., research grant)
- Some Accounts don't have their own key (use Project, Team, or Tenant key)
- The Brain must instantiate the correct provider with the correct key for each call
- Token consumption must be trackable per Account AND per Project

---

## 2. LLM Configuration at Each Scope Level

LLM providers, keys, and quotas can be defined at **any level**:

| Level | Example | Use Case |
|-------|---------|----------|
| **Account** | Mike's personal Claude key | Personal use |
| **Project** | Research project has 5M tokens/month from grant | Budget per project |
| **Team** | NLP team has shared Anthropic key | Shared access |
| **Tenant** | Company-wide Google AI Key | Default for all |
| **Local** | Ollama on the server | Free fallback |

### LLM Config at Account

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

### LLM Config at Project

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

### LLM Config at Team

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

### LLM Config at Tenant

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
   e. Can Local LLM handle this model (or equivalent)? → use local
   f. Nothing? → Task failed

4. Check quota (ALL applicable levels):
   → Account quota OK?    (Mike's personal budget)
   → Project quota OK?    (Grant budget of this project)
   → Team quota OK?       (Team budget)
   → Tenant quota OK?     (Company budget)
   → ALL must be OK. One exceeded = blocked.

5. Execute call, track usage at all levels
```

### Model Alias Resolution

Before the provider cascade takes effect, it must be clear *which* concrete model is meant. Recipes (see `recipes.md`) and Engine defaults typically reference **aliases** instead of direct provider model strings — so that the same configuration works on any Tenant, regardless of which provider keys it has.

Implemented in `AiModelResolver` (vance-brain). Format: `<prefix>:<rest>`.

```
input := <prefix>:<rest>

  prefix ∈ AiModelService.listProviders() (gemini, anthropic, …)
    → Use DIRECTLY: (prefix, rest) as (provider, model)

  Setting `ai.alias.<prefix>.<rest>` is set
    → Resolve RECURSIVELY with the resolved value
       (Cycle Detection + Depth Limit 8)

  prefix == "default" and no alias configured
    → Fallback: (ai.default.provider, ai.default.model)

  else
    → UnknownModelException
```

The `default:` namespace has the safety net fallback: as long as a Tenant has `ai.default.provider` + `ai.default.model` configured, bundled Recipes like `default:fast`, `default:analyze` work without further setup steps.

**Example Settings for a Tenant with Multi-Provider Setup:**

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

**When the mechanism runs relative to the §3 cascade:** the alias resolver runs *before* provider resolution. First, the logical model label (e.g., `default:analyze`) is resolved to a concrete `(provider, model)`, then §3 searches for the appropriate key in the Account/Project/Team/Tenant cascade. Aliases and Quota cascade are orthogonal concepts: alias decides *which model*, cascade decides *whose key*.

**Model Size as Tier Hint:** `ai-models.yaml` additionally declares `size: SMALL|LARGE` per model. This is used for Recipe prompt variant selection (see `recipes.md` §5.1). Aliases do not change the classification — the tier information always comes from the *resolved* model.

#### Comma Cascade Across Multiple Specs

The input of a model spec can be a **list**, separated by commas. The first element that is *configured* wins. Example in Recipe:

```yaml
params:
  model: default:arthur,default:chat
```

Reads as: "take the engine-specific `default:arthur`, if the Tenant has defined it — otherwise fall back to the generic `default:chat`". This allows a Recipe to signal a preferred model tier for an Engine without every Tenant having to explicitly set the alias.

**Backward-Compat:** Single-element (no comma) behaves identically to today — `default:chat` is syntactically a 1-element cascade.

**Resolution per Element** (same rule set as above, but with different miss semantics):

- Element is direct `<provider>:<model>` → wins immediately.
- Element is named provider instance (`ai.provider.<prefix>.type` is set) → wins immediately.
- Element is alias and `ai.alias.<prefix>.<rest>` is configured → recursively resolve with the resolved value (which itself can be a cascade).
- Element is **not** configured → *not* the `default:` safety net fallback as usual, but jump to the next cascade element.

**Last-resort Fallback only at the end:** The **last** element of the cascade still falls back to the `default:` safety net rule (`ai.default.provider` / `ai.default.model`). Thus, `default:arthur,default:chat` in the worst case (neither Arthur nor Chat alias configured) lands on the Tenant default — does not throw an error.

**Cascade also in Alias Values:** The comma cascade applies everywhere a spec string is resolved — including in the *target* of an alias. `ai.alias.default.chat = anthropic:claude-haiku-4-5,openai:gpt-4o-mini` is valid and acts as a two-stage cascade from the alias target. Cycle detection works per cascade element with its own `seen` set; the depth limit (`MAX_DEPTH=8`) remains unchanged.

**When the cascade continues:** Today **exclusively on missing definition** (no direct provider match, no instance type, no alias setting). **Runtime errors** (provider down, quota exhausted, model deactivated) do *not* abort the cascade and fail hard as before. Disable logic will later move into the **same** resolver method, so all cascade consumers automatically benefit — without API changes.

**Distinction from `params.fallbackModels`:** `fallbackModels` (`ChatBehaviorBuilder`) is a **runtime fallback chain** at the provider level — the primary model is actually called, and only on quota/provider failure does the chain switch. The comma cascade is a **setup-time cascade** at the alias definition level — it selects the first *configured* model *before* the first API call. Both mechanisms are orthogonal and combinable: an entry in `fallbackModels` can itself be a comma cascade.

**Example Settings + Recipe:**

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

Tenant `acme` has `default:arthur` configured → arthur Recipe uses `claude-opus-4`. Another Tenant without `default:arthur` setting automatically falls back to `default:chat` → `gemini-2.5-flash`. No one needs to create empty alias entries just for the Engine defaulting mechanism.

**Whitespace and Empty Elements:** Whitespace around comma separators is trimmed (`a , b` ≡ `a,b`). Empty elements (`a,,b`) are skipped.

**Override Cascade for `ai-models.yaml`:** Model metadata (Context-Window, Default-Max-Output, `size`, `capabilities`, `stripThinkTags`) are not hard-bound to the bundled file. `ModelCatalog` reads with the same three-layer cascade as Recipes/Prompts: **Project → `_tenant` (tenant-system-project) → classpath `vance-defaults/ai-models.yaml`**, each with the document path `ai-models.yaml`. Merge is *deep, per `<instance>:<modelName>`*: an override only provides the fields it changes; everything else inherits from the outer layer. Lists (especially `capabilities`) are replaced as a whole — so owners can both add and remove capabilities. Engines automatically pass `tenantId`/`projectId` from the Process via `AiChatOptions` to the per-call providers, so their capability lookups (Vision/PDF-Packaging) also see the scope-specific view.

**Reasoning Markup per Model — `stripThinkTags`:** Reasoning models (Qwen3 family, DeepSeek-R1, GPT-OSS-Harmony format) emit their chain of thought as structured markup in the response: `<think>…</think>` (Qwen/DeepSeek) or `<|channel|>analysis<|message|>…<|channel|>final<|message|>…` (GPT-OSS Harmony). These blocks belong in the `LlmTraceDocument` for audit, **but not** in `chat_messages`, not in the history replay for the next turn, and not in inline-render Fence-Bodies. The configuration is in the Catalog entry:

```yaml
"qwen3:30b":
  contextWindowTokens: 131072
  defaultMaxOutputTokens: 4096
  size: LARGE
  stripThinkTags: true        # ← strips <think>…</think> from user-facing content
```

Default is `false` — Non-Reasoning models (Anthropic Claude, Gemini Flash/Pro, OpenAI GPT-4) remain unchanged in the pipeline. Setting this flag enables the **`SanitizingChatModel` decorator layer** in the per-call stack (see §4: "A new LLM object per call").

---

### Named Provider Instances

The left part of a model spec (`<prefix>:<model>`) is semantically a **Provider Instance**, not necessarily the protocol type. Default: instance name == `ProviderType.wireName()` (`openai`, `anthropic`, …) — thus all existing specs and settings remain valid.

Tenants can define additional **named instances** to, for example, use multiple OpenAI-compatible endpoints (real OpenAI, DeepSeek-Direct, OpenRouter, local vLLM) in parallel — each with its own `apiKey` and `baseUrl`, but the same wire protocol:

```yaml
acme:
  # Standard instance "openai" → real OpenAI
  ai.provider.openai.apiKey:           { type: PASSWORD, value: sk-... }

  # Additional instance "deepseek-direct" → OpenAI-Wire, but DeepSeek-Endpoint
  ai.provider.deepseek-direct.type:    { type: STRING,   value: openai }
  ai.provider.deepseek-direct.baseUrl: { type: STRING,   value: https://api.deepseek.com/v1 }
  ai.provider.deepseek-direct.apiKey:  { type: PASSWORD, value: sk-... }

  # Alias references the instance directly
  ai.alias.default.analyze:            { type: STRING,   value: deepseek-direct:deepseek-v4-flash }
```

**Resolution Order** in `AiModelResolver` (extended):

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

**What the Instance Selects:**
- **`AiChatConfig.providerInstance`** decides under which path `ai.provider.<instance>.{apiKey,baseUrl}` is read.
- **`ModelCatalog`** indexes its YAML sections by instance name. A named instance carries its own metadata section:
  ```yaml
  deepseek-direct:
    deepseek-v4-flash:
      contextWindowTokens: 1048576
      size: SMALL
  ```
- **`AiChatConfig.providerType`** still provides the protocol for adapter dispatch in `AiModelService` (which `AiModelProvider` bean builds the chat).

**What the Instance Does Not Change:** the wire model name sent to the API (`rest` part). If you want to use the same model designation with different metadata configs, create two instances with the same `type` that differ in the `ai-models.yaml` section.

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

If the project budget is exhausted but Mike's personal budget is not:
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
        
        // Model based on purpose — Preferences cascade
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

Each per-call `AiChat` (built via `StandardAiChat`) stacks two optional decorator layers around the langchain4j `ChatModel` of the provider:

```
engine / Light-LLM / StandardAiChat.ask
  ↑ cleaned ChatResponse  ←  engines never know which markup was stripped
SanitizingChatModel       ←  optional, only when modelInfo.stripThinkTags = true
  ↑ raw ChatResponse
LoggingChatModel          ←  AiTraceLogger debug-log + LlmTraceRecorder persistence
                          ←  Trace sees RAW (forensic audit, training-data analysis)
  ↑ raw ChatResponse
provider ChatModel        ←  AnthropicDirectChatModel / GoogleAiGeminiChatModel /
                          ←  OpenAiChatModel / OllamaChatModel / …
```

**Contract of the Layers:**

- **`LoggingChatModel`** is always active. Writes every request/response to `de.mhus.vance.brain.ai.trace` logger plus optionally via `LlmTraceWriter` into the `LlmTraceDocument` collection. ALWAYS sees the raw model response including any existing reasoning markup.
- **`SanitizingChatModel`** is only in the chain if `ModelInfo.stripThinkTags()` returns `true` for the active model. Clones the `ChatResponse` with a sanitized `AiMessage` (Tool-Execution-Requests remain untouched), so that all consumers above (Engines, chat_messages persistence, History-Replay, Judges) only see the final user text. Default behavior: no wrap, no overhead.

**Why not in the Engine:** Engines (Arthur, Eddie, Ford, Marvin, …) consume `response.aiMessage().text()` and should NOT have to know per provider/model which markup to expect. The Sanitizer is *cross-cutting* and belongs on the provider side — analogous to the trace logger.

### 4.2 Provider Implementation Convention — `AbstractChatProvider`

Each concrete provider (`AnthropicProvider`, `GeminiProvider`, `OpenAiProvider`, `OllamaProvider`, `OllamaCloudProvider`, `LmStudioProvider`) inherits from `AbstractChatProvider`. The base class handles the recurring orchestration:

```
final AiChat createChat(config, options):
  1. validate getType().wireName() == config.provider()
  2. modelInfo = modelCatalog.lookupOrDefault(...)
  3. effective = applyOptionGates(options, modelInfo)  ← optional override
  4. built = buildModels(config, effective, modelInfo) ← abstract
  5. return new StandardAiChat(... modelInfo.stripThinkTags(), responseSanitizer)
  6. catch RuntimeException → AiChatException wrap
```

Subclasses only implement `buildModels(...)` (langchain4j `ChatModel`/`StreamingChatModel` construction) and optionally override `applyOptionGates(...)` for provider-specific option transformations (e.g., Anthropic's Capability/Cache-Kill). Provider-specific `@Value` configs (BaseURL, cacheEnabled) remain in the concrete class.

**What this pattern achieves:** new cross-cutting layers (e.g., a future Rate-Limiter-Decorator, a new Trace-Layer) land in **one** place (`AbstractChatProvider.createChat` or `StandardAiChat`) instead of six times in each provider. Concrete example: the `stripThinkTags` field + `SanitizingChatModel` layer was added without any of the six providers getting their own logic for it.

---

## 5. Token Tracking

Every LLM call is tracked — with reference to all Scope levels:

```yaml
usage_record:
  id: usage_001
  account_id: acc_mike
  project_id: proj_5               # for project budget tracking
  team_id: team_nlp                # for team budget tracking
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

### Warning Thresholds (Configurable per Level)

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

Preferences cascade for model selection: Think Process Override → Project Preferences → Account Preferences → Tenant Default.

---

## 7a. Model Characteristics: Context-Discipline vs. Training-Trust

Models of the same performance class behave **differently disciplined** when tool outputs or user corrections contradict their training snapshot. For Vance, this is not academic — the architecture is designed for Workers to retrieve fresh data and for the model to *synthesize* an answer from it. If the model ignores fresh data in favor of its training, the entire research pipeline is ineffective.

### Two Dimensions

| Dimension | Description | Failure Mode |
|---|---|---|
| **Context-Discipline** | How strongly does the model respect the content of its context window (tool outputs, previous Assistant replies with source attribution, user corrections) against its training? | Model rejects fresh facts as "not official" / "does not exist", even though its own web research confirmed them one message earlier |
| **Tool-Loop-Persistence** | Can the model sustain a multi-step tool loop until the answer (Decompose → Call Recipe → Use Result)? | Model runs dozens of LLM calls without a single tool call because it "knows" what the answer is |

### Observed Profiles (as of 2026-06-15)

This table is **empirical**, not exhaustive. It is based on Vance-internal research sessions (see `analysis/sess_*/COMPARISON.md` for the underlying traces) and is explicitly allowed to be falsified as soon as vendor releases change behavior. Model character drift is real — Anthropic / OpenAI / Google regularly patch tool-use behavior.

| Model | Context-Discipline | Tool-Loop-Persistence | Vance Recommendation |
|---|---|---|---|
| `gemini:gemini-2.5-pro` | **Weak** — known training-override bias in factual questions | Medium | Codegen / Boilerplate / Language translation. **Not** for research workflows as default `analyze`/`web` alias. |
| `gemini:gemini-2.5-flash` | Weak (same bias mechanism as Pro) | Strong | Cheap-tier for classification, tag recognition, Inbox triage — where training knowledge already provides the answer |
| `openai:gemma-4-26b-a4b-it` (via cortecs) | **Strong** — explicitly documents its own conflicts between research and training, decides in favor of research | Strong | Research default, `analyze` / `web` / `code` alias suitable |
| `openai:deepseek-v4-pro` | Strong (in observed sessions) | Strong | Frontier research, Deep-Think (Marvin) |
| `anthropic:claude-sonnet-4-6` | Strong | Strong | Frontier research, Deep-Think — preferred if budget available |
| `anthropic:claude-opus-4-7` / `4-8` | Strong | Very Strong | Premium research, agentic tool loops |
| Local Ollama models (qwen3:30b, gemma4:31b-mlx, …) | Variable per model — test | Variable | Free-Tier; verify suitability per model before setting them to a research alias |

### Consequence for Recipe Defaults

Vance Recipes have a sensible default model alias (`default:analyze`, `default:web`, `default:deep`). Tenant operators configure the *binding* of these aliases. The recommendation to operators:

- `default:fast` can be a model with weak Context-Discipline (classification / triage benefits from training trust)
- `default:analyze`, `default:web`, `default:deep` **should** be bound to models with strong Context-Discipline, otherwise Ford Workers and Marvin Trees are self-serving theater

In Vance v1, this is **not** enforced by an automatic selector — Tenants have their own provider contracts. The character information in this table is decision support for `init-settings-*.yaml` and Web UI setting forms, not code.

### Symptoms in the Trace (Diagnostic Heuristic)

If a Tenant complains about poor research results, check in this order:

1. **Tool-Loop-Persistence** — how many LLM calls per tool call? If ratio > 20:1 in a Marvin/Ford session: model is self-serving. Switch.
2. **Context-Discipline** — Search the Final-Reply for phrases like "does not exist", "not publicly available", "no official model", even though previous Assistant replies or Tool Results prove the opposite. If such a passage is found: model overrides Context with Training. Switch.
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

---

## 9. LLM Usage Dashboard

```
Token Usage — Today (Account: Mike)
  ├── Total: 142k / 500k (28%)
  ├── By Project:
  │     Transformer Review: 89k / 5M monthly (1.8%)
  │     Vance Architecture: 53k / no project limit
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
  2. Find provider + key (Credential cascade)
  3. Check quota (ALL levels, all must be OK)
  4. Instantiate a fresh ChatClient
  5. Execute call
  6. Track usage at all levels
```

> **Every LLM call is a fresh client.**
> Credentials and budgets can reside at Account, Project, Team, or Tenant level.
> All applicable quotas are checked and charged simultaneously.

---

## 11. Implementation Phases

| Phase | What |
|-------|-----|
| **v1** | One provider, one key (Environment), global tracking |
| **v1.5** | Account-level Keys, Provider Resolution, Quota per Account |
| **v2** | Project-level Keys + Quotas, Multi-Provider, Failover |
| **v2** | Local LLM as Free-Tier, Model Routing per Task Type |
| **v3** | Team/Tenant-Level Sharing, Usage Dashboard, Warnings |

---

*See also: [identity-credentials](identity-credentials.md) | [architektur-scopes-clients](architektur-scopes-clients.md) | [execution-modes-trigger](execution-modes-trigger.md)*
