# Vancetope — Document Kind `application`

> Specifies the **`application` payload** for documents named `_app.yaml` — the manifest at the root of a Vancetope "application folder". The folder + manifest convention turns an otherwise-flat tree of documents into a self-contained domain workspace (calendar suite, kanban board, wiki, …) with its own derived artifacts and per-app Java service.
> See also: [doc-kind-calendar](doc-kind-calendar.md) | [app-calendar](app-calendar.md) | [app-canvasbook](app-canvasbook.md) | [doc-kind-canvas](doc-kind-canvas.md) | [web-ui](web-ui.md)

---

## 1. Purpose

Beyond a certain complexity, a single YAML file is no longer sufficient for a domain. Examples:

- A **Project Plan** with three Lanes (Design, Backend, Frontend) and auto-generated Gantt + conflict list.
- A **Kanban Board** (v2) with Cards in `todo/`, `doing/`, `done/` subfolders.
- A **Wiki** (v2) with linked Pages and an auto-generated backlinks index.

Vancetope solves this with the **Application Pattern** — analogous to macOS `.app` bundles, which appear as a single file in Finder but are actually a folder with an `Info.plist` manifest:

- A folder with `_app.yaml` at its root is a **Vancetope Application Instance**.
- The manifest specifies: which app type (`$meta.app: calendar`), how it's configured (`config.calendar: {...}`).
- Domain tools recognize the folder and dispatch operations to the correct Java service.
- Generated artifacts (e.g., `_gantt.md`, `_conflicts.yaml`) reside in the same folder, are immediately recognizable as "system-managed" via the `_`-prefix, and are rewritten with every `app_rebuild`.

**Design Principle — Pattern over Ad-Hoc Solution.** The App concept is introduced with Calendar as a reference implementation. A pure `kind: calendar-suite` convention would be an isolated solution, not generalizable later. With `kind: application + app: calendar`, we achieve the same result for the Calendar case, but the foundation for future Apps is already in place.

**Design Principle — Folder is the Edit Unit.** An App is not a monolithic file, but a folder full of small, diff-friendly files. Lanes / Phases / Sub-Topics are expressed via subfolders. If you see a monolithic file, the App has been modeled incorrectly.

**Design Principle — Generated Artifacts are Read-Only on the Source Side.** Files with an `_`-prefix are system output: `_gantt.md`, `_conflicts.yaml`, `_index.md`. Manual edits to them will be overwritten during the next `app_rebuild`. To make permanent changes, modify the source files and rebuild.

**Design Principle — Updates are Triggered, Not Cascading.** An App's derived data is **not automatically recomputed when** a source file is saved. There is **no self-triggering document change chain** (Save → Hook → Script writes Doc → Hook → … → Flip-Flop). Instead, the transformation is **controlled and finite**:

- **Manually / by Click** — the user (or LLM) explicitly triggers regeneration: `app_rebuild(folder)` or a fine-grained domain tool (§6). A "Rebuild" button in the App view is precisely this click.
- **By Save-Trigger** — if an App needs to react on save, this runs as **a separate, one-time transformation stage** (a script run that rewrites the artifacts), **not** as a hook that re-attaches to the resulting writes. The trigger executes exactly one controlled pass and ends there.

The refresh contract (`VanceApplication.refresh()`, §5) is intentionally a **deterministic, terminating DAG**: source files in → artifacts out, no re-entry. This eliminates the need for cascade protection — the danger simply doesn't arise. Background and the consciously **not** built alternative (`document.*`-Change-Hook + Cascade-Guard) are in [`ursahooks`](ursahooks.md) §3 and [`planning/ursa-cascade-guard.md`](../../planning/rejected/ursa-cascade-guard.md).

**Design Principle — Apps may go beyond Vancetope's standard conventions.** Vancetope intentionally has a unified editor model ("CodeMirror everywhere", one Doc tab per file, Markdown source as truth). Apps are the sanctioned escape: the immersive App view hides the standard shell and gives the App the entire tab body — it may provide its own block editor, a drag-and-drop board, a slideshow, or an interactive form (Kanban does exactly this with `KanbanBoard.vue`). The price for this is non-negotiable: **the on-disk format must remain Vancetope-compatible** — diff-friendly files, LLM-readable (Markdown or structured YAML/JSON according to App schema), no editor state hidden in a binary blob, no lossy round-trip if someone opens the file in the fallback CodeEditor. An App whose data can only be edited via its own UI does not belong in Vancetope — it belongs in an external application with Vancetope export.

