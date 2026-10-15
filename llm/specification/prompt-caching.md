# Vancetope — Prompt Caching

> Prompt caching in the `vance-brain` LLM layer. Goal: 60–85% token cost reduction for medium to long Sessions, without Engines (Eddie, Arthur, Ford, Marvin, …) having to modify their code. Two separate aspects:
>
> 1. **Cache Management** (Anthropic-explicit): `cache_control` markers, `CacheBoundary`, `CacheTtl`, tool sorting. Implemented in the **Provider Layer** (`vance-brain/ai/anthropic/`), engine-agnostic and transparent. OpenAI/Gemini cache **implicitly** on the provider side — there is nothing to control there, only prompt stability (§6, `planning/tool-surface-stability.md`).
> 2. **Cache Measurement** (provider-agnostic): every Wire that reports cache counters is counted — Anthropic natively, OpenAI (`cached_tokens`) and Gemini (`cachedContentTokenCount`) via the `CacheAwareTokenUsageAdapter`. Gateways that bill a tail without breakdown are estimated (`ImplicitCacheEstimator`) and reported separately (§7.3). Evaluation in Insights (Usage tab + Cache tab, §7.2/§10.4).
>
> See also: [llm-resource-management](llm-resource-management.md) | [recipes](recipes.md) | [java-cli-modulstruktur](../java-cli-modulstruktur.md) | [arthur-engine](arthur-engine.md)

---

## 1. Terminology

| Term | Definition |
|---|---|
| **Cache Marker** | `cache_control: { type: "ephemeral" }` on a block in the Anthropic request. Anthropic caches **everything before and including** this block as a prefix. |
| **Cache Boundary** | Vancetope-internal Enum (`CacheBoundary`) that specifies **where** in the Request the marker is placed (`SYSTEM_AND_TOOLS` is default). |
| **Cache Hit** | Subsequent call with an identical prefix hash. Anthropic bills `cache_read_input_tokens` — ~10% of the standard price. |
| **Cache Creation** | First call of a prefix. Anthropic bills `cache_creation_input_tokens` — ~125% of the standard price. |
| **TTL** | Cache lifetime. 5min (default, no surcharge) or 1h (~2× write-cost, beta header required). |

**Cache Mechanics (Anthropic):**

- Up to 4 cache markers per Request.
- Cache key = full prefix up to the marker. Bit identity required — a changed whitespace breaks the hit.
- Markers are placed on the **last** system block / **last** tool; all preceding blocks automatically land in the same cache entry.
- Cache content: `system` blocks, tool definitions, potentially message content blocks. The cached prefix ends where the marker is placed.

---

## 2. CacheBoundary — Where the Marker Sits

Four levels, in `de.mhus.vance.brain.ai.CacheBoundary`:

| Value | Marker on | When useful |
|---|---|---|
| `NONE` | nowhere | Debugging / cache-unfriendly Sessions / global kill switch |
| `SYSTEM` | last System block | Tools change frequently (Skills / Mode filters), only System Prompt should cache |
| `SYSTEM_AND_TOOLS` | last System block **and** last Tool definition | the sweet spot without history markers |
| `SYSTEM_AND_TOOLS_AND_TAIL` | same as `SYSTEM_AND_TOOLS` **plus** last Content block of the conversation history | **Default** — the growing history is written once, then only read |

`CacheBoundary` is a field on [`AiChatOptions`](../vance/vance-brain/src/main/java/de/mhus/vance/brain/ai/AiChatOptions.java). Default is `SYSTEM_AND_TOOLS_AND_TAIL`. Engines can override via builder:

```java
AiChatOptions opts = AiChatOptions.builder()
    .cacheBoundary(CacheBoundary.SYSTEM)   // tools left dynamic
    .build();
```

**Demotion:** `…_TAIL` requires a model with the `mid-conversation-system` capability (§5). Without it, the `AnthropicRequestMapper` demotes to `SYSTEM_AND_TOOLS` — a history marker before a mutating system tail would write a fresh full-prefix entry every round (~1.25× instead of 1×), and a `{role: "system"}` frame would result in a hard 400 for models without the capability.

`FULL` (marker also after Skills block) is named in the plan but **not** in the code — Skills are typically <500 tokens today, the additional marker saves little. If this becomes a hot spot, the Enum can be extended.

---

## 3. CacheTtl — How Long the Cache Lives

| Value | Anthropic Behavior | Beta Header |
|---|---|---|
| `DEFAULT_5MIN` | TTL 5 minutes — Default, no surcharge | — |
| `LONG_1H` | TTL 60 minutes — write costs ~2× | `anthropic-beta: extended-cache-ttl-2025-04-11` |

The `AnthropicProvider` automatically sets the Beta header if `cacheTtl == LONG_1H`. The `cache_control` object additionally receives `ttl: "1h"`.

