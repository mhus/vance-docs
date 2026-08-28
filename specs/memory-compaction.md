---
title: "Vancetope — Memory Compaction"
parent: Specs
permalink: /specs/memory-compaction
---

<!-- AUTO-GENERATED from specification/public/en/memory-compaction.md — do not edit here. -->

---
# Vancetope — Memory Compaction

> Long Sessions accumulate more chat history than any model's context window can hold. Memory Compaction folds older turns into an **`ARCHIVED_CHAT` summary** and replays it in every subsequent prompt — the LLM continues to follow the thread without the prompt exploding. This spec describes **triggers, selection, persistence, replay, and the Pinned convention**, which guarantees that critical messages never have to survive compaction because it never affects them.
>
> See also: [memory-knowledge-management](/specs/memory-knowledge-management) | [arthur-engine](/specs/arthur-engine) | [frankie-engine](/specs/frankie-engine) | [trillian-engine](/specs/trillian-engine) | [plan-mode](/specs/plan-mode) | `planning/memory-compaction.md` | `planning/topic-recompaction.md`

---

## 1. Purpose and Scope

**Problem.** An LLM Engine running in chat mode for extended periods (Frankie-Coding-Session, Arthur-Plan-Session, Trillian-`void`-Loop) accumulates USER and ASSISTANT messages per turn. Without intervention, the replay volume will eventually exceed the model's context window — `tokensIn` races towards 100%, the next call fails, or costs explode.

**Solution.** Before each LLM call, the Engine checks the token volume against thresholds. If exceeded, `MemoryCompactionService` condenses older messages into a summary and marks the originals as archived. `MemoryContextLoader` replays the active summary into the next prompt. The LLM does not lose the thread.

**What Compaction is not:**

- **No user-visible forgetting.** Originals remain in `chat_messages` with an `archivedInMemoryId` pointer; they are still readable via `history(...)` (Audit, `history_search` tool).
- **No Persona Memory.** Compaction summarizes the conversation, not "what the user likes." Persistent profile facts belong in the `_user_<login>` hub (see [memory-knowledge-management](/specs/memory-knowledge-management)).
- **No Topic Sorting.** Sliding-window works purely chronologically / strength-based. The **Range Recompaction path** (§3.2) is the topic-aware alternative for Plan Completion.

---

## 2. Data Model

A Compaction lives as a special Memory Document:

| Field | Value |
|---|---|
| `kind` | `ARCHIVED_CHAT` (Enum in `MemoryKind`) |
| `tenantId` / `projectId` / `sessionId` / `thinkProcessId` | Scope of the summarized conversation |
| `content` | LLM-generated summary of the compacted range |
| `sourceRefs` | IDs of the archived `ChatMessageDocument` rows |
| `metadata.compactedMessages` | Number of compacted messages |
| `metadata.provider` / `metadata.model` | Which LLM generated the summary |
| `metadata.supersededMemoryId` | For hierarchical compaction: ID of the older `ARCHIVED_CHAT` row that is now retired |
| `metadata.recompaction` | `true` for the Range path (otherwise absent) |
| `metadata.topicLabel` | Range path: topic name assigned by the Plan |
| `metadata.rangeFromAt` / `metadata.rangeToAt` | Range path: time window of the compaction |
| `supersededAt` | Set to the time of the next compaction — after this, the row is no longer active |

The original `ChatMessageDocument` rows get `archivedInMemoryId` set to the ID of the new `ARCHIVED_CHAT` Memory:

- `ChatMessageService.history(...)` continues to provide them (Audit / Debug / Trace).
- `ChatMessageService.activeHistory(...)` filters them out — this is the LLM replay path. The LLM only sees the summary plus the most recent unarchived messages.
- `history_search` / `history_recall` tools (see process-history-search) find them via tags and full-text.

`markArchived(messageIds, memoryId)` is idempotent — a message that already has an `archivedInMemoryId` is skipped by the second path.

---

## 3. Compaction Paths

Two orthogonal paths, both write to the same data model:

### 3.1 Sliding-Window Path (automatic, size-based)

