---
title: "Vancetope — WebSocket Protocol"
parent: Specs
permalink: /specs/websocket-protokoll
---

<!-- AUTO-GENERATED from specification/public/en/websocket-protokoll.md — do not edit here. -->

---
# Vancetope — WebSocket Protocol

> Chat-Frame Wire-Format (`WebSocketEnvelope`) between local clients (CLI, Desktop, Mobile) and the Vancetope Brain. **This document describes only the inner frame** — the outer multi-channel envelope, endpoint topology, and cross-pod routing are in [live-ws](/specs/live-ws). Frames, as described here, are the `payload` field of the `LiveEnvelope` with `channel="session"`.
> See also: [live-ws](/specs/live-ws) (multi-channel wrapper, endpoints, cross-pod tunnel), [architektur-scopes-clients](/specs/architektur-scopes-clients) (Sessions, Client Model), [client-protokoll-erweiterbarkeit](/specs/client-protokoll-erweiterbarkeit) (external clients, Robot, MCP), java-cli-modulstruktur §2.1 (where message classes reside), [identity-credentials](/specs/identity-credentials) (Accounts, OAuth2 → JWT).
> Status: v1 production (Live-WS refactor 06/2026 wraps the format described here into the `LiveEnvelope.session` channel — the inner frame remains unchanged).

---

## 1. Fundamentals

### Connection

- Transport: WebSocket (text frames, JSON payload)
- Default URL: `ws://host:port/brain/{tenant}/ws` or `wss://...` in Production. The Tenant is in the path so the AccessFilter can cross-check path-tenant against JWT-tenant.
- Encoding: UTF-8
- Every frame on this endpoint is a [`LiveEnvelope`](/specs/live-ws) `{channel, sessionId, payload}`; everything described below in this document is the form of the **`payload`** field when `channel="session"`.
- A WebSocket connection can be bound to a maximum of one Session; the binding happens explicitly via `session-create` / `session-resume` after the handshake (see [architektur-scopes-clients](/specs/architektur-scopes-clients) §2). A Session has a maximum of 1 active connection **per User** — with `SessionDocument.allowMultipleClients=true`, connections from different Users coexist in the same Roster (see multi-user-sessions). The Mongo bind remains single-binding; secondary participants only exist in the in-memory `SessionConnectionRegistry`.

### Naming Convention

In contrast to the nimbus protocol, **fully spelled-out keys** are used. Performance is not critical here (personal Think Tool, tens of connections), while readability in logs, generated TypeScript, and protocol debugging is gained.

- **lowerCamelCase** for all field names
- English terms
- No abbreviations in JSON keys (`type` instead of `t`, `data` instead of `d`)
- Timestamps are Unix milliseconds (`long`), fields end with `Timestamp` or `At`
- IDs are strings with typical prefixes: `sess_...`, `usr_...`, `eng_...`, `proj_...`

### Envelope

Every message follows a unified envelope:

```json
{
  "id": "string (optional)",
  "replyTo": "string (optional)",
  "type": "string (required)",
  "data": { ... }
}
```

| Field | Sender | Purpose |
|-------|--------|---------|
| `type` | Sender | Message type (see type catalog) |
| `data` | Sender | Payload, type-specific |
| `id` | Sender of a **request** | Request ID for correlation with response. Unique per connection |
| `replyTo` | Sender of a **response** | Carries the `id` value of the original request |

**Rules:**

- A message without an expected response can omit `id` (fire-and-forget, e.g., status broadcast from server)
- A response must set `replyTo`
- `id` and `replyTo` are not set simultaneously on the same message (either request or response — not both)
- The combination of Connection + `id` must be unique within a Session

---

## 2. Authentication

Authentication happens **during the WebSocket handshake** via a **JWT** (JSON Web Token). There is **no** `login` message on the WebSocket — without a valid JWT, the server rejects the HTTP upgrade request with HTTP 401, so a WebSocket connection is not even established.

The client obtains the JWT via a separate OAuth2/Password flow against the Brain (REST, outside this protocol — see [identity-credentials](/specs/identity-credentials) §2). The WebSocket only knows: "Show JWT or the door stays closed".

### Handshake Request

The client sends the following headers during the HTTP upgrade:

