---
title: "Vancetope — Settings Panel"
parent: Specs
permalink: /specs/settings-panel
---

<!-- AUTO-GENERATED from llm/specification/settings-panel.md (translated from the German specification/public/settings-panel.md) — do not edit here. -->

# Vancetope — Settings Panel

> A guided surface for everything configurable per Scope: Setting Forms,
> Settings Document Kinds, the free Key/Value editor **and the complete
> administration inventory** (Tenant, Project Groups, Projects, Languages,
> Session Groups, Copy, Kits, Tool Templates) in one place. `settings.html` has
> **replaced** the old Scopes page in a strangler pattern — `scopes.html` and
> `setting-forms.html` are deleted (design history and migration rules:
> [planning/settings-panel.md](/specs/settings-panel)); it uses
> exactly the same backends — no separate API root.
>
> See also: [setting-forms](/specs/setting-forms) (Form contract, `availableIn`)
> | [settings-system](/specs/settings-system) (Scopes, Cascades, Wire Layer)
> | [wizards](/specs/wizards) (Form Engine) | [web-ui](/specs/web-ui)

---

## 1. What the Surface Solves

Before the Settings Panel, it was unclear **where** something was configured:

- User Settings: partly self-service in `profile.html`, partly as Docs/Settings
  in the `_user_<login>` Project, which was not selectable as a Scope in any UI.
- Tenant/Project Settings: in the Raw Key/Value Editor of the Scopes page — only
  those who knew the keys could achieve their goal.
- Setting Forms: correctly listed, but in three places without a common
  inventory.
- Settings Doc Kinds (`vance-research-source`, …): only discoverable via
  document browsing.

The Panel shows, per Scope, **what is configurable here** — in four tabs:
**Areas** (Settings Doc Kinds as areas with entry management and inline view),
**Settings** (guided Setting Forms), **Project/Tenant** (administration:
Properties, Groups, Session Groups, Copy, Languages, Kits, Tool Templates —
only for Tenant and Project Scopes) and **Advanced** (free Key/Value editor).

---

## 2. Scope Model

Three Scope rows in the sidebar, identical to the Wire Form from
[settings-system.md §3](/specs/settings-system):

| Sidebar Row | Wire-`referenceType`/`referenceId` | `projectId` at Forms/Doc Endpoints |
|---|---|---|
| **My Settings** | `user` / `<login>` | `_user_<login>` |
| **Tenant** | `tenant` / `<Tenant>` | `_tenant` |
| **Project `<name>`** | `project` / `<name>` | `<name>` |

The User row is new: `_user_<me>` was previously not selectable as a Scope in
any interface. It is always accessible for one's own login (implicit ADMIN on
one's own Hub, see Permission System R7); personal Forms (`availableIn: ["_user_*"]`)
are located thereunder.

Default selection on boot: URL parameter → last used Project (`lastProject`) →
Tenant row.

---

## 3. The "Areas" Tab — Settings Doc Kinds (pluggable)

Settings Doc Kinds get their **own tab**, separate from the Setting Forms: the
tab lists the areas (Research, …) as items; a click opens the entry list of the
area with **Add** and **Delete** buttons; a click on an entry opens its view
**inline in the Settings page** — the only Cortex reference is the jump link of
the opened entry.

A Kind declares that its documents are configuration interfaces — as an optional
`settingsProvider` attribute on the existing `KindEntry` (`@vance/kind-registry`,
the same `globalThis`-registry switch; **no** second registry):

```ts
settingsProvider?: SettingsProvider;

interface SettingsProvider {
  /** i18n key for the area label (e.g., settings.areas.research.title). */
  titleKey: string;
  /** Entry inventory for a Scope; error → empty list. */
  list: (scope: SettingsScope) => Promise<SettingsDocRow[]>;
  /** Create a new entry with this name, return row (opens directly).
   *  Without create, the area shows no Add button. */
  create?: (scope: SettingsScope, name: string) => Promise<SettingsDocRow>;
}

interface SettingsScope {
  kind: 'tenant' | 'user' | 'project';
  projectId: string;   // _tenant | _user_<login> | <project>
  login?: string;
}

interface SettingsDocRow {
  name: string;        // Instance key (e.g., file stem)
  title: string;
  description?: string;
  kindId: string;
  documentId: string;  // loads and renders the Settings page inline
  projectId: string;
  path?: string;
}
```

### 3.1 Area Level

