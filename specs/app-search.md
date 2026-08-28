---
title: "Application `app: search` — Search for Humans"
parent: Specs
permalink: /specs/app-search
---

<!-- AUTO-GENERATED from specification/public/en/app-search.md — do not edit here. -->

---
# Application `app: search` — Search for Humans

> Addon `vance-addon-brain-zarniwoop`. An interface over the existing
> [Zarniwoop Dispatcher](/specs/zarniwoop-service) — the app **does not** provide search capability itself.

Status: **v1 built** (2026-08-19), not yet verified in the browser. History and remaining
phases: `planning/zarniwoop-search-app.md`.

## 1. Purpose

Zarniwoop supports eight providers, twelve modalities, two tiers, `expertParams`, a curated
multi-source pipeline, and a provider inventory with quota display — and until this app, **none
of it was accessible without agents**. There was no single REST endpoint for search; to search
independently, one had to open a chat and ask a model to call a tool.

This was particularly problematic for images and videos: Serper provides validated image URLs and
embeddable YouTube IDs, and a model renders text from them.

**What the app is not:** not a replacement for chat. If you have a *question* instead of a *search*,
you are better off in chat — the app is for "I want to see the results myself."

**No LLM tools.** The `research_*` family is complete; an agent already has a tool for everything here.
A second set would assign two names to one capability.

## 2. Manifest

`kind: application`, `app: search`, Block `config.search`. Thin, because a search has no state —
what someone typed is gone as soon as they type something else. Only the *form* of the
interface is saved:

```yaml
$meta:
  kind: application
  app: search
title: "Market Observation"
search:
  defaultModality: news
  defaultNum: 20
  savedSearches:
    - name: Tariffs
      query: tariffs 2026
      modality: news
      tier: expert          # omitted if normal
      instance: serper-main # omitted if not pinned
```

**No search history** — an automatically recorded log is a usage trace that no one requested.

Reading is **lenient**: the manifest is a hand-edited file, so an unknown modality falls back
to `web`, a number can be a string, and a saved search without a `query` is skipped instead
of rejecting the entire document. A typo costs a value, not the app where you would correct it.

Why an Application at all if nothing is saved? Two reasons: the Kind Registry is how an Addon
interface gets into a Cortex tab, and a search that retains *nothing* is un-Vance-like — the
Clip path (still open) needs something to belong to.

The app is **created** via the document template `_vance/templates/search.yaml` (template tab in
the creation dialog), similar to [feeds](/specs/centauri-service). Without it, there would be no
`_app.yaml` and the interface would be unreachable.

## 3. No Generated Artifact

`refresh()` writes nothing, and `app_rebuild` responds empty accordingly. Everything the app displays
is at the source; a materialized copy of search results would be a second, incorrect archive.

## 4. Java Foundation

| Class | Task |
|---|---|
| `SearchApplication` | `VanceApplication` for `app: search` — `create`/`refresh`/`describe`/`status`/`promptInject`, read and write manifest |
| `SearchConfig` | the `config.search` block, leniently read, returned with `toBlock()` |
| `SearchAppController` | the REST surface (§5) |
| View DTOs | `@GenerateTypeScript("search")` — `SearchRequestView`, `SearchHitView`, `SearchResultView`, `ContentRequestView`, `InvestigateRequestView`, `RankedHitView`, `InvestigateResultView`, `SearchConfigView`, `SavedSearchView` |

Everything below comes from `de.mhus.vance.brain.zarniwoop`: `ZarniwoopService.search`,
`ZarniwoopResearchService.investigate`, `ZarniwoopInsightsService.listInstances`,
`SearchProviderFactory.assemble` and `SearchProviderInstance.loadContent`.

`status()` and `describe()` **deliberately do not touch any source**. A dashboard card that executes a
search would spend provider quota for opening a desktop and show what that request happens to return
today. `promptInject` provides the configuration, never results — these change between prompt and
response.

