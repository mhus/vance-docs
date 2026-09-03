---
title: "Vancetope — Document Kind `sheet`"
parent: Specs
permalink: /specs/doc-kind-sheet
---

<!-- AUTO-GENERATED from llm/specification/doc-kind-sheet.md (translated from the German specification/public/doc-kind-sheet.md) — do not edit here. -->

# Vancetope — Document Kind `sheet`

> Specifies the **`sheet` payload** for documents that carry a 2D table with A1 cell addresses — a table with named columns and numbered rows, sparse cell storage, and optional per-cell formatting. Excel-compatible addressing. Formula strings are round-trip stable; evaluation is server-side (Apache POI) via a `$computed` overlay. Markdown is intentionally **not** supported; only JSON and YAML.
> See also: [doc-kind-records](/specs/doc-kind-records) | [doc-kind-graph](/specs/doc-kind-graph) | [web-ui](/specs/web-ui)

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
- Optional per-cell formatting (`color`, `background`, `bold`, `italic`, `align`, `numberFormat`, `borders`).
- Format mapping for JSON and YAML.
- Web UI activation with an HTML grid editor.
- Formula string convention (Excel subset) + server-side evaluation into a `$computed` overlay (see §4, §6).

**What it does not define:**
- Markdown form (CSV-light would be unreadable for sparse cells; a raw editor is sufficient).
- Client-side formula engine (consciously rejected — evaluation is server-authoritative, see §4).
- Multiple worksheets per Document (one sheet per Document; multiple sheets = multiple Documents).

---

## 2. Data Model

### 2.1 Cell

| Field          | Type                           | Required | Meaning                                                              |
|----------------|--------------------------------|----------|----------------------------------------------------------------------|
| `field`        | `string` (A1 address)          | **yes**  | Excel standard: column letters + row number (`A1`, `B5`, `AB99`).    |
| `data`         | `string`                       | **yes**  | Cell content. Can be a value (`"10"`, `"hello"`) or a formula (`"=A1+B1"`). |
| `color`        | `string` (HTML hex)            | no       | Font color, format as in mindmap/graph (`#rrggbb`/`#rgb`).           |
| `background`   | `string` (HTML hex)            | no       | Cell background.                                                     |
| `bold`         | `boolean`                      | no       | Bold font (only `true` is written).                                  |
| `italic`       | `boolean`                      | no       | Italic font (only `true` is written).                                |
| `align`        | `string`                       | no       | Horizontal alignment: `left` \| `center` \| `right`.                 |
| `numberFormat` | `string`                       | no       | Excel number format code, e.g., `#,##0.00`, `0%`, `@` (text).        |
| `borders`      | `string`                       | no       | Cell border edges as a subset of `trbl` (top/right/bottom/left), e.g., `tb`. |

**A1 Address Rules:**
- Pattern: `^[A-Z]+[1-9][0-9]*$` (at least one letter, followed by a row number ≥ 1).
- Column range: `A` to `ZZ` (`A`-`Z`, then `AA`-`AZ`, ..., `ZZ`) — 702 columns max v1, sufficient.
- Row range: 1 to unbounded (limited by UI to a default, see §5.5).
- Addresses are read case-insensitive but written canonically in **uppercase** (`a1` → `A1`).
- Multiple occurrences of the same address: Codec throws `SheetCodecError("Duplicate cell: <addr>")`.

**Resilience during Reading:**
- Cells with invalid addresses (wrong pattern, empty string) are dropped with a Codec warning, **not** a throw.
- Cells with a missing `data` line are considered empty (`""`) — the cell is retained if it carries formatting.
- `data` is coerced to a string (Number/Boolean → `String(v)`, `null` → `""`).
- Unknown per-cell fields: stored in `cell.extra`, round-trip stable.

### 2.2 Top-Level

