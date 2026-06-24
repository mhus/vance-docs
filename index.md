---
title: Vance
layout: home
nav_order: 1
description: "Collaborative Brain — a system that takes assignments, executes them with the right tools and engines, and delivers verifiable results. For teams."
permalink: /
---

# Vance — Collaborative Brain
{: .fs-9 }

Vance is a system that takes assignments, executes them with the right tools
and engines, and delivers **verifiable results** — for teams, not just for
individuals.
{: .fs-6 .fw-300 }

[Get started](getting-started){: .btn .btn-primary .fs-5 .mb-4 .mb-md-0 .mr-2 }
[GitHub](https://github.com/mhus/vance){: .btn .fs-5 }

{: .warning }
> **Beta.** Vance is in active development. APIs, data model, configuration
> keys and engine behaviour can change between releases. Suitable for
> hands-on experimentation and early adopters; not yet hardened for
> unattended production use.

---

## What it's about

Vance is more than a chatbot or coding assistant. It's a server on which
assignments run for hours and days, every step stays visible, and every
result is traceable back to its source.

- **Assignment in, result out** — persistent think-processes in MongoDB
- **Verifiable results** — document archives, source blocks, inbox trail
- **The right engine for the job** — 12 think-engines plus services
- **Recipes instead of code changes** — configuration bundles instead of Java
- **For teams** — tenants, scopes, service accounts, shared projects

## Where to go next

- [Concepts](concepts) — engines, recipes, scopes, think-processes
- [Get started](getting-started) — start the brain, connect the CLI, first assignment
- [Architecture](architecture) — brain + clients, data model, lifecycle

---

## Status

Beta. Brain, CLI and Web-UI run locally and on small self-hosted
deployments. Expect breaking changes between minor releases — read the
release notes before upgrading a stack with data you care about. This
documentation site is part of the public `vance-docs` repo and is still
being built out.
