---
title: "Vancetope — Document Kind `records`"
parent: Specs
permalink: /specs/doc-kind-records
---

<!-- AUTO-GENERATED from specification/public/en/doc-kind-records.md — do not edit here. -->

---
# Vancetope — Document Kind `records`

> Specifies the **`records` payload** for documents that carry a flat, ordered table — a fixed schema in the metadata plus one record per item, with each record holding values for the schema's fields. Direct extension of [`kind: list`](/specs/doc-kind-items): same flat structure, same Bullet-per-Item-Form in Markdown, but per item a map of schema fields instead of a single `text` string.
> See also: [doc-kind-items](/specs/doc-kind-items) | [web-ui](/specs/web-ui)

---

## 1. Purpose

`kind: list` is a flat item list with only a `text` field. `kind: records` is its natural extension: **many uniform data records**, each record has **multiple named fields**, the field set is declared once in the Document Header and applies to all Records.

Use cases:
- CRUD-like lists with multiple columns (people, places, inventory, lookup tables).
- Input forms for Recipes/Tools where the fields are fixed.
- Structured note-pads in the style of "one line per entry, columns describe the entry".

Distinctions:
- **list**: one `text` per item, no schema, no columns. Records is the direct extension — same codec style, same on-disk form, just a richer item model.
- **records**: flat, fixed field set, one value per field per record. Table-like. Deliberately **no** hierarchy — schema invariant applies equally to all records; sub-records would break the global schema concept and are unreliable with current LLM output quality.
- **sheet**: a separate kind, to be specified later, for free 2D sheets without schema constraints.
- **dataset/tree-of-records** (hypothetical): Hierarchy over record groups is additively possible, but **not** part of this spec — it would get its own kind.

**What this spec defines:**
- Schema declaration in the header (comma-separated in md, array in json/yaml).
- Per-record field values (positional in md, named in json/yaml).
- Resilience rules: missing fields → empty, unknown fields → pass-through.
- On-disk format for md/json/yaml.
- Web-UI activation (Tab `Records` in addition to the Raw editor).

**What it does not define:**
- Field types (string/number/date/…). v1 is all `string`. Type system is a separate spec step.
- Server-side indexing per field. Records live in the `inlineText` body, not in separate Mongo columns.
- Validation rules (required, length, regex). Later extension.
- Schema editing via the UI (add/rename/delete columns) — see §6.

**Naming:** The kind name is `records` (plural), consistent with existing `KIND_CREATE_OPTIONS` in `DocumentApp.vue` and the list in `instructions/web-ui.md`. Singular `record` would follow the same convention as `list`/`tree`/`sheet`/`graph` — if desired, this is a simple rename that is explicitly left open here (see §7).

---

## 2. Schema and Records Model

### 2.1 Schema

The `schema` declares the order **and** the names of the fields that each record has. It lives as a **top-level field** in the Document, not within the records.

Allowed forms:

| Where                 | Form                                       | Example                                     |
|-----------------------|--------------------------------------------|----------------------------------------------|
| Markdown Front-Matter | Comma-separated string (one line)          | `schema: name, email, role`                 |
| JSON                  | Array of strings                           | `"schema": ["name", "email", "role"]`       |
| YAML                  | Block or Flow Sequence of strings          | `schema: [name, email, role]`               |

**Field Name Rules:**
- Whitespace around field names is trimmed when reading.
- Case-sensitive (`Name` ≠ `name`).
- Empty string as a field name is not allowed; the parser ignores empty entries (e.g., trailing comma `name, email, ` → 2 fields).
- Duplicate field names are not allowed; in case of conflict, the parser takes the first occurrence and ignores the rest with a codec warning (no throw — resilience).
- Recommended form: `kebab-case` or `camelCase`. Special characters other than `-`, `_`, `.` are accepted but stylistically undesirable.

**Requirement:** The `schema` field **must** be present and non-empty. If it is missing:
- Markdown: `kind: records` without `schema:` → the codec throws `RecordsCodecError("Missing schema in front-matter")`.
- JSON/YAML: no top-level `schema` (or empty array) → `RecordsCodecError("Missing or empty schema")`.

The UI catches this and displays a clear error message in the Records tab; the Raw editor remains usable.

### 2.2 Record

A record is a **Map<FieldName, Value>**. v1: all values are strings; `null`/`undefined` are normalized to an empty string when reading.

| Field           | Type                           | Required | Meaning                                                                   |
|-----------------|--------------------------------|----------|---------------------------------------------------------------------------|
| `<schemaField>` | `string`                       | no       | Value for the field; if missing, it is considered empty.                  |

