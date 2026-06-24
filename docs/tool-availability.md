---
title: "Vance — Tool Availability"
parent: Documentation
permalink: /docs/tool-availability
---

<!-- AUTO-GENERATED from specification/public/en/tool-availability.md — do not edit here. -->

{% raw %}
---
# Vance — Tool Availability

> Model for the **health status of tools** at runtime: when a tool is usable, when it is not, for how long, and why. This is the state layer on which the Agrajag service engine (see [agrajag-engine](/docs/agrajag-engine)) operates. This spec exclusively defines the **data model** and the **read/write paths** — diagnostic logic belongs in agrajag-engine.md.

---

## 1. Three Driving Problems

Today's tool layer only knows "tool call succeeded" vs. "tool call threw an exception". This leads to three recurring pains:

1. **Client tools disappear with the client.** If a Foot client disconnects via WebSocket, `client_file_read` & Co. are gone. The LLM continues to call them, receiving `Unknown tool: client_file_read` — misleading, because the tool is not unknown, but temporarily unreachable.
2. **External services are unreliable.** MCP servers, external HTTP APIs (Jira, Confluence, GitHub) experience outages, rate limits, expired tokens. Today, every call fails with the same generic `ToolException` — the LLM cannot distinguish between "wait 30 s and try again" and "the tool has been broken for 2 h, plan without it".
3. **User permission ≠ tool problem.** If User A does not have write permissions, a 403 is returned. This is not a tool malfunction, but a configuration issue. It must not contaminate the tool's health state and must not trigger an expensive LLM-driven diagnosis every time.

This spec defines the state that allows all three cases to be cleanly mapped.

---

## 2. Model Overview

Three orthogonal axes:

```
Status             OK ⇄ DEGRADED ⇄ DOWN          (whether the tool is usable)
                                ↘
                                  expectedRecoveryAt → automatic RETESTING

Cooldown           a TTL per error signature      (whether to ask Agrajag again)
                   orthogonal to Status

Scope              SESSION / USER / PROJECT / TENANT / GLOBAL
                   who is affected
```

**Status** says: can/should the LLM even see the tool in the next turn.
**Cooldown** says: if a specific error occurs, should we diagnose again or is direct reflection to the LLM sufficient.
**Scope** says: does this affect this Session, this User, this Project, or the whole world.

Status and Cooldown are independent. A tool can have `status=OK` *and* simultaneously a `cooldown(USER_PERMISSION, 24h)` for User Alice — the LLM gets the tool listed, calls it, the backend responds 403, the tool result flows back, no Agrajag spawn.

---

## 3. Vocabulary: Codes and Classifications

Two related enums in `vance-api`. The `code` arises directly from the tool dispatch path (synchronous, programmatic). The `classification` is the LLM diagnosis output of the Agrajag Engine.

### 3.1 Dispatch Codes (`ToolErrorCode`)

| Code | Meaning | Who sets it |
|---|---|---|
| `NOT_REGISTERED` | Tool is not in any source of the Registry | `ToolDispatcher` directly |
| `BACKEND_UNREACHABLE` | Tool is registered, backend does not respond / is gone (Foot disconnected, MCP connection closed, Timeout) | `ClientToolSource` / `McpEndpointTool` |
| `BACKEND_FAILED` | Backend responded, with error — standard tool exception | `ToolDispatcher` / Tool implementation |
| `DISALLOWED` | Tool exists, but Recipe/Profile excludes it | `ContextToolsApi` (Pre-Invocation-Filter) |

### 3.2 Diagnosis Classifications (`ToolHealthClassification`)

Agrajag's output. Determines if and how the Health Doc entry is updated.

| Classification | Description | Health Doc? | Reflected to Caller? |
|---|---|---|---|
| `TECHNICALLY_BROKEN` | Tool is generally down — all users/sessions affected | Yes, `status=DOWN`, Scope appropriate (PROJECT/TENANT/GLOBAL) | Inbox item optional |
| `USER_SPECIFIC_TECHNICAL` | Technical problem only for this user (token expired, account suspended on external platform) | Yes, `status=DOWN`, **Scope=USER** | Inbox item to *that* user |
| `USER_PERMISSION` | User does not have the right (403/Forbidden/Scope-Mismatch) | **No** — not a health issue | Set cooldown, pass original error to LLM |
| `USER_INPUT` | Tool works, but input does not match (schema mismatch, invalid parameters) | **No** | Set cooldown (short), reflect to LLM |
| `INTERMITTENT` | Sporadic — sometimes it works, sometimes it doesn't | Yes, `status=DEGRADED`, short `expectedRecoveryAt` | optional |
| `WORKING` | Probe succeeded — tool is OK | Clears old DOWN entry | — |

The classification is **the vocabulary between Agrajag and the Tool Health Doc** — it is also what is available in the history array for future diagnoses.

---

## 4. Scope Cascade

Tool health is not universal — different tools are affected in different scopes. Lookup follows the cascade from narrow to wide:

