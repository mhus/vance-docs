---
title: "Vance — Document Kind `tree`"
parent: Specs
permalink: /specs/doc-kind-tree
---

<!-- AUTO-GENERATED from specification/public/en/doc-kind-tree.md — do not edit here. -->

---
# Vance — Document Kind `tree`

> Specifies the **`tree` payload** for documents that carry a hierarchical, ordered set of items. Builds directly on the `list` schema — same per-item shape, same three on-disk formats — and adds `children`-based nesting.
> See also: [doc-kind-items](/specs/doc-kind-items) | [web-ui](/specs/web-ui)

---

## 1. Purpose

`kind: list` (see [doc-kind-items](/specs/doc-kind-items)) is explicitly **flat**. As soon as items carry true hierarchy — outliners, structural plans, bulleted lists with sub-items — `kind: tree` comes into play. Both Kinds use the same codec style, a different item model (recursive `children`).

Separation instead of a shared editor with mode-switch:

- **list** is 1D — Reorder is one-dimensional, editor is minimal.
- **tree** is 2D — Reorder + Indent/Outdent. Different affordances, different keybindings, different D&D rules.
- A shared editor would impose the complexity of tree on list documents as well. Two components are preferred.

**What this spec defines:**
- Extended item schema (`children` recursive).
- Format mapping md/json/yaml with nesting.
- Editor behavior v1 — Keyboard-Indent instead of full-2D-Drag.

**What it does not define:**
- Multi-select bulk operations across hierarchy boundaries (see §6).
- Drag between levels (§4 v1-Limit, §6 Future).
- `kind: mindmap` — its own Kind, its own spec, different UI (graph-layout).

---

## 2. Items Model

Per item:

| Field      | Type             | Required | Meaning                                                                   |
|------------|------------------|----------|---------------------------------------------------------------------------|
| `text`     | `string`         | yes      | Display text, single- to multi-line.                                      |
| `children` | `Item[]`         | no       | Subordinate items, recursive. Missing / empty array = leaf node.          |

**Forward compatibility:** As with `list`, unknown fields are passed through via an `extra` map (json/yaml). Markdown can only represent `text` + nesting — other fields are lost during the md round-trip, which is documented behavior.

**Canonical Form** (JSON):

```json
{
  "$meta": { "kind": "tree" },
  "items": [
    { "text": "parent", "children": [
      { "text": "child", "children": [
        { "text": "grandchild", "children": [] }
      ]}
    ]},
    { "text": "second top-level", "children": [] }
  ]
}
```

`children` may be omitted for leaves or written as an empty array — when writing, canonically `[]` for "explicitly leaf", omitted is also accepted when reading.

