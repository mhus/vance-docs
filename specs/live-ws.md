---
title: "Vancetope — Live-WS (Multi-Channel WebSocket)"
parent: Specs
permalink: /specs/live-ws
---

<!-- AUTO-GENERATED from llm/specification/live-ws.md (translated from the German specification/public/live-ws.md) — do not edit here. -->

# Vancetope — Live-WS (Multi-Channel WebSocket)

> Multi-channel envelope protocol for external Vancetope clients (Web, Foot, Mobile)
> and the associated cross-pod chat streaming architecture.
> See also: [websocket-protocol](/specs/websocket-protokoll) (Inner Chat-Frame
> Format), [architecture-scopes-clients](/specs/architektur-scopes-clients)
> (Sessions, Scopes), [identity-credentials](/specs/identity-credentials) (JWT-
> Auth), [client-protocol-extensibility](/specs/client-protokoll-erweiterbarkeit)
> (external clients).
> Status: v1 productive.

> History + Refactor Rationale: [planning/live-ws.md](/specs/live-ws).
> This document describes only the current final behavior.

---

## 1. Overview

External Vancetope clients (Web-UI, Foot-CLI, Eddie-Worker, Mobile) communicate
with the Brain via **a single** WebSocket endpoint. The wire format is a
**multi-channel capable envelope** (`LiveEnvelope`), which wraps the existing
chat frames (`WebSocketEnvelope`) on the `session` channel variant.
Further channels (`documents`, `notify`, `progress`, `control`) are reserved in the
protocol but are **not** implemented in v1.

Cross-pod streaming (user WS lands on one pod via load balancer, the Project-Home-Pod
is another) runs over a separate **pod-to-pod tunnel** with raw chat frames —
the Face-Pod unpacks the `LiveEnvelope` and passes the inner chat frame 1:1
through the tunnel; responses go the reverse way.

**Connection Model:** one WS per browser tab / CLI process, one attached
Session at a time. Session changes within the same connection via
`session-resume`/`session-unbind` frames — the WS remains.

## 2. Endpoints

| Path | Tenant in Path | Access | Auth | Purpose |
|---|---|---|---|---|
| `/brain/{tenant}/ws` | ✓ | external, ingress | JWT (Header or `?token=`) | User-facing Multi-Channel-WS |
| `/internal/{tenant}/ws/chat` | ✓ | pod-to-pod, off-ingress | Shared-Secret + forwarded Identity-Headers | Cross-Pod-Chat-Tunnel between Face-Pod and Home-Pod |
| `/internal/engine-bind` | ✗ | pod-to-pod, off-ingress | Shared-Secret | Engine-Message-Bus (orthogonal system, see engine-message-routing) |

`/internal/*` paths are kept off-ingress by `InternalAccessFilter` (path prefix +
constant-time token check) and K8s NetworkPolicy —
not directly accessible from outside.

### 2.1 Handshake on `/brain/{tenant}/ws`

Identical to [websocket-protocol](/specs/websocket-protokoll) §2: JWT in
`Authorization: Bearer …` header (or `?token=…` as query fallback for
browsers), `X-Vancetope-Profile`, `X-Vancetope-Client-Version`, optional
`X-Vancetope-Client-Name`. JWT is validated by `BrainAccessFilter`,
`VanceHandshakeInterceptor` builds the `ConnectionContext`.

### 2.2 Handshake on `/internal/{tenant}/ws/chat`

In addition to the Shared-Secret-Header (`X-Vancetope-Internal-Token`), the
Face-Pod carries the tunneled identity in dedicated headers:

| Header | Required | Description |
|---|---|---|
| `X-Vancetope-Internal-Token` | ✓ | Cluster-internal Shared-Secret (constant-time comparison) |
| `X-Vancetope-Forwarded-User-Id` | ✓ | UserId of the original caller (Face-Pod has JWT-validated it) |
| `X-Vancetope-Forwarded-Tenant-Id` | ✓ | Must match `{tenant}` in the URL path — defense-in-depth |
| `X-Vancetope-Forwarded-Display-Name` | no | Fallback to `forwarded-user-id` if empty |
| `X-Vancetope-Forwarded-Client-Ip` | no | Original client IP, for audit; fallback to Face-Pod IP |
| `X-Vancetope-Profile`, `X-Vancetope-Client-Version`, `X-Vancetope-Client-Name` | as external | Passed through 1:1 |

The Home-Pod-Handler is identical to the external user WS handler — it sees
a regular user connection, only the identity comes from the forwarded headers
instead of JWT.

## 3. Envelope Format

Every frame on `/brain/{tenant}/ws` is a `LiveEnvelope`:

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
| `payload` | ✓ | Channel-specific. For `session`: a [WebSocketEnvelope](/specs/websocket-protokoll) (`{id, type, data, replyTo}`) |

Frame routing on the Face-Pod depends on `payload.type` (see §5).

### 3.1 Channel Inventory

