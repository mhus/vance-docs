---
title: "Vancetope — User Maintenance (Deletion and Renaming)"
parent: Specs
permalink: /specs/user-maintenance
---

<!-- AUTO-GENERATED from specification/public/en/user-maintenance.md — do not edit here. -->

---
# Vancetope — User Maintenance (Deletion and Renaming)

> The same concept as [Project Maintenance](/specs/project-maintenance), for accounts: one handler per entity, a service that aggregates them, commands in the admin shell. The difference is not in the mechanics, but in **what a user reference means**.
> See also: [project-maintenance](/specs/project-maintenance) | [permission-system](/specs/permission-system) | [maximegalon-system](/specs/maximegalon-system) | [trillian-engine](/specs/trillian-engine)

---

## 1. Why it exists

`user delete` existed — as a one-liner that removed the `users` row. What the account had touched remained: its Sessions including chat history, its Settings including `store.token.*` (a PASSWORD setting), its OAuth states, its Hub Project with Persona and Facts, its Grants, and its name in a dozen fields.

The cost is the same as for projects and sharper here: the **login is the business key** and it **comes back** — people inherit the username of their predecessor, service accounts follow a schema. Everything left behind is thus inherited by the next account with the same name: its Grants, its Notifications, its Quota — and its history reads as theirs.

Renaming was not possible at all (`UserService` had no `rename`).

## 2. The Seam

`UserDataHandler` (`vance-shared`, `de.mhus.vance.shared.user.maintenance`), form identical to `ProjectDataHandler`: `id` / `collections` / `order` / `count` / `delete` / `rename` / `deleteNote` / `renameBlocker`. A handler resides in its entity's package, interacts directly with Mongo, and is the same narrowly defined **exception** to the data sovereignty rule (`CLAUDE.md` → Data Sovereignty). Report type (`MaintenanceReport`) and renderer are shared with the project side and reside with the collectors in `vance-anus`.

`UserMaintenanceService` resides — like its project counterpart — in **`vance-anus`**, while the SPI and all handlers are in `vance-shared`; justification and cost are in [project-maintenance §2.0](/specs/project-maintenance). The only exception to "handler resides next to its entity" is the Hub handler (§5), because it depends on a collector.

There is one additional method: **`deleteBlocker`**. On the project side, "is someone still working with it" is *one* central question — the Pod Lease. For an account, it's a question per subsystem: a running Trillian authenticates as its service account, and deleting it leaves an agent whose tool calls are all rejected — which looks like a permission bug but isn't.

## 3. The Core: A User Reference Is Not One Thing

A project name appears in fields that all mean "belongs to". A username appears in **three** types of fields, and a common policy would be wrong in two of them. The class is decided by **the handler**, not a central rule — only the owner of an entity knows which of its fields is which, and multiple entities have fields from two classes simultaneously.

### 3.1 `OWNED` — the row exists because of the user → **delete**

`sessions.userId`, `session_groups.userId`, `settings` with `referenceType=user`, `oauth_states.userId`, `notification_deliveries.userId`, `vance_activity.userId`, `permission_grants`/`permission_requests.subjectId`, the Hub Project `_user_<login>`.

The clearest case is the Settings layer: it contains `store.token.<source>` and the account's Vault bindings. A credential that outlives its owner is not a stale row, but a living secret without an owner — and the next account with the same name resolves it as its own.

### 3.2 `RECORD` — the row records what someone has done → **Tombstone `_deleted_<name>`**

`chat_messages.senderUserId`, `documents.createdBy`, `document_archives.createdBy`, `megadodo_events.actor`, `engine_messages.fromUser`, `image_call_records.accountId`, `permission_grants.createdBy`, Inbox `originatorUserId` and `messages[].authorUserId`.

**Not for the UI to display something** — that would be a weak argument and a renderer could solve it. The reason is **name reuse**: if `mhus` is left in a year of chat history, in `createdBy` fields, and feed rows, the next person with that login inherits all of it — each of these rows then reads as being about them. This is a misattribution that no one notices. The tombstone detaches the history from the name at the moment of deletion.

`_unknown` prevents the same misattribution and is strictly worse: it additionally destroys *which* account it was — the only purpose of the field. There is no case where it wins.

**Two honest weaknesses** (both named in the code):

1. **Not collision-free across generations.** `mhus` deleted, re-created, deleted again → both generations collapse to `_deleted_mhus`. A merge of two histories, accepted: still strictly better than a merge with a *living* third party. A discriminator (timestamp) is the way out if it hurts.
2. **It looks like a service account** (`_` is the convention there). Factually harmless — a tombstone never creates a `UserDocument` row; it's just a string in a foreign field. But a reader who infers from the prefix labels incorrectly: `UserDocument.serviceAccount` is a **field**, and no one should derive that from the name.

The tombstone is **idempotent** (`_deleted__deleted_mhus` cannot be created) — a rerun of an aborted delete is the repair path.

### 3.3 Authority and Reachability → **remove or transfer, never rewrite**

Here, a dangling reference is *dangerous* or *blocking*, and a tombstone would be the opposite of correct.

