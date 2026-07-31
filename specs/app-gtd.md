---
title: "Vancetope Application — `app: gtd`"
parent: Specs
permalink: /specs/app-gtd
---

<!-- AUTO-GENERATED from specification/public/en/app-gtd.md — do not edit here. -->

---
# Vancetope Application — `app: gtd`

> Getting-Things-Done container via `kind: action` pages, in the **Things** paradigm
> (Cultured Code), built on the [doc-kind-application](/specs/doc-kind-application)
> foundation. **Not** Kanban: an Action's bucket is a *derived function* of its
> `when` attribute + today, not a folder. For differentiation, see
> [app-kanban](/specs/app-kanban) §8.

## 1. GTD ≠ Kanban — Derived Buckets

Kanban has manual columns (drag card by hand, column = folder). GTD à la
Things has **derived buckets**: an Action lands in Inbox / Today / Upcoming /
Anytime / Someday as a pure function of `when` (+ optional `deadline`) and the
current date. A scheduled Action automatically "slides" from *Upcoming* to *Today*
on its due date — **without file movement**. A bucket change in the UI **sets the
`when` attribute**, it does not move a file. This is the key difference from Kanban.

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
Ask about Q3 advance payment.
- [ ] Prepare documents
```

`contexts` are GTD contexts (`@` convention); they are additionally mirrored to the native
document tag set (search). Body = note + GFM subtasks.

## 5. Derived Artifacts

- **`_today.md`** — Today + separate "Overdue", grouped by context.
- **`_upcoming.md`** — Upcoming chronologically, by date.
- **`_stats.yaml`** — `bucketCounts`, `overdue`, `contextCounts`, `projectCounts`,
  `totalOpen`, `done`. Counts only, no time series.

Date-dependent → `refresh()` runs with the current date.

## 6. Movement Semantics (`move`) + Search

`GtdService.move(path, bucket, date?)` is the single movement operation:
- **sets `when`** — Today→`today`, Anytime→`""`, Someday→`someday`, Upcoming→`date`;
- the **Inbox transition** additionally relocates the file (`inbox/` ↔ `actions/`).

Field edits (title/deadline/contexts/`done`/body) happen via an in-place PATCH,
**without** relocation.

**Search** uses the shared `DocumentService.searchProjectDocumentsMeta(...)` (see
[app-journal](/specs/app-journal) §6): Match over `title` + `summary` + `tags`
(contexts), body is a compressed blob and **not** directly searchable.

## 7. Tools

| Tool | Purpose |
|---|---|
| `gtd_app_create` | Bootstrap (Manifest + Refresh). |
| `gtd_capture` | Quick capture → Inbox. |
| `gtd_action_create` | Create processed Action (with `when`/`deadline`/`contexts`/`project`). |
| `gtd_action_update` | In-place patch; set bucket via `when`, toggle `done`. |
| `gtd_query` | List by derived bucket/context/project. |
| `gtd_search` | Free text (title/summary/contexts). |
| `app_rebuild` | Generic — regenerate `_today`/`_upcoming`/`_stats`. |

## 8. Web UI Editor

Mounted via the Kind Registry (`application:gtd` → `GtdAppKind.vue`).

- **Left:** Bucket list (Inbox/Today/Upcoming/Anytime/Someday with counters) +
  Projects + Context chips (filter).
- **Middle:** Action list for the selected bucket/project, inline done checkbox,
  when/deadline/context badges, overdue highlighting; "＋ Capture" field at the top.
- **Right:** Action detail — **Bucket picker** (sets `when` or relocates
  Inbox via `move`), Deadline, Contexts, `done`, Body via `WorkPageEditor`
  (bodyOnly). Debounced auto-save.
- **Top:** Free text search + Rebuild. Live updates via the `documents` channel.

**REST — `GtdAppController` (`/brain/{tenant}/addon/gtd/...`)**: `scan`, `action`
GET/POST/PATCH/DELETE, `capture`, `move`, `search`, `rebuild`. Thin adapter,
`authority.enforce(...)`.

## 9. Non-Goals (v1)

- **No Areas of Responsibility** (Things level above projects) → v2.
- **No recurring Actions** (`repeat:`) → v2.
- **No Reminders/Notifications** — Deadline is purely visual.
- **No Weekly Review Wizard** — later a dedicated wizard.
- **No Kanban Board View** — GTD is bucket lists.
- **Moving existing Actions between Projects** is v2 (Project is chosen at creation).
- **No Drag-and-Drop** v1 — Bucket changes via the picker (functionally identical:
  both set `when`).
- **No CRDT** — Last-Writer-Wins + Live-Watch.