**Beta Header Status (as of 2026-10):** Anthropic documentation shows `ttl: "1h"` without a Beta header — presumably GA. The header continues to be set (uncritical as long as the API accepts it); live cross-check is pending as long as no Anthropic key is available.

**Default: 5min for all Recipes.** Recipes that should use 1h TTL must be in a Tenant allowlist — Setting `ai.cacheTtl.long`, Cascade `process → project → _tenant`, comma-separated Recipe names. Example: `analyze,deep-research`. `EngineChatFactory.applyDefaults` reads the setting and sets `cacheTtl=LONG_1H` if the Process's Recipe name is in it and caching has not been disabled via `disableCache`/`vance.ai.cache.enabled`.

---

## 4. Provider Behavior

### 4.1 AnthropicProvider — Direct SDK Path

The `AnthropicProvider` no longer builds `langchain4j-anthropic`, but its own Direct Adapter:

```
AnthropicProvider
  └── AnthropicDirectChatModel       implements ChatModel          (sync)
  └── AnthropicDirectStreamingChatModel implements StreamingChatModel (stream)
       ├── AnthropicRequestMapper    ChatRequest → MessageCreateParams
       └── AnthropicResponseMapper   Message     → ChatResponse (with AnthropicTokenUsage)
```

The adapter uses the official `anthropic-java` SDK (Maven `com.anthropic:anthropic-java`). The body is written as a raw JSON map via `MessageCreateParams.builder().putAdditionalBodyProperty(...)` — rationale:

- `cache_control` requires a bit-stable JSON form that does not drift between SDK versions.
- Tool sorting must be guaranteed (see §5).
- Future-proof: future Anthropic headers (extended-thinking, structured outputs) are accessible without an SDK upgrade.

**`messages` is the exception — typed.** The SDK treats `messages` as a *required typed field* of `MessageCreateParams`; an Additional-Body-Property serializes but does not pass the mandatory check — the first live call died client-side with ``messages` is required, but was not set`` (2026-10-05, found precisely because: the path had never been run live without an Anthropic key). `AnthropicMessageParams` therefore translates the mapper maps at this boundary into typed `MessageParam`s (`MessageParam.Role.SYSTEM` is SDK vocabulary, the blocks per shape: text/image/document/tool_use/tool_result). Losslessly verified via wire equivalence test (`AnthropicMessageParamsTest`: serialized result == original map). Everything else (`system`, `tools`, `thinking`, sampling) remains raw.

**Gateways with Anthropic-Wire.** `ai.provider.<instance>.baseUrl` is respected on the chat path (`AnthropicProvider.newClient`) — an Anthropic-compatible gateway like OpenRouter (`https://openrouter.ai/api` → `POST /api/v1/messages`) speaks the same protocol behind a different host; Auth remains `x-api-key`, which compatible gateways also accept (verified). This allows the adapter to be live-tested even without a direct Anthropic key.

`langchain4j-anthropic` has been removed from the POM — `langchain4j-core` (ChatModel interfaces, ChatRequest, ToolSpecification) remains. Engines continue to interact with the langchain4j interface; the Direct Adapter is invisible to them.

### 4.2 GeminiProvider — `cacheBoundary` Ignored

Gemini has its own caching API (`cachedContents.create`), structurally different. v1: `GeminiProvider` silently ignores `cacheBoundary`. Extension is a separate step — TODO in code.

### 4.3 Embedding Provider — No Caching

Caching makes no sense for Embeddings. `cacheBoundary` is ignored.

---

## 5. System Prompt Layout — Mandatory Convention

For caching to work, **static** content must be at the top and **dynamic** content at the bottom. The layout convention for each Engine:

```
┌─────────────────────────────────────────────────────────┐
│ [1] Engine Default System Prompt              STATIC    │
│     (e.g., arthur-prompt.md from Cascade)               │
├─────────────────────────────────────────────────────────┤
│ [2] Recipe promptOverride / promptPrefix      STATIC    │
│     (Recipe Layer, identical per Recipe version)        │
├─────────────────────────────────────────────────────────┤
│ [3] Tool Schemas                              STATIC    │
│     (sorted alphabetically, see §6)                     │
│                                                         │
│   ─────── CACHE MARKER (SYSTEM_AND_TOOLS) ───────       │
├─────────────────────────────────────────────────────────┤
│ [4] Skills Block (active Skills)         SEMI-STATIC    │
├─────────────────────────────────────────────────────────┤
│ [5] Working Memory Block (delegated workers)  DYNAMIC   │
├─────────────────────────────────────────────────────────┤
│ [6] TodoList Block (Arthur Plan Mode)         DYNAMIC   │
├─────────────────────────────────────────────────────────┤
│ [7] Mode Indicator (Arthur Plan Mode)         DYNAMIC   │
├─────────────────────────────────────────────────────────┤
│ [8] Chat History (Messages)                   DYNAMIC   │
├─────────────────────────────────────────────────────────┤
│ [9] Current User Message                      DYNAMIC   │
└─────────────────────────────────────────────────────────┘
```