`MemoryCompactionService.compactIfNeeded(process, config, outgoingPrompt, modelInfo)` runs at the beginning of a turn. It estimates the token volume of the outgoing prompt (`compactionTriggerService.estimateTokens`, cheap chars/4 heuristic) and compares it against three thresholds from `PrakProperties`:

| Threshold | Default | Behavior | Anchor (verbatim) |
|---|---|---|---|
| `compactionSoftThreshold` | 0.40 | SOFT — hint / Inbox offer only; Selector spares NORMAL+STRONG+PINNED | `softAnchor` (10) |
| `compactionHardThreshold` | 0.85 | HARD — forced compaction; Selector spares STRONG+PINNED | `hardAnchor` (5) |
| `compactionEmergencyThreshold` | 0.95 | EMERGENCY — last resort; Selector spares **only** PINNED | `emergencyAnchor` (3) |

Below 0.40 → `CompactionMode.NONE`, no-op. In the NONE case, the Engine makes the LLM call directly with the unshortened history.

The **Anchor** is the set of the last K messages that *always* remain verbatim — regardless of Strength tag. It is the "fresh context" of a turn. `keepRecent` (Default 10) is additionally checked as a minimum barrier at the start of selection: if `active.size() ≤ keepRecent`, compaction is a no-op from the outset (there is nothing to fold before the Anchor).

