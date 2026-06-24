---
title: "Vance — Document Kind `application`"
parent: Documentation
permalink: /docs/doc-kind-application
---

<!-- AUTO-GENERATED from specification/public/en/doc-kind-application.md — do not edit here. -->

{% raw %}
---
# Vance — Document Kind `application`

> Specifies the **`application` payload** for documents named `_app.yaml` — the manifest at the root of a Vance "application folder". The folder + manifest convention turns an otherwise-flat tree of documents into a self-contained domain workspace (calendar suite, kanban board, wiki, …) with its own derived artifacts and per-app Java service.
> See also: [doc-kind-calendar](/docs/doc-kind-calendar) | [app-calendar](/docs/app-calendar) | [web-ui](/docs/web-ui)

---

## 1. Purpose

Beyond a certain complexity, a single YAML file is no longer sufficient for a domain. Examples:

- A **project plan** with three Lanes (Design, Backend, Frontend) and auto-generated Gantt + conflict list.
- A **Kanban board** (v2) with Cards in `todo/`, `doing/`, `done/` subfolders.
- A **Wiki** (v2) with linked Pages and an auto-generated backlinks index.

Vance solves this with the **Application Pattern** — analogous to macOS `.app` bundles, which appear as a single file in Finder but are actually a folder with an `Info.plist` manifest:

- A folder with `_app.yaml` at its root is a **Vance Application Instance**.
- The manifest specifies: which app type (`$meta.app: calendar`), how it's configured (`config.calendar: {...}`).
- Domain tools recognize the folder, dispatch operations to the correct Java service.
- Generated artifacts (e.g., `_gantt.md`, `_conflicts.yaml`) reside in the same folder, are immediately recognizable as "system-managed" via the `_`-prefix, and are rewritten with every `app_rebuild`.

**Design Principle — Pattern over Ad-hoc Solution.** The App concept is introduced with Calendar as a reference implementation. A pure `kind: calendar-suite` convention would be an isolated solution, not generalizable later. With `kind: application + app: calendar`, we achieve the same result for the Calendar case, but the foundation for future apps is already in place.

**Design Principle — Folder is the Edit Unit.** An app is not a monster file, but a folder full of small, diff-friendly files. Lanes / Phases / Sub-Topics are expressed via subfolders. If you see a monster file, the app has been modeled incorrectly.

**Design Principle — Generated Artifacts are Read-Only on the Source Side.** Files with an `_`-prefix are system output: `_gantt.md`, `_conflicts.yaml`, `_index.md`. Manual edits to them will be overwritten during the next `app_rebuild`. To make permanent changes, modify the source files and rebuild.

**What this spec defines:**

- Top-level `kind: application` discriminator + `$meta.app` as the app type sub-discriminator.
- Manifest schema (`_app.yaml`).
- Java foundation: `VanceApplication` interface, `VanceApplicationRegistry`, generic `app_rebuild` tool.
- Folder conventions for `_`-prefixed system files.
- Resolution rule for app discovery.
- Web-UI handling (v1: plain Code tab; v2: App Cards in folder listing).

**What it does not define:**

- What a specific app does — that is the responsibility of the respective app spec (e.g., [app-calendar](/docs/app-calendar)).
- App templates / Kit bootstrapping (belongs in an upcoming Kit extension).
- Cross-app relationships (a `kanban` app that pulls tasks from a `calendar`). This would require a separate "App-Linking" concept, which is not part of the v1 foundation.

---

## 2. Data Model

### 2.1 Top-Level

| Field          | Type                       | Required | Meaning                                                                  |
|----------------|----------------------------|----------|--------------------------------------------------------------------------|
| `kind`         | `string` = `"application"` | yes      | Top-level discriminator. Automatically mirrors to `DocumentDocument.kind`. |
| `app`          | `string`                   | yes      | App type discriminator (`"calendar"`, later `"kanban"`, …). Automatically mirrors to `DocumentDocument.headers.app` via standard Header Strategy. |
| `title`        | `string`                   | no       | Display title of the app instance.                                       |
| `description`  | `string`                   | no       | Free-form description.                                                   |
| `config.<app>` | `object`                   | no       | App-specific config, nested under the app name. Schema defined by the respective app spec. |
| `extra`        | `object`                   | no       | Pass-through for unknown top-level keys, round-trip stable.              |

