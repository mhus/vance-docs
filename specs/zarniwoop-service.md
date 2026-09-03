---
title: "Vancetope — Zarniwoop Service (Research / Search Provider System)"
parent: Specs
permalink: /specs/zarniwoop-service
---

<!-- AUTO-GENERATED from llm/specification/zarniwoop-service.md (translated from the German specification/public/zarniwoop-service.md) — do not edit here. -->

# Vancetope — Zarniwoop Service (Research / Search Provider System)

> Persona: **Zarniwoop** (*The Hitchhiker's Guide to the Galaxy*) — the Imperial employee who has an electronic model of the universe in his office. If you want to know something, you don't ask the universe directly — you ask Zarniwoop, and he knows which sub-index is responsible.
>
> Zarniwoop is Vancetope's **Research-/Search-Provider-System**: a central dispatcher, a pluggable Protocol SPI, a project-bound factory, and a thin LLM tool layer over multiple provider backends (Serper, Wikipedia, OpenAlex, arXiv, PubMed, OpenLibrary, HackerNews). One tool schema per task, one modality parameter axis, no hard provider coupling in the LLM contract.
>
> See also: [agrajag-engine](/specs/agrajag-engine) | [light-llm-service](/specs/light-llm-service) | [recipes](/specs/recipes) | [tool-availability](/specs/tool-availability) | [addon-system](/specs/addon-system)

---

## 1. Purpose & Scope

**Problem.** Without a central layer, each search modality (Web, Image, Video, PDF, Academic, Encyclopedia, Books, News) requires its own hard-wired tool with its own setting key, result form, and quota check. Provider failure = total modality failure; new provider = new tool + new LLM schema + new migration PR.

**Solution.** Zarniwoop separates three layers:

1. **`SearchProtocol`-SPI** — a Spring bean per wire format (Serper-JSON, Wikipedia-REST, arXiv-Atom, OpenAlex-JSON, PubMed-E-utilities, …). Knowledge implementation of the adapter.
2. **`SearchProviderInstance`** — a concrete URL + credentials + endpoint configuration, instantiated by the `SearchProviderFactory` from documents under `_vance/config/research/`. Multiple instances of the same protocol are allowed (`serper-main`, `serper-eu`).
3. **`ZarniwoopService`** — the single dispatcher entry point. Resolves candidate cascade for `(scope, modality, tier)`, dispatches, catches hard failures and passes them to `AgrajagChecker` for cooldown setting.

The frontend surface consists of five LLM tools (see §6) that work with modality parameters. The schema remains stable with new providers — add-ons bring `SearchProtocol` beans, not new tools.

**What Zarniwoop is not:**

- **Not a URL loader.** [`web_fetch`](/specs/server-tools) remains orthogonal — Zarniwoop delivers hit lists, fetch loads content.
- **Not its own engine.** Single-shot tool calls, no `ThinkProcess` lifecycle, no Lane-Lock. Built like [Fenchurch](/specs/fenchurch-service) / [Fook](/specs/fook-service): Spring `@Service` + Tool adapter.
- **Not a RAG index owner.** A `LocalIndexProtocol` could implement the SPI and access the RAG stack; Zarniwoop only bundles selection + dispatch.
- **No LLM-based re-ranking per hit.** This is handled by the `ZarniwoopResearchService` (see §7) optionally as a curated pipeline — not the dispatcher itself.

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
| `ZarniwoopService` | Single-shot dispatcher. Resolves instance cascade for `(scope, modality, tier)`, calls `search()` on the instance, catches Throwables and passes them to `AgrajagChecker` (Cooldown). |
| `ZarniwoopResearchService` | Curated multi-source pipeline. Calls Plan-Recipe → parallel searches → Evaluate-Recipe → Ranking. Backend of the `research_investigate` tool. |
| `ZarniwoopGateService` | Pre-dispatch gate. Reads `enabled` from the configuration document (via the factory cache, not per setting query), checks cooldown via `ToolHealthService`, checks quota status. Hard-disabled endpoints are removed before the call. |
| `ZarniwoopContentStore` | On-demand loader for hits with `ContentInline.STASH_ON_DEMAND`. Loads body via `loadContent()` of the instance, persists in the project's `workspaceService`-Temp-Root. |
| `ZarniwoopInsightsService` | Hits → Knowledge-Graph-Insights (see [knowledge-graph](/specs/knowledge-graph)). Optional, activated by `research_investigate`. |
| `ZarniwoopUsageCounter` | Persistent recording of provider calls per instance/modality, MongoDB collection `research_call_records`. Feeds `QuotaStatus`. |
| `QuotaCache` | In-memory TTL cache for `QuotaStatus` responses. Avoids per-call quota polling at the provider. |
| `SearchProviderFactory` | Builds concrete `SearchProviderInstance` objects per project from documents under `_vance/config/research/`, caches (Caffeine, 5min TTL), cleans up on `ProjectEnginesStopRequested` event. Holds parsed configs alongside instances so the gate reads them instead of settings. |
| `ZarniwoopSettings` | Setting key constants (`PREFIX_ENDPOINT`, `cooldownSubject(...)`, …). A source of truth for factory, dispatcher, tools. |
| `ZarniwoopException` | RuntimeException for hard failures within the service layer. |

---

## 3. Lifecycle & Scope

**Provider instances are project-bound.** Cache key is `(tenantId, projectId)`. Calling without project scope → `ZarniwoopException("research tools require a project scope")`. This ensures:

- Lifetime is tied to the `ProjectLifecycle`. If the project is suspended (`ProjectEnginesStopRequested` event), all instances are evicted from the cache, `dispose()` is called on each.
- Loaded bytes (PDFs, HTMLs, image bins via `ZarniwoopContentStore`) land in the project's `workspaceService`-Temp-Root. `workspaceService.suspendAll(...)` automatically cleans this up on suspend.
- Duplicate instances across projects (Project A and B both with `serper-main`) are consciously accepted. Each has its own quota cache, its own cooldown, its own workspace. No reference counting.

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
    Map<String,Object> expertParams,      // site, filetype, dateFrom, …
    Map<String,List<String>> facets       // declared dimensions, §4.1a
)
```

#### 4.1a Facets

`facets` is the **structured** filter next to the free `expertParams`, and the difference is the binding nature:

| | `expertParams` | `facets` |
|---|---|---|
| Vocabulary | source-specific, free | declared, with values and labels |
| Unknown key | the source ignores it | the **source is removed from the candidate list** |
| Tier | EXPERT only | any |

Declaration is via `SearchProviderInstance.facets()` (type `de.mhus.vance.toolpack.facet.Facet`, shared with Centauri — see `centauri-service.md` §4.3a for key convention, value systems, and the 500-item cap). Semantics: **conjunction across keys, disjunction within a key.**

**No field on the hit, and here more mandatory than with the feed.** A search has no cursor: a locally discarded hit is one that doesn't move up, from a ranking of twenty, three would remain, and you can't reload. Therefore, a provider that does not declare a chosen dimension is **skipped** instead of queried — silently delivering the unrestricted answer would be the worse half.

`OdeSearchCapabilities.facets` and `OdeSearchQuery.facets` carry the same across the Ode boundary; `GET /ode/search/facets?key=&parent=` delivers one tree level for taxonomies that are too large.

### 4.2 `SearchModality` (enum, v1 fixed)

`WEB`, `IMAGE`, `VIDEO`, `PDF`, `NEWS`, `ACADEMIC`, `ENCYCLOPEDIA`, `BOOK`, `MAP`, `CODE`, `INTERNAL_DOC`, `RAG`. New modalities require a PR — silent addition via add-on is deliberately not allowed, because tool schemas explicitly enumerate the values.

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

#### 4.4.1 The Body Channel — who reads it, and how much

Until 2026-08-19, **no one** read it: `ContentReference` appeared in the entire tree only in the contract files and in the protocols that generated it. OpenAlex and arXiv fetched the abstract, Wikipedia the article extract (with its own HTTP call per hit, budget 3) — and the tool layer discarded all of it. This has been fixed; the rule has since applied to both consumers, but with **two different limits**:

| Consumer | Field | Truncation | Rationale |
|---|---|---|---|
| LLM Tools (`research_search`, `_expert`, `_rich`) | `body` in the hit line | **1000 characters**, cut at the last word, ends with `…` | an abstract ≈ 300–500 tokens; ten academic hits would be 3–5k per search |
| Search App (REST, [app-search](/specs/app-search)) | `SearchHitView.body` | **none** | characters cost nothing in the browser |

The truncation is a **cost decision, not a technical one**: a thousand characters are enough to judge whether a paper is the right one, and that's exactly what a search result is for. The `…` is in the tool description with the note to read the URL instead of quoting a truncated body as complete — otherwise, a model would quote half a sentence as a whole.

The LLM form is created in **one** helper (`SearchHitRows.shape(hit)`), and that is the actual reason for its existence: **three** tools formed their hit line themselves, and only `research_search` passed title/snippet/source through `UntrustedContent.collapseWhitespace`. A formatting rule in three copies is how two of them end up without a hardening that the third has — and introducing a thousand-character foreign text there unprotected would have turned an impurity into a problem.

**Everything written by the provider, `extras` included, is hardened**, and the canonical fields are set **last**. Both halves count: `extras` is as foreign as the title next to it, and a provider that can put a `title`-key in `extras` would overwrite the already collapsed value with raw text — the hardening that this helper centralizes would be opt-out at the far end. Numbers and booleans pass through unchanged, all textual content through `collapseWhitespace`.

**`STASH_ON_DEMAND` is still half-wired.** `loadContent` is only implemented in `OdeSearchInstance` (§5a), **none** of the seven built-in protocols override it, and the only caller is the search app's `content` endpoint. Short bodies therefore belong inline; for Wikipedia (full text instead of snippet) and PubMed (which currently provides no abstract at all), a `loadContent` is planned.

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

`ProviderInstanceConfig` carries `instanceId`, `protocolId`, `baseUrl`, `credentialKey`, and `extras` (all setting suffixes outside the four basic fields).

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

`promptHint()` is the Markdown description that the Plan-Recipe renderer injects into the source catalog — *"PubMed indexes biomedical literature…"*. Add-on providers provide their own hint.

---

## 5. Built-in Provider Catalog

The `vance-brain` default bundle includes these protocols:

| Protocol ID | Class | Modalities | Key needed? | Description |
|---|---|---|---|---|
| `serper` | `SerperProtocol` | WEB, IMAGE, VIDEO, PDF, NEWS | **yes** (`X-API-KEY`) | Commercial Google SERP provider. Free tier 2,500 calls/month. Serves the four multi-media modalities from one source. |
| `wikipedia` | `WikipediaProtocol` | ENCYCLOPEDIA, WEB (fallback) | no | REST API. One language per Tenant (setting `baseUrl` with `de.wikipedia.org` / `en.wikipedia.org`). Lead snippets inline. |
| `openalex` | `OpenAlexProtocol` | ACADEMIC | no | Scholarly Works, 250M+ Papers. Polite-Pool via `contactEmail`. Abstracts inline (inverse-index reconstruction). |
| `arxiv` | `ArxivProtocol` | ACADEMIC | no | Atom-XML API. STEM preprints. Abstracts inline. |
| `pubmed` | `PubMedProtocol` | ACADEMIC | no (optional API key for 10 req/s) | NCBI E-utilities, two-call flow (esearch → esummary). MEDLINE biomedicine. Abstracts v2 (efetch). |
| `openlibrary` | `OpenLibraryProtocol` | BOOK | no | Internet Archive book index. |
| `hackernews` | `HackerNewsProtocol` | NEWS, WEB (secondary) | no | Algolia HN Search API. Tech news + discussions. |
| `ode` | `OdeSearchProtocol` | **source declares** | optional (Bearer) | Third-party application embedding `vance-ode-zarniwoop`. See §5a. |

Routing note: With multiple ACADEMIC instances (OpenAlex + arXiv + PubMed active simultaneously), the `ZarniwoopResearchService` decides via the Plan-Recipe which source has which affinity to the specific question — the `ZarniwoopService` dispatcher alone cascades strictly in the defined order.

**Add-on Protocols.** Any other `@Component` beans that implement `SearchProtocol` are collected by the `SearchProviderFactory` at boot (Constructor `List<SearchProtocol>`). Add-ons do not require intervention in `vance-brain` — they bring their protocol and their setting form extension.

---

## 5a. External Sources via Ode (`ode`)

An add-on protocol shifts the boundary but does not remove it: it still requires Java code in a module deployed with the Brain. The `ode` protocol removes it. A **third-party application** — company archive, news index, specialized catalog — integrates the `vance-ode-zarniwoop` library, implements an interface there, and thus becomes a search provider without Vancetope knowing it.

**Built-in, not Add-on** — the same rule as with Centauri: what is in the Brain is *the contract*. Example sources would be add-on material; `ode` is not an example source, but the door. The protocol name is deliberately the same as in Centauri's register: an operator writes `protocol: ode` in a research source document next to `protocol: ode` in a feed source document and means the same thing both times.

### 5a.1 What the Service Declares

The interesting reversal: **the instance asks what can be searched.** `OdeSearchInstance` fetches `GET {baseUrl}/capabilities` and reports the modalities, domains, and tiers declared there — the dispatcher filters on them like any other provider, without a special case in the dispatch path.

The declaration on the **protocol bean** (`modalitiesSupported()`), however, is dead metadata: it is only read by tests, and `ode` therefore declares the union of all values. This is stated in the code comment so that the next reader does not look for meaning there.

### 5a.2 The Wire Contract

| Endpoint | Purpose |
|---|---|
| `GET {baseUrl}/capabilities` | reader-independent and cacheable — what can be searched here |
| `POST {baseUrl}/search` | the search; POST due to structured `expertParams` |
| `GET {baseUrl}/content/{id}` | **optional** — body of a hit, for expensive full texts |

Three assurances, mirroring Centauri's:

1. **`capabilities` is reader-independent and cheap.** It is cached and reused for every caller; no network call per request.
2. **`search` responds in seconds, not minutes.** Zarniwoop's `search()` runs synchronously in the tool call, a human waits for the turn.
3. **An empty result is not an error.** `hits: []` with `note` is the correct answer to "nothing found"; a 5xx takes the source out of the running for minutes via the Agrajag cooldown — "no news today" would then also mean "no news tomorrow".
4. **All three endpoints must respond directly — redirects are not followed.** `Redirect.NEVER` plus `SsrfGuard.assertAllowed` before the call; a `302` appears as "returned HTTP 302" instead of a silent hop. Two reasons, and the second weighs more heavily: a followed redirect would allow the other side to direct a **reading** request into the internal network (the response is parsed into hits and streamed to a browser at `/content`), **and** it would carry the `Authorization: Bearer` header to a host chosen by the other side — a credential leak that no per-hop address check prevents. A configured API that redirects is a misconfiguration, not a variant to be served. Additionally, **every** body is capped (`SsrfGuard.capped`): the size is otherwise determined by the other end.

### 5a.3 Contractual Limits

- **`SearchModality`/`SearchDomain` remain closed** and are *mirrored* as enums on the Ode side. Reason: LLM tool schemas enumerate the values, a free-text field would break this guarantee at the other end of the line. An Ode service maps to existing ones (`LEGAL` → `INTERNAL_DOC`/`PDF`); a truly new modality is a contract change on both sides. An unknown value in the declaration is **skipped and logged**, not rejected — the two ends can be on different versions.
- **No reader identity.** No header, no field — unlike Centauri, which has a pseudonym. A search query is not a reading history; personalized search is a separate decision. To be honest: the architecture does not *prevent* it here (the instance has the scope), this is discipline. The contract therefore gets no field that someone could fill. **Not to be confused** with the `OdeCaller` on `OdeSearchQuery.caller()`: this names the *installation* whose token came in (see below), never the human whose question is being answered.
- **No `promptHint` from the source.** `SearchProviderInstance.promptHint()` is shown to the LLM; remotely written text in the system prompt is a separate question. As long as it is open, there is no field for it. What `ode` returns is a sentence that *we* build from the declaration (modalities, domains, known expert parameters).
- **Two ways to check the Bearer** — server-side, without wire changes. Either the static `apiKey` (one secret, one reader) or an `OdeAuthService` bean of the third-party application that maps the opaque token to an `OdeCaller`: multiple tokens, rotation without restart, blocking of an individual reader, and `UNAUTHENTICATED` (401) separated from `FORBIDDEN` (403). If the bean is present, `apiKey` is **no longer** read — two parallel definitions of "valid" cannot be separated later. The `OdeCaller` reaches the source on the query (and as a parameter to `content`), so a license can narrow the result; `capabilities()` must **not** depend on it, both ends cache that. Brain-side nothing changes: the token is in the `apiKey` field of the source document — as a reference (`&#123;{secret:…}}`) or as a declared literal (`{noop}…`), see §8.1.
- **`availability()` is optimistically `READY`.** A health call per search would double the requests for a signal that the search itself provides. An *unreachable* source has no word in the enum — it appears via `statusText()` in Insights, with the reason. A missing line would be read as "never configured" and send the operator to the wrong place.
- **`expertParams` are pass-through.** Which keys a source understands is on the other side of the line; `capabilities` may list them informatively (visible in Insights and in the prompt hint), nothing is validated. The structured area next to it is §4.1a. **The pass-through was long halved**: `ResearchSearchExpertTool` copied a closed list of five names, while `OdeSearchInstance` named the declared parameters to the model in the description — announced and then discarded, and silently so, because the search simply returned unfiltered. Since 2026-08-20, a generic `params` object carries them (scalars; the five named filters are written last, so that a `params.site` does not obscure the documented spelling).
- **`STASH_ON_DEMAND` is currently only half-wired.** `loadContent` is implemented in `OdeSearchInstance`, but **no Brain code calls the SPI method** — a source that stashes bodies instead of embedding them therefore sees them unread. This is a gap on our side, not in the contract; short bodies belong inline anyway (`EMBED_TEXT`).

