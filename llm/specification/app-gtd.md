# Vancetope Application — `app: gtd`

> Getting-Things-Done container via `kind: action` pages, in the **Things** paradigm
> (Cultured Code), built on the [doc-kind-application](doc-kind-application.md)
> foundation. **Not** Kanban: an Action's bucket is a *derived function*
> from its `when` attribute + today, not a folder. For differentiation, see
> [app-kanban](app-kanban.md) §8.

## 1. GTD ≠ Kanban — Derived Buckets

Kanban has manual columns (cards moved by hand, column = folder). GTD à la
Things has **derived buckets**: an Action lands in Today / Upcoming /
Anytime / Someday as a pure function of `when` (+ optional `deadline`) and the
current date. A planned Action automatically "slides" from *Upcoming* to *Today*
on its due date — **without file movement**. A bucket change in the UI **sets the
`when` attribute**, it does not move a file. This is the hard difference from Kanban.

Two buckets are exempt and **are** folders — `inbox/` and `trash/`;
why this is not a softening of the rule is explained in §3a.

## 2. Folder Layout

```
gtd/my-life/
├── _app.yaml                      ← Manifest (kind: application, app: gtd)
├── _today.md                      ← auto-generated (Today + overdue)
├── _upcoming.md                   ← auto-generated (chronological)
├── _stats.yaml                    ← auto-generated (counts)
├── inbox/                         ← unprocessed (= Inbox bucket)
├── actions/                       ← processed individual Actions (Bucket via when)
├── trash/                         ← discarded (= Trash bucket)
└── projects/
    └── website-relaunch/          ← Project = folder
```

- **Folders do NOT encode the bucket** — except `inbox/` and `trash/`. Everything
  else is derived.
- `projects/<name>/` groups Project Actions. `_`-Prefix = system-managed.

## 3. Bucket Derivation (the Core)

`GtdBucketResolver.bucketOf(inInbox, inTrash, when, deadline, today)` — pure,
fully unit-tested function. The first matching rule wins:

| # | Rule | Bucket |
|---|---|---|
| 1 | File under `trash/` | **Trash** (discarded, not on any work list) |
| 2 | File under `inbox/` | **Inbox** |
| 3 | `deadline` ≤ today | **Today** (hard due date takes precedence) |
| 4 | `when: someday` | **Someday** |
| 5 | `when: today` | **Today** |
| 6 | `when` = date: future → **Upcoming**, otherwise (today/overdue) → **Today** |
| 7 | no `when` | **Anytime** |

**`done` is intentionally not a rule** (§3a). Details for the LLM:
`manual_read('gtd-buckets')`.

### 3a. Two Buckets Are Folders — And This Is The Same Exception Twice

`inbox/` and `trash/` both hold Actions that are **outside the work list**:
one because no one has processed it yet, the other because someone has
discarded it. For both, "which folder" *is* the entire state. Deriving them
from `when` would require a second attribute meaning "ignore the first" —
precisely the second truth that §1 argues against.

Consequence: the bucket change to `trash` and back is a **relocation**, not
a `when` write operation. And `when` remains **untouched** — otherwise, an
Action would land somewhere it never was when retrieved.

**A round trip through the trash loses nothing.** The original folder
is noted as `trashedFrom:` in the front matter when discarded and read
*and deleted* when retrieved (never stale). This is the only reason anyone
writes it down at all: `trash/` is a flat folder, and without the note,
project affiliation after "deleted → not really" would be silently lost.
The value is read **validated** (relative, no `..` segments) —
it is in a manually editable file, and "Restore" must not be a way
to write outside the GTD folder.

### 3b. Checking Off Moves Nothing — Cleanup Is A Second, Visible Step

A checked-off Action **remains in its bucket**, struck through. Previously, it
fell out of every bucket, and that was the error: the line disappeared from
under the cursor, and nothing on the screen said where — checking off looked
like deleting.

Instead, the list is cleared **in a deliberate act**: `refresh()`
(= `app_rebuild` / the ↻ button) moves every completed Action to `trash/`,
*before* writing the artifacts, and then rescans. This keeps
`_today.md`/`_upcoming.md` free of completed items, and what has been cleared
is still there and viewable afterwards instead of gone.

Two consequences in the counts, which belong together:

- **The badges of the five work buckets count open Actions**, not
  displayed ones. A badge answers "what still needs to be done" — a checkmark
  therefore makes it drop, even though the line remains.
