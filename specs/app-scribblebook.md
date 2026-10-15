---
title: "Vancetope — App `scribblebook`"
parent: Specs
permalink: /specs/app-scribblebook
---

<!-- AUTO-GENERATED from llm/specification/app-scribblebook.md (translated from the German specification/public/app-scribblebook.md) — do not edit here. -->

# Vancetope — App `scribblebook`

> **Scribblebook for Handwriting**: a folder as an app container for
> `kind: scribble` sheets — a notebook with sheets, menu switching, live index.
> See also: [doc-kind-scribble](/specs/doc-kind-scribble) (the sheet kind),
> [app-canvasbook](/specs/app-canvasbook) (the model; there, the authoring interface
> is the app — here, the sheet is also editable standalone),
> [app-workbook](/specs/app-workbook) (the same container pattern over Workpages).
> Implementation track: `planning/scribble.md`.

---

## 1. Purpose

An `app: scribblebook` is **a folder = a notebook**: it collects all
`*.scribble.yaml` files of a project folder, maintains a machine-owned index
(`_index.md`), and serves as the authoring interface with sheet switching via a menu.
To tear out a sheet means: create a new sheet — the rest is the
[Scribble Editor](/specs/doc-kind-scribble).

Manifest (`_app.yaml`):

```yaml
$meta:
  kind: application
  app: scribblebook
title: "My Notebook"
```

Optional Config (Manifest body): `index.outputPath` (default `_index.md`).

---

## 2. Server

`ScribblebookApplication` (`VanceApplication`) owns exactly one derived
artifact, the `_index.md` index; sheet discovery is handled by the
`ScribblebookFolderReader` (scan over the folder, filter on
`$meta.kind: scribble`). `promptInject` provides the sheet list to the agent —
titles and paths, never strokes.

| Route (under `/brain/{tenant}/addon/scribble`) | Purpose |
|---|---|
| `GET /scan?projectId&folder` | Sheets of the folder (Id, path, title). |
| `POST /page` | Create new sheet in the folder (`folder`, `title`). |
| `POST /rebuild` | Recreate `_index.md` (Scan → Workpage body). |

The index is **machine-owned** like an `installed/` record: rebuild
overwrites it, the user does not edit it. It exists so that folder browsing,
search, and agent context can see the notebook without reading every sheet body.

| Tool | Purpose |
|---|---|
| `scribblebook_app_create(folder, title?)` | New app in folder (manifest + first index). |
| `scribblebook_page_create(folder, title?)` | New sheet in notebook. |

When creating a new app, the client directly opens the first sheet. The document template
`templates/scribble.yaml` (+ Pebble body) creates a single sheet without a notebook —
the way for "a handwriting note, not a notebook".

---

## 3. Web-UI

`ScribblebookAppKind.vue` (Addon `@vance-addon/scribble`):

- **Header** (Slim-Header, App manifest): `☰ <Title> ▾` opens the
  sheet menu (all sheets, active one marked), `+ New Sheet`, `↻ Rebuild Index`,
  Save-State-Dot (saved / changes / saving).
- **Body**: the [Scribble Editor](/specs/doc-kind-scribble) with the active sheet.
- **Sheet switching** is per-tab-state in the host (`?entry=`): F5 and permalink
  open the same sheet; a switch **does not remount**, it jumps in the editor
  (`:key` = active path) and loads the sheet.
- **Chat binding**: `reportActiveSubDoc` reports the open sheet to the
  session (chat selection points to the sheet, not the app manifest).
- **Live-Watch**: `useDocumentPrefixReaction` on the folder — if another
  client saves a sheet (or creates one), it appears in the menu and index
  without a reload. A **Self-Write-Window** prevents feedback:
  its own debounce-save does not trigger a re-scan/re-set of the editor.

Printing follows the kind: the app header is `no-print`, only the sheet
is on paper (see Kind-Spec §3).

---

## 4. Anti-Patterns / v1-Scope

- **Sheets as app-internal data.** Rejected — each sheet is a full
  document (export, search, agent access, OCR later).
- **Editing the index manually.** Machine-owned; the rebuild button is the
  only way.
- **Strokes in the index.** The index lists titles/paths — handwriting remains in
  the sheet and becomes visible via `scribble_sheet_image`, never copied as text.
- **Not in v1:** Reordering sheets (array order = filename),
  deleting sheets from the app (handled by document management), notebook PDF export
  (noted follow-up track `scribble_book_pdf`).