**Selection via [StrengthAwareSelector](#52-selector-protection):**

| Strength | SOFT | HARD | EMERGENCY |
|---|---|---|---|
| `STRENGTH:pinned` | stay | stay | stay |
| `STRENGTH:strong` | stay | stay | compact |
| `STRENGTH:normal` (or absent + substantive) | stay | compact | compact |
| `STRENGTH:weak` (or absent + trivial) | compact | compact | compact |

"trivial" = the message matches `TrivialPatterns.isAck` or `isSelfNarration` — the optimistic fallback if no explicit tag is set and Prak was not active.

**Summarizer.** `callSummarizer(process, config, priorSummary, older)` calls the configured ChatModel (same Recipe model choice as the Engine itself uses) with two inputs: (a) the previously active `ARCHIVED_CHAT` summary if available (hierarchy chain), and (b) the messages to be archived. Output: a new summary that combines both. This allows the summary to grow **controlled** over multiple compaction runs because the summarizer prompt itself requests shortening; however, it does not grow indefinitely — `compactionMaxSourceChars` caps the input.

**Persistence Order:**

1. Save new `ARCHIVED_CHAT` Memory.
2. `markArchived(olderIds, savedMemoryId)` on the selected chat rows.
3. If a prior active summary existed: `memoryService.supersede(priorId, newId)` — old becomes inactive, audit chain via `supersededByMemoryId` remains navigable.

If step 2 fails, the chat rows remain unarchived; the next turn attempts it again. If step 3 fails, there are briefly two active summaries — `MemoryContextLoader.appendArchivedChatSummary` takes the newest via `getLast()` in that case.

**Client-visible Signal.** `ChatMessageStatus.COMPACTION` is emitted via the progress channel — the Web UI renders a `[compaction]` status stitch in the chat history, so the user sees "Vancetope summarized the thread here."

### 3.2 Range Recompaction Path (Plan-Mode Hook, opt-in)

`MemoryCompactionService.compactRange(process, fromCreatedAt, toCreatedAt, topicLabel)` condenses an **explicit time range** instead of the oldest N turns — a sub-topic block that the user has actively completed.

**Trigger:** the last Todo of a Plan flips to `COMPLETED`, and before the `MODE:plan` marker there are ≥ 2 USER turns about other topics → `PlanModeService.maybeOfferRecompaction` posts an Inbox Item (`type=APPROVAL`, tag `RECOMPACTION_OFFER`). If the user accepts, `RecompactionOfferAnsweredListener` calls `compactRange` with the range coordinates stored in the payload.

**In addition to normal compaction writing**, the Range path inserts a `SYSTEM` marker with tag `RECOMPACTION:<topicLabel>` at the end of the range in `chat_messages` — it is visibly in the chat as a topic stitch, unlike sliding-window compaction which only archives the originals and relies on the replay block (§4.1).

The trigger is semantic (topic completion), aiming for **focus** rather than size. Works engine-agnostically thanks to shared `PlanModeService`.

Details: [plan-mode](/specs/plan-mode) §15, `planning/topic-recompaction.md`.

### 3.3 Relationship of the Two Paths

Both are **orthogonal and non-competing:**

- Sliding-Window runs even if no Plan is involved (pure long-session hygiene).
- Range runs only on Plan Completion with prior history — user-confirmed.
- Both use the same persistence (`ARCHIVED_CHAT` Memory + `archivedInMemoryId`). A turn can theoretically be archived by both paths; `markArchived` is idempotent.

---

## 4. Prompt Integration

Compaction without replay would be *de-facto forgetting*: the summary would be in Mongo, but the LLM would never see it. `MemoryContextLoader` therefore injects it in every turn.

### 4.1 Summary Replay

`MemoryContextLoader.appendArchivedChatSummary(sb, process)` runs as part of `composeBlock(process, userQuery)` between Client-Agent-Doc and RAG-Auto-Inject. Implementation:

1. `memoryService.activeByProcessAndKind(tenantId, processId, ARCHIVED_CHAT)` — Sort ASC by `createdAt`.
2. If empty → no-op.
3. Otherwise: take `list.getLast()` (newest active summary).
4. Append under `## Earlier Conversation (compacted)` to the Memory block.

| Rule | Behavior |
|---|---|
| At most one active summary per Process | `supersede()` retires older rows on the next `compact()`. In a stable state, `activeByProcessAndKind` returns at most one row. In case of a race on two: `getLast()` takes the newer one. |
| Visible in every turn | Lives in the static System Prompt block — placed *before* the `cache_control` cut in the Anthropic prompt cache strategy. A compaction update breaks the cache once; one cache reset per compaction is acceptable. |
| Audit path untouched | No `chat_messages` mutations — the replay block exists only in the in-memory prompt construction. `history(...)` / `activeHistory(...)` remain unchanged. |
| Hierarchy is transparent | For multiple compactions in a session, the LLM always sees the *current* (hierarchically compacted) summary, not a chain of old summaries — `supersede()` retires the predecessors. |

### 4.2 Worker Spawn Context Inheritance

`MemoryContextLoader.appendParentContext(sb, process)` adds a `## Parent Context` block if `process.parentProcessId != null`. A newly spawned Worker would otherwise be completely blind to its Parent's mission (its own `processId` → its own empty `chat_messages` view).

Implementation:

1. `thinkProcessService.findById(parentProcessId)`. On exception or empty → graceful skip.
2. Identity block always: Parent Name, Recipe, Engine, Title.
3. **Confidentiality Cut** on `process.projectId == parent.projectId`:
   - **Same-project Workers** additionally receive the Parent's active `ARCHIVED_CHAT` summary under `### Parent Conversation Summary`. This allows the Worker to operate with context without having to ask the Parent for goals.
   - **Cross-project Workers** (`allowsCrossProjectSpawn=true` Engines like [Trillian-Control](/specs/trillian-engine)) see **only** the Identity. The Parent summary remains in the Parent project — `activeByProcessAndKind` is not even fired. Workers needing more context receive it explicitly as a `goal` parameter during spawn.

| Scenario | Identity Block | Parent Summary |
|---|---|---|
| Same-project Frankie-Worker with active Parent Summary | ✓ | ✓ |
| Same-project Frankie-Worker without Parent Summary | ✓ | (none available) |
| Cross-project Trillian-Worker | ✓ | ✗ (Confidential) |
| Parent orphaned (`findById` empty) | ✗ | ✗ (graceful skip) |
| Mongo-Down during Lookup | ✗ | ✗ (Exception swallowed) |

Defensive Rendering: missing fields (`name`, `recipeName`, `thinkEngine`) are rendered as `?` — never `null` in the prompt.

---

## 5. Pinned Convention

PINNED messages survive **every** compaction stage, including EMERGENCY. The convention for the tag and the auto-pin rule:

### 5.1 Tag Format

Strength tags follow the format `STRENGTH:<lowercase-enum>` from `SpanStrength.tag()`:

- `STRENGTH:weak` — Compaction first, 5-turn TTL in working buffer
- `STRENGTH:normal` — Default for substantive messages, 20-turn TTL
- `STRENGTH:strong` — Important items / Hot-Path, 50-turn TTL
- `STRENGTH:pinned` — Compaction-immune, **never derived** — only explicitly set

Sources for the `STRENGTH:pinned` tag:

| Source | Mechanism |
|---|---|
| Auto-Pin of the first USER message | Server default (§5.3) |
| Recipe / Engine policy on spawn | Directly in the `tags` set before `chatMessageService.append(...)` |
| Prak Side-Channel Output | If `sideChannelEnabled=true` — currently **off by default** |
| User-explicit `/pin` | Follow-up, not yet implemented |

### 5.2 Selector Protection

`StrengthAwareSelector.shouldCompact()` L.81: `if (s == SpanStrength.PINNED) return false;` — as the first condition, before any mode logic. PINNED is equally sacrosanct in SOFT, HARD, and EMERGENCY.

### 5.3 Auto-Pin of the First USER Message

`ChatMessageService.maybeAutoPinOriginalTask(message)` is called from `append(...)` directly before `repository.save` and sets `STRENGTH:pinned` iff all conditions apply:

1. `message.role == ChatRole.USER`
2. `tenantId` and `thinkProcessId` are set
3. **No** `STRENGTH:*` tag already on the message — caller override wins (a deliberate `STRENGTH:weak` rating is never overwritten)
4. `mongoTemplate.exists(...)` shows: **no** row yet for this `thinkProcessId` — the User message is the first, thus by definition the original task

One Mongo `exists` round-trip per USER message append (cheap). Race-tolerant: two parallel USER appends that both see an empty history will both pin — harmless, both remain uncompacted.

Short-circuit order: Role check → Tag check → only then the Mongo query. ASSISTANT/SYSTEM messages or messages with an explicit STRENGTH tag incur no extra cost.

### 5.4 Prak Side-Channel (informative, currently off)

If `PrakProperties.sideChannelEnabled=true` is activated (currently default `false` with the reasoning "burns tokens without an active Memory consumer"), the `PrakService` analysis runs over each message and writes `STRENGTH:*` tags based on item importance and hot-path markers.

With `PrakProperties.inlineOnCompaction=true` (currently default `false`), Prak additionally fires **directly before** a HARD compaction, so the selector sees fresh tags instead of relying on the optimistic fallback (`TrivialPatterns`).

This description is informative — standard compaction in Vancetope runs without Prak, relying on Auto-Pin (§5.3) plus `StrengthAwareSelector`'s optimistic fallback for unrated messages.

---

## 6. Engine Participation

Which Engines participate in the Sliding-Window path (call `composeBlock` + `compactIfNeeded`) and which do not:

| Engine | Participation | Reason |
|---|---|---|
| [Arthur](/specs/arthur-engine) | ✓ | Chat host, long sessions |
| [Eddie](/specs/eddie-engine) | ✓ | Chat host, long sessions |
| Ford | ✓ | Own sessions with Memory block |
| [Frankie](/specs/frankie-engine) | ✓ | Pi-style endless-by-design |
| [Trillian-Control](/specs/trillian-engine) | ✓ | Agentic Control-Loop, accumulates chat history |
| [Trillian-User](/specs/trillian-engine) | ✓ | Nature `void` User-Loop, runs autonomously over many turns |
| Marvin | ✗ | Tree-of-Nodes architecture, per-node prompts without chat history |
| Zaphod | ✗ | Single-shot Synthesizer, own `LanguageContextResolver` |
| Vogon / Slartibartfast / Hactar / Jeltz / Agrajag | n/a | No permanent LLM loop — Helper / Script-Executor / LightLlmService |

**Those participating in the path** call at the start of the turn in `runTurn` (or equivalent):

```java
List<ChatMessage> messages = buildPromptMessages(process, chatLog, …);
CompactionResult cr = memoryCompactionService.compactIfNeeded(
        process, bundle.primaryConfig(), messages, modelInfo);
if (cr.compacted()) {
    messages = buildPromptMessages(process, chatLog, …);  // rebuild
}
```

And in `buildPromptMessages`, the System Prompt appends a Memory block from `MemoryContextLoader.composeBlock(process)` — this is where Languages, Agent-Doc, ARCHIVED_CHAT Replay, Parent Context, and RAG Auto-Inject sit in a chain.

---

## 7. Tunables

All values in `PrakProperties` (`vance.prak.*`):

| Property | Default | Effect |
|---|---|---|
| `compactionSoftThreshold` | 0.40 | SOFT-Trigger-Quote `tokensIn / contextWindow` |
| `compactionHardThreshold` | 0.85 | HARD-Trigger-Quote |
| `compactionEmergencyThreshold` | 0.95 | EMERGENCY-Trigger-Quote |
| `compactionKeepRecent` | 10 | Minimum barrier below which `active.size()` no compaction runs |
| `softAnchor` / `hardAnchor` / `emergencyAnchor` | 10 / 5 / 3 | Number of messages at the end that remain verbatim in every mode |
| `compactionMaxSourceChars` | (see code) | Cap on Summarizer input size, protects against model window overflow in the Summarizer call itself |
| `sideChannelEnabled` | false | Master switch for Prak (Strength-Tagging-Analyzer). Off by default — "burns tokens without an active Memory consumer" |
| `inlineOnCompaction` | false | If Prak is on: additionally run inline before each HARD compaction for fresh STRENGTH tags |

Override via `application.yml`:

```yaml
vance:
  prak:
    compactionHardThreshold: 0.75   # compact earlier
    compactionKeepRecent: 6         # allow deeper cutting
```

Cascade override (Tenant-/Project-specific) is possible via the standard Settings system; see [settings-system](/specs/settings-system).

---

## 8. Relationship to Other Features

- **[RAG / Knowledge-Graph](/specs/memory-knowledge-management) §5.** RAG indexes curated Memory Documents for topic search; Compaction folds Chat History. Both write to `MemoryDocument`, but under different `kind` values — RAG index uses `KNOWLEDGE` / `FACT`, Compaction `ARCHIVED_CHAT`. They do not compete.
- **[Plan-Mode](/specs/plan-mode) §15.** The Range Recompaction path (§3.2) is tied to the Plan Completion hook. Sliding-Window runs independently — those not using Plan-Mode benefit only from the automatic path.
- **[Inbox](/specs/user-interaction).** SOFT-Trigger does not post an Inbox offer in the standard path; HARD and EMERGENCY run silently. The only Inbox interface is `RECOMPACTION_OFFER` from the Range path (§3.2).
- **Process-History-Search.** Allows the LLM to read archived originals on-demand again — the replay block (§4.1) is sufficient for thread maintenance; if the LLM needs a specific detail, it uses `history_search`.

---

## 9. Observability

Micrometer Counters (all low-cardinality):

- `vance.memory.compaction{mode}` — incremented per compaction, tag value `soft` / `hard` / `emergency` / `range`.
- `vance.memory.compaction.messages{mode}` — DistributionSummary over the number of archived messages per run.
- Log lines on `INFO` with pattern `Frankie.turn id='…' compaction (turn-start) ok: N msgs → C chars (memory='…')` (Engine-prefixed for Grep).

Web UI: for each compaction, a `[compaction]` status stitch in the chat history (`ChatMessageStatus.COMPACTION` Side-Channel event).

Mongo Audit: `db.memories.find({kind: "ARCHIVED_CHAT", thinkProcessId: …}).sort({createdAt: -1})` provides the entire compaction chain of a process; active rows have `supersededAt == null`.

---

*See also: [memory-knowledge-management](/specs/memory-knowledge-management) | [arthur-engine](/specs/arthur-engine) | [frankie-engine](/specs/frankie-engine) | [trillian-engine](/specs/trillian-engine) | [plan-mode](/specs/plan-mode) | [recipes](/specs/recipes)*
