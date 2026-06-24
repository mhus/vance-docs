---
title: "Vance — Document Kinds with Items"
parent: Specs
permalink: /specs/doc-kind-items
---

<!-- AUTO-GENERATED from specification/public/en/doc-kind-items.md — do not edit here. -->

---
# Vance — Document Kinds with Items

> Specifies the **`items` payload** for documents that carry an ordered list of small records — currently the privileged `kind: list`. Defines a single canonical model that maps to three on-disk formats (markdown, JSON, YAML) and round-trips losslessly.
> See also: [web-ui](/specs/web-ui) | [recipes](/specs/recipes) | DocumentDocument / DocumentHeader

---

## 1. Purpose

Documents in Vance have a `kind` header (see `DocumentHeader.kind`). For some kinds — `list` is the first — the actual content consists of an **ordered sequence of small, uniform items**. The Web-UI should offer the following for such Documents:

- **Specialized editors/views** (CRUD, drag-and-drop, multi-select), in addition to the existing raw editor.
- **Format-agnostic** operation — the same editor serves Markdown, JSON, and YAML documents.

For this to work, the server and client need a common item schema and a deterministic round-trip convention between the three formats and a typed item model.

**What this spec defines:**
- The canonical item schema (fields, required/optional, forward compatibility).
- The on-disk form per format (md, json, yaml).
- Round-trip guarantees for reading/writing.
- A stub for `kind: tree` as a logical extension — **not in v1**.

**What it does not define:**
- UI layout, keyboard shortcuts, drag-and-drop library — see `web-ui.md`.
- Storage within the DB Document itself — items continue to reside in the `inlineText` body, using the same persistence as all Documents.

---

## 2. Items Model

A Document with `kind: list` is **flat** — a single sequence of items without nesting. Each item is an object with:

| Field   | Type     | Required | Meaning                                       |
|---------|----------|----------|-----------------------------------------------|
| `text`  | `string` | yes      | Display text of the item, single or multi-line allowed. |

**Forward compatibility:** Future fields (`done`, `tags`, `id`, `dueAt`, …) are possible without breaking the schema — parsers accept unknown fields and write them back unchanged (lossless round-trip). The initial v1 implementation **writes** only `text`; existing additional fields are preserved when reading and outputted when writing.

**Canonical Form** (JSON):

```json
{
  "$meta": { "kind": "list" },
  "items": [
    { "text": "first item" },
    { "text": "second item" }
  ]
}
```

`items` is a `List<Item>`; an empty Document (`items: []`) is valid.

**Header Convention per Format** (read by the server `HeaderStrategy` path, which mirrors `kind` to `DocumentDocument.kind`):

| Format   | Header                                      | Body                                      |
|----------|---------------------------------------------|-------------------------------------------|
| Markdown | `---` frontmatter with `kind: list` (see §3.1) | Bullet list after the closing fence       |
| JSON     | Top-level object `"$meta": { "kind": "list" }` | Remaining top-level keys (`items`, etc.) alongside `$meta` |
| YAML     | Top-level mapping with `$meta: { kind: list }` as the first key | `items` etc. at the same level alongside `$meta` |

Background: server-side `JsonHeaderStrategy` and `YamlHeaderStrategy` recognize `kind` exclusively in the canonical `$meta` form — otherwise, `kind` is not mirrored and Kind filters break. JSON and YAML are exactly symmetrical in their header convention.

---

## 3. On-Disk Formats

### 3.1 Markdown — `kind: list`

The on-disk form is a **pure bullet list** in the body, after the usual front-matter block:

```markdown
---
kind: list
---
- first item
- second item
```