**Resilience Rules (Reading):**
- If a schema field is missing in a record (md: fewer values than schema fields; json/yaml: key missing in object), the value is treated as `""` (empty string) — **not** as an error.
- If a record has **more** values than schema fields:
  - Markdown: excess values are moved into an implicit `extra._overflow: string[]` and re-emitted at the end of the record line when writing (round-trip stable).
  - JSON/YAML: additional object keys not in the schema end up in a per-record `extra: Record<string, unknown>` (pass-through as with list/tree).
- Values that are not strings (Numbers, Booleans, Null in json/yaml): normalized to strings via `String(value)` when reading; `null` → `""`.

**Forward Compatibility:** As with list/tree, records have an `extra` field that losslessly rotates unknown keys/excess values.

**Canonical Form** (JSON):

```json
{
  "$meta": { "kind": "records" },
  "schema": ["name", "email", "role"],
  "items": [
    { "name": "Alice", "email": "alice@ex.com", "role": "admin" },
    { "name": "Bob",   "email": "bob@ex.com",   "role": "user" },
    { "name": "Eve",   "email": "eve@ex.com",   "role": "viewer" }
  ]
}
```

An empty records document (`items: []`) is valid — it is an empty table with a defined schema.

**Header Convention per Format:** identical to [doc-kind-items](/specs/doc-kind-items) — both JSON and YAML carry `kind` in a `$meta` mapping at the top level. `schema` deliberately remains **outside** of `$meta` — as an array, it is not a scalar and would be filtered by `JsonHeaderStrategy`/`YamlHeaderStrategy` anyway. The typed array form is easier to handle in the editor than a flat comma-separated string.

---

## 3. On-Disk Formats

### 3.1 Markdown

```markdown
---
kind: records
schema: name, email, role
---
- Alice, alice@ex.com, admin
- Bob, bob@ex.com, user
- "Eve, M.D.", eve@ex.com, "viewer, read-only"
```

One bullet line per record. Values are positionally assigned to the schema — the first value is `name`, the second `email`, the third `role`.

**Reading Rules:**
- Front-Matter like list/tree (`---`-fences). `schema:` is mandatory; all other front-matter keys go into `doc.extra` (pass-through).
- Body: Bullet lines (`\s*[-*]\s+`) are records. Each bullet line is parsed **CSV-light**:
  - Values are comma-separated.
  - A value in `"…"` is a **quoted value**: a comma inside is part of the value, `""` inside the quote is a literal `"`. Example: `"Eve, M.D."`.
  - Whitespace around separating commas is trimmed; whitespace within a quoted value is preserved.
  - Empty value (two consecutive commas, `Alice, , admin`) → `""`.
- Continuation lines (multi-line values): not supported in v1. For values with actual newlines, use JSON/YAML. Markdown records remain single-line per bullet (resilience: subsequent lines without a bullet are ignored, not merged).
- Skip-Indent: `kind: records` is flat. Indented bullets are normalized to top-level (like `kind: list`).

**Writing Rules:**
- Pre-order, one record per bullet line.
- Value encoding per field:
  - If the value contains no special characters (`,` or `"` or leading/trailing whitespace): unquoted, trimmed.
  - Otherwise: quoted (`"…" `), `"` inside escaped as `""`.
  - Values with newlines cannot be written in Markdown — the writer throws `RecordsCodecError("Value contains newline; not representable in markdown form")`. Resilience applies only when **reading** existing data; when **writing**, the writer must honestly abort, otherwise the round-trip would be broken.
- Trailing newline at EOF.
- `extra._overflow` values are appended to the end of the bullet line (comma-separated).

### 3.2 JSON

```json
{
  "$meta": { "kind": "records" },
  "schema": ["name", "email", "role"],
  "items": [
    { "name": "Alice", "email": "alice@ex.com", "role": "admin" },
    { "name": "Bob",   "email": "bob@ex.com",   "role": "user" }
  ]
}
```

**Reading Rules:**
- `kind` from `$meta.kind`. Backward-compat: legacy top-level `kind` is accepted as a fallback.
- Top-level object with `schema`, `items`. Other top-level keys (except `$meta`) → `doc.extra`.
- `items` is an array of objects. Each object has 0..n schema field keys; all other keys go into the record's `extra`.
- String coercion: non-string values (number/boolean/null/array/object) are converted to strings via `String(v)`, with the exception `null` → `""` and `undefined` → `""`.

**Writing Rules:**
- 2-space indent.
- Order of top-level keys: `$meta`, `schema`, `items`, then `extra` pass-through.
- Order of record keys: first schema fields in schema order, then `extra` keys in insertion order.
- Fields that are empty in the record (`""`) are written as `""`-string (not omitted) — the round-trip should make it clear that the field is known but empty. Fields that are in the schema but were in the record's `extra` (should not happen) are promoted to the schema value.