**Rule:** Engines that place a timestamp, user ID, pod IP, or anything else variable in the block above the marker **break the cache of each of their Sessions**. Such content belongs in the dynamic block (positions 5–9) or in the Chat History.

**Recipe-promptOverride** must be constant. Recipes with dynamic content in `promptPrefix` (e.g., "current Project inventory", "weather") must move the dynamic part into a separate block located after the marker.

### 5.0 History Breakpoint (`SYSTEM_AND_TOOLS_AND_TAIL`)

With the default Boundary, a second marker is placed on the **last content block of the
conversation history** (position 8/9). Prerequisite: positions 4–7 (Skills,
Working Memory, Todo, Mode Indicator) leave the System array. Anthropic invalidates
the message cache with every change to `system` — mutating blocks there would
make the history marker a costly full-prefix entry every round.

For models with the `mid-conversation-system` capability (`ai-model-catalog`, see
Manual), the mapper therefore appends the dynamic blocks **after** the marker as
`{role: "system"}` messages — the documented pattern for dynamic blocks alongside
a cached conversation. They are thus behind the last cache position and
explicitly excluded from the cache; the static blocks (positions 1–3) remain in
`system`. In this mode, the mapper renders **all** messages in block-array form
(no string variant for text-only user messages) to maintain prefix stability
and prevent the form of the last message from flipping between calls.

Without the capability, the mapper demotes to `SYSTEM_AND_TOOLS` (current layout, see above).
**None** of the bundled Anthropic models (Haiku 4.5, Sonnet 4.5, Opus 4) carry the
capability — they do not accept mid-conversation system messages. The feature is
thus built and unit-tested, but **dormant** for the bundled models:
activation is a single line in the model YAML. Model names must never be guessed
(incorrect assumption = hard 400); the capability is explicitly declared.

**Compaction/Rewrite** of the history (Memory Compaction, Arc Pins) rewrites what is before
the marker, invalidating the hit — the next turn rewrites the prefix.
Accepted (the write side is affected by rewriting anyway).

**Only one marker** (Boundary, not levels): the API grants write credits only for
set markers, and the segment behind the history marker is empty. A second marker
at the older end of a window would only be considered for ≥20 blocks lookback (API limit)
and would enforce the 5-minute quiet limit per marker — not for now.

**Measurement consequence:** the history marker generates measured `cache_creation` tokens
for the full history. This exact number was previously an estimate (§7.3) — measured and
estimated are still never added.

**Content of the Tail: Context, not Imperatives.** Models check content that comes after the user message for plausibility — a synthetic "answer X when asked Y" instruction in the tail was suspected as prompt injection and ignored (live observation 2026-10-05, §10.6). Working Memory, Todo, and Mode content are context and run unhindered; imperative overrides do not belong in this block.

### 5a. Multiple System Blocks and `SystemBlockKind`

Engines submit multiple `SystemMessage` blocks — the `AnthropicRequestMapper` lifts them all into Anthropic's top-level `system` array. Where the cache marker lands is controlled by the **last STATIC block**:

| Engine Pattern | Marker Placement |
|---|---|
| All blocks `STATIC` (= Default for `SystemMessage.from(...)`) | On the last block — corresponds to "classic" behavior |
| `STATIC` … `STATIC` … `DYNAMIC` … `DYNAMIC` | On the last `STATIC` — dynamic tail outside the cache hash |
| All blocks `DYNAMIC` | No System marker (Tools marker remains independent depending on `CacheBoundary`) |

Engines explicitly mark dynamic blocks via the wrapper class:

```java
// static prefix — will be cached
messages.add(SystemMessage.from(staticPrompt));
messages.add(SystemMessage.from(skillsBlock));
//   ────── Cache marker lands here ──────
// dynamic tail — turn-specific, behind the cache
messages.add(VanceSystemMessage.dynamic(workingMemory));
messages.add(VanceSystemMessage.dynamic(planTodos));
```

`SystemBlockKind.STATIC` is default — Engines that have not migrated remain backwards-compatible (one `SystemMessage`, marker on it, as before).

**Current Engine Status** (migration status):

| Engine | Static Blocks | Dynamic Blocks | Status |
|---|---|---|---|
| Arthur | Engine Default + Recipe Prompt | Date Block, Client Env Block, Scratchpad Block, Recipe Catalog, Memory Cascade Block, Persona/Facts, Active Workers, TodoList, Tool Hints | ✅ migrated |
| Eddie | Engine Default + Recipe Prompt + User Context | Date Block, Client Env Block, Scratchpad Block, Persona Block, Facts Block, Memory Cascade Block, Delegated Workers, Working Project, Tool Hints, TodoList | ✅ migrated |
| Ford | Engine Default + Tool Hints + Skills Block | Date Block, Client Env Block, Scratchpad Block, ARCHIVED_CHAT (semi-static) | ✅ migrated |
| Frankie | Engine Default (incl. Memory) + Skills Block | Date Block, Client Env Block, Scratchpad Block, TodoList (§9.2) | ✅ migrated |
| TrillianControl | Engine Default + Nature Addendum + Recipe Prompt | Date Block, Client Env Block, Scratchpad Block | ✅ migrated |
| TrillianUser | Engine Default + Nature Addendum + Recipe Prompt | Date Block, Client Env Block, Scratchpad Block | ✅ migrated |
| Marvin | Engine Default | — | ✅ no dynamic content in System |

