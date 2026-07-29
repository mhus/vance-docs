---
title: "Workbook — notes and pages"
parent: How-tos
nav_order: 3
permalink: /howtos/workbook/
---

# Workbook — notes and pages
{: .no_toc }

A workbook is a folder of pages in a block editor — the Notion-shaped surface for
notes, docs and handbooks. Each page is a **workpage** (blocks: headings, lists,
to-dos, callouts, columns, code, tables, embeds); sub-folders are **sections**.
It's a real folder of documents underneath, so agents can write pages too.
{: .fs-5 .fw-300 }

This tour uses the **`engineering`** workbook in the demo project `orbit-app`
(seed it with `wb smoke showcase`).

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## The workbook

Open the workbook and you get a two-pane app: a **page tree** on the left, the
active page in the editor on the right. Pages group under section headers; each
page shows its emoji icon, and the landing page carries a 📌. A search box filters
the tree by title or section.

<div class="shot-slot" markdown="1">
**📷 Shot 1 — the workbook**
_Open `orbit-app` → `engineering` workbook. Frame the sidebar page tree
(Index + the two pages, the 📌 on the landing page) next to the rendered
"Architecture Review" page. Establishing shot._
</div>

## Author with the slash menu

Editing is block-based. Put the cursor on an empty line and type **`/`** to open
the block menu — heading, list, to-do, callout, columns, code, table, divider,
image, embed. Pick one and it drops in; keep typing to filter.

<div class="shot-slot" markdown="1">
**📷 Shot 2 — the slash menu**
_On a fresh line in a page, type `/` so the block menu is open with its list of
block types visible. This is the "how you build a page" shot._
</div>

## Blocks that do more than text

Beyond prose, workpages carry structured blocks — callouts, side-by-side columns,
syntax-highlighted code, checkable to-dos, an auto table of contents, and
**embeds** that pull another Vance document inline. The architecture-review page
uses most of them.

<div class="shot-slot" markdown="1">
**📷 Shot 3 — the block inventory on a page**
_Frame a stretch of the Architecture Review page showing several block types at
once — the ADR callout, the two-column options, a code block, the to-do list.
(Full block reference: the workpage-blocks manual.)_
</div>

## A cover and an icon

Each page has a Notion-style header: a **cover image** (hover for Change / Remove)
and an **emoji icon** you pick from a picker, above the title and description.
It's what makes a workbook read like a handbook rather than a file list.

<div class="shot-slot" markdown="1">
**📷 Shot (optional) — page header**
_Add a cover + emoji to a page first (hover the header for the cover control; click
the icon button for the emoji picker), then frame the page header with both set.
Skip if you'd rather keep the demo plain._
</div>

## Organise pages

The tree is editable. The **⋯ menu** on a page does rename, move to another
section, duplicate, pin as landing, delete (to trash, recoverable). **Drag** a
page to reorder it — within a section, or across into another — and the order
persists. Rename a section inline and every page in it moves with it.

<div class="shot-slot" markdown="1">
**📷 Shot 4 — page management**
_Open the ⋯ menu on a page (rename / move / pin / delete visible), or capture a
drag-reorder mid-move with the blue insert indicator. One clear "you own the
structure" frame._
</div>

---

## Where to go next

- Every block type, with its JSON and Markdown form: the workpage-blocks
  reference (bundled manual `workpage-blocks`).
- What a workbook is on disk and how sections/landing work:
  [workbook app spec](/specs/app-workbook/).
- Editing a page alongside chat + execute: [Cortex tour](/howtos/cortex/).
