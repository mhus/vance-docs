# Vance — Live-WS (Multi-Channel WebSocket)

> Multi-channel envelope protocol for external Vance clients (Web, Foot, Mobile)
> and the associated cross-pod chat streaming architecture.
> See also: [websocket-protokoll](websocket-protokoll.md) (Inner Chat-Frame
> Format), [architektur-scopes-clients](architektur-scopes-clients.md)
> (Sessions, Scopes), [identity-credentials](identity-credentials.md) (JWT-
> Auth), [client-protokoll-erweiterbarkeit](client-protokoll-erweiterbarkeit.md)
> (external Clients).
> Status: v1 production.

> History + Refactor Rationale: [planning/live-ws.md](live-ws.md).
> This document describes only the current final behavior.

---

## 1. Overview

External Vance clients (Web-UI, Foot-CLI, Eddie-Worker, Mobile) communicate with
the Brain via **a single** WebSocket endpoint. The wire format is a
**multi-channel-capable envelope** (`LiveEnvelope`), which wraps the existing
chat frames (`WebSocketEnvelope`) on the `session` channel variant.
Other channels (`documents`, `notify`, `progress`, `control`) are reserved in the
protocol but are **not** active in v1.

Cross-pod streaming (user WS lands on one pod via Loadbalancer, the
Project-Home-Pod is another) runs over a separate **pod-to-pod
tunnel** with raw Chat-Frames — the Face-Pod unpacks the `LiveEnvelope` and
passes the inner Chat-Frame 1:1 through the tunnel; responses go the
reverse way.

**Connection Model:** one WS per browser tab / CLI process, one attached
Session at a time. Session changes within the same connection via
`session-resume`/`session-unbind` frames — the WS remains open.

## 2. Endpoints

| Path | Tenant in Path | Access | Auth | Purpose |
|---|---|---|---|---|
| `/brain/{tenant}/ws` | ✓ | external, ingress | JWT (Header or `?token=`) | User-facing Multi-Channel-WS |
| `/internal/{tenant}/ws/chat` | ✓ | pod-to-pod, off-ingress | Shared-Secret + forwarded Identity-Headers | Cross-Pod-Chat-Tunnel between Face-Pod and Home-Pod |
| `/internal/engine-bind` | ✗ | pod-to-pod, off-ingress | Shared-Secret | Engine-Message-Bus (orthogonal system, see [engine-message-routing](../engine-message-routing.md)) |

`/internal/*` paths are kept off-ingress by `InternalAccessFilter` (path prefix +
constant-time token check) and K8s NetworkPolicy —
not directly accessible from outside.

### 2.1 Handshake on `/brain/{tenant}/ws`

Identical to [websocket-protokoll](websocket-protokoll.md) §2: JWT in the
`Authorization: Bearer …` header (or `?token=…` as query fallback for
browsers), `X-Vance-Profile`, `X-Vance-Client-Version`, optional
`X-Vance-Client-Name`. JWT is validated by `BrainAccessFilter`,
`VanceHandshakeInterceptor` builds the `ConnectionContext`.

### 2.2 Handshake on `/internal/{tenant}/ws/chat`

In addition to the Shared-Secret-Header (`X-Vance-Internal-Token`), the
Face-Pod carries the tunneled identity in dedicated headers:

| Header | Required | Description |
|---|---|---|
| `X-Vance-Internal-Token` | ✓ | Cluster-internal Shared-Secret (constant-time comparison) |
| `X-Vance-Forwarded-User-Id` | ✓ | UserId of the original caller (Face-Pod validated it via JWT) |
| `X-Vance-Forwarded-Tenant-Id` | ✓ | Must match `{tenant}` in the URL path — defense-in-depth |
| `X-Vance-Forwarded-Display-Name` | no | Fallback to `forwarded-user-id` if empty |
| `X-Vance-Forwarded-Client-Ip` | no | Original client IP, for audit; fallback to Face-Pod IP |
| `X-Vance-Profile`, `X-Vance-Client-Version`, `X-Vance-Client-Name` | as external | Passed through 1:1 |

The Home-Pod-Handler is identical to the external user WS handler — it sees
a regular user connection, except that the identity comes from the
forwarded headers instead of JWT.

## 3. Envelope Format

Each frame on `/brain/{tenant}/ws` is a `LiveEnvelope`:

```json
{
  "channel": "session",
  "sessionId": "sess_…",
  "payload": { "type": "...", "data": { ... } }
}
```

| Field | Required | Description |
|---|---|---|
| `channel` | ✓ | Channel router. v1 only `"session"` active |
| `sessionId` | for `channel="session"`: after first bind | Bound Session-ID (also Face-Pod routing). For `session-create`/`session-resume`/`session-bootstrap` it may be empty on the first outgoing frame |
| `payload` | ✓ | Channel-specific. For `session`: a [WebSocketEnvelope](websocket-protokoll.md) (`{id, type, data, replyTo}`) |

Frame routing at the Face-Pod depends on `payload.type` (see §5).