- **Trash counts everything that is in it.** A trash bin is not a work list;
  the only question it answers is "how much is here".

## 4. Action Schema (`kind: action`)

Markdown primarily; JSON/YAML for tooling. `GtdActionCodec` owns the schema.

```markdown
---
kind: action
title: Call tax advisor
when: today            # "" (Anytime) | today | someday | 2026-08-01
deadline: 2026-07-31   # optional, hard date
contexts: "@calls, @office"
done: false
---
Inquire about Q3 prepayment.
- [ ] Prepare documents
```

`contexts` are GTD contexts (`@` convention); they are additionally mirrored to the native
document tag set (search). Body = note + GFM subtasks.

## 5. Derived Artifacts

- **`_today.md`** — Today + separate "Overdue", grouped by context.
- **`_upcoming.md`** — Upcoming chronologically, by date.
- **`_stats.yaml`** — `bucketCounts`, `overdue`, `contextCounts`, `projectCounts`,
  `totalOpen`, `done`. Only counts, no time series. `totalOpen` excludes the
  trash, `done` counts completed items **wherever they are** — otherwise, it would
  drop to zero after cleanup.

Date-dependent → `refresh()` runs with the current date. **`refresh()` does not
just write**: it first moves completed items to the trash (§3b).

## 6. Movement Semantics (`move` / `assignProject`) + Search

There are **two** movements, and the difference is precisely that from §1 — one
sets an attribute, the other moves a file:

`GtdService.move(path, bucket, date?)` — **Bucket change**:
- **sets `when`** — Today→`today`, Anytime→`""`, Someday→`someday`, Upcoming→`date`;
- the **Inbox and Trash transitions** additionally relocate the file; to
  `trash`, `when` remains untouched; out of `trash`, it goes to the folder
  `trashedFrom` specifies (otherwise `actions/`) — see §3a.

`GtdService.assignProject(path, project?)` — **Refiling** an existing Action
to `projects/<slug>/`, or back to `actions/` if `project` is empty.
**Only** relocation: no field of the Action changes, so the derived bucket
remains the same — except that leaving `inbox/` makes the Action processed,
just like a bucket change out of the Inbox. If the Action is already in the
target folder, the operation is a no-op. A project name that does not result
in a slug is rejected (no silent fallback to `actions/`).

Field edits (Title/Deadline/Contexts/`done`/Body) run via an in-place PATCH,
**without** relocation — `done` included (§3b).

**`DELETE` means two things, and the folder decides, not the caller.**
Outside `trash/`, it moves the Action **there**; inside `trash/`, it
forwards the document to the project-wide soft-delete (`DocumentService.trash`
→ `_vance/trash/`). There is intentionally **no** parameter with which a
client could directly request the destructive variant: anyone who can do that
will eventually call it from the wrong screen. The whole point of a visible
trash bin is that the destructive step is the **second** one — done in a place
that can be reviewed beforehand.

**Search** uses the shared `DocumentService.searchProjectDocumentsMeta(...)` (see
[app-journal](app-journal.md) §6): Match over `title` + `summary` + `tags`
(contexts), Body is a compressed blob and **not** directly searchable.

## 7. Tools

| Tool | Purpose |
|---|---|
| `gtd_app_create` | Bootstrap (Manifest + Refresh). |
| `gtd_capture` | Quick capture → Inbox. |
| `gtd_action_create` | Create processed Action (with `when`/`deadline`/`contexts`/`project`). |
| `gtd_action_update` | In-place patch; set bucket via `when`, toggle `done`. `bucket` (`inbox`/`trash`/`today`/`anytime`/`someday`) is the path to the two folder buckets and **exclusive to `when`** — both would decide the bucket, and there would be no rule which wins. `project` additionally refiles (`""` = back to `actions/`) — **absent ≠ empty**: absent leaves the folder alone. |
| `gtd_query` | List by Bucket/Context/Project. Completed items and trash remain excluded until explicitly named (`includeDone`/`includeTrash`/`bucket=trash`). |
| `gtd_search` | Free text (Title/Summary/Contexts). |
| `app_rebuild` | Generic — regenerate `_today`/`_upcoming`/`_stats` **and** move completed items to `trash/` (§3b). |

