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

![Canvas — the Sync system board]({{ '/assets/img/howtos/canvas/board.png' | relative_url }}){: .doc-shot }

## Nodes, edges, groups

Three things make a canvas. **Nodes** — sticky text, links, or documents.
**Edges** — directed arrows with heads, connectable on all four sides. **Groups**
— frames that hold nodes; move the frame and everything inside moves with it.
It's explicit parenting, so an agent reading the canvas knows what belongs to
what.

![Canvas — the Brain group selected, its nodes inside]({{ '/assets/img/howtos/canvas/grouping.png' | relative_url }}){: .doc-shot }

## Live documents on the board

The strongest node type is **doc**: it embeds an actual document, rendered by its
kind — not a screenshot, not a link. The "Sync system" board pins the
architecture-review **workpage** right onto the plane, rendered live, with a `↗`
that jumps you into its Cortex tab.

![Canvas — the architecture-review workpage embedded as a doc node]({{ '/assets/img/howtos/canvas/doc-node.png' | relative_url }}){: .doc-shot }

## Make it yours

Editing is direct. Select a node and a **toolbar** floats up — colour, font,
bold/italic, text colour, bring-to-front / send-to-back, delete. Drag the
**resize** handles, edit text inline, pull a **connector** from any of the four
sides to wire up a new edge. You can even **drag a file** onto the plane and it
uploads and drops in as a doc node.

![Canvas — a node selected with its toolbar and resize handles]({{ '/assets/img/howtos/canvas/toolbar.png' | relative_url }}){: .doc-shot }

![Canvas — a live cursor from another viewer on the plane]({{ '/assets/img/howtos/canvas/cursor.png' | relative_url }}){: .doc-shot }

---

## Where to go next

- Built by an agent? The `canvas_*` tools (create, add nodes/edges, query) let a
  worker assemble or read a board — see [How-tos](/howtos/).
- What a canvas is on disk and how it renders: [canvas spec](/specs/doc-kind-canvas/)
  and the [canvasbook app spec](/specs/app-canvasbook/).
- The unified workspace this opens into: [Cortex tour](/howtos/cortex/).
