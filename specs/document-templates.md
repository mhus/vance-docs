---
title: "Vancetope — Document Templates"
parent: Specs
permalink: /specs/document-templates
---

<!-- AUTO-GENERATED from llm/specification/document-templates.md (translated from the German specification/public/document-templates.md) — do not edit here. -->

# Vancetope — Document Templates

> A **Document Template** is a named template from which the web UI generates finished file content when creating a new document. Unlike the previous static Kind stub generator (`buildKindStub` in the frontend), a template is **not** bound to Mime/Kind — type and Kind are derived from the template itself. Some templates allow free choice of filename, others enforce a fixed name (e.g., `_app.yaml` for Application manifests).
>
> A Document Template is essentially a [Wizard](/specs/wizards) whose output is a **file** instead of a prompt text: the same form engine, the same Pebble rendering — only the result doesn't go into the chat input, but is written as a new document.
>
> **Persistence:** Templates are stored as a YAML definition + separate body file under `_vance/templates/` in the Document Layer. The cascade lookup `project → _tenant → classpath:vance-defaults/_vance/templates/` runs via [`DocumentService.lookupCascade`](../../repos/vance/server/vance-shared/src/main/java/de/mhus/vance/shared/document/DocumentService.java) — the same mechanism as Recipes, Wizards, Setting Forms, and the Model Catalog.
>
> See also: [wizards](/specs/wizards) (shared form engine) | [setting-forms](/specs/setting-forms) | [cortex](/specs/cortex) (Create dialog) | [doc-kind-application](/specs/doc-kind-application) | [app-workbook](/specs/app-workbook)

---

## 1. Terms and Delimitation

| Term | What it is |
|---|---|
| **Document Template** | A pair of definition YAML (`<name>.yaml`) + body file (`<name>.tmpl.<ext>`). Produces exactly **one** new document upon application. |
| **Application Template** | A definition **without** a body, which instead declares `app: <name>`. Applying it calls `VanceApplication.create()` of this app; the app writes the manifest **and** its derived artifacts. See §2a |
| **Definition** | The `<name>.yaml`: picker metadata (title, description, icon, tags), optional form (`fields:`), name policy (`name:`), optional type override (`type:`). |
| **Body** | The `<name>.tmpl.<ext>`: the actual file content as a Pebble template. The extension determines (by default) the target type; the content carries the target Kind in its own frontmatter/`$meta`. |
| **Form-Field** | A single input element (string, textarea, boolean, select, …). Shared infrastructure with [Wizards](/specs/wizards) and [Setting Forms](/specs/setting-forms) — the same `FormFieldDto`, the same `FormFields.vue` renderer, the same `FormValidator`. |

**Document Templates are not a Spawn path.** A template only generates file content and writes it via the normal [`DocumentService`](../../repos/vance/server/vance-shared/src/main/java/de/mhus/vance/shared/document/DocumentService.java) path (Auth, Audit, Lock-Check, Change-Events). No Engine, no Lane-Lock, no Tool-Routing.

**Exactly one document — except for `app:`.** A regular template always writes **one** file. An Application Template (§2a) does not write itself: it delegates to the app, and what is created (manifest, `_index.md`, a first view) is decided by the app. This is the only exception and it is not a softening of the rule, but its consequence — the alternative would be to duplicate the manifest format in a Pebble body, where it would inevitably lag behind the Java code (see §2a).

**Relationship to the previous Kind stub.** The static `buildKindStub` path in the Create dialog ("Enter content" tab with Mime + Kind + Editor) **remains unchanged** as a manual fallback. Document Templates are additive: a new tab **before** the existing ones. The 15 Kind stubs are **not** migrated to bundled templates in this expansion stage.

---

## 2. Template Definition (YAML)

The `<name>.yaml` has the following top-level fields. The `name` comes from the filename (`_vance/templates/<name>.yaml`), not from a field:

