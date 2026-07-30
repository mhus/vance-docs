#!/usr/bin/env bash
#
# Vance first-time setup — the same one-liner style as install.sh.
#
#   curl -fsSL https://vance.mhus.de/setup.sh | bash
#
# Run this AFTER install.sh. It configures the running stack: tenant, first
# user and LLM provider. It finds the folder install.sh created (which holds
# .env + docker-compose.yml), makes sure the stack is up, waits for MongoDB,
# then runs the wizard in the compose network so it can reach MongoDB.
#
# Self-contained: it does NOT depend on any script inside that folder — the
# wizard only writes .env + docker-compose.yml.
#
# Pass-through args work too, e.g.:
#   curl -fsSL https://vance.mhus.de/setup.sh | bash -s -- --sudo "tenant list"

set -euo pipefail

IMAGE="${VANCE_IMAGE:-mhus/vance-anus:${IMAGE_TAG:-latest}}"

if [ -t 1 ]; then
  b=$'\033[1m'; red=$'\033[1;31m'; dim=$'\033[2m'; z=$'\033[0m'
else
  b=''; red=''; dim=''; z=''
fi
say() { printf '%s\n' "$*"; }
err() { printf '%s%s%s\n' "$red" "$*" "$z" >&2; }

# ── Locate the folder install.sh wrote (has .env + docker-compose.yml) ──────
find_dir() {
  local d
  for d in "${VANCE_DIR:-}" "$HOME/.vancetope" "." "./vance"; do
    [ -n "$d" ] || continue
    if [ -f "$d/.env" ] && [ -f "$d/docker-compose.yml" ]; then
      printf '%s\n' "$d"; return 0
    fi
  done
  return 1
}

if ! dir="$(find_dir)"; then
  err "Could not find your Vance folder (with .env + docker-compose.yml)."
  say "Run the installer first:"
  say "  curl -fsSL https://vance.mhus.de/install.sh | bash"
  say "…or run this from that folder (or its parent)."
  exit 1
fi
dir="$(cd "$dir" && pwd)"
say "Using: ${b}${dir}${z}"

command -v docker >/dev/null 2>&1 || { err "Docker not found. Is Docker Desktop installed and running?"; exit 1; }

# ── Make sure the stack is up (idempotent) ──────────────────────────────────
say "Ensuring the stack is running…"
( cd "$dir" && docker compose up -d ) || { err "Could not start the stack. Is Docker running?"; exit 1; }

# ── Read only the values we need — WITHOUT sourcing. The .env is a Docker
#    env-file, not shell: values may contain spaces (e.g. BRAIN_JAVA_OPTS), so
#    `. .env` would try to run them as commands. ───────────────────────────────
env_get() { sed -n "s/^$1=//p" "$dir/.env" | head -n1; }
mongo_user="$(env_get MONGO_INITDB_ROOT_USERNAME)"
mongo_pass="$(env_get MONGO_INITDB_ROOT_PASSWORD)"
mongo_db="$(env_get VANCE_MONGODB_DATABASE)"
network="$(env_get COMPOSE_PROJECT_NAME)"; network="${network:-vance}_default"

# ── Wait for MongoDB to become healthy before configuring ───────────────────
say "${dim}Waiting for MongoDB to become ready…${z}"
ready=""
for _ in $(seq 1 40); do
  cid="$(cd "$dir" && docker compose ps -q mongodb 2>/dev/null)" || cid=""
  if [ -n "$cid" ]; then
    st="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$cid" 2>/dev/null)" || st=""
    if [ "$st" = "healthy" ]; then ready=1; break; fi
  fi
  sleep 3
done
[ -n "$ready" ] || say "${dim}(still starting — trying anyway; re-run if it can't connect)${z}"

mongo_uri="mongodb://${mongo_user:-root}:${mongo_pass:-example}@mongodb:27017/${mongo_db:-vance}?authSource=admin"

args=("$@")
[ ${#args[@]} -gt 0 ] || args=(--setup)

# ── Run the wizard (interactive → reattach the real terminal) ───────────────
# --env-file lets Docker parse the .env correctly (spaces and all); we layer
# the constructed Mongo URI + Spring profile on top.
if [ -e /dev/tty ] && (: >/dev/tty) 2>/dev/null; then
  exec docker run --rm -it --network "$network" \
    --env-file "$dir/.env" \
    -e SPRING_PROFILES_ACTIVE=prod \
    -e VANCE_MONGODB_URI="$mongo_uri" \
    -e VANCE_ANUS_BRAIN_HTTPBASE="http://brain:9990" \
    "$IMAGE" "${args[@]}" </dev/tty
fi
err "No interactive terminal available for the setup wizard."
say "Run it from a real terminal (not a non-interactive pipe)."
exit 1