### 5a.4 Credential and Caching

Credential according to Zarniwoop house style: read per call from the scope cascade, a rotated key works without cache rebuild. The **Capabilities** retrieval, however, has no request scope — it happens behind `modalities()`, which the dispatcher filters *before* `availability(scope)`. For this, `ProviderInstanceConfig` now carries `tenantId`/`projectId` (project scope, deliberately **without** `processId`, so that no process overrides leak into a project-wide shared instance). The five-argument constructor remains as a scope-less form for the seven protocols that do everything within a request.

The declaration is kept per instance. How long, the **source** says via its `cacheTtl` (fallback 30 min); `capsTtlSeconds` in the source document overrides both, because the operator is the one who debugs, and `0` means "read anew every time". That the contract field is read has been added — it initially had no reader, a source with `PT1M` was still held for half an hour. The way out of the cache is the existing reload in the Insights view, which discards the factory cache and thus the instance — a second cache with a second refresh button would only give an operator two things to distrust. A failed refresh **retains the last known declaration**: a source that responded a minute ago is more likely to be briefly gone than empty.

**A failed retrieval is remembered as failed** (30 s). Without this, the instance re-selects on *every* call, and the calls are not one per search: the dispatcher queries `modalities()`, `domains()`, and `tiers()` during provider selection, the Insights view again per line. Against an unreachable endpoint, each of these would cost the request timeout, and the source never entered cooldown — whoever reports "serves nothing" is skipped, not reported as defective.

