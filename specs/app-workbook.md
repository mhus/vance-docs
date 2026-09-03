---
title: "Vancetope Application — `app: workbook`"
parent: Specs
permalink: /specs/app-workbook
---

<!-- AUTO-GENERATED from llm/specification/app-workbook.md (translated from the German specification/public/app-workbook.md) — do not edit here. -->

# Vancetope Application — `app: workbook`

> Notion-style Workbook built on the `kind: application` foundation (see
> [doc-kind-application](/specs/doc-kind-application)). One folder = one workbook.
> Pages = `*.workpage.md` files inside the folder (kind [workpage](/specs/doc-kind-workpage)).
> Sub-folders = sections. Generated artifacts (`_index.md`) regenerate from the
> source pages.
>
> See also: [app-kanban](/specs/app-kanban) (pattern example), [doc-kind-workpage](/specs/doc-kind-workpage) (the Page kind).

---

## 1. Purpose

WorkPage alone (one file = one Page) is sufficient for short notes. As soon as the
user wants to view, navigate, and search multiple Pages together, the
**Workbook** is missing: a container that bundles Pages, generates an overview, and
provides context to the LLM ("you are currently working in the Study Workbook with 12 Pages").

Workbook is the second concrete App after Kanban — same pattern, different
domain. Workflows: "create a Workbook for the WS26 semester with
Pages for each lecture," "add a Page for the
new exam to the Study Workbook," "show me all Pages in the Study Workbook with open
Todos."

---

## 2. Folder Layout

```
studium-ws26/                      ← Workbook Folder
├── _app.yaml                      ← Manifest (kind: application, app: workbook)
├── _index.md                      ← auto-generated (kind: workpage, list of all Pages)
├── ueberblick.workpage.md           ← Landing Page
├── lernplan.workpage.md
├── noten.workpage.md
└── klausuren/                     ← Section = Sub-Folder
    ├── datenbanken.workpage.md
    └── it-recht.workpage.md
```

**Page Discovery**: every `*.workpage.md` (or more generally: every Document with
`$meta.kind: workpage`) in the Workbook Folder or a Sub-Folder is a
Page. System Files (`_<...>`) are ignored.

**Section Convention**: Sub-Folder = Section. Section Name = Folder Name.
Deeper than two levels is allowed but not recommended — the index groups
only top-level Sections.

**System-managed Files** (Underscore-Prefix):

| File | Meaning | Writer |
|---|---|---|
| `_app.yaml` | Manifest | User / LLM |
| `_index.md` | Generated Overview | `WorkbookApplication.refresh` only |

---

## 3. Manifest Schema

```yaml
$meta:
  kind: application
  app: workbook
title: "Studium WS 2026"
description: "Notes, exam schedule, grade overview"

workbook:
  landingPage: "ueberblick.workpage.md"   # optional — Default Page on Open
  index:
    outputPath: "_index.md"
    style: "cards"                       # cards (default) | list
    showDescriptions: true
    groupBySection: true                 # group top-level sub-folders
  defaultPageKind: "workpage"              # reserved — v1 fixed to workpage
```

`landingPage` is optional. If it is missing, the editor mounts `_index.md`.
If no `landingPage` and no `_index.md` exist on open (Workbook
just created), the editor shows an Empty-State with an "Create First Page" button.

`index.style`:
- `cards` (Default): Card grid with Title + Description + Last-Modified.
- `list`: compact link list.

---

## 4. Generated Artifacts

### 4.1 `_index.md`

A normal `kind: workpage` Document. It is built deterministically by the `WorkbookIndexRenderer`
from the sources:

```markdown
---
$meta:
  kind: workpage
title: "Studium WS 2026 — Index"
description: "Automatically generated from Workbook Pages."
---

# Studium WS 2026

```vance-callout
severity: note
title: "Auto-generated"
body: "This Page is rewritten on every `app_rebuild` — edits here will be lost."
```

## Pages

- Overview — Landing Page
- Study Plan
- Grade Overview

## Exams

- Databases
- IT Law
```

Page sorting: alphabetically by Title (Fallback: Filename).
Section sorting: alphabetically by Section Name.

---

## 5. Tools

| Tool | Purpose | Backend |
|---|---|---|
| `workbook_app_create` | One-shot Bootstrap: Manifest + optional initial Pages + Index Rebuild. | `WorkbookApplication.create` |
| `workbook_page_create` | Create a single Page (delegates to `workpage_create` but in the Workbook context). | `WorkbookApplication` + `WorkPageService` |
| `app_rebuild` | Regenerates `_index.md` **and** executes the declared Page Rebuild Scripts (§5.1). | `WorkbookApplication.refresh` |

`workbook_page_create` is convenience — you achieve the same result
with `workpage_create(path="studium-ws26/neue-page", …)` plus
`app_rebuild("studium-ws26")`.

### 5.1 Rebuild Scripts (`$meta.rebuildScripts`)

