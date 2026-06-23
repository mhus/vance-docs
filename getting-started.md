---
title: Loslegen
nav_order: 2
permalink: /getting-started
---

# Loslegen
{: .no_toc }

Diese Seite ist ein Platzhalter und wird bald mit Inhalt gefüllt.
{: .fs-5 .fw-300 }

## Inhaltsverzeichnis
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Voraussetzungen

- Java 25
- MongoDB (lokal oder via Docker)
- Mindestens ein konfigurierter LLM-Provider (Anthropic, OpenAI, Gemini, …)

## Brain starten

```bash
cd vance/vance-brain
mvn spring-boot:run
```

## Foot (CLI) verbinden

```bash
cd vance/vance-foot
java -jar target/vance-foot.jar chat
```

## Web-UI starten

```bash
./wb build face
cd repos/vance/client && pnpm --filter @vance/vance-face dev
```

## Erster Auftrag

_kommt._
