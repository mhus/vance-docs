---
title: "Analyse a dataset, step by step"
parent: How-tos
nav_order: 11
permalink: /howtos/uc-data-analysis/
---

# Analyse a dataset, step by step
{: .no_toc }

A real task, not a feature demo: pull a public dataset off the web, cut it down
to a workable sample, compute some numbers, chart them, and finally hand a few
raw examples to an agent for a read no statistic gives you. Each step is one
**compose block** on a single page — you press them in turn, and each builds on
the file the last one left behind.
{: .fs-5 .fw-300 }

The data is Amazon's public [**Topical-Chat**](https://github.com/alexa/Topical-Chat)
corpus — thousands of open-domain conversations, each turn tagged with a
sentiment. We take one file of it and walk from raw JSON to a finished chart plus
a qualitative summary, entirely inside one Workbook page.

This tour uses a demo project **`data-analysis`**. Every block below is
copy-pasteable: open a `workpage`, type `/compose`, and paste the YAML.

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## How it hangs together

Five blocks, one shared workspace called `topical`. Because they name the same
workspace, the file one block writes is still there for the next one — so the
data flows down the page:

1. **Pull** the raw conversations file into the workspace.
2. **Truncate** it to a fixed sample of 10 (fast, reproducible).
3. **Analyse** the sample — turns, message length, sentiment mix.
4. **Chart** the sentiment counts as a native Vance chart.
5. **Ask** an agent to characterise the conversation style from real turns.

You don't reach the goal in one shot — you reach it by pressing five buttons in
order, each standing on the output of the one before.

## 1 · Pull the data

An `import` fetches the file over HTTP straight into the workspace; a one-line
`exec` reports its size and how many conversations it holds.

````markdown
```vance-compose
title: 1 · Pull the data
workspace:
  name: topical
  type: temp
import:
  - from: https://raw.githubusercontent.com/alexa/Topical-Chat/master/conversations/valid_freq.json
    to: conversations.json
tasks:
  - type: exec
    command: |
      { echo "file:          $(du -h conversations.json | cut -f1)"
        echo "conversations:  $(python3 -c "import json;print(len(json.load(open('conversations.json'))))")"
      } | tee fetched.txt
    outputs: [fetched.txt]
```
````

<div class="vslides">
  <div class="vslides-head">1 · Pull — command &amp; result</div>
  <div class="vslides-stage">
    <figure class="vslide">
      <img src="{{ '/assets/img/howtos/uc-analysis/01-pull-command.png' | relative_url }}" alt="The pull-the-data compose block on the page">
      <figcaption><span class="step">Step 1</span>The block in the page: an import plus a small shell task. Press ▶ to run it server-side.</figcaption>
    </figure>
    <figure class="vslide">
      <img src="{{ '/assets/img/howtos/uc-analysis/01-pull-output.png' | relative_url }}" alt="The result: a 3.7M file with 539 conversations">
      <figcaption><span class="step">Step 2</span><code>fetched.txt</code> comes back: a 3.7&nbsp;MB file, <strong>539 conversations</strong>. The data now lives in the shared <code>topical</code> workspace.</figcaption>
    </figure>
  </div>
  <nav class="vslides-nav">
    <button data-prev aria-label="Previous step">‹</button>
    <span class="vslides-count"></span>
    <button data-next aria-label="Next step">›</button>
  </nav>
</div>

## 2 · Truncate to 10

539 conversations is more than a showcase needs — and if we sent them all to an
agent later it would cost real tokens. So we take a **fixed sample of 10**. The
cap is a plain parameter (`LIMIT = 10`) and the seed is fixed, so the sample is
the same every run.

````markdown
```vance-compose
title: 2 · Truncate to 10
workspace:
  name: topical
  type: temp
tasks:
  - type: python
    code: |
      import json, random
      LIMIT = 10                        # our artificial cap for this showcase
      convos = json.load(open("conversations.json"))
      ids = sorted(convos)
      random.Random(42).shuffle(ids)
      picked = ids[:LIMIT]
      subset = {cid: convos[cid] for cid in picked}
      json.dump(subset, open("subset.json", "w"))
      msgs = sum(len(convos[c]["content"]) for c in picked)
      report = f"kept {len(subset)} of {len(convos)} conversations, {msgs} messages\n"
      print(report, end="")
      open("subset-summary.txt", "w").write(report)
    outputs: [subset-summary.txt]
```
````