The tab has three levels, each with its own URL:

```
Areas (Area List)
  └─ area=<kindId>    Entry List + Add/Delete
       └─ entry=<documentId>   Inline View of the Entry
```

**The host renders, the provider inventories.** `AreaEntryView.vue` loads the
document (`GET documents/{id}` — Storage-backed Docs read the body via
`GET documents/{id}/content`, the same path as the Cortex tab), parses it with
the Kind's codec, and renders the registered `view` component (`:doc` /
`@update:doc`, the minimal Kind contract). **Two Save verbs:** "Apply" persists
and stays on the entry (banner "Saved.", continue editing), "Save" persists and
jumps back to the entry list (`@close` → host clears the `entry` parameter).
Next to it is the **Cortex jump** `↗`: a link to `/cortex?project=<projectId>&path=<docPath>`,
which opens the same document in the full editor — Settings configured, Cortex
working; the handoff is a path link, not a second editor. Kinds without View/Codec
or bodies rejected by the codec fall back to a raw text editor with the same
Save verbs — an entry is never a dead end. **Delete** is generic
(`DELETE documents/{documentId}`), the provider needs no hook for it.

**First Area: Research** (`vance-research-source`). Lists the Zarniwoop sources
under `_vance/config/research/` in the Scope Project
(`documents/folder?projectId=…&path=_vance/config/research/`, client-filtered
to `kind === "vance-research-source"`); `create` creates an inactive minimal
source. Serves only the Tenant and Project layers — the Source Config Cascade
(`project → _tenant → classpath`) has no User layer, so the User row gets no
lines.

**Further Areas:** **Mounts** (`vance-mount-source`, core: Jaglan Mounts under
`_vance/config/mounts/`, form with `rootDir`/`writable` for the `local` protocol)
and **Feed Sources** (`vance-feed-source`, `_vance/config/feeds/`). The latter
are proof of addon pluggability: the **Centauri Addon** registers Kind,
`settingsProvider`, and form view in its own client bundle via the Federation
seam; the Settings page loads the addon registers on boot (manifest-declared
Kinds, once, only this page) and the areas appear without the host knowing the
Centauri name. Both have server-side Kind Handlers (`MountSourceKindHandler`,
`FeedSourceKindHandler`): `detectsPath` flags atypical writes to the config
folder, validation tells during editing what the factory would otherwise silently
drop. **Fourth Area: AI Models** (`vance-model` + `vance-model-provider`, core
client; single file `modelCatalogSettingsProvider.ts`). Inventory is **path-based
like the catalog itself** (`documents/search` with `pathPrefix=_vance/model/`):
The ModelCatalog scans the path prefix and deep-merges what it finds — a Kind
filter would be alien to its contract; the line gets its view Kind from the
filename (`_provider.yaml` ⇒ Sidecar form). Create knows both forms: `provider`
seeds a Sidecar, `provider/model` a model document — with the catalog's Wire
Name encoding (`:` → `wireName` field + file slug, `/` → subdirectories); the
hint below says this (`createHintKey`, a contract extension on `SettingsProvider`).
The form is partial-override-first: cleared fields are struck keys, struck keys
inherit — numeric owned fields are written as YAML numbers, not digit strings.
Server-side: `ModelDocKindHandler` (`detectsPath` on the MANUAL tree, `model-auto`
stays out; type error validation, `wireType` hardcoded in the Sidecar).

**Fifth Area: Recipes** (`vance-recipe`, core client; `recipeSettingsProvider.ts`) —
the first administration surface Recipes ever had. **Raw text, intentionally**:
The Kind registers no View and no Codec, the Settings host falls back to its raw
text editor with Save — Recipe YAMLs are the most complex configuration documents
in the system (Engine, Params, Prompt Templates, Tool Adjustments, Profiles, Guards);
a form would either render a fraction or duplicate the loader parser. The inventory
is **flat and path-based** like the loader itself (`documents/folder`, one level):
what is resolved by name — the Slart working trees `_user/`/`_slart/` remain outside.
`create` seeds the minimal body required by the loader (`description` + `engine`),
the kebab-case name becomes the file and thus the Recipe name. Server-side:
`RecipeDocKindHandler` — all findings are errors, because the loader logs WARN and
the Recipe is then **silently gone**.

