---
title: "Vancetope — Document Kind `timeline`"
parent: Specs
permalink: /specs/doc-kind-timeline
---

<!-- AUTO-GENERATED from llm/specification/doc-kind-timeline.md (translated from the German specification/public/doc-kind-timeline.md) — do not edit here. -->

# Vancetope — Document Kind `timeline`

> Periods and points in time on a **self-declared axis** — geological eras in
> millions of years, a sequence of events in minutes, project phases, a biography. With
> parallel **lanes**, **nesting** (era ⊃ period ⊃ epoch), and
> **explicitly drawn uncertainty**. Read-only in v1; YAML/JSON, no Markdown.
> Resides in the Calendar Addon (`vance-addon-brain-calendar`), but shares
> **only** codec conventions with `calendar`, not the data model.
> See also: [doc-kind-calendar](/specs/doc-kind-calendar) (Appointments),
> [doc-kind-diagram](/specs/doc-kind-diagram) (Mermaid, incl. `gantt`/`timeline`),
> [app-calendar](/specs/app-calendar), [web-ui](/specs/web-ui) §7.

---

## 1. Purpose

Use cases: geological and historical epochs, reconstruction of an event sequence
(crime scene, incident post-mortem, accident), project phases over quarters, resume,
process stages, the chronology of a narrative. The primary use case, as with
`calendar`, is **LLM output** — the Worker reads sources and stores the extracted
chronology as a Timeline Document; secondarily, the user maintains it in the Source tab.

**The fundamental difference from all existing solutions is the axis.** A calendar has
an *implicit* axis — the Gregorian calendar — and therefore cannot represent
"201.4 million years before present" (no ISO-8601 instant) nor parallel
actors at minute resolution (the monthly grid has no Y-axis). A timeline
**declares** its axis: either a pure number line with a freely chosen
unit or absolute timestamps. Both project onto the same number line;
only the labeling of the ruler differs. This is precisely why deep time
and minute reconstruction fit into *one* kind — they lie on **opposite sides**
outside the reach of a calendar.

### 1.1 Delimitations

| Choose … | If |
|---|---|
| `timeline` | Spans and moments on a declared axis. Parallel strands. Nesting. Everything outside calendar range: millions of years, "hours after alarm", BC. |
| `calendar` | Appointments a person keeps: meetings, deadlines, standups, vacation. Anything you would put on Google Calendar. |
| `diagram` (Mermaid) | A **drawing** — flowchart, sequence, state machine. Mermaid's own `timeline` type is **not** a replacement (see §1.2). |
| `records` | Tabular data without a primary time axis. |
| `tree` / `mindmap` | Hierarchy without a time axis. |

Deciding question: **Does the distance between two entries mean something?**
Yes → `timeline`. No → `diagram` or `list`.

### 1.2 Why `diagram` is not sufficient

`diagram` (Mermaid) is the obvious but insufficient excuse:

- Mermaid's `timeline` type has **no proportional axis** — entries are
  equally spaced, regardless of whether three days or thirty
  million years lie between them. This eliminates the one statement a timeline makes.
- Mermaid's `gantt` cannot handle **negative years** or any unit other than
  date/time.
- Neither supports uncertainty or nesting.
- `diagram.source` is **opaque text**. An agent cannot modify an entry individually,
  query anything, and `kind_validate` has nothing to check.

### 1.3 Vancetope does not do project management

A timeline **draws time**. No task dependencies, no resource allocation,
no progress in percent, no critical path. This adheres to the delimitation
drawn by `doc-kind-calendar.md` §1 and `vision.md` §7: if you need a Gantt chart
in that sense, export to MS Project / Linear / GitHub Projects.

Consequence in the model, intentionally so: **there is no `dependsOn`.** Causality in a
sequence of events ("because X, then Y") belongs in `notes`, not in rendered arrows — with
arrows, it would be a Gantt, and the boundary would be removed through the back door. `parent` is
**containment** (the Upper Jurassic is *within* the Jurassic), not "after".

