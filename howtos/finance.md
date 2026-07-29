---
title: "Finance — structure money decisions"
parent: How-tos
nav_order: 6
permalink: /howtos/finance/
---

# Finance — structure money decisions
{: .no_toc }

A finance-tree is a document for thinking about money as a hierarchy. Nodes carry
amounts — recurring rates or one-off sums — and roll up bottom-up. A node's
**sign** flips its whole subtree, so a "Costs" branch subtracts without you ever
typing a negative number. The tree is the source; the math compiles the totals;
**reports** are the artefacts you export.
{: .fs-5 .fw-300 }

This tour uses the **`studio-budget`** finance-tree in the demo project
`meridian-ops` (seed it with `wb smoke showcase`).

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## The tree

Open the finance-tree and you get a master-detail editor — the tree on the left,
the selected node's detail on the right. The `studio-budget` example rolls a
studio's month up from two branches: **Revenue** and **Costs**. The top shows the
net, and a switcher recomputes it per day / week / month / year.

<div class="shot-slot" markdown="1">
**📷 Shot 1 — the tree**
_Open `meridian-ops` → `finance/studio-budget`. Frame the tree (studio → revenue,
costs, with their line items) and the net total (≈ €37,164 / yr, or €3,097 / mo).
Establishing shot._
</div>

## Sign flips the subtree

Select the **Costs** node and it carries `sign: −1` — everything under it is
entered as a positive amount (salaries 18,000/mo, infra 203/mo, …) and subtracted
automatically. A record can be a **recurring** rate (with a period) or a
**one-time** sum on a date (the €5,000 legal setup). You never juggle minus signs.

<div class="shot-slot" markdown="1">
**📷 Shot 2 — a node up close**
_Select a node with records — e.g. **Costs** (to show `sign: −1`) or a line item
like **Salaries** or **Legal setup**. Capture the detail panel with its value
record(s): amount, period (or the one-time date), and the computed per-year /
per-month figure._
</div>

## Reports compile out of it

The **Report** button runs a processor over the tree and writes the result
*through another kind*: **table** → a `sheet` (period matrix), **series** → a
`chart` (a time series per node), **assessment** → a `markdown` write-up. Same
source, different compiled artefact — inline, or saved as its own document.

<div class="shot-slot" markdown="1">
**📷 Shot 3 — a report**
_Open the **Report** dropdown and generate one (a **table** → sheet is the quick,
LLM-free one). Capture either the dropdown with the processor choices, or the
generated report next to the tree._
</div>

---

## Where to go next

- The node/value model, the year invariant and the calc rules:
  [finance-tree spec](/specs/doc-kind-finance-tree/).
- The `finance_*` tools let an agent build the tree, set values, recalc and
  generate reports — see [How-tos](/howtos/).
- Editing the tree alongside chat: [Cortex tour](/howtos/cortex/).