**Sixth and Seventh Areas: Chat Themes and Report Themes** (`vance-chat-theme`,
`vance-report-theme`, core client; a factory `themeSettingsProvider.ts` — the
mechanics are identical in both systems, only the vocabulary differs). Like Recipes
without View/Codec (raw text, here with CSS highlighting via MIME type), inventory
flat and path-based, Create with the name check of the resolvers (`[a-z0-9-]+`)
and a vocabulary comment as seed. **Intentionally no server-side Kind Handlers:**
both pipelines are fail-open — an invalid Theme falls back to `default.css` or is
skipped; there is no finding that the runtime itself would not absorb. Theme files
do not carry a Kind marker (CSS has no place for it) — the identity lies in the
lines of the area, the documents remain plain CSS everywhere.

**Eighth Area: Prompts** (`vance-prompt`, core client; `promptSettingsProvider.ts`) —
the Engine Prompt Overrides under `_vance/prompts/` (`<engine>-prompt.md`, Plan Mode
variants). **Create is the override workflow:** The name of the bundled Prompt
shadows it by name for every Spawn of the Scope — the hint says it, the seed carries
the convention as a comment. Raw text editor like with Recipes/Themes (Markdown via
MIME type); an empty override is intentionally allowed (the resolver filters empty
content, the bundled version remains active — the server handler reports it as a hint).
**Unlike Themes, there is a handler:** `PromptDocKindHandler` compiles the body as
Pebble — a syntax error breaks the turn, not a fallback; the finding is the difference
between edit-time message and spawn end.

**Ninth to Eleventh Areas: Scheduler, Workflows, Hooks** — three
operational configurations with existing server Kind Handlers or
new handlers, all path-based inventoried (loaders scan, never Kind markers):

- **Scheduler** (`vance-scheduler`, `schedulerSettingsProvider.ts`): `_vance/scheduler/`,
  flat, **typed** — the registered SchedulerFormView + Codec open inline,
  the Cron breakdown contract is the same as in the Cortex Document tab. Firing and
  event log deliberately remain in the Insights tab (both read the same
  documents, no data redundancy). Seed fulfills the two loader rules: exactly one
  target (recipe/workflow/script), exactly one trigger (cron or at). Server handler
  `UrsaSchedulerKindHandler` already exists.
- **Workflows** (`vance-workflow`, `workflowSettingsProvider.ts`): `_vance/workflows/`,
  flat, **typed-viewer** — the registered WorkflowFlowView renders the
  state graph inline (parse/serialize are identity, the view never emits
  `update:doc`): the graph is the map, not the road; Workflow YAML is edited as
  text. First administration surface for definitions — the Magrathea Admin
  inspects Runs, not Workflows. Seed is a valid single-state Workflow
  (`start: work`, an `agent_task`, terminal without `transitions:`).
- **Hooks** (`vance-hook`, new, `hookSettingsProvider.ts`): `_vance/hooks/`,
  **recursive** (Event is path segment: `_vance/hooks/<event>/<name>.yaml`),
  raw text — a Hook body is exactly one TriggerAction (recipe/script/workflow)
  plus Lifecycle keys, not worth a form. **Structured Create Name** like with
  Models: `event/hook-name`, Event validated against the seven Wire Names,
  Hook Name against the loader grammar. Server handler `HookDocKindHandler`
  **delegates to the canonical `UrsaHookYamlParser`** — a finding means
  exactly what the loader does (skip, logged, never fatal); the Event segment is
  checked first (Registry lists by Event — unknown Event = invisible).
  Hooks register only with Project activation — the area writes
  the document, the loader loads it on bootstrap/refresh.
  The write path via Document REST accepts User Actor (verified) —
  the area uses the same path as any Operator edit; the Hook tools
  additionally remain the Agent path with Admin gate and SYSTEM Actor for audit.

**Twelfth and Thirteenth Areas: Guards, Wizards** — the last two
area candidates from the `_vance/` inventory, both path-based, both
raw text (no View/Codec):

- **Guards** (`vance-guard`, new, `guardSettingsProvider.ts`): `_vance/guards/`,
  flat, `.js` — the **script library**, not the wiring: which Recipe
  fires which Guard at which point remains in the Recipe `guard:` block, which
  cites the path. Server handler `GuardDocKindHandler` **delegates to the
  parse-only GraalJS validator** (`JsValidationService`) — the same
  `Source.newBuilder + Context.parse` as in the Executor. Rationale: the points
  are not uniform — STOP/TERMINATE and START fail-open (script error
  is absorbed, the Guard silently never runs), COMMAND fail-closed (script
  error breaks the Command). A syntax finding is worth both. The fix to the
  validator (`js.top-level-await` + experimental gate as in the Executor)
  prevents false positives: the bundled `llm-judge.js` shipped with
  top-level `return` — a GraalJS syntax error that fail-open swallowed, the
  Guard silently never ran; the script is repaired (if/else instead of Early-Return).