| Field | Type | Required | Meaning |
|---|---|---|---|
| `title` | `LocalizableText` | yes | Display name in the Template Picker |
| `description` | `LocalizableText` | yes | Short description (1-2 lines), appears below the title |
| `icon` | `String` | no | Heroicon name (see [web-ui](/specs/web-ui) §7) |
| `tags` | `List<String>` | no | Free tags for filtering/grouping in the picker (e.g., `app`, `planning`, `note`). See §3 |
| `app` | `String` | no | Discriminator of an [Application](/specs/app-workbook). Set ⇒ applying dispatches to `VanceApplication.create()` instead of rendering a body; `name` and `type` are then **forbidden**, a body is ignored. See §2a |
| `name` | `NamePolicy` | no | Controls filename (free vs. fixed). Default: `{ mode: free }`. See §5 |
| `folder` | `String` | no | Fixed target folder. If missing, the caller chooses. See §5 |
| `type` | `String` (Mime) | no | Explicit type override. If missing, the type is derived from the body extension. See §8 |
| `fields` | `List<FormField>` | no | Input fields for dynamic customization (Paddle). If the block is missing, the template is static (body is still rendered by Pebble, but only with basic context). See §7 |
| `body` | `String` | no | Override for the body filename within the same tier. Default: convention `<name>.tmpl.*` (§3) |
| `availableIn` | `List<String>` | no | Glob pattern list on `projectId` for listing visibility. Default `["*"]`. Identical to [Wizards §2a](/specs/wizards) |

**LocalizableText** is a map from language code to string, e.g., `{ de: "Meeting-Notiz", en: "Meeting note" }`. When rendering, the Tenant default language is used, with fallback to the first available entry.

---

## 2a. `app:` — Application Templates

A definition with `app: <name>` has **no body**. Upon application, nothing is rendered; instead, `TemplateService` calls `VanceApplicationRegistry.require(app).create(…)` and passes the form values as `params`.

```yaml
title:       { de: "Kanban-Board", en: "Kanban board" }
description: { de: "Ein neues Board", en: "A new board" }
icon: view-columns
tags: [app, kanban, planning]

app: kanban          # instead of name:/type: and instead of <name>.tmpl.yaml

fields:
  - name: title
    type: string
    required: true
    label: { de: "Titel", en: "Title" }
```

**Why this was necessary.** A template body can only write one document — i.e., only the `_app.yaml`. However, the `create()` implementations write more: 13 out of 15 eventually call their own `refresh()` (Index, Board, Gantt), Workbook and Wiki seed a first page, Bistromath a first view. As long as the app templates typed their manifest via Pebble, the UI path systematically delivered a **poorer** app than the Tool — and a second, manually maintained schema that lagged behind the Java code (Workbook: `showDescriptions`/`groupBySection`/`defaultPageKind` were missing in the body). `app:` eliminates both: the manifest format has exactly one author, and `*_app_create`-Tool and template tab are the same call.

**Rules:**

| Rule | Behavior |
|---|---|
| `app:` + `name:` | **Load error.** The app owns the filename (`_app.yaml`) |
| `app:` + `type:` | **Load error.** The app owns the Mime type |
| `app:` + existing body | Body is **ignored** + WARN. Not an error, because the body can come from a deeper cascade tier that the definition author does not see — making a template disappear entirely due to an invisible file would be worse than a warning |
| Name Policy | The loader **synthesizes** `mode: fixed`, `value: _app.yaml`. This keeps the Create dialog unchanged: for `fixed`, it only shows the folder, no name field |
| Target Folder | The caller's folder **is** the app folder (a `folder:` in the definition wins as usual). No folder ⇒ 400 — a manifest in the project root would make the entire project an app |
| Already exists | `TemplateService` checks `<folder>/_app.yaml` **before** dispatching and throws `DocumentAlreadyExistsException` ⇒ **409**, as with any other template. Without the pre-check, each app would get its own `ToolException` with a different status |
| Authorization | `TemplateService` enforces `Document CREATE` on the manifest path with the authenticated Subject **before** dispatching. Necessary because `CreateContext` only carries a nullable `userId` and apps derive their `WriteActor` from it: with an empty `userId` (Service Account Subject), this would become `SecurityContext.SYSTEM` and the check would be omitted. Same pattern as `ForeignAccessSupport` — enforcement at the call site |
| Field Types | The form values are **re-typed** along the declared field types (`integer`, `boolean`) before dispatch. The web form submits everything as a string, but apps read their params with `instanceof Number`/`instanceof Boolean` — without coercion, a typed value would silently fall back to the app's default |

**What the Apply returns** remains `{ path, mimeType }` — `path` is the manifest path. `CreateResult` carries more (`lanes`, `artefacts`, `nextStep`), which is the return channel for the LLM Tool path and has no consumer in the REST response.

---

## 3. The Two Files — Definition + Body

