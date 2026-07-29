---
title: "Cortex — chat, document, execute"
parent: How-tos
nav_order: 1
permalink: /howtos/cortex/
---

# Cortex — chat, document, execute
{: .no_toc }

Cortex is the surface where the three things you do with Vance happen in one
place: **talk to an agent**, **work on a document**, and **run it**. No jumping
between a chat window, an editor and a terminal — they share one screen, one
session, and the same live document underneath.
{: .fs-5 .fw-300 }

This tour uses the demo project **`orbit-app`** from the showcase. If you seeded
it (`wb smoke showcase`), you can follow along on your own instance.

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Getting there

Cortex opens on a document, so you start in **Documents** — the project's file
browser. Pick the project (`orbit-app`) in the left rail and you see its
top-level folders.

![Documents — orbit-app project root]({{ '/assets/img/howtos/cortex/documents-root.png' | relative_url }}){: .doc-shot }

Drill into a folder to find the file you want to work on. Here, `engineering/`
holds the workbook — its app manifest, an index, and the workpages themselves.
Click a document and it opens in Cortex.

![Documents — inside the engineering folder]({{ '/assets/img/howtos/cortex/documents-folder.png' | relative_url }}){: .doc-shot }

## The three zones

Every Cortex screen has the same shape:

- **Left — file tree.** Every document in the project, the way Finder shows
  folders. Click one to open it in a tab.
- **Middle — the document.** Tabs across the top, the active document below.
  One shell renders *every* kind — a workpage, a canvas, a spreadsheet, a script
  — each with the right editor.
- **Right — Chat / Help.** The agent session on one tab; a context-sensitive
  Help panel (changes per document kind) on the other.

<div class="shot-slot" markdown="1">
**📷 Shot 1 — the layout**
_Open Cortex on `orbit-app` with `engineering/architecture-review` in the middle
tab. Frame all three zones: file tree left, the workpage centre, the Chat panel
right. This is the establishing shot._
</div>

## Talk about what's open

The chat panel isn't a generic assistant — it knows the document in front of
you. Ask it to explain a section, tighten the wording, or add the thing you're
missing, and it works against *this* file.

<div class="shot-slot" markdown="1">
**📷 Shot 2 — chat + document together**
_In the Chat panel, ask something grounded in the open doc — e.g. "Summarise the
decision in ADR-014 and list the open follow-ups." Capture the agent's reply next
to the visible document, so the "same surface" point reads at a glance._
</div>

## Watch it edit

When the agent writes to the document, you don't reload — the editor updates
live over the documents channel, with a presence badge showing who (or what) is
editing. You can type in the same file at the same time; edits merge.

<div class="shot-slot" markdown="1">
**📷 Shot 3 — a live edit**
_Ask the agent to make a concrete change ("add a follow-up: 'load-test the merge
path'"). Capture the moment the new content appears in the workpage with the
`⏺ agent` awareness badge visible. If the badge fades too fast, grab it mid-write._
</div>

## Every kind, one shell

Switch tabs and the middle pane re-skins itself to the document's kind — a
workpage renders as a block editor, a canvas as a node graph, a spreadsheet as
a grid. Same tabs, same chat, kind-aware editor.

<div class="shot-slot" markdown="1">
**📷 Shot 4 — a different kind in the same shell** _(optional but strong)_
_Open a second tab on `diagrams/system` (the canvas) alongside the workpage tab.
Capture the tab bar with both docs open and the canvas rendered in the middle —
it shows one surface handling very different content._
</div>

## Run it

Some documents are executable — a JavaScript or Python script, a compose block.
Cortex gives them a **Run** button (plus **Validate**, and **Generate/Update**
for scripts) and shows the output inline. This is the "execute" third of the
surface: author, run, read the result without leaving the page.

<div class="shot-slot" markdown="1">
**📷 Shot 5 — execute + output**
_Open a script document (e.g. `meridian-ops` → `scripts/mail-triage.js`, or any
`.js` in the project), switch the shell to its Run view, and capture the code
with its output/console panel populated after a run._
</div>

---

## Where to go next

- The other surfaces have their own tours — see [How-tos](/howtos/).
- What Cortex is and how it dispatches document kinds internally:
  [Cortex spec](/specs/cortex/).
- Haven't got a running instance yet? [Get started](/getting-started).