- **Wizards** (`vance-wizard`, new, `wizardSettingsProvider.ts`):
  `_vance/wizards/`, flat — **the first area with a User layer**: the
  Wizard Cascade is `project → _user_<login> → _vance → classpath`, and the
  User Scope of the Panel is exactly the `_user_` level; the same provider serves
  all three Scopes unchanged. Server handler `WizardDocKindHandler` runs
  via a `validateBody` seam on the canonical `WizardLoader.parse` — a
  finding is what the loader skips with WARN (localized
  title/description, at least one Field, Pebble-compiling `promptTemplate`).
**Inherited Entries (Contract Extension).** Previously, each area listed
only the documents of the selected Scope. For Kinds with a cascade, this is
insufficient: if a Project is selected, one also wants to see what it inherits
from the Tenant or from the bundled defaults. A provider may therefore supply,
in addition to its `SettingsDocRow`s (`documentId`, the Scope owns the document),
also `SettingsInheritedRow`s — `inherited: 'tenant' | 'bundled'`, **without**
`documentId`; `list` returns `SettingsAreaRow[]` (the union). The host shows
inherited rows below its own, with an origin badge, without deletion and without
opening; the only action is **"Override here"** → the optional provider hook
`override(scope, row)` creates a local copy with the resolved content and
returns its `SettingsDocRow`, which the host opens immediately. The copy
shadows the original only in this Scope; deleting it restores the inherited one.
Inherited rows without `override` would be a dead end — the contract couples both.
Existing providers remain unchanged (`SettingsDocRow` is the same type as before,
only with `inherited?: undefined` as a discriminator). Candidates for the same
approach: Prompts, Recipes, Themes — it is still pending there.

**Fourteenth Area: Server Tools** (`vance-server-tool`, new, core client;
`serverToolSettingsProvider.ts`, `ServerToolFormView.vue`, `serverToolCodec.ts`)
— has **replaced** the dedicated page `tools.html`. `_vance/server-tools/`, flat,
**typed**: the form of the old page as a Kind View (Type, Description,
Active/Primary, Pack specifications, Labels, now also `promptHint`), for
`mcp_server` the structured server form with JSON toggle, login block,
and connection test ([mcp-client-oauth.md](/specs/mcp-client-oauth) §6), for all
other types JSON parameters with the type's parameter schema. The model is the
entire YAML map; the codec writes in the order of the server writer
(`ServerToolConfigYamlWriter`) so that diffs look consistent. The **first
area with inherited rows**: own documents come from `documents/folder`,
the cascade including tier from the unchanged Admin list
(`GET admin/projects/{p}/server-tools`, `source` `TENANT`/`BUNDLED`);
`override` reads the resolved Tool (`GET …/server-tools/{name}`) and writes
it as a document into the Scope. `create` seeds a **disabled** MCP server
(a server without a URL would fail on the first lookup). Only Tenant and
Project layers — the cascade has no User layer.
Saving is done via the document pipeline; the registry follows via the
existing `ServerToolDocumentListener`. Because the Admin REST was previously the
only validating write path, `ServerToolDocKindHandler` now validates the same
on the document: `ServerToolLoader.validateYaml` (what the loader would silently
skip) and the type against the `ToolFactoryRegistry` (what
`ServerToolService` rejects). Login and test act on the **saved** state
(the server resolves the Tool by name) — the View states this. The
MCP login returns via `returnTo` with `mcpLogin=1` to exactly the open view
(Settings entry or Cortex tab). The Admin REST
(`/admin/projects/{p}/server-tools…`) remains unchanged.

**MCP Packs and Skills are not Areas** (decision): MCP/REST Packs are client
files of the Foot (`.vancetope/foot-tools/`), not a document in the Scope;
Skills are kit-bundled Manuals, not a configuration document.
Neither has anything an Area could inventory.

**In perspective (intentionally not yet):** carry the area declaration server-side
and validate fail-fast on boot (like the Setting Form Loader).
Until then, the client registry entry is the truth.

