#!/usr/bin/env bash
#
# Vance admin one-shot — run ANY anus command against your running stack.
#
#   curl -fsSL https://www.vancetope.com/anus.sh | bash -s -- --sudo "project-kits import -T meridian"
#   curl -fsSL https://www.vancetope.com/anus.sh | bash -s -- --sudo "tenant list"
#   curl -fsSL https://www.vancetope.com/anus.sh | bash            # interactive REPL (login)
#
# Finds the folder install.sh created (.env + docker-compose.yml), makes sure
# the stack is up, and runs anus in a throwaway container joined to the compose
# network — so it reaches both MongoDB and the Brain. Everything after `--` is
# handed to anus verbatim. `--sudo "<cmd>"` runs one command without a login
# prompt; no args drops you into the interactive REPL.

set -euo pipefail

IMAGE="${VANCE_IMAGE:-mhus/vancetope-anus:${IMAGE_TAG:-latest}}"

if [ -t 1 ]; then
  b=$'\033[1m'; red=$'\033[1;31m'; dim=$'\033[2m'; z=$'\033[0m'
else
  b=''; red=''; dim=''; z=''
fi
say() { printf '%s\n' "$*"; }
err() { printf '%s%s%s\n' "$red" "$*" "$z" >&2; }

# ── Locate the folder install.sh wrote ──────────────────────────────────────
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
  say "Run the installer first:  curl -fsSL https://www.vancetope.com/install.sh | bash"
  exit 1
fi
dir="$(cd "$dir" && pwd)"
say "Using: ${b}${dir}${z}"

command -v docker >/dev/null 2>&1 || { err "Docker not found. Is Docker Desktop installed and running?"; exit 1; }

# ── Make sure the stack is up (idempotent) ──────────────────────────────────
say "Ensuring the stack is running…"
( cd "$dir" && docker compose up -d ) || { err "Could not start the stack. Is Docker running?"; exit 1; }

# ── Read the values we need (WITHOUT sourcing — .env is a Docker env-file) ──
env_get() { sed -n "s/^$1=//p" "$dir/.env" | head -n1; }
mongo_user="$(env_get MONGO_INITDB_ROOT_USERNAME)"
mongo_pass="$(env_get MONGO_INITDB_ROOT_PASSWORD)"
mongo_db="$(env_get VANCE_MONGODB_DATABASE)"
network="$(env_get COMPOSE_PROJECT_NAME)"; network="${network:-vance}_default"
mongo_uri="mongodb://${mongo_user:-root}:${mongo_pass:-example}@mongodb:27017/${mongo_db:-vance}?authSource=admin"

# ── Wait for MongoDB (most anus commands need it) ───────────────────────────
say "${dim}Waiting for MongoDB…${z}"
for _ in $(seq 1 40); do
  cid="$(cd "$dir" && docker compose ps -q mongodb 2>/dev/null)" || cid=""
  if [ -n "$cid" ]; then
    st="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$cid" 2>/dev/null)" || st=""
    [ "$st" = "healthy" ] && break
  fi
  sleep 3
done

# ── Run anus (interactive → reattach the real terminal). Args after `--` are
#    passed verbatim; no args → the REPL. --env-file gives it the generated
#    config; we add the Mongo URI and point brain calls at the compose service.
if [ -e /dev/tty ] && (: >/dev/tty) 2>/dev/null; then
  exec docker run --rm -it --network "$network" \
    --env-file "$dir/.env" \
    -e SPRING_PROFILES_ACTIVE=prod \
    -e VANCE_MONGODB_URI="$mongo_uri" \
    -e VANCE_ANUS_BRAIN_HTTPBASE="http://brain:9990" \
    "$IMAGE" "$@" </dev/tty
fi
err "No interactive terminal available. Run this from a real terminal."
exit 1
