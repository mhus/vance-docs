---
title: "Vance — Document Kind `canvas`"
parent: Specs
permalink: /specs/doc-kind-canvas
---

<!-- AUTO-GENERATED from specification/public/en/doc-kind-canvas.md — do not edit here. -->

---
# Vance — Document Kind `canvas`

> First **2D spatial** surface in Vance: an area where notes, referenced
> documents/images, links, and groups can be freely arranged and connected with
> directed edges — a thinking/arrangement tool (Obsidian Canvas-like), **not**
> a freehand whiteboard.
> See also: [app-canvasbook](/specs/app-canvasbook) (container app),
> [doc-kind-application](/specs/doc-kind-application) §1 Design Principle 4,
> [pointers-channel](/specs/pointers-channel) (live cursor),
> [web-ui](/specs/web-ui) §7. Implementation track: `planning/canvas.md`.

---

## 1. Purpose

A `kind: canvas` is **a surface = a document** that holds a graph of **Nodes**
(at free `x/y` positions) and **directed Edges**. It is Vance's answer to "I
want to spatially arrange and connect thoughts".

Distinction: For a **linear** rich-text document → `kind: workpage`; for
**workflow states** → `app: kanban`; for a **hierarchical outline** → `kind: mindmap`.
Canvas is deliberately only Nodes + Edges — **no** freehand drawing
(`specification/vision.md` §7).

This Kind lives in the standalone addon `vance-addon-brain-canvas` (no
dependency on the workbook addon). When opened standalone, the Canvas view is
**read-only**; the authoring interface is the [`app: canvasbook`](/specs/app-canvasbook).

---

## 2. Data Model

### 2.1 Top-Level

| Field | Type | Required | Meaning |
|---|---|---|---|
| `kind` | `string` = `"canvas"` | yes | Top-level discriminator. |
| `title` | `string` | no | Display title. |
| `description` | `string` | no | Free short description. |
| `canvas` | `object` | yes | The graph: `nodes` + `edges`. |

Discovery via `$meta.kind` (`documentService.listByKind(tenant, project,
"canvas")`). No dedicated collection — `CanvasService` (vance-addon-brain-canvas)
is layered on `DocumentService` (data sovereignty). All mutations are a typed
round-trip via `CanvasCodec` (no field patch on the blob).

### 2.2 Node Types

Common geometry on each Node: `id` (persistent, for edge references), `x`, `y`,
`w`, `h`; optional `color` (palette index `"1"`–`"6"` or hex string), `z`
(stacking order), `parent` (see §2.3). Node `id`s are assigned server-side
(`n1`, `n2`, …).

| `type` | Additional Fields | Rendering |
|---|---|---|
| `text` | `text` (Markdown snippet); optional `bold`, `italic`, `fontSize` (`s\|m\|l`), `textColor`, `author` | yellow sticky note, inline editable |
| `doc` | `ref` (`vance:`-URI to a Document) | Content rendered by Kind (§3.2) |
| `link` | `href`, optional `title` | external link card |
| `group` | optional `label` | framed rectangle; container (§2.3) |

### 2.3 Grouping — Explicitly via `parent`

A Node belongs to a group if its `parent` carries the `id` of a `group` Node.
If `parent` is set, `x`/`y` are **relative to the group's corner** (VueFlow
parenting). This makes membership **machine- and LLM-readable** — moving a
group moves all children with it; deleting a group releases the children back to
the Canvas root (coordinates become absolute). Nested groups are not planned for
v1 (`canvas_validate` warns).

### 2.4 Edges — Directed (Arrows)

`id`, `from` (Node ID), `to` (Node ID); optional `fromSide`/`toSide`
(`top\|right\|bottom\|left`), `label`, `color`. **Arrow ends** `fromEnd`/`toEnd`
each `none\|arrow` — default `fromEnd: none`, `toEnd: arrow` (single arrow
`from → to`). Bidirectional/undirected can thus be expressed.

---

## 3. On-Disk Format & Web-UI

### 3.1 File Format