| Field       | Type                  | Required | Meaning                                                              |
|-------------|-----------------------|----------|----------------------------------------------------------------------|
| `kind`      | `string` = `"sheet"`  | yes      | For dispatcher recognition (in `$meta`).                             |
| `schema`    | `string[]`            | no       | Ordered list of visible columns (`['A','B','C']`). Missing → editor infers from existing cells + a buffer of one empty column. |
| `rows`      | `number`              | no       | Number of visible rows. Missing → editor infers from the highest referenced row + a buffer of one empty row. |
| `cells`     | `Cell[]`              | yes      | Sparse list of cells carrying content or formatting. Order has no semantic meaning, round-trip stable. |
| `$computed` | `object`              | no       | **Derived** overlay of server-evaluated formula results (`computedAt` + `values[]`). **Dropped** during parsing (never part of the input model) and written exclusively by `/sheet/calc` or `sheet_calc` — see §4.1. |

**Schema Rules:**
- Order is significant — determines column display left→right. Gaps (`['A', 'C']` without B) are allowed; the editor displays them as such.
- When writing, canonically sorted by column index? No — canonically as on disk (preserve user order). The editor offers a sort button that explicitly orders columns alphabetically.

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
- Top-level order: `$meta`, `schema?`, `rows?`, `cells`, then pass-through; a derived `$computed` overlay (only via `/sheet/calc`) is appended last.
- Cell key order: `field`, `data`, `color?`, `background?`, `bold?`, `italic?`, `align?`, `numberFormat?`, `borders?`, then pass-through.
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

Single-Document: Top-level mapping with `$meta: { kind: sheet }` as the first key, followed by `schema`, `rows`, `cells` on the same level. Block-style mapping per cell, schema canonically as a flow sequence.

**YAML Quoting Note:** Formula strings must be quoted, otherwise YAML interprets them as a map or a reserved token (`=A1` is okay, but `=YES` would otherwise be misinterpreted as a YAML boolean). The Codec automatically quotes when writing.

### 3.3 Markdown

**Intentionally not supported** — sparse cells in CSV-light would be unreadable, and a full Markdown pipe table round-trip with formatting is more code than value. Markdown bodies with `kind: sheet` fall back to the raw editor.

---

## 4. Server Path

For pure persistence, as with list/tree/records/graph: `HeaderStrategy` automatically mirrors `kind: sheet`, sparse cells and schema are transparent to storage (read through like all top-level keys). **For formula evaluation**, however, there is a dedicated server path.

### 4.1 Formula Evaluation (`$computed` Overlay)

Formulas are evaluated **server-side** with Apache POI, not in the client. The result is in a separate `$computed` overlay — the finance-style separation of source (`cell.data`) and calculated value. `cell.data` remains the single source of truth and is never overwritten; `$computed` is purely derived.

**`SheetEvalService`** (`vance-brain/.../sheet/`) is the core engine: it builds an in-memory `XSSFWorkbook` from the sparse cells, sets literals or `setCellFormula` (leading `=` truncated), evaluates, and returns a `SheetComputed`. Only formula cells (`data` starts with `=`) appear in the overlay; literals are read directly from `data` by the client. Each formula is evaluated in isolation — a broken formula degrades to an `error` value (`#DIV/0!`, `#ERROR!`, …) instead of throwing the entire recalculation.

`SheetComputed` model: `computedAt` (ISO timestamp) + `values[]` each with `field`, `value` (as string), `type` (`number`/`text`/`boolean`/`error`/`empty`), optional `error` (error message).

### 4.2 REST Routes (`/brain/{tenant}/sheet/...`)

`SheetController`:

| Route                             | Effect                                                               |
|-----------------------------------|----------------------------------------------------------------------|
| `POST /brain/{tenant}/sheet/calc` | Recomputes **and persists** the `$computed` overlay into the document (server-authoritative, `Action.WRITE`). |
| `GET /brain/{tenant}/sheet/snapshot` | Recomputes **without** persisting (for embed reads, `Action.READ`). |
| `GET /brain/{tenant}/sheet/export` | Exports as `xlsx` (default) or `csv`.                                |
| `POST /brain/{tenant}/sheet/import` | Imports an uploaded `xlsx`/`csv` file into the Sheet (`SheetXlsxService`). |

