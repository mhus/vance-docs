# Vancetope — Workbook Reactive Forms (Fence `form` + `saveScript`)

> Editable, typed forms over a data document plus a server-side executed
> **recompute script** on save — Vance's answer to "Notion with backend logic".
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
> Implementation history: [`planning/workbook-reactive-data.md`](../../planning/archive/workbook-reactive-data.md).

---

## 1. Purpose

A WorkPage can embed a data document as an **editable form**.
The user enters data, presses **Save**, and a bound script processes
the inputs and recomputes derived files (e.g., a diagram). The
likewise embedded result files update live.

Three building blocks:

1. **Data document** (`kind: records`): only `schema` + `items`.
2. **Form definition + Recompute script** in the `vance-form`-Fence (`form` + `saveScript`),
   the script runs synchronously, server-side, on Save.
3. **Live refresh** of embedded result documents via the
   `documents`-channel.

Design principle (from [doc-kind-application](doc-kind-application.md) §1):
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
| `schema` | Column names for the native RecordsView — synchronized from the Fence field names on Save, not to be maintained manually. |
| `items` | The data records (always a list, even for `single`: then one element). |

There is **no** `$meta.form` and **no** `$meta.onSave` anymore in the document —
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

The Fence-`form.single` is a **flag**, not a kind change — data is always in `items`:

- **`single: false`** (default): collection. Work-Mode renders a **card** for each `items` entry
  plus "Add record" / Remove. Iterable.
- **`single: true`**: a single record. Work-Mode renders **one** form;
  `items` has exactly one entry.

The same document is always a native table via `/embed` (read-only).

---

## 5. saveScript — the Recompute Script

### 5.1 Flow (synchronous, v1)

The `vance-form`-Fence `saveScript` names a **`.js`** document (vance:-URI;
bare name → relative to the document folder, `vance:/…` → project-absolute). Without
`saveScript` in the Fence, only data writing occurs on Save — there is no
`$meta`-fallback. On Save:

1. The server writes the inputs to `items`.
2. The server executes the script **synchronously in-JVM** (GraalJS), with
   `vance.documents.*` bound to `(tenant, project, user)`.
3. The script reads the fresh data and writes derived files.
4. The HTTP response carries success/failure. On error → **HTTP 500** with message;
   the data remains written. During the run, the form is
   client-side **soft-locked** (Save button disabled).
5. Written result documents fan out via the `documents`-Live-Push →
   embedded Embeds (e.g., `out-diagram.yaml`) **refresh live**
   ([documents-channel](documents-channel.md)).

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
[Script Document API](script-document-api.md) is available:

- **`vance.documents.{read,write,list,exists,delete,meta}`** — read/write project documents.
  This allows the script to read the form document (`items`) and write
  derived files (diagrams, aggregates, reports).
- **`vance.settings.get…`** — read setting cascade.
- **`vance.log.*`** — logging.

Session-bound APIs (LLM calls or similar) are only available if the Fence
sets `session: true` (§5.2) — otherwise, the run is sessionless.

The scope is server-side pinned to Tenant/Project; the script cannot access
other projects.

**Example `update.js`** (reads the Records, writes a diagram document):

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
and updates automatically after each Save.

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
  `updateSession` — **no** backend-`saveSchema` anymore.

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
| `POST …/form/create?projectId=&folder=` | `{ name, title }` → new, empty `kind: records`-Doc (`schema: []`, `items: []`). |
| `GET …/input?projectId=&doc=` | `{ content }` — **entire content** of the bound document (verbatim, no header split). |
| `POST …/input/save?projectId=&doc=&saveScript?=&session?=` | `{ content }` → writes the content verbatim back, executes `saveScript` (Query-Param, from the Fence); `session=true` attaches the per-input system session. |
| `POST …/input/create?projectId=&folder=&name?=` | creates `<slug>.<ext>` — typed extension (`yoyoyo.txt`) is preserved and determines the kind, without extension default `.md`, without name `input-<n>.md`; returns `{ path }`. |
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
**single** server-side Fence parser `WorkPageParser` → `List<Block>` (no
second parser) and dispatches each `Block` to the appropriate `BlockValidator`
via `supports(Block)` (`instanceof` on the sealed `Block` type; Spring-injected
list — **a new Block type = a new `@Component`, no central switch**).
`vance-columns` is traversed recursively. Additionally, folder-wide checks in the
`WorkbookStructureValidator` (`$meta.rebuildScripts`, `landingPage`). Reference/
existence checks run via the narrow `DocRefs` facade (data sovereignty;
unit-testable with in-memory fake).

