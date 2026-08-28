# Vancetope Application — `app: binder`

> Lightweight **reference binder** built on the [doc-kind-application](doc-kind-application.md)
> foundation. One folder + `_app.yaml` = one binder. Unlike
> [workbook](app-workbook.md) (⊃ `workpage`) and [canvasbook](app-canvasbook.md)
> (⊃ `canvas`) — both *single-kind* and *folder-derived* — a binder anchors an
> explicit, ordered list of `vance:` **references** to documents of **any kind**
> that live **anywhere** in the project. The right pane renders each reference
> per-kind read-only via the host embed component; editing is delegated to
> Cortex via a deep-link.
> See also: [app-links](app-links.md) (external counterpart),
> [app-workbook](app-workbook.md) / [app-canvasbook](app-canvasbook.md)
> (pattern model), [cortex](cortex.md) (editing target), [doc-kind-application](doc-kind-application.md).
> Implementation track: [`planning/app-binder.md`](../../planning/archive/app-binder.md).
> Standalone addon `vance-addon-brain-binder`.

---

## 1. Purpose

The `binder` fills a gap between Cortex (project-wide FileTree, everything)
and the single-kind container apps: a **curated, ordered, section-grouped
folder** for arbitrary documents. Use cases:

- Bundle a `finance-tree` plus its exported `sheet`/`chart`/`markdown` reports
  in **one** view (the original Finance app request — solved as a special case
  of the generic app, no special Finance code).
- A spec plus its supporting notes, a research set, a reader shelf.

A Binder does **not hold** the documents — it **points to** them. The target doc
continues to live at its path and is edited by its own tools/editors.

## 2. Folder Layout & Manifest

```
finance/plan/
├── _app.yaml          ← kind: application, app: binder
└── _index.md          ← auto-generated (link list), only refresh() writes
```

The Binder folder is typically almost empty — the Refs point outwards.

```yaml
$meta: { kind: application, app: binder }
title: "Financial Planning 2026"
description: "Plan + exported Reports"
binder:
  landingRef: "vance:/finance/plan.finance-tree.yaml"   # optional Default entry
  entries:
    - ref: "vance:/finance/plan.finance-tree.yaml"        # title/kind resolved from target
    - { ref: "vance:/reports/q1.sheet.yaml", section: "Reports" }
    - { ref: "vance:/reports/q1-verlauf.chart.yaml", section: "Reports", title: "Q1 Progress" }
  index: { outputPath: "_index.md" }
```

Discovery: `listByKind(..., "application")` + Header `app == "binder"`. Manifest
is written via `ApplicationDocument` + `ApplicationCodec` (never manually).
For the web create dialog, the addon provides a bundled
[Document-Template](document-templates.md) `binder` (`app: binder`, §2a) — it
runs through `BinderApplication.create` like the tool; entries come afterwards
in the editor.

### 2.1 Entry Model

| Field | Required | Meaning |
|-------|----------|---------|
| `ref` | yes | Target document, canonical `vance:/<path>?kind=<kind>`. Add/Remove/Landing compare **path-normalized** (with/without `?kind=` irrelevant). |
| `section` | no | Sidebar grouping label. **Pure UI ordering — no Scope**, no rights/cascade. Empty ⇒ the leading "no section" group. |
| `title` | no | Display override; otherwise the resolved Doc title. |

Order = Array order (grouped-contiguous after each reorder). A Ref whose target
has been deleted/moved is **dangling**: `exists=false` — the sidebar shows it
as ⚠ "missing" with a "Remove" action, **no** auto-prune.

## 3. Generated Artifact — `_index.md`