**Reading Rules:**
- The front-matter parser reads `kind: list` from the `---` fences (see `MarkdownHeaderStrategy`); for the items, only the body **after** the closing fence matters.
- A line starting with `- ` (dash + space) or `* ` is an item; everything after the marker is `text` (trimmed).
- Multi-line items: any subsequent line indented with at least **2 spaces** and not starting with a bullet itself becomes part of the `text` of the previous item (with `\n` as separator).
- Nesting through deeper indentation (`  - sub-item`) is **not allowed** in `kind: list`. If a parser encounters such lines, it treats them as a continuation of `text` or ignores them — it never creates sub-items. (This will be `kind: tree`, see §5.)
- Blank lines between items are ignored but not reproduced when writing.

**Writing Rules (Round-trip):**
- Front-matter is preserved unchanged (server writing path leaves the header pre-block untouched).
- Items are outputted as `- {text}`, one line per item, in order.
- Multi-line `text` is outputted with a two-space continuation indent.
- Items carrying additional fields other than `text` are **not** serializable in Markdown — they would be lost on round-trip. Practical consequence: Users of typed editors with Markdown items are limited to `text`-only. Those who need more (`done`, `tags`, …) switch to JSON/YAML.

### 3.2 JSON

```json
{
  "$meta": { "kind": "list" },
  "items": [
    { "text": "first item" },
    { "text": "second item" }
  ]
}
```

**Reading Rules:**
- The parser accepts the object form. `kind` is read from `$meta.kind`; legacy top-level `kind` is accepted as a fallback (backward compatibility).
- Optional: `items` as `string[]` (compact shorthand) — each string is then promoted to `{ "text": "..." }`.
- Unknown top-level keys (other than `$meta`, `items`) are preserved and written back as top-level (passthrough). Unknown item keys likewise.
- Order of top-level keys: canonically `$meta` first, then `items`, then passthrough.

**Writing Rules:**
- 2-space indent, one item per line (or pretty-printed over multiple lines if the item has additional fields).
- Trailing newline at EOF.

### 3.3 YAML

```yaml
$meta:
  kind: list
items:
  - text: first item
  - text: second item
```

**Reading Rules:**
- Top-level mapping with `$meta` as a reserved key, carrying `kind` (and possibly other scalar keys); remaining top-level keys (`items`, passthrough) form the body.
- Optional: `items` as a pure string sequence (`- first item`) — then the same `text`-promote as for JSON.
- Unknown keys are preserved (passthrough).

**Writing Rules:**
- Single-document, 2-space indent, `$meta` as the first top-level key, block-style sequences (`- text: …`).
- Trailing newline at EOF.

---

## 4. Server Path

**No new endpoint, no server-side parser for items.** The List editor loads the Document via the existing `GET /documents/{id}` (with `inlineText` in the body), parses in the browser, edits locally, and writes the newly serialized body back with `PUT /documents/{id}` (or the existing update path). Rationale:

- A duplicate parser path (server + client) would be redundant if the editor already needs a typed item model in the browser.
- Forward-compatible fields are passed through by the client parser via an `extra` map — on save, the entire body is re-serialized; untouched fields are preserved.
- Both editors (Raw + List) write via the same Document update path — no separate conflict/ETag handling.

On the server side, only the existing **`HeaderStrategy` pipeline** remains (front-matter parser for `kind`-mirror, see `MarkdownHeaderStrategy` / `JsonHeaderStrategy` / `YamlHeaderStrategy`) — this is independent of the item body and already in place.

If CLI/Mobile later need the same item logic, the parser will be added there separately — YAGNI for v1.

---

## 5. Web-UI

### 5.1 Editor Activation

The Document editor already knows the `kind` value per item in the list (see `DocumentSummary.kind`). When the user opens a Document:

- **`kind === 'list'`** + Format ∈ {md, json, yaml} → the List editor is offered **in addition** to the Raw editor. Tab switch at the top (`List` / `Raw`), default `List`.
- Otherwise: only Raw editor as before.

When switching `Raw → List`, the client parses the current body **in-memory** (no server round-trip); when switching `List → Raw`, the item model is serialized back and written into the Raw editor. The Save button writes the serialized body via the **existing** Document update path (`PUT /documents/{id}`) — no new endpoint.

An in-flight switch between tabs will prompt a confirmation "unsaved changes" if the currently visible editor has unsaved changes.

