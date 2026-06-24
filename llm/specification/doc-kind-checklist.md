---
# Vance — Document Kind `checklist`

> Specifies the **`checklist` payload** for documents that carry a flat list of actionable items with per-item status — todos, action items from meetings, review checklists, Recipes, pre-flight checks. Extends the `kind: list` family with a `status` field. Markdown round-trip uses extended GFM checkbox syntax (`- [<char>] text`).
> See also: [doc-kind-items](doc-kind-items.md) | [doc-kind-records](doc-kind-records.md) | [web-ui](web-ui.md)

---

## 1. Purpose

Use cases: personal todo list, action items from meeting notes (`extract_actions` writes a Checklist body directly), review checklists before releases, pre-flight for workflows, onboarding step tracking, bug triage. The primary use case is **LLM output** — the Worker extracts tasks from sources, stores them as a Checklist Document, and the User manages the status. Secondary: User manually creates a list and uses the editor.

**Distinction from `kind: list`:** A `list` is an ordered bullet list without status (e.g., shopping list, enumeration, bullet points). A `checklist` is an ordered list of **actionable Items with status** — open/done and other states like blocked, in_progress, waiting. Separation as its own Kind instead of an optional field on `list`:

- Editor complexity decreases: The Checklist editor **always** has a status column, the List editor **never** has one. No runtime toggle "should I show status UI?".
- Mental Model: A user creating a "Shopping List" file as `list` does not want a status feature; a user creating "Sprint TODOs" as `checklist` does. The Kind makes the intent explicit.
- Markdown round-trip: `list` writes `- text`, `checklist` writes `- [<char>] text`. Both forms are clean and do not mix.

**Distinction from Project Management:** Vance is a Think Tool, not Asana (`vision.md` §7, CLAUDE.md "What Vance is NOT"). Checklists have **no** due dates, **no** assignees, **no** cross-document aggregation ("all blocked items across all Projects"), **no** notifications. Users who want these features should export to Linear/Jira/Todoist. The `priority` field (high/low) is the only structural dimension besides `status`, because priority filtering in a 50-item list is genuinely useful and does not open a slippery slope to a PM tool.