For full validation visibility, `Block.Form`/`Block.Input` now carry
the **complete** Fence (`data` + `saveScript` + `session` + `form` or `data`
+ `multiline` + `saveScript` + `session`), and `Block.Button` is new — the
`WorkPageSerializer` also writes these fields back (fixes a previous
data loss where `workpage_*`-tools discarded `saveScript`/`form` during re-serialization).

**Checked (as far as statically possible):** Fence-YAML parses; mandatory keys present;
`data`/`uri`/`script`/`saveScript` are resolvable `vance:`-Refs → target
**exists** (+ matching kind, `.js` extension); `form.fields[].type` in
the allowed set; no legacy `$meta.form`/`$meta.onSave` in the data document; Embed-kind
== actual kind. **Not checked:** Script runtime logic.

Findings: `{ level: error|warning, location, code, message }`. `ok` is true
if no `error`-Findings. Backend: Package
`de.mhus.vance.addon.brain.workbook.validate`.

---

## 8. The `/input`-Block (Single Text)

A sibling of the form for **a single text value**, bound to a
**text file** (instead of a `records`-Doc with schema). Slash `/input`. Carries —
like the form — an optional **`saveScript`-Recompute-Hook** (§5); just like
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
  (verbatim). There is **no** Front-Matter header split — a text file is
  pure text, a leading `--- … ---` block is content, not a header. The
  recompute configuration (`saveScript`) is exclusively in the Fence.

- **Work-Mode:** editable field — `<input>` (single-line) or `<textarea>`
  (multiline) — with **Save/Cancel**. Save writes the content **verbatim**
  back and executes the Fence-`saveScript` (synchronous, in-JVM, 30 s;
  with session only if `session: true` — §5.2). The multiline textarea **automatically grows**
  with content (no scrollbar).
- **Design-Mode:** Toggle **single-line / multi-line** (sets the Block attribute
  `multiline`) **plus** a `saveScript` field and a `session` checkbox, which
  set the Fence keys. The field is shown as a disabled preview.
- **File (Picker):** `/input` opens a picker — choose an existing text file
  (Kind `text`/`markdown` or `text/*`-Mime) **or** create a new one
  (name optional → `<slug>.<ext>`, typed extension is preserved, without
  extension `.md`, empty → `input-<n>.md`).
- **Reactive:** if the same file is embedded elsewhere via `/embed`, it refreshes
  live after Save (documents-Push). If the `saveScript` writes additional
  files, their Embeds also refresh.

I/O runs via the host callbacks `loadInput(uri)` / `saveInput(uri, content,
saveScript, session)` (`WorkPageEditor`-Props) → `WorkbookInputService`; the input
renders the NodeView itself (no vance-face-Component). Outside a
Workbook (standalone WorkPage), the callbacks are not set → `/input` is
inactive there.

---

## 9. The `/button`-Block (Script Action)

`vance-button` is a clickable button that executes a project script.
v1: `type: script` (only type). All configuration in the **Fence**:

```vance-button
type: script
title: Recalculate All
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

- **No Document-Change-Hook.** Recompute is tied to UI Save, not Write —
  otherwise, cascade risk (see `doc-kind-application.md` §1, `ursahooks.md` §3).
- **Only `.js`** as saveScript in v1 (in-JVM, synchronous, 30 s Timeout;
  Session only via Fence-`session: true`). Python/async is a later extension.
- **Values are strings.** Cast numeric/boolean fields in the script.
- **Do not manually maintain `schema`** — it is derived from the Fence-`form.fields`
  on Save.
- **Keep form data documents as `.yaml`** (nested `$meta` round-trips only
  in YAML/JSON, not in Markdown frontmatter). The `/input`-block, however, binds
  to a pure text file — the **entire content** is the value, no
  header split.
- **No `$meta.form` / `$meta.onSave` in the data document** — form definition and `saveScript`
  reside exclusively in the Fence, without legacy fallback.
- **saveScript (and `/button`-Script) are project documents** — create with
  `doc_write`, **not** `work_file_write`. The latter writes to the
  Brain-WORK-Sandbox (`WorkspaceRootService`-RootDir), invisible to the Workbook;
  on an App path, it fails with "Unknown RootDir".
- **No `runOnRebuild`-collective run** in v1 (`app_rebuild` does not execute all
  form scripts) — reserved.