**Standard Shell Behavior (Focus Model):** The Settings page runs the
EditorShell in standard mode like any other editor (Cortex, Chat,
Insights, Tools, Runs, …): `focus-model="auto"` + `v-model:focus-zone` +
`full-height` (Spec `web-ui.md` §7.2.1). This collapses the sidebars to 0 on small
viewports (≤900px), the reclaim handles at the zone edges bring them back, the
focused zone stands out — and the Project selection on the left reports
`@focus-main`, so that selecting a Project jumps back into the content. The left
sidebar is the universally used `ProjectListSidebar`.

**Context Help via the Standard Drawer** (Resolution in `settingsHelp.ts`):
The Settings page uses the **helpPath-Prop of the EditorShell** — the same
"?" toggle in the Topbar, the same Drawer, the same `useHelp`-Load as in
Cortex. The Settings contribution is only the **resolution** of which file the
context wants (three levels):

1. **Entry open** → `doc-kind-<kindId>.md` — the **Cortex convention**:
  exactly the same file that the Cortex Help tab shows for this document.
  One file per document type, one place for maintenance.
2. **Area open** (Entry list) → `settings-area-<areaId>.md` — what this
  area configures, naming conventions, cascade, pitfalls. Without
  Cortex counterpart.
3. **Otherwise** (Area list, Forms/Properties/Advanced) → `settings.md` —
  the page itself.

A path change leaves the Drawer open as the user set it and swaps the text
(EditorShell contract). Missing files result in a "no help yet" hint, not an
error — help grows incrementally. All areas and their editor document types
are covered; the Feed Sources help is in the **Centauri Addon** (Classpath
resources travel with the Addon, `ClassPathResource` finds them).

### 3.2 The "Settings" Tab — Setting Forms

`GET /brain/{tenant}/setting-forms?projectId=<projectId>` — unchanged.
Without parameters (= Tenant row), the Tenant context applies; for the User row,
`_user_<login>` is passed as `projectId`, which correctly filters `availableIn`-globs
(`_user_*`) and live cascade values. Clicking a card opens the Form **inline**
(`SettingFormView.vue`, reused unchanged) with a back button; Apply/Validate/Reset
run via the existing Setting Forms endpoints.

### 3.3 The "Project/Tenant" Tab — Administration (only Tenant and Project Scopes)

The complete administration port of the Scopes page, with the same backends and
i18n keys (`scopes.project.*`, `scopes.group.*`, `scopes.tenant.*`,
`scopes.kit.*`, `scopes.sessionGroups.*` — the vocabulary of the Scopes page
lives on here):

- **Tenant Card** (`TenantCard.vue`, Tenant Scope): Name read-only, Title,
  Enabled, Save via `admin/tenant` (`useAdminTenant`).
- **Group Card** (`GroupCard.vue`, when a group row is selected): Name
  read-only, Title, Enabled, Delete (reserved Group `archived` is
  read-only) via `admin/project-groups` (`useAdminProjectGroups`).
- **`ProjectTab.vue`** (Project Scope):
  - Properties Card: Title, Enabled, Group (Move), the read-only facts
    (Status, Pod, claimed, Lifecycle Type + explanation, Placement-
    pending, created) via `admin/projects` (`useAdminProjects`);
    Save via `PUT`, Archive via `archive` (confirm-guarded),
    **Copy** (dialog with report — remains open because the report is the
    point of the operation; the Open button jumps to the copied Project).
  - Languages Card: `chat.language` / `content.language` as dropdowns via
    the Settings REST (`useScopeSettings`, Project Wire Scope) — "not
    set" deletes the override, the cascade falls outward. Language names
    from `Intl.DisplayNames`, no second label table.
  - Session Groups Card: List (with session counter), Rename inline,
    Delete (confirm), Create with Slugify — `admin/session-groups`
    (`useSessionGroups`).
  - `KitAdminSection.vue`: installed Kits (signature status, license expiry,
    origin artifacts), Install (Project picker for `project:` sources +
    Library picker + Git form), Update/Single/All, Apply (trackInstall
    off), Export (source role), Uninstall (prune question), Per-Kit-Config
    (Update Policy rules, sortIndex) — via `useKitAdmin` /
    `useKitSourceProjects`, reused unchanged.
  - `ToolTemplatesSection.vue`: the Tool Template catalog
    (`_tenant/config/tool-templates.yaml`) with search, input dialog,
    pre-filling from the last Apply and result report — **replaces the
    dedicated page `tool-templates.html`**. Stands next to Kits because a
    Template is a Kit with a form: it installs documents, settings, and
    server tools into the Scope — an action on the Scope, not an area. The
    target is the Scope itself (the free Project field of the old page is
    removed); in the Tenant Scope, the section is below the Tenant Card and
    writes to `_tenant`. The catalog is Tenant-Admin-only — if `403`, the
    section remains hidden. Backend (`admin/tool-templates/*`) unchanged.

