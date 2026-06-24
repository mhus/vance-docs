---
title: "Vance — Project Kits Catalog"
parent: Specs
permalink: /specs/project-kits-catalog
---

<!-- AUTO-GENERATED from specification/public/en/project-kits-catalog.md — do not edit here. -->

---
# Vance — Project Kits Catalog

> A tenant-wide catalog of pre-configured Kits, serving as a selection list
> during Project creation. This document complements [kits.md](/specs/kits) (what a Kit is
> and how it is installed) by addressing the question "which Kits are
> suggested to the user when creating a Project?".
>
> See also: [kits](/specs/kits) | [project-lifecycle](/specs/project-lifecycle) |
> [architektur-scopes-clients](/specs/architektur-scopes-clients)

---

## 1. Purpose

Vance uses the Kit system from [kits.md](/specs/kits) — bundles of
Documents/Settings/Tools imported into a Project from a Git repo. When creating
a new Project, users should be able to install *one* of these Kits directly
without needing to know the Git URL.

The **Project Kits Catalog** is a tenant-curated list of named Kit sources. It has
three consumers:

- **Web UI** displays it as a dropdown in the Project Create dialog.
- **Foot CLI** accepts `--kit <name>` with `project create`.
- **Eddie** can select a Kit name when creating a Sub-Project and read the list
  via a Tool to match a user request ("Software Project") to a suitable entry.

What is *not* part of the Catalog: auto-discovery of arbitrary Git URLs,
Kit repository browsing, version tracking per Kit. If a non-listed Kit is
needed, it is installed manually after Project creation via
`kit install <url>` (see [kits.md](/specs/kits) §6.1).

---

## 2. Storage Location

Exactly **one** Catalog file per Tenant as a Document in the `_tenant` Project:

```
tenant=<tenantName>, project=_tenant, path=config/project-kits.yaml
```

**No Cascade.** Unlike Recipes/Settings/Skills, the Catalog is *not*
merged across tenants. During Project creation, the new Project does not
yet exist — there is no meaningful Project Scope for a cascade, and the
Tenant Admin should be able to curate autonomously.

The **System Tenant `_tenant`** is the source for new Tenants (see §5);
otherwise, each Tenant Admin configures their Catalog autonomously.

---

## 3. Format

```yaml
# config/project-kits.yaml (in the tenant's _tenant project)
version: 1
kits:
  - name: base/research
    title: Research Base
    description: General-purpose research kit with web-search tools
    git:
      url: https://github.com/mhus/vance-kits.git
      subPath: kits/research
      ref: main

  - name: base/dev/java
    title: Java Development
    git:
      url: https://github.com/mhus/vance-kits.git
      subPath: kits/dev-java
      ref: main
```

| Field | Type | Required | Description |
|---|---|---|---|
| `version` | Int | yes | Catalog schema version. Currently `1`. |
| `kits[].name` | String | yes | Catalog lookup key, unique within the file. **May contain `/`** as a free string — the Catalog code does not parse it as a path. Clients may group visually but are not required to. |
| `kits[].title` | String | yes | Display name for UI/CLI. |
| `kits[].description` | String | no | One-sentence description, used as tooltip/subtitle in Web UI. |
| `kits[].git.url` | String | yes | Git repo URL (HTTPS/SSH). |
| `kits[].git.subPath` | String | no | Path within the repo, if mono-repo. Empty = repo root. |
| `kits[].git.ref` | String | no | Branch/Tag/SHA. Default `main`. |

The Catalog `name` is only a lookup key; the *actual* Kit has its own name
from `kit.yaml#name` (see [kits.md](/specs/kits) §3.1). Both do not have to
match — the Catalog can offer the same Kit multiple times with different
refs (`base/dev/java`, `base/dev/java-experimental`), both pointing to the
same `kit.yaml#name`.

**Validation on write:** `name` uniqueness, `git.url` non-empty, `version`
known. If violated, the service throws `IllegalArgumentException`, Anus
update rejects.

---

## 4. Read API

### 4.1. `ProjectKitsCatalogService`

In `vance-shared`:

```java
public interface ProjectKitsCatalogService {
    /** Loads the Catalog. If the Document is missing: empty Catalog. */
    ProjectKitsCatalogDto load(String tenantId);

    /** Returns an entry by name, or null. */
    @Nullable ProjectKitEntry findByName(String tenantId, String name);

    /** Persists the Catalog. Validates before save (§3). */
    void save(String tenantId, ProjectKitsCatalogDto catalog);
}
```

Data sovereignty: this service is the **only** access to
`config/project-kits.yaml`. Web/Foot/Eddie paths all go through it.

### 4.2. REST + WS

- **REST**: `GET /brain/{tenant}/project-kits` → `ProjectKitsCatalogDto`
- **WS**: `LIST_PROJECT_KITS` Request → `PROJECT_KITS_LIST` Response

Both deliver the same DTO. Auth: Tenant membership is sufficient — the
Catalog is not sensitive, it lists public Git URLs.

### 4.3. Eddie Tool

New server Tool `kit_list`:

```
kit_list() → { kits: [{ name, title, description }] }
```

Without Git details, so the LLM does not pull URL spam into the context.
If Eddie is to install a Kit, it passes the `name` string to
`project_create`; this performs the Git lookup internally.

Eddie also calls `project_create(tenantId, name, ..., kitName?)`
with the chosen Catalog name. This is an additional optional
parameter to the existing Tool, not a new Tool.

**No Jeltz needed.** Eddie is in the LLM loop and can evaluate the list in the
same turn. If the user says "software development project", Eddie sees the
`kit_list` response and selects `base/dev/java` itself. A specialized
Jeltz Recipe would only be useful if a **non-LLM caller** needed the
matching — this use case is not present in v1.

---

## 5. Tenant Bootstrap

During `TenantService.create(...)` (after mandatory Tenant setup, before return),
the Catalog is copied from the System Tenant `_tenant` to the new Tenant:

```
source: tenant=_tenant,  project=_tenant, path=config/project-kits.yaml
target: tenant=<new>, project=_tenant, path=config/project-kits.yaml
```

If the source is missing (fresh setup, Anus not yet run): do not create a
file, the new Tenant's Catalog is empty. Foot default is "no Kit", Web
default is the `none` option, Eddie reports "no Kits configured".

What is *not* copied: Kit contents themselves — the Catalog is only the
*list*, not the Kits. Kit contents only land in the target project during
`kit install` / Project creation.

---

## 6. Usage during Project Creation

### 6.1. Foot CLI

```
vance project create --name <n> [--title <t>] [--group <g>] [--kit <name>]
```

- Without `--kit` → no Kit installation.
- `--kit <name>` → after successful Project creation, the Kit from the
  Catalog entry is installed (existing `kit install` path,
  [kits.md](/specs/kits) §6.1, using `git.url`/`git.subPath`/`git.ref` from the
  entry).

If `<name>` is not in the Catalog: Foot reports "kit '<name>' not in
catalog" with a list of known names, Project is **not** created
(no half-finished state).

### 6.2. Web UI

Project Create dialog in `vance-face` shows dropdown:

- First option: "No Kit" (implicit, not from YAML).
- Other options: Catalog entries, rendered as `title`. Subtitle =
  `description`, if present.

On submit: `POST /brain/{tenant}/projects` with `kitName` field (or
`null` for "no kit"). Backend installs Kit **synchronously** — Web waits
for response before the editor opens. On Kit install error: Project
remains created, UI shows warning "Project created, kit install failed:
<reason>" (unlike Foot, because Web is already in the navigation flow
and the Project visibly exists).

### 6.3. Eddie (Sub-Project Creation)

Eddie can create a Sub-Project at user request:

1. User: "create a Java project"
2. Eddie calls `kit_list()` → sees `base/dev/java`
3. Eddie calls `project_create(..., kitName="base/dev/java")`
4. Brain installs Kit after Project creation

If the Catalog is empty or no entry matches: Eddie creates the Project
without a Kit and informs the user.

---

## 7. Anus Bootstrap and Update