### 3.1 Channel Inventory

| Channel | Status | Intended for |
|---|---|---|
| `session` | v1 production | Chat stream, Session lifecycle, Process lifecycle |
| `documents` | v1 production | Presence + Live-Push for document writes. Detailed spec: [`documents-channel.md`](documents-channel.md) |
| `notify` | reserved | User-bound notification push, cross-session |
| `progress` | reserved | `PROCESS_PROGRESS` side-channel per Process |
| `control` | reserved | Keepalive, Auth-Refresh, Capability-Handshake, Editor-Registration |

Reserved channels are rejected by the server with `400 Channel not supported`
— they are documented here so clients do not accidentally
send them and future extensions do not require format migration.

## 4. Identity Hierarchy

```
userId         — JWT identity (sub-Claim)
  └── editorId — Write-/Subscribe-Capability-Handle
        └── sessionId — Attached Conversation
```

| Concept | Where maintained | Lifecycle |
|---|---|---|
| `userId` | JWT-Claim | Constant for the lifetime of the connection |
| `editorId` | Client-Connection or Brain-Thread, server-assigned (UUID) | Implicitly on WS-Open for user connections, explicitly `editor_register` for Brain-internal (`engine`/`script`/`autonomous`/`system`) — see [planning/live-ws.md] for the planned v2 form. **In v1, `editorId` effectively aligns with the WS lifecycle.** |
| `sessionId` | Server-persistent (`SessionDocument`), Mongo | Lives independently of connections, survives disconnect/reconnect. Exactly **one** attached client at a time (exclusive lock via `SessionService.bind`) |

## 5. Session Channel Behavior

### 5.1 Frame Format

`payload` is a regular `WebSocketEnvelope` with all message types from
[websocket-protokoll §6](websocket-protokoll.md) — `session-create`,
`session-resume`, `session-unbind`, `session-bootstrap`, `process-steer`,
`chat-message-appended`, `assistant-token`, `process-progress`, etc.

### 5.2 Session Binding Lifecycle

1. **Open WS** → no session bound, `sessionId` empty.
2. **Client sends `session-resume` / `session-bootstrap` / `session-create`** →
   Server binds the Session in `SessionService` + `SessionConnectionRegistry`.
3. **Reply carries `sessionId`** → Client remembers it and sets it in
   subsequent Live-Envelope-Frames as a routing hint.
4. **Frame with `payload.type=session-unbind`** → Server unbinds, Client
   resets its cached `sessionId`. WS remains open.
5. **Disconnect** → Server unbinds automatically after heartbeat miss; a
   new connection can reattach via `session-resume`.

### 5.3 Client Session Switching

Switching from Session A → B on the same connection occurs by
`session-unbind` (for A) followed by `session-resume` (for B). Same-session
is a no-op. Web-UI implements this in `wsConnectionStore` with a
10-second grace timer (user pause between editor changes within
a page does **not** immediately lead to unbind).

## 6. Cross-Pod-Routing

If the Project-Home-Pod (`ProjectDocument.homeCluster`) is a different pod
than the one where the user WS lands, the **Face-Pod** tunnels the
`session` channel to the Home-Pod.

### 6.1 Lookup

For each session-channel frame, the `HomePodLookupService` decides the routing:

| `payload.type` | Lookup Source |
|---|---|
| `session-create` | `payload.data.projectId` → `ProjectManagerService.findProjectEndpoint(tenantId, projectId)` |
| `session-resume` | `payload.data.sessionId` → `SessionService.findBySessionId` → `.projectId` → `findProjectEndpoint` |
| otherwise | `sessionId` from Envelope (or bound Session in `ConnectionContext`) → analogous to `session-resume` |

If the endpoint cannot be resolved (project unknown, podless,
never claimed) → fallback to **local** processing; local handler
then returns the natural error.

### 6.2 Tunnel Mechanism

- Face-Pod maintains **one** upstream WS per external connection (pooled).
- Frame pipe is bidirectional and 1:1: `LiveEnvelope.payload` in,
  raw `WebSocketEnvelope` through `/internal/{tenant}/ws/chat`. Responses
  from the Home-Pod are re-wrapped into `LiveEnvelope { channel:"session", sessionId, payload }`.
- `WELCOME` frames from the Home-Pod are filtered (Face-Pod has already
  sent its own Welcome to the user).

### 6.3 Engine Invariant

Think Engines (Arthur, Eddie, Ford, Marvin, Vogon, …) run **strictly only
on the Project-Home-Pod**. `ProcessManagerService.requireOwnedByLocalPod`
enforces this via exception. Cross-pod routing via Engine-Bus
(`/internal/engine-bind`) remains orthogonal — engine-bind is **not**
used for user chat streaming.

## 7. Lifecycle Behavior

### 7.1 Server-side

- WS-Close → `SessionLifecycleService.onDisconnect` executes the per-session
  disconnect policy (Suspend / Close / nothing — see [session-lifecycle](session-lifecycle.md)).