The tab is **scope-cooked**: it appears only for Tenant and Project
Scopes (label "Tenant" or "Project" — the Scope, not a generic
word); a URL with `tab=properties` on the User row falls back to the
Settings tab (`effectiveTab`), and a Scope change with an open
tab lands on the Settings tab.

**Sidebar in Edit Mode:** the reused `ProjectListSidebar`
(`edit-enabled`, `show-group-rows`) brings Project/Group creation (with
Kit catalog dropdown), Drag&Drop move, and status badges (deactivated,
archived, ⏳ waiting for Pod); the Settings page reacts to
`@data-changed` like the Scopes page did before (Reload, selection, banner — incl.
"created, waiting for placement").

### 3.4 The "Actions" Tab — Operator Actions (only Tenant and Project Scopes)

Operator commands behind a **backend SPI**: each action is an
`AdminAction` Spring Bean in the Brain (id, multilingual title/description
maps with `en`-fallback, Scope type, run) — the Registry collects all Beans,
addons can contribute some without host code. REST:
`GET admin/actions` (descriptors) and `POST admin/actions/{id}?projectId=…`.
The controller enforces ADMIN on Tenant (and for Project runs on the
Project); a `TENANT_ONLY` action with projectId is a 400 before it runs.

The result is **a generic form for all actions**
(`AdminActionRunResultDto`: ok, summary, Items with key/ok/detail/durationMs)
— the tab renders each action without knowing it. A finding (failed
model ping) is ok=false with HTTP 200; only execution aborts become errors.

Actions (v1):
- **`model-catalog-refresh`** (TENANT_ONLY) — immediate catalog reload instead
  of 30-minute timer. Migrated here from the Profile.
- **`model-discovery`** (TENANT_ONLY) — a Discovery run over the Tenant
  (walks all Projects, writes `_vance/model-auto/`). Migrated from the Profile.
- **`model-check`** (TENANT_AND_PROJECT) — checks **only the configured
  aliases** (`ai.alias.*`, e.g., default:code), not the entire catalog:
  each alias is resolved as a Spawn would resolve it, each
  **different** target model gets exactly one minimal call ("Hello").
  Bounded parallel (5, 20s deadline each).
- **`research-check`** (TENANT_AND_PROJECT) — a minimal investigation via
  the same dispatcher as the Research Tools; Tenant checks `_tenant`.

The tab is scope-filtered: on Project rows, TENANT_ONLY actions disappear,
User Scope does not show the tab. The URL `tab=actions` is state like everywhere else.

### 3.5 The "Advanced" Tab — Raw Editor

Free Key/Value editing per Scope via the existing
`AdminSettingsController` interface (`useScopeSettings`-Composable, reused
without change): List, Inline Edit, Delete, Create with type selection.
The same editor as the Raw tab of the old Scopes page — built as a **new,
standalone component** (`RawSettingsPanel.vue`), not extracted from
`ScopesApp.vue`.

Semantics as in the Scopes page: empty for encrypted types means
"do not change"; `""` for plaintext types is the explicit
cascade breaker; `null` values continue to cascade (display distinguishes
"empty — inherits" from "empty — does not inherit").

**Permission Note:** listing the Admin Settings REST requires
Tenant-ADMIN (existing behavior, same backend rule as the
Scopes page). Users without this role see the endpoint's error message
in the Raw tab — the guided forms remain usable, they authorize per
Scope on apply.

---

## 4. Navigation — The URL is the State

The page follows the Cortex contract (`cortexUrl.ts`): **the URL is the
state**, no hidden session storage. The owner of the query contract is
`settingsUrl.ts` (Parse/Serialize/Push/Replace in one place):

