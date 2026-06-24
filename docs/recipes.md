---
title: "Vance — Recipes"
parent: Documentation
permalink: /docs/recipes
---

<!-- AUTO-GENERATED from specification/public/en/recipes.md — do not edit here. -->

---
# Vance — Recipes

> A **Recipe** is a named, reusable blueprint for a worker process: Engine + Default-Params + Prompt-Prefix + Tool-Adjustments. When spawned (e.g., by Arthur via `process_create`), the Recipe is resolved into a concrete `ThinkProcessDocument`. The separation of Engine ↔ Recipe is the clean two-layer architecture that allows Vance to scale without engine proliferation.
>
> **Persistence:** Recipes are stored as YAML documents under `recipes/<name>.yaml` in the Document Layer. The cascade lookup `project → _tenant → classpath:vance-defaults/recipes/` runs via [`DocumentService.lookupCascade`](../repos/vance/server/vance-shared/src/main/java/de/mhus/vance/shared/document/DocumentService.java) — the same mechanism as Documents/Prompts. There is no longer a separate Mongo collection for Recipes.
>
> See also: [think-engines](/docs/think-engines) | [arthur-engine](/docs/arthur-engine) | [settings-system](/docs/settings-system) | [server-tools](/docs/server-tools) | [inline-and-embedded-content](/docs/inline-and-embedded-content) (Rich-Content-Output via `document_link`-Tool + `vance:`-URIs, which by default belong in every Engine `promptPrefix`)

---

## 1. Terms and Delimitation

| Term | What it is | Cardinality | Location |
|---|---|---|---|
| **Engine** | Algorithm with lifecycle (start/resume/steer/stop), tool loop, streaming. Stateless with respect to instances. Java code. | few (3-5) | `vance-brain/.../<name>/` |
| **Recipe** | Recipe: which Engine, which defaults, which prompt prefix, which tools on/off. Configuration. | many (10-100) | YAML document under `recipes/<name>.yaml` (Cascade) |
| **Process** | Running instance, born from exactly one Recipe (or without — direct `engine`-spawn is still allowed). Persisted as `ThinkProcessDocument`. | n per Session | Mongo |

**Engines** are rare and structural. A new Engine type is a major feature: different lifecycle (reactive vs. batch), different Inbox processing, possibly different persistence. Today we have `arthur` and `ford`; `deep-think` is planned.

**Recipes** are numerous and feature-driven. A new Recipe is a configuration change: "spawn `analyze` with ford, validation on, Sonnet model, prompt prefix for analysis worker". No code change.

---

## 2. Recipe Schema (YAML)

A Recipe is a YAML file with the following top-level fields. The `name` comes from the filename (`recipes/<name>.yaml`), not from a field:

| Field | Type | Required | Meaning |
|---|---|---|---|
| `description` | `String` | yes | A single line describing what the Recipe does — rendered in `recipe_list` and in the Arthur prompt |
| `engine` | `String` | yes | Engine name (`ford`, `arthur`, `marvin`, …) |
| `params` | `Map<String, Object>` | no | Default `engineParams`. Merged with caller parameters (see §4). Common keys: `model`, `validation`, `maxIterations`, `modelSize`, `rag.autoInject`, `rag.minScore`, `rag.topK` (see [rag.md §5](/docs/rag) — RAG AutoInject is currently active in Arthur). LLM sampling controls see §5c |
| `promptPrefix` | `String` (Pebble Template) | no | System prompt content for the Engine — single source of truth for Engine Persona. Is sent **as a Pebble template** through the renderer, with access to `tier`, `model`, `provider`, `mode`, `profile`, `recipe`, `engine`, `params` (see §5 for render context and §5b for syntax subset) |
| `promptMode` | `APPEND \| OVERWRITE` | default `APPEND` | How `promptPrefix` is combined with the Engine's default fallback (see §5) |
| `dataRelayCorrection` | `String` | no | Override for the "data-relay-gap" Validator correction (see §5a) |
| `allowedToolsAdd` | `List<String>` | no | Tools to be added to the Engine's default. Entries with `@`-prefix are resolved as label selectors via [server-tools](/docs/server-tools) |
| `allowedToolsRemove` | `List<String>` | no | Tools to be removed from the Engine's default (same `@`-selector syntax) |
| `defaultActiveSkills` | `List<String>` | no | Skills that are sticky-active from spawn (`fromRecipe=true`). See §6c |
| `allowedSkills` | `List<String>` | no | Whitelist: only these Skills may ever become active (Trigger / Default / `/skill`). Missing ⇒ no restriction. Empty list ⇒ lockdown. See §6c |
| `locked` | `boolean` | default `false` | If `true`: caller overrides are ignored (Recipe is binding) |
| `listed` | `boolean` | default `false` | Opt-in for the user-facing Recipe picker (Web-UI Session Start Modal). Server additionally filters `internal: true` strictly. Foot still lists all Recipes — this flag only affects discovery clients (see §6e) |
| `title` | `String` | no | Display name for Recipe picker UIs. Falls back to Recipe `name` if not set |
| `List<String>` | no | Free for discovery (e.g., `[research, code, web]`) |

There is **no Mongo collection** for Recipes. Persistence, versioning, and audit come from the Document Layer (soft-delete, `createdBy`, storage backend for inline-vs-blob, etc.).

---

## 3. Cascade — How a Recipe Name is Resolved

For `process_create(recipe="analyze")`, the resolver runs via `RecipeLoader`, which in turn uses `DocumentService.lookupCascade`:

```
load(tenantId, projectId, name) → Optional<ResolvedRecipe> :=
  documentService.lookupCascade(tenantId, projectId,
                                "recipes/" + name + ".yaml")
    1. Project:  <project>/recipes/<name>.yaml         → source = PROJECT
    2. _tenant:   _vance/recipes/<name>.yaml            → source = VANCE
    3. Resource: classpath:vance-defaults/recipes/<name>.yaml → source = RESOURCE
    4. → empty
```

**First-hit-wins** — innermost wins. Project override beats `_tenant` override beats Resource default. No field merge between levels: whoever overrides rewrites all fields, otherwise it becomes unclear which values are currently active.

**Resource Recipes are the source of truth for standard functionality.** They are located under `vance-brain/src/main/resources/vance-defaults/recipes/<name>.yaml` and survive Mongo data loss. `_tenant` and Project Recipes only exist if they have been actively configured.

**Hot-Reload:**
- Resource Recipes require a Brain restart (classic classpath read).
- `_tenant` and Project Recipes are read fresh with each lookup — this is the identical cascade mechanism as for Documents.

**Listing** (`recipe_list` and the embedded Catalog in the Arthur/Marvin prompt) runs via `DocumentService.listByPrefixCascade(tenantId, projectId, "recipes/")` and merges inner over outer by path.

---

## 4. Caller Parameters and Override Semantics

When spawning, the caller (Arthur via Tool, Foot via Bootstrap, REST client) can provide `params` in addition to `recipe`:

```
process_create(
    recipe = "analyze",
    name   = "pom-analyzer",
    goal   = "Analyze pom.xml structure",
    params = { "model": "claude-haiku-4-5" }    // override
)
```

**Merge Rules** (Recipe unlocked, default):

```
effectiveParams = recipe.params ⊕ caller.params
                  // caller wins per key
```

If `recipe.locked == true`: `caller.params` is ignored and the override is noted with a warning in the log. This is the "binding Recipe" variant for Tenant compliance cases.

**Audit Logging**: each override is logged at INFO level:

```
INFO RecipeResolver: recipe='analyze' override applied
     overridden_keys=[model]
     caller=process:69e8c8d... tenant=acme
```

This allows later tracing of which Workers ran with Recipe defaults and which with overrides.

---

## 5. Prompt Composition