### 4.1 The Opened Hit in the Prompt

An opened hit travels as `activeApp.selection` (URL + title, because a search
does not retain anything on the server side to retrieve it). The phrasing in the
prompt block is not arbitrary: saying "open" instead of "selected" avoids the
**word collision** — for a chat engine, *selection* means `boundDocSelection`,
a text range in a document —, but it's not enough. Observed on 2026-08-21:
the engine still responded "I see no selection and have no context for an open
search hit," even though the block was present. Therefore, the block must do three
things: name the **action** ("has opened one hit"), state **what it is not**
("NOT a text selection inside a document"), and **forbid the excuse**
("Never answer that no selection arrived, and never ask them to mark it again").
Same treatment in [app-links](/specs/app-links) §7a and the Feeds app.

## 5. REST

All under `/brain/{tenant}/addon/search/`, `projectId` as a query parameter.

| Endpoint | Auth | Purpose |
|---|---|---|
| `GET providers` (`?refresh=true`) | `Project` READ | Inventory → Capability Gating (§7), Quota (§8) |
| `POST search` (`?folder=`) | `Project` READ | one modality; Body: `query`, `modality`, `tier`, `num`, `locale`, `instance`, `expertParams` |
| `POST content` | `Project` READ | Body of a hit (§6), returns **bytes** |
| `POST investigate` | `Project` READ | curated pipeline, explicit action (§8) |
| `GET/PUT config` (`?folder=`) | `Project` READ / WRITE | Manifest |

**`READ` for search**, not `WRITE`: it reads an external index and writes nothing here. That
it costs provider quota is a cost issue — which the interface addresses (§8), not authorization.
Anyone allowed to see a Project's Research configuration is allowed to use it.

`GET providers` returns `ZarniwoopInsightsDto` **directly**, not its own view: the type already
carries modalities, domains, tiers, `availability`, `statusText`, call counts, and cooldown, and
already exists on the TS side. A parallel type with the same fields would only drift.

`POST content` delivers the bytes **itself** and does not expose the stash path. The path is in
the workspace temp root, whose lifecycle `WorkspaceService.suspendAll` owns — writing it into a
client response would make a transient file part of the app contract. The
`ContentReference` is **rebuilt** from `(instanceId, contentId, mimeType)` instead of being
held between search and click: a reference in server memory would make the click dependent on
which Pod answered the search.

**The Content-Type is clamped, not passed through.** The bytes come from external software and
are displayed in the browser on the **Brain's origin** — if the other side could choose
`text/html` or `image/svg+xml`, their script would run alongside the session it was fetched with.
Allowed are `text/plain`, `text/markdown`, `text/csv`, PDF, JSON, and the four common bitmap
formats; everything else goes out as `application/octet-stream`, plus `X-Content-Type-Options: nosniff`
so no browser guesses past the declared type. An allow-list, because the dangerous set is not
enumerable — SVG is an image and carries script, so "is it an image" is not the question. And
no refusal, but a download: a body we cannot safely embed is still one someone wants. The client
decides the render branch accordingly based on the **actual** `blob.type`, not the `mimeType`
from the search result — both come from the same external source, but only one describes the
bytes in hand. The `<iframe>` also runs with an empty `sandbox`.

A rejected request is `409` with `{error}` — a 5xx would invite the client to repeat something
that cannot succeed.

## 6. Detail Retrieval — Three Stages

"More detailed info on click" has three sources, and the interface **does not guess** which applies:
each hit carries `contentState`.

| `contentState` | Source | What the UI does |
|---|---|---|
| `embedded` | the source provides the body ([§4.4.1](/specs/zarniwoop-service)) — OpenAlex/arXiv abstract, Wikipedia extract | display immediately, no request |
| `on-demand` | `STASH_ON_DEMAND`, loadable via `POST content` | "Load Full Text" button, with size if known |
| `none` | the source has no body | metadata, snippet, jump-off |

