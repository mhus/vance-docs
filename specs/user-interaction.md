---
title: "Vance — User Interaction"
parent: Specs
permalink: /specs/user-interaction
---

<!-- AUTO-GENERATED from specification/public/en/user-interaction.md — do not edit here. -->

---
# Vance — User Interaction

> How the system communicates with humans when non-chat mechanisms are needed — decision templates, free-text feedback, ordering inputs, structured outputs (texts, images, documents). Plus: how the user is notified of new items, cross-channel.
>
> Two subsystems, separate but coupled: **Inbox** (what needs to be answered/viewed) and **Notifications** (how the user finds out).
>
> See also: [arthur-engine](/specs/arthur-engine) | [vogon-engine](/specs/vogon-engine) | [architecture-scopes-clients](/specs/architektur-scopes-clients) | [settings-system](/specs/settings-system)

---

## 1. Rationale

The existing chat path (Arthur → ChatMessage → Plaintext response via `process_steer`) is sufficient for conversation, **not** for structured interaction:

- Decision-Asks with concrete options — the LLM would have to re-parse "one of [a, b, c]" from free text, which is error-prone.
- Ordering inputs (Drag-&-Drop)
- Images, diagrams, documents for viewing
- Cross-user routing ("put it in road-runner's Inbox")
- Auto-Answer for trivial questions (LOW criticality)
- Mobile/Web clients that are not permanently connected

The Inbox is the user's **structured inbox** — Asks AND Outputs mixed, each typed. Notifications are the **cross-channel push mechanism** that informs the user about new items, depending on how they are currently reachable.

---

## 2. Two Subsystems Overview

| Subsystem | What | Where |
|---|---|---|
| **Inbox** | Data — the items themselves, their responses, lifecycle, delegation | `vance-shared/inbox/` (Mongo-persistent) |
| **Notification Dispatcher** | Routing — how the user learns about new items (WS, Email, Mobile) | `vance-brain/notifications/` (Channel-Beans) |

Engines (Vogon-Checkpoints, Arthur-Decision-Asks, arbitrary Tool-Side-Effects) create Inbox-Items via Service-API. The Inbox-Service calls the Dispatcher upon persistence; Channels check user preferences / session connections and deliver or skip.

---

## 3. InboxItem — Data Model

```
InboxItemDocument {
  id                    Mongo ObjectId
  tenantId              String

  // Routing
  originatorUserId      String               // who created it (audit)
  assignedToUserId      String               // who is currently responsible (can change through delegation)
  originProcessId       String?              // which Process created it (for response routing)
  originSessionId       String?              // which Session (for filtering in the UI)

  // Classification
  type                  InboxItemType        // see §4
  criticality           Criticality          // LOW / NORMAL / CRITICAL
  tags                  List<String>         // free (e.g., ["analysis", "literature-review"])

  // Content — Schema per type
  title                 String               // Headline for the list
  body                  String?              // Markdown text (can be long)
  payload               Map<String, Object>? // type-specific structured data

  // Lifecycle
  status                Status               // PENDING / ANSWERED / DISMISSED / ARCHIVED
  requiresAction        boolean              // true: Process is waiting for it; false: purely informative
  answer                AnswerPayload?       // see §6
  resolvedBy            ResolvedBy?          // USER / AUTO_DEFAULT / AUTO_RESOLVER (v2) / DISMISSED
  resolvedAt            Instant?
  resolverReason        String?              // optional, e.g., "INSUFFICIENT_INFO: …"

  // Audit
  history               List<HistoryEntry>   // delegate, archive, retry-events

  createdAt             Instant
  updatedAt             Instant
  archivedAt            Instant?
}
```

Compound indexes:
- `(tenantId, assignedToUserId, status, criticality)` — Hot-Path: "show me what's open, sorted by importance"
- `(tenantId, originSessionId, status)` — Filtering within a Session
- `(originProcessId, status)` — when a Process is answered, quickly find its open items

---

## 4. Item Types

Eight types, each with its own payload schema.

### 4.1 Asks (`requiresAction: true` — Process blocked)

| Type | Payload | UI-Render |
|---|---|---|
| `APPROVAL` | `{ default?: "yes" \| "no" }` | Yes/No buttons (with highlighted default) |
| `DECISION` | `{ options: [{value, label, description?}], allowFreeText: boolean, default?: <value> }` | Radio list, optional free text field below |
| `FEEDBACK` | `{ placeholder?: string, maxLength?: int }` | Textarea |
| `ORDERING` | `{ items: [{id, label}], minSelection?: int, maxSelection?: int }` | Drag-&-Drop list |
| `STRUCTURE_EDIT` | `{ schema: <JSON-Schema>, value: <Initial-JSON> }` | Schema-driven Form (v2 — v1 fallback to JSON-Editor) |

