---
title: "Vancetope — MCP Server"
parent: Specs
permalink: /specs/mcp-server
---

<!-- AUTO-GENERATED from specification/public/en/mcp-server.md — do not edit here. -->

---
# Vancetope — MCP Server

> Vancetope exposes its **own** tool inventory as an **MCP server** under
> `POST /brain/{tenant}/mcp`. An external MCP client (Claude Code, Cursor,
> any MCP host) connects, calls `tools/list` and `tools/call`, and works with it
> in the Project just as the internal LLM does — the same Tools, the same
> permission chain. Transport is JSON-RPC 2.0 over Streamable HTTP; auth is the
> existing Bearer JWT.
>
> **Distinction:** This is the **server** direction. Vancetope as an MCP-**client**
> (Vancetope calling external MCP servers) is [`mcp-tool-routing.md`](/specs/mcp-tool-routing)
> + [`server-tools.md`](/specs/server-tools). Both share the JSON-RPC envelope
> code ([`McpJsonRpc`](../../repos/vance/server/vance-toolpack/src/main/java/de/mhus/vance/toolpack/core/McpJsonRpc.java)).
>
> **Status:** v1 implemented. Designed for **closed test systems / internal
> networks** — not hardened for internet exposure (no OAuth discovery flow,
> no API key system; see §8).
>
> See also: [`live-ws.md`](/specs/live-ws) · [`permission-system.md`](/specs/permission-system) · [`identity-credentials.md`](/specs/identity-credentials)

---

## 1. Purpose

An external agent should be able to **create and modify** things in Vancetope —
documents, apps (Workbook, Canvasbook), Kits, executions — without having to
document the 71 SPA-oriented REST controllers individually as an agent API.

The insight: Vancetope has already built its agent API. It's called **Tools**, not
REST. The internal Tool interface
([`Tool`](../../repos/vance/server/vance-toolpack/src/main/java/de/mhus/vance/toolpack/Tool.java))
carries the exact MCP schema — `name`, `description`, JSON schema `paramsSchema`,
`invoke`. An MCP server adapter therefore essentially only needs to map two things:

- `tools/list` → the Project's Tool catalog listing
- `tools/call` → a Tool invocation

The external agent thus gets the same scope of action as the internal LLM.
This is intentionally congruent with the fundamental Vancetope idea: **everything is a document,
agent-controllable** — external exposure is not a new API, but a
second door into the same Tool layer.

## 2. Endpoint & Transport

A single endpoint, implemented in
[`McpServerController`](../../repos/vance/server/vance-brain/src/main/java/de/mhus/vance/brain/mcpserver/McpServerController.java):

| Route | Method | Purpose |
|-------|---------|-------|
| `/brain/{tenant}/mcp` | `POST` | JSON-RPC 2.0 frames (see §3) |
| `/brain/{tenant}/mcp` | `GET` | `405 Method Not Allowed` — **no** server-initiated SSE stream is offered (spec-compliant) |

**Transport = MCP "Streamable HTTP".** Each POST carries exactly one JSON-RPC frame
in the body and receives exactly one JSON response (`Content-Type: application/json`).
There is intentionally **no** SSE upgrade response and **no** `Mcp-Session-Id`: the
server is stateless, each POST is self-authenticating via the Bearer.
Server→Client notifications (e.g., `tools/list_changed`) are not part of v1 —
precisely why the synchronous JSON response is sufficient.

The query parameter `projectId` (business name of the Project, not the Mongo ID)
scopes the Tool catalog. If it is missing, the server falls back to the tenant-wide
system Project (`_tenant`,
[`HomeBootstrapService.TENANT_PROJECT_NAME`](../../repos/vance/server/vance-shared/src/main/java/de/mhus/vance/shared/home/HomeBootstrapService.java)).
MCP clients configure a fixed server URL — the query parameter in the
URL is the natural, static place for Project selection:

```
POST /brain/acme/mcp?projectId=showcase
```

## 3. JSON-RPC Methods