**Design Principle — Status as a Single Character in Markdown.** Extends the GFM checkbox syntax (`- [ ]`/`- [x]`) with additional single-character markers (`[~]`, `[/]`, `[!]`, …). Convention is based on [Obsidian Tasks](https://publish.obsidian.md/tasks/Getting+Started/Statuses), but intentionally diverges in specific places (see Char-Mapping in §2.2). Advantages:

- Markdown round-trip stable: the status lives in the text, not in sidecar metadata.
- LLM-friendly: Character-for-status is common in training material.
- Single-token edit: User can change `[x]` to `[!]` without opening YAML frontmatter.

**Design Principle — Priority orthogonal to Status.** An item can be "blocked **and** important" simultaneously. Therefore, there is no shared character slot. Priority is an optional separate field:

- JSON/YAML: `priority: "high"` (or `"low"`).
- Markdown: Trailing tag `#prio:high` at the end of the line — extracted by the parser, reproduced at the end of the line when writing.

**Design Principle — Editor with Status Column, Drag-Reorder, Inline-Cycle.** The Web-UI editor is the primary affordance. Status dropdown per row, click on checkbox cycles `open → in_progress → done → open`, drag handle for reorder, aggregate header at the top (`12 items · 5 done · 2 blocked · 3 in_progress`). Raw tab for YAML/JSON/MD direct edit remains accessible (analogous to `list`).

**What this spec defines:**

- Top-Level: `items` (Array of Item objects), adopted from `doc-kind-items.md`.
- Item Schema: `text` (required), `status` (required with default `open`), `priority` (optional), `extra` (pass-through).
- Status-Char-Mapping for Markdown round-trip.
- Format Mapping: JSON, YAML, Markdown (all three fully round-trip).
- Web-UI activation: two tabs (`Checklist` / `Raw`), status dropdown, drag-reorder, aggregate header.
- Tooling: Standard `doc_*` tools; `extract_actions` as a bonus (bonus, v2).

**What it does not define:**

- Due dates, reminders, recurrence — explicitly out-of-scope (PM slippery slope).
- Assignees / Delegate-To-User. Free-form tags on the item text like `@alice` are sufficient; no user resolution.
- Cross-document aggregation ("all open items across all Checklists"). If someone needs this, it is a separate spec point (Knowledge Graph query?).
- Nested Subtasks. Flat in v1. If nesting comes, it will be `kind: tree-checklist` as a fourth Items variant (see `doc-kind-items.md` §6 and Open Points below).
- Dedicated `checklist_*` tools for granular item editing. v1 uses standard Document editing, where the LLM writes the entire body. If LLMs struggle with this, `checklist_set_status(id, status)` etc. will come in v2.

---

## 2. Data Model

### 2.1 Top-Level

Identical to `doc-kind-items.md` §2:

| Field    | Type                       | Required | Meaning                                                         |
|----------|----------------------------|----------|-----------------------------------------------------------------|
| `kind`   | `string` = `"checklist"`   | yes      | For dispatcher recognition. Header form: `$meta.kind` see §3.   |
| `items`  | `array<Item>`              | yes      | Flat sequence of items. Empty array is valid (empty checklist). |
| `extra`  | `object`                   | no       | Pass-through for unknown top-level keys, round-trip stable.     |

### 2.2 Item

| Field      | Type               | Required | Meaning                                                                                         |
|------------|--------------------|----------|-------------------------------------------------------------------------------------------------|
| `text`     | `string`           | **yes**  | Display text, single or multi-line.                                                             |
| `status`   | `string` (enum)    | no       | Default `"open"`. Allowed values see Char-Mapping below.                                        |
| `priority` | `string` (enum)    | no       | `"high"` or `"low"`. Missing = normal.                                                          |
| `extra`    | `object`           | no       | Pass-through for unknown item keys, round-trip stable.                                          |

**Status-Char-Mapping (Markdown ↔ Model):**

| MD-Char | `status`-Value   | Meaning                         | Obsidian-Tasks-Compat |
|---------|------------------|---------------------------------|-----------------------|
| ` ` (space) | `open`           | open, not yet touched           | ✓ (identical)         |
| `x`     | `done`           | completed                       | ✓ (identical)         |
| `~`     | `in_progress`    | in progress                     | ✗ (Obsidian: `/`)     |
| `/`     | `review`         | in review / waiting for feedback| ✗ (Obsidian: `/` for in_progress) |
| `!`     | `blocked`        | blocked                         | ✗ (Obsidian: `!` for important) |
| `?`     | `needs_info`     | needs clarification             | ✓ (≈ Obsidian-question)|
| `-`     | `deferred`       | deferred                        | ≈ (Obsidian: `-` for cancelled) |
| `>`     | `delegated`      | delegated                       | ≈ (Obsidian: `>` for forwarded) |
| `<`     | `waiting`        | waiting for external response   | ≈ (Obsidian: `<` for scheduled) |

Intentional divergence from Obsidian-Tasks: `[~]` for in_progress (instead of `/`), `[/]` for review, `[!]` for blocked. Reason: User convention is more clearly focused on status semantics, Obsidian mixes status and priority in the same character family. Users importing an Obsidian vault can later remap with an `obsidian_to_vance_checklist` tool — out-of-scope v1.

Uppercase letters (`X`, `~` vs. `~`, etc.) are accepted case-insensitively when reading; canonically lowercase when writing.

**Unknown Chars** (`[Z]`, `[#]`, `[*]`, …): The parser reads them as **status `open`** and stores the original character in `extra._statusChar`. When writing, `extra._statusChar` is preferred so that custom characters are preserved. No hard error class — tolerance over strictness.

### 2.3 Priority

Three levels: `high`, normal (missing), `low`. No more is needed; a 5-level Eisenhower matrix belongs in a PM tool. Markdown representation as a trailing tag:

- `- [ ] Fix bug #prio:high` → `{ text: "Fix bug", status: "open", priority: "high" }`
- `- [x] Read doc #prio:low` → `{ text: "Read doc", status: "done", priority: "low" }`

The parser accepts `#prio:high` / `#prio:low` anywhere in the line, removing them from `text`. When writing, the tag is consistently reproduced at the end of the line.

### 2.4 Validation

Permissive (analogous to `kind: calendar`):

- Items without `text` are silently dropped (an empty bullet `- ` is not an item).
- Items with `status` outside the Char-Mapping become `open` plus `extra._statusChar` (see above).
- Unknown top-level and item keys end up in `extra`.
- Multi-line `text` (see `doc-kind-items.md` §3.1 Continuation-Indent) remains allowed.

---

## 3. Format Mapping

### 3.1 Markdown (canonical)

```markdown
---
kind: checklist
---
- [ ] first task
- [x] completed task
- [~] currently in progress #prio:high
- [!] blocked — waiting for decision from Alice
- [>] delegated to Bob
- [/] PR is open, waiting for review
- [?] unclear if this is really needed
- [-] deferred to Q3
- [<] waiting for support ticket
- [ ] Low priority #prio:low
```

**Reading Rules:**

- Front-Matter parser reads `kind: checklist` from the `---`-fences (see `MarkdownHeaderStrategy`).
- For each body line starting with `- ` or `* `, an item is recognized.
- Directly after the bullet marker, an optional `[<char>]` block is parsed (with a mandatory space after it): recognizes the status character (Char-Mapping §2.2).
- Trailing tags `#prio:high` / `#prio:low` are extracted from the text part.
- Plain Bullet without checkbox (`- text`): Lenient — interpreted as `{ text, status: "open" }`. On the next save, it is rewritten as `- [ ] text` (canonical form).
- Multi-line items: Continuation-Indent (at least 2 spaces) appends to `text`, same as `kind: list` (`doc-kind-items.md` §3.1).
- Nesting through deeper indentation is **not allowed** in `kind: checklist` (analogous to `list`). If nesting comes, it will be `kind: tree-checklist`, see Open Points.

**Writing Rules:**

- Front-Matter remains unchanged.
- Per item: `- [<char>] {text}{ #prio:<level>}?`.
- `<char>` from the Status-Char-Mapping; for custom chars from `extra._statusChar`.
- Priority tag at the end of the line, separated by a space.
- Multi-line `text` with a continuation indent of 2 spaces per subsequent line.
- Status `open` is written as `[ ]` (space), not as empty `[]`.

### 3.2 JSON

```json
{
  "$meta": { "kind": "checklist" },
  "items": [
    { "text": "first task" },
    { "text": "completed task", "status": "done" },
    { "text": "currently in progress", "status": "in_progress", "priority": "high" },
    { "text": "blocked — waiting for decision from Alice", "status": "blocked" },
    { "text": "delegated to Bob", "status": "delegated" }
  ]
}
```

**Reading Rules:**

- `kind` from `$meta.kind`, legacy top-level `kind` as fallback (backward-compat).
- `items` array of objects with `text` (required), `status` (optional, default `open`), `priority` (optional), any other keys → `extra`.
- Items without `text` are silently dropped.
- `items: string[]` (compact shorthand, adopted from `doc-kind-items.md`): each string becomes `{ text, status: "open" }`.

**Writing Rules:**

- Pretty-printed, 2-space indent.
- Key order per item: `text`, `status` (only if != `open`), `priority` (only if set), `extra` in insertion order.
- Trailing newline at EOF.

### 3.3 YAML

```yaml
$meta:
  kind: checklist
items:
  - text: first task
  - text: completed task
    status: done
  - text: currently in progress
    status: in_progress
    priority: high
  - text: blocked — waiting for decision from Alice
    status: blocked
  - text: delegated to Bob
    status: delegated
```

**Reading Rules:** Symmetrical to JSON, plus `items: string[]` shorthand.

**Writing Rules:** Block-style sequences, 2-space indent, `$meta` first, `items` key order per item like JSON.

---

## 4. Web-UI

When `kind == "checklist"` and mime ∈ {md, json, yaml}, the Document Editor shows two tabs:

- **Checklist** — `ChecklistView.vue` (read-write Editor, default tab).
- **Raw** — Standard `CodeEditor` for MD/YAML/JSON direct edit.

Both editors share the Document Save pipeline (see `doc-kind-items.md` §4: no server parser, client round-trip, save via `PUT /documents/{id}`).

### 4.1 Aggregate Header

Above the item list, one line, small and unobtrusive:

```
12 items · 5 done · 2 blocked · 3 in_progress · 2 open
```

Only statuses with count > 0 are displayed, in the order `done`, `blocked`, `in_progress`, `review`, `waiting`, `needs_info`, `delegated`, `deferred`, `open`. Clicking on a counter filters the list to that status (toggle).

### 4.2 Item Row

One line per item:

- **Status Indicator** (click target): Checkbox/icon with status color. Click cycles `open → in_progress → done → open` (most frequent transition). Long-press / right-click opens status dropdown with all 9 values.
- **Text** (inline edit on click): multi-line text with `Enter` for new row, `Shift+Enter` for line break within the item.
- **Priority Badge** (optional, right next to text): `↑` for high, `↓` for low. Click toggles high → low → none → high.
- **Drag Handle** (left, on hover): for reorder via `vue-draggable-plus`.

### 4.3 Status Colors and Icons

| Status        | Icon (heroicons / custom) | Color (DaisyUI token)  |
|---------------|---------------------------|------------------------|
| `open`        | empty box                 | `base-content/40`      |
| `done`        | filled box with check     | `success`              |
| `in_progress` | half-moon / spinner icon  | `info`                 |
| `review`      | eye                       | `accent`               |
| `blocked`     | prohibition sign / `X`-circle | `error`                |
| `needs_info`  | question mark circle      | `warning`              |
| `deferred`    | pause icon                | `base-content/60`      |
| `delegated`   | user-with-arrow-right     | `secondary`            |
| `waiting`     | hourglass                 | `base-content/60`      |

Specific Heroicon names will be determined during implementation; the table is a semantic guideline, not a class cheatsheet.

### 4.4 Keyboard Shortcuts

- `Enter` on an item row → new row below with status `open`, cursor in edit mode.
- `Backspace` on an empty row → delete row, focus to previous item.
- `Esc` in edit mode → cancel.
- `Space` (while row focused, not editing) → status cycle like clicking on checkbox.
- `Cmd/Ctrl+1..9` → set status (1=open, 2=done, 3=in_progress, …). Mapping visible in the status dropdown.
- `Cmd/Ctrl+↑`/`Cmd/Ctrl+↓` → move item up/down.
- `Cmd/Ctrl-Click` → multi-select toggle.
- `Shift-Click` → range-select.

### 4.5 Inline Rendering in Chat

Fence block ` ```checklist` (or `kind: checklist` frontmatter in a `markdown`-fence) renders `ChecklistView.vue` in `inline` mode — read-only, more compact (no drag handle, no inline edit, only aggregate header + item list with status icons). Clicking on a row opens the source Document.

### 4.6 Conversion between `list` and `checklist`

When a user converts a `list` Document to `checklist` (Kind change in the properties panel):

- Each item gets `status: "open"` as default.
- MD form is canonically rewritten on the next save: `- text` → `- [ ] text`.

Conversely (`checklist` → `list`):

- The `status` field is discarded. **Warning** in the UI before conversion ("Status information will be lost, proceed?").
- MD form: `- [<char>] text` → `- text`.
- The `priority` field + `#prio:*` tags are also discarded, same warning bullet.

---

## 5. Tooling

### 5.1 Standard Document Tools

`checklist` Documents are managed with the standard tools:

- `doc_create(kind="checklist", path="checklists/<name>.md", content=…)` — create new checklist.
- `doc_read(path|id)` / `doc_edit(path|id, …)` — edit body (LLM writes MD/YAML/JSON).
- `doc_list_in_folder("checklists/")` — overview.

The LLM is trained to write Markdown checkbox syntax — `doc_create` with `content` as an MD string works without schema explanation in the prompt for standard `open`/`done` cases. For the extended status characters, a Manual `manuals/checklist-status-chars.md` is created, which is loaded by the `eddie`/`arthur` prompt via a hook when the user mentions "status", "blocked", "in progress", etc.

### 5.2 `extract_actions` (v2, planned)

Generate a checklist from a source (Document Path, Chat Range, Email Import). Parameters:

- `sourceRef` — Path, Id, or Chat Message Range.
- `outputPath` — Default `checklists/extracted-<timestamp>.md`.
- `projectId` — Default: active Project.

Returns: `{ path, itemCount, size, vanceUri, markdownLink }`.

v2 if the use case arises often enough that a dedicated tool saves prompt token budget. In v1, this is simply done with `doc_create` + LLM inference.

### 5.3 v2 — Planned, not in v1

- `checklist_set_status(path|id, itemIndex|itemText, status)` — granular without full-body rewrite.
- `checklist_add_item` / `checklist_remove_item` — analogous.
- `checklist_stats(path|id)` → `{ total, open, done, blocked, … }` — if another Worker wants to read the progress of a checklist.

---

## 6. Renderer Behavior — Edge Cases

- **Empty Checklist:** Empty state in the view (`VEmptyState` with "No items yet. Press `Enter` to start.").
- **Item with `extra._statusChar`:** Renderer shows the custom character as a small badge next to the status box; click opens standard status dropdown plus an entry "Custom: `[<char>]`".
- **Multi-line `text`:** View renders with `whitespace-pre-line`, edit mode shows `<textarea>`. Continuation indent in MD source is discarded when displayed.
- **Invalid `priority` value** (e.g., `priority: "urgent"`): treated as missing (normal); value remains in `extra` and is round-trip preserved when writing.
- **Mixed Plain-Bullets and Checkboxes** in MD when reading: Plain-Bullets are interpreted as `open`, save writes canonically with `[ ]`. **Expected behavior**, no warning.

---

## 7. Mapping to other Vance Concepts

- **Memory:** Checklist Documents are indexed in the Project RAG (default `ragEnabled: 'auto'` for md/yaml/json mime, see `doc-kind-items.md` assumption). Status and priority fields are compact enough that RAG hits for "what is blocked?" work.
- **Knowledge Graph:** Items are not nodes in v1. If someone wants "all blocked tasks as subjects of an Insight", that is a separate spec point.
- **Settings:** No special settings in v1.
- **Wizards:** v2 could offer a `wizard:checklist-new` that guides the user through "Title? Initial items? Default priority?" — not currently.
- **Recipes / Manuals:** Manual `manuals/checklist-status-chars.md` (see §5.1) explains the extended characters to the LLM. Engine Prompts remain compact; the Manual is loaded on-demand via `manual_read('checklist-status-chars')`.

---

## 8. Open Points

- **Nested Subtasks** — Planned as `kind: tree-checklist` (fourth Items variant, after `list` / `tree` / `checklist`). Four Kinds for each combination of {flat, tree} × {without status, with status} are clearer than two Kinds with optional fields. Decision pending until the first real nesting request.
- **Configurable Status-Char-Mapping?** A Tenant might argue that `[!]` for "important" (Obsidian) is more common than for "blocked". If feedback in that direction comes: Mapping can be overridden in `_vance/settings/checklist.yaml`, default remains this spec. Out-of-scope v1.
- **Aggregate across multiple Checklists** — Use case: "show me all blocked items in all Project Checklists". Requires either Mongo-side indexing of items (currently they are only in the `inlineText`-body) or a Brain-side aggregator tool that scans all Checklists. Both v2.
- **Item-IDs for stable references** — If `checklist_set_status` comes, a stable ID per item is needed (currently identified by position in the array). Suggestion: `id` field optional, codec fills missing IDs on first save (like `calendar.events.id`). Will be specified with the tool.
- **Multi-line item texts in MD round-trip** — Same open point as in `doc-kind-items.md` §7; continuation indent works, style decision pending.