### 4.2 Outputs (`requiresAction: false` — informative, no block)

| Type | Payload | UI-Render |
|---|---|---|
| `OUTPUT_TEXT` | `{ format: "markdown" \| "plain" }` (content in `body`) | Markdown rendering, scrollable |
| `OUTPUT_IMAGE` | `{ url: string, mimeType: string, caption?: string }` | Inline image, clickable for enlargement |
| `OUTPUT_DOCUMENT` | `{ url: string, mimeType: string, sizeBytes: int, filename: string }` | Download link, preview if possible |

Outputs are not "answered" — they do not have an `answer` field. They can be `DISMISSED` (user clicks away) or `ARCHIVED` (user moves to archive).

---

## 5. Lifecycle

```
                          CREATE
                            ↓
                        ┌─PENDING─┐
                        │         │
       (User answers)   │         │ (User clicks away)
                        ↓         ↓
                   ANSWERED    DISMISSED
                        │         │
                        └────┬────┘
                             ↓
                   (auto-archive after N days
                    OR user explicitly)
                             ↓
                        ARCHIVED
```

- `PENDING` → `ANSWERED`: User has answered (or Auto-Resolver, or LOW-default adoption)
- `PENDING` → `DISMISSED`: User clicks away without answering (Process receives a Skip response)
- `ANSWERED` / `DISMISSED` → `ARCHIVED`: User explicitly archives or Tenant-Setting `inbox.autoArchiveAfterDays` (Default 30) applies

ARCHIVED items remain for audit; UI hides them behind "Show Archive" filter.

**Persistence:** all items remain until explicit deletion (which v1 does not provide). Storage is cheap, audit value is high.

---

## 6. AnswerPayload — 3-State Schema

Every Ask response can have one of three outcomes. Applies to user responses **and** Auto-Resolver output (v2):

```
AnswerPayload {
  outcome      Outcome           // DECIDED / INSUFFICIENT_INFO / UNDECIDABLE
  value        Object?           // for DECIDED: type-specific response payload
  reason       String?           // for INSUFFICIENT_INFO or UNDECIDABLE: explanation
  answeredBy   String            // userId or Worker-ProcessId
}

Outcome:
  DECIDED              → value contains the answer
  INSUFFICIENT_INFO    → reason explains what's missing; calling Process remains BLOCKED, escalates
  UNDECIDABLE          → reason explains why it's undecidable; Process escalates
```

**Users are also allowed to cancel.** The UI offers two additional buttons for each Ask: "I lack information" (opens Reason input → `INSUFFICIENT_INFO`) and "I cannot decide" (Reason input → `UNDECIDABLE`). This prevents pseudo-answers from users who are actually clueless.

`value` schema per type:
| Type | `value` |
|---|---|
| `APPROVAL` | `{ approved: bool }` |
| `DECISION` | `{ chosen: <option-value>, freeText?: string }` |
| `FEEDBACK` | `{ text: string }` |
| `ORDERING` | `{ orderedIds: [string] }` |
| `STRUCTURE_EDIT` | `{ value: <JSON> }` |

---

## 7. Criticality + Auto-Answer

```
Criticality:
  LOW       — Item-suggested-default is adopted immediately, no user bother
  NORMAL    — User decides (v2: optional Auto-Resolver-Worker with escalation)
  CRITICAL  — User decides, UI prominent, no Auto-Resolver, audit-required
```

**LOW Auto-Default Adoption** (v1 implemented):

If `criticality == LOW` AND `payload.default` is set, the `InboxItemService` adopts it directly upon creation:

```
status = ANSWERED
answer = AnswerPayload(DECIDED, value=default, answeredBy="system:auto-default")
resolvedBy = AUTO_DEFAULT
resolvedAt = now
```

The item still appears in the Inbox (with audit marker "⚙ answered by system (LOW)") so the user has insight. **Process receives the answer immediately** — no notification to the user, no BLOCKED-Wait.

The user can later revoke via `inbox-revoke-auto-answer` (v2) — then the item returns to `PENDING` and the Process receives a `ProcessEvent(type=BLOCKED)` reopener message. Not v1.