The protocol logic is HTTP-independent in
[`McpServerService`](../../repos/vance/server/vance-brain/src/main/java/de/mhus/vance/brain/mcpserver/McpServerService.java).
Four methods are implemented — those an MCP client needs for pure Tool usage:

| Method | Params | Result |
|---------|--------|--------|
| `initialize` | `{protocolVersion?, capabilities?, clientInfo?}` | `{protocolVersion, capabilities:{tools:{listChanged:false}}, serverInfo:{name:"vance-brain", version}}` |
| `notifications/initialized` | — (Notification, no `id`) | HTTP `202`, no body |
| `ping` | — | `{}` |
| `tools/list` | `{}` | `{tools:[{name, description, inputSchema}, …]}` |
| `tools/call` | `{name, arguments}` | `{content:[{type:"text", text}], isError}` |

The MCP revision is `2025-03-26` (reflects the client side in
`McpConnection`). `initialize` **echos** the `protocolVersion` requested by the client
back, if present — the envelope is version-agnostic.

### 3.1 `tools/list`

The catalog comes from
[`ServerToolService.listAll(tenant, project, ctx)`](../../repos/vance/server/vance-brain/src/main/java/de/mhus/vance/brain/servertool/ServerToolService.java)
— this is the server-managed view (built-in beans + configured cascade
`project → _tenant → built-in`). Intentionally **not**
`ToolDispatcher.resolveAll`: client-pushed Foot Tools (`ClientToolSource`) and
Skill script Tools are **not** exposed externally, because they require a
live WS connection with a profile.

For each Tool, the following is mapped: `name` ← `name()`, `description` ← `description()`,
`inputSchema` ← `paramsSchema()`. `paramsSchema()` is already a
JSON schema `object` and is passed through 1:1; an empty or typeless schema
receives the minimal wrapper `{type:"object", properties:{}}` so that strict
clients accept it.

### 3.2 `tools/call`

Invocation runs via
[`ToolDispatcher.invoke(name, arguments, ctx)`](../../repos/vance/server/vance-brain/src/main/java/de/mhus/vance/brain/tools/ToolDispatcher.java)
— **not** directly `tool.invoke`. The Dispatcher is the trust boundary: it
enforces `permissionService.enforce(…, Action.EXECUTE)` (§7), resolves Team Grants,
performs health/cooldown tracking, and enriches error messages with
`troubleshootingHint`.

The [`ToolInvocationContext`](../../repos/vance/server/vance-toolpack/src/main/java/de/mhus/vance/toolpack/ToolInvocationContext.java)
is built per call: `tenantId` from the path/JWT, `projectId` from the
query parameter, `userId` from the authenticated account; `sessionId`/`processId`
are `null` (invocation outside a Think Process).

The flat result `Map` of the Tool is serialized as JSON and wrapped in **one**
text content block: `{content:[{type:"text", text:<json>}], isError:false}`.

## 4. Error Model

Two error channels, cleanly separated:

- **Protocol errors** → JSON-RPC `error` frame with code:
  - `-32700` Parse error (body not valid JSON; `id: null`)
  - `-32601` Method unknown
  - `-32602` `tools/call` without `name`
- **Tool execution errors** (`ToolException` from successful dispatch) →
  **no** JSON-RPC error, but a **successful** response with
  `{content:[{type:"text", text:<message>}], isError:true}`. This is
  MCP convention: the calling client LLM sees the error text and can
  react, instead of getting a protocol abort. Example: a
  `document_locked` error is passed through as `isError:true` content with the
  lock explanation.

## 5. Authentication

Auth is the **existing** Bearer JWT chain — **no** new infrastructure. The
path `/brain/{tenant}/mcp` automatically passes correctly through
[`BrainAccessFilter`](../../repos/vance/server/vance-brain/src/main/java/de/mhus/vance/brain/access/BrainAccessFilter.java):
JWT requirement applies, `TokenType.ACCESS` is accepted, and the filter enforces
`pathTenant == claims.tenantId()` (Tenant isolation is given). The token comes
via `Authorization: Bearer <jwt>`.

