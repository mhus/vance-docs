---
title: "Canvas — think spatially"
parent: How-tos
nav_order: 2
permalink: /howtos/canvas/
---

# Canvas — think spatially
{: .no_toc }

A canvas is an open 2D plane — text notes, links, and **live documents** as
nodes, connected by arrows and organised into groups. It isn't a diagram tool
bolted on the side: the nodes are real Vance documents, it's collaborative
(live cursors), and agents can build and query it with tools, same as any other
document.
{: .fs-5 .fw-300 }

This tour uses the **`design`** canvasbook in the demo project `orbit-app`
(seed it with `wb smoke showcase`).

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Getting there

Canvases live in a **canvasbook** app — that's the editing surface (a standalone
canvas opens read-only). Open the `design` canvasbook from Documents (or the
app view) and its board fills the screen: one menu button up top switches
between boards, and it auto-saves as you work.

<div class="shot-slot" markdown="1">
**📷 Shot 1 — the board**
_Open `orbit-app` → `design` canvasbook on the "Sync system" board. Frame the
whole plane: the two group frames, the nodes and the arrows between them. This is
the establishing shot._
</div>

## Nodes, edges, groups

Three things make a canvas. **Nodes** — sticky text, links, or documents.
**Edges** — directed arrows with heads, connectable on all four sides. **Groups**
— frames that hold nodes; move the frame and everything inside moves with it.
It's explicit parenting, so an agent reading the canvas knows what belongs to
what.

<div class="shot-slot" markdown="1">
**📷 Shot 2 — grouping**
_Drag the "Brain (pod)" group frame a little (or just select it). Capture it
mid-move or selected, so it's clear the contained nodes belong to the group and
travel with it._
</div>

## Live documents on the board

The strongest node type is **doc**: it embeds an actual document, rendered by its
kind — not a screenshot, not a link. The "Sync system" board pins the
architecture-review **workpage** right onto the plane, rendered live, with a `↗`
that jumps you into its Cortex tab.

<div class="shot-slot" markdown="1">
**📷 Shot 3 — a document embedded as a node**
_Frame the `doc` node showing the architecture-review workpage rendered inside
the canvas (the ADR callout / headings visible), ideally with its `↗` open-in-
Cortex control in shot. This is the "nodes are real documents" point._
</div>

## Make it yours

Editing is direct. Select a node and a **toolbar** floats up — colour, font,
bold/italic, text colour, bring-to-front / send-to-back, delete. Drag the
**resize** handles, edit text inline, pull a **connector** from any of the four
sides to wire up a new edge. You can even **drag a file** onto the plane and it
uploads and drops in as a doc node.

<div class="shot-slot" markdown="1">
**📷 Shot 4 — the node toolbar + resize**
_Select a text node so its floating toolbar shows (colour / font / z-order /
delete) and the resize handles are visible on the node. One clear "you're editing
this" frame._
</div>

<div class="shot-slot" markdown="1">
**📷 Shot (optional) — together, live**
_If you can open the same board as a second user (or in a second browser),
capture the other person's live cursor on the plane. Awareness rides the pointers
channel; nice-to-have, skip if fiddly._
</div>

---

## Where to go next

- Built by an agent? The `canvas_*` tools (create, add nodes/edges, query) let a
  worker assemble or read a board — see [How-tos](/howtos/).
- What a canvas is on disk and how it renders: [canvas spec](/specs/doc-kind-canvas/)
  and the [canvasbook app spec](/specs/app-canvasbook/).
- The unified workspace this opens into: [Cortex tour](/howtos/cortex/).
