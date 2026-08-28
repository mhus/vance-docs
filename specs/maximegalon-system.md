---
title: "Maximegalon — Concerns with Clarification"
parent: Specs
permalink: /specs/maximegalon-system
---

<!-- AUTO-GENERATED from specification/public/en/maximegalon-system.md — do not edit here. -->

---
# Maximegalon — Concerns with Clarification

> The entity behind the Inbox: a **concern leading to exactly one decision**, with a
> history along the way. "Inbox" remains the name of the **view** of it
> ([`user-interaction.md`](/specs/user-interaction)); Maximegalon is the thing itself.
>
> Regarding the name: `Thread` is occupied by `java.lang.Thread`, a `ThreadService` in a tree full of
> Lane schedulers is unreadable. Maximegalon University in H2G2 is the "Institute of Slowly and Painfully
> Working Out the Surprisingly Obvious" — an institution where advice is given until the decision,
> obvious in retrospect, is reached. In prose, the thing is still called **Thread**; the codename
> carries system, package, collection, and classes.

## 1. What a Thread Is

A Thread is **a concern with at most one decision**. Asks (`APPROVAL`, `DECISION`,
`FEEDBACK`, `ORDERING`, `STRUCTURE_EDIT`) have exactly one, Outputs (`OUTPUT_*`) have none. The Messages
are the **clarification along the way**, never decisions themselves.

This leads to the fundamental property: **a Thread ends.** A Messenger channel is endless because it
is a channel; a concern is resolved when a decision has been made. The difference is thus not
forbidden by rule, but inexpressible in the model — therefore, Maximegalon is not a Messenger and will
not become one. If a side question arises during clarification, it is a **new Thread**, not a second
question in the same one. Otherwise, a blocked Process would not know which answer is its own.

**The Thread is the root node of its own tree.** It carries content (`title`/`body`/`payload`),
read status, and Reactions like any node — and additionally the concern lifecycle
(`answer`/`status`/`assignedToUserId`), because it is the encompassing element. `parentId = null` on a Message
*is* the answer to the question.

The Item is **not** split into Thread + first Message: `body` and `payload` are a unit
(a `DECISION` consists of explanation, options, and answer — a form, not a discussion contribution),
and `title` must remain with the Thread for listing.

## 2. Three States on Two Levels

`answered`, `archived`, and `read` are **three independent axes**, not values of a single field:

| State | Level | Meaning |
|---|---|---|
| `answered` (`status` + `answer` + effect) | **Thread** | the decision has been made |
| `archived` (`status` + `archivedAt`) | **Thread** | off the desk — regardless of whether a decision has been made |
| `read` (`readBy`) | **Message**, plus the Thread body as the first readable unit | this contribution has been acknowledged |

All combinations occur, especially **archived-but-unanswered** and **fully
read-but-unanswered** ("I have seen the question, but am not deciding yet"). The latter is
proof that `read` cannot be a `status` manifestation — as a status, it would require a
`PENDING_READ`. `MaximegalonStatus` therefore remains unchanged.

**Archiving does not touch the read status.** Instead, the badge query excludes `ARCHIVED`.
Intended side effect: an `unarchive` brings the Thread back with its actually unread
contributions, instead of having lost them.

## 3. Unread: Truth on the Message, Index on the Thread

```
thread.readBy               // who has read title + body        ← Truth
thread.messages[].readBy    // who has read this contribution      ← Truth
thread.unreadFor            // who is open somewhere in the Thread    ← Index
```

`unreadFor` = `{u : u ∉ thread.readBy}` ∪ `{u : ∃ Message with u ∉ readBy}` — **derivable, but
pre-calculated**, because the badge query cannot derive it without scanning: the alternative
`messages: {$elemMatch: {readBy: {$ne: me}}}` is a negative match and not index-constrainable,
and the query fires on every page mount in every individual HTML entry. Index for this:
`(tenantId, unreadFor, status)`.

The first term is not merely decorative: a freshly created Thread has **zero Messages**, a model that
derives unread status only from Messages could not list a new Ask as unread.

**Read status is per Message, not a watermark on the Thread.** A `lastReadAt` would be equivalent and cheaper
for a linearly read history — it fails with deep-linking to a single Message: someone who
jumps directly to contribution five has not read three and four, and a watermark would silently
check them off.

