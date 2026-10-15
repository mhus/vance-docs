---
title: "Vancetope — MCP Project Access"
parent: Specs
permalink: /specs/mcp-project-access
---

<!-- AUTO-GENERATED from llm/specification/mcp-project-access.md (translated from the German specification/public/mcp-project-access.md) — do not edit here. -->

# Vancetope — MCP Project Access

> The **second MCP door**: project-specific, config-regulated surface for
> external agents under `POST /brain/{tenant}/mcp/{project}` — the
> intentionally narrow counterpart to the [global MCP server](/specs/mcp-server),
> which exposes the full tool inventory. Two doors, two trust models, separate
> endpoints; neither replaces the other.
>
> **Status:** Phase 1 implemented (2026-10-08). Implementation documentation:
> [`readme/mcp-project-access.md`](/specs/mcp-project-access),
> Setup How-to: `readme/mcp-project-access-setup.md`.
> Planning and discarded alternatives (Sessions via MCP, Phase 2 flags):
> [`planning/mcp-project-access.md`](/specs/mcp-project-access).
>
> See also: [`integration-tokens.md`](/specs/integration-tokens) (Scope profiles,
> Project Pin) · [`permission-system.md`](/specs/permission-system) (R4, Grants) ·
> [`mcp-server.md`](/specs/mcp-server) (Protocol shell, global door)

---

## 1. Purpose and Trust Model

A Project Admin wants to grant an external agent (e.g., a coding agent like
Claude Code) targeted access to **specific documents** of their Project —
without opening up the full tool surface or even Tenant-wide access.

| | Global `POST /mcp` | Project `POST /mcp/{project}` |
|---|---|---|
| Trust Model | Service Account Grants | Config in Project (Admin) **and** Grants — intersection, never union |
| Tool Inventory | full `ServerToolService`-Cascade | fixed `doc_*`-Allow-List (§4) |
| Target Audience | internal/own agent, full surface | external agent, targeted document access |
| Path Scoping | none (Catalog Project only selectable) | Prefix filter, `_vance/` never writable |
| Config | `application.yaml`-Allowlist (v2, unbuilt) | `_vance/config/mcp-access.yaml` |

**The Config is a ceiling, never a Grant:** Every call additionally runs
through the normal enforcement chain. An incorrect (too broad) Config can only
prevent *less*, never allow more. `mode: rw` + READER-Account = write attempt
fails at the Document write path.

## 2. Endpoint & Transport

```
POST /brain/{tenant}/mcp/{project}   — JSON-RPC 2.0 / Streamable HTTP
GET  /brain/{tenant}/mcp/{project}   — 405 (no SSE-Push, spec-compliant)
```

- `{project}` is the **Business Name** (not a Mongo ID) — consistent with
  `projectId` semantics everywhere. Unknown Project fails at the endpoint gate.
- Transport like global: one JSON-RPC frame per POST, synchronous JSON response,
  stateless, no `Mcp-Session-Id`. The protocol logic shares the shell with the
  global door (`McpProtocol`); methods: `initialize`, `ping`, `tools/list`,
  `tools/call` (§3 [mcp-server.md](/specs/mcp-server)).
- **Endpoint Gate:** `READ` on `Resource.Project(tenant, project)` — also
  checks the Project Pin for Integration Tokens.

## 3. Config: `_vance/config/mcp-access.yaml`

Read via the **Document Cascade** (project → `_tenant`): an operator can
pre-regulate all Projects of a Tenant from the System Project, an individual
Project overrides locally. Located under `_vance/` → write access requires
ADMIN (Rule R4) — an ordinary WRITER cannot modify the rules that restrict them.

```yaml
default: deny                        # Mandatory value; documents the intent
access:
  - name: claude-code
    token: "<integration-token-id>"  # optional; only this Integration Token
    mode: rw                         # ro | rw
    paths: ["spec/", "readme/"]      # Prefixes (without leading '/'); empty = entire Project
  - name: claude-code-oauth
    oauth: true                      # optional; true = only OAuth Grants, false = all except them
    users: [mike]                    # optional; only these Accounts (empty = everyone)
    mode: rw
```

- **First-match-wins** in document order; no match = deny.
- **Who** matches an Entry is determined by three filters, all of which **must**
  match: `token`, `oauth`, `users`. An Entry without filters applies to any
  authenticated Caller — humans, Integration Tokens, and OAuth Grants. Admins
  place specific Entries at the beginning.
- `token` references the Integration Token **ID** (`jti`-registry line, never
  the secret value). An OAuth Grant is only created upon consent, its ID is not
  known to the Admin beforehand — hence `oauth`/`users` instead of an ID.
- `token` together with `oauth: true` matches no one and is a loading error
  (file considered defective → deny). `users` also applies to Integration Tokens.
