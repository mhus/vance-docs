---
title: "Vance — `how_do_i` Discovery Tool"
parent: Documentation
permalink: /docs/how-do-i
---

<!-- AUTO-GENERATED from specification/public/en/how-do-i.md — do not edit here. -->

---
# Vance — `how_do_i` Discovery Tool

> A Discovery Tool that allows Engines, when uncertain about the correct procedure, to provide a natural language intent description to an internal `DiscoveryService`. The service uses a Recipe (`how-do-i`) as a config layer (model alias + Pebble template), calls the LLM **directly** (no Process spawn), and passes the full Source Catalog (all Engine Manuals + Skills + Tool Descriptions) via the Pebble variable `&#123;{ sources }}`.
>
> Purpose: Prompt scaling. Instead of mentioning a Manual hook in the Engine Prompt for every new capability, the Prompt gets **a single** Discovery line — O(1) in the Prompt footprint, regardless of how many Manuals/Skills/Tools exist.
>
> See also: [prompts-and-manuals](/docs/prompts-and-manuals) | [skills](/docs/skills) | [recipes](/docs/recipes) | [prompt-caching](/docs/prompt-caching) | [jeltz-engine](/docs/jeltz-engine)

---

## 1. Purpose & Scope

**Problem.** With every new capability, the Engine Prompt grows by a Manual hook. This works for 15 Manuals. With 50+, the pattern collapses in three areas: token cost per turn (linear), attention dilution in the LLM, and maintainability (drift between Prompt hooks and actual Manuals).