### 1.4 Design Principles

**One axis per document.** A document that mixes `201.4` and `2026-03-04T21:40`
has no defensible order. The mode is therefore a
document declaration, against which *every* position is read. Mixing is a
modeling error, not a feature. Two subjects on different scales are
two documents.

**One entry type, not two.** Period and event differ in
exactly one field — `to` — just as a calendar event with `end` differs from one without.
Two arrays (`periods[]` + `events[]`) would be two schemas for the same thing and
two rendering paths that would drift apart.

**Nesting as a flat list plus `parent`.** As with
[Canvas Grouping](/specs/doc-kind-canvas): one update path instead of one per level, and
depth remains a matter of content rather than document structure. Nested
YAML objects would have required separate parser and write code for each level.

**Uncertainty is content, not abbreviation.** "Last seen between 21:40 and 22:05"
and "201.4 ± 0.2 Ma" are the *substance* of a reconstruction or a
geological table. A model that cannot express this forces the author
into `notes` — and the drawing then claims a hard edge where there is none.
It claims a precision that no one established. This is the one
thing that cannot be retrofitted without touching every existing document,
which is why it is in the schema from the start.

**Read-only in v1.** The view renders (with zoom/pan and detail panel), the
Source tab edits. Consistent with `mindmap`, `slides`, `calendar`.

**Positions are strings.** The codec stores them verbatim, so the file
comes back as it was typed (`201.40` remains `201.40`). They are resolved
only against the axis — see §4.

### 1.5 What this spec does not define

- Editing by drag (moving bars, pulling edges). v2.
- An app level (`app: timeline`) for multiple superimposed timelines,
  analogous to `calendar` → `app: calendar`. Will come when the need arises.
- Filtering by tags or lanes in the view.
- Granular tools (`timeline_add_entry`). v1 writes the entire body.
- Import/Export (no foreign formats; there is no standard that
  combines deep time, lanes, and uncertainty).
- Zoom synchronization between multiple timelines.

---

## 2. Data Model

### 2.1 Top-Level

| Field      | Type                      | Required | Meaning |
|------------|---------------------------|----------|---------|
| `kind`     | `string` = `"timeline"`   | yes      | Dispatcher recognition. |
| `title`    | `string`                  | no       | Heading above the ruler. The Mongo title is metadata and invisible to a reader seeing an embedded timeline — therefore the body may have its own. |
| `axis`     | `object`                  | no¹      | Axis declaration, see §2.2. |
| `lanes`    | `array` \| `object`       | no       | Lanes in rendering order, see §2.3. |
| `entries`  | `array<Entry>`            | yes      | Flat list of periods and points, see §2.4. |
| `extra`    | `object`                  | no       | Pass-through for unknown top-level keys, round-trip stable. |

¹ If `axis` is missing, a forward-running number line without a unit applies. This is a
fallback, not a recommendation — `timeline_create` explicitly requires `axis.mode` (§6).

### 2.2 Axis

| Field       | Type     | Default     | Meaning |
|-------------|----------|-------------|---------|
| `mode`      | `enum`   | `numeric`   | `numeric` = bare numbers with unit. `datetime` = ISO-8601. |
| `unit`      | `string` | –           | **Only `numeric`:** Suffix of tick labels. Free — `Ma`, `ka`, `yr BP`, `min`, `days`. Deliberately **not an Enum**: the set of units people write on a timeline is open; an Enum would make every new one a code change. |
| `direction` | `enum`   | `forward`   | **Only `numeric`:** `forward` = larger number later. `ago` = larger number **earlier**. |
| `from`      | `string` | –           | Optional left boundary of the visible window. Missing → the view fits the entries. |
| `to`        | `string` | –           | Optional right boundary. |
| `label`     | `string` | –           | Optional line below the ruler, e.g., "Millions of years before present". |
| `extra`     | `object` | –           | Pass-through. |

