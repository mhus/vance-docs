---
title: "Vancetope — Workbook Reactive Forms (Fence `form` + `saveScript`)"
parent: Specs
permalink: /specs/workbook-forms
---

<!-- AUTO-GENERATED from llm/specification/workbook-forms.md (translated from the German specification/public/workbook-forms.md) — do not edit here. -->

# Vancetope — Workbook Reactive Forms (Fence `form` + `saveScript`)

> Editable, typed forms over a data document plus a
> server-side executed **recompute script** on save — Vance's
> answer to "Notion with backend logic". Unlike Notion,
> **calculations are performed in the backend**, not as a client-side formula.
>
> Separation: the data document (`kind: records`) only carries **data**
> (`schema` + `items`); the **form definition** and the **recompute hook**
> (`saveScript`) reside in the `vance-form`-**Fence** of the block. The same
> document renders natively as a table (RecordsView) **and** — via block — as
> a typed form.
>
> See also: [app-workbook](/specs/app-workbook) | [doc-kind-workpage](/specs/doc-kind-workpage) |
> [doc-kind-records](/specs/doc-kind-records) | [script-document-api](/specs/script-document-api) |
> [setting-forms](/specs/setting-forms) (shared form engine `FormFields`).
> Implementation history: `planning/workbook-reactive-data.md`.

---

## 1. Purpose

A WorkPage can embed a data document as an **editable form**.
The user enters data, presses **Save**, and a bound script processes
the inputs and recalculates derived files (e.g., a diagram). The
likewise embedded result files update live.

Three building blocks:

1. **Data document** (`kind: records`): only `schema` + `items`.
2. **Form definition + Recompute script** in the `vance-form`-Fence (`form` + `saveScript`),
   the script runs synchronously, server-side, on save.
3. **Live refresh** of embedded result documents via the
   `documents`-channel.

Design principle (from [doc-kind-application](/specs/doc-kind-application) §1):
**triggered, not cascading.** The trigger is the UI save action, **not**
a Document-Change-Hook. Save → exactly one terminating script run → end.

---

## 2. Data Model — Data in File, Form Definition in Fence

The **data document** is a pure `kind: records` document: only `schema`
(column names) + `items` (data). **No** form definition, **no** script:

```yaml
$meta:
  kind: records
schema: [name, role]           # native RecordsView columns (Save syncs them)
items:
  - { name: Alice, role: admin }
  - { name: Bob,   role: user }
```

The **form definition** (fields + `single`) and the `saveScript` are
**block-specific** and reside in the `vance-form`-**Fence** (§6.1) — this allows
the same data file to be used by different forms with different fields/scripts,
and the record file remains pure data.

| Field (Data Doc) | Meaning |
|---|---|
| `$meta.kind` | `records`. |
| `schema` | Column names for the native RecordsView — synchronized from the Fence field names on save, not to be maintained manually. |
| `items` | The data records (always a list, even for `single`: then one element). |

There is **no** `$meta.form` and **no** `$meta.onSave` in the document anymore —
form definition and `saveScript` are exclusively in the Fence, without fallback.

**Format:** YAML/JSON (not Markdown) for the data document.

**Values are strings** (like RecordsView): `integer`/`boolean` fields are stored as
strings; the script casts if necessary.

---

## 3. Form Fields (`FormFieldDto`)

Shared with Setting-Forms and Wizards (`setting-forms.md`, `vance-api`
`FormFieldDto`). Supported `type` values:

| `type` | Input |
|---|---|
| `string` | single-line |
| `textarea` | multi-line (`rows`) |
| `integer` | number (`integerMin`/`integerMax`) |
| `boolean` | checkbox |
| `select` | dropdown (`choices`) |
| `multi_select` | multiple selection (`choices`) |

Per field: `name` (key, = column name), `label` (i18n-Map `{ en, de, … }`),
`required`, `defaultValue`, for select types `choices: [{ value, label }]`.

---

## 4. single vs. records

The Fence-`form.single` is a **flag**, not a kind change — data is always in
`items`:

- **`single: false`** (default): collection. Work-Mode renders a **card** for each `items` entry
  plus "Add record" / Remove. Iterable.
- **`single: true`**: a single record. Work-Mode renders **one** form;
  `items` has exactly one entry.

The same document is always a native table via `/embed` (read-only).

---

## 5. saveScript — the Recompute Script

### 5.1 Process (synchronous, v1)