Three of the listed blocks are **conditional** and entirely absent in some turns: the
Date Block, if the Recipe sets `promptDateGranularity: none` (§5b); the Client Env Block, as long
as no CLIENT Work Target connection is bound — i.e., in all headless and Web turns
(`PromptEnvironmentBlock`); the Scratchpad Block, as long as the Process has not created any Slots
(§5c). All three are DYNAMIC, so their appearance and disappearance does not break the static prefix.

---

## 5b. Current Date Block

Engines can provide the current date directly in the Prompt to the LLM, instead of having it fetched via a `current_time` tool call — for longer Sessions, this saves a round trip per turn. The block is rendered as a **DYNAMIC** SystemMessage and is therefore cache-neutral: it sits behind the `cache_control` marker (Anthropic) and does not break the stable prefix.

**Position in Layout:** directly at the first DYNAMIC block, i.e., before all other turn-volatile system content (Memory blocks, Plan Mode TodoList, ARCHIVED_CHAT summaries).

**Granularity — tier-aware by default.** The helper `PromptDateBlock.resolve(paramValue, tier)` renders one of three granularities:

| Value | Format | Cache Lifetime |
|---|---|---|
| `NONE` | (Block is skipped) | — |
| `DAY` | `Current date: 2026-06-24` | 24h |
| `HOUR` | `Current date: 2026-06-24 14h UTC` or `+02:00` | 1h |

**Control via Recipe Param `promptDateGranularity`:**

| Param Value | Behavior |
|---|---|
| (not set) | `auto` — same as `auto` value below |
| `auto`, `true` | Tier-based: `SMALL` → `DAY`, `LARGE` → `HOUR`, Tier-unset → `DAY` |
| `none`, `off`, `false` | Block is suppressed |
| `day`, `date` | Force DAY |
| `hour` | Force HOUR |
| (unknown value) | Falls back to `auto` — a Recipe typo does not silently disable the feature |

**Default is `auto`** — all Engines provide the block until a Recipe explicitly sets `none`. To disable the feature for trim-token Recipes (e.g., Slart-/LightLlm-Helper), set `params.promptDateGranularity: none`.

**Timezone — User's, not Server's.** The block is rendered in the **display timezone of the Process owner**, not the server JVM zone. This affects both: for `HOUR`, the appended offset (`14h +05:30`), for `DAY`, the day boundary (a user in `Asia/Kolkata` sees their local date, not the UTC date). `14h` alone would be ambiguous — hence always the zone offset; UTC is output as `UTC` (instead of the ISO letter `Z`), other zones as an offset (`+02:00`, `-05:00`).

The zone comes from the `TimezoneResolver` (Setting `display.timezone`, Cascade User → Tenant → `UTC`-fallback — see [settings-system](settings-system.md)). The `PromptDateContextResolver` lifts `Process → Session → userId` for this and is **headless-proof**: the scheduler stamps `session.userId = runAs`, so that even auto-wakeup/scheduler turns without an open client connection resolve the correct zone. Only if the User (and the Tenant) have not set a zone does the block fall back to `UTC`.

The same `display.timezone` is also the default zone of the `current_time` tool: without an explicit `zone` parameter, it responds in the user's zone instead of UTC.

**Code Paths:**

- Helper: [`PromptDateBlock`](../../vance/vance-brain/src/main/java/de/mhus/vance/brain/prompt/PromptDateBlock.java) — `resolve(...)`, `render(...)`, `appendDynamicMessage(...)`.
- Zone Lift: [`PromptDateContextResolver`](../../vance/vance-brain/src/main/java/de/mhus/vance/brain/context/PromptDateContextResolver.java) (`brain/context`) → [`TimezoneResolver`](../../vance/vance-shared/src/main/java/de/mhus/vance/shared/settings/TimezoneResolver.java) (`vance-shared`).
- Constant: `PromptDateBlock.RECIPE_PARAM` (`"promptDateGranularity"`), Setting key `TimezoneResolver.Keys.DISPLAY_TIMEZONE` (`"display.timezone"`).
- Tests: `PromptDateBlockTest`, `TimezoneResolverTest`, `CurrentTimeToolTest`.

