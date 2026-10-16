# Vancetope — Prompt Wizards

> A **Wizard** is a named form that guides the user step-by-step through the input parameters of a complex prompt and, at the end, injects a complete prompt text into the chat input field. This solves the "empty input field" problem: special workflows like "Create a council" or "Plan Vogon Strategy" are discoverable via visible cards/tabs, without the user needing to know Engine names (`slart`, `vogon`, `marvin`, …) or Recipe conventions.
>
> **Persistence:** Wizards are stored as YAML documents under `wizards/<name>.yaml` in the Document Layer. The cascade lookup `project → _user_<user> → _tenant → classpath:vance-defaults/wizards/` runs via [`DocumentService.lookupCascade`](../repos/vance/server/vance-shared/src/main/java/de/mhus/vance/shared/document/DocumentService.java) — the same mechanism as Recipes, Documents, and Prompts.
>
> See also: [recipes](recipes.md) | [web-ui](web-ui.md) | [kits](kits.md) (Tool templates share the form engine)

---

## 1. Terms and Delimitation

| Term | What it is |
|---|---|
| **Wizard** | YAML definition of form fields + Pebble `promptTemplate`. Produces a user prompt text upon submission. |
| **Form-Field** | A single input element (string, textarea, boolean, select, …). Form-Fields are also used by [Kit Tool Templates](kits.md) — the same engine, the same renderer component. |
| **Wizard-Tab** | Visible tab on the right in the chat editor, next to the Live Progress panel. Lists the Wizards resolved for the current Session. |

**Wizards are not a Spawn Path.** The Wizard only generates text. The resulting Prompt lands in the Chat Input, the user sends it, and from there the normal Engine Spawn runs — see [recipes](recipes.md). This keeps the Wizard a pure UI construct and does not interfere with Process Routing, Lane Serialization, or Tool Routing.

---

## 2. Wizard Schema (YAML)

A Wizard file has the following top-level fields. The `name` comes from the filename (`wizards/<name>.yaml`), not from a field:

| Field | Type | Required | Meaning |
|---|---|---|---|
| `title` | `LocalizableText` | yes | Display name in tab / card |
| `description` | `LocalizableText` | yes | Short description (1-2 lines), appears below the title |
| `icon` | `String` | no | Heroicon name (see [web-ui](web-ui.md) §7) |
| `category` | `String` | no | Grouping for Wizard tab sorting (e.g., `strategy`, `analysis`, `setup`) |
| `fields` | `List<FormField>` | yes | Input fields, see §3 |
| `promptTemplate` | `String` (Pebble) | yes | Rendered upon submit; result lands in the chat input field |
| `validatorPrompt` | `String` (Pebble) | no (v2) | LLM prompt for the optional "Check" button |
| `suggestedFollowUps` | `List<FollowUp>` | no | Follow-up Wizards that the LLM should suggest to the user after success. See §5a |
| `availableIn` | `List<String>` | no | Glob pattern list on `projectId` for listing visibility. Default `["*"]`. See §2a |

**LocalizableText** is a map from language code to string, e.g., `{ de: "Gremium anlegen", en: "Create a council" }`. When rendering, the Tenant default language is used, with fallback to the first available entry.

---

## 2a. `availableIn` — Listing Filter per Project Context

Wizards from the lower Cascade Layers (`RESOURCE`, `VANCE`) would otherwise appear in *every* Project context. However, some Wizards only fit certain contexts — e.g., "Create Project" only makes sense in the User namespace (Eddie, `_user_<user>`), not within a specific project (Arthur). `availableIn` filters during **listing** (`GET /wizards`) based on the requested `projectId`.

**Pattern Syntax:**

- Glob with `*` as a wildcard for character sequences without `/`.
- `!`-prefix inverts the pattern (Exclude).
- A Wizard is visible if at least one positive pattern matches **and** no exclude pattern matches. If only excludes are specified, `*` is implicitly considered an include.
- Default (`availableIn` missing or empty): same as `["*"]` — visible everywhere.

**Comparison is against the `projectId` query parameter of the listing call.** If it is missing, `_tenant` is used as the comparison value (listing without project context).