**Solution.** A tool called by the Caller LLM when it is unsure how to do something. The tool internally calls a `DiscoveryService` that uses the `how-do-i` Recipe as a config layer (model, Pebble template) and calls the LLM **directly** (Jeltz-style single-shot call with schema validation loop — **no** Process spawn, **no** Lane lock). The Worker LLM sees the full Source Catalog in the Prompt (via `&#123;{ sources }}`) and responds with the appropriate match in one of three JSON shapes. The Caller Prompt contains only **one** line about it (plus the negation trap from [prompts-and-manuals §4](/docs/prompts-and-manuals#regel-3-anti-pattern--negation-explizit-abfangen)).

**What it is not:**
- Not a replacement for `manual_read('name')` — these tools remain primitives for direct lookup when the Manual name is already known.
- Not a RAG endpoint for Project Documents — see [rag](/docs/rag). Discovery is for **capability knowledge**, not user content.
- Not a Recipe selector for `DELEGATE` decisions — Recipe selection remains in the Engine code (`RecipeResolver`). Recipes are **not** indexed in v1.

### 1a. `DISCOVER` Action vs. `how_do_i` Tool (Two Entry Points, One Backend)

Discovery currently has **two entry points**, both running on the same `DiscoveryService`:

| Entry Point | When | Where Defined |
|---|---|---|
| `DISCOVER` Action (`type: "DISCOVER"`, `intent: …`) | **User mentions a term the Engine doesn't know** — Vance jargon, Kit feature, invented word, ambiguous metaphor. Top-level decision: "before I even build an answer, I need to look it up". | `ArthurActionSchema.TYPE_DISCOVER` / `EddieActionSchema.TYPE_DISCOVER` |
| `how_do_i` Tool | **Engine knows the term but wants to validate a detail** — e.g., check fence syntax before the first fence block, or confirm the Kind's schema before `doc_create`. Mid-turn tool call, not a separate Action Type. | `tools/discovery/HowDoITool.java` |

**Engine Lifecycle for DISCOVER (continuing action):** LLM emits `arthur_action(type=DISCOVER, intent=…)`; Engine calls `DiscoveryService.discover(intent)` synchronously, formats the result as JSON (same shape as `how_do_i`: `loaded` / `alternatives` / `hint`), returns it as a Tool Result to the Action loop. The next iteration sees the result and selects the actual Action (ANSWER / DELEGATE / ASK_USER / …).

**Why two paths?** Structural separation in the model prompt. The `DISCOVER` Action forces the LLM to answer "do I know this or not?" as the **first** question, before even reaching the tool-picking phase. The tool remains for in-flight refinement. Benchmark `HowDoIReflexBenchmark` validates: 1/5 → 4/5 after the introduction of DISCOVER.

---

## 2. API

```
Tool: how_do_i

Parameters:
  intent  string, required. One-sentence description of what you
                            want to do, in natural language.
                            Example: "show the user a picture from
                            a web search result". Max 500 chars.

Returns (parsed from the DiscoveryService's structured LLM reply):
  {
    intent: "show the user a picture from a web search result",
    loaded: {                                      // confident match
      type: "manual" | "skill" | "tool",
      name: "embed-images",
      source: "engine" | "skill-bundled" | "project" | "user",
      summary: "How to show a picture in chat.",
      content: "<full manual body>"               // type:manual only,
                                                  // server-side loaded
    } | null,
    alternatives: [                                // ambiguous
      { type: "manual", name: "embed-overview",
        source: "engine",
        summary: "Routing index for embedding visual content",
        score: 0.71 }
    ],
    hint: null   // or "no match — be more specific" when nothing fits
  }

  Two-stage server-side contract:
  - LLM picks a pointer (`type` + `name` + optional `summary`).
  - DiscoveryService validates the name against the catalog and,
    for `loaded` + `type:manual`, loads `manuals/<name>.md` via the
    document cascade and inlines the body as `loaded.content`.
  - Hallucinated names (or names that resolve in the catalog but
    fail to load from disk) trigger a retry — up to 3 attempts —
    with a correction note that lists the bad picks. After the
    budget is exhausted the response degrades to a `hint`.

  Alternatives carry name + summary only; the caller picks one and
  calls `manual_read('<name>')` itself.

Errors:
  CatalogUnavailable      — Source-catalog snapshot not yet built
                            (early boot). Caller retry or fall back
                            to manual_list/manual_read.
  LlmCallFailed           — Underlying LLM call errored (provider 5xx,
                            quota exhausted, etc.). Surface the
                            provider's error message.
  SchemaValidationFailed  — LLM reply did not match the expected JSON
                            shape after maxAttempts retries.
  InvalidIntent           — Intent is empty or longer than 500 chars.
```

---

## 3. Sources of Truth — What Goes into the Catalog (v1)

Three sources, all pre-computable per Tenant:

| Source | What Goes into the Catalog | Update Trigger |
|---|---|---|
| **Engine Manuals** (`vance-defaults/manuals/*.md` + Sub-Folder) | **Summary Card**: H1-Title + Front-Matter-`triggers` + Front-Matter-`summary` (Fallback: first paragraph after H1, truncated to ~400 characters) | Spring-Boot-Start (idempotent via Content-Hash); Document-Save-Hook for Tenant-/Project-Overrides |
| **Skill Definitions** (`SKILL.md` from Kits) | `title` + `description` + `triggers.keywords` + `promptExtension` (truncated to ~150 characters) | Kit-Install/Update |
| **Tool Descriptions** (`@Component`-Tools) | `name()` + `description()` from Java code | Spring-Boot-Start |

**Manual Header Convention** (optional, no YAML — see [prompts-and-manuals §3](/docs/prompts-and-manuals#3-manual-anatomie)):

```markdown
---
triggers: image, picture, screenshot, Bild
summary: How to show a picture in chat.
requires-tools: image_generate, doc_create
---
# Embedding — Images

<full body — only shown by manual_read, not in the catalog>
```

- `triggers` is a comma-separated keyword list, multilingual where appropriate. Helps the Discovery LLM find the Manual via keyword match.
- `summary` is a single-line description that ends up in the Catalog as a Description block. If missing, the builder falls back to the first prose paragraph after the H1 (truncated to ~400 characters).
- **`requires-tools`** is a comma-separated list of Tool names. If set, the `DiscoveryService` hides the Manual from the Catalog if **any** of the tools are not in the calling Worker's Engine Allow Set — the LLM then only sees Manuals whose prerequisites it can actually fulfill. Missing = no condition. Implementation: `CatalogFilter.filter(snapshot, allowedTools)` in the 5-arg `discover(intent, tenantId, projectId, processId, allowedTools)` path; the 4-arg path remains unchanged (no filter).
- Manuals without a header still work — only Title + First-Paragraph end up in the Catalog. The header is an additive enrichment, not mandatory.

**Allow-Set Filter for Tools:** Tool entries in the Catalog are also filtered against the Allow Set in the 5-arg `discover` path. Each Tool entry trivially "requires" itself — if the Tool name is not in the Allow Set, the entry is removed from the Catalog provided to the LLM. This ensures `how_do_i` never suggests a Tool that the calling Worker cannot invoke. Skill entries always remain (they have their own activation mechanism).

**What v1 does NOT index (intentionally):**

- Recipes — selection remains programmatic (`RecipeResolver`). This would be a duplicate path.
- RAG Documents (Project content) — a different subsystem with different cache semantics.
- Memory Learnings — not yet in production.
- Workflow Snippets (Vogon Strategies etc.) — coming in v2 when the inventory grows.

**Catalog Format** (Markdown, consumable by the Worker):

```markdown
## Manuals

### embed-overview

**Title:** Embedding — Overview
**Triggers:** embed, embedding, einbetten, render, show, surface, …
**Summary:** Routing index for showing visual / structured content.

### embed-images

**Title:** Embedding — Images
**Triggers:** image, picture, photo, screenshot, Bild, Foto, …
**Summary:** How to show a picture in chat — external URLs, project
Documents, or image_search results.

…

## Skills

### synthesis
**Triggers:** synthesis, synthese, aggregate, zusammenführen, …

The user has gathered material — sources, notes, quotes, data —
and needs to turn it into one coherent thing. …

…

## Tools

### web_search
Search the web for information about a topic. Returns titles,
URLs, and snippets. …

### document_link
Build a Markdown link to a Document. Resolves path, kind, project. …

…
```

The Worker receives this block as `&#123;{ sources }}` via Pebble in the Prompt — see §4.

---

## 4. Backend — DiscoveryService on LightLlmService

No Process spawn. Discovery is the **first consumer** of the central [`LightLlmService`](/docs/light-llm-service) — a Recipe-config-driven single-shot caller with a Jeltz-style schema loop. This makes the `DiscoveryService` a thin wrapper.

**Path per call:**

```
how_do_i(intent)
  → DiscoveryService.discover(intent, ctx)
       1. load catalog snapshot for tenant (cached, hash-invalidated)
       2. lightLlm.callForJson(LightLlmRequest{
            recipeName:  "how-do-i",
            userPrompt:  intent,
            pebbleVars:  { intent, sources },
            schema:      DISCOVERY_SCHEMA,
            ctx:         ctx
          })
       3. cross-check returned `name` against catalog (anti-hallucination)
       4. return structured result
```

The `LightLlmService` handles: Recipe resolution, Pebble rendering, ChatModel build with fallbacks, schema loop. `DiscoveryService` provides **only** what is Discovery-specific: Catalog rendering and name cross-check against hallucinations.

**Recipe `how-do-i.yaml`:**

```yaml
title: How Do I — Discovery
description: |
  Configuration profile for the DiscoveryService. Defines the model
  alias, prompt template, and schema retry budget. Not spawned as a
  worker — the service calls ChatModel directly with these settings.
engine: jeltz                    # documentary only — not actually spawned;
                                  # signals "single-shot schema-validated call"
params:
  model: default:fast
  maxAttempts: 3                  # schema-retry budget
promptPrefix: |
  You are the Discovery component of Vance. The caller's LLM has an
  intent it needs to resolve — point it to the right capability
  (manual, skill, or tool) from the catalog below.

  Available capabilities:

  &#123;{ sources }}

  Caller's intent (verbatim):

  > &#123;{ intent }}

  Respond with **one** of these JSON shapes:

  - When you're confident about a single match (the catalog
    contains a clear best fit):

    {
      "loaded": {
        "type": "manual",
        "name": "embed-images",
        "source": "engine",
        "content": "<full content of that capability — copy verbatim from the catalog above>"
      }
    }

  - When two or three could fit and the caller should decide:

    {
      "alternatives": [
        { "type": "manual", "name": "embed-overview", "source": "engine",
          "summary": "Routing index for embedding visual content", "score": 0.7 },
        { "type": "tool", "name": "image_search", "source": "engine",
          "summary": "Search the web for images …", "score": 0.6 }
      ]
    }

  - When nothing in the catalog matches:

    {
      "hint": "no match — describe more concretely, or call manual_list"
    }

  Rules:
  - Do not invent capability names not in the catalog.
  - Prefer the manual that directly addresses the intent over a
    related tool or skill.
  - Scores are your subjective confidence (0–1). Be honest.
  - Respond with exactly one JSON object. No prose, no markdown
    fences, no commentary outside the JSON.
```

**Service Sketch (Java):**

```java
@Service
@RequiredArgsConstructor
public class DiscoveryService {
    private final SourceCatalogService catalogService;
    private final LightLlmService lightLlm;

    public Map<String, Object> discover(String intent, ToolInvocationContext ctx) {
        String catalog = catalogService.renderForTenant(ctx.tenantId());

        Map<String, Object> raw = lightLlm.callForJson(
            LightLlmRequest.builder()
                .recipeName("how-do-i")
                .userPrompt(intent)
                .pebbleVars(Map.of("intent", intent, "sources", catalog))
                .schema(DISCOVERY_SCHEMA)
                .ctx(ctx)
                .build());

        return crossCheckAgainstCatalog(raw, catalog);
    }
}
```

Everything not Discovery-specific resides in `LightLlmService` — see [light-llm-service](/docs/light-llm-service) for details.

**Engine field in Recipe** is for documentation only — the service does not spawn anything. We set `engine: jeltz` as a signal *"single-shot, schema-validated call"*; the field could also be named `engine: discovery-service`. The important thing is that the Recipe is not accidentally picked by the standard spawn path (for this, the Recipe is **not** listed in the public Recipe Catalog anyway, but marked as an internal config profile — detail in §9).

**Pebble Render Context.** The `PromptTemplateRenderer` (see `recipes.md` §5) receives **two** additional variables for this path:

- `intent` — the caller's unchanged intent string.
- `sources` — the rendered Catalog Markdown block.

The other standard render variables (`tier`/`model`/`provider`/`mode`/…) remain available.

---

## 5. Return Mode

The LLM responds with **one of the three JSON shapes** (see Recipe Prompt). `DiscoveryService` parses, validates against `DISCOVERY_SCHEMA`, checks capability names against the Catalog, and — for `loaded` + `type: manual` — loads the Manual body server-side. Final states:

| LLM Output | Server Behavior | Tool Response (Caller Sees) |
|---|---|---|
| `{ "loaded": { name, type:manual, summary } }` with valid name | `documentService.lookupCascade("manuals/<name>.md")` → Body in `loaded.content` | `{ loaded: { …, content: "<body>" }, alternatives: [], hint: null }` |
| `{ "loaded": { name, type:skill\|tool } }` | No auto-load (no on-disk body), pointer passed through | `{ loaded: { name, type, summary }, alternatives: [], hint: null }` |
| `{ "alternatives": [ … ] }` | Unknown names discarded, rest passed through | `{ loaded: null, alternatives: […], hint: null }` |
| `{ "hint": "…" }` | Passed through directly | `{ loaded: null, alternatives: [], hint: "…" }` |
| `loaded.name` not in Catalog **or** Cascade lookup empty | **Retry** — new LLM call with Correction variable (`&#123;{ correction }}`) up to `MAX_DISCOVERY_ATTEMPTS = 3` | After exhausted attempts: `{ hint: "Discovery couldn't resolve a usable manual after 3 attempts. Bad picks: …" }` |

Caller processes:
- `loaded` with `content` (type:manual) → **use directly**, no further Tool call. Backend has already loaded the body.
- `loaded` without `content` (type:skill/tool) → use the respective skill/tool API.
- `alternatives` → select one (by `summary`/`score`), then `manual_read(name)` for the body.
- `hint` set → adjust intent or `manual_list()` as a last-resort enumeration.

**Why full text inline despite Summary Card Catalog?** Clean separation: the **LLM** only sees Summary Cards (Catalog remains small, token-efficient, ~5 KB), the **server code** loads the body from the same Document Cascade that the Catalog summarized. This means:

- Catalog scales (LLM sees O(KB) instead of O(MB) with 100+ Manuals).
- No hallucination risk for the body — server path is deterministic, no LLM token generation of content.
- Happy path remains 1 Tool call (`how_do_i` → done).
- Anti-hallucination retry loop secures ID selection against LLM invention of names.

**Confidence heuristic** lies in the LLM, not in a score table. Advantage: context-sensitive (e.g., if the Manual directly addresses the intent, confidence is higher than for a distant match).

---

## 6. Source Catalog — Storage & Lifecycle

**v1 (current state): In-Memory Cache.** `SourceCatalogService` holds a `CatalogSnapshot` per `(tenantId, projectId)` key in a process-local `ConcurrentHashMap`. Lazily built on the first `renderForTenant` call, it remains warm until `invalidate(tenantId)` or `invalidateAll()`. Sufficient for single-pod deployments.

```java
public record CatalogSnapshot(String markdown, String contentHash) {}
```

**Build Behavior:**

| Trigger | Action |
|---|---|
| First call per Tenant/Project | `SourceCatalogBuilder.build(tenantId, projectId)` renders Manuals (via `DocumentService.listByPrefixCascade("manuals/")`) + Skills (via `SkillResolver.listAvailable`) + Tools (all Spring `@Component` Tool Beans, only `primary()`). Sorted alphabetically → stable hash. |
| Subsequent call | Cache hit, no rebuild. |
| Manual invalidation | `invalidate(tenantId)` via code call — Document-Save-Hook is not yet wired. |

**v2 (planned): Mongo Persistence.** When Vance runs multi-pod, the local cache layer will be supplemented by a `DiscoveryCatalogDocument`-Mongo-Collection as a shared source of truth:

```java
@Document("discovery_catalog")
class DiscoveryCatalogDocument {
    @Id String tenantId;
    String markdown;
    String contentHash;
    Map<String, String> sourceHashes;
    Instant updatedAt;
}
```

Plus Document-Save-Hook on `manuals/`-Cascade and Kit-Install-Events for automatic invalidation.

**Snapshot Size:** Per Tenant, depending on content, ~5–15 KB Markdown. With 200 Manuals + 50 Skills + 100 Tools, the snapshot would be ~50 KB — still uncritical for Mongo and for Prompt caching.

---

## 7. Prompt Convention in the Caller Prompt

The tool exists **in parallel** to `manual_read`/`manual_list`. No migration of existing hooks in v1 (spec decision 2026-05-26).

Recommended hook line in the Engine Prompt — **one** compact section:

```markdown
## When you're not sure how to do something

Before saying "I cannot X" or guessing — ask the system:

  how_do_i('<one-sentence description of what you want to do>')

The tool returns one of three shapes:
- `loaded` — confident single match. For `type:manual` the body is
  **already inlined** as `loaded.content` (server-side load). Use
  the content directly; no follow-up `manual_read` needed.
- `alternatives` — ranked candidates (`name` + `summary` + `score`).
  Pick one and call `manual_read('<name>')` for the body.
- `hint` — no match; refine the intent.

**Never claim something is impossible** without calling
`how_do_i` first. The system often knows more than your training
data does.
```

Hooks for **Hot-Path Topics** with known failure modes (e.g., `embed-*`) **remain** additionally in the Prompt — rationale: the negation trap (*"Never say 'I cannot show images' without …"*) is topic-specific and not replaceable by generic `how_do_i`.

---

## 8. Failure Modes

| Situation | Behavior |
|---|---|
| Intent empty / >500 characters | `InvalidIntent` |
| Catalog snapshot not yet ready (boot in progress) | `CatalogUnavailable`, Tool Description advises retry-in-30s or `manual_list` as fallback |
| LLM call fails (Provider 5xx, Timeout, Quota) | `LlmCallFailed` with Provider reason; standard resilient layer (fallback models from Recipe) intervenes beforehand |
| LLM responds unparseable (no valid JSON) | Schema validator loop: Correction message appended, retry up to `maxAttempts`. On repeated failure: `SchemaValidationFailed` |
| LLM invents capability names | `DiscoveryService` cross-checks the returned `name` against the Catalog. On mismatch, a new LLM iteration is performed with a `&#123;{ correction }}` Pebble variable that lists previous failed attempts — up to `MAX_DISCOVERY_ATTEMPTS = 3`. Afterwards, `hint` with a list of failed attempts. |
| `loaded.name` is in Catalog header, but `manuals/<name>.md` cannot be loaded (Catalog/Filesystem drift) | Same retry loop as for hallucination — the name ends up in the `badPicks` buffer, next iteration gets the correction. |
| LLM still provides a `content` field | Ignored by `DiscoveryService`. `content` is exclusively populated server-side by `documentService.lookupCascade`. |

**Trust Signal:** the Tool Response contains `source` (engine/tenant/project) — the Caller can identify where the information comes from.

---

## 9. Settings

**v1 (current state):** Discovery-specific settings are intentionally minimal — Recipe name + schema retry are controlled via the `LightLlmService` cascade `lightllm.*`; a Tenant override of the Discovery Recipe is currently possible via the Document Cascade (`_vance/recipes/how-do-i.yaml`), not via a separate setting.

- `DiscoveryService.DEFAULT_RECIPE_NAME = "how-do-i"` (hardcoded constant).
- Schema retry runs via `LightLlmRequest.maxAttempts` (3) or `lightllm.maxAttempts.default`.
- Master switch is the global `lightllm.enabled`.

**v2 (planned): own `discovery.*` namespace,** cascade Project → Tenant → System-Default:

| Key | Type | Default | Status | Meaning |
|---|---|---|---|---|
| `discovery.enabled` | bool | true | v2 | Discovery-specific switch (in addition to `lightllm.enabled`) |
| `discovery.recipe` | string | `how-do-i` | v2 | Tenant override of the Recipe name (currently via Document Cascade) |
| `discovery.catalog.maxBytes` | int | 60_000 | v2 | Hard limit for Catalog size — truncation heuristic if exceeded |
| `discovery.maxAttempts` | int | 3 | v2 | Discovery-specific override of `lightllm` defaults |

The `how-do-i` Recipe is marked as an **internal config profile** with `internal: true`. This means it is not listed in the public Recipe Catalog of the selector and cannot be accidentally spawned via `process_create(recipe="how-do_i")`. Recipe-specific settings (model, prompt, fallback models) go through the standard Recipe system.

---

## 10. Relationship to `manual_list` / `manual_read`

| Tool | Use Case | When to Use |
|---|---|---|
| `manual_list()` | Enumeration of all Manuals in Scope | Rarely — debug or general overview |
| `manual_read(name)` | Direct lookup with known name | If the Prompt hook explicitly names it, or `how_do_i` recommended a name (via `alternatives`) |
| `how_do_i(intent)` | Semantic search when uncertain | Default path for "how do I do X" |

`how_do_i` is not mandatory — if the LLM already has the Manual name (via Prompt hook), it directly calls `manual_read`. `how_do_i` is the entry point for *new* or *uncertain* intents.

---

## 11. Cost Model

**Per call (without cache, Summary Card Catalog):**

- Catalog: ~1–3 K Tokens as input. Cache creation surcharge ~25%.
- Intent + Recipe boilerplate: ~300 Tokens.
- LLM output: 50–200 Tokens (`{ loaded: { name, summary } }` or `{ alternatives: [...] }`).
- Latency: ~400–1200 ms depending on the model. No spawn/lane overhead, because direct `ChatModel.chat` call.

**Plus per successful case one `manual_read('<name>')`:** ~500–3000 Tokens for the actual Manual body. Thus, the total hop path is two Tool calls, but only loads the **one** truly needed body, not all 30 Manuals in the Discovery Catalog.

**Per call with Anthropic Prompt Cache Hit (within 5 min TTL):**

- Catalog: ~10% of standard price (cache read).
- Intent + Output: full price.
- Effective token cost: ~500–1000 Tokens-equivalent for the Discovery call.

**Comparison to the old full-text Catalog (before 2026-05-28):**

| | Full-Text Catalog | Summary-Card Catalog |
|---|---|---|
| Catalog Tokens | 5–15 K (scales with Manual count) | 1–3 K (scales linearly, slower) |
| Discovery Output | up to 2000 Tokens (`content` inline) | 50–200 Tokens (name + summary only) |
| Hops on Match | 1 | 2 (how_do_i → manual_read) |
| Cache Invalidations | every Manual edit invalidates everything | only edits to Manual frontmatter or first paragraph affect the hash |
| Routing Accuracy | decreases with Manual count (attention dilution) | consistently higher (curated Triggers + Summary) |

**Index Build Costs:** once on boot/source edit. Per snapshot, a single string render — no LLM call.

**Index Build Costs:** once on boot/source edit. Per snapshot, a single string render — no LLM call.

---

## 12. Phased Rollout

**Prerequisite:** [`LightLlmService`](/docs/light-llm-service) from L1–L4 in production. ✓

| Phase | Result | Status |
|---|---|---|
| **D1** | `CatalogSnapshot` + `SourceCatalogBuilder` + `SourceCatalogService.renderForTenant`. **In-memory** Cache (Mongo persistence in v2). | Completed 2026-05-26 — 13 tests green |
| **D2** | Recipe `how-do-i.yaml` as internal config profile (`internal: true`), Pebble render context extended with `intent` + `sources` | Completed |
| **D3** | `DiscoveryService` as @Service: Catalog render + `LightLlmService.callForJson` + name cross-check against hallucinations | Completed — 10 tests green |
| **D4** | `HowDoITool` as @Component, thin wrapper around `DiscoveryService.discover`. **Note:** Constructor uses `@Lazy DiscoveryService` — otherwise `DiscoveryService → SourceCatalogService → Builder → List<Tool> → HowDoITool → DiscoveryService` would create a Bean cycle during Spring startup. The Lazy proxy is only resolved on the first `invoke()`. | Completed — 9 tests green |
| **D5** | Prompt hook in Arthur Prompt (parallel to existing hooks). E2E test `HowDoIDiscoveryAiTest` in `qa/ai-test/`: 4 realistic intents + Catalog sanity + garbage intent. | Completed — 6/6 green against Gemini-2.5-flash |
| **D5.1** | **Summary-Card Refactor 2026-05-28:** `SourceCatalogBuilder` renders per Manual only Title + Frontmatter-`triggers` + Frontmatter-`summary` (Fallback: first paragraph). 22 Routing Manuals have Frontmatter convention. Caller Prompts (Arthur/Eddie/Ford) updated. Catalog ~150 KB → ~5 KB. | Completed — 46 tests green |
| **D5.2** | **Server-Side Auto-Load + Retry-Loop 2026-05-28:** Despite Summary-Card Catalog, the tool delivers the body inline for `loaded` + `type: manual` — `DiscoveryService` directly calls `documentService.lookupCascade("manuals/<name>.md")` and populates `loaded.content`. In case of hallucination (name not in Catalog OR Cascade lookup empty), a retry occurs with `&#123;{ correction }}` Pebble variable, up to 3 attempts. Caller gets 1-hop behavior as before, without the LLM trusting body generation. | Completed — 32 tests green |
| **D6** *(v2)* | RAG Documents as source (selective snippet extraction, not full docs). | Open |
| **D7** *(v2+)* | Mongo-persisted `DiscoveryCatalogDocument` with Document-Save-Hook (see §6). Settings namespace `discovery.*` (see §9). | Open, low priority (single-pod works) |
| **D8** *(v2+)* | Migration: replace existing `manual_read` hooks in the Prompt with `how_do_i`, as long as no negation trap is needed. One PR per Engine. | Open |

---

## 13. Open Questions (for later)

- **Multi-Tenant Cache Sharing:** If 100 Tenants have identical bundled defaults, a shared Catalog snapshot is worthwhile. Currently separate per Tenant — storage trivial, so not a priority.
- **Discovery for Wizards/Workflows:** Should Vance Wizards and saved Workflows be additional Catalog sources?
- **Per-User-Catalog:** Should the Catalog know user memory sources? Clarify privacy boundaries.
- **Catalog Size vs. Selective Inclusion:** If Catalog >60 KB, Manuals must be selectively included (e.g., by Tenant frequency). Heuristic then needed.
- **Catalog Sync between Pods:** In multi-pod deployment — rebuild per pod (idempotent) or shared Mongo snapshot? Probably shared (one source of truth).

---

## Status

**v1 in production since 2026-05-26.** Spec decisions:

- v1 Sources: Engine Manuals + Skills + Tools (not Recipes, not RAG).
- Parallel coexistence with `manual_read` hooks; no Prompt migration in v1.
- **Backend is a `DiscoveryService`** that uses the central `LightLlmService` (Recipe `how-do-i` as config profile, `ChatModel` call with Jeltz-style schema loop) — **no** Process spawn.
- **Source Catalog is injected into the System Prompt via Pebble variable `&#123;{ sources }}`** — **Summary Cards** (Title + Triggers + Summary), no full texts. LLM picks only names. **Server loads** the Manual body on confident `loaded` match via `documentService.lookupCascade` and inlines it into `loaded.content` — 1-hop for the happy path. Anti-hallucination retry loop with `&#123;{ correction }}` up to 3 attempts (as of 2026-05-28).
- Pure Recipe-Config path, no Embedding quickpath.
- v1 Cache is in-memory (`ConcurrentHashMap`); Mongo persistence v2.
- v1 Settings minimal (`lightllm.*` suffice); own `discovery.*` namespace v2.
