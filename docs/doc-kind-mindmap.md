---
title: "Vance — Document Kind `mindmap`"
parent: Documentation
permalink: /docs/doc-kind-mindmap
---

<!-- AUTO-GENERATED from specification/public/en/doc-kind-mindmap.md — do not edit here. -->

{% raw %}
---
# Vance — Document Kind `mindmap`

> Specifies the **`mindmap` payload** for documents that carry a hierarchical, ordered set of items rendered as a radial mindmap. Reuses the `tree` schema 1:1 and adds optional per-node visual metadata (color, icon, link, tags) plus document-level rendering options.
> See also: [doc-kind-tree](/docs/doc-kind-tree) | [doc-kind-items](/docs/doc-kind-items) | [web-ui](/docs/web-ui)

---

## 1. Purpose

`kind: tree` (see [doc-kind-tree](/docs/doc-kind-tree)) models hierarchical items with an outliner UX. `kind: mindmap` is **the same hierarchy**, but:

- with optional per-node metadata for visual styling (color, icon, link, tags),
- with a **Mindmap renderer** instead of an outliner editor — radial layout starting from the root item.

**Design principle:** The topic text per node and fluid editing are central. The additional fields are **all optional** — a Mindmap Document can consist solely of `text` + `children` and remain fully functional. There are intentionally no mandatory fields beyond `text`.

Separation from tree:

- **tree** is a textually-structured outliner. Edit-focused.
- **mindmap** is a visually-structured mindmap. View-focused; in v1, read-only render on a second tab, editing still in the Tree-View.

**What this spec defines:**
- Extended items model (tree fields + optional `color`, `icon`, `link`, `tags`).
- Top-level Mindmap options (`mindmap:` block — `theme`, `direction`, `initialExpandLevel`).
- Format mapping md/json/yaml — the same codec as tree, with pass-through for the new fields.
- Web-UI activation (Tab `Mindmap` in addition to `Tree` and `Raw`).

**What it does not define:**
- Free-form node positions (`x`/`y`). Mindmap layouts are automatically calculated from the Tree topology — both `markmap` and `mind-elixir` work this way. Concept-map-like free-positioning would be a separate kind (`graph`).
- In-place Mindmap editing (dragging & dropping nodes directly in the radial layout). See §6.
- Mindmap-specific server indexing — items continue to live in the `inlineText` body.
- Embedded images per node. Intentionally excluded to keep the spec simple — images in mindmaps are rarely the value driver, and hosting (Document attachment vs. remote URL) would be a separate spec step.

---

## 2. Items Model

Per item, same base as tree:

| Field      | Type             | Required | Meaning                                                                   |
|------------|------------------|----------|---------------------------------------------------------------------------|
| `text`     | `string`         | yes      | Node topic, single- to multi-line.                                        |
| `children` | `Item[]`         | no       | Subordinate nodes, recursive. Missing / empty array = leaf.               |

**Mindmap-specific additional fields** (all optional — none are required, a node with only `text` is valid):

| Field        | Type       | Meaning                                                                                       |
|--------------|------------|-------------------------------------------------------------------------------------------------|
| `color`      | `string`   | Line and text color of the node as HTML hex (`#rrggbb` or `#rgb`). Inherited by children if they don't have their own `color`. |
| `background` | `string`   | Background fill of the node bubble as HTML hex.                                                 |
| `icon`       | `string`   | Glyph before the topic — emoji or short text. A single icon (not an array).                     |
| `link`       | `string`   | Hyperlink of the node (URL) — opened on click.                                                  |
| `tags`       | `string[]` | Tag chips on the node. Pure display, no semantic link to Document tags.                         |

**Color format:** Canonical is **HTML hex** — `#rrggbb` (e.g., `#3b82f6`) or as shorthand `#rgb` (e.g., `#39f`). Rationale:

- Unambiguously parseable — no locale, no token resolution, no theme dependency.
- Round-trip stable without normalization leeway (exactly one string per color).
- Universal in mindmap/diagram tools (markmap, mind-elixir, draw.io, Mermaid).
- LLM output is reliable here — hex codes are well represented in training data.

When reading, CSS named colors (`red`, `blue`, …) and `rgb(…)`/`hsl(…)` are also accepted; when writing, the codec normalizes to `#rrggbb` (canonical lower-case six-hex form). Alpha/transparency is not planned for v1 — those who want transparent nodes will wait for a later spec point.

**Forward compatibility:** As with tree, additional, unknown fields are passed through via an `extra` map. Known Mindmap fields live **flat** next to `text`/`children` — the Tree codec does not know them by name but passes them through (see §3.4).

**Markdown limitation:** Markdown can only express `text` + `children`. All Mindmap additional fields are lost during the md round-trip. Those who maintain a Mindmap Document with colors/icons keep it in JSON or YAML — same convention as for tree for multi-field items.

**Canonical form** (JSON):

