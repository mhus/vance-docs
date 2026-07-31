# Vancetope — Document Templates

> A **Document Template** is a named template from which the web UI generates finished file content when creating a new document. Unlike the previous static Kind stub generator (`buildKindStub` in the frontend), a template is **not** bound to Mime/Kind — type and Kind are derived from the template itself. Some templates allow free choice of filename, while others enforce a fixed name (e.g., `_app.yaml` for Application manifests).
>
> A Document Template is essentially a [Wizard](wizards.md) whose output is a **file** instead of a prompt text: the same form engine, the same Pebble rendering — only the result doesn't end up in the chat input but is written as a new document.
>
> **Persistence:** Templates are stored as YAML definitions + separate body files under `_vance/templates/` in the Document Layer. The cascade lookup `project → _tenant → classpath:vance-defaults/_vance/templates/` runs via [`DocumentService.lookupCascade`](../../repos/vance/server/vance-shared/src/main/java/de/mhus/vance/shared/document/DocumentService.java) — the same mechanism as Recipes, Wizards, Setting Forms, and the Model Catalog.
>
> See also: [wizards](wizards.md) (shared form engine) | [setting-forms](setting-forms.md) | [cortex](cortex.md) (Create dialog) | [doc-kind-application](doc-kind-application.md) | [app-workbook](app-workbook.md)

---

## 1. Terms and Delimitation

| Term | What it is |
|---|---|
| **Document Template** | A pair of definition YAML (`<name>.yaml`) + body file (`<name>.tmpl.<ext>`). Produces exactly **one** new document upon application. |
| **Definition** | The `<name>.yaml`: picker metadata (title, description, icon, tags), optional form (`fields:`), name policy (`name:`), optional type override (`type:`). |
| **Body** | The `<name>.tmpl.<ext>`: the actual file content as a Pebble template. The extension determines (by default) the target type, the content carries the target Kind in its own frontmatter/`$meta`. |
| **Form-Field** | A single input element (string, textarea, boolean, select, …). Shared infrastructure with [Wizards](wizards.md) and [Setting Forms](setting-forms.md) — the same `FormFieldDto`, the same `FormFields.vue` renderer, the same `FormValidator`. |

**Document Templates are not a Spawn path.** A template only generates file content and writes it via the normal [`DocumentService`](../../repos/vance/server/vance-shared/src/main/java/de/mhus/vance/shared/document/DocumentService.java) path (Auth, Audit, Lock-Check, Change-Events). No Engine, no Lane-Lock, no Tool-Routing.

**Exactly one document.** A template always writes **one** file. For an Application template (`name: { mode: fixed, value: _app.yaml }`), only the manifest is created — further files of the Application (e.g., `_index.md`, Pages) are the responsibility of the Application subsystem (`app_rebuild` and the `*_app_create` tools), not the template.

**Relationship to the existing Kind Stub.** The static `buildKindStub` path in the Create dialog ("Enter content" tab with Mime + Kind + Editor) **remains unchanged** as a manual fallback. Document Templates are additive: a new tab **before** the existing ones. The 15 Kind stubs will **not** be migrated to bundled templates in this expansion stage.

---

## 2. Template Definition (YAML)

The `<name>.yaml` has the following top-level fields. The `name` comes from the filename (`_vance/templates/<name>.yaml`), not from a field:

| Field | Type | Required | Meaning |
|---|---|---|---|
| `title` | `LocalizableText` | yes | Display name in the template picker |
| `description` | `LocalizableText` | yes | Short description (1-2 lines), appears below the title |
| `icon` | `String` | no | Heroicon name (see [web-ui](web-ui.md) §7) |
| `tags` | `List<String>` | no | Free tags for filtering/grouping in the picker (e.g., `app`, `planning`, `note`). See §3 |
| `name` | `NamePolicy` | no | Controls filename (free vs. fixed). Default: `{ mode: free }`. See §5 |
| `type` | `String` (Mime) | no | Explicit type override. If missing, the type is derived from the body extension. See §8 |
| `fields` | `List<FormField>` | no | Input fields for dynamic customization (Paddle). If the block is missing, the template is static (body is still rendered by Pebble, but only with basic context). See §7 |
| `body` | `String` | no | Override for the body filename within the same tier. Default: convention `<name>.tmpl.*` (§3) |
| `availableIn` | `List<String>` | no | Glob pattern list on `projectId` for listing visibility. Default `["*"]`. Identical to [Wizards §2a](wizards.md) |

