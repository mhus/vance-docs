---
title: "Vancetope — Prompt Caching"
parent: Specs
permalink: /specs/prompt-caching
---

<!-- AUTO-GENERATED from specification/public/en/prompt-caching.md — do not edit here. -->

---
# Vancetope — Prompt Caching

> Anthropic prompt caching for the `vance-brain` LLM layer. Goal: 60–85% token cost reduction for medium to long Sessions, without Engines (Eddie, Arthur, Ford, Marvin, …) having to modify their code.
>
> Implementation in the **Provider Layer** (`vance-brain/ai/anthropic/`) — engine-agnostic and transparent. Other Providers (Gemini, Embedding) currently ignore the cache configuration.
>
> See also: [llm-resource-management](/specs/llm-resource-management) | [recipes](/specs/recipes) | java-cli-modulstruktur | [arthur-engine](/specs/arthur-engine)

---

## 1. Terminology

| Term | Definition |
|---|---|
| **Cache Marker** | `cache_control: { type: "ephemeral" }` on a block in the Anthropic request. Anthropic caches **everything before and including** this block as a prefix. |
| **Cache Boundary** | Vancetope-internal Enum (`CacheBoundary`) that specifies **where** in the Request the marker is placed (`SYSTEM_AND_TOOLS` is default). |
| **Cache Hit** | Subsequent call with an identical prefix hash. Anthropic charges `cache_read_input_tokens` — ~10% of the standard price. |
| **Cache Creation** | First call of a prefix. Anthropic charges `cache_creation_input_tokens` — ~125% of the standard price. |
| **TTL** | Cache Time-To-Live. 5min (default, no extra charge) or 1h (~2× write-cost, beta header required). |

**Cache Mechanics (Anthropic):**

- Up to 4 Cache Markers per Request.
- Cache key = full prefix up to the marker. Bit-identity required — a changed whitespace breaks the hit.
- Markers are placed on the **last** system block / **last** Tool; all preceding blocks automatically end up in the same cache entry.
- Cache content: `system` blocks, Tool definitions, potentially Message content blocks. The cached prefix ends where the marker is placed.

---

## 2. CacheBoundary — where the marker sits

Three levels, in `de.mhus.vance.brain.ai.CacheBoundary`:

| Value | Marker on | When useful |
|---|---|---|
| `NONE` | nowhere | Debugging / cache-unfriendly Sessions / global kill switch |
| `SYSTEM` | last System block | Tools change frequently (Skills / Mode filters), only System Prompt should cache |
| `SYSTEM_AND_TOOLS` | last System block **and** last Tool definition | **Default** — the economic sweet spot |

`CacheBoundary` is a field on [`AiChatOptions`](../vance/vance-brain/src/main/java/de/mhus/vance/brain/ai/AiChatOptions.java). Default `SYSTEM_AND_TOOLS`. Engines can override via builder:

```java
AiChatOptions opts = AiChatOptions.builder()
    .cacheBoundary(CacheBoundary.SYSTEM)   // tools left dynamic
    .build();
```

`FULL` (marker also after Skills block) is named in the plan but **not** in the code — Skills are typically <500 tokens today, the additional marker saves little. If this becomes a hot spot, the Enum can be extended.

---

## 3. CacheTtl — how long the cache lives

| Value | Anthropic Behavior | Beta Header |
|---|---|---|
| `DEFAULT_5MIN` | TTL 5 minutes — Default, no extra charge | — |
| `LONG_1H` | TTL 60 minutes — write costs ~2× | `anthropic-beta: extended-cache-ttl-2025-04-11` |

The `AnthropicProvider` automatically sets the Beta header if `cacheTtl == LONG_1H`. The `cache_control` object also gets `ttl: "1h"`.

**Default: 5min for all Recipes.** Recipes that should use 1h TTL must be in a Tenant allowlist — Setting `ai.cacheTtl.long`, Cascade `process → project → _tenant`, comma-separated Recipe names. Example: `analyze,deep-research`. `EngineChatFactory.applyDefaults` reads the setting and sets `cacheTtl=LONG_1H` if the Process's Recipe name is in the list and caching has not been disabled via `disableCache`/`vance.ai.cache.enabled`.

---

## 4. Provider Behavior

### 4.1 AnthropicProvider — direct SDK path

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

`langchain4j-anthropic` has been removed from the POM — `langchain4j-core` (ChatModel interfaces, ChatRequest, ToolSpecification) remains. Engines continue to interact with the langchain4j interface; the Direct Adapter is invisible to them.

### 4.2 GeminiProvider — `cacheBoundary` ignored

Gemini has its own caching API (`cachedContents.create`), structurally different. v1: `GeminiProvider` silently ignores `cacheBoundary`. Extension is a separate step — TODO in code.