The `vance-form`-Fence `saveScript` names a **`.js`** document (vance:-URI;
bare name → relative to the document folder, `vance:/…` → project-absolute). Without
`saveScript` in the Fence, only data writing occurs on save — there is no
`$meta` fallback. On save:

1. The server writes the inputs to `items`.
2. The server executes the script **synchronously in-JVM** (GraalJS), with
   `vance.documents.*` bound to `(tenant, project, user)`.
3. The script reads the fresh data and writes derived files.
4. The HTTP response carries success/failure. On error → **HTTP 500** with message;
   the data remains written. During execution, the form is
   client-side **soft-locked** (Save button disabled).
5. Written result documents fan out via the `documents`-Live-Push →
   embedded Embeds (e.g., `out-diagram.yaml`) **refresh live**
   ([documents-channel](/specs/documents-channel)).

Only **JavaScript** in v1 (in-JVM). Timeout 30 s.

### 5.2 Session (Fence-Flag `session`)

By default, the script run is **sessionless** — pure data transformations
(`vance.documents.*`) do not require a session. If the Fence sets `session: true`,
the server attaches a **per-form system session** to the run: deterministic
display name `_form_<docPath>` (or `_input_<docPath>`), `system=true`,
reuse-or-create (same lazy pattern as scheduler/hook sessions). Only then
are session-bound APIs (LLM calls or similar) available in the script. The flag resides
— like `saveScript` — in the **Fence**, not in the data document.

### 5.3 What the Script Can Do

The script is a normal Cortex/Hactar-JS-Run; the
[Script Document API](/specs/script-document-api) is available:

- **`vance.documents.{read,write,list,exists,delete,meta}`** — read/write project documents.
  This allows the script to read the form document (`items`) and write
  derived files (diagrams, aggregates, reports).
- **`vance.settings.get…`** — read setting cascade.
- **`vance.log.*`** — logging.

Session-bound APIs (LLM calls or similar) are only available if the Fence
sets `session: true` (§5.2) — otherwise, the run is sessionless.

The scope is server-side pinned to Tenant/Project; the script cannot access
external projects.

**Example `update.js`** (reads the records, writes a diagram document):

```js
const src = JSON.parse(vance.documents.read('team/people.yaml'));   // or read raw
const rows = src.items ?? [];
const counts = {};
for (const r of rows) counts[r.role] = (counts[r.role] ?? 0) + 1;

const chart = [
  '$meta:',
  '  kind: chart',
  'type: bar',
  'categories: [' + Object.keys(counts).join(', ') + ']',
  'series:',
  '  - name: Headcount',
  '    data: [' + Object.values(counts).join(', ') + ']',
].join('\n');
vance.documents.write('team/_by-role.chart.yaml', chart);
```

The `team/_by-role.chart.yaml` is embedded next to it in the WorkPage as `/embed`
and updates automatically after each save.

---

## 6. Web-UI

### 6.1 Block + Modes

- **`vance-form`-Block** (Slash `/form`): Fence keys — `data`
  (vance:-URI of the data document), optional `saveScript` (recompute script),
  optional `session` (Boolean, script session opt-in) and `form` (the form definition:
  `single` + `fields`). Renders via `VanceFormView` (`@vance/block-editor` →
  vance-face).
  ````
  ```vance-form
  data: vance:/apps/x/data/noten.records.json?kind=records
  saveScript: vance:update_all.js
  session: true
  form:
    single: false
    fields:
      - name: fach
        type: string
        label: Fach
        required: true
      - name: note
        type: integer
        label: Note
        required: true
  ```
  ````
  Field `label` can be a bare string (`label: Fach`) — coerced to `{en: …}`.
- **Work-Mode** (Default): Data entry — single = one form, records = cards
  + "Add record". Save writes `items` (+ syncs `schema` from field names)
  and executes the Fence-`saveScript`. No auto-save.
- **Design-Mode** (Workbook-Header-Toggle ✎/🛠): **Field Builder**
  (add/remove/move fields, name/type/label/required, Choices + `single`-Toggle +
  `session`-Checkbox); "Apply fields" writes the form definition **back into the Fence**
  (`updateForm` → Block attribute), the session checkbox via
  `updateSession` — **no** backend `saveSchema` anymore.

`pageMode` (`design`/`work`) applies per App instance, client-only, default `work`.

### 6.2 Picker

Slash `/form` → Picker lists app-local data documents (`records`/`list`/
`data`) **or** creates a new, empty `kind: records` document
(`schema: []` + `items: []`) via "Create" — the form definition is created in the Fence.

