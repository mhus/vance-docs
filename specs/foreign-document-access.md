---
title: "Foreign Document Access"
parent: Specs
permalink: /specs/foreign-document-access
---

<!-- AUTO-GENERATED from llm/specification/foreign-document-access.md (translated from the German specification/public/foreign-document-access.md) — do not edit here. -->

# Foreign Document Access

> Cross-project document access within a Tenant via a dedicated, read-centric tool family `foreign_*`. Replaces the existing `cross_doc_*` family and unifies it with the new read path.

## 1. Motivation & Delimitation

The normal case in Vancetope is strict Project isolation: `doc_*` tools implicitly operate within the current Project of the Think Process, and the Scope cascade **never looks sideways** (`architektur-scopes-clients.md` — "nothing is visible between Projects; exchange only via the common parent level"). This is a statement about **automatic memory/context visibility**, not an access prohibition.

However, there is a real need for **explicit, authorized on-demand access** across Project boundaries:

- "Look in Project XY, we solved it that way there — I'd like that here too."
- "Copy the search results from Project XY here."

`foreign_*` addresses exactly this: it is **not** memory bleed, but a tool that a model must consciously grasp, gated by the normal permission chain. The common parent level of two Projects is the Tenant — `foreign_*` remains consistently **Tenant-internal**.

Previously, only Eddie (as a Hub agent with "Spot"/`workingProjectId`) could effectively access foreign Projects. With `foreign_*`, access becomes an **engine-neutral, permission-driven** feature — in particular, Arthur should be able to **read** foreign Projects without gaining write permissions there.

## 2. Core Invariant

> **A Process may read any Project where its Subject is READER — but only write where it has CREATE.**

The "read-only for Arthur" guarantee thus arises **not** from tool selection, but from the permission: Arthur is typically only a READER on foreign Projects, so any write to a foreign Project will fail-closed due to missing CREATE/DELETE. This is consistent with the Vancetope rule "Enforcement points never speak roles" (no `if(isAdmin())`, no Engine-Role-Gate for documents) — see `permission-system.md`.

## 3. Tool Interface

All tools are server tools (`@Component` in `vance-brain`), `deferred` (discoverable via `tool_list`), and are enabled per Recipe via `allowedToolsAdd`. `projectId`/`fromProjectId` are **mandatory** — this deliberately distinguishes the family from the implicit `doc_*` tools.

| Tool | Purpose | Permission |
|---|---|---|
| `foreign_project_list(query?)` | List readable Projects; optional `query` filters by Name/Title. Without `query` = all readable. | `ProjectService.listReadableBy` |
| `foreign_doc_list(projectId, folder?)` | List documents of a foreign Project (optionally under `folder`). | `Project READ` |
| `foreign_doc_search(projectId, query)` | Metadata/path search (Title/Summary/Tags/Path) in the foreign Project. **No RAG/Vector Query.** | `Project READ` |
| `foreign_doc_read(projectId, path\|id)` | Read content of a foreign Document. | `Project READ` + `Document READ` |
| `foreign_doc_copy(fromProjectId, fromPath, toProjectId?, toPath?)` | Copy; `toProjectId` default = current Project, `toPath` default = `fromPath`. | `READ` on source + `CREATE` on target |
| `foreign_doc_move(fromProjectId, fromPath, toProjectId?, toPath?)` | Copy-then-trash. For Orchestrators (Eddie/Trillian), **not** in Arthur's Recipe. | `READ`+`DELETE` source + `CREATE` target |

### 3.1 Why one `foreign_doc_copy` instead of two

Direction is parametric, not a second tool. The most common case ("from XY here") is `foreign_doc_copy(fromProjectId=XY, fromPath=…)` with `toProjectId` omitted. Eddie's old case "current → foreign" is the same call with `toProjectId` set. This keeps the number of commands small (stated goal) and cleanly derives the read-only guarantee from the permission.

### 3.2 Copy Semantics

`foreign_doc_copy`/`foreign_doc_move` create a **fresh copy**: content plus selected meta, **no** `lineageId` link across Project boundaries (behavior like Kit-Apply). The target Document is independent in the new Project. Writing is done as `WriteReason.USER` (target path is caller-controlled).

## 4. Security Constraints

- **Tenant-internal:** no cross-Tenant access. Target/source outside the Tenant → error (`CROSS_PROJECT_NOT_IN_TENANT`), analogous to the existing `DocLinkTool`.
- **Filtered lists do not mean "does not exist":** `foreign_project_list`
  and the generic `project_list` return what the caller is allowed to read —
  not what exists. An agent that infers non-existence from absence
  and reports it upstream creates a phantom Project from a missing grant
  (actually happened, see `trillian-engine.md` §9a context).
  `project_list` therefore states it in the result itself
  (`filteredByPermissions` + `note`) and in its description; it does not
  reveal names or total numbers.
- **System Projects filtered:** Projects with `_` prefix (`_vance`, `_tenant`, `_user_*`) do **not** appear in `foreign_project_list` and are rejected as targets for copy/move (as with `cross_doc_copy` today). `foreign_doc_list`/`_search` hide `_vance/…` paths to prevent configuration/Manual documents from leaking across Projects.
- **Access denied:** missing READ on the target Project → `CROSS_PROJECT_DENIED` (tool error message, no Process abort).
- **Enforcement point:** Project resolution + READ check centrally analogous to `EddieContext.resolveProject` (the `projectId` parameter is caller-controllable, hence a hard `PermissionService.enforce` per call).

## 5. Engine Assignment

- **Arthur:** Recipe receives tools 1–5 (`foreign_project_list`, `foreign_doc_list/search/read`, `foreign_doc_copy`) via `allowedToolsAdd`. `foreign_doc_move` **not**. Effectively read-only on foreign Projects due to permission.
- **Eddie / Trillian:** additionally receive `foreign_doc_move` (write/move orchestration). No Engine-Role-Gate — enablement occurs purely via the respective Recipe.

## 6. Relationship to the existing `cross_doc_*` family

`cross_doc_list_projects`, `cross_doc_copy`, `cross_doc_move` are migrated to `foreign_*`:

| old | new |
|---|---|
| `cross_doc_list_projects` | `foreign_project_list` |
| `cross_doc_copy` | `foreign_doc_copy` |
| `cross_doc_move` | `foreign_doc_move` |

Reason for the name change: `foreign_*` immediately implies "an *other* Project" and generalizes across object types (`foreign_doc_*` + `foreign_project_*`), whereas `cross_doc_list_projects` is already inconsistent (doc-prefix, but lists Projects). Recipes and Manual Hooks that reference the old names will be updated (see implementation plan `planning/foreign-document-access.md`).

## 7. Deliberate Non-Goals (v1)

- **No Cross-Project RAG/Vector Search** — `foreign_doc_search` is metadata/path search. Semantic search across Project boundaries remains a RAG Non-Goal (`rag.md`).
- **No Knowledge Graph across Project boundaries** — remains KG roadmap.
- **No origin/update linking** of copied documents (no Lineage across Projects). A later "update from source" would be a v2 extension.