**What this spec defines:**

- Top-level `kind: application` discriminator + `$meta.app` as App-Type sub-discriminator.
- Manifest schema (`_app.yaml`).
- Java Foundation: `VanceApplication` interface, `VanceApplicationRegistry`, generic `app_rebuild` tool.
- Folder conventions for `_`-prefixed system files.
- Resolution rule for App discovery.
- Web UI handling (v1: plain Code tab; v2: App Cards in folder listing).

**What it does not define:**

- What a specific App does — that is the responsibility of the respective App spec (e.g., [app-calendar](app-calendar.md)).
- App templates / Kit bootstrapping (belongs in a future Kit extension).
- Cross-App relationships (a `kanban` App that pulls tasks from a `calendar`). This would require a separate "App Linking" concept, which is not part of the v1 Foundation.

---

## 2. Data Model

### 2.1 Top-Level

| Field         | Type                      | Required | Meaning                                                                  |
|---------------|---------------------------|----------|--------------------------------------------------------------------------|
| `kind`        | `string` = `"application"`| yes      | Top-level discriminator. Automatically mirrors to `DocumentDocument.kind`. |
| `app`         | `string`                  | yes      | App-Type discriminator (`"calendar"`, later `"kanban"`, …). Automatically mirrors to `DocumentDocument.headers.app` via standard Header-Strategy. |
| `title`       | `string`                  | no       | Display title of the App instance.                                       |
| `description` | `string`                  | no       | Free-form description.                                                   |
| `config.<app>`| `object`                  | no       | App-specific config, nested under the App name. Schema defined by the respective App spec. |
| `extra`       | `object`                  | no       | Pass-through for unknown top-level keys, round-trip stable.              |

### 2.2 Discovery Rule

A folder is a Vancetope App if `<folder>/_app.yaml` exists AND `kind == "application"`. Other App types are distinguished via `$meta.app` — if a Calendar App is expected, check `app == "calendar"` and throw `KindCodecException` if not.

### 2.3 `$meta`-Mirroring (DB-Layer)

Vancetope's standard `JsonHeaderStrategy` / `YamlHeaderStrategy` extracts all scalar `$meta` fields into `DocumentDocument.headers` (Map). `kind` is privileged + indexed; `app` runs as a regular header entry.

This allows both discovery queries without a body scan:

- **"all Apps in the project"** → `documentService.listByKind(tenantId, projectId, "application")` (indexed).
- **"all Calendar Apps"** → Filter `doc.headers.app == "calendar"` post-fetch. If needed, later a compound index `(kind, headers.app)`.

---

## 3. Format Mapping

### 3.1 YAML (Canonical)

```yaml
$meta:
  kind: application
  app: calendar
title: "Website Relaunch Planning"
description: "Q3 2026 — Redesign + Rebuild"
calendar:
  window:
    from: "2026-06-01"
    until: "2026-09-30"
  lanes:
    design:  { title: "Design",  color: blue,  order: 1 }
    backend: { title: "Backend", color: green, order: 2 }
  gantt:     { outputPath: "_gantt.md" }
  conflicts: { outputPath: "_conflicts.yaml" }
```

### 3.2 JSON (1:1 Dual)

```json
{
  "$meta": { "kind": "application", "app": "calendar" },
  "title": "Website Relaunch Planning",
  "calendar": {
    "lanes": {
      "design":  { "title": "Design",  "color": "blue",  "order": 1 },
      "backend": { "title": "Backend", "color": "green", "order": 2 }
    }
  }
}
```

### 3.3 Markdown

**Not supported.** A manifest is structured config — a Markdown representation would make the App schema unreadable. Codec throws `KindCodecException`.

---

## 4. Folder Conventions

### 4.1 `_`-Prefix = System-Managed

Files with an underscore prefix are reserved:

| File                 | Meaning                                        | Who writes?                  |
|----------------------|------------------------------------------------|------------------------------|
| `_app.yaml`          | App Manifest (Discovery Marker + Config)       | User / LLM                   |
| `_info.yaml`         | Lane-local Override (optional, app-specific)   | User / LLM                   |
| `_<artifact>.<ext>`  | Generated Output (e.g., `_gantt.md`, `_conflicts.yaml`) | Refresh Engine exclusively |