### 4.3 LLM/Agent Tools

Eight `kind-sheet` tools are available to the agent (`vance-brain/.../tools/kinds/`):

| Tool             | Purpose                                                              |
|------------------|----------------------------------------------------------------------|
| `sheet_set_cell` | Set cell (content + formatting); formula = data with leading `=`, stored verbatim. |
| `sheet_get_cell` | Read single cell; formula cells carry the server-calculated `computedValue`. |
| `sheet_get_range` | Read all filled cells of an A1 range (`A1:C3`); formula cells with `computedValue`. |
| `sheet_clear_cell` | Remove cell (data + format).                                         |
| `sheet_add_row`  | Append a row to the visible row count.                               |
| `sheet_add_column` | Append the next free column letter (A→…→Z→AA).                     |
| `sheet_find`     | Find cells whose content contains a substring (case-insensitive).    |
| `sheet_calc`     | **Recalculate all formulas (POI) and persist the computed values** — the agent counterpart to `POST /sheet/calc`. |

`sheet_get_cell`/`sheet_get_range` calculate the overlay transiently during reading (no persistence); only `sheet_calc` writes it back.

---

## 5. Web UI

### 5.1 Editor Activation

- **`kind === 'sheet'`** + format ∈ {json, yaml} → Tabs `Sheet` (Default) / `Raw`.
- **`kind === 'sheet'`** + Markdown → only `Raw` editor, no Sheet tab.
- Otherwise: only `Raw` editor.

### 5.2 Feature Set v1

| Feature                                  | v1 | Note                                                              |
|------------------------------------------|----|-------------------------------------------------------------------|
| Render Grid with column headers + row numbers | ✓ | HTML table, no external grid library                              |
| Cell edit (inline, click → input)        | ✓  | Same UX as Records editor                                         |
| Cell navigation by keyboard              | ✓  | Tab/Shift+Tab horizontally, Enter/Shift+Enter vertically          |
| Add row / add column                     | ✓  | Toolbar buttons; new column is next free letter                   |
| Delete row / delete column               | ✓  | Via right-click header or toolbar                                 |
| Cell color + background                  | ✓  | Side panel or toolbar on selection                                |
| Persist formula strings                  | ✓  | `=…` values are stored round-trip stable                          |
| **Formula evaluation**                   | ✓  | Server-side (Apache POI) via `/sheet/calc`; editor recalculates debounced and renders the `$computed` overlay — see §4 |
| Select cell ranges                       | ✓  | Rectangular selection (`selectionRect`) for bulk format           |
| Bold/Italic/Align/NumberFormat/Borders   | ✓  | Per-cell via toolbar/side panel + `sheet_set_cell`                |
| CSV/XLSX Import/Export                   | ✓  | `/sheet/export` + `/sheet/import` (`SheetXlsxService`)            |
| Multiple worksheets                      | ✗  | Not planned — one Document = one Sheet                            |

### 5.3 Keyboard Shortcuts

| Key                  | Action                                                              |
|----------------------|---------------------------------------------------------------------|
| `Enter`              | Commit cell, jump to the same column of the next row (or create row at end) |
| `Tab` / `Shift+Tab`  | Next / previous cell (left→right→next row, with wrap at end)        |
| `Esc`                | Cancel current edit                                                 |
| `Backspace` (empty)  | If the cell is empty, the codec drops it — no "delete row" effect   |

### 5.4 Components

- `<SheetView>` — Top-level container. Receives `:doc: SheetDocument`, emits `update:doc`.
  - Holds local, mutable copies of `cells`, `schema`, `rows`.
  - Calculates the displayed grid: `schema.length` columns × `rows` rows. Cells are resolved via a map lookup `cellsByAddress: Map<string, SheetCell>`.
  - Inline edit via `<input type="text">` per selected cell.
  - Add-Row appends a row to the end (`rows++`); Add-Column appends the next free letter (`A`, `B`, … `Z`, `AA`, `AB`, …).
  - Delete-Row deletes all cells in that row + decrements `rows`. Delete-Column likewise with column letter.
  - Side panel (or toolbar menu) for cell format: color and background pickers.

