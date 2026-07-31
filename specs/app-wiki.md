---
title: "Vancetope Application — `app: wiki`"
parent: Specs
permalink: /specs/app-wiki
---

<!-- AUTO-GENERATED from specification/public/en/app-wiki.md — do not edit here. -->

---
# Vancetope Application — `app: wiki`

> Name-addressed link-graph wiki over `kind: workpage` pages, built
> on the [doc-kind-application](/specs/doc-kind-application) foundation. Unlike
> [app-workbook](/specs/app-workbook) (curated page tree, left sidebar), a wiki is
> **link-graph-centric**: pages are linked by name via `[[Wikilinks]]`,
> navigation occurs via the graph (including backlinks), and folders are
> **Spaces**. Reuse of the `workpage` kind + `@vance/block-editor` — the wiki
> does not invent a new editor.
> See also: [doc-kind-workpage](/specs/doc-kind-workpage), [app-workbook](/specs/app-workbook)
> (model pattern for application scaffolding).
> Implementation track: [`planning/app-wiki.md`](/specs/app-wiki).

---

## 1. Purpose

A Workbook is a **curated book** — the author arranges an ordered
list of pages in sections. A Wiki is a **growing knowledge network** — pages
emerge organically, addressed by their name, connected via
`[[Wikilinks]]`. The two models fundamentally differ in navigation
(tree vs. graph), addressing (sortIndex/Section vs. Name/Slug), and
page creation (explicit vs. clicking a red link).

The Wiki Addon (`vance-addon-brain-wiki`) provides:

- **Spaces** — folders in the path; each Space is a namespace level.
- for each Space, a curated **`main`** start page + a generated **`_index`**.
- **`[[Wikilink]]`** resolution (space-aware) with **red-link creation** on-click.
- a **Backlink Engine** ("What links here").
- **Top-Nav + Full-Width** layout (no sidebar tree), right panel with
  Backlinks / Notes / Versions.

---

## 2. Folder Layout, Spaces & Manifest

A Wiki is a folder with `_app.yaml`. **Spaces are subfolders** — nested
arbitrarily deep; every folder in a page's path (not just the leaf) counts
as a Space and gets its own `_index.md`.

```
handbook/
├── _app.yaml                  ← kind: application, app: wiki
├── main.md                    ← curated Wiki start page (kind: workpage)
├── _index.md                  ← auto-generated: recent-10 + all pages by Space
├── _backlinks.yaml            ← auto-generated: Slug → [inbound Slugs]
├── getting-started.md         ← Root-Space page
├── engineering/               ← Space "engineering"
│   ├── main.md                ← Space start page (curated)
│   ├── _index.md              ← auto-generated: only engineering pages (recursive)
│   ├── deploy-guide.md
│   └── ci/                    ← nested Space "engineering/ci"
│       └── runners.md
└── assets/                    ← images imported via drag & drop
```

```yaml
$meta:
  kind: application
  app: wiki
title: "Handbook"
description: "Team handbook"
wiki:
  index:
    outputPath: _index.md
    showDescriptions: true
  recentLimit: 10
  defaultPageKind: workpage
```

The discriminator `$meta.app: wiki` routes the container via the
Kind Registry to `application:wiki` (Web-UI) or `WikiApplication.appName()`
(Server) — an identical pattern to Workbook/Canvasbook.

### 2.1 `main` vs. `_index`

For each Space, two special pages exist with clearly separated responsibilities:

| Page | Creation | Editable | Role |
|-------|-----------|-----------|-------|
| **`main.md`** | by author (seeded during creation) | yes | curated start page of the Space (Home) |
| **`_index.md`** | `refresh()` generates | **no** (read-only) | complete, current page list |

`main` is a normal `kind: workpage` (no underscore) and appears in the
page list. `_index` is a generated artifact (underscore prefix →
from a `listByKind` perspective, a system file, filtered from the page list). The
root `_index` additionally lists the **10 most recently modified** pages of the
entire Wiki at the top; a Space `_index` lists the pages of that Space recursively.

---

## 3. `[[Wikilinks]]` & Resolution

Pages link to each other by name, not by path:

- `[[Deploy Guide]]` — Name (becomes slug `deploy-guide`).
- `[[Deploy Guide|the guide]]` — with display label.
- `[[engineering/Deploy Guide]]` — with explicit Space.