---

## 6. LLM Tools

Six tools, common `research_` prefixing. All run via the `ZarniwoopService` dispatcher; modality is a parameter, not a tool axis. The first five are read-only (corpus back into the turn); `research_document` is the only **mutating** one — it persists the result (see §7a).

| Tool | What it does | When to use |
|---|---|---|
| `research_search` | Standard hit list for `(query, modality)`. `tier=NORMAL`. | First contact with a question — the LLM doesn't know the provider, wants to see hits. |
| `research_search_expert` | Extended filters (`site`, `filetype`, `dateFrom`, `dateTo`, `domain`, optional `pinnedProviderId`). `tier=EXPERT`. | Targeted deepening: "only arxiv.org", "only 2024-2026", "only PDFs". |
| `research_rich` | Mixed-modality pass: WEB + IMAGE + VIDEO + NEWS in one call, one query. | "What's available on X" — the LLM wants visual context + web in one step. |
| `research_investigate` | Curated Pipeline (see §7). Plan-Recipe → multi-source-search → Evaluate-Recipe → RankedHitSet. | Deep research questions where hit filtering is valuable — biomed reviews, cross-discipline synthesis. |
| `research_document` | Curated Pipeline **+ Synthesis + Persistence** (see §7a): writes a Markdown document, appends sources as notes, returns pointer + summary. Mutating (`CREATE`). | When the deliverable is a **document** instead of a chat response — "research X and write it down", background research, handover to sub-work. |
| `research_providers` | Read-only: lists all instances in the current Project Scope plus Availability, Quota Status, Cooldown State. | LLM may check what is available before searching. UI uses it for provider overview. |

