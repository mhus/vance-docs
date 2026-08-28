# Vancetope Application — `app: gtd`

> Getting-Things-Done container via `kind: action` pages, in the **Things** paradigm
> (Cultured Code), built on the [doc-kind-application](doc-kind-application.md)
> foundation. **Not** Kanban: an Action's bucket is a *derived function*
> of its `when` attribute + today, not a folder. For differentiation, see
> [app-kanban](app-kanban.md) §8.

## 1. GTD ≠ Kanban — Derived Buckets

Kanban has manual columns (cards moved by hand, column = folder). GTD à la
Things has **derived buckets**: an Action lands in Inbox / Today / Upcoming /
Anytime / Someday as a pure function of `when` (+ optional `deadline`) and the
current date. A planned Action automatically "slides" from *Upcoming* to *Today*
on its due date — **without file movement**. A bucket change in the UI **sets the
`when` attribute**, it does not move a file. This is the hard difference from Kanban.

## 2. Folder Layout

```
gtd/my-life/
├── _app.yaml                      ← Manifest (kind: application, app: gtd)
├── _today.md                      ← auto-generated (Today + overdue)
├── _upcoming.md                   ← auto-generated (chronological)
├── _stats.yaml                    ← auto-generated (counts)
├── inbox/                         ← unprocessed (= Inbox bucket)
├── actions/                       ← processed individual Actions (Bucket via when)
└── projects/
    └── website-relaunch/          ← Project = folder
```

- **Folders do NOT encode the bucket** — except `inbox/` (special case "unprocessed").
  Buckets are derived.
- `projects/<name>/` groups Project Actions. `_`-prefix = system-managed.

## 3. Bucket Derivation (the Core)

`GtdBucketResolver.bucketOf(inInbox, when, deadline, today)` — pure, fully
unit-tested function. The first matching rule wins (for non-`done` Actions):

| # | Rule | Bucket |
|---|---|---|
| 1 | File under `inbox/` | **Inbox** |
| 2 | `deadline` ≤ today | **Today** (hard due date takes precedence) |
| 3 | `when: someday` | **Someday** |
| 4 | `when: today` | **Today** |
| 5 | `when` = date: future → **Upcoming**, otherwise (today/overdue) → **Today** |
| 6 | no `when` | **Anytime** |