A template consists of **two** documents in the same directory, distinguished by the `.tmpl.` infix in the body:

```
_vance/templates/meeting-notes.yaml        # Definition
_vance/templates/meeting-notes.tmpl.md     # Body (Pebble), extension = target type
```

**Why two files:** The body can be any type (`md`/`json`/`yaml`/`js`/…). As a separate file with the target extension, it retains native syntax and editor highlighting during authoring — no escaping into a YAML string field.

**Pairing (Convention):** For `<name>.yaml`, the body is resolved via glob `<name>.tmpl.*` through the cascade. Both files are delivered by convention **together in one tier** — then the body loader wins the same tier as the definition (preferring same-tier). If a higher tier only overrides the definition, the body of the underlying tier is reused (useful for adapting only metadata/form and inheriting the body). An optional `body: <filename>` in the definition overrides the glob convention (e.g., if multiple templates should share the same body).

**If the body is missing:** The `TemplateLoader` does not include the template in the listing and logs a WARN (fail-soft, analogous to invalid Wizards). **Exception:** a definition with `app:` does not require a body (§2a).

**Tags** are used for filtering in the picker. Application Templates, for example, have `tags: [app]`, note templates `tags: [note]`. The picker offers tag chips as filters; without filters, all visible templates are shown. Tags deliberately replace a fixed "group" — multiple tags per template are allowed and more flexible than a single category.

---

## 4. Cascade — How a Template is Resolved

For listing (`GET /brain/{tenant}/templates`) and applying (`POST /brain/{tenant}/templates/{name}/apply`), the same cascade runs as for Recipes and Setting Forms — **three tiers** (the `_user_` layer of Wizards is omitted in v1, personal templates are a later topic):

```
load(tenantId, projectId, name) → Optional<ResolvedTemplate> :=
  documentService.lookupCascade(tenantId, projectId,
                                "_vance/templates/" + name + ".yaml")
    1. Project:  <project>/_vance/templates/<name>.yaml                  → source = PROJECT
    2. _tenant:  _vance/_vance/templates/<name>.yaml *)                  → source = VANCE
    3. Resource: classpath:vance-defaults/_vance/templates/<name>.yaml   → source = RESOURCE
    4. → empty
```

*) Tenant-Layer = the Tenant Project (`HomeBootstrapService.TENANT_PROJECT_NAME`), under the `_vance/templates/` prefix.

The associated body (`<name>.tmpl.<ext>`) is loaded **from the same tier** where the definition was found.

When **listing**, all three layers are aggregated and deduplicated by `name` (first layer wins). The listing result contains `name, title, description, icon, tags, source` — no fields, no body.

When **applying**, exactly one template is resolved via cascade, validated + rendered with the posted form values, and written as a new document.

---

## 5. Name Policy & Target Path

The `name:` section controls the filename of the generated document:

| Field | Type | Required | Meaning |
|---|---|---|---|
| `mode` | `String` | no | `free` (Default) or `fixed` |
| `default` | `String` (Pebble) | no | Pre-filling of the name field for `mode: free` (e.g., `meeting-&#123;{ date }}`). Without extension — that comes from the type (§8) |
| `value` | `String` | only for `fixed` | Fixed filename including extension (e.g., `_app.yaml`) |

**Path and name separated — as with "new document".** The Create dialog separates target folder (path) and filename into two input fields (identical to the existing Create flow):

- **`mode: free`** — Name field editable, optionally pre-filled with `default`. The folder is freely selectable.
- **`mode: fixed`** — Name field is locked and shows `value`. The user only selects the **folder** (e.g., `my-notes/` → the template writes `my-notes/_app.yaml`). Application Templates thus live in their own folder, without the definition enforcing a fixed folder — however, they do **not** declare `name:` themselves (this is a load error for `app:`), the loader synthesizes it (§2a). The dialog needs no special handling for this: it sees `fixed` and only shows the folder selector.

**`folder:` — when only one location is correct.** If the definition declares a folder, it wins over the caller's, and the dialog displays it instead of a folder selector. This is for templates whose result is **only read in one place**: a source configuration under `_vance/config/research/` is read by a loader with a fixed prefix, so leaving the folder free can only create a file that no one reads. Without `folder:`, everything remains as before; `..` is rejected during loading, because a template is authored configuration, and the loader is the place where authored configuration is checked.

