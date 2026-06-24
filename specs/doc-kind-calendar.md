---
title: "Vance — Document Kind `calendar`"
parent: Specs
permalink: /specs/doc-kind-calendar
---

<!-- AUTO-GENERATED from specification/public/en/doc-kind-calendar.md — do not edit here. -->

---
# Vance — Document Kind `calendar`

> Specifies the **`calendar` payload** for documents that carry a flat list of events — meetings, deadlines, holidays, recurring activities. The renderer is a Vance-internal Vue component (`CalendarView.vue`) with **agenda** (chronological list) and **month** (grid) views. Read-only in v1; edits go through the `Raw` tab.
> See also: [doc-kind-records](/specs/doc-kind-records) | [doc-kind-diagram](/specs/doc-kind-diagram) | [web-ui](/specs/web-ui)

---

## 1. Purpose

Use cases: event extraction from emails/notes ("all deadlines from these 12 emails as a Calendar"), workshop plans, release roadmaps, vacation overviews, conference schedules, standup/sprint recurrence, onboarding training sessions. The primary use case is **LLM output** — the Worker reads a source, extracts structured events, and stores them as a Calendar document. Secondary: User imports an `.ics` via `ics_to_calendar` and uses Vance as a bookmark calendar with RAG search.

**Vance is not a Calendar backend** (see `vision.md` §7). We do not provide reminders, push notifications, free/busy calculations, or meeting invite sending. To do that, export to Google/Apple Calendar.

Distinctions:

- **records**: tabular data with a fixed schema (one row = one record, one column = one field). Events *could* be modeled as `records`, but date logic, multi-day events, and recurrence expansion do not belong in a generic table renderer. `calendar` is the focused variant.
- **gantt / plan**: tasks with dependencies, duration, resources, milestones. This belongs to project management — which is explicitly *not* Vance (`vision.md` §7). If someone needs Gantt, they export to MS Project/Linear/GitHub Projects.
- **mindmap / tree**: hierarchical structures without a timeline.
- **list**: simple enumerations without timestamps.

**Design Principle — YAML/JSON only, no Markdown.** Unlike `records`/`mindmap`/`tree`, `calendar` is not flat enough for a meaningful MD representation. Multi-day events, recurrence strings, multiple attendees, and notes with formatting break an MD table. YAML is the most LLM-friendly format for structured nested data — JSON is 1:1 dual and treated the same by the codec. MD bodies → Codec throws `KindCodecException`.

**Design Principle — Read-only in v1.** The view renders; the source tab edits. Consistent with `mindmap`, `slides`, `diagram`. Drag-to-move in the month grid is v2/v3; v1 thrives on the simplicity of "LLM writes, user reads". If the user wants to change individual events, they go to Raw and adjust YAML — the LLM helps with writing.

**Design Principle — RFC 5545 RRULE as standard.** Recurrence is stored as an RRULE string (`FREQ=WEEKLY;BYDAY=MO,WE;UNTIL=20261231T000000Z`). Not pretty, but:
- Industry standard — `.ics` import/export works without transformation.
- LLMs write RRULE without problems (frequent in training data).
- One representation, no double field (`repeat: weekly` PLUS `recurrence: RRULE`). Double fields → sync problems.

**What this spec defines:**

- Top-level: `events` (array of Event objects), `extra` (pass-through).
- Event schema: `id`, `title`, `start`, optional `end`, `allDay`, `location`, `attendees[]`, `recurrence`, `color`, `tags[]`, `notes`, `extra`.
- Format mapping: JSON + YAML (canonical), Markdown not.
- Web-UI activation: two tabs (`Calendar` / `Raw`), view switch Agenda ↔ Month.
- Renderer behavior: local timezone, RRULE expansion in the view, color palette lookup.
- Tooling: `ics_to_calendar` (import), standard `doc_*` tools for listing/read/write.

**What it does not define:**

- Custom `calendar_add_event` / `calendar_remove_event` tools. v1 uses standard document editing. If LLMs struggle with this (e.g., always rewriting the entire document instead of incrementally), a targeted tool will be added in v2.
- ICS export. If a user wants their Vance calendar in Google Calendar, this will be a separate tool in v2.
- Reminders / Notifications.
- Cross-calendar queries ("show me all events in all calendars of this project"). v1 = one document, one view. Aggregated view is v2 if needed.
- Drag-drop editing.
- Multi-calendar sub-concepts in one document. One file = one calendar. Sub-separation via `tags`.
- Full timezone magic (DST transitions, separate TZID storage). v1 stores strings as they come in, renders locally. v2 if someone truly struggles with UTC conversion.