### 2.2 Discovery Rule

A folder is a Vance app if `<folder>/_app.yaml` exists AND `kind == "application"`. Other app types are distinguished via `$meta.app` — if a Calendar app is expected, check `app == "calendar"` and throw `KindCodecException` if not.

### 2.3 `$meta`-Mirroring (DB Layer)

Vance's standard `JsonHeaderStrategy` / `YamlHeaderStrategy` extracts all scalar `$meta` fields into `DocumentDocument.headers` (Map). `kind` is privileged + indexed; `app` runs as a regular header entry.

This allows both discovery queries to work without a body scan:

- **"all apps in the project"** → `documentService.listByKind(tenantId, projectId, "application")` (indexed).
- **"all Calendar apps"** → Filter `doc.headers.app == "calendar"` post-fetch. If needed, later a compound index `(kind, headers.app)`.

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

**Not supported.** A manifest is structured config — a Markdown representation would make the app schema unreadable. Codec throws `KindCodecException`.

---

## 4. Folder Conventions

### 4.1 `_`-Prefix = System-Managed

Files with an underscore prefix are reserved:

| File                 | Meaning                                        | Who writes?                  |
|----------------------|------------------------------------------------|------------------------------|
| `_app.yaml`          | App Manifest (Discovery Marker + Config)       | User / LLM                   |
| `_info.yaml`         | Lane-local Override (optional, app-specific)   | User / LLM                   |
| `_<artifact>.<ext>`  | Generated Output (e.g., `_gantt.md`, `_conflicts.yaml`) | Refresh-Engine exclusively |

Domain tools may overwrite `_<artifact>` files **without prompting** — they are explicitly marked as regeneratable.

### 4.2 Lane Convention

Subfolders within the app folder represent Lanes / Sub-Topics. Each app spec defines the exact semantics. For `app: calendar`: leaf folder = Lane Name (see [app-calendar](/docs/app-calendar) §3).

### 4.3 Nesting

Deeper nested structures are allowed — the app spec decides if this carries meaning. Default recommendation: no deeper than 2 levels.

---

## 5. Java Foundation

### 5.1 `VanceApplication` Interface

```java
public interface VanceApplication {
    String appName();                              // "calendar", "kanban", …
    RefreshResult refresh(RefreshContext ctx);     // regenerate all artifacts

    record RefreshContext(String tenantId, String projectName,
                          String folder, @Nullable String userId,
                          @Nullable String processId) { }

    record ArtefactResult(String name, String path,
                          @Nullable String markdownLink,
                          Map<String, Object> stats) { }

    record RefreshResult(String app, String folder,
                         List<ArtefactResult> artefacts) { }
}
```

Implementations are regular Spring Beans (`@Service`). They are automatically registered in the `VanceApplicationRegistry`.

### 5.2 `VanceApplicationRegistry`

```java
@Service
public class VanceApplicationRegistry {
    public VanceApplicationRegistry(List<VanceApplication> apps) { … }
    public VanceApplication require(String appName) { … }
    public Set<String> knownAppNames() { … }
}
```

Generic Code (e.g., `AppRebuildTool`) retrieves the correct app via `registry.require(manifest.app())`. No code changes when new apps are added.

### 5.3 Concrete App Services

Each app provides:

- **Manifest Helper**: typed view of the `config.<app>` block (e.g., `CalendarsAppConfig.from(applicationDocument)`).
- **Domain Helper**: pure-function building blocks (`ConflictDetector`, `GanttRenderer`, …).
- **`@Service`-implementation** of `VanceApplication`, which wires everything in a `refresh()` pipeline.
- **Domain Tools** (LLM-facing), which usually access the app service thinly.

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