---

## 7. REST-API (Addon)

All under `/brain/{tenant}/addon/workbook/...`, data sovereignty server-side
(no client YAML).

| Endpoint | Purpose |
|---|---|
| `GET …/form?projectId=&doc=` | `{ records }` (data). The form definition comes from the Fence, not from here. |
| `POST …/form/save?projectId=&doc=&saveScript?=&session?=` | `{ records, schema }` → writes `items` + `schema` (field names from the Fence), executes `saveScript` (Query-Param, from the Fence); `session=true` attaches the per-form system session. |
| `POST …/form/create?projectId=&folder=` | `{ name, title }` → new, empty `kind: records` document (`schema: []`, `items: []`). |
| `GET …/input?projectId=&doc=` | `{ content }` — **entire content** of the bound document (verbatim, no header split). |
| `POST …/input/save?projectId=&doc=&saveScript?=&session?=` | `{ content }` → writes the content verbatim, executes `saveScript` (Query-Param, from the Fence); `session=true` attaches the per-input system session. |
| `POST …/input/create?projectId=&folder=&name?=` | creates `<slug>.<ext>` — typed extension (`yoyoyo.txt`) is preserved and determines the kind, default `.md` without extension, `input-<n>.md` without name; returns `{ path }`. |
| `POST …/script/run?projectId=&script=` | executes the `.js` document (`vance-button`, `type: script`). |
| `POST …/button/run?projectId=&doc=` | Body = Button-Fence (`type`, `title`, `script?`) → `{ message }` — executes the button action via the action registry (`script` / `form-resolve` / `form-reset`, §9/§9a); the server reads the page fresh from the DB. |
| `GET …/validate?projectId=&path=` | static validation of a Workbook folder **or** a single Workpage → `{ ok, errors, warnings, pagesChecked, blocksChecked, findings[] }` (§11). Read-only. |

Backend: `WorkbookFormService` + `WorkbookInputService` +
`WorkbookAppController` (`vance-addon-brain-workbook`).

---

## 11. Validation (`workbook_validate` / `GET …/validate`)

Static, **read-only** check of a Workbook folder or a Workpage —
intended as a self-check for the LLM after building (Tool `workbook_validate(path)`)
and as a basis for a future "Validate" button in the UI.

**Architecture — modular via a Validator Registry, on the canonical
Block Model:** the `WorkbookValidationService` parses each Workpage with the
**single** server-side Fence parser `WorkPageParser` → `List<Block>` (no
second parser) and dispatches each `Block` to the appropriate `BlockValidator`
via `supports(Block)` (`instanceof` on the sealed `Block` type; Spring-injected
list — **a new Block type = a new `@Component`, no central switch**).
`vance-columns` is traversed recursively. Additionally, folder-wide checks in the
`WorkbookStructureValidator` (`$meta.rebuildScripts`, `landingPage`). Reference/
existence checks run via the narrow `DocRefs` facade (data sovereignty;
unit-testable with in-memory fake).

For full validation visibility, `Block.Form`/`Block.Input` carry the
**complete** Fence (`data` + `saveScript` + `session` + `form` or `data`
or `data` + `multiline` + `saveScript` + `session`), `Block.Button` is new,
and `Block.Field` carries the complete field Fence (`id` + `type` + `question` +
`options` + `solution` + `value` + `verdict` + `feedback`) — the
`WorkPageSerializer` also writes these fields back (fixes a previous
data loss where `workpage_*` tools discarded `saveScript`/`form` during re-serialization).

**Checked (as far as statically possible):** Fence YAML parses; mandatory keys present;
`data`/`uri`/`script`/`saveScript` are resolvable `vance:`-Refs → target
**exists** (+ matching kind, `.js` extension); `form.fields[].type` in
the allowed set; no legacy `$meta.form`/`$meta.onSave` in the data document; Embed-kind
== actual kind. `vance-field`: `id` mandatory + **page-wide unique**
(Walk-Level), `type` in the allowed set, ≥2 options for closing types,
`solution`/`value` in form and option bounds, `verdict` in
{correct, wrong}. `vance-button`: `type` must correspond to a registered action;
`script`-Ref only for `type: script`. **Not checked:**
script runtime logic.

Findings: `{ level: error|warning, location, code, message }`. `ok` is true
if no `error`-Findings. Backend: Package
`de.mhus.vance.addon.brain.workbook.validate`.

