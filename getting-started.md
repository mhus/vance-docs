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

## Pick a variant

The [`vance-startup`](https://github.com/mhus/vance-startup) repo ships
two self-contained Docker Compose stacks under separate subdirectories:

| Variant | What's in it | When to pick |
|---|---|---|
| [`minimal/`](https://github.com/mhus/vance-startup/tree/main/minimal) | MongoDB + Brain + Web UI. Setup wizard runs as a one-shot via `./setup.sh`. | **Default for local installs.** Smallest possible footprint. Live-WS cross-pod features are off — single-pod doesn't need them. |
| [`live/`](https://github.com/mhus/vance-startup/tree/main/live) | The above + Redis + mongo-express (profile) + Anus REPL (profile). | Pick this if you want to exercise the live features (multi-tab presence, `documents.changed` push, cross-pod fan-out) or want debug / admin tooling on tap. |

The instructions below use `minimal/`; for `live/` just `cd
vance-startup/live` instead and replace step 2 with
`docker compose run --rm anus --setup` (anus ships as a service there).

## Quick start

```bash
git clone https://github.com/mhus/vance-startup.git
cd vance-startup/minimal
cp .env.example .env

# 1. Start the stack (MongoDB + Brain + Web UI).
docker compose up -d

# 2. First-time setup: create a tenant + user and configure an LLM provider.
#    Spawns vance-anus as a one-shot against the existing compose network.
./setup.sh
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

### Choosing a model

Vance is an agentic system — the model spends a lot of tokens reasoning,
calling tools and writing back. Models that look fine in a chat UI can
collapse under that load. Rough current picture (mid-2026):

| Model | Verdict |
|---|---|
| **GLM-5.2** | **Top recommendation.** Strong tool-use, long context, no licensing friction for agentic workloads. |
| **DeepSeek V4** | Strong choice. Comparable quality to GLM-5.2, very competitive pricing. |
| **Gemini 3.x Pro / Flash** | Solid. Flash is good for the fast-tier alias, Pro for analyze/deep. Wizard preset. **Stick to 3.x — 2.5 is shaky under agentic load.** |
| **OpenAI GPT-4o / o-series** | Solid. Wizard preset. |
| **Anthropic Claude** | Wizard preset, **but read Anthropic's Usage Policy and Commercial Terms first** — they impose restrictions on autonomous-agent use cases that some Vance workflows fall under. Not recommended for unattended production agents unless you've confirmed your use case is covered. |
| **Gemma 4** | The realistic minimum. Works, but expect occasional tool-call failures and weaker long-context reasoning. Use only if you have a hard self-hosting requirement. |
| **Qwen 3.5** | **Not recommended.** Inconsistent tool-call behaviour and instruction-following under Vance's load patterns. |

The wizard ships presets for **Gemini, OpenAI and Anthropic**. For
**GLM-5.2, DeepSeek and self-hosted models** (Gemma via Ollama etc.),
finish the wizard with any provider, then switch the active provider in
the Web UI under Settings → AI, or pre-seed it with
`confidential/init-settings.yaml` in the source repo.

> **Before exposing the stack to anything beyond `localhost`:** edit `.env`
> and change `VANCE_ENCRYPTION_PASSWORD`, `VANCE_INTERNAL_TOKEN` and
> `MONGO_INITDB_ROOT_PASSWORD`. The defaults are intentionally weak so the
> first run is frictionless.

## What you get

| Service | Port | `minimal/` | `live/` |
|---|---|---|---|
| MongoDB | 27017 | ✓ | ✓ |
| Brain | 9990 | ✓ | ✓ |
| Web UI | 8080 | ✓ | ✓ |
| Redis (live-WS) | 6379 | — | ✓ |
| mongo-express (profile: `admin`) | 9081 | — | opt-in |
| Anus REPL (profile: `tools`) | — | — | opt-in |

All data is kept in named Docker volumes. `docker compose down` keeps it;
`docker compose down -v` resets the stack.

Both variants reuse the same Compose project name (`vance`), so switching
between them preserves the MongoDB volume — start with `minimal/`, move to
`live/` later without re-running the setup wizard.

## Optional add-ons (live/ only)

In the `live/` variant, two services are gated by Compose
[profiles](https://docs.docker.com/compose/profiles/) so they don't run
unless you ask:

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