Domain tools may overwrite `_<artifact>` files **without prompting** — they are explicitly marked as regeneratable.

### 4.2 Lane Convention

Subfolders within the App folder represent Lanes / Sub-Topics. Each App spec defines the exact semantics. For `app: calendar`: leaf folder = Lane name (see [app-calendar](app-calendar.md) §3).

### 4.3 Nesting

Deeper nested structures are allowed — the App spec decides whether this carries meaning. Default recommendation: no deeper than 2 levels.

---

## 5. Java Foundation

### 5.1 `VanceApplication` Interface

```java
public interface VanceApplication {
    String appName();                              // "calendar", "kanban", …
    RefreshResult refresh(RefreshContext ctx);     // regenerate all artifacts

    /** Optional per-turn prompt-inject for the active-app hint. */
    default @Nullable String promptInject(PromptInjectContext ctx) {
        return null;
    }

    record RefreshContext(String tenantId, String projectName,
                          String folder, @Nullable String userId,
                          @Nullable String processId) { }

    record PromptInjectContext(String tenantId, String projectName,
                               String folder,
                               @Nullable String sessionId,
                               @Nullable String processId) { }

    record ArtefactResult(String name, String path,
                          @Nullable String markdownLink,
                          Map<String, Object> stats) { }

    record RefreshResult(String app, String folder,
                         List<ArtefactResult> artefacts) { }
}
```

Implementations are regular Spring Beans (`@Service`). They are automatically registered in the `VanceApplicationRegistry`. `promptInject` is optional — the default returns `null`, and the Engine prompt then does not render the App block at all.

### 5.2 `VanceApplicationRegistry`

```java
@Service
public class VanceApplicationRegistry {
    public VanceApplicationRegistry(List<VanceApplication> apps) { … }
    public VanceApplication require(String appName) { … }   // throws on unknown
    public Optional<VanceApplication> find(String appName); // silent miss
    public Set<String> knownAppNames() { … }
}
```

Generic code (e.g., `AppRebuildTool`) retrieves the correct App via `registry.require(manifest.app())`. The `find` variant exists for the Engine drain (see §11), which **silently degrades** on an unknown App type instead of killing the turn. No code change when new Apps are added.

### 5.3 Concrete App Services

Each App provides:

- **Manifest Helper**: typed view of the `config.<app>` block (e.g., `CalendarsAppConfig.from(applicationDocument)`).
- **Domain Helper**: pure-function building blocks (`ConflictDetector`, `GanttRenderer`, …).
- **`@Service`-implementation** of `VanceApplication`, which wires everything into a `refresh()` pipeline.
- **Domain Tools** (LLM-facing), which usually access the App service thinly.

The pure call flow:

```
User chat → LLM → app_rebuild(folder)
              → AppRebuildTool reads _app.yaml + dispatches
              → registry.require(manifest.app()).refresh(ctx)
              → CalendarsApplication.refresh() runs ConflictDetector + GanttRenderer
              → writes _conflicts.yaml + _gantt.md via DocumentService
              → returns RefreshResult to tool
              → LLM embeds the markdownLinks in chat reply
```

---

## 6. Tooling

### 6.1 Generic — `app_rebuild`

```
app_rebuild(folder: string, projectId?: string)
→ { app, folder, artefactCount, artefacts: [{ name, path, markdownLink, stats }] }
```

Reads `<folder>/_app.yaml`, dispatches via `$meta.app`. Works for any App registered in the Registry.

### 6.2 Domain-Specific (Optional)

Each App may additionally offer fine-grained tools that regenerate only partial artifacts — e.g., `calendar_conflicts` (only `_conflicts.yaml`) or `gantt_from_calendars` (only `_gantt.md`). These are thin wrappers, delegating to public methods on the App service.

Read-only queries (e.g., `calendar_aggregate`) live outside the refresh contract — they do not write files and do not require a service implementation.

---

## 7. Web UI

### 7.1 Mount in Cortex/Notepad

Apps are opened in the same tab system as all other Documents — no separate HTML entry, no second dispatcher component.

