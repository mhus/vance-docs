---
title: "Vancetope — Document Kind `scribble`"
parent: Specs
permalink: /specs/doc-kind-scribble
---

<!-- AUTO-GENERATED from llm/specification/doc-kind-scribble.md (translated from the German specification/public/doc-kind-scribble.md) — do not edit here. -->

# Vancetope — Document Kind `scribble`

> **Handwriting surface**: a fixed-size sheet (default A4 @150 dpi) with
> vector strokes, written with a pen or finger — the answer to
> "I want to take notes by hand, but have them searchable/agent-readable later."
> See also: [app-scribblebook](/specs/app-scribblebook) (container app),
> [doc-kind-workpage](/specs/doc-kind-workpage) (distinction: typed text),
> [doc-kind-canvas](/specs/doc-kind-canvas) (distinction: spatial arrangement,
> **no** freehand). Implementation track:
> `planning/scribble.md`.

---

## 1. Purpose

A `kind: scribble` is **one sheet = one document**: a fixed
coordinate grid (`size`, default 1240×1754 = A4-Portrait @150 dpi) with an
ordered list of **Strokes**. The ink is **User-Input** — the kind is
both an authoring surface and a read object, but the strokes themselves are
deliberately **not LLM output** (there are no stroke tools; the agent renders via
`scribble_sheet_image` for vision models, see §6).

Distinction: For typed rich text → `kind: workpage`; for spatial
arrangement with edges → `kind: canvas`; for transcribed notes with
handwriting **next to them** → one Scribblebook per notepad
([app-scribblebook](/specs/app-scribblebook)).

Strokes instead of pixel image: sharp zoom, cheap autosave (entire sheets 50–300 KB),
Undo as array ops, renderable for OCR/vision. The sheet is vector from
input to disk.

The kind lives in the `vance-addon-brain-scribble` addon; all server logic resides on
`DocumentService` (data sovereignty), mutations are typed via `ScribbleCodec`.

---

## 2. Data Model

### 2.1 Top-Level

| Field | Type | Required | Meaning |
|---|---|---|---|
| `title` | `string` | no | Display title. |
| `size` | `{w, h}` | no | Sheet grid in Sheet-Units; default A4 @150 dpi (1240×1754). Fixed per sheet, never viewport. |
| `strokes` | `list` | yes (can be empty) | Ordered stroke list (§2.2). |

Discovery via `$meta.kind: scribble`. No dedicated collection —
`ScribbleService` resides on `DocumentService`.

### 2.2 Stroke Grammar

| Field | Type | Meaning |
|---|---|---|
| `tool` | `string` | v1: `pen`. Extensible (highlighter etc.) — new values are not a format break, old renderers skip unknown tools. |
| `color` | `string` | Palette index `"1"`–`"4"` (Black/Red/Blue/Green). Index space open as with Canvas; unknown indices render black. |
| `width` | `string` | `s`/`m`/`l` — 2.5 / 5 / 11 Sheet-Units. No slider, intentionally. |
| `points` | `[[x, y, pressure], …]` | Sheet integer coordinates + pressure `[0,1]`. Already simplified (RDP, ε≈0.7) and rounded — the 240 Hz pointer stream is never persisted. |

Strokes carry **no IDs** — they are an ordered array; erase and undo
are client-side array operations. A stroke with ≥1 usable point
exists; empty point lists are dropped on the next save (validator reports
this by index).

### 2.3 On-Disk Format

Recommended extension `*.scribble.yaml` (or `*.scribble.json`);
`$meta.kind: scribble` is mandatory. **YAML canonical, JSON 1:1-dual** via a
common `ScribbleCodec`. One stroke = **one line** (flow-style via
marker interfaces + custom representer), otherwise the file explodes:

```yaml
$meta:
  kind: scribble
title: "Notes 12.09."
size: { w: 1240, h: 1754 }
strokes:
  - { tool: pen, color: "1", width: m, points: [[12, 34, 0.5], [48, 51, 0.6]] }
  - { tool: pen, color: "2", width: s, points: [[90, 12, 0.4]] }
```

Parsing is **lenient**: unknown fields, float coordinates, missing
optionals — all tolerated and normalized; only unstructured YAML
fails hard.

---

## 3. Web-UI — The Editor

Editor `@vance-addon/scribble`, **two canvas layers**: `base` (committed ink,
crisp re-rendered) and `live` (stroke in progress) — on pan/pinch, a
bitmap snapshot is blitted instead of redrawing a thousand strokes. Outlines via
`perfect-freehand` (pressure-aware variable width — handwriting feels
right).

Input (Pointer Events, **coalesced samples** — the pen rate, not the
display rate):

- **Pen and mouse always draw.**
- **Finger navigates** (pan, 2-finger pinch-zoom 25 %–800 %): the iPad rule.
  A finger landing during a pen stroke is **palm** and is
  ignored (palm rejection).
- **"Draw with finger" toggle** in the toolbar: for an empty pen —
  a dead battery should not render the sheet unusable. UI state, not in the Doc.
- **Eraser**: entire stroke by hit-test (tap or swipe over).
- **Undo/Redo** op-based (`add`/`remove` with original position), ⌘Z/⌘⇧Z.
- Wheel without modifier = Pan, Ctrl/Cmd+Wheel = Zoom (trackpad pinch),
  mouse middle button = Pan, ⤢ = "Fit to page".

The surface container is a single `pointerdown` gate: pointers not starting on
a canvas or the bare surface are ignored — the toolbar
is a child of the surface, its click must neither start ink nor be
stolen by the container (via `setPointerCapture`). The sheet watch is
placed **after** the canvas ref declarations — its `immediate` run in `setup()`
would otherwise run into the Temporal Dead Zone.

