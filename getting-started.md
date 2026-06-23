---
title: Get started
nav_order: 2
permalink: /getting-started
---

# Get started
{: .no_toc }

This page is a placeholder and will soon be filled in.
{: .fs-5 .fw-300 }

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Prerequisites

- Java 25
- MongoDB (local or via Docker)
- At least one configured LLM provider (Anthropic, OpenAI, Gemini, …)

## Start the brain

```bash
cd vance/vance-brain
mvn spring-boot:run
```

## Connect Foot (CLI)

```bash
cd vance/vance-foot
java -jar target/vance-foot.jar chat
```

## Start the Web-UI

```bash
./wb build face
cd repos/vance/client && pnpm --filter @vance/vance-face dev
```

## First assignment

_coming soon._