Recommended extension `*.canvas.yaml` (or `*.canvas.json`); `$meta.kind: canvas`
is mandatory. **YAML canonical, JSON 1:1-dual** via a common `CanvasCodec`.
Markdown → `KindCodecException`.

```yaml
$meta:
  kind: canvas
title: "Architecture Sketch"
canvas:
  nodes:
    - { id: g1, type: group, x: 60, y: 40, w: 520, h: 320, label: "Research" }
    - { id: n1, type: text, parent: g1, x: 20, y: 30, w: 200, h: 120, text: "Core Idea" }
    - { id: n2, type: doc,  x: 620, y: 60, w: 280, h: 200, ref: "vance:/data/plan.md" }
  edges:
    - { id: e1, from: n1, to: n2, toEnd: arrow, label: "supported by" }
```

### 3.2 Rendering

Editor `@vance-addon/canvas` based on **VueFlow** (`@vue-flow/core`). Custom
Node component per type (sticky note / Doc / Link / group frame). `doc` Nodes
render the target content **by Kind**: the host (Cortex) passes its Kind renderer
via `provide('vance:embed-component', …)` into the addon (Vue singleton across
the federation boundary), so that Records/Mindmap/Chart/… are fully rendered —
just like the Workpage embed. The addon renders images and `.md`/text itself
(mime- or extension-based) so that documents **without** a `kind` also appear
correctly; otherwise, a Kind-aware card. Each `doc` Node has a **↗-jump** to the
Cortex tab.

Editor features: Resize (`@vue-flow/node-resizer`), Node toolbar
(`@vue-flow/node-toolbar`: color/font/bold/italic/text color/foreground-background/
delete), in-canvas tool panel, multi-selection, Z-order (no auto-foreground),
inline text edit, Vue dialogs instead of browser prompts, **file drag & drop**
(any files → upload to `<folder>/assets/` → `doc` Node), connectors on all four
sides.

**Live cursor** (awareness only, no edit CRDT): the editor sends/displays pointers
via the [`pointers`-channel](/specs/pointers-channel). Coordinates are transmitted in
**Canvas space** (zoom-/pan-independent) and rendered at the viewer's own viewport.

---

## 4. LLM Tools

| Tool | Purpose |
|---|---|
| `canvas_create(path, title?, description?)` | New empty Canvas. |
| `canvas_node_add(path, node)` | Add Node (`text`/`doc`/`link`/`group`); returns `nodeId`. |
| `canvas_node_update(path, id, patch)` | Patch Node (position/size/color/text/…); `id` immutable. |
| `canvas_node_delete(path, id)` | Remove Node + incident edges. |
| `canvas_edge_add(path, from, to, label?, toEnd?, …)` | Connect edge; returns `edgeId`. |
| `canvas_edge_delete(path, id)` | Remove edge. |
| `canvas_query(path, type?, textContains?)` | Read-only: filter Nodes. |
| `canvas_validate(path)` | Read-only structural check (§5). |

The graph is LLM-readable as YAML (`document_read`). Manual: `manual_read('canvas')`.
The Node grammar of the tools uses the same field names as the on-disk format.

---

## 5. `canvas_validate`

Static structural check (analogous to `workbook_validate`), so an LLM can
validate a generated Canvas before "done". Read-only. Checks: parse errors,
duplicate Node/Edge `id`s, edges to non-existent Nodes, `parent` to unknown/
non-group/self; warnings for empty text Nodes and nested groups. Returns:
`{ ok, errors, warnings, findings[] }` (`findings[].level` = `error|warning`).

---

## 6. Anti-Patterns / v1-Scope

- **Each element as its own Document.** Rejected — the graph is one Doc, heavy
  content is external Docs via `vance:` reference.
- **Positions/edges in Markdown.** Rejected — graph is YAML/JSON.
- **Freehand pen strokes / shapes.** Out of scope (Think Tool boundary).
- **Editing in the standalone `kind` view.** Read-only by design; authoring path
  is the `app: canvasbook`.
- **Not in v1:** Multi-user CRDT edit, nested groups, auto-layout, cross-Canvas
  Node references.