### 4.3 Embedding Provider — no caching

Caching makes no sense for Embeddings. `cacheBoundary` is ignored.

---

## 5. System Prompt Layout — Mandatory Convention

For caching to work, **static** content must be at the top and **dynamic** content at the bottom. The layout convention for each Engine:

```
┌─────────────────────────────────────────────────────────┐
│ [1] Engine Default System Prompt              STATIC    │
│     (e.g., arthur-prompt.md from Cascade)               │
├─────────────────────────────────────────────────────────┤
│ [2] Recipe-promptOverride / promptPrefix      STATIC    │
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

**Recipe-promptOverride** must be constant. Recipes with dynamic content in `promptPrefix` (e.g., "current Project inventory", "weather") must move the dynamic part into a separate block that is located after the marker.

### 5a. Multiple System Blocks and `SystemBlockKind`

Engines emit multiple `SystemMessage` blocks — the `AnthropicRequestMapper` lifts them all into Anthropic's top-level `system` array. Where the Cache Marker lands is controlled by the **last STATIC block**:

| Engine Pattern | Marker Placement |
|---|---|
| All blocks `STATIC` (= Default for `SystemMessage.from(...)`) | On the last block — corresponds to "classic" behavior |
| `STATIC` … `STATIC` … `DYNAMIC` … `DYNAMIC` | On the last `STATIC` — dynamic tail outside the cache hash |
| All blocks `DYNAMIC` | No System Marker (Tools Marker remains independent depending on `CacheBoundary`) |

Engines explicitly mark dynamic blocks using the wrapper class:

```java
// static prefix — will be cached
messages.add(SystemMessage.from(staticPrompt));
messages.add(SystemMessage.from(skillsBlock));
//   ────── Cache Marker lands here ──────
// dynamic tail — turn-specific, behind the cache
messages.add(VanceSystemMessage.dynamic(workingMemory));
messages.add(VanceSystemMessage.dynamic(planTodos));
```

`SystemBlockKind.STATIC` is default — Engines that have not been migrated remain backwards-compatible (a `SystemMessage`, marker on it, as before).

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

Three of the listed blocks are **conditional** and entirely absent in some turns: the Date Block, if the Recipe sets `promptDateGranularity: none` (§5b); the Client Env Block, as long as no CLIENT Work Target connection is bound — i.e., in all headless and Web turns (`PromptEnvironmentBlock`); the Scratchpad Block, as long as the Process has not created any Slots (§5c). All three are DYNAMIC, so their appearance and disappearance does not break the static prefix.

---

## 5b. Current Date Block

Engines can provide the current date directly in the Prompt to the LLM, instead of fetching it via a `current_time` Tool call — for longer Sessions, this saves one round trip per turn. The block is rendered as a **DYNAMIC** SystemMessage and is therefore cache-neutral: it sits behind the `cache_control` marker (Anthropic) and does not break the stable prefix.

**Position in layout:** directly at the first DYNAMIC block, i.e., before all other turn-volatile System content (Memory blocks, Plan Mode TodoList, ARCHIVED_CHAT summaries).

**Granularity — tier-aware by default.** The helper `PromptDateBlock.resolve(paramValue, tier)` renders one of three granularities:

| Value | Format | Cache Lifetime |
|---|---|---|
| `NONE` | (Block is skipped) | — |
| `DAY` | `Current date: 2026-06-24` | 24h |
| `HOUR` | `Current date: 2026-06-24 14h UTC` or `+02:00` | 1h |

**Control via Recipe param `promptDateGranularity`:**

| Param Value | Behavior |
|---|---|
| (not set) | `auto` — same as `auto` value below |
| `auto`, `true` | Tier-based: `SMALL` → `DAY`, `LARGE` → `HOUR`, Tier-unset → `DAY` |
| `none`, `off`, `false` | Block is suppressed |
| `day`, `date` | Force DAY |
| `hour` | Force HOUR |
| (unknown value) | Falls back to `auto` — a Recipe typo does not silently disable the feature |

**Default is `auto`** — all Engines provide the block until a Recipe explicitly sets `none`. To disable the feature for trim-token Recipes (e.g., Slart-/LightLlm-Helper), set `params.promptDateGranularity: none`.

**Timezone — the user's, not the server's.** The block is rendered in the **display timezone of the Process owner**, not the server JVM zone. This affects both: for `HOUR`, the appended offset (`14h +05:30`), and for `DAY`, the day boundary (a user in `Asia/Kolkata` sees their local date, not the UTC date). `14h` alone would be ambiguous — hence always the zone offset; UTC is output as `UTC` (instead of the ISO letter `Z`), other zones as an offset (`+02:00`, `-05:00`).

The zone comes from the `TimezoneResolver` (Setting `display.timezone`, Cascade User → Tenant → `UTC`-fallback — see [settings-system](/specs/settings-system)). The `PromptDateContextResolver` lifts `Process → Session → userId` for this purpose and is **headless-proof**: the scheduler stamps `session.userId = runAs`, so that even Auto-Wakeup/Scheduler turns without an open client connection resolve the correct zone. Only if the user (and the Tenant) have not set a zone does the block fall back to `UTC`.

The same `display.timezone` is also the default zone of the `current_time` Tool: without an explicit `zone` parameter, it responds in the user's zone instead of UTC.

**Code paths:**

- Helper: [`PromptDateBlock`](../../vance/vance-brain/src/main/java/de/mhus/vance/brain/prompt/PromptDateBlock.java) — `resolve(...)`, `render(...)`, `appendDynamicMessage(...)`.
- Zone Lift: [`PromptDateContextResolver`](../../vance/vance-brain/src/main/java/de/mhus/vance/brain/context/PromptDateContextResolver.java) (`brain/context`) → [`TimezoneResolver`](../../vance/vance-shared/src/main/java/de/mhus/vance/shared/settings/TimezoneResolver.java) (`vance-shared`).
- Constant: `PromptDateBlock.RECIPE_PARAM` (`"promptDateGranularity"`), Setting key `TimezoneResolver.Keys.DISPLAY_TIMEZONE` (`"display.timezone"`).
- Tests: `PromptDateBlockTest`, `TimezoneResolverTest`, `CurrentTimeToolTest`.

Trillian (Control + User) did not have ModelCatalog access before this migration — it was injected as part of the Date integration, so that `tier` is also available there in the Pebble context and for auto-granularity.

---

## 5c. Scratchpad Block

Slots created by the Process via `scratchpad_set` are available as a **DYNAMIC** block in the Prompt (`ScratchpadPromptBlock` + `ScratchpadPromptContributor`) — otherwise, the model would have to guess a title it assigned 30 turns earlier. Slot contents change per turn, so the block sits behind the `cache_control` marker, like the Date Block.

**Empty inventory renders nothing.** This is the condition for the block to run on all six Engines: the `scratchpad_*` Tools are non-primary but not locked, so an unconditional block would cost budget in every turn of every Engine. This is intentionally different from the Plan Mode TodoList (§9.2), which renders an invitation if the list is empty.

**Bounded by construction:** single-line slots ≤200 characters inline, everything else as a size hint (`- \`findings\` — 1240 chars, read with \`scratchpad_get('findings')\``), total block ≤2000 characters; what no longer fits is indicated by count instead of silently disappearing.

