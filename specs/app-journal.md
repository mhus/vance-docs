---
title: "Vancetope Application — `app: journal`"
parent: Specs
permalink: /specs/app-journal
---

<!-- AUTO-GENERATED from specification/public/en/app-journal.md — do not edit here. -->

---
# Vancetope Application — `app: journal`

> Journal container via `kind: journal-entry` pages, built on the
> [doc-kind-application](/specs/doc-kind-application) foundation. One folder = one
> journal, one file = one day. Date-anchored, reflective prose — unlike
> [app-kanban](/specs/app-kanban) (workflow states) and
> [app-calendar](/specs/app-calendar) (scheduled events). Journaling is thinking;
> the daily entry is a legitimate Vancetope artifact.

## 1. Why a Journal Application

Kanban tracks workflow states, Calendar schedules events, Workbook curates
a page tree. A Journal has a different axis: **time**. One entry per
day, chronological, with mood and tags — retrospective, not planning. This
justifies a dedicated app pattern instead of a Workbook preset.

## 2. Folder Layout

```
journals/diary/                    ← Suite folder (app: journal)
├── _app.yaml                      ← Manifest (kind: application, app: journal)
├── _index.md                      ← auto-generated (kind: text, list)
├── _stats.yaml                    ← auto-generated (kind: data, Streak/Mood/Tags)
└── entries/
    └── 2026/
        ├── 2026-07-23.md          ← kind: journal-entry
        └── 2026-07-24.md
```

- **One entry = one day = one file** `entries/<YYYY>/<YYYY-MM-DD>.md`. The
  filename stem is the date; the `date` frontmatter mirrors it and is
  canonical.
- **`_`-Prefix = system-managed** (`_index.md`, `_stats.yaml`). `JournalFolderReader`
  excludes them from the entry list, ensuring rebuilds are idempotent.

## 3. Entry Schema (`kind: journal-entry`)

Markdown is primary (entries are prose); JSON/YAML are supported for tooling.
`JournalEntryCodec` (in `vance-shared` style, analogous to `CardCodec`)
owns the schema — the LLM does not invent it.

```markdown
---
kind: journal-entry
date: 2026-07-24
title: Kickoff & long round
mood: good
tags: work, ideas
---

Today I wrote the journal plan...

## Highlights
- [x] Plan finished
- [ ] Review with Mike
```

| Field | Type | Note |
|---|---|---|
| `date` | string | ISO `yyyy-MM-dd`. Falls back to the filename stem. Canonical. |
| `title` | string | Optional; Default = the long-formatted date. |
| `mood` | string | Free-form; five presets (`great`/`good`/`neutral`/`low`/`bad`) render with an icon. |
| `tags` | string list | Free. Comma-separated in Markdown; additionally mirrored to the native document tag set (for search). |
| Body | markdown | Prose. Block editor in **bodyOnly** mode edits only the body; the codec sets the frontmatter server-authoritatively (no race between fields and body). |

## 4. Derived Artifacts

### 4.1 `_index.md` (`kind: text`)
The last `indexLimit` (default 20) entries in descending date order, followed by the
year-grouped full list. Read-only; rewritten with each rebuild.

### 4.2 `_stats.yaml` (`kind: data`)
Deterministic: `totalEntries`, `firstEntry`/`lastEntry`, `currentStreak`,
`longestStreak`, `entriesThisMonth`/`entriesThisYear`, `moodDistribution`,
`tagHistogram` (Top 30).

- **`currentStreak`** counts consecutive days backward from today. A missing
  entry *today* does **not** break the streak, as long as *yesterday* has one (the day
  is still open); any earlier gap ends it.
- Streaks/periods are date-dependent → `refresh()` runs with today's date.

## 5. Manifest Schema

```yaml
$meta:
  kind: application
  app: journal
title: "Diary"
description: "..."

journal:
  entriesDir: entries          # Subfolder for entries
  indexLimit: 20               # Entries on the generated index
  moodPresets: [great, good, neutral, low, bad]
```

## 6. Search

Search is **primary navigation** for the Journal — retrieving old entries
is done by "what did I write about".

