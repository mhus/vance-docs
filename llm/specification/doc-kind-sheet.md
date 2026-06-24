---
# Vance — Document Kind `sheet`

> Specifies the **`sheet` payload** for documents that carry a 2D table with A1 cell addresses — a table with named columns and numbered rows, sparse cell storage, optional per-cell formatting. Excel-compatible addressing. Formula strings are round-trip stable; evaluation only in v2. Markdown is intentionally **not** supported; only JSON and YAML.
> See also: [doc-kind-records](doc-kind-records.md) | [doc-kind-graph](doc-kind-graph.md) | [web-ui](web-ui.md)

---

## 1. Purpose

Use cases: small data tables with cell references, simple calculation sheets, imported spreadsheet content from external tools, Recipes, or tools that produce structured numerical data.

Distinctions:
- **records**: tabular with named schema, without cell addresses, without formulas.
- **graph**: first-class nodes + edges, no 2D grid.
- **sheet**: 2D grid with A1 addresses (`A1`, `B5`, `Z99`), sparse cells, Excel-compatible.

**Design principle:** Sparse storage — only cells with content or formatting appear in the body. Only `field` (address) and `data` (content) are mandatory per cell. All formatting fields are optional; resilient reading drops unknown/invalid cells with a warning instead of throwing an error.

**What this spec defines:**
- Cell model with `field: A1` address + `data` as a string.
- Schema list of columns (`['A', 'B', 'C', ...]`) and optional row count.
- Optional per-cell formatting (`color`, `background` v1; `bold`/`italic`/`align` v2).
- Format mapping for JSON and YAML.
- Web UI activation with an HTML grid editor.
- Formula string convention (Excel subset, **inert in v1** — no evaluation).

**What it does not define:**
- Markdown form (CSV-Light would be unreadable for sparse cells; a raw editor is sufficient).
- Formula evaluation (see §6.1, v2).
- Server-side formula engine (Apache POI as Java counterpart; v3 spec).
- Multiple worksheets per Document (one Sheet per Document; multiple Sheets = multiple Documents).
- Cell ranges for multi-cell selection and bulk format (v3).
- Excel/CSV import or export (separate spec item).

---

## 2. Data Model

### 2.1 Cell

| Field        | Type                           | Required | Meaning                                                              |
|--------------|--------------------------------|----------|----------------------------------------------------------------------|
| `field`      | `string` (A1 address)          | **yes**  | Excel standard: column letters + row number (`A1`, `B5`, `AB99`).    |
| `data`       | `string`                       | **yes**  | Cell content. Can be a value (`"10"`, `"hello"`) or a formula (`"=A1+B1"`). |
| `color`      | `string` (HTML hex)            | no       | Font color, format like mindmap/graph (`#rrggbb`/`#rgb`).            |
| `background` | `string` (HTML hex)            | no       | Cell background.                                                     |

**A1 Address Rules:**
- Pattern: `^[A-Z]+[1-9][0-9]*$` (at least one letter, followed by a row number ≥ 1).
- Column range: `A` to `ZZ` (`A`-`Z`, then `AA`-`AZ`, ..., `ZZ`) — 702 columns max in v1, sufficient.
- Row range: 1 to unbounded (limited by UI to a default, see §5.5).
- Addresses are read case-insensitive but written canonically in **uppercase** (`a1` → `A1`).
- Multiple occurrences of the same address: Codec throws `SheetCodecError("Duplicate cell: <addr>")`.

**Resilience during Reading:**
- Cells with invalid addresses (wrong pattern, empty string) are dropped with a Codec warning, **not** a throw.
- Cells with a missing `data` line are considered empty (`""`) — the cell is retained if it carries formatting.
- `data` is coerced to a string (Number/Boolean → `String(v)`, `null` → `""`).
- Unknown per-cell fields: stored in `cell.extra`, round-trip stable.

### 2.2 Top-Level

| Field    | Type                 | Required | Meaning                                                          |
|----------|----------------------|----------|------------------------------------------------------------------|
| `kind`   | `string` = `"sheet"` | yes      | For dispatcher recognition (in `$meta`).                         |
| `schema` | `string[]`           | no       | Ordered list of visible columns (`['A','B','C']`). Missing → editor infers from existing cells + a buffer of one empty column. |
| `rows`   | `number`             | no       | Number of visible rows. Missing → editor infers from the highest referenced row + a buffer of one empty row. |
| `cells`  | `Cell[]`             | yes      | Sparse list of cells carrying content or formatting. Order has no semantic meaning, round-trip stable. |

**Schema Rules:**
- Order is significant — determines column display left→right. Gaps (`['A', 'C']` without B) are allowed; the editor displays them as such.
- When writing, canonically sorted by column index? No — canonically as on disk (preserve user order). The editor provides a sort button that explicitly orders columns alphabetically.

**Canonical Form** (JSON):