An `EMBED_TEXT` reference **without text** reports `none`, not `embedded`: an empty promise is
worse than none. This ensures the "Load Full Text" button never appears where it would fail.

**The app does not fetch the *content* of the page behind the URL.** The jump-off is the answer —
the user has a browser, and proxying an external page through the Brain costs bandwidth, latency,
and an SSRF surface, only to show what a new tab shows better. A content proxy would only be
appropriate if it could do something the browser cannot: login-protected corporate sources — and
that is stage 2 via an `ode` source.

**The preview *image* is an exception** (§9.1): it is an `og:image`, not page content, and it
runs through a proxy that the product already operates.

**Current limitation:** of the built-in protocols, **none** implement `loadContent`; only an
`ode` source provides `on-demand`. The branch is wired, but rarely visible.

## 7. Capability Gating

The strict rule, adopted from Centauri: **"optional" must never mean "unreliable."**

The modality tabs are the union of modalities from all endpoints with
`availability == READY`. The `READY` filter is the actual decision — an endpoint in
cooldown *cannot* respond, so it does not contribute its modality. No Serper key means: **no
Images tab**, not an empty tab and not one with an error message.

Similarly: no Expert section without a source that declares `EXPERT`; no pin list without pinnable
endpoints.

What **does not** disappear is the source itself. An endpoint with `availability != READY` or
a set `statusText` is visibly listed in the Provider Panel under Settings, with its reason — a
missing line would read as "never configured" and send the operator to the wrong place.
Next to it is `Reload providers`, which discards the five-minute factory cache via `?refresh=true`: a
TTL cache in front of a configuration interface needs a way to bypass it, otherwise someone
will debug settings when only time was needed.

## 8. Costs — A Search is Money

An interactive interface has a different cost profile than an LLM turn: the human types, and every
keystroke could be a provider call. Three stipulations:

1. **No searching-while-typing.** Submission is explicit. Debounce would be the wrong answer — it
   makes the problem smaller, not gone.
2. **A tab switch does not automatically search again** — but it also doesn't discard anything.
   Nothing is re-fetched (otherwise a click would spend quota for a request that is currently
   being changed); instead, what *this* tab last found is returned (`resultsByModality`). Looking
   at news hits and then briefly at paper hits should not mean paying for the news again. What
   the switch resets is only what belongs to the modality: Pin, Expert Tier,
   unoffered facets, selection.
