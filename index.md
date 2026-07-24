---
title: Vance
layout: home
nav_order: 1
description: "A personal project: a server on which LLM agents work assignments over hours and days — shaped almost entirely from its own documents. Not a product."
permalink: /
---

# 𝑣 Vance
{: .fs-9 }

A server (the "Brain") on which LLM agents work assignments over hours and
days — and which you can shape almost entirely from within itself, because
configuration, behaviour and knowledge all live as documents in the database.
{: .fs-6 .fw-300 }

[Get started](getting-started){: .btn .btn-primary .fs-5 .mb-4 .mb-md-0 .mr-2 }
[GitHub](https://github.com/mhus/vance){: .btn .fs-5 }

{: .note }
> **A personal project, not a product.** I built Vance to develop LLM agents
> and shape them until I could work productively with them. Nothing is for
> sale — the code is open because it might be useful to someone. Poke around,
> build on it, steal ideas.

{: .warning }
> **Beta.** APIs, data model, configuration keys and engine behaviour can
> change between releases. Good for hands-on experimentation; not hardened
> for unattended production use.

---

## What it's about

Vance is more than a chatbot or coding assistant. It's a server on which
assignments run for hours and days, every step stays visible, and the whole
system can be reshaped from its own data.

- **Everything is a document** — recipes, prompts, schedulers, hooks, settings, manuals all live in MongoDB. Reshape the system without touching code.
- **Agents drive (almost) everything** — nearly every capability is a tool; you steer and step in when you want.
- **Projects draw the boundaries** — bounded areas with their own documents, config and agents, side by side.
- **A place to actually work** — Cortex unites chat, documents and execute; documents in many kinds, bundled into apps (workbook, wiki, kanban, journal, …).
- **Collaborative** — several people (and agents) in the same project, live-edited documents included.
- **The right engine for the job** — a dozen think-engines plus services, picked per recipe.
- **Connectors to the outside** — mail, Jira, Google services, MCP tools.

## Where to go next

- [Concepts](concepts) — engines, recipes, scopes, documents, triggers
- [Get started](getting-started) — start the brain, connect the CLI, first assignment
- [Architecture](architecture) — brain + clients, data model, lifecycle

---

## Status

Beta. Brain, CLI and Web UI run locally and on small self-hosted
deployments. Expect breaking changes between minor releases — read the
release notes before upgrading a stack with data you care about. This
documentation site is part of the public `vance-docs` repo and is still
being built out.