Trillian (Control + User) did not have ModelCatalog access before this migration — it was injected as part of the Date integration, so that `tier` is also available there in the Pebble context and for auto-granularity.

---

## 5c. Scratchpad Block

Slots created by the Process via `scratchpad_set` appear as a **DYNAMIC** block in the Prompt
(`ScratchpadPromptBlock` + `ScratchpadPromptContributor`) — otherwise, the model would have to
guess a title it assigned 30 turns earlier. Slot contents change per turn, so the block sits
behind the `cache_control` marker, like the Date Block.

**Empty inventory renders nothing.** This is the condition for the block to run on all six
Engines: the `scratchpad_*` tools are non-primary but not locked, so an unconditional block
would cost budget in every turn of every Engine. This is intentionally different from the
Plan Mode TodoList (§9.2), which renders an invitation if the list is empty.

**Bounded by construction:** single-line slots ≤200 characters inline, everything else as a size hint
(`- \`findings\` — 1240 chars, read with \`scratchpad_get('findings')\``), total block ≤2000
characters; what no longer fits is reported as a count instead of silently disappearing.

**Slot text is untrusted.** An Engine may park an excerpt of a fetched page in the
slot — text that arrived correctly wrapped as a tool result in the *User* role. Unwrapped
and re-rendered, it would be *System* text from the next turn. The slot list is therefore in an
`UntrustedContent.wrap` block (`<scratchpad-notes>`), titles are whitespace-collapsed (a
newline in the title could otherwise open a heading at the beginning of the line), and content with any
line terminator is never rendered inline.

**Order trap.** The marker sits on the **last STATIC** block, and `buildSystemBlocks`
collects System messages from the **entire** message list — even those that appear after the
history. An untagged `SystemMessage.from(...)` after the dynamic blocks therefore pulls them
into the cached prefix, where any change breaks it. Two places were heading for this and have been
fixed: Ford appended the `ARCHIVED_CHAT` summaries after the dynamic blocks (now before), and
Trillian's `toLangchain` now renders Chat Log lines with `ChatRole.SYSTEM` — written by
`MemoryCompactionService` — as DYNAMIC.

Scope boundary v1: the lookup is process-bound — slots of a terminated process do not appear in
any block. See `planning/scratchpad-review.md` §7.

---

## 6. Tool Schema Stability

Tools are cached, so order and schema must be bit-identical. `AnthropicRequestMapper.buildTools()` sorts the tool list **alphabetically by name** before JSON construction:

```java
List<ToolSpecification> sorted = new ArrayList<>(raw);
sorted.sort(Comparator.comparing(ToolSpecification::name));
```

Engines that assemble tool lists from `Map`/`Set` previously had no sorting guarantee — same tools, different order → different cache hash. Centralized sorting in the mapper eliminates this race condition.

JSON schemas of individual tools are mapped from langchain4j's `JsonSchemaElement` trees — strictly deterministic (`LinkedHashMap` for property order, sorted `required` list).

---

## 7. Response Mapping & Cache Token Telemetry

`AnthropicResponseMapper.toChatResponse(message)` builds a langchain4j `ChatResponse` from the SDK `Message`. The `TokenUsage` is an **`AnthropicTokenUsage`** (subclass) with additional fields:

```java
public class AnthropicTokenUsage extends TokenUsage {
    long cacheCreationInputTokens;
    long cacheReadInputTokens;
}
```

The cache counters are read from `Usage._additionalProperties()` — the keys `cache_creation_input_tokens` / `cache_read_input_tokens` come unchanged from Anthropic.

### 7.1 Trace Logging

`AiTraceLogger` renders the cache tokens and a hit rate into the trace log:

```
<<< [anthropic:claude-sonnet-4-7] response
[ai/text]
…
[tokens] TokenUsage { input=12340, output=523, total=12863 } cache_create=0 cache_read=8200 hit_rate=39.9%
[finish] STOP
```

The hit rate is calculated against the full input token counter:
`cache_read / (input_tokens + cache_creation + cache_read) × 100`.

### 7.2 Persistent Trace

`LlmTraceDocument` (Mongo) has these fields:

| Field | Type | Assignment |
|---|---|---|
| `cacheCreationInputTokens` | `Integer?` | from `AnthropicTokenUsage`, only OUTPUT rows, only cache-aware Provider |
| `cacheReadInputTokens` | `Integer?` | ditto |
| `implicitCacheReadTokens` | `Integer?` | ditto — the estimate from §7.3, never mixed with `cacheReadInputTokens` |
| `providerModel` | `String?` | `providerInstance:model` of the responding Wire (for fallback chains, the one that actually billed) |
| `modelAlias` | `String?` | the model name configured by the Engine (`request.parameters().modelName()`) |