`mode` and `direction` are read **leniently**: an unknown value falls back to
`numeric` or `forward` respectively, instead of causing the document to fail. A typo
should render something the author can see and correct; it is named by
`kind_validate` (§5).

### 2.3 Lane

Three accepted spellings, equivalent, order = rendering order:

```yaml
lanes: [taeter, opfer, zeuge]                    # only Ids
lanes:                                            # canonical
  - id: strat
    title: Stratigraphy
    color: blue
lanes:                                            # Map, like _app.yaml of the Calendar app
  design:  { title: Design, color: blue }
  backend: { title: Backend }
```

The map form is deliberately included: it is the form that
[`app-calendar`](/specs/app-calendar) §3 uses for lanes, and a model that has
seen them reproduces them here.

| Field   | Type     | Required | Meaning |
|---------|----------|----------|---------|
| `id`    | `string` | yes      | Referenced by `entry.lane`. |
| `title` | `string` | no       | Display name; fallback is the `id`. |
| `color` | `string` | no       | Palette name or CSS color; entries in this lane without their own color inherit it. |

Lanes are **pure display order** — no Scope, no rights, nothing cascades
along a lane (same rule as for sections in
[`app-binder`](/specs/app-binder) and Session Groups).

**Declaring** a lane buys two things: its position, and a lane that
exists **while empty**. The latter is not cosmetic — "for the witness,
there is no record on this night" is a statement, and a lane derived from
entries could not make it. A lane named only by an entry still renders —
after all declared ones, in order of first appearance.

### 2.4 Entry

| Field          | Type            | Required | Meaning |
|----------------|-----------------|----------|---------|
| `id`           | `string`        | no¹      | Stable identifier. Only needed as a target for `parent`. |
| `title`        | `string`        | **yes**  | Display label. |
| `from`         | `string`        | **yes**  | Start position, read against the axis. |
| `to`           | `string`        | no       | End position. **Present = Period** (bar), **missing = Point** (marker). |
| `fromEarliest` | `string`        | no       | Earliest possible start. |
| `fromLatest`   | `string`        | no       | Latest possible start. |
| `toEarliest`   | `string`        | no       | Earliest possible end. |
| `toLatest`     | `string`        | no       | Latest possible end. |
| `lane`         | `string`        | no       | Lane ID; missing → unnamed default lane. |
| `parent`       | `string`        | no       | ID of the entry this one is nested within. |
| `color`        | `string`        | no       | Palette name or CSS color. |
| `tags`         | `array<string>` | no       | Free filter tags. |
| `notes`        | `string`        | no       | Multi-line description — the evidence, the source, the justification. |
| `extra`        | `object`        | no       | Pass-through. |

¹ Required field in the sense of "must be present in the end" — the codec fills missing
IDs during parsing with a UUID, so that `parent` references and selection in the
view have something to attach to.

**Aliases on the read side:** `at` and `start` are read as `from`, `end` and
`until` as `to`. Models constantly use these words — `at:` simply reads better
for a point — and the alternative to accepting them is an entry that
**silently disappears**. When writing, the codec normalizes to the
canonical names, so a document converges after a save.

### 2.5 Validation (Codec)

The codec is **permissive**, as with `calendar`:

- Entries without `title` or without a start position are **silently dropped**. A
  defective entry must not cost the reader the other forty.
- Unknown keys land in `extra`.
- Positions are **not** checked against the axis — the codec stores strings.
- An unknown `mode`/`direction` falls back instead of failing.

This trade-off is only defensible if something indicates what has disappeared. That
is `kind_validate` (§5) — and the view, which displays a note about unplaceable
entries (§7).

---

## 3. Format Mapping

**YAML canonical, JSON dual, Markdown not.** An axis declaration plus lanes
plus four uncertainty boundaries per entry do not survive a Markdown table — the same
reasoning as for `calendar` §3, even clearer here. MD-Body → `KindCodecException`.

### 3.1 YAML (canonical)