---

## 2. Data Model

### 2.1 Top-Level

| Field    | Type                      | Required | Meaning                                                                  |
|----------|---------------------------|----------|--------------------------------------------------------------------------|
| `kind`   | `string` = `"calendar"`   | yes      | For dispatcher recognition.                                              |
| `events` | `array<Event>`            | yes      | Flat event list. Empty array is valid (empty calendar).                  |
| `extra`  | `object`                  | no       | Pass-through for unknown top-level keys, round-trip stable.              |

### 2.2 Event

| Field         | Type             | Required | Meaning                                                                                                     |
|---------------|------------------|----------|-------------------------------------------------------------------------------------------------------------|
| `id`          | `string`         | no¹      | Stable identifier (typically UUID). Codec fills missing IDs with a fresh UUID on parse.                     |
| `title`       | `string`         | **yes**  | Display title.                                                                                              |
| `start`       | `string`         | **yes**  | ISO-8601 date (`2026-06-12`) for `allDay`, otherwise date-time (`2026-06-12T09:00:00`, optional `+02:00`/`Z`). |
| `end`         | `string`         | no       | Same format as `start`. If missing, the event is a point event (zero duration).                             |
| `allDay`      | `boolean`        | no       | Default `false`. If `true`, `start`/`end` are expected as date-only fields (without time).                  |
| `location`    | `string`         | no       | Free-form (address, room, Zoom link, city).                                                                 |
| `attendees`   | `array<string>`  | no       | Free-form strings (names, emails, handles).                                                                 |
| `recurrence`  | `string`         | no       | RFC 5545 RRULE expression, e.g., `FREQ=WEEKLY;BYDAY=MO,WE;UNTIL=20261231T000000Z`.                         |
| `color`       | `string`         | no       | Palette name (`blue`/`green`/`red`/`orange`/`yellow`/`purple`/`pink`/`teal`/`gray`) or any CSS value.      |
| `tags`        | `array<string>`  | no       | Free-form tags for filtering within the calendar.                                                           |
| `notes`       | `string`         | no       | Multi-line description text.                                                                                |
| `extra`       | `object`         | no       | Pass-through for unknown event keys.                                                                        |

¹ — Required field in the sense of "must be present in the end". The codec fills automatically, so optional when writing.

### 2.3 Validation

The codec is **permissive**:
- Events without `title` or `start` are **silently dropped**. A malformed event does not kill the entire calendar.
- Unknown top-level and event keys land in `extra`.
- `start`/`end` are **not** validated as dates. The codec stores them as strings; the view parses them during rendering. Invalid date values → event is omitted in the view but remains visible in `Raw`.
- RRULE string is **not** validated. The view parses an RFC-5545 subset (FREQ/INTERVAL/BYDAY/UNTIL/COUNT); unknown tokens are ignored.

---

## 3. Format Mapping

### 3.1 JSON (canonical)

```json
{
  "$meta": { "kind": "calendar" },
  "events": [
    {
      "id": "sprint-planning-q3",
      "title": "Sprint Planning",
      "start": "2026-06-12T09:00",
      "end": "2026-06-12T11:00",
      "location": "Büro",
      "attendees": ["alice", "bob"],
      "color": "blue"
    },
    {
      "id": "standup",
      "title": "Daily Standup",
      "start": "2026-06-01T09:00",
      "end": "2026-06-01T09:15",
      "recurrence": "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
      "color": "gray"
    },
    {
      "id": "vacation-fr",
      "title": "Urlaub Frankreich",
      "start": "2026-07-15",
      "end": "2026-07-28",
      "allDay": true,
      "tags": ["private"]
    }
  ]
}
```

### 3.2 YAML (1:1 dual)

