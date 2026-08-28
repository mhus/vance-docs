---
title: "Vancetope Application — `app: links`"
parent: Specs
permalink: /specs/app-links
---

<!-- AUTO-GENERATED from specification/public/en/app-links.md — do not edit here. -->

---
# Vancetope Application — `app: links`

> **Link Manager** built on the [doc-kind-application](/specs/doc-kind-application) foundation.
> A folder + `_app.yaml` = a link collection: an ordered list of **external URLs**,
> grouped by headings, displayed as preview cards in a hit list format.
> The existing Link Preview Proxy of the Brain fetches the image and teaser;
> they are only saved if someone types them manually.
> See also: [app-binder](/specs/app-binder) (internal counterpart),
> [app-search](/specs/app-search) (card view model),
> [doc-kind-application](/specs/doc-kind-application).
> Implementation track: [`planning/app-links.md`](/specs/app-links).
> Standalone Addon `vance-addon-brain-links`.

---

## 1. Purpose and Scope

The [binder](/specs/app-binder) collects references to **Project documents**, while
`links` collects references to **external resources**. These are intentionally
two separate apps and not just another entry type in the Binder: a Project
document has a path and a kind (and thus an embed renderer and an editing target),
whereas an external page has neither. It has a host, a preview image, and a
description that *it* provides about itself. A single Entry model for both would
be incorrect for each half.

Use cases: reading list, tool collection, research repository for a topic,
bundle of sources alongside a spec.

What `links` is **not**: an archive. The content of the linked page is not
copied. To retain a page, fetch it with `web_fetch` and create a document – that
is the clip path, and the search app is responsible for it, not this app.

## 2. Folder Layout & Manifest

```
reading/links/
├── _app.yaml          ← kind: application, app: links
└── _index.md          ← auto-generated (link list), only refresh() writes
```

```yaml
$meta: { kind: application, app: links }
title: "Reading Material"
description: "What I still want to read"
links:
  groups: ["Rust", "Later"]          # Heading order; can be empty
  entries:
    - url: "https://blog.example.com/async"
      title: "Async Rust, revisited"   # Snapshot on creation
      group: "Rust"
      tags: ["async"]
      addedAt: "2026-08-21T08:00:00Z"
    - url: "https://example.org/pin"
      group: "Rust"
      teaser: "The clearest Pin explanation I know."
      note: "Send to the team."
  index: { outputPath: "_index.md" }
```

The manifest is written via `ApplicationDocument` + `ApplicationCodec` (never
manually). For the web create dialog, the Addon provides a bundled
[Document Template](/specs/document-templates) `links` (`name: { mode: fixed, value:
_app.yaml }`) with only two fields — title and description. Links and groups are
then created within the app or via the Agent; a form field for this would be a
second input path for the same data.

### 2.1 Entry Model — What is Saved and What is Not

| Field | Saved | Meaning |
|-------|-------|---------|
| `url` | yes | The link. **Identity** of the entry. |
| `title` | yes | Snapshot: fetched once from the page on creation (or typed). |
| `teaser` | **only if typed** | Custom text. Empty ⇒ live description from the page. |
| `image` | **only if typed** | Custom image. Empty ⇒ live `og:image` from the page. |
| `group` | yes | Heading. **Pure UI ordering — no Scope**, no rights/cascade. Empty ⇒ the leading "ungrouped" section. |
| `tags` | yes | Free labels, filters within the app. |
| `note` | yes | Custom annotation. Deliberately **separate** from the teaser: the teaser describes the page, the note describes why *this* list includes it. |
| `addedAt` | yes | Time of creation. |

