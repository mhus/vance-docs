---
title: Architektur
nav_order: 4
permalink: /architecture
---

# Architektur
{: .no_toc }

Brain + Clients, das Datenmodell, die Trigger-Pfade.
{: .fs-5 .fw-300 }

## Inhaltsverzeichnis
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Brain + Clients

Der **Brain** (Server) hält den gesamten kognitiven Zustand: Think-Processes,
Task-Bäume, Memory, Knowledge Graph. Er orchestriert LLM-Calls, plant,
schreibt Documents, ruft Server-Tools, spawned Sub-Processes. Er kann
autonom weiterarbeiten, auch wenn kein Client verbunden ist.

Die **Clients** sind die Zugänge zum Brain — keine Views auf dasselbe,
sondern unterschiedliche Aspekte der Interaktion:

| Client | Stack | Rolle |
|---|---|---|
| `vance-foot` | Picocli + JLine 3 + Lanterna | Terminal-Client mit lokalen Tools |
| `vance-face` | Vue 3 + Vite + Tailwind | Web-UI mit Live-Documents (Cortex) |
| `facelift-bridge` | Capacitor + WKWebView | Mobile-Wrapper um die deployte Web-UI |

## Tech-Stack

- **Java 25 + Spring Boot 4** — Brain
- **MongoDB** — Persistenz (Think-Processes, Documents, Settings, Memory)
- **langchain4j / langgraph4j** — LLM-Integration und Orchestrierung
- **TypeScript + Vue 3 + Vite** — Web-UI
- **Capacitor + WKWebView** — Mobile (iOS via `facelift-bridge`)
- **Picocli + JLine 3 + Lanterna** — CLI

## Auslöser (Ursa)

Drei Pfade, die alle dieselbe Action-Hierarchie (Recipe / Script / Workflow)
feuern:

- **Scheduler** — zeitbasiert
- **Ursahooks** — interne Lifecycle-Events
- **Events** — externe HTTP-Calls (Webhooks, IoT, CI)

_Detailseiten folgen._
