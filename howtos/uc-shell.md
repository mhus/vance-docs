---
title: "Run a shell command in a page"
parent: How-tos
nav_order: 20
permalink: /howtos/uc-shell/
---

# Run a shell command in a page
{: .no_toc }

A Vance page can **run things**, not just hold text. Drop a compose block into a
page, write a plain shell command, and run it — the command executes server-side
in a fresh workspace and the result lands right back in the page. No terminal, no
setup.
{: .fs-5 .fw-300 }

<div class="vslides">
  <div class="vslides-head">Walkthrough — 2 steps</div>
  <div class="vslides-stage">
    <figure class="vslide">
      <img src="{{ '/assets/img/howtos/uc-shell/01-command.png' | relative_url }}" alt="A compose block in a page holding a bash command">
      <figcaption><span class="step">Step 1</span>It's a tiny manifest: a scratch workspace and one <code>exec</code> task — a plain shell command. Anything you'd type in a terminal goes here.</figcaption>
    </figure>
    <figure class="vslide">
      <img src="{{ '/assets/img/howtos/uc-shell/02-output.png' | relative_url }}" alt="The same block after running, showing the command output">
      <figcaption><span class="step">Step 2</span>Hit Run. The command executes server-side in a fresh workspace and the output streams back into the page — here the text it wrote to <code>report.txt</code>. Nothing ran in your browser.</figcaption>
    </figure>
  </div>
  <nav class="vslides-nav">
    <button data-prev aria-label="Previous step">‹</button>
    <span class="vslides-count"></span>
    <button data-next aria-label="Next step">›</button>
  </nav>
</div>

That's the whole idea: a shell command lives in the document, next to your notes.
The same block runs **Python, JavaScript, R, LaTeX or an LLM call** — and can carry
**state** across runs or bind to a **session**. That's the rest of this series.

---

_Prototype: this page is the format test for the use-case slideshow (step-through
screenshots in a collapsible viewer). See `readme/feature-tour-playbook.md`._