<div class="vslides">
  <div class="vslides-head">2 · Truncate — command &amp; result</div>
  <div class="vslides-stage">
    <figure class="vslide">
      <img src="{{ '/assets/img/howtos/uc-analysis/02-truncate-command.png' | relative_url }}" alt="The truncate compose block with the LIMIT parameter">
      <figcaption><span class="step">Step 1</span>A <code>python</code> task reads <code>conversations.json</code> (left by step 1), samples 10 with a fixed seed, and writes <code>subset.json</code>.</figcaption>
    </figure>
    <figure class="vslide">
      <img src="{{ '/assets/img/howtos/uc-analysis/02-truncate-output.png' | relative_url }}" alt="Result: kept 10 of 539 conversations, 216 messages">
      <figcaption><span class="step">Step 2</span><strong>kept 10 of 539 conversations, 216 messages.</strong> Everything downstream works on that small, stable slice.</figcaption>
    </figure>
  </div>
  <nav class="vslides-nav">
    <button data-prev aria-label="Previous step">‹</button>
    <span class="vslides-count"></span>
    <button data-next aria-label="Next step">›</button>
  </nav>
</div>

## 3 · Simple analysis

Now the numbers. Over the 10-conversation subset: turns per conversation, words
per message (mean and median via numpy), the **sentiment distribution**, and how
balanced the two speakers are. It writes a plain-text report the page renders.

````markdown
```vance-compose
title: 3 · Simple analysis
workspace:
  name: topical
  type: temp
tasks:
  - type: python
    code: |
      import json, numpy as np
      from collections import Counter
      sub = json.load(open("subset.json"))
      turns, words = [], []
      sentiments, agents = Counter(), Counter()
      for c in sub.values():
          content = c["content"]
          turns.append(len(content))
          for m in content:
              words.append(len(m["message"].split()))
              sentiments[m.get("sentiment", "?")] += 1
              agents[m.get("agent", "?")] += 1
      turns, words = np.array(turns), np.array(words)
      out = []
      out.append(f"conversations: {len(sub)}    messages: {int(turns.sum())}")
      out.append(f"turns / conversation:  mean {turns.mean():.1f}   median {int(np.median(turns))}")
      out.append(f"words / message:       mean {words.mean():.1f}   median {int(np.median(words))}")
      out.append("")
      out.append("sentiment:")
      for s, n in sentiments.most_common():
          out.append(f"  {s:<26} {n:>4}  ({100*n/len(words):4.0f}%)")
      out.append("")
      out.append("agent balance:  " + ",  ".join(f"{a} = {n}" for a, n in sorted(agents.items())))
      report = "\n".join(out) + "\n"
      print(report, end="")
      open("stats.txt", "w").write(report)
    outputs: [stats.txt]
```
````

<div class="vslides">
  <div class="vslides-head">3 · Analyse — command &amp; result</div>
  <div class="vslides-stage">
    <figure class="vslide">
      <img src="{{ '/assets/img/howtos/uc-analysis/03-analysis-command.png' | relative_url }}" alt="The analysis compose block using numpy and Counter">
      <figcaption><span class="step">Step 1</span>numpy and <code>collections.Counter</code> over <code>subset.json</code> — no pandas needed for this.</figcaption>
    </figure>
    <figure class="vslide">
      <img src="{{ '/assets/img/howtos/uc-analysis/03-analysis-output.png' | relative_url }}" alt="stats.txt: 21.6 turns/conv, sentiment mostly Curious and Happy">
      <figcaption><span class="step">Step 2</span><code>stats.txt</code>: ~21.6 turns per conversation, ~19.5 words per message, sentiment led by <em>Curious</em> (38%) and <em>Happy</em> (24%), speakers near-balanced.</figcaption>
    </figure>
  </div>
  <nav class="vslides-nav">
    <button data-prev aria-label="Previous step">‹</button>
    <span class="vslides-count"></span>
    <button data-next aria-label="Next step">›</button>
  </nav>
</div>

## 4 · Chart the sentiment

A table of counts is fine; a chart is better. This block builds a native Vance
**chart document** from the sentiment counts and `export`s it into the project —
where it opens as a real, editable bar chart, not a static image.

````markdown
```vance-compose
title: 4 · Chart the sentiment
workspace:
  name: topical
  type: temp
tasks:
  - type: python
    code: |
      import json
      from collections import Counter
      sub = json.load(open("subset.json"))
      sent = Counter()
      for c in sub.values():
          for m in c["content"]:
              sent[m.get("sentiment", "?")] += 1
      chart = {
          "$meta": {"kind": "chart"},
          "chart": {"chartType": "bar", "title": "Sentiment across 10 conversations"},
          "xAxis": {"type": "category"},
          "yAxis": {"type": "value"},
          "series": [{"name": "messages",
                      "data": [{"x": s, "y": n} for s, n in sent.most_common()]}],
      }
      json.dump(chart, open("sentiment.chart.json", "w"), indent=2)
      print("wrote sentiment.chart.json:", dict(sent.most_common()))
    outputs: [sentiment.chart.json]
export:
  - from: sentiment.chart.json
    to: vance:/sentiment.chart.json
```
````