**v2-Hook: Auto-Resolver-Worker**

Schema planned, not implemented:

```
autoResolver: {
  recipe: "decision-helper",        // Worker-Recipe
  promptTemplate: "...",            // with Item-Context
  confidenceThreshold: 0.85
}
```

NORMAL-Items with `autoResolver` would, in v2, spawn a lightweight worker that provides DECIDED/INSUFFICIENT_INFO/UNDECIDABLE. For DECIDED → answer; for Abstain → escalates to user with worker reason visible in the UI. The worker responds via `inbox_answer`-API just like a user; the schema is identical (3-State).

---

## 8. Multi-User Routing and Delegation

Each item has two user fields:

- `originatorUserId` — who/what created it (immutable, Audit)
- `assignedToUserId` — who is currently responsible (mutable via Delegation)

**Delegation:** `inbox.delegate(itemId, toUserId, note)` writes:

- `assignedToUserId = toUserId`
- History entry: `{ action: "DELEGATE", from: <prev>, to: <toUserId>, by: <currentUserId>, note, at: now }`
- Notification to the new `assignedToUserId`

**Response routing back to the Process:** the `originProcessId` never changes. No matter who ultimately answers — the response flows to the originally blocked Process via `SteerMessage.InboxAnswer(itemId, payload)` (new variant, see §10).

**Permissions:** v1 — any user in the same Tenant can delegate to or answer any item they are assigned to. No sub-permission system. Will come with Multi-User-Spec if relevant.

---

## 9. Tags and Filters

`tags: List<String>` on the item. Freely selectable. Examples: `["analysis", "literature-review"]`, `["bug-fix", "auth-module"]`, `["onboarding"]`.

The UI offers tag filters; the API accepts `tags` query parameters on list calls. Tag conventions are not enforced — the system is tolerant of typos / synonyms. If this becomes a problem later, a tag normalization/suggestion layer will be added.

---

## 10. Engine Integration

### 10.1 Creation — three paths

| Who | How |
|---|---|
| **Tools** (LLM-driven) | Server-Tool `inbox_post(target_user, type, title, body, payload, tags?, criticality?)` — Engine can call it as a Side-Effect |
| **Engines directly** (Vogon-Checkpoints) | `InboxItemService.create(...)` from Java — deterministic, no LLM path |
| **Tools** (Output-Posting) | Specialized Tools like `inbox_post_analysis(target_user, content, tags)` — convenience wrapper around `inbox_post` with `type=OUTPUT_TEXT` |

### 10.2 Response Routing back to the Process

New `SteerMessage` variant in `vance-brain/thinkengine/SteerMessage.java`:

```java
record InboxAnswer(
    Instant at,
    @Nullable String idempotencyKey,
    String inboxItemId,
    InboxItemType itemType,
    AnswerPayload answer
) implements SteerMessage {}
```

`SteerMessageCodec` extended with the new variant; persistent form gets corresponding fields in `PendingMessageDocument`.

When a user answers:
1. WS-Frame `inbox-answer` → `InboxAnswerHandler`
2. Handler validates response against Item-Type
3. Update Item: `status = ANSWERED`, `answer = ...`, `resolvedAt = ...`
4. Build `SteerMessage.InboxAnswer` and `appendPending` to `originProcessId`
5. `LaneScheduler.submit(originProcessId, runTurn)` — Process wakes up, drains Inbox, sees response

Engines (Vogon, possibly Arthur) must handle `InboxAnswer` in their `steer` method. Default implementation in the interface does warning-log + ignore.

### 10.3 Vogon-Checkpoints become Inbox-Items

Vogon §2.3 will be rewritten — Checkpoints create Inbox-Items of the appropriate type instead of their own BLOCKED mechanism. Process goes to BLOCKED, waits for `InboxAnswer` via Pending-Queue.

### 10.4 Arthur Use Cases

Arthur can optionally use Inbox for structured Asks: "User wants to spawn a worker, several Recipes fit — create Decision-Item with options instead of plaintext question". Not mandatory for V1 — Arthur may continue to use plaintext chat.

---

## 11. WS Protocol