**Examples:**

```yaml
# Only in Eddie (User namespace + Tenant project — no specific project)
availableIn: [ "_user_*", "_tenant" ]
```

```yaml
# Only in Arthur (any specific project, i.e., everything except _-prefix)
availableIn: [ "!_*" ]
```

```yaml
# Everywhere (= Default, can also be omitted)
availableIn: [ "*" ]
```

```yaml
# Only in a very specific project
availableIn: [ "research-2026" ]
```

**Scope:**

- `availableIn` applies **only to listing** (`GET /brain/{tenant}/wizards`). The `GET /{name}` and `POST /{name}/render` endpoints remain pattern-blind — a known Wizard name can still be called directly (e.g., via `suggestedFollowUps` from another context or deep-link).
- Project-installed Wizards (Source `PROJECT`) typically do not need this field — they are only visible in their respective project due to the Cascade. It is primarily relevant for `RESOURCE`- and `VANCE`-Wizards, which would otherwise be rendered everywhere.

---

## 3. Form-Field Types

Form-Fields are **shared infrastructure** with [Kit Tool Templates](kits.md). A `FormFieldDto` base is located in `vance-api`, both applications add their own fields (Tool Templates: `target`, Wizards: nothing additional).

| Type | Description | Specific Fields |
|---|---|---|
| `string` | Single-line text input | — |
| `textarea` | Multi-line text | `rows: <int>` (Default 3) |
| `password` | Masked input | — |
| `integer` | Whole number | `integerMin`, `integerMax` (optional) |
| `number` | Decimal number (amount, factor), read exactly; `NaN`/`Infinity` rejected | — |
| `boolean` | Checkbox | — |
| `select` | Single-choice dropdown; with `allowCustom: true` filterable combobox with free text | `choices: List<FormChoice>`, optional `allowCustom` |
| `multi_select` | Multi-choice (checkbox list) | `choices: List<FormChoice>` |
| `repeat` | Array-of-Objects (dynamic add/remove) | `min`, `max`, `item: List<FormField>` |

### Common Fields per `FormField`

| Field | Type | Required | Meaning |
|---|---|---|---|
| `name` | `String` | yes | Variable name, referenced as `{{ name }}` in the Pebble template |
| `type` | `String` | yes | Field type from the table above |
| `label` | `LocalizableText` | yes | Display label |
| `help` | `LocalizableText` | no | Help text below the field |
| `required` | `boolean` | no | Default `false`. Enforced on submit. |
| `defaultValue` | `Object` | no | Pre-fill — type depends on `type` |
| `choices` | `List<FormChoice>` | only for `select`/`multi_select` | see below |
| `rows` | `int` | only for `textarea` | UI hint |
| `min` / `max` | `int` | only for `repeat` | Number bounds |
| `integerMin` / `integerMax` | `int` | only for `integer` | Value bounds |
| `allowCustom` | `boolean` | only for `select` | Default `false`. `true` = value may be outside `choices`; the Web UI renderer then shows a filterable combobox (free text + filter instead of closed dropdown), and submit validation skips the choice whitelist for this field. For inventory lists (`choicesFrom` in Setting Forms) whose entries can disappear — not for closed enums. |
| `item` | `List<FormField>` | only for `repeat` | Nested field schema |

### FormChoice

```yaml
choices:
  - value: formal                                          # technical, unique, untranslated
    label: { de: "Formell", en: "Formal" }                 # LocalizableText
  - value: casual
    label: { de: "Locker", en: "Casual" }
```

### What v1 CANNOT do

- `conditional` / `showIf` — fields cannot be shown/hidden depending on other fields.
- `date`, `file`, `hidden` types.
- Multi-stage Wizards (Pages/Steps). All fields are rendered on one page; for long Wizards, the author adds additional `repeat`/groupings.

---

## 4. Cascade — How a Wizard Name is Resolved

For list lookup (`GET /brain/{tenant}/wizards`) and render call (`POST /brain/{tenant}/wizards/{name}/render`), the same Cascade as for Recipes is used, **but with an additional `_user_` layer** for personal Wizards:

```
load(tenantId, projectId, userId, name) → Optional<ResolvedWizard> :=
  documentService.lookupCascade(tenantId, projectId,
                                "wizards/" + name + ".yaml")
    1. Project:  <project>/wizards/<name>.yaml                  → source = PROJECT
    2. User:     _user_<userId>/wizards/<name>.yaml             → source = USER
    3. _tenant:  _vance/wizards/<name>.yaml                     → source = VANCE
    4. Resource: classpath:vance-defaults/wizards/<name>.yaml   → source = RESOURCE
    5. → empty
```

For **listing** (`GET /wizards`), all four layers are aggregated and deduplicated by `name` (first layer wins). The listing result contains `name, title, description, icon, category` — no fields, no templates.

For **rendering** (`POST /wizards/{name}/render`), exactly one Wizard is resolved via Cascade and rendered with the form values posted by the frontend.

---

## 5. Pebble Template & Render Context

The `promptTemplate` (and `validatorPrompt` in v2) is a Pebble template with the same syntax subset as [Recipe Prompts](recipes.md) — `{{ var }}`, `{% if/elseif/else/endif %}`, `{% for x in xs %}`, `{% raw %}`. Compile validation happens during Wizard load (fail-fast: invalid templates prevent the Wizard from appearing in the listing).

### Render Variables

| Variable | Source | Notes |
|---|---|---|
| `<field name>` | directly from user input per field | Scalars for `string`/`textarea`/`password`/`integer`/`boolean`/`select`; lists for `multi_select`/`repeat` |
| `lang` | Tenant default language | for Wizards that want to lay out their prompt in multiple languages |
| `user` | Current User (Username) | for personal Wizards |
| `project` | Current Project name | optional, for contextual prompts |

### Example — `wizards/gremium.yaml`

```yaml
title:       { de: "Gremium anlegen",              en: "Create a council" }
description: { de: "Wiederbefragbare Personen-Gruppe definieren",
               en: "Define a reusable advisory group" }
icon: users
category: strategie

fields:
  - name: outputName
    type: string
    required: true
    label: { de: "Name (Dateiname, ohne Spaces)", en: "Name (filename, no spaces)" }
    help:  { de: "Wird unter diesem Namen gespeichert",
             en: "Stored under this name" }

  - name: purpose
    type: textarea
    rows: 3
    required: true
    label: { de: "Wozu soll das Gremium beraten?",
             en: "Purpose of the council?" }

  - name: members
    type: repeat
    min: 2
    max: 8
    label: { de: "Mitglieder", en: "Members" }
    item:
      - { name: name, type: string, required: true,
          label: { de: "Name", en: "Name" } }
      - { name: description, type: textarea, rows: 4, required: true,
          label: { de: "Beschreibung / Rolle / Persona",
                   en: "Description / role / persona" } }

  - name: createNow
    type: boolean
    defaultValue: true
    label: { de: "Direkt erstellen", en: "Create now" }

promptTemplate: |
  Create a council with slart from the following {{ members | length }} people,
  which I can later consult on strategic questions.
  Purpose: {{ purpose }}.

  Members:
  {% for m in members %}
  - {{ m.name }}: {{ m.description }}
  {% endfor %}

  Save it as '{{ outputName }}'.
  {% if createNow %}Execute it directly.{% else %}Do not run a test now.{% endif %}
```

---

## 5a. Suggested follow-ups (Wizard Chaining)

Wizards can recommend each other: after successfully creating a Recipe, the Recipe Wizard might suggest the Essay Wizard pre-filled with the new Recipe name. The mechanism is a declarative `suggestedFollowUps` list in the YAML; each entry has the following fields:

| Field | Type | Required | Meaning |
|---|---|---|---|
| `wizard` | `String` | yes | Name of the follow-up Wizard (matches a YAML in the Cascade) |
| `label` | `LocalizableText` | yes | Display text of the link, can contain Pebble variables |
| `prefill` | `Map<String, String>` | no | Values to pre-fill the follow-up Wizard. Each value is a **Pebble template** and has access to the current form values |
| `condition` | `String` (Pebble expression) | no | If set and falsy, the suggestion is omitted |

