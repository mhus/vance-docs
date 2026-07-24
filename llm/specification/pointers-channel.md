# Pointers Channel — Ephemeral Live Cursors

> Live WS channel `pointers`: subscribe per document path, send your own
> pointer/mouse position, and receive the positions of other active
> participants. **Pure fan-out** — no persistent state, no history, best-effort.
> The framework transports opaque coordinates; **interpretation (zoom, pan,
> canvas transform) is up to the application.** Cross-Pod via Redis Pub/Sub.
>
> Status: v1 in production. First consumer: the Canvas app
> ([`app-canvasbook.md`](app-canvasbook.md) / [`doc-kind-canvas.md`](doc-kind-canvas.md)).
>
> See also [`live-ws.md`](live-ws.md) (envelope framework, channel inventory)
> and [`documents-channel.md`](documents-channel.md) (the subscribe/identity
> pattern reused here). Refactor history:
> [`planning/pointers-channel.md`](../../planning/pointers-channel.md).

## 1. Purpose

Awareness on spatial surfaces: multiple participants (or multiple tabs of the
same user) see **where** others are currently working — one live cursor per
participant. Purely additive, **opt-in per application**.

The channel is deliberately **separated from the two `documents` channel
exclusions** (`documents-channel.md` §11: "Cursor-Position-Sharing — deliberately
out"; `live-ws.md` §9: CRDT deliberately out). `pointers` does **not** implement
a collab editor, no edit sync, no CRDT — only ephemeral pointer awareness on a
surface. The `documents` channel remains cursor-free.

## 2. Wire Format

Each frame is in a [`LiveEnvelope`](live-ws.md#3-envelope-format) with
`channel: "pointers"`:

```json
{ "channel": "pointers",
  "payload": { "type": "<frame-type>", "data": { ... } } }
```

`type` values are collected in [`MessageType`](../../repos/vance/server/vance-api/src/main/java/de/mhus/vance/api/ws/MessageType.java):

| Type (`type`) | Direction | Payload |
|---|---|---|
| `subscribe` | C → S | `{ path }` |
| `unsubscribe` | C → S | `{ path }` |
| `unsubscribe-all` | C → S | empty |
| `pointer-move` | C → S | `{ path, x, y, data? }` |
| `pointer` | S → C | `{ path, editorId, userId, displayName, x, y, data? }` |
| `pointer-leave` | S → C | `{ path, editorId }` |

- **`x` / `y`** — `double`, opaque app-space coordinates. The server
  does **not** interpret them (no clamping, no normalization, no transform).
- **`data`** — optional, typed additional map (`Map<String, Object>`) for
  app extras (e.g., pointer color, pointer type). The server passes it through
  1:1 without reading it.
- **Identity is server-derived, not client-asserted.** The sender sends
  `pointer-move` **without** its own identity; the server appends
  `editorId`/`userId`/`displayName` from the authenticated
  [`ConnectionContext`](documents-channel.md#4-writer-identity) to the outgoing
  `pointer` frame — analogous to the `documents` channel. This makes the
  display name unspoofable. A freely selectable display label per surface
  belongs in the optional `data`, not in a second name field.

### 2.1 Self-Filter

`pointer` and `pointer-leave` frames are **not** delivered to the triggering
WS connection (filter in the broadcaster by `editorId`). The sender never sees
their own pointer echoed back. Two tabs of the same user have different
`editorId`s and therefore see each other as separate cursors.

### 2.2 Subscribe Limit + Rate Cap

- **100 subscriptions per connection** (like `documents`). A Canvas app
  typically needs one.
- **60 `pointer-move`/s per connection** (Fixed-Window). Excess moves are
  **silently dropped** (no error frame — an error per drop would itself cause
  flooding). The client coalesces anyway to ~30 Hz (§6).

## 3. Server Architecture

Mirrored to `ws.documents`, but **without Roster state**:

| Class | Responsibility |
|---|---|
| [`PointerChannelHandler`](../../repos/vance/server/vance-brain/src/main/java/de/mhus/vance/brain/ws/pointers/PointerChannelHandler.java) | Frame demux (`subscribe`/`unsubscribe`/`unsubscribe-all`/`pointer-move`), subscribe cap + rate cap |
| [`PointerBroadcaster`](../../repos/vance/server/vance-brain/src/main/java/de/mhus/vance/brain/ws/pointers/PointerBroadcaster.java) | Per-connection subscription set (RAM), Redis Pub/Sub + local fan-out + self-filter, leave-on-disconnect |

**No `DocumentSubscriberRegistry` equivalent with Redis-HASH.** The only
server-side state is the per-connection subscription set in RAM (for
leave-on-disconnect + local fan-out addressing). "Who is pointing now" is
derived purely from the frame stream.

### 3.1 Redis Pub/Sub (Cross-Pod only)

```
Topic:   vance:{tenantId}:pointers
Payload: "{podId}|{base64(path)}|{editorId}|{x}|{y}|{userId}|{base64(displayName)?}|{base64(dataJson)?}"

Topic:   vance:{tenantId}:pointers.leave
Payload: "{podId}|{base64(path)}|{editorId}"
```

Self-echo via `podId` (Per-Process-UUID) discarded — like
`documents.changed`. Receiver pods fan out to their local subscribers of the
path.

### 3.2 No Redis → local-only

`vance.redis.enabled=false`: the channel works **locally** (fan-out between
subscribers on the same pod), but not cross-pod — exactly the failure mode
pattern of the `documents` channel. Sufficient for single-pod dev.

## 4. Delimitation from the `documents` Channel

| | `documents` | `pointers` |
|---|---|---|
| Trigger | Document write (Save) | Pointer movement (~30/s) |
| Server State | Redis-HASH-Roster + 90s-TTL + Heartbeat | **none** (pure fan-out) |
| Redis | HASH (Roster) + Pub/Sub | **only** Pub/Sub |
| Delivery | reliable-ish (Roster reconstructible) | best-effort, fire-and-forget |
| Lifetime | survives reconnect via TTL | ends with the frame stream |

Separate channels keep both delivery semantics clean — pointer positions would
pollute a roster with high-frequency writes.

## 5. Lifecycle — Cursors Appear & Disappear

Without a persistent roster, "who is pointing" is derived purely from the frame
stream. Three cleanup paths:

1. **Explicit `pointer-leave`** — Client sends `unsubscribe` on
   `pointerleave`/tab blur/editor unmount. Server broadcasts `pointer-leave`
   to others.
2. **WS-Disconnect** — the local pod broadcasts a `pointer-leave` for each
   subscribed path combination of the connection (from the per-connection
   subscription set). Cross-pod is covered by path 3.
3. **Client-TTL-Fade (Primary Safeguard)** — the receiver client fades out
   a foreign pointer if no update has arrived for ~5 s. Robustly catches lost
   leaves, cross-pod gaps, and network disconnections without server state.

## 6. Client Architecture

`usePointers({ path, throttleHz?, ttlMs? })` —
[Composable in `@vance/shared`](../../repos/vance/client/packages/shared/src/ws/usePointers.ts).
Located in `@vance/shared` (not in `vance-face`) so that host editors **and**
Module Federation addons (Canvas) share it; WS access is via the
[`__VANCE_WS__` bridge](../../repos/vance/client/packages/shared/src/ws/bridge.ts).

- **Sender:** `report(x, y, data?)` — coalesces on `requestAnimationFrame`
  at `throttleHz` (default 30), sends `pointer-move`. The app calls it from
  its `pointermove` handler with **app-space coordinates** (after its
  own zoom/pan inverse).
- **Listener:** reactive `Map<editorId, RemotePointer>` with `lastSeen`,
  TTL-fade (`ttlMs`, default 5000) via a 1s interval.
- **Rendering is app-specific:** The composable only provides app-space
  coordinates. The application applies its current transform to position the
  pointer overlays (zoom-correct).

On reconnect (new `editorId`), the `wsConnectionStore` replays the desired
subscriptions; old foreign pointers fade out via TTL.

### 6.1 Canvas Integration

`CanvasEditor.vue` calls `usePointers({ path })`, calculates screen → flow
coordinates in the `pointermove` handler via the VueFlow viewport inverse
(`(client - rect - viewport) / zoom`), and renders a cursor overlay for each
`RemotePointer` at `viewport + flow * zoom` with `displayName` label and
`data.color`. Applies to the editable app view **and** the read-only
`kind: canvas` view.

### 6.2 Workbook Integration

`WorkbookAppKind.vue` uses the same channel, scoped to the path of the active
page. A Workpage is **scrolling, wrapping flowing text** — not a 2D plane like
Canvas. Therefore, the two signals are **deliberately modeled
differently**:

- **Mouse Pointer** — opaque `x`/`y` in the coordinate system of the
  **editor content element** (`getContentEl()` = ProseMirror-`view.dom`).
  Sender measures relative to its live `getBoundingClientRect()`, receiver
  resolves against **its** content element. Because the content element moves
  with scrolling (its `rect.top` shifts), **scrolling is automatically
  covered** — no `scrollTop` calculation. Reflow with a narrower window makes
  the mouse slightly inaccurate; for a mouse pointer, this is acceptable.
- **Active Node** — **never pixels and no character caret.** What is shared
  is the **logical position of the block** where the peer is currently working
  (`data.node.pos`, from `getActiveBlockPos()` = start of the top-level block).
  The receiver resolves it via `blockRectAtPos(pos)` against **its own layout**
  to the block element rectangle and highlights this block. Block awareness
  ("what is the person working on") is calmer and more stable than a
  character-accurate caret (no jitter per keypress) and remains correct with
  different window widths / wrapping / scrolling.

The block editor (`@vance/block-editor` `WorkPageEditor`) exposes
`getActiveBlockPos()`, `blockRectAtPos(pos)`, `getContentEl()`, and an
`@selection` event (ProseMirror-`onSelectionUpdate`) for this purpose.
Keyboard navigation (block change without mouse) re-reports with the last
known mouse position. The receiver recalculates everything per frame against
its layout (reactive to scroll + resize) and renders the mouse cursor **and**
a block highlight (colored bar on the left + name tag). `data.node` is a pure
app convention — the framework only knows "opaque `data`". A character-accurate
caret or selection range would be a later, purely additive refinement
(co-editing); v1 deliberately remains at the block level.

## 7. Failure Modes

| Scenario | Behavior |
|---|---|
| `vance.redis.enabled=false` | Channel operates pod-locally; no cross-pod cursors. Brain continues normally. |
| WS reconnect | New `editorId`; desired subscriptions are replayed; old foreign pointers fade via TTL. |
| WS-Close without `unsubscribe` | Leave-on-Disconnect broadcasts `pointer-leave` locally; cross-pod is covered by client TTL. |
| Lost `pointer-move`/`pointer-leave` | Best-effort — the next move replaces the position, TTL cleans up dead cursors. |
| Flooding client | Server rate cap (60/s) drops silently; client coalesces to 30 Hz. |

## 8. Code Anchors

| Aspect | File |
|---|---|
| Channel Handler | `vance-brain/.../ws/pointers/PointerChannelHandler.java` |
| Broadcaster + State | `vance-brain/.../ws/pointers/PointerBroadcaster.java` |
| Channel Demux (Routing) | `vance-brain/.../ws/LiveWebSocketHandler.java` (`pointers`-Case + Leave-on-Close) |
| Wire DTOs | `vance-api/.../ws/PointerMoveRequest.java`, `PointerNotification.java`, `PointerLeaveNotification.java`, `PointerSubscribeRequest.java` |
| MessageType | `vance-api/.../ws/MessageType.java` (`POINTER*`-Konstanten) |
| Client Composable | `@vance/shared/ws/usePointers.ts` |
| Bridge API | `@vance/shared/ws/bridge.ts` (`VanceWsApi` Pointer methods) |
| Host Wiring | `vance-face/src/ws/wsConnectionStore.ts` (pointers-Section) + `vance-face/src/platform/bootWeb.ts` (`configureVanceWs`) |
| Canvas Consumer | `vance-addon-brain-canvas/client/src/CanvasEditor.vue` |
| Workbook Consumer | `vance-addon-brain-workbook/client/src/WorkbookAppKind.vue` (Mouse + `data.node`) |
| Tests | `vance-brain/.../ws/pointers/PointerBroadcasterTest.java` |

## 9. Not in Scope (Deliberately)

- **Roster / Presence list** — who is *subscribed* without moving. Awareness
  comes solely from the pointer stream; for "who is there" without movement,
  the `documents` channel is responsible.
- **Persistence / History / Replay** of pointer positions.
- **Reliable delivery / Buffering** — fire-and-forget.
- **Selection / Editing Sync, CRDT** — only pointer position (+ opaque `data`).
- **Coordinate interpretation in the framework** — Zoom/Pan/Transform is done
  by the application.
