---
title: "Vancetope — Document Kind `workpage`"
parent: Specs
permalink: /specs/doc-kind-workpage
---

<!-- AUTO-GENERATED from llm/specification/doc-kind-workpage.md (translated from the German specification/public/doc-kind-workpage.md) — do not edit here. -->

# Vancetope — Document Kind `workpage`

> Notion-like linear block document. One file = one WorkPage. Markdown superset
> with ` ```vance-<type> `-fences for special blocks. First block editor in Vancetope
> that is not CodeMirror-based — see [doc-kind-application](/specs/doc-kind-application)
> §1 Design Principle 4.
> See also: [web-ui](/specs/web-ui) §7, Planning-Track `kind-workpage`.

---

## 1. Purpose

A WorkPage is the Vancetope answer to "I want a productive, structured
writing interface where I can freely combine text, todos, embedded data, and markup blocks"
— what Notion does well. Linear (vertically scrolling), not spatial. No Miro variant in this kind.

A WorkPage is **not an App** — no `_app.yaml`, no folder container. Multiple
WorkPages can later be aggregated by an `app: workbook` app, but this
kind stands alone.

---

## 2. Data Model

### 2.1 Top-Level

| Field          | Type                      | Required | Meaning                                           |
|---------------|---------------------------|----------|---------------------------------------------------|
| `kind`        | `string` = `"workpage"`     | yes      | Top-level discriminator.                          |
| `title`       | `string`                  | no       | Display title.                                    |
| `description` | `string`                  | no       | Free short description.                           |

Body: Markdown (see §3).

### 2.2 File Convention

- **Mime**: `text/markdown`.
- **Extension**: `*.workpage.md` (recommended, but not enforced — discovery
  is via `$meta.kind`).
- **Discovery**: `documentService.listByKind(tenantId, projectId, "workpage")`.

### 2.3 `$meta`-Mirroring

Standard `YamlHeaderStrategy` — `kind` is privileged. No additional
headers needed.

---

## 3. On-Disk Format: Markdown Superset

### 3.1 Standard Markdown

The following blocks are serialized and read 1:1 as standard Markdown:

| Block Type          | Markdown                            |
|---------------------|-------------------------------------|
| `paragraph`         | Plain paragraph                     |
| `heading` (h1-h3)   | `#` / `##` / `###`                  |
| `bullet-list`       | `- item`                            |
| `numbered-list`     | `1. item`                           |
| `todo`              | `- [ ] item` / `- [x] item`         |
| `quote`             | `> item`                            |
| `code`              | ` ``` `-fence with `lang`            |
| `divider`           | `---`                               |
| `image`             | `![alt](path)`                      |
| `table`             | GFM pipe table                      |

### 3.2 `vance-*`-Fences

For blocks that Markdown cannot express, WorkPage uses YAML fences
with a `vance-<type>` info string. The fence body is YAML.

#### `vance-callout`

```` ```vance-callout
severity: info       # info | warn | error | success | note
title: "Appointment set"
```
Arbitrary Markdown text as a body below the YAML section is not
allowed — callouts only have header fields (severity, title) and a
single-line `body` string WITHIN the YAML. See example below.
````

Specifically:

```
```vance-callout
severity: info
title: "Exam dates confirmed"
body: "Databases exam on 2026-07-12, 09:00 AM"
```
```

#### `vance-toggle`

```
```vance-toggle
summary: "Show details"
body: |
  Multi-line Markdown content.

  Also lists, code, etc.
```
```

`body` is Markdown (multi-line YAML string). It is recursively parsed as
a block tree and rendered nested during rendering.

#### `vance-dataview`

```
```vance-dataview
source: ../noten.dataview.yaml
```
```

Reference to a separate Dataview file (see Planning for Dataset/Dataview
Kinds). v1: only source path hint — the editor shows a placeholder
("Dataview not yet supported") until the Dataview kind is implemented.

#### `vance-link`

```
```vance-link
href: https://example.com
title: "Example Domain"
description: "Optional one-line summary"
```
```

A link card. Inline links `[text](url)` are sufficient for prose — `vance-link`
is the visual card block.

### 3.3 Block IDs

v1: no explicit block IDs in the on-disk format. IDs are editor-local,
generated per mount, transient. Backlinks / synced blocks do not require this.

---

## 4. Block Inventory v1

Required:

- `paragraph`
- `heading` (h1-h3) — automatically receive a slug-based `id` for
  `#hash` navigation; hover anchor button copies the deep link.
- `bullet-list`, `numbered-list`
- `todo`
- `quote`
- `code` (with `lang`, syntax highlighting via lowlight)
- `divider`
- `image` (with optional `width: small | medium | large | full`)
- `table` (static)
- `callout`
- `toggle`
- `dataview-embed` (placeholder stub v1)
- `link-card`
- `columns` — 2+ columns, fractional widths, resize by mouse
- `toc` — auto-table-of-contents from the H1/H2/H3 of the page
- `embed` — embeds another Vancetope document inline
  (`vance-embed`-fence + `vance:`-URI); refresh-on-hover. Kind-aware
  rendered: structured kinds via their embedded-view (records/chart/
  mindmap/…), `text`/`markdown` as **rendered Markdown** (not just a
  link card), otherwise kind-aware card with path. Media kinds
  (image/svg/pdf/audio/video) and `application` are explicitly **not**
  embeddable.