**LocalizableText** is a map from language code to string, e.g., `{ de: "Meeting-Notiz", en: "Meeting note" }`. When rendering, the Tenant default language is used, with fallback to the first available entry.

---

## 3. The Two Files — Definition + Body

A template consists of **two** documents in the same directory, distinguished by the `.tmpl.` infix in the body:

```
_vance/templates/meeting-notes.yaml        # Definition
_vance/templates/meeting-notes.tmpl.md     # Body (Pebble), extension = target type
```

**Why two files:** The body can be any type (`md`/`json`/`yaml`/`js`/…). As a separate file with the target extension, it retains native syntax and editor highlighting during authoring — no escaping into a YAML string field.

**Pairing (Convention):** For `<name>.yaml`, the body is resolved via glob `<name>.tmpl.*` through the cascade. Both files are delivered by convention **together in one tier** — then the body loader wins the same tier as the definition (preferring same-tier). If a higher tier only overrides the definition, the body of the underlying tier is still used (useful for adapting only metadata/form and inheriting the body). An optional `body: <filename>` in the definition overrides the glob convention (e.g., if multiple templates should share the same body).

**Missing Body:** The `TemplateLoader` does not include the template in the listing and logs a WARN (fail-soft, analogous to invalid Wizards).

**Tags** are used for filtering in the picker. Application templates, for example, have `tags: [app]`, note templates `tags: [note]`. The picker offers tag chips as filters; without filters, all visible templates are shown. Tags deliberately replace a fixed "group" — multiple tags per template are allowed and more flexible than a single category.

---

## 4. Cascade — How a Template is Resolved

During listing (`GET /brain/{tenant}/templates`) and application (`POST /brain/{tenant}/templates/{name}/apply`), the same cascade runs as for Recipes and Setting Forms — **three tiers** (the `_user_` layer of Wizards is omitted in v1, personal templates are a later topic):

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

During **listing**, all three layers are aggregated and deduplicated by `name` (first layer wins). The listing result contains `name, title, description, icon, tags, source` — no fields, no body.

During **application**, exactly one template is resolved via cascade, validated + rendered with the posted form values, and written as a new document.

---

## 5. Name Policy & Target Path

The `name:` section controls the filename of the generated document:

| Field | Type | Required | Meaning |
|---|---|---|---|
| `mode` | `String` | no | `free` (Default) or `fixed` |
| `default` | `String` (Pebble) | no | Pre-fill for the name field in `mode: free` (e.g., `meeting-{{ date }}`). Without extension — that comes from the type (§8) |
| `value` | `String` | only for `fixed` | Fixed filename including extension (e.g., `_app.yaml`) |

**Path and Name separated — as with "new document".** The Create dialog separates target folder (path) and filename into two input fields (identical to the existing Create flow):

- **`mode: free`** — Name field editable, optionally pre-filled with `default`. The folder can be chosen freely.
- **`mode: fixed`** — Name field is locked and shows `value`. The user only chooses the **folder** (e.g., `my-notes/` → the template writes `my-notes/_app.yaml`). Application templates thus live in their own folder, without the definition enforcing a fixed folder.

**No Overwrite.** If the target file already exists, the apply fails with an error (HTTP 409). Templates **never** silently overwrite existing documents.

---

## 6. Pebble Rendering & Context

The body is a Pebble template with the same syntax subset as [Recipe Prompts](recipes.md) and Wizards — `{{ var }}`, `{% if/elseif/else/endif %}`, `{% for x in xs %}`, `{% raw %}`. Compile validation happens during template load (fail-fast: invalid templates do not appear in the listing). Rendering is done via the existing `PromptTemplateRenderer`.

### Render Variables

| Variable | Source | Notes |
|---|---|---|
| `<field name>` | directly from user input per Field | Scalars for `string`/`textarea`/`boolean`/`select`; lists for `multi_select`/`repeat`. Only if `fields:` is defined |
| `name` | The final chosen filename (without path) | for templates that derive their own title/slug from the name |
| `date` | Current date (Tenant timezone) | via the existing Date Context Resolver |
| `user` | Current User (Username) | |
| `project` | Current Project Name | |
| `lang` | Tenant default language | |

The `name` is available to the body because a frontmatter `title` or similar should often be derived from the filename — without us injecting frontmatter into the content afterwards (that would be forbidden content manipulation; the body builds its own `$meta`/frontmatter itself).