Tool schemas in `vance-toolpack` are modality-agnostic — a new modality comes as a new enum value, not a new tool.

The hit line of the three search tools carries `title`/`url`/`snippet`/`source`, the per-modality `extras` (`imageUrl`, `doi`, `citedByCount`, `videoId`, …) and — where the source provides its own text — a truncated `body` (§4.4.1).

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

Plan-Recipe is `internal: true` (see [light-llm-service §3](/specs/light-llm-service)) — no spawn path, only LightLlm API.

### Phase 2 — Multi-Source-Search

Parallel `ZarniwoopService.search(...)` calls (dedicated `ExecutorService`), one `CompletableFuture` per plan entry. Hits are deduplicated (URL-normalized) with their source (`providerInstanceId`) and plan affinity in a `Map<HitKey, HitWithKey>`.

### Phase 3 — Evaluate

`LightLlmService.callForJson(...)` with Recipe `zarniwoop-research-evaluate`. Input: the deduplicated hits + original question. Response per hit:

```json
{
  "verdicts": [
    {"key": "…", "verdict": "keep|drop", "relevanceScore": 0.0..1.0, "reason": "…"}
  ]
}
```

Final Score = `relevanceScore × sourceAffinity` (Plan output). Survivors are sorted, droppedHits are returned separately as `DroppedHit` (with reason — important for audit + LLM explanation).

