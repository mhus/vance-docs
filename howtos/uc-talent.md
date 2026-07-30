---
title: "Stress-test an idea with a panel of judges"
parent: How-tos
nav_order: 12
permalink: /howtos/uc-talent/
---

# Stress-test an idea with a panel of judges
{: .no_toc }

One agent gives you one opinion. A hard call — a pitch, a product, a campaign —
wants several, from people who disagree. Vancetope lets you stand up a **council**:
a named panel of distinct personas that argue a question out and hand back one
synthesised verdict. Define it once; consult it for the rest of the project.
{: .fs-5 .fw-300 }

Here we build a *Got-Talent*-style jury — a ruthless market perfectionist, a
pop-culture trendsetter, an unconventional fan-favourite, and an empath — and
throw a real pitch at it. It runs on Vancetope's **Zaphod** engine (a multi-head
council); you never touch that name — a wizard writes it for you.

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Build the panel once

In a chat, open the **Wizards** panel and pick **Create a council**. Give it a
name, a purpose, and the members — each with a personality, a focus, and a
catchphrase. Add an optional **test question** and it runs the panel the moment
it's built.

<div class="vslides">
  <div class="vslides-head">Create a council — 2 steps</div>
  <div class="vslides-stage">
    <figure class="vslide">
      <img src="{{ '/assets/img/howtos/uc-talent/wizard.png' | relative_url }}" alt="The Create a council wizard, filled in with a name, purpose and members">
      <figcaption><span class="step">Step 1</span>Fill the form: a name (<code>talent</code>), the panel's purpose, and each member's persona. A test question at the bottom makes it run right away.</figcaption>
    </figure>
    <figure class="vslide">
      <img src="{{ '/assets/img/howtos/uc-talent/prompt.png' | relative_url }}" alt="The wizard's generated prompt sitting in the chat composer">
      <figcaption><span class="step">Step 2</span>Hit <strong>Generate prompt</strong> and the wizard writes the instruction into the chat for you — <em>"create a council… save it under 'talent'… run it once with this test question."</em> Send it.</figcaption>
    </figure>
  </div>
  <nav class="vslides-nav">
    <button data-prev aria-label="Previous step">‹</button>
    <span class="vslides-count"></span>
    <button data-next aria-label="Next step">›</button>
  </nav>
</div>

Behind the scenes the agent hands this to **Slart**, which writes a reusable
council recipe and saves it under the name you chose. That's a one-time setup —
from now on the panel is a thing you can call by name.

## The verdict

The panel deliberates — each member answers in their own voice — and the council
hands back **one synthesised verdict**, not four separate essays. Here it judges
a pitch: *a TikTok channel where an artist paints hyper-realistic celebrity
portraits while pulling goofy faces to trending audio.*

![The council's synthesised verdict, with each judge's distinct take]({{ '/assets/img/howtos/uc-talent/verdict.png' | relative_url }}){: .doc-shot }

A **YES-IF**, with the disagreement intact: the Head Judge scores it 4/10
("gimmick-first, market-second"), the Trendsetter calls it "algorithmic catnip",
the Fan Favourite loves it (9/10), the Empath finds the human hook — and the
synthesis turns that spread into one clear recommendation. The friction is the
point; a single agent would have smoothed it away.

## Consult it again, anytime

The panel doesn't vanish with the answer. In the **same chat**, just ask it
another question — *"Ask talent the following question: …"* — and the whole
council runs again on the new problem. Define the board of advisors once, bring
every subsequent decision to it.

## Keep the outcome as a document

A verdict in a chat scrolls away. Ask the agent to **write it up** — *"Write a
conclusion of the answer into a document for me"* — and it saves a structured
document and hands back a link you can click.

<div class="vslides">
  <div class="vslides-head">From chat to document — 2 steps</div>
  <div class="vslides-stage">
    <figure class="vslide">
      <img src="{{ '/assets/img/howtos/uc-talent/doc-link.png' | relative_url }}" alt="The agent's reply with a clickable link to the saved document">
      <figcaption><span class="step">Step 1</span>The agent writes the document and replies with a clickable link — <em>"Done. Saved as Talent Council: … Conclusion."</em></figcaption>
    </figure>
    <figure class="vslide">
      <img src="{{ '/assets/img/howtos/uc-talent/document.png' | relative_url }}" alt="The saved conclusion document open in Cortex">
      <figcaption><span class="step">Step 2</span>Click it and the document opens in Cortex — verdict, the pivot, what makes it work, the risk, signed off by the panel. A real artifact you can keep editing.</figcaption>
    </figure>
  </div>
  <nav class="vslides-nav">
    <button data-prev aria-label="Previous step">‹</button>
    <span class="vslides-count"></span>
    <button data-next aria-label="Next step">›</button>
  </nav>
</div>

---

## What this shows

- **Many voices, one answer.** A council keeps the disagreement that makes
  feedback useful, then synthesises it — instead of the flattened single opinion
  one agent gives you.
- **Define once, reuse forever.** The panel is saved by name; every later
  question in the project can be put to the same board.
- **From talk to artifact.** The conversation becomes a document you own and can
  keep working on — not a message that scrolls away.

## Where to go next

- The engine behind the panel: [Zaphod spec](/specs/zaphod-engine).
- Wizards that write prompts for you: [Wizards spec](/specs/wizards).
- Another multi-step story: [Analyse a dataset, step by step](/howtos/uc-data-analysis/).