| Channel | Status | Intended for |
|---|---|---|
| `session` | v1 productive | Chat stream, Session lifecycle, Process lifecycle |
| `documents` | v1 productive | Presence + Live-Push for document writes. Detailed spec: [`documents-channel.md`](/specs/documents-channel) |
| `pointers` | v1 productive | Ephemeral live cursors per document path (pure fan-out, no state). Detailed spec: [`pointers-channel.md`](/specs/pointers-channel) |
| `signals` | v1 productive | Generic ephemeral per-doc signal channel (fan-out, no state/persistence); a `SignalFrame{path,signal,data}` frame with `signal` discriminator. First consumer: `compose-run` status. Detailed spec: [`signals-channel.md`](/specs/signals-channel) |
| `notify` | reserved | User-bound notification push, cross-session |
| `progress` | reserved | `PROCESS_PROGRESS`-Side-Channel per Process |
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
| `editorId` | Client connection or Brain thread, server-assigned (UUID) | Implicitly on WS-Open for user connections, explicitly `editor_register` for Brain-internal (`engine`/`script`/`autonomous`/`system`) — see [planning/live-ws.md] for the planned v2 form. **In v1, `editorId` effectively aligns with the WS lifecycle.** |
| `sessionId` | Server-persistent (`SessionDocument`), Mongo | Lives independently of connections, survives disconnect/reconnect. Exactly **one** attached client at a time (exclusive lock via `SessionService.bind`) |

## 5. Session Channel Behavior

### 5.1 Frame Format

`payload` is a regular `WebSocketEnvelope` with all message types from
[websocket-protocol §6](/specs/websocket-protokoll) — `session-create`,
`session-resume`, `session-unbind`, `session-bootstrap`, `process-steer`,
`chat-message-appended`, `assistant-token`, `process-progress`, etc.

### 5.2 Session Binding Lifecycle

1. **Open WS** → no session bound, `sessionId` empty.
2. **Client sends `session-resume` / `session-bootstrap` / `session-create`** →
   Server binds the Session in `SessionService` + `SessionConnectionRegistry`.
3. **Reply carries `sessionId`** → Client remembers it and sets it in
   subsequent Live-Envelope frames as a routing hint.
4. **Frame with `payload.type=session-unbind`** → Server unbinds, Client
   resets its cached `sessionId`. WS remains open.
5. **Disconnect** → Server unbinds automatically after heartbeat miss; a
   new connection can reattach via `session-resume`.

### 5.2a Reconnect in the middle of a running Turn

A Turn survives the connection that started it — the "busy" state
of a client does not: the Web-UI loses the pending
`process-steer` promise, Foot's spinner counter loses the
`ENGINE_TURN_START` whose `_END` is yet to come. The Engine continues to work and
its responses arrive while the UI shows "idle" — this reads
as if the agent is acting on its own.

The answer is therefore in the `session-resume` reply: **`activeProcesses`**
(`[{processId, name}]`) names the processes that are currently in the middle of a Turn
(`RUNNING`/`INIT`; empty if the session is quiet). Both address forms are used because
the two readers correlate differently — against the `processId` for
progress pings (Foot) or against the `chatProcessName` (Web).

Why the reply and not a separate query: it travels over the **same
connection as the progress pings**, so a Turn that ends immediately afterwards
reports an `ENGINE_TURN_END` that demonstrably arrives *after* it. A
separate "which processes are running" request does not have this order and can
leave a spinner that never closes.

### 5.2b Plan/Todo State on (Re)Connect

The plan state is bound to the connection — a freshly bound
connection has not seen the current plan. The server provides the
persisted plan state for each open (= not CLOSED) process of the session
with **one value per process** (`ProcessPlanState`: mode + todos;
`PlanStateInitialPusher.collectPlanStates`) — via **two carriers**:

- **Reply carrier** (Web-UI): `planStates` in the `session-resume` and
  `session-bootstrap` reply, directly next to `activeProcesses`. The reply is
  the correct carrier because it arrives with the chat process pointer in **one**
  round trip: a freshly bound client cannot yet correlate pushed
  `todos-updated` frames — the Web-UI filter on the chat process
  only takes effect after the bind is complete (§5.2a-
  justification, verbatim).
- **Frame carrier** (Foot): `process-mode-changed` (if `mode ≠ NORMAL`;
  Arthur/Eddie Plan-Mode) and `todos-updated` (if todos exist),
  pushed to the new connection — Foot correlates by process name alone,
  without filter race.

The Web-UI discards the frames (filter not yet active) and restores
from the reply: the store catches `planStates` (the same pattern as
`chatTurnActiveOnResume`), the chat editor applies them as soon as **both**
are available — pointer and captured state; whoever arrives later wins.
From then on, the live frames take over.

Deliberately **no** Engine callback: the plan is a persisted projection
(`ThinkProcessDocument.mode/todos`), reading it requires no Engine Lane,
no waking up, no side effects. CLOSED processes are skipped
(their todos are historical data; a restore would render a box
that never changes again). Known remainder: `plan-proposed` (Summary +
planVersion) is not persisted — after reconnect, the Web-UI shows the
suggested plan steps, but not the "awaiting approval" banner.

