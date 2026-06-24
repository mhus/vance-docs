---
title: "Documents Channel — Live Presence + Changed Events"
parent: Documentation
permalink: /docs/documents-channel
render_with_liquid: false
---

<!-- AUTO-GENERATED from specification/public/en/documents-channel.md — do not edit here. -->

---
# Documents Channel — Live Presence + Changed Events

> Live WS channel `documents`: subscribe/unsubscribe per path, viewer roster
> ("who is watching"), and server-to-client push when a document has been written.
> Includes writer identity, automatic 3-way merge for dirty editors,
> and ⏺-awareness badge. Cross-pod via Redis.
>
> See also [`specification/live-ws.md`](/docs/live-ws) for the
> envelope framework, [`specification/web-ui.md`](/docs/web-ui) for
> editor integration, and `specification/document-change-events.md`
> for *Brain-internal* cache coherence events (separate track, see §3.2).

## 1. Purpose

Three awareness needs for editable documents:

1. **Presence** — who is currently viewing this document? (Avatar strip)
2. **Changed** — someone just wrote, your editor should react.
3. **Identity** — see *who* wrote without opening chat.

The channel is **not** a full-fledged CRDT/OT editor. For most
use cases, "clean merges flow in silently, hard conflicts show a banner" is sufficient.
Vance remains a Think Engine, not Google Docs.

## 2. Wire Format

### 2.1 Frame Layering

