---
title: "Compose — run scripts in a page"
parent: How-tos
nav_order: 7
permalink: /howtos/compose/
---

# Compose — run scripts in a page
{: .no_toc }

A Vancetope page can **run things**, not just hold text. Drop a compose block into a
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
      <img src="{{ '/assets/img/howtos/compose/shell-command.png' | relative_url }}" alt="A compose block holding a bash command">
      <figcaption><span class="step">Step 1</span>A tiny manifest: a scratch workspace and one <code>exec</code> task. Anything you'd type in a terminal goes here.</figcaption>
    </figure>
    <figure class="vslide">
      <img src="{{ '/assets/img/howtos/compose/shell-output.png' | relative_url }}" alt="The shell block after running, showing its output">
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
      <img src="{{ '/assets/img/howtos/compose/python-command.png' | relative_url }}" alt="A compose block holding Python code">
      <figcaption><span class="step">Step 1</span>Switch the task to <code>python</code> and write code — here a quick latency stat over a handful of samples.</figcaption>
    </figure>
    <figure class="vslide">
      <img src="{{ '/assets/img/howtos/compose/python-output.png' | relative_url }}" alt="The Python block after running, showing computed stats">
      <figcaption><span class="step">Step 2</span>Run it. Python executes in the workspace; the mean and standard deviation it wrote to <code>stats.txt</code> come back into the page.</figcaption>
    </figure>
  </div>
  <nav class="vslides-nav">
    <button data-prev aria-label="Previous step">‹</button>
    <span class="vslides-count"></span>
    <button data-next aria-label="Next step">›</button>
  </nav>
</div>

## LaTeX

`type: tex-task` imports a `.tex` document, typesets it, and hands back a PDF —
rendered inline, right in the page.

<div class="vslides">
  <div class="vslides-head">LaTeX — 2 steps</div>
  <div class="vslides-stage">
    <figure class="vslide">
      <img src="{{ '/assets/img/howtos/compose/latex-command.png' | relative_url }}" alt="A compose block that compiles LaTeX">
      <figcaption><span class="step">Step 1</span>Import a <code>.tex</code> file (<code>vance:/hello.tex</code>), a <code>tex-task</code> to compile it, and an <code>export</code> for the PDF.</figcaption>
    </figure>
    <figure class="vslide">
      <img src="{{ '/assets/img/howtos/compose/latex-output.png' | relative_url }}" alt="The compiled PDF rendered in the page">
      <figcaption><span class="step">Step 2</span>Run it. LaTeX compiles server-side and the finished PDF renders inline in a viewer — no local TeX install.</figcaption>
    </figure>
  </div>
  <nav class="vslides-nav">
    <button data-prev aria-label="Previous step">‹</button>
    <span class="vslides-count"></span>
    <button data-next aria-label="Next step">›</button>
  </nav>
</div>

## An agent

The block can also hand a prompt to an **agent**: add a `session` (recipe
`arthur`) and a `type: agent` task. The page kicks off a real agent turn and its
answer comes back in place.

<div class="vslides">
  <div class="vslides-head">Agent — 2 steps</div>
  <div class="vslides-stage">
    <figure class="vslide">
      <img src="{{ '/assets/img/howtos/compose/agent-command.png' | relative_url }}" alt="A compose block with a session and an agent task">
      <figcaption><span class="step">Step 1</span>A <code>session</code> (recipe <code>arthur</code>) plus a <code>type: agent</code> task with a prompt.</figcaption>
    </figure>
    <figure class="vslide">
      <img src="{{ '/assets/img/howtos/compose/agent-output.png' | relative_url }}" alt="The agent's answer rendered in the page">
      <figcaption><span class="step">Step 2</span>Run it. A real agent turn runs in a fresh session; its answer lands back in the block.</figcaption>
    </figure>
  </div>
  <nav class="vslides-nav">
    <button data-prev aria-label="Previous step">‹</button>
    <span class="vslides-count"></span>
    <button data-next aria-label="Next step">›</button>
  </nav>
</div>

---

Same idea, still more: the block also runs **JavaScript** (with a session, for
tool calls) and **R**, and can carry **state** across runs. More to come.