### 5.2 Feature Set v1

| Feature           | v1 | Note                                      |
|-------------------|----|-------------------------------------------|
| Read-only render  | ✓  | first incarnation                         |
| Add / edit / delete | ✓  | inline edit per item                      |
| Reorder (drag-drop) | ✓  | Library: `vue-draggable-plus`             |
| Multi-select      | ✓  | Shift-/Ctrl-Click, then Bulk-Delete       |
| Indent / outdent  | ✗  | belongs to `kind: tree`                   |
| Done-Toggle       | ✗  | when `done` field arrives                 |
| Tags per Item     | ✗  | when `tags` field arrives                 |

### 5.3 Components

- `<ListView>` — read-only render, a `<ul>` with per-item row.
- `<ListEditor>` — wraps `<ListView>` + drag-handle, edit mode, multi-select.
- Uses **DaisyUI primitives** for buttons (`btn-ghost btn-sm`), inputs (`input input-bordered`) — no custom classes outside `src/components/`.

### 5.4 Keyboard Shortcuts (target)

- `Enter` on an item row → new row after it, cursor in edit.
- `Backspace` on an empty row → delete row, focus to previous item.
- `Esc` in edit mode → Cancel.
- `Cmd/Ctrl-Click` → Multi-Select toggle.
- `Shift-Click` → Range-Select.

---

## 6. `kind: tree` (future, **not** in v1)

As soon as nesting is needed, `kind: tree` will be introduced as a second item variant. Schema sketch:

```yaml
$meta:
  kind: tree
items:
  - text: parent
    children:
      - text: child
        children: []
```

- Same `ItemsService` pipeline, separate `TreeItem` record type with `children: List<TreeItem>`.
- Markdown form uses indent nesting (`  - sub-item`), which is explicitly forbidden for `kind: list`.
- Editor gets `Tab` / `Shift+Tab` for indent/outdent.
- A Tree cannot be loaded as a List and vice versa — editor selection strictly follows the `kind` value.

The goal of this separation: lists and trees have different UI affordances (drag-and-drop is 1D for lists, 2D for trees); a common editor with a mode switch would be unnecessarily complex.

---

## 7. `kind: checklist` (separate Spec)

Third item variant: flat item sequence **with status per item** (open, done, in_progress, blocked, review, needs_info, deferred, delegated, waiting) plus an optional `priority` field. Markdown form uses the GFM checkbox syntax extended to single-character status (`- [<char>] text`). A separate Kind instead of an optional field on `list`, so the editor always has a status column and MD round-trip is unambiguous per Kind.

Full specification: **[doc-kind-checklist.md](/specs/doc-kind-checklist)**.

Relationship to this spec:
- Item model, top-level schema (`$meta` / `items` / `extra`), format mapping conventions (JSON/YAML/MD), server path (no server parser, client round-trip via `PUT /documents/{id}`), and UI component family (`<ListView>`/`<ListEditor>` analogous to `<ChecklistView>`/`<ChecklistEditor>`) are shared.
- Delta: `status` field per item (required with default), `priority` field (optional), character mapping in the MD bullet box, status dropdown + aggregate header in the editor.

A potential combination with nesting (`kind: tree-checklist`) is outlined in the Open Points section of the Checklist spec, **not in v1**.

---

## 8. Open Points

- **Multi-line item texts in Markdown round-trip** — continuation indent works but is not everyone's stylistic preference. Alternative: enforce single-line, discard additional lines. Decision pending until the first real use case.
- **Sort order when writing** — keys within an item: `text` first, then `extra` in insertion order. Sufficient for now; if LLM output round-trip quality suffers, this will be regulated separately in `recipes.md` § Tooling.
- **DB index on `kind`** — already exists via `DocumentDocument.kind`. Items themselves do not land in separate Mongo columns; the item sequence remains exclusively in the `inlineText` body. If bulk queries ("all items with `done: false` across all list-Documents") are needed, that is a separate spec point.