```yaml
$meta:
  kind: timeline
title: Mesozoic
axis:
  mode: numeric
  unit: Ma
  direction: ago
  label: Millions of years before present
lanes:
  - id: strat
    title: Stratigraphy
  - id: fauna
    title: Fauna
    color: green
entries:
  - id: trias
    title: Triassic
    from: 251.9
    to: 201.4
    lane: strat
  - id: jura
    title: Jurassic
    from: 201.4
    to: 143.1
    lane: strat
  - id: oberjura
    title: Upper Jurassic
    from: 161.5
    to: 143.1
    parent: jura
    lane: strat
  - id: tr-j
    title: Triassic-Jurassic Extinction Event
    from: 201.4
    fromEarliest: 201.6
    fromLatest: 201.2
    lane: fauna
    color: red
```

### 3.2 Numbers remain numbers

A position that is a pure number is written **unquoted**
(`from: 201.4`, not `from: '201.4'`), so that the file looks as a
human would write it. Two pitfalls behind this, both addressed in the codec:

- **Integers must not become floating-point numbers.** SnakeYAML tags a
  `BigDecimal` as a Float and emits `1969.0` for an integer — a
  handwritten `from: 5` would be rewritten on **every** save. Therefore,
  integral literals are serialized as `Long`/`BigInteger`, decimal as `BigDecimal`
  (`ScalarCoercion.numberOrString`).
- **The YAML tag resolver consumes dates.** Unquoted `1969-07-20` becomes a
  `java.util.Date`, `201.4` becomes a `Double`. Without re-coercion, the
  position would not be a string and the entry would be dropped as positionless. The
  helper `ScalarCoercion` is therefore **shared** with the Calendar codec — two
  copies would mean two interpretations for the same YAML line, depending on which kind
  reads it.

For authors, however: **quote ISO dates in YAML.** The codec handles it,
other tools do not.

---

## 4. The Axis — Projection and Semantics

`TimelineScale` (Java) and `timelinePosition()` (TypeScript) map a position to
a number, where "earlier" equals "smaller". This is the only calculation
for which this kind exists; everything else in the renderer is rectangles.

### 4.1 `mode: numeric`

The number as written. The unit lives in `axis.unit` and **never** in the value —
`from: 201.4 Ma` is unreadable and the entry will not be drawn.

`direction: ago` negates the projection: **a larger number is earlier.** To be used
for any "before..." scale (geology, archaeology, "days before incident"). The
consequence that must be understood correctly: a period then runs **from the larger
to the smaller number**.

```yaml
axis: { mode: numeric, unit: Ma, direction: ago }
entries:
  - title: Jurassic
    from: 201.4      # earlier — the LARGER number
    to: 143.1        # later
```

`from: 143.1, to: 201.4` there means that the Jurassic ends before it begins. This is
by far the most common error with this kind, and therefore a separate
validator rule with its own error message (§5).

Without `direction: ago`, the alternative would have been to write negative numbers
(`from: -201.4`). Rejected: no one writes geological eras that way, and the
tick labels would have to hide the minus again.

### 4.2 `mode: datetime`

Epoch seconds from an ISO-8601 value. Deliberately **more permissive** than `java.time`:

| Form | Example | Meaning |
|---|---|---|
| Full Instant | `2026-03-04T21:40:30+01:00` | as written |
| Without Offset | `2026-03-04T21:40` | positioned as UTC (see below) |
| Date Only | `2026-03-04` | midnight |
| Year Only | `1969` | **Beginning** of the year — `1969` sorts before `1969-07-20` |
| Negative Year | `-0044-03-15` | BC |

Year-only is not a convenience, but the normal case for a historical
timeline ("History of Printing"). Negative years are why
`gantt` fails as a replacement.