The trick is the `$meta: {kind: chart}` the script writes into the JSON. As a
workspace file it's just JSON; once `export`ed into the project as
`sentiment.chart.json`, Vance recognises the kind and renders it.

<div class="vslides">
  <div class="vslides-head">4 · Chart — command &amp; result</div>
  <div class="vslides-stage">
    <figure class="vslide">
      <img src="{{ '/assets/img/howtos/uc-analysis/04-chart-command.png' | relative_url }}" alt="The chart compose block building a kind:chart JSON">
      <figcaption><span class="step">Step 1</span>The script assembles a <code>kind: chart</code> document and exports it to <code>vance:/sentiment.chart.json</code>.</figcaption>
    </figure>
    <figure class="vslide">
      <img src="{{ '/assets/img/howtos/uc-analysis/04-chart-output.png' | relative_url }}" alt="The exported chart document rendered as a bar chart">
      <figcaption><span class="step">Step 2</span>Open the exported document and it's a live bar chart — axis, legend, series, all editable in the chart editor.</figcaption>
    </figure>
  </div>
  <nav class="vslides-nav">
    <button data-prev aria-label="Previous step">‹</button>
    <span class="vslides-count"></span>
    <button data-next aria-label="Next step">›</button>
  </nav>
</div>

## 5 · Ask the model

Numbers describe the shape; they don't tell you what the conversations *feel*
like. The last block hands a handful of real turns to an **agent** — a `session`
with the `arthur` recipe plus a `type: agent` task — and asks for a qualitative
read. This one spends real tokens, which is exactly why step 2 capped the sample.

````markdown
```vance-compose
title: 5 · Ask the model
workspace:
  name: topical
  type: temp
session:
  recipe: arthur
  enabled: true
tasks:
  - type: agent
    recipe: arthur
    prompt: |
      These are sample turns from the Topical-Chat conversations we just analysed
      (10 conversations, ~22 turns each; sentiment skews Curious / Happy):

      agent_1 [Neutral]: Hey, how you doing there?
      agent_2 [Happy]: wonderful how about you
      agent_1 [Curious]: I'm great! Have you heard of the sport called football?
      agent_2 [Happy]: Yes! I live in America and just watched the super bowl!
      agent_1 [Neutral]: Sometimes I watch the SB. Funny that in the 60's bowlers made twice as much as top football stars.
      agent_2 [Curious]: Also find that funny. Are you from the US?

      In two or three sentences, what characterises this conversation style?
```
````

<div class="vslides">
  <div class="vslides-head">5 · Ask — command &amp; answer</div>
  <div class="vslides-stage">
    <figure class="vslide">
      <img src="{{ '/assets/img/howtos/uc-analysis/05-ask-command.png' | relative_url }}" alt="The agent compose block with a session and a prompt of sample turns">
      <figcaption><span class="step">Step 1</span>A <code>session</code> (recipe <code>arthur</code>) and a <code>type: agent</code> task carrying six real sample turns and the question.</figcaption>
    </figure>
    <figure class="vslide">
      <img src="{{ '/assets/img/howtos/uc-analysis/05-ask-output.png' | relative_url }}" alt="The agent's answer rendered in the block">
      <figcaption><span class="step">Step 2</span>A real agent turn runs and answers in place: <em>"casual and light — short turns, surface-level chit-chat, quick topic pivots… a friendly, low-stakes opener."</em> The read the numbers couldn't give you.</figcaption>
    </figure>
  </div>
  <nav class="vslides-nav">
    <button data-prev aria-label="Previous step">‹</button>
    <span class="vslides-count"></span>
    <button data-next aria-label="Next step">›</button>
  </nav>
</div>

{: .note }
> An `agent` block runs its session when you press **▶** in the page. The
> conversation, the file it read and the numbers it summarised all sit in the
> same project — so the answer is grounded in *this* analysis, not a generic one.

---

## What this shows

- **A goal reached in steps, not one shot.** Pull → truncate → analyse → chart →
  ask. Each block reads what the last one wrote, because they share the `topical`
  workspace. Delete any one and the chain breaks — that's what makes it a
  use-case and not five isolated demos.
- **The page *is* the notebook.** Code, output, chart and an agent's read live on
  one page, versioned like any document, runnable by anyone who opens it.
- **Reproducible.** Fixed seed, fixed cap, public data — press the five buttons
  again and you get the same result.

## Where to go next

- The runtime behind these blocks — Shell, Python, LaTeX, agents — has its own
  reference: [Damogran / Compose spec](/specs/damogran-system/).
- How a chart document is structured: it's just a `kind: chart` file — open one
  in [Cortex](/howtos/cortex/) and flip to **Edit**.
- Haven't got a running instance yet? [Get started](/getting-started).
