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

![Finance — the studio-budget tree with its net rollup]({{ '/assets/img/howtos/finance/tree.png' | relative_url }}){: .doc-shot }

## Sign flips the subtree

Select the **Costs** node and it carries `sign: −1` — everything under it is
entered as a positive amount (salaries 18,000/mo, infra 203/mo, …) and subtracted
automatically. A record can be a **recurring** rate (with a period) or a
**one-time** sum on a date (the €5,000 legal setup). You never juggle minus signs.

![Finance — the Costs node with "negative (flips subtree)" ticked]({{ '/assets/img/howtos/finance/sign.png' | relative_url }}){: .doc-shot }

## Reports compile out of it

The **Report** button runs a processor over the tree and writes the result
*through another kind*: **table** → a `sheet` (period matrix), **series** → a
`chart` (a time series per node), **assessment** → a `markdown` write-up. Same
source, different compiled artefact — inline, or saved as its own document.

![Finance — generating an assessment report from the tree]({{ '/assets/img/howtos/finance/report.png' | relative_url }}){: .doc-shot }

Here the **assessment** processor turns the numbers into a written read — bottom
line, main drivers, one-time items — but the same dialog will just as happily
compile a `sheet` matrix or a `chart` series from the identical tree.

---

## Where to go next

- The node/value model, the year invariant and the calc rules:
  [finance-tree spec](/specs/doc-kind-finance-tree/).
- The `finance_*` tools let an agent build the tree, set values, recalc and
  generate reports — see [How-tos](/howtos/).
- Editing the tree alongside chat: [Cortex tour](/howtos/cortex/).
