# Vancetope — Workbook Reactive Forms (Fence `form` + `saveScript`)

> Editable, typed forms over a data document plus a server-side executed
> **recompute script** on save — Vancetope's answer to "Notion with backend logic".
> Unlike Notion, calculations are performed **in the backend**, not as a client-side formula.
>
> Separation: the data document (`kind: records`) only carries **data**
> (`schema` + `items`); the **form definition** and the **recompute hook**
> (`saveScript`) reside in the block's `vance-form`-**Fence**. The same
> document renders natively as a table (RecordsView) **and** — via block — as
> a typed form.
>
> See also: [app-workbook](app-workbook.md) | [doc-kind-workpage](doc-kind-workpage.md) |
> [doc-kind-records](doc-kind-records.md) | [script-document-api](script-document-api.md) |
> [setting-forms](setting-forms.md) (shared form engine `FormFields`).
> Implementation history: [`planning/workbook-reactive-data.md`](../../planning/workbook-reactive-data.md).

---

## 1. Purpose

A WorkPage can embed a data document as an **editable form**.
The user enters data, presses **Save**, and a bound script processes
the inputs and recomputes derived files (e.g., a diagram). The
likewise embedded result files update live.

Three building blocks:

1. **Data document** (`kind: records`): only `schema` + `items`.
2. **Form Def + Recompute Script** in the `vance-form`-Fence (`form` + `saveScript`),
   the script runs synchronously, server-side, on save.
3. **Live Refresh** of embedded result documents via the
   `documents`-channel.

Design principle (from [doc-kind-application](doc-kind-application.md) §1):
**triggered, not cascading.** The trigger is the UI save action, **not**
a Document-Change-Hook. Save → exactly one terminating script run → end.

---

## 2. Data Model — Data in File, Form Def in Fence

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
| `schema` | Column names for the native RecordsView — synchronized from fence field names on save, not to be maintained manually. |
| `items` | The data records (always a list, even for `single`: then one element). |

There is **no** `$meta.form` and **no** `$meta.onSave` anymore in the document —
form def and `saveScript` are exclusively in the fence, without fallback.

**Format:** YAML/JSON (not Markdown) for the data doc.

**Values are strings** (like RecordsView): `integer`/`boolean` fields are stored
as strings; the script casts if necessary.

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
| `multi_select` | multi-selection (`choices`) |

Per field: `name` (key, = column name), `label` (i18n-Map `{ en, de, … }`),
`required`, `defaultValue`, for select types `choices: [{ value, label }]`.

---

## 4. single vs. records

The fence `form.single` is a **flag**, not a kind change — data is always in `items`:

- **`single: false`** (default): collection. Work-mode renders a **card** per `items` entry
  plus "Add record" / Remove. Iterable.
- **`single: true`**: one record. Work-mode renders **one** form;
  `items` has exactly one entry.

The same document is always a native table via `/embed` (read-only).

---

## 5. saveScript — the Recompute Script

### 5.1 Process (synchronous, v1)

The `vance-form`-Fence `saveScript` names a **`.js`** document (vance:-URI;
bare name → relative to the doc folder, `vance:/…` → project-absolute). Without
`saveScript` in the fence, only data writing happens on save — there is no
`$meta`-fallback. On save:

1. Server writes the inputs to `items`.
2. Server executes the script **synchronously in-JVM** (GraalJS), with
   `vance.documents.*` bound to `(tenant, project, user)`.
3. The script reads the fresh data and writes derived files.
4. HTTP response carries success/error. On error → **HTTP 500** with message;
   the data remains written. During execution, the form is
   client-side **soft-locked** (Save-Button disabled).
5. Written result documents fan-out via the `documents`-Live-Push →
   embedded Embeds (e.g., `out-diagram.yaml`) **refresh live**
   ([documents-channel](documents-channel.md)).

Only **JavaScript** in v1 (in-JVM). Timeout 30 s.

### 5.2 Session (Fence-Flag `session`)

By default, the script run is **sessionless** — pure data transformations
(`vance.documents.*`) do not require a session. If the fence sets `session: true`,
the server attaches a **per-form system session** to the run: deterministic
display name `_form_<docPath>` (or `_input_<docPath>`), `system=true`,
reuse-or-create (same lazy pattern as scheduler/hook sessions). Only then
are session-bound APIs (LLM calls or similar) available in the script. The flag
resides — like `saveScript` — in the **Fence**, not in the data doc.

