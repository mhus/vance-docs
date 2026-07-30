---
title: "Research a topic, end to end"
parent: How-tos
nav_order: 15
permalink: /howtos/uc-iron/
---

# Research a topic, end to end
{: .no_toc }

A single conversation that goes the whole distance: commission a deep-dive with
**Marvin**, reshape the result, illustrate it, drill into a follow-up, write it
all up as a document with images, and export a PDF. No leaving the chat, no
copy-pasting between tools — the research *and* its artifacts grow in one place.
{: .fs-5 .fw-300 }

The subject here is the element **iron**: from a broad properties report down to
the specific products that come out of different cooling processes — and out the
other side as a finished, illustrated PDF.

## The showcase, in one line

It's a **research workflow**: *ask → deep-research (Marvin) → restructure
(mindmap) → gather images → narrow to a sub-question → compile an illustrated
document → export a PDF.* Each step is just the next thing you'd naturally ask,
and Vancetope keeps the growing body of work — reports, mindmaps, documents, the
PDF — as real documents in the project.

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## The walk-through

<div class="vslides">
  <div class="vslides-head">Iron research — 10 steps</div>
  <div class="vslides-stage">
    <figure class="vslide">
      <img src="{{ '/assets/img/howtos/uc-iron/01-ask.png' | relative_url }}" alt="The research request and Marvin being launched">
      <figcaption><span class="step">1 · Ask</span>The request: an extensive study of iron, run on <strong>Marvin</strong> (deep-think). Arthur launches a Marvin worker — you can see the <code>marvin-call</code> line and the deep-think process spinning up in the progress panel.</figcaption>
    </figure>
    <figure class="vslide">
      <img src="{{ '/assets/img/howtos/uc-iron/02-report.png' | relative_url }}" alt="The comprehensive iron report">
      <figcaption><span class="step">2 · The report</span>Marvin plans the study, spawns web-research workers, and synthesises a comprehensive report — atomic properties, isotopes, occurrence, biology, industrial use — with its sources listed.</figcaption>
    </figure>
    <figure class="vslide">
      <img src="{{ '/assets/img/howtos/uc-iron/03-mindmap.png' | relative_url }}" alt="The report restructured as a radial mindmap">
      <figcaption><span class="step">3 · As a mindmap</span>"Present the result as a mindmap." The same content, restructured into a radial <strong>mindmap</strong> document — one branch per theme, rendered inline.</figcaption>
    </figure>
    <figure class="vslide">
      <img src="{{ '/assets/img/howtos/uc-iron/04-ore-images.png' | relative_url }}" alt="Web image results for iron ore">
      <figcaption><span class="step">4 · Images</span>"Show me images of iron ore." A live image search returns real photographs — hematite and magnetite specimens — straight into the chat.</figcaption>
    </figure>
    <figure class="vslide">
      <img src="{{ '/assets/img/howtos/uc-iron/05-cooling.png' | relative_url }}" alt="A mindmap of iron products by cooling rate">
      <figcaption><span class="step">5 · Drill in</span>A narrower question — which products come from different cooling rates — and the agent maps quench → martensite → cutting tools, normalizing → structural steel, bainite → rails, annealing → wire, each backed by a saved technical write-up.</figcaption>
    </figure>
    <figure class="vslide">
      <img src="{{ '/assets/img/howtos/uc-iron/06-doc-inline.png' | relative_url }}" alt="The compiled product document with a summary table">
      <figcaption><span class="step">6 · Write it up</span>"Write a summary document — a description and an image for each product." The agent searches an image per product and compiles an illustrated document, complete with a summary table (cooling regime → microstructure → hardness → products).</figcaption>
    </figure>
    <figure class="vslide">
      <img src="{{ '/assets/img/howtos/uc-iron/07-doc-open.png' | relative_url }}" alt="The compiled document opened in Cortex">
      <figcaption><span class="step">7 · The document</span>The link opens the document in Cortex — <em>"Iron &amp; Steel Products by Cooling Rate: A Visual Guide,"</em> each product with its description, metallurgy, and a fetched photo.</figcaption>
    </figure>
    <figure class="vslide">
      <img src="{{ '/assets/img/howtos/uc-iron/08-doc-and-chat.png' | relative_url }}" alt="The document and the chat that produced it, side by side in Cortex">
      <figcaption><span class="step">8 · One surface</span>Document in the middle, the conversation that produced it on the right — the whole research lives on one Cortex screen, still editable and still connected to the agent.</figcaption>
    </figure>
    <figure class="vslide">
      <img src="{{ '/assets/img/howtos/uc-iron/09-pdf-made.png' | relative_url }}" alt="The agent turning the document into a PDF">
      <figcaption><span class="step">9 · Export</span>"Create a PDF from this document." The agent typesets it — 5.7&nbsp;MB, all images and the summary table included — and hands back a PDF card.</figcaption>
    </figure>
    <figure class="vslide">
      <img src="{{ '/assets/img/howtos/uc-iron/10-pdf-open.png' | relative_url }}" alt="The generated PDF rendered in Cortex">
      <figcaption><span class="step">10 · The PDF</span>Open it and the finished 7-page PDF renders in Cortex — a shareable artifact produced entirely from the conversation.</figcaption>
    </figure>
  </div>
  <nav class="vslides-nav">
    <button data-prev aria-label="Previous step">‹</button>
    <span class="vslides-count"></span>
    <button data-next aria-label="Next step">›</button>
  </nav>
</div>

## What this shows

- **One conversation, many artifacts.** A report, a mindmap, image lookups, a
  second technical document, an illustrated summary, and a PDF — all from a
  single thread, each saved as a real document in the project.
- **Deep research when it's worth it.** Marvin plans and parallelises the
  heavy lookup; the lighter follow-ups run inline. You don't choose the
  machinery — you just ask.
- **From chat to shareable.** The final step turns the living document into a
  fixed, illustrated PDF you can send on.

{: .note }
> Fetched images are whatever the web returns — mind the licensing before you
> reuse them. Swap in generated images (see [Images](/howtos/images/)) when the
> output needs to be yours to publish.

## Where to go next

- The deep-think engine that drove the study: [Marvin spec](/specs/marvin-engine).
- The research stack behind the lookups: [Zarniwoop spec](/specs/zarniwoop-service).
- Another end-to-end story: [Size up a stock](/howtos/uc-stock/).
