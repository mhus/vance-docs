---
title: "Vancetope — WebDAV Access"
parent: Specs
permalink: /specs/webdav
---

<!-- AUTO-GENERATED from specification/public/en/webdav.md — do not edit here. -->

---
# Vancetope — WebDAV Access

> Access Project documents via **WebDAV** at `/brain/{tenant}/webdav/{project}/{path...}`. The target clients are standard clients like **macOS Finder** (mounted volume) and **Obsidian** (WebDAV Sync plugin). WebDAV is a pure **View** on the document store — not a new data store, no separate authorization model.
>
> See also: [workspace-access](/specs/workspace-access) | [document-lock](/specs/document-lock) | [document-versioning](/specs/document-versioning) | [documents-channel](/specs/documents-channel) | [identity-credentials](/specs/identity-credentials) | [settings-system](/specs/settings-system)

---

## 1. Purpose

Users should be able to treat Vancetope Project documents like a normal network drive: mount them in Finder, synchronize them as a Vault in Obsidian, and read and write them with any WebDAV-enabled tools. Access uses the same users and permissions as the rest of the system; data sovereignty remains with the `DocumentService`.

**Distinction — what WebDAV is NOT:** not a second document store, not a sync protocol with conflict resolution (Last-Writer-Wins at the document level, secured by Optimistic Locking), no Project enumeration (the mount always addresses exactly one Project).

## 2. Endpoint & Addressing

```
/brain/{tenant}/webdav/{project}/{path...}
```

- `{tenant}` → `tenantId`
- `{project}` → `projectId` (business Project name)
- `{path...}` → logical document path within the Project (empty = Project root)

The bare root `/brain/{tenant}/webdav` (without a Project) is **not** browsable — Projects are not listed. A mount always points to a specific Project.

Prerequisite: **Redis must be active** (`vance.redis.enabled=true`). Lock state is cross-pod and resides in Redis; without Redis, the WebDAV surface is not registered (Brain still runs, WebDAV is simply unavailable).

## 3. Authentication

WebDAV clients use **HTTP Basic-Auth**, not the Bearer JWT of the rest of the Brain API. The `/webdav/` path is therefore excluded from the JWT gate; authentication occurs in the WebDAV layer:

- `Authorization: Basic <base64(user:password)>` is checked against the same password mechanism as regular login (active users with `loginEnabled`, password hash verification).
- The **Tenant comes from the URL** — a user always authenticates only for the Tenant in the path; a login for Tenant A cannot access Tenant B.
- Missing/invalid credentials → `401` with `WWW-Authenticate: Basic realm="Vancetope"`.

The user's normal login password serves as the Basic-Auth password.

## 4. Authorization

No separate permission model — the WebDAV layer uses the same authorization as the REST controllers:

| Target | Resource |
|---|---|
| Folder / Project Root | `Project(tenant, project)` |
| File | `Document(tenant, project, path)` |

Method mapping:

| WebDAV | Action |
|---|---|
| `GET` / `HEAD` / `PROPFIND` / `OPTIONS` | `READ` |
| `PUT` (new) / `MKCOL` | `CREATE` |
| `PUT` (existing) / `PROPPATCH` / `MOVE` / `DELETE` | `WRITE` |

The soft document edit protection ([document-lock](/specs/document-lock), `lockedFor`) automatically applies: if a document is locked for the `USER` role, a WebDAV write is rejected with `409 Conflict`.

## 5. Folder Model

Folders are **virtual** — they are derived from the path prefixes of documents; there are no folder entities. A `PROPFIND` with `Depth: 1` lists direct subfolders and files.

`MKCOL` creates a **hidden marker document** for an empty folder, so that the folder persists until the first real document is added. The marker has a **retention** (default 1 day, TTL-driven): as soon as real files are in the folder, it becomes irrelevant and expires; an empty folder disappears automatically after expiration.

