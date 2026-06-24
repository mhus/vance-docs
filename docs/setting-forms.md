---
title: "Vance — Setting Forms"
parent: Documentation
permalink: /docs/setting-forms
---

<!-- AUTO-GENERATED from specification/public/en/setting-forms.md — do not edit here. -->

---
# Vance — Setting Forms

> A **Setting Form** is a named form that configures Settings in a structured way — analogous to [Wizards](/docs/wizards), but instead of generating a prompt text, it writes directly to the `settings` collection. Use cases: "Switch LLM for this project", "Choose Quota Preset", "Connect external system" — anywhere where the bare key/value editor is too cumbersome and a user-friendly form makes sense.
>
> **Persistence:** Setting Forms are stored as YAML documents under `setting_forms/<name>.yaml` in the Document Layer. The cascade lookup `project → _user_<user> → _tenant → classpath:vance-defaults/setting_forms/` runs via [`DocumentService.lookupCascade`](../repos/vance/server/vance-shared/src/main/java/de/mhus/vance/shared/document/DocumentService.java) — the same mechanism as Recipes, Wizards, and Documents.
>
> See also: [wizards](/docs/wizards) (Shared Form Engine) | [settings-system](/docs/settings-system) | [recipes](/docs/recipes) | [kits](/docs/kits)

---

## 1. Terms and Delimitation

| Term | What it is |
|---|---|
| **Setting Form** | YAML definition of form fields + Settings output mapping. Upon submission, produces a set of Setting writes (and deletes) on a defined Scope. |
| **Direct-Mapped Field** | Form Field with `bindsTo`: 1:1 correspondence between Field Value and a Setting Key. UI shows current value + cascade source live. |
| **UI-Only Field** | Form Field **without** `bindsTo`: pure preset (e.g., "Budget: small/medium/large"), only affects derived `settings:` entries. |
| **Computed Setting** | Entry in the `settings:` section: Setting Key + Scope + Pebble Template that calculates a value from Field Values. |

**Setting Forms are not a Spawn Path.** They do not run through an Engine, do not write a Document, do not generate a Prompt. They are pure **Settings Editors with Branding** — all writes run through the normal [`SettingService`](../repos/vance/server/vance-shared/src/main/java/de/mhus/vance/shared/settings/SettingService.java) path (Auth, Audit, Encryption for `PASSWORD` type).

**Relationship to Wizards:** Setting Forms share the Form Engine (`FormField` schema, `FormFields.vue` renderer, `FormValidator`) — all form infrastructure from Wizards is reused here. The Setting Form adds two concepts on top: `bindsTo` at the field level (direct mapping) and a separate `settings:` section (computed values with Pebble).

---

## 2. Setting Form Schema (YAML)

A Setting Form file has the following top-level fields. The `name` comes from the filename (`setting_forms/<name>.yaml`), not from a field:

| Field | Type | Required | Meaning |
|---|---|---|---|
| `title` | `LocalizableText` | yes | Display name in tab / card |
| `description` | `LocalizableText` | yes | Short description (1-2 lines), appears below the title |
| `icon` | `String` | no | Heroicon name (see [web-ui](/docs/web-ui) §7) |
| `category` | `String` | no | Grouping for listing sorting (e.g., `llm`, `quotas`, `integrations`) |
| `defaultScope` | `String` | no | Default scope for all `bindsTo`/`settings` entries that do not specify their own scope. Values: `project` (Default), `user`, `tenant`. See §6 |
| `fields` | `List<FormField>` | yes | UI input fields, see §3 |
| `settings` | `List<ComputedSetting>` | no | Output mapping with Pebble. Evaluated during apply in addition to `bindsTo` mappings. See §5 |
| `clearable` | `boolean` | no | Default `true`. If `false`, no "Reset" button in the UI. See §6.3 |
| `availableIn` | `List<String>` | no | Glob pattern list on `projectId` for listing visibility. Default `["*"]`. See §2a (identical to Wizards) |

**LocalizableText** is a map from language code to string, e.g., `{ de: "LLM-Einstellungen", en: "LLM Settings" }`. When rendering, the Tenant default language is used, with fallback to the first available entry.

---

## 2a. `availableIn` — Listing Filter per Project Context