---

## 8. The `/input`-Block (Single Text)

Sister of the form for **a single text value**, bound to a
**text file** (instead of a `records` document with schema). Slash `/input`. Carries —
like the form — an optional **`saveScript`-recompute hook** (§5); just like
the form, its configuration resides in the **Fence**, not in the file.

- **Block:** `vance-input` with `data` (vance:-URI of the text file), `multiline`
  (Boolean), optional `saveScript` (`.js`-Doc, as with the form) and optional
  `session` (Boolean, script session opt-in). Round-trip:

  ````
  ```vance-input
  data: vance:/notes/intro.md?kind=text
  multiline: true
  saveScript: vance:update.js
  session: true
  ```
  ````

- **Data File:** The `vance-input` value is the **entire file content**
  (verbatim). There is **no** front-matter header split — a text file is
  pure text, a leading `--- … ---` block is content, not a header. The
  recompute configuration (`saveScript`) is exclusively in the Fence.

- **Work-Mode:** editable field — `<input>` (single-line) or `<textarea>`
  (multi-line) — with **Save/Cancel**. Save writes the content **verbatim**
  and executes the Fence-`saveScript` (synchronous, in-JVM, 30 s;
  with session only if `session: true` — §5.2). The multi-line textarea **automatically grows**
  with content (no scrollbar).
- **Design-Mode:** Toggle **single-line / multi-line** (sets the block attribute
  `multiline`) **plus** a `saveScript` field and a `session` checkbox, which
  set the Fence keys. The field is shown as a disabled preview.
- **File (Picker):** `/input` opens a picker — choose an existing text file
  (Kind `text`/`markdown` or `text/*`-Mime) **or** create a new one
  (name optional → `<slug>.<ext>`, typed extension is preserved, `.md` without
  extension, empty → `input-<n>.md`).
- **Reactive:** if the same file is embedded elsewhere via `/embed`, it refreshes
  live after save (documents-Push). If the `saveScript` writes other
  files, their embeds also refresh.

I/O runs via the host callbacks `loadInput(uri)` / `saveInput(uri, content,
saveScript, session)` (`WorkPageEditor`-Props) → `WorkbookInputService`; the input
renders the NodeView itself (no vance-face-Component). Outside a
Workbook (standalone WorkPage), the callbacks are not set → `/input` is
inactive there.

---

## 9. The `/button`-Block (Server Action)

`vance-button` is a clickable button that triggers a **server-side action**.
All configuration in the **Fence**:

```vance-button
type: script              # script | form-resolve | form-reset
title: Recalculate All
script: vance:update_all.js   # only for type: script
```

- **`type`:** the action behind the button. `script` executes the `script:`-
  `.js` document (bare name → relative to the **App folder**, `vance:/…` →
  project-absolute); the built-in **Form Actions** (`form-resolve` /
  `form-reset`) evaluate the `/field`-blocks on the page (§9b) and do not
  carry a `script`.
- **Work-Mode:** clickable button → the host flushes the pending
  editor save (sequenced via the save promise chain), calls
  `POST /addon/workbook/button/run` with the Fence YAML in the body and displays
  the optional `message` from the response inline (score, confirmation). Errors
  inline on the button. The server reads the page **itself** fresh from the
  DB — never client content (no Forge surface). Written documents
  refresh embedded Embeds and the open page live (documents-Push).
- **Design-Mode:** Inputs for `type` / `title` / `script`.

### 9a. Action Registry (`ButtonActionHandler`)

Backend-SPI — **one `@Component` per `type:`**, Dispatcher
`WorkbookButtonService` injects all handlers (boot-fail on duplicate
`type:`, unknown `type:` → `ToolException`, fail-closed). New
action type = one class, no central switch. `type: script` is not a
special case, but the first handler (`ScriptButtonActionHandler` →
`WorkbookScriptService`); the existing `POST …/script/run` remains
untouched as a legacy route. The controller knows no type — it passes the
Fence YAML to the dispatcher.

### 9b. The `/field`-Block (Inline Form Field)

`vance-field` is a typed input field whose **answer is inline in the
WorkPage's Fence** — a Participant, not a separate data document, no
per-user store. Without `solution`, it is a pure form element
(checklist); with `solution`, it is server-side verifiable. Prime Use Case:
Agent-generated **exam preparation** (fill out → resolve → reset).