---

## 7. Form (Paddle) — Optional Dynamic Customization

If a `fields:` block is defined, the picker shows the form after template selection. The field types, the common field schema (`name`/`type`/`label`/`help`/`required`/`defaultValue`/`choices`/`rows`/`min`/`max`/`item`), the `FormChoice` structure, and the synchronous `FormValidator` validation are **identical** to [Wizards §3/§6](wizards.md) — the same engine, no new code.

If the `fields:` block is missing, the template is static: the body is still rendered by Pebble (basic context from §6), but there is no form step.

**Example — `_vance/templates/meeting-notes.yaml`:**

```yaml
title:       { de: "Meeting-Notiz", en: "Meeting note" }
description: { de: "Strukturierte Notiz für ein Meeting", en: "Structured note for a meeting" }
icon: clipboard-list
tags: [note, meeting]

name:
  mode: free
  default: "meeting-{{ date }}"

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
title: {{ topic }}
---

# {{ topic }}

_{{ date }}_

## Attendees
{{ attendees }}

## Notes

## Action Items
- [ ]
```

**Example Application Template — `_vance/templates/workbook.yaml`:**

```yaml
title:       { de: "Workbook-App", en: "Workbook app" }
description: { de: "Ordner-Container für Workpages", en: "Folder container for workpages" }
icon: book-open
tags: [app]

name:
  mode: fixed
  value: _app.yaml

fields:
  - name: appTitle
    type: string
    required: true
    label: { de: "Titel", en: "Title" }
```

**`_vance/templates/workbook.tmpl.yaml`:**

```yaml
$meta:
  kind: application
  app: workbook
title: {{ appTitle }}
```

---

## 8. Type Resolution

The **file extension** of the generated document always comes from the body (`<name>.tmpl.<ext>`) or, for `mode: fixed`, from `name.value`. For `mode: free`, the body extension is appended to the name entered by the user if it does not have its own extension.

The **Mime type** is determined as follows:

1. **`type:` set in the definition** → authoritative, overrides the Mime of the generated document. Use case: if the body extension does not map cleanly to a Mime or should intentionally deviate. The file extension remains untouched.
2. **`type:` missing** → derived from the target file extension (`.md` → `text/markdown`, `.yaml` → `application/yaml`, …), using the same extension→Mime table as the Create dialog.

The **Kind** of the document is **never** set from the definition — it resides in the rendered body (`kind:` frontmatter for Markdown, `$meta.kind` for JSON/YAML), where the Kind renderers expect it. The definition deliberately does not contain a `kind` field: duplicate maintenance would lead to drift and force the content injection hack that project rules prohibit.

---

## 9. API

### `GET /brain/{tenant}/templates`

Lists resolved templates for the current context (Project + Tenant + Bundled), filtered via `availableIn`. Optional query parameter `?tag=<tag>` filters server-side. Response:

