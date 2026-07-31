# Vancetope — Session Compact (manual)

> "Compact" manually triggers the memory compaction of a Session: older chat turns are folded into an `ARCHIVED_CHAT` summary to reduce the context window — the same mechanism the Engine otherwise runs automatically at its threshold. The action is located in the Session menu of the chat list (`🗜`). It runs **on the process Lane** (serialized with Turns), is owner-only, and a no-op ("nothing left to compact") is a normal result, not an error.
>
> See also: [session-lifecycle](session-lifecycle.md) | [session-crop](session-crop.md) | [memory-compaction](../memory-compaction.md) | [websocket-protocol](websocket-protokoll.md)

---

## 1. Initial Situation

`MemoryCompactionService.compact(process)` exists and is run by the Engines in the middle of a Turn via `compactIfNeeded(...)`. Manually, compaction was previously only accessible **via WebSocket** (`PROCESS_COMPACT` → `ProcessCompactHandler`, Foot `/compact`) — **no REST endpoint**. `compact(process)` is self-sufficient: it resolves its summarizer `AiChatConfig` from the settings (`ai.default.provider`/`ai.default.model`) and **does not** require `ModelInfo` (which is only needed by the threshold-controlled `compactIfNeeded` path).

## 2. Lane Safety (and a Race Condition Fixed)

Compaction writes a new `MemoryDocument` and calls `chatMessageService.markArchived(...)` on the active chat lines. If this runs in parallel with a Turn that has already built its prompt from `activeHistory(...)`, its in-memory prompt/anchor becomes inconsistent. Therefore, manual compaction runs via `LaneScheduler.submit(chatProcessId, …)`: the process Lane is FIFO, compaction runs **between** Turns, never in parallel.

The existing WS handler `ProcessCompactHandler` previously called `compact(process)` **synchronously on the WS thread** (off-lane) — this race condition has been fixed: the WS/Foot path now also runs via the Lane.

## 3. "Already Compacted" / No-op

`compact()` returns a `CompactionResult` with `compacted=false` + `reason` if there's nothing to do — especially if the active history is ≤ `keepRecent` (`FordProperties`, default 10), or everything is PINNED/STRONG/in the recent anchor, or the summarizer returns an empty/erroneous response. After a compaction, the active history shrinks to ~10 → an immediate second call is a clean no-op. The UI displays this as neutral information ("Nothing to compact"), **not** as an error.

## 4. "Someone is Currently Working on It"

Signals: `SessionConnectionRegistry.connectionCount(sessionId)`, `SessionDocument.boundConnectionId` (≠ null = bound), `ThinkProcessDocument.getStatus() == RUNNING`.

Policy: **Warn + Confirm if client is connected.** The Web UI checks the `bound` flag of the Session (already in the list data) and displays a confirmation dialog for a connected Session. Execution still occurs safely on the Lane — the confirmation is purely a user pre-warning, not a technical necessity.

## 5. API

**`POST /brain/{tenant}/sessions/{id}/compact`** (owner-only, `Action.EXECUTE`):

- Resolves the chat process (`sessionId → chatProcessId → ThinkProcessDocument`; if missing, no-op response `reason="no chat process"`).
- Enqueues `compact(process)` on the Lane and waits up to `COMPACT_TIMEOUT_MS` (60 s). On timeout: `deferred=true` — compaction remains enqueued and runs after the current Turn.
- Returns `SessionCompactResponse { compacted, messagesCompacted, summaryChars, memoryId, reason, deferred }`.

WS path unchanged in contract (`PROCESS_COMPACT` / `ProcessCompactResponse`), only internally switched to the Lane.

## 6. Web UI

`🗜 Compact` in the `SessionActionsMenu` (owner-gated, in any Session state). Confirmation dialog for a connected Session. The result appears as a transient info banner in the Session list (`PickerView`): "Compacted: N messages summarized" / "Nothing to compact" / "Compaction enqueued". Shared action logic in the Composable `useSessionActions` (`compact()`), together with the other Session actions.

## 7. Limitations (v1)

- No dedicated progress indicator while the summarizer LLM call is running; the UI waits for the HTTP response or receives "enqueued" if a Turn is in progress. Connected clients also see the existing `StatusTag.COMPACTION` progress frame.
- Affects the `chat` process of the Session. Worker sub-processes do not have their own manual Compact trigger.
- No range/topic recompaction via this action (only sliding-window); the range variant remains internal to the engine/Plan Mode.
