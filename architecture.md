---
title: Architecture
nav_order: 4
permalink: /architecture
---

# Architecture
{: .no_toc }

Brain + clients, the data model, the trigger paths.
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
| `vance-foot` | Picocli + JLine 3 + Lanterna | Terminal client with local tools |
| `vance-face` | Vue 3 + Vite + Tailwind | Web-UI with live documents (Cortex) |
| `vance-facelift` | Capacitor + WKWebView | Mobile wrapper around the deployed Web-UI |

## Tech stack

- **Java 25 + Spring Boot 4** — brain
- **MongoDB** — persistence (think-processes, documents, settings, memory)
- **langchain4j / langgraph4j** — LLM integration and orchestration
- **TypeScript + Vue 3 + Vite** — Web-UI
- **Capacitor + WKWebView** — mobile (iOS via `vance-facelift`)
- **Picocli + JLine 3 + Lanterna** — CLI

## Triggers (Ursa)

Three paths, all firing the same action hierarchy (recipe / script / workflow):

- **Scheduler** — time-based
- **Ursahooks** — internal lifecycle events
- **Events** — external HTTP calls (webhooks, IoT, CI)

_Detail pages to follow._
