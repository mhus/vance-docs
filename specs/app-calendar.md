---
title: "Vance — Application `app: calendar`"
parent: Specs
permalink: /specs/app-calendar
---

<!-- AUTO-GENERATED from specification/public/en/app-calendar.md — do not edit here. -->

---
# Vance — Application `app: calendar`

> Specifies the **calendar-suite application** — the first reference implementation of the `kind: application` pattern. A folder with `_app.yaml` (`$meta.app: calendar`) becomes a project planning app with one Calendar file per Lane, auto-generated Gantt, and conflict overview.
> See also: [doc-kind-application](/specs/doc-kind-application) | [doc-kind-calendar](/specs/doc-kind-calendar) | [web-ui](/specs/web-ui)

---

## 1. Purpose

Use cases:

- **Sprint / Project Plan** with Lanes for teams or phases (Design, Backend, Frontend, Ops).
- **Roadmap** across multiple quarters with Milestones spanning teams.
- **Workshop / Event Series** with separate Calendar files per track + central Gantt.
- **Collection of parallel Calendar Mirrors** (Team Vacations, Releases, Holidays) with cross-boundary conflict detection.

Distinctions from **Single-Calendar (`kind: calendar`)**:

| Question | Answer |
|---|---|
| One file or multiple? | Multiple → Calendar App. One → `kind: calendar` directly. |
| Gantt desired? | Yes → App (generated for free). No → either is sufficient. |
| Conflict detection across files? | Yes → App. No → Single Calendar. |
| Lanes / Phases / Teams? | Yes → App. No → Single Calendar. |
| Quick-capture of a single appointment? | Single Calendar (App is overkill). |

**Design Principle — Calendar remains Source, Gantt+Conflicts are derived.** The user always edits `*.yaml` Calendar files. `_gantt.md` and `_conflicts.yaml` are system output and are overwritten with every `app_rebuild`. To move Gantt bars, change the source Calendar.

**Design Principle — One file per Lane, one Lane per aspect.** Users who collect all events in one file have modeled the App incorrectly. This leads to diff noise, RAG chunks that are too large, and multi-user edits becoming a conflict hell. Lanes via subfolders provide free structuring.

---

## 2. Folder Layout

```
calendars/                    ← suite folder (path freely selectable)
├── _app.yaml                 ← manifest: kind: application, app: calendar
├── _gantt.md                 ← generated: kind: diagram (Mermaid Gantt)
├── _conflicts.yaml           ← generated: kind: records (conflict table)
├── overview.yaml             ← Calendar, lane: "default" (root file)
├── design/
│   ├── _info.yaml            ← optional, lane-local override
│   ├── mockups.yaml          ← Calendar, lane: "design"
│   └── review.yaml           ← Calendar, lane: "design"
└── backend/
    └── api.yaml              ← Calendar, lane: "backend"
```

### 2.1 Reserved Filenames

| File              | Status      | Content                                                 |
|-------------------|-------------|---------------------------------------------------------|
| `_app.yaml`       | source      | App manifest (see §3)                                   |
| `_gantt.md`       | generated   | Mermaid Gantt Document (`kind: diagram`)                |
| `_conflicts.yaml` | generated   | Conflict table (`kind: records`)                        |
| `_info.yaml`      | source      | Optional, lane-local override (see §3.4)                |

All other `.yaml` files in the folder are interpreted as `kind: calendar`.

### 2.2 Configurable Output Paths

`_app.yaml > calendar.gantt.outputPath` and `_app.yaml > calendar.conflicts.outputPath` allow overrides. Default: `_gantt.md` and `_conflicts.yaml` respectively. If you want the generated artifacts elsewhere (e.g., `exports/q3-gantt.md`), you can set this.

---

## 3. `_app.yaml` Schema

```yaml
$meta:
  kind: application
  app: calendar

title: "Sprint Q3 Planning"
description: "Design + Backend + Frontend across 3 sprints"

calendar:
  # Window — bounds for generated artifacts. Both optional.
  window:
    from:  "2026-06-01"
    until: "2026-09-30"

  # Per-lane overrides. Lane name = key, defaults to leaf folder name.
  # All fields optional; missing fields auto-default.
  lanes:
    design:
      title: "Design Phase"
      color: blue
      order: 1
    backend:
      title: "Backend"
      color: green
      order: 2
    frontend:
      title: "Frontend"
      color: purple
      order: 3

  # Gantt-Rendering Settings.
  gantt:
    outputPath: "_gantt.md"        # default
    includeRecurring: false        # default — milestones over standups
    tagFilter: []                  # empty = all non-recurring Events
    criticalTags: [milestone, critical]   # → Mermaid `:crit`
    doneTags: [done, erledigt]            # → Mermaid `:done`
    sectionOrder: [design, backend, frontend]  # explicit; rest alpha

  # Conflict-Detection Settings.
  conflicts:
    outputPath: "_conflicts.yaml"  # default
    ignoreWithinTags: [private]    # Vacation+Vacation does not conflict
    ignoreAllDayOverlapsBetweenLanes: false
```

