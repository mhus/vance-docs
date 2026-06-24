# Vance — Document Kind `data`

> Specifies the **`data` payload** for documents that carry an arbitrary, free-form data tree — objects, arrays, and primitive types. Designed as a **container that other tools or processes consume**, not as a thing humans hand-edit through a structured editor. The Web-UI offers a Preview-only viewer; raw editing is the only write path.
> See also: [doc-kind-items](doc-kind-items.md) | [doc-kind-records](doc-kind-records.md) | [web-ui](web-ui.md)

---

## 1. Purpose

`kind: data` is the *unstructured* sibling of the typed Kinds. Where `list` / `tree` / `records` / `sheet` prescribe a clear item model and come with a suitable editor, `data` is explicitly **free**: the Document holds any JSON / YAML object, written and read by tools or processes.

**Use Cases:**
- Configuration for a tool, located in the Project document pool (`config.yaml` with `kind: data`).
- Output of a Worker that produces structured data (e.g., a search result list with URLs + scores), which a Recipe later reads.
- Input bundle for a Worker (parameter set, fixture data).
- General "structured notebook" — key-value collection, tag list, lookup table without schema constraints.

**Distinction from other Kinds:**

| Kind        | Structure                             | Editor                | Who typically writes? |
|-------------|---------------------------------------|-----------------------|-----------------------|
| `list`      | Flat item list, one text per item     | List Editor (CRUD)    | Human in editor       |
| `tree`      | Hierarchical items                    | Tree Editor           | Human in editor       |
| `records`   | Table with fixed schema               | Records Editor        | Human in editor       |
| `sheet`     | 2D sheet with formulas                | Sheet Editor          | Human in editor       |
| `mindmap`   | Graph with layout                     | Mindmap Editor        | Human in editor       |
| `graph`     | Nodes + edges                         | Graph Editor          | Human in editor       |
| **`data`**  | **Arbitrary (Object / Array / Scalar)** | **Preview, no editor** | **Tools / Processes**, occasionally human in raw editor |
| `text`      | Free text                             | Raw                   | Human in raw editor   |
| `schema`    | Schema definition                     | Raw                   | Human in raw editor   |

`data` and `text` are the two "no dedicated editor" Kinds — `text` for Markdown prose, `data` for structured machine data.

**What this Spec defines:**
- On-disk formats JSON and YAML.
- Header convention (same `kind` mirror path as list/records).
- Pass-through guarantee: what goes in as top-level keys / values comes out unchanged (lossless).
- Web-UI activation: Preview tab as default (read-only Tree-View), Raw tab for actual editing.

**What it does not define:**
- Validation against a schema. `data` is by definition unstructured. To use a schema, use `records` (with a fixed header) or, in the future, `kind: schema` as a validator sidecar.
- Markdown form. There is **no** `kind: data` for Markdown — Markdown poorly carries structured data, and the editor path does not need an md-codec. To have "Markdown with YAML front matter": `kind: text` is sufficient.
- Index paths or server-side structural access. The server only reads and writes the entire body; data path access (e.g., `data.users[0].id`) is the responsibility of the consuming tools.
- Size limits beyond existing Document limits (inline threshold, storage-backed for larger bodies — same rules as for any other Doc).

---

## 2. Data Model

A `data` Document consists of two parts:

- **Header** (`$meta` in JSON, first Doc in YAML). Carries at least `kind: data`, optionally other top-level scalar keys that the `HeaderStrategy` path mirrors.
- **Body** (everything else). Any JSON / YAML-compliant structure:
  - Objects (`Map<String, Value>`)
  - Arrays / Lists (`List<Value>`)
  - Strings, Numbers, Booleans, `null`

There is **no** `items` wrapper, **no** `schema`, **no** predefined top-level shape. The entire body is free. The top level can be an object, an array, or even a scalar — anything that JSON / YAML accepts as a top-level value.

**Round-Trip Guarantee:** Reading + writing is lossless. Order of object keys is preserved (insertion order). Comments in YAML are lost — this is the only accepted round-trip loss and applies equally to all Vance codecs.

