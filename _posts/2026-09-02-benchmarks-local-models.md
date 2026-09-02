---
title: "Vancetope, benchmarked on models you can run on your own machine"
date: 2026-09-02 12:00:00 +0000
permalink: /blog/benchmarks-local-models/
description: "We re-ran the Vance capability suite against four open-weight model families in the 20–35B range, all served locally through Ollama on Apple Silicon. They hold up — and that's the point: the model, the data, and the runtime are yours."
nav_exclude: true
---

# Vancetope, benchmarked on models you can run on your own machine

The first benchmark matrix we published ran against a hosted frontier model.
The one that's live today doesn't. It runs against **four open-weight model
families in the 20–35B parameter range, all served locally through
[Ollama](https://ollama.com) on a single Apple-Silicon machine** — no cloud
API in the hot path, no data leaving the box.

They hold up. And that is the whole point.

→ **[Open the benchmark matrix](/benchmarks/)** — 6 model/variant rows,
68 tests, 543 samples.

## What was run

Every row in the matrix is a model you can `ollama pull` and run yourself:

| Slug in the matrix | Model | Family |
|---|---|---|
| `gemma4-31b-mlx` | `gemma-4-31B-it-qat-4bit` (MLX build) | Google **Gemma 4 31B** |
| `qwen3.6-35b` | `qwen3.6:35b` | Alibaba **Qwen 3.6 35B** |
| `gpt-oss-20b` | `gpt-oss:20b` | OpenAI **GPT-OSS 20B** |
| `muse-glimmer-30b-mlx` | `muse-glimmer:30b-mlx` | Meta **Muse Glimmer 30B** |

The `-mlx` builds are the Apple-Silicon-optimised ones (Metal-backed
inference, materially faster than the GGUF builds on M-series Macs). The
suite is the same one we use for everything: brain in-process, foot as a
subprocess, a Mongo testcontainer, 68 tests across ten capability groups —
anti-hallucination, phantom-tool-result, tool-family selection, document
kinds, inline kinds, learn-action, Mermaid variety, JavaScript and Python
script execution, URL-import discovery, and voice style.

Tests aren't pass/fail. Each is **graded** (`v2-graded`) and judged by
**Gemini 2.5 Pro**, so a model that almost does the right thing doesn't get
the same score as one that refuses. A `total` is the weighted mean over the
categories that have data; `cov` is how many of the twelve categories a model
actually ran — a row measured on less than half of them is greyed, because a
high total over two categories is not a result.

## The numbers

Category-weighted totals, best run per variant:

| Model (variant) | total | chat | worker | cov |
|---|---|---|---|---|
| Gemma 4 31B · MLX · `smallv2` | **87%** | 91% | 87% | 12/12 |
| Qwen 3.6 35B · `smallv2` | **85%** | 86% | 84% | 12/12 |
| Qwen 3.6 35B · `baseline` | **85%** | 89% | 86% | 12/12 |
| GPT-OSS 20B · `smallv2` | **83%** | 85% | 89% | 12/12 |
| Muse Glimmer 30B · MLX · `smallv2` | **79%** | 81% | 75% | 12/12 |
| GPT-OSS 20B · `baseline` | **77%** | 77% | 70% | 8/12 |

The variants (`baseline` / `smallv2`) are different recipe-defaulting and
prompt configurations of the same model — same knobs, same judge, same
hardware. They're shown as separate rows because *how you ask* turns out to
matter as much as *which model answers*.

### Where local models are genuinely good

- **Anti-hallucination.** Three configurations score a clean **100%** —
  Gemma 4 31B, Qwen 3.6 35B (`baseline`), and GPT-OSS 20B (`smallv2`). The
  suite asks the model to refuse a non-existent tool (`calendar_create_event`,
  `doc_save`, `diagram_tool`) and name a real one instead. Small local models
  don't invent capabilities to seem helpful.
- **Tool-family selection.** 80–93% across the board. Given a natural
  request, the right tool family gets picked.
- **Script execution.** JavaScript and Python both hit **100%** on the
  leading configurations. Running code in a sandboxed workspace is not a
  frontier-model trick.
- **URL-import discovery.** **100%** everywhere it ran — the model says
  "use `web_fetch`" instead of inventing the content.

### Where they're weaker (and we're not hiding it)

- **Mermaid variety** (47–84%). Asking a 20–35B model to emit eleven
  different diagram types in one session is where the frontier still pulls
  ahead.
- **How-do-I-reflex** (28–75% on the strict variants). The discovery loop
  that asks "do I actually have a tool for this?" is the hardest reflex to
  train into a small model; GPT-OSS 20B `smallv2` drops to 28% here.
- **Document kinds** (57–84%). Authoring a structured document kind that
  passes a structural validator is mid-pack for everyone.

The point of a graded benchmark is that these are visible. Each cell in the
matrix links to the per-run `.md` report with the judge's verdict and the
checks that earned or missed credit. Nothing is averaged into a single
number that hides where it broke.

## What it buys you

This is the part that matters more than the percentages.

**Vancetope ships no model.** You connect your own. The benchmark matrix is
proof that "your own" can be a 20–35B open-weight model on a machine you
own, and the agent loop still works — not as a toy, not as a demo, but well
enough to drive documents, tools, scripts, and honest refusal for hours.

Running locally means:

- **The data never leaves your machine.** Nothing about your documents, your
  sessions, or your tool calls is sent to a vendor. There is no vendor. The
  model is a process on your host.
- **No pricing, no rate limits, no quota.** A long-running agent that works
  an assignment over hours and days doesn't pause to wait for a token bucket
  or run up a bill per turn. The cost is electricity and the one-time
  download.
- **No deprecations, no outages, no terms-of-service changes.** A hosted
  model can be retired, rerated, or re-scoped under you. The open-weight
  weights on your disk can't be. You upgrade when *you* choose to `ollama
  pull` a newer tag.
- **No account, no telemetry, no "who saw what".** Independence from a
  vendor is also independence from the vendor's logging, retention, and
  subpoena surface.

That's the thesis of the whole project, made concrete: a personal workspace
where an agent works your assignments, shaped almost entirely from its own
documents, and the intelligence driving it is yours in the same way the
documents are.

## Honest scope

These are not phone-class models. A 20–35B model in a 4-bit MLX build needs
a capable Apple-Silicon machine (the Muse Glimmer MLX build is ~21 GB on
disk alone) — a Mac Studio or a higher-RAM M-series Mac, not a laptop with
8 GB. The matrix is "you can run this at home", not "you can run this on
anything with a battery". The frontier is still faster and still smarter on
the hardest creative tasks, and the matrix shows exactly where.

But the question Vancetope asks of a model isn't "are you the smartest" —
it's "can you drive the thing: pick the right tool, refuse the wrong one,
run the script, tell the truth when there's nothing to find." On that
question, four open-weight families running locally answer *yes*, with the
receipts linked from every cell.

## Try it

- **[Benchmark matrix](/benchmarks/)** — the full grid, every cell links to
  its run report.
- **[Get started](/getting-started)** — the Docker stack, a couple of
  commands.
- **[Bring your own model](/getting-started#bring-your-own-model)** — point
  Vancetope at a local Ollama daemon and you're on the matrix.

Still early, still rough, still real. Onward.