The `[[…]]` node lives **within the `@vance/block-editor` core** (inline atom
`wikiLink`, Markdown I/O in the inline codec), but is wiki-agnostic: rendering,
clicking, and red-link styling are handled by two **host-injected callbacks**
(`resolveWikiLink`/`openWikiLink`). A Workpage outside a Wiki renders
`[[…]]` neutrally (default resolver `() => true`).

**Resolution Cascade** (`WikiService.resolve`, space-aware):

1. **explicit Space** (`Space/Name`) → search only in this Space.
2. **current Space** — slug in the Space the user is currently browsing.
3. **globally unique** — slug appears exactly once in the Wiki.
4. **ambiguous** — first match + `ambiguous` flag.
5. **missing** → **red link**. Clicking prompts and creates the page
   (`createSpace` = explicit Space, otherwise current Space).

Red-link creation is the defining Wiki behavior: a reference to a
non-existent page is itself the creation trigger.

---

## 4. Backlinks

`WikiService.buildBacklinks` resolves each page's `[[…]]` against its own
Space and inverts the graph to *Target → [Inbound Sources]*
(deduplicated, self-links discarded, key = `relativePath`). `refresh()`
writes it as **`_backlinks.yaml`** (Slug → inbound Slugs) to the Wiki root.

The Web-UI shows "What links here" as a right panel (`WikiBacklinksPanel`),
which queries `GET addon/wiki/backlinks?path=` live and resolves path-precisely (not
slug-merged) — clicking a line navigates to the source page. This makes the link graph
browsable in both directions.

---

## 5. Layout (Web-UI)

`WikiAppKind.vue` (`application:wiki`) — **Top-Nav + Full-Width**, intentionally
different from the Workbook sidebar tree:

```
┌──────────────────────────────────────────────────────────────┐
│ Title │ Space ▾ │ 🔍 search │ ＋ New │ 🏠 │ 📄 │ ↻ │ 🔗 📝 🕐 │
├──────────────────────────────────────────────────────────────┤
│ full-width WorkPageEditor (Page Content)           │ Backlinks/│
│                                                    │ Notes /   │
│                                                    │ Versions  │
└──────────────────────────────────────────────────────────────┘
```

- **Top-Bar:** Wiki title, Space switcher (dropdown over all Spaces), search,
  `＋ New` (page in current Space), `🏠` (Home → root `main`), `📄`
  (open generated index — icon, "Index" only in tooltip), `↻` (Rebuild), and
  the three panel toggles 🔗 Backlinks / 📝 Notes / 🕐 Versions.