### 5.3 What the Script Can Do

The script is a normal Cortex/Hactar-JS-run; the
[Script Document API](script-document-api.md) is available:

- **`vance.documents.{read,write,list,exists,delete,meta}`** — read/write project documents.
  This is how the script reads the form document (`items`) and writes
  derived files (diagrams, aggregates, reports).
- **`vance.settings.get…`** — read setting cascade.
- **`vance.log.*`** — logging.

Session-bound APIs (LLM calls or similar) are only available if the fence
sets `session: true` (§5.2) — otherwise, the run is sessionless.

Scope is server-side pinned to Tenant/Project; the script cannot access
foreign projects.

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
  (vance:-URI of the data doc), optional `saveScript` (recompute script),
  optional `session` (Bool, script session opt-in) and `form` (the form def:
  `single` + `fields`). Render via `VanceFormView` (`@vance/block-editor` →
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
  Field `label` may be a bare string (`label: Fach`) — coerced to `{en: …}`.
- **Work-Mode** (Default): Data entry — single = one form, records = cards
  + "Add record". Save writes `items` (+ syncs `schema` from field names)
  and executes the fence `saveScript`. No auto-save.
- **Design-Mode** (Workbook-Header-Toggle ✎/🛠): **Field Builder**
  (add/remove/move fields, name/type/label/required, Choices + `single`-Toggle +
  `session`-Checkbox); "Apply fields" writes the form def **back into the fence**
  (`updateForm` → Block attribute), the session checkbox via
  `updateSession` — **no** backend `saveSchema` anymore.

`pageMode` (`design`/`work`) applies per app instance, client-only, default `work`.

### 6.2 Picker

Slash `/form` → Picker lists app-local data documents (`records`/`list`/
`data`) **or** creates a new, empty `kind: records` document
(`schema: []` + `items: []`) via "Create" — the form def is created in the fence.

---

## 7. REST-API (Addon)

All under `/brain/{tenant}/addon/workbook/...`, data sovereignty server-side
(no client YAML).

| Endpoint | Purpose |
|---|---|
| `GET …/form?projectId=&doc=` | `{ records }` (data). The form def comes from the fence, not from here. |
| `POST …/form/save?projectId=&doc=&saveScript?=&session?=` | `{ records, schema }` → writes `items` + `schema` (field names from the fence), executes `saveScript` (Query-Param, from the fence); `session=true` attaches the per-form system session. |
| `POST …/form/create?projectId=&folder=` | `{ name, title }` → new, empty `kind: records`-Doc (`schema: []`, `items: []`). |
| `GET …/input?projectId=&doc=` | `{ content }` — **entire content** of the bound document (verbatim, no header split). |
| `POST …/input/save?projectId=&doc=&saveScript?=&session?=` | `{ content }` → writes the content verbatim, executes `saveScript` (Query-Param, from the fence); `session=true` attaches the per-input system session. |
| `POST …/input/create?projectId=&folder=&name?=` | creates `<slug>.<ext>` — typed extension (`yoyoyo.txt`) is preserved and determines the kind, default `.md` without extension, `input-<n>.md` without name; returns `{ path }`. |
| `POST …/script/run?projectId=&script=` | executes the `.js` document (`vance-button`, `type: script`). |
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
**single** server-side fence parser `WorkPageParser` → `List<Block>` (no
second parser) and dispatches each `Block` to the appropriate `BlockValidator`
via `supports(Block)` (`instanceof` on the sealed `Block` type; Spring-injected
list — **a new Block type = a new `@Component`, no central switch**).
`vance-columns` is traversed recursively. Additionally, folder-wide checks in the
`WorkbookStructureValidator` (`$meta.rebuildScripts`, `landingPage`). Reference/
existence checks run via the narrow `DocRefs` facade (data sovereignty;
unit-testable with in-memory fake).

For full validation visibility, `Block.Form`/`Block.Input` now carry the
**complete** fence (`data` + `saveScript` + `session` + `form` or `data`
+ `multiline` + `saveScript` + `session`), and `Block.Button` is new — the
`WorkPageSerializer` also writes these fields back (fixes a previous
data loss where `workpage_*`-tools discarded `saveScript`/`form` during re-serialization).

**Checked (as far as statically possible):** Fence YAML parses; mandatory keys present;
`data`/`uri`/`script`/`saveScript` are resolvable `vance:`-Refs → target
**exists** (+ matching kind, `.js` extension); `form.fields[].type` in
allowed set; no legacy `$meta.form`/`$meta.onSave` in data doc; Embed-kind
== actual kind. **Not checked:** Script runtime logic.

Findings: `{ level: error|warning, location, code, message }`. `ok` is true
if no `error`-findings. Backend: Package
`de.mhus.vance.addon.brain.workbook.validate`.

---

## 8. The `/input`-Block (single text)

Sister of the form for **a single text value**, bound to a
**text file** (instead of a `records`-doc with schema). Slash `/input`. Carries —
like the form — an optional **`saveScript`-recompute hook** (§5); just like
with the form, its config is in the **Fence**, not in the file.

- **Block:** `vance-input` with `data` (vance:-URI of the text file), `multiline`
  (Bool), optional `saveScript` (`.js`-Doc, as with the form) and optional
  `session` (Bool, script session opt-in). Round-trip:

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
  recompute config (`saveScript`) is exclusively in the fence.

- **Work-Mode:** editable field — `<input>` (single-line) or `<textarea>`
  (multiline) — with **Save/Cancel**. Save writes the content **verbatim**
  and executes the fence `saveScript` (synchronous, in-JVM, 30 s;
  with session only if `session: true` — §5.2). The multiline textarea **grows
  automatically** with content (no scrollbar).
- **Design-Mode:** Toggle **single-line / multi-line** (sets the block attribute
  `multiline`) **plus** a `saveScript`-field and a `session`-checkbox, which
  set the fence keys. The field is shown as a disabled preview.
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

## 9. The `/button`-Block (Script Action)

`vance-button` is a clickable button that executes a project script.
v1: `type: script` (only type). All config in the **Fence**:

```vance-button
type: script
title: Alles neu berechnen
script: vance:update_all.js
```

- **`script`:** `.js` document — bare name → relative to the **App folder**,
  `vance:/…` → project-absolute. **`title`:** Button label. **`type`:** v1 only
  `script`.
- **Work-Mode:** clickable button → executes the script synchronously in-JVM
  (`vance.documents.*` on tenant/project scope, 30 s Timeout). Errors inline;
  written documents refresh embedded Embeds live.
- **Design-Mode:** Inputs for `title` / `script`.

Backend: `WorkbookScriptService.run(...)` + `POST /addon/workbook/script/run`.
Distinction: `/button` = explicit "execute now" action; `/form`-`saveScript`
= script on **data save**.

---

## 10. Anti-Patterns / Limitations

- **No Document-Change-Hook.** Recompute is tied to UI save, not write —
  otherwise, cascade risk (see `doc-kind-application.md` §1, `ursahooks.md` §3).
- **Only `.js`** as saveScript in v1 (in-JVM, synchronous, 30 s Timeout;
  Session only via fence `session: true`). Python/async is a later extension.
- **Values are strings.** Cast numeric/boolean fields in the script.
- **Do not manually maintain `schema`** — it is derived from the fence `form.fields`
  on save.
- **Keep form data documents as `.yaml`** (nested `$meta` round-trips only
  in YAML/JSON, not in Markdown frontmatter). The `/input`-block, however, binds
  to a pure text file — the **entire content** is the value, no
  header split.
- **No `$meta.form` / `$meta.onSave` in the data doc** — form def and `saveScript`
  reside exclusively in the fence, without legacy fallback.
- **saveScript (and `/button`-Script) are project documents** — create with
  `doc_write`/`doc_create`, **not** `work_file_write`. The latter writes to the
  Brain-WORK-sandbox (`WorkspaceRootService`-RootDir), invisible to the Workbook;
  on an app path, it fails with "Unknown RootDir".
- **No `runOnRebuild`-collective run** in v1 (`app_rebuild` does not execute all
  form scripts) — reserved.