```json
{
  "$meta": { "kind": "mindmap" },
  "mindmap": {
    "theme": "default",
    "direction": "right",
    "initialExpandLevel": -1
  },
  "items": [
    {
      "text": "Vance",
      "color": "#3b82f6",
      "children": [
        {
          "text": "Brain",
          "icon": "🧠",
          "children": [
            { "text": "Engines", "tags": ["arthur", "ford"], "children": [] }
          ]
        },
        {
          "text": "Foot",
          "icon": "🐾",
          "link": "https://example.com/docs/foot",
          "children": []
        },
        {
          "text": "Face",
          "children": []
        }
      ]
    }
  ]
}
```

**Header convention:** as in [doc-kind-items §2](/docs/doc-kind-items#2-items-modell) — both JSON and YAML carry `kind` in a `$meta` mapping at the top level. The `mindmap:` block remains at the body top level (nested object, filtered out in `$meta` anyway).

Exactly one top-level item is the canonical Mindmap form (the root item is radially centered). Multiple top-level items are allowed — the renderer treats them as a "Forest" and renders them as parallel trees side-by-side.

---

## 3. On-Disk Formats

### 3.1 Markdown

```markdown
---
kind: mindmap
mindmap:
  theme: default
  direction: right
---
- Vance
  - Brain
    - Engines
  - Foot
```

**Reading rules:**
- Front-Matter like tree (`---`-fences). `mindmap:` block (Mindmap options) is optional and placed under `kind:`.
- Body: identical to tree — `\s*[-*]\s+`-bullets with 2-space indent, tabs = 4 spaces, skip-level is clamped to the next shallowest.
- **No per-node fields** — Markdown has no syntax for Color/Icon/Link at the bullet level that would be round-trip stable. Documented limitation.

**Writing rules:**
- Pre-order DFS, identical to tree.
- Per-node Mindmap fields are **not** written (would be lost on reading — so not included at all).
- Top-level `mindmap:` block is preserved in the Front-Matter (pass-through like all Front-Matter keys).

### 3.2 JSON

Identical to tree, with:

- `$meta` wrapper for `kind` (see [doc-kind-items §2](/docs/doc-kind-items#2-items-modell)).
- Top-level key `mindmap` (Object) **before** `items`.
- Any additional keys from §2 (color/icon/etc.) per item as pass-through.

When writing:
- 2-space indent.
- Order of top-level keys: `$meta`, `mindmap`, `items`, then unknown pass-through keys in insertion order.
- Order of item keys: `text`, `children`, then mindmap fields (`color`, `background`, `icon`, `link`, `tags`) in exactly this order — followed by unknown pass-through keys. Fields not set for a node are omitted (no `null` writing).

### 3.3 YAML

```yaml
$meta:
  kind: mindmap
mindmap:
  theme: default
  direction: right
  initialExpandLevel: -1
items:
  - text: Vance
    color: "#3b82f6"
    children:
      - text: Brain
        icon: "🧠"
        children:
          - text: Engines
            tags: [arthur, ford]
            children: []
      - text: Foot
        icon: "🐾"
        link: https://example.com/docs/foot
        children: []
```

Single-Document: Top-level mapping with `$meta: { kind: mindmap }` as the first key, followed by `mindmap:` block and `items` at the same level. Block-style sequences, 2-space indent. No string shorthand for items (same rule as tree — otherwise, the separation of item text vs. sub-item would remain ambiguous).

### 3.4 Codec Impact

**Important:** The existing `tree` codec (`treeItemsCodec.ts` + Server `HeaderStrategy`) remains **unchanged**. Mindmap fields automatically pass through `TreeItem.extra: Record<string, unknown>`. The Mindmap View reads them from `extra`, and the Mindmap Edit View (when it arrives) also writes them to `extra`. This means `kind: mindmap` does not require a new codec, no new server mapping — only renderer code in the Web-UI.

Only when the Mindmap-specific fields become first-class in the editor UI (color picker, icon picker), the codec will promote them from `extra` to typed properties on a `MindmapItem` subtype. This is an additive extension, not a breaking change.

---

## 4. Server Path

Like tree and list: **no dedicated endpoint**, no server-side Mindmap parser. The `HeaderStrategy` path automatically mirrors `kind: mindmap` to `DocumentDocument.kind`.

The `mindmap:` top-level block is transparent to the server — like all Front-Matter keys (Markdown) or all top-level JSON/YAML keys, it lands unparsed in the body and is returned unchanged.

---

## 5. Web-UI

### 5.1 Editor Activation

- **`kind === 'mindmap'`** + Format ∈ {md, json, yaml} → three tabs: `Mindmap` (Default) / `Tree` / `Raw`.
- Otherwise (not a Mindmap Document): unchanged.

The `Tree` tab uses **the existing `<TreeView>` component** unchanged — the hierarchy is the same. Per-node Mindmap fields are **not** displayed or edited in v1 in the Tree-View (but they remain round-trip stable via `extra`).

The `Mindmap` tab is **read-only render** based on `markmap-lib` + `markmap-view`. Rationale:

- markmap directly accepts our Markdown bullet form — the adapter is trivial.
- markmap is ~50 KB minified, MIT, actively maintained.
- Read-only Mindmap covers the viewing use case (brainstorming template, strategy draft), editing remains convenient in the Tree-View.

### 5.2 Feature Scope v1

| Feature                                | v1 | Note |
|----------------------------------------|----|------|
| Mindmap render (radial layout)         | ✓  | markmap |
| Pan / Zoom                             | ✓  | markmap built-in |
| Expand / Collapse per node             | ✓  | markmap built-in (click on disclosure) |
| Edit (via Tree tab)                    | ✓  | existing `<TreeView>` |
| Per-node Color/Icon/Link/Tags          | (◯)| **persisted** (round-trip), but **not editable** and only partially rendered in v1 |
| In-place edit in Mindmap layout        | ✗  | see §6 |
| Custom Theme / direction options       | (◯)| **persisted** in the `mindmap:` block, but UI operation only via Raw in v1 |
| Forest (multiple roots)                | ✓  | markmap renders multiple top-level bullets side-by-side |

(◯) = Feature is not actively editable in v1, but data passes through round-trip stably.

### 5.3 Components

- `<MindmapView>` — top-level Mindmap tab. Receives `:doc: TreeDocument` (same type as TreeView), converts it to markmap Markdown, instantiates markmap. Read-only.
- `<TreeView>` — existing Tree editor, unchanged. Serves the `Tree` tab.
- Tab bar like for tree (`content-tab` class from `DocumentApp.vue`), extended to three tabs.

### 5.4 Markmap Adapter

The adapter is a function `treeToMarkmapMarkdown(doc: TreeDocument): string`:

- Pre-order DFS.
- Per item: Indent (depth × 2 Spaces) + `- ` + first topic line.
- If `link` is set: Topic becomes `[<text>](<link>)`.
- `icon` is prefixed to the topic text (emoji directly, followed by a space).
- `tags`/`color`/`background` are **not** passed to markmap in v1 (no direct markmap equivalent — color is handled globally via `colorFreezeLevel`, markmap does not have tags render). However, they are in the Document and will be active in a later edit/render iteration.
- Top-level: `mindmap:` block from the Document is prepended as markmap Front-Matter (`---\nmarkmap:\n  ...\n---`) — `theme`, `direction`, `initialExpandLevel` map 1:1.

### 5.5 Visual Conventions

- Mindmap tab fills the editor content completely (no second vertical scrolling — markmap takes 100% height).
- Pan/Zoom hint subtly in the bottom right ("Mouse wheel zooms, Drag pans") as a small help tooltip.
- Default theme aligns with the DaisyUI theme via CSS variables — markmap allows CSS override, so Light/Dark mode follows.

---

## 6. Future (not v1)

### 6.1 In-Place Mindmap Editing

`mind-elixir` (https://github.com/ssshooter/mind-elixir-core, MIT, ~70 KB minified) replaces markmap in the `Mindmap` tab. This enables:

- Double-click on node → inline topic edit.
- Drag & drop of nodes between parents (true 2D re-parenting).
- Context menu per node: Color picker, Icon picker, Link editor, Tag editor.
- Keyboard shortcuts like in the Tree editor (Tab/Shift+Tab/Enter).

mind-elixir has its own data model (`{ topic, id, style, tags, icons, hyperLink, expanded, children }`, plus optional `image` which we don't use); the adapter between our `TreeItem` form and mind-elixir form is 1:1 — all fields defined in §2 map directly.

Migration path: codec remains the same, only `<MindmapView>` is replaced. Tree tab and Raw tab unchanged.

### 6.2 Active Mindmap Fields in Tree Editor

Per-node Color/Icon/Link/etc. will also be displayed and editable in the Tree-View (inline picker or side panel). This means Mindmap metadata will not only live in the Mindmap tab. This is useful only when real users need it — until then, the Mindmap View is sufficient.

### 6.3 Mindmap Linker / Cross-Document Linking

Nodes could refer to other Documents in the same Project (`link: doc:<documentId>` or `link: vance:document/<id>`). The renderer resolves this to an app-internal tab open. Requires a convention for `vance:` URLs — a separate spec point.

### 6.4 Persistent Expand/Collapse

As with tree (§6.3 there): per-user setting or per-item field. Not now.

---

## 7. Open Points

- **Single-Root Requirement:** Should we restrict `kind: mindmap` to exactly **one** top-level item? markmap also renders forests, but UX-wise, a Mindmap user expects a single radial center. Suggestion: allow it, but warn in the editor if more than one top-level item is present.
- **markmap vs. mind-elixir Default:** If the first real Mindmap creation shows that viewing without editing is insufficient, the default will switch directly to mind-elixir. Until then, Markmap, because of the leaner adapter.
- **Tags Rendering:** markmap has no tag display. Either append as inline code spans (`` `tag` ``) to the topic or natively with mind-elixir migration. Decision pending until the first use case.
{% endraw %}