This asymmetry is the core design decision of this app. Teaser and image come
from the [Link Preview Proxy](#4-teaser-und-bild--der-hybride-pfad), which
caches OG data per URL **tenant-wide** for one week. A second copy in the
manifest would become stale precisely where no one refreshes it. The title is
the exception because it is the field that must remain readable in a list if the
page is gone.

This implies for Agents and the UI: **an empty `teaser` does not mean "no
teaser," but "what the page says today."** Anyone who writes a teaser without
instruction freezes a guess at the point where the current text would otherwise
be.

### 2.2 URL Normalization and Identity

`LinkUrls` is the sole authority that determines what a link *is*. A cleaned
form is saved; addressing (and deduplication) occurs via precisely this form,
so that "remove the link I see" cannot miss its target.

- **Only `http`/`https`.** A `javascript:` or `data:` value in a list rendered
  by the browser as clickable cards is an attack on the reader; the `safeUrl`
  guard in the client is the second line of defense, not the first. An address
  without a scheme gets `https://` – this is what a human means, and a rejection
  would turn the normal case into an error.
- **Host lowercase, path not** (`/Guide` and `/guide` can be two pages).
  Default port is removed, empty path becomes `/`.
- **Fragment and query remain.** `…/guide#chapter-3` and `…/guide` are two
  entries – otherwise, bookmarking a section would be impossible, and "add did
  nothing" is the hardest-to-explain failure a list can have. Guessing and
  stripping tracking parameters is not our decision.

### 2.3 Groups

`groups` exists **alongside** the entries and is not derived from them – for one
reason: an **empty** group must be able to exist (e.g., create "Later" before
anything is in it). Groups that only appear on one entry are appended by
`orderedGroups()`; a manually written manifest therefore does not need to
declare anything.

The flat list remains **group-contiguous**: a new entry lands at the end of
*its* group, a group change re-anchors it at the end of the new one. The
generated `_index.md` and every reorder round-trip read it this way.

## 3. Generated Artifact — `_index.md`

A `kind: workpage` document (link list grouped by group, ungrouped leading),
deterministically generated from the manifest, only `LinksApplication.refresh`
writes to it. It exists so that the collection is readable outside the app
(Chat, Workpage embed, export) and discoverable for RAG.

Per entry: title as a link, followed by **teaser and note** in that order,
separated by ` · `, the note *italicized*. The note is included because it is
the half that **cannot** be retrieved from the page – omitting it from the one
artifact that carries the collection outwards (Chat, Workpage embed, export)
loses precisely what someone wrote themselves.

Title and teaser are **external text** — `[`, `]`, `\`, `*`, `_`, and `<` are
escaped, multi-line texts are collapsed to a single line. Without this, a `]` in
the `og:title` would prematurely end the link label and place the rest as loose
text next to a broken URL; and because the note is wrapped in `*…*`, a single
`*` within it would close the italics and take the rest of the line with it.

## 4. Teaser and Image — The Hybrid Path

Both run via `GET /brain/{tenant}/link-preview?url=…`
(`LinkPreviewService`, see [llm-resource-management](/specs/llm-resource-management)
for the provider context) — the same proxy used by link cards in Chat and hit
images in the [Search App](/specs/app-search). No second fetch path and nothing the
product doesn't already do.

- **Server-side**, it is queried **once**: on creation, for the title. An
  unreachable page is a normal response, not an error – the entry is still
  created, the card falls back to the hostname. Adding a link must not depend
  on the link currently responding.
- **Client-side** (`linkPreview.ts`) lazy per card on visibility
  (`IntersectionObserver`, `rootMargin: 200px`). A list of eighty bookmarks,
  of which a reader scrolls a third, must not issue eighty external requests
  for twenty lines. The **negative** response is also saved – otherwise, a page
  without OG tags would be queried again on every re-render.
- "Refresh preview" in the ⋯ menu discards the local response and queries again;
  the server cache holds a success for a week, and someone who just fixed a page
  wants to see that now.

## 5. Java Foundation

`de.mhus.vance.addon.brain.links`:

- `LinksApplication` (`@Service implements VanceApplication`, `appName()="links"`)
  — `create()` writes the manifest, `refresh()` regenerates `_index.md`,
  `promptInject()` provides the Active-App-Hint, `describe()` + `status()` feed
  the [Common Desktop](/specs/damogran-system) card (icon 🔗, "N links").
- `LinksStore` — the only place that reads and writes `_app.yaml`; all document
  access via `DocumentService` (data sovereignty).
- `LinksConfig` / `LinkEntry` — typed, **lenient** view of `config.links`. A
  defective line costs the line, not the manifest where it would be repaired.
  Shorthand "just a URL as a string" is read.
- `LinkUrls` — Normalization + Identity (§2.2).
- `LinksManifestOps` — read-modify-write (add/remove/update/reorder/groups/
  rename-group) via `ApplicationCodec` + `LinksStore`, never a YAML partial patch.
  `addEntry` appends **at the end of the group**: insertion is group-relative
  because the app renders ungrouped entries first and then groups in declared
  order — where a group block lies in the flat list is not visible anywhere,
  only the order *within* the group.

`LinksApplication` also implements the [Milliways](/specs/milliways-system)
capability `acceptsShare`/`acceptShare` (§7a there): a shared **link** becomes
an entry in the leading, ungrouped section — which the app renders first, so the
new entry is visible without having to expand anything. It is written via
`LinksManifestOps.addEntry`, not bypassing the manifest; `teaser` and `image`
are deliberately left empty (§4). A share **without** a link is rejected — that
is what the [Binder](/specs/app-binder) is for. The share dialog does not ask for
group and position: it is uniform across all accepting apps, and sorting is done
within the app.
- `LinksAppController` — REST under `/brain/{tenant}/addon/links/...`
  (`RequestAuthority`-Enforcement).

### 5.1 The null/blank Convention

Through every update method (and thus through `PATCH` and `links_entry_update`),
the same rule applies as in the Binder: **`null` leaves a field untouched, an
empty string deletes it.** Here, it is not cosmetic — a link list is edited in
small touches, and a teaser silently lost during a group change is the error
no one notices until it's gone.

One exception: for `title`, "delete" means **fetch anew from the page**. The
title is the field for which the app has promised readability; setting it to
nothing would be the only interpretation that breaks this promise.

## 6. REST

All with `?projectId=&folder=`, `RequestAuthority.enforce`. Authorization is that
of the **Project** — `READ` to view, `WRITE` to modify. There is no right per
link: the manifest is *one* document, and claiming otherwise would be a rights
model that the storage cannot support.

| Method | Path | Authority |
|--------|------|-----------|
| `GET` | `/scan` | READ |
| `POST` | `/entry` (Body `{url,title?,teaser?,image?,group?,tags?,note?}`) | WRITE |
| `PATCH` | `/entry` (Body as above; `null` = unchanged, `""` = empty) | WRITE |
| `DELETE` | `/entry?url=` | WRITE |
| `POST` | `/reorder` (Body `{orderedUrls}`) | WRITE |
| `POST` | `/groups` (Body `{groups}`) | WRITE |
| `POST` | `/group/rename` (Body `{from,to?}`; empty `to` dissolves the group) | WRITE |
| `POST` | `/rebuild` | WRITE |

Every **mutating** response is the complete `LinksView`. This is not verbosity:
a group change re-anchors the entry, so the order after a change is a server
response and not something the client can assume.

`/reorder` is intentionally tolerant — URLs unknown to the server are ignored,
entries not sent by the client retain their relative position at the end. A drag
on a list that has changed in the meantime must not shorten it. `/groups`
**cannot** drop a heading that still has links attached (it would return via
`orderedGroups()` anyway) — `/group/rename` with an empty `to` is for that.

## 7. LLM Tools

| Tool | Purpose |
|------|---------|
| `links_app_create(folder, title?, description?, groups?, overwrite?)` | Bootstrap: Manifest + `_index.md`. |
| `links_entry_add(folder, url, group?, title?, teaser?, tags?, note?)` | Create link (idempotent on URL). |
| `links_entry_update(folder, url, group?, title?, teaser?, tags?, note?)` | Modify entry (§5.1). |
| `links_entry_remove(folder, url)` | Remove entry. |
| `links_list(folder, group?, query?, limit?)` | Read inventory. |
| `links_validate(folder \| content)` | Self-check, §7b. |
| `app_rebuild(folder)` | Generic — regenerates `_index.md`. |

Two things are deliberately **not** tool parameters or **not** tools:

- **`image`.** A model asked for an image invents a plausible URL — and the
  image is precisely the field that fetches itself from the page. Setting an
  image manually remains a UI task.
- **Reorder and Group Rename.** UI operations; add/remove/update covers
  everything an Agent is asked to do.

`links_list` returns what is **saved** and does not fetch previews: if someone
asks "what is in this list," they want the inventory, and issuing fifty external
requests for an answer that names the entries by their title anyway would be a
waste. To *read* a page: `web_fetch` on the URL.

Manual: `manual_read('app-links')`. Arthur prompt fragment:
`_vance/prompts/arthur/links.md` (§7a in [prompts-and-manuals](/specs/prompts-and-manuals)).

## 7b. `links_validate` — What the Lenient Reader Swallows

The other content apps each have a validator (`canvas_validate`,
`workbook_validate`), and there is a generic `kind_validate`. The latter does
**not** help here: `application` is registered as a mere `KindHandler`
(`() -> "application"`) and thus inherits the no-op `validate` — on an
`_app.yaml`, it answers "ok" without having checked anything. No app manifest
in the tree is semantically validated.

For `links`, this is more critical than for workbook/canvas: there, content
resides in separate documents per kind, **here the manifest is the content**,
and Agents are allowed to write it with the generic `doc_*` tools. And the
reader is intentionally lenient (§5) — a line without a usable URL is
*silently* skipped so that a typo doesn't kill the app where it would be
repaired. Correct for rendering, wrong for authors: the Agent receives no
complaint, the card simply disappears.

`LinksValidationService` therefore reads the **raw** YAML and reports exactly
what the loading path discards. Each check has this form — it names something
that would otherwise happen *silently*:

| Code | Level | What otherwise happens silently |
|---|---|---|
| `url-missing` / `url-not-a-string` / `url-unusable` | error | The entry disappears (`LinkEntry.fromMap` → `null`). |
| `url-duplicate` | error | The second entry is **unreachable** — remove and update resolve via the URL and both land on the first. |
| `wrong-app` / `wrong-kind` / `meta-missing` | error | The folder does not open as a link list. |
| `entries-not-a-list` / `block-not-a-mapping` | error | *All* links are ignored. |
| `field-ignored` / `tags-not-a-list` | warning | Field of wrong type is discarded on read. |
| `image-not-http` | warning | Renders nothing — and "no image" is indistinguishable from "the page has none". |
| `group-duplicate` / `group-not-a-name` | warning | Heading is deduplicated/discarded. |
| `index-absolute` / `index-escapes` | warning | The generated index lands outside the app folder. |
| `yaml-broken` / `empty` / `not-a-mapping` | error | Only finding — anything further would be guessing on a broken tree. |

**What is deliberately not reported:** a group that exists on an entry but is not
declared in `groups`. `orderedGroups()` appends it, it works. A validator that
complains about correct files teaches its reader to ignore it — against this
stands a test that requires `findings().isEmpty()` for a healthy manifest.

Two call forms, exactly one of them: `folder` checks a saved manifest
(post-write), `content` the text the Agent is about to write (pre-write) — the
same form as `kind_validate`. Read-only, advisory, never blocks a write.
Envelope is the shared `{ target, ok, errors, warnings, findings[] }`.

## 7a. Selection for the Chat Agent

Clicking a card selects it, a second click deselects it (ring in Primary color,
the same visual grammar as an opened hit in the [Search App](/specs/app-search)).
The selection travels via `vance:report-app-selection` → `activeApp.selection`
→ `PromptInjectContext.selection()`; all interactive elements in the card
(title link, tags, ⋯ menu) stop the click, otherwise opening a link would also
change the selection.

**Only the URL travels.** The Search App sends `title — url` because a search
hit is not stored server-side anywhere; a link *is* stored — it is a line in
this manifest. So the key travels, and `appendSelection` reads the line from the
manifest. This provides **one** authority for what the entry says, instead of a
second copy that is correct until someone edits the first. Three details, each
from a specific misbehavior:

- A URL that is **no longer** in the list is reported as exactly that (not
  swallowed): the reader is looking at *something*, and "I see no selection"
  would be the wrong answer.
- A **missing teaser** is explicitly named as "comes live from the page,"
  otherwise the model reads it as "this link has none" and offers to write one.
- When **leaving the tab**, the selection is withdrawn.

### The word "selection" is burned

The first version wrote *the reader has this link **selected***. The Engine
received the correct data and delivered it **with reservation**: "I cannot read
your current selection — nothing was marked when sending," followed by the entry
in quotes as "stored," and finally the request to "mark it again in the editor."
Reason: for a Chat Engine, *selection* is a **text range in a document**
(`boundDocSelection`) — and that was indeed empty. The Search App never had
this problem because it says a hit is **open**.

From this, the rule for **every** app with `promptInject`: name the action
("has clicked one card"), state what it is **not** ("NOT a text selection
inside a document"), and forbid the excuse ("Never answer that no selection
arrived, and never ask them to mark it again"). A test keeps the old phrasing
away (`doesNotContain("has this link selected")`).

## 8. Web UI

Kind registration `application:links` → `LinksAppKind.vue` (id-Lookup,
`matches: () => false`), immersive app view.

- **Input line at the top:** a text field instead of a dialog — creating links
  is the one thing this app does constantly. **Multiple lines are multiple
  links**; this is how a collection actually starts. A failure per line does not
  discard the others. Next to it, an optional group field (with `suggestions`),
  "+ Group" and "↻" (Rebuild).
- **Filter line:** Free text filter plus group chips with counters (`All` /
  `Ungrouped` / per group). Both filter only locally — typing costs nothing.
- **List:** **one column**, `max-w-3xl`, groups as headings (ungrouped leading).
  No grid, for the same reason as in the [Search App](/specs/app-search): these are
  things to *read*, and a title with a teaser next to a thumbnail is read, a
  wall of thumbnails is only looked at.
- **Card:** Image (`LinkPicture`, lazy, `referrerpolicy="no-referrer"`), title
  as `target="_blank"` link via `safeUrl`, meta line (Host · `og:site_name`, if
  different · Date), teaser, note italicized, tags as filter buttons.
  **Custom teaser and page teaser are in the same slot, but with different
  opacity** — it must be visible which one an edit would replace.
- **Clicking a card** selects it for the Chat (§7a), clicking again deselects it.
  The ring is the same one the Search App places on an opened hit.
- **⋯ menu per card:** "Edit…" (dialog), "Refresh preview", "Remove".
- **Edit dialog:** Title, Teaser, Group, Tags, Note, Image URL. Teaser and
  image fields show as **placeholders** what the page says today, and only send
  *changed* fields — untouched ones thus retain the server-side `null`. Teaser
  and Note run via `VTextarea` with **`:mono="false"`**: the component is
  `font-mono` by default because it grew around code and YAML — for a sentence
  someone writes in their own words, monospace reads as "this is data." The prop
  is additive (default `true`), no existing consumer changes.
- **Drag & Drop:** native, as in the Binder. Drop on a card reorders (and adopts
  its group on group change), drop on a heading moves to the end of the group.
  The group change goes out **first and alone** because the server re-anchors
  the entry; then the reorder explicitly names the entire sequence.

All building blocks are `@vance/components`-primitives — no DaisyUI classes in
the Addon (§7 [web-ui](/specs/web-ui)).

## 9. Anti-Patterns / v1 Limitations

- **No archive.** Page content is not copied; "Clip" is a different path.
- **No dead link check.** Nothing periodically checks if a URL still responds
  — a crawler across all tenants' bookmarks is a decision that does not fall as
  a side effect of an app.
- **No tracking parameter stripping** (§2.2) and no auto-deduplication via
  redirect targets: the preview proxy knows `finalUrl`, but merging two entries
  because they land at the same place today is an assumption.
- **No live updates.** External changes to the manifest only arrive on reload
  (the `documents` channel is not connected).
- No import from browser bookmarks, no export except `_index.md`.
- **v2 earmarked:** Clip path ("save page as document", shared with the Search
  App), import from `bookmarks.html`, sorting modes (newest first) alongside
  manual order, `documents` channel for live reload.