- No server-side reconnect tracking; the next connection with
  `session-resume` reactivates the session if it still exists.

### 7.2 Client-side (Web-UI Reference)

- **One connection per browser tab.** Maintained by `wsConnectionStore` in
  `@vance/vance-face/src/ws/`. Editor components (Chat, Cortex, later
  Documents) bind / unbind sessions, but **do not open / close
  the socket**.
- Reconnect loop: Exponential Backoff (1s → 2s → 4s → … cap 30s), max 8
  attempts → manual Retry button in `<ReconnectOverlay>`.
- Browser Resume (iPad wake, tab switch back, network `online`) →
  immediate reconnect attempt, backoff reset.
- After successful reconnect: Auto-`session-resume` of the last desired
  session, so the ongoing chat continues without UI reset.

### 7.3 Client-side (Foot)

`vance-foot/ConnectionService` + `vance-api/VanceWebSocketClient` do
functionally the same, without resume/multi-editor complications: one WS,
one session, explicit `/connect` command on connection problem.

## 8. Wire Examples

### 8.1 Initial Connect + Session-Create

Client → Server:
```json
{ "channel": "session", "payload": {
  "id": "req_1",
  "type": "session-create",
  "data": { "projectId": "demo" }
}}
```

Server → Client:
```json
{ "channel": "session", "payload": {
  "replyTo": "req_1",
  "type": "session-create",
  "data": { "sessionId": "sess_abc123", "projectId": "demo" }
}}
```

Client remembers `sess_abc123` as the active sessionId.

### 8.2 Subsequent User Input

```json
{ "channel": "session", "sessionId": "sess_abc123", "payload": {
  "id": "req_2",
  "type": "process-steer",
  "data": { "content": "hallo", "role": "USER" }
}}
```

Face-Pod routes, if necessary, via tunnel to the Home-Pod of `sess_abc123`'s project.

### 8.3 Server-initiated Notification (Token Stream)

```json
{ "channel": "session", "sessionId": "sess_abc123", "payload": {
  "type": "assistant-token",
  "data": { "delta": "h" }
}}
```

(Note: `WebSocketSender` automatically wraps the Envelope in
`LiveEnvelope` if the WS session is marked with `ATTR_LIVE_PROTOCOL`
— see `repos/vance/server/vance-brain/src/main/java/de/mhus/vance/brain/ws/WebSocketSender.java`.)

### 8.4 Unbind

```json
{ "channel": "session", "sessionId": "sess_abc123", "payload": {
  "type": "session-unbind"
}}
```

Client may then set the cached sessionId to `null`.

## 9. What is NOT in v1

Deliberately omitted to keep the foundation refactor small and allow the
protocol to learn through practice before channels are hardened:

- **`notify`-Channel** as user-bound push. Currently, NOTIFY is still
  session-scoped; cross-session Notify would require this channel.
- **`progress`-Channel** as its own lane for `PROCESS_PROGRESS` — currently
  as a push frame in the `session`-Channel.
- **`control`-Channel** for Keepalive/Auth-Refresh/Capabilities.
- **CRDT for simultaneous multi-user editing** on `documents` —
  deliberately not implemented. The `documents`-Channel provides since v1
  Presence + Live-Push + 3-way-Merge of the Cortex-Editor-Buffers (see
  [`documents-channel.md`](documents-channel.md)), but Vance remains a
  Think-Tool and not Google-Docs.
- **SharedWorker / Multi-Tab-Connection-Sharing** in the browser. Currently one
  WS per tab.

## 10. Code Anchors

| Concept | File |
|---|---|
| Envelope-DTO | `vance-api/.../ws/LiveEnvelope.java` |
| User-Handler (multi-channel demux) | `vance-brain/.../ws/LiveWebSocketHandler.java` |
| Inner Chat-Handler (per-Type-Dispatch) | `vance-brain/.../ws/VanceWebSocketHandler.java` |
| Cross-Pod-Lookup | `vance-brain/.../ws/live/HomePodLookupService.java` |
| Tunnel-Client | `vance-brain/.../ws/live/LiveChatTunnel.java` |
| Tunnel-Pool | `vance-brain/.../ws/live/LiveChatTunnelRegistry.java` |
| Internal-Endpoint-Handshake | `vance-brain/.../ws/InternalChatHandshakeInterceptor.java` |
| Auto-Wrap on send | `vance-brain/.../ws/WebSocketSender.java` (`ATTR_LIVE_PROTOCOL`) |
| Property-Surface | `vance-brain/.../ws/VanceBrainProperties.Paths` (`external`, `internalChat`) |
| Browser-Connection-Manager | `@vance/vance-face/src/ws/wsConnectionStore.ts` |
| Reconnect-Overlay | `@vance/vance-face/src/ws/ReconnectOverlay.vue` |
| Web-Wire-Wrapper | `@vance/shared/src/ws/brainWebSocket.ts` |
| Foot-Wire-Wrapper | `vance-api/.../ws/client/VanceWebSocketClient.java` |