**Recipes are the Single Source of Truth for Engine Prompts.** In source code, Engines only retain a single-line fallback prompt for the edge case where no Recipe override is present (which practically doesn't happen, as `default`/`arthur`/`ford` Recipes are mandatory in `vance-defaults/recipes/`).

### 5.1 Render Context

`promptPrefix` is a **Pebble template**. Tier/Model/Mode/Profile variants live **within** the template body, not in separate fields. The renderer (`PromptTemplateRenderer`) is called at the start of a turn and populates the following variable context:

| Variable | Type | Value |
|---|---|---|
| `tier` | `String` | `"small"` / `"large"` — from `ModelInfo.size` (lowercase) |
| `model` | `String` | Resolved model name, e.g., `"claude-sonnet-4-6"`, `"gemini-2.5-flash"` |
| `provider` | `String` | `"anthropic"`, `"google"`, `"openai"`, … (lowercase) |
| `mode` | `String` | `"NORMAL"`, `"EXPLORING"`, `"PLANNING"`, `"EXECUTING"` (Plan Mode) |
| `profile` | `String` | `"foot"`, `"web"`, `"default"` |
| `recipe` | `String` | Recipe name |
| `engine` | `String` | Engine name |
| `lang` | `String` | Chat language from Memory Cascade (empty until language settings arrive) |
| `params` | `Map<String, Object>` | Merged Recipe parameters, read access via `&#123;{ params.maxIterations }}` |
| `profileAppend` | `String` | Pre-rendered content of the active `profileBlock.promptPrefixAppend`. Recipe template can insert `&#123;{ profileAppend }}` anywhere — e.g., **before** the hard rules instead of at the end. If the variable is **not** referenced AND the append is non-blank, the renderer appends it as a fallback (Backwards-Compat). See `planning/prompt-inlining.md` §3 |

The effective Tier value can be enforced per Recipe call via `params.modelSize` (`SMALL` / `LARGE` / `AUTO`, Default `AUTO`) — e.g., to deliberately run the Small variant on a Large model or to test unclassified models. `AUTO` ⇒ Catalog wins.

### 5.2 Pebble Syntax Subset

Allowed:
- `&#123;{ var }}` — Insert variable
- `&#123;% if cond %}…&#123;% elseif cond %}…&#123;% else %}…&#123;% endif %}` — Conditions (note: `elseif`, **not** `elif`)
- `&#123;% if model is matching("regex") %}` — Regex test (Jinja2-compatible layer; alternatively plain text comparison `==`/`!=`)
- `&#123;% raw %}…&#123;% endraw %}` — Escape, if plain text `&#123;{`/`&#123;%` is desired in the output
- Boolean operators: `and`, `or`, `not`

Deliberately **not** part of the allowed subset (to avoid Recipe writing errors):
- `&#123;% for %}` loops — Recipe prompts should not be iterative
- `&#123;% include %}` / Template inheritance — prevents bundle composition across multiple files
- Custom filters — all filters are Pebble built-ins (`upper`, `lower`, `default`, …)

### 5.3 Composition

At turn start, `SystemPrompts.compose(process, engineDefault, renderer, ctx)` runs:

```
renderedDefault   = renderer.render(engineDefault, ctx)
renderedOverride  = renderer.render(process.promptOverride, ctx)

if renderedOverride is empty:
    finalSystemPrompt = renderedDefault                       // no Recipe override
elif promptMode == APPEND:
    finalSystemPrompt = renderedDefault
                      + "\n\n--- recipe extension ---\n\n"
                      + renderedOverride
elif promptMode == OVERWRITE:
    finalSystemPrompt = renderedOverride
```

Profile `promptPrefixAppend` (Pebble template) is already appended to `recipe.promptPrefix` with `\n\n`-separator in `RecipeResolver.apply` before the render stage — meaning the Profile append participates in the same render run. Profile append is always additive, even in OVERWRITE mode.

**Arthur Special Case**: Arthur additionally appends the Recipe Catalog after the compose step, so the LLM sees the worker recipes to choose from. Marvin does something similar for his Planner.

### 5.4 Compile Validation

`RecipeLoader` calls `PromptTemplateRenderer.compile(promptPrefix)` and `compile(profileBlock.promptPrefixAppend)` during loading. Syntax errors fail as `RecipeParseException` with clear diagnostics (Pebble line number, token). `ValidatingPhase` (Slartibartfast) performs the same compile check for LLM-generated drafts under `RULE_PROMPT_PREFIX_TEMPLATE_VALID`.

### 5.5 Storage on Process

Upon spawn, the following are written to the Process: `recipeName`, `promptOverride` (unrendered Pebble string), `promptMode`, `dataRelayCorrectionOverride`, `allowedToolsOverride`, `engineParams`. Rendering occurs per turn — Tier/Mode/Model can change between turns (model switch, plan mode transition). Recipe edits do not affect running Processes (snapshot semantics).

### 5.6 Stance / Proactivity

**Engine Base** (`prompts/<engine>-prompt.md`) provides the default stance — how the model reacts to requests with missing detailed information. Currently:

- **Arthur**: balanced. Mandatory info (what, on what) → ASK_USER. Optional details (path, title, format) → choose wisely, execute directly, mention chosen defaults in the ANSWER.
- Other Engines (Eddie, Ford, Marvin, …): Engine Base provides a sensible default for the Engine role; Recipes override if necessary.

**Recipe Override via `promptPrefixAppend`**. Each Recipe (Profile Block) can overturn the default by appending its own Stance section. Convention:

- A Markdown subsection (`## Style — …`) that unambiguously describes how the model handles vagueness: choose more aggressive defaults, more restrictive ASK_USER, or with specific domain rules (citation requirement, source validation, …).
- Plain text, no schema variable. Drift tolerance is acceptable — each personality may have its own nuances.

**Examples in the bundled Recipes:**

- **eddie.yaml** — Frontman Stance: for creatively open requests ("write a poem"), default autonomously, choose topic/title/path itself, mention in ANSWER. Only ask if the answer depends on user knowledge. The block is repeated per Profile (eddie, foot, web, default) because `promptPrefixAppend` lives per-Profile and some Profiles have additional client context sections — a YAML anchor (`*frontman_stance`) deduplicates where possible.
- **arthur.yaml** — no override, Engine default (balanced) is sufficient for the Orchestrator use case.
- **(future)** `analyze`, `web-research` — strict Stance: citation requirement, no assumptions, ASK_USER for gaps; Recipe Author decides per use case.

**Why free-form instead of Schema Variable.** A schema enum (`proactiveness: strict|balanced|creative`) would be more consistent, but it couples the personality vocabulary to an Engine edit as soon as a new nuance is desired. Free-form `promptPrefixAppend` uses an existing mechanism, shows directly what happens in the Recipe, and allows different Recipes to express different personalities. Drift risk is low — Recipes are rare and are reviewed collaboratively.

**When to elevate to a Schema Mechanism.** If 10+ Recipes repeat similar Stance texts, or if Tenant/UI wants to expose selection between Stances, a Recipe top-level append slot + named Stance constants would be worthwhile. Until then: free-form per Recipe, YAML anchor for DRY.

---

## 5a. Validator Corrections

Engines with enabled validation (`params.validation: true`) inject a corrective `SystemMessage` upon detected failure patterns. Both triggers are language-agnostic (structural, not regex-based) — see [structured-engine-output](/docs/structured-engine-output):

- **No-Tool-Call** — the LLM reply contains no tool call whatsoever (neither Work-Tool nor `respond`). Engine-default wording, no Recipe override (the correction text is tightly coupled to the `respond`-tool).
- **Data-Relay-Gap** — Tool result large (≥ 500 characters), reply short (≤ 200 characters). Indicates that the LLM did not relay the tool data. Override via `dataRelayCorrection` (format string with two `%d`-placeholders: `toolDataChars`, `replyLen`).

`null`/empty → Engine default (single-line fallback) is used. The bundled Recipes `default`, `arthur`, `ford` carry more detailed wordings tailored to the Engine context for the data-relay variant.

`formatSafe(...)` protects against incorrectly formatted templates: in case of a format exception, the template string is taken literally instead of crashing the turn.

The old regex-based "intent-without-action" heuristic (`INTENT_PATTERNS`) has been replaced by the structured `respond`-tool convention plus the No-Tool-Call validator.

---

## 5c. LLM Sampling Parameters

The following `params`-keys control the LLM wire parameters per call. They are read by `EngineChatFactory` from `engineParams` and placed on `AiChatOptions`; the respective `AiModelProvider`s map to the backend's wire field. Providers that do not recognize a field ignore it silently — Recipes thus run portably across providers without every mapping gap breaking a spawn.

| Key | Type | Default | Effect |
|---|---|---|---|
| `temperature` | `Double` (0..2) | `0.7` | Sampling temperature. Recipe wins over the caller default (`temperature` has no `null` default — hence no caller detection possible). |
| `maxTokens` | `Integer` | `null` (Provider default) | Hard cap on generated tokens. Caller-explicit values win. |
| `topP` | `Double` (0..1) | `null` | Nucleus sampling. |
| `topK` | `Integer` | `null` | Top-K cutoff. |
| `stopSequences` | `List<String>` | `null` | Hard-stop strings. YAML single strings are wrapped into a single-element list. Empty entries are filtered. |
| `seed` | `Long` | `null` | Determinism seed for replay/QA. |
| `frequencyPenalty` | `Double` | `null` | Penalty proportional to frequency. |
| `presencePenalty` | `Double` | `null` | Penalty for each token already seen. |

### Override Semantics

- **Nullable fields** (all except `temperature`): Recipe parameter is only written if the caller has not already set the field. Call code that builds `AiChatOptions.builder().topP(0.1)…` wins.
- **`temperature`**: has a non-null default (`0.7`), caller-explicit and default are indistinguishable. Here, the Recipe always wins if `params.temperature` is set. This aligns with the single-source-of-truth rule for Recipes; callers who need to enforce a fixed value set it on the Options instance after the `EngineChatFactory.forProcess(...)`-call.

### Type Tolerance

YAML parsers deliver numbers as `Integer`, `Long`, or `Double` depending on the path. The reader accepts any `Number` subtype and also parses strings (`"0.4"` → `0.4`). Invalid values are dropped with a WARN log line instead of crashing the spawn.

### Provider Coverage

| Param | OpenAI | LM Studio | Anthropic | Gemini | Ollama / Ollama Cloud |
|---|---|---|---|---|---|
| `temperature` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `maxTokens` | ✓ | ✓ | ✓ (Required, Default 4096) | ✓ (as `maxOutputTokens`) | ✓ (as `numPredict`) |
| `topP` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `topK` | ignored | ignored | ✓ | ✓ | ✓ |
| `stopSequences` | ✓ (`stop`) | ✓ (`stop`) | ✓ (`stop_sequences`) | ✓ | ✓ (`stop`) |
| `seed` | ✓ (Integer-Cast) | ✓ (Integer-Cast) | ignored | ✓ (Integer-Cast) | ✓ (Integer-Cast) |
| `frequencyPenalty` | ✓ | ✓ | ignored | ✓ | ignored |
| `presencePenalty` | ✓ | ✓ | ignored | ✓ | ignored |

**"Ignored"** means: the value is silently discarded on the Java side, no API call and no error. Recipe authors can deploy the same YAML block across all providers.

`seed` is `Long` everywhere in the Recipe, but is cast to `Integer` for OpenAI/Gemini/Ollama (the native SDKs expect `int`-range). Values > 2^31 silently lose their upper bits — this is acceptable because seeds are values for reproduction, not semantic numbers.

### Example — Deterministic Worker

```yaml
engine: ford
params:
  model: default:fast
  temperature: 0.0
  topP: 0.1
  seed: 1
  stopSequences:
    - "END_OF_REPORT"
  maxTokens: 2048
```

Anthropic ignores `seed`, all other providers give reproducible outputs with these settings.

### Example — Creative Long-Form Recipe (OpenAI/Gemini)

```yaml
engine: arthur
params:
  model: default:large
  temperature: 0.9
  topP: 0.95
  frequencyPenalty: 0.3
  presencePenalty: 0.2
```

On Anthropic, `frequencyPenalty`/`presencePenalty` are ignored; the Recipe runs, the long-form effect is only missing on Claude.

---

## 6. Tool Pool Adjustment

Engines declare their default tool whitelist via `allowedTools()`. Recipes can adjust this:

```
finalAllowed = (engine.allowedTools ∪ recipe.allowedToolsAdd) ∖ recipe.allowedToolsRemove
```

With an empty Engine whitelist (= unrestricted, Ford default), Add has no effect (everything is already there), but Remove creates a concrete whitelist from "all minus removed". This is the path to, for example, temporarily start a Ford worker without shell tools.

### 6.1 Convention: Engine Base Empty, Recipe is Single Source of Truth

Engines like Arthur and Eddie declare `allowedTools() = Set.of()` — no hardcoded Java list. Rationale:

- **No duplicate maintenance.** A new tool in the Brain is automatically picked up by `dispatcher.resolveAll(ctx)`; the Engine does not need to be updated in Java.
- **Single Source of Truth.** The Recipe YAML fully describes what the Engine sees and how it classifies it (`allowedToolsAdd / Remove / Defer`, plus label selectors like `@write`, `@executive`).
- **Classification via Labels, not Lists.** A Recipe might say, for example, *"defer @write, @executive, @side-effect; remove @destructive — Bulk-Wipes like doc_purge / kit_apply"*, instead of listing 80 tool names individually. New tools are immediately correctly classified if they set their labels.

If `base.isEmpty() && filter`, `ContextToolsApi.classify` expands at runtime to the full Dispatcher pool and applies the Recipe overlays (see Java documentation for the method). Specialty Engines (Marvin worker, Vogon strategy, Zaphod) may continue to maintain narrow static lists — for them, the narrow scope is a feature, not a maintenance burden.

**Implication for action-internal Tools.** Tools like `project_create`, `project_chat_send`, which Engines only call via `invokeInternal` from Action Handlers, are visible in the LLM Catalog (Recipe does not hide them). This is allowed — with Auto-Activate-on-direct-call, the LLM can also call them directly, the Action Handler translates the same vocabulary. System prompt guidelines (Arthur: *"DELEGATE instead of process_create"*) guide the model to the structured path, but are not a compulsion.

---

## 6a. Connection Profile Block

Recipes can carry an optional override block per Connection Profile. The Profile Block adjusts the Recipe for the specific client class without the Recipe having to be duplicated per client.

**Profile value comes from the WebSocket handshake** as an open string (`?profile=…`, see [client-protokoll-erweiterbarkeit](/docs/client-protokoll-erweiterbarkeit) §2.1a). Profile Block keys are also open strings — Tenants can introduce their own profiles (e.g., `ci-bot`, `kiosk`) via Recipe configuration without the Brain needing code changes. The canonical values (`foot`, `web`, `mobile`, `daemon`) are documented in `de.mhus.vance.api.ws.Profiles` as string constants.

**Motivation:** `foot` (terminal client) brings filesystem and shell tools, and the worker should actively use them; `web` runs in the browser without local tools — `client_*`-tools must be removed, otherwise the LLM hallucinates calls that do nothing; `mobile` wants shorter/cheaper sessions. Three Recipes (`foot_arthur`, `web_arthur`, `mobile_arthur`) would be proliferation at the Recipe level — the Profile Block keeps this in one Recipe.

### Schema

```yaml
arthur:
  engine: arthur
  promptPrefix: |
    You are Arthur, the coordinator...
  allowedToolsAdd: [...]                 # base
  params:
    manualPaths: [docs/]                 # base — see §6b
  profiles:
    foot:
      promptPrefixAppend: |
        You are connected to a terminal client. The user is editing
        local files; reach them via client_file_read / client_exec_run.
    web:
      allowedToolsRemove: [client_file_read, client_file_write, client_exec_run, …]
      promptPrefixAppend: |
        Web client — no local filesystem. Use workspace_* for project files.
    mobile:
      allowedToolsRemove: [client_file_*, client_exec_*]
      params: { maxIterations: 6 }       # mobile: shorter sessions
    default:                             # Catch-all for unknown Profile values
      allowedToolsRemove: [client_file_*, client_exec_*]
      promptPrefixAppend: |
        Non-CLI client — workspace_* only.
  protected: false                       # base visibility (search/spawn list)
```

### Block Fields

| Field | Type | Meaning |
|---|---|---|
| `allowedToolsAdd` | `List<String>` | In addition to `recipe.allowedToolsAdd` (same `@`-selector syntax) |
| `allowedToolsRemove` | `List<String>` | In addition to `recipe.allowedToolsRemove` |
| `promptPrefixAppend` | `String` (Pebble Template) | Is appended **after** `recipe.promptPrefix` — additive, not replacing. Pebble is also allowed here (e.g., `&#123;% if profile == "foot" %}…&#123;% endif %}` branches). For `OVERWRITE`-mode, the Recipe remains the master, the Profile append is still appended (Profile append is always additive) |
| `params` | `Map<String, Object>` | Profile-specific parameter defaults — merged between Recipe defaults and Caller parameters. Commonly used: `manualPaths` (see §6b), `maxIterations`, `model` |

### Profile Block Lookup with Fallback

The resolver selects the effective Profile Block along a cascade:

```
profileBlock(connectionProfile) :=
  1. recipe.profiles.get(connectionProfile)         → exact match wins
  2. recipe.profiles.get("default")                 → catch-all block, if defined
  3. ∅                                              → Recipe base without Profile overlay
```

This means the fallback applies in two cases:
1. **Profile not specified** — Wire default `web` (see Extensibility Spec §2.1a) goes through the same lookup; without a `profiles.web`-block, it lands on `profiles.default` or Recipe Base.
2. **Profile specified, but no block configured** — e.g., a Tenant custom profile `ci-bot` for which the Recipe does not yet have an explicit block: `profiles.default` applies.

`profiles.default` is the only Profile key with reserved semantics (catch-all). All other keys are freely selectable.

### Recipe Visibility

At Recipe top-level, not in the Profile Block:

| Field | Type | Meaning |
|---|---|---|
| `protected` | `boolean` | If `true`: Recipe only selectable as login/bootstrap recipe, not visible in the search/spawn list (for default Engines like `arthur` that should not be accidentally chosen as a worker recipe) |

Profile-specific visibility (`visibleTo: [foot, web]`) is not in the schema — if one wants to hide a Recipe for a profile, simply omit the Profile Block and use the `default` fallback, or the Recipe is generally `protected`.

### Merge Semantics

```
effectiveTools     = (engine.allowed
                      ∪ recipe.allowedToolsAdd
                      ∪ profile.allowedToolsAdd)
                     ∖ (recipe.allowedToolsRemove
                        ∪ profile.allowedToolsRemove)

effectivePrompt    = render(recipe.promptPrefix, ctx + {profileAppend: rendered(profile.promptPrefixAppend)})
                     // If the template does not reference &#123;{ profileAppend }} AND
                     // profile.promptPrefixAppend is non-blank, the renderer
                     // automatically appends the rendered append at the end (Auto-Append-
                     // Fallback). See planning/prompt-inlining.md §3.

effectiveParams    = recipe.params ⊕ profile.params ⊕ caller.params   // last wins
```

If `recipe.locked == true`, Caller parameters are ignored (see §4) — Profile parameters **are still applied**, as they represent Recipe Author intent, not Caller override.

### Daemon

`daemon` is reserved as a canonical Profile value for `vance-foot -d` (planned), but has no special effect in the current resolver — it flows through the same block lookup cascade as any other profile. If Daemon mode is implemented, the special handling will move to the connect handler in the Brain (no chat bootstrap, instead `DaemonRegistry` entry), not into the Recipe schema.

---

## 6b. Manuals — Recipe-Configurable How-To Documentation

`manual_list` and `manual_read` are the generic documentation tools: they read a list of folders from `params.manualPaths` and union the found Markdown files.

```yaml
params:
  manualPaths:
    - manuals/                # general manuals
    - eddie/manuals/          # engine-specific (Eddie-Hub)
profiles:
  web:
    params:
      manualPaths:         # web-Profile additionally shows web-specific manuals
        - manuals/
        - manuals/web/
        - eddie/manuals/
```

### Resolution

Per path in `manualPaths`:

```
DocumentService.listByPrefixCascade(tenantId, projectId, "<folder>/")
```

— thus runs through project → `_tenant` → classpath:vance-defaults/. Then the hits from all paths are merged in **Recipe order**: first hit per `<name>` wins. This allows an engine-specific path to override a similarly named general-path hit (specificity order: specific first).

`manual_read(name)` walks the same path list, retrieves the first `<folder>/<name>.md` that the cascade provides.

### Delimitation from other Doc Sources

| Tool | What | Where configured |
|---|---|---|
| `manual_list` / `manual_read` | Curated How-To documentation (Markdown files) | Recipe `params.manualPaths` |
| `workspace_*` | Project-specific files (uploaded by user / generated by worker) | Storage backend per Project |
| `client_file_*` | Local FS on the Foot client | Foot Process |
| Server Tool `doc_lookup` | Single pinned document as its own tool | `ServerToolDocument` with Type `doc_lookup` |

`manual_*` replaces the old engine-specific `docs_*` and `eddie_docs_*`-tools — one implementation, multiple paths, recipe-configured.

---

## 6c. Skill Integration

Recipes control Skills on two axes — *which Skills are active from spawn* and *which Skills are allowed to become active at all*. Both fields are optional and can be used independently. Skills themselves are described in [skills.md](/docs/skills) — Recipes only define which subset of their spawn bubble is eligible.

### Schema

```yaml
analyze:
  engine: ford
  defaultActiveSkills:
    - naming-conventions          # sticky active from spawn
  allowedSkills:                  # Whitelist
    - naming-conventions
    - code-review
    - typescript-style
```

### `defaultActiveSkills`

List of Skill names that are written to the fresh Process as sticky active Skills upon spawn. Each entry becomes an `ActiveSkillRefEmbedded` with:
- `fromRecipe: true` — the `/skill clear`-path respects this (recipe-bound Skills cannot be cleared if the Recipe is locked; see `skills.md` §7a)
- `oneShot: false` — sticky, runs until session end
- `resolvedFromScope: RESOURCE` as a safe default; Engines re-resolve on turn

If the Recipe cascade does not find the mentioned Skill names at spawn time, the entry is silently carried along — Engines (`Ford.resolveActiveSkills`) then discard it on the next turn with a warning log. Recipe author can verify through a spawn smoke test.

### `allowedSkills` — Whitelist

| Value | Effect |
|---|---|
| Field not set / `null` | No restriction — current behavior. Trigger match, Default-Active, and `/skill <x>` operate against the full Skill cascade visibility scope |
| List with entries | Whitelist. Trigger match iteration filters to these names; `/skill <x>` with an unlisted Skill fails with `SkillNotAllowedByRecipeException` ("Skill 'foo' is not allowed by recipe 'analyze'") |
| Empty list `[]` | Hard Lockdown — no Skill can ever become active. `defaultActiveSkills` must then also be empty, otherwise Recipe parse error |

**Validation during Recipe Parse:** if `allowedSkills` is set, `defaultActiveSkills ⊆ allowedSkills` must hold. Otherwise, `RecipeLoader.parse` throws `IllegalStateException`.

### Snapshot Persistence

Upon spawn, `allowedSkills` is written as `Set<String>` into `ThinkProcessDocument.allowedSkillsOverride` — snapshot, same pattern as `allowedToolsOverride`. If the Recipe is later edited or deleted, nothing changes for the running Process. The `defaultActiveSkills` entries move directly into `process.activeSkills` and are subject to normal Skill lifecycle logic from then on.

### Relationship to Recipe Lock

`recipe.locked == true` protects `engineParams` from Caller overrides. At the Skill level, this works differently: `defaultActiveSkills` are written regardless (Recipe Author intent), and `allowedSkills` is a spawn-time snapshot decision — after spawn, there is no "Caller", only user input (`/skill`). Here, the rule is: User may *not* clear Recipe skills if the Recipe is locked, and may only activate new Skills from `allowedSkills`. Both rules are implemented in `SkillSteerProcessor`.

### Profile Block Override (not in v1)

Profile Blocks (`profiles.foot:`) cannot currently override `allowedSkills` / `defaultActiveSkills`. Use case is thin: Skills are usually client-agnostic. If a concrete need arises (e.g., a client-specific style Skill only for `foot`), the schema can be extended — it does not break existing configuration.

---

## 6e. User-facing Recipe Picker

The Web-UI opens a modal with selectable Recipes when a session starts (via the `+` button in the picker). Which Recipes appear there is controlled by the `listed` flag from §2 — no automatic collection across the entire Recipe list, because 90% of Recipes are helpers / validators / light-LLM profiles that have no place in a user picker.

**REST Surface:**

```
GET /brain/{tenant}/projects/{project}/recipes/listed
  → 200 [ { name, title?, description? } ]
```

- Permission: `Resource.Project(tenant, project)` READ
- Cascade resolution as with `recipe_list` (Project → `_vance` → Bundled), merge by Recipe name
- Filter: `listed == true && internal == false`
- Sorting: alphabetically by `title || name`, case-insensitive

**Client Behavior:**

- The modal entry "Default" is rendered by the client and sends `chatRecipe: null` to `session-bootstrap` → Server `RecipeResolver.applyDefaulting` applies as before (`recipe → engine → default`). This means the "Default" selection automatically reflects any project-/tenant-wide override of the `default`-Recipe — no separate sentinel needed.
- The bundled `default.yaml` is therefore **not** marked with `listed: true`; otherwise, there would be duplicate "Default" entries.
- Foot ignores the flag and continues to accept all Recipes via `--recipe` — there, the user types the name, discovery is not the purpose.

**Bundled Defaults with `listed: true` (v1 status):** `arthur`, `eddie`, `ford`, `analyze`, `coding`, `web-research`, `code-read`, `marvin`, `lunkwill`, `quick-lookup`. Tenant and Project layers can opt-in mark any additional Recipes or remove bundled entries from the picker with an override file without `listed: true`.

---

## 7. Fields on ThinkProcessDocument

So that Engines see the Recipe-derived values during a turn, they are projected onto the Process:

| Field | Source |
|---|---|
| `recipeName` | for audit/UI — not for Engine logic |
| `connectionProfile` | active Profile value at spawn (`foot`/`web`/`mobile`) — for audit, if one later wants to trace under which profile a Process was created |
| `activeSkills` | seeded at spawn from Recipe `defaultActiveSkills` (each entry with `fromRecipe=true`, sticky). Thereafter normal Skill lifecycle |
| `allowedSkillsOverride` | Snapshot of Recipe `allowedSkills` as `Set<String>?`. `null` = no restriction; non-null = whitelist against which trigger match and `/skill` validate. Mirror of `allowedToolsOverride` |
| `engineParams` | filled with `effectiveParams` (Recipe defaults + Profile defaults + Caller merge) |
| `promptOverride` | Recipe `promptPrefix` + Profile `promptPrefixAppend` as unrendered Pebble template (rendering occurs per turn with current Tier/Mode/Profile context) |
| `promptMode` | `APPEND` / `OVERWRITE` |
| `dataRelayCorrectionOverride` | Recipe `dataRelayCorrection`, if set |
| `allowedToolsOverride` | `effectiveAllowed`, if != Engine default |

The Recipe is no longer referenced after spawn — the Process carries its effective configuration itself. This way, Processes survive if the original Recipe is later deleted or edited.

---

## 8. Discovery — How Arthur Finds Recipes

**Static in the Prompt:** When the Arthur system prompt boots, a section is inserted:

```
## Available worker recipes

- `analyze` — Worker for substantive analysis: reads files, inspects state,
  returns findings with cited evidence. Use for "analyse X", "compare Y".
- `quick-lookup` — Cheap one-shot fact retrieval. Use when one tool call
  with a short answer suffices.
- `web-research` — Multi-source web research with summarization.
- `code-read` — Reads codebases, summarises structure, finds references.
```

The static list contains exactly the **bundled** Recipes (from YAML). Tenant and Project Recipes are not embedded there — they must be discovered via the tool (see below). Advantage: Bundled defaults are known to the LLM without an extra round trip; the list only changes on Brain restart.

**Dynamic via Tool:** `recipe_list` (primary for Arthur) provides the effective Catalog for the current Tenant/Project view — i.e., bundled + tenant + project with correct override accounting. Arthur calls it if needed, when the built-in default set is not sufficient.

Schema:

```
recipe_list() → {
  recipes: [ { name, description, engine, tags, locked, source: BUNDLED|TENANT|PROJECT }, … ],
  count: int
}
```

Optional `recipe_describe(name)` as a Secondary Tool — returns the complete Recipe Document if Arthur wants to see the default parameters/prompt.

---

## 9. Spawn Cascade — `RecipeResolver.applyDefaulting`

Every spawn path outside of Engine internals goes through a central defaulting method. After the trigger pipeline consolidation, the actual `create + start` runs through exactly **one** Executor (`SpawnActionExecutor` via the `ActionExecutorRegistry`); `ProcessCreateTool` / `ProcessRunTool` / `SessionBootstrapHandler` / `ScriptCortexController` are thin callers that build and dispatch a `TriggerAction.Recipe`. `SessionChatBootstrapper` is the only spawn point that directly calls `thinkProcessService.create` — it needs very tight lifecycle control (see [arthur-engine](/docs/arthur-engine)). See [trigger-actions](/docs/trigger-actions) for the pipeline vocabulary.

```
applyDefaulting(tenantId, projectId, recipeName, engineName, callerParams) →
  recipeName != null         → apply(recipeName)
                                (Error if Recipe unknown)
  recipeName == null,
  engineName == X            → if recipe X exists  → apply(X)
                                else                → empty Optional
                                (Caller then falls back to engine-direct)
  both null                  → apply("default")
                                (Error if `default`-Recipe missing — bundled, so always present)
```

Spawn examples:

| Call | Behavior |
|---|---|
| `process_create(recipe="analyze", params={...})` | apply `analyze`, merge caller-params |
| `process_create(engine="ford", params={...})` | apply Recipe `ford` (bundled) — provides prompt + validator overrides; merge caller-params |
| `process_create(engine="arthur")` | apply Recipe `arthur` |
| `process_create(name="foo")` (neither engine nor recipe) | apply Recipe `default` (ford-based, generic prompt) |
| `process_create(engine="custom-x")` (no Recipe `custom-x`) | engine-direct fallback without Recipe override (Engine fallback prompt) |
| `process_create(engine="ford", recipe="analyze", ...)` | Conflict — `recipe` wins, `engine`-argument is logged-and-ignored |

Arthur's System Prompt recommends Recipe path as standard. Engine-direct is fallback for uncataloged custom Engines.

---

## 10. Initial Repertoire (Bundled Resources)

Current delivery as individual YAML files in `vance-brain/src/main/resources/vance-defaults/recipes/`. Three convention Recipes plus a series of specialized Workers:

| Name | Engine | Role | Usage |
|---|---|---|---|
| `default` | ford | Generalist Fallback | Called if neither Recipe nor Engine is set. Validation on, `default:analyze` model |
| `arthur` | arthur | Engine Default for Arthur | Full Arthur system prompt (Coordinator role), Validator override for Intent-Without-Action. Auto-applied for `engine="arthur"` without Recipe |
| `ford` | ford | Engine Default for Ford | Worker personality + both Validator overrides. Auto-applied for `engine="ford"` without Recipe |
| `quick-lookup` | ford | Fast One-Shot | Validation on, `default:fast` (SMALL model), 3 iterations |
| `analyze` | ford | Multi-Step Analysis | Validation on, `default:analyze` (LARGE), 10 iterations, dedicated Small-variant prompt |
| `web-research` | ford | Multi-Source Web Research | `default:web`, 12 iterations |
| `code-read` | ford | Read-only Codebase Inspection | `default:code`, removes write-tools (`client_file_write`, `client_file_edit`, `workspace_write`, `workspace_delete`) |

**Convention:** Recipes named after an Engine (`arthur`, `ford`, later `deep-think`) are their default bundles and carry the source-of-truth prompts. Specialized Recipes (`analyze`, `code-read`, …) build upon these — same Engine, different prompt prefix + different parameters.

With the introduction of `deep-think`, for example, `deep-think` (Engine default), `task-tree-plan`, `deep-analyze` will be added — on the same Recipe track, with a new Engine underneath.

---

## 11. Tenant and Project Customization

Recipes are Documents — editing therefore occurs via the Document Layer:

- **Tenant-wide Override:** Document with path `recipes/<name>.yaml` in the `_tenant`-Project. Beats the Resource default without further configuration.
- **Project Override:** Document with path `recipes/<name>.yaml` in the respective User Project. Beats `_tenant` and Resource.
- **Rollback to Default:** Delete the Document — the next lookup falls back to the next outer cascade level.

There is no longer a dedicated Recipe REST controller — the Document Editor (CLI / Web-UI Document Editor) is sufficient. Who is allowed to do what comes from the Document ACL model, once that is defined.

---

## 11a. Model Alias Resolution

Recipe `params.model` ideally references aliases, not concrete provider models:

```yaml
params:
  model: default:analyze    # Alias, resolved via Settings
```

Resolution rules (see `llm-resource-management.md` for details):

```
input := <prefix>:<rest>

  prefix ∈ registered providers (gemini, anthropic, …)
    → use directly: (prefix, rest)

  Setting `ai.alias.<prefix>.<rest>` set
    → recursively resolve with the resolved value

  prefix == "default" and no alias configured
    → fall back to (ai.default.provider, ai.default.model)

  else
    → UnknownModelException
```

This means:
- Recipes run out-of-the-box on any Tenant — regardless of whether it has Gemini, Anthropic, or OpenAI keys. `default:fast`/`default:analyze`/`default:deep` only need to be configured as aliases by the Tenant (or silently fall back to `ai.default.*`).
- Models come and go without Recipe editing. `gpt-5` released? Set Tenant setting `ai.alias.default.deep = openai:gpt-5`, done.
- Directly provider-specific specs (`anthropic:claude-sonnet-4-5`) remain valid — e.g., if a Recipe author intentionally wants to bind to a specific model.

---

## 12. Open Issues

- **Versioning of Recipes**. Today: Recipe is mutable, edits overwrite in-place. For reproducibility (which version of a Recipe ran on day X?), the Recipe would need to be versioned, with a reference from the Process to the specific version. Not v1, but not prevented by the schema.
- **Recipe Composition**. Can Recipes extend other Recipes (`extends: analyze`)? Not v1 — if needed, can be added later.
- **Schema Validation of `params`**. Currently free `Map<String,Object>`. If Engines receive a typed `defaultSettings()` schema (see `think-engines.md` point 4), the Recipe resolver can validate against the Engine schema before triggering the spawn.
- **Recipe Cost Model**. Recipes could carry a `costClass` (`cheap/normal/expensive`) that influences the quota system (`llm-resource-management.md`). A clean integration would be to query the quota system per Recipe call before allowing the spawn.
- **Recipe Discovery from a Worker Engine**. Are Workers (Ford, Deep-Think) allowed to inspect Recipes themselves or spawn sub-Workers via Recipe? V1 no — only Arthur orchestrates; for multi-level orchestration (deep-think → sub-deep-think), this needs to be reconsidered.
---
