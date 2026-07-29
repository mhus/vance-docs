---
title: How-tos
nav_order: 5
permalink: /howtos/
has_children: true
---

# How-tos
{: .no_toc }

Task-oriented guides — pick the thing you want to do, follow the steps.
For *what something is* and *how it works internally*, see the
[Specs](/specs/) section.
{: .fs-5 .fw-300 }

{: .note }
> This section is being filled in. Some pages are live (linked below);
> the rest are planned coverage and land as they are written. To suggest
> or contribute a guide, open an issue on
> [`vance-docs`](https://github.com/mhus/vance-docs/issues).

## Feature tours

Screenshot walkthroughs of the surfaces you actually work in — one per app.
Short, visual, "here's how X works."

- [**Cortex** — chat, document and execute on one surface](/howtos/cortex/)
- [**Canvas** — think spatially: nodes, links and groups](/howtos/canvas/)
- [**Workbook** — notes and pages in a block editor](/howtos/workbook/)
- [**Kanban & Issues** — plan work and track it through](/howtos/kanban/)
- [**Sheet** — spreadsheets with functions](/howtos/sheet/)
- [**Finance** — structure money decisions](/howtos/finance/)

## Use-case stories

The narrative path from a request to a result, across several features at once —
what people actually get done with Vance.

- [**Analyse a dataset, step by step**](/howtos/uc-data-analysis/) — pull public data, sample it, compute, chart, and ask an agent — five compose blocks in a row
- **Coding** — an agent does real, sustained engineering on a repo _(planned)_
- **Research** — a question becomes a sourced, verified synthesis _(planned)_
- **Automation** — work that runs on a timer or an event, no chatting _(planned)_

## Planned guides

### Getting productive

- **Your first Vance session** — install, log in, run a Recipe, read the result
- **vance-foot CLI reference** — commands, flags, slash-commands, a typical session
- **Picking a model** — what Vance asks of an LLM and how the recommended models compare under that load

### Building on Vance

- **Write your first Recipe** — a `default`-style YAML recipe end-to-end, with the LLM you already configured
- **Build a Project Kit** — pack skills, recipes, tools and settings into a Git repo and install it into a project
- **Add a server-side tool** — register a `vance-shared` tool, wire it into a recipe, call it from a session
- **Anbind an MCP server** — point Vance at an MCP endpoint, expose its tools through the recipe layer

### Operations

- **Configure an LLM provider** — beyond the setup wizard: aliases, fallbacks, per-tier model bindings
- **Add a webhook / event trigger** — fire a recipe or workflow from an external HTTP call
- **Schedule recurring work** — Ursa Scheduler from a YAML doc to a running job
- **Pin a release** — set `IMAGE_TAG` in the Docker stack so upgrades are explicit
- **Back up MongoDB** — what to dump, how to restore, encryption-key implications