**Header Convention per Format:** identical to [doc-kind-items §2](/specs/doc-kind-items#2-items-modell) — both JSON and YAML carry `kind` in a `$meta` mapping at the top level. MD frontmatter unchanged.

---

## 3. On-Disk Formats

### 3.1 Markdown

```markdown
---
kind: tree
---
- parent
  - child
    - grandchild
- second top-level
```

**Reading Rules:**
- Front-Matter as with `list` (`---`-fences, flat key/value, `kind:` privileged).
- Body: any line starting with `\s*[-*]\s+` is an item. The number of spaces **before** the bullet marker determines the depth.
- Depth calculation: Indent in spaces, divided by **2** (two spaces per level — Markdown convention). Tabs are interpreted as 4 spaces. Items whose indent is not a multiple of 2 are mapped to the next shallower level.
- An item indented deeper than its direct predecessor + 1 is capped at predecessor + 1. There are no "skip-level" nodes.
- Continuation lines (multi-line text) as with `list`: subsequent lines with indent ≥ item indent + 2 *and* without their own bullet marker are appended to `text` with `\n`-separator.

**Writing Rules:**
- Pre-order DFS. Per item: Indent (depth × 2 Spaces) + `- ` + first `text`-line.
- Continuation: subsequent lines with indent + 2 additional spaces.
- `extra` fields per item are lost (md-limitation).
- Trailing newline at EOF.

### 3.2 JSON

`$meta` wrapper for `kind`, `items` as top-level array with `children: []` recursively. When writing:
- 2-space indent, pretty-printed over multiple lines.
- Order of top-level keys: `$meta`, `items`, then passthrough.
- Order of item keys: `text`, then `children`, then `extra` fields in insertion order.

### 3.3 YAML

```yaml
$meta:
  kind: tree
items:
  - text: parent
    children:
      - text: child
        children:
          - text: grandchild
            children: []
  - text: second top-level
    children: []
```

Single-document with `$meta` as the first top-level key. Block-style sequences, 2-space indent, one item per line (with continuation block for multi-line `text`). String shorthand as with `list` is **not** accepted for Tree: an item without `children` must be written as an object, otherwise the distinction between "item text" and "sub-item" becomes ambiguous.

---

## 4. Server Path

Like `list`: **no dedicated endpoint**, no server-side parser. The editor loads the Document via `GET /documents/{id}`, parses in the browser, writes the serialized body back with `PUT /documents/{id}`. The existing `HeaderStrategy` path automatically mirrors `kind: tree` to `DocumentDocument.kind` — no server changes needed.

---

## 5. Web-UI

### 5.1 Editor Activation

- **`kind === 'tree'`** + Format ∈ {md, json, yaml} → the Tree Editor is offered in addition to the Raw Editor. Tab switch `Tree` / `Raw`, Default `Tree`.
- Otherwise: Raw Editor only.

Tab switching is in-memory (codec round-trip), no REST calls. Save path is the existing Document update path.

### 5.2 Feature Set v1

| Feature                               | v1 | Note                                                                                             |
|---------------------------------------|----|--------------------------------------------------------------------------------------------------|
| Read-only render (recursive)          | ✓  | first incarnation                                                                                |
| Add / edit / delete per node          | ✓  | inline edit, same keyboard shortcuts as list                                                     |
| Reorder (drag & drop) at the same level | ✓  | vue-draggable-plus, nested per Group `tree-{depth}` (or same Group name; Re-Parent test via parent-Path) |
| Indent / Outdent                      | ✓  | **Keyboard shortcut only**: Tab / Shift+Tab in edit mode                                         |
| Add-child-Button on item              | ✓  | appears on hover, inserts empty item as first child                                              |
| Expand / Collapse                     | ✓  | per node click on disclosure triangle, not persisted                                             |
| Drag between Levels (Re-Parent via Drag) | ✗  | see §6                                                                                           |
| Multi-Select across Hierarchy         | ✗  | see §6                                                                                           |

### 5.3 Keyboard Shortcuts

In edit mode of a node:

| Key               | Action                                                                                             |
|-------------------|----------------------------------------------------------------------------------------------------|
| `Enter`           | Commit, new sibling item after (same depth), edit on new item                                      |
| `Shift+Enter`     | Newline in `text` (multi-line item)                                                                |
| `Tab`             | **Indent** — the current item becomes a child of the direct preceding sibling. Edit remains active, cursor unchanged |
| `Shift+Tab`       | **Outdent** — the item moves one level up (becomes a sibling of its parent). If already at top-level: no-op |
| `Esc`             | Cancel                                                                                             |
| `Backspace` (empty) | Delete item, focus on previous node (DFS-prev)                                                     |

**Indent Rules:**
- Indent only works if a direct preceding sibling exists. First sibling in the level → no-op.
- Children of the indented item move with it (the entire subtree remains together).
- Outdent moves the item *after* the current parent (to the end of the parent's parent's sibling row). Children move with it.

### 5.4 Drag-Reorder Rules

- Within the same level: grab drag handle, move vertically between siblings. Reorder under the common parent.
- **Not allowed v1:** Move item between levels via drag. Use Tab/Shift+Tab for this.
- Implementation: all `VueDraggable` instances do *not* share the same `group` name — each level has its own group, so `vue-draggable-plus` prohibits cross-level drops from the outset. Visually clear: items from the current level show drop position, other levels do not.

### 5.5 Components

- `<TreeView>` — Top-level container, renders the `<VueDraggable>` of the top-level items.
- `<TreeNode>` — per node: Disclosure-Triangle, Drag-Handle, Text/Edit, Trash-Icon, Add-Child-Button. Contains itself recursively for its `children` (enclosed again by its own `<VueDraggable>` with the level-specific Group ID).

### 5.6 Visual Conventions

- **Indent per level:** 1.5rem left.
- **Disclosure-Triangle:** `▾` (open) / `▸` (closed). Default open. State is in the Tree-Component, lost on reload — no persistence in v1.
- **Drag-Handle:** `⠿` as with list, but per level-instance separately.

---

## 6. Future (not v1)

### 6.1 Drag between Levels (Re-Parent via Drag)

Full 2D drag with drop zones between items, at item end edges, and on hover over a node (= "make me a child"). Implementation focus:

- **Drop-Zone-Detection:** on `dragover`, detect position within the row — upper half = Drop-Above, lower half = Drop-Below, X-offset right of indent = "become Child".
- **Self-Drop Protection:** an item must not be dragged into its own subtree. On drag start, we mark all nodes in the subtree and block drops there.
- **Live-Preview:** Indent indicator during drag shows what depth would result on drop.

This is 3-4× more code than the keyboard variant and requires its own UX iteration. We will do this as soon as real usage shows that Tab/Shift+Tab is not sufficient.

### 6.2 Multi-Select across Hierarchy

`list` has Shift-/Ctrl-Click selection and bulk delete. In `tree`, this is open:

- **What happens on bulk delete of a parent** — delete children with it or promote them? Both behaviors are valid; the default is not unambiguous.
- **Range-Select across Levels** — the range follows DFS order, which is intuitive, but visually it can be confusing because the selected nodes are not contiguous.

Better to wait for a use case, then build.

### 6.3 Persistent Expand/Collapse

Retain state per node on reload — either as a per-user setting (`webui.tree.<docId>.collapsed`) or directly in the Document as an `extra` field per item. Both approaches have disadvantages: user setting grows indefinitely, item `extra` makes Document diffs less readable. Not now.

---

## 7. Open Points

- **Markdown Indent Size:** 2 spaces is the common default, but 4 is also widespread. Codec reads **both** (each indent level is normalized on read), writes canonically **2**.
- **Empty Items in the Hierarchy:** an empty `text` with `children` is allowed — the node acts as a pure grouping element. In md format, it is written as `- ` without text. Stable on round-trip.
- **Order of Item Keys** when writing: `text` first, then `children`, then passthrough-`extra`. Sufficient for now; Recipe tooling and LLM output quality can refine the convention later if needed.