Reads `<folder>/_app.yaml`, dispatches via `$meta.app`. Works for any app registered in the Registry.

### 6.2 Domain-Specific (Optional)

Each app may additionally offer fine-grained tools that regenerate only partial artifacts — e.g., `calendar_conflicts` (only `_conflicts.yaml`) or `gantt_from_calendars` (only `_gantt.md`). These are thin wrappers, delegating to public methods on the App Service.

Read-only Queries (e.g., `calendar_aggregate`) live outside the refresh contract — they do not write files and do not require a service implementation.

---

## 7. Web-UI

### 7.1 v1 — Minimal

- `_app.yaml` is opened in the Document Editor with the **Code tab** (standard YAML editor).
- In the Document Listing, the file appears as "Application Manifest" with a 📦-icon (comes with the TS codec).
- No special tab form, no App Card, no Folder Header. This is v2 material.

### 7.2 v2 — Planned

- Folders with `_app.yaml` render in the Doc Listing as an **App Card**:
  ```
  📅 Calendar  ·  Website Relaunch Planning      [open]
     3 lanes · 24 events · 2 conflicts
  ```
- App-specific **Settings Form** (instead of raw YAML edit) in the Editor tab.
- **Refresh Button** in the UI, which internally calls `app_rebuild`.

### 7.3 What Web-UI v1 does not do

- Inline rendering of `_app.yaml` in chat. It's config, not a visual.
- Global "App Overview" view across all apps of a project (v2).

---

## 8. Future Apps (Sketch, not v1)

| App Type          | Convention                                            | Generated Artifacts                           |
|-------------------|-------------------------------------------------------|-----------------------------------------------|
| `app: calendar`   | `*.yaml` Calendar files in subfolders (= Lanes)       | `_gantt.md`, `_conflicts.yaml`                |
| `app: kanban`     | `*.md` Card files in Lanes (`todo/`, `doing/`, …)     | `_board.md` (rendered overview)               |
| `app: wiki`       | `*.md` Pages with `[[Page]]`-linking                  | `_index.md`, `_backlinks.yaml`                |
| `app: book`       | `*.md` Chapters with `order:`-frontmatter             | `_compiled.md`, `_toc.yaml`                   |
| `app: research`   | `sources/`, `notes/`, `synthesis/`                    | `_summary.md`, `_sources-bibliography.yaml`   |
| `app: meeting-room` | Date files with Notes, Tags                         | `_topic-index.yaml`, `_action-items.yaml`     |

Each of these apps would be a new `@Service implements VanceApplication` plus the domain-specific helpers and (optional) Domain Tools — no changes to the Foundation code.

---

## 9. Anti-Patterns

- **An app folder with only a single file in it.** If the entire app fits in one file, you don't need an app. Use the appropriate Document Kind directly.
- **Manual edits to `_<artifact>` files.** These will be overwritten. Edit the sources, then `app_rebuild`.
- **App service without a unique `appName()` value.** Registry will throw on boot, the container won't start — intentionally.
- **App-specific data outside the `config.<app>` block** (e.g., directly under `$meta`). Breaks layering, makes schema evolution difficult.
- **Cross-app write access** (one app writes into another's folder). Strictly avoid — each app is an autonomous unit.

---

## 10. Mapping to Other Vance Concepts

- **Kits**: Apps are suitable as Kit templates — a "Sprint Planning Kit" could offer a pre-configured `app: calendar` folder with default Lanes.
- **RAG**: each source file in an app folder is indexed normally (default behavior). Generated Artifacts are also indexed — they are useful search results ("where is the Q3 Gantt?").
- **Settings**: Apps could potentially have app-specific Tenant Settings in the future (e.g., "Standard Gantt Colors"). v1: Settings are at the system level; App Config lives in the manifest.
- **Marvin/Slart**: a Worker Recipe can completely build an app (Manifest + Sources + Rebuild) — this is precisely the use case for `slartibartfast`-style Recipes with `doc_create` + Domain Tools + `app_rebuild`.
{% endraw %}
