# Vancetope — Centauri Service (Feed-Stream-System)

> Persona: **Alpha Centauri** (*The Hitchhiker's Guide to the Galaxy*) — the place where Earth's demolition plans "have been on public display for fifty of your Earth years." Available information that no one has read.
>
> Centauri is Vancetope's **consumption side of external streams**: a dispatcher, a protocol SPI, a project-bound instance factory, and a merge layer that combines multiple time-ordered sources into an endless scroll. It does not maintain sources — feed lists, full texts, categories, and translation remain with the source.
>
> In the code, it's called **`centauri`**, for the user, it's called **Feeds** (addon display name, `app: feeds`, `feed_*` tools). The same separation as with Zarniwoop: the Persona names the dispatcher, not the interface.
>
> See also: [zarniwoop-service](zarniwoop-service.md) | [agrajag-engine](agrajag-engine.md) | [addon-system](addon-system.md) | [doc-kind-application](doc-kind-application.md) | [settings-system](settings-system.md)

---

## 1. Purpose & Scope

**Problem.** Vancetope can **search** ([Zarniwoop](zarniwoop-service.md)) and **fetch** (`web_fetch`), but not **monitor**. The continuous stream is missing: nothing to browse in the morning, and nothing for an agent to build a digest from.

The obvious path — an RSS reader in the Brain — is incorrect because Vancetope should not own source management. Updating feed lists, fetching full texts, determining language and category, translating: a service like Hrafnagud does that, and tomorrow another will.

**Solution.** Centauri separates three layers:

1. **`FeedProtocol`-SPI** — one Spring bean per wire format (`ode`, `usgs`, `wikipedia`, `mastodon`). Knowledge about *one* external API.
2. **`FeedSourceInstance`** — a concrete URL + optional credential, instantiated from a document under `_vance/config/feeds/`. Multiple instances of the same protocol are normal (`wikipedia-de`, `wikipedia-en`).
3. **`CentauriService`** — the single entry point. Resolves streams, gates them, fetches one page in parallel, and passes them to the merge.

### What Centauri is not

- **Not a replacement for `research_search(modality=NEWS)`.** Searching and monitoring are different acts: search wants relevance, feed wants chronology. Both remain.
- **No source management.** There is no feed list maintenance, no full-text crawling, no translator. If you need that, put a source in front of it.
- **No dedicated Engine.** Single-shot calls, no `ThinkProcess`, no Lane lock. Architecture like [Zarniwoop](zarniwoop-service.md) / Fenchurch: Spring `@Service` + REST/Tool adapter.
- **No archive.** The content is volatile and remote. It becomes permanent through **Clipping** (§11.3) — an explicit act with an explicit goal —, not through silent materialization.
- **No interaction.** No posting, no replying, no boosting. The boundary is formulated in a testable way, see §9.

---

## 2. Architecture Overview

```
   Web-UI (app: feeds) ──REST──► CentauriAppController        [Addon]
                                          │
                                          ▼
                                 ┌─────────────────────┐
                                 │ CentauriService     │
                                 │ (gate, fetch in     │
                                 │  parallel, merge)   │
                                 └──────┬──────────────┘
                     ┌──────────────────┼──────────────────┐
                     ▼                  ▼                  ▼
            FeedSourceFactory   CentauriGateService   FeedActorResolver
            (Project Cache)     (enabled+Cooldown)    (Reader Pseudonym)
                     │                                     
        ┌────────────┴───────────┐                         
        ▼                        ▼                         
  OdeFeedProtocol        Usgs-/WikipediaFeedProtocol        
  [vance-brain]                [Addon]                      
        │                        │
        └────────► FeedMerger + CentauriCursorCodec ◄────────
                   (chronological, Tie-Break, Cursor Bundle)
```

**Involved Classes.** Contract in `vance-toolpack`, package `de.mhus.vance.toolpack.feed` — where Zarniwoop's counterpart already resides with `…toolpack.research`, and the module only depends on `vance-api`.

| Class | Module | Responsibility |
|---|---|---|
| `CentauriService` | brain | Entry point. Resolve streams, gate, fetch in parallel (virtual threads, timeout per stream), merge. **A failing source does not take the page with it** — it becomes a `CentauriNote`. |
| `FeedSourceFactory` | brain | Builds project instances from settings, caches them per `(tenantId, projectId)` (Caffeine, 5 min), cleans up on `ProjectEnginesStopRequested`. `evict(scope)` allows forced re-reading (§3.2). |
| `FeedCapabilitiesCache` | brain | Caches `capabilities()` per source for its own TTL. Central, so not every protocol invents the same caching. Key is the source ID **without** reader. |
| `CentauriGateService` | brain | Pre-dispatch gate: `enabled` setting + active cooldown (`ToolHealthService`). |
| `FeedActorResolver` | brain | Derives the reader pseudonym (§6). Central, not per protocol. |
| `FeedMerger` | brain | The k-way merge and cursor progression (§5). Pure logic, no Spring, no IO. |
| `CentauriCursorCodec` | brain | `CentauriCursor` ⇄ opaque base64url string. A defective cursor is **rejected**, not replaced by a fresh one. |
| `CentauriSettings` | brain | Setting key constants. One source of truth for Factory, Gate, and Actor Resolver. |
| `CentauriHttpClient` | brain | GET/POST test seam with header map. Separate from Zarniwoop's `SimpleHttpClient` because it's GET-only with a fixed User-Agent. |
| `OdeFeedProtocol` / `OdeFeedInstance` | brain | The contract (§8). Built-in because it *is the contract*. |
| `Usgs*`, `Wikipedia*`, `AnchoredCursor` | **Addon** | Example sources (§7). In the addon, so an installation without them simply doesn't load the addon. |
| `FeedsApplication`, `FeedsConfig`, `CentauriAppController` | Addon | `app: feeds` and the REST interface (§11). |

---

## 3. Lifecycle & Scope

### 3.1 Instances are project-bound

The cache key is `(tenantId, projectId)` — **not** the reader. The pseudonym is a parameter of a call, not a property of an instance: instantiating per user would multiply cache, cooldown accounting, and connection pools by the number of users, without gaining anything, as credentials and endpoint are the same for everyone.

Endpoint settings are resolved at the **Project** level (`processId = null`), matching the project-scoped cache. Reading the process cascade and caching per project would propagate the process-scoped overrides of the first caller to all other processes.

A call without project scope is rejected (`CentauriException`).

### 3.2 The Cache Needs an Escape Hatch

The five-minute TTL is **indistinguishable from a misconfiguration**: someone who has just created a source and sees an empty source list cannot tell if the file is wrong or if only time is missing. And without sources, the configuration interface does not show an "Add Stream" button — the waiting time then becomes a dead end.

Therefore `FeedSourceFactory.evict(scope)` and `GET …/sources?refresh=true`. The normal call does **not** discard: opening a tab should not pull the HTTP client out from under every source (`dispose()` runs on evict).

> **Rule for future factories:** a TTL cache in front of a configuration interface needs a way to bypass it. Zarniwoop had the same gap and received the same intervention (`?refresh=true` on the Insights endpoint).

---

## 4. Feed Contract

Data types in `vance-toolpack`, package `de.mhus.vance.toolpack.feed`.

### 4.1 `FeedFetch`

```java
record FeedFetch(
    String selector,
    @Nullable String cursor,        // opaque, source-specific
    FeedDirection direction,        // OLDER | NEWER
    int limit,
    FeedFilter pushdown,            // only what the source guaranteed
    @Nullable FeedActor actor)      // empty = anonymous
```

Offset pagination is **not** part of the contract: in a stream where entries continuously flow in at the top, it produces duplicates and gaps.

### 4.2 `FeedPage` & `FeedItem`

```java
record FeedPage(List<FeedItem> items, @Nullable String nextCursor, boolean hasMore)

record FeedItem(
    String id, Instant publishedAt, String title, String url,
    @Nullable String summary, @Nullable String body,
    @Nullable String author, @Nullable String language,
    @Nullable String imageUrl, @Nullable String controlUrl,
    List<String> tags, Map<String,Object> extras)
```

Two mandatory fields are a prerequisite, not a matter of tidiness:

- **`publishedAt`** — the merge across multiple sources requires a globally comparable sort key. A source without a timestamp cannot participate in a mixed stream.
- **`id`** stable across requests — it is the last tie-break for identical timestamps and the anchor against inclusive resume tokens (§5.3). A wandering ID creates duplicates in the scroll.

`controlUrl` is the source's interface for *this* entry (for Wikipedia, the diff page; `url` is the article) and the escape hatch for anything the back channel doesn't model (§9).

### 4.3 `FeedCapabilities`

```java
record FeedCapabilities(
    FeedSelectorMode selectorMode, Set<FeedSelectorKind> selectorKinds,
    boolean pushdownTextSearch, boolean pushdownLanguage, boolean pushdownSince,
    boolean supportsNewerDirection, boolean carriesFullBody,
    int maxPageSize,
    Set<FeedSignal> signalsAccepted, boolean carriesControlUrl,
    Duration capabilitiesTtl, List<Facet> facets)
```

Two strict rules are attached:

1. **Pushdown or Post-filtering.** What the source does not guarantee, the dispatcher filters afterwards — and fetches more for it (§5.4). Without the first half, a filter silently does nothing; without the second, a page shrinks from twenty to three.
2. **Optional means capability-driven.** Empty `signalsAccepted` ⇒ the UI does **not** show the buttons, instead of offering one that fails. This is the difference between *optional* and *unreliable*.

### 4.3a Facets

`facets` is the second filter axis and follows a **different** rule than the `pushdown*` flags above: **Declaring means being able to apply.** There is no post-filtering and no facet value on the entry — if a chosen dimension is not declared, it is **skipped** for that request, visible as `CentauriNote.Kind.MISSING_FACET`.

The type is in `de.mhus.vance.toolpack.facet` (not in `…feed`), because Zarniwoop uses the same declaration and a source that serves both — a news archive does — provides it once.

```java
record Facet(String key, String label, boolean hierarchical,
             List<FacetValue> values, boolean lazyChildren)
record FacetValue(String id, String label, @Nullable String parentId)
```

**Why no output field.** The first draft gave `FeedItem` the full containment path so the reader could filter locally. This would only be needed by a source that can *annotate* a dimension but not *query* it — it's the same field in its own storage. And as a display, a "Singapore" chip only repeats the filter the reader just set. The price would have been a path per entry per page. Derivation: `planning/centauri-facets.md` §3.3.

**Keys carry the statement level.** `origin-place` (where the publisher is located) and `subject-place` (what the article is about) are separate because a single `place` for two sources answers two different questions under one checkbox — and invisibly so, because the value looks plausible. A key is reserved only **with** a normative value system: for `*-place`, these are `m49:` above the country and `iso:` at the country level. `origin-topic`/`subject-topic` have none and are thus source-specific — the UI renders them per source instead of pretending a commonality. Dots in the key are forbidden (the selection ends up as a map in a manifest, and Mongo reads the dot as a path).

**Value lists** travel inline, capped at 500; above that, `lazyChildren` is mandatory and the source serves `GET /facets?key=&parent=` level by level. The cap is enforced **differently on both sides**: the source throws (its author can fix it there), the reader truncates and logs (it parses an external declaration and must not remove the source from view).

**Why not as a selector.** A stream carries *one* opaque selector string; "from Asia **and** about sports" would require a conjunction in it that the UI cannot render, and two configured streams would be a union instead of an intersection. The selector says *which stream*, the facet *which subset*.

### 4.3b Display Fields (`extraFields`)

`FeedItem.extras` is the **free display channel** — source-specific, untyped, never filtered. Precisely for this reason, the reader cannot know what is worth showing and what it is called, and a list in the reader does not survive the second source: a map looking for `originPlace` finds nothing for a Mastodon instance and overlooks its `boosts`.

```java
record FeedExtraField(String key, String label)
```

Declared in the capabilities next to `facets`, **not on the item** (a label per entry would be the same label twenty times per page). List order = display order; **empty means show nothing** — the same rule that `signalsAccepted` follows. What is declared is *what is worth showing and what it is called*; the values remain free, and no filter surface is created.

The distinction from §4.3a in one sentence: **Facets are the filter channel (declared, with value system), `extras` are the display channel (free, with declared labels).**

### 4.3c A Full Entry

`FeedSourceInstance.loadItem(id, actor)` returns **the same type as the page**, with what the listing omits: `body`, richer `extras`, a longer summary. No separate detail type — the reader replaces what it has instead of mixing two forms, and the same mapper parses both.

A page entry is a **teaser**: what can be cheaply produced twenty times per request. `carriesFullBody=false` says exactly that. An empty result means "I don't know this ID" (the entry has rolled out of the archive) — **not** "no text": an entry without a fetched full text is a complete entry with `body=null`.

### 4.4 Selector Modes

A true taxonomy and an open namespace require different input fields. Calling both "category" either provides no dropdown for the first or an empty one for the second.

| Mode | Meaning | UI |
|---|---|---|
| `ENUMERABLE` | `listSelectors()` is binding | Multi-select with labels |
| `FREEFORM` | open, typed by the reader | Free text field per `selectorKind`, validated by `validateSelector()` |
| `NONE` | exactly one stream | no selector |

Basic equation: **Stream = Instance × Selector.** A Hrafnagud instance provides N streams via its taxonomy, a Mastodon instance N via typed hashtags — same structure, different origin.

### 4.5 `FeedProtocol` (SPI)

```java
interface FeedProtocol {
    String id();                 // "ode", "usgs", "wikipedia"
    String displayName();
    FeedSourceInstance instantiate(FeedInstanceConfig cfg);
}
```

`FeedInstanceConfig` carries `instanceId`, `protocolId`, `baseUrl`, `credentialSettingKey`, **`Supplier<@Nullable String> credentials`** and `extras` (all setting suffixes outside the common fields, e.g., `feedPath`, `language`).

The supplier is not a stylistic device; it accomplishes three things simultaneously: it reads **per call** (a rotated credential works without cache expiration), it **avoids scope propagation** (the instance is already built per `(tenant, project)`, so the closure closes over exactly the applicable scope — giving the protocol the scope would mean giving it a `userId`, and the fact that none ever sees one is the reason for §6), and it does **not keep a secret in a record** whose `toString()` would carry it into every debug log.

### 4.6 `FeedSourceInstance`

```java
interface FeedSourceInstance {
    String id(); String displayName(); String baseUrl();
    FeedCapabilities capabilities();                 // cached, without Actor
    List<FeedSelector> listSelectors();              // without Actor
    Optional<String> validateSelector(String raw);
    FeedPage fetch(FeedFetch request);
    String cursorAfter(FeedItem item);               // default: item.cursor() ?: item.id()
    Optional<String> loadBody(String itemId, @Nullable FeedActor actor);
    FeedSignalOutcome sendSignal(FeedSignalRequest request);
    void dispose();
}
```

Implementations must be thread-safe: the dispatcher fetches all streams of a page simultaneously.

### 4.7 `FeedFilter`

```java
record FeedFilter(
    @Nullable String text, Set<String> languages,
    List<String> include, List<String> exclude, @Nullable Instant since)
```

Structured, **no query language**: a DSL would be a parser, validator, and translation per source, while these fields map directly to the form engine and an LLM writes them without errors.

The filter carries both halves itself — `projectTo(caps)` provides the pushdown subset, `matches(item)` the answer for an entry. Semantics: `include` is *any*, `exclude` is *none*, case-insensitive comparison over title + summary + body + tags.

**An entry without a declared language passes a language filter.** Reading "unknown" as "false" would permanently empty the stream for any source that does not annotate language — the filter would then look like a broken feed instead of a strict one.

---

## 5. Cursor & Merge

The part that can be silently wrong. Therefore, it is separated as pure logic (`FeedMerger`) and directly tested.

### 5.1 The Outer Cursor is a Bundle

Across multiple sources, there is no common cursor, so the bundle is the cursor:

```java
record CentauriCursor(
    Map<String,String> perStream,   // streamKey → opaque source cursor
    @Nullable Instant watermark,     // publishedAt of the last delivered entry
    Set<String> exhausted)
```

Base64url-JSON, meaningless to the client, with format version — a cursor from an unknown format is rejected instead of misread. **A cursor is only valid within a reader's view** (§6); currently automatically fulfilled because it is client-held.

### 5.2 Order and Tie-Break

Sorting is by `(publishedAt, streamKey, itemId)` — timestamps alone are not unique, and without the other two, the order fluctuates between two requests, causing duplicate or skipped lines at page boundaries.

The merge **re-sorts each page itself**, instead of trusting the source: a source that breaks the guarantee should lose order quality, but not be able to corrupt the cursor.

**Personalization may influence selection, never order.** As soon as a source ranks per reader, the sort key is no longer globally comparable and the merge delivers silently incorrect orders, not visibly incorrect ones. Ranked streams would be a second merge mode and a separate decision.

### 5.3 Two Cursor Mechanisms, Each for What It Can Do

| Mechanism | Expresses | Used for |
|---|---|---|
| `FeedSourceInstance.cursorAfter(item)` | "continue **after this entry**" | the cut **in the middle** of a fetched page |
| `FeedPage.nextCursor` | "this page is processed" | the **empty** page and the fully consumed one |

Both are necessary. If a source delivers twenty entries and three land on the page, a page-wide cursor cannot express the cut — the cursor must be derivable from **one entry**, and only the source knows how. Conversely, an **empty page with `hasMore=true`** without the page cursor would never move the bundle cursor, and the client would endlessly query the same thing.

**True resume tokens are usually inclusive** — MediaWiki's `rccontinue` names the first *not* delivered entry, USGS' `endtime` is an inclusive boundary. A cursor derived from the last delivered entry therefore delivers it again, and because de-duplication is page-local, the repetition appears as a visible duplicate. The adapter therefore unwraps itself: `AnchoredCursor` (position **plus** the ID that names the position) discards the anchor from the subsequent page. Everything necessary for this travels in the cursor — the adapter remains stateless.

**The anchor always names a delivered entry.** This is the entire invariant, and it is worth mentioning because a plausible alternative breaks it: MediaWiki's own `continue` token names the first entry of the *next* batch. Adopting it as a cursor would cause `dropAnchor` to delete an entry no one has seen — a lost change per page boundary, silently. Both adapters therefore derive their cursor from the last entry they themselves delivered; the API token is only read as an "there is more" signal.

**External sources (`ode`) provide their cursor per entry** (`OdeItem.cursor` → `FeedItem.cursor`). The protocol cannot derive it — only the source knows its paging scheme. If it's missing, `cursorAfter` falls back to the item ID, which is **incorrect** for a source with `(publishedAt, id)` paging and silently so: it reads a naked ID as "from the beginning" and the scroll repeats the same page. Therefore, the obligation is in the Ode contract, not in a convention.

### 5.4 Progression, Over-Fetch, Special Cases

- Per stream, the cursor advances **only to the actually reached entry**; everything above is discarded and fetched again next time. **Redundant fetch instead of server state** — no buffer, no session, no Redis as a prerequisite, no pod affinity.
- **An entry discarded by the filter also advances the cursor.** Otherwise, a filter that rejects everything from a source will fetch the same entries forever: an endless scroll that doesn't progress.
- **Over-fetch** only if post-filtering is necessary (`FeedFilter.needsPostFilter`), factor 3, clamped to `maxPageSize`.
- **De-duplication** via normalized URL (without `www`, without trailing slash, without `utm_*`/`fbclid`/`gclid`) — **page-local**: the merge buffer already has the information, cross-page would require state.
- **`items` empty with `hasMore=true` is normal** and the client must continue: it happens when the post-filter rejects everything in a round. Reading an empty page as the end would cut off the scroll at the first strict filter. Because such a round appends nothing, nothing moves on the client either — the `IntersectionObserver` does not fire again, so the page fetches up to five empty rounds itself and always keeps a "Load more" button ready.
- **A stream that cannot progress is shut down.** Empty page **and** `hasMore=true` **and** no `nextCursor`: the next request would be identical, the scroll would spin. The assertion is therefore not believed — `markExhausted` plus log line. A stream falls out of this view, the alternative is a view that no longer works.
- **A stream that did not respond said nothing.** A silent stream is not simply missing from the merge; it is *passed* to it as `StreamSilence` — and with one of two types, because everything else follows from that:
  - **`SETTLED`** — the stream responded by not being queried: not configured, `enabled=false`, or it does not declare the chosen facet. This is a statement, and a statement may end a round; it does not change between two page requests.
  - **`UNRESOLVED`** — no one said anything: timeout, transport error, cooldown from an earlier one. The stream may have more, so `hasMore` remains **true** and its cursor **untouched** — the next round must continue where the reader left off, not at the head of the source.

  The two-value distinction is intentionally not a copy of `CentauriNote.Kind`: the note explains the silence to a human, `StreamSilence.Kind` classifies it for the cursor.
- **If an entire round fails, the incoming cursor returns unchanged.** There is no early exit for "nothing fetched" anymore. It used to return `CentauriPage.empty()` — cursor gone, `hasMore=false` —, and thus **one** network outage ended the scroll and restarted the feed from the top. Now, even the empty round passes through the merge, which propagates the cursor and derives `hasMore` from the silences.
- The post-filter applies **everything the source has not already answered** — and exactly that, no more. Filtering twice is idempotent only where the local check reads the same text the source searched, and for **`text`** and **`languages`**, it demonstrably does not: the archive that gave rise to this indexes original titles and teasers, but delivers the **translation**. It correctly finds `tariffs`, but the local post-check searches for the word in a German title and discards the hit — "found by one of two words" became "found by none". Therefore, what **was sent** (`projectTo` result) is skipped, not what a capability flag claims: a source cannot sneak skipping by a declaration that was never used. `since` remains double-checked (it reads `publishedAt`, which every source honestly provides because the merge orders by it), `include`/`exclude` are never delegated — "don't show me that" must not depend on an external implementation. **Facets are outside this calculation**: they are always delegated and never re-checked (§4.3a), because there is nothing on the entry to check against.

---

## 6. Reader Pseudonym

On `items` and `signal`, a **per-instance salted pseudonym** travels along: `hash(tenantId + userId + salt<instance>)`, length-prefixed, so no two ID pairs collide through concatenation. No login, no email, nothing traceable. The sole purpose is to **not prevent user-specific display** — personalized selection, source-side read markers, language preference.

The salt **per instance** is the actual decision: with a global salt, two sources could merge their profiles for the same reader. Per instance, correlation across sources is impossible; within a source, the reader remains recognizable.

| Rule | Reason |
|---|---|
| Transport as **Header** (`X-Vance-Reader`) | a pseudonym in the query string is in every access log and every cache key in between |
| Parameter of the **Call**, not the instance | otherwise, the factory cache multiplies by the number of users |
| `@Nullable` — empty means anonymous | Scheduler and service account calls have no human behind them |
| Only on `items`/`signal` | `capabilities`/`selectors` describe the source, not the reader, and remain cacheable across all readers |
| Centrally derived (`FeedActorResolver`) | three protocols would be three chances to get the salting wrong, and three places that would have to honor `readerIdentity` |

**It is enabled via `readerIdentity`** in the source document (§10) — the cross-subsystem vocabulary `none | pseudonym | identity`, **default `none`**. A feed gets at most `pseudonym`: a feed source is read for *display*, not for *authorization*, and display needs a **recognizable**, never an **identified** reader. `identity` is therefore **rejected instead of silently downgraded** — a source that was promised identity and then silently receives a pseudonym is a broken promise at a point no one looks. The instance continues to run, only nothing travels with it, and the log says so.

**Honest about the data protection statement:** no personal data leaves Vancetope, but within a source, a pseudonym's reading history can be linked. This is the price of user-specific display — and precisely why the default is `none` and not "on": the linkability should be consciously accepted. Operational consequence: **rotating the salt means every reader appears new to the source.**

**The tenant sets the ceiling.** The document cascade is full-document overwrite, which is correct for every other field but not for this one: otherwise, anyone allowed to write a project configuration could expand a tenant's data protection decision. `SourceConfigLoader` therefore centrally caps `readerIdentity` against the identically named `_tenant` document (minimum of the two) — the same architecture as the Foot sandbox, where the project-local policy file may only tighten. **Boundary:** the ceiling only binds where the tenant has a document of that name; a source configured exclusively in the project has nothing above it.

Side effect: the dense per-item state ("already read") that Vancetope itself does not maintain (§13) can thus be maintained by the *source* — it then lives where the stream lives.

---

## 7. Built-in Protocols

| Protocol | Module | Cursor | Special Feature |
|---|---|---|---|
| `ode` | `vance-brain` | Page cursor + Item ID | **the contract** (§8) |
| `usgs` | Addon | **Time** (`endtime`) | Capabilities without round-trip; entries **without language** |
| `wikipedia` | Addon | opaque `rccontinue` | one instance per language wiki; `controlUrl` = diff page; errors as **HTTP 200 with `error` object** |
| `mastodon` | dedicated addon `vance-addon-brain-mastodon` | Item ID (`max_id`/`min_id`, **exclusive**) | first `FREEFORM` source; only one with `supportsNewerDirection`; `publishedAt` is the **entry time from the ID**, not `created_at` |

Only the contract is built-in. The two examples are in the addon, so an installation that doesn't want them simply doesn't load the addon — two demo sources hardcoded in the core would be ballast for anyone with their own sources. It works without a new mechanism: `FeedSourceFactory` collects all `FeedProtocol` beans of the context, and the addon's `@ComponentScan` registers them in the same context.

**Mastodon is therefore a *dedicated* addon** and not a third example: it is a source on which someone actually reads a feed, not an object lesson. It needs no UI lines for this — a protocol is a bean, and the Feeds app renders a source from its declared capabilities, including free-text selectors. And it uses **no** client library: BigBone would pull kotlin-stdlib, okhttp, and kotlinx-serialization for two GETs, and it models the entire client surface (posting, boosting, OAuth) — precisely what §5 keeps out of this SPI.

Three properties of the Mastodon source are measured, not assumed (`planning/centauri-mastodon-messung.md`):

- **Access depends on the endpoint, not the instance.** mastodon.social serves the hashtag timeline and denies the public one (422 `This method requires an authenticated user`, GoToSocial 401). A source can therefore be partially usable; capabilities do not express this and should not — `selectorKinds` describes the grammar, not the permission. A rejected stream becomes a note saying an app token is missing.
- **`created_at` is not the stream's order.** A timeline is sorted by local entry time; on a measured page of 40 entries, `created_at` was inverted in 17 of 39 neighboring pairs, with deviations up to 36 hours for bridged accounts (Flipboard, brid.gy, RSS-Parrot — precisely those that fill a news feed). As `publishedAt`, this would break the guaranteed stable order from §2: the cursor runs in ID order, the merge sorts by time, and a 36-hour-old entry on page four belongs on page one according to this sorting. Therefore, `publishedAt` is the entry time derived from the Snowflake ID (in this order, the same page was exactly monotonic), and `created_at` travels as `extras.authoredAt` — but only if it deviates by more than a minute, otherwise it would be a second identical line on every card.
- **ID decoding is guarded.** It is a Mastodon implementation detail: Pleroma/Akkoma deliver base62 FlakeIds, Friendica small integers. Only a decimal ID with plausible time is decoded, otherwise `created_at`, clamped monotonically to the previous entry.

**Progress is a property of the *response*, not what survived the mapping.** A status without `id`, `url`/`uri`, or `created_at` is skipped; cursor and `hasMore` are still derived from the raw response (number of status lines, first/last `id` therein). If formed from `items`, a batch consisting only of such entries would report "end reached" — thus following the rule from §2 ("a stream that cannot progress is shut down") precisely when it does not apply. This is the same distinction the merge already makes for filtered entries: **discarded means the cursor still advances.**

`account:` streams are **not** included: they require a second call (`accounts/lookup`) including cache and a separate error path. Boosts only arise with them — public and hashtag timelines do not carry any (measured: 0 in 160 entries).

Two endpoint choices are deliberate and not obvious:

- **USGS: the `fdsnws`-query API, not the summary feed.** The `/feed/v1.0/summary/*.geojson` files are snapshots with a fixed window, without pagination — you cannot scroll back. The query API has `orderby`, `limit`, and time boundaries. (Centauri does not use its `offset`, for the reason in §4.1.)
- **Wikipedia: the Action API, not EventStreams.** `stream.wikimedia.org` is Server-Sent Events, i.e., push without `?cursor=&limit=`; as a source, it would require a buffer — more work, not less. Wikimedia also requires a meaningful `User-Agent`.

USGS is also the ongoing test of the rule from §4.7: it has no language field; with the counter-rule, the stream would be permanently empty if a language filter were set.

---

## 8. The Ode Contract

**`vance-ode`** (Apache-2.0, separate repo) defines the REST contract that external software provides to become a feed source. The module is called `vance-ode-centauri`; an application implements **one** interface (`FeedSource`) and gets the endpoints served. Hrafnagud is the **first implementation**, not the benchmark — that's why the protocol is called `ode` and not `hrafnagud`.

| Endpoint | Purpose |
|---|---|
| `GET {path}/capabilities` | what the source can do; cacheable, user-independent |
| `GET {path}/selectors` | the finite taxonomy |
| `GET {path}/items` | a page of a stream |
| `GET {path}/item/{id}` | full text, if the list only carries teasers (`404` = entry fallen out of the stream) |
| `POST {path}/signal` | back channel: `202` accepted, `501` not declared, `409` rejected |

Base path `vance.ode.centauri.path` (default `/ode/feed`, brain-side overridable via `feedPath`), optional shared secret as `Authorization: Bearer …`. Timestamps ISO-8601-Instant, `capabilitiesTtl` ISO-8601-Duration.

**Two ways to check the Bearer** — both server-side, without wire change: the static `apiKey` (one secret, one reader) or an `OdeAuthService` bean of the external application that maps the opaque token to an `OdeCaller` (multiple tokens, rotation, blocking). If the bean is present, `apiKey` is **no longer** read — two parallel definitions of "valid" cannot be separated later. The `OdeCaller` reaches the source on `OdeItemQuery.caller()` (and as a parameter to `body`/`signal`) and names the **installation**, never a human: authorization is done with it, personalization further with the reader pseudonym. Brain-side, nothing changes — the token is in the `apiKey` field of the source document.

**Three guarantees** are in the contract because their breach goes unnoticed: pages arrive **chronologically** (§5.2), `items` responds **even without a pseudonym**, and `capabilities`/`selectors` **never** carry one. A page in the wrong order is **logged, not rejected** by the Ode side — the caller re-sorts, but the violation should be noticed where it can be fixed.

The wire types in `vance-ode-centauri` are **independent** of Vancetope's internal ones. The fact that two ends implement the same form separately is what makes it a contract.

---

## 9. Back Channel

A feed is not just reading: a wrong category wants to be reported, a translation requested. The danger is a generic `action(itemId, verb, payload)` — an RPC tunnel, unlimited, not renderable, not rights-checkable. Therefore, **two paths and no third**:

**A — Signal.** Closed enum, fire-and-forget, no return value except accepted/not accepted:

| Signal | Argument |
|---|---|
| `REPORT` | `reason` ∈ {`WRONG_CATEGORY`, `WRONG_LANGUAGE`, `BROKEN_LINK`, `DUPLICATE`, `SPAM`} + optional note |
| `REQUEST` | `kind` ∈ {`TRANSLATION`, `FULL_TEXT`} — "produce and keep" |

Acceptance criterion: **a signal describes the item, not the reader.** `WRONG_CATEGORY` is a verifiable statement about the entry; `LIKE`, `HIDE`, "read later" describe the reader and are out. The criterion also answers wishes not yet expressed.

No source-**declared** verb catalog: an arbitrary verb plus arbitrary payload schema *is* an RPC, and the UI would build forms from external definitions with external labels. Because the enum is closed, labels and i18n belong to us.

**B — Deep-Link.** `FeedItem.controlUrl` — the source owns arbitrary complexity in its **own** interface. No vocabulary growth, and it covers cases that cannot be named today. Hardening in the mapper: `https` only, host must match the instance's `baseUrl` (otherwise a compromised source deep-links arbitrarily far), `rel="noopener noreferrer"`.

**No local status.** A signal is exclusively directed at the source; Vancetope records nothing. Consequences: no outbox (best-effort, UI reports failure), no de-duplication on our side, and **the stream remains a pure function of the source data** — a local status would have forced a join per page, precisely where the merge is already expensive. The UI accordingly promises no effect: "reported", not "category changed".

**Distinction from interaction**, formulated in a testable way:

> **Does the action create something that other people read under the user's name?** Yes → Interaction, external, requires User OAuth. No → internal.

Mastodon's `favourite` falls out according to this (public act under an account) — the case that would have required OAuth thus falls out of the vocabulary by itself.

### 9.1 The Path

`CentauriService.sendSignal(sourceId, request, scope)` → `POST /brain/{tenant}/addon/centauri/signal` → buttons on the entry card. **Three rejections, and they are intentionally different things:**

| Case | Response | Why |
|---|---|---|
| Source unknown or gated | `CentauriException` → HTTP 409 | **Our** decision, not the source's. "We did not send" is not a judgment the source made — returning it as `FeedSignalOutcome` would claim exactly that. |
| Signal not declared | `UNSUPPORTED`, **without Call** | The UI should not have offered it; this is the second line, not the gate. |
| Transport error | to `AgrajagChecker`, then `CentauriException` | Same treatment as a failed fetch, so a dead source cools down. |

Authorization is `Action.WRITE` on the project, not `READ`: a signal leaves the house, and being allowed to read a feed is not permission to speak to an external system on behalf of the project.

The pseudonym is set by **the dispatcher** (`FeedActorResolver`), not the caller — the same argument as for reading: otherwise, there would be three places that would have to salt and honor `readerIdentity`.

In the UI, the buttons depend on `signalsAccepted` of the respective source; a source without a back channel shows none. The note field states on the field **to whom** the text goes, and the feedback is "reported" — never "fixed".

---

## 10. Configuration

A source is a **document**, a subsystem switch is a **setting**.
History: `planning/source-config-documents.md`.

### 10.1 The Source Document

**One document per endpoint:** `_vance/config/feeds/<id>.yaml`. **The filename
is the ID** — freely selectable, multiple instances of the same protocol are normal
(`wikipedia-de`, `wikipedia-en`).

```yaml
# _vance/config/feeds/hrafnagud.yaml
protocol: ode          # ode | usgs | wikipedia | mastodon   (mandatory)
baseUrl: https://…     # protocol-dependent mandatory
apiKey: "{{secret:…}}" # optional
enabled: true          # Default true
readerIdentity: none   # none | pseudonym — Default none, §6
feedPath: /ode/feed    # free, protocol-specific
```

Everything outside the five known fields ends up as `extras` for the protocol —
and retains its YAML form: thus `ode` uses a `feedPath`, `wikipedia` a
`language`, and a list remains a list. The only exception is
`readerIdentity`: the factory holds this back because it governs what Centauri
sends *on behalf of the reader*, and no protocol should have a say in that.

The cascade is that of the `DocumentService` — Project → `_tenant` → Classpath,
innermost wins, and **holistically per path**: a project document
completely replaces the identically named `_tenant` document, no merge per field.

**Without `protocol`, the factory skips the endpoint** (with WARN), and a
document that is not a YAML mapping also — the other sources remain
unaffected.

**Created via templates:** for each included protocol, a
[Document Template](document-templates.md) `feed-source-<protocol>`, tag
`source`, with a pinned target folder. Mastodon brings its own in the
Mastodon addon.

### 10.1a Content Policy — What a Source Does Not Allow Through

Three optional fields in the source document, read by
`FeedContentPolicy.from(config)`:

```yaml
hideSensitive: true                      # Default false
blockedHosts:   a.example,b.example      # comma-separated, subdomains included
blockedAuthors: "@spammer@a.example"     # comma-separated, exact
```

**No `FeedFilter` fields** — and this is the crucial distinction. A
filter is a **query**: what do I want to see *now*; it changes with interest
and comes per request from the app, from REST, from the `feed_read` tool.
This is **standing policy**: what must *never* come through. If it were in the
filter, every caller would have to send it along, and whoever doesn't know it,
doesn't have it — the LLM behind `feed_read` certainly doesn't know it. **A filter that
can be forgotten is not a policy.** Because it is attached to the source,
"not bypassable" follows from the structure: a filter may **tighten, never loosen**.
The same pattern as with the [Foot Sandbox](foot-sandbox.md) and with Kits.

**Per source, not global.** `hideSensitive` depends on a flag that only
Mastodon-like sources set; for USGS or Wikipedia, it is meaningless,
and a federating instance can only appear in a federated stream.
A global list would be checked against every source, although it applies to one
class — and would be a second place to look when asking "why don't I see this entry".

**Lists are comma-separated text, not YAML lists.** Two reasons: this is how
deny lists are written in this tree (`vance.settings.secret-reference-deny-keys`
and siblings), and a YAML list has a single-element trap —
`blockedHosts: a.example` without a hyphen is valid YAML, results in a
string, and is the natural way to write it; with list expectation, this would be a
cast error or a silently ignored line.

**Applied in the merge**, alongside the request filter: the dispatcher queries each
source via `FeedSourceInstance.contentPolicy()` (default: no policy) and
checks its entries with it. **One place filters** — leaving it to each adapter
would make the rule only as good as its implementations, and the next source forgets
it. A discarded entry **still advances the cursor**, just like a
filter rejection; otherwise, a stream of only blocked entries would scroll
forever without progressing.

The key is the **host of `item.url`**, not `author`: `url` is a mandatory field
and structured, `author` free text — so the list works for *every*
source. Host match includes subdomains (`a.example` also blocks
`www.a.example`), otherwise the bypass is a CNAME; an unparseable URL is
**not** blocked (not being able to parse an address is no reason to discard an
entry). `extras.sensitive` is a convention that any protocol can set — one that
doesn't know it never sets it, and the check is ineffective there instead of a special case.

If a source declares a policy whose protocol does not override `contentPolicy()`,
the factory **warns** during assembly. The default is intentionally
fail-open (no behavior change for existing protocols), but a
configured value without effect must not remain silent.

**This is not youth protection.** A block list blocks what is on it; a
`sensitive` flag is only as good as the author who sets it. The effective lever
against unwanted content in a federated stream is the **selector** —
a local or hashtag timeline does not bring in external instances at all.
Derivation: `planning/centauri-content-policy.md`.

### 10.2 Credential and Salt

`apiKey` takes two forms, and which is correct is decided by the configurator:
a reference `"{{secret:<key>}}"` (encrypted at rest) or a declared
literal `"{noop}…"` (plaintext in the document, thus readable for anyone with Project-READ
and included in every export).

Resolved **per call** via `SecretResolver.resolveForConnector` — a
feed protocol is a **connector**, not a dynamic element (see
[settings-system](settings-system.md)). A rotated secret thus takes effect without
cache expiration.

**The Actor-Salt remains a setting**, `centauri.actorSalt.<id>` (PASSWORD,
generated once server-side). It does not belong in the operator's file: the
server writes it itself, it would be there in plaintext, it would drift against the
hash with which a Kit tracks the file, and writing it would fire a
`documents.changed` that discards precisely the cache that just fetched it.

### 10.3 No More Setting Form

`_vance/setting_forms/feeds.yaml` and `feeds-mastodon.yaml` are **deleted**.
The Mastodon form itself stated why it had three fixed slots instead of a
repeatable group: "the endpoint id is part of the setting KEY" — the
form engine only renders values. With one document per instance, this is no longer an issue;
the templates from §10.1 replace the forms.

> **Known gap:** `CentauriSettings.FACTORY_CACHE_TTL_MINUTES` is declared as a constant but is **never read** — the TTL is fixed at five minutes. Zarniwoop has the same unused constant. To activate it, it must be wired in the factory; until then, it is not a configuration point, but a placeholder.

---

## 11. The `feeds` App

### 11.1 Manifest

`kind: application`, `app: feeds`. The manifest carries **only configuration** — unlike workbook/canvasbook, this is not a container over documents; the content is volatile and remote:

```yaml
$meta:
  kind: application
  app: feeds
title: Morning Briefing
feeds:                      # becomes config.feeds
  streams:
    - source: wikipedia-de
      selector: article
  filter:
    languages: de, en       # list or comma-separated string
    exclude: crypto
    since: -7d
  pageSize: 20
```

`since` is stored **relatively** and resolved per request (`-7d`, `-12h`, `-30m`; an absolute ISO-Instant is accepted). A fixed date in a stored configuration silently stops being relevant as it ages.

`FeedsApplication.refresh()` creates **no artifacts**: a feed does not derive a document, and a materialized image would be a second, outdated archive. The method is nevertheless implemented so that the generic `app_rebuild` responds cleanly. `status()` for the same reason fetches **no page** — a desktop card that calls five external sources makes opening the desktop as slow and error-prone as opening the feed.

**Document Template** `_vance/templates/feeds.yaml` creates the manifest; streams are then added in the configuration tab because the create form cannot know the configured sources.

**The marked entry in the prompt** (`promptInject`, `activeApp.selection` = `sourceId/itemId`) carries a phrasing that stems from a misbehavior. The first version said "the reader has this entry **marked**" — and the Engine responded twice in a row "I see no marking (no text selection sent along)", because *marked* / *selected* for it means `boundDocSelection`, a character range in a document, and that was indeed empty; the reader had to manually name the Active App block for the existing data to be used. The block therefore now states **what happened** ("has clicked one entry"), **what it is not** ("NOT a text selection inside a document") and **forbids the excuse** ("Never answer that no selection arrived, and never ask them to mark it again"). A prompt bug of this kind looks like a data bug — same treatment in [app-links](app-links.md) §7a and [app-search](app-search.md) §4.1.

### 11.2 REST

Under `/brain/{tenant}/addon/centauri/`:

| Endpoint | Purpose |
|---|---|
| `GET sources[?refresh=true]` | configured sources with capabilities and selectors; an unqueryable source comes with `error` instead of being missing |
| `GET facet-values` | one level of a facet's value tree (`sourceId`, `key`, optional `parent`) — for taxonomies too large to travel with the declaration |
| `GET item` | **one** complete entry (`sourceId`, `itemId`): body plus everything the source adds for a single query |
| `GET/PUT config` | the stored feed configuration |
| `POST page` | a page. POST because the filter is structured; either `folder` (stored configuration) or explicit `streams` (preview before saving) |
| `POST clip` | entry → document |
| `POST signal` | back channel to the source (§10) |

Authorization: `sources`, `facet-values`, `item`, and `page` require `Project READ`; `POST signal` `Project WRITE`, because a signal leaves the house; `POST clip` `Document CREATE` on the target path. `GET/PUT config` checks **twice** — `Project` **and** the manifest document (READ or WRITE respectively): a pure project check plus a `folder` supplied by the caller would allow a WRITER to `_vance/…/_app.yaml`, and the document layer is not a safety net there (it derives the writing actor from the target path and records reserved paths as system writes, so the Reserved-Namespace rule R4 is never queried).

**`facet-values` is per source, not merged.** A facet key is only shared as much as its value system: two sources may both declare `subject-topic` and mean different things; mixing their trees would offer a value that only one of them answers.

**And `facet-values` responds with a rejection, not an empty list** — `409` for both an unknown source and one currently in cooldown. "Nothing below it" and "we didn't ask" would look the same in the picker, and only one of them is something the reader can change. The cooldown gate is the same as on any other outgoing path: without it, a cooled-down source would be called again every time the facet picker is opened — precisely what a cooldown exists to prevent.

**`item` responds `404` if the source no longer knows the ID.** An entry may age out between the page and the click; this is the source's response, not an error on our part.

### 11.3 Clip — Where Volatile Becomes Permanent

An entry becomes a Markdown document with title, source, author, date, and URL in the frontmatter. From there, everything existing applies: RAG, Insights, `doc_*` tools, Relations. The client sends the entry's fields instead of an ID — whoever clicks should not wait for a slow source to deliver the article again.

What is **not** built: a read-later management. Clipped is a document, and Vancetope already has documents.

### 11.4 Interface

Kind `application:feeds` (Kind Registry, opens in Cortex tab). Two views over a configuration: **Stream** (endless scroll via `IntersectionObserver`) and **Configuration** (streams + filter). The form is capability-driven: a `FREEFORM` source gets a text field, an enumerable one a dropdown.

`CentauriNote`s are **displayed** instead of swallowed — a page that silently omits a source looks like a source without news, and that is a different statement.

### 11.5 LLM-Surface

| Tool | `deferred` | Purpose |
|---|---|---|
| `feeds_app_create` | no | Bootstrap of an `app: feeds` folder. Builds the manifest server-side from typed parameters. |
| `feed_sources` | **yes** | Which sources the project has and which streams each offers. |
| `feed_read` | **yes** | The latest entries — of a stored feed (`folder`) or an ad-hoc stream set. |
| `feed_item` | **yes** | **One** complete entry (`sourceId` + `itemId`): the body instead of the first three lines. |

`feeds_app_create` exists for the same reason as the other app tools: the manifest is small and writable in **two** ways that both produce no error but an empty feed — config block under `feeds:` instead of at the root, and `streams` as a list of `{source, selector}` instead of names.

`feed_sources` exists to make **exactly one** error impossible: a guessed source ID. It creates a feed that remains empty, plus a note that the user must decipher — being able to look it up is worth a tool. The tool lists the **assembled** sources, not the raw settings.

**`feed_read` knows no cursor.** A model does not paginate; it wants "the last N since T". Giving out the opaque bundle cursor would invite it to invent one — and an invented one is rejected (§5.1). Instead, a time window (`since`, relative or ISO), a capped `limit` (default 20, max 50), and shortened summaries: each page lands in a prompt. Undelivered streams come along as `unavailable` — a digest that silently omits a source reads like "nothing happened there".

**`feed_item` is the other half of `feed_read`.** `feed_read` delivers twenty teasers per call — that's what makes a page affordable; `feed_item` delivers an entry in full, in case the reader points to one ("the marked one", "this article") or the teaser doesn't carry the question. **Which entry it is comes without a tool call**: a marked entry rides in the app context block of the prompt (`FeedsApplication.promptInject`), so the model already knows source and ID and makes its one call for the content. That's why the tool description explicitly states "never invent them" — a guessed `itemId` is the same class of error as a guessed source ID, just less conspicuous.

**What the agent cannot do: configure sources.** A source is a document under `_vance/config/feeds/`, and `_vance/**` requires ADMIN — operator territory. See yes (`feed_sources`), create no. From this, the two behavioral rules in the Manuals: **do not invent a source ID** (there is a tool for that) and **do not claim to have configured** (`feed_sources` is the only honest proof).

Manuals (Addon, `_vance/manuals/`):

- **`feeds-app-create`** — the tool, its parameters, and why an invented source ID creates a silently empty feed (`feed_sources` first).
- **`feeds-sources`** — the setting keys, the protocols included with the addon itself, the three ways to set them, and the five-minute cache as the most common cause of "I configured it and it's empty". Does **not** name the protocols of other addons: this manual is shipped with the Feeds addon and should not claim anything that would be false in an installation without the respective other addon — the authority is `feed_sources()`, which lists the actually configured sources.
- **`feeds-digest`** — `feed_read` in detail and the recurring digest (§11.6).

A protocol addon brings its own manual, following the same rule as its setting form. For Mastodon, this is **`feeds-mastodon`** (addon `vance-addon-brain-mastodon`): the selector grammar, which cannot be derived from `selectorKinds` alone (`hashtag:<tag>`, `public:all|local|remote`), and the trap that the largest instance denies the public timeline and serves the hashtag timeline.

### 11.6 The Recurring Digest

The use case that justifies the LLM side: every morning, a worker reads the night and places a summary in the Inbox. Two parts:

- **Recipe `feeds-digest`** (bundled in the addon): Engine `ford`, `model: default:fast` — a digest summarizes, it does not analyze —, `inheritContext: none` (scheduler-spawned, there is no parent conversation), `maxIterations: 8` as a net for the imagined two to three calls. `allowedToolsAdd` surfaces `feed_read`/`feed_sources`/`inbox_post`, because the first two are `deferred()` and a scheduled worker cannot afford a discovery roundtrip for the one tool it exists for. `listed: false` — a scheduled worker is not a chat mode.
- **Scheduler document** per project (`_vance/scheduler/*.yaml`, via `scheduler_set`). **Not bundled**: schedulers intentionally do not cascade at the resource level because they are by definition project-specific ([scheduler](scheduler.md) §3). The manual shows the YAML; the parameters (folder, window) travel in the `initialMessage`.

The recipe's prompt explicitly forbids two things because both sound plausible and are wrong: **do not claim completeness that the data does not support** (an `unavailable` stream must be named, otherwise the digest reads like "nothing happened there") and **do not invent context** — there are title, summary, and link, and an unclear headline is quoted, not interpreted. "Nothing to report" is a valid result and is written out so that the silence is visible instead of appearing as a failed job.

Made accessible by the prompt fragment `_vance/prompts/arthur/feeds.md` (addon fragment per engine, see [prompts-and-manuals](prompts-and-manuals.md) §7a) with the negation that catches the known misbehavior: *“Before saying you cannot follow a source or set up a news view, run `manual_read('feeds-app-create')`."*

---

## 12. Metrics

| Metric | Tags | Meaning |
|---|---|---|
| `vance.centauri.fetch` | `source`, `outcome` ∈ {`success`, `timeout`, `failed`} | a stream fetch |
| `vance.centauri.signal` | `source`, `outcome` ∈ {`accepted`, `unsupported`, `rejected`} | a back channel signal |

Source ID as a tag is permissible (enumerable, operator-defined); `tenantId`/`projectId`/`userId` **never** — that is the classic cardinality explosion.

---

## 13. Non-Goals

- **No source management.** Feed lists, full texts, categories, translation are handled by the source.
- **No persistence of items.** Pure pass-through; the cursor comes from the source.
- **No read states per item on our side.** Dense per-item state grows with the stream; if the capability is desired, the source maintains it via the pseudonym (§6).
- **No local feedback status.** No like, no dismissal. "I don't want to see that" is configuration (`filter.exclude`), not state — coarser, but visible, editable, and without a join in page rendering.
- **No live push.** No WS channel for new entries; pull-to-refresh is sufficient.
- **No generic `action(verb, payload)`** (§9).
- **No interaction** — nothing that becomes visible to third parties under the user's name (§9).

---

## 14. Status & Roadmap

**Built and verified in browser (2026-08-19).** Contract, Dispatcher, Merge, Cursor Codec, Actor Derivation, Gate, Factory; three protocols; the Addon with REST, `app: feeds`, Document Template, Setting Form, three LLM Tools (`feeds_app_create`, `feed_sources`, `feed_read`), three Manuals, the Digest Recipe, and the back channel (§9.1). A feed via `wikipedia-de` loads entries with diff link and clip.

**Mastodon caught up and verified in browser (2026-08-23)** — `vance-addon-brain-mastodon` (§7), and with it the **brain-side `FREEFORM` wiring**, which was previously missing: `validateSelector()` had no caller in the entire tree, only the Ode side called its own variant. Now `CentauriService` asks a `FREEFORM` source for its opinion — in the page path as `CentauriNote.Kind.INVALID_SELECTOR` with the source's wording, when **saving** a feed configuration as a rejection. `ENUMERABLE` and `NONE` are not queried: there, `listSelectors()` is the authority or the selector is meaningless by contract, and the SPI default (which rejects empty strings) would reject precisely the sources for which `NONE` exists.

**Not present:**
- **No write path for sources.** `feed_sources` reads, but `_vance/config/feeds/` remains operator configuration without agent access (§11.5). An agent can create and read a feed, but not set up a source.
- **`?refresh` on the interface.** REST and client call are there; a control element only exists in the empty state of the configuration.

What the Digest **does not** have: a bundled scheduler (see above) and a run against a real feed — the recipe's structure is tested, not a model's output.

**Foreseeable extension points:** Redis buffer against over-fetch (measure first), cross-page de-duplication, "since your last visit" (source-side or as a user-scoped setting), image proxy — an `imageUrl` directly in `<img>` reveals the reader's IP to the news portal, which is a data protection decision and not an optimization.

---

## References

- Contract: `repos/vance/server/vance-toolpack/src/main/java/de/mhus/vance/toolpack/feed/`
- Dispatcher: `repos/vance/server/vance-brain/src/main/java/de/mhus/vance/brain/centauri/`
- Addon (App, REST, Example Protocols): `repos/vance/server/vance-addon-brain-centauri/`
- Ode Side: `repos/vance-ode/vance-ode-centauri/`
- Setting Form: `…/vance-addon-brain-centauri/src/main/resources/vance-defaults/_vance/setting_forms/feeds.yaml`
- Document Template: `…/vance-defaults/_vance/templates/feeds.yaml` (`app: feeds`, no body — [document-templates](document-templates.md) §2a)
- Tests: `…/vance-brain/src/test/java/de/mhus/vance/brain/centauri/`, `…/vance-addon-brain-centauri/src/test/java/…`
- Planning History (broader, partly outdated — corrections in §19): `planning/centauri-feeds.md`