```json
{
  "$meta": { "kind": "sheet" },
  "schema": ["A", "B", "C"],
  "rows": 5,
  "cells": [
    { "field": "A1", "data": "Item" },
    { "field": "B1", "data": "Qty" },
    { "field": "C1", "data": "Total" },
    { "field": "A2", "data": "Apples" },
    { "field": "B2", "data": "10" },
    { "field": "C2", "data": "=B2*1.5", "background": "#fef3c7" },
    { "field": "A3", "data": "Bananas" },
    { "field": "B3", "data": "5" },
    { "field": "C3", "data": "=B3*1.5", "background": "#fef3c7" }
  ]
}
```

An empty Sheet (`cells: []`) is valid — the editor displays a default grid (e.g., 5x3).

---

## 3. On-Disk Formats

### 3.1 JSON

As in the §2.2 example. **Reading Rules:**
- `kind` from `$meta.kind` (with top-level fallback for legacy Documents).
- Top-level: `schema?`, `rows?`, `cells`. Other top-level keys → `doc.extra`.
- `cells` must be an array. Non-object entries are dropped.
- Per cell: `field` and `data` validated as in §2.1.

**Writing Rules:**
- 2-space indent.
- Top-level order: `$meta`, `schema?`, `rows?`, `cells`, then pass-through.
- Cell key order: `field`, `data`, `color?`, `background?`, then pass-through.
- Cells with only `field` and empty `data` and no formatting **are not written** — they are the UI default form, not worthy of persistence.
- Cells are not implicitly sorted; round-trip preserves disk order.

### 3.2 YAML

```yaml
$meta:
  kind: sheet
schema: [A, B, C]
rows: 5
cells:
  - field: A1
    data: Item
  - field: B1
    data: Qty
  - field: C1
    data: Total
  - field: A2
    data: Apples
  - field: B2
    data: "10"
  - field: C2
    data: "=B2*1.5"
    background: "#fef3c7"
```

Single-Document: Top-level mapping with `$meta: { kind: sheet }` as the first key, followed by `schema`, `rows`, `cells` at the same level. Block-style mapping per cell, schema canonically as a flow sequence.

**YAML Quoting Note:** Formula strings must be quoted, otherwise YAML interprets them as a map or a reserved token (`=A1` is okay, but `=YES` would otherwise be misinterpreted as a YAML boolean). The Codec automatically quotes when writing.

### 3.3 Markdown

**Deliberately not supported** — sparse cells in CSV-Light would be unreadable, and a full Markdown pipe-table roundtrip with formatting is more code than value. Markdown bodies with `kind: sheet` fall back to the raw editor.

---

## 4. Server Path

Like list/tree/records/graph: **no dedicated endpoint**, no server-side Sheet parser. `HeaderStrategy` automatically mirrors `kind: sheet`. Sparse cells and schema are transparent to the server — it reads them like all top-level keys.

**Formula Evaluation on the Server**: not v1. A later spec item (see §6.2) defines a REST route `POST /brain/{tenant}/sheet/eval` that accepts a SheetDocument and calculates the formula subset values using Apache POI. Until then, formulas are opaque strings on the server side.

---

## 5. Web UI

### 5.1 Editor Activation

- **`kind === 'sheet'`** + Format ∈ {json, yaml} → Tabs `Sheet` (Default) / `Raw`.
- **`kind === 'sheet'`** + Markdown → only `Raw` editor, no Sheet tab.
- Otherwise: only `Raw` editor.

### 5.2 Feature Set v1

| Feature                                  | v1 | Note |
|------------------------------------------|----|------|
| Render Grid with Column Headers + Row Numbers | ✓ | HTML table, no external grid lib |
| Cell Edit (inline, click → input)        | ✓  | Same UX as Records editor |
| Cell Navigation by Keyboard              | ✓  | Tab/Shift+Tab horizontal, Enter/Shift+Enter vertical |
| Add row / add column                     | ✓  | Toolbar buttons; new column is next available letter |
| Delete row / delete column               | ✓  | Via right-click header or toolbar |
| Cell Color + Background                  | ✓  | Side panel or toolbar on selection |
| Persist Formula Strings                  | ✓  | `=…` values are stored round-trip stable, **rendered as text** |
| **Formula Evaluation**                   | ✗  | v2 (HyperFormula) — see §6.1 |
| Select Cell Ranges                       | ✗  | v3 |
| Bold/Italic/Align                        | ✗  | v3 |
| CSV/XLSX Import/Export                   | ✗  | v3 |
| Multiple Worksheets                      | ✗  | Not planned — one Document = one Sheet |

### 5.3 Keyboard Shortcuts

| Key                  | Action |
|----------------------|--------|
| `Enter`              | Commit cell, jump to the same column in the next row (or create row at the end) |
| `Tab` / `Shift+Tab`  | Next / previous cell (left→right→next row, with wrap at the end) |
| `Esc`                | Cancel current edit |
| `Backspace` (empty)  | If the cell is empty, the codec drops it — no "delete row" effect |

### 5.4 Components