```vance-field
id: q1
type: choice            # choice | multi | dropdown | text | textarea
question: What belongs to 3NF?
options:                # only choice/multi/dropdown
  - No transitive dependencies
  - Each row is unique
solution: 0              # choice/dropdown: int | multi: [int] | text: reference string
value: 1                # the answer, same form as solution
verdict: wrong          # correct | wrong — written by form-resolve
feedback: …             # optional, like verdict
```

- **`id`:** stable and unique per page (Validator + page-wide
  duplicate check in the validation walk) — actions and results address
  fields via this; Block IDs are transient per mount.
- **Value form per type:** `choice`/`dropdown` → single option index,
  `multi` → index list, `text`/`textarea` → string. Values follow the
  normal auto-save path (debounced Markdown-PUT like any edit) and are
  thus visible for LLM turns in context (`workpage_query` structured).
- **`verdict`/`feedback` are action output** — the editor never writes them
  itself; `form-reset` removes both and additionally clears `value`.
- **Work-Mode:** interactive input field (radio list, checkbox list,
  dropdown, single-line, multi-line); `verdict` colors the field green/red, in
  the resolved state the client marks the correct option green (✓) and
  an incorrect choice red (✗), `feedback` appears below.
- **Design-Mode:** Inputs for `id`/`type`/`question`/`options` (one per
  line)/`solution` and — for free text — `judge.criteria`; no form builder in v1.
- **Read-only-`BlockView`:** question + answer as text with `verdict`-coloring,
  in the resolved state additionally the correct solution (✓ …); not interactive.
- **Java:** `Block.Field` first-class in the sealed `Block` hierarchy with
  the complete Fence in the record; `FieldValues` for typed payload
  accesses; `FieldBlockValidator` (id, type set, options mandatory for
  closing types, solution/value shape & bounds, verdict value set).

**Form Actions (v1):**

- **`form-resolve`:** two evaluation paths. **Closing types** with
  `solution`: mechanically via index comparison (empty answer = `wrong`).
  **Free text** (`text`/`textarea`) with `judge:`-config: evaluation via the
  internal `form-judge`-Recipe (LightLlm, Jeltz-JSON-Loop, `internal: true`,
  Tenant/Project may override via the same path) against `judge.criteria`
  plus the `solution` as a reference answer; the LLM writes `verdict` **and
  `feedback`**. Free text without `judge` is not evaluated (bare `solution` =
  human-readable reference); empty answer = `wrong` without LLM call. A
  Judge error does not abort the resolve — the field is skipped and
  reported in the message. Fields without a solution remain untouched; no write
  without verifiable fields. Return: 7 of 10 answers graded, 5 correct.
- **`form-reset`:** removes `verdict`/`feedback` **and clears the answers
  (`value`)** — a clean restart. No write without something to clear.

Later extensions (format does not break): a `group:`-key for
multiple independent forms per page; further `judge`-keys (e.g.,
strictness level) — the `judge`-map is open to arbitrary keys, unknown
ones are passed through unchanged.

---
## 10. Anti-Patterns / Limitations

- **No Document-Change-Hook.** Recompute is tied to UI save, not write —
  otherwise, cascade risk (see `doc-kind-application.md` §1, `ursahooks.md` §3).
- **Only `.js`** as saveScript in v1 (in-JVM, synchronous, 30 s Timeout;
  session only via Fence-`session: true`). Python/async is a later extension.
- **Values are strings.** Cast numeric/boolean fields in the script.
- **Do not manually maintain `schema`** — it is derived from the Fence-`form.fields`
  on save.
- **Keep form data documents as `.yaml`** (nested `$meta` round-trips only
  in YAML/JSON, not in Markdown frontmatter). The `/input`-block, however, binds
  to a pure text file — the **entire content** is the value, no
  header split.
- **No `$meta.form` / `$meta.onSave` in the data document** — form definition and `saveScript`
  reside exclusively in the Fence, without legacy fallback.
- **saveScript (and `/button`-script) are Project documents** — create with
  `doc_write`, **not** `work_file_write`. The latter writes to the
  Brain-WORK-Sandbox (`WorkspaceRootService`-RootDir), invisible to the Workbook;
  on an app path, it fails with "Unknown RootDir".
- **No `runOnRebuild`-collective run** in v1 (`app_rebuild` does not execute all
- **Inline field values (`vance-field`) are single-participant data.** Shared quiz pages or per-user answers require a separate layer (server store wins over inline), no `value`-mixing in the same Fence.
  form scripts) — reserved.