### 3.1 Resolution Rule — Lane Resolution

```
laneFor(suiteFolder, filePath)
  = leaf folder of filePath relative to suiteFolder
  | "default" if the file lives directly in the suite root
```

Examples:

- `calendars/overview.yaml` → lane `default`
- `calendars/design/mockups.yaml` → lane `design`
- `calendars/area-a/sub-b/file.yaml` → lane `sub-b` (deepest)

Lane settings are resolved with this priority:

1. **`calendar.lanes.<lane>` in `_app.yaml`** — central definition.
2. **`<lane>/_info.yaml`** — lane-local override (for Kit reuse).
3. **Auto-Default** — title = lane name, alphabetical order.

### 3.2 Color Palette

Recognized: `blue`, `green`, `red`, `orange`, `yellow`, `purple`, `pink`, `teal`, `gray`. Anything else is passed through as a CSS color.

### 3.3 `_info.yaml` (optional)

Optional per Lane. Schema identical to the Lane definition in `_app.yaml`, without the `lanes.<name>:` wrapper:

```yaml
title: "Design Phase (Q3 Variant)"
color: blue
order: 1
description: "Visual design across all touchpoints"
```

Use case: Kits that provide a pre-configured Lane can keep their settings with the folder — the top-level manifest does not need to be adjusted.

---

## 4. Generated Artifacts

### 4.1 `_gantt.md` — Mermaid Gantt

Format: `kind: diagram` Markdown document with a `mermaid` fence. Rendered as SVG by the Web-UI renderer.

Mapping `CalendarEvent` → Mermaid Task:

| Event Property | Gantt Output |
|---|---|
| `title` | Task Name (with escape pass) |
| `start` (Date-only) | Task Start (`YYYY-MM-DD`) |
| `start`–`end` day difference | Task Duration (`Xd`) |
| `tags` contains any of `criticalTags` | Status `:crit` |
| `tags` contains any of `doneTags` | Status `:done` |
| Otherwise | No status modifier |
| Recurrence-RRULE | **Filtered out** (if `includeRecurring: false`) |

Sections = Lanes, sorted by `gantt.sectionOrder` (explicit) + alphabetically (rest).

### 4.2 `_conflicts.yaml` — Conflict Table

Format: `kind: records` with a fixed schema:

| Column           | Meaning                                          |
|------------------|--------------------------------------------------|
| `title_a`        | Title of the first conflicting event             |
| `lane_a`         | Lane of the first event                          |
| `source_a`       | Path of the first source Calendar                |
| `title_b`, `lane_b`, `source_b` | Analogous for the second event |
| `overlap_start`  | Start of overlap (ISO-DateTime)                  |
| `overlap_end`    | End of overlap (ISO-DateTime)                    |

Conflict definition: two events whose `[start, end]` range overlap. Back-to-back appointments (10-11 + 11-12) are not a conflict. Point events (`end == null`) only conflict if another event encloses the point in time.

Filters from `conflicts` config:

- **`ignoreWithinTags`**: two events that **both** carry at least one of these tags are not considered a conflict (typically `[private]` → two vacations overlap without noise).
- **`ignoreAllDayOverlapsBetweenLanes`**: two `allDay` events in **different** Lanes overlap without conflict (e.g., Design vacation vs. Backend release day).

---

## 5. Recurrence Handling

Recurring Events (`recurrence: <RRULE>`) are **not** expanded in the Gantt (default `includeRecurring: false`) — the Gantt should show Milestones, not 60 Standup bars.

For conflict detection, recurrence rules are **expanded** (otherwise a weekly colliding appointment would never appear).

Supported RRULE subset (same as [`doc-kind-calendar`](/specs/doc-kind-calendar) §5):

`FREQ=DAILY|WEEKLY|MONTHLY|YEARLY`, `INTERVAL`, `BYDAY` (WEEKLY only), `UNTIL`, `COUNT`.

Hard caps: 2,000 iterations per event, 500 output occurrences per event. This prevents an invalid endless recurrence rule from hanging the refresh pipeline.

---

## 6. Tooling

### 6.1 `app_rebuild(folder, projectId?)`