- **Main:** the active page via the shared `WorkPageEditor` — full
  width. Generated `_index` pages are read-only (badge "generated ·
  read-only").
- **Right Panel (collapsible):** Backlinks / Notes (`document`-Notes-REST) /
  Versions (`document_archives` + Restore).

**Default Landing = `main`.** When opened, the UI lands on the curated
`main` page (or on the `?page=` deeplink). If `main` is missing — e.g., for a Wiki
created via Doc-Template (only `_app.yaml`) — the UI **does not** jump to
another page, but shows the prompt *"The home page `main` doesn't exist
yet — Create it"*. A click creates `main.md` (title "Main", slug must be `main`)
and opens it. Server-side, `WikiApplication.refresh()` also seeds `main`
if missing (applies to the `wiki_app_create` and `↻ Rebuild` paths).

**Search → Red-Link Creation.** If the search does not hit an existing page slug,
the dropdown offers *"＋ Create page „<query>" in <space>"* — the same
creation-on-missing as a red `[[Wikilink]]`, but from the search.

**Deep-Link + Browser History.** The active page is represented as a **space-qualified
slug** in the URL (`?page=main`, `?page=ops/deploys`, indexes `?page=_index` /
`?page=<space>/_index`) — human-readable, deeplinkable, matching the
`[[Wikilink]]` notation (no Mongo-Id). Page changes push a
History entry (initial landing via `replace`), so browser Back/Forward
works between Wiki pages. The tab-level `?doc=<container>` remains
host-owned.

The editor receives the Wikilink callbacks: `resolveWikiLink` checks synchronously
against known slugs (`view.pages[].slug`) for correct red-link styling;
`openWikiLink` calls `addon/wiki/resolve` and navigates or creates.
Save/Load, Self-Write-Quiet-Window, `vance:`-link routing, image upload, and the
Embed/Form/Compose injects are adopted from `WorkbookAppKind`.

---

## 6. Server Architecture

Package `de.mhus.vance.addon.brain.wiki`. Data sovereignty exclusively via
`DocumentService` — the Addon does not own its own MongoDB collection.

| Class | Role |
|--------|-------|
| `WikiAddon` | `@AutoConfiguration` + `@ComponentScan` (only the wiki package; `workpage` belongs to the Workbook Addon) |
| `WikiAddonMeta` | `VanceAddon` marker (`id=wiki`) |
| `WikiConfig` | typed view of the `wiki:` block in `_app.yaml` |
| `WikiFolderReader` | Scan: `listByKind("workpage")` + prefix filter, Space derivation (incl. ancestors), `_`-filter, `[[…]]`-extraction, Slugify |
| `WikiService` | Resolution cascade, Backlink graph, `pagesInSpace` (recursive), `recentlyModified`, `createPage` |
| `WikiIndexRenderer` | renders `_index.md` (Root: recent-10 + all by Space; Space: recursive) |
| `WikiBacklinksRenderer` | renders `_backlinks.yaml` |
| `WikiApplication` | `VanceApplication`: `create()` (Manifest + `main`-Seed + refresh), `refresh()` (all `_index` + `_backlinks`), `promptInject()` |
| `WikiAppController` | REST adapter, each route via `authority.enforce(...)` |

Pages are `kind: workpage` Markdown with `$meta.kind: workpage` header — the
standard Workpage format recognized by the Block Editor parser and the server-side
`MarkdownHeaderStrategy`. No Workbook module dependency.

**Modified Timestamp:** `DocumentDocument` does not carry `updatedAt`; "last
modified" uses `lastArchivedAt` (bumped on content-changing saves) with
fallback to `createdAt`.

### 6.1 REST — `/brain/{tenant}/addon/wiki/...`

All routes carry `projectId` + `folder` as query parameters.

| Method | Path | Purpose |
|---------|------|-------|
| GET | `/scan` | `WikiView` (Spaces + pages + main/index-Ids) |
| POST | `/rebuild` | regenerate all `_index` + `_backlinks` |
| POST | `/page` | create page (`{title, space?}`) |
| DELETE | `/page/{id}` | move page to trash (only within the Wiki) |
| GET | `/resolve` | resolve `[[target]]` (space-aware) → `WikiResolveResponse` |
| GET | `/backlinks` | inbound links to `path` → `WikiBacklinksView` |
| GET | `/recent` | recently modified pages |
| GET | `/documents/search` | full-text/path search for the Space switcher |

### 6.2 Tools

- `wiki_app_create` — create Wiki App (`WikiApplication.create`).
- `wikipage_create` — create page in a Space.
- `app_rebuild` — generic (not wiki-specific), regenerates indexes +
  backlinks.

---

## 7. Build & Deploy

Standard Addon pipeline (like Workbook):

- `mvn -pl vance-addon-brain-wiki package` → `prepare-package` builds the client
  (`pnpm --filter @vance-addon/wiki build`), `package` assembles the `.vab`
  (Brain-Jar + `client/dist` as Face-Remote + `META-INF/vance-addon.yaml`).
- Client-Federation-Remote `vance_addon_wiki`, exposes `./register`
  (registers `application:wiki`). Tiptap/ProseMirror are **not** shared
  (per-bundle block registry) — the Addon bundles its own editor.

---

## 8. v1 Limitations

- **Notes/Versions** are local panels with the same REST contract as the
  vance-face-Composables (`DocumentNotesPanel`/`useDocumentArchives` are in the
  host, not in an importable package).
- **Picker Modals** (Asset/Link/Embed/Form/Input) are not wired —
  existing blocks render, links fall back to the editor `prompt`,
  image drag/paste uses `uploadImage`. `vance-input`/`vance-button` blocks
  are inert in the Wiki (no Wiki backend endpoint).
- **Ambiguous Slugs** (same name in multiple Spaces) resolve to the first
  match (`ambiguous` flag set); `_backlinks.yaml` merges identical slugs
  across Spaces, while REST backlinks remain path-precise.
- No CRDT — Live updates via the `documents`-channel (Last-Writer-Wins +
  Self-Write-Quiet-Window), analogous to Workbook/Canvasbook.