**Image-Width-Syntax:** Width preset is persisted as a pipe suffix in the alt text
(`![My Image|medium](url.png)`); `full` (or no suffix)
is default. CSS classes `canvas-image--{small|medium|large}` clamp
the render width to 25/50/75 % of the content column.

**Image-Source:** Uploads + asset picker save **`vance:`-URIs**,
not absolute HTTP URLs. On disk, it's `![alt](vance:/<path>?kind=image)`
(current Project) or `![alt](vance://<projectId>/<path>?kind=image)`
(cross-Project). During rendering, the Image-NodeView resolves via a
host-injected callback to `documents/by-path` and caches the URL
per URI. This keeps the Markdown portable across Brain instances +
Project renames.

**Columns-Syntax:** 4-backtick fence `vance-columns` with
`<!--vance:column [width]-->` HTML comments as separators. The
4-backticks allow nested 3-backtick code blocks per column.

**Embed-Syntax:** Fence `vance-embed` with `uri:`-body. The Embed-
NodeView loads metadata (kind, title, path) via
`documents/by-path` and renders a card with kind icon + title +
path. Refresh button (hover) allows manual reload — embedded
documents are outside the editor's live WS subscription, which
saves one subscription per embed. ⌘/Ctrl+Click on "Open" routes to the
Cortex tab with `?doc={id}`. Inline rendering per kind
(Mindmap/Tree/Calendar/…) is v2 and is passed to the block editor package
via a kind-renderer-resolver-prop — v1 only shows the
generic card.

Not in v1: synced-blocks, mentions, sub-pages-in-block, external
embed-blocks (YouTube etc.), inline rendering of embedded Vancetope
kinds (card-only).

### 4.1 Extensibility — Block Extension Registry

The block inventory listed above is no longer fixed on the **client side**:
the web editor (`@vance/block-editor`) has a **Block Registry**
through which bundled built-ins **and** addons can contribute new `vance-*`-fence blocks
(Node + optional read-only view + fence codec + slash entry).
`vance-callout` is the reference — a built-in that runs through the same registry
as an addon block. The addon contract is in
[addon-system](/specs/addon-system) §7d; design + phases in
`planning/block-extension-registry.md`.

A registered fence is routed to a generic `custom` block during parsing;
an unregistered `vance-*`-fence remains a placeholder +
lossless round-trip (see §8). The server-side `WorkPageParser` grammar
(§5) remains unaffected — it passes unknown fences as `UnknownFence`
losslessly, so that client-registered addon blocks round-trip cleanly on the server side.

---

## 5. Java Foundation

In the addon `vance-addon-brain-workbook` (workpage sub-package):

| Class                 | Task                                                   |
|-----------------------|--------------------------------------------------------|
| `Block` (sealed)      | Block tree records (`Paragraph`, `Heading`, …)         |
| `WorkPageParser`        | Markdown → `List<Block>`                               |
| `WorkPageSerializer`    | `List<Block>` → Markdown                               |
| `WorkPageService`       | High-Level: create / append / insert / update / move / delete / query |
| `WorkbookAddon`         | Spring `@AutoConfiguration` Component-Scan-Entry       |
| `tool/*`              | LLM Tools: `workpage_create`, `workpage_block_append`, `workpage_query`, … |

`WorkPageService` accesses `DocumentService` — no separate MongoDB collection.

---

## 6. LLM Tools

| Tool                       | Purpose                                            |
|----------------------------|----------------------------------------------------|
| `workpage_create`            | Create a new `kind: workpage` document.              |
| `workpage_block_append`      | Append a block at the end.                         |
| `workpage_block_insert`      | Insert a block at an index or after a heading anchor. |
| `workpage_block_update`      | Change block attributes / text.                    |
| `workpage_block_delete`      | Remove a block.                                    |
| `workpage_block_move`        | Change block position.                             |
| `workpage_query`             | Read-only: filter blocks (type, text match, todo). |

**Block-Anchor-Convention**: `{ index: int }` OR `{ heading: "Overview" }`.
Heading anchor matched by exact text; if multiple matches, the resolver
throws an error and the LLM must disambiguate.

---

## 7. Web-UI

Kind registration: `id: 'workpage'`, `matches: (kind) => kind === 'workpage'`.
Mount in Cortex/Notepad as an immersive editor (top-level kind, not
`application:workpage`). Delivered as a shared pnpm package
`@vance/block-editor` — the Workbook addon consumes the same
`WorkPageEditor` for the in-place edit experience.