- A **written but invalid** filter is also a loading error: a non-empty `users`
  list without a valid entry (`[~]`, `[42]`, `[""]`), an empty `users` string,
  a `token` that is not a non-empty string. Otherwise, the Entry would silently
  open for everyone. Only a missing key or explicitly `users: []` means "everyone".
- During OAuth Consent for this door, the same check is performed beforehand:
  without a matching Entry, no Grant is created ([oauth-server.md](/specs/oauth-server) §6).
- **Fail-closed everywhere:** missing file, defective file, a Caller not matched
  by any Entry → deny. The MCP client sees a normal protocol response (empty
  catalog or `isError:true` text), never a 5xx.
- **Cache & Revocation:** Memoization per `(tenant, project)`, invalidated
  by `RoutedDocumentChangedEvent`; a `_tenant` change clears the entire Tenant.
  Since the router only sends Project changes to writers and lease holders, but
  the surface is stateless on every pod, a **TTL of 30 s** additionally limits
  the revocation latency.

## 4. Tool Surface (Phase 1: Documents)

**Fixed Allow-List**, not extensible via Config — the surface is *Documents*,
not a Tool Catalog loophole:

| Mode | Tools |
|---|---|
| `ro` | `doc_read`, `doc_read_lines`, `doc_list_in_folder`, `doc_list_folders`, `doc_grep_path` |
| `rw` | ro + `doc_write`, `doc_edit`, `doc_replace_lines` |

Intentionally **not** included: `doc_delete`, `doc_move`, `doc_copy`, `doc_create`
(destructive/structural — separate Config flags in a subsequent phase).

Hard rules of the surface (`McpProjectService.violationOf`):

1. **Path-only addressing:** `id`/`documentId` are rejected — `doc_read` by ID
   only checks the Tenant, path confinement would be circumvented.
2. **Project Pin:** a `projectId` argument that deviates from the route's Project
   is rejected.
3. **Path Prefixes:** a path-filtered Entry requires an explicit path `pathPrefix`
   scope **within** its prefixes for each call; every passed path parameter
   (including aliases) is checked. Entire-Project wildcard `*` is rejected for
   path-filtered Entries (fail-closed against default scopes of listing tools).
4. **`_vance/` is never writable** — hardcoded, not configurable, otherwise an
   `rw`-Entry with an empty prefix could rewrite its own access Config. Leading
   slashes are removed as in `DocumentService` (`//_vance/…` would otherwise
   pass unchecked). Double-secured: the Document write path already requires
   ADMIN for `_vance/` (R4).
5. **If-Match is the norm** (`doc_write.expectedContentHash`) — Live-Collab with
   the Web UI uses the same merge/lock mechanism as for the internal agent;
   `lockedFor: [AI]` automatically blocks the external agent (`document_locked`
   as a tool error).

## 5. Authorization — Three Layers, One Direction

1. **Filter Chain + Endpoint Gate:** JWT/Integration Token →
   `SecurityContext` → `READ` on the target Project.
2. **Config Filter:** Entry match, `ro`/`rw`, path prefixes — only narrowing.
3. **Tool-side Enforcement:** the write tools enforce per-document `WRITE`
   themselves (`KindToolSupport.enforceDocWrite`, R3/R4). Intentionally
   **not** through the `ToolDispatcher` (whose EXECUTE gate would already
   deny read access for READER); the Shooty-TOOL-Point only covers the
   exec-run family and only calls with Process context — neither applies
   to this process-less document surface.

## 6. Auth & Token: Scope Profile `mcp-project`

Two credentials with the same profile: an **OAuth login** of the MCP client
(`resource={issuer}/mcp/{project}`, [oauth-server.md](/specs/oauth-server)) or,
statically configured, an Integration Token.

No new token system — reuse of [Integration Tokens](/specs/integration-tokens)
with the `mcp-project` profile (long-lived, revocable, project-pinned):

```
surfaces: POST /mcp/*, GET /mcp/*    (Project route, relative to Tenant root)
```

**Route separation is the Surface declaration, not the Project Pin:** the
global `POST /mcp` does not match any profile pattern and is not declared
in any profile — unreachable for an `mcp-project`-token in the filter
(fail-closed via `IntegrationTokenAuthService`). A human's ACCESS Bearer
cannot represent the separation (Grants are resource-based, never route-based)
— whoever is *only* allowed on the project-specific surface mandatorily
receives an Integration Token with this profile; whoever also needs the
global door receives a deliberately second credential. Two trust models,
two credentials.

## 7. Limitations (Phase 1)

- **Only Document Tools** (§4); destructive operations and Sessions/Chat via MCP
  are subsequent phases (Sessions explicitly deferred — Think-Spawns, Quotas,
  and the WS topic first, see Planning §8).
- **No Tool Result Cap** like on the global path; `doc_read` truncates at
  50,000 characters, so Phase 1 is uncritical.
- **Revocation Latency:** Revocation occurs via cache event **or** TTL —
  in the worst case (unnotified pod) 30 s.
