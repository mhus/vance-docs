---
title: "Vancetope — Zarniwoop Service (Research / Search Provider System)"
parent: Specs
permalink: /specs/zarniwoop-service
---

<!-- AUTO-GENERATED from specification/public/en/zarniwoop-service.md — do not edit here. -->

---
# Vancetope — Zarniwoop Service (Research / Search Provider System)

> Persona: **Zarniwoop** (*The Hitchhiker's Guide to the Galaxy*) — the Imperial employee who has an electronic model of the universe in his office. If someone wants to know something, they don't ask the universe directly — they ask Zarniwoop, and he knows which sub-index is responsible.
>
> Zarniwoop is Vancetope's **Research/Search Provider System**: a central dispatcher, a pluggable Protocol SPI, a project-bound Factory, and a thin LLM tool layer over multiple provider backends (Serper, Wikipedia, OpenAlex, arXiv, PubMed, OpenLibrary, HackerNews). One tool schema per task, one Modality param axis, no hard provider coupling in the LLM contract.
>
> See also: [agrajag-engine](/specs/agrajag-engine) | [light-llm-service](/specs/light-llm-service) | [recipes](/specs/recipes) | [tool-availability](/specs/tool-availability) | [addon-system](/specs/addon-system)

---

## 1. Purpose & Scope

**Problem.** Without a central layer, each search modality (Web, Image, Video, PDF, Academic, Encyclopedia, Books, News) requires its own hard-wired tool with its own setting key, result form, and quota check. Provider failure = total modality failure; new provider = new tool + new LLM schema + new migration PR.

**Solution.** Zarniwoop separates three layers:

1. **`SearchProtocol`-SPI** — one Spring bean per wire format (Serper-JSON, Wikipedia-REST, arXiv-Atom, OpenAlex-JSON, PubMed-E-utilities, …). Knowledge implementation of the adapter.
2. **`SearchProviderInstance`** — a concrete URL + credentials + endpoint settings, instantiated by the `SearchProviderFactory` from the `research.endpoint.<id>.*` settings. Multiple instances of the same protocol are allowed (`serper-main`, `serper-eu`).
3. **`ZarniwoopService`** — the single dispatcher entry point. Resolves candidate cascade for `(scope, modality, tier)`, dispatches, catches hard failures and passes them to `AgrajagChecker` for cooldown setting.

The frontend surface consists of five LLM tools (see §6) that work with Modality parameters. The schema remains stable with new providers — add-ons bring `SearchProtocol` beans, not new tools.

**What Zarniwoop is not:**

- **Not a URL loader.** [`web_fetch`](/specs/server-tools) remains orthogonal — Zarniwoop delivers hit lists, fetch loads content.
- **Not its own Engine.** Single-shot tool calls, no `ThinkProcess` lifecycle, no Lane lock. Built like [Fenchurch](/specs/fenchurch-service) / [Fook](/specs/fook-service): Spring `@Service` + Tool adapter.
- **Not a RAG index owner.** A `LocalIndexProtocol` could implement the SPI and access the RAG stack; Zarniwoop only bundles selection + dispatch.
- **No LLM-based re-ranking per hit.** This is optionally handled by the `ZarniwoopResearchService` (see §7) as a curated pipeline — not the dispatcher itself.

---

## 2. Architecture Overview

```
                            ┌─────────────────────────┐
   LLM ──tool-call────────► │ research_search /       │
                            │ research_search_expert /│
                            │ research_rich /         │
                            │ research_investigate /  │
                            │ research_providers      │
                            └────────────┬────────────┘
                                         │
                                         ▼
                            ┌─────────────────────────┐
                            │ ZarniwoopService        │
                            │ (dispatch, gating,      │
                            │  Agrajag-Cooldown)      │
                            └────────────┬────────────┘
                                         │
                            ┌────────────┴────────────┐
                            │ SearchProviderFactory   │
                            │ (per-project cache,     │
                            │  ProjectStop-Eviction)  │
                            └────────────┬────────────┘
                                         │
       ┌──────────────────┬──────────────┼──────────────┬──────────────┐
       ▼                  ▼              ▼              ▼              ▼
  SerperProtocol    WikipediaProtocol  OpenAlex...  PubMed...     arXiv...
  (Web/Img/Vid/PDF) (Encyclopedia)     (Academic)   (Academic)    (Academic)
```

**Involved Classes** (all in `vance-brain` package `de.mhus.vance.brain.zarniwoop`):

| Class | Responsibility |
|---|---|
| `ZarniwoopService` | Single-shot dispatcher. Resolves instance cascade for `(scope, modality, tier)`, calls `search()` on the instance, catches Throwables and passes them to `AgrajagChecker` (cooldown). |
| `ZarniwoopResearchService` | Curated multi-source pipeline. Calls Plan Recipe → parallel searches → Evaluate Recipe → Ranking. Backend of the `research_investigate` tool. |
| `ZarniwoopGateService` | Pre-dispatch gate. Reads `research.endpoint.<id>.enabled`, checks cooldown via `ToolHealthService`, checks quota status. Hard-disabled endpoints are removed before the call. |
| `ZarniwoopContentStore` | On-demand loader for hits with `ContentInline.STASH_ON_DEMAND`. Loads body via `loadContent()` of the instance, persists in the project's `workspaceService`-temp-root. |
| `ZarniwoopInsightsService` | Hits → Knowledge Graph Insights (see [knowledge-graph](/specs/knowledge-graph)). Optional, activated by `research_investigate`. |
| `ZarniwoopUsageCounter` | Persistent recording of provider calls per instance/modality, MongoDB collection `research_call_records`. Feeds `QuotaStatus`. |
| `QuotaCache` | In-memory TTL cache for `QuotaStatus` responses. Avoids per-call quota polling at the provider. |
| `SearchProviderFactory` | Builds concrete `SearchProviderInstance` objects per project from `research.endpoint.*` settings, caches (Caffeine, 5min TTL), cleans up on `ProjectEnginesStopRequested` event. |
| `ZarniwoopSettings` | Setting key constants (`PREFIX_ENDPOINT`, `cooldownSubject(...)`, …). A single source of truth for Factory, Dispatcher, Tools. |
| `ZarniwoopException` | RuntimeException for hard failures within the service layer. |

---

## 3. Lifecycle & Scope

**Provider instances are project-bound.** Cache key is `(tenantId, projectId)`. Calling without project scope → `ZarniwoopException("research tools require a project scope")`. This ensures:

- Lifetime is tied to the `ProjectLifecycle`. If the project is suspended (`ProjectEnginesStopRequested` event), all instances are evicted from the cache, `dispose()` is called on each.
- Loaded bytes (PDFs, HTMLs, image bins via `ZarniwoopContentStore`) land in the project's `workspaceService`-temp-root. `workspaceService.suspendAll(...)` automatically cleans this up on suspend.
- Duplicate instances across projects (Project A and B both using `serper-main`) are consciously accepted. Each has its own quota cache, own cooldown, own workspace. No reference counting.

**Setting Cascade.** Endpoint definitions can live at any level (Tenant, Project, Process). `SettingService.findByPrefixCascade(...)` resolves them — the innermost level wins per key. Recommendation: Endpoints are set tenant-wide (`_tenant`), per-project overrides only in exceptional cases (e.g., `_user_*` project disables expensive providers).

---

## 4. Search Contract

Data types live in `vance-toolpack`, package `de.mhus.vance.toolpack.research`:

### 4.1 `SearchRequest`

```java
record SearchRequest(
    String query,                  // Free text, required
    SearchModality modality,       // ACADEMIC, WEB, …, required
    SearchTier tier,               // NORMAL | EXPERT, required
    int maxResults,                // > 0
    @Nullable Locale locale,
    @Nullable String pinnedProviderId,    // EXPERT-only: instance-pin
    Map<String,Object> expertParams       // site, filetype, dateFrom, …
)
```

### 4.2 `SearchModality` (enum, v1 fixed)

`WEB`, `IMAGE`, `VIDEO`, `PDF`, `NEWS`, `ACADEMIC`, `ENCYCLOPEDIA`, `BOOK`, `MAP`, `CODE`, `INTERNAL_DOC`, `RAG`. New modalities require a PR — silent addition via add-on is intentionally not allowed, as tool schemas explicitly enumerate the values.

### 4.3 `SearchTier`

| Tier | Behavior |
|---|---|
| `NORMAL` | Standard dispatch. Cascade over all activated instances of the modality, first OK response wins. |
| `EXPERT` | Extended filters (`expertParams`). If `pinnedProviderId` is set: no cascade, exactly this instance or empty. |

### 4.4 `SearchResult` & `SearchHit`

```java
record SearchResult(
    String query, SearchModality modality, String providerInstanceId,
    SearchTier tier,
    List<SearchHit> hits,
    int returnedCount, int droppedCount,
    @Nullable String note, @Nullable String errorMessage,
    Map<String,String> upstreamHeaders
)

record SearchHit(
    String title, String url,
    @Nullable String snippet, @Nullable String source,
    SearchModality modality,
    @Nullable ContentReference content,    // EMBED_TEXT / STASH_ON_DEMAND
    Map<String,Object> extras              // per-modality additions
)
```

`ContentReference` with `ContentInline.EMBED_TEXT` carries short bodies inline (abstracts, Wiki lead snippets). `STASH_ON_DEMAND` marks bodies that the `ZarniwoopContentStore` loads lazily via `SearchProviderInstance.loadContent(...)`.

### 4.5 `SearchProtocol` (SPI)

```java
interface SearchProtocol {
    String id();                                    // "serper", "pubmed", …
    String displayName();
    Set<SearchModality> modalitiesSupported();
    Set<SearchTier> tiersSupported();
    SearchProviderInstance instantiate(ProviderInstanceConfig cfg);
}
```

`ProviderInstanceConfig` carries `instanceId`, `protocolId`, `baseUrl`, `credentialKey`, and `extras` (all setting suffixes beyond the four basic fields).

### 4.6 `SearchProviderInstance`

```java
interface SearchProviderInstance {
    String id(); String displayName();
    Set<SearchModality> modalities();
    Set<SearchDomain> domains();              // WEB / ACADEMIC / NEWS / …
    Set<SearchTier> tiers();
    ProviderAvailability availability(SearchScope);
    Optional<QuotaStatus> currentQuota(SearchScope);
    @Nullable String statusText(SearchScope); // default null
    String promptHint();                       // default ""
    SearchResult search(SearchRequest, SearchScope);
    default LoadedContent loadContent(ContentReference, SearchScope);
    default void dispose();
}
```

`promptHint()` is the Markdown description that the Plan Recipe renderer injects into the source catalog — *"PubMed indexes biomedical literature…"*. Add-on providers provide their own hint.

---

## 5. Built-in Provider Catalog

The `vance-brain` default bundle includes these protocols:

| Protocol ID | Class | Modalities | Key required? | Description |
|---|---|---|---|---|
| `serper` | `SerperProtocol` | WEB, IMAGE, VIDEO, PDF, NEWS | **yes** (`X-API-KEY`) | Commercial Google SERP provider. Free tier 2,500 calls/month. Serves the four multi-media modalities from a single source. |
| `wikipedia` | `WikipediaProtocol` | ENCYCLOPEDIA, WEB (fallback) | no | REST API. One language per Tenant (setting `baseUrl` with `de.wikipedia.org` / `en.wikipedia.org`). Lead snippets inline. |
| `openalex` | `OpenAlexProtocol` | ACADEMIC | no | Scholarly Works, 250M+ Papers. Polite pool via `contactEmail`. Abstracts inline (inverse-index reconstruction). |
| `arxiv` | `ArxivProtocol` | ACADEMIC | no | Atom XML API. STEM preprints. Abstracts inline. |
| `pubmed` | `PubMedProtocol` | ACADEMIC | no (optional API key for 10 req/s) | NCBI E-utilities, two-call flow (esearch → esummary). MEDLINE biomedicine. Abstracts v2 (efetch). |
| `openlibrary` | `OpenLibraryProtocol` | BOOK | no | Internet Archive book index. |
| `hackernews` | `HackerNewsProtocol` | NEWS, WEB (secondary) | no | Algolia HN Search API. Tech news + discussions. |

Routing note: With multiple ACADEMIC instances (OpenAlex + arXiv + PubMed active simultaneously), the `ZarniwoopResearchService` decides via the Plan Recipe which source has affinity to the specific question — the `ZarniwoopService` dispatcher alone cascades strictly in the defined order.

**Add-on Protocols.** Any other `@Component` beans that implement `SearchProtocol` are collected by the `SearchProviderFactory` at boot (Constructor `List<SearchProtocol>`). Add-ons do not require intervention in `vance-brain` — they bring their protocol and their setting form extension.

---

## 6. LLM Tools

Five tools, common `research_` prefix. All run via the `ZarniwoopService` dispatcher; Modality is a parameter, not a tool axis.

| Tool | What it does | When to use |
|---|---|---|
| `research_search` | Standard hit list for `(query, modality)`. `tier=NORMAL`. | First contact with a question — the LLM doesn't know the provider, wants to see hits. |
| `research_search_expert` | Extended filters (`site`, `filetype`, `dateFrom`, `dateTo`, `domain`, optional `pinnedProviderId`). `tier=EXPERT`. | Targeted deepening: "only arxiv.org", "only 2024-2026", "only PDFs". |
| `research_rich` | Mixed-modality pass: WEB + IMAGE + VIDEO + NEWS in one call, one query. | "What's available for X" — the LLM wants visual context + web in one step. |
| `research_investigate` | Curated Pipeline (see §7). Plan Recipe → multi-source-search → Evaluate Recipe → RankedHitSet. | Deep research questions where hit filtering is valuable — biomed reviews, cross-discipline synthesis. |
| `research_providers` | Read-only: lists all instances in the current Project Scope plus Availability, Quota Status, Cooldown State. | LLM can check what's available before searching. UI uses it for provider overview. |

Tool schemas in `vance-toolpack` are modality-agnostic — a new Modality comes as a new enum value, not a new tool.

---

## 7. Curated Research Pipeline (`ZarniwoopResearchService`)

Three-phase pipeline behind `research_investigate`:

### Phase 1 — Plan

`LightLlmService.callForJson(...)` with Recipe `zarniwoop-research-plan`. Input: free-text question + available providers (rendered as Pebble variable `&#123;{ providers }}` from the `promptHint()` strings). Response:

```json
{
  "searches": [
    {"query": "…", "modality": "ACADEMIC", "sourceAffinity": {"openalex": 1.0, "pubmed": 1.4}},
    {"query": "…", "modality": "WEB", "sourceAffinity": {"serper-main": 1.0}}
  ],
  "rationale": "…"
}
```

Plan Recipe is `internal: true` (see [light-llm-service §3](/specs/light-llm-service)) — no spawn path, only LightLlm API.

### Phase 2 — Multi-Source-Search

Parallel `ZarniwoopService.search(...)` calls (own `ExecutorService`), one `CompletableFuture` per plan entry. Hits are deduplicated (URL-normalized) with their source (`providerInstanceId`) and plan affinity in a `Map<HitKey, HitWithKey>`.

### Phase 3 — Evaluate

`LightLlmService.callForJson(...)` with Recipe `zarniwoop-research-evaluate`. Input: the deduplicated hits + original question. Response per hit:

```json
{
  "verdicts": [
    {"key": "…", "verdict": "keep|drop", "relevanceScore": 0.0..1.0, "reason": "…"}
  ]
}
```

Final score = `relevanceScore × sourceAffinity` (plan output). Survivors are sorted, dropped hits are returned separately as `DroppedHit` (with reason — important for audit + LLM explanation).

### v1 Gaps (intentional)

`RankedHitSet.refineDepth = 0` marks two reserved extension points:

- **Deepen.** No per-hit content fetch. Evaluate Recipe sees Title + Snippet + Source and decides without body dive.
- **Refine.** No second query wave. Plan produces one wave; if results are sparse, the caller (or end-user) decides whether to refine.

Both gaps are additively extensible without contract changes.

---

## 8. Settings

All keys belong to the `research.*` namespace. Constants in `ZarniwoopSettings.java`.

### 8.1 Endpoint Definitions

`research.endpoint.<id>.<suffix>` per provider instance. `<id>` is freely selectable (`serper-main`, `serper-eu`, `pubmed`, `wiki-de`, `home-searxng`).

| Suffix | Type | Required | Meaning |
|---|---|---|---|
| `.protocol` | string | **yes** | Protocol ID — must match a `SearchProtocol` bean. Without `.protocol`, the endpoint is ignored by the `SearchProviderFactory`. |
| `.baseUrl` | string | dependent | Provider-specific endpoint. Default falls back internally to the protocol (e.g., PubMed → `https://eutils.ncbi.nlm.nih.gov/entrez/eutils`). |
| `.apiKey` | password | dependent | Credential setting key. Serper: required. PubMed: optional (lifts rate limit 3→10 req/s). |
| `.enabled` | bool | no | Missing value = `true`. `false` keeps the instance in the cache, but `ZarniwoopGateService` rejects dispatches. |
| any others | string | no | Passed as `extras` to `instantiate(ProviderInstanceConfig)`. Examples: `contactEmail` (OpenAlex, PubMed), `userAgent`, etc. |

### 8.2 Routing Defaults

| Key | Meaning |
|---|---|
| `research.default.<modality>` | Default provider instance ID that the dispatcher tries first (lower-case modality). E.g., `research.default.academic = openalex`. |
| `research.fallback.<modality>` | Comma-separated list of fallback instances. E.g., `research.fallback.academic = pubmed,arxiv`. |

Without explicit routing settings, the dispatcher uses the order from `SearchProviderFactory.assemble(scope)` (insertion order of settings).

### 8.3 Service-wide Knobs

| Key | Default | Meaning |
|---|---|---|
| `research.quota.cache.ttlMinutes` | 5 | `QuotaCache` TTL per provider instance/modality. |
| `research.factory.cache.ttlMinutes` | 5 | `SearchProviderFactory` cache TTL before a re-build from settings occurs. |
| `research.log.retentionDays` | 30 | Retention period for the `research_call_records` audit log. |

### 8.4 Setting Form

UI configuration runs via `_vance/setting_forms/research.yaml`. For each built-in protocol, there is a `<provider>Enabled` toggle + protocol-specific fields (`apiKey`, `baseUrl`, `contactEmail`). The `.protocol` pinning is written in the `settings` block (with `writeIf` gate), so deactivation atomically removes the endpoint from the factory output.

Add-on protocols bring their setting form extension (Doc-Layer-Merge, see [setting-forms](/specs/setting-forms)).

---

## 9. Failure Handling & Cooldowns

Zarniwoop has **no own cooldown mechanism**. Hard failures are passed to `AgrajagChecker`, which writes a cooldown entry via `ToolHealthService`:

```
Subject:    research:<providerInstanceId>:<modality>
Scope:      PROJECT
Source:     Throwable (Provider-specific classification in AgrajagChecker)
```

This has two important properties:

1. **Modality-isolated.** An Image-429 from `serper-main` does not cut off web searches from the same instance.
2. **Instance-isolated.** A failure of `serper-main` does not cut off `serper-eu`.

During an active cooldown, `ZarniwoopGateService` skips the instance, and the dispatcher falls through the cascade.

### 9.1 ProviderAvailability Steps

| `ProviderAvailability` | What Dispatcher does |
|---|---|
| `READY` | Call. |
| `EXHAUSTED` (Quota empty) | Skip, without new cooldown — quota status is periodically revalidated via `QuotaCache`. |
| `COOLDOWN` (`AgrajagChecker` active) | Skip until cooldown ends. |
| `DISABLED` (`enabled=false` or no `baseUrl`) | Skip permanently (until setting reload). |

### 9.2 Soft vs Hard Failure

`SearchResult.errorMessage != null` → Soft failure, no cooldown, dispatcher cascades further. (Example: PubMed is called with `modality=WEB` — soft failure, as modality is not supported.)

Throwable from `search(...)` → Hard failure, goes to Agrajag, cooldown entry.

---

## 10. Metrics

Micrometer counters and timers, all under `vance.research.*`. Tags are low-cardinality (see CLAUDE.md §Metrics) — `tenantId`/`projectId`/Mongo IDs never as a tag.

| Metric | Tags | What |
|---|---|---|
| `vance.research.dispatch` | `modality`, `tier`, `outcome` (`success`/`empty`/`error`/`disabled`/`cooldown`) | Counter of all dispatcher calls. |
| `vance.research.provider.calls` | `protocol`, `instance`, `modality`, `outcome` | Counter per provider instance call. |
| `vance.research.provider.duration` | `protocol`, `instance`, `outcome` | Timer per provider call. |
| `vance.research.curated.runs` | `outcome` (`success`/`plan_failed`/`evaluate_failed`/`empty`) | Counter over `ZarniwoopResearchService` pipeline runs. |
| `vance.research.curated.duration` | `outcome` | Timer of the Curated Pipeline (Phase 1 + Phase 2 + Phase 3 combined). |
| `vance.research.quota.lookups` | `instance`, `modality`, `source` (`cache`/`provider`) | How often quota was retrieved from cache vs. provider call. |

Scrape endpoint: `/actuator/prometheus`.

---

## 11. Audit & Usage Counter

`ZarniwoopUsageCounter` writes a line for each provider call to the MongoDB collection `research_call_records`:

```
{ tenantId, projectId, instanceId, protocol, modality, tier,
  queryHash,                  // SHA-256 of the query string, not the plaintext
  hitCount, ok, errorMessage,
  startedAt, durationMs }
```

Retention via `research.log.retentionDays`. No plaintext query in persistence (data privacy / logs are not for content). From this, `currentQuota()` (provider-specific) obtains its consumption figures for locally tracked quotas.

---

## 12. Status & Roadmap

**v1 (production).** All classes mentioned in §2 are implemented, all protocols listed in §5 are running. Setting form `_vance/setting_forms/research.yaml` covers all built-in providers. `ZarniwoopResearchService` runs behind `research_investigate`. Tests in `vance-brain/src/test/java/de/mhus/vance.brain.zarniwoop/`.

**v2 — Extension Points:**

- **Deepen.** Per-hit body fetch (`loadContent()`) as an optional step between Phase 2 and Phase 3 of the Curated Pipeline. Helps with abstracts that don't come inline (e.g., PubMed-efetch). Activation flag: `RankedHitSet.refineDepth > 0`.
- **Refine.** Second plan wave if Phase 3 delivers below threshold hits. LightLlm Recipe renders "the first hits were X, reformulate the search".
- **Re-Rank Recipe** (`research.rerank.recipe`) — generic LLM-based re-ranking as an optional phase, orthogonal to the Curated Pipeline.
- **`LocalIndexProtocol`** — Integration of the RAG stack into the SPI, so that Knowledge Base hits land in the same pipeline as Web/Academic hits.
- **Multi-language Wikipedia** — currently one language per Tenant. v2: multiple `wiki-<lang>` instances in parallel with language routing.

Order is prioritized by caller need — so far, there is no strong driver for a specific roadmap.

---

## References

- Implementation: `repos/vance/server/vance-brain/src/main/java/de/mhus/vance/brain/zarniwoop/`
- Toolpack Contract: `repos/vance/server/vance-toolpack/src/main/java/de/mhus/vance/toolpack/research/`
- Setting Form: `repos/vance/server/vance-brain/src/main/resources/vance-defaults/_vance/setting_forms/research.yaml`
- Recipes: `repos/vance/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/zarniwoop-research-plan.yaml`, `zarniwoop-research-evaluate.yaml`, `web-research.yaml`
- Tests: `repos/vance/server/vance-brain/src/test/java/de/mhus/vance/brain/zarniwoop/`
- Planning History (older, broader, partly forward-looking): `planning/zarniwoop-service.md`