- `docTypeRegistry.resolveBinding` recognizes `kind: application`, reads the `app:` discriminator from the headers, and calls `resolveKind('application:<type>')` from `@vance/kind-registry`.
- Each Addon (Calendar, Kanban, Slideshow) registers an `application:<type>` kind in its `./register`-Federation-Expose with a wrapper component (`<Calendar|Kanban|Slideshow>AppKind.vue`) that adapts the `document`-Prop to the App mount convention `(projectId, folder, title)`.
- If the bundle or discriminator is missing: fallback to the Catch-All CodeEditor — inspection / repair of the manifest remains possible, no hard fail.

The former `app.html`-specific HTML entry and the `AppEditor.vue`-dispatcher are removed — Apps now live under `/cortex?doc=…/_app.yaml` and `/cortex?doc=…/_app.yaml` with identical mount logic (see [web-ui](web-ui.md)).

### 7.2 Immersive App View

When opening an `_app.yaml`, the tab starts in **App View**:

- The FileTree sidebar, Tabs strip, File/Chat menu bar, and DocumentTabShell toolbar are hidden — the folder-level App gets the entire tab body.
- A slim header bar at the top with path + `[App|Edit]` toggle remains. Clicking **Edit** flips `viewEditMode='edit'`: full toolbar + sidebar + tabs return, the body shows the raw YAML in the CodeEditor. Clicking **App** returns to the immersive view.
- Properties and Notes panels are suppressed in App View (the `propertiesOpen` / `notesOpen` Refs remain untouched, so that Edit mode or switching to a normal Doc does not lose the user's preference).
- The **Right-Panel Chat in Cortex remains visible** — Apps and Chat work together. Full-screen modes (e.g., slideshow full-screen) are handled by each App internally, not the Shell.
- Notepad mounts identically but has no chat per se — the sidebar logic also applies there.

`viewEditMode` is consistent across all tabs (sessionStorage-backed, shared composable `cortex/useViewEditMode.ts`).

### 7.3 What the Web UI does not do

- Inline rendering of `_app.yaml` in chat. It's config, not a visual.
- Global "App Overview" view across all Apps of a project (separate PR if needed).
- Auto-live-reload of the App view on sub-doc changes — Apps can use the `documents.subscribePrefix`-frame for this (see [documents-channel](documents-channel.md) §2.1 + §11.3).

---

## 8. Future Apps (Sketch, Not v1)

> **Already implemented** (no longer a sketch): `app: workbook` (+ `kind: workpage`
> — [app-workbook](app-workbook.md)), `app: canvasbook` (+ `kind: canvas`
> — [app-canvasbook](app-canvasbook.md) / [doc-kind-canvas](doc-kind-canvas.md))
> and `app: binder` ([app-binder](app-binder.md) — reference binder over
> documents of **any** kinds, manifest-anchored instead of folder-derived,
> right read-only embed + Cortex deep-link) are real reference Apps on this
> foundation. The table below lists the remaining sketches.

| App-Type          | Convention                                            | Generated Artifacts                           |
|-------------------|-------------------------------------------------------|-----------------------------------------------|
| `app: calendar`   | `*.yaml` Calendar files in subfolders (= Lanes)       | `_gantt.md`, `_conflicts.yaml`                |
| `app: kanban`     | `*.md` Card files in Lanes (`todo/`, `doing/`, …)     | `_board.md` (rendered overview)               |
| `app: wiki`       | `*.md` Pages with `[[Page]]`-linking                   | `_index.md`, `_backlinks.yaml`                |
| `app: book`       | `*.md` Chapters with `order:`-Frontmatter             | `_compiled.md`, `_toc.yaml`                   |
| `app: research`   | `sources/`, `notes/`, `synthesis/`                    | `_summary.md`, `_sources-bibliography.yaml`   |
| `app: meeting-room` | Date files with Notes, Tags                         | `_topic-index.yaml`, `_action-items.yaml`     |

Each of these Apps would be a new `@Service implements VanceApplication` plus the domain-specific helpers and (optional) Domain Tools — no changes to the Foundation code.

---

## 9. Anti-Patterns

- **An App folder with only a single file inside.** If the entire App fits in one file, you don't need an App. Use the appropriate Document Kind directly.
- **Manual edits to `_<artifact>` files.** These will be overwritten. Edit the sources, then `app_rebuild`.
- **App service without a unique `appName()` value.** Registry throws on boot, container fails to start — intentionally.
- **App-specific data outside the `config.<app>` block** (e.g., directly under `$meta`). Breaks layering, makes schema evolution difficult.
- **Cross-App write access** (one App writes to another's folder). Strictly avoid — each App is an autonomous unit.

---

## 10. Mapping to Other Vancetope Concepts

- **Kits**: Apps are suitable as Kit templates — a "Sprint Planning Kit" could offer a pre-configured `app: calendar` folder with default Lanes.
- **RAG**: every source file in an App folder is indexed normally (default behavior). Generated artifacts are also indexed — they are useful search results ("where is the Q3 Gantt?").
- **Settings**: Apps could in the future have App-specific Tenant settings (e.g., "Standard Gantt colors"). v1: Settings are at the system level; App config lives in the manifest.
- **Marvin/Slart**: a Worker Recipe can completely build an App (manifest + sources + rebuild) — this is exactly the use case for `slartibartfast`-style Recipes with `doc_write` + Domain Tools + `app_rebuild`.

---

## 11. Apps and Chat — Active-App Hint

When a user has an App tab open in Cortex, the Brain knows this per turn — analogous to the [`voiceMode`](voice-mode.md) flag. This allows the Engine prompt to render a short App context block, and the App service can inject domain-specific instructions into the prompt, **as long as the App is active**.

### 11.1 Per-Message Routing

The Active-App Hint is **not session state**, but a property of each individual `process-steer` frame:

```
ChatComposer (UI)
  → ProcessSteerRequest.activeApp = { folder, app }       (vance-api DTO)
  → ProcessSteerHandler                                    (Brain WS-Inbound)
  → PendingMessageDocument.activeApp                       (Mongo-Subdoc, transient)
  → SteerMessageCodec → SteerMessage.UserChatInput.activeApp
  → EddieEngine / ArthurEngine .runTurn() drain → last-message-wins
  → ActiveAppPromptResolver.resolve(process, activeApp)    (silent miss on unknown app)
  → VanceApplication.promptInject(PromptInjectContext)
  → PromptContextBuilder.activeApp(...).appInstructions(...)
  → Pebble: {% if activeApp %} … {{ appInstructions | raw }} {% endif %}
```

Advantages over a session pointer:

- No stale risk on disconnect / reconnect / pod migration.
- User can flip between App tab and normal Docs mid-conversation; each message carries the correct state.
- Archived ChatHistory correctly shows "User was in Calendar X at that time" — the hint travels with the message into the history.

### 11.2 Strict-Mode

The `ActiveAppPromptResolver` **silently degrades**:

- `activeApp == null` (old clients, normal Doc tab) → no inject, block is omitted.
- `folder` or `app` blank → no inject.
- App not registered in the Registry (bundle not installed, typo) → no inject, log debug.
- `promptInject` throws → no inject, log warn.
- `promptInject` returns `null`/blank → no inject.

In all cases, `appInstructions = null`; the Engine drain then also nulls `activeApp` in the Pebble context, so that the `{% if activeApp %}` block is cleanly omitted (no header line without body). A turn is **never** rejected due to a faulty App hint.

### 11.3 App Live Watch (Multi-Document)

Folder-bound Apps typically need not only the manifest but also all sub-documents (Lanes / columns / slides) live. Instead of subscribing to each path individually, the App registers a **prefix subscription** on the App folder:

```ts
useDocumentPrefixReaction({
  prefix: computed(() => `${appFolder}/`),
  onRemoteChange: async (path) => {
    if (path === `${appFolder}/_app.yaml`) return  // Tab-Sub handles manifest
    await reloadSubDoc(path)
  },
})
```

One subscription covers the manifest + all sub-docs; new sub-docs are automatically observed without re-subscribe logic. Prefix subscriptions are **silent watchers** — no presence roster entry. The "who has the App open" display comes free from the tab subscription on `_app.yaml` anyway (see [documents-channel](documents-channel.md) §4).

### 11.4 What `promptInject` should render

- **Concise** (3–10 lines of Markdown). The Engine prompt is not the place for tutorials.
- **Current state** of the App, as cheaply obtainable (Lane names, slide count, …). Deeper knowledge goes into [Manuals](prompts-and-manuals.md) and is loaded on-demand by the LLM via `manual_read('…')`.
- **Tool Hooks**: point the LLM to the correct toolset (`calendar_event_create`, `kanban_card_move`, …).
- **Do not** repeat Recipe or Engine knowledge — that is already in the prompt.

If the default `return null;` is sufficient for an App, the Engine simply omits the App block — Apps do **not** need to implement `promptInject` to function in Cortex.
