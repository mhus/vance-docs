---
title: "Turn research into a slideshow"
parent: How-tos
nav_order: 14
permalink: /howtos/uc-sports/
---

# Turn research into a slideshow
{: .no_toc }

Ask for a topic *and* the deck in one go: research it, pull a picture for each
point, and assemble a presentable slideshow. Vancetope does the whole chain —
web research, an image per item, and a real slides document you can open and
present — from a single request.
{: .fs-5 .fw-300 }

Here: the most important sporting events of 2000–2025. The agent shortlists
them, fetches a representative image for each from the web, and builds a
`slides` document, linked back into the chat.

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## From a question to a deck

One request — *"research the key sporting events 2000–2025, then build a
slideshow with an image and a short explanation for each."* The agent runs the
research, proposes a shortlist, and (after a quick confirm) assembles the deck.

<div class="vslides">
  <div class="vslides-head">Research → slideshow — 3 steps</div>
  <div class="vslides-stage">
    <figure class="vslide">
      <img src="{{ '/assets/img/howtos/uc-sports/research.png' | relative_url }}" alt="The agent's shortlist of eight sporting events after web research">
      <figcaption><span class="step">Step 1</span>The agent researches the web and returns a shortlist — eight iconic moments, each with its year — then builds the deck (you can watch <code>research_search</code> / <code>web_fetch</code> / <code>doc_write</code> run).</figcaption>
    </figure>
    <figure class="vslide">
      <img src="{{ '/assets/img/howtos/uc-sports/deck-title.png' | relative_url }}" alt="The finished slides document opened in Cortex, title slide">
      <figcaption><span class="step">Step 2</span>The result is a real <strong>slides document</strong>, linked in the chat. The ↗ opens it in Cortex — a proper deck with a page counter (1&nbsp;/&nbsp;9) and a <strong>Present</strong> mode.</figcaption>
    </figure>
    <figure class="vslide">
      <img src="{{ '/assets/img/howtos/uc-sports/deck-slide.png' | relative_url }}" alt="A content slide: Usain Bolt's world record, with a fetched image (blurred here) and an explanation">
      <figcaption><span class="step">Step 3</span>Each event is its own slide: a picture the agent fetched from the web plus a short written explanation. <em>(The photo is blurred here — the real deck carries the fetched image.)</em></figcaption>
    </figure>
  </div>
  <nav class="vslides-nav">
    <button data-prev aria-label="Previous step">‹</button>
    <span class="vslides-count"></span>
    <button data-next aria-label="Next step">›</button>
  </nav>
</div>

## What happened under the hood

- **Research, then assets.** The agent first searched the web for the events,
  then made a *separate* image lookup per item — a multi-step job it planned and
  ran itself.
- **A real deck, not a chat message.** The output is a `kind: slides` document
  in the project (`decks/…`), openable, editable and presentable — not a block
  that scrolls away.
- **Linked back.** When it's done, the agent hands you a card with an ↗ to open
  the deck directly in Cortex.

{: .note }
> Fetched images are whatever the web returns — mind the licensing before you
> reuse them. Ask the agent to swap in generated images (see
> [Images](/howtos/images/)) when you need a deck that's yours to publish.

## Where to go next

- Generate the pictures instead of fetching them: [Images](/howtos/images/).
- The research stack behind the lookups: [Zarniwoop spec](/specs/zarniwoop-service).
- What a slides document is: [slides kind](/specs/doc-kind-slides).