**What remains unobserved:**
- Cycles in the data structure: neither JSON nor YAML natively support them. `data` does not perform cycle detection — a tool that produces cycles will receive a codec error from the underlying library.
- Special YAML tags (`!!set`, `!!omap`, etc.): these are not preserved; the YAML library only uses standard types during round-trip. To use set semantics, model them as an array and de-duplicate upon consumption.

---

## 3. On-Disk Formats

### 3.1 JSON

```json
{
  "$meta": { "kind": "data" },
  "anything": "user choice",
  "nested": {
    "tags": ["urgent", "review"],
    "count": 42,
    "active": true
  },
  "list_of_things": [
    { "id": 1, "label": "alpha" },
    { "id": 2, "label": "beta" }
  ]
}
```

**Reading Rules:**
- `kind` from `$meta.kind`. Backward compatibility: legacy top-level `kind: "data"` is accepted as a fallback.
- All other top-level keys besides `$meta` are the body — held losslessly in `doc.data` (a generic `Record<string, unknown>`/`unknown` field).
- The top level can also be an array or scalar. In that case, no `$meta` wrapper slot exists; the codec accepts this but **does not** automatically mirror `kind: data` — such documents must have the `kind` set via the Document metadata API or will not be recognized as `data` by the `HeaderStrategy` path. Recommendation: a top-level object with `$meta` is the canonical form.

**Writing Rules:**
- 2-space indent.
- `$meta` always as the first top-level key for object form.
- Body keys in insertion order.
- Trailing newline at EOF.

### 3.2 YAML

```yaml
$meta:
  kind: data
anything: user choice
nested:
  tags: [urgent, review]
  count: 42
  active: true
list_of_things:
  - id: 1
    label: alpha
  - id: 2
    label: beta
```

Single-Document: Top-level mapping with `$meta` as the first key (carrying `kind`), followed by arbitrary body keys at the same level. Top-level array/scalar is also accepted — in that case, no space exists for `$meta`, and the `kind` must be set via the Document metadata API.

**Reading Rules:**
- Top-level mapping → `$meta.kind` is read and mirrored, the remaining top-level keys are the body.
- Mapping without `$meta` → no header mirror; the body consists of all top-level keys.
- Top-level array/scalar → body verbatim, no header.
- Comments are lost during round-trip — to preserve comments, document them in a sidecar `*.md`.

**Writing Rules:**
- Single-Document, 2-space indent, `$meta` as the first key for object form.
- Block style for deep structures, flow style for compact arrays of scalars (analogous to records).
- Trailing newline at EOF.

### 3.3 Markdown