### 3.3 YAML

```yaml
$meta:
  kind: records
schema: [name, email, role]
items:
  - name: Alice
    email: alice@ex.com
    role: admin
  - name: Bob
    email: bob@ex.com
    role: user
```

Single-document: top-level mapping with `$meta: { kind: records }` as the first key, followed by `schema` and `items` at the same level. Block-style sequences for `items`, flow-style for the `schema` array.

**Reading Rules:**
- `kind` is read from `$meta.kind`; `schema` and `items` are top-level keys next to `$meta`.
- Schema block and flow forms are equally accepted; canonically written as flow.

**Writing Rules:**
- Single-document, 2-space indent, `$meta` as the first top-level key.
- Schema canonically as a flow sequence (`[...]`) — compact and suitable for the Markdown CSV string.
- Records canonically as a block mapping (key/value per line).

---

## 4. Server Path

Like list/tree/mindmap: **no dedicated endpoint**, no server-side records parser. The editor loads the document via `GET /documents/{id}`, parses in the browser, writes the serialized body back with `PUT /documents/{id}`. The `HeaderStrategy` path automatically mirrors `kind: records` to `DocumentDocument.kind`.

`schema` remains transparent to the server — it is just a front-matter key (md) or a top-level JSON/YAML key that passes through the `HeaderStrategy` path unchanged.

---

## 5. Web-UI

### 5.1 Editor Activation

- **`kind === 'records'`** + Format ∈ {md, json, yaml} → Tabs `Records` (Default) / `Raw`.
- Otherwise: Raw editor only.

When switching `Records → Raw`, the parsed model is serialized back, the Raw editor shows the canonical form. When switching `Raw → Records`, the codec re-parses the current body. Round-trip is idempotent — no oscillation via the watch loop.

### 5.2 Feature Set v1

| Feature                                | v1 | Note |
|----------------------------------------|----|------|
| Read-only render (table)               | ✓  | Columns from `schema`, one row per record |
| Edit-per-cell (inline)                 | ✓  | Click → Edit, Enter → commit + next row, Tab → next cell |
| Add row                                | ✓  | "+ Entry" at the end, focuses the first cell |
| Delete row                             | ✓  | ✕-Icon per row |
| Reorder (drag-drop) rows               | ✓  | Drag handle like in list, vue-draggable-plus |
| Multi-Select over rows + Bulk-Delete   | ✓  | Cmd/Ctrl-Click + Shift-Click like in list |
| Edit schema (columns)                  | ✓v2| Header editor: rename, add, delete, move — see §5.6 |
| Validation per field                   | ✗  | v2 |
| Sort / Filter                          | ✗  | v2 |

### 5.3 Keyboard Shortcuts

| Key                  | Action |
|----------------------|--------|
| `Enter`              | Commit current cell, jump to the same column of the next row (or create new row if at end) |
| `Tab` / `Shift+Tab`  | Next / previous cell (across rows, left→right→next row) |
| `Esc`                | Cancel current edits |
| `Backspace` (empty)  | If all cells in the row are empty and Backspace is pressed in an empty cell: delete row, focus on previous row/column |
| `Cmd/Ctrl-Click`     | Multi-select toggle per row |
| `Shift-Click`        | Range-select per row |

### 5.4 Components

- `<RecordsView>` — Top-level container. Receives `:doc: RecordsDocument`, emits `update:doc`. Manages:
  - Local schema array (Mutable Copy + Re-Emit after mutation).
  - Local items array (Mutable Copy + Re-Emit after mutation).
  - Inline edit state (which cell is currently being edited).
  - Multi-selection set (Set<number> of row indices).
  - Schema mode flag (see §5.6).
  - Drag handler via `vue-draggable-plus`.
- Schema header displays field names as column titles — read-only in display mode, fully editable in schema mode.
- Uses `VButton` for actions, pure Tailwind layout classes for the grid. No DaisyUI classes outside the library.

### 5.5 Visual Conventions

- **Grid Layout:** CSS Grid with `grid-template-columns: 1.25rem repeat(<n>, minmax(8rem, 1fr)) auto;` — drag handle, n columns, action slot (Delete-Row in display mode, "+ column" button in schema mode).
- **Schema Header Row:** sticky top, font-mono for field names, with contrasting background tint in schema mode (`hsl(var(--p) / 0.06)`).
- **Empty Cell:** italic-gray placeholder (`—`), clickable like a filled cell.
- **Active Cell:** Border highlight, shadow analogous to the List editor.
- **Body in Schema Mode:** `opacity: 0.55 + pointer-events: none` — rows remain visible but are inert to cell edit, drag, and row delete.
- **Bulk Action Bar:** sticky at the bottom, identical to the List editor (`{count} selected · Clear · Delete selected`). Hidden in schema mode.