**No deletion tool.** The only surface where an Action permanently
disappears is the trash bin in the UI. An agent can discard
(`bucket="trash"`), not destroy.

## 8. Web UI Editor

Mounted via the Kind Registry (`application:gtd` → `GtdAppKind.vue`).

- **Left:** Bucket list (Inbox/Today/Upcoming/Anytime/Someday/Trash with
  counters) + Projects + Context chips (filter). All three are **drop targets** —
  see §8a.
- **Middle:** Action list for the selected bucket/project, inline done checkbox
  (completed items remain, struck through — §3b), when-/Deadline-/
  Context badges, Overdue highlighting; "＋ Capture" field at the top. Each line is
  `draggable`. The **Project view does not show the trash**: it
  answers "what is still pending for this project", and discarded items are
  accessible under Trash — there and only there.
- **Right:** Action detail — **Bucket picker** (sets `when` or relocates
  Inbox/Trash via `move`), **Project select** (refiles via `assignProject`; "(no
  project)" refiles back to `actions/`, "＋ New project…" prompts for a name
  and implicitly creates the folder), Deadline, Contexts, `done`, Body via
  `WorkPageEditor` (bodyOnly). Debounced Auto-Save. The delete button is called
  **"Move to Trash"** and outside… or **"Delete for good"** inside the trash;
  **only the second prompts for confirmation**, because only it cannot be undone
  by retrieving the item.
- **Top:** Free text search + Rebuild. Live updates via the `documents` channel.

**REST — `GtdAppController` (`/brain/{tenant}/addon/gtd/...`)**: `scan`, `action`
GET/POST/PATCH/DELETE, `capture`, `move`, `project`, `search`, `rebuild`. Thin
Adapter, `authority.enforce(...)`. `DELETE` additionally carries `folder`, because
only the configured `trashDir` decides which of the two meanings applies.

### 8a. Drag & Drop to the Sidebar

Dragging an Action from the middle to a sidebar target calls **exactly the
operation that the detail panel also calls** — the drag merely saves
prior selection. The three targets are intentionally three **different**
operations, not a common "move" abstraction:

| Drop on | Operation | Effect |
|---|---|---|
| Bucket | `move` | sets `when` (Upcoming prompts for the date) |
| Bucket **Trash** | `move` | moves to `trash/`, `when` remains; retrieving restores the original folder (§3a) |
| Project | `assignProject` | moves the file to `projects/<slug>/` |
| Context chip | PATCH `contexts` | **adds** the context (does not replace) |

Two rules govern this behavior:

- **A no-op target does not accept.** If the drag targets the bucket/project
  where the Action already resides, or a context it already has,
  `preventDefault()` is **not** called — the browser shows "not allowed" instead
  of promising a move that does nothing. Therefore, the acceptance check
  depends on the dragged `GtdActionView` (`bucket`/`project`/`contexts` are already
  there from the scan), not on a server roundtrip.
- **The detail panel only follows its own Action.** The dragged Action is
  usually not the selected one; `applyDetail(...)` only runs if path ==
  `selectedPath`. Otherwise, a drag would silently switch the right panel.

Dragging to Bucket/Project/Context sets `application/x-vance-gtd-action` in the
`dataTransfer` (path as payload). This is one drag mode — **cross-section**,
bringing an Action into a different bucket/project/context affiliation. The
order *within* a list is a second, orthogonal drag mode and
described in §8b.

### 8b. Drag Sorting Within a List (Order)

The order of Actions **within** a bucket can be manually sorted —
and this does **not** conflict with the derived bucket assignment (§1), because the
bucket remains a pure function of `when`/`deadline`/today. A manual sorting of
the *assignment* would be a second truth alongside `when`; a manual sorting of
the *order* is orthogonal to it. Both are cleanly separated: the `when` attribute
decides **which** bucket, the list in the manifest decides **which order within it**.

**Storage location: the `_app.yaml` manifest, not the Action file.** For each bucket,
an optional ID list (`gtd.<bucket>Order: [id, …]`) is stored there. An Action
not in the list still appears — at its **default position** (bottom), not at the
end of the list.

**The default order is part of the contract**, not a "that's just how it is": it
is the order a bucket has before anyone drags, *and* the place where an
unnamed Action falls. It is alphabetical by title — with two named points:

- **Upcoming is chronological.** The whole point of the bucket is "later, in
  this order", and `_upcoming.md` already groups by date. An alphabetical list
  next to it would be two answers to one question.