`done: true` falls out of all buckets. Details for the LLM:
`manual_read('gtd-buckets')`.

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
Inquire about Q3 advance payment.
- [ ] Prepare documents
```

`contexts` are GTD contexts (`@`-convention); they are additionally mirrored to the native
document tag set (search). Body = note + GFM subtasks.

## 5. Derived Artifacts

- **`_today.md`** — Today + separate "Overdue", grouped by context.
- **`_upcoming.md`** — Upcoming chronologically, by date.
- **`_stats.yaml`** — `bucketCounts`, `overdue`, `contextCounts`, `projectCounts`,
  `totalOpen`, `done`. Only counts, no time series.

Date-dependent → `refresh()` runs with the current date.

## 6. Movement Semantics (`move` / `assignProject`) + Search

There are **two** movements, and the difference is precisely that from §1 — one
sets an attribute, the other moves a file:

`GtdService.move(path, bucket, date?)` — **Bucket change**:
- **sets `when`** — Today→`today`, Anytime→`""`, Someday→`someday`, Upcoming→`date`;
- the **Inbox transition** additionally relocates the file (`inbox/` ↔ `actions/`).

`GtdService.assignProject(path, project?)` — **Refiling** an existing Action
to `projects/<slug>/`, or back to `actions/` if `project` is empty.
**Only** relocation: no field of the Action changes, so the derived bucket remains
the same — except that leaving `inbox/` makes the Action processed,
just like a bucket change out of the Inbox. If the Action is already in the
target folder, the operation is a no-op. A project name that does not
result in a slug will be rejected (no silent fallback to `actions/`).

Field edits (Title/Deadline/Contexts/`done`/Body) run via an in-place PATCH,
**without** relocation.

**Search** uses the shared `DocumentService.searchProjectDocumentsMeta(...)` (see
[app-journal](app-journal.md) §6): Match over `title` + `summary` + `tags`
(contexts), Body is a compressed blob and **not** directly searchable.

## 7. Tools

| Tool | Purpose |
|---|---|
| `gtd_app_create` | Bootstrap (Manifest + Refresh). |
| `gtd_capture` | Quick capture → Inbox. |
| `gtd_action_create` | Create processed Action (with `when`/`deadline`/`contexts`/`project`). |
| `gtd_action_update` | In-place patch; set bucket via `when`, toggle `done`. `project` additionally refiles (`""` = back to `actions/`) — **absent ≠ empty**: absent leaves the folder untouched. |
| `gtd_query` | List by derived bucket/context/project. |
| `gtd_search` | Free text (Title/Summary/Contexts). |
| `app_rebuild` | Generic — regenerate `_today`/`_upcoming`/`_stats`. |

## 8. Web UI Editor

Mounted via the Kind Registry (`application:gtd` → `GtdAppKind.vue`).

- **Left:** Bucket list (Inbox/Today/Upcoming/Anytime/Someday with counters) +
  Projects + Context chips (filter). All three are **drop targets** — see §8a.
- **Middle:** Action list for the selected bucket/project, inline done checkbox,
  when-/Deadline-/Context badges, overdue highlighting; "＋ Capture" field at the top.
  Each row is `draggable`.
- **Right:** Action detail — **Bucket picker** (sets `when` or relocates
  Inbox via `move`), **Project select** (refiles via `assignProject`; "(no
  project)" refiles back to `actions/`, "＋ New project…" prompts for a name
  and implicitly creates the folder), Deadline, Contexts, `done`, Body via
  `WorkPageEditor` (bodyOnly). Debounced Auto-Save.
- **Top:** Free text search + Rebuild. Live updates via the `documents`-channel.

**REST — `GtdAppController` (`/brain/{tenant}/addon/gtd/...`)**: `scan`, `action`
GET/POST/PATCH/DELETE, `capture`, `move`, `project`, `search`, `rebuild`. Thin
Adapter, `authority.enforce(...)`.

### 8a. Drag & Drop to the Sidebar

Dragging an Action from the middle to a sidebar target calls **exactly the
operation that the detail panel also calls** — the drag merely saves
prior selection. The three targets are deliberately three **different**
operations, not a common "move" abstraction:

| Drop on | Operation | Effect |
|---|---|---|
| Bucket | `move` | sets `when` (Upcoming prompts for the date) |
| Project | `assignProject` | moves the file to `projects/<slug>/` |
| Context chip | PATCH `contexts` | **adds** the context (does not replace) |

Two rules govern this behavior:

- **A no-op target does not accept.** If the drag targets the bucket/project
  where the Action already resides, or a context it already has, `preventDefault()`
  is **not** called — the browser shows "not allowed" instead of promising a move
  that does nothing. Therefore, the acceptance check depends on the dragged `GtdActionView`
  (`bucket`/`project`/`contexts` are already available from the scan), not on a
  server roundtrip.
- **The detail panel only follows its own Action.** The dragged Action is
  usually not the selected one; `applyDetail(...)` only runs if path ==
  `selectedPath`. Otherwise, a drag would implicitly switch the right panel.

The drag sets `application/x-vance-gtd-action` in `dataTransfer` (path as
payload) — the order within a list is **not** drag-sortable:
Buckets are derived (§1), manual sorting would be a second truth
besides `when`.

## 9. Non-Goals (v1)

- **No Areas of Responsibility** (Things level above Projects) → v2.
- **No recurring Actions** (`repeat:`) → v2.
- **No Reminders/Notifications** — Deadline is purely visual.
- **No Weekly Review Wizard** — later a separate wizard.
- **No Kanban Board View** — GTD is bucket lists.
- **No drag sorting within a list** (see §8a) and **no drag
  between Actions** (no subtask hierarchy across files — subtasks are
  GFM checkboxes in the body).
- **No Project Rename/Delete via the app** — a Project is a folder;
  renaming means refiling Actions individually or manipulating the folder
  using document tools.
- **No CRDT** — Last-Writer-Wins + Live-Watch.