**Wire-Form:** During rendering, all active follow-ups are appended as a Markdown list to the `promptTemplate` output, with a short LLM instruction in the resolved language:

```
If this is successfully completed, offer the user the following follow-up action(s) as a Markdown link:
- [Write an essay with 'create-essay-recipe'](vance:/wizards/essay-mit-recipe?kind=wizard&recipe=create-essay-recipe)
```

The LLM decides contextually whether/how to embed the link in its response. This works because the instruction is part of the User Prompt — same Engine, same Spawn Path, no special handling in routing.

**Frontend:** `MarkdownView` recognizes `vance:/wizards/<name>?kind=wizard&...` URIs by the `kind=wizard` query parameter and dispatches a `vance-open-wizard` window event with `{ name, prefill }`. `ChatView` listens for this, switches the right aside tab to "Wizards", and calls `WizardPanel.openWizard(name, prefill)`. The Prefill merge ignores unknown keys (renames in the target Wizard therefore do not break in-flight links) and skips `repeat` fields (URL encoding would be too fragile).

**Example (`essay-recipe.yaml`):**

```yaml
suggestedFollowUps:
  - wizard: essay-mit-recipe
    label:
      de: "Aufsatz mit '{{ recipeName }}' schreiben"
      en: "Write an essay using '{{ recipeName }}'"
    prefill:
      recipe: "{{ recipeName }}"
    # condition: ausführen == "true"   # optional
```

**What v1 CANNOT do:**
- Pre-fill `repeat` fields (URL would explode; frontend silently skips them)
- Automatically chain multiple steps without user interaction (each step requires a click — intentional)
- Pre-validation of target Wizards during load (404 only on click — low hit chance, clear error message)

---

## 6. Validation

### Form-Validation (server-side, synchronous on Render)

Before Pebble rendering, `FormValidator` runs on the posted values:

- **Required:** all fields marked as `required: true` must have a non-empty value.
- **Repeat-Bounds:** Array length between `min` and `max`. The nested schema is recursively validated for each item.
- **Integer-Bounds:** `integerMin` ≤ value ≤ `integerMax`.
- **Select-Whitelist:** Value must be included in `choices[].value`.

In case of validation errors: HTTP 400 with a structured error list (`{ field: "members[2].name", error: "required" }`). The frontend renders the errors inline next to the respective field.

### LLM-Validator (v2, optional, on-demand)

If a Wizard defines `validatorPrompt`, the frontend shows a "Check" button. On click:

1. Frontend POSTs current form values to `POST /wizards/{name}/validate`
2. Brain renders `validatorPrompt` with the same variables as `promptTemplate`
3. Brain calls an LLM (default model from `default:fast` alias) and parses the response
4. Response is returned as structured suggestions (`[{ field: "members", suggestion: "..." }]`) — frontend renders them as non-blocking hints
5. Validator is **never** a blocker — the user can always click Submit

Token costs go through the normal [LLM-Resource-Management](llm-resource-management.md) pipeline.

---

## 7. API

### `GET /brain/{tenant}/wizards`

Lists resolved Wizards for the current context (Project + User + Tenant + Bundled). Response:

```json
{
  "wizards": [
    {
      "name": "gremium",
      "title": "Create a council",
      "description": "Define a reusable advisory group",
      "icon": "users",
      "category": "strategie",
      "source": "VANCE"
    },
    ...
  ]
}
```

Title/Description are already resolved in the Tenant default language.

### `GET /brain/{tenant}/wizards/{name}`

Returns the full Wizard definition including fields (for rendering in the frontend). Pebble templates are **not** delivered — they remain backend-only.

### `POST /brain/{tenant}/wizards/{name}/render`

Body: `{ values: Record<string, FormValue> }`. Validates the values, renders `promptTemplate`, returns the finished prompt:

```json
{ "prompt": "Create a council with slart ..." }
```

### `POST /brain/{tenant}/wizards/{name}/validate` (v2)

