---
title: "Trillian Exposure — The Agent Door"
parent: Specs
permalink: /specs/trillian-exposure
---

<!-- AUTO-GENERATED from llm/specification/trillian-exposure.md (translated from the German specification/public/trillian-exposure.md) — do not edit here. -->

# Trillian Exposure — The Agent Door

> Status: 2026-10-13, Phase 2 (first door). Planning including discarded paths:
> [`planning/trillian-exposure.md`](/specs/trillian-exposure) ·
> Heads: [`trillian-engine.md`](/specs/trillian-engine) §6f ·
> Threads: [`maximegalon-system.md`](/specs/maximegalon-system) ·
> Credentials: [`integration-tokens.md`](/specs/integration-tokens)

## 1. What is Exposed

A Trillian can **expose itself**: become reachable for counterparts under its own, tenant-unique name (`exposedName`). The exposure is a document in its Hub:

```
_user__<account>/_vance/trillian/exposure.yaml
```

```yaml
exposedName: colin           # public name, tenant-unique
description: >-             # what the Directory shows
  Colin — delighted to be talked to.
allowedCounterparts:          # the Gate: Account names (R5 remains untouched)
  - wile.coyote
  - road.runner
headLimit: 3                 # 0 = Nature-Default; can only decrease
idleMinutes: 60               # 0 = Server-Default (1 h)
doors:
  mcp: true                  # the Agents-MCP door
  a2a: false                 # Interop adapter, later
```

**Who exposes:** a human with ADMIN — Tenant-ADMIN, because a Trillian's Hub is an external system project (permission-system R7), and `_vance/...` requires ADMIN (R4). The Trillian itself cannot write its exposure: it is never ADMIN, not even on its own Hub (Service-Account = WRITER) — so a counterpart cannot make it open itself further.

Fail-closed in every form: if the document is missing, defective, or `exposedName` is missing, the Trillian is **not** exposed. The same applies to an **ambiguous** name: if two Trillians have the same `exposedName`, neither is exposed (WARN) — a name that silently points to the first hit in the user list would be worse than one that points to none, and a second account could take over a name by copying. Cache 30 s TTL plus Event invalidation (`RoutedDocumentChangedEvent`) — the door is stateless HTTP, every Pod serves it.

`headLimit`/`idleMinutes` are **wired**, not declarative: the head limit (`TrillianHeadService.ensureHead`) takes `min(headLimit, Nature-Limit)` if > 0 — the Config only **decreases**; the Nature-Limit is the barrier against costs and thread floods and must not be raised by a document that anyone with write access to the Hub can change. The idle window of the sweep (trillian-engine §6f) takes the Config value in minutes if > 0, otherwise the server default (1 h).

## 2. A Protocol Entry Point, Thin Shells

The **protocol entry point** (`TrillianConversationService`) is the only place that creates conversations, writes contributions, and waits. The gates live in the entry point, never in the shell:

- **exposed?** — Name must resolve to an exposed Trillian.
- **door open?** — `doors.mcp`.
- **allowed?** — Caller-Account in `allowedCounterparts`, at request time. Identity is always an Account, never a Config mapping (maximegalon §9).
- **active?** — live Loop; without: honest "agent inactive" (no thread without a head, §6.7 — that the mechanism still catches this is its fallback, not the door's promise).
- **full?** — MultiHead: head limit reached → honest "conversation limit reached" before the thread exists. Additionally, **one caller** holds at most as many open conversations with a Trillian as it has heads (MultiHead, `min(headLimit, Nature-Limit)`) or **5** (SingleHead) — otherwise also "conversation limit reached". Counting is done via Maximegalon (caller's open Discussions with the Trillian), counting and creation are serialized per caller and Trillian on the Pod; across Pods, the limit can be exceeded by at most one conversation per Pod. A **SingleHead** Trillian (adam) is also reachable: the thread lands in its Inbox, its Loop answers it via `inbox_unread` (adam §7). The contribution immediately triggers the self-check, the next heartbeat cycle wakes the Loop — answer after about one minute, usually still in the Long-Poll, otherwise via `agent_read`.

**The gate applies to every call**, not just when opening: `agent_send` and `agent_read` on an ongoing conversation re-check exposed / door open / allowed (`TrillianExposureService.findByAccount` via the thread's account). A revocation — counterpart removed from `allowedCounterparts`, `doors.mcp: false`, document deleted — takes effect immediately on ongoing conversations, including reading. At the latest after the cache TTL on each Pod, immediately on the writing Pod and the Hub Pod.

**The gate replaces R5, it does not loosen it.** No one writes into another account's Inbox here: the entry point checks against the Exposure Config and then creates the thread itself — using the same exceptional path that a human with WRITE permission would take. `Resource.InboxItem` and R5 remain untouched (important for the EE Governor).

- **Size** — a contribution at most 16,384 characters (like any Inbox message, `InboxMessagePostRequest.MAX_BODY_CHARS`), a title at most 200 (like when opening a Discussion via REST). The door is the cheapest way into a model's context and must not be the largest.

Every rejection is an `isError` text with a **stable, greppable Reason**: `agent not exposed`, `agent inactive`, `conversation limit reached`, `conversation not found`, `conversation archived`, `conversation full` (thread's message limit reached), `contribution too long`, `title too long`.

**Rejections do not enumerate anything.** A rejected caller learns no more than `agent_list` shows them: not exposed, door closed, and caller not allowed all respond `agent not exposed`; a conversation that does not exist, is not a conversation of this door, or belongs to another, responds `conversation not found`. The distinction is in the log (`debug`).

**Archived = readable, not writable** (§3.11): Reading survives archiving — the counterpart can still retrieve the final contribution; any write attempt will be rejected. A new concern is a new conversation.

## 3. The Door: `POST /brain/{tenant}/agents`

A **dedicated, thin MCP interface** — no "mcp" in the name needed, MCP is the protocol, not the address. Streamable HTTP, JSON-RPC 2.0 (`initialize`, `tools/list`, `tools/call`), `GET` responds spec-compliant `405` (no SSE stream). Any MCP-capable client (Claude Code, Cursor, pi) docks at `http://<brain>:<port>/brain/<tenant>/agents` with a Bearer token.

**Deliberately not the large MCP server** (`POST /brain/{tenant}/mcp`): that carries the full server tool inventory and is too powerful to expose. The door carries a **fixed mini-catalog** (`TrillianAgentsToolCatalog`) of four extras specifically for this purpose — not real Brain tools, not in the ServerToolRegistry, not reachable by any Recipe or Engine:

| Tool | Purpose |
|------|---------|
| `agent_list` | Directory: the exposed agents with whom **the caller** is allowed to speak via this door (door open, caller allowed) — the list does not reveal to anyone with whom a Trillian otherwise speaks. If it is empty, the response carries a `hint` (no agent allows this account, the owner decides) — without saying whether there are rejecting agents, and without repeating the caller's identity |
| `agent_send` | Open conversation (`name` + `text`, optional `title`) or contribute (`conversationId` + `text`); waits via Long-Poll (`waitMs`, default 20 s, max 55 s) for the head's response. Timeout ⇒ `arrived: false`, retrieve later via `agent_read` |
| `agent_read` | Contributions from cursor (`after` = Message-Id, missing or unknown = all), with Long-Poll |
| `agent_close` | End conversation (`conversationId`) — the explicit end for a counterpart that is finished, instead of just falling silent; remains readable. Closing twice is not an error |

**When a conversation ends:** when the counterpart says so — a farewell in words (the head archives) or `agent_close` —, otherwise after idle time (nothing owed, the head is not working and not waiting for a task, nothing happened for `idleMinutes`). Distinguishing silence from being finished can only be done over time; therefore, it is measured at the head, so that long work does not count as idle time.

**Waiting.** A waiting Read is woken by the thread's Message event on its own Pod — the normal case, a head's response on the same Pod, comes immediately — and re-reads the thread every 2 s for responses written on another Pod. If the conversation ends while a Read is waiting (archive, idle), the waiting also ends — nothing more comes; the response then carries `closed: true`. Every response from `agent_send`/`agent_read` carries `arrived` (something new arrived) and `closed` (the conversation is ended). A caller (per Tenant) holds at most **4** waiting Reads simultaneously; beyond that, a Read responds immediately (`arrived: false`) instead of parking another request thread. The request thread itself continues to be held by waiting (Servlet, no virtual threads) — the limit per caller is the barrier for this.

Trillian contributions carry its **`exposedName`** as `author`, never the internal service account (`_trillian-...`) — the counterpart speaks with the name, the account is the server's business. An unexpected server error returns as a generic `isError` text with a reference ID; the details are only in the log under this ID.

The Trillian is **chosen as a call argument** — one route, not one route per agent. The conversation is a Maximegalon thread: the `conversationId` is the thread ID, there is no second state model. The Trillian's head responds in the thread (head mechanics: trillian-engine §6f); the Long-Poll is the substitute for the missing push channel.

## 4. Auth: Integration Token, Profile `agents`

Standard filter chain: an **Integration Token with profile `agents`** (`TrillianAgentsScopeProfile`) — `requiresProject() = false` (the door is tenant-wide, the target is chosen per call), Surface exactly `POST /agents` + `GET /agents` (the 405 probe is part of this, so that a transport test sees the protocol response, not a filter reject). Fail-closed: The token passes **only** the named routes — Inbox, REST, the large MCP respond 401. Normal ACCESS tokens pass through the door in parallel.

Minting (user themselves, only with ACCESS token):

```bash
curl -s -X POST "http://<brain>:<port>/brain/<tenant>/integration-tokens" \
  -H "Authorization: Bearer $ACCESS" -H 'Content-Type: application/json' \
  -d '{"scopeProfiles":["agents"],"label":"<name>","expiresInDays":365}'
```

**Identity ≠ Client** (§3.10): the token subject **is** the counterpart — always a real user account that has logged in (via login + minting of the Integration Token). A client representing a human (Claude Code, Cursor) is their delegate — the thread shows the human as the author. Account minting for agent identities is **removed**; an autonomous agent without a human would later be a Client Credentials Grant on the [OAuth server](/specs/oauth-server) — outside of v1. A shared team with the Trillian is not a delivery path: `mayDecide` would make all team colleagues' asks decidable — the gate is the Exposure Config, never R5 team proximity.

## 5. Not (yet) Part of Phase 2

- **Account minting for `_agent-*`** — removed: counterparts are real user accounts; identity mapping remains excluded (maximegalon §9).
- **A2A adapter** — Phase 3, optional; `doors.a2a` is prepared.
- ~~**MCP-OAuth-Login at the door**~~ — built, see [oauth-server.md](/specs/oauth-server): `resource={issuer}/agents` results in a token with profile `agents`; the gate remains `allowedCounterparts` (already user-based, applies to OAuth unchanged). The static Integration Token continues to work.
- **Authoring tool** — the Config is a document in the Hub that a Tenant-ADMIN creates via Cortex/REST. A tool that allows the owner to expose their own Trillian without Tenant-ADMIN is deliberately not built.
- **Cross-Tenant** — v1 limit: counterpart is a Tenant member.
