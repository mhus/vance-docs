---
title: "Images — generate and refine"
parent: How-tos
nav_order: 8
permalink: /howtos/images/
---

# Images — generate and refine
{: .no_toc }

Ask for a picture in plain language and Vance generates one, right in the chat.
No separate tool, no prompt syntax to learn — describe what you want, and refine
it by asking for changes. Every image is saved as a document in the project, so
you can open, download or reuse it later.
{: .fs-5 .fw-300 }

Behind the scenes this is **Fenchurch**, Vance's image service. You never pick a
model or endpoint — the agent calls it for you and streams progress while it
works.

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Ask for an image

Just say what you want. The agent recognises the intent, calls the image tool,
and the finished picture lands in the conversation with a title — here, a
painterly mountain lake at sunrise.

<div class="vslides">
  <div class="vslides-head">Generate &amp; refine — 2 steps</div>
  <div class="vslides-stage">
    <figure class="vslide">
      <img src="{{ '/assets/img/howtos/images/generate.png' | relative_url }}" alt="A generated image of a mountain lake at sunrise in the chat">
      <figcaption><span class="step">Step 1</span>Describe the picture. The image renders inline with a title; the live-progress panel shows the <code>image_generate</code> call — <em>"Generated in about 8 seconds with the fast model."</em></figcaption>
    </figure>
    <figure class="vslide">
      <img src="{{ '/assets/img/howtos/images/refine.png' | relative_url }}" alt="A refined version of the image, more vibrant with a rowboat added">
      <figcaption><span class="step">Step 2</span>Ask for changes in the same breath — <em>"more vibrant, add a small rowboat"</em> — and it generates an updated version. Iterate until it's right.</figcaption>
    </figure>
  </div>
  <nav class="vslides-nav">
    <button data-prev aria-label="Previous step">‹</button>
    <span class="vslides-count"></span>
    <button data-next aria-label="Next step">›</button>
  </nav>
</div>

## What you get back

Each image is a real **document** in the project, not a throwaway. The card in
the chat carries an **open** (↗) and a **download** (↓) affordance, and the file
lives under the project's `images/` folder — ready to drop into a workpage, a
canvas, or an export.

{: .note }
> **You don't choose a model.** The operator wires image generation once (a
> provider key plus the `default:image` / `default:image-high` aliases); from
> then on everyone just asks. Two quality tiers exist — a fast, cheap default and
> a higher-quality one for final assets — and the agent picks based on what you
> ask for.

## Where to go next

- The service behind it: [Fenchurch spec](/specs/fenchurch-service).
- Put a generated image on a spatial board: [Canvas](/howtos/canvas/).
- Build a page around it: [Workbook](/howtos/workbook/).
