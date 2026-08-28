---
title: "Vancetope — Vision & Idea"
parent: Specs
permalink: /specs/vision
---

<!-- AUTO-GENERATED from specification/public/en/vision.md — do not edit here. -->

---
# Vancetope — Vision & Idea

> What Vancetope is, why it exists, and how it is structured.

---

## What this is

Vancetope is a personal project. I built it to develop LLM agents and shape them
in a way that allows me to work productively with them. Over time, everything I
found exciting — and what I believe others can benefit from — has found its way
into it.

It is a **project, not a product** — no support contract, no roadmap promises.
The source code is public: read, try out, run. It is source-available, not
classic Open Source, and I deliberately keep its future direction open.

---

## Written by agents. On purpose.

Every line of Vancetope is AI-written — directed, reviewed, and shaped by a
human. This is not a confession, but the whole point: Vancetope is what emerges
when you work *with* agents for months, instead of just chatting with them. A
large, coherent system that you can run, read, and modify — tool and proof are
the same.

---

## The idea in one sentence

**Vancetope is a platform for working with LLM agents: a server ("Brain") where
agents process tasks over hours and days — and which can be configured almost
entirely from within itself, because configuration, behavior, and knowledge are
stored as documents in the database.**

---

## Core Principles

### Everything is a Document

Templates, Recipes, Prompts, Schedulers, Hooks, Settings, Manuals — everything
is stored as a document in the database. This allows the system to be shaped
without touching code: a new Recipe is a new document, a new automation is a new
Hook document, a new prompt behavior is an edited text. The system largely
configures itself — and agents can do the same.

### Agents Control (Almost) Everything

As many capabilities as possible are available as Tools for agents. An agent can
write documents, create Recipes, spawn processes, set up triggers, research, and
commission other agents. The human provides direction, observes, and intervenes
when desired — the process remains visible and controllable.

### Projects Delimit

A Project is a delimited area: its own documents, its own configuration, its own
agents. This allows different setups to coexist without interfering. Memory,
rights, and settings are tied to a Scope cascade (Tenant → Project → Session →
Think Process) and are inherited downwards.

### Extensible

Vancetope is deliberately open to further mechanisms. New Engines, new Apps, new
Connectors, new Tools are added as Addons. What I find useful, I build in; what
someone else finds useful, they can add.

### Collaborative

Multiple people work simultaneously in the same Project — including jointly
live-edited documents (Presence, 3-Way-Merge, Versioning). Agents are
participants like humans: they sit in the same Session, read the same documents,
and converse.

---

## Brain + Clients

```
Brain thinks and acts and maintains state.
Clients are the different access points to it.
Connectors communicate with the outside world.
```

The **Brain** (server) holds the entire state: Think Processes, Task trees,
Memory, Documents, Knowledge Graph. It orchestrates LLM calls, plans, executes
actions, and can continue working autonomously even when no client is connected.

One Brain, multiple access points:

| Client | What it is |
|--------|-----------|
| **CLI** (`vance-foot`) | Work directly at the terminal level — but always in the Project context with all stored information. For everything that should happen locally on the machine (Shell, Files, Git). |
| **Web** (`vance-face`) | The working environment in the browser: Chat, Documents, Apps. |
| **Mobile** (`vance-facelift`) | On the go — Capacitor wrapper around the deployed Web UI, an isolated WebView per account. |

The Clients are not interchangeable views, but different access points to the
same Project.

---

## Working Environment

Work is done in the **Cortex** — chat, document, and execution on one surface.
Documents come in many Kinds (Markdown, Workpage, Mindmap, Sheet, Kanban,
Slides, Graph, Diagram, Canvas, Checklist, …), and on top of that sit **Apps**
that bundle multiple documents into a whole — Workbook, Wiki, GTD, Kanban,
Journal, Calendar, Canvasbook. Everything is live-shared: Presence, Merge,
Versions included.

This is the difference from a pure chatbot: the work lives in documents that
persist, are versioned, and are collaboratively edited by humans and agents.

---

## Connectors

Vancetope communicates with external systems — Mail, Jira, Google services, MCP
tools. Inputs come in and results go out via these Connectors. Finished
artifacts that live elsewhere are moved there: a spec in Google Docs, an issue
in Jira, an email in the inbox.

---

## Engines & Recipes

The actual thinking is done by **Engines** — Java algorithms with a lifecycle,
where the code controls the process, not the LLM. There are few of them,
structurally different (Session-Layer, Worker, Deep-Think, Strategy-Runner,
Script-Executor …). They are configured via **Recipes**: YAML documents with
Engine + Default-Params + Prompt-Prefix + Tool adaptations. Few Engines, many
Recipes — for a new type of task, you write a Recipe, not Java code.

Details: [think-engines](/specs/think-engines) · [recipes](/specs/recipes)

---

## Tech Stack (brief)

- **Brain:** Java 25 / Spring Boot 4 / MongoDB / langchain4j + langgraph4j
- **Web:** TypeScript / Vue 3 / Vite / Tailwind + DaisyUI
- **Mobile:** Capacitor around the Web UI (iOS)
- **CLI:** Java / Picocli / JLine 3 / Lanterna

Clear boundary at the API: Java in the Brain, TypeScript in the Clients.

Binding Stack Reference: java-cli-modulstruktur §1.5.

---

## Limitations

Vancetope is a working environment and Brain — not the final storage for finished
products. What ultimately lives elsewhere goes out via a Connector instead of
languishing in its own administration UI. And, again: no product, no SLA — a
project I build because I enjoy it and it helps me with my work.

---

*See also: [architektur-scopes-clients](/specs/architektur-scopes-clients) · [recipes](/specs/recipes) · [think-engines](/specs/think-engines) · [knowledge-graph](/specs/knowledge-graph) · [kits](/specs/kits) · [addon-system](/specs/addon-system) · [integrationen-externe-systeme](/specs/integrationen-externe-systeme)*
