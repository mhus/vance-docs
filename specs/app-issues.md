---
title: "Vance Application — `app: issues`"
parent: Specs
permalink: /specs/app-issues
---

<!-- AUTO-GENERATED from specification/public/en/app-issues.md — do not edit here. -->

---
# Vance Application — `app: issues`

> A lightweight **GitHub-Issues-style** issue tracker, built on the
> [doc-kind-application](/specs/doc-kind-application) foundation. `kind: issue` pages
> with a stable number (#42), `open`/`closed` state, labels, archive, and a
> comment thread. **Not** Kanban (no board) and **not** Scrum (no
> sprints) — it tracks the *lifecycle + discussion* of individual items.
> Framed as Vance's own bug/idea tracker, not as a Jira/Linear replacement.

## 1. Issues ≠ Kanban ≠ Scrum

- **Kanban** = spatial board, focus on column position.
- **Issues** = item lifecycle: **discussion thread**, **open/closed**, **stable
  number (#42)**, cross-references. No board requirement.
- **Scrum** = iteration management (deferred, too complex + vision-borderline).

**Fook Synergy (v2):** Vance triages bug/feature reports to tickets with [Fook](/specs/fook-service).
An `app: issues` can later become their native local home;
the data model is prepared for this, but v1 does not build the integration.

## 2. Folder Layout

```
issues/backend/
├── _app.yaml                      ← Manifest (knows nextNumber counter)
├── _index.md                      ← auto-generated (open issues + recently closed)
├── _stats.yaml                    ← auto-generated (open/closed, per-label, per-assignee)
├── items/
│   ├── 1-login-flow-bug.md        ← kind: issue, filename = <number>-<slug>
│   └── 2-search-is-slow.md
└── archive/                       ← archived issues (removed from the active tracker)
```

- **One Issue = one file** `items/<number>-<slug>.md`. The **number is the stable
  ID**; the slug is just a hint.
- **State (open/closed) is a Frontmatter field, not a folder.**
- **Archived = Location `archive/`, orthogonal to open/closed** (§4).
- `_`-Prefix = system-managed.

## 3. Stable Numbers (#42)

Monotonic, never reused. The manifest holds a `nextNumber` counter. On
creation, `number = max(nextNumber, maxExistingNumber+1)` is reserved
(self-healing for stale counter); the **unique `(tenant,project,path)` index** is
the hard guard — if a number collides under concurrency, the service retries
with the next one. The manifest counter is incremented best-effort (never decremented).
This makes numbers race-safe + monotonic **without** a separate counter collection.
Cross-references `#N` refer to the number.

## 4. Archive

Archiving removes old (mostly closed) issues from the active tracker, **without
deletion**: the file moves `items/` → `archive/`, **number + state remain** (no
third state value). The active scan only reads `items/` → archived items fall out of
lists, counters, and `_index`. A separate "Archived" view lists them;
unarchiving brings them back. **Trash remains separate** (archive = keep-away,
trash = discard). Implementation: pure `newPath` move.

## 5. Issue Schema (`kind: issue`)

```markdown
---
kind: issue
number: 42
title: Login flow throws NPE with empty password
state: open            # open | closed
labels: bug, auth
assignee: alice
priority: high
---
Repro …
```

`IssueCodec` owns the schema (Markdown/JSON/YAML). `labels` are mirrored to native
Doc-tags (filter/search). **Comments are NOT in the Frontmatter** — §6.

## 6. Comment Thread via DocumentNotes

The discussion thread uses the existing `DocumentNote` subsystem: one comment =
one note on the issue document (`addNote`/`listNotes`/`deleteNote`), atomic (`$set`/`$unset`
on `notes.{id}`), **no** full save, **no** archive snapshot. `text`/`userId`/
`createdAt` per comment, sorted by time. This means the thread requires practically no
new backend development.

## 7. Tools

| Tool | Purpose |
|---|---|
| `issue_app_create` | Bootstrap (Manifest + Refresh). |
| `issue_create` | Create issue — number is assigned automatically. |
| `issue_update` | In-place: state/labels/assignee/priority/title/body; `archived=true/false` moves to/from `archive/`. |
| `issue_comment` | Add comment to thread. |
| `issue_query` | List by state/label/assignee (or `archived`). |
| `issue_search` | Free text (title/summary/labels). |
| `app_rebuild` | Generic — regenerate `_index.md` + `_stats.yaml`. |

## 8. Search

Like Journal/GTD via the shared `DocumentService.searchProjectDocumentsMeta(...)`:
Match `title` + `summary` + `tags` (Labels), scoped to the Suite folder, with
`label`-facet. Body is a compressed blob → not directly searchable; hits
rank on the summary.

## 9. Web UI Editor

Mounted via the Kind Registry (`application:issues` → `IssuesAppKind.vue`).

- **Top:** Open / Closed / **Archived** tabs with counters, search, "New issue", Rebuild.
- **Middle:** Issue list (state dot + #Number + Title + Labels + Assignee),
  Label filter chips, click → detail.
- **Right/Detail:** #Number + State badge, Title, **Close/Reopen**, **Archive/Unarchive**,
  Labels, Assignee, Priority, Body via `WorkPageEditor` (bodyOnly), and the
  **comment thread** (Notes list + input). Debounced Auto-Save.
- **Live updates** via the `documents` channel. Last-Writer-Wins.

**REST — `IssuesAppController` (`/brain/{tenant}/addon/issues/...`)**: `scan`
(`state`/`archived`-filter), `issue` GET/POST/PATCH/DELETE, `issue/archive` +
`/unarchive`, `issue/comment` POST/DELETE, `search`, `rebuild`. Thin Adapter,
`authority.enforce(...)`.

## 10. Non-Goals (v1)

- **No board** (Kanban's job), **no milestones/sprints**.
- **No Fook integration** (v2, §1).
- **No reactions, no multiple assignees, no cross-repo refs.**
- **Numbers monotonic, not reused** — gaps for deleted issues are okay.
- **No CRDT** — Last-Writer-Wins; comments are atomic (Notes) and can be added without race conditions.