- **Grants** (`subjectId`): removed. Precedence is in the tree — `UserLifecycleListener` literally names the danger; a lingering grant is "silently inherited by the next account minted under that name".
- **Inbox participation** (`participants`, `readBy`, `unreadFor`, plus `messages[].readBy`): stripped. `unreadFor` is the index behind the badge; a ghost ID is counted noise, and participation is the right to contribute, which a departed account does not retain.
- **An open Ask, assigned to them**: the thread is **archived**, with `resolverReason` naming the account. Leaving it `PENDING` creates an entry that never goes to zero — against the badge rule of the [Maximegalon Spec](/specs/maximegalon-system). Reassigning was the alternative and requires an authority that this layer cannot query: the abstract Permission SPI cannot enumerate admins.

Threads themselves are **never** deleted — they belong to the people in them and survive what they were about; the same reasoning as in project deletion.

## 4. Rename Is Not a Mild Delete

During a rename, it is **the same person**, so *everything* moves with them — including authority. A grant follows its subject instead of being revoked, Inbox participation remains, an open Ask remains open and assigned. This is the only place where the two operations truly diverge.

Two rules in `UserService.rename`:

- **A rename does not change the type of account.** A human login remains without an `_`-prefix, a service account retains it. `serviceAccount` is a field and the prefix is the convention that describes it; letting the two diverge creates a human whose name claims something else. `_vance-` remains closed on both sides.
- **No Lifecycle Listener fires.** `UserLifecycleListener` is for an identity that is created or disappears — neither happens here.

The tombstone prefix is forbidden as a **target** of a rename: the marker means "this name belonged to someone who is gone", and giving it to a living account misleads any future reader.

## 5. The Hub Project

`_user_<login>` is a SYSTEM project, and the usual project delete refuses it — rightly so, `_vance` must never go. The Hub is the exception, and it is an **exception with a form instead of a flag**: `ProjectService.deleteUserHub` / `renameUserHub` and the identically named entry points in `ProjectMaintenanceService` accept nothing that is not `_user_<login>`. Two independent checks of the same form; an `allowSystem` parameter would have reached `_vance` just as easily.

The Hub handler **delegates** to the project machinery instead of clearing itself: a Hub contains Sessions, Documents, Memories, and possibly its own Trillian service accounts, and rebuilding that here would be a second, inferior copy of a sweep that exists and is drift-tested.

It runs at **sort index 50, before everything else**: the Hub is the largest piece, and removing it first means that every subsequent handler only has to deal with what the account left behind in *foreign* projects — less work and a truer number. During a rename, the Hub moves with it because its name *is the login*.

## 6. Sort Index and Coverage

`order()` is mandatory without a default, same values allowed, block from 100 in 100-step increments, below that free — identical to the project side and for the same reason. Occupied there are `10` (Trillian Guard) and `50` (Hub).

Four cascades must run **before** `sessions` (500), because they are found via the account's sessions: `chat-messages-of-sessions` (100), `engine-messages-of-sessions` (200), `marvin-nodes-of-sessions` (300), `think-processes-of-sessions` (400). Conversely, the sessions would be gone, the rows untraceable — and nothing would report an error.

Two handlers on `permission_grants`, in this order: `permission-grants` (1200, subject → remove) before `permission-grant-authors` (1800, `createdBy` → Tombstone).

**Coverage again two-layered.** The drift test `UserDataCoverageTest` boots the Admin Shell and requires a handler for every `@Document` class with a user-naming field; fields that only look like it are in an exception list with justification (`DatabaseIdentityDocument.owner` is an application, `LlmUsageDailyDocument.caller` is an Engine name, the Store entities are marketplace accounts). The runtime probe here is **weaker** than on the project side and this is explicitly stated: a username has no `projectId` equivalent, the probe works against a list of conventional field names, and a collection with a different name escapes it. The build test is the other half and does not depend on this list.

## 7. Two Document Classes Moved to `vance-shared`

As with `ImageCallRecord`: only the documents, the services remain in the Brain.

| Class | from | why |
|---|---|---|
| `EddieActivityEntry` (+`EntityRef`, `EddieActivityKind`) | `brain.eddie.activity` | `userId`; the shell must be able to delete the rows |
| `NotificationDeliveryDocument` | `brain.notifications` | `userId`; otherwise the next account with the same name finds its predecessor's notifications |

## 8. Audit Remains Untouched — Automatically

`AuditService` has exactly one consumer, `LogAuditConsumer`. The compliance record is a **log stream**, not a collection. No handler can touch it, and the question "can audit be rewritten" therefore does not arise.

## 9. Commands

```
user inspect  -T <tenant> -n <name>
user handlers
user delete   -T <tenant> -n <name> [--confirm <name>] [--force]
user rename   -T <tenant> -n <name> --to <neu> [--confirm <name>]
```

`user inspect` writes nothing and is the dry run. Gates like with the project: **typed username** before Delete and Rename (headless as `--confirm`), `--force` only for `deleteBlocker`. No LLM tool, no REST.

## 10. What Does Not Belong

- **No text rewrite.** A login in a `runAs` of a Scheduler Document, in a Prompt or Recipe is not rewritten — the same reasoning as for project rename. The command names the old name for searching.
- **No Undo.** The way back is a backup.
- **No Cross-Tenant Move.** The tenant is in every predicate.
