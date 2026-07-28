---
title: Get started
nav_order: 2
permalink: /getting-started
---

# Get started
{: .no_toc }

The fastest path to a running Vance is the prebuilt Docker stack. You don't
need any developer tools — no Java, Node, Maven or even git. Just Docker
Desktop. From a clean machine to an open Web UI: a few minutes once Docker
is installed.
{: .fs-5 .fw-300 }

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Before you start

You only need **Docker** — nothing else. This runs fine on a spare or older
machine with no development setup on it.

- **macOS / Windows:** install [Docker Desktop](https://www.docker.com/products/docker-desktop/),
  open it once, and wait for the whale icon in the menu bar to go steady. It
  bundles everything (`docker compose` included). Works on both **Apple
  Silicon and older Intel Macs** — the images are multi-arch.
- **Linux:** Docker Engine 24+ with the Compose v2 plugin (`docker compose`,
  not the legacy `docker-compose`).
- **~2 GB free RAM**, and outbound HTTPS to Docker Hub (image pulls) and to
  your LLM provider (Anthropic, OpenAI, Gemini, …).

The only terminal you need is the one that comes with your setup: **Terminal.app**
on a Mac, your usual shell on Linux, or — on **Windows** — the **WSL2** terminal
(e.g. Ubuntu). Docker Desktop on Windows runs on WSL2 anyway, so open that shell
and use the exact same commands below; the one-liners are bash. (There's no
native `cmd`/PowerShell installer — WSL2 is the intended Windows path.)

## Quick start

Two commands on a machine with Docker running — no git, no download:

```bash
# 1) Install & start the stack (MongoDB + Brain + Web UI)
curl -fsSL https://vance.mhus.de/install.sh | bash

# 2) Configure it — create a tenant + user and pick an LLM provider
curl -fsSL https://vance.mhus.de/setup.sh | bash
```

**Step 1** runs the setup wizard straight from the official Docker image (a few
questions — language, port, local vs. external access, plus secrets it
generates for you), writes a `vance/` folder with your `docker-compose.yml` and
`.env`, and starts the stack. **Step 2** finds that folder, waits for the stack
to come up, and runs the tenant/user/LLM wizard against it. Both are
interactive — just answer the prompts.

Then open the URL it prints (default <http://localhost:8080>) and log in with
the user you just created.

**Rather not pipe a script into your shell?** The one-liners are thin wrappers —
do the same by hand, it only needs Docker:

```bash
docker run --rm -it -v "$(pwd)":/data mhus/vance-anus:latest --setup-docker-compose
cd vance
docker compose up -d
./setup.sh
```

### What `./setup.sh` asks for

The `./setup.sh` step creates your tenant, first user and LLM provider. Have
these ready:

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

> **Secrets & exposure:** the setup wizard generates strong secrets for you
> (encryption password, internal token, Mongo password) — no weak defaults to
> change. To reach Vance from beyond `localhost`, pick the wizard's **external
> URL** option: cookies then get the `Secure` flag and the bundled Caddy can
> auto-provision TLS for your domain.

## What you get

The core stack is always MongoDB + Brain + Web UI. The wizard's **expert
options** can add Redis (for live-collaboration features) and debug UIs.

| Service | Default port | When |
|---|---|---|
| Web UI | 8080 | always |
| Brain (REST/WS) | 9990 | always (host-exposed only if you opt in) |
| MongoDB | 27017 | always (host-exposed only if you opt in) |
| Redis (live-WS) | 6379 | expert option |
| mongo-express / redis-commander (debug UIs) | 9081 / — | expert · `--profile tools` |

Ports and which services are exposed depend on your wizard answers. All data
lives in named Docker volumes: `docker compose down` keeps it,
`docker compose down -v` resets the stack.

## Expert options

Re-run the installer (or the direct `docker run … --setup-docker-compose`) and
turn on **Expert mode** for extra toggles: Redis for live features, debug UIs
(mongo-express, redis-commander) behind `docker compose --profile tools up -d`,
an Anus admin service, exposing the Brain/Mongo/Redis host ports, and the image
tag. Your previous answers are pre-filled from the existing `.env`.

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