3. **`investigate` is a separate, named action.** It costs quota *and* LLM tokens (Plan +
   Evaluate Recipe) and takes time; as a standard search button, it would be a cost trap. The quota
   itself is in the Provider Panel (Serper's `statusText` provides "1552 credits remaining") —
   those who see their balance use it differently.

## 9. Web UI

`@vance-addon/zarniwoop` registers `application:search`; `SearchAppKind.vue` is the interface.

**Different display per modality**, all from `SearchHit.extras()` and without
provider modification:

| Modality | Display | Fields |
|---|---|---|
| `image` / `video` / `book` | **Grid** | `thumbnailUrl` / `coverThumbnailUrl` / `imageUrl`, `duration`, `channel` |
| everything else | List | `snippet`, plus `authors`/`venue`/`doi`/`citedByCount`/`points`/`comments`/… as a meta line |

`image`, `video`, and `book` are grid because you **look at them**; the rest are lists because you
read them.

**Images have two links, and this is not a detail:** `url` is the page where the image is located,
`extras.imageUrl` is the file. The detail panel offers both separately — the source page provides
context and attribution, the file only pixels. Serper's `ImageValidatorService` has already filtered
out dead URLs, the UI does not re-check this.

**External content:** everything is rendered as text, never as HTML. Thumbnails load **directly from
the external host** with `referrerpolicy="no-referrer"` and `loading="lazy"` — meaning the viewer's IP
goes to a third party. This is intentional (no proxy, no bandwidth, no cache problem), but explicit
and not silent; a thumbnail proxy is a later option, not a prerequisite.

### 9.1 The Image of a Hit — Three Stages, Descending by Price

`HitPicture.vue` queries in this order, stopping at the first answer:

| Stage | Source | Cost |
|---|---|---|
| 1 | the file that the hit **is** (image search, only in detail panel) | none |
| 2 | the image that the source **provided** — Serper's news lead image, video still, book cover (`extras`) | none |
| 3 | the `og:image` **behind the link** — only if stages 1 and 2 are empty | one external request |

Stage 3 runs via `GET /brain/{tenant}/link-preview?url=…` (`LinkPreviewService`) — **the same
proxy** used by link cards in chat and the [Link Manager app](/specs/app-links). No second fetch path
and nothing the product doesn't already do: the proxy is SSRF-gated
(`SsrfGuard.guardedClientBuilder`, `Redirect.NEVER`, each hop re-checked) and caches in Mongo for a
week.

This is **not** a contradiction to "no web proxy" (§6): an image reference from the OG metadata is
fetched, not the page content. The jump-off remains the answer to "what's there."

The same two rules as in the Link app, intentionally in the same words:

- **Lazy per visible card** (`IntersectionObserver`, `rootMargin: 200px`). A search returns ten
  hits, of which a scrolling reader never reaches the last five; fetching for them would mean
  spending ten external requests for four decorated lines.
- **The negative answer is also saved** — otherwise, a hit without OG tags would be queried again
  on every re-render.

Non-http(s) is not queried at all (`safeUrl`), and the provided `og:image` URL runs through
`safeUrl` again before going into an `<img>`: it comes from the page we just read. If it doesn't
resolve, the component renders **nothing** — a persistent gray box would claim an image is still
coming.

For curated results, the **`gaps` are at the top**: what the pipeline *could not* answer is more
useful than a longer hit list — and exactly what a summary swallows.

A loaded non-text body goes as an Object URL to an `<iframe>` (PDF → browser viewer,
Web UI convention). The URL is released on hit change **and** on unmount; a left-behind handle
holds the entire blob.

## 10. Anti-Patterns / v1 Limitations

- **No fan-out across modalities.** One tab, one `search` call — each tab loads and fails for
  itself. The `research_rich` fan-out is a loop in the tool and has no service the app could
  call; for a UI, the division is the correct form anyway.
- **No re-ranking in the app.** The order comes from the source, curated ranking from
  `ZarniwoopResearchService` — the same rule as in the `ode` adapter.
- **No web proxy for page content** (§6). The `og:image` via the shared link preview proxy is the
  named exception and fetches metadata, not content (§9.1).
- **No search history** (§2).
- **No new modality, no new provider.** The app is a consumer.
- **`MAP`, `CODE`, `RAG` have no built-in provider** — the tabs do not appear as long as nothing
  serves them. An `ode` source can declare `INTERNAL_DOC` and does so then.
- **Clip is still missing.** The path from "found" to "kept" (a hit as a document, like Centauri's
  `POST clip`) is planned and deliberately overlaps with `research_document` so there is **one** such
  path and not two.
- **No test boots the Spring wiring** — this applies to every Addon: the
  `VanceBrainContextSmokeTest` is *in* `vance-brain` and does not see an Addon downstream, the
  bundles have no tests.

## References

- Implementation: `repos/vance/server/vance-addon-brain-zarniwoop/`
- Client: `repos/vance/server/vance-addon-brain-zarniwoop/client/`
- Dispatcher and Providers: [zarniwoop-service](/specs/zarniwoop-service), Body Channel §4.4.1, `ode` Sources §5a
- Template: `_vance/templates/search.yaml` (`app: search`, no body — [document-templates](/specs/document-templates) §2a)
- Build Form Template: [centauri-service](/specs/centauri-service) (`app: feeds`)
- History and Open Phases: `planning/zarniwoop-search-app.md`