Each frame is contained in a [`LiveEnvelope`](/docs/live-ws#3-frame-format)
with `channel: "documents"`:

```json
{ "channel": "documents",
  "payload": { "type": "<frame-type>", "data": { ... } } }
```

`type` values are collected in [`MessageType`](../repos/vance/server/vance-api/src/main/java/de/mhus/vance/api/ws/MessageType.java):

| Type (`type`) | Direction | Payload |
|---|---|---|
| `subscribe` | C → S | `{ path }` |
| `unsubscribe` | C → S | `{ path }` |
| `unsubscribe-all` | C → S | empty |
| `presence` | S → C | `{ path, viewers: [{ editorId, userId, displayName }, …] }` |
| `changed` | S → C | `{ path, kind, editorId?, editorUserId?, editorDisplayName? }` |

`kind` is `"upserted"` or `"deleted"`. The server-side logic produces
the common wire model for REST writes and for Tool writes — the only
difference is the Identity (see §4).

### 2.2 Subscribe Limit

Hard limit: **100 paths per WebSocket connection**. Cortex with dozens
of tabs is well below this; the limit protects against broken / malicious
clients.

### 2.3 Self-Filter

`presence` frames **never** contain the recipient's own `editorId`.
The server filters per recipient. This means the client does not need to
know its own `editorId` to hide itself from the roster.

`changed` frames are **not delivered at all** for the writer's own WS connection
(filter in the Broadcaster). This prevents the writer from seeing their
own banner / badge.

## 3. Server Architecture

### 3.1 Components

| Class | Responsibility |
|---|---|
| [`DocumentSubscriberRegistry`](../repos/vance/server/vance-brain/src/main/java/de/mhus/vance/brain/ws/documents/DocumentSubscriberRegistry.java) | Presence state, Redis HASH as source of truth, Pub/Sub for cross-pod roster updates |
| [`DocumentChannelHandler`](../repos/vance/server/vance-brain/src/main/java/de/mhus/vance/brain/ws/documents/DocumentChannelHandler.java) | Frame demux for subscribe/unsubscribe/unsubscribe-all |
| [`DocumentChangedBroadcaster`](../repos/vance/server/vance-brain/src/main/java/de/mhus/vance/brain/ws/documents/DocumentChangedBroadcaster.java) | Listens to `DocumentLiveChangedEvent`, publishes to Redis + local fan-out |
| [`DocumentLiveChangedEvent`](../repos/vance/server/vance-shared/src/main/java/de/mhus/vance/shared/document/DocumentLiveChangedEvent.java) | Spring ApplicationEvent (vance-shared), fired by `DocumentService` |

### 3.2 Distinction from `DocumentChangedEvent`

There are two parallel event types:

- **[`DocumentChangedEvent`](../repos/vance/server/vance-shared/src/main/java/de/mhus/vance/shared/document/DocumentChangedEvent.java)** —
  *Brain-internal cache coherence* for YAML caches (ServerToolRegistry,
  UrsaScheduler, UrsaHook, …). Filter: only `_vance/...` minus `_vance/logs/...`.
  Distribution to Project Home-Pod via `DocumentChangeRouter` /
  `/internal/document/changed`. **Not** the vehicle for live push to
  WS subscribers — the router does not reach the Home-Pods of all subscribers.
- **`DocumentLiveChangedEvent`** — the live push for
  WS subscribers described here. Wider filter: everything except `_vance/logs/`, `_bin/`,
  `_slart/`, `_chatbox/` (noise paths that are never subscribed). Cross-pod
  exclusively via Redis Pub/Sub.

`DocumentService` fires both events in parallel for the same write — they
are decoupled and have different lifespans and scopes.

### 3.2a Parallel Path: `DOCUMENT_INVALIDATE` (Chat-WS-Side-Channel)

Complementary to the live push on the documents channel,
[`DocumentInvalidationEmitter`](../repos/vance/server/vance-brain/src/main/java/de/mhus/vance/brain/documents/DocumentInvalidationEmitter.java)
fires a [`DOCUMENT_INVALIDATE`](/docs/websocket-protokoll#6-typen-katalog-aktuell)-frame
on the **Chat-WS** (Session channel) of the initiating session for every `doc_*` tool write operation.

Purpose: the `documents.changed` fan-out requires Redis Pub/Sub for cross-pod
and an active `documents.subscribe` for the recipient. For the
single-session-agent-writes case (Cortex tab of the same user who triggered the
tool call), this is overkill — the frame travels instead
via the already existing Chat-WS tunnel, which delivers stably cross-pod
even without Redis.

Both frames may arrive in parallel at the Cortex tab; the client-side
refresh is idempotent via ETag/`storageId`. Details:
`planning/cortex-document-invalidation.md`.

### 3.3 Redis Storage

Presence roster per path as Redis HASH:

```
Key:    vance:{tenantId}:documents:viewers:{base64url(path)}
Type:   HASH
Field:  editorId
Value:  JSON { editorId, userId, displayName, podId }
TTL:    90s on the Key (Heartbeat every 30s rewrites fields)
```

Cross-pod signaling via Pub/Sub:

```
Topic:    vance:{tenantId}:documents.presence   # Pattern subscribe vance:*:documents.presence
Payload:  "{podId}|{base64(path)}"              # "something happened on path X, refetch HASH"
```

```
Topic:    vance:{tenantId}:documents.changed
Payload:  "{podId}|{base64(path)}|{kind}|{editorId?}|{base64(displayName)?}|{userId?}"
```

Self-echo is discarded via `podId` (per-process UUID of the Brain service singleton)
— each Pod ignores its own publishes. Legacy 3-part frames
(rolling deploys) are still accepted on the receiver side.

### 3.4 TTL Replaces Cluster Liveness Prune

Early iterations had a `@Scheduled pruneDeadPods` that cleaned up based on
`ClusterService.liveClusterNodeNames()`. With TTL per key, this is no longer needed:
if a Pod crashes, its fields expire automatically within the TTL.

## 4. Writer Identity

### 4.1 Concept

Three optional fields accompany each `changed` frame:

- **`editorId`** — the per-connection identifier of the WS connection that
  triggered the write (see [editorId convention](#42-editorid)). The
  Broadcaster filters this connection out of the fan-out.
- **`editorUserId`** — username of the writer (= `subjectId` of the
  `SecurityContext`).
- **`editorDisplayName`** — display name of the writer (currently = userId, as
  `UserDocument` has no separate field; reserved for future).

### 4.2 editorId

A random UUID per WebSocket connection, generated by the server during handshake
and sent to the client in the `welcome` frame
(`WelcomeData.editorId`). Live for the lifetime of the WS — reconnect
produces a new value.

The client sends the editorId with every REST write as an HTTP header
**`X-Editor-Id`**. The Brain REST filter thus knows which connection triggered
the write, and the Broadcaster filters it out of the live push
(no self-banner).

### 4.3 TOOL_IDENTITY

LLM Tools, Scripts, Slartibartfast, Scheduler, Kit installers have no
WS connection. They use
[`DocumentService.TOOL_IDENTITY`](../repos/vance/server/vance-shared/src/main/java/de/mhus/vance/shared/document/DocumentService.java) —
`editorId = "_tool"`, `userId/displayName = null`. Real clients have
random UUID editorIds, never the literal `"_tool"`, so no
real subscriber falls victim to the writer filter.

The `null` user fields ensure that the ⏺-badge does not appear with a
confusing "_tool changed this".

### 4.4 Plumbing Path

```
HTTP-Header X-Editor-Id ────┐
                            ▼
JWT (Spring SecurityCtx) ─→ DocumentController.writerIdentity()
                            │
                            ▼
                  DocumentService.WriterIdentity(editorId, userId, displayName)
                            │
                            ▼
                  publishUpserted/publishDeleted
                            │
                            ▼
                  DocumentLiveChangedEvent(..., editorId, editorUserId, editorDisplayName)
                            │
                            ▼
                  DocumentChangedBroadcaster
                            │
                            ▼
                  Redis Pub/Sub (cross-pod) + local fan-out (skip writer's WS)
                            │
                            ▼
                  DocumentChangedNotification frame
```

## 5. REST Integration

### 5.1 ETag-based Browser Caching

`GET /brain/{tenant}/documents/{id}/content` sets:

- `ETag: "<storageId>"` — `storageId` changes with every content write.
- `Cache-Control: private, no-cache` — Browser may cache, but MUST
  revalidate with `If-None-Match` on every read.

As long as the body is unchanged: `304 Not Modified`. On change:
`200` with new body and new ETag. This fixes the previous bug "Reload shows
old content" caused by `Cache-Control: private, max-age=300`.

### 5.2 Content-Equality-Short-Circuit

`DocumentService.replaceContent(...)` buffers the incoming body and
compares byte-for-byte with the current storage version. If identical
*and* unchanged MIME: complete no-op — no storage write, no
archive, no Mongo save, no live event. Fixes the Cortex auto-save
spam symptom (editor marks dirty on pure clicks, but sends
identical body).

### 5.3 X-Editor-Id Header

Optional header on `PUT /content`, `PUT /{id}` and `DELETE /{id}`.
Value comes from the client's WelcomeData. If the header is missing (e.g., internal
server-side calls), `TOOL_IDENTITY` is used — meaning all
subscribers see the event (no writer skip).

## 6. Client Architecture

### 6.1 Baseline Tracking

Each editor remembers the "last synchronized with the server" text
per document as **Baseline**:

- DocumentApp: `baselineInlineText: Ref<string>` — set in `fillEditor`
  and after successful `replaceContent`.
- Cortex: `CortexDocument.baselineInlineText` tab field — set in
  `dtoToDocument`, `openTab`, `reloadTab`, after `saveActive`.

Dirty check is `editorBuffer !== baseline`. For the 3-way merge, the
Baseline is `text1` (common ancestor).

### 6.2 Reaction-Composable

`useDocumentChangeReaction({ path, tryApply, forceApply })` —
[Source](../repos/vance/client/packages/vance-face/src/composables/useDocumentChangeReaction.ts).
Editor passes:

- **`path: Ref<string | null>`** — the subscribed path. Reactive.
- **`tryApply(notification)`** — Editor logic: "can I
  silently absorb this change?" Returns `true` (done) or `false` (show banner).
- **`forceApply(kind)`** — "User clicked 'Accept Remote'": unconditional
  apply.

Composable returns:

- **`pendingChange: Ref<string | null>`** — `kind` if banner should be shown.
- **`recentEditor: Ref<RecentEditor | null>`** — `{displayName}` for ⏺-badge,
  auto-clear after 2500 ms.
- **`keepLocal()` / `acceptRemote()`** — Banner actions.

### 6.3 Per-Tab in Cortex

Cortex (multi-tab editor) does **not** use the single-path composable
but its own per-tab map. Each open tab has its own
`onDocumentChanged` subscription with its own `pendingChange` and
`recentEditor`. This eliminates race conditions if the user switches tabs
while events are in-flight: each event lands at *its* tab,
regardless of the active state.

Banner and badge in the Topbar show the state of the active tab.

### 6.4 3-way-Merge

`tryThreeWayMerge(baseline, local, remote)` in
[`useDocumentChangeReaction.ts`](../repos/vance/client/packages/vance-face/src/composables/useDocumentChangeReaction.ts).
Uses `diff-match-patch` (MIT, ~30 KB):

```
patches = patch_make(baseline, local)      // User's own edits relative to ancestor
[merged, results] = patch_apply(patches, remote)  // Apply to the remote
```

Conservative tuning: `Match_Threshold = 0` and `Patch_DeleteThreshold = 0`
— every context shift is considered a conflict, no fuzzy match. Better
safe than too aggressive merging.

Trivial cases short-cuts:
- `baseline === remote` → no remote change → pass through `local`.
- `baseline === local` → no local edit → accept `remote`.

### 6.5 Reaction Matrix

What happens when `documents.changed` arrives for an open editor:

| Editor State | Mime | Action |
|---|---|---|
| Clean | text/binary (not AV) | **Silent reload**. Update baseline. Show badge. |
| Dirty, Text, mergeable | text/* | **Silent 3-way merge**. Set baseline to new remote. Show badge. |
| Dirty, Text, Conflict | text/* | **Conflict banner**: `[Keep Mine]` / `[Accept Remote]`. Baseline unchanged. |
| Audio / Video | audio/*, video/* | **Banner** — silent re-bind could interrupt playback, always user decision. |
| Image / PDF / other Binary | application/*, image/* | **Silent reload** (browser cache reloads via ETag). Show badge. |

`tryApply` returns `true` for silent paths, `false` for banner paths.

### 6.6 ⏺-Awareness-Badge

After every **successful** silent apply (whether merge or reload), the
writer's `editorDisplayName` (or fallback `editorUserId`) is displayed as
`⏺ {name}` in the Topbar — opacity fade over 0.6s, visible for
2500 ms, then gone.

Each tab has its own fade timer; a new save from the same writer resets the
timer.

## 7. Failure Modes

| Scenario | Behavior |
|---|---|
| `vance.redis.enabled=false` | Documents channel works, but presence roster remains empty (no cross-pod state), `changed` events are not distributed cross-pod. Brain itself continues to run normally. |
| WS reconnect | Welcome frame brings a **new** `editorId`. Subscriptions are automatically replayed by the client (`wsConnectionStore`). Per-tab composables in Cortex retain their `pendingChange` banners across reconnect. |
| WS-Close without Cleanup | Heartbeat TTL expires after 90s, roster entry disappears automatically. |
| Concurrent writes to the same Document | **Last-write-wins** on the server (no OCC at this stage). With auto-merge in editors, this handles most cases; for true overlap conflicts, the banner appears. Planned: optimistic concurrency with `If-Match` header (see §11). |
| Client crash with dirty buffer | Local buffer is lost. Server has the last successfully saved state. |

## 8. Trace Logs

Brain-side (enable TRACE on `de.mhus.vance`):

```
DocumentChangedBroadcaster: documents.changed[local|remote] podId={} path={} kind={} writer={} → publish/fanOut
DocumentChangedBroadcaster: documents.changed[*] skip writer ws='{}' editorId='{}'
DocumentSubscriberRegistry: documents.subscribe/unsubscribe ws='{}' user='{}' path='{}'
DocumentService: publishUpserted contentChanged={} liveEligible={} writer={}
DocumentService: Skipping no-op content replace tenantId='{}' projectId='{}' path='{}' size={}
```

Client-side (`console.debug`):

```
[documents.changed] path='X' kind=upserted writer='alice' → tryApply
[documents.changed] path='X' → silent | banner
[documents.changed] tab='X' merged silently | conflict → banner | (AV)
```

## 9. UI Consistency

- Banner and badge live in the **Topbar Extra Slot** of the `EditorShell` next
  to the `DocumentPresenceStrip`. Layout fixed: Badge left (small text with
  ⏺), Banner center (warning border, 2 buttons), Strip right (avatars).
- i18n keys under `documents.externallyChanged.{upserted,deleted,
  upsertedTooltip,deletedTooltip,keepLocal,acceptRemote}` and
  `documents.recentEditor.tooltip`. DE and EN.

## 10. Code Anchors

| Aspect | File |
|---|---|
| Live Event | `vance-shared/.../document/DocumentLiveChangedEvent.java` |
| WriterIdentity + Service Plumbing | `vance-shared/.../document/DocumentService.java` |
| REST Header Plumbing | `vance-brain/.../documents/DocumentController.java` |
| Subscriber Registry | `vance-brain/.../ws/documents/DocumentSubscriberRegistry.java` |
| Changed Broadcaster | `vance-brain/.../ws/documents/DocumentChangedBroadcaster.java` |
| Channel Handler | `vance-brain/.../ws/documents/DocumentChannelHandler.java` |
| Wire DTOs | `vance-api/.../ws/DocumentChangedNotification.java`, `DocumentPresenceNotification.java`, `DocumentSubscribeRequest.java`, `DocumentViewer.java` |
| Redis Facade | `vance-shared/.../redis/VanceRedisMessagingService.java` |
| Client Composable | `vance-face/src/composables/useDocumentChangeReaction.ts` |
| Client WS-Store | `vance-face/src/ws/wsConnectionStore.ts` |
| Client Banner/Badge | `vance-face/src/document/DocumentApp.vue`, `vance-face/src/cortex/CortexApp.vue` |
| Tests | `vance-brain/src/test/.../DocumentChangedBroadcasterTest.java`, `DocumentSubscriberRegistryTest.java`, `vance-shared/.../document/DocumentLiveEventFilterTest.java` |

## 11. Not in Scope (Phase B / C / D — Planned)

| Item | Status |
|---|---|
| **OCC with `If-Match`** — Server rejects outdated PUTs with 412, client retries with fresh-fetched + 3-way-merge | Phase C, open. Solves last-write-wins loss in true race conditions. |
| **CodeMirror-Gutter-Highlight** — Line numbers of changed lines briefly light up after merge | Phase D, open. CSS decoration over the diff result. |
| **Partial-Apply for Conflicts** — silently accept non-colliding hunks, only conflicting ones in the banner | Deliberately excluded — editor buffer in an intermediate state would be more confusing than all-or-nothing. |
| **Operational Transformation / CRDT** | Deliberately excluded — Vance is a Think Engine, not Google Docs. |
| **Cursor-Position-Sharing** | Deliberately excluded — Awareness layer is `presence` (who is there) + `changed` (who wrote), not "who is where". |

## 12. Reload Compatibility / Rolling Deploy

- The wire payload format of `documents.changed` is variable: 3 parts (legacy)
  to 6 parts (current). Receivers accept all variants and fill
  missing fields with `null`. During a rolling deploy,
  Pods can publish different versions without issues.
- The `X-Editor-Id` header is *optional* — if missing, the server falls back to
  `TOOL_IDENTITY` (no writer-skip filter, all subscribers
  receive the event). Old client bundles continue to function.
- `If-None-Match` is optional — old browsers without ETag support simply
  always fetch the body.