Generic — calls `CalendarsApplication.refresh()`. Writes `_gantt.md` + `_conflicts.yaml`. Returns `{artefacts: [...]}`.

**This is the 95% path.** Use whenever the user wants both artifacts updated after some edit.

### 6.2 `calendar_aggregate(folder, from?, to?, lanes?, tags?, expandRecurring?)`

Read-only Query. Returns sorted event list with `sourcePath` + `lane`. Default window: 7 days before today to 30 days after today.

Use case: "What do I have next week?", "Which Milestones in Q3?", "Which events in Lane backend?".

### 6.3 `calendar_conflicts(folder, from?, to?, projectId?)`

Thin Wrapper for `CalendarsApplication.refreshConflicts()`. Only writes `_conflicts.yaml`. Use case: targeted check after an edit, without touching the Gantt.

### 6.4 `gantt_from_calendars(folder, from?, to?, projectId?)`

Thin Wrapper for `CalendarsApplication.refreshGantt()`. Only writes `_gantt.md`. Use case: Tag filter / Section order changed, conflicts not relevant.

---

## 7. Web-UI

### 7.1 v1 — minimal

- `_app.yaml` is opened with the standard YAML code editor.
- `_gantt.md` renders with the `kind: diagram` Mermaid renderer (no new code).
- `_conflicts.yaml` renders with the `kind: records` Records view (no new code).
- No special App card, no folder headers, no refresh button.

### 7.2 v2 — planned

- **App Card** in the folder listing:
  ```
  📅 Calendar  ·  Sprint Q3 Planning            [open]
     3 lanes · 24 events · 2 conflicts
  ```
- **Refresh Button** in the card, calls `app_rebuild`.
- **Lane Editor** as a special UI for `_app.yaml > lanes:`.
- **Inline Folder Gantt** in the Doc listing (mini preview).

---

## 8. Java Layout

```
de.mhus.vance.brain.applications/
├── VanceApplication              (Interface)
├── VanceApplicationRegistry      (Spring-Bean, dispatch)
└── CalendarsApplication          (@Service, app=calendar)

de.mhus.vance.brain.tools.calendar/
├── CalendarFolderReader          (scan + parse manifest + lanes)
├── RecurrenceExpander            (RFC 5545 subset)
├── ConflictDetector              (pairwise overlap)
├── GanttRenderer                 (Mermaid-Source generation)
├── AppRebuildTool                (generic, via Registry)
├── CalendarAggregateTool         (read-only query)
├── CalendarConflictsTool         (thin wrapper → refreshConflicts)
├── GanttFromCalendarsTool        (thin wrapper → refreshGantt)
└── CalendarsAppConfig            (typed view of config.calendar)
```

Helper components (FolderReader, Expander, Detector, Renderer) are pure-function or Spring Beans without state — all individually unit-tested.

`CalendarsApplication` is the service class that wires all helpers into the refresh pipeline. It is the only place where `DocumentService.create`/`update` is written against — the tools do not write themselves.

---

## 9. Anti-Patterns

- **A single Calendar file named `_app.yaml` with all events in it.** Incorrect idea — `_app.yaml` is a manifest, not a Calendar.
- **Lane files in the root instead of a subfolder.** Works (they get Lane `default`), but misses the point of the App.
- **Manual edits to `_gantt.md` / `_conflicts.yaml`.** These will be overwritten. Edit the source Calendar + `app_rebuild`.
- **Recurring Standups as a Calendar file with permanent visibility in the Gantt.** Default is `includeRecurring: false` — good.
- **App refresh after every single change.** Costs little, but once at the end of a session is sufficient.
- **Multiple Apps nested in one folder** (e.g., Calendar App within Calendar App). Folder discovery searches for the next `_app.yaml` and stops — sub-Apps are technically not allowed.

---

## 10. Mapping to other Vance Concepts

- **Single Calendar** (`kind: calendar`, `calendar_create`): the smaller variant. Calendar App scales up when more structure is needed.
- **`ics_to_calendar` Import**: provides a single `kind: calendar` output. To set up a multi-source sync, import multiple ICS streams into separate files in the App folder.
- **`calendar_export_ics` Export**: operates on a single Calendar file. Aggregate export across the entire App would be v2.
- **Kits**: a "Sprint Planning Kit" can provide a ready-made Calendar App (manifest with default Lanes + empty `*.yaml` files). User installs Kit, fills in events, rebuilds.
- **Marvin-Worker**: a Slart-generated Recipe can produce a complete Calendar App in one run — write manifest, create Lanes, insert events, rebuild. Use case: "Create a Q3 plan with standard sprint phases".