Setting Forms from lower cascade layers (`RESOURCE`, `VANCE`) would otherwise appear in *every* project context where the Setting Form listing is called. However, some forms are only suitable for specific contexts — e.g., a "User Notifications" form only makes sense in the User namespace (`_user_<user>`), a "Tenant Branding" form only in `_tenant`, an "LLM Setup" everywhere *except* in `_*` system projects. `availableIn` filters the **listing** (`GET /setting-forms`) based on the requested `projectId`.

**Pattern Syntax** — identical to [Wizards §2a](/docs/wizards#2a-availablein--listing-filter-pro-projekt-kontext):

- Glob with `*` as a wildcard for character sequences without `/`.
- `!` prefix inverts the pattern (Exclude).
- A form is visible if at least one positive pattern matches **and** no exclude pattern matches. If only excludes are specified, `*` is implicitly considered an include.
- Default (`availableIn` missing or empty): same as `["*"]` — visible everywhere.

**Comparison is made against the `projectId` query parameter of the listing call.** If it is missing, `_tenant` is used as the comparison value.

### Relation to `defaultScope`

`availableIn` and `defaultScope` are orthogonal but natural partners. Rule of thumb per form category:

| Form Category | typical `defaultScope` | typical `availableIn` |
|---|---|---|
| Project Configuration (LLM, Quotas, Integrations) | `project` | `[ "!_*" ]` — only in business projects, not in `_tenant`/`_user_*` |
| User Preferences (Notifications, UI, Per-User Defaults) | `user` | `[ "_user_*" ]` — only in the User namespace, not in business projects |
| Tenant Defaults (Default Models, Global Quotas) | `tenant` | `[ "_tenant" ]` — explicitly only in the Tenant project context |
| Universal (Connecting external services that apply everywhere) | `project` with User override fallback | `[ "*" ]` (Default) |

The filter is a **courtesy to the user** — it does not enforce anything. Calling a `defaultScope: user` form *technically* in a business project is allowed; it will still write to `_user_<user>` and the user will wonder why the change does not apply project-specifically. The `availableIn` filter hides such confusions by not showing the form in the listing at all.

### Examples

```yaml
# LLM Setup: available in every business project, not in system projects
availableIn: [ "!_*" ]
```

```yaml
# User Notifications: only in the User namespace
availableIn: [ "_user_*" ]
```

```yaml
# Tenant Branding: explicitly only in the Tenant project
availableIn: [ "_tenant" ]
```

```yaml
# Only in a very specific project (e.g., a form that comes with a Kit)
availableIn: [ "research-2026" ]
```

```yaml
# Everywhere (= Default, can be omitted)
availableIn: [ "*" ]
```

### Scope of Effect

- `availableIn` applies **only to the listing** (`GET /setting-forms`). The `GET /{name}`, `POST /{name}/apply`, `POST /{name}/validate`, and `POST /{name}/reset` endpoints remain pattern-blind — a known form name can still be called directly (e.g., via deep-link or programmatically).
- Project-installed forms (Source `PROJECT`, e.g., from a Kit) typically do not need this field — they are already visible only in their respective project due to the cascade. It is primarily relevant for `RESOURCE` and `VANCE` forms, which would otherwise be rendered everywhere.
- Auth checks (see §4.3) are **independent** of the listing filter. A form with `defaultScope: tenant` that is accidentally shown to a non-admin user due to a missing `availableIn` will fail at the latest during apply due to permissions. `availableIn` is UX, not a security boundary.

---

## 3. Form Field Types

Setting Forms use the same `FormField` schema as [Wizards §3](/docs/wizards#3-form-field-typen). All types there (`string`, `textarea`, `password`, `integer`, `boolean`, `select`, `multi_select`, `repeat`) and common fields (`name`, `label`, `help`, `required`, `defaultValue`, `choices`, `rows`, `min`/`max`, …) apply 1:1.

Setting Forms add three fields per `FormField`:

| Field | Type | Meaning |
|---|---|---|
| `bindsTo` | `{ key: String, scope?: String }` | Direct mapping. Field Value is written as a Setting under `key` in the specified `scope` upon submission. Without `scope`, `defaultScope` from the top-level is used. See §4 |
| `showIf` | `String` (Pebble Expression) | Field only visible if expression is truthy. Field value is still carried along if sub-templates need it — UI logic, not data filter. See §5 |
| `writeIf` | `String` (Pebble Expression) | During apply: only write if truthy. If falsy → Setting Key is **deleted** (Cascade Reset). Applies to both `bindsTo` and implicitly to Computed Settings (see §5.2) |

**Type Coercion between Field and Setting:** When writing to the `settings` collection, the Field value is translated to the corresponding `SettingType` based on the field `type`:

| Field Type | SettingType | Note |
|---|---|---|
| `string`, `textarea`, `select` | `STRING` | |
| `password` | `PASSWORD` | Encryption by `SettingService`. Empty input = "do not change" (see §6.4) |
| `integer` | `INT` or `LONG` | Depending on the value range. For `bindsTo`, `bindsTo.settingType: "LONG"` can optionally force it. |
| `boolean` | `BOOLEAN` | |
| `multi_select`, `repeat` | not allowed for `bindsTo` | Only in `settings:` section via Pebble (e.g., `&#123;{ tags | join(",") }}`) |

**Non-direct-mappable fields must be processed in `settings:` computed outputs** — `bindsTo` only applies to scalar, deterministically typable values. Validation during form load, for example, rejects a `multi_select` field with `bindsTo`.

### What v1 CANNOT do

The same limits as [Wizards §3](/docs/wizards#3-form-field-typen): no `date`/`file`/`hidden` types, no multi-step wizards, no `showIf`-equivalent between page changes. `showIf` as a Pebble expression at the field level is included here in v1 (unlike Wizards, where it is v2) — see special note in §11.

---

## 4. Direct Mapping with `bindsTo`

Direct mapping is the simple, declarative case: a form field corresponds 1:1 with a Setting Key.

```yaml
fields:
  - name: defaultModel
    type: select
    label: { de: "Default-Modell", en: "Default model" }
    bindsTo:
      key: "ai.default.model"
      scope: "project"            # optional; otherwise defaultScope
    choices:
      - { value: "claude-sonnet-4-6",  label: { de: "Sonnet 4.6", en: "Sonnet 4.6" } }
      - { value: "claude-opus-4-7",    label: { de: "Opus 4.7",   en: "Opus 4.7"   } }

  - name: anthropicKey
    type: password
    label: { de: "Anthropic API Key", en: "Anthropic API Key" }
    bindsTo: { key: "ai.providers.anthropic.api_key", scope: "project" }
```

### 4.1 Live Source Indicator

Direct-Mapped Fields show their current cascade source live in the UI — the renderer calls `GET /setting-forms/{name}` (see §8) on mount and receives a `currentValue` and `currentSource` for each field:

```
Default Model:     [claude-sonnet-4-6 ▼]    (effective from _tenant)
Anthropic API Key:  [••••••••••••]            (set in project)
```

For `PASSWORD` fields, `currentValue` is always `"***"` or `"[set]"` (or `null` if unset) — never the plaintext. See §11.

### 4.2 `bindsTo` without `scope`

If `bindsTo.scope` is missing, `defaultScope` from the top-level applies. If that is also missing: `project`. This covers 90% of cases for simple "Project Settings" forms without scope repetition:

```yaml
defaultScope: project
fields:
  - name: anthropicKey
    type: password
    bindsTo: { key: "ai.providers.anthropic.api_key" }   # → project-scope
  - name: openaiKey
    type: password
    bindsTo: { key: "ai.providers.openai.api_key" }      # → project-scope
```

### 4.3 Allowed Scope Values

| Scope | Resolved To | Auth Requirement |
|---|---|---|
| `project` | current project from call context | User must have write permissions in the project |
| `user` | `_user_<currentUser>` | User may only write to their own namespace |
| `tenant` | `_tenant` | only Tenant Admin (see [identity-credentials](/docs/identity-credentials)) |

`think-process` is **not allowed** as a scope — Setting Forms are UI constructs for persistent configuration, not for transient Process overrides.

---

## 5. Pebble in Setting Forms

Setting Forms use Pebble in **three** clearly delimited places — not in a free `promptTemplate` like Wizards. This is intentional: it keeps the form deterministically analyzable (which keys are potentially written?) and the "where does the current value come from?" indicator works per field.

### 5.1 `showIf` and `writeIf` (Field Level)

Both are **Pebble Expressions**, not a complete template — they return `boolean`:

```yaml
fields:
  - name: provider
    type: select
    bindsTo: { key: "ai.default.provider" }
    choices: [{value: "anthropic"}, {value: "openai"}]

  - name: anthropicKey
    type: password
    showIf:  "provider == 'anthropic'"
    writeIf: "provider == 'anthropic'"
    bindsTo: { key: "ai.providers.anthropic.api_key" }
```

`showIf=false` → Field is hidden in the UI, but its default value is still carried along during rendering (e.g., if a `settings:` section reads it).

`writeIf=false` → the Setting Key is **deleted** (instead of written) during apply. This is the conditional reset path: switching provider from Anthropic to OpenAI automatically removes `ai.providers.anthropic.api_key`.

### 5.2 `settings:` Section (Output Level)

This is where the Pebble templating logic for **computed Settings** resides. Each entry is:

| Field | Type | Required | Meaning |
|---|---|---|---|
| `key` | `String` | yes | Setting Key (dot notation, see [settings-system §5](/docs/settings-system#5-namenskonventionen-keys)) |
| `scope` | `String` | no | `project` / `user` / `tenant`. Default: `defaultScope` |
| `settingType` | `String` | no | `STRING` (Default) / `INT` / `LONG` / `DOUBLE` / `BOOLEAN` / `PASSWORD`. Coercion see below |
| `value` | `String` (Pebble Template) | yes | Is rendered; result is parsed according to `settingType` |
| `writeIf` | `String` (Pebble Expression) | no | Falsy → Key is deleted instead of written (same semantics as at field level) |
| `description` | `LocalizableText` | no | optional, ends up as `description` on the Setting Document |

**Example:**

```yaml
fields:
  - name: budget
    type: select
    choices:
      - { value: "small",  label: { de: "Klein  (~100k/Tag)" } }
      - { value: "medium", label: { de: "Mittel (~500k/Tag)" } }
      - { value: "large",  label: { de: "Groß  (~2M/Tag)" } }

  - name: budgetEnabled
    type: boolean
    defaultValue: true
    label: { de: "Quota aktiv" }

settings:
  - key: "quota.daily_tokens"
    scope: "project"
    settingType: INT
    writeIf: "budgetEnabled"
    value: |
      &#123;% if budget == 'small' %}100000
      &#123;% elseif budget == 'medium' %}500000
      &#123;% else %}2000000&#123;% endif %}

  - key: "quota.monthly_tokens"
    scope: "project"
    settingType: INT
    writeIf: "budgetEnabled"
    value: |
      &#123;% if budget == 'small' %}3000000
      &#123;% elseif budget == 'medium' %}15000000
      &#123;% else %}60000000&#123;% endif %}
```

### 5.3 Render Context

All three Pebble locations see the same set of variables:

| Variable | Source | Notes |
|---|---|---|
| `<fieldname>` | current user input per field | Also for `showIf`/`writeIf` of fields that are currently being checked themselves |
| `lang` | Tenant default language | for multilingual texts in `description` |
| `user` | Username | for User-scope forms |
| `project` | Project name | for project-scope forms |
| `current` | Map<String, ?>: current Setting values from the cascade | For `value` templates that need to "keep old value if nothing changed": `&#123;{ current['ai.default.model'] | default('claude-sonnet-4-6') }}` |

**Pebble Subset:** same as for [Recipes](/docs/recipes) and [Wizards](/docs/wizards) — `&#123;{ var }}`, `&#123;% if/elseif/else/endif %}`, `&#123;% for x in xs %}`, `&#123;% raw %}`. No Java reflection, no `&#123;% include %}`, no external file access. Compile validation during form load (fail-fast: invalid forms do not appear in the listing).

---

## 6. Apply, Validate, Reset

### 6.1 Apply (Submit)

`POST /setting-forms/{name}/apply` receives `{ values: Record<string, FormValue> }`. Pipeline:

1. **Form Validation** (server-side, synchronous): `required` checks, bounds, select whitelist — same as [Wizards §6](/docs/wizards#6-validierung).
2. **Evaluate `showIf`** for each field — fields with `showIf=false` are treated as "hidden" for steps 3+4 (their `bindsTo` do not apply directly; their value is still readable in Pebble).
3. **Build Plan:** translate all `bindsTo` mappings + all `settings:` entries into a flat list of `{ key, scope, value | DELETE, settingType }`. `writeIf=false` → `DELETE`. Conflicts (two entries for the same key+scope) are a form definition error → HTTP 400.
4. **Auth Check** per scope: User must have write permissions in this scope (see §4.3).
5. **Apply Atomically:** all writes/deletes in a single `SettingService.applyBatch(...)` operation. If a single write fails (e.g., encryption error for PASSWORD), the entire batch is rolled back and HTTP 500 with a detailed list is returned.
6. **Audit:** `SettingService` logs each write/delete individually via the normal audit path. Setting Forms do nothing special — they are just a dispatcher.

Response:

```json
{
  "applied": [
    { "key": "ai.default.model",                    "scope": "project", "action": "write" },
    { "key": "ai.providers.anthropic.api_key",      "scope": "project", "action": "write" },
    { "key": "ai.providers.openai.api_key",         "scope": "project", "action": "delete" }
  ]
}
```

### 6.2 Validate (Dry-Run, without Side-Effects)

`POST /setting-forms/{name}/validate` runs the pipeline up to and including step 3, without applying. Response: the same `applied` list as a plan, plus form validation errors if any. This allows the frontend to show a "preview" before the user clicks "Save" — especially useful for forms with many computed settings.

### 6.3 Reset

`POST /setting-forms/{name}/reset` (only if `clearable: true`) deletes **all** keys that the form potentially writes — collected from `fields[].bindsTo.key` ∪ `settings[].key` —, each on its associated scope. **Not** on the entire cascade: only the layer to which the form would write. This way, values cleanly fall back to the next outer cascade layer.

Reset requires the same auth checks as Apply (User must have write permissions in all affected scopes).

### 6.4 `PASSWORD` Fields: Empty-Value Semantics

For `password` field type, an **empty string input** means: "do not change" — the value is ignored, the existing setting entry remains untouched. To delete a password setting, use the global Reset button (§6.3) or an explicit boolean checkbox "Reset API Key" with `writeIf: "!resetApiKey"` on the `bindsTo` field.

This semantic deviates from other field types — for `string`/`textarea`, "" is a valid value and is written. It is necessary because the UI does not receive the current password value in plaintext, and therefore the user cannot "type the old value".

---

## 7. Cascade — How a Setting Form Name is Resolved

Identical to the Wizard cascade ([Wizards §4](/docs/wizards#4-cascade--wie-ein-wizard-name-aufgelöst-wird)):

```
load(tenantId, projectId, userId, name) → Optional<ResolvedSettingForm> :=
  documentService.lookupCascade(tenantId, projectId,
                                "setting_forms/" + name + ".yaml")
    1. Project:  <project>/setting_forms/<name>.yaml              → source = PROJECT
    2. User:     _user_<userId>/setting_forms/<name>.yaml          → source = USER
    3. _tenant:  _vance/setting_forms/<name>.yaml                  → source = VANCE
    4. Resource: classpath:vance-defaults/setting_forms/<name>.yaml → source = RESOURCE
    5. → empty
```

Listing aggregates all four layers and deduplicates by `name` (first layer wins).

---

## 8. API

### `GET /brain/{tenant}/setting-forms`

Lists resolved Setting Forms for the current context. Response same as for Wizards — `name, title, description, icon, category, source` plus additionally `clearable: boolean`. No fields, no `settings:` section, no values.

### `GET /brain/{tenant}/setting-forms/{name}?project={projectId}`

Returns the full form definition (fields including field metadata) **plus** for each direct-mapped field the current cascade values for the specified project context:

```json
{
  "name": "llm-setup",
  "title": "LLM Settings",
  "fields": [
    {
      "name": "defaultModel",
      "type": "select",
      "label": "Default model",
      "choices": [...],
      "bindsTo": { "key": "ai.default.model", "scope": "project" },
      "currentValue": "claude-sonnet-4-6",
      "currentSource": "_tenant"
    },
    {
      "name": "anthropicKey",
      "type": "password",
      "bindsTo": { "key": "ai.providers.anthropic.api_key", "scope": "project" },
      "currentValue": "***",
      "currentSource": "project"
    }
  ],
  "settings": [...],
  "clearable": true
}
```

Pebble templates (`value`, `showIf`, `writeIf`) are **not** delivered — backend-only.

### `POST /brain/{tenant}/setting-forms/{name}/apply?project={projectId}`

Body: `{ values: Record<string, FormValue> }`. Responds with the `applied` list — see §6.1.

### `POST /brain/{tenant}/setting-forms/{name}/validate?project={projectId}`

Same as `/apply`, but Dry-Run. See §6.2.

### `POST /brain/{tenant}/setting-forms/{name}/reset?project={projectId}`

Deletes all keys referenced by the form on their respective scopes. See §6.3.

---

## 9. UI Integration (Web)

### Call Contexts

Setting Forms appear where the user administers Settings:

- **Workspace Editor** (`workspace.html`) — Project-level Settings. "Setting Forms" tab lists all forms available for the current project (cascade-resolved, with `availableIn` filter).
- **Profile Editor** (`profile.html`) — User-scope Settings. Lists only forms with `defaultScope: user` or exclusively User `bindsTo` targets.
- **Tenant Admin Area** — (Phase v1.x) Tenant Settings, visible only to Admins.

Setting Forms do **not** appear in the Chat Editor (unlike Wizards) — they are configuration, not conversation. If the user wants a setting change from within a chat, that is a normal workspace navigation step.

### Renderer

The Vue component `FormFields.vue` from the Wizard system is reused **unchanged** — it only knows the `FormField` schema and returns a `Record<string, FormValue>`. The Setting Form specific wrapper component `SettingFormView.vue`:

1. Loads `GET /setting-forms/{name}` and populates initial values from `currentValue` per field.
2. Renders `FormFields.vue` with the schema.
3. Shows a small subtitle `effective from <source>` (with icon) below the input for each direct-mapped field.
4. Provides three buttons: "Save" (→ `/apply`), "Preview" (→ `/validate`, shows plan in modal), "Reset" (→ `/reset`, with confirmation).
5. After successful `/apply`: form state is updated with the new `currentValue`/`currentSource` (no full reload needed).

### Style

As per [web-ui §7](/docs/web-ui#7-ui-konsistenz): only `VButton`, `VInput`, `VTextarea`, `VSelect`, `VCheckbox`, `VPassword`, `VAlert`, `VCard` from the component library. No DaisyUI classes outside of `src/components/`.

---

## 10. CLI Integration (Foot)

`vance settings-form list`
lists all Setting Forms available for the current session.

`vance settings-form show <name>`
shows the fields + current values (PASSWORD masked).

`vance settings-form apply <name>`
opens an interactive Picocli/JLine prompt that queries the fields sequentially — same patterns as Wizards (§9 in `wizards.md`). Submit calls the same `/apply` endpoint.

`vance settings-form reset <name>`
calls `/reset` with a confirmation prompt.

CLI Setting Forms are v1.x — not strictly necessary for v1, as the Web UI is the primary stage.

---

## 11. Security & Contracts

- **Pebble Sandbox:** Same as for Recipes and Wizards — only the declarative syntax subset. No reflection, no `&#123;% include %}`.
- **Cascade Sources:** `_user_<userId>` layer is only visible to the respective user. Project and Tenant layers follow normal [workspace-access](/docs/workspace-access) rules.
- **PASSWORD Values:** Are returned in `currentValue` exclusively as `"***"` (set) or `null` (not set) — never in plaintext, neither via `GET /{name}` nor via `/validate`. `/apply` writes them encrypted via `SettingService.setPassword(...)`.
- **Scope Auth:** Checked separately per scope value (see §4.3). A form with mixed scopes (e.g., `bindsTo.scope: project` and `settings[*].scope: tenant`) requires **all** corresponding permissions — a user without Tenant Admin will not even see the form in the listing.
- **Conflict Detection:** If two entries (Fields + Computed) reference the same `(key, scope)` tuple, the form loader rejects the definition at boot (WARN log, missing from listing). This prevents "last writer wins" behavior at runtime.
- **Fail-Fast on Load:** Forms with invalid YAML, missing required fields, Pebble syntax errors in `value`/`showIf`/`writeIf`, or unknown `settingType` are **not** included in the listing during boot/refresh.
- **Audit Trail:** Every setting write through a form goes via `SettingService` and lands in the normal audit log with `source: setting-form/<name>`. This allows later traceability of *which* form set a setting value.

---

## 12. Roadmap

| Phase | Content |
|---|---|
| **v1** | Schema + Backend Service + Cascade + `GET /setting-forms`, `GET /{name}`, `POST /apply`, `POST /validate`, `POST /reset` + `SettingFormView.vue` (based on `FormFields.vue`) + Workspace Editor Tab + Profile Editor Tab + 3 Bundled Forms (`llm-setup`, `quota-preset`, `integrations-jira`) |
| **v1.x** | CLI Integration (`vance settings-form ...`) + Tenant Admin Area + Mobile Renderer (`vance-fingers`) |
| **v2** | Conditional Fields (`showIf`) have the same Pebble syntax as here, but will be backported to Wizards in v2 — common renderer logic comes from this module. Multi-Step Forms (Pages). Cross-Field Validation (e.g., "min-value ≤ max-value"). |
| **v3** | User Editor for own Setting Forms in the Web UI (define form definition as a form — meta, analogous to Wizard-v3). |

---

## 13. Example — `setting_forms/llm-setup.yaml`

```yaml
title:       { de: "LLM-Einstellungen",                en: "LLM Settings" }
description: { de: "Provider, Modell und API-Keys für dieses Projekt",
               en: "Provider, model and API keys for this project" }
icon: cpu-chip
category: llm
defaultScope: project

fields:
  - name: provider
    type: select
    required: true
    label: { de: "Default-Provider", en: "Default provider" }
    bindsTo: { key: "ai.default.provider" }
    choices:
      - { value: "anthropic", label: { de: "Anthropic" } }
      - { value: "openai",    label: { de: "OpenAI"   } }
      - { value: "google",    label: { de: "Google"   } }

  - name: model
    type: select
    required: true
    label: { de: "Default-Modell", en: "Default model" }
    bindsTo: { key: "ai.default.model" }
    choices:
      - { value: "claude-sonnet-4-6",  label: { de: "Sonnet 4.6"   } }
      - { value: "claude-opus-4-7",    label: { de: "Opus 4.7"     } }
      - { value: "gpt-4o",             label: { de: "GPT-4o"       } }
      - { value: "gemini-2.5-flash",   label: { de: "Gemini Flash" } }

  - name: anthropicKey
    type: password
    label: { de: "Anthropic API Key" }
    showIf:  "provider == 'anthropic'"
    writeIf: "provider == 'anthropic'"
    bindsTo: { key: "ai.providers.anthropic.api_key" }

  - name: openaiKey
    type: password
    label: { de: "OpenAI API Key" }
    showIf:  "provider == 'openai'"
    writeIf: "provider == 'openai'"
    bindsTo: { key: "ai.providers.openai.api_key" }

  - name: googleKey
    type: password
    label: { de: "Google API Key" }
    showIf:  "provider == 'google'"
    writeIf: "provider == 'google'"
    bindsTo: { key: "ai.providers.google.api_key" }

  - name: tracing
    type: boolean
    defaultValue: false
    label: { de: "LLM-Tracing aktivieren", en: "Enable LLM tracing" }

settings:
  - key: "tracing.llm.enabled"
    settingType: BOOLEAN
    value: "&#123;{ tracing }}"

  - key: "tracing.llm.sample_rate"
    settingType: DOUBLE
    writeIf: "tracing"
    value: "1.0"
```

The form cleanly covers four scenarios:

- **Provider Switch:** changes `ai.default.provider`, hides the other key fields, and deletes the old keys via `writeIf` (conditional reset).
- **Model Selection:** independent of the provider, direct mapped.
- **Tracing Toggle:** a boolean field controls two setting writes (`enabled` always, `sample_rate` only when active).
- **Reset Button:** deletes all six keys (`ai.default.provider`, `ai.default.model`, three provider API keys, `tracing.llm.enabled`, `tracing.llm.sample_rate`) at the project level — cascade cleanly falls back to `_tenant`.