```yaml
$meta:
  kind: calendar
events:
  - id: sprint-planning-q3
    title: Sprint Planning
    start: "2026-06-12T09:00"
    end: "2026-06-12T11:00"
    location: Büro
    attendees: [alice, bob]
    color: blue
  - id: standup
    title: Daily Standup
    start: "2026-06-01T09:00"
    end: "2026-06-01T09:15"
    recurrence: FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR
    color: gray
  - id: vacation-fr
    title: Urlaub Frankreich
    start: "2026-07-15"
    end: "2026-07-28"
    allDay: true
    tags: [private]
```

YAML note: `start: 2026-07-15` (without quotes) is interpreted as `java.util.Date` by the YAML parser. The codec coerces such values to ISO strings (Midnight-UTC → date-only); for maximum control, use quotes. Date strings with `T` and without seconds (`2026-06-12T09:00`) automatically remain strings.

### 3.3 Markdown

**Not supported.** Codec throws `KindCodecException`. Rationale in §1.

---

## 4. Web-UI

For `kind == "calendar"` and mime `application/json` / `application/yaml`, the Document Editor shows two tabs:

- **Calendar** — `CalendarView.vue` in `embedded` mode (Month + Agenda switchable, default Month).
- **Raw** — Standard `CodeEditor` for YAML/JSON editing.