| Frame | Direction | Purpose |
|---|---|---|
| `inbox-list` | Client → Server | List of items for the user in the current session, optionally filtered by `status`/`tags` |
| `inbox-item` | Client → Server | Detail lookup of an item |
| `inbox-answer` | Client → Server | Submit answer (`itemId`, `outcome`, `value`/`reason`) |
| `inbox-delegate` | Client → Server | Delegation (`itemId`, `toUserId`, `note`) |
| `inbox-archive` | Client → Server | Archive `itemId` |
| `inbox-dismiss` | Client → Server | Mark `itemId` as "clicked away" |
| `inbox-item-added` | Server → Client | Push: a new item has been created for the user (Notification variant) |
| `inbox-item-updated` | Server → Client | Push: Item status/assignment changed |
| `inbox-pending-summary` | Server → Client (in welcome) | Summary of open items upon session resume |

The frames are a subset of the general WS-Envelope (`type/id/replyTo/data`) — no special protocol.

---

## 12. Notification Subsystem

### 12.1 Architecture

```
NotificationDispatcher (@Service)
  ↓ notify(NotifyEvent)
List<NotificationChannel> (Spring-Bean-Discovery, stable order)
  ├─ WsNotificationChannel       (v1 implemented)
  ├─ EmailNotificationChannel    (v1 Stub — canHandle returns false)
  └─ MobilePushChannel           (v1 Stub)

NotifyEvent {
  tenantId, userId, inboxItemId, criticality, title, body, deepLink
}

NotificationChannel {
  String name();
  boolean canHandle(NotifyEvent event, NotificationPrefs prefs);
  DeliveryResult deliver(NotifyEvent event);
}
```

Dispatcher calls `canHandle` for *all* Channels and delivers via *all* that agree — not a fallback chain. CRITICAL-Items may thus receive WS + Email + Mobile in parallel; safety through redundancy.

### 12.2 Channel Activation — Implicit

Activation is derived from *Connection-Presence* / *Configuration-Existence*, not from global enable/disable settings:

| Channel | `canHandle` is `true` if |
|---|---|
| **WS** | User has active WS connection in the Tenant (`SessionConnectionRegistry.findBoundForUser`). No threshold, no settings toggle |
| **Web** | Subtype of WS — same mechanism |
| **Email** | Setting `notify.email.address` resolved (User → Project → Tenant Cascade) AND `criticality >= notify.email.minCriticality` AND not in Quiet-Hours |
| **Mobile** | (v2) `DeviceRegistration` exists for the user AND not in Quiet-Hours |

`canHandle` for CRITICAL Items ignores Quiet-Hours (see `notify.quietHours.exceptCritical`).

### 12.3 Settings — Cascade Tenant → Project → User

```
notify.email.address                String   (typically per User; existence activates Email-Channel)
notify.email.minCriticality         String   (LOW|NORMAL|CRITICAL — Default NORMAL)
notify.email.batchIntervalSec       Int      (Default 300)
notify.quietHours.start             String   "22:00"
notify.quietHours.end               String   "08:00"
notify.quietHours.exceptCritical    Boolean  Default true
inbox.autoArchiveAfterDays          Int      Default 30 (PENDING remains unlimited — only ANSWERED/DISMISSED)
```

Existing `SettingService.getStringValue(tenantId, refType, refId, key)` is sufficient — no new cascade logic needed.

### 12.4 Per-Connection-Opt-Out (v2-Hook)

Reserved field in WS-Welcome-Handshake: `notifyMode: "all" | "critical-only" | "none"`. `ConnectionContext` holds it, `WsNotificationChannel.canHandle` would respect it. **v1**: the field is accepted but ignored during welcome; all active WS receive everything.

### 12.5 Pending-Summary on Session-Resume

If a user was offline and reconnects: in addition to the normal `welcome`-frame, an `inbox-pending-summary`:

```json
{
  "type": "inbox-pending-summary",
  "data": {
    "totalPending": 12,
    "byCriticality": { "LOW": 8, "NORMAL": 3, "CRITICAL": 1 },
    "oldestPendingAt": "2026-04-26T10:32:00Z"
  }
}
```

This immediately informs the client that there are open items, without having to poll the Inbox first.

### 12.6 Delivery Log

Mongo-Collection `notification_deliveries` — Audit entry per attempt:

```
{
  itemId, userId, channel, status,    // SENT / FAILED / SKIPPED
  reason?,                            // "no active WS" / "quiet hours" / SMTP error
  createdAt, sentAt?
}
```

Written in v1 — costs ~30 lines, pays off with the first "why wasn't the user informed?" bug report.

---

## 13. v1-Scope — What We Build, What We Postpone

### 13.1 Implemented in v1