**Storage Reality:** The document body is stored (gzip-compressed above the
compression threshold) as a blob in `StorageService`, **not** as a Mongo field — a
body regex is not possible. Mongo-searchable fields are `title`, `tags`, `headers`,
and the **`summary`** field (LLM auto-summary, uncompressed; Journal entries are
mime-eligible, so `autoSummary` is on by default).

Search uses the **shared** `DocumentService.searchProjectDocumentsMeta(...)`
(no app-specific index): OR-match across `title` + `summary` + `tags`, scoped to
`entries/`, with `mood` and `tag` facets and a snippet per hit. Deeper
semantic prose search belongs in the RAG subsystem (not v1 core). Calendar navigation
and "On This Day" are read-only views without a tool.

## 7. Tools

| Tool | Purpose | Logic in |
|---|---|---|
| `journal_app_create` | Bootstrap: Manifest + initial refresh. | `JournalApplication.create(...)`. |
| `journal_entry_create` | Write/append a day. `date` defaults to today; same date **updates** (no duplicate). | `JournalService.upsertEntry(...)`. |
| `journal_search` | Free text over Title/Summary/Tags + facets. | `JournalService.search(...)` → shared DocumentService method. |
| `journal_query` | Deterministic date range list. | `JournalService.listRange(...)`. |
| `app_rebuild` | Generic — regenerates `_index.md` + `_stats.yaml`. | `JournalApplication.refresh()` via Registry. |

## 8. Web UI Editor

The Journal editor is mounted by the shared Cortex/Notepad shell via the
Kind Registry (`application:journal` → `JournalAppKind.vue`). Clicking on
`_app.yaml` opens it as a tab.

- **Left:** Monthly calendar grid; days with entries have a dot; month
  forward/backward; "Today" button. Clicking a day loads/opens the entry. Below
  are streak/count tiles from `_stats`.
- **Middle:** `WorkPageEditor` in **bodyOnly** mode for the prose of the selected day,
  with Mood dropdown + Tag field in the header. Auto-save (debounced): Body auto-save and
  Mood/Tag changes PATCH as a single `PUT /entry` (`{date, body, mood, tags}`), the
  codec merges server-authoritatively. Self-Write-Quiet-Window suppresses its own
  live echo.
- **Right:** "On This Day" — entries from the same day/month in previous years.
- **Top:** Free text search with hit list (Date + Title + Snippet); Rebuild button.
- **Live updates** via the `documents` channel (`useDocumentPrefixReaction` on the
  suite folder). Last-Writer-Wins, no CRDT.

**REST — `JournalAppController` (`/brain/{tenant}/addon/journal/...`)**, thin adapter:

| Endpoint | Purpose |
|---|---|
| `GET  /scan` | View: Title + Config + Stats + Recent |
| `GET  /month?year=&month=` | Days-with-entry mask for the calendar |
| `GET  /entry?date=` | Load entry (incl. body); 404 if none |
| `PUT  /entry` | Upsert entry (`{date, body?, title?, mood?, tags?}`) |
| `DELETE /entry?date=` | Move entry to trash |
| `GET  /on-this-day?date=` | Entries from previous years on the same day/month |
| `POST /rebuild` | Regenerate `_index.md` + `_stats.yaml` |
| `GET  /search?q=&mood=&tag=` | Free text + facets (§6) |

## 9. Delimitation from other Apps

| Use case | App | Why |
|---|---|---|
| Daily chronicle, reflection, mood | `app: journal` | Time axis, one day = one page. |
| Workflow states (todo → done) | `app: kanban` | Cards move between columns. |
| Scheduled events / milestones | `app: calendar` | Events on a timeline. |
| Curated page tree | `app: workbook` | Author manually arranges sections. |

## 10. Non-Goals (v1)

- **One entry per day.** Multiple entries/day → v2.
- **No semantic/RAG search** — v1 searches Title/Summary/Tags (§6); full-text body
  search via embeddings is a separate, cross-journal track.
- **No crypto** beyond normal document protection (Document-Lock USER suffices).
- **No guided journaling / "Prompt of the day"** (v2, possibly via Wizard).
- **No CRDT** — Last-Writer-Wins + Live-Watch.
- **No dedicated version panel** in the editor v1 (Document-Archive remains available via
  standard versioning).
