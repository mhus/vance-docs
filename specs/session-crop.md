---
title: "Vance — Session Modify / Crop"
parent: Specs
permalink: /specs/session-crop
---

<!-- AUTO-GENERATED from specification/public/en/session-crop.md — do not edit here. -->

---
# Vance — Session Modify / Crop

> "Crop" removes messages from a Session's **memory** without deleting them.
> The user can remove individual turns in the middle or "crop from here"
> (this message and all subsequent ones) — and restore everything at any time.
> Removed messages remain in the database (auditable) but are invisible to the AI:
> out of every LLM replay, compaction, recompaction, and history search path,
> and out of the chat history. The action is located in the Session menu of the
> chat list (`✂`) and opens a modal — the target Session does not need to be open.
>
> See also: [session-lifecycle](/specs/session-lifecycle) | [session-duplicate](/specs/session-duplicate) | [memory-compaction](/specs/memory-compaction) | [websocket-protokoll](/specs/websocket-protokoll)

---

## 1. Marking — No New Attribute

"Removed" is expressed via the **existing** `meta.kind` type on `ChatMessageDocument`
(the same mechanism as `kind=interim`), with the new value
**`meta.kind = "removed"`**:

- `ChatMessageDocument.KIND_REMOVED = "removed"` + helper `isRemoved()` —
  parallel to `KIND_INTERIM`/`isInterim()`.
- **No new DB field.** Since `ChatMessageDto.meta` already goes to the client,
  the Crop UI sees the state (`meta.kind === 'removed'`) without DTO changes.
- Only the marker changes — `content`, `role`, `tags`, timestamps remain
  untouched. Reversible: removing the marker = message back in memory.

Distinction from other exclusion mechanisms: `archivedInMemoryId`
(Compaction) folds messages into a Summary; `STRENGTH:*` tags are a
soft filter. "Removed" is the **explicit user decision** "this does not
belong in memory".

## 2. Where "removed" is respected

| Path | Method | Behavior |
|------|---------|-----------|
| LLM Replay (all Engines, Compaction, Prak) | `ChatMessageService.activeHistory` | removed **out** (in addition to interim) |
| Chat Scrollback (REST) | `activeHistoryWithInterim` | removed **out**, interim remains (dimmed) |
| Crop Editor | `historyForCrop` | removed **in** (for restoration), interim out |
| Recompaction Range | `findActiveInRange` | removed **out** (Query Criteria) |
| history_search Tool | `search` | removed **out** (Query Criteria) |
| WS Resume Push | `SessionCreateHandler.pushAppendedMessages` | removed not re-emitted |
| Audit / Full History | `history` | removed **in** (nothing is lost) |

## 3. Mutation

`ChatMessageService`:
- `markRemoved(tenantId, sessionId, ids)` — `$set meta.kind=removed`, tenant+session-scoped, idempotent.
- `unmarkRemoved(tenantId, sessionId, ids)` — `$unset meta.kind`, only on rows that are currently `removed` (protects a potential `interim` marker).

## 4. API

- **`GET /brain/{tenant}/sessions/{id}/messages?includeRemoved=true`** —
  Crop list (logical conversation including removed, without interim).
  **Owner-only** (the normal scrollback remains readable for shared Sessions;
  the Crop view does not).
- **`PATCH /brain/{tenant}/sessions/{id}/messages/crop`** — Body
  `SessionCropRequest { remove: string[], restore: string[] }` (both
  optional/idempotent). Owner-only, `Action.WRITE`. Response: the fresh
  Crop list (`ChatMessageDto[]`), so the modal re-renders in one roundtrip.
  Crop-from-point is expressed by the client as a `remove` list of all
  messages from the selected point.

## 5. Web UI

`✂ Crop` in the `SessionActionsMenu` (owner-gated, in any Session state
— history survives archiving). If the Session is currently connected
(`session.bound` — someone might be working on it), the UI warns in advance
via a confirmation dialog before opening the modal (consistent with the Compact
action, see [session-compact](/specs/session-compact) §4). Opens `SessionCropModal` (Host:
`PickerView`): list of all messages with a checkbox per turn, `✂` button "crop
from here", live preview (removed = struck through/red, restored = green),
batch apply with change counter. Persisted only on "Apply" (Diff → `remove`/`restore`),
before that purely local and discardable.

## 6. Limitations (v1)

- No WS live notification to a currently open chat view of the same
  Session: anyone with the chat open in parallel will only see the removal
  after reload/reconnect. (The REST and Resume paths are consistent; only the
  ongoing live stream is not retroactively cleaned up.)
- Cropping affects the `chat` process of the Session (the user conversation).
  Worker sub-processes do not have their own Crop interface.
- No cascade to already generated Compaction Summaries: a Summary that
  summarized a message later removed will not be recomputed.
  New Compactions will consider the removed status.
