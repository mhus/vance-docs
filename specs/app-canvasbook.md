---
title: "Vancetope Application — `app: canvasbook`"
parent: Specs
permalink: /specs/app-canvasbook
---

<!-- AUTO-GENERATED from specification/public/en/app-canvasbook.md — do not edit here. -->

---
# Vancetope Application — `app: canvasbook`

> Folder container for multiple `kind: canvas` pages — a "book" of
> Canvases, built on the [doc-kind-application](/specs/doc-kind-application)
> foundation. Deliberately **named differently** from the kind (`workbook` ⊃ `workpage`
> as a model) to avoid confusing the app and the kind.
> See also: [doc-kind-canvas](/specs/doc-kind-canvas), [app-workbook](/specs/app-workbook)
> (model pattern), [documents-channel](/specs/documents-channel) (live update).
> Implementation track: `planning/canvas.md`.

---

## 1. Purpose

`kind: canvas` alone is sufficient for a single surface. As soon as multiple
related boards need to be managed and switched between, a **Canvasbook** bundles them:
a folder with `_app.yaml` (`kind: application`, `app: canvasbook`), containing
multiple `*.canvas.*` pages and an auto-generated `_index.md`. To create a
**single** surface, create `kind: canvas` directly.

`CanvasbookApplication` is the **only authoring interface** for Canvases.

---

## 2. Folder Layout & Manifest

```
design-sketches/
├── _app.yaml                  ← kind: application, app: canvasbook
├── _index.md                  ← auto-generated (page list), only refresh() writes
├── ideas.canvas.yaml          ← kind: canvas
├── architecture.canvas.yaml
└── assets/                    ← files imported via Drag&Drop
```

```yaml
$meta:
  kind: application
  app: canvasbook
title: "Design Sketches"
description: "Whiteboard Collection"
canvasbook:
  landingPage: "ideas.canvas.yaml"   # optional — default page on open
  index:
    outputPath: "_index.md"
```

Discovery: `listByKind(..., "application")` + Header `app == "canvasbook"`. The
manifest is written via `ApplicationDocument` + `ApplicationCodec` (not
manually). For the web create dialog, the addon provides a bundled
[Document Template](/specs/document-templates) `canvasbook` (resource under
`vance-defaults/_vance/templates/`, `app: canvasbook`, §2a) — it runs through
`CanvasbookApplication.create` like the tool; pages are added afterwards via the
editor / `canvasbook_page_create`. Generated artifact: `_index.md` (`kind: workpage`, link list of all
Canvas pages), deterministically from the sources, only `CanvasbookApplication.refresh`
writes.

---

## 3. Tools

| Tool | Purpose |
|---|---|
| `canvasbook_app_create(folder, title?, description?, landingPage?, pages?)` | One-shot: Manifest + optional initial pages + index rebuild. **Instead of** manual `_app.yaml`. |
| `canvasbook_page_create(folder, title?, slug?)` | New Canvas page in Canvasbook + index refresh. |
| `app_rebuild(folder)` | Regenerates `_index.md`. |

The pages themselves are filled using the `canvas_*` tools (see
[doc-kind-canvas](/specs/doc-kind-canvas) §4) and validated with `canvas_validate`.
`promptInject` displays a short hint block with the tools as long as a Canvasbook is open in Cortex.

---

## 4. Web UI

Kind registration `application:canvasbook` → `CanvasbookAppKind.vue` (immersive
app view). A **single menu button** at the top switches between the `*.canvas.*`
pages (deliberately no sidebar tree navigation); landing page leads. The active
Canvas is edited in the VueFlow editor, **debounced auto-saved** (status
indicator: saved/not saved/saving), plus "+ Canvas" and "↻ Index".

**Live Document Update:** the app view subscribes to the [`documents` channel](/specs/documents-channel)
via folder prefix; an external save of the active page reloads it. Own echoes are
suppressed via a self-write window, and local unsaved changes are not
overwritten. No CRDT — for true concurrent editing, last-writer-wins applies;
awareness comes via the live cursors of the [`pointers` channel](/specs/pointers-channel).

---

## 5. REST API

Under `/brain/{tenant}/addon/canvas/...` (permission-scoped, no direct
`MongoTemplate` access from the controller):

| Endpoint | Purpose |
|---|---|
| `GET /scan?projectId=&folder=` | Manifest title, landing, page list. |
| `POST /page?projectId=&folder=` | New Canvas page. |
| `POST /rebuild?projectId=&folder=` | Regenerate `_index.md`. |
| `GET /graph?projectId=&path=` | Parsed graph as JSON (server codec). |
| `PUT /graph?projectId=&path=` | Graph JSON → serialized + saved. |
| `GET /documents/search?projectId=&query=` | Project document search (Doc Picker). |
| `GET /document?projectId=&path=` | Document meta (Embed Resolution). |

The client **does not** parse YAML — the Java `CanvasCodec` remains the Single Source of
Truth; `graph` GET/PUT transport typed JSON.

---

## 6. Anti-Patterns

- **Manual edits to `_app.yaml`** → use `canvasbook_app_create`.
- **Canvasbook with a single page** → a bare `kind: canvas` is sufficient.
- **Manual edits to `_index.md`** → will be overwritten by `app_rebuild`.
- **Sub-Canvasbook in a section folder** → one Canvasbook per tree root.