**Slot text is untrusted.** An Engine may park an excerpt of a fetched page in the Slot — text that arrived correctly wrapped in the *User* role as a Tool result. If rendered unwrapped, it would become *System* text from the next turn. The Slot list is therefore in an `UntrustedContent.wrap` block (`<scratchpad-notes>`), titles are whitespace-collapsed (a newline in the title could otherwise open a heading at the beginning of a line), and content with any line terminator is never rendered inline.

**Order trap.** The marker sits on the **last STATIC** block, and `buildSystemBlocks` collects System Messages from the **entire** Message list — even those that appear after the History. An untagged `SystemMessage.from(...)` after the Dynamic blocks would therefore pull them into the cached prefix, where any change breaks it. Two places were heading towards this and have been fixed: Ford appended the `ARCHIVED_CHAT` summaries after the Dynamic blocks (now before), and Trillian's `toLangchain` now renders Chat Log lines with `ChatRole.SYSTEM` — written by `MemoryCompactionService` — as DYNAMIC.

Scope boundary v1: the lookup is process-bound — Slots of a terminated Process do not appear in any block. See `planning/scratchpad-review.md` §7.

---

## 6. Tool Schema Stability

Tools are cached, so order and schema must be bit-identical. `AnthropicRequestMapper.buildTools()` sorts the Tool list **alphabetically by name** before JSON construction:

```java
List<ToolSpecification> sorted = new ArrayList<>(raw);
sorted.sort(Comparator.comparing(ToolSpecification::name));
```

Engines that assemble Tool lists from `Map`/`Set` previously had no sorting guarantee — same Tools, different order → different cache hash. Centralized sorting in the mapper eliminates this race condition.

JSON schemas of individual Tools are mapped from langchain4j's `JsonSchemaElement` trees — strictly deterministic (`LinkedHashMap` for property order, sorted `required` list).

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

`LlmTraceDocument` (Mongo) has two new fields:

| Field | Type | Assignment |
|---|---|---|
| `cacheCreationInputTokens` | `Integer?` | from `AnthropicTokenUsage`, only OUTPUT rows, only cache-aware Provider |
| `cacheReadInputTokens` | `Integer?` | ditto |