A `kind: workpage` document (link list grouped by section, dead Refs skipped with
⚠ note), deterministically generated from the manifest, only
`BinderApplication.refresh` writes. Useful for RAG ("where is my
finance binder") and reading outside the app.

## 4. Java Foundation

`de.mhus.vance.addon.brain.binder`:

- `BinderApplication` (`@Service implements VanceApplication`, `appName()="binder"`)
  — `create()` writes manifest, `refresh()` regenerates `_index.md`,
  `promptInject()` provides the Active-App-Hint, **`describe()` + `status()`**
  feed the [Common-Desktop](damogran-system.md) card (Icon 🗂️ + Deep-Link,
  Status "N Documents" with per-entry Deep-Links → **the Desktop jump**).
- `BinderConfig` — typed, lenient view of `config.binder`.
- `BinderEntry` — Manifest-level Entry-Record.
- `BinderResolver` — resolves Refs via `DocumentService` (data authority) to
  `{ref,id,path,title,kind,mime,section,exists}`; sole location of
  `vance:`-Ref ⇄ Path normalization.
- `BinderManifestOps` — atomic read-modify-write (add/remove/reorder/section/
  landing) via `ApplicationCodec` + `DocumentService`.
- `BinderAppController` — REST under `/brain/{tenant}/addon/binder/...`
  (`RequestAuthority`-Enforcement).

## 5. REST

All with `?projectId=`, `RequestAuthority.enforce`:

| Method | Path | Authority |
|--------|------|-----------|
| `GET` | `/scan?folder=` | READ |
| `POST` | `/entry?folder=` (Body `{ref,section?,title?}`) | WRITE |
| `DELETE` | `/entry?folder=&ref=` | WRITE |
| `POST` | `/reorder?folder=` (Body `{orderedRefs}`) | WRITE |
| `POST` | `/entry/section?folder=` (Body `{ref,section?,title?}`) | WRITE |
| `POST` | `/landing?folder=` (Body `{ref?}`) | WRITE |
| `GET` | `/documents/search?query=&size=` | READ |
| `POST` | `/rebuild?folder=` | WRITE |

`section` receives the title override if no `title` is provided (section move
does not clobber the title; rename sends current section + new title).

## 6. LLM Tools

| Tool | Purpose |
|------|---------|
| `binder_app_create(folder, title?, description?, entries?, landingRef?, overwrite?)` | Bootstrap: Manifest + optional Entries + `_index.md`. |
| `binder_entry_add(folder, ref, section?, title?)` | Attach document (idempotent on the target path). |
| `binder_entry_remove(folder, ref)` | Detach reference (target untouched). |
| `app_rebuild(folder)` | Generic — regenerates `_index.md`. |

Reorder/Section/Landing are **REST-only** (UI operations); add/remove suffice
for agentic anchoring. Manual: `manual_read('app-binder')`.

## 7. Web-UI

Kind registration `application:binder` → `BinderAppKind.vue` (id-Lookup,
`matches: () => false`), immersive app view (§7.2 of the App Spec).

- **Sidebar (left):** Title, "+ Attach" (Doc-Picker via `/documents/search`),
  "↻ Rebuild", Filter. Entries **grouped by section** (leading "no
  section"), per entry Kind-Icon + Title, Landing-📌, dangling-⚠.
  **Drag&Drop-Reorder** (native; Drop on an entry reorders + adopts its section
  on group change; Drop on a section header moves into the section). ⋯-context menu:
  Change section / Rename / Set as Landing / Remove.
- **Main area (right):** the active Ref read-only via the host-injected
  `vance:embed-component` (rendered correctly per Kind). Header: Path, **↻ Reload**,
  **"Edit in Cortex ↗"** (`/cortex?project=…&doc=<id>`). Dangling ⇒
  Hint + Remove. Reports the open Ref as Chat-Active-Subdoc
  (`vance:report-active-subdoc`).

## 8. Anti-Patterns / v1 Limits

- **No** editing within the Binder — it only references; content changes happen
  via the target Doc (Cortex/Tools).
- Only Project-Document-Refs (`vance:/<path>`), no Binder-in-Binder (v2).
  **External URLs are not planned** — they have become a separate app
  ([app-links](app-links.md)): a project document has path and kind (and thus
  Embed-Renderer and editing target), an external page has neither. An
  entry model for both would be wrong for each half.
- No live reaction to target Doc changes (Reload button; Prefix-Watch v2).
- No auto-prune of dead Refs.
- **v2:** Inline-Editing on the right where the Kind has a kind-registry-`editor`;
  individual subscriptions to visible Refs (live reload);
  Finance-Preset as Kit/Template (finance-tree + Binder in one bootstrap).