**The creator starts as a reader.** And an auto-answered Thread (LOW-Criticality with `default`)
starts **fully read**: it is decided upon creation and deliberately bothers no one;
a badge on it would contradict the purpose of the auto-answer.

## 4. The Badge Only Counts Unread Items

```
status != ARCHIVED  AND  unreadFor ∋ me
```

A read, open decision does **not** appear in the badge. The underlying conflict has been resolved
and decided as follows: an open decision *should* actually remain visible — but precisely when
it is **intentionally** withheld (information missing, wrong timing), one does not want it to be
permanently displayed. A badge that cannot go to zero without a decision encourages clicking away.

**The badge is an alarm, not an inventory.** The inventory is in the list and in the tooltip. This implies
for operation: **Outputs are resolved by reading, Asks only by answering** — no one has to
click away every `OUTPUT_TEXT` anymore for the badge to decrease. `DISMISS` remains for "seen and
explicitly dismissed".

And the consequence that makes this viable: **Reminders become a contribution instead of a permanent loop.**
To regain attention, write a Message — dated, traceable in the history.

`GET /brain/{tenant}/inbox/count` returns four numbers in two groups, each with exactly one reader:

| Field | Base Set | Reader |
|---|---|---|
| `unread` | unread Threads | the number **in** the badge |
| `unreadRequiresAction` | of those, open Asks for me | the **coloring** |
| `pending` | open Threads | the **tooltip** |
| `requiresAction` | of those, open Asks | (inventory dimension) |

**Number and coloring come from the same base set.** Coloring on `requiresAction` while `unread`
is counted makes the badge red because something is open somewhere — even if every unread Thread
is a harmless Output. In a team view, the alarm numbers remain **zero**: "unread" is
person-specific; there is no unread-for-a-team.

## 5. Participants, Team, Access

Three sources, all explicit, all additive:

| Field | Who |
|---|---|
| `assignedToUserId` | who is assigned — and allowed to **decide** |
| `teamId` | who is allowed to observe without being a participant |
| `participants` | who receives updates and contributes |

`participants` is a **real field**, not derived. From Originator + Assignee + authors, an
**invited person** would not be representable (they are not in any of these sources), and
**unsubscribing** would be impossible — once someone has written, they remain an author forever.

`teamId` is **provided upon creation** and exists **alongside** the historical derivation (`null` = old
rule, visibility via the Assignee's teams). It fixes a side effect no one requested: with derivation alone,
a delegation from Team X to Team Y removes visibility for Team X. A declared team does not lose it.

**It extends, it does not include.** The derived Assignee-Team rule still applies *alongside* the
declared team — so after a delegation to Y, X **and** Y can see. This is not negligence and cannot
be disabled here: whoever is allowed to decide must be able to read, `mayDecide` allows the Assignee's
team by design, and `maySee` ⊇ `mayDecide` is the invariant that prevents someone from deciding blindly
(recorded in `InboxAuthzTest`). If you want to protect a Thread from the colleagues of the new Assignee,
do not delegate it there — `teamId` is a means to *keep people in*, never to keep people out.

### Seeing and Deciding are Separate

- **Decide** (`answer`, `dismiss`, `delegate`, `archive`) — Assignee or Assignee's team colleague.
  **Unchanged**, in rule and population.
- **See and contribute** — the same set **plus** participants **plus** declared team.

The separation is why inviting is safe: if it remained a predicate, every invited person would gain
the right to answer — and thus the right to execute the item's `effectType`, which grants permissions.
**Only the seeing side is extended.**

Archiving counts as **deciding**, not seeing: `status` is a property of the shared Thread; a participant
would clear it from the Assignee's desk.

### How Access is Checked

`participants` and `teamId` are **object properties, not permissions** — like `lockedFor` in the
[Document Lock](/specs/document-lock), which is also checked alongside authorization. `Resource.InboxItem`
thus remains unchanged, which matters because **every** resolver implements it, including the EE Governor.

The order at the call site is the statement: **first the provider, then the document.** Only the
provider excludes participants; only the document bypasses the provider.

This is a **capability model and intentionally so**: checking occurs at **entry**, not at every
access. Inviting *is* delivering and goes through the same check as
[Milliways](/specs/milliways-system)' `inbox`-handler (`Resource.InboxItem` + `WRITE` on the invitee's Inbox);
after that, membership is the answer.