**No Overwrite.** If the target file already exists, the Apply fails with an error (HTTP 409). Templates **never** silently overwrite existing documents.

---

## 6. Pebble Rendering & Context

The body is a Pebble template with the same syntax subset as [Recipe Prompts](/specs/recipes) and Wizards — `&#123;{ var }}`, `&#123;% if/elseif/else/endif %}`, `&#123;% for x in xs %}`, `&#123;% raw %}`. Compile validation happens during template load (fail-fast: invalid templates do not appear in the listing). Rendering is done via the existing `PromptTemplateRenderer`, but through its **`renderStructured`** path.

**Line breaks are preserved — unlike with Prompts.** Pebble's default swallows the line break directly after a tag. This is correct for prompts (an `&#123;% if %}` alone on a line should not leave a blank line), but for file content, it is destructive: `title: &#123;{ topic }}` on its own line would stick the following line to the value, thereby tearing apart frontmatter or YAML structure — not a cosmetic flaw, but a syntax error. Template bodies are therefore rendered without newline trimming. Price: a block tag alone on a line leaves a blank line, which both YAML and Markdown ignore.

### Render Variables

| Variable | Source | Notes |
|---|---|---|
| `<field name>` | directly from user input per Field | Scalars for `string`/`textarea`/`boolean`/`select`; lists for `multi_select`/`repeat`. Only if `fields:` is defined |
| `name` | The final chosen filename (without path) | for templates that derive their own title/slug from the name |
| `date` | Current date (Tenant timezone) | via the existing Date Context Resolver |
| `user` | Current user (Username) | |
| `project` | Current Project name | |
| `lang` | Tenant default language | |

The `name` is available to the body because a frontmatter `title` or similar should often be derived from the filename — without us subsequently injecting frontmatter into the content (that would be forbidden content manipulation; the body builds its own `$meta`/frontmatter itself).

---

## 7. Form (Paddle) — Optional Dynamic Customization

If a `fields:` block is defined, the picker shows the form after template selection. The field types, the common field schema (`name`/`type`/`label`/`help`/`required`/`defaultValue`/`choices`/`rows`/`min`/`max`/`item`), the `FormChoice` structure, and the synchronous `FormValidator` validation are **identical** to [Wizards §3/§6](/specs/wizards) — the same engine, no new code.

If the `fields:` block is missing, the template is static: the body is still rendered by Pebble (basic context from §6), there is just no form step.

**Example — `_vance/templates/meeting-notes.yaml`:**

```yaml
title:       { de: "Meeting-Notiz", en: "Meeting note" }
description: { de: "Strukturierte Notiz für ein Meeting", en: "Structured note for a meeting" }
icon: clipboard-list
tags: [note, meeting]

name:
  mode: free
  default: "meeting-&#123;{ date }}"

fields:
  - name: topic
    type: string
    required: true
    label: { de: "Thema", en: "Topic" }
  - name: attendees
    type: textarea
    rows: 3
    label: { de: "Teilnehmer", en: "Attendees" }
```

**`_vance/templates/meeting-notes.tmpl.md`:**

```markdown
---
kind: workpage
title: &#123;{ topic }}
---

# &#123;{ topic }}

_&#123;{ date }}_

## Teilnehmer
&#123;{ attendees }}

## Notizen

## Action Items
- [ ]
```

**Example Application Template — `_vance/templates/workbook.yaml`** (no body, §2a):

```yaml
title:       { de: "Workbook-App", en: "Workbook app" }
description: { de: "Ordner-Container für Workpages", en: "Folder container for workpages" }
icon: book-open
tags: [app, workbook]

app: workbook

fields:
  - name: title
    type: string
    required: true
    label: { de: "Titel", en: "Title" }
  - name: description
    type: textarea
    rows: 2
    label: { de: "Beschreibung", en: "Description" }
```

The field names here are **not** a free choice: they are the keys that `WorkbookApplication.create` reads in `ctx.params()`. An `appTitle` instead of `title` would not be misspelled, but silently ineffective — the app would fall back to its own default. The params of each app are in the Javadoc of its `create()` method.

---

## 8. Type Resolution

The **file extension** of the generated document always comes from the body (`<name>.tmpl.<ext>`) or, for `mode: fixed`, from `name.value`. For `mode: free`, the body extension is appended to the name entered by the user, if it does not have its own extension.

The **Mime type** is determined as follows:

1. **`type:` set in the definition** → authoritative, overrides the Mime of the generated document. Use case: if the body extension does not map cleanly to a Mime or should deliberately deviate. The file extension remains untouched.
2. **`type:` missing** → derived from the target file extension (`.md` → `text/markdown`, `.yaml` → `application/yaml`, …), using the same extension→Mime table as the Create dialog.

The **Kind** of the document is **never** set from the definition — it is in the rendered body (`kind:` frontmatter for Markdown, `$meta.kind` for JSON/YAML), where the Kind renderers expect it. The definition deliberately does not contain a `kind` field: duplicate handling would drift and force the content injection hack that project rules prohibit.

For `app:` (§2a), this section does not apply: extension, Mime, and Kind are determined by the Application — `type:` is forbidden there, and `$meta.kind: application` is set by the manifest codec.

---

## 9. API

### `GET /brain/{tenant}/templates`

Lists resolved templates for the current context (Project + Tenant + Bundled), filtered via `availableIn`. Optional query param `?tag=<tag>` filters server-side. Response:

```json
{
  "templates": [
    {
      "name": "meeting-notes",
      "title": "Meeting-Notiz",
      "description": "Strukturierte Notiz für ein Meeting",
      "icon": "clipboard-list",
      "tags": ["note", "meeting"],
      "nameMode": "free",
      "source": "RESOURCE"
    }
  ]
}
```

Title/Description are already resolved to the Tenant default language. `nameMode` allows the picker to render the name field locked/free without loading the full definition.

### `GET /brain/{tenant}/templates/{name}`

Returns the full definition including `fields` (for rendering the form). The Pebble body is **not** delivered — it remains backend-only.

### `POST /brain/{tenant}/templates/{name}/apply`

Body: `{ folder: string, name?: string, values?: Record<string, FormValue> }`.

1. Cascade resolution of definition + body.
2. `FormValidator` over `values` (if `fields:` is defined).
3. Determine target path: `folder` — that of the definition, otherwise that of the request — + (for `mode: free`: `name`; for `mode: fixed`: `name.value`).
4. **Overwrite check** — if the file exists, HTTP 409.
5. Render body via Pebble (context §6).
6. Write document via `DocumentService` (type from §8, Lock-Check, Change-Event).

For a definition with `app:` (§2a), steps 3-6 are replaced by: determine folder → enforce `Document CREATE` → check manifest existence (409) → re-type field values → `VanceApplication.create()`.

Response: `{ path, mimeType }` — the frontend's Create flow then opens the file in the appropriate editor; for `app:`, `path` is the manifest path. Errors: 400 for form errors, unusable params (`ToolException` of the app) or missing folder; 403 if authorization applies; 409 if the target exists.

---

## 10. UI Integration (Web)

The "New Document" dialog ([`CreateDocumentModal.vue`](../../repos/vance/client/packages/vance-face/src/cortex/components/CreateDocumentModal.vue)) gets a **third** mode tab, **prefixed**:

```
[ Template ]  [ Enter content ]  [ Upload ]
```

**Template Tab:**

1. On opening: `GET /templates` for the current project context.
2. Templates as a list/cards, filterable via tag chips.
3. Click on a template → Path field + Name field (locked/pre-filled for `mode: fixed`) + `FormFields.vue` (if `fields:` is defined).
4. "Create" → `POST /apply`. On success, the new document is opened; on 409 (file exists), the error appears inline.

**"Enter content"** and **"Upload"** remain unchanged — the Template tab is purely additive.

The renderer is the shared `FormFields.vue` (the same as Wizards/Setting Forms/Kit Tool Templates), no separate form code.

---

## 11. Bundled Templates (v1)

A small initial set under `vance-brain/src/main/resources/vance-defaults/_vance/templates/`; **Addons additionally bundle their own templates** in their `vance-defaults/_vance/templates/` (mirrored to the Tenant level on boot):

| Template | Origin | `name.mode` | Tags | Purpose |
|---|---|---|---|---|
| `meeting-notes` | vance-brain | free | `note`, `meeting` | Workpage meeting note with form (topic, attendees) |
| `blank-note` | vance-brain | free | `note` | Empty Markdown note, no form |
| `workflow` | vance-brain | free | `workflow`, `automation` | Magrathea Workflow (`kind: vance-workflow`) with agent step, approval gate, and terminal states; form asks for description + Recipe |
| `mount-local` / `mount-ode` | vance-brain | free | `mount` | [Jaglan](/specs/jaglan-system) mount configuration under fixed `folder:` |
| `research-source-*` | vance-brain | free | `research` | [Zarniwoop](/specs/zarniwoop-service) source configuration (7 variants) |

