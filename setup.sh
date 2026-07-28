#!/usr/bin/env bash
#
# Vance first-time setup — the same one-liner style as install.sh.
#
#   curl -fsSL https://vance.mhus.de/setup.sh | bash
#
# Run this AFTER install.sh. It configures the running stack: tenant, first
# user and LLM provider. It locates the folder install.sh created, makes sure
# the stack is up, waits for MongoDB, then runs the wizard against it (joining
# the compose network so it can reach MongoDB).
#
# Pass-through args work too, e.g.:
#   curl -fsSL https://vance.mhus.de/setup.sh | bash -s -- --sudo "tenant list"

set -euo pipefail

if [ -t 1 ]; then
  b=$'\033[1m'; red=$'\033[1;31m'; dim=$'\033[2m'; z=$'\033[0m'
else
  b=''; red=''; dim=''; z=''
fi
say() { printf '%s\n' "$*"; }
err() { printf '%s%s%s\n' "$red" "$*" "$z" >&2; }

# ── Locate the folder install.sh wrote (has setup.sh + .env) ────────────────
find_dir() {
  if [ -n "${VANCE_DIR:-}" ] && [ -f "$VANCE_DIR/setup.sh" ]; then printf '%s\n' "$VANCE_DIR"; return 0; fi
  if [ -f "./setup.sh" ] && [ -f "./.env" ]; then printf '%s\n' "."; return 0; fi
  if [ -f "./vance/setup.sh" ]; then printf '%s\n' "./vance"; return 0; fi
  return 1
}

if ! dir="$(find_dir)"; then
  err "Could not find your Vance folder (the one with setup.sh + .env)."
  say "Run the installer first:"
  say "  curl -fsSL https://vance.mhus.de/install.sh | bash"
  say "…or run this from that folder (or its parent)."
  exit 1
fi
say "Using: ${b}$(cd "$dir" && pwd)${z}"

# ── Make sure the stack is up (idempotent) ──────────────────────────────────
say "Ensuring the stack is running…"
( cd "$dir" && docker compose up -d ) || {
  err "Could not start the stack. Is Docker running?"
  exit 1
}

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

# ── Run the wizard (interactive → reattach the real terminal) ───────────────
if [ -e /dev/tty ] && (: >/dev/tty) 2>/dev/null; then
  exec bash "$dir/setup.sh" "$@" </dev/tty
fi
err "No interactive terminal available for the setup wizard."
say "Run it directly instead:  (cd $dir && ./setup.sh)"
exit 1