For a **non-interactive agent** (no human logging in), the clean way is a
**service account**
(username with `_`-prefix, see [`identity-credentials.md`](/specs/identity-credentials))
with `loginEnabled=true` + password:

```bash
# Get 24h access token:
curl -X POST https://<brain>/brain/<tenant>/access/_showcase \
     -H 'Content-Type: application/json' -d '{"password":"…"}'
# → { "token": "<jwt>", "expiresAtTimestamp": …, "refreshToken": … }
```

The token lives for 24h. The client carries it statically as a Bearer header. A
`REFRESH` token is **rejected** by the filter as a Bearer — the client cannot
refresh itself; after expiration, a new one is minted. (A long-lived
API key system is v2, §8.)

## 6. Client Configuration

Example for an MCP host (Claude Code / Cursor), Streamable HTTP server with
static Bearer:

```json
{
  "mcpServers": {
    "vance": {
      "type": "http",
      "url": "https://<brain>/brain/<tenant>/mcp?projectId=<projekt>",
      "headers": { "Authorization": "Bearer <jwt>" }
    }
  }
}
```

After `initialize`, `tools/list` provides the complete Tool inventory of the Project;
the agent directly calls `document_create`, `workbook_app_create`, `canvasbook_page_create`,
etc.

## 7. Authorization — Where the Boundary Truly Lies

In v1, there is **no** Tool allow-list filter in the MCP server. On a
closed test system, the complete inventory is exposed. This is a
conscious decision, not an oversight:

**A filter that resides as a setting or Tenant document would be self-defeating** —
as soon as the agent has a Tool that writes settings/permissions/`_vance/` documents
(`setting_*`, `permission_grant_*`, `doc_write`), it can lift the
restriction itself. The restriction would be within the access scope of what it is
intended to restrict.

The **effective** boundary lies in two places outside the account's Tool reach:

1. **The permission grants of the calling account.**
   `ToolDispatcher.invoke` enforces `Action.EXECUTE` per call against the
   identity from the `ToolInvocationContext` (see
   [`permission-system.md`](/specs/permission-system)). If `_showcase` is only
   READER/WRITER on a Project (not ADMIN), `permission_grant_*` and
   write access to `_vance/…` (Reserved prefix → ADMIN, rule R4)
   automatically fail — the agent cannot even extend its own rights.
   This is the actual filter, and it is tamper-proof because the
   grants cannot be changed via the account's Tools.
2. **An optional server config allowlist** (`application.yaml`, **never** a
   Tenant document), evaluated in `McpServerService`. The hook is marked in the
   service Javadoc (`toolsList`/`toolsCall`). v2 (§8).

For test operation: `_showcase` receives the rights that the Showcase needs;
later, simply trim the grants — no code change needed, the
enforcement chain already applies.

## 8. Limitations (v1) & Reserved (v2)

- **Only `initialize`/`tools/list`/`tools/call`/`ping`.** No MCP `resources`-,
  `prompts`-, or `sampling`-capabilities. An external agent uses Vancetope Tools,
  not Vancetope resource handles.
- **No server push.** No SSE, no `notifications/tools/list_changed`. A
  client that wants to see Tool changes calls `tools/list` again.
- **No OAuth discovery.** The `401` does not carry a `WWW-Authenticate` header /
  `.well-known/oauth-*` flow. Clients must configure the Bearer statically.
  For internet exposure, the discovery flow would need to be added.
- **No API key system.** Only 24h `ACCESS` token (service account login) or
  out-of-band minted token. Long-lived API keys for service accounts are v2.
- **No Tool result cap.** The internal path truncates large Tool results
  (`ToolResultStorage`); the MCP path passes them to the client uncut. A cap is
  recommended for exposure outside a test system.
- **No JSON-RPC batching.** The body must be a single JSON object
  (`McpJsonRpc.parse` does not accept a top-level array).