| Parameter | Meaning |
|---|---|
| `scope` | `tenant` \| `user` \| Project name (any non-keyword value) |
| `tab` | `areas` (Areas) \| `properties` (Administration, only Tenant/Project) \| `actions` (Actions, only Tenant/Project) \| `raw` (Advanced); missing = Settings (Forms, Default, not serialized) |
| `form` | Name of the opened Setting Form; missing = Form listing |
| `area` | Kind ID of the opened Area; missing = Area list |
| `entry` | Document ID of the opened Entry; missing = Entry list |
| `group` | Selected Project Group row (only meaningful with `scope=tenant&tab=properties`); missing = no group. Is cleared on every Scope change. |

Follow-up behavior: Browser Back/Forward navigates between visited
Scopes/Forms, F5 maintains the state, shared links reproduce the
view. A stale form (Scope change, listing no longer has the form)
is removed from the view instead of being rendered dead.

**Deep-Link from the User Menu:** the Topbar menu item "Settings"
builds `editorHref('settings', { scope: 'user' })` — thus it is not a
special case, but one of the usual addresses of this page.
`editorHref` (`platform/editorHref.ts`) is the single place for Surface URLs;
`settings` is a `StandaloneSurface` with its own Vite entry
(`settings.html`).

---

## 5. UI Structure

```
settings.html (Standalone Surface)
└── EditorShell (Mandatory Shell)
    ├── Sidebar
    │   └── ProjectListSidebar (Component reused: Group rows,
    │       Filter, Edit mode: Create + Drag&Drop Move, Kit Catalog,
    │       Status Badges)
    └── Main
        ├── Scope Header (Label + Wire ID) + Banner
        ├── Tab Bar: Areas | Settings | Project/Tenant* | Advanced
        │             (* only Tenant/Project Scopes, Label = the Scope)
        ├── Areas: Area List → Entry List (+Add/Delete)
        │   └── Entry open: Back + AreaEntryView (Inline Kind View)
        ├── Settings: Form Listing by Category
        │   └── Form open: Back + SettingFormView
        ├── Project/Tenant:
        │   ├── Group selected (group=…): GroupCard
        │   ├── Tenant: TenantCard, ToolTemplatesSection
        │   └── Project: ProjectTab — Properties Card (Title, Enabled,
        │       Group, Facts, Archive, Copy), Languages Card
        │       (chat/content.language), Session Groups Card,
        │       KitAdminSection (installed Kits, Install/Update/Export,
        │       Per-Kit-Config), ToolTemplatesSection
        └── Advanced: RawSettingsPanel
```

Component rules according to `agent/face.md`: Primitives from `@vance/components`,
DaisyUI only in allowed directories, i18n in its own
`settings.*`-namespace (en + de), everything user-facing translated.

---

## 6. Cutover Status and Open Items

- **Scopes Page is gone:** parity is complete (Tenant, Group,
  Project Card including languages, Session Groups, Copy, Kits, Raw Editor,
  Setting Forms listing, Create/Move/Badges) and link checking is
  done — `scopes.html`, `setting-forms.html` along with apps and
  Vite entries are deleted; `editorHref` no longer knows these Surfaces.
  All entry points (Landing Tile, Megadodo Kit Link, User Menu) point to
  `settings.html`. The `scopes.*`-i18n keys used by the ported components
  live on; dead page ballast (`scopes.settingsPanel.*`,
  `scopes.sidebar.*`, …) has been removed.
- **Tools and Tool Templates pages are gone:** `tools.html` and
  `tool-templates.html` along with apps, Vite entries, `editorHref` surfaces, and
  landing tiles are deleted. Server Tools are an area (§3.1), the
  Templates a section in the Project/Tenant tab (§3.3). The help of the old
  page lives on as `doc-kind-vance-server-tool.md`, plus
  `settings-area-vance-server-tool.md`.
- **No server-side Kind declaration** (see §3.2) — client registry
  remains the truth until caught up.
- **Areas extended (done):** Mounts (core client), Feed Sources
  (Centauri Addon, via Federation — proof of pluggability),
  AI Models, Recipes, Chat Themes, Report Themes, and Prompts
  (core client, path-based inventories) are present as `settingsProvider` contributions;
  MCP Packs and Skills are intentionally not areas (not
  configuration documents, §3.1).
- **Open:** Category vocabulary of the areas (rough groups in the
  area listing) and the server-side area declaration (§3.1).

---

*See also: [planning/settings-panel.md](/specs/settings-panel)
(Design History, Strangler Phases, Parity Checklist) |
[readme/settings-panel.md](/specs/settings-panel) (Implementation Documentation)*