`LlmTraceRecorder.recordResponse(...)` sets both fields via `instanceof` check. Other Providers leave them `null`.

These fields are the data basis for a future Insights Dashboard (Cache Hit Rate per Tenant/Project/Engine as a KPI).

---

## 8. Cache Disable — three levels

| Level | Where | When |
|---|---|---|
| **Per-Call** | `AiChatOptions.cacheBoundary = NONE` | Engine sets itself, e.g., debugging |
| **Per-Recipe** | YAML `params.disableCache: true` | Individual Recipe is cache-unfriendly |
| **Global** | `application.yml` → `vance.ai.cache.enabled: false` | Operator kill switch (Dev / Compliance / Provider Issue) |

**Evaluation order:**

1. Engine builds `AiChatOptions` with desired Boundary (Default `SYSTEM_AND_TOOLS`).
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
- `AnthropicResponseMapperTest`
  - Text-only-Response → `AiMessage` with text
  - Tool-use-Response → `AiMessage` with `ToolExecutionRequest`
  - Cache counters correctly extracted from `_additionalProperties`
  - `stop_reason: tool_use` → `FinishReason.TOOL_EXECUTION`

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

### 10.1 1h-TTL-Allowlist (✅ implemented)

Setting `ai.cacheTtl.long` (Cascade `process → project → _tenant`),
comma-separated Recipe names. `EngineChatFactory.applyDefaults` sets
`cacheTtl=LONG_1H` if the Process's Recipe name is in the
allowlist. Only applies if caching has not been disabled via
`vance.ai.cache.enabled=false` or `params.disableCache=true`. Default empty = all Recipes to 5min.

### 10.2 Recipe Audit for Layout Convention (✅ completed)

Audit + migration of Engines (Arthur, Eddie) to `SystemBlockKind`-
based multiple blocks has been completed — see §5a.

### 10.3 Sub-Agent Cache Inheritance

When `process_create_delegate` spawns a new Process with its own System Prompt — it does **not** inherit the parent's cache. This is a design decision: hierarchical Agents (Eddie → Arthur → Ford) have their own Personas, cache inheritance would be complicated. v1: do not implement.

### 10.4 Insights Dashboard (✅ Backend implemented)

Cache tokens are persisted on `LlmTraceDocument`
(`cacheCreationInputTokens`, `cacheReadInputTokens`). Per-Process-
Aggregation:

```
GET /brain/{tenant}/admin/processes/{processId}/cache-stats
→ CacheStatsDto { roundTrips, inputTokens, outputTokens,
                  cacheCreationInputTokens, cacheReadInputTokens,
                  hitRate }
```

`hitRate = cacheReadInputTokens / (inputTokens + cacheCreation + cacheRead)`,
fraction in [0.0, 1.0].

Aggregation in `LlmTraceService.cacheStatsByProcess` as a pure-Java-
walk (TTL-bounded Collection, typically < 100 Trace rows per Process).
Tenant-/Session-Scope aggregations would be Mongo `$group` pipelines —
will come when demand materializes. Frontend dashboard for displaying
stats is open (UI effort separate).

### 10.5 langchain4j-Upstream-PR

Optionally long-term: PR to `langchain4j-anthropic` that exposes the Cache Marker. Would remove our double dependency. Not relevant today — the Direct Adapter works and is closer to the SDK stream.

---

## 11. Interface to Other Topics

- **Arthur Plan Mode** (`arthur-engine.md`): TodoList and Mode Indicator belong in the dynamic block (positions 5–7 in §5). Plan Mode System Prompts (`arthur-prompt-exploring.md`, `arthur-prompt-planning.md`) remain static, cache applies.
- **Eddie Triage** (`eddie-engine.md`): Working Memory Block lands in the dynamic block (position 5).
- **Reactive Compaction** (future): Compaction changes the Chat History → hash behind the marker changes → cache not affected (History is behind the marker).
- **Recipes** (`recipes.md`): Recipe property `disableCache: true` is the Recipe escape; see §8.
- **LLM Resource Management** (`llm-resource-management.md`): Per-Call Provider selection is orthogonal to caching — for each `AiChat`, the Cache Boundary is decided once during build and remains fixed for all calls of that instance.

---

## 12. Reference

- Anthropic Prompt Caching: https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching
- Anthropic Java SDK: https://github.com/anthropics/anthropic-sdk-java
- Implementation: `vance-brain/src/main/java/de/mhus/vance/brain/ai/anthropic/`
- Trace Schema: `vance-shared/src/main/java/de/mhus/vance/shared/llmtrace/LlmTraceDocument.java`