### v1 Gaps (intentional)

`RankedHitSet.refineDepth = 0` marks two reserved extension points:

- **Deepen.** No per-hit content fetch. Evaluate-Recipe sees Title + Snippet + Source and decides without body dive.
- **Refine.** No second query wave. Plan produces one wave; if the result is sparse, the caller (or end-user) decides whether to refine.

Both gaps are additively extensible without contract changes.

---

## 7a. Curated Research → Persisted Document (`research_document`)

`ResearchDocumentService` sits **one layer above** `ZarniwoopResearchService` and is a **superset** of `research_investigate`, not a second research path: it calls the same `investigate(...)`, but processes its `RankedHitSet` not in the turn, but into a persisted document.

**Distinction (the core decision).** `research_investigate` returns the corpus **into the turn** — good if the caller thinks about it inline. `research_document` returns only a **pointer + summary**; the corpus ends up in the document instead of the context window. This allows a parent process to pass the (potentially large) document and then continue working with range reads / grep + the summary, instead of keeping the entire body in context.

**Process (one call, no Process-Spawn):**

1. `investigate(question, scope, ctx)` → `RankedHitSet` (empty `keptHits` ⇒ abort with clear message, **no** empty document).
2. Synthesis via `LightLlmService.callForJson(...)` with Recipe `research-synthesize` (`internal: true`, engine `jeltz`, alias `default:research-synthesize,default:analyze`). Input: question + top hits (title/URL/snippet/relevanceNote) + `gaps` as Pebble vars. Output: `{title, body, summary, tags}`; `body` quotes sources inline as `[n]`, **without** reference list (the URLs are attached as notes).
3. `DocumentService.createText(...)` writes the document (default path `research/<slug-of-question>.md`, collision → `-N`; explicit `path` possible).
4. `setSummary(...)` stamps the summary machine-readable onto the document (cheap reuse handle for later processes).
5. For each `RankedHit`, an `addNote(...)` — source as sticky-note quote (`[Title](url) — relevanceNote`).

