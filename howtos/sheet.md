---
title: "Sheet — a spreadsheet with functions"
parent: How-tos
nav_order: 5
permalink: /howtos/sheet/
---

# Sheet — a spreadsheet with functions
{: .no_toc }

A sheet is a spreadsheet document — cells, formulas, formatting — with the twist
that it's just another Vance document. Formulas evaluate **server-side** (Apache
POI, the full Excel function pool), so an agent can drop inputs into cells, ask
for a recalc, and read the results the exact same way you do.
{: .fs-5 .fw-300 }

This tour uses the **`infra-cost`** sheet in the demo project `orbit-app`
(seed it with `wb smoke showcase`).

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## The grid

Open the sheet and you get a familiar grid — lettered columns, numbered rows,
inline cell editing. The `infra-cost` example totals a monthly infra bill:
component, units, €/unit, and a computed €/mo column, with a **Total / mo** and
**Total / yr** at the bottom.

<div class="shot-slot" markdown="1">
**📷 Shot 1 — the sheet**
_Open `orbit-app` → `sheets/infra-cost`. Frame the whole grid — the bold header
row, the tinted computed `€/mo` column, and the green Total rows (203 / mo,
2,436 / yr). Establishing shot._
</div>

## Formulas that compute

Cells hold values or formulas (`=B2*C2`, `=SUM(D2:D5)`, `=D7*12`). A formula cell
shows its *result* and carries a subtle left-edge marker; click into it and you
see the formula itself. Change an input — say the Brain-pod count — and the
totals recompute (server-side, then the grid updates).

<div class="shot-slot" markdown="1">
**📷 Shot 2 — a formula in a cell**
_Click a computed cell (e.g. the **Total / mo** cell) so the formula bar / cell
shows `=SUM(D2:D5)` while the grid still shows the result. Bonus: bump a `Units`
cell and catch the total changing._
</div>

## Format and raw

Formatting is per-cell — bold, alignment, number format (the `€#,##0` on the
money columns), text and background colour — from the toolbar on a selection. And
because a sheet is just a document, a **Raw** tab shows the JSON underneath;
CSV / XLSX import and export are there too.

<div class="shot-slot" markdown="1">
**📷 Shot (optional) — the Raw tab or a format action**
_Either flip to the **Raw** tab to show the JSON/formula source, or select a cell
and open the format controls (number format / colour). Skip if you'd rather keep
the tour to two shots._
</div>

## Filled and read by agents

The eight `sheet_*` tools make the grid programmable: `sheet_set_cell` to write a
value or formula, `sheet_calc` to recompute and persist the results,
`sheet_get_range` to read a block back with its computed values. That's the point
of server-side evaluation — a recipe can treat a sheet as a calculation template:
set the inputs, calc, read the answer.

---

## Where to go next

- The cell model, on-disk format and the full tool list:
  [sheet spec](/specs/doc-kind-sheet/).
- Running a sheet from a script or compose block: [Cortex tour](/howtos/cortex/).
