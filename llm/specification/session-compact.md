# Vancetope — Session Compact (manual)

> "Compact" manually triggers memory compaction for a Session: older chat turns
> are folded into an `ARCHIVED_CHAT` summary to reduce the context window. This
> is the same mechanism the Engine otherwise uses automatically at its threshold.
> The action is located in the Session menu of the chat list (`🗜`). It runs
> **on the Process Lane** (serialized with Turns), is owner-only, and a no-op
> ("nothing left to compact") is a normal result, not an error.
>
> See also: [session-lifecycle](session-lifecycle.md) | [session-crop](session-crop.md) | [memory-compaction](memory-compaction.md) | [websocket-protokoll](websocket-protokoll.md)

---

## 1. Initial Situation

`MemoryCompactionService.compact(process)` exists and is executed by the Engines
mid-turn via `compactIfNeeded(...)`. Previously, manual Compaction was
**only accessible via WebSocket** (`PROCESS_COMPACT` → `ProcessCompactHandler`,
Foot `/compact`) — **no REST endpoint**. `compact(process)` is self-sufficient:
it resolves its Summarizer `AiChatConfig` from the Settings
(`ai.default.provider`/`ai.default.model`) and **does not** require `ModelInfo`
(which is only needed by the threshold-controlled `compactIfNeeded` path).

## 2. Lane Safety (and a Race Condition Fixed)

Compaction writes a new `MemoryDocument` and calls
`chatMessageService.markArchived(...)` on the active chat lines. If this runs
in parallel with a Turn that has already built its Prompt from `activeHistory(...)`,
its in-memory Prompt/Anchor becomes inconsistent. Therefore, manual Compaction
runs via `LaneScheduler.submit(chatProcessId, …)`: the Process Lane is FIFO,
and Compaction runs **between** Turns, never in parallel.

The existing WS handler `ProcessCompactHandler` previously called `compact(process)`
**synchronously on the WS thread** (off-lane) — this race condition has been
fixed: the WS/Foot path now also runs via the Lane.

## 3. "Already Compacted" / No-op

`compact()` returns a `CompactionResult` with `compacted=false` + `reason`
if there is nothing to do — especially if the active History is ≤ `keepRecent`
(`FordProperties`, default 10), or everything is PINNED/STRONG/in the recent-Anchor,
or the Summarizer returns an empty/erroneous response. After a Compaction,
the active History shrinks to ~10 → an immediate second call is a clean no-op.
The UI displays this as neutral information ("Nothing to compact"), **not** as an error.

## 4. "Someone is Currently Working on It"

Signals: `SessionConnectionRegistry.connectionCount(sessionId)`,
`SessionDocument.boundConnectionId` (≠ null = bound),
`ThinkProcessDocument.getStatus() == RUNNING`.

Policy: **Warn + Confirm if client is connected.** The Web UI checks the
`bound` flag of the Session (already in the list data) and displays a
confirmation dialog if the Session is connected. Execution still proceeds
safely on the Lane — the confirmation is purely a user pre-warning, not a
technical necessity.

## 5. API

**`POST /brain/{tenant}/sessions/{id}/compact`** (owner-only, `Action.EXECUTE`):

- Resolves the chat Process (`sessionId → chatProcessId → ThinkProcessDocument`;
  if missing, no-op response `reason="no chat process"`).
- Enqueues `compact(process)` on the Lane and waits up to
  `COMPACT_TIMEOUT_MS` (60 s). On timeout: `deferred=true` — compaction
  remains enqueued and runs after the current Turn.
- Response `SessionCompactResponse { compacted, messagesCompacted,
  summaryChars, memoryId, reason, deferred }`.

WS path unchanged in contract (`PROCESS_COMPACT` / `ProcessCompactResponse`),
only internally switched to the Lane.

## 6. Web UI

`🗜 Compact` in the `SessionActionsMenu` (owner-gated, in any Session state).
If a Session is connected, a confirmation dialog appears. The result is
displayed as a transient info banner in the Session list (`PickerView`):
"Compacted: N messages summarized" / "Nothing to compact" / "Compaction enqueued".
Shared action logic in the Composable `useSessionActions` (`compact()`),
together with the other Session actions.

## 7. Limitations (v1)

- No dedicated progress indicator while the Summarizer LLM call is running;
  the UI waits for the HTTP response or receives "enqueued" if a Turn is active.
  Connected clients also see the existing `StatusTag.COMPACTION` progress frame.
- Affects the `chat` Process of the Session. Worker sub-Processes do not have
  their own manual Compact trigger.
- No Range/Topic Recompaction via this action (only Sliding-Window); the
  Range variant remains internal to the Engine/Plan Mode.