`LlmTraceRecorder.recordResponse(...)` sets the counters via an `instanceof` check. `null` means: the Provider does not report cache counters (typically Ollama/LM Studio, but also OpenAI/Gemini gateways that do not output `cached_tokens`). OUTPUT rows without cache fields are therefore **not** an Anthropic characteristic — counting is provider-agnostic since `CacheAwareTokenUsageAdapter` (OpenAI/Gemini) and `ImplicitCacheEstimator` (tail-billing gateways) are alongside.

`providerModel`/`modelAlias` are on **every** row of the round trip and answer "which provider produced these cache numbers?" — the question the Cache tab could not answer without them.

These fields are the data basis for the Insights cache view (Cache Hit Rate per Process, split by Wire, §10.4).

### 7.3 Implicit Cache — Detection of Unreported Cache Tokens (Estimation)

Some Gateways serve the Prompt from their own prefix cache and report only the **uncached tail** as `prompt_tokens` — without `cached_tokens` detail (observed on a DeepSeek Pro route: 226 reported input tokens for a factual ~78k token request volume). This is indistinguishable from an honestly fully reported small Prompt from the outside — Vance cannot measure the missing counters, but it can **detect** the difference.

**Rule (`ImplicitCacheEstimator`, `vance-brain/ai`):** A call is considered implicitly cached if both are true:

1. Reported input tokens < 50% of the estimated request volume (Messages + Tool Schemas, ~4 chars/Token), **and**
2. The gap > 1,000 tokens (absolute floor against tokenizer estimation noise).

Additionally: Usage objects that themselves carry cache counters (`CacheAwareTokenUsage` — Anthropic directly, OpenAI/Gemini via bridge) are **never** estimated; measurement trumps estimation, otherwise it would be double-counted.

**Processing as clearly marked estimate, not as measurement:**

- Ledger: `UsageMeasurement.implicitCacheReadTokens` → `UsageWrite` → `LlmUsageDocument.implicitCacheReadTokens` (per call) and `LlmUsageDailyDocument.implicitCacheReadTokens` (daily bucket) → `UsageBucketDto.implicitCacheReadTokens` → Usage tab ("From cache (est.)" / "≈ aus Cache (geschätzt)", only displayed if > 0).
- **No cost share**: the Provider has only billed the tail, the cost calculation on the reported tokens is already correct. The estimated value is purely informative — it shows how much cache savings the Gateway "gave away" without reporting them.
- **Never mixed** with the measured `cacheReadTokens`; UI column and totals explicitly separate both ("(est.)"/"≈").

**One calculation path per Attempt (decision 2026-10-05).** The estimate is calculated exactly once: in the cache normalization layer (`CacheAwareUsageChatModel` / streaming twin), which attaches it to the Usage object (`ImplicitCacheTokenUsage`) — Ledger and Trace read the same number from there (`ImplicitCacheEstimator.implicitCacheReads`) — no second Estimator run, no two truths. If the normalization layer fails (tests, special Wires), the caller recalculates — the same pure function.

The estimate is deliberately conservative (50% threshold + absolute floor): a false conclusion must never appear as a measurement. A normal small Prompt or tokenizer jitter does not trigger it.

### 7.4 Write Split 5m/1h in Billing

Anthropic reports write counters in two parts: `usage.cache_creation.ephemeral_5m_input_tokens` / `ephemeral_1h_input_tokens` (sum = `cache_creation_input_tokens`). Since 1h writes cost **~2×** (5m: 1.25×), the Ledger books both shares separately:

- `AnthropicTokenUsage.cacheCreation1hInputTokens` from the typed `Usage.cacheCreation()`.
- `UsageMeasurement` / `UsageWrite` / `LlmUsageDocument` / `LlmUsageDailyDocument` carry `cacheWrite1hTokens` as a share of `cacheWriteTokens` (remains the total).
- Costs: `(cacheWrite − cacheWrite1h) × priceCacheWrite + cacheWrite1h × 2 × priceCacheWrite` in `LlmUsageService.Costs`.
- **Fallback**: if the `cache_creation` object is missing (old SDKs, proxies), `cacheWrite1hTokens = 0` and everything is billed at the 5m price — the old behavior, without invented shares.

The 1h shares appear as a separate column in the Usage table ("Cache write (1h TTL)") and as a separate row in the Usage tab — alongside the total, never instead.

---

## 8. Cache Disable — Three Levels

| Level | Where | When |
|---|---|---|
| **Per-Call** | `AiChatOptions.cacheBoundary = NONE` | Engine sets itself, e.g., debugging |
| **Per-Recipe** | YAML `params.disableCache: true` | Individual Recipe is cache-unfriendly |
| **Global** | `application.yml` → `vance.ai.cache.enabled: false` | Operator kill switch (Dev / Compliance / Provider Issue) |

**Evaluation Order:**

1. Engine builds `AiChatOptions` with desired Boundary (Default `SYSTEM_AND_TOOLS_AND_TAIL`).
2. `EngineChatFactory.applyDefaults` reads `process.engineParams.disableCache` — if `true` → boundary to `NONE`.
3. `AnthropicProvider.applyGlobalCacheKill` checks `vance.ai.cache.enabled` — if `false` → boundary to `NONE`, immutable Copy via `toBuilder()`.