- `InboxItemDocument` + Repository + Service
- 4 Item-Types: `APPROVAL`, `DECISION`, `FEEDBACK`, `OUTPUT_TEXT`
- Lifecycle: `PENDING` → `ANSWERED` / `DISMISSED` → `ARCHIVED`
- 3-State-AnswerPayload (DECIDED / INSUFFICIENT_INFO / UNDECIDABLE)
- LOW-Auto-Default adoption
- Multi-User: `originatorUserId` + `assignedToUserId` fields
- Delegation via `inbox-delegate`
- Tags
- WS-Frames: `inbox-list`, `inbox-item`, `inbox-answer`, `inbox-delegate`, `inbox-archive`, `inbox-dismiss`, `inbox-item-added`, `inbox-pending-summary`
- `SteerMessage.InboxAnswer` + Codec extension + Pending-Queue integration
- `NotificationDispatcher` + `WsNotificationChannel`
- `notification_deliveries` Audit-Log
- Settings for Quiet-Hours + Email-Schema (even if EmailChannel is a Stub)
- Server-Tool `inbox_post` (LLM-driven item creation)

### 13.2 Stubs / Spec-only in v1

- `OUTPUT_IMAGE`, `OUTPUT_DOCUMENT`, `ORDERING`, `STRUCTURE_EDIT` — Item-Types documented, UI-Renderers + Validators later
- `EmailNotificationChannel` — Bean exists, `canHandle` always `false`
- `MobilePushChannel` — Bean exists, `canHandle` always `false`. `DeviceRegistration` Schema documented, endpoint later
- Auto-Resolver-Worker for NORMAL — Schema documented in Item (`autoResolver`-block), implementation v2
- Per-Connection-Opt-Out field in welcome — accepted + ignored
- Auto-Archive after N days — Setting documented, scheduler job later
- `inbox-revoke-auto-answer` (revoke LOW-answer) — v2
- Multi-User permission system — v2

### 13.3 Path after v1

Once the subsystem is live:
- v1.1: Auto-Archive job, ORDERING-Type
- v1.2: Email-Channel implemented
- v2.0: Mobile-Channel + DeviceRegistration + UI for Mobile-specific Quiet-Hours
- v2.1: Auto-Resolver-Worker for NORMAL-Items

Order depends on needs from live operation.

---

## 14. Vogon ↔ User-Interaction — Coupling

`specification/vogon-engine.md` §2.3 references this subsystem. Specifically:

- Vogon-`Checkpoint` of type `approval/decision/feedback` creates an InboxItem of the corresponding type
- Process goes to BLOCKED
- ParentNotificationListener routes `ProcessEvent(type=BLOCKED, summary=item.title)` to Vogon's Parent (typically Arthur), so Arthur can give the user the hint in chat
- Notification-Dispatcher additionally pings (WS-Push)
- User answers via Inbox-UI → `InboxAnswer` rolls to Vogon → drainPending → Phase continues

All Engines use the same mechanism — Vogon is the primary consumer, but the path is valid for any Engine lifecycle.

---

## 15. Open Points

- **Item size vs. Storage**. `OUTPUT_TEXT` with 100k-char Markdown — directly in the item or externalized (S3/local Workspace)? V1 inline; externalize if real performance issues arise.
- **Image / Document Storage**. `OUTPUT_IMAGE.url` — where is the file located? V1 likely local `data/inbox-attachments/` with signed-URLs; production deployment would require S3-equivalent.
- **Idempotency on Item-Create**. If an Engine posts the same item twice in a row (retry after crash) — how do we prevent duplicates? `idempotencyKey` field on the Create call, Service checks `(originProcessId, idempotencyKey)`.
- **Permissions for Tag-Filter**. Currently: everyone sees all items assigned to them. If items with sensitive tags ("compliance", "hr") are delegated to multiple users, we need tag-visibility rules. Outside v1.
- **Notification-Batching for Email**. `batchIntervalSec` is collected for `LOW`/`NORMAL`. Who flushes the batch? Spring `@Scheduled`-job — this is the second v1-`@Scheduled` with memory compaction (should be uncritical).
- **Cross-Tenant-Delegation**. V1 no; an item can only be delegated to users in the same Tenant. Cross-Tenant requires a permission/confidentiality model.
- **WebSocket-Reconnect with Item-Catch-up**. If an item is created while the user briefly loses WS: does it appear in the `inbox-pending-summary` on resume or do we see a race? `pending-summary` is the truth; WS-Push is additional acceleration. Race is acceptable — client merges.