```
GET /brain/acme/ws?profile=foot&name=mikes-laptop HTTP/1.1
Host: brain.local:9990
Upgrade: websocket
Connection: Upgrade
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
X-Vancetope-Profile: foot
X-Vancetope-Client-Version: 0.1.0
X-Vancetope-Client-Name: mikes-laptop
Sec-WebSocket-Key: ...
Sec-WebSocket-Version: 13
```

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization: Bearer <jwt>` | yes | Signed JWT, at least `sub` and `exp` claims |
| `X-Vancetope-Profile` | no (default `web`) | Open string, shape `^[a-z][a-z0-9_-]{0,31}$` |
| `X-Vancetope-Client-Version` | yes | SemVer of the client, for compatibility checks |
| `X-Vancetope-Client-Name` | no | Optional client identifier (logs/UI) |

Headers and query parameters are equivalent — browser clients cannot set custom headers on the WS upgrade and use `?profile=`, `?clientVersion=`, `?name=` as a fallback.

**Profile is an open string, not an Enum.** The server only checks the format. Identity is not validated — what happens with an unknown profile name is solely decided by the Recipe Resolver. The canonical values are maintained in `de.mhus.vance.api.ws.Profiles` as string constants; full form and extensibility see [client-protokoll-erweiterbarkeit](/specs/client-protokoll-erweiterbarkeit) §2.1a.

**Canonical values:**

| Value | Meaning | Local Tools |
|-------|---------|-------------|
| `foot` | Java CLI (`vance-foot`, Picocli + JLine) | Full (Shell, Filesystem) |
| `web` | Browser UI (`@vance/vance-face`, Chat Editor) — Wire-Default | None — Web clients do not register `client-tool-*` |
| `mobile` | PWA / Native App (later) | Restricted |
| `daemon` | Reserved name for `vance-foot -d` headless mode (planned). Currently no special effect | — |

The Web UI is a **restricted** WebSocket client: The **Chat Editor** connects via WS (live stream + steering), all other editors remain REST-only (see `web-ui.md` §3-§4). Web clients **must not** use `client-tool-register`/`client-tool-invoke`/`client-tool-result` — Workspace Tools are exclusively `foot` concern.

Which set of Tools/Manuals/Prompts is attached to a conversation is decided by the **Recipe Profile Block** ([recipes](/specs/recipes) §6a) — Profile is the discriminator for this block.

### JWT Claims

The server validates the signature and `exp` (expiration time). The following are read:

| Claim | Type | Required | Description |
|-------|------|----------|-------------|
| `sub` | string | yes | User/Account ID (`usr_...` or `acc_...`) |
| `exp` | number | yes | Expiration time (Unix seconds) |
| `iat` | number | no | Issued at time |
| `iss` | string | no | Issuer; checked if configured server-side |
| `name` | string | no | Display name of the user |
| `tid` | string | no | Tenant ID (`tnt_...`). Ignored in v1; mandatory in v2+ |

The JWT carries **only** identity. Profile, client version, and client name reside in the handshake headers (or URL query) because they vary per connection and are not part of the identity. Session binding is no longer a handshake concern — it happens explicitly via `session-create` / `session-resume` on the open WebSocket connection.

### Handshake Errors

The server aborts the upgrade with an HTTP status transported in the WebSocket handshake response:

| Status | Cause |
|--------|-------|
| **401 Unauthorized** | `Authorization` header missing, token invalidly signed, token expired, issuer mismatch |
| **400 Bad Request** | `X-Vancetope-Client-Version` missing; or `X-Vancetope-Profile` violates the shape pattern |
| **403 Forbidden** | JWT valid, but account blocked or tenant not allowed |

The client recognizes the error situation by the HTTP status — a WebSocket connection is not established in these cases.

### Server → Client: `welcome`

First message the server sends after a successful handshake. The client **must not** send messages before this (except `ping` frames are not answered by the server until `welcome` — but this is an edge case).

```json
{
  "type": "welcome",
  "data": {
    "userId": "usr_42",
    "displayName": "Mike",
    "tenantId": "tnt_default",
    "server": {
      "version": "0.1.0",
      "protocolVersion": 1,
      "pingInterval": 30,
      "capabilities": ["engines", "memory", "workflows"]
    }
  }
}
```

The connection starts **without** a bound Session — before the client sends a session-required command, it must bind a Session via `session-create` or `session-resume`.

| Field | Type | Description |
|-------|------|-------------|
| `userId` | string | Internal User ID (from JWT `sub`) |
| `displayName` | string | Display name (from JWT `name` or account profile) |
| `tenantId` | string | Always `tnt_default` in v1, reserved for v2+ |
| `server.version` | string | SemVer of the Brain |
| `server.protocolVersion` | int | Integer version of the wire protocol. Currently `1`. Incompatible change → new version |
| `server.pingInterval` | int | Seconds between expected `ping` messages (see §3) |
| `server.capabilities` | string[] | Feature flags supported by the server. The client can gate optional features on this |

---

## 3. Ping / Pong

Keeps the connection alive and measures latency.

### Client → Server: `ping`

```json
{
  "id": "ping_17",
  "type": "ping",
  "data": {
    "clientTimestamp": 1745440800000
  }
}
```

### Server → Client: `pong`

```json
{
  "replyTo": "ping_17",
  "type": "pong",
  "data": {
    "clientTimestamp": 1745440800000,
    "serverTimestamp": 1745440800120
  }
}
```

**Rules:**

- Client sends `ping` every `server.pingInterval` seconds (from `welcome`)
- If no `ping` is received for longer than `pingInterval + 10s`, the server closes the connection
- The client can roughly calculate the one-way latency from `serverTimestamp - clientTimestamp`
- `pong` is purely an ACK — the server can also derive session activity from other messages, but must answer every `ping`

---

## 4. Logout

### Client → Server: `logout`

```json
{
  "type": "logout",
  "data": {}
}
```

The client **explicitly** ends the Session. The Session is closed server-side, not just the Connection. A later `session-resume` with the same `sessionId` will fail with `404`.

**Distinction:** Simply closing the WebSocket connection (without `logout`) does **not** end the Session — the client can later re-bind to the same `sessionId` on a new connection via `session-resume` (and a valid JWT). This is the usual case for CLI `exit` (connection is closed, session continues until server timeout).

After `logout`, the server closes the connection; a response is not required.

---

## 5. Error Model

`errorCode` follows HTTP semantics, even though the transport is WebSocket:

| Range | Meaning | Examples |
|-------|---------|----------|
| 400 | Bad Request — message formally invalid | Required field missing, unknown `type`, `data` not parsable |
| 401 | Unauthorized — active JWT became invalid during the session | Server revokes the session with `error` and closes |
| 403 | Forbidden — authenticated, but no permission | Operation belongs to another user, tenant blocked |
| 404 | Not Found | Referenced resource (Think Process, Project, Task) does not exist |
| 409 | Conflict | Conflict with current state, e.g., Think Process already started |
| 500 | Internal Server Error | Unexpected server error |

`errorMessage` is text intended for logs — **not** for end-user display (the client should derive and localize messages from the `errorCode` itself).

General error message (if a request fails and there is no type-specific `*Response`):

```json
{
  "replyTo": "42",
  "type": "error",
  "data": {
    "errorCode": 400,
    "errorMessage": "Unknown message type: frobnicate"
  }
}
```

**Note:** Auth errors during connection setup do **not** come as an `error` message, but as an HTTP status before the upgrade (see §2, "Handshake Errors").

### 5.1 Session Bind Errors (`session-create` / `session-resume` / `session-bootstrap`)

A Session is associated with a **maximum of 1 active connection** (§1). The bind operations follow a unified error table that the client evaluates for UI display (e.g., "Session occupied" indicator in the picker):

| `errorCode` | Meaning | When |
|---|---|---|
| **400** | Bad Request | `sessionId` missing, payload not parsable, invalid fields |
| **403** | Foreign Session | JWT valid, but the referenced session belongs to another user or tenant |
| **404** | Not Found / Closed | Session does not exist or is not in `OPEN` status (e.g., after `logout`) |
| **409** | Already Bound | Session exists and belongs to the user, but is currently bound to another WS connection ("occupied") |
| **409** | Profile Mismatch | Session was created with a different connection profile than the current connection carries — see below |

**Profile Mismatch (409):** Sessions are bound to the Profile with which they were created — a Foot Session cannot be resumed by a Web client, and vice versa. Reason: Tools/Manuals/Prompt defaults were resolved by the Profile Block when the session processes were spawned; a cross-profile resume would offer the new client tools it cannot host (Foot tools on Web client → failing tool calls). The auto-resume logic in `session-bootstrap` (no explicit `sessionId`) automatically filters out mismatched sessions; the explicit resume path returns 409. The error message names both profile values (`'foot'` vs. `'web'`) so clients can build a clear UI message.

The client can, **before** a bind attempt, use `session-list` (see `SessionSummary.bound` and `SessionSummary.profile`) to determine if a session is occupied or profile-incompatible, and let the user choose without a round-trip error. The bind attempt itself remains the only authoritative source — race conditions between `session-list` and `session-resume` are possible and will be clearly visible via the 409 path.

`session-unbind` (Client → Server) explicitly releases the binding without closing the session — intended for web tabs that leave their chat without ending the session. Simply closing the WS connection leads to a delayed server-side cleanup; an immediate resume in another tab after tab close might encounter 409 until the cleanup takes effect.

---

## 6. Type Catalog (Current)

Source of truth: `vance-api/src/main/java/de/mhus/vance.api.ws/MessageType.java`. This table is maintained when new frames are added; in case of drift, the code takes precedence.

**Connection Lifecycle**

| Type | Direction | Purpose |
|------|-----------|---------|
| `welcome` | Server → Client | First message after successful handshake — carries user and server info (no session) |
| `ping` | Client → Server | Keep-alive |
| `pong` | Server → Client | Keep-alive ACK |
| `logout` | Client → Server | Close session |
| `error` | Server → Client | Generic error response |

**Session Bind and Discovery**

| Type | Direction | Purpose |
|------|-----------|---------|
| `session-create` | Client → Server | Create a new Session in a Project and bind it to the connection |
| `session-resume` | Client → Server | Bind own or shared Session to the connection (see §5.1). Shared sessions (`allowMultipleClients=true`) allow the non-owner to join as a secondary participant — Mongo bind remains with the owner. |
| `session-unbind` | Client → Server | Release the binding of the Session to the current connection without closing the Session |
| `session-bootstrap` | Client → Server | Compound command: `session-create` OR `session-resume` + optional Process spawns + optional initial message in a single frame |
| `session-list` | Client → Server | List sessions in the Tenant (own + all `allowMultipleClients=true`; `SessionSummary` with `bound` and `userId` fields, see §5.1) |
| `session-metadata-patch` | Client → Server | Owner-only metadata patch (title, icon, tags, pin, **`allowMultipleClients`** for multi-user toggle). Reply is the refreshed `SessionMetadataDto`. |
| `session-roster` | Server → Client | Push: current multi-user roster of the bound session. Payload: `SessionRosterData { sessionId, participants: [{ editorId, userId, displayName }] }`. Pushed to all connections of the session after each roster mutation (Join/Leave/Bind escalation). Spec: multi-user-sessions §6. |
| `session-who` | Client → Server | On-demand roster lookup with reply `SessionRosterData`. Drives `/who` slash command and initial baseline on client attach (race-free against async push). |
| `project-list` | Client → Server | List projects in the Tenant (optionally filtered by a project group) |
| `projectgroup-list` | Client → Server | List project groups in the Tenant |

**Think Process Control**

| Type | Direction | Purpose |
|------|-----------|---------|
| `process-create` | Client → Server | Create a new Think Process in the bound Session (by Recipe or Engine name) |
| `process-steer` | Client → Server | User input / steering to a running Think Process — **this is the chat send path** |
| `process-list` | Client → Server | List Think Processes of the bound Session |
| `process-compact` | Client → Server | Manually trigger memory compaction for a Think Process |
| `process-skill` | Client → Server | Activate / deactivate / list Skills on a Think Process |

**Chat Stream (Server → Client)**

| Type | Direction | Purpose |
|------|-----------|---------|
| `chat-message-stream-chunk` | Server → Client | Optimistic streaming chunk of an Assistant response. Replaced by the corresponding `chat-message-appended`. Payload: `ChatMessageChunkData` |
| `chat-message-appended` | Server → Client | Authoritative persist confirmation — a `ChatMessageDocument` has been written. Payload: `ChatMessageAppendedData` with multi-user fields: `senderUserId` (nullable, USER-Turn-Author), `senderDisplayName` (nullable, captured), `addressedToAgent` (Default `true`; `false` marks background turns that did not wake the Agent — see multi-user-sessions §2) as well as `thinking` (nullable): the raw narration of the model (verbatim, including `<think>…</think>` / Harmony-`analysis`-markup), which is streamed live but not part of the final `content` — verbatim encapsulated and persisted per turn so the user can read it. The Web UI shows it as an expandable "Thoughts" area (see [llm-resource-management](/specs/llm-resource-management) §4.1). Frame is fanned out to all connections of the session in multi-user sessions; in solo sessions, the user echo variant is suppressed as before. |

**User Progress Side-Channel**

| Type | Direction | Purpose |
|------|-----------|---------|
| `process-progress` | Server → Client | Live status updates from running Processes (variants `metrics` / `plan` / `status`). Completely separate from the chat stream, not in conversation history. Spec: `user-progress-channel.md` |

**Document Invalidation Side-Channel**

| Type | Direction | Purpose |
|------|-----------|---------|
| `document-invalidate` | Server → Client | A server-side tool (`doc_write` / `doc_edit` / `doc_append` / `doc_replace_lines` / `doc_note_*`) has mutated a document of the bound session. Payload: `DocumentInvalidateNotification { documentId, path, kind: "body"\|"notes" }`. Cortex tabs react with a refresh (3-way merge for dirty buffer). Cross-pod path without Redis dependency, firing in parallel to the `documents-channel`-`changed`-push. Plan: `planning/cortex-document-invalidation.md` |

**Inbox Subsystem**

| Type | Direction | Purpose |
|------|-----------|---------|
| `inbox-list` / `inbox-item` / `inbox-answer` / `inbox-delegate` / `inbox-archive` / `inbox-dismiss` | Client → Server | CRUD and lifecycle operations on user interaction items |
| `inbox-item-added` / `inbox-item-updated` | Server → Client | Push notification for Inbox mutations |
| `inbox-pending-summary` | Server → Client | Welcome-time overview of pending items |

Spec: `user-interaction.md`.

**Client Tool Roundtrip (CLI / Desktop only)**

| Type | Direction | Purpose |
|------|-----------|---------|
| `client-tool-register` | Client → Server | Register the client's Tool Registry with the Brain |
| `client-tool-invoke` | Server → Client | Brain calls a client-registered Tool |
| `client-tool-result` | Client → Server | Result of a `client-tool-invoke` |

**Web clients do not send any of these three frames** (see §2). The Web UI is a view consumer, not a tool provider.

---

## 7. Outlook (Not Yet Defined)

Will be specified in later revisions of this document as soon as the respective features are implemented in `vance-brain`:

- **Task Operations** (Marvin Tree manipulation): `task-rerun`, `task-cancel`, `task-split`, `task-move`, `task-updated` (Broadcast)
- **Memory:** `memory-add`, `memory-search`, `memory-browse`
- **Session Switch:** `session-switch-project`, `session-switch-engine`
- **Approval Flow:** `approval-request`, `approval-decision` (separate from Inbox path)

The corresponding message classes will be implemented in the `vance-api` module (package `de.mhus.vance.api.ws`) as POJOs with Jackson annotations, typed IDs (`SessionId`, `ThinkProcessId` etc.) and JSpecify `@Nullable` marking where fields may be omitted. See java-cli-modulstruktur §2.1.

**Removed from outlook** (are implemented today): Streaming (`chat-message-stream-chunk` + `chat-message-appended`), User Steering (`process-steer`), Tool Roundtrips (`client-tool-*`), Live Progress (`process-progress`).

---

## 8. Versioning

`server.protocolVersion` is an **integer** that is incremented by 1 for incompatible changes. Backward-compatible extensions (new `type` values, new optional fields) do **not** increment the version.

The client checks in the `welcome` message whether `protocolVersion` matches its expected versions and otherwise disconnects with a clear error message ("Server protocol version X, client expects Y").

---

*See also: [architektur-scopes-clients](/specs/architektur-scopes-clients) | [client-protokoll-erweiterbarkeit](/specs/client-protokoll-erweiterbarkeit) | java-cli-modulstruktur | [identity-credentials](/specs/identity-credentials)*