**Time zones:** a value without an offset is positioned as UTC, and the ruler
labels itself with the same numbers. A reader in another zone therefore sees
**the time the author typed**, not a shifted one. For a
reconstruction, this is the right choice: "21:40" is a statement about the
night of the crime, not an instant that needs conversion. (The `calendar` decides
this the other way around — there, an appointment *is* an instant in the reader's life.)

An impossible date (`2026-02-31`, `2026-13-01`) is **unreadable**, not
rolled. Both implementations check this explicitly, because both `LocalDateTime`
and `Date.UTC` would otherwise silently continue to March 3rd, and the entry would be
drawn a few days off.

### 4.3 Error Handling

`position()` returns `null` instead of throwing. An unreadable position means
**an entry that the renderer omits and the validator names** — never a
document that fails to open.

---

## 5. Semantic Validation (`kind_validate`)

`TimelineKindHandler.validate` is the payoff for the permissive codec. Three
classes of problems, each with a stable `code`:

| Code | Level | When |
|---|---|---|
| `timeline.mime` | error | Markdown body. |
| `timeline.parse` | error | YAML/JSON corrupted. |
| `timeline.entries-not-a-list` | error | `entries` is not a list. |
| `timeline.entry.not-an-object` | error | List element is not an object (dropped). |
| `timeline.entry.title-missing` | error | Entry without `title` (dropped) — with **Index**. |
| `timeline.entry.from-missing` | error | Entry without start position (dropped) — with index. |
| `timeline.entry.position-unreadable` | error | Position that the axis cannot read; message names the expected format of the *declared* axis. |
| `timeline.entry.reversed` | error | Period ends before it begins; on `ago` axes with the "larger number" hint. |
| `timeline.entry.uncertainty-window` | error | Window inverted or **next to** the point it qualifies. |
| `timeline.entry.end-bounds-without-end` | warning | `toEarliest`/`toLatest` without `to`. |
| `timeline.entry.parent-unknown` | warning | `parent` points to no ID — renders at level 0. |
| `timeline.entry.parent-cycle` | error | Circular `parent` chain (incl. self-parent). |
| `timeline.entry.duplicate-id` | error | ID used multiple times; once per ID. |
| `timeline.entry.lane-undeclared` | warning | Lane not in `lanes` — once per lane, and **only** if the document declares any lanes at all. |
| `timeline.axis.mode-unknown` | warning | Unknown `mode`; names the fallback. |
| `timeline.axis.direction-unknown` | warning | Unknown `direction`. |
| `timeline.axis.unit-ignored` | warning | `unit` on a `datetime` axis. |
| `timeline.axis.bounds-unreadable` | warning | `axis.from`/`axis.to` unreadable. |
| `timeline.axis.bounds-reversed` | warning | Axis window empty or inverted. |

Two decisions within this that are not obvious:

**Dropped entries are reported with an index** (`entries[7]`), not as a count. The
promoted list no longer contains them; "3 entries discarded" is not information
with which someone can repair the file. The validator therefore runs a second time
over the **raw** body (`TimelineCodec.rawBody`).

**An uncertainty window must contain the position it qualifies** — error,
not warning. A window *next to* its point is worse than no window: it
draws a statement the author did not make, and they cannot see
that it is wrong.

**Not reported** is an undeclared lane in a document that declares no
lanes at all — declaring is optional, and a validator that complains about correct
files will be ignored.

---

## 6. Tooling — `timeline_create`

Named tool instead of `doc_create_kind(kind="timeline")`, for the same reason
`calendar_create` exists: a capability not explicitly offered by the tool inventory
is replaced by something from its training data.
Without this tool, "a timeline of geological eras" reliably becomes a
Mermaid `gantt` (which cannot handle negative years) or a Markdown table.

```
timeline_create(
  title="Sequence of Events March 4/5",
  axis={ "mode": "datetime", "label": "Night of March 4 to 5" },
  lanes=[
    { "id": "opfer",   "title": "Victim" },
    { "id": "taeter",  "title": "Suspect", "color": "red" },
    { "id": "polizei", "title": "Police", "color": "blue" }
  ],
  entries=[
    { "title": "Victim last seen", "from": "2026-03-04T21:40",
      "fromLatest": "2026-03-04T22:05", "lane": "opfer",
      "notes": "Neighbor's statement, time imprecise" },
    { "title": "Fire", "from": "2026-03-04T22:10", "to": "2026-03-04T23:00",
      "toLatest": "2026-03-04T23:30", "lane": "opfer", "color": "orange" },
    { "title": "Emergency call", "from": "2026-03-04T22:31", "lane": "polizei" }
  ],
  outputPath="timelines/tathergang.yaml"
)
```

Return: `{ path, entryCount, periodCount, laneCount, size, vanceUri, markdownLink }`
(plus `replaced: true` when overwriting). Default path is
`timelines/<title-slug>-<timestamp>.yaml`.

Two hard points:

**`axis.mode` is required and not inferred.** Inference would have to guess between
"these are years" and "these are millions of years ago", and the two
differ only in the author's intent — a wrong guess draws the
timeline mirrored, without any error anywhere.

**A position unreadable for the axis is rejected by the tool, not written.**
The codec would keep the string and the renderer would omit the entry: the
model would report "written" while the reader sees a gap. A
successful call therefore means that every entry is drawn.

Editing in v1 happens via the entire body (`doc_read` → modify → `doc_edit`),
followed by `kind_validate`. Granular tools are deliberately absent — the same
v1 boundary as for `calendar`.

---

## 7. Renderer (Web-UI)

`TimelineView.vue` in the Calendar Addon, federatedly exposed as
`vance_addon_calendar/TimelineView`; registered via the
[Kind Registry](/specs/web-ui) for the Cortex tab and in
`kindRenderers/registry.ts` for the inline and embedded channels
(Fence `vance-timeline`, Icon ⏳).

Three drawing rules convey meaning:

**Bars or markers.** `to` present → bar. Missing → diamond plus label.

**Stack lanes, pack rows.** One band per lane; within it, for each
nesting depth, **greedy first-fit** packs into as few rows as
overlaps allow. An era and its epochs thus land on separate rows
(different depth, readable as indentation), two simultaneous
independent events stack (overlap). The minimum spacing is a fraction
of the **current** viewport, so that two almost simultaneous entries
get separate rows even when zoomed out, instead of overlapping their labels.

**Uncertainty faded, never hard.** The full range including fuzzy edges is
drawn faintly, the **safe core** above it in full opacity: from
`max(from, fromLatest)` to `min(to, toEarliest)`. A window wider than
the bar leaves no core — which is itself the honest picture. A point
with a window gets a faint band under the diamond.

Interaction: Wheel zooms around the cursor, dragging pans, `−`/`+`/`Fit` as buttons;
clicking an entry opens a detail panel (range, uncertainty, lane,
`parent`, notes, tags). For `datetime`, a red line marks "now" if
it is within the window. Positions are displayed in the panel and tooltip
**as they appear in the file** — no re-formatted guessing.

Range display: the window comes from `axis.from`/`axis.to` if declared,
otherwise from fitting all entries (including uncertainty margins, 4% padding).

Unplaceable entries are listed as a note above the drawing, with title and
position of the first three — the view does not remain silent about what the codec
discarded.

The renderer uses **no `useI18n()`**: a federated remote does not share the
host's i18n instance (see `FormFieldsView.vue` in the Bistromath Addon), a
key would be rendered as its own path. Labels are English literals, in
accordance with the rule "user-facing Runtime-Strings in English".

---

## 8. Template

`_vance/templates/timeline.yaml` + `timeline.tmpl.yaml`
([document-templates](/specs/document-templates)): Title, axis mode as select,
unit, "count backwards", axis label, lanes comma-separated. The
generated body contains a working period and a point depending on the mode,
as well as commented hints on uncertainty and `parent`.

`BundledTimelineTemplateTest` renders the template in all three variants
(datetime / numeric / numeric+ago), parses it with the real codec, and validates
it with the real handler. In particular, it checks that the `ago` example models
the rule it teaches — a template with an inverted period would
teach every user the wrong form.

---

## 9. Examples

### 9.1 Geological Eras (numeric, backward, nested)

See §3.1.

### 9.2 Sequence of Events (datetime, lanes, uncertainty)

```yaml
$meta:
  kind: timeline
title: Sequence of Events March 4/5
axis:
  mode: datetime
  label: Night of March 4 to 5
lanes:
  - id: opfer
    title: Victim
  - id: taeter
    title: Suspect
    color: red
  - id: zeuge
    title: Witness
  - id: polizei
    title: Police
    color: blue
entries:
  - title: Victim last seen
    from: "2026-03-04T21:40"
    fromLatest: "2026-03-04T22:05"
    lane: opfer
    notes: Neighbor's statement, time imprecise
  - title: Cell phone in North cell tower
    from: "2026-03-04T22:02"
    lane: taeter
    notes: Cell tower query
  - title: Fire
    from: "2026-03-04T22:10"
    to: "2026-03-04T23:00"
    toLatest: "2026-03-04T23:30"
    lane: opfer
    color: orange
  - title: Emergency call
    from: "2026-03-04T22:31"
    lane: polizei
  - title: Patrol car arrival
    from: "2026-03-04T22:39"
    to: "2026-03-05T02:15"
    lane: polizei
```

The `zeuge` lane remains empty — indicating that nothing is available for the witness on this
night.

### 9.3 Project Phases (datetime, no uncertainty)

```yaml
$meta:
  kind: timeline
title: Roadmap 2026
axis:
  mode: datetime
  from: "2026-01-01"
  to: "2026-12-31"
lanes: [design, backend, ops]
entries:
  - id: discovery
    title: Discovery
    from: "2026-01-06"
    to: "2026-02-27"
    lane: design
  - title: Design Review
    from: "2026-02-20"
    lane: design
    color: green
  - id: api
    title: API v1
    from: "2026-03-02"
    to: "2026-06-30"
    lane: backend
  - title: Migration
    from: "2026-05-04"
    to: "2026-06-15"
    parent: api
    lane: backend
  - title: Go-Live
    from: "2026-07-01"
    lane: ops
    color: red
```

### 9.4 Historical, Years Only

```yaml
$meta:
  kind: timeline
title: Spread of Printing
axis:
  mode: datetime
entries:
  - title: Gutenberg Bible
    from: "1455"
  - title: First printing press in Venice
    from: "1469"
  - title: Spread in Europe
    from: "1470"
    to: "1500"
    fromLatest: "1480"
```

---

## 10. Implementation

| Component | Location |
|---|---|
| Model | `TimelineDocument`, `TimelineAxis` (+ `TimelineAxisMode`/`TimelineDirection`), `TimelineLane`, `TimelineEntry` |
| Codec | `TimelineCodec` (+ shared `ScalarCoercion`) |
| Projection | `TimelineScale` |
| Kind + Validation | `TimelineKindHandler` |
| Tool | `TimelineCreateTool` (`timeline_create`) |
| Client Codec | `client/src/timelineCodec.ts` (Mirror, incl. `timelinePosition`) |
| Renderer | `client/src/TimelineView.vue` |
| Registration | `client/src/register.ts` (Kind Registry), `vite.config.ts` (Federation Expose), `vance-face/src/kindRenderers/registry.ts` (Inline/Embedded), `CreateDocumentModal.vue` (Starter Body) |
| Manual | `_vance/manuals/doc-kind-timeline.md` |
| Prompt Hook | `_vance/prompts/arthur/calendar.md` |
| Template | `_vance/templates/timeline.{yaml,tmpl.yaml}` |

All in the `vance-addon-brain-calendar` module (Java + `client/`), except for the two
host files in `vance-face`.

**Known divergence** between the two codecs: JavaScript numbers cannot
literally retain `201.40`; a client serialization loses the
trailing zero, which the Java side retains. Practically irrelevant — the kind is
read-only, edits happen via the raw editor, and saves go through the server.
