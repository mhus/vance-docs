---
title: "Upgrading — updates on purpose"
parent: How-tos
nav_order: 9
permalink: /howtos/upgrading/
---

# Upgrading — updates on purpose
{: .no_toc }

Your stack does not upgrade itself. Since 0.4.1, a stack from the setup
wizard is **pinned**: `IMAGE_TAG` in `.env` names the exact version the
wizard rendered it from, and nothing pulls a different version behind your
back. This page is the full walkthrough of the update paths — the short
version lives in [Get started](/getting-started/#upgrading).
{: .fs-5 .fw-300 }

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

## Check what you run

The pin is plain text in `.env`:

```bash
grep '^IMAGE_TAG' ~/.vancetope/.env
```

No `IMAGE_TAG` line (a stack from before 0.4.1)? Then the stack follows
whatever `latest` is on the registry — see [Pick up the pin](#pick-up-the-pin)
below.

## Update a pinned stack

`docker compose pull` alone does **not** move a pinned stack to a new
version — it re-pulls the *pinned* one. Upgrading is a deliberate wizard
re-run from the **new** image. The wizard bumps the pin and re-renders
`docker-compose.yml` and `.env` with the current template (your previous
answers are pre-filled from the existing `.env`), then you roll:

```bash
cd ~/.vancetope
docker run --rm -it -v "$PWD:/data" \
  mhus/vancetope-anus:<new version> --setup-docker-compose
docker compose pull && docker compose up -d
```

The stack comes back up and the new brain migrates the MongoDB data
automatically while booting — no separate migration step. Available versions
are on the [Releases page](https://github.com/mhus/vance/releases).

The tenant/user/LLM setup does **not** need a re-run: it lives in MongoDB, and
the wizard's compose pass does not touch it.

## Pick up the pin

Stacks created before 0.4.1 have no pin — they were built to follow `latest`.
That stops with the first wizard re-run from a **release** image: the pin is
written, and from then on the stack follows the pinned-version path above.
Until you do, every `docker compose pull && docker compose up -d` still moves
you to whatever `latest` currently is.

## The rolling channel, on purpose

If you *want* automatic updates, say so explicitly: re-run the wizard and
pick `latest` for the **image tag** (expert mode, item 16). The pin then stays
`latest`, and

```bash
docker compose pull && docker compose up -d
```

alone is the whole update. Re-run the wizard from the new image only when a
release note says the generated files changed — the stack keeps running
either way.

## Install a specific version up front

The installer accepts the tag on the `bash` side of the pipe, so a fresh
machine starts pinned instead of switching later:

```bash
curl -fsSL https://www.vancetope.com/install.sh | IMAGE_TAG=0.4.1 bash
```

## Downgrades

Pulling an older version follows the same flow — re-run the wizard from the
older image, `pull && up -d`. But the brain does not *un*-migrate data: a
database already written by a newer version may contain things the older one
does not understand. Treat a downgrade as a recovery tool for a known-bad
release, not as a routine, and check the release notes first.

## Updating the clients

The server stack is one half; the clients on your machine have their own
update path:

- **Homebrew (macOS, Linux):** `brew upgrade vancetope` (CLI) and
  `brew upgrade --cask vancetope-desktop` (desktop app) — both formulas are
  rewritten on every release.
- **Without Homebrew:** grab the new `vancetope-<version>.jar` or the
  self-contained bundle for your platform from the
  [Releases page](https://github.com/mhus/vance/releases) and replace the old
  one. The CLI talks to whatever Brain you point it at, so an older client on
  a new server is usually fine — but the client of the matching release is
  the tested combination.