### 5.5 Visual Conventions

- **Grid Layout:** CSS Grid `grid-template-columns: 2.5rem repeat(<n>, minmax(6rem, 1fr));` — row number column on the left, then N columns. Header row with column letters at the top.
- **Default Size:** 5 rows × 3 columns for an empty sheet.
- **Sticky Header:** Column headers (`A`, `B`, `C`) and row number column are sticky when scrolling.
- **Active Cell:** Border highlight in primary, shadow.
- **Cell with Formula:** Subtle indicator (e.g., left line in primary `box-shadow: inset 2px 0 0 hsl(var(--p))`) so the user recognizes formula cells; the formula string appears during editing.
- **Formula Render:** Formula cells show the evaluated value from the `$computed` overlay; the formula string (`=B2*1.5`) appears during editing. Without a persisted overlay (e.g., embed without Doc-Identity → no `/sheet/calc`), the cell falls back to the last known computed value or the formula text.

---

## 6. Formula Evaluation — Model & Status

Evaluation runs **server-side** (Apache POI, `SheetEvalService`), not in the client — an earlier considered HyperFormula client approach was rejected in favor of the server-authoritative variant (one source of truth, no dual-engine drift). The wire path is in §4.

**No** artificial function subset is enforced — POI's Formula Evaluator covers the full Excel function pool (arithmetic `+ - * / ^ %`, cell/range refs `A1`, `A1:B5`, `A:A`, `1:1`, `SUM`/`AVERAGE`/`MIN`/`MAX`/`COUNT`/`IF`/`AND`/`OR`/`NOT`/`CONCAT`/`LEN`/`UPPER`/`LOWER`/`ROUND`/`INT`/`MOD` and far beyond). Array formulas, external refs, and custom functions remain unsupported — what POI cannot evaluate degrades to an `error` value.

**Use cases:** Recipes or tools that use a Sheet as a structured calculation template — the server sets user inputs in source cells, calls `sheet_calc`, and reads the result cells from the `$computed` overlay.

Also implemented (previously marked as future): **Cell range selection** with bulk format (§5.2), **extended per-cell formatting** (`bold`/`italic`/`align`/`numberFormat`/`borders`, §2.1), and **XLSX/CSV import/export** (§4.2).

### 6.1 Still Open: More Columns

ZZ → 702 columns is currently sufficient. If realistic use cases exceed this, the codec can be extended to `AAA` form (`AAA`-`ZZZ` = 18,278 columns max). This is purely an address parser extension.

---

## 7. Open Issues

- **Default grid size** for an empty sheet: 5x3 vs. 10x5? Depends on the editor's aspect ratio. v1: 5x3, can be adjusted.
- **Cell value data type:** v1 stores everything as a string. This makes JSON cumbersome (`"data": "10"` instead of `"data": 10`). Trade-off: with number storage, the codec would have to perform number/string coercion on every edit, and formulas (`"=A1*2"`) are strings anyway — mixed types become ugly. v1 string-only is pragmatic; v2 with a real type system (see §6.4) can formally introduce data types.
- **Formula quoting in YAML**: Codec automatically quotes when writing (`data: "=A1*2"`). When reading, the value is coerced to a string even if written without quotes (`data: =A1*2` would be parsed as a string by YAML, provided the `=` is not a reserved indicator token at that position).
- **Consistency of schema/rows with cells:** What happens if `schema: ['A', 'B']` is set, but `cells` contains an entry with `field: C5`? v1: The cell is retained in the body (round-trip stable) but not displayed in the editor — the user only sees columns A and B. As soon as they add column C via "Add column", the cell appears. The codec warning is optional.
- **Performance with large sheets:** Custom HTML table is okay up to ~1000 cells. Above 1000, virtualization becomes necessary — then a switch to `revogrid` or similar is due. Until then, v1 is sufficient.