```
SESSION   (sessionId, toolName)        Foot-bind-state (client_*-Tools)
   ↓
USER      (userId,  toolName)          User-specific Credentials/Token
   ↓
PROJECT   (projectId, toolName)        MCP server, Project workspace tools
   ↓
TENANT    (tenantId,  toolName)        Tenant-wide Auth/Quota problems
   ↓
GLOBAL    (toolName)                   "Jira Cloud has outage" — all Tenants
   ↓
default   OK
```

The narrowest existing entry wins. When writing, the writer (system code or Agrajag) selects the appropriate scope:

| Tool Class | Typical Scope for Status Updates |
|---|---|
| `client_*` (Foot, IDE-Bridge) | SESSION |
| MCP Tools | PROJECT |
| External Service Tools (Jira, GitHub) with user tokens | USER (for token problems) or PROJECT (for service outage) |
| Service outage of a public API | GLOBAL |
| Tenant-wide configured tools | TENANT |

**Cross-scope combinations are allowed.** Example: Jira Cloud has a global outage (`GLOBAL: status=DOWN`) → the LLM sees the tool as unavailable. In addition, User Alice already has a cooldown due to 403 (`USER, cooldown(USER_PERMISSION)`). Both entries remain independently side-by-side, the manifest render shows the narrower DOWN.

---

## 5. Tool Health Document

```
Collection: tool_health
Doc-Key:    (scope, scopeId|null, toolName)
            — unique compound index

{
  scope: SESSION | USER | PROJECT | TENANT | GLOBAL,
  scopeId: <sessionId | userId | projectId | tenantId>,   # null only for GLOBAL
  toolName: "mcp_search",

  status: OK | DEGRADED | DOWN,
  since: 2026-05-23T14:00,                # status set at
  lastCheckedAt: 2026-05-23T14:02,         # last Agrajag probe or success
  expectedRecoveryAt: 2026-05-23T14:30,    # null when not estimated

  lastDiagnosis: {
    classification: TECHNICALLY_BROKEN,
    note: "MCP server returns 502 since 14:00, gateway timeout pattern",
    by: "agrajag-process-id",
    at: 2026-05-23T14:02
  },

  history: [
    {classification, note, by, at, recoveryAt},   # ringbuffer, last ~20
    ...
  ],

  cooldowns: [
    {
      errorSignature: "http-403",
      userId: "alice" | null,              # null = scope-wide
      nextSpawnAllowedAt: 2026-05-24T14:00,
      hits: 7,
      lastClassification: USER_PERMISSION,
      lastTriggeredAt: 2026-05-23T14:02
    },
    ...
  ],

  createdAt, updatedAt
}
```

**Indexes:**

```
{ scope: 1, scopeId: 1, toolName: 1 }                          unique
{ scope: 1, scopeId: 1, status: 1 }                            list by status
{ toolName: 1, status: 1 }                                     global tool overview
{ "cooldowns.nextSpawnAllowedAt": 1 }                          sweep-ready
```

**Lifetime:** Health Docs are never automatically deleted — history is valuable. Hard delete only via Admin API.

---

## 6. Cooldown Mechanism

### Key

`(toolName, scope, scopeId, userId?, errorSignature)`

- `errorSignature` is a **stable short string** from the dispatch — typically HTTP status + exception class (e.g., `"http-403"`, `"timeout-30s"`, `"connect-refused"`). Defined by the `AgrajagChecker` from the specific error.
- `userId` is only set if the cooldown is user-specific (typically for `USER_PERMISSION`). Otherwise null = scope-wide.
- Bob is never stopped by Alice's `USER_PERMISSION` cooldown — the keys differ.

### Default Cooldowns by Classification

| Classification | Default Cooldown | Backoff on Repetition |
|---|---|---|
| `USER_PERMISSION` | 24 h | constant (rarely changes) |
| `USER_INPUT` | 5 min | constant |
| `USER_SPECIFIC_TECHNICAL` | 15 min | × 2 up to max 24 h |
| `TECHNICALLY_BROKEN` | coupled to `expectedRecoveryAt` | determined from history via Agrajag |
| `INTERMITTENT` | 30 s | × 4 up to max 2 h |
| `WORKING` | clears all entries | — |

During the coalescing check (Agrajag queue) and the cooldown check, the values from the doc are authoritative — defaults are only set on the first entry.

### Auto-Clear on Success

Every successful tool call automatically clears:
- the `cooldowns[]` entry with matching `errorSignature` + `userId` (if userId == current user), and
- if `status != OK` and the successful call matches the narrowest appropriate scope entry → `status=OK`, history push with `WORKING`.

This allows the system to self-correct without active polling cron.

---

## 7. Write Paths

