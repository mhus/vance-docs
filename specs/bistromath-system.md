---
title: "Vancetope — Bistromath (Application Runtime)"
parent: Specs
permalink: /specs/bistromath-system
---

<!-- AUTO-GENERATED from llm/specification/bistromath-system.md (translated from the German specification/public/bistromath-system.md) — do not edit here. -->

# Vancetope — Bistromath (Application Runtime)

> Status: **Iteration 3 built, verified in browser** — Hello World, the data path from the guest, the Brain REST surface `vance.rest` (§7.1b), agent access to the running app (§7.1c), five libraries (§9), and **governance** including the approval request via the Inbox (§10a). This spec defines the seam, data model, and contracts.
>
> Persona: **Bistromathic Drive** (*The Hitchhiker's Guide to the Galaxy*) — Numbers on a restaurant bill follow different mathematical laws inside the restaurant than anywhere else in the universe. This applies to a runtime where foreign code in a segregated realm follows its own rules.
>
> Bistromath is Vancetope's **application runtime in the browser**: an interpreter that reads a small program from documents — **forms, data access, scripts** — renders it in the Cortex tab, and executes the code in a sandbox that accesses server resources exclusively via an explicit host API.
>
> **The model is Microsoft BASIC, not dBase.** The difference is where the center lies: with dBase, the database is the center and the program is the glue; with BASIC, the **program** is the center and data access is one capability among several. Bistromath is the latter. Database apps are the most important case, not the only one — and what truly distinguished BASIC was not `PRINT`, but that twenty lines were enough and **nothing** had to be declared beforehand. That is the benchmark, see §1.3.
>
> In the code, it is called **`bistromath`**. The app author never types it — they write `app: custom` in their manifest.
>
> Derivation, build status, and the v2 plan: `planning/bistromath.md`.
>
> The guiding principle for the surface an app receives: **the sandbox is there to protect the UI — the app can do what the user can do.** What it *cannot* do is therefore not a question of the sandbox, but a policy decision by the operator (§10a).
>
> See also: [doc-kind-application](/specs/doc-kind-application) | [cortex](/specs/cortex) | [document-refs](/specs/document-refs) | [documents-channel](/specs/documents-channel) | [doc-kind-records](/specs/doc-kind-records) | [setting-forms](/specs/setting-forms) | [jaglan-system](/specs/jaglan-system) | [permission-system](/specs/permission-system)

---

## 1. Purpose & Scope

**Problem.** Every application in Vancetope today is a Java bean plus a Vue component, delivered as an Addon bundle: Workbook, Kanban, Calendar, Canvasbook, Links, Binder, Issues, GTD, Journal, Wiki. A new app means: PR, build, release, deploy. This makes the path from "I need an invoice book" to "I have an invoice book" so long that it is not taken — and for an agent, it is not feasible at all.

**Solution.** An application whose behavior comes **from documents**: manifest, views, scripts, and data reside as documents in the Project. Bistromath is the interpreter over them.

### 1.1 The Seam: where execution happens, and where behavior comes from

| | Executes | Behavior comes from |
|---|---|---|
| Wizard, Setting-Form, Template, [Damogran](/specs/damogran-system), [Hactar](/specs/hactar-engine) | Server | Document |
| Workbook, Kanban, Calendar, Canvasbook, Links | Browser | Compiled Bundle |
| **Bistromath** | **Browser** | **Document** |

Both axes are necessary. "Runs in the browser" alone also describes Kanban; "behavior from a document" alone also describes a Recipe. Bistromath is the only cell where both come together, and therefore it does not collide with any existing subsystem.

### 1.2 When an App Remains Compiled

The test is whether **the interaction itself is the product**. Dragging a card across three columns is the point — for that, a compiled component remains correct, because the behavior is fine-grained and unique. Everything that can be composed from forms, data access, and a few lines of code belongs in Bistromath.

The test is explicitly **not** "does it have a data model". A calculator has none, a converter has none, a dashboard over external sources has none — and all three belong here. The earlier formulation ("data model → Bistromath") was a narrowing that came from the dBase comparison; it would have excluded precisely the apps for which a runtime is most useful.

The runtime does not supersede existing apps and is not a migration target for them.

### 1.3 Simplicity is the Hard Requirement, Not a Goal

What BASIC gained was freedom from ceremony: no Project, no schema, no build — open file, type lines, runs. This runtime must be measured against that, and the first build failed it.

**Observed in the first real app** (`apps/bistromath1`): to see anything, it required an `_app.yaml` with `schemaVersion`, `views[]`, and `tables[]`, plus a `views/main.yaml` with a widget tree — two schemas and three files before anything happened. And the create form asked for a **table**, even though the app didn't need one. This is precisely the ceremony that BASIC did not have.

From this, two rules that go beyond individual features:

- **Declare nothing that can also be addressed.** A view itself states by `$meta.kind` that it is one; its handle is the filename — no `views[]` registry and no prescribed folder (§4.1). The script fetches data and places it in the state that a widget reads via `from:` — no `tables[]`, no `source:` (§3). A registry buys renameability; no one needs that for three views, and it is paid for with a declaration step that everyone needs.
- **A budget for getting started: two files.** A manifest that essentially only contains the title and landing view, plus one view. Everything beyond that must justify itself. If a new feature brings a third mandatory block into the manifest, it is the wrong feature.

This does **not** collide with the declarative surface (§13). BASIC's strength was the low entry barrier, not the imperative form; an agent must still be able to read and modify the app, and for that, a widget tree remains the correct form. What is eliminated is the bookkeeping for it.

### 1.4 What This Spec Defines

- The manifest and view schema as **document format**, and that a view is a **document kind** rather than a folder resident (§4.1).
- Folder-as-table as **storage convention** — not as a schema concept (§3).
- The sandbox boundary and the `vance.*` host API.
- The controller: lifecycle, state, storage, and conflict policy.
- The Foundation Library and its cascade.
- The three hard boundaries (§10) and the four dependencies (§11).

### 1.5 What It Does Not Define

- Widget appearance and keyboard shortcuts — this follows the [Style Guide](/specs/web-ui) §7 and the `V*` primitives.
- A visual app builder. Bistromath apps are written as documents, by humans or agents.
- Server-side execution. Those who need this use Damogran or Hactar.

---

## 2. Structure: Five Parts

```
                       Cortex Tab (App View)
  ┌──────────────────────────────────────────────────────┐
  │  ① View Renderer  ──binds──▶  ④ Controller         │
  │     V*-Widgets                    State              │
  │        │                          Storage Policy     │
  │        │ Event                    documents-Push      │
  │        ▼                             │               │
  │  ② Sandbox (QuickJS in Worker)       │ REST          │
  │     App Scripts + Foundation Lib     ▼               │
  │        │ Host Call            ③ vance.*-Host-API     │
  └────────┴──────────────────────────────┬──────────────┘
                                          │  User's JWT
                                          ▼   (never in guest)
                                        Brain
        ⑤ Module Loader: vance:-Ref ──▶ DocumentService Cascade
```

① **View Renderer** — renders the component tree of a view using `V*` primitives.
② **Sandbox** — QuickJS-WASM in a Web Worker. Executes app scripts and Foundation Library.
③ **Host API** — the only bridge out of the guest. Mirrors the names of `VanceScriptApi`.
④ **Controller** — holds state, event dispatch, storage policy, and the subscription together. The only instance that communicates with the server.
⑤ **Module Loader** — resolves `import` specifiers as `vance:` references via the document cascade. This makes the Foundation Library not an extra mechanism.

**Rejected:** a comprehensive third-party framework (amis, Formily, Budibase class). Derivation in §11.

---

## 3. Data Access: A Convention, Not a Schema Concept

**The guiding rule comes first, because everything else follows from it:**

> A widget displays **state**. A **script** writes state. A script reads documents via the **Host API**.

There is therefore **no declared table concept** — neither in the manifest nor on the widget. No `tables:`, no `source:`, no binding types. A `table` widget gets its rows like a text line gets its text: via `from: <state_key>`.

```js
// main.js
async function load() {
  const files = await vance.documents.list('invoices/');       // existing Doc REST
  const rows = [];
  for (const f of files) rows.push({ key: f.key, ...(await vance.documents.read(f.path)) });
  vance.state.set('invoices', rows);
}
```

```yaml
  - type: table
    from: invoices
    columns: [nr, kunde, betrag]
```

**Why this is simpler than my own proposal.** I briefly offered a typed binding list in the manifest (`data:` with `type: table | document | script`) — that was the same ceremony in new guise, three binding types instead of one. If the script can fetch the data anyway, *every* binding is a script binding, and the list only describes itself.

**The price, explicitly stated:** an app that displays data therefore needs a script. Only static content and embeds remain purely declarative. This is consistent — BASIC also needed a program to output something — and it replaces two mechanisms with one; but it means that the simple case requires the sandbox and cannot bypass it. The first build could display a table without a line of JavaScript; that is no longer possible afterwards.

**What remains is the storage convention.** It is good and does not change — it is just not something a manifest declares:

### 3.0 Folder-as-Table

A table is a **folder**, a row is a **document**, the filename is the **primary key**, the file content is the **value**.

```
data/invoices/2026-0001.yaml     ← one row
data/invoices/2026-0002.yaml
```

This is the deliberate counter-design to "one document = one table" and gains five properties that are missing there:

| Property | Folder-as-Table |
|---|---|
| Writing | one row, not the file |
| Concurrency | two users on different rows touch different documents — no merge |
| Primary Key | `GET /documents/by-path` is the lookup, indexed on `(tenant, project, path)` |
| Live | `documents.changed` pushes **per row** |
| History | `archives` provides version history **per record**, `lockedFor` applies per record |

### 3.0a Kind Documents Are Read as Structure

`records`, `sheet`, `list`, and `tree` store their body in their **own** grammar, not in YAML. `vance.documents.read` still provides the structure to the program: the **Host** decodes by kind before decoding by MIME type.

This is the same statement that already applied to the MIME type — "the host parses because it knows" — just one step further. Without it, a program would receive a `kind: records` as a wall of CSV-light text and would have to rebuild the grammar in JavaScript; with it, the statement that truly matters applies: **an app edits the documents that everything else also edits.** The built-in Records editor opens the same file, `records_add_row` appends to it, an `embed` displays it — and the program reads and writes it. No copy, no export, no second format.

The codecs for this have moved from `vance-face/src/kindViews/` to `@vance/shared` (`kindCodecs/`). It is the same move as `FormFields.vue` in §5.2 and for the same reason: a federated Addon bundle cannot import from the host. **Only the four data kinds** — `chart`, `diagram`, `map`, `slides`, `workflow` remain in the host: this is presentation, a program has little reason to write one, and `embed` displays them anyway.

Three boundaries, all explicitly stated: **values are strings** in these formats (a `sheet` cell holds text, the program converts); **`create` has no codec path**, because a kind is in the document header and there is no document yet (write the body once as a string, then everything goes through the codec); and a body that does **not** match the asserted kind falls back to the MIME path instead of failing the read — a hand-edited document is a real state, and the useful response is the raw text that the author can view.

### 3.1 What It Costs

- **No secondary index.** "All invoices with `status: open`" is a folder scan. `documents/search` is text search, not a field predicate.
- **No bulk JSON read.** `documents/folder` provides summaries (paginated, default 50), not content. The bulk read is `POST /documents/export` with `folders: [...]` — one request, archive stream, contents inside. Client unpacks (§11).
- **No transaction across rows.** Remains true and unfixable.
- **The key is a path segment.** Character set convention must be defined before the first key contains a `/`.
- **Filename sorting is not the business sorting.**

This leads to the pattern: **folder-as-table for identity and write path, in-memory store for queries.** The N-costs are incurred once on opening, not per query.

### 3.2 External Tables

A [Jaglan](/specs/jaglan-system) mount under `_ext/<mount>/…` is a table located elsewhere. Read-only, otherwise identical — same Doc endpoints, same row semantics. Bistromath needs no special code for this.

---

## 4. Manifest

```yaml
# invoices/_app.yaml
$meta:
  kind: application
  app: custom
title: Invoice Book
custom:
  landing: list
```

That's all — and there are **no prescribed folders**. A view is a view because its header says so:

```
apps/hello/
  _app.yaml
  main.yaml        ← $meta.kind: view   → View, Handle "main"
  main.js          ← Program
```

No `views/`, no `scripts/`, no `data/`. The **handle is the filename** without extension; `landing` names the view the app opens with, and if missing, the first alphabetically wins. Data folders are invented by the author wherever they want — the script names the path (§3).

Thus, the manifest is almost empty, and that is the intention (§1.3): it only carries what cannot be inferred from the folder structure. `schemaVersion` is omitted as long as there is nothing to version — a key that is always `1` is a ritual.

### 4.1 Why No Folder Schema, But a Kind

The first draft prescribed `views/`, `scripts/`, and `data/`, arguing: the folder is the discriminator, otherwise the runtime would have to guess whether `main.yaml` is a view or data.

**The argument does not hold.** It only applies as long as one refuses to look at the document header. Every document in Vancetope states what it is itself — `$meta.kind` —, and the entire rest of the system builds on that: `kind: workpage`, `kind: canvas`, `kind: records`. Distinguishing by folder would be the only foreign body in the tree here.

A kind is also a declaration, but in the right place: **in the document, not above the document**. This eliminates both things against which §1.3 is written — the registry in the manifest *and* the prescribed storage location.

Three gains that a folder convention does not have:

- **Self-describing.** A file alone, without context, is recognizably a Bistromath view. A YAML in `views/` would only be so relative to its folder.
- **Cortex gets an editor.** A registered kind can have a renderer ([addon-system](/specs/addon-system) §7b) — a view would then not be raw YAML in the CodeEditor, but a surface with widget selection. This is the greater gain and was unattainable with folders.
- **Validation finds a target.** `kind_validate` acts on kinds; a `view` kind can get its validator, instead of only `refresh()` checking the views (§14, decision 6).

The price is real: a new document kind means `KindHandler` on the server and optionally a client renderer — more work than a folder name. However, it is the kind of work the system already knows, and it pays back in editor and validation.

**What remains of convention: exactly one.** The program is `main.js` in the app folder, and `init:` in the manifest overrides it. `_app.yaml` itself is not my specification, but that of the Applications system (`VanceApplication.APP_MANIFEST`).

**Before, and why it's gone:** the first build had `views[]`, `tables[]`, and `scripts[]` as registries. They bought renameability and field order; paid for with three declaration blocks, a create form asking for a table the app doesn't need, and a name mediating between view and folder without explaining anything. Column order, the only real loss, moves to the widget (`columns:`) — where it is read.

- `app: custom` is the discriminator by which the kind registry resolves `application:custom` (see [doc-kind-application](/specs/doc-kind-application) §7.1). It is descriptive, not the codename — otherwise "bistromath" would leak into every manifest in the inventory.
- The block is therefore also called **`custom`**, not `bistromath`: it is conventionally keyed by the app name (`links`, `workbook`, `calendar`). A different key would be the only one in the tree.
- **It sits top-level, not under `config:`.** `ApplicationDocument.config` is a *logical* grouping: `ApplicationCodec` lifts every top-level map there on read and writes it flat again on serialization. A literal `config:` in the document would be read as a block *named* "config", `config().get("custom")` would be `null` — a manifest that is silently empty. Nailed down in `BistromathConfigTest.manifest_roundTripsThroughTheCodecWithTheBlockAtTopLevel`, and the test deliberately goes through the codec, because a hand-built `ApplicationDocument` cannot test exactly that.
- **The view handle is the filename without extension** and thus also the target handle for [Inter-Links](/specs/inter-links): `vance:/invoices/_app.yaml?entry=list` opens `list.yaml`. `targets(NAVIGATE)` reads the view kinds in the app folder instead of a registry. Because the handle ends up in a URL and in an `AppTarget` (the latter forbids `|`), the filename must be a slug — a file that is not one will be **skipped and reported** when listed, not silently becoming an unaddressable view.
- **The entry handle can have two parts: `<view>` or `<view>/<rowKey>`.** A detail form must be able to say *which* row it displays, otherwise a deep link to an invoice opens the register. The app owns the meaning of the handle — that is precisely the contract of `useAppEntry`.
- **Paths are where they are used** — in the handler (`main.js:save`), in the embed (`ref:`), in the program (`vance.documents.list('invoices/')`) — and are [`vance:` references](/specs/document-refs), resolved relative to the app folder. A widget carries **no** path: it names a state key (§3). Cross-project (`//project/path`) resolves, but is **rejected**: reading an external document requires its Project `READ`, i.e., a second authorization per document instead of one per app. Until that exists, a named rejection is better than a partially rendered view.

---

## 5. View Schema

A view is a **component tree**. The existing form engine is **a leaf** within it, not a framework.

```yaml
# list.yaml
type: page
title: Invoices
children:
  - type: toolbar
    children:
      - type: button
        label: { de: Neu, en: New }
        on: { click: "main.js:createInvoice" }
      - type: button
        label: { de: CSV }
        on: { click: "main.js:exportCsv" }
  - type: table
    from: invoices              # state key that init() has populated
    columns: [nr, kunde, betrag, status]
    on: { rowClick: "main.js:openInvoice" }
```

```yaml
# edit.yaml
type: page
children:
  - type: form
    from: current                 # a state object, not a folder
    fields:                       # ← unchanged FormFieldDto list
      - name: kunde
        type: string
        label: { de: Kunde }
        required: true
      - name: betrag
        type: integer
        label: { de: Betrag }
      - name: mahnstufe
        type: integer
        label: { de: Mahnstufe }
        visibleIf: "state.current.status === 'overdue'"
  - type: toolbar
    children:
      - type: button
        label: { de: Speichern }
        on: { click: "main.js:save" }
```

### 5.1 Widget Inventory

**Built:** `page` · `toolbar` · `row` · `column` · `card` · `button` · `text` · `markdown` · `html` · `table` · `input` · `number` · `toggle` · `select` · `form` · `details` · `badge` · `alert` · `code` · `pagination` · `file` · `tabs` · `repeat` · `embed` · `dialog`

**Reserved, not yet rendered:** `chart`

**`embed` has the greatest leverage per line and replaces two planned widgets.** It passes a path to the host-injected `vance:embed-component` — the same seam used by Canvas, Binder, GTD, and Wiki — and that routes to the document's kind. This allows an app to display a mind map, calendar, image, PDF, or canvas without the runtime knowing any of them. `chart` and `image` as separate widgets are therefore **removed instead of planned**: a chart document already has a renderer, and duplicating it here would mean this Addon delivers a charting library. The author writes the path in the **same** grammar as everywhere in an app (app-relative, leading slash = project root); the `vance:` URI is built by the renderer.

**`repeat`** renders its children for each element of a bound list. Within it, `from:` queries **the element first** and falls back to the surrounding state — two levels, no path syntax. Deeper would be the beginning of an expression language, and there is already exactly one of those in the browser.

**`dialog`** is a widget with `show:`, not a separate action type. The first draft had `dialog:<handle>` as a handler form plus `vance.ui.closeDialog()`; with `show:`, both are eliminated — the program opens with `vance.state.set(key, true)` and closes with `false`, the ✕ writes the same key back. One rule instead of three, and the dialog is where it is used. `show:` is **mandatory** for it: without the key, there would be no way to close it.

Each built widget maps to an existing `V*` primitive; `markdown` goes through `marked` + `dompurify` in the Addon (the pattern of canvas, centauri, and journal — `@vance/components` has no Markdown component). **Zero DaisyUI classes outside `src/components/`** — the rule from [web-ui](/specs/web-ui) §7 applies unchanged and weighs more heavily here than usual: a generic renderer is precisely where a document-defined app would start to look like its author's whim.

An unknown widget and a *reserved* one deliberately receive **different** error messages. "Unknown widget: if" sends an author looking for typos.

**The four direct inputs** (`input`/`number`/`toggle`/`select`) are **next to** `form`, not within it — and they write **native types**: a number remains a number, a toggle a boolean. The difference is not convenience, but the goal: the values of a `form` are on their way to a **document** and must round-trip, so they are encoded (§5.2); these are on their way to the **state**, where the program decides. No round-trip, so nothing to encode — and `formModel.ts` remains out of scope.

Why next to and not as an extension of `FormFieldDto`: **four** other consumers (Wizards, Setting-Forms, Document-Templates, Kit-Tool-Templates) are attached to that model, none of whom want a widget field for this runtime. A model serving five masters becomes worse for each. Conversely, `form` remains precisely the path for the case it can handle: an **existing** field list, from a Kit or a Setting-Form.

**`options`** takes a bare value (which is then also the label) or `{value, label}`. Explicitly **not** `"paid|Paid"`: a separator in the value means every author has to learn an escaping rule, and YAML can already write two things. An emptied `number` writes `null`, not `0` — zero is a number someone might have typed intentionally, and therefore cannot simultaneously mean "empty".

**Two of the six passed through are not pass-throughs**, and that is the part that required a decision. `pagination` is bound to an **object** (`{page, pageSize, totalCount}`) instead of a scalar: three schema keys would have been the alternative, two of them state keys that the author would have to keep in sync. An object maintains the rule — the widget reads *one* key and writes *one*, returning the rest untouched. `page` is zero-based because that's what a `slice` wants, and the program is the thing that slices. And `file` is an **import** control: a `File` object would travel into the sandbox and be useless there (nothing in `vance.*` takes one), as text it is useful in a line. **Text only** — a binary file arrives as gibberish, and the runtime does not pretend it can recognize it; "is this text" has no honest answer at this layer.

**`variant` is a literal from a closed set** (`neutral`/`info`/`success`/`warning`/`error`), not a state key: a variant says what the message *is*, and a condition on the entire widget is what `show:` is for — two badges each with a `show:` cover the dynamic case without a new binding concept. **`language` is a name, not a MIME type**, resolved in the *parser*: the list exists once, and a typo is a parse error instead of a silent fallback to plain text — precisely the "renders almost correctly" error type against which this parser is built. `code` is read-only like `markdown`; an editable one would be an input widget and would say so in its name (same rule as `form`/`details`).

**Sorting and filtering of the `table` belong to the reader**, not the author and not the program: no schema entry, no state key, nothing in the URL — like the open tab of a `tabs`. Sorting is done in **three** steps (ascending, descending, *back to the program's order*); the last is the point, because the sequence generated by the program is itself information, and a two-state toggle would make it unreachable without a reload. Comparison is numerical if both values are numbers, otherwise textual; empty cells last in both directions (the absence of a value is not the smallest). The **filter field appears from 10 rows** — a threshold instead of a flag, for the same reason already written down for long selection lists in `FormFields`: how many rows justify a filter field is a property of the renderer, and an author cannot know at write time how many rows a program will put in.

**Sorting forced an older bug.** The fallback key for a row without its own `key` field was its **display** index — if sorted, each such row was silently renamed, and a `rowClick` gave a detail view the wrong record. The key now comes from the position in the program's array. From this, two further corrections: `record` and the form write path matched `row.key` by string and therefore **never** found a keyless row; both now use the same keying rule, the write path via position — one place decides what a row is called, and the write puts the record back exactly where it came from.

**`markdown` is rendered by the host's renderer**, not a private `marked` copy: `vance:` links become real links that Cortex intercepts, a fence kind becomes an inline canvas. Injected via the same seam as `embed` (`vance:markdown-component`) — and explicitly **not** moved to `@vance/components` like `FormFields` in §5.2: this renderer accesses the Document Ref Store, the Kind Registry, and the Link Handler. It belongs where they reside; a move would not be a shift, but a migration. Without a host (the view preview from §5.4), the local `marked` path applies — correct there, and visibly less. The fence is named after the document **kind**, not the tool: `diagram`, not `mermaid`.

**`row` and `column`** are the layout widgets and the only thing `@vance/components` does **not** provide (layout there is Tailwind, not a component). Named instead of configured: no `gap`, no widths, no `flex-direction` — a stylesheet in the app document is the line from §1.3. `toolbar` remains next to it because it has a different job (wraps, sizes to content, is for buttons); a widget with a flag would need a default that is wrong for one of the two sides. `column` earns its place primarily **in** `tabs`: a pane carries exactly one widget, without `column` a tab with three widgets had to be a `page` within a `page` — works and reads like an error. A `page` is not a replacement, it is the *root* of a view and carries its heading.

**`show:` on a `tabs` child was broken** and is fixed: the open tab is an **index**, but a hidden child still occupied a space — a `show:` on the second tab would have shifted everything behind it under the reader's finger. `tabs` now filters its children itself *before* rendering any, and clamps the index to the **last** visible one if a program switches off the open one (the author ordered the tabs; a reader deep in the order is closer to the end than the beginning). The `show:` rule is therefore in its own file: two places need the same answer and must not diverge.

**`form` and `details` are two widgets, not a `readOnly:` switch.** The same field list, one difference: one can be typed into, the other cannot. As a boolean, it would need a default, and **both defaults are wrong** — editable-by-default surprises the reader of a detail view who types into a field that saves nothing; read-only-by-default makes "why can't I type" the first question of every author. Two names, each with one meaning. They also render differently: `details` is a label-over-value expression, not a grayed-out editor (an editor with gray fields reads as a broken form, not as information).

**`html` is next to `markdown` because Markdown does not cleanly pass through HTML.** The
reason was concrete: for a form layout in an app, embedded HTML
arrived corrupted by `marked`. The alternative would have been a flag on the `markdown` widget
— rejected for the same reason as `form`/`details` (§5.1): a
widget with two modes of operation needs a default, and that is wrong for one of the
two sides. Two names, each with one meaning; `html` says in its name what
is written into it.

**Both go through the same sanitizer**, and it has been sharpened
after an audit found a real vulnerability. The earlier assessment — "an HTML-written button is a button with nothing attached" — was wrong:
`<form action="https://external/">` with an `<input type="password">` survived
sanitization. One click, and the reader's credentials go to an
external host, with the appearance of their own interface. `form`, `action`,
`formaction`, and `target` are therefore now forbidden (`FORBID_TAGS`/`FORBID_ATTR`
in `sanitizeHtml.ts`).

Two things about this are more important than the fix. First: the vulnerability was **not** in
this Addon, but in the shared sanitizer — it affected every Markdown surface in the
product, including Chat and Cortex. A widget that accepts raw HTML is not a
new attack surface, it is the reason to take the existing one seriously seriously. Second:
this vulnerability does **not** belong in the sandbox narrative. The guest cannot
make authenticated HTTP requests (§6.2.1) — but a form in the *host* DOM can, because it
is the reader's browser that sends. This is the seam where the
sandbox guarantee ends, and therefore it is stated here.

### 5.1a Pass-Through Instead of Prop-Pass-Through

`@vance/components` has **25** components, Bistromath uses a subset of them. The obvious shortcut would be to let a view name any component (`type: VSelect` plus props). **Rejected**, for three concrete reasons:

- **The prop surface would be unvalidatable.** The parser can say "unknown widget"; it cannot say "`VSelect` expects `options` differently". A wrong prop renders *almost* correctly — precisely the error type against which this parser is built.
- **With props comes `class`/`style`.** Inevitable, and thus §1.3's line is crossed.
- **Every prop would become public API of the app format.** Today, ~40 call sites know the library, it is freely refactorable; as a document API, it would be frozen, and a rename would break documents in external Projects.

The approach is therefore **an enum entry plus a branch per widget** — for the 1:1 cases, ten lines each. What is still open: `badge`, `card`, `alert`, `pagination`, `code` (CodeEditor read-only), `file`.

### 5.1b The Program Shapes the View — API Instead of Schema

**Built** (2026-08-25). A view document is static, and that is correct — but a *framework* does not know what its programmer needs. The declarative way would have been `optionsFrom:`, `labelFrom:`, `hiddenIf:`, `disabledIf:`: a key per variant, each with name, default, and place in the parser. This is a configuration language that grows with requirements no one has yet written down.

Instead, a widget optionally gets an **`id`**, and the program patches the rendered tree: `vance.view.patch(id, changes)` / `vance.view.reset(id?)`. Modifiable are `label`, `text`, `hide`, the `options` of a `select` — and per field of a `form`/`details`, `label`, `help`, `required`, `options`, `hide`. Patches accumulate.

**Three decisions support this:**

**Patches reside *next to* the fetched tree, not within it.** If the parsed `ViewNode` were mutated, a patch would survive reloading — and thus "reload" would cease to mean *what the document says*. Precisely the one reliable escape from a confusing runtime state would be gone. Separated, `reset` is a map clear and a view change is a fresh start.

**A patch changes appearance and presence, never behavior.** No `on:`, no `from:`. This is not caution, but what keeps the document readable: if a program could re-route which function a button calls, the view would cease to describe the app — and to know what a button does, one would have to read the entire program. **The document remains the map; a patch rearranges furniture.** For behavior that varies, the handler is its own anyway: branch there.

**`hide` and `show:` are two gates, both must match.** A patch cannot *un*-hide what the document gates — otherwise a program would override a condition its author wrote down.

In addition, a **fifth hook `onViewOpened(handle)`**: patches die on view change (they name a widget of *this* view, and the next one has never heard of it), so the program must know when a view is ready. Presence-checked like all hooks, called *after* rendering, so that a patch within it hits something existing.

**`id` is unique per view** — two identical ones would make a patch ambiguous, and the renderer would have applied it to the first node reached. The parser rejects this.

**Not included, and explicitly stated:** a field list that comes from data at runtime (`fieldsFrom:`). It would come unchecked from the program, and the parser could no longer say anything about it — feasible, but only when a real case calls for it.

### 5.2 The Form Engine Remains Untouched — and is Now Shared

`type: form` embeds a `FormFieldDto` list. No new field on the DTO, no intervention in the server-side parser: Wizards, Setting-Forms, and Document-Templates depend on it.

**Found during building: the *model* was shared, the *renderer* was not.** `FormFieldDto` comes via `@vance/generated`, but `FormFields.vue` was in `vance-face/src/components/` and could not be imported by an Addon bundle. For pure *display*, the move was not justified (Iteration 2 therefore renders the read-only `FormFieldsView.vue`) — **with editing, it became necessary and is done**: `FormFields.vue` is in `@vance/components`.

The price was the i18n dependency, and the solution is the convention that applies there anyway (`VShareButton`: "the label is a prop because this package has no i18n"): the four strings are props with English defaults, the label language is a prop. In `vance-face` there is a **thin wrapper** of the same name that uses `useI18n()` and passes it through — that's why all five call sites in the host remained unchanged, and that's why it's a *binding*, not a second renderer. A `vue-i18n` in `@vance/components` would have made the package unusable precisely in the bundles that need it most.

**The conversion is the actual work, not the renderer.** The program holds what came from YAML — real booleans, real numbers; the form engine holds strings (the Tool Template convention, on which Wizards and Setting-Forms depend). Between the two sits **one** file (`formModel.ts`) with an assurance: **round-trip**. A record that goes into the form and comes back unchanged is the same record, types included. Three cases that make this true and are individually tested — otherwise a document rots while someone types in it:

- **External keys survive.** A record usually carries fields that no form displays; rebuilt from the field list, they would be gone at the first keystroke. So *merged*, not rebuilt.
- **Empty ≠ empty string.** If the key was not present at all, it remains absent (otherwise every noteless record would get a `note: ""` — a diff on a document no one changed). If something was there and the reader deletes it, that is an intention and is written.
- **What cannot be read as a number remains.** Only reachable by paste, but discarding would lose typed input without a trace; the program sees the string and can reject it.

**Second finding, more serious.** `FormFieldYamlParser` **intentionally does not** read `showIf`, `writeIf`, `bindsTo`, and `choicesFrom` — these are Setting-Form extensions that `SettingFormLoader` reads. A field in a view that carries `showIf` therefore **silently loses** the key: no error, no effect, and a conditional field that is always visible. The check therefore runs against the **raw YAML**, not against the parsed DTO — on the DTO, the value is always `null`, a check there could never trigger. Recursive, because a `repeat` nests its fields under `item`.

**Correction to this spec** (2026-08-25): `visibleIf` as an *expression* was the wrong form. A condition here is a **state key** — `show: <key>` on each widget; the program calculates the boolean, the widget reads it. This **eliminates** the question of an expression language in the frontend, instead of answering it: there is exactly one, that of the sandbox. No second Pebble in the browser, no `jexl`, no `jsonata`. `visibleIf` is still rejected, and the message **now names the replacement** — the author's intent is correct, only the syntax is not.

**An unset key is considered hidden**, and that was not the first answer. "Visible" avoids a flicker on startup — but also means that a `dialog` is open before `init()` has run, and an "admins only" section is briefly shown to everyone. Briefly missing is an error the reader sees and the author can explain; briefly showing what the document says to hide, not.

### 5.3 Event Handlers

`on: { <event>: <handler> }` with three handler forms:

| Handler | Effect |
|---|---|
| `reload` | Re-read view and tables |
| `navigate:<handle>` | Open another view of the app |
| `<script-document>:<function>` | Call an exported function |

No inline JavaScript in YAML — code in a configuration document makes it unreadable and untestable. The separator is `:` and **not** `#`, because `DocumentRefResolver` discards the fragment; a notation with `#` would silently lose the function name. For the same reason, `navigate:` is checked **before** the generic `ref:function` split: the latter takes the last colon, `navigate:edit` would otherwise be read as script "navigate" with function "edit".

**`change`** fires while the reader types in a `form` (the running-total case). **Debounced**, because the handler goes into the sandbox, where calls are serialized: a fast typist would otherwise queue a program invocation per character, and the only one whose result they see — the last one — would arrive after all others. The handler receives no arguments; it reads the current state with `vance.state.get`, like any other.

**A `rowClick` that navigates carries the key of the clicked row** (§4, two-part entry handle). Convention instead of template: a `rowClick` knows its row, and `navigate:edit/{key}` would be an expression language no one ordered.

### 5.4 The View is a Kind, Not Anonymous YAML

`app-view` is registered as a `KindHandler` (`AppViewKindHandler`). This buys three things, and the third was the missing one:

- `doc_write` knows `kind: app-view` as a valid kind instead of an unknown string.
- Cortex resolves a renderer for it.
- **`kind_validate` reaches the view.** Previously, it *only* checked `app_rebuild` — which requires an entire app around the document, so a single written view remained unchecked until someone opened the app.

The validator **is the parser**, not a second set of rules next to it: `ViewParser` already rejects everything a view can do wrong, and its messages name the path *within* the document. Two definitions of a valid view would diverge at the first change.

`detects` claims **narrowly** — only a root mapping with `type: page`. A too-generous detector wins against more specific kinds that sort after it, and then types the write incorrectly without an error anywhere.

The renderer shows a **preview without a program**: the real widgets, drawn by the real renderer, against empty state. This is intentional — the question when editing a view is "did I write this correctly", and an outline of the tree only answered a weaker version of that. What depends on state is empty, and a banner states this **once**, instead of every empty table presenting itself as an error. It is not a view *builder*; editing continues in the YAML tab.

The view is addressed via the **same** route as from the app (`…/view`), only with `path=` instead of `folder=`+`handle=`: it is the same question — "give me this view, parsed" —, asked once from the app, where a view has a handle, and once from Cortex, where a document has a path. A fourth route would be a second answer to one question.

---

## 6. Scripts and Sandbox

### 6.0 The Acceptance: A Hello World That Does Something

The scaffold of a new app is **not a self-referential memo**, but a running program — this is the BASIC standard from §1.3, applied to the first second:

> Button "Hello". Click. A text line shows date + "Hello World".

```yaml
# main.yaml
type: page
title: Hello
children:
  - type: toolbar
    children:
      - type: button
        label: Hello
        on: { click: "main.js:hello" }
  - type: text
    from: greeting          # displays the state value
```

```js
// main.js
function init() {
  vance.state.set('greeting', 'Ready — press Hello.');
}

function hello() {
  vance.state.set('greeting', new Date().toISOString() + ' — Hello World');
}
```

**`init()` deliberately writes something visible here.** If it only performed invisible setup, it would be indistinguishable whether it ran or whether the script load silently failed — and that is the question most frequently asked during initial building. The line therefore carries a statement even before the first click, and the click replaces it.

This is chosen as an acceptance test because it drives the **entire second half** of the runtime in one visible behavior: load script document, evaluate in guest, resolve handler notation, call function in guest, write host API, state back to renderer. If any link fails, the line remains empty — and one knows it's exactly one of six.

**A new schema element, and only one:** `from:` on a widget names a **state key**. No expression, no template language in YAML — a name. The key is not declared anywhere (§1.3): the script writes it, the widget reads it.

It is simultaneously the *only* binding element: `from:` applies to `text`, `table`, `form`, and everything else equally (§3). A second key for folder binding would have meant that the same word refers to a path or a state depending on the widget — precisely the ambiguity that already proved costly in §5.2.

**Why three files and not one.** BASIC had one, and the budget from §1.3 names two. The contradiction is none: the budget counts what one **must declare**, not what the scaffold writes. Inline JavaScript in YAML remains out (§5.3) — in a configuration document, code is an opaque string without highlighting, without lint, with block scalar indentation as a source of errors. The author never types the three files; `create()` places them, and then they edit the ones they mean.

### 6.1 Loading

Source code comes via `GET /documents/by-path` and is ETag-cached. Standard document access, no special path.

### 6.2 Execution

**Not** `eval` or `new Function` in the page realm. The source code is instantiated with `evalCode` in the **QuickJS guest**.

The reason is not theoretical: an app document can be written by an agent or installed from a Kit. Executed in the page realm, it would have access to `localStorage`, the non-HttpOnly `vance_data` cookie, `fetch` with session cookies, and the entire DOM — any installed Kit could take over the user's session.

The guest sees `vance.*` and nothing else: no `window`, no `document`, no `localStorage`, **never the JWT**. A host `fetch` is not passed through (§7.2).

#### 6.2.2 The Canvas: The Guest's Document, Made Visible

**Built** (2026-08-25). If the widget vocabulary has nothing for the task — a weekly grid, a Gantt bar, a color wheel — the view declares `region: <px|fill>` at its **root**, and the program gets a rectangle with a **real DOM**: its own. No new API — `document`, `createElement`, `addEventListener`. A listener runs *in* the guest, without a handler contract and without a roundtrip, and `vance.*` continues to work from there, so a click in the canvas can drive the widgets around it.

**Why it's an iframe and not a host element.** The program *lives* in this frame (§6.2.1) — the DOM it can directly touch is this one. The two alternatives are named and rejected: `allow-same-origin` would give the program the host DOM, but with it also the HttpOnly cookies on every `fetch` — an app document from a Kit could call any Brain API as the logged-in user. And a remote DOM protocol (`vance.dom.setHtml`, `on(…)`) would *not* be direct: `el.style.left = x` in an animation loop would be 60 messages per second, and it would be a second, re-implemented API next to one the author already knows.

**Three decisions support the design:**

- **`region` belongs at the root, not on a widget.** An `<iframe>` reloads when moved in the DOM — that would restart the program. So there is exactly *one* canvas, and it cannot be placed anywhere in the tree. Accepting the key there and rendering it elsewhere would be the "almost correct" against which the parser is built; it rejects it.
- **The frame lives in a stable slot of the app**, which is always rendered and which it never leaves. Visibility and height are determined by the styling of *this* div — never a re-parenting. A view without `region:` leaves it at zero height, an app of pure widgets is thus unchanged.
- **Three lines of CSS in the Bootstrap, no more.** CSS does not cross document boundaries, so the guest inherits nothing from the host — no Tailwind, no DaisyUI, not even the font. "Not broken on arrival" (no margin, readable cut, `color-scheme: light dark`) is the honest baseline; "looks like Vancetope" is impossible, not undone.

**The sandbox remains complete**: no `parent.document`, no `fetch`, no `localStorage` — measured, not assumed. Everything that leaves the canvas goes through `vance.*` and is authorized there like any other call.

**When *not* to use it**, and this is also in the Manual: a widget is validated, themed, and readable for the next reader of the document — the canvas is none of these. Where the interaction *itself is the product*, it belongs in a compiled app according to §1.2. The canvas is for the piece in between.

### 6.2.1 Built is a null-origin iframe, not QuickJS

This spec argued for QuickJS-WASM in a Web Worker. **Iteration 2 built an `<iframe sandbox="allow-scripts">` with `srcdoc`** — opaque origin, `postMessage` as the only bridge. This is a deviation and here's why.

The core statement of §6.2 remains untouched: the code does **not run in the page realm**. A null-origin iframe has no `localStorage` (access throws), no cookies, no access to the parent DOM, and no `fetch` with our session. This is a **browser process/origin boundary**, not a language boundary in our heap — thus *stronger* than QuickJS at this one point.

What spoke for it:

- **Significantly less code.** With QuickJS, every value is marshaled via handles and must be `dispose()`d; the bridge is the bulk of the work. Via `postMessage`, structured cloning travels by itself.
- **Timers resolve themselves.** §6.4 requires that timers and subscriptions die with the VM. A removed iframe takes them with it; with QuickJS, the host would have had to count them.
- **No WASM asset.** A federated Addon bundle under `/addons/<id>/` would have had to resolve the ~1 MB `.wasm` via a relative path — a risk unrelated to the matter.

What it costs, unvarnished:

- **No infinite loop interruption.** QuickJS has a fuel limit, an iframe has none. The replacement is a **watchdog**, and it fires on **silence**, not on elapsed time: every host call re-arms it. This is not cosmetic — without this rule, any source that responds slower than the time window would have been considered an infinite loop and the program would have been cleared in the middle of reading. A program that loops infinitely *during host calls* is thus never caught; this is intentional, as it makes progress across the bridge and is a busy, not a hung, program.
- **No real ES module imports.** With null origin, the guest cannot load anything; the source code is evaluated as one piece. For an app with a `main.js`, this is sufficient — the Foundation Library (§9) then either needs bundling in the host or a switch to QuickJS.

**The switch remains open and is cheap**, and that is why the decision is now justifiable: the sandbox is runtime, not document format (§11). No app document sees the difference. As soon as the Foundation Library becomes due, QuickJS is again the right answer.

### 6.3 Modules — A Load List Instead of a Module System

**Built** (2026-08-25). The guest has a global scope and no module system, so "what loads" is **an ordered list**. It is composed from three places, all written differently: `required:` in the manifest (the app as a whole), `required:` on a view (this screen), `@require` in the header of a script (this file) — including the header of a **library**, which makes the graph transitive.

**The crucial distinction: an `@require` names a library, an app-local file is *found*.** Libraries reside under `_vance/app-libs/<name>@<version>.js` and cascade Project → Tenant → bundled (§9.0 had already decided the location); a file in the app folder belongs to this app and needs no name. Sending both through requires would mean versioning files that only have one version, and inventing a path syntax that the schema otherwise lacks.

**The version is mandatory.** A bare `db` would have to mean "the latest" — a different promise. `db@1` fixes against which API the author wrote, and that is precisely what allows reporting a conflict instead of guessing.

**If two versions are present, the highest wins, with a warning naming both versions and the requesters.** This is a guess, not a resolution: two versions cannot coexist in one scope, there is no second scope. So the choice is between not starting and choosing, and a v2 is more likely to serve a v1 caller than vice versa. **The warning is the measure.**

**A missing require still loads the app.** A missing library breaks the *program*, not the app — not opening it would hide which of the two is broken.

#### 6.3a Two Corrections That Only Experimentation Showed

**`$meta.kind: app-script` does not work.** There are header strategies for Markdown, YAML, and JSON — a `.js` file **cannot** carry a kind. The analogy to `app-view` (§5.4: a view declares itself) was correct in principle and wrong in mechanism. Now a header marker `@app-script`: the file declares itself, the marker stands next to the `@require` lines, and a file that says nothing remains a note. Rejected: load *all* `.js` (a leftover note becomes part of the program) and a manifest list (the registry that §4.1 removed).

**One `eval` per file does not work.** In *indirect* `eval`, only `var` and function declarations reach the global object; `let`/`const`/`class` land in a lexical scope that dies with the call. A library with `const core = {…}` — how everyone writes JavaScript today — was invisible to the next file, and the error was `core is not defined` with no hint of the cause. Now **one** evaluation of the concatenated sources: ordinary JavaScript works, and a duplicate `const` declaration becomes a **loud** `SyntaxError` instead of a silent shadow. The price is one `sourceURL` for everything; `blameFile` retrieves most of it by evaluating file by file in case of error and naming the culprit — a path that only runs on errors and costs nothing in the normal case.

#### 6.3b Analysis: Three Surfaces, One Resolver

The list is composed from three places and not written down in any of them — so it needs a place where it can be read back. A `RequireResolver`, three consumers: the **`Loads (n)` button** in the app toolbar (order, origin layer, who requested what), the **problem bar** (warnings and missing parts, where all other app problems also reside), and the generated **`_index.md`**, so an agent sees the same list. The origin layer is not decorative: it is the difference between "my override works" and "my override is in the wrong path".

### 6.3z Modules (original section)

QuickJS supports ES modules with a host-provided loader. Thus,

```js
import { table } from 'vance:/_vance/bistromath/lib/data.js'
```

is nothing new — the loader reads a document. **The Foundation Library (§9) falls out of this**, instead of being a second mechanism.

### 6.4 Lifespan: A Running Program, Not a Handler Pool

**One VM per open app, created on mount, discarded on unmount.** As long as the app is open, a program runs — no fire-and-forget per click. Module variables survive clicks because it is a regular JS application:

```js
let clicks = 0;                       // lives as long as the app is open
function hello() {
  clicks++;
  vance.state.set('greeting', `${new Date().toISOString()} — Hello World (${clicks})`);
}
```

### 6.4a Six Lifecycle Functions — All Optional, All Pre-Checked

`onAppInit()`, `onAppShutdown()`, `onAppRefresh()`, `onAppBeforeUnload()`,
`onAppDocumentChanged(paths)`, and `onAppViewOpened(handle)`. **None of these are mandatory**, and the runtime checks **once** after evaluating the program which ones are present (`typeof window[name] === 'function'` in the guest), instead of calling them and interpreting a failure. The first build called and filtered the error message by the text "no function named…" — a string comparison as a substitute for a fact that can be queried.

**A namespace, renamed instead of grown.** The first hooks were called `init` and
`shutdown`, the later ones `on*`. With six functions, this is no longer a
matter of taste: the guest evaluates a script at the top level, so every
top-level function competes with what the author writes themselves — and
`init` is a name one habitually types for one's own setup function. All six
therefore carry the `onApp`-prefix, and the namespace is thus
recognizably that of the runtime.

**Without migration and without recognition of old names.** There were only test apps, so
the cheap answer was also the right one. Recognition would have been the more expensive way
— it would have kept the old name alive permanently and left the author
with a question of which of two names is valid.

A *handler* from a view is still simply called and reports if it doesn't exist: there, the absence is an author error and should be visible, whereas for the three hooks it is the normal case.

**`onAppInit()` runs once**, after module evaluation. This is the point where the program starts — and the reason why a table is populated without a click:

```js
async function onAppInit() {
  const files = await vance.documents.list('invoices/');
  const rows = [];
  for (const f of files) rows.push({ key: f.key, ...(await vance.documents.read(f.path)) });
  vance.state.set('invoices', rows);
}
```

The name is deliberately not `main()`: `main` suggests the program *is* this function and returns. Here it sets up, and then the app continues to live and waits for events.

**A convention, with an emergency exit.** The program of an app is `main.js` in the app folder; `onAppInit` and `onAppShutdown` are ordinary top-level functions there (no `export` — the source code is evaluated as one script, so a top-level function is reachable by name). No mandatory entry in the manifest, because §1.3 applies: a conventional path is addressable. The price is **one** `by-path` lookup on opening, which goes nowhere for a scriptless app — an indexed failure is a definitive answer, not guesswork.

Anyone who wants a different program overrides it — just as `landing` overrides the alphabetically first view:

```yaml
custom:
  landing: list
  init: setup.js       # optional, Default main.js
```

Multiple files are not yet possible in this build — the guest cannot load anything with opaque origin (§6.2.1). An `import` comes with the Foundation Library.

**The weakness of the convention, and how it is paid for.** Anyone who only reads the `_app.yaml` does not see that the app has a program — unpleasant for a human, worse for an agent who opens the manifest to understand what is before them. "It's in the convention" is not an answer if the descriptive file does not describe it.

The way out is not to declare it back in the manifest, but to make it visible where it is looked for anyway — and both places already exist:

- **`_index.md`** (generated by `refresh()`) lists what the runtime actually found: each view with its handle, the program with its path, the data folders the script points to. The *resolution* is conventional, the *information* explicit — and the information cannot become stale because it is re-read from the folder on every `app_rebuild`. A manifest line could not do that: it asserts what someone once wrote down.
- **`promptInject`** tells the agent the same paths per turn.

This is why the convention is bearable here: there is a generated place that tells the truth. If that were gone, the declaration would be correct.

**`onAppInit()` does not render.** The landing view is drawn **immediately**, because `onAppInit()` is asynchronous — otherwise the app would remain empty until the first document read. `onAppInit()` populates the state that this view reads. Anyone who wants to change the view from within the program calls `vance.ui.show('<handle>')`; possible, but not the normal case.

#### `onAppBeforeUnload()` — the confirmation before leaving

If the program returns `true`, the browser asks for confirmation before closing or reloading the page.

**The answer is cached, and this is not an optimization.** `beforeunload` decides **synchronously**, but the guest is only asynchronously reachable — so the answer must already be there when the event fires. Therefore, the function is re-evaluated **after every guest call**: the state of a program only moves when its own code has run. Anyone who changes their mind from a timer will not be noticed until the next call — consciously accepted, because the alternative would be to query a sandbox in rhythm.

Three boundaries that belong to the mechanism and not to us: the text is the browser's generic one (custom text has not been possible for years), the dialog is completely omitted if the reader has never interacted with the page, and in case of a crash, no one asks. **This is courtesy, not a safety net** — the reliable rule remains: write it when you have it.

Cortex already has the guardian (`onBeforeUnload` in `EditorApp.vue`, fires on every dirty tab); this one is a second listener on the same event, which the browser combines into one dialog. The clean way would be a `vance:report-dirty` to the host — then there would be one guardian for all tabs. **Not covered is closing an app tab *within* Cortex**: `store.closeTab` closes unconditionally, even for a dirty document, and an app cannot intercept that. That would be a change in `vance-face`.

**No handler runs before `onAppInit()` is complete.** Guest calls are **serialized**: `onAppInit` is the first entry in a queue, every handler appends itself behind it. Without this, an async `init` yields control, the guest accepts the next message, and a click during startup could complete *before* `onAppInit` and read module state that no one has yet set — an error that only occurs under load and therefore lives long. The watchdog only starts on actual sending, so waiting for one's turn is never considered hanging.

**Teardown waits briefly, but not long.** A handler that is still running gets `vance.bistromath.drain` (1.5 s) to land — cutting it off in the middle of writing is precisely what is avoided here. After that, `onAppShutdown()` runs with its own time window, then the frame goes. Teardown **does not wait** for a hung handler: that's what the boundary is for, and the reader is already gone.

**`onAppShutdown()` runs when the VM is discarded** — unmount, reload, Project change. For cleanup: release a subscription, write an intermediate state.

Three things must be clear, otherwise `onAppShutdown()` becomes the place where data disappears:

- **It is not guaranteed, and the cases are different.** On a normal close (tab switched, document closed), it runs and is awaited. If the **entire page** goes away — browser tab closed, reload, crash —, no Vue hook runs anymore and the frame dies with the document; a `pagehide` listener then sends an `onAppShutdown`, but that is **courtesy, not a promise**: the browser does not wait for any Promise there, a synchronous `onAppShutdown` can get through, an asynchronous one cannot. So: `onAppShutdown()` is for *orderly* release, **never** for the only copy of something. Anyone who has data writes it when they have it — not at the end.
- **It has a time window.** The call is async, but the host is currently tearing down; after `vance.bistromath.shutdown-timeout` (default a few seconds), the VM is discarded, whether the Promise is fulfilled or not. A hung `onAppShutdown()` must not block a tab.
- **Order:** `onAppShutdown()` → release host timers and subscriptions → discard VM. A reload goes through the same chain, so the old program gets its `onAppShutdown()` before the new one sees `onAppInit()`.

**Two types of state, and the seam between them is deliberately placed.** Module variables live **in the guest** and are invisible to the renderer — that is the program's bookkeeping. `vance.state` lives **on the host side** (Vue-reactive), because the renderer must react to it; a `set` marshals once per write operation instead of once per render, and the guest does not get a reference to reactive host objects.

**No survival of a tab switch.** If Cortex discards the tab content, the VM dies and the program starts from scratch on the next opening. This is decided, not overlooked: state rehydration across mounts would be machinery for a case a user already knows from any browser tab — and §1.3 also applies to the lifecycle. Anyone who wants to keep something writes it to a document; that's what data access is for.

**Two duties for the host, which follow from longevity:**

- **Timers and subscriptions belong to the host and die with the VM.** QuickJS has no timers of its own; they come from the host API, so the host can and must count them and release them on dispose. Without this, a closed app continues to poll.
- **Reload means new VM.** Anyone who edits a script and presses `Rebuild` must get a fresh program — otherwise the change appears ineffective, and that is the error one searches for longest.

#### `onAppRefresh()` — the rhythm is in the manifest

An app that displays external state — a folder an agent populates, a
run that is still working — needs a way to check by itself.

```yaml
custom:
  refresh: 30        # seconds
```

**The rhythm belongs in the manifest, not in the program.** A `setInterval` in the guest
would be the obvious way and is the worse one: the host counts timers and
deletes them on dispose (§6.4a), whereas a declared rhythm is *readable* —
for the operator, for an agent who opens the manifest, and for a
future policy that wants to enforce a minimum interval. Without `refresh:`, no timer runs.

**A floor of 5 seconds** (`MIN_REFRESH_SECONDS`), clamped instead of rejected:
`refresh: 1` is not a typo that needs to be thrown back at the author, but
also not a promise this runtime should give.

**A hidden tab does not tick.** `document.hidden` is checked — a reader
who opened the app in the background three hours ago should not have
generated three hours of calls. On returning, it catches up **once immediately**, otherwise
the reader would see old numbers until the next tick. (Learned during verification: a
second browser tab does **not** make `document.hidden` true — the check can only
be performed with an overridden `hidden`, and anyone who doesn't know this considers a
working lock broken.)

A running `onAppRefresh` skips its next tick instead of stacking — the same serialization as for all guest calls.

### 6.5 Everything is Asynchronous

Every host call is a roundtrip. Host functions return **Promises** in the guest; the controller operates the job pump. Anyone who starts the bridge synchronously builds it twice.

---

## 7. Host API `vance.*`

### 7.1 Two Halves

**Server Surface** — names **mirrored from `VanceScriptApi`**, so a script remains portable between Brain and browser and the author learns one thing:

```
vance.documents.{read,write,list,exists,delete,meta}
vance.rag.query
vance.llm.*
vance.compose.run
vance.http.get / vance.http.post      ← Relay, see 7.2
vance.rest(method, path, body)         ← Brain REST, see 7.1b
```

**Host Surface** — what only exists in the Cortex tab:

```
vance.ui.notify(text, severity)
vance.ui.openDoc(ref)
vance.ui.setEntry(handle, arg)         ← vance:report-app-entry
vance.ui.dialog(viewRef, model)
vance.state.{get,set}                  ← Controller state
```

### 7.1a What the Program Knows About Itself

**Built** (2026-08-25). Until then, the guest knew **nothing** about itself — `state`, `documents`, `ui`, `view`, but no folder, no Project, no Tenant, no Session.

One detail defuses the question: *loading local files* was already possible because the host resolves relative paths against the app folder (`read('config.yaml')` hits `<folder>/config.yaml`). What was missing is the **knowledge** about it — for a link, a message, a log line.

**Two forms, and the separation is the decision:**

`vance.app` is a **frozen object** with what cannot change as long as the app is open: `folder`, `project`, `tenant`, `user`, `docPath`, `docId`. It arrives via message **before the first line of code runs** — so it is read without `await`, even at the top level. Serving a constant over a call invites the reader to wonder *when* it changes; it does not (a different Project means a different document and a new mount).

`vance.app.current()` is a call for what changes: the open view and the chat session next to it. As a constant, it would eventually be wrong.

**`user` is information, not authorization.** Hiding something behind a name is decoration; what a reader is allowed to see is decided by the Permission System on every call the host makes for them. The guest gains nothing from these details that `vance.*` does not already gate — it cannot make its own requests (§6.2.1).

### 7.1b `vance.rest` — the app can do what the user can do

**Built.** The principle that determines the surface: *the sandbox is there to protect the
UI, not to protect the user from themselves.* Alice can call any
route as Alice — from the console, from a script, with `curl`. An
app that cannot do this gains no one security; it merely forces every
use case through a specially built `vance.*` verb.

Therefore, the API is **the REST controllers**. No second API tailoring, no
facade per use case — this was precisely the requirement, and it saved more
than it cost: what the core can do, an app can do the day after.

**Three lists, in ascending order of who can change them** — the
seam that makes this access bearable:

| | Who | What |
|---|---|---|
| Baseline | Code (`restPolicy.ts`) | what no app may ever do, no one extends it |
| Policy | Tenant Admin | §10a |
| Declaration | Author (`custom.rest`) | what *this* app needs |

The intersection is taken. The baseline holds what even the user themselves
should not do *through an app*: Login/Refresh/Logout and OAuth (sessions are
not the business of application code), `/admin`, `share` (what leaves the house),
`mcp`, as well as the execution routes `compose`/`python`/`script`. A rejection
states **which of the three lists** spoke — without that, the author faces
"doesn't work" and searches in the wrong place.

**Three routes were newly created for this access**, and all three in the core, because
they have nothing to do with apps:

- `POST /brain/{tenant}/light-llm/{project}` — a model call. Vance is an
  AI tool; a runtime for applications without model access would be an
  oddity. Approval is given **at the Recipe** (`web: true`), not per app: the
  route is open to any web client, so the app is the wrong level for permission
  — the right question is which *Recipes* are callable from outside.
  The second gate (`internal: true`) remains where it was.
- `POST /brain/{tenant}/processes/{project}` — start a process. The spawn core
  has been moved from the WS handler to a `ProcessSpawnService` for this; a
  second spawn path next to the existing one would have been the point where the
  Lane serialization would eventually diverge.
- `GET /brain/{tenant}/settings/{project}` — read settings, either `keys=` or
  `prefix=`, exactly one of the two. **Encrypted types never come along**, and
  in such a way that "not set" and "is a secret" look *identical*. This is
  the one deliberate reversal of the otherwise applicable rule "absent ≠ empty": to
  confirm that a key exists reveals configuration.

### 7.1c What an Agent Does to the App

**Built.** A chat runs next to the app. Five client tools connect both:
`app_describe`, `app_state_get`, `app_state_set`, `app_action`, `app_reload`.

**`app_describe` is built as an accessibility snapshot**, not a schema dump —
in the form a model reads a browser. This was a correction: the
first version returned the view structure, which was correct but
useless for an agent. A tree of roles with labels and references is what
a model is trained on.

In addition, a second correction, which has the same root: **the arrangement must
be included.** An agent who sees a list of widgets does not know that two
cards are *side-by-side* or that three fields are in a tab that
is currently not open. Containers therefore carry their arrangement as an annotation.

Not restricted: this access is not subject to any policy. The agent acts on behalf of the same reader and can do nothing the reader cannot.

### 7.2 Outgoing Calls Run Via the Server

From the browser, there is CORS, no `SsrfGuard`, and no place for a key. `vance.http.*` is therefore a **server-side relay**, not a browser `fetch`. Precedent is `link-preview` (server fetch with cache); the configurable variant are Tool Packs.

---

## 8. Controller

### 8.1 Lifecycle

Read manifest → resolve views → boot sandbox → load scripts → render. If a script is missing or a view is defective, the fallback from [doc-kind-application](/specs/doc-kind-application) §7.1 applies: CodeEditor on the manifest. Inspection and repair remain possible, no hard fail.

### 8.2 State

A reactive model: tabular data in the Store (§11), scalars as `reactive()`. The view tree binds to it, the guest reads and writes via `vance.state.*`.

### 8.3 The Controller is the Only Instance That Communicates with the Server

Widgets do not fetch anything themselves. Otherwise, each widget has its own cache and there is no place where conflicts can be handled.

### 8.4 Saving and Conflicts

This is the actual design work, not the widget list. The crucial decision has been made: **the program writes, not the form.** There is no "dirty" and no debounce, because no widget owns a value — a value comes via `vance.state.set` and goes back via `vance.documents.write`. This eliminates questions about the write time, and what remains is the one that does not disappear: **who wrote before.**

The answer is an **implicit version memory per running app**. Every `read` remembers the document's `ETag`, every `write` sends it back as `If-Match` ([documents-channel](/specs/documents-channel) §5.1a); a `412` is passed as a named error to the guest, and **nothing was written**. The program re-reads and decides.

Implicit instead of a value the author passes around — this is a conscious trade-off. It keeps read-modify-write to two lines, but costs a rule that **must be explicitly stated**: only a document that *this* app has read is protected. A blind `write` to a path from a list goes through unconditionally. This is correct for creation and wrong for modification, which is why the manuals specify the read → change → write form and do not explain the existence of a version parameter.

`{ force: true }` writes anyway — for the case where the program is the authority over the content (a log it appends to; a cache it owns), not to get rid of an error.

Two exceptions, both from the mechanics: a **mounted** document (`_ext/…`) has no version, so none is remembered — an `If-Match` on it would be a condition no one checks. And where nothing exists yet, there is nothing to overwrite: `write` to an empty path creates, `create` also, and the condition "nothing is there yet" is checked by the server.

`write` is thus **create-or-replace** — the same meaning as `vance.documents.write` in the Brain (`ScriptDocumentApi`), which fulfills §7.1's mirroring instead of breaking it. `create` stands **additionally** next to it, for the case where "already exists" is an error the program wants to hear.

What **remains open** is the second half — the push side: what a `documents.changed` does for a currently displayed row (§8.5, `onDocumentChanged`). Baseline tracking plus 3-way-merge plus `editorId` from the [documents-channel](/specs/documents-channel) is the form that will be **reused** for this as soon as forms accept values; as long as they only display, re-reading is the entire treatment.

### 8.4a The Reset is Outside the App

**Built** (2026-08-25). A reset that the app cannot break must not be in the app — and that is precisely the case that makes it necessary: an app can hide its own toolbar via `vance.view.patch` (§5.1b) or take over the page with a canvas (§6.2.2). Then the `Rebuild` button in its toolbar is no longer accessible.

So the **Cortex header** holds the button (next to the star), and the kind view only says what it does: it registers a function via `inject('vance:register-reset')` on mount and `null` on unmount. No handler, no button. `DocumentTabShell` thus learns nothing about which kinds are resettable — the same federation pattern as `vance:embed-component` and `vance:markdown-component`, only in the other direction: not the host provides something, but the guest registers something.

**Reset is not Rebuild**, and the separation is the point:

| | What it does | Requires |
|---|---|---|
| `Rebuild` (in the app) | Re-read and **validate** documents, re-write `_index.md` | Project `WRITE` |
| `Reset` (in the header) | Discards what the **program** did — state, patches, the running guest — and restarts it from the documents | Nothing |

A reader without write permission can thus also escape a confusing runtime state — which was the reason to keep the patches *next to* the fetched tree from the beginning (§5.1b).

### 8.5 Subscription

`documents.subscribePrefix` on the **app folder**, via the existing `useDocumentPrefixReaction` from `@vance/components` — no separate WS wiring, no second debounce.

**Two things can change underneath, and they deserve two different answers.** A document that *is* the app — manifest, view, program — means someone has edited the app: it reloads (exactly what the Rebuild button does; having to press it after every change was the friction this eliminates). Everything else is **data**, and what to do with it only the program knows — it receives `onDocumentChanged(paths)` and decides.

Which of the two a path is, is answered by **the scan**, not a folder convention: §4.1 rejected prescribed folders, and guessing from the path would reintroduce them. The one case this does not affect is a **newly created** view — it is not in any scan, so it counts as data. Rebuild still covers this, and creating a view is rarer than saving a record.

**Self-writes do not come back.** The REST client appends the connection's `editorId`, the server skips the writer. Without this, a program that saves a record would be notified of its own save — and could respond with another save.

---

## 9. Foundation Library

`_vance/bistromath/lib/<name>.js`, resolved via `DocumentService.lookupCascade`: **Project → `_tenant` → Bundled Classpath**, first hit wins. The same pattern as Recipes, Manuals, Guards, Templates, and the Model Catalog. The folder name carries the codename because it belongs to a single actor — the same form as `_vance/eddie/manuals/` or `_vance/frankie/`; functional folders (`manuals`, `recipes`, `guards`) are those shared by many actors.

### 9.0 The Library Resides in the Addon, Not in the Tenant

The bundled layer is `vance-addon-brain-bistromath/src/main/resources/vance-defaults/_vance/bistromath/lib/`. This is the **location** of the standard library; `_tenant` is the **override layer**, not the storage. A fresh Tenant has the complete library without anyone having created a document.

Mechanics: [addon-system](/specs/addon-system) §7a. No registry entry, no boot hook, no Mongo seeding — `lookupCascade` reads `classpath:vance-defaults/<path>` across JAR boundaries. The same way this Addon already delivers its Manual.

### 9.0a The Version is in the Name

`core@1.js`, `core@2.js` — side-by-side in the Addon. Three things result from this that a nameless resolution does not provide:

- A breaking change is **additive**: `core@2` is added, `core@1` remains, existing apps continue to run without anyone migrating.
- The radius of an override shrinks to a major version. A Tenant that overrides `core@1.js` does not affect apps already on `core@2` — precisely the concern this decision kept open.
- It costs nothing: a filename convention, not a mechanism.

`@` is harmless in the document layer — no special case in `DocumentRefResolver` (a regular pchar), no character allowlist for paths, `normalizePath` only touches slashes.

### 9.0b The Import Specifier Does Not Name the Path

```js
import { table } from 'vance:core@1';   // Foundation, cascaded
import { fmt }   from './helpers.js';   // belongs to this app
```

The loader maps a `vance:` bare name to `_vance/bistromath/lib/<name>.js` and a relative path to the app folder. This separates two things that would otherwise blur — "shared library" and "this app's file" —, and keeps the path including the codename out of every app document. Nothing additional needs to be built for this: it is the same module loader that §6.3 already requires.

**What this does not solve:** changing a library in the Addon JAR requires a release. For `core`, that is the purpose — stability is the promise. For anything someone wants to iterate on, the cascade remains the way: override per Project, without touching the Addon.

### 9.0c `core@1` — Built, and What's Inside

**Built** (2026-08-25). The source for the content was not considerations, but the programs that emerged during the building of these iterations: the folder read with `key` was in every one, `vance.state.set` fifteen times in one file. Three rules kept the library small:

1. **Only what was repeated**, or easily subtly goes wrong (paging is zero-based; empty is not the smallest value).
2. **No policy.** No currency, no locale, no date format, no page size that pretends to know what is in the data. `core.num` formats a number; what a number *means* is up to the app — a shared library that decides this becomes something to bypass.
3. **Nothing that hides an error.**

`core.rows` · `save` · `remove` · `set` · `get` · `filter` · `sort` · `paging` · `page` · `num` · `date` · `say` · `warn`. **`core` is shorter, not more powerful** — a program without the library lacks no capability, and that is the test for whether something belongs in it.

**Bundled means: no document.** This revealed a gap that no consideration would have shown — the server resolves via `lookupCascade` (including classpath), the client read via `documents/by-path`, and that only finds Mongo rows. So a **fourth route** (`…/script?path=`) that serves the same cascade; it is the first that *does not* duplicate something the generic Doc API can do, because there is nothing to duplicate for a classpath resource. The alternative — mirroring bundled libraries into documents on boot — would have frozen them to the state of the first build.

**And a bug that `core@1` uncovered in already delivered code:** `core.sort` was written as `factor * compare(a, b)`, and that also reverses the empty-last rule **with** it — descending, all empty cells were at the top. The same bug was in the `table` from §5.1, which I had **verified and reported** as "empty last in both directions"; the report was wrong for the descending direction. The rule is now in `compare.ts` (`compareInDirection` takes the direction *in*) with its own test, and `core@1` carries it as a JS twin, which the same test also checks.

### 9.0d Four More: `api@1`, `db@1`, `fmt@1`, `ui@1`

**Built.** The standard for what becomes a library was initially wrong in
my head — I argued against it because no one had yet written the same code
twice. The reason for the separation is different: **a library separates
functionality that is not always needed.** `db@1` should not be in memory
if an app has no table. And a library *offers* abstraction, instead of
meeting an existing need — otherwise there would be none. With discretion,
without gold-plating; the fundamental things should be offered.

- **`api@1`** — the Brain REST surface in a convenient form (`get`/`post`/`tryGet`/
  `status`/`query`, plus `inbox.*` and `documents.*`). It adds **no** authority:
  everything goes through `vance.rest` and thus through the same three lists.
  What is noteworthy is what is **missing**: no `inbox.create`, because there is no
  `POST /inbox`. A library that invents a route that does not exist
  is worse than a gap.
- **`db@1`** — folder-as-table (§3.0) with `all`/`where`/`upsert`/`nextKey`.
  Also `checkFolder()`, which **rejects** a folder that duplicates the app folder:
  `db.table(vance.app.folder + '/rows/')` is the mistake everyone makes once,
  and it silently writes to a duplicated path.
- **`fmt@1`** — numbers, currency, date, duration, `truncate`. Pure presentation.
- **`ui@1`** — state ergonomics over `vance.state` (`hide`/`show`/`field`/
  `options`/`patch`).

Tested via a harness (`libraryHarness.ts`) that loads the delivered file
and evaluates it against a `vance`-stub — not against a copy of the source in
the test directory. Only this found two errors: `fmt.truncate` did not cut at
a word boundary at 58%, and `de-DE` places a narrow non-breaking space (U+202F)
before the currency, which causes any naive character assertion to fail.

### 9.1 Small Kernel, Ergonomics in JavaScript

The compiled host offers four things: documents, HTTP relay, UI, Store. All ergonomics — `table('invoices').where(…)`, `form.bind(…)`, `report.group(…)` — is Foundation Library **in JavaScript, in a document**: changeable without a release, writable by an agent, deliverable via Kit, overridable via cascade.

This is the same bet as with Recipes and Manuals: the compiled surface remains small enough to stay stable, and growth happens in documents.

### 9.2 The Foundation Library is Not More Privileged Than App Code

It runs in the same guest, with the same host API. This is correct — and it belongs here so no one builds a "trusted lib" backdoor later.

---

## 10. Three Hard Boundaries

**No authority beyond that of the user.** Every call goes through the same `PermissionService.enforce` chain as the Web UI. No `runAs`, no `privileged`, no service account. The [Permission System](/specs/permission-system) needs **zero** extensions — a server-side framework would have needed its own authority story.

**No background execution.** No Think Process, no Lane, no Home Pod, no Lease. Tab closed = end. "Clean up the table every night" cannot be done by an app itself; it delegates to Ursa or Damogran. This is the expansion joint, and it is stated here so no one expects it.

**No Secrets.** `SecretResolver` is server-side. A Bistromath app cannot resolve a `PASSWORD` or `HIDDEN` setting. Where an external system needs a key, the call goes via the relay (§7.2) or via a Tool Pack.

The shared state is consistently **the document**, not the process: two browsers with the same app are two independent runtimes that coordinate only via documents and `documents.changed`.

---

## 10a. Governance: Who Decides if an App Even Runs

**Built.** The asymmetry at stake: an **Addon** cannot be installed via Kit;
it goes through the Addon Registry. A **Custom App**, however, is
a handful of documents — a Kit brings them, an agent writes them,
anyone with Project WRITE changes them. Foreign code in the reader's browser is a
powerful thing, and an operator must be able to say how it is handled.

**What this policy is:** it protects **the reader from the app**. Alice writes
it, Bob opens it, the policy limits what Alice's code does in Bob's browser.
It **does not tame Alice** — as Alice, she can call any route anyway
(§7.1b). This distinction is in the comments of the config file and in the
Manual, because an admin would otherwise write `restricted` and believe they had
bought the second.

**A document, only from `_tenant`:** `_vance/config/applications.yaml`, structure
like `kit-sources.yaml`. Explicitly **no** `applications.yaml` in the Project and
**no** rule in the `_app.yaml`: the recipient of this policy is someone with
Project WRITE, and anyone who can write their own law is not addressed.

Three levels — `forbidden` / `restricted` / `allowed` —, global, per Project, and
per app path prefix (longest match wins). **An inner entry may
open, not just narrow:** "everything forbidden, but this app allowed" and "all
apps in this Project, that's where the developers sit" are the main cases, and
both are admin decisions. The price of path identity must be stated:
renaming the folder silently changes which rule applies.

**The default is `forbidden`** — a powerful feature is opt-in, and the
absence of the file is not a silent yes. This is only reasonable *because* the
approval request is built (see below); without it, a bundled
`allowed` layer would have been the right way. For development, an
all-allowing preset is under `readme/bistromath/applications.yaml`.

### 10a.1 The Check is Entirely Client-Side — and This is Not a Compromise

The guest can make HTTP requests, but no **authenticated** HTTP requests to us: opaque
origin, no cookie, no CORS permission for `Origin: null`. Every call that
reaches the Brain has therefore gone through `vance.rest` — i.e., through the
host. A check there is a **complete** check of the app code. That is
precisely what the sandbox is for.

Server-side enforcement was considered (an `X-Vance-App` header plus filter)
and **rejected**: the only thing such a filter could catch are
calls that voluntarily identify themselves as an app. Anyone who omitted the identifier would
again be the user with their own rights — same protected set, more
machinery, and a filter in the core that runs on every request. Thus, enforcement
remains **in the Addon**, where the sandbox already resides; the core only provides
the resolved rule.

Two invariants support this: the check is in the **host**, not in a
library that the guest could shadow — and the guest cannot **change its own policy**;
there is no `vance.*` call that affects it.

**The server resolves, the client only gets the result** — not for
trust reasons, but because the Tenant's rule set would otherwise be in every
browser. `forbidden` causes the `scan` to **reject**, instead of giving a client the
decision not to mount anything. The client is **fail-closed**: if the policy
does not arrive, nothing is mounted.

### 10a.2 Approval Request via the Inbox

With `forbidden` as default, every new Tenant would otherwise end in a dead end:
a message pointing to a file the reader cannot write. The
button turns this into a process — **forbidden is a question, not a wall.**

The machinery was there and is Addon-capable: `InboxEffect` is in `vance-shared`,
`PermissionRequestEffect` in the Simple-Auth Addon uses the same form. No
core component. Request → `APPROVAL` thread, `CRITICAL` (a `LOW` item with default
answers itself, and running foreign code in foreign browsers
must not be decided by a default) → approval writes the configuration.

Four decisions that determine behavior:

- **What the app proposes, it already says.** `custom.rest` is already "what I
  need" — the request carries this declaration as a proposal, as `restricted`.
  Never `allowed`: "everything" is not something an app has declared.
- **The proposal is frozen.** Stored with the request, not re-read at
  the time of approval: an app that expands its declaration between question and
  answer must not be approved for the expanded scope. The
  `InboxEffect`-SPI says the same generally — `describe()` comes from its own
  storage, never from text controlled by the applicant.
- **Two documents, due to write authority.** `applications.yaml` is
  handwritten, with comments, and is never touched by the server;
  `applications-granted.yaml` belongs to the machine. Precedence is the Kit pattern
  (`installed/` vs. `config/`). A programmatic rewrite of the first would have
  eaten the admin's comments.
- **Precedence: the handwritten file wins where it *names* the app.**
  Grants only fill where it is silent. Thus, revocation is naming and
  not searching for the entry that was once approved.

The recipient is **configured** (`requests: { to: <user> }`), not derived:
"the admin" is not an address, and searching for grants by TENANT-ADMIN
would bind the Addon to a Permission Provider (Simple-Auth is one, the
EE-Governor another). Without a recipient, **no button**, and the message says
why.

**Found during verification:** after a revocation, `release-status` still said
`canRequest: true`. A reader would have asked again, an admin approved — and the
app would still not run, because the handwritten file wins. An approval
without effect is worse than a missing button; checking is now done in both
places, because the client is not the only caller.

Derivation and rejected approaches: `planning/app-governance.md`.

### 10a.3 Later: Signed Apps

The mechanism is open. The **place** is the per-app entry of this file —
exactly where `kit-sources.yaml` carries its signature policy per source
(`off`/`warn`/`required`). The structure does not need to anticipate anything, only
leave the place open.

---

## 11. Dependencies

The dividing line is not effort, but **what the permanent artifact is**. The view schema is a document format: written by agents, delivered in Kits, versioned via `archives`, still readable in five years. A schema that contains `x-component: Input` or `type: input-text` couples this artifact to a library version — in the next major, the documents are legacy data. This is not a dependency risk, it is a data migration risk.

Sandbox, Store, Grid, and Zip, however, are runtime and interchangeable without touching a document.

| | Role | Justification |
|---|---|---|
| **Take** | `quickjs-emscripten` | One does not write a JS engine |
| **Take** | `tinybase` | One does not write a query/index engine |
| **Take** | `@tanstack/vue-table` | Headless = no styling = does not conflict with the `V*` rule |
| **Take** | `fflate` | For the `export` bulk read — no Zip reader in the client |
| **Build** | Manifest and view schema | Document format, see above |
| **Build** | Host API | No library knows the server surface |
| **Build** | View renderer over `V*` | The Style Guide enforces it |

In the client workspace today, there is no Store, Grid, Zip reader, date or validation library; `js-yaml` and `echarts` are present. So nothing is built twice.

**None of these have been taken so far.** It doesn't need them: a read-only table without sorting is a `<table>` with Tailwind layout, rows come via the `table` endpoint instead of the `export` bulk read, and without a write path, there is no state a Store would need to hold. Added are `marked` + `dompurify` (the pattern already used by canvas, centauri, and journal) and `js-yaml`, so the host can give the content of a YAML document as an object to the program instead of sending a parser into the sandbox. The four above are thus not disproven, just not yet due: **QuickJS** when the Foundation Library needs module imports (§6.2.1), TinyBase with the write path, TanStack with sorting and virtualization, `fflate` when the row read moves to a bulk read.

### 11.1 Rejected: amis

The only thing that deserves "comprehensive framework" — ~150 component types, CRUD, forms, dialogs, API binding, all in JSON, in large-scale use. But: the renderer is React (the client workspace today has **zero** React), it brings a second design system, its own API binding convention, and its `type:` names into the documents. That would be a second Vancetope in the tree.

**The component catalog remains useful as a requirements list** — the best available inventory of what a declarative app framework needs. Copy the taxonomy, implement via `V*`.

### 11.2 Rejected: Formily

Supports Vue 3 natively and solves the hard part — reactive field graph with dependency tracking. Against it: `x-reactions` would be a **third** expression language alongside Pebble (server) and the sandbox (client); `x-component` leaks into the documents; and there would be two form engines or a migration of Wizards, Setting-Forms, and Templates. What it does well, Vue's own reactivity provides.

### 11.3 Rejected: Budibase / Appsmith / ToolJet / NocoDB / Grist

Products with their own server, own DB, own auth. Not embeddable.

### 11.4 Rejected: Extism

A real framework for precisely the sandbox-plus-host-API problem, but its JS path is internally QuickJS — a layer without gain if the plugin language is JavaScript in a document.

---

## 12. Web UI Embedding

No new custom HTML entry, no new shell, no second auth context. `_app.yaml` opens in Cortex and Notepad in the immersive App View with `[App|Edit]` toggle; the chat remains next to it. Dispatch via `resolveKind('application:custom')` from the Kind Registry. Everything as described in [doc-kind-application](/specs/doc-kind-application) §7 — Bistromath is another `application:<type>`, just an interpreting one.

### 12a. Who Builds It: The `app-builder` Recipe

**Built** (2026-08-25). A runtime whose purpose is building *by agents* needs an agent who can do it. The Recipe is called `app-builder` ("App Builder — Custom Applications"), runs on **Frankie**, is `listed: true` (thus selectable in the Web UI's Session Picker) and resides **in the Addon** — the same `classpath*:` cascade through which Manuals, template, and `core@1` are already delivered; whoever has the Addon has the Recipe, without anyone creating a document.

**The reason is a single line**, and it was already due before the Recipe existed: `params.manualPaths: [_vance/manuals/bistromath/, _vance/manuals/]`. The Manuals in §9 neighborhood are written **for this reader** — their hooks are called `manual_read('views')`, without a folder. Without a Recipe that prepends the folder, they point to names their reader cannot find: the agent searches, misses, and invents the schema. The global Manual folder remains as a second path, so Kinds, Embeds, and versions are reachable.

**The crucial Tool decision is an absence: no `file_*`, no `exec_*`.** Frankie's baseline passes through the entire Work Target family; here it is completely removed. An app has no file system and no build — `main.js` is a **document**, and saving *is* deployment. If the family remained, a model would sooner or later write the program with `file_write` to a workspace no one reads, and the failure would be **silent**: the write succeeds, the app just doesn't change. The test therefore checks this against `BaseEngineTools.WORK_TARGET` itself and not against a copy of the list — if the family grows, the rejection grows with it. For this, the `doc_*` family is primary, and the **Kind families** (`records_*`/`sheet_*`/`list_*`/`tree_*`) are *deferred* instead of omitted: an app reads and writes precisely these documents as structure (§3.0a), so the agent must be able to edit them with the same tools — as primaries, it would be ~40 schemas per turn for a capability most turns do not touch.

**The prompt explains what a document is, and hooks into the Manuals** — it does not repeat them: `promptInject` already provides folder, view handles, program path, and the open problems of the app the reader currently has open per turn. What the prompt carries is the seam no Manual carries: the three document types, `bistromath_app_create` instead of a handwritten manifest, `app_rebuild` after every change, and the statement that a change needs **no release**.

**Two recipients, two levels — unchanged, now closed.** The flat `app-bistromath.md` remains the entry point for the general agent (Arthur, Eddie) and now carries the delegation hook (`process_spawn(recipe="app-builder")`) for anything more than a label or a column.

**Regarding the name.** Not `bistromath`: §4 states that the codename never appears to the app author, and a Recipe name is in the picker. Not "Web App Developer": a Bistromath app is not a web Project — no HTML, no build, no deploy —, and a reader who hears themselves called that reaches for `npm`, which does not exist here.

---

## 13. Non-Goals (v1)

- **Free DOM.** An app does not draw its own interface. The purpose is that an app can be created without an Addon release and modified by an agent — opaque JavaScript destroys precisely this reason. An `type: html` escape hatch **has since been built** (§5.1) — additively, as
  announced, and through the same sanitizer as `markdown`. It does not shift the
  line: an app still does not draw its own interface; it may
  pass through a piece of markup.
- **Visual Builder.**
- **Background runs, Cron, Scheduler.** See §10.
- **Secondary indices over tables.** Folder scan plus in-memory store.
- **Transactions over multiple rows.**
- **Migration of existing apps** to Bistromath.
- **Offline operation.**

---

## 14. Open Decisions

1. **Key character set** for row filenames (§3.1).
2. ~~**Storage policy.**~~ **Decided and built** (2026-08-25): the mechanism is `If-Match`/412 on `PUT …/content` ([documents-channel](/specs/documents-channel) §5.1a), the policy an implicit version memory per running app — §8.4. The questions about *when to write* have resolved themselves, instead of being answered: the program writes, no widget owns a value. Only the push half (`onDocumentChanged`, §8.5) remains open, and that will only become active when forms accept values.
3. **Bulk JSON Read.** `export` as an archive stream carries the read path. A `POST /documents/bulk-read` would be the clean addition — separate PR, not part of this spec.
4. ~~**`FormFields.vue` to `@vance/components`**~~ **Done** (2026-08-25, §5.2): i18n-free via props with English defaults, thin wrapper in `vance-face` for translations, five call sites in the host unchanged.
5. ~~**Template routing to `application.create()`.**~~ **Built** (2026-08-24, in `vance-brain`): an optional `app:` field in the template definition dispatches to the `VanceApplication` registry — [document-templates](/specs/document-templates) §2a. All 15 app templates have been converted to this, including `custom-app`; §14a.1/§14a.2 below have been updated accordingly. The finding behind it proved even stronger during building than described: not only "none can scaffold", but 13 of the 15 `create()` implementations ultimately call their `refresh()` — the UI path thus consistently delivered a poorer app than the tool.
6. **App manifest validation as SPI.** Still open — but **one half is closed**: the *view* is a registered kind (`app-view`, §5.4) since 2026-08-25, so `kind_validate` reaches it, and the validator is the parser itself instead of a second set of rules. What remains is the *manifest*: `application` is registered as `() -> "application"` and inherits the no-op-`validate`, so **no** app manifest in the tree is semantically checked. An `AppValidator`-SPI per `app:` value would be the general solution; it is deferred (the same point that `links_validate` in the [Links App](/specs/app-links) §7b bypasses).

---

## 14a. Build Status

**Iteration 3** (2026-08-26) extended the surface of an app to what the
reader can do themselves, and at the same time built the switch with which an operator
limits this: `vance.rest` plus three new core routes (§7.1b), five
client tools for the agent next to it (§7.1c), `api@1`/`db@1`/`fmt@1`/`ui@1` (§9.0d),
the `html` widget (§5.1), `onAppRefresh` including `refresh:` rhythm and the renaming
of all hooks to the `onApp*` namespace (§6.4a), and governance with
approval request (§10a). Two things about this were corrections to my own
proposals: approval belongs to the **Recipe**, not the app (every
web client calls the same route), and the check may **remain entirely client-side**
because the guest cannot make authenticated HTTP requests — my first draft
had envisioned a core filter that would have added nothing. A finding belongs
here that did not belong to this Addon: the shared Markdown sanitizer allowed
`<form action="external">` through, thus a product-wide one-click drain of
credentials (§5.1).

**Iteration 2 built. The Hello World runs in the browser** (2026-08-24) — thus the acceptance from §6.0 is met. Module `vance-addon-brain-bistromath`, in the Reactor and in the dev bundles all1/all2. Face wiring was **not** necessary: the host discovers Addons dynamically via `/face/addons` (in Dev via a path-based Vite middleware that scans for a built `client/dist/remoteEntry.js`), and `vance_addon_*/register` is already declared as a wildcard module.

What it carries:

- **Manifest** (`BistromathConfig`): two optional keys, old ones ignored. **View detection** (`BistromathStore.discoverViews`): recursively under the app folder, filtered by the indexed `kind`, handle = filename, collisions and unusable names are reported instead of silently swallowed.
- **View parser** (`ViewParser`) with widget whitelist, handler grammar (`reload` / `navigate:<handle>` / `<program>:<function>`, `:` and not `#`), and rejections for `visibleIf`, `source:`, and the Setting-Form keys — the latter checked against the **raw** YAML, because the shared field parser does not read them at all.
- **`BistromathApplication`**: `create` writes manifest + view + program with three separate guards; `refresh` scans the folder, collects problems, and writes `_index.md` as information about what was found; `describe`/`status`/`targets(NAVIGATE)`/`promptInject` read from the detection.
- **Sandbox** (`sandbox.ts`): null-origin iframe, long-lived per app mount, `init`/`shutdown`, watchdog against hung handlers, host API `vance.state`/`documents`/`ui`. Identity via `event.source`, not via origin — a null-origin frame reports "null", which any other would also do.
- **Client** `application:custom`: recursive widget renderer over `V*`, `from:` as the only binding, view switcher, entry handle with record key, problems and notes next to the page instead of in its place.
- **Three REST routes** (`scan`, `view`, `rebuild`) and **one Tool** (`bistromath_app_create`). Everything else was already there.
- **57 Unit Tests**, including one that parses the generated starter view and checks that button and text line name the same function and state key as the program — the chain, asserted in the document.

**What the Hello World proves** — and it is the entire backbone, in one click: Scaffold writes three documents · the view is **found** via `$meta.kind` (no registry) · the parser accepts it · the renderer draws page/toolbar/button/text · the program is fetched via generic Doc REST · the iframe boots and reports `ready` · indirect `eval` makes top-level functions reachable by name · `init()` runs · `vance.state.set` crosses the bridge · `from:` renders reactively · the click resolves the handler notation and calls the function.

**Second verified: the data path** (2026-08-24). An async handler reads `'/_ext/demo/analysis.yaml?from=…&to=…'` and puts the content into the state. This establishes the other half of "forms, data access, scripts": `vance.documents.read` from the guest, an async handler (the guest awaits the Promise before responding), the resolution of a mounted path via lazy stat — without anyone having listed the folder beforehand — and the **query forwarding to the source**: path to `by-path`, parameters to `…/content`, where `MountQuery.forward` passes them to the mount.

Two deficiencies were uncovered by this step, both fixed before they struck: the watchdog ran **on elapsed time** and would have cleared a read against a slow source as an infinite loop (now silence, see §6.2.1), and the source code was evaluated without `//# sourceURL`, so errors named `<anonymous>` instead of the document.

**Third: the write path** (2026-08-25, built, not yet verified in browser). `vance.documents.write` / `create` / `delete` with the version memory from §8.4. Behind this, two additions outside the Addon: `If-Match`/412 on the content `PUT` (7 tests, [documents-channel](/specs/documents-channel) §5.1a) and three meta variants in `@vance/shared` that pass the `Response` — previously, the REST client discarded the `ETag` that needed to be remembered.

**Before that, a seam that immediately paid off:** the sandbox transport (`sandboxTransport.ts`) separates *where* the program runs from *how* it is communicated with. The protocol is thus testable without a browser (vitest, `environment: 'node'`, a fake guest) — and the 23 tests found **two** errors on the first run, both occurring only under timing: the watchdog was not re-armed during host work (now a counter of open calls, §6.2.1), and a click could overtake program startup because `start()` only took its place in the queue *after* `await ready`. The same cut is the exit point if QuickJS comes: only this file is swapped.

**Fourth: Input** (2026-08-25). `form` is editable, `details` is the read-only twin (§5.1), `vance.state.get` closes the loop: what the reader types lands in the bound state key, the program reads it and decides. For this, `FormFields.vue` has moved to `@vance/components` (§5.2) — the one task outside this Addon that was noted as a precondition since Iteration 2. The state ⇄ form model conversion sits in `formModel.ts` with ten tests on the round-trip assurance.

**Verified in browser** (2026-08-25): Scaffold from template → `documents.list` in guest → `read` per hit → table → click row → type in form → `change` handler reads via `vance.state.get` → `write` creates → reload shows the row. Plus the conflict case: an external write in between, and the save is **rejected** with `'…' changed since it was read` — the document retains the external content.

Two proofs are worth more than the rest here, because they are assertions of the spec and not clicks: the saved YAML carries `amount: 1250` as a **number**, `paid: false` as a **boolean**, and a `note:` that **no form field displays** — the round-trip assurance from §5.2, on the real document.

**And a bug that only the browser could find:** `documents.list` returned paths as the server knows them — project-relative. A program, however, writes its paths **app-relative**, so the host resolved them a second time and searched for `apps/demo/apps/demo/invoices/…`. The example in the Manual (`read(f.path)` directly after `list`) was precisely this case. Fixed by the listing using the grammar it already has for this: **leading slash = from project root**. No test would have found this, because both sides were correct individually; only the round-trip over two calls is wrong. Now two tests for this.

**Fifth: Reacting** (2026-08-25, verified in browser). The app subscribes to its own folder (§8.5). Two proofs: an externally created record appears in the table without anyone pressing anything (`onDocumentChanged` → the program reloads), and an external change to the **view** reloads the app itself — the heading changes without a Rebuild click. For this, hooks can now carry arguments (`invoke` passes `args` to the guest) and `invokeHook` is silent if the program does not have the hook — the opposite of `invoke`, where a missing *handler* remains a visible author error.

**Sixth: Composition** (2026-08-25, verified in browser). `show:` on every widget, `repeat`, `embed`, `dialog` — all four clicked through in one view: hidden widgets remain hidden, the card list shows both records via element scope, the embedded manifest renders via the Cortex renderer, and the confirmation dialog opens, deletes, and closes (which also proves `documents.delete`).

**A second finding here, again one that only a real document shows:** the YAML loader swallowed **every** syntax error and returned `null`, whereupon the parser reported "is not a YAML mapping — a view starts with `type: page`". The author then searches in line 1 of a document whose line 1 is fine. SnakeYAML knows line and column; passing that on is strictly more useful than guessing. The hindsight had **not a single** user in production — `load` has exactly one caller, and it was made a liar by it.

**Seventh: Author Comfort** (2026-08-25, verified in browser). The view is a registered kind (§5.4) — Cortex shows `[kind-registry:app-view]` and renders the preview, the `show:`-gated widgets remain correctly hidden within it. Plus the seventh Manual (`troubleshooting`), which the overview promised since Iteration 2 and which did not exist.

**Eighth: Kind Codecs** (2026-08-25, verified in browser, §3.0a). A program reads `apps/demo/table.md` (`kind: records`) as `{schema, items}`, renders it in a Bistromath `table`, appends a row, and writes back — the document on disk is then an **intact** `kind: records` with an unchanged header, and the `embed` next to it shows the same data through the built-in Records renderer.

**A finding in the codecs themselves here, which no fixture could find:** the TS halves assumed that every optional collection is present, while the Java twins normalize them in the compact constructor. A caller who **builds** a document instead of parsing it — precisely what a program does when appending a row — crashed on `item.overflow is not iterable`. The parity corpus could never show this: its inputs are well-formed by design. Fixed in all four codecs, with its own test; a well-formed document serializes byte-identically, the corpus remains untouched. The schema requirement for `records` is **not** relaxed here — it is a rule of the format, not a missing default.

Updated: the Javadocs of the nine Java codecs all pointed to `vance-face/src/document/*Codec.ts`, a path that **already** no longer existed. A wrong pointer between two halves of a parity pair is precisely what causes them to diverge.

**Ninth: Direct Inputs** (2026-08-25, verified in browser). `input`/`number`/`toggle`/`select` plus `row` (§5.1). The assertion that matters was proven: `Amount=1250 (number)`, `Customer="Acme GmbH" (string)`, `onlyBig=true` as boolean, and `select` writes the **value** (`paid`), not the label (`Paid`). A live filter over three controls with `on.change` runs.

**Tenth: Markdown like Vancetope** (2026-08-25, verified in browser). A `records`-fence renders as a **table in the Markdown** of a Bistromath app, the `vance:`-link is a real anchor that Cortex intercepts, no `<pre>` remains. Plus `column` and the `show:`-in-`tabs` fix.

**Eleventh: Sortable and Filterable Table** (2026-08-25, verified in browser). Twelve rows, filter field appears, three clicks on `amount` give 68..831 / 831..68 / the program order — numerical sorting is thus proven, because lexicographically "146" would come before "68". Filter across all columns (`831` finds the row via the amount column), filter with no hits shows its own message.

**Twelfth: The Six Passed Through** (2026-08-25, verified in browser). `card`/`badge`/`alert`/`code`/`pagination`/`file` render, the `show:`-gated `alert` remains hidden, the pager writes `page=1` as a **number** back, and an inserted `import.csv` arrives at the program as "34 bytes, first line: item,amount". This fulfills §5.1a: broaden instead of passing props, one enum entry plus one branch.

**Thirteenth: The Load List** (2026-08-25, verified in browser, §6.3). Proven in one line of program output: `core: 1250.00 EUR | helper[2] db2:99.00 EUR | db@2` — a library is callable, an app-local script is callable, and the helper received `db@2` even though it requested `db@1`, with the warning. The `Loads` panel shows four entries in the resolved order.

**Fourteenth: `core@1`** (2026-08-25, verified in browser, §9.0c). `core@1: 12 rows, page 1/3, largest amount 831.00` with a descending sorted table, the `Loads` panel says `core@1 bundled`, and `core.save` writes (`saved: k01`). A test actually evaluates the **bundled file** (`new Function` with a `vance`-stub, one scope, one script — the runtime contract); without it, a typo in the resource would only be noticed in the browser.

**Fifteenth: The Program Shapes the View** (2026-08-25, verified in browser, §5.1b). One click: the form title becomes "Shaped by Program", the `internal` field disappears, `Customer` is called `Client` with help text, the `select` options become `open`/`Paid`, the badge is gone — and `reset()` restores all five from the document. A test nails down that a patch with `on:` and `from:` changes **nothing**.

**Sixteenth: The Canvas** (2026-08-25, verified in browser, §6.2.2). `region: 260` → Frame 1642×260; the program draws twelve tiles with its own grid CSS in its document, and a click on a tile runs in the guest and reports "1 of 12 selected in grid" to the view's text widget. Both directions thus: the program owns the rectangle, and it can communicate with the widget tree from there.

**Seventeenth: `vance.app`** (2026-08-25, verified in browser, §7.1a). `folder=apps/demo project=test1 tenant=acme user=marvin.acme docPath=apps/demo/_app.yaml | view=ctx session=null` — constants read at the top level (without `await`, which is the point), `current()` with the running view, and a local file via the relative path. `session=null` is correct in the chatless tab; the **non-null case is wired, but untested** — sessions arise via WS with LLM creds that the test DB does not have.

**What is not yet proven:** `shutdown()` on unmount, a truly firing watchdog, multiple views with `navigate:` and `landing:`, and `repeat`/`multi_select` **in the form** (the `repeat` widget is different from the `repeat` field type).

What the spec still lacks: the Foundation Library (§9), `visibleIf`, the reserved widgets, and the push half of §8.4.

### 14a.1 Two Ways to Create, and They Are the Same

**Document Template `custom-app`** (`_vance/templates/custom-app.yaml`, without body) — the UI path, "Template" tab in the Create dialog. Asks for title and description, nothing else.

**`bistromath_app_create`** — the same setup for the agent.

Since `app:` routing ([document-templates](/specs/document-templates) §2a), these are two *surfaces* to **one** call: both land in `BistromathApplication.create` and write manifest, view, and program — a Hello World that runs.

The table field is gone. It asked for a concept the runtime no longer has (§3), and was simply wrong for any app without data.

### 14a.2 What Iteration 2 Changed

Iteration 1 was a read-only renderer over declared tables. What fell from it, fell on demand when testing the first real app:

| Old Way | Replaced By |
|---|---|
| `views[]`, `tables[]`, `scripts[]`, `schemaVersion` in manifest | View = document with `$meta.kind: app-view`; Program = `main.js`; Manifest carries at most `landing` and `init` |
| Prescribed folders `views/`, `scripts/`, `data/` | None; the header says what a document is (§4.1) |
| `source:` on the widget | `from: <state_key>` — the only binding |
| `TableRef`/`TableData`/`TableRow`, endpoint `/table` | Nothing: the program reads documents via generic Doc REST (§3) |
| Markdown memo as scaffold | Hello World with button, date, and `init()` |

Newly built: the sandbox (`sandbox.ts`, null-origin iframe, §6.2.1), `init`/`shutdown` with watchdog, the host API `vance.state`/`documents`/`ui`, folder scan in `refresh()` with `_index.md` as information about what was found, and the three guards in `create()` (manifest, view, program individually — each can survive its manifest).

The Addon REST has shrunk to **three** routes: `scan`, `view`, `rebuild`. Everything else was already there.

**What Iteration 2 cannot do:** `visibleIf`, module imports, `if`/`repeat`/`chart`/`dialog`, cross-project paths. (Writing and input were added on 2026-08-25, see above.)

**Backward compatibility:** the two test apps from Iteration 1 no longer run. Their `views/main.yaml` has no `$meta.kind: app-view`, so it is not found; the old manifest keys are ignored (not rejected), but it remains an app without a view. Creating new ones is the way — for two throwaway apps, the right price.

## 15. Beyond v1

Cortex dynamically registers **Client Tools** with the Brain, and the chat sits next to the App View. A Bistromath app could register its actions as Client Tools — then **the agent operates the app**. This is the point where the runtime becomes more than a form generator, and the reason to keep a view's action list as data from the start and not as closures in the script.