System paths with `_`-prefix (`_vance/trash/`, `_vance/`, …) are **visible** via WebDAV (deleted files appear under `_vance/trash/`).

## 6. Operations

| Method | Behavior | Success |
|---|---|---|
| `PROPFIND` | Folder listing / File properties | `207 Multi-Status` |
| `GET` | Stream document content (Range supported) | `200` / `206` |
| `PUT` | Create new or replace content; MIME from file extension | `201` / `204` |
| `MKCOL` | Create virtual folder (marker) | `201` |
| `MOVE` | Rename/move file (within the same Project) | `201` |
| `COPY` | Copy file (within the same Project) | `201` |
| `DELETE` | Move to trash (`_vance/trash/`); folders recursively | `204` |
| `LOCK` / `UNLOCK` | See §7 | `200`/`201` / `204` |

- **MIME** is always derived from the file extension (not from the client's `Content-Type`).
- **`MOVE`** preserves document identity (`lineageId`) → version history follows the file; **`COPY`** creates a new document with its own identity.
- The ETag is based on the internal storage pointer and changes with every content write — clients reliably detect changes via `If-None-Match`.
- Moving/copying **between** Projects is not supported.

## 7. Locking (DAV Level 2)

WebDAV offers `LOCK`/`UNLOCK` (DAV Level 2) to allow macOS Finder Read-Write mounts. The lock is:

- **exclusive, advisory, transient** — a `LOCK` returns an `opaquelocktoken`; a second `LOCK` on the same resource without this token returns `423 Locked`; `UNLOCK` releases it.
- **cross-pod correct** — the lock state resides in Redis with native TTL, so a client whose requests land on different pods sees the same lock; a crashed client automatically loses the lock due to TTL expiration.
- **not an integrity guarantee** — actual collision safety is provided by the Document Store's Optimistic Locking (`@Version`): concurrent writes fail with `409 Conflict`. The WebDAV lock primarily prevents the unpleasant mid-save `409` on the client.

`OPTIONS` advertises `DAV: 1, 2`.

## 8. macOS/Client-Sidecar Files

Finder and other clients generate auxiliary files that are not user documents (`.DS_Store` = folder view state, `._*` = AppleDouble with Extended Attributes, plus `.Spotlight-V100`, `Thumbs.db`, `desktop.ini`, …). These are **not** persisted as documents, but **opaquely cached in Redis** (with TTL):

- **hidden** from directory listings (non-Apple clients like Obsidian never see them),
- delivered from cache on direct `GET`,
- stored in cache on `PUT` (never in the Document Store).

Effect: macOS retains its folder view across requests and pods without polluting the Document Store. The cache is cosmetic — upon TTL expiration, only the folder view resets.

## 9. Configuration

Prefix `vance.webdav.*`:

| Property | Default | Meaning |
|---|---|---|
| `realm` | `Vancetope` | Basic-Auth realm in the `WWW-Authenticate` challenge |
| `folder-marker.ttl` (`folderMarkerTtl`) | 1 day | Retention of the `MKCOL` marker |
| `sidecarTtl` | 1 day | Retention of Redis sidecar blobs |
| `lockTimeout` | 1 h | Default lock timeout |
| `lockTimeoutMax` | 12 h | Upper limit for client-requested timeouts |
| `sidecarPatterns` | see §8 | Ignore/sidecar filenames (Glob with `*`) |

Hard prerequisite: `vance.redis.enabled=true` (§2).

## 10. Attributes

WebDAV provides standard file attributes (`displayname`, `getcontentlength`, `getcontenttype`, `getlastmodified`, `creationdate`, `resourcetype`, `getetag`). Vancetope-specific attributes like `color`/`tags` are **not** exposed in v1; provision as `vance:`-DAV-Custom-Properties or as a bidirectional AppleDouble bridge is planned as a later extension.

---

*Implementation history and design decisions: `planning/webdav-support.md`.*
