---
title: "Size up a stock with live data"
parent: How-tos
nav_order: 13
permalink: /howtos/uc-stock/
---

# Size up a stock with live data
{: .no_toc }

Ask a real question — *"how's this stock doing, and what do you make of it?"* —
and Vancetope does the whole thing: pulls the numbers off the web, draws them as a
chart, and hands back an assessment that **cites the data it's standing on**. One
message in, a grounded answer out.
{: .fs-5 .fw-300 }

This uses live **web research** (a search provider the operator wired up) plus
Vancetope's native **chart** documents. The agent delegates the lookup to a research
worker, builds the chart, and writes the verdict — you just ask.

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Ask the question

One plain-language request: get Apple's yearly prices for the last ten years,
chart them, and give an opinion. The agent recognises it needs *live* data,
spawns a research worker, and pulls the figures from the web (you can watch
`web_fetch` / `web-research` in the live-progress panel).

<div class="vslides">
  <div class="vslides-head">From question to grounded verdict — 3 steps</div>
  <div class="vslides-stage">
    <figure class="vslide">
      <img src="{{ '/assets/img/howtos/uc-stock/ask.png' | relative_url }}" alt="The request, plus the agent pulling yearly AAPL prices from the web">
      <figcaption><span class="step">Step 1</span>The request. The agent fetches the yearly figures from the web (research worker + <code>web_fetch</code> on the right) and lays them out as a table before charting.</figcaption>
    </figure>
    <figure class="vslide">
      <img src="{{ '/assets/img/howtos/uc-stock/chart.png' | relative_url }}" alt="A candlestick chart of AAPL yearly prices 2017-2026">
      <figcaption><span class="step">Step 2</span>The data becomes a native <strong>candlestick chart</strong> — <em>AAPL Yearly Stock Prices (2017–2026)</em>, rendered inline, with an honest note that 2026 is year-to-date.</figcaption>
    </figure>
    <figure class="vslide">
      <img src="{{ '/assets/img/howtos/uc-stock/assessment.png' | relative_url }}" alt="The agent's grounded assessment of the stock">
      <figcaption><span class="step">Step 3</span>The verdict — and crucially <em>"here's what I base that on"</em>: the 12.5× decade, only two down years, slowing pace, ~30–33× valuation. A view you can argue with, because the reasons are on the table.</figcaption>
    </figure>
  </div>
  <nav class="vslides-nav">
    <button data-prev aria-label="Previous step">‹</button>
    <span class="vslides-count"></span>
    <button data-next aria-label="Next step">›</button>
  </nav>
</div>

## Why this is more than a chatbot answer

- **It fetched real data, not a memory.** The figures come from a live web
  lookup the agent ran itself — and it says so, including the caveat that the
  current year is incomplete.
- **The chart is a real document.** A native `kind: chart` (candlestick), not a
  picture — you can open it, re-style it, or drop it into a workpage.
- **The verdict is grounded.** Every claim in the assessment points back at a
  number from the chart. That's the difference between an opinion and an opinion
  you can check.

## Where to go next

- The research stack behind the web lookup: [Zarniwoop spec](/specs/zarniwoop-service).
- Build a chart yourself, step by step: [Analyse a dataset](/howtos/uc-data-analysis/).
- What a chart document is: [chart kind](/specs/doc-kind-chart).