Three switches are intentionally enough: a Tenant setting (Cascade) is conceivable, but YAGNI — the Boundary lookup point is central, adding it later costs little.

---

## 9. Tests

### 9.1 Unit Tests (`vance-brain/src/test/java/...ai/anthropic/`)

- `AnthropicRequestMapperTest`
  - `cacheBoundary=SYSTEM` → `cache_control` only on last System block
  - `cacheBoundary=SYSTEM_AND_TOOLS` → additionally on last Tool
  - `cacheBoundary=NONE` → no `cache_control` in body
  - `cacheTtl=LONG_1H` → `ttl: "1h"` in marker
  - Tools sorted alphabetically across two calls with different insertion order
  - `cacheBoundary=SYSTEM_AND_TOOLS_AND_TAIL` → marker on last History block, dynamic System blocks as `{role:"system"}` messages after it (model with `mid-conversation-system`)
  - same without the capability → demotion to `SYSTEM_AND_TOOLS`, no History marker, current layout
  - Tail mode → all Messages in block-array form (the form of the last Message does not flip between calls)
  - Tool loop → marker on the `tool_result` block
- `AnthropicResponseMapperTest`
  - Text-only Response → `AiMessage` with text
  - Tool-use Response → `AiMessage` with `ToolExecutionRequest`
  - Cache counters correctly extracted from `_additionalProperties`
  - `stop_reason: tool_use` → `FinishReason.TOOL_EXECUTION`

### 9.1a Implicit Cache Tests (`vance-brain/ai`)

- `ImplicitCacheEstimatorTest`
  - Tail billing → gap is recognized as an estimate
  - Tool schemas count towards volume
  - Fully reported call → no estimate (both thresholds)
  - Small gap = noise, no cache
  - `CacheAwareTokenUsage` (Anthropic / OpenAiTokenUsage with details) → never estimate
  - `null`-Usage / 0 Input / `null`-Request → 0
- `CacheAwareUsageChatModelTest.accountingDetectsImplicitCacheFromTheBilledTail`
  - End-to-End through the decorator stack: estimate lands in `implicitCacheReadTokens`, separate from measured `cacheReadTokens`

### 9.2 Integration Test (opt-in, costs API calls)

In `qa/ai-test/`:

```java
@Test
@EnabledIfApiKeys
void cacheHit_secondCallWithSamePrefix_recordsReadTokens() {
    // 1. Spawn Arthur process, steer "hi"
    // 2. drainTraces; trace[0].cacheCreationInputTokens > 0
    //                 trace[0].cacheReadInputTokens == 0
    // 3. Steer "what's the time"
    // 4. drainTraces; trace[1].cacheReadInputTokens > 0
    //                 trace[1].cacheCreationInputTokens == 0
}
```

Test is `@EnabledIfApiKeys`-tagged — runs only locally with real keys, not in CI.

---

## 10. Open Items

### 10.1 1h-TTL Allowlist (✅ implemented)

Setting `ai.cacheTtl.long` (Cascade `process → project → _tenant`),
comma-separated Recipe names. `EngineChatFactory.applyDefaults` sets
`cacheTtl=LONG_1H` if the Process's Recipe name is in the
allowlist. Applies only if caching has not been disabled via
`vance.ai.cache.enabled=false` or `params.disableCache=true`. Default empty = all Recipes at 5min.

### 10.2 Recipe Audit for Layout Convention (✅ completed)

Audit + migration of Engines (Arthur, Eddie) to `SystemBlockKind`-
based multiple blocks has been completed — see §5a.

### 10.3 Sub-Agent Cache Inheritance

With `process_create_delegate`, a new Process spawns with its own System Prompt — it does **not** inherit the parent's cache. This is a design decision: hierarchical Agents (Eddie → Arthur → Ford) have their own Personas; cache inheritance would be complicated. v1: do not implement.

### 10.4 Insights Dashboard (✅ implemented)

Cache tokens are persisted on `LlmTraceDocument` (§7.2) and aggregated per Process:

```
GET /brain/{tenant}/admin/processes/{processId}/cache-stats
→ CacheStatsDto {
    roundTrips, inputTokens, outputTokens,
    cacheCreationInputTokens, cacheReadInputTokens,
    implicitCacheReadTokens,
    hitRate, hitRateIncludingEstimate,
    providers: [ { providerModel, roundTrips, …, hitRate,
                   minCacheableInputTokens } ] }
```

`hitRate = cacheReadInputTokens / (inputTokens + cacheCreation + cacheRead)` — measured, fraction in [0.0, 1.0].
`hitRateIncludingEstimate = (cacheRead + implicit) / (input + creation + read + implicit)` — the only number where measurement and estimation meet; marked everywhere as "≈ / incl. estimate".

