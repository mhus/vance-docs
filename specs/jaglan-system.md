---
title: "Vancetope — Jaglan (Mounted Docs)"
parent: Specs
permalink: /specs/jaglan-system
---

<!-- AUTO-GENERATED from specification/public/en/jaglan-system.md — do not edit here. -->

---
# Vancetope — Jaglan (Mounted Docs)

> Persona: **Jaglan Beta** (*The Hitchhiker's Guide to the Galaxy*) — the planet where all the rubbish collects. This fits for an unsorted heap of foreign files that we do not curate.
>
> Jaglan is Vancetope's **access page for foreign files**: a dispatcher, a protocol SPI, and a project-bound instance factory that mounts a foreign file system under a project path. The files are **not copied** — Vancetope keeps one metadata row per file and streams the bytes from the source with each read.
>
> In the code, it's called **`jaglan`**; for the user, it's called nothing at all — the interface is the Cortex, and a mounted file looks like a document. That's the whole point.
>
> See also: [zarniwoop-service](/specs/zarniwoop-service) | [centauri-service](/specs/centauri-service) | [settings-system](/specs/settings-system) | [document-lock](/specs/document-lock) | [document-refs](/specs/document-refs) | [webdav](/specs/webdav)

---

## 1. Purpose & Scope

**Problem.** Vancetope can **search** ([Zarniwoop](/specs/zarniwoop-service)), **read along** ([Centauri](/specs/centauri-service)), and **load** (`web_fetch`), but foreign files have no location. A PDF from a book library only enters the system by being copied into it — and from then on, the copy is the system-of-record.

The obvious way — an import job — is wrong: the source continues to maintain inventory, metadata, and permissions; we only want to *look through*.

**Solution.** Foreign files appear under

```
_ext/<mount>/<path in source>
```

and are read with the **existing** document tools: `doc_read`, Embeds, Links, `DocumentRef`, WebDAV, the Cortex editor. There is no new interface and no new addressing.

**Three contracts, three questions.** The three foreign source systems have the same structure and different contracts:

| Question to the Foreign Source | System |
|---|---|
| "What's available on this topic?" — Ranking, modalities | [Zarniwoop](/specs/zarniwoop-service) |
| "What's new?" — Chronological order, cursor | [Centauri](/specs/centauri-service) |
| "Give me *these* bytes under *this* path." | **Jaglan** |

The difference is **addressability**: Zarniwoop and Centauri provide hits and entries that one takes home. Jaglan provides a path that refers to the same file tomorrow — and only that makes the Doc tools applicable. A source with changing IDs is a search source, not a mount.

## 2. Structure: Metadata Row in Mongo, Bytes in Source

A mounted document has a **real row** in the `documents` collection (path, name, mime, size, header, `lockedFor`), but **no `storageId`**. The absence of this handle is precisely what marks the content as living externally.

This allows `findByPath`, `findById`, child dispatch, Embed, `DocumentRef`, WebDAV, and locks to function unchanged because the document *is* a document.

**Rejected:** a virtual, never-saved `DocumentDocument` (makes an ID-less Mongo entity a citizen of 242 files) and materializing bytes with TTL (copies content into the Brain — and is impermissible for sources with license-per-read). Derivation: `planning/jaglan-mounted-docs.md` §3.

### 2.1 The Derived ID

```
id = "ext_" + hex(sha256(tenantId + "\0" + projectId + "\0" + mount + "\0" + path))[0..32]
```

Deterministic, not generated. The metadata row is shorter-lived than the references to it — deep links, Binder entries, the ID in the Cortex URL — and 18 of the ~30 Document endpoints are `{id}`-keyed. A generated `ObjectId` would change with each recreation.

**Tenant and Project belong in the hash**, because `_id` is globally unique, while a document is addressed via `(tenantId, projectId, path)`: two projects mounting the same source would otherwise have one ID for two documents.

**`_ext/` and `ext_` are data format, not naming.** They appear in every saved path and every derived ID and do not follow any renaming of the subsystem.

### 2.2 Expiration means stale, not deleted

The row carries `mountFreshUntil` — **without** a TTL index. After expiration, it is re-validated on the next access *by path*; it only disappears through knowledge: a listing shows that the file is gone (Prune), or the mount is evicted.

The reason is the ID: a path cannot be reconstructed from it (the hash is not reversible), and the row is the only mapping back. A TTL-deleted row makes any ID-based access a 404, from which there is no way back. A directory entry is additionally marked with `mountDirectory` because an empty mount folder has no children from which it could be derived.

## 3. Layers

| Layer | Location |
|---|---|
| Contract (`JaglanProtocol` → `JaglanInstance`, `JaglanCapabilities`) | `vance-toolpack`, `de.mhus.vance.toolpack.jaglan` |
| Data types (`MountedStat`, `MountedSource`, `MountAccess`) | `vance-api` — the only module that sees both sides of the port |
| Port + Namespace + Shell Lifecycle | `vance-shared`, `de.mhus.vance.shared.document.jaglan` |
| Dispatcher + Factory + Protocols | `vance-brain`, `de.mhus.vance.brain.jaglan` |
| Source side for foreign applications | `vance-ode-jaglan` |

**The port is optional.** `DocumentService` is in `vance-shared` and must not point to `vance-brain`, so `JaglanPort` is an interface in shared, resolved via `ObjectProvider`. No bean present — the normal state for any process without Jaglan (anus, for example) — means: `_ext` paths fail by name, not with an NPE.

**Two redirection points, not ninety.** In `main/`, only `DocumentService` touches `StorageService`, and there the read funnel (`loadContent`) and the write funnel (`streamingStoreContent`) each count once. Therefore, the entire redirection is two methods plus delete handling.

## 4. Configuration

**One document per Mount:** `_vance/config/mounts/<name>.yaml`. The filename
is the mount name.

```yaml
# _vance/config/mounts/library.yaml
protocol: local        # local | ode | demo. Required — mount is skipped without it
rootDir: /srv/books    # protocol-specific, passed through as extras
writable: false
enabled: true
```

| Field | Meaning |
|---|---|
| `protocol` | which protocol (`local`, `ode`, `demo`). **Required** — mount is skipped without it |
| `baseUrl` | endpoint (protocols that need one) |
| `apiKey` | Shared Secret as `Authorization: Bearer`. Reference `&#123;{secret:…}}` or explicit literal `{noop}…` — the choice belongs to the configurator |
| `enabled` | `false` keeps the mount configured but out of the tree |
| `cache` | `false` prohibits caching of responses from this source. Default `true` — then what the source itself declares applies. See §4.3 |
| `readerIdentity` | what the source learns about the reader: `none` (Default) \| `pseudonym` \| `identity`. See §4.4 |
| further | protocol-specific, passed through as `extras`, with their YAML form |

**Two cascades, not to be confused.** The **configuration** cascades (Project → `_tenant` → Classpath, innermost wins, holistically per file), as with Zarniwoop and Centauri: a mount in `_tenant` applies to **all** projects of the tenant — a house library is configured once. A project overwrites the same mount name with its own file or disables it for itself via `enabled: false`. The **mounted documents**, however, do not cascade: `_ext` paths do not appear in `lookupCascade` and `listByPrefixCascade` (over 100 call sites), they remain free of any mount knowledge.

The consequence of the Settings Cascade must be known: a `_tenant` mount appears in **every** project, including `_user_*`. If this is not desired, configure project-scoped.

**The mount name is identity.** It becomes a path segment, passes through the RFC-3986 resolution of the [`DocumentRefResolver`](/specs/document-refs), is exposed by WebDAV as a folder, and is included in the ID. Grammar: `[a-z0-9][a-z0-9_-]{0,63}` — checked during configuration, not during path construction. **Renaming is not supported** (create new, remove old).

**Creation is via templates** — `mount-local` and `mount-ode`, tag `source`, with pinned target folder. A *Setting* form never existed here, and that was not an oversight: the form engine only renders the *value* as a Pebble template, the key is literal, so a form could not create `jaglan.mount.<self-chosen-name>.*`. With one document per mount, the filename carries the identity, and the problem is gone.

**A Kit must not provide a `local` mount.** An `ode` mount is a connector like a feed source and expressly permitted — an archive serving its own files is the case for which provisioning exists. `local`, however, points to the file system of *this* Pod, and Kits install unattended from hosts that do not belong to us (`KitInstaller.requireNotLocalMount`; an unparseable mount document is also rejected). This is the second barrier besides `vance.jaglan.local.allowed-roots` — the property says which trees may be mounted at all, this guard says who may decide that.

### 4.1 Protocol `local`

A directory on the Brain's machine. Extras: `rootDir` (absolute, required), `writable` (Default **false**), `metadataTtlSeconds` (Default 60).

**Read-only by default**, because this protocol can write to the host file system, and one should not gain this ability by omission. Confinement via `WorkspaceRootService` (symlink-aware, same as `work_file_*`); an escape is a **rejection**, not a failure — a retry does not make `../../etc/passwd` legal.

### 4.2 Protocol `ode`

A foreign application that embeds `vance-ode-jaglan`. Extras: none; `baseUrl` points to its file endpoint (there default `/ode/files`).

### 4.2a Protocol `demo`

A source that **calculates its content itself** — the reference for [parameterized views](#5a-parameterized-views-query-views) and the only one that does not require a second process. Extras: `metadataTtlSeconds` (Default 60). Created via the `mount-demo` template.

It serves `readme.md` (explains itself) and `analysis.yaml` as `kind: chart` — without a query over a default window, with `?from=&to=` over the requested one. Everything is derived from path and query: no disk, no socket, no state, thus byte-identical on every Pod and in every test.

**It exists because the feature is otherwise not manually accessible.** A query is currently only generated by the REST endpoint or an agent; until the form child is ready, there is no interface for it — and `local` serves files without parameters, `ode` requires a running foreign application. A fixture that only exists in a test run does not answer "does this work in my Brain".

**No property gate**, unlike `local`: this protocol exposes nothing. It only appears where someone has written `protocol: demo`.

### 4.3 `cache` — the local ceiling over the source's declaration

How long a response is valid is first stated by **the source** (`metadataTtl` in its Capabilities). `cache: false` is the local ceiling above it and can only say *less*, never more — the one thing an operator on the other side cannot fix is a source that errs about the durability of its responses, because the result is outdated documents that look like ours.

It **clamps** the TTL to `JaglanCapabilities.MIN_TTL` instead of removing it: the shell row is what the `_ext` tree is created from at all, so "never fresh" is not a possible state. The floor is as close to *always ask anew* as the model gets.

Today, this affects listings and metadata, because content is passed through with every read anyway (mounted rows have no `storageId` and fall out of the ETag path). If content caching is built, this is the switch that is already in place.

### 4.4 `readerIdentity` — what the source learns about the reader

Subsystem-wide vocabulary, shared with [Centauri](/specs/centauri-service) §6: `none` (Default) | `pseudonym` | `identity`. It is in the **configuration file** and never in a capability declared by the source — this is our policy about our users, and a foreign system does not say what it wants to know about the people who read it.

Three purposes, three payloads, and only the last requires a true identity:

| Purpose | Payload | Content per reader |
|---|---|---|
| Presentation (selection, bookmarks, language) | Pseudonym sufficient | same |
| Authorization ("may he?") | Identity | same — or rejection |
| Assignment ("whose data?" — Drive, mailbox) | Identity | different, and that's the point |

**Jaglan currently transports none of this.** No method on `JaglanPort` carries a user, nor does the document read path that calls them — the counterpart only sees the mount's credential, so it authorizes at the **installation** level. `pseudonym` and `identity` are therefore **rejected and logged** during loading, not accepted and ignored.

Two things must be clarified before transport, not after:

- **What is transmitted** — clear name/login or a resolvable handle. For assignment and authorization, a salted pseudonym is generally not sufficient: the source cannot derive authorization from it without maintaining its own assignment table.
- **Where a per-user mount belongs** — the shell row is keyed on `(tenant, project, mount, path)`, **not** the user. If a source provides different content per user, two readers share a row, and **filenames** leak before bytes are discussed. A per-user mount therefore belongs in a `_user_*` project; in a shared project, a mount is by definition a shared service account (`readerIdentity: none`).

**The ceiling is set by the Tenant** — `SourceConfigLoader` centrally caps the value against the identically named `_tenant` document, see [Centauri §6](/specs/centauri-service).

## 5. The Wire Contract (`ode`)

`GET capabilities` · `GET stat?path=` · `GET list?path=` · `GET content?path=` · `PUT content?path=` · `DELETE content?path=` · `GET search?q=&limit=`

Three key properties:

**Content goes as bytes, without JSON wrapper.** A mount exists so that a large file does not need a copy on both sides; an envelope would create exactly that.

**404 vs. 5xx is the most important line.** 404 means "the source says: I don't have it" → the metadata row is deleted. Everything else means "could not respond" → the row remains. If they are confused, a brief outage tells someone their document does not exist. An unknown error therefore counts as **transient** — this is the safer of the two defaults.

**Read-only is 405, not 403.** It is a property of the source, not of the one asking; 403 sends a reader looking for a credential problem.

### 5.0a `list()` is complete — and that is crucial, not forgotten

`list?path=` has **no limit and no cursor**, unlike the `search?q=&limit=` next to it. This is a decision, and the reason is on the reader side: `JaglanShellService.pruneVanished` **deletes every row that the listing did not mention** — a listing is authoritative for its folder, otherwise a file deleted at the source survives until TTL. A page of N entries would thus not be a partial view, but a **deletion of everything beyond**.

The consequence for the source: it keeps its folders **enumerable**, instead of paginating. The archive mount of hrafnagud does exactly that — its tree is `Year/Month/Day/Hour/Minute`, thus inherently small everywhere (12 / 31 / 24 / 60, the leaf a minute).

For sources that do not adhere to this, there is a **cut on the reader side** (`vance.jaglan.max-folder-entries`, Default 5000, `0` = off): if a listing provides more entries, the folder is **not materialized** — no upsert, **no prune** (the invariant "prune only with complete listing" remains intact) — and the folder marker receives an error message stating the number, the limit, and the workaround. Existing rows remain and are then **older than they appear**; this is exactly what the message says.

Without this cut, mounting a directory with 100,000 files turns an expansion into 100,000 individual upserts plus a folder-wide prune scan — the source is in the right, the reader is not prepared for it. An *unbrowsable* folder with justification is the better half of the trade-off; a partially displayed one would only be available with partial listings, and those cost the deletion semantics.

**This becomes visible via `mountFailure`** in the folder response (`DocumentFolderListResponse`) — the same row also carries the *failed refresh*, which previously did not arrive anywhere at all. Both cases would otherwise look like an ordinary, credible folder, in the cut case like an **empty** one — and "empty" is the one thing a reader must not be told about a folder that no one could read. The Cortex tree shows ⚠ on the folder plus the message, the document view places it **before** the mount-wide status (the folder is the more precise statement).

### 5.1 Caching is a permission

`metadataTtl` in the Capabilities says how long **listings and metadata** may be cached — never content, which is passed through anyway. `Duration.ZERO` means "do not cache" and is clamped to a floor instead of falling to the default: a source that says "never" must not be cached for the default interval.

A source that does *not* allow any metadata persistence cannot be operated with this structure — the row *is* the cache — and will be rejected during configuration instead of partially functioning.

How long we trust the **self-description** of a source is another question with a different answer: `vance.jaglan.capabilities-ttl-seconds` (Default 1800), i.e., our policy, not a field of the source.

## 5a. Parameterized Views (Query-Views)

The same path with a query is a **calculated view** of it:

```
_ext/hrafnagud/analysis.yaml                → the document
_ext/hrafnagud/analysis.yaml?from=…&to=…    → a view of it
```

The same relationship as on the web between `diagram.html` and `diagram.html?from=…`. This turns calculated content — an evaluation over a time window — into ordinary documents that the existing child renderer draws, without a second data channel.

**The query is a read parameter, not part of the identity.** It creates **no** separate Mongo row and is **never** in the path. More depends on this than it seems:

| remains untouched | because |
|---|---|
| `JaglanPaths.documentId()` | the hash covers `(tenant, project, mount, path)` — no variant IDs |
| `(tenantId, projectId, path)` unique | `findByPath` and `lookupCascade` (100+ call sites) would otherwise have to deal with two rows per path |
| Extension, Mime, and Kind detection | none of the places that branch on file extensions ever see a `?` |
| `list()` | no variant rows are created that could appear |

The last point is not an additionally enforced rule, but the same decision from the other side: `list()` enumerates **what exists**; a parameterized view is something that can be **queried**, and its parameter space belongs to the source.

**The source declares it** — `supportsQuery` in its Capabilities, Default `false`. A query against a mount that has not declared it will be **rejected** (`JaglanAccessException` → 409 `mount_refused`), not silently dropped. This is the crucial security property: a discarded query returns the **unparameterized** document — a diagram for the wrong period that looks like a valid response. A rejection is visible. The same asymmetry is set as default on `JaglanInstance.open(path, query)`, so that even a protocol that bypassed the gate would not silently swallow it.

The gate fetches the declaration on demand (`warm`), not cache-only: answering "this mount cannot take parameters" from a cold cache immediately after a restart would be the worst available information. An unknown declaration is `503`, not a rejection.

**Two namespaces in one query string.** `kind=` belongs to the [reference grammar](/specs/document-refs), `download=` to the content endpoint. Both are **removed** before forwarding (`MountQuery`, a list for all interfaces) — removed and not rejected, because they are legitimately present in the normal case. A name in the list is not grammar, but an **access date**: `token=` is how a browser authenticates a content URL that cannot carry a header (`<img src>`); it was initially missing and caused damage on both halves — a saved document responded `400` because the remaining query looked like a parameterized read, and a mounted one forwarded the caller's live session token as a read parameter to the foreign source. Conversely, a reader query on the `ode` wire **must not declare `path=`**: this wire carries the document path in a parameter of that name, a second one would shadow it and read a *different file* than the addressed one. This is rejected.

**No caching.** `GET /brain/{tenant}/documents/{id}/content?…` responds for mounted documents with `private, no-store` anyway — there is no honest validator because the row has no `storageId`. The rule is simple and applies without exception: **Query means no caching, no query means ordinary document.** Refinements like "a closed time window is immutable" are rejected — closed is the *query*, not the *data situation*: latecomers, corrections, and re-ingest are the norm in an analysis system.

To get something cacheable, use **no** parameters: a stable result is materialized under an ordinary path and is then an ordinary document with everything that entails. **The address form is the declaration.**

**Prerequisite, explicitly stated:** the source responds within a single read operation. There is no job, no `runId`, no status document. The strictest barrier is the embed in a Workpage, which renders with every opening and per viewer. Derivation, rejected designs, and the open remainder: `planning/jaglan-query-views.md`.

## 6. Access and Protection

`MountAccess` (`UNKNOWN` / `RO` / `RW`) travels as a transient field on `DocumentDocument` and in `DocumentDto` to the client. It is **ergonomics, not authorization**: an editor with `RO` renders read-only instead of offering a save that would be rejected.

**Protection** runs via the existing [Document-Lock](/specs/document-lock): a read-only source writes `lockedFor = {AI, USER, KIT}` into the row, which already causes any writing interface to reject with a message (REST 409 `document_locked`, Tool-Message, Kit-Skip) — instead of each individual one needing a mount check.

`UNKNOWN` deliberately remains **writable**: a brief unavailability must not become a lock that no one can explain. The source rejects at write time if it must.

**Who owns the field depends on the direction — intentionally asymmetrical.** For `RO`, **every** refresh sets `lockedFor` anew: this is the standing response of the source, and a row that loses its lock between two listings would be writable for the duration of the freshness window. For `RW`, however, the field is only seeded **on creation** (`setOnInsert`) — there, the value belongs to the **human**: a user lock set via `PATCH /lock` that disappears on the next `stat` is exactly the "setting that is gone after a reload" that §9 considers worse than a rejection.

The price is named: a mount that flips from `RO` to `RW` retains its locks until someone deletes them. This direction is rare, visible in the UI, and fixable there — and the error points in the direction where a write operation is rejected instead of falsely permitted.

## 7. Visibility in the Tree

`_ext` and `_ext/<mount>` are **synthetically mounted** — into all three folder interfaces (`extractFolders`, `listFolders`, `listByFolder`), exactly two levels deep, and only if Jaglan reports a source. Without this, the namespace has no entry point: metadata rows are only created when someone lists a mount folder, but no one can list a folder that is not displayed.

Everything below `_ext/<mount>` appears after it has been listed and is then an ordinary derived folder. Listing a mount folder triggers the actual `list()` against the source if the folder marker has expired.

**The numbers are honest or absent.** `FolderInfo`-Counts are nullable; for a mount: fresh folder marker → counted rows, otherwise the source's declaration, otherwise **unknown**. An invented number in a file tree costs trust in the entire view — `0` reads as "empty folder", the number of entries fetched so far as "3 documents" where 5000 exist.

**No foreign call in a folder listing.** The mount list comes from configuration plus capabilities cache; a cache miss reports `UNKNOWN` and is not fetched synchronously. Otherwise, a project with five configured mounts, three of which are dead, pays three timeouts before the tree appears.

A **search**, however, may fetch. This is not a contradiction, but a finer version of the same rule: a listing fans out over N mounts, a search is an explicit action against *one* named mount — the same consideration that `stat` and `list` have long made. Therefore, the caller does not decide whether a mount can search, but the dispatcher, where the capabilities lie (`JaglanPort.search` returns hits **and** outcome). Decided from a cold cache, the answer was once "this source cannot search" about a source that can.

### 7.1 What an empty folder says

`GET /brain/{tenant}/mounts?projectId=` (`MountListResponse`, `Project` READ) names the configured sources with `access`, `itemCount`, `canSearch`, and a `statusText`. Necessary because a folder listing cannot express the differences: an unreachable source and a truly empty directory are both zero files.

**A status line only appears on a genuine failed attempt.** A cold capabilities cache — the normal state in the first few minutes after a restart — is *not* a failure; reporting it as one would make every healthy mount look broken. The cache distinguishes this via its error memory.

`?refresh=true` discards the resolved mounts and their declarations. The same form as with Zarniwoop and Centauri, and for the same reason: a five-minute TTL is indistinguishable from a misconfiguration for someone who has just written the settings — waiting must be convertible into a button. Remains READ, because it clears caches and changes nothing; the **shell rows** remain, because a configuration re-read says nothing about content.

## 8. LLM-Surface

| Tool | Purpose |
|---|---|
| `mount_list(path?, refresh?)` | List mounts or browse a folder |
| `mount_search(query, mount?, limit?)` | Let the sources search their own catalogs |

Both `deferred` (see [server-tools](/specs/server-tools) §14) — irrelevant for most turns.

**The search is delegated.** Brain-side RAG does not apply to mounted content — indexing a foreign library into one's own vector DB is not the goal — but the library can search itself, and that is cheaper than traversing its tree. A source without search capability appears in `notSearched`; for these, one must browse, and an empty result there means *no one searched*.

**This also applies to the search field of the interface.** Within a mount, it was not merely useless, but misleading: the folder search is a Mongo query over existing rows, and in the mount, these are only the entries that someone has browsed — it reported zero hits for a source with tens of thousands. Now it is also delegated, and `MountSearchOutcome` on the response says which question was answered: `DELEGATED` (the source searched; the hits span the **entire** mount, not the viewed folder), `UNSUPPORTED` (not asked), `UNAVAILABLE` (asked, no answer). Without this field, the three cases would look the same, and *still incomplete* is the worst of the variants.

**The Manual catches the crucial failure pattern** (`_vance/manuals/mounted-docs.md`): `doc_find`, `doc_grep`, `memory_search`, and `doc_list_in_folder` scan `documents/`, and `_ext` falls out via `resolveScope` — an agent thus truthfully responds "no such document", even though the file is there. Rule: *never* declare a file unavailable without first calling `mount_list`.

## 9. What does not apply to mounted documents

| Feature | Status | Reason |
|---|---|---|
| Summary | dropped | foreign content that we do not own |
| RAG / Embeddings | dropped | indexing a foreign library into one's own vector DB |
| Versioning / Archives | **permanently** dropped | archiving means copying bytes — contradicts pass-through |
| Trash | dropped | Trash moves to `_vance/trash/`, i.e., out of the mount: this breaks address and derived ID |
| Delete | to the backend | deleting means deleting in the source, or not at all |
| Colors, Notes | not yet | architecturally free (the row carries them), pure Scope decision |
| `kind` | **on first read** | comes from the Front Matter, i.e., from the content — reading it on Stat would mean a download per file in the folder listing |

Summary and RAG are excluded in the **Claim-Queries**, not just via flags: `autoSummary` is derived from the Mime-Type, so a mounted Markdown would have qualified, and a flag can flip a tool.

**`kind` is added on first read.** The metadata row is created from a `stat` that deliberately does not fetch bytes — but Kind is in the Front Matter. The first access to the content is therefore the moment when it is available anyway: there, the header is parsed and the row is supplemented once. Guarded so that it remains a one-time operation (only mounted, only if `kind` is still missing, only with textual Mime) and best-effort — a failed write operation must not abort the read; in the worst case, the next access tries again.

What does not apply is **named** rejected instead of silently doing nothing — a color that is gone after a reload is worse than a rejection.

## 10. Non-Goals

- **No bidirectional sync**, no conflict merge. The 3-way merge of the `documents` channel applies to Brain documents.
- **No live guarantee.** A change that happens in the source does not generate a `DocumentChangedEvent` — there is no webhook. Refresh is the answer, not Push.
- **No Presence** on mount paths.
- **No Kits, no Templates** after `_ext`.
- **No separate app.** The Cortex is the interface.