Like `/render`, but renders `validatorPrompt` and calls an LLM. Response: `{ suggestions: [{ field, suggestion }] }`.

---

## 8. UI Integration (Web)

### Wizard-Tab in the Chat Editor

The Chat Editor (`packages/vance-face/src/chat/ChatApp.vue`) gets a "Wizards" tab in the right side panel next to the existing Live Progress tab. Tab content:

1. On mount: `GET /wizards` for the current Session.
2. Wizards grouped by `category`, alphabetically by `title` within the group.
3. Clicking a Wizard opens the Form Modal (or inline-Expand) with `FormFields`-renderer.
4. Submit button: `POST /render`, response prompt is written into the chat input field (replace). User can edit the text and sends it manually.

### Discoverability — Quick-Start-Cards (v1.x, not v1)

An empty/fresh Session (no messages) shows the top Wizards (arranged by `category`) as cards in the chat center. As soon as the first message arrives, the cards disappear; the tab remains.

### Shared Form-Engine

The Vue component `FormFields.vue` (`packages/vance-face/src/components/`) is the **only** renderer for Form-Field arrays. It is used by both Wizards and Kit Tool Templates. Tool Templates additionally render their Target Choice (Setting vs. Document-Inline) around it, but not within `FormFields`.

ModelValue-Type is `Record<string, FormValue>` with

```ts
type FormValue = string | number | boolean | string[] | NestedValue[];
type NestedValue = Record<string, FormValue>;
```

---

## 9. CLI Integration (Foot)

`vance-foot` shows available Wizards as slash-command auto-complete: `/wizard <name>` opens an interactive Picocli-/JLine-prompt that sequentially queries the fields (textarea via `$EDITOR`-spawn, repeat via "another entry? (y/n)"-loop). Submit calls the same `/render` endpoint; the rendered prompt lands in the REPL's input buffer and can be edited before sending.

`multi_select` and `select` are offered via JLine menus, `boolean` as a y/n prompt.

CLI Wizards in v1.x — not mandatory for v1.

---

## 10. Security & Contracts

- **Pebble Sandbox:** As with Recipes, only the declarative syntax subset. No Java reflection, no `{% include %}`, no external file access.
- **Cascade Sources:** User layer (`_user_<userId>`) is only visible to the respective User. Project and Tenant layers as usual via the [workspace-access](workspace-access.md) rules.
- **Fail-Fast on Load:** Wizards with invalid YAML, missing required fields, or Pebble syntax errors are **not** included in the listing during boot/refresh. Brain logs them as WARN, the frontend simply doesn't see them.
- **Edit-Time Findings:** The "Wizards" settings area (Settings Panel, `vance-wizard`) inventories all Cascade levels — including the User layer, because the panel's User Scope is exactly the `_user_<login>` level. The `WizardDocKindHandler` runs via the `validateBody` seam on the canonical `WizardLoader.parse`: what the Loader skips with WARN becomes a finding in the editor, instead of silently disappearing from the listing. (The roadmap phase v3 "User Editor" thus gets a raw text precursor; the meta-form editor remains v3.)

---

## 11. Roadmap

| Phase | Content |
|---|---|
| **v1** | Schema + Backend Service + Cascade + `GET /wizards`, `GET /{name}`, `POST /render` + Shared `FormFields.vue` (incl. `repeat` extension) + Wizard Tab in Chat Editor + `suggestedFollowUps` with `vance:`-URI deep-link + `availableIn`-listing filter (§2a) + 5 Bundled Wizards (`gremium`, `vogon-strategie`, `essay-recipe`, `essay-mit-recipe`, `create-project`) |
| **v1.x** | Quick-Start-Cards for empty Sessions + CLI Integration (`/wizard <name>`) + Mobile Renderer (`vance-fingers`) |
| **v2** | LLM-Validator (`validatorPrompt` + Button + `/validate` endpoint) + Conditional Fields (`showIf`) + Multi-Step-Wizards (Pages) |
| **v3** | User Editor for custom Wizards in the Web UI (define form definition as a form — meta) |
