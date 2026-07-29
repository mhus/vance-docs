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
  Help panel (changes per document kind) on the other. It collapses out of the
  way — the `⟩` handle on the edge brings it back.

![Cortex — architecture-review workpage open in orbit-app]({{ '/assets/img/howtos/cortex/layout.png' | relative_url }}){: .doc-shot }

Here the `architecture-review` workpage is open in the middle, rendered as a
block editor — the ADR callout, the side-by-side options, the decision box.
The toolbar carries a **View / Edit** toggle, a `Properties` deep-link, and a
`[kind-registry:workpage]` pill telling you which editor bound to this kind. The
chat panel is collapsed in this shot; we open it next.

## Talk about what's open

Open the **Chat** panel on the right (the `⟨` handle, or the chat icon in the
top bar) and you have an agent session sitting next to the document. It isn't a
generic assistant — it works against *this* file: ask it to explain a section,
tighten the wording, or add what's missing.

![Cortex — document with the chat panel open]({{ '/assets/img/howtos/cortex/chat.png' | relative_url }}){: .doc-shot }

Document on the left, conversation on the right, one session. The chat panel
carries its own tab bar (`Chat` / `Help`) and a session picker, so you can
switch conversations without leaving the document.

## View or edit the source

The **View / Edit** toggle in the toolbar flips between the rendered block editor
and the raw source. Everything is a document, so "edit" just means the plain
markdown underneath — frontmatter (`$meta`), the `vance-callout` and
`vance-columns` fences, the lot. Edit it here, or let the agent edit it; same file.

![Cortex — the workpage in Edit (raw markdown) view]({{ '/assets/img/howtos/cortex/edit.png' | relative_url }}){: .doc-shot }

That's the point of one surface: read it rendered, drop into the source when you
need to, and keep the conversation open the whole time.

As you edit, the tab shows a **dirty indicator** — the `●` next to the file name
— marking unsaved changes. Edits stream over the documents channel, so when the
agent (or another person) writes to the same file, it updates live, with
presence and a 3-way merge; you can be typing in it at the same moment.

![Cortex — editing the source, unsaved-changes dot on the tab]({{ '/assets/img/howtos/cortex/editing.png' | relative_url }}){: .doc-shot }

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
