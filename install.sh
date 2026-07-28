#!/usr/bin/env bash
#
# Vance installer — one command, no git, no build tools.
#
#   curl -fsSL https://vance.mhus.de/install.sh | bash
#
# Runs the Vance setup wizard straight from the vance-anus Docker image. The
# wizard scaffolds docker-compose.yml + .env + setup.sh into a target folder;
# from there `docker compose up -d` + `./setup.sh` bring the stack up. The only
# requirement is Docker (Docker Desktop on macOS/Windows, Engine on Linux).
#
# Options (all optional):
#   First argument   target directory (default: ./vance)
#   VANCE_DIR=…       same as the argument
#   VANCE_IMAGE=…     override the setup image (default: mhus/vance-anus:latest)
#   IMAGE_TAG=…       override just the tag

set -euo pipefail

IMAGE="${VANCE_IMAGE:-mhus/vance-anus:${IMAGE_TAG:-latest}}"
TARGET_DIR="${1:-${VANCE_DIR:-vance}}"

# Colours only when writing to a real terminal.
if [ -t 1 ]; then
  b=$'\033[1m'; amber=$'\033[33m'; red=$'\033[1;31m'; dim=$'\033[2m'; z=$'\033[0m'
else
  b=''; amber=''; red=''; dim=''; z=''
fi
say() { printf '%s\n' "$*"; }
err() { printf '%s%s%s\n' "$red" "$*" "$z" >&2; }

say ""
say "${b}Vance — setup${z}"
say "${dim}A workspace for AI. No git, no build tools — just Docker.${z}"
say ""

# ── Preflight ──────────────────────────────────────────────────────────────
if ! command -v docker >/dev/null 2>&1; then
  err "Docker is not installed."
  say "Install Docker Desktop (macOS/Windows) or Docker Engine (Linux):"
  say "  https://www.docker.com/products/docker-desktop/"
  exit 1
fi
if ! docker info >/dev/null 2>&1; then
  err "Docker is installed but not running."
  say "Start Docker Desktop (wait for the whale icon to settle), then re-run."
  exit 1
fi
if ! docker compose version >/dev/null 2>&1; then
  err "The Docker Compose v2 plugin ('docker compose') is missing."
  say "Docker Desktop bundles it; on Linux install the docker-compose-plugin."
  exit 1
fi

# ── Reattach an interactive terminal (survives 'curl … | bash') ─────────────
# Piped into bash, this script's own stdin is the pipe — not your keyboard.
# The wizard is interactive, so point its stdin at the real terminal.
if [ -e /dev/tty ] && (: >/dev/tty) 2>/dev/null; then
  tty_in=/dev/tty
else
  err "No interactive terminal available (needed for the setup wizard)."
  say "Run the wizard directly in a terminal instead:"
  say "  docker run --rm -it -v \"\$(pwd)\":/data ${IMAGE} --setup-docker-compose"
  exit 1
fi

# ── Target directory ────────────────────────────────────────────────────────
mkdir -p "$TARGET_DIR"
target_abs="$(cd "$TARGET_DIR" && pwd)"
say "Setup folder: ${b}${target_abs}${z}"
say ""
say "${dim}Pulling the setup image on first run — this can take a minute.${z}"
say ""

# ── Run the compose-setup wizard ────────────────────────────────────────────
# Writes docker-compose.yml + .env + setup.sh into the mounted folder and
# prints the exact next steps (including the URL for your chosen port).
docker run --rm -it -v "${target_abs}:/data" "$IMAGE" --setup-docker-compose <"$tty_in"

# ── Start the stack ─────────────────────────────────────────────────────────
say ""
say "Starting the stack (docker compose up -d)…"
( cd "$target_abs" && docker compose up -d )

# ── Hand off to the configuration step ──────────────────────────────────────
say ""
say "${amber}Installed and starting.${z} Now configure your tenant + first user:"
say ""
say "  ${b}curl -fsSL https://vance.mhus.de/setup.sh | bash${z}"
say ""
say "${dim}(run it from here — or, equivalently: cd ${TARGET_DIR} && ./setup.sh)${z}"
say "Afterwards, open the URL it prints (default ${b}http://localhost:8080${z})."
say ""