### 7.1. Source Repo Convention

Source: a Git repo with a `kits/` subfolder. Each direct subdirectory
under `kits/` is a Kit source (= has its own `kit.yaml`). Optionally,
a `kits/catalog.yaml` can be located in the repo root with Title/Description
overrides per Kit:

```yaml
# kits/catalog.yaml in the source repo
overrides:
  research:                        # = subdir-name
    name: base/research            # Catalog lookup name (default: subdir)
    title: Research Base
    description: General-purpose research kit
  dev-java:
    name: base/dev/java
    title: Java Development
```

If `catalog.yaml` is missing: `name = <subdir>`, `title = <subdir>` by
default. This allows importing a repo without overrides.

### 7.2. Anus Commands

```
anus project-kits show     --tenant <t>
anus project-kits import   --tenant <t> [--git <url>] [--ref <r>]
anus project-kits update   --tenant <t> [--mode merge|overwrite] [--dry-run]
```

Default Git is `https://github.com/mhus/vance-kits.git`, default Ref
is `main` — both can be overridden via `--git`/`--ref` (e.g., if the
Tenant maintains its own curated Kit list).

**Modes for `update`:**

- **`merge`** (Default): Upsert by `name`. Git entries replace
  Tenant entries with the same name. Tenant entries without a match in Git
  are retained. New Git entries are appended to the end (Tenant
  order is otherwise not touched).
- **`overwrite`**: Complete replacement with the Git state. Tenant-specific
  entries are lost.

**`--dry-run`** shows the diff (`added` / `updated` / `removed` / `kept`)
without writing.

`import` rejects if the Catalog exists. `update` creates it if it is missing.

**Pipeline:**

1. Clone repo to `tmp/<uuid>/` (at the Ref).
2. Scan `kits/` subdirs → list of Kit sources.
3. Read optional `kits/catalog.yaml` for overrides.
4. Build Catalog entries (`name`, `title`, `description`, `git.url`,
   `git.subPath=kits/<subdir>`, `git.ref`).
5. Load existing Tenant Catalog (or empty).
6. Apply mode (merge/overwrite).
7. Validate (§3).
8. `--dry-run` → output diff, end.
9. Otherwise: `ProjectKitsCatalogService.save(...)`.

**Recommended first call** (System Tenant bootstrap):

```
anus project-kits update --tenant _tenant --mode overwrite
```

Writes the Catalog to `_tenant` — it will be automatically copied to
new Tenants upon creation (§5).

---

## 8. What is NOT in v1

- **Auto-Refresh** of the Catalog from Git. Updates are manual via Anus.
- **Per-Catalog-Git-Auth.** The source repo is cloned with the default Git setup
  of the Brain Pod (SSH key or anonymous). Anus cannot authorize private
  repos in v1.
- **Kit Versioning in the Catalog.** `git.ref` points to a branch or
  tag — for reproducibility, pin a tag. No lockfile, no
  "last installed commit" per Catalog entry.
- **Catalog Editor in the Web UI.** Maintenance is done via Anus. If this
  comes later: separate plan.
- **Inherits in the Catalog.** Catalog entries are flat, they refer to
  a Kit. Inherits live in the `kit.yaml` of the Kit repo (see
  [kits.md](/specs/kits) §5).

---

## 9. Prerequisites

- [kits.md](/specs/kits) §6.1 (`kit install` pipeline) — Project Create
  integration builds upon this.
- [project-lifecycle.md](/specs/project-lifecycle) — Project Create path,
  status set.
- `DocumentService` for `config/project-kits.yaml` in the `_tenant` Project.
- `TenantService.create(...)` hook for bootstrap copy (§5).
- Anus with Git clone capability (new in v1, see plan).

---

## 10. Reference

- [kits](/specs/kits) — What a Kit is, install pipeline, manifest, apply,
  export.
- [project-lifecycle](/specs/project-lifecycle) — Project Create path,
  status set, Pod ownership.
- [architektur-scopes-clients](/specs/architektur-scopes-clients) — Tenant /
  Project-Group / Project / Session / Think-Process.