| Path | API | What can be written | When |
|---|---|---|---|
| **System Code (synchronous)** | `ToolHealthService` (Java) — `markUnavailable(scope, key, code, since)`, `markAvailable(...)`, `markIntermittent(...)` | `status` + History push | Binary events: Foot disconnect, MCP connection close, OOM-killed subprocess |
| **AgrajagChecker (sync, no LLM)** | `ToolHealthService.setCooldown(scope, key, signature, classification, duration)` | only `cooldowns[]` | For clearly classifiable tool errors (e.g., `http-403`) — even if no Agrajag spawn occurs |
| **AgrajagEngine (async, LLM)** | Special tools `tool_health_set_unavailable`, `tool_health_set_available`, `tool_health_set_cooldown`, `tool_health_clear` | `status`, `cooldowns[]`, History — everything | After diagnosis turn |
| **Successful Tool Call** | Pre-hook in `ToolDispatcher` | Auto-clear `cooldowns[]` entry + optionally `status=OK` | On every successful call |

The LLM-facing tools (Agrajag variant) carry the audience markers from §8 — other engines cannot call them.

---

## 8. Audience: SAFE_PROBE and Engine Roles

Tool manifests carry two orthogonal markers:

```yaml
ToolManifest:
  name: tool_health_set_unavailable
  safety: SAFE_PROBE                    # non-mutating with respect to external backend
  requiresEngineRoles: [tool-health-writer]
```

Engine Recipes declare their roles:

```yaml
agrajag:
  engine: agrajag
  roles: [tool-health-writer]
  ...
```

The Manifest Builder filters tools with `requiresEngineRoles` — only engines with the appropriate role see them. Thus, `tool_health_set_unavailable` is invisible to Arthur; even if the LLM were to try to call it, it does not exist in the manifest.

Plus: Agrajag has a strict engine-internal rule — in a probe turn, **only** `SAFE_PROBE` tools may be called. `tool_probe_as_user` and `tool_probe_as_system` (see [agrajag-engine §6](/docs/agrajag-engine)) in turn check whether the target tool is `SAFE_PROBE` or at least read-only configurable.

The role concept is generic — Lunkwill (Repair) will later have `roles: [tool-health-writer, repair-actor]`, Prak (Audit) `roles: [audit-reader]`, etc.

---

## 9. Read Path: Manifest Annotation

During the tool manifest build for a specific turn, the builder looks up the cascade for each tool:

```
toolHealthLookup(toolName, sessionId, userId, projectId, tenantId)
  → returns narrowest matching entry or default OK
```

For each tool entry in the manifest:

- `status == OK`: listed normally, no annotation.
- `status == DEGRADED`: listed with description suffix ("intermittent — last failure 2 min ago, retry tolerated").
- `status == DOWN`:
  - if `expectedRecoveryAt > now`: **listed with suffix** ("currently unavailable — expected back at HH:MM"). The tool is visible in the manifest so the LLM knows *that* it exists. Recipe hint says: do not call, plan without it.
  - if `expectedRecoveryAt <= now`: listed **without** suffix (status implicitly `RETESTING` — next call tries it naively, auto-clear on success).
  - if `expectedRecoveryAt == null`: listed with suffix ("unavailable since HH:MM").

Cooldown entries do **not** flow into the manifest annotation — the LLM should use the tool, it will just receive the backend error reflected without Agrajag being spawned.

---

## 10. What This Spec Does Not Govern

- **Diagnosis Logic:** how Agrajag decides which class an error falls into. See [agrajag-engine](/docs/agrajag-engine).
- **Pattern Matching in the Checker:** which HTTP statuses / exception classes map to which code. The rule table is stored as YAML in the Document Cascade (`_vance/agrajag/error-patterns.yaml`) and is Tenant-/Project-tunable — see [agrajag-engine §4.2](/docs/agrajag-engine).
- **Probe Tool Implementation:** how `tool_probe_as_user` internally assumes a user identity. [agrajag-engine §6](/docs/agrajag-engine) + [identity-credentials](/docs/identity-credentials).
- **History Retention:** Ring buffer size for `history[]` is engine default, can be tunable via Tenant setting.
- **Admin UI for Tool Health:** Browser page for manual clear/override — comes after v1, not in this spec.

---

## 11. Relation to Other Specs

- [agrajag-engine](/docs/agrajag-engine) — Diagnosis engine that operates on this state. Defines AgrajagChecker (sync) + AgrajagEngine (async) + Queue + Probe Tools.
- [think-engines §7b](/docs/think-engines) — Service Engine topology, Engine roles concept.
- [recipes §6a](/docs/recipes) — Recipe profiles already feed `allowedToolsRemove`. Health annotation is an additional orthogonal layer above the allow list.
- [mcp-tool-routing](/docs/mcp-tool-routing) — MCP connection close is a standard trigger for system path writing (§7).
- [identity-credentials](/docs/identity-credentials) — User-specific credentials that Agrajag's `tool_probe_as_user` tool uses.
- [session-lifecycle §8](/docs/session-lifecycle) — Foot disconnect is a standard trigger for `client_*` tools on SESSION scope to DOWN.
{% endraw %}