**Role separation in the document:** Notes = source quotes; `summary` field = abstract; `tags` = marker tag `research` + synthesizer tags + caller tags. Deliberately separated, not mixed.

**Permission.** No SYSTEM bypass: the tool resolves the project like `doc_write`, enforces `Action.CREATE` **before** the research (fail-fast, no burned tokens) and writes under the `WriteActor` authority of the caller. A caller can only create a document where they have `CREATE` permission.

**Body depth** inherits the v1 gap from §7: synthesis runs from snippet + relevanceNote, not from full texts. The **Deepen** extension point (§12) is the lever for deeper documents — orthogonal, can be retrofitted without contract changes.

Routing note for Agents: Manual `_vance/manuals/research-to-document.md` (+ cross-reference in `search-tools.md`), also discoverable via `how_do_i`.

---

## 8. Configuration

### 8.1 Endpoint Documents

**One document per provider instance:** `_vance/config/research/<id>.yaml`. **The filename is the ID** and is freely selectable (`serper-main`, `serper-eu`, `pubmed`, `wiki-de`, `home-searxng`).

The cascade is that of the `DocumentService` — Project → `_tenant` → Classpath, innermost wins, and **holistically per path**: a project document completely replaces the identically named `_tenant` document, it is not merged per field.

```yaml
# _vance/config/research/serper-main.yaml
protocol: serper
baseUrl: https://google.serper.dev
apiKey: "&#123;{secret:research.serper-main.apiKey}}"
enabled: true
```