`providers` is the slice per `providerModel` (fallback chain = one row per responding Wire) and answers "is this Anthropic-only?" directly in the tab. `minCacheableInputTokens` comes from `ModelInfo` (YAML field `minCacheableInputTokens`; Anthropic: 512–4,096 tokens per family) and distinguishes "0% because too small for cache" from "0% because provider reports nothing" — `null` if the Catalog does not know the Wire.

Aggregation in `LlmTraceService.cacheStatsByProcess` as a pure-Java walk (TTL-bounded Collection, typically < 100 Trace rows per Process). Tenant/Session scope aggregations would be Mongo `$group` pipelines — will come when demand becomes real. The display is implemented (`vance-face/src/insights/CacheStatsTab.vue`): hit rate with bar, token breakdown (measured/estimated separately), per-provider table.

### 10.5 langchain4j Upstream PR

Optional long-term: PR to `langchain4j-anthropic` that exposes cache markers. Would remove our double dependency. Not relevant today — the Direct Adapter works and is closer to the SDK stream.

---

### 10.6 Live Acceptance History Breakpoint (✅ 2026-10-05 via Gateway, Rest pending)

Accepted with `qa/ai-test/PromptCacheAcceptanceE2ETest` (`@Tag("manual")`, start:
`./wb qa PromptCacheAcceptanceE2ETest`) against OpenRouter's Anthropic messages endpoint
(`https://openrouter.ai/api/v1/messages`, model `anthropic/claude-sonnet-5.5`) — two turns
over the real product path (`AnthropicProvider.createChat`):

```
turn 1 (write): cacheCreate=4958  cacheRead=0     input=35  answer='READY'
turn 2 (read):  cacheCreate=17   cacheRead=4958  input=35  answer='WOMBAT'
```

- **Shape accepted:** trailing `{role:"system"}` messages pass through. The 35
  uncached `input` tokens per turn are exactly the dynamic tail — it remains outside
  the cache.
- **History written once, then read:** the full turn-1 prefix is read despite
  mutated tail (4,958 = 4,958), the rewrite requirement per turn is the new
  17 tokens. Exactly the difference from the old layout: with the mutating block in
  `system`, its change invalidates the message cache, and Turn 2 would be ~0.
- **Tail reaches the model:** the relocated context variable (Project codename) is
  in the answer of Turn 2.

Observed during acceptance (specifically for §5.0): imperative instructions in the tail are
suspected by the model as prompt injection ("answer X when asked Y" next to the
user message) and ignored; neutral facts run unhindered. And hybrid reasoning
models think by default — output caps must account for thinking tokens (64-token cap
→ 64 thinking tokens, empty response).

**Pending:**

- Beta header cross-check for `ttl: "1h"` (§3) — Gateways accept `ttl`, whether Anthropic still
  needs the Beta header is not visible through this.
- Repetition against the pure Anthropic API: strong indication, not the final proof —
  the Gateway normalizes requests. Pin provider routing to `anthropic` so the
  call does not go through Bedrock/Vertex (different cache management).

The test reads the key from `OPENROUTER_API_KEY` or `confidential/openrouter-key.txt`,
model/URL are overrideable via `VANCE_OPENROUTER_MODEL`/`VANCE_OPENROUTER_BASE_URL` —
and it remains `manual` because it is model-dependent (only models with `mid-conversation-system`
use the tail layout; otherwise the mapper demotes and assertions measure the wrong thing).

## 11. Interface to Other Topics

- **Arthur Plan Mode** (`arthur-engine.md`): TodoList and Mode Indicator belong in the dynamic block (positions 5–7 in §5). Plan Mode System Prompts (`arthur-prompt-exploring.md`, `arthur-prompt-planning.md`) remain static, cache applies.
- **Eddie Triage** (`eddie-engine.md`): Working Memory block lands in the dynamic block (position 5).
- **Reactive Compaction** (future): Compaction changes the Chat History. Without a History marker, the cache is not affected (everything behind the marker); with `SYSTEM_AND_TOOLS_AND_TAIL`, the History hit dies on rewrite and is rewritten in the next turn (§5.0, accepted).
- **Recipes** (`recipes.md`): Recipe property `disableCache: true` is the Recipe escape; see §8.
- **LLM Resource Management** (`llm-resource-management.md`): Per-call Provider selection is orthogonal to caching — for each `AiChat`, the Cache Boundary is decided once during build and remains fixed for all calls of that instance.

---

## 12. Reference

- Anthropic Prompt Caching: https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching
- Anthropic Java SDK: https://github.com/anthropics/anthropic-sdk-java
- Implementation: `vance-brain/src/main/java/de/mhus/vance/brain/ai/anthropic/`
- Trace Schema: `vance-shared/src/main/java/de/mhus/vance/shared/llmtrace/LlmTraceDocument.java`