**Application Templates** (`app:`, §2a) are provided by the Addons — one per app: `binder`, `calendar`, `canvasbook`, `common-desktop`, `custom-app` (Bistromath), `feeds`, `gtd`, `issues`, `journal`, `kanban`, `links`, `search`, `slideshow`, `wiki`, `workbook`. All have `tags: [app, …]` and collect at least title + description in the form; `feeds`, `search`, and `custom-app` additionally ask for the values that their `create()` reads as params.

Until 2026-08-24, they had a Pebble body that typed the `_app.yaml` itself. This was the reason for the rule "a body-write template is only allowed for apps without create side effects" — with `app:`, the rule is moot: no app template writes itself anymore, all 15 go through `create()`.

---

## 12. What v1 CANNOT do

- **Personal Templates** (`_user_<userId>` layer) — v1 is 3-tier (project/tenant/resource).
- **Multi-File Templates / Scaffolding** — one template = one document. Multiple files are only created via `app:` (§2a), and there the app decides, not the template.
- **Migration of existing Kind stubs** — `buildKindStub` remains as a manual "Enter content" path, not converted to templates.
- **Live Preview** of the rendered document before creation.
- **LLM Tool** (`document_from_template`) — v1 is Web-UI-only. A tool on the same service is a later, cheap addition.
- **Conditional Fields** (`showIf`) — not included in v1, same as with Wizards.

---

## 13. Security & Contracts

- **Pebble Sandbox:** only the declarative syntax subset (like Recipes/Wizards). No reflection, no `&#123;% include %}`, no external file access.
- **Raw Load of Body Files:** The `.tmpl.<ext>` documents contain un-rendered Pebble (`kind: &#123;{ … }}`) and must **not** be Kind-parsed by the `DocumentService` as regular documents. The `TemplateLoader` reads them raw — analogous to how `WizardLoader` reads its YAMLs raw.
- **Fail-Fast on Load:** Templates with invalid YAML, missing body, or Pebble syntax errors are not included in the listing on boot/refresh (WARN log, frontend simply doesn't see them).
- **Write Path:** The Apply writes exclusively via `DocumentService` — Auth, Audit, [Document-Lock](/specs/document-lock), and Change-Events apply as with any other write. This also applies to the `app:` path: there the app writes, but also through `DocumentService`.
- **`app:` Path — Enforcement at Call Site:** `TemplateService` checks `Document CREATE` with the authenticated Subject **before** dispatching to `create()`. The check must not be left to the app: `CreateContext` only carries a nullable `userId`, and a Service Account Subject (for which `userId` is null) would become `SecurityContext.SYSTEM` in the app and thus bypass the check. See §2a.

---

## 14. Roadmap

| Phase | Content |
|---|---|
| **v1** | Definition + Body schema + shared `FormFieldYamlParser` + `TemplateLoader` (3-tier Cascade, Body-Pairing) + `TemplateService` + `GET /templates`, `GET /{name}`, `POST /apply` + Template tab in Create dialog (shared `FormFields.vue`) + Overwrite-Guard (409) + `type`-Override + 3 Bundled Document Templates (`meeting-notes`, `blank-note`, `workflow`) + Addon-bundled App Manifest Templates via Body-Write (`kanban`, `common-desktop`) |
| **v1.1** | **`app:`-Routing** (§2a) — Apply dispatches to `VanceApplication.create()`; all 15 App Templates converted to `app:`, their Pebble bodies deleted. Plus three follow-ups in the apps, because `create()` could do less than the respective body: Kanban seeds default columns if none are specified, `FeedsApplication.fromParams` reads `languages`/`exclude`/`include`/`text`, `BistromathConfig.toTableSlug` normalizes the table name |
| **v1.x** | `?tag`-Filter UI polish + Foot integration (`/new --template <name>`) + Quick-Start from empty folder |
| **v2** | `_user_<userId>` layer (personal templates) + `document_from_template`-LLM Tool + Live Preview |
| **v3** | Web editor for own templates (edit definition + body in Cortex) + Conditional Fields |