- **Comparison uses a `Collator`**, not `toLowerCase`. Otherwise, "Ärger" would
  end up after "Zettel" instead of next to "Arbeit". Ties are broken by ID, so
  the order never depends on the scan order.

**Order, not ID table.** The IDs in the list are Mongo `_id`s — not
paths — because a re-file (`assignProject`) moves the file, and a path entry
would thus die; an ID never changes. Dead IDs (Action deleted, or
moved to another bucket) are ignored when displayed and filtered from the list
on the next reorder — each reorder is also a small garbage collection of the
affected bucket list.

**Deliberate consequence: a bucket change loses the remembered position.** If
an Action changes buckets by setting `when` (manually or automatically on the
due date: Upcoming → Today), we do **not** touch the manifest — that would be
the most invasive part of a per-Action storage, which we are precisely avoiding.
The old bucket list retains its (now dead) ID entry until the next reorder, and in
the new list, the Action is missing → it appears at its default position. Whoever
sorts, sorts the **current** list; whoever changes the bucket gets the default
position in the new one. This is consistent and usable.

**A reorder = one write operation.** `POST /brain/{tenant}/addon/gtd/reorder`
with `{ bucket, orderedIds }` writes `_app.yaml` once and responds with the
**entire view** — the client would have reloaded anyway, and the order it
receives back is the resynchronized one, not necessarily the one sent.
`move`/`assignProject` do **not** touch the manifest (deliberately, see above).

**`orderedIds` is regularly only a subset — and is spliced in, not
replaced.** A project or context filter narrows the list; the client
therefore only sends what it shows. If the server were to *replace* the stored list
with it, everything hidden would fall to the back — a single drag under a
filter would reorder the bucket for everything the person could not see.
Instead, the named IDs are **permutated within the positions they
already occupy**: unnamed Actions retain their exact position, and an
unfiltered reorder (all IDs named) reduces exactly to "the list the client
sent".

**Sorting always occurs within *one* bucket.** The middle list is not
always a bucket — the project view shows all simultaneously. A drag across
this boundary has no meaning (the order lives per bucket) and is therefore
**not offered at all**: no insertion marker, no write operation. Accepting it
would look like "it worked" and change nothing on the screen.

**A reorder is serialized, not Last-Writer-Wins.** Read-modify-write over
an entire document has no field merge and no optimistic locking — two
simultaneous reorders both read *n* IDs and both write their own *n*;
the first written would be silently lost. `GtdManifestOps` therefore holds a
stripped lock per `(tenant, project, folder)`, and the **scan is within the lock**
(which Actions are in the bucket must apply *now*). JVM-local is sufficient
because a project's documents are served by the home pod; the honest
alternative would be a version at the `DocumentService` funnel, not in this app.

**Whoever reads the order, reads it everywhere.** Not just the interactive list:
the generated `_today.md` and `gtd_query` also go through the same function.
A surface that skips it shows the person a different order than the one
they dragged to — and "the top three" would then mean two things.
(`_upcoming.md` is excluded: the renderer groups by date, which is the
default order of this bucket anyway.)

**`gtd_app_create(overwrite=true)` retains the order lists.** Every other field
written during this process is either passed or a documented default —
the order is neither, and nothing can reconstruct a dragged order. An outdated
ID costs nothing; the next reorder collects it.

## 9. Non-Goals (v1)

- **No Areas of Responsibility** (Things level above projects) → v2.
- **No recurring Actions** (`repeat:`) → v2.
- **No Reminders/Notifications** — Deadline is purely visual.
- **No Weekly Review Wizard** — later a separate wizard.
- **No Kanban Board View** — GTD is bucket lists.
- **No Drag between Actions** (no subtask hierarchy across files — subtasks
  are GFM checkboxes in the body). *Drag sorting within a list is
  built for this* — see §8b; it is orthogonal to the derived
  bucket assignment.
- **No Project Rename/Delete via the app** — a project is a folder;
  renaming means refiling Actions individually or manipulating the folder
  using document tools.
- **No CRDT** — Last-Writer-Wins + Live-Watch.
- **No "Empty Trash" button and no automatic trash expiration**
  → v2. Both would delete in one go what was individually discarded; as long
  as this is not available, a full trash bin only costs space.
- **No deletion tool for agents** (§7).