Inline in chat (fence block ` ```calendar`) renders `CalendarView.vue` in `inline` mode — Agenda for the next 14 days, scrollable.

### 4.1 Agenda View

List sorted chronologically, grouped by day with a day header. Per event:
- Time label (range or `all day`).
- Title.
- Optional: Location (📍), Attendees (👥), Notes, Tags.
- Colored left border (3px) according to `color`.

Embedded default range: next 30 days. Inline: next 14 days.

### 4.2 Month View

7×6 grid (always 42 cells, covers every possible month slice). Per cell:
- Day number.
- Up to 3 events compactly (time + title), with a `+N` counter above.
- Today's date visually highlighted.
- Days outside the month are dimmed.

Navigation: `‹`/`›` for previous/next month, `Today` button.

### 4.3 Inline (Chat)

Agenda-only (month grid too narrow for chat bubble width). Source comes from the fence body, interpreted via `parseCalendar(body, 'application/yaml')`.

---

## 5. Recurrence Expansion (v1 Subset)

The view parses RRULE itself (`expandEvent()` in `CalendarView.vue`). Supported RFC-5545 subset:

| Token       | Values                                               | Example                        |
|-------------|------------------------------------------------------|--------------------------------|
| `FREQ`      | `DAILY`, `WEEKLY`, `MONTHLY`, `YEARLY`               | `FREQ=WEEKLY`                  |
| `INTERVAL`  | positive integer                                     | `INTERVAL=2` (every 2 weeks)   |
| `BYDAY`     | List of `MO,TU,WE,TH,FR,SA,SU` (for `FREQ=WEEKLY`) | `BYDAY=MO,WE`                  |
| `UNTIL`     | `yyyymmdd` or `yyyymmddTHHmmssZ`                   | `UNTIL=20261231T000000Z`       |
| `COUNT`     | positive integer (alternative to UNTIL)              | `COUNT=10`                     |

**Not supported v1:** `BYMONTHDAY`, `BYMONTH`, `BYSETPOS`, `BYDAY with prefix` (`+1MO`), time component in `BYDAY` as an offset. Complex rules are parsed as far as possible; ununderstood tokens are ignored. If nothing can be parsed as a result, the event falls back to "non-recurring" and only fires on `start`.

**Hard caps:** 2,000 iterations per event, 500 output occurrences per event. Prevents a malformed `RRULE` without `UNTIL`/`COUNT` from hanging the view.

---

## 6. Tooling

### 6.1 Standard Document Tools

`calendar` documents are managed with the standard tools:

- `doc_create(kind="calendar", path="calendars/<name>.yaml", content=…)` — create a new calendar.
- `doc_read(path|id)` / `doc_edit(path|id, …)` — edit calendar body (LLM writes YAML).
- `doc_list_in_folder("calendars/")` — calendar overview.

For `doc_create(kind="calendar", …)` to treat `calendar` as a known kind
(instead of passing it through as unresolvable to the text-fallback),
the Calendar Addon registers a `CalendarKindHandler` bean
(`@Service`, implements `KindHandler.getName() == "calendar"`).
Spring's `@ComponentScan` in `CalendarAddon` picks up the bean; the
central `KindRegistry` collects it on boot. Pattern for custom
addons: see [addon-system §7b.1](/specs/addon-system#7b1-brain-side-kind-registration-via-kindhandler).

### 6.2 `ics_to_calendar` (Import)

Imports an `.ics` file (RFC 5545) into a new `kind: calendar` document.

Parameters:
- `icsBody` *(string)* — Raw ICS text. Mutually exclusive with `documentRef`.
- `documentRef` *(string)* — Path or ID of an existing Vance document with an `.ics` body.
- `title` *(string, optional)* — Calendar title, defaults to "Imported calendar".
- `outputPath` *(string, optional)* — Path for the new document. Default: `calendars/<slug>-<timestamp>.yaml`.
- `projectId` *(string, optional)* — Default: active Project.

Returns: `{ path, eventCount, size, elapsedMs, vanceUri, markdownLink }`.

Parsed fields per `VEVENT`: UID, SUMMARY, DTSTART, DTEND, LOCATION, DESCRIPTION, RRULE, ATTENDEE (with CN preference), CATEGORIES. Ignored: VTIMEZONE blocks, ATTACH, X-WR-* Extensions, ORGANIZER parameters beyond CN, ROLE/PARTSTAT.

DTSTART/DTEND values are normalized to Vance ISO format (`yyyyMMddTHHmmssZ` → `2026-12-31T23:59:59Z`, `;VALUE=DATE` → date-only string with `allDay: true`). TZID parameters are ignored in v1 (time is taken as provided).

### 6.3 v2 — Planned, not in v1

- `calendar_add_event` / `calendar_remove_event` — granular without full-body rewrite.
- `calendar_export_ics` — export calendar as `.ics`.
- `calendar_merge` — merge multiple calendars into one.

---

## 7. Renderer Behavior — Edge Cases

- **Event without `end`:** rendered as a 0-minute point at `start`; time label only shows the start.
- **All-day event spanning multiple days:** Agenda shows "Jul 15 – Jul 28 (all day)". Month grid shows the event on each day in the range (v1: duplicated, no multi-day bar).
- **Recurrence without `UNTIL`/`COUNT`:** View expands up to the visibility horizon (month + agenda range), no further.
- **Invalid `color` value:** passed through as a CSS color. Browser fallback: `currentColor`.
- **Multiple events on the same day:** Month grid shows the first 3 sorted by start time, then a `+N` counter. Agenda shows all.

---

## 8. Mapping to Other Vance Concepts

- **Memory:** Calendar documents are indexed in the Project RAG (default `ragEnabled: 'auto'` for yaml/json mime). Event summaries are compact enough that the LLM finds the hit in "when was sprint planning again?" searches.
- **Settings:** No special settings in v1.
- **Knowledge Graph:** Events are not nodes. If someone wants events as knowledge triples, they also use `kind: graph`.
- **Wizards:** v2 could offer a `wizard:` for calendar creation ("which period? which events?") — currently not.

---

## 9. Examples

### 9.1 Sprint Plan

```yaml
$meta:
  kind: calendar
events:
  - id: planning
    title: Sprint Planning
    start: "2026-06-15T09:00"
    end: "2026-06-15T11:00"
    location: Office
    color: blue
  - id: standup
    title: Daily Standup
    start: "2026-06-16T09:30"
    end: "2026-06-16T09:45"
    recurrence: FREQ=DAILY;UNTIL=20260626T000000Z
    color: gray
  - id: review
    title: Sprint Review
    start: "2026-06-26T14:00"
    end: "2026-06-26T16:00"
    color: green
  - id: retro
    title: Retrospective
    start: "2026-06-26T16:00"
    end: "2026-06-26T17:00"
    color: purple
```

### 9.2 Vacation Plan with Standup Recurrence

```yaml
$meta:
  kind: calendar
events:
  - id: standup
    title: Standup
    start: "2026-06-01T09:00"
    end: "2026-06-01T09:15"
    recurrence: FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;UNTIL=20261231T000000Z
    color: gray
  - id: urlaub-1
    title: Vacation Italy
    start: "2026-08-03"
    end: "2026-08-17"
    allDay: true
    tags: [private]
    color: orange
  - id: urlaub-2
    title: Bridge Day
    start: "2026-05-15"
    allDay: true
    tags: [private]
    color: orange