| Field | Type | Required | Meaning |
|---|---|---|---|
| `protocol` | string | **yes** | Protocol ID — must match a `SearchProtocol` bean. Without `protocol`, the source is ignored by the `SearchProviderFactory`. |
| `baseUrl` | string | dependent | Provider-specific endpoint. Default falls back protocol-internally (e.g., PubMed → `https://eutils.ncbi.nlm.nih.gov/entrez/eutils`). |
| `apiKey` | string | dependent | Credential. Serper: required. PubMed: optional (lift rate-limit 3→10 req/s). See below. |
| `enabled` | bool | no | Missing value = `true`. `false` keeps the instance in the cache, but `ZarniwoopGateService` rejects dispatches. |
| any further | free | no | Passed as `extras` to `instantiate(ProviderInstanceConfig)` — with their YAML form, a list remains a list. Examples: `contactEmail` (OpenAlex, PubMed), `capsTtlSeconds` (`ode`, §5a.4), `userAgent`. |

**The credential is not necessarily in the document.** `apiKey` takes two forms, and which one is correct is decided by the configurator:

- `"&#123;{secret:<key>}}"` — Reference to a `PASSWORD` or `HIDDEN` setting or a Vault entry. Encrypted at rest.
- `"{noop}sk-abc123"` — Declared literal. Appears in plain text in the document, thus readable by anyone with Project-READ permission and travels via WebDAV and into an export.

Resolution happens **per call** in the factory, via `resolveForConnector` (a search source is a connector, not a dynamic element) — a rotated secret takes effect without cache expiration. Protocols receive a `Supplier` in the `ProviderInstanceConfig` and no longer read settings themselves; this is why Serper's fallback to `web.serper.apiKey` has been removed (this setting continues to exist but belongs to the standalone `web_search` tools).

**Creation is via templates.** For each included protocol, there is a [Document Template](/specs/document-templates) `research-source-<protocol>`, tag `source`. It pins its target folder (`folder:`), queries only the protocol-specific fields, and writes the file to the correct location.

### 8.2 Routing Defaults

| Key | Meaning |
|---|---|
| `research.default.<modality>` | Default provider instance ID that the dispatcher tries first (lower-case modality). E.g., `research.default.academic = openalex`. |
| `research.fallback.<modality>` | Comma-separated list of fallback instances. E.g., `research.fallback.academic = pubmed,arxiv`. |

Without explicit routing settings, the dispatcher uses the order from `SearchProviderFactory.assemble(scope)`.

### 8.3 Service-wide Knobs

| Key | Default | Meaning |
|---|---|---|
| `research.quota.cache.ttlMinutes` | 5 | `QuotaCache` TTL per provider instance/modality. |
| `research.factory.cache.ttlMinutes` | 5 | `SearchProviderFactory` cache TTL before a rebuild from documents occurs. A change to a source document shortens this via `SourceConfigDocumentListener` — a `_tenant` write invalidates **all** projects of the tenant, because the configuration cascades and the cache is keyed per project. |
| `research.log.retentionDays` | 30 | Retention period of the `research_call_records` audit log. |

### 8.4 No More Setting Form

There was one (`_vance/setting_forms/research.yaml`) with eight hard-wired instance IDs and a `computed:` block per endpoint that added the `.protocol` setting. It has been **deleted**. The reason was never convenience: the ID was in the setting *key*, and the form engine only renders the *value* as a template — a form for `research.endpoint.<freely-chosen>.*` is not buildable. Hence the fixed slots, hence "others run via raw settings".

With one document per instance, the problem disappears, and the templates from §8.1 replace the form. What **remains** is the routing (§8.2): there, the key names a modality, i.e., an enum value, and that can be rendered by a form.

Add-on protocols bring their own template — it is located in the resources of the module that defines the protocol. A template without its protocol would be useless.

---

## 9. Failure Handling & Cooldowns

Zarniwoop has **no dedicated cooldown mechanism**. Hard failures are passed to `AgrajagChecker`, which writes a cooldown entry via `ToolHealthService`:

```
Subject:    research:<providerInstanceId>:<modality>
Scope:      PROJECT
Source:     Throwable (Provider-specific classification in AgrajagChecker)
```

This has two important properties:

1. **Modality-isolated.** An Image-429 from `serper-main` does not cut off web searches of the same instance.
2. **Instance-isolated.** A failure of `serper-main` does not cut off `serper-eu`.

During an active cooldown, `ZarniwoopGateService` skips the instance, and the dispatcher continues through the cascade.