`app_rebuild` (and the "Rebuild" button) additionally executes the scripts that
a Page **explicitly** declares in its Front-Matter — **nothing is
automatically discovered**. Only listed scripts run:

```yaml
---
$meta:
  kind: workpage
  rebuildScripts:
    - update_all.js          # .js-Doc; bare Name → relative to Page folder
    - vance:/apps/x/agg.js   # vance:/… → project-absolute
title: "Grades"
---
```

Each script runs server-side (synchronous, `vance.documents.*` on tenant/
project Scope, 30 s, via `WorkbookScriptService`). A failing script
is logged + skipped (does not block the rest of the rebuild); `refresh`
counts `scriptsRun`/`scriptsFailed` in the artifact stats. This allows
derived files (charts, aggregates) of an entire Workbook to be
recalculated in one action. No fallback: without `rebuildScripts`, only the index rebuild runs.

---

## 6. Active-App-Prompt-Inject

When the user has a Workbook open in Cortex, `WorkbookApplication.promptInject`
pushes a short block into the LLM-Prompt:

```
You are in the workbook "Studium WS 2026" at `studium-ws26/`.
Pages live as `*.workpage.md` files inside this folder and its sub-folders.

Use `workpage_create(path="studium-ws26/<slug>", …)` to add a page,
`workpage_block_append` / `workpage_block_insert` to write content,
and `app_rebuild("studium-ws26")` to refresh `_index.md` after structural changes.

Read `manual_read('workpage-blocks')` for the full block grammar.
```

---

## 7. Web-UI

### 7.1 Mount in Cortex

Kind registration as `application:workbook`. Mount via
`WorkbookAppKind.vue` (in the Addon `vance-addon-brain-workbook`):

- Reads the `_app.yaml` manifest from the `document` prop.
- Scans `<folder>/**/*.workpage.md` via the addon's own REST API.
- Renders Master-Detail: Sidebar (Page Tree) + Editor (WorkPageEditor inplace).

### 7.2 Layout

Inplace editor (Notion-style). The Workbook is **not a browser**, but
a productive working environment with an active editor in the main area.

- **Sidebar (left, ~260px)**:
  - Header: Workbook title from `_app.yaml` (top-level `title`),
    "Add page" + "Rebuild index" buttons.
  - Search Input: Substring filter over title + Section
    (case-insensitive, client-side).
  - Index entry with `⌂`-icon (if `_index.md` exists).
  - Section Header per Sub-Folder + Page list below.
    Page Icon (Emoji from Frontmatter) appears before the title.
  - Landing Page additionally gets a 📌-marker on the right.
- **Main Area**: renders the currently selected Page directly with
  `WorkPageEditor`. Auto-Save (debounced ~2s) + WS-based Self-Write-Quiet-
  Window (3s) against cursor reset by own echoes. Page switch flushes
  pending edits.
- **Page Header**: Cover Image (Hover → "Change/Remove"), Icon Button
  (clickable → Emoji Picker via `emoji-picker-element`), Title + Description.
  Save Status Indicator on the right ("Edited" / "Saving…" / "Saved").

### 7.3 Page Management

Per Page (right-click or ⋯-button on hover):

- **Rename / Move…** — Modal with Title Input + Section Autocomplete.
  Title Change only patches the Frontmatter; Section Change is a
  Path Move via `DocumentService.update(newPath=...)`.
- **Duplicate** — Body Copy, Title gets `(Copy)` suffix, new Page
  opens directly.
- **Pin/Unpin as landing page** — patches `workbook.landingPage` in the
  `_app.yaml` manifest.
- **Delete** — with Confirm dialog; lands in Project Trash (recoverable),
  not Hard-Delete.

Sections (right-click or ⋯-button on Section label):

- **Rename section…** — Inline Edit, server batches a Path Move for
  each Page in the Section. Empty Sections disappear automatically
  (they exist only as Path Prefix, not a first-class entity).
  Top-Level (`Pages`) is not a menu target.

### 7.4 Drag-and-Drop Reorder

Native HTML5 D&D on the Page Row. Drop Zones:

- **In the same Section** — Insert Indicator (blue line) top/bottom
  depending on Y-position; persisted via `POST /addon/workbook/reorder`
  with `orderedIds[]`, Server writes `sortIndex: 10, 20, 30, …` into
  the Frontmatter of all affected Pages.
- **On a Page in a different Section** — first Path Move via
  `PUT /page/{id}` with `section`, then Reorder of the target Section.
- **On the Section Label itself** — Move to the end of this Section.

`sortIndex` in the Page Frontmatter is the Source-of-Truth for the
order; null = sorted by title.

### 7.5 REST-API

Own endpoints under the Addon prefix:

| Endpoint | Purpose |
|---|---|
| `GET /addon/workbook/scan?projectId=&folder=` | Full scan: Manifest title, Landing Page ID, all Pages with Icon/SortIndex |
| `POST /addon/workbook/page` | Create new Page |
| `PUT /addon/workbook/page/{id}` | Rename + Section Move + sortIndex (all fields optional) |
| `DELETE /addon/workbook/page/{id}` | Move Page to Trash |
| `POST /addon/workbook/page/{id}/duplicate` | Body Copy + `(Copy)` suffix |
| `POST /addon/workbook/reorder` | `orderedIds[]` → sortIndex 10/20/30/… |
| `POST /addon/workbook/section/rename` | Path Move of all Pages in a Section |
| `POST /addon/workbook/landing` | Set/remove Landing Page (patches `_app.yaml`) |
| `GET /addon/workbook/images?projectId=&pathPrefix?=&query?=&size?=` | Project-scoped Image Search (mimeType `image/*` + path/regex); Picker Backend Tab "App" + "Project" |
| `GET /addon/workbook/documents/search?projectId=&query?=&size?=` | Recursive project-wide Document Search (path/title-substring); Picker Backend for Link + Embed Picker |
| `POST /addon/workbook/rebuild` | Regenerate `_index.md` |

Convention: all Workbook endpoints live under
`/brain/{tenant}/addon/workbook/...` — see `addon-system.md` §4.4.

Server implementation respects data sovereignty: no direct
`MongoTemplate` access from the Controller. Image and Document Search
go through generic service methods in `DocumentService`
(`listImages`, `searchProjectDocuments`).

### 7.6 Editor Integration: Resolver + Picker

The Workbook Addon passes several callbacks to the `WorkPageEditor`
(@vance/block-editor), so the editor remains host-agnostic:

| Prop | Task |
|---|---|
| `currentProjectId` | Default project for `vance:`-URIs without Authority |
| `resolveImageSrc(uri)` | `vance:` → HTTP-URL for `<img src>` (per-URI cached) |
| `resolveEmbedDoc(uri)` | `vance:` → `{ id, path, title, kind, mimeType }` for Embed-NodeView |
| `uploadImage(file)` | File upload to `<folder>/assets/`, return `vance:`-URI |
| `openAssetPicker()` | Slash-`/image` opens 3-Tab Picker |
| `openLinkPicker()` | Bubble-Menu Link-Button opens the 2-Tab `VLinkPicker` (shared, `@vance/components`) |
| `openEmbedPicker()` | Slash-`/embed` opens 1-Tab Doc-Picker |
| `openLink(href,newTab)` | Cmd+Click-Routing; vance: → cortex `?doc=` |
| `suppressFloating` | reactive true → all BubbleMenus off (Picker open) |

Thus, the Block Editor knows neither REST nor the `_tenant` project
nor Cortex's URL scheme. Cross-Project-Links use the
`?projectId={target}`-Query-Param + remove `sessionId`.

### 7.7 Live-Watch

Standard Folder-Prefix-Subscription on `<folder>/`. Remote Doc Changes
reload the Tree. Self-Writes (Auto-Save of the active Page) are
suppressed via the `lastSelfWriteAt`-Map, so the own echo does not
rebuild the ProseMirror-Doc → Cursor Reset.

Embedded Documents (`vance-embed`-Block) are **not** part of the
Workbook Subscription — they can point across the project and
would break the Subscription list. Instead, each Embed
has a Refresh Button on hover for manual reload.

---

## 8. Relationship to WorkPage

| Question | Answer |
|---|---|
| Can I use a single `*.workpage.md` without a Workbook? | **Yes.** WorkPage is standalone, Workbook is optional. |
| Must a Page in the Workbook be named `*.workpage.md`? | No — `$meta.kind: workpage` is important. Extension is a recommendation. |
| Can a WorkPage be in multiple Workbooks? | No — a file lives in exactly one folder. Cross-Workbook links are normal Markdown links. |
| Can a Workbook contain a different Doc Kind than Page? | v1: no, Index only collects `kind: workpage`. v2: per `defaultPageKind`. |

---

## 9. Anti-Patterns

- **Hand-Edits to `_index.md`** — will be overwritten on the next `app_rebuild`.
- **Sub-Workbooks** — do not place an `_app.yaml` in a Section Folder. One
  Workbook per Tree Root.
- **Workbook without Pages** — if only one Page exists, you don't need a
  Workbook; use the Page directly.

---

## 10. What v1 DOES NOT do

- **No automatic Backlink Indexing** — Markdown links are static.
  `_backlinks.yaml` is v2.
- **No Workbook Tag System** — Tags live per Page (Document Tags) and
  will be picked up by the Index in the future.
- **No Sub-Sub-Sections** — the Page Tree is two levels deep
  (Workbook → Section → Page). Deeper nested paths collapse
  to the first Section in the display.
- **No Section Metadata** (Icon, Description, Order) — Sections are
  pure Path Prefixes. Section Reorder = Section Rename to a value
  that alphabetically lands where desired.