### 5.6 Schema Editor (v2)

Toggle-based mode where the schema header row becomes an editable column bar. Accessible via the `Edit schema` button in the top toolbar. Implemented in `RecordsView.vue` v2.

**Operations** (all direct-apply, no separate commit step; each mutation immediately emits a fresh `RecordsDocument`):

| Operation         | UI                                          | Effect on Records |
|-------------------|---------------------------------------------|-------------------|
| Rename column     | Inline input per header cell, commit on `blur`/`Enter` | Value moves from old key to new key in each record. |
| Add column        | `+`-button in the action slot column on the right | New column with default name `column_<N>` (smallest free index); each record gets `""` for the new field. |
| Delete column     | `✕`-button per column                       | Schema entry removed; corresponding key deleted in each record. Disabled if only one column remains (schema must remain non-empty). |
| Move column       | `←`/`→`-buttons per column                | Schema index swap; record values unchanged. |

**Validation:**
- Rename to empty string → reverted, toolbar shows error ("Column name cannot be empty").
- Rename to a name already used by another column → reverted, toolbar shows error ("Another column is already named '<name>'").
- Attempt to delete the last column → no-op, toolbar shows error ("A records document needs at least one column.").
- Default name generator automatically selects a free `column_<N>` so that `addColumn` never collides.

**Constraints in Schema Mode:**
- Cell edit (body cells) is disabled — `startEdit` is no-op.
- Row drag is disabled (`VueDraggable :disabled="schemaMode"`).
- Row delete button disappears from body rows.
- Multi-select / bulk bar are hidden.

**Reorder Strategy**: Column reorder via `←/→` instead of drag, because the header grid and body grid columns need exactly the same positions — drag-and-drop for columns would force layout re-sync between header and body, which does not justify the UX complexity versus the benefit.

**Renames are explicit** and not derived by position diff: each header has an input bound to its current schema entry (`:value="field"`, `@change="renameColumn"`), so that "rename to X" and "delete + add X" remain semantically different — the first is lossless, the second loses the old values. Add/Delete are separate buttons; no write operation in the input triggers any add/delete logic.

---

## 6. Future (not v1, not v2)

### 6.1 Field Types

Schema will be extended to `[{ name: string, type: 'string'|'number'|'date'|'boolean' }]`. Type-specific inputs (Date-Picker, Number-Stepper, Checkbox). Validation and format round-trip per type. Separate spec point — the string default in v1 is intentional so that existing records do not need a migration path.

### 6.2 Sort, Filter, Search

Column headers become clickable (sort), plus a filter input per column or a global search box. Both are UI layer features that virtually project the `items` array — the on-disk order does not change.

### 6.3 Validation Rules

Per field: required, regex, min/max, enum list. Schema will be `[{ name, type, validation? }]`. Editor shows inline errors. Comes after field types.

### 6.4 Export (CSV / TSV)

Records are close to CSV. An "Export CSV" button in the editor produces RFC-4180 compliant CSV. Optional import via file picker — column names are matched against the schema. Separate spec point.

### 6.5 Soft-Delete for Columns

When deleting a column, the values are discarded from each record. A safer variant would park them under `extra._removed.<oldName>` so that an undo remains possible. v2 deliberately chooses hard-delete for simplicity; v3 variant is additive.

---

## 7. Open Points

- **Kind name `records` vs. `record`:** Plural matches existing `KIND_CREATE_OPTIONS`, singular would be more consistent with `list`/`tree`/`mindmap`/`graph`/`sheet`. Default here is plural; switching to singular is a rename PR across `KIND_CREATE_OPTIONS` + spec file + `buildKindStub`.
- **CSV-Light vs. true RFC-4180:** v1 implements quoting for comma and double quote, but **no** newlines in values. True RFC-4180 allows embedded newlines in quoted values. For Vancetope records with multi-line texts, JSON/YAML is the documented way.
- **`extra._overflow`** vs. silent-drop: excess values in Markdown are preserved. An alternative would be silent loss on save. Preservation wins — otherwise data would be lost when moving back and forth through UI tabs.
- **Order of schema fields with multiple mentions** (`schema: name, email, name`): Parser takes the first occurrence and drops duplicates. An alternative would be to throw — we stick to resilient.
- **Whitespace in field names:** trim at comma splitting, but `"name with spaces"` as a quoted schema field? Not foreseen in v1 — field names are token-like. Refine if real need arises.