### 9.1 ProviderAvailability Steps

| `ProviderAvailability` | What Dispatcher Does |
|---|---|
| `READY` | Call. |
| `EXHAUSTED` (Quota empty) | Skip, without new cooldown — quota status is periodically revalidated via `QuotaCache`. |
| `COOLDOWN` (`AgrajagChecker` active) | Skip until cooldown ends. |
| `DISABLED` (`enabled=false` or no `baseUrl`) | Skip permanently (until setting reload). |

### 9.2 Soft vs Hard Failure

`SearchResult.errorMessage != null` → Soft failure, no cooldown, dispatcher continues cascading. (Example: PubMed is called with `modality=WEB` — soft failure, as modality is not supported.)

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
| `vance.research.curated.duration` | `outcome` | Timer of the Curated Pipeline (Phase-1 + Phase-2 + Phase-3 combined). |
| `vance.research.quota.lookups` | `instance`, `modality`, `source` (`cache`/`provider`) | How often quota was fetched from cache vs. provider call. |

Scrape endpoint: `/actuator/prometheus`.

---

## 11. Audit & Usage Counter

`ZarniwoopUsageCounter` writes a line for each provider call to the MongoDB collection `research_call_records`:

```
{ tenantId, projectId, instanceId, protocol, modality, tier,
  queryHash,                  // SHA-256 of the query string, not plain text
  hitCount, ok, errorMessage,
  startedAt, durationMs }
```

Retention via `research.log.retentionDays`. No plain text query in persistence (data protection / logs are not for content). From this, `currentQuota()` (provider-specific) derives its consumption figures for locally tracked quotas.

---

## 12. Status & Roadmap

**v1 (production).** All classes mentioned in §2 are implemented, all protocols listed in §5 are running — including `ode` (§5a), whose Ode counterpart `vance-ode-zarniwoop` is in the Ode repo. Setting form `_vance/setting_forms/research.yaml` covers all built-in providers. `ZarniwoopResearchService` runs behind `research_investigate`; `ResearchDocumentService` behind `research_document` (§7a). Tests in `vance-brain/src/test/java/de/mhus/vance.brain.zarniwoop/`.

**v2 — Extension Points:**

- **Deepen.** Per-hit body fetch (`loadContent()`) as an optional step between Phase 2 and Phase 3 of the Curated Pipeline. Helps with abstracts that don't come inline (e.g., PubMed-efetch). Activation flag: `RankedHitSet.refineDepth > 0`.
- **Refine.** Second plan wave if Phase-3 delivers below threshold hits. LightLlm-Recipe renders "the first hits were X, reformulate the search".
- **Re-Rank-Recipe** (`research.rerank.recipe`) — generic LLM-based re-ranking as an optional phase, orthogonal to the Curated Pipeline.
- **`LocalIndexProtocol`** — integration of the RAG stack into the SPI, so that knowledge base hits land in the same pipeline as web/academic hits.
- **Multi-language Wikipedia** — currently one language per tenant. v2: multiple `wiki-<lang>` instances in parallel with language routing.

Order is prioritized by caller need — so far, there is no strong driver for a specific roadmap.

---

## References

- Implementation: `repos/vance/server/vance-brain/src/main/java/de/mhus/vance.brain.zarniwoop/`
- Toolpack Contract: `repos/vance/server/vance-toolpack/src/main/java/de/mhus/vance.toolpack.research/`
- Setting Form: `repos/vance/server/vance-brain/src/main/resources/vance-defaults/_vance/setting_forms/research.yaml`
- Recipes: `repos/vance/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/zarniwoop-research-plan.yaml`, `zarniwoop-research-evaluate.yaml`, `web-research.yaml`, `research-synthesize.yaml` (§7a)
- Manuals: `_vance/manuals/search-tools.md`, `_vance/manuals/research-to-document.md` (§7a), `_vance/manuals/ode-search-source.md` (§5a)
- Ode Counterpart (§5a): `repos/vance-ode/vance-ode-zarniwoop/`, guard in `repos/vance-ode/vance-ode-core/src/main/java/de/mhus/vance/ode/inbound/`
- Tests: `repos/vance/server/vance-brain/src/test/java/de/mhus/vance.brain.zarniwoop/`
- Planning History (older, broader, partly forward-looking): `planning/zarniwoop-service.md`, `planning/zarniwoop-ode.md` (§5a)
---
