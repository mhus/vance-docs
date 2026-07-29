---
title: "Compose — run scripts in a page"
parent: How-tos
nav_order: 20
permalink: /howtos/uc-scripts/
nav_exclude: true
---

# Compose — run scripts in a page
{: .no_toc }

{: .note }
> **Draft — a *feature*, not a use-case, and not yet published on the site.**
> This documents Vance's compose blocks (run Shell / Python / … in a page). It's
> kept off the nav (`nav_exclude`) until we decide where the feature lives.

A Vance page can **run things**, not just hold text. Drop a compose block into a
page, write a script, and run it — it executes server-side in a fresh workspace
and the result lands right back in the page. No terminal, no setup. And it's the
*same block* whatever the language: swap the task type and you're running Shell,
Python, JavaScript, R, LaTeX or an LLM call.
{: .fs-5 .fw-300 }

## Shell

The simplest case: an `exec` task running a plain shell command.

<div class="vslides">
  <div class="vslides-head">Shell — 2 steps</div>
  <div class="vslides-stage">
    <figure class="vslide">
      <img src="{{ '/assets/img/howtos/uc-scripts/shell-command.png' | relative_url }}" alt="A compose block holding a bash command">
      <figcaption><span class="step">Step 1</span>A tiny manifest: a scratch workspace and one <code>exec</code> task. Anything you'd type in a terminal goes here.</figcaption>
    </figure>
    <figure class="vslide">
      <img src="{{ '/assets/img/howtos/uc-scripts/shell-output.png' | relative_url }}" alt="The shell block after running, showing its output">
      <figcaption><span class="step">Step 2</span>Hit Run. The command runs server-side in a fresh workspace and the output streams back — here the text it wrote to <code>report.txt</code>. Nothing ran in your browser.</figcaption>
    </figure>
  </div>
  <nav class="vslides-nav">
    <button data-prev aria-label="Previous step">‹</button>
    <span class="vslides-count"></span>
    <button data-next aria-label="Next step">›</button>
  </nav>
</div>

## Python

Same block, `type: python` — inline code (or a workspace file), the standard
library, files it writes surfaced as outputs.

<div class="vslides">
  <div class="vslides-head">Python — 2 steps</div>
  <div class="vslides-stage">
    <figure class="vslide">
      <img src="{{ '/assets/img/howtos/uc-scripts/python-command.png' | relative_url }}" alt="A compose block holding Python code">
      <figcaption><span class="step">Step 1</span>Switch the task to <code>python</code> and write code — here a quick latency stat over a handful of samples.</figcaption>
    </figure>
    <figure class="vslide">
      <img src="{{ '/assets/img/howtos/uc-scripts/python-output.png' | relative_url }}" alt="The Python block after running, showing computed stats">
      <figcaption><span class="step">Step 2</span>Run it. Python executes in the workspace; the mean and standard deviation it wrote to <code>stats.txt</code> come back into the page.</figcaption>
    </figure>
  </div>
  <nav class="vslides-nav">
    <button data-prev aria-label="Previous step">‹</button>
    <span class="vslides-count"></span>
    <button data-next aria-label="Next step">›</button>
  </nav>
</div>

---

Same idea, more runtimes: the block also runs **JavaScript, R, LaTeX and LLM
calls**, and can carry **state** across runs or bind to a **session**. Those land
next in this series.