**Saving:** debounced (2 s) as **whole sheet** (PUT), plus flush on
`visibilitychange`/`pagehide` — app in background = saved. No
append API in v1; a sheet is small enough for whole-doc saves.

**Standalone view is editable** (Workpage paradigm, deviation from
Canvas): a Scribble sheet opened directly is the authoring surface,
not a read-only view.

**Printing (Cmd+P):** the screen canvases carry the zoomed viewport grid
and are `no-print`; an invisible `print-only` canvas is rendered on
`beforeprint` with the **entire sheet 1:1** (CSS scales to
page width, the intrinsic 1240×1754 buffer maintains the A4 format — one
sheet, one page). Toolbar, hint, save state, and app header are `no-print`
(host contract `style/print.css`: `data-print-root` / `no-print` / `print-only`).

---

## 4. REST

All routes under `/brain/{tenant}/addon/scribble`:

| Route | Purpose |
|---|---|
| `POST /sheet` | Create sheet (path, title, size). |
| `GET /sheet?projectId&path` | Read sheet (Id, path, title, Sheet-DTO). |
| `PUT /sheet?projectId&path` | Save entire sheet. |

DTOs (`@GenerateTypeScript`) are in `vance-api` generation; `points`
becomes `number[][]`.

---

## 5. LLM Tools

| Tool | Purpose |
|---|---|
| `scribble_create(path, title?)` | New empty sheet — opens directly editable. |
| `scribble_validate(path)` | Read-only structural check (§7). |
| `scribble_sheet_image(path, dpi?, region?)` | Sheet → PNG → as attachment in the next turn (§6). |
| `scribble_ocr(path)` | Transcription → `<name>.scribble.md` (overwriting). |
| `scribble_sheet_pdf(path)` / `scribble_book_pdf(folder)` | PDF export sheet/book (only activated sheets). |
| `scribble_shape_add(path, shape, x, y, x2, y2?, color?, width?)` | **Diagram ink**: a geometric shape (`rectangle`, `triangle`, `ellipse`, `circle`, `line`, `arrow`) as strokes — a house is `triangle` roof on `rectangle`. |
| `scribble_stroke_add(path, points, color?, width?)` | A generic polyline `[[x,y],…]` — for diagram ink not covered by a shape. |
| `scribble_stroke_delete(path, index)` | Remove a stroke — the agent cleans up its own shapes. |

Handwriting remains **User-Input** — the agent should never "simulate"
handwriting. Diagram ink, however, is agent work:
`scribble_shape_add`/`scribble_stroke_add` set geometric strokes in
sheet coordinates (A4 @150 dpi: 1240×1754, origin top left, y grows downwards);
each point must be on the grid, otherwise the entire call fails
instead of producing invisible ink. All mutations run through
`ScribbleService.writeSheet` — one writer, one codec; the live watch immediately
shows the shape in the open editor. Manual: `manual_read('scribble')`.

---

## 6. `scribble_sheet_image` — Agent Sees the Sheet

`ScribbleRenderer` (Java2D) rasterizes the sheet server-side: white background,
ink according to palette, segment widths along the perfect-freehand thinning curve,
anti-aliasing. Fidelity bar **"readable"**, not pixel-identical to the browser.
Native resolution = sheet coordinates (150 dpi, no resampling); `dpi` scales
(capped at 600), `region {x,y,w,h}` crops (clamped to sheet).

The tool loads via `ScribbleService.readSheet`, renders, and returns an
MCP-style image block (`{type: "image", data: <base64>,
mimeType: "image/png"}`). The **existing Brain pipeline** handles the rest:
`ToolImageHarvester` → image doc in `_chatbox` folder + result truncation →
`ToolAttachmentSink` → Engine presents the image to the model as a real
`ImageContent` block on the next LLM call (VISION-checked).

**Friendly Vision Pre-Check:** the tool resolves the model of the calling
procedure (the same `ChatBehaviorBuilder`+`ModelCatalog` chain as the Engine)
and responds with a clear justification, **before** rendering, if the model does not
have `VISION` capability — otherwise, the result truncation would promise "you will see
the image" and the Engine compose path would silently swallow it. Fail-open on any
resolution issue; the Composer remains the authoritative gate. Empty sheets
respond with a hint instead of an image.

The same renderer is the basis for the later OCR track (separate planning).

---

## 7. `scribble_validate`

Read-only structural check, so an agent (and the host via `kind_validate`)
can validate a sheet: parse errors, strokes that would be dropped on the next save
(by index), ink outside the sheet grid (8 px tolerance as
warning). Returns `{ ok, errorCount, warningCount, findings[] }`.

---

## 8. Anti-Patterns / v1-Scope

- **Pixel image as Source of Truth.** Rejected — zoom-sharp, Undo, and OCR
  require vectors.
- **Simulated handwriting via tool.** Rejected as a prohibition, revised 2026-09-18:
  Handwriting remains user input, but **geometric diagram ink** is
  agent work (`scribble_shape_add`/`scribble_stroke_add`/`scribble_stroke_delete`).
  What remains prohibited: strokes intended to *pass* as handwriting
  (fake cursive) — shapes and diagram lines yes, cursive no.
- **Append API.** Out of scope v1: Whole-Doc-Save is sufficient (50–300 KB/sheet).
- **Read-Only-Standalone.** Rejected (unlike Canvas): a sheet is directly
  editable like a Workpage.
- **Live-OCR during writing.** Out of scope — OCR is a separate, later
  track and writes `<name>.scribble.md` next to the sheet.
- **Not in v1:** Highlighter/Text tool, multi-user CRDT on strokes,
  changing sheet size after creation, sheet PDF export
  (`scribble_book_pdf` is a noted follow-up track).