**A capability must be revocable.** This was precisely what was initially missing: `follow(true)` writes the
caller into `participants`, and because `participants` is checked *before* all derived elements, a
self-contribution freezes a visibility that until then only followed the Assignee — after a delegation
out of the team, the person continues to see every contribution. No one could undo this except themselves.
Therefore `POST .../participants/remove`, gated on **decide**, not on see: whoever is in the room
is part of managing the concern, and a participant may not remove another participant. Two people are
not removable — the Assignee of an open Ask (a process is waiting for them; delegating is the way)
and the Originator (they are the Thread's proof of origin).

Two barriers:

1. **Participation is read permission for the Thread — not for the object.** An invited person sees
   title, body, and history; a `documentRef` remains a pointer that fails without its own `READ` in the
   permission system. The same boundary as with Milliways: sharing does not grant rights to the shared item.
   Whoever invites opens **the Thread**.
2. **The Assignee of an open Ask cannot unsubscribe** (409 `assignee_must_stay`). A Process
   is waiting for them; whoever wants out delegates.

**Invitation creates unread items, self-contribution does not.** An external impulse must be noticed;
whoever follows themselves is looking anyway.

## 6. The History

```
Message { id, authorUserId, body, createdAt, parentId?, readBy[], reactions[] }
```

**A tree, one level deep.** `parentId = null` is the answer to the question, one level below are
answers to that; an answer to an answer is rejected (409 `invalid_parent`).
The depth is **policy, not structure** — increasing it is a UI change, not a migration.
Reason for the limitation: the Inbox detail is in a panel, and a tree destroys the
chronology, which is the order of arguments in a decision-making process.

Within a level, **chronological**, never by reaction count: score sorting shifts what is at the top,
and thus the causality of the clarification.

The history is **embedded in the Thread document**, not in a second collection. The main reason is
**atomicity**: "append Message **and** set `unreadFor`" is thus *one* update; across two
collections, it would require a transaction, or the index would drift from the truth. The array remains
**flat** — one update path (`messages.$[m]`) instead of one per level, and the client builds the tree.

Three conditions for this:

1. **Upper limit** (`MAX_MESSAGES`, 500), because an unlimited embedded array runs into the 16 MB limit
   and a burst document is neither readable nor repairable via the API. For a concern, the limit is
   healthy anyway — it says the same as "a Thread ends".
   **However, a count without a size is not a limit:** 500 unlimited bodies easily reach 16 MB.
   The body is therefore capped at 16 KB (`InboxMessagePostRequest.MAX_BODY_CHARS`), and
   `messageIds` in the Read call at 500 — it goes directly into an `$in`.
2. **Lists hide `messages`.** A listing needs titles, not protocols. The returned
   documents are thus incomplete and must never be stored — every mutation updates
   field by field.
3. **Own Message IDs.** Embedded items do not get an `_id` from the server, and the deep-link needs one.
   **Pitfall:** Spring Data maps a field named `id` by convention to `_id` — without explicit
   `@Field("id")`, every `arrayFilters` on `messages.$[m].id` matches nothing, and **silently**.

## 7. Reactions

```
Reaction { key, userIds[] }
```

An array of User IDs carries assignment **and** count — the same pattern as `readBy` and `unreadFor`,
and the reason why there is no counter next to it: a number that can deviate from the list is a
second truth.

`key` is a **shortcode** (`thumbsup`), never the character: skin tone variants are separate codepoints
and would store the same reaction twice.

The **number of different keys per node** (`MAX_REACTION_KEYS`, 32) is limited, not their form.
A grammar (`[a-z0-9_+-]`) would be the obvious rule and would break the documented
fallback to `detail.emoji.unicode` — a character. And it would miss the point anyway: what makes a
Thread document grow is the number of array entries, not the length of a single one.
A new key above the limit is rejected with 409; joining an existing one and retracting a
Reaction always works — a rule that cannot be undone would be a trap.

Three rules:

1. **A Reaction is not a decision.** A 👍 on an Ask does not answer it — otherwise, there would be
   a second way to decide, without `AnswerPayload`, without effect execution, without audit.
2. **A Reaction does not create unread items.** Five approvals must not be five alarms;
   Reactions are the deliberately *quiet* channel. Whoever wants to be loud writes a Message.
3. **They sort nothing** (§6).

Reactions exist on the Thread and on every Message. **Only existing ones** are displayed, as a chip with
a counter, plus an add button — a permanently displayed palette would be thirty controls on
a short discussion, and the number of interest would be lost among the unpressed ones.

## 8. User Interface

REST under `/brain/{tenant}/inbox/{id}`, additive to existing endpoints:

| Endpoint | Does |
|---|---|
| `POST .../messages` | Append contribution (`body`, optional `parentId`) |
| `POST .../read` | Mark entire Thread or named Messages as read |
| `POST .../invite` | Invite someone |
| `POST .../follow` | Subscribe/unsubscribe to updates (one endpoint, because it's a toggle) |
| `POST .../react` | Toggle Reaction (Thread or a Message) |
| `POST .../participants/remove` | Remove someone — the only one gated on **decide** |
| `GET /inbox/by-document/{documentId}` | The Threads whose object is this document — see below |
| `POST /inbox/discussions` | Open a discussion about a document |

A violated invariant responds with **409 with a stable `reason` code** (`assignee_must_stay`,
`message_limit_reached`, `invalid_parent`, `participant_must_stay`, `reaction_limit_reached`), so that
the client can state which rule it hit, instead of "an error occurred".

**When to read is decided by the client** (on opening, on scrolling, after a delay) —
**that** it has been read must be known by the server, otherwise a second device shows a badge that
is already resolved. The same separation as with Presence. And: **Reading does not close an Ask.**
Viewing a decision is not making a decision.

The Web UI shows the history **below** the action tray of the Inbox detail: the question and its buttons
remain the focus, the clarification supports them. The "new from here" line is a **snapshot on
opening** — derived from the current read status, it would always be empty after the read notification.

**In the list row, there are two things the Thread already carries.** The number of contributions
(`1 Answer` / `3 Answers`) comes from the new `messageCount` on the DTO — necessary because the list query
projects out `messages` and an empty array there says *nothing* about whether there is a discussion;
`null` means "not queried" and is distinct from "no answer". Counting is done in Mongo
(`$size` in an aggregation, `MaximegalonService.countMessages`), **not** in a counter next to
the array — that would be the same second truth already rejected for Reactions. And the
Reaction bar is the same component as in the Thread (chips + an add button, four
use cases: Thread question, Message, Reply, list row), so that approving from the list is not a second,
similar-looking operation. Clicks stop at the bar — the row opens the item, and approving a
question is not the same gesture as entering it.

**Next to the list, a chat column can be present** (the same `ChatSidePanel` as in Cortex, without
a Help tab). It is **page-wide**, not per Thread: a Thread deliberately carries no `projectId` (§9),
so there is nothing to inherit, and taking it from the selected Thread would replace the session list —
and the open chat with it — with every click through the list. The project is therefore fixed to the
user's Hub project (`?project=` overrides). What the reader is currently viewing travels as a
per-turn hint `activeInbox {threadId, messageId?}` — **only IDs**, the content is fetched with
`thread_get` if needed, the same division as Cortex' `boundDocSelection`. A separate field and not
`activeApp`: that resolves `app` via the `VanceApplication`-registry and `folder` as the manifest folder,
and the Inbox is not an app. The return channel is a client tool `inbox_show_thread`, with which the agent
guides the reader to a Thread and a contribution.

**The hint establishes a reference, it is not a read instruction.** The prompt block for this says: if
the message points to something without naming it ("this here", "that one", "the request"), the open
Thread is meant and is read with `thread_get`; if it is about something else, it is only coincidentally
on the screen; and if it cannot be decided, it asks. An unconditional "read it first" was briefly
included and was wrong — most turns in a chat next to the Inbox have nothing to do with the open Thread;
that would be a wasted roundtrip per turn. Equally wrong was the temporary prohibition against asking
back: it forces the model to guess in a truly ambiguous question. Proven in turn: "What's in there?" —
a deictic without another referent — leads to `thread_get` and a substantive answer, without an ID being
named; "What is this about?" Eddie answers with a self-description, which is the acceptable interpretation
in a chat window. Both are correct behavior, not a deficit.

**No WebSocket** in v1: the Web UI loads REST snapshots (live updates only exist in chat), and `foot`
has no Thread UI. Frames without readers are not built.

### The Object of a Thread

What a Thread is about is a **field** (`documentRef`, type `MaximegalonDocumentRef` with
`{documentId, projectId, path, title?, mimeType?}`), not an entry in `payload`. It was there until
the Inbox stopped being a **storage** and became a **query**: "which Threads are about
this document" goes across all `MaximegalonType`, and `payload` is by contract
*type-specific*. A cross-type query on a per-type map breaks the day another producer writes
a different key — silently, by finding nothing. Index
`tenant_docref_idx` on `{tenantId, documentRef.documentId}`, because the query is tied to a UI
that mounts with every document opening.

The name is deliberately not `DocumentRef`: that already exists in `shared.document` as an *authored*
reference (`projectId`, `path`, `query`, no Document ID) and in the wrong module — `vance-api` must
not point to shared. Same word, different thing. And it is a **snapshot**: `title` and
`path` are what the document was called when opened. The Thread remains readable if the document
is renamed or deleted — the point of the Thread is the concern, and `documentId` remains the
way to what is there today.

**Visibility remains `maySee`**, and that is the crucial decision for this query: being allowed to read a
document must **not be a backdoor** into other people's conversations about it. Document access
and conversation access are different rights; if folded together, every share would be a disclosure.
The consequence is intended and must be handled by the client: the answer can **be empty even if
Threads exist**. The empty state therefore says "no discussions", never "none you are allowed to see" —
the second phrasing would confirm what the filter protects. The service delivers unfiltered, the
controller filters: "who may see" is a named decision and belongs next to the subject, not in a lookup method.

**Cortex tab "Discussion"** next to `chat` and `help`, two-stage like the chat (first the Threads for
the document, then one in place). Two specific aspects: **no answer buttons** — an open Ask shows
"waiting for answer" and a link to the inbox, because deciding belongs where the item with its options
*and* its effect warning is rendered; and the **"+" is not a second share dialog** — pointing someone
to a document is a [Milliways](/specs/milliways-system) share and lands in the same list.
`POST /inbox/discussions` serves the two cases that this cannot: a Thread **to oneself** (Milliways
refuses self-delivery) and one whose point is a question. It **never creates an Ask**
(`requiresAction=false`): an Ask is what a *process* waits for, and nothing waits for a manually opened
discussion — an Ask from it would be a permanently open item without a process behind it to resolve it.
Whoever wants an answer gets it in the clarification. Three checks, each for a different question:
Tenant-READ (may the person be here), **Document-READ** (the Ref is a snapshot of title and path —
opening a discussion about an unreadable document would reveal its name), Inbox-WRITE on the recipient
(the same rule as `invite`/`delegate`/`inbox_post`). Origin distinguishable by tag: `share` vs `discussion`.

### Agents: Two Tool Families

Maximegalon carries **two themes in one entity** — the queue ("what is waiting for me") and the
clarification of a concern. The synergy is real (a concern that ends needs exactly one
addressee and a read status, which is why both are in one document), but for the tool names
it is a seam: the word "inbox" earns its place with the first, where the mail-shaped
preconception of a model is usually correct; with the second, it is wrong and pulls it towards
free replies to correspondence. The boundary rule is literally in every tool description:

> `inbox_*` is my queue and my status on it. `thread_*` is the concern itself —
> content, clarification, participants.

| Family | Tool | Does |
|---|---|---|
| `inbox_*` | `inbox_list` | what is waiting, plus the badge numbers; sole source of Thread IDs |
| | `inbox_mark_read` | named Threads (1–25 IDs, no filter, no "all") |
| | `inbox_archive` | clear named Threads, Guard **per entry**, `{archived, skipped}` |
| | `inbox_post` | place something in someone's queue (existed before) |
| `thread_*` | `thread_get` | a concern including clarification, contributions paginated |
| | `thread_message_add` | contribution to clarification — answers nothing |
| | `thread_delegate` | hand over to the person who should decide |

Three rules explaining the selection:

- **There is no answer tool** — not deferred, not gated, **absent**. Whoever is allowed to answer
  executes the `effectType` that grants permissions (§5); the chain
  `permission_request_grant` → `APPROVAL` → `PermissionRequestEffect.onApproved` is fully
  built, only the last link is missing. An answer tool would place both halves of a right acquisition
  in the same turn loop — and with prompt injection via a read document, the attacker is not even the agent.
  Second: an Ask exists because a human decision was desired. `dismiss` is omitted for the same reason
  and is even worse: it is a terminal status change **without** `AnswerPayload` and without effect
  execution, thus silencing a waiting process without deciding.
- **Reading never writes read status.** `readBy` is a set of *persons*; entering the owner
  because a machine looked at it is the one lie in the data that clears an alarm (§4).
  Marking is therefore a separate, named action with enumerable blast radius.
- **No SYSTEM fallback.** An agent reads its owner's Inbox and no other;
  `SecurityContextFactory.forToolSubject` responds to an empty `userId` with
  `SecurityContext.SYSTEM`, which passes every check. For a write path like `inbox_post`, this is
  correct (a scheduler may deliver), for a read tool it is a tenant-wide leak. If no
  user is bound, the call aborts: there is then no person, so nothing to read — not everything.

Forwarding is the exception that proves the rule: `thread_delegate` **routes** a decision
without making one. It requires two gates — `mayDecide` on the Thread **and** `WRITE` on the
target's Inbox, because placing a concern with someone consumes their attention. The second check
was missing on **both** delegate paths (REST and WS) as long as only a human could trigger it;
with a tool, the target is a raw model parameter, and it was added. `invite` had it from the start —
the same rule, so a test now asserts it for both together.

Not built, with reason: `unarchive` (recovery after an error, rare), `react` (the quiet
channel; a reacting agent is noise), `follow` (one's own subscription), tag writing (there is no
write path at all, and tags are set by the creator to describe origin), `invite` (gate correct,
but it consumes a third party's attention for something that is a click for humans).
Manual: `_vance/manuals/inbox-threads.md`, separated from `inbox-post.md` due to diverging
load frequency. Derivation and discarded alternatives: `planning/maximegalon-agent-tools.md`.

## 9. Boundaries

- **Participants are Vancetope accounts.** Here, the model would become a messenger through the back door:
  without an account, it requires identity mapping, external delivery, and history management for outsiders.
  Threads are the **internal** communication layer; externally, it remains with outbound-with-reason
  ([Milliways](/specs/milliways-system)).
- **Note ≠ Thread.** A Note on the document has no addressee and no expectation of an answer; a
  Thread has both. Test: a Note does not become unread, a Thread does.
- **No `projectId`.** A Thread does not necessarily have an object (a Worker-Ask often only has
  text), and where one exists, the project is in the `documentRef` — a second field would be a second
  truth. A Thread about a later deleted document remains meaningful.
- **No Messenger.** Rejected, not postponed: external conversation state remains with the
  external system, because Vancetope only keeps history where the object lives here.

## 10. Open

- Merging with document Notes (§9 draws the line, but does not say whether Notes will remain
  independent long-term).
- Whether chat Messages may reference a Thread (today only vice versa).
- Free emoji selection (requires a Unicode→Shortcode mapping; the existing picker component provides
  the character).
- **Whether a contribution notifies — and whom.** The `NotificationDispatcher` listens to exactly two
  events, `MaximegalonCreatedEvent` and `MaximegalonDelegatedEvent`, both gated on
  `status == PENDING`. `postMessage` **does not** fire an event (in `MaximegalonService` there are six
  `publishEvent` locations — create, answer, archive, update, delegate — none for a contribution),
  `invite` likewise. A contribution thus raises `unreadFor` and thereby the badge, but does not
  trigger an active signal.

  For an **Ask**, this is correct: the Ask pinged on creation, and the clarification is a detail
  within something that has already been brought to attention. For a **discussion Thread** (§8,
  `POST /inbox/discussions`), however, the clarification is the *entire* content — the first line pings,
  every subsequent one does not. Whoever does not have Vancetope open learns nothing about the history.

  Two barriers, between which the answer must lie. Against a route: **the badge is the
  notification** — §4 argues that it only counts unread items and thus can reach zero;
  a contribution raises it, a second route would be redundancy. For a route: a badge is a number in
  a top bar, and for a Thread without an Ask, it is the *only* channel. If one ever comes, then
  **not** as a ping per contribution — that would be the notification stream that §9 excludes with
  "no Messenger" —, but one per Thread per quiet period ("in *X* there is something new"), and the
  question "Assignee or all `participants`" must then also be decided.

---

*History and derivation: `planning/maximegalon.md`. View and
Notification subsystem: [`user-interaction.md`](/specs/user-interaction).*