When the box closes (empty projection or Mode → `NORMAL`), the Web-UI
renders a one-time **local `SYSTEM` chat message** with the last box content
(marker as in the box) — this allows Engines to clear the projection at
process end without the info disappearing with the box. Local and
unpersisted: the box is a projection, not a message; where the content
matters long-term, it is already in the transcript (Benjy's final report
carries the item list). Details: `readme/plan-state-restore.md`.

### 5.3 Client Session Change

Changing from Session A → B on the same connection is done by
`session-unbind` (for A) followed by `session-resume` (for B). Same-session
is a no-op. The Web-UI implements this in `wsConnectionStore` with a
10-second grace timer (user pause between editor changes within
a page does **not** immediately lead to unbind).

## 6. Cross-Pod Routing

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
then delivers the natural error.

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
  disconnect policy (Suspend / Close / nothing — see [session-lifecycle](/specs/session-lifecycle)).
- No server-side reconnect tracking; the next connection with
  `session-resume` reactivates the session if it still exists.

### 7.1a The Read Thread does not belong to any Handler

A Servlet container reads **one connection on one thread**: the next
frame is only read when the handler of the previous one returns. What a
handler waits for thus stalls *the entire connection* — not just that one
request. This is not a latency issue, but a liveness issue: the browser's PONGs
are also in the queue, and the eviction sweep (§7.1) considers a merely busy
connection dead after two missed pings.

Measured: a `process-pause` waited 70s for an Engine Lane where a
model call was running. During this time, no PONG got through, the sweep closed the
socket, and the message the user had typed in the meantime was still
unread in the socket buffer when it was discarded — from the outside, this read
as "the connection died and ate my input".

Therefore, two rules that belong together:

1. **Frame processing does not run on the Read Thread.** `LiveWebSocketHandler`
   and `VanceWebSocketHandler` pass each text frame to
   `WsInboundExecutor` and return. The executor is **per connection
   serial** (a `session-resume` must bind before the `process-steer`
   behind it is dispatched) and **parallel across connections**. The queue is
   limited (`vance.ws.inboundQueueLimit`, default 256); beyond that, it closes with
   `1013 Service Overload` instead of silently discarding — a
   disappeared frame is invisible to the client, a closed socket
   triggers its reconnect. PONGs continue to run directly on the Read Thread
   and are never queued.
2. **A handler still does not wait for an Engine Lane.** Rule 1 saves
   the connection, not latency: a slow handler still delays
   the frames of *its* connection. Whoever initiates a Lane submits and returns
   (`LaneScheduler`); where a Cascade truly needs the result,
   waiting is capped. Specifically for pause, see
   [think-engines](/specs/think-engines) — the halt flag takes effect immediately, the
   `PAUSED` status change lands on the Lane, and no one waits for it.

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

Client remembers `sess_abc123` as active sessionId.

### 8.2 Subsequent User Input

```json
{ "channel": "session", "sessionId": "sess_abc123", "payload": {
  "id": "req_2",
  "type": "process-steer",
  "data": { "content": "hello", "role": "USER" }
}}
```

Face-Pod routes via tunnel to the Home-Pod of `sess_abc123`'s project if necessary.

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

Deliberately omitted so that the foundation refactor remains small and the
protocol learns through practice before channels are hardened:

- **`notify`-Channel** as user-bound push. Today, NOTIFY is still
  session-scoped; cross-session Notify would require this channel.
- **`progress`-Channel** as its own Lane for `PROCESS_PROGRESS` — currently
  as a push frame in the `session`-Channel.
- **`control`-Channel** for Keepalive/Auth-Refresh/Capabilities.
- **CRDT for simultaneous multi-user editing** on `documents` —
  deliberately not implemented. The `documents`-Channel has provided
  Presence + Live-Push + 3-way-Merge of Cortex editor buffers since v1
  (see [`documents-channel.md`](/specs/documents-channel)), but Vancetope remains a
  Think-Tool and not Google-Docs. The `pointers`-Channel has supplemented
  ephemeral live cursors for spatial areas (Canvas) since v1 — this is pure
  awareness (who points where), **not** edit sync and no CRDT.
- **SharedWorker / Multi-Tab-Connection-Sharing** in the browser. Today, one
  WS per tab.

## 10. Code Anchors

| Concept | File |
|---|---|
| Envelope-DTO | `vance-api/.../ws/LiveEnvelope.java` |
| User-Handler (multi-channel demux) | `vance-brain/.../ws/LiveWebSocketHandler.java` |
| Inner Chat-Handler (per-Type-Dispatch) | `vance-brain/.../ws/VanceWebSocketHandler.java` |
| Inbound-Execution (per connection serial, off-read-thread) | `vance-brain/.../ws/WsInboundExecutor.java` + `OrderedWsInboundExecutor.java` |
| Keep-Alive + Stale-Eviction | `vance-brain/.../ws/WebSocketKeepAliveService.java` |
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