Not supported. `kind: data` in Markdown front matter is rejected by the UI with "use JSON or YAML for data"; the Raw editor remains usable (it's still an `.md` file), but the Preview tab is disabled. In practice: Documents are created with the appropriate format (`.json` / `.yaml`), and `kind: data` mode assumes this.

---

## 4. Server Path

Like all other Kinds: **no dedicated endpoint**, no server-side data parser. `GET /documents/{id}` returns the entire body, `PUT /documents/{id}` writes it back. The `HeaderStrategy` path (`JsonHeaderStrategy` / `YamlHeaderStrategy`) recognizes `kind: data` in `$meta` or the first Doc and mirrors it to `DocumentDocument.kind` — the same code as for list/records/etc.

Tools / processes that consume or produce the Document use the normal Document tool suite (`doc_read`, `doc_create`, `doc_import_url`) — they see the body as a string and parse it themselves. There is **no** path access to individual fields via REST; that would be the responsibility of a `data_get(path)` tool at a higher level and is not part of this Spec.

---

## 5. Web-UI

### 5.1 Editor Activation

- **`kind === 'data'`** + Format ∈ {json, yaml} → Tabs `Preview` (Default) / `Raw`.
- **`kind === 'data'`** + Format = md → Raw editor only; a subtle hint in the toolbar recommends JSON or YAML.
- Other Format/Kind combinations: Raw editor only.

Switch `Preview → Raw`: no re-serialize needed (Preview is read-only — the Raw body is the truth). Switch `Raw → Preview`: the codec parses the current body and renders the Tree-View; in case of a parse error, the Preview tab shows a compact error card (line, column, expectation) instead of the tree.

### 5.2 Feature Set v1 — Preview Tab

| Feature                                | v1 | Note |
|----------------------------------------|----|------|
| Read-only Tree-View                    | ✓  | JSON / YAML structure as a collapsible tree |
| Expand / Collapse per Node             | ✓  | Click-toggle, Cmd/Ctrl-Click expands recursively |
| Type-Badges (Object / Array / Primitive) | ✓ | Small label to the right of the key |
| Search / Filter in Tree                | ✗  | v2 |
| Copy-Path to Node                      | ✗  | v2 |
| Editing in Preview                     | **intentionally no** | "free storage, editor is preview only, editing is done in the file itself" — Spec requirement |

**Edit Path:** Switch tab to `Raw`. There, the unchanged file body is editable like any other text-based document. Save is done via the Raw editor; Preview automatically reflects after save.

### 5.3 Visual Conventions

- **Tree Layout:** Indented List, one node per line. Indent in 1.25 rem steps, Twisty (`▸`/`▾`) at the beginning of each node line, Key in `font-mono`, Value in default font with type coloring (Strings normal, Numbers blue-toned, Booleans green/red, `null` gray-italic).
- **Arrays:** Index as key (`[0]`, `[1]`, …) in `font-mono` plus Type-Badge `Array(<n>)`.
- **Objects:** Key in quotes if whitespace / special characters, otherwise bare. Type-Badge `Object(<n keys>)`.
- **Deep Structures:** no hard cut of nesting depth; UI is the vertical scroll container. Default state on render: all top-level nodes expanded, everything deeper collapsed — otherwise large configs become unwieldy.
- **Long Values:** Strings > 200 characters are truncated with `…` and expand on click into a small modal/popover.
- **No DaisyUI classes** outside the component library (`VCard` for the Outer-Box, pure Tailwind layout classes for Grid and Spacing).

### 5.4 Components

- `<DataView>` — Top-level container. Receives `:doc: DataDocument` (parsed Body + meta), shows Preview or Raw according to the active tab. Emits `update:doc` only from the Raw tab — the Preview tab is silent.
- `<DataNode>` — recursive component for a tree node. Renders itself plus all children. Own `expanded` state, no global store needed.

### 5.5 Parse Errors in Preview Tab

If the Raw body is not valid JSON / YAML, the Preview tab shows a focused error card instead of the tree:

```
─ Parse error ──────────────────────────
This document is not valid <json|yaml>.

  Line 7, column 12:
    expected ',' or '}' before string

  Edit the file in the Raw tab to fix.
─────────────────────────────────────────
```

No automatic repair. No attempt to render a partial tree — all or nothing. The Raw tab remains fully functional and is the fix path.

---

## 6. Future (not v1)

### 6.1 Path Access via Tools

A `data_get(documentId, path)` / `data_set(documentId, path, value)` tool that allows selective reads and writes to a `data` document structure — similar to `jq`/`yq` paths. This would provide a structural operator layer to the entire Document pool. Separate spec step.

### 6.2 Schema Validation as Sidecar

An optional `schema:` field in the header (or `schemaRef:` to another Document with `kind: schema`), against which the codec can validate. v1 is intentionally schema-less because most use cases do not require a rigid structure.

### 6.3 Diff View on Save

If a tool overwrites the Document, a "diff since last save" view would be useful for the user to see what the machine has changed. UI layer, not a codec concern.

### 6.4 Search in Preview

Full-text search over keys and values with highlighting in the tree. Good UX, but not v1.

---

## 7. Open Points

- **Canonical form for Top-Level Array:** should the codec accept a top-level array or wrap it in an object with key `items` before saving? v1 accepts both; UI recommendation: top-level object, as `$meta` can be cleanly placed there.
- **YAML Anchors / Aliases:** the library default expands them on read. Round-trip is therefore not truly lossless if the user uses anchors — anchors become inline values. Accepted trade-off because Vance tools rarely produce anchors.
- **Very Large Bodies (> Inline-Threshold):** the Document becomes storage-backed (same mechanism as for other Kinds). The Preview tab must be able to stream content, or a "Body too large for preview, use a tool to access" fallback is shown. v1: Inline-Threshold is sufficient; storage-backed `kind: data` is a spec point for later.
- **Default Format on Creation:** if the user selects "new `kind: data` Document", should the stub be `.json` or `.yaml`? Suggestion: YAML — more compact, human-readable, equally consumable by tools.
