---
title: Architecture
nav_order: 4
permalink: /architecture
---

# Architecture
{: .no_toc }

Brain, clients, admin shell, the trigger paths.
{: .fs-5 .fw-300 }

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Brain + clients

The **Brain** (server) holds the entire cognitive state: think-processes,
task trees, memory, knowledge graph. It orchestrates LLM calls, plans,
writes documents, calls server tools, spawns sub-processes. It can keep
working autonomously even when no client is connected.

The **clients** are the entry points to the brain — not views on the same
thing, but distinct aspects of the interaction:

| Client | Stack | Role |
|---|---|---|
| `vance-foot` | Picocli + JLine 3 + Lanterna | Terminal client (`vancetope`) — agent tools on local files and processes behind a sandbox, MCP/REST tool packs (global + per project) |
| `vance-face` | Vue 3 + Vite + Tailwind | Web-UI with live documents (Cortex) |
| `facelift-bridge` | Capacitor | iOS/Android wrapper around the deployed Web-UI, one isolated WebView per account |
| `facelift-desktop` | Electron | macOS desktop app — agent tools on local files behind a sandbox, and an MCP host: local MCP servers from `~/.vancetope/mcp.json` (global + per project, trust dialog, per-account credentials) are handed to the agent as tool packs |
| `vance-capture` | WebExtension | Browser extension (Chrome, Firefox, Safari): save links, import the displayed page |

MCP runs in both directions. Outward, the two tool-carrying clients
(`vance-foot`, `facelift-desktop`) start local MCP servers and hand their tools
to the agent. Inward, other agents reach the Brain over MCP — a tenant door, a
project door and an agents door, all behind the built-in OAuth 2.1 server.
Overview: [Clients & integrations](/connect/).

## Admin shell (anus)

`vance-anus` is the operator's shell — a password-gated Spring Shell REPL for
setup and maintenance: tenants, users, teams, projects, settings, kits,
sessions, SSO. It is **not** a Brain client: it talks to MongoDB directly through
the shared service layer and never starts the AI stack, so it works when no
Brain is running. The first-run setup wizard (`anus --setup`) lives here too
and can be driven by an agent via YAML on stdin.

## Tech stack

- **Java 25 + Spring Boot 4** — brain
- **MongoDB** — persistence (think-processes, documents, settings, memory)
- **langchain4j / langgraph4j** — LLM integration and orchestration
- **TypeScript + Vue 3 + Vite** — Web-UI
- **Capacitor** — mobile (iOS/Android via `facelift-bridge`)
- **Electron** — macOS desktop app (`facelift-desktop`)
- **Picocli + JLine 3 + Lanterna** — CLI
- **Spring Shell** — admin shell (`vance-anus`)

## Triggers (Ursa)

Three paths, all firing the same action hierarchy (recipe / script / workflow):

- **Scheduler** — time-based
- **Ursahooks** — internal lifecycle events
- **Events** — external HTTP calls (webhooks, IoT, CI)

_Detail pages to follow._