- `<SheetView>` — Top-level container. Receives `:doc: SheetDocument`, emits `update:doc`.
  - Holds local, mutable copies of `cells`, `schema`, `rows`.
  - Calculates the displayed grid: `schema.length` columns × `rows` rows. Cells are resolved via a map lookup `cellsByAddress: Map<string, SheetCell>`.
  - Inline edit via `<input type="text">` per selected cell.
  - Add-Row appends a row to the end (`rows++`); Add-Column appends the next available letter (`A`, `B`, … `Z`, `AA`, `AB`, …).
  - Delete-Row deletes all cells in that row + decrements `rows`. Delete-Column likewise with the column letter.
  - Side panel (or toolbar menu) for cell format: color and background pickers.

### 5.5 Visual Conventions

- **Grid Layout:** CSS-Grid `grid-template-columns: 2.5rem repeat(<n>, minmax(6rem, 1fr));` — row number column on the left, then N columns. Header row with column letters at the top.
- **Default Size:** 5 rows × 3 columns for an empty Sheet.
- **Sticky Header:** Column headers (`A`, `B`, `C`) and row number column are sticky when scrolling.
- **Active Cell:** Border highlight in primary, Shadow.
- **Cell with Formula:** Subtle indicator (e.g., left bar in primary `box-shadow: inset 2px 0 0 hsl(var(--p))`) so the user recognizes formula cells; the formula string appears during editing.
- **Read-only Render** in v1: Formulas are displayed as text (`=B2*1.5`), not as evaluated values.

---

## 6. Future (not v1)

### 6.1 Formula Evaluation in the Client (HyperFormula)

`HyperFormula` (MIT, ~150 KB) will be integrated as a lazy-loaded module. One HF engine instance is maintained per Sheet; with each cell edit, the editor loads the fresh cell value into HF, receives the computed value, and displays it in the cell. The formula appears during editing.

Supported Subset (Excel standard, both engines can do this):
- Arithmetic: `+`, `-`, `*`, `/`, `^`, `%`
- Cell Refs: `A1`, `B5`
- Range Refs: `A1:B5`, `A:A` (entire column), `1:1` (entire row)
- Functions: `SUM`, `AVERAGE`/`AVG`, `MIN`, `MAX`, `COUNT`, `IF`, `AND`, `OR`, `NOT`, `CONCAT`, `LEN`, `UPPER`, `LOWER`, `ROUND`, `INT`, `MOD`
- Constants: `TRUE`, `FALSE`

Not supported in v2: `VLOOKUP`/`INDEX`/`MATCH`, array formulas, external refs, custom functions.

### 6.2 Formula Evaluation on the Server (Apache POI)

REST route `POST /brain/{tenant}/sheet/eval` accepts a `SheetDocument` (or its ID), Apache POI's Formula-Evaluator calculates the subset from §6.1 (POI has a larger function pool, but the spec limits to the shared subset).

Use cases: Recipes or Tools that use a Sheet as a structured calculation template — the Java server can, for example, evaluate a Sheet that inserts user inputs into cells and reads out result cells.

### 6.3 Cell Range Selection

Click + Drag selects a rectangular area (`A1:C3`). Bulk format actions: Color, Background, Clear. Separate spec item — the selection model conflicts with single-cell edit UX.

### 6.4 Advanced Formatting

`bold`, `italic`, `align`, `font-size`, `border` per cell. This would significantly bloat the cell model — a separate spec step with a clear list.

### 6.5 More Columns

ZZ → 702 columns is sufficient for v1. If realistic use cases exceed this, the codec can be extended to `AAA` form (`AAA`-`ZZZ` = 18,278 columns max). Pure address parser extension.

### 6.6 Excel Import / Export

Apache POI on the Java side can read XLSX; a `POST /brain/{tenant}/sheet/import` accepts an XLSX file and converts it into a SheetDocument. Export analogously. Separate spec item with a detailed mapping list (which Excel features are included, which are dropped).

---

## 7. Open Points

- **Default Grid Size** for an empty Sheet: 5x3 vs. 10x5? Depends on the editor's aspect ratio. v1: 5x3, can be adjusted.
- **Cell Value Data Type:** v1 stores everything as a string. This makes JSON unwieldy (`"data": "10"` instead of `"data": 10`). Trade-off: with number storage, the codec would have to perform Number/String coercion on every edit, and formulas (`"=A1*2"`) are strings anyway — mixed types become ugly. v1 string-only is pragmatic; v2 with a real type system (see §6.4) can formally introduce data types.
- **Formula Quoting in YAML**: Codec automatically quotes when writing (`data: "=A1*2"`). When reading, the value is coerced to a string even if it was written without quotes (`data: =A1*2` would be parsed as a string by YAML, provided the `=` is not a reserved indicator token at that position).
- **Consistency of schema/rows with cells:** What happens if `schema: ['A', 'B']` is set, but `cells` contains an entry with `field: C5`? v1: The cell is preserved in the body (round-trip stable), but not displayed in the editor — the user only sees columns A and B. As soon as they add column C via "Add column", the cell appears. The codec warning is optional.
- **Performance with Large Sheets:** Custom HTML table is okay up to ~1000 cells. Above 1000, virtualization becomes necessary — then switching to `revogrid` or similar is required. Until then, v1 is sufficient.