```json
{
  "templates": [
    {
      "name": "meeting-notes",
      "title": "Meeting note",
      "description": "Structured note for a meeting",
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
3. Determine target path: `folder` + (for `mode: free`: `name`; for `mode: fixed`: `name.value`).
4. **Overwrite check** — if the file exists, HTTP 409.
5. Render body via Pebble (context §6).
6. Write document via `DocumentService` (type from §8, Lock-Check, Change-Event).

Response: `{ path, mimeType }` — the frontend's Create flow then opens the file in the appropriate editor.

---

## 10. UI Integration (Web)

The "New Document" dialog ([`CreateDocumentModal.vue`](../../repos/vance/client/packages/vance-face/src/cortex/components/CreateDocumentModal.vue)) gets a **third** mode tab, **preceding** the others:

```
[ Template ]  [ Enter content ]  [ Upload ]
```

**Template Tab:**

1. On opening: `GET /templates` for the current project context.
2. Templates as a list/cards, filterable via tag chips.
3. Click on a template → Path field + Name field (locked/pre-filled for `mode: fixed`) + `FormFields.vue` (if `fields:` is defined).
4. "Create" → `POST /apply`. On success, the new document is opened; on 409 (file exists), the error appears inline.

**"Enter content"** and **"Upload"** remain unchanged — the Template tab is purely additive.

The renderer is the shared `FormFields.vue` (the same as Wizards/Setting Forms/Kit-Tool-Templates), no separate form code.

---

## 11. Bundled Templates (v1)

A small initial set under `vance-brain/src/main/resources/vance-defaults/_vance/templates/`; **Addons additionally bundle their own templates** in their `vance-defaults/_vance/templates/` (mirrored to the Tenant level during boot):

| Template | Origin | `name.mode` | Tags | Purpose |
|---|---|---|---|---|
| `meeting-notes` | vance-brain | free | `note`, `meeting` | Workpage meeting note with form (topic, attendees) |
| `blank-note` | vance-brain | free | `note` | Empty Markdown note, no form |
| `kanban` | vance-addon-brain-kanban | fixed (`_app.yaml`) | `app`, `kanban`, `planning` | Kanban board manifest (standard columns Backlog → Done) |
| `common-desktop` | vance-addon-brain-common-desktop | fixed (`_app.yaml`) | `app`, `common-desktop`, `dashboard` | Common Desktop manifest (Launcher + Statusboard) |

**Bundled Application Manifest Templates (`_app.yaml`) exist** — for Apps with a **simple, self-sufficient manifest** (Kanban, Common Desktop). They use the Fixed Name mechanism (`mode: fixed`, `value: _app.yaml`) and the regular Pebble body write. This is permissible because their manifest is small and fully derivable from the form, and the App **does not** require Create side effects: the derived artifacts (`_board.md`, `_desktop.md`) are created during the first `app_rebuild`, and the web view calculates live anyway.

Apps whose `VanceApplication.create()` **seeds** upon creation (e.g., Workbook with `_index.md`) or whose manifest format is complex and easily mistyped should **not** use a body-write template. For these, the correct approach is a `kind: application` template whose apply runs through `application.create()` instead of Pebble body write (§14, v2) — here, the interface warning applies that hand-typed manifests become "subtly wrong" and a body-only write leaves an App without seeded artifacts.

---

## 12. What v1 CANNOT do

- **Personal Templates** (`_user_<userId>` layer) — v1 is 3-tier (project/tenant/resource).
- **Multi-File Templates / Scaffolding** — one template = one document.
- **`application.create()`-routed Apply for App Templates** — bundled App manifest templates exist (Kanban, Common Desktop), but write their `_app.yaml` via Pebble body (§11). The correct Apply for **seeding** Apps via `application.create()` (instead of body write) is v2.
- **Migration of existing Kind Stubs** — `buildKindStub` remains as a manual "Enter content" path, not refactored into templates.
- **Live Preview** of the rendered document before creation.
- **LLM Tool** (`document_from_template`) — v1 is Web-UI-only. A tool on the same service is a later, cheap addition.
- **Conditional Fields** (`showIf`) — not included in v1, same as with Wizards.

---

## 13. Security & Contracts

- **Pebble Sandbox:** only the declarative syntax subset (like Recipes/Wizards). No reflection, no `{% include %}`, no external file access.
- **Raw Load of Body Files:** The `.tmpl.<ext>` documents contain un-rendered Pebble (`kind: {{ … }}`) and must **not** be Kind-parsed by the `DocumentService` as regular documents. The `TemplateLoader` reads them raw — analogous to how `WizardLoader` reads its YAMLs raw.
- **Fail-Fast on Load:** Templates with invalid YAML, missing body, or Pebble syntax errors are not included in the listing during boot/refresh (WARN log, frontend simply doesn't see them).
- **Write Path:** The Apply writes exclusively via `DocumentService` — Auth, Audit, [Document Lock](document-lock.md), and Change Events apply as with any other write.

---

## 14. Roadmap

| Phase | Content |
|---|---|
| **v1** | Definition + Body Schema + shared `FormFieldYamlParser` + `TemplateLoader` (3-tier Cascade, Body Pairing) + `TemplateService` + `GET /templates`, `GET /{name}`, `POST /apply` + Template Tab in Create Dialog (shared `FormFields.vue`) + Overwrite Guard (409) + `type`-Override + 2 Bundled Doc Templates (`meeting-notes`, `blank-note`) + Addon-bundled App Manifest Templates via Body Write (`kanban`, `common-desktop`) |
| **v1.x** | `?tag`-Filter UI polish + Foot integration (`/new --template <name>`) + Quick-Start from empty folder |
| **v2** | `application.create()`-routed Apply for App Templates (seeding Apps, instead of Body Write) + `_user_<userId>` layer (personal templates) + `document_from_template`-LLM Tool + Live Preview |
| **v3** | Web Editor for custom templates (edit definition + body in Cortex) + Conditional Fields |