**Stack:** Tiptap 2.10 + Vue 3. ProseMirror schema with custom nodes for
`vanceColumns`/`vanceColumn` and HTML fallbacks for `vance-callout`,
`vance-toggle`, `vance-dataview`, `vance-link`, `vance-toc`. Markdown I/O
through parser + serializer in TypeScript (`packages/block-editor/src/markdown`),
mirrors the Java grammar via round-trip tests.

**Editor Features:**

- **Slash Menu** (`/` opens block picker, fuzzy-search across categories)
- **Bubble Menu** for inline marks (Bold/Italic/Strike/Inline-Code/Link)
- **Image Toolbar** as a second bubble menu when clicking an image:
  Preset buttons `S | M | L | F` for the width class
- **Hover Drag Handle** for block reorder (via `tiptap-extension-global-
  drag-handle`, patched: first element gets handle, coord lookup
  clamped within the node, walk-up stops at `vanceColumn` boundaries)
- **Heading Anchor Links** — `#` button before each H1/H2/H3 (hover-only),
  click copies the URL including `#slug` to the clipboard
- **Code Highlighting** via lowlight + highlight.js github theme
- **Image Picker** — three tabs: App (own `<folder>/assets/`),
  Project (server-side recursive image search), Shared
  (`_tenant` project under `workbook/images/`, gracefully hidden if
  read access is missing). Picker emits `vance:`-URIs (see Block
  Inventory §4 Image Source).
- **Image Drop / Paste** — file drops upload to `<folder>/assets/`
  and result in a `vance:`-URI in the Markdown
- **Link Picker** — Bubble Menu Link button opens modal with two tabs:
  *Project document* (server-side recursive doc search, emits
  `vance:/<path>?kind=<kind>`) and *Direct URL* (URL input +
  "Open in new tab" checkbox, default per schema: vance: = same tab,
  http(s) = new tab). Per-link `target` attribute exists in
  ProseMirror; Markdown roundtrip does not persist it —
  the default convention applies on reload.
  The picker is **`VLinkPicker` from `@vance/components`** and is passed
  by **every** host that mounts the editor (workbook, wiki,
  kanban, gtd, issues, journal) — not by the editor itself: `@vance/block-
  editor` intentionally has no Vance dependency and does not communicate with any
  server, therefore `openLinkPicker` is a host callback. It searches via
  the generic route `GET /brain/{tenant}/documents/search`. The
  `window.prompt` fallback in the editor remains for a host without a picker;
  removing it would force the editor to presuppose a picker.
- **Cmd/Ctrl+Click on Links** — opens via host callback `openLink`.
  Workbook addon maps `vance:`-URIs to Cortex tab switch
  (URL param `?doc={id}`); external URLs open in a new tab via `window.open`.
  A normal click only positions the caret (editing surface remains usable).
- **Embed Picker** (`/embed`) — opens modal with server-side recursive
  doc-search; media + applications are filtered client-side.
  Picked document becomes a `vance-embed` block (kind card), not an
  inline render — see Block Inventory §4 Embed Syntax.
- **Page Header** (in Workbook): Cover Image + Emoji Icon Picker
  (`emoji-picker-element` custom element); `updateHeader({...})` patches
  frontmatter atomically without ProseMirror reload (cursor stays)
- **Floating Menu Suppression** — all BubbleMenus (inline marks +
  image width) automatically hide as long as a picker modal
  is open; tippy.js' z-index would otherwise sit above the modal layer

**Save Path:** Auto-save debounced ~2 s after last edit, plus
explicit flush on page switch / tab change. Save sends the
serialized Markdown to the host via `@save` emit; host PUT's to
`documents/{id}/content`.

**Live Behavior v1:** Standard tab subscription to the WorkPage path.
Remote write triggers reload + 3-way merge at the Markdown source level,
like all other Markdown editors — no block-level CRDT. Own
echoes are suppressed via the self-write quiet window.

---

## 8. Anti-Patterns

- **WorkPage as a container for hundreds of sub-WorkPages.** One page = one file.
  To achieve hierarchy, place files in folder structures.
- **Ad-hoc fence types that no one registers.** A `vance-<type>`-fence
  for which neither a core codec nor a registry entry (built-in or addon)
  exists, is rendered as an "unknown vance block" placeholder and passed through
  losslessly — but not as a real block. **To add a new block type, use the Block Extension Registry**
  (§4.1, [addon-system](/specs/addon-system) §7d),
  **not** by updating this file's spec. What doesn't belong here: writing a
  fence name into a document and hoping it magically renders.
- **Writing block-level IDs into the Markdown.** v1 has none; if v2 needs them,
  they will appear as `<!-- block:<uuid> -->` HTML comments.
- **Persisting editor-internal state outside the file.** Everything that defines
  the WorkPage must be reconstructable from the Markdown source —
  Design Principle 4 in `doc-kind-application.md`.

---

## 9. What v1 DOES NOT do

- Multi-user CRDT editing.
- Block history per block.
- Cross-WorkPage block refs / synced blocks.
- Backlinks index.
- Workbook app aggregation (separate track).
- Spatial layout.
