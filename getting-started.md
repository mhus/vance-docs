---
title: Get started
nav_order: 2
permalink: /getting-started
---

# Get started
{: .no_toc }

The fastest path to a running Vance is the prebuilt Docker stack. From a
clean machine to an open Web UI: about five minutes.
{: .fs-5 .fw-300 }

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Prerequisites

- **Docker 24+** with Compose v2 (`docker compose`, not the legacy
  `docker-compose`)
- ~2 GB free RAM
- Outbound HTTPS to Docker Hub (image pulls) and to your LLM provider
  (Anthropic, OpenAI, Gemini, …)

## Quick start

```bash
git clone https://github.com/mhus/vance-startup.git
cd vance-startup
cp .env.example .env

# 1. Start the stack (MongoDB + Brain + Web UI).
docker compose up -d

# 2. First-time setup: create a tenant + user and configure an LLM provider.
docker compose run --rm anus --setup
```

Step 2 launches an interactive one-shot wizard. Answer the prompts and the
container exits when you save. Then open <http://localhost:8080> and log in
with the user you just created.

### What the setup wizard asks for

Have these ready before running `--setup`:

- **Tenant name + title** — e.g. `acme` / `Acme Inc.`
- **First user** — login, display name, email, password
- **LLM provider** — Gemini, OpenAI or Anthropic
- **API key** for the chosen provider
- **Optional: Serper API key** for web research

The wizard writes everything to MongoDB and exits. Re-run it later to add
another tenant or user; existing entries are not overwritten unless you
explicitly change them.

> **Before exposing the stack to anything beyond `localhost`:** edit `.env`
> and change `VANCE_ENCRYPTION_PASSWORD`, `VANCE_INTERNAL_TOKEN` and
> `MONGO_INITDB_ROOT_PASSWORD`. The defaults are intentionally weak so the
> first run is frictionless.

## What you get

| Service | Port | Role |
|---|---|---|
| MongoDB | 27017 | Persistence — think-processes, documents, settings |
| Brain | 9990 | Vance Brain server (REST + WebSocket) |
| Web UI | 8080 | The user-facing app |

All data is kept in named Docker volumes. `docker compose down` keeps it;
`docker compose down -v` resets the stack.

## Optional add-ons

The startup repo ships three additional services, gated by Compose
[profiles](https://docs.docker.com/compose/profiles/) so they don't run
unless you ask:

- **Redis** (`--profile live`) — for multi-pod deployments with cross-pod
  live-WS fan-out. Not needed for a single-pod local stack.
- **mongo-express** (`--profile admin`) — MongoDB browser at
  <http://localhost:9081>.
- **Anus admin shell** (`--profile tools`) — interactive Vance admin CLI.

Details: [vance-startup README](https://github.com/mhus/vance-startup#readme).

## Upgrading

```bash
docker compose pull
docker compose up -d
```

If you've pinned `IMAGE_TAG` in `.env`, bump it first.

## Running from source (developers)

If you want to hack on Vance itself, clone the source repo and build
locally instead of pulling images:

```bash
git clone https://github.com/mhus/vance.git
cd vance/vance-brain
mvn spring-boot:run

# In another terminal:
cd vance/vance-foot
java -jar target/vance-foot.jar chat

# Web UI:
cd repos/vance/client && pnpm install && pnpm --filter @vance/vance-face dev
```

This path requires Java 25, Maven, pnpm and a local MongoDB.

## First assignment

_coming soon._
