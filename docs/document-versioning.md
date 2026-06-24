---
title: "Vance — Document Versioning"
parent: Documentation
permalink: /docs/document-versioning
---

<!-- AUTO-GENERATED from specification/public/en/document-versioning.md — do not edit here. -->

---
# Vance — Document Versioning

> Every overwritten document leaves an archived version. Versions reside in their own Mongo collection, are linked to the active document by a stable `lineageId`, and can be viewed, restored, or deleted individually. The feature can be disabled per Project via a setting cascade.
>
> See also: [project-lifecycle](/docs/project-lifecycle) | [rag](/docs/rag) | [settings-system](/docs/settings-system) | [web-ui](/docs/web-ui)

---

## 1. Purpose

Vance is a Think Engine tool—users frequently write, refactor, and delete notes, tables, mind maps, and small code snippets. Without versioning, every overwrite irrevocably loses the old content. Document Versioning is the safety net: after every significant edit, the previous version is available as an independent archive version that can be restored at any time.

Deliberately excluded (v1):

- **No diff viewer** — only read-only preview per version; comparison is done by the browser if the user opens tabs side-by-side.
- **No automatic thinning** — versions remain until manually deleted or the active document is deleted. Retention policies are explicitly for later.
- **No versioning for trash/`_bin/`** — soft-delete and versioning are orthogonal; a second layer of protection for deleted documents is not necessary.
- **No versioned restore history** — the restore itself archives the previous live version (see §4), but Vance does not track "who restored to which version when." The who/when lives in the `createdBy` field of the created archive entries.

## 2. Data Model

### 2.1 Lineage ID on the Active Document

`DocumentDocument` gets three new fields:

| Field | Type | Description |
|------|------|-------------|
| `lineageId` | `String` (UUID, indexed) | Assigned once at creation, then immutable. Carried along during rename, inline⇄storage switch, and restore. Connects the active document with all archive entries in its history. |
| `lastArchivedAt` | `@Nullable Instant` | Wall-clock of the last archive entry for this document. `null` until the first archive step has run. Together with the Min-Interval setting, determines whether the next save creates a new archive version. |
| `version` (`@Version`) | `@Nullable Long` | Spring Data Optimistic Lock. Throws `OptimisticLockingFailureException` on concurrent writers to prevent archive-then-overwrite from colliding with a parallel save race. |

### 2.2 Archive Collection

Separate collection `document_archives`. Deliberately separated from `documents` because:

- Active lookups (`tenantId + projectId + path` unique) remain performant — no filter on a status needed.
- Different query patterns: active → by `path`, archive → by `lineageId + archivedAt`.
- Lifecycle separation — archives can never accidentally return via the live API.

```java
@Document(collection = "document_archives")
class DocumentArchiveDocument {
    @Id String id;
    String lineageId;            // shared with live + all siblings
    String originalDocumentId;   // live doc id at time of archive
    String tenantId;
    String projectId;
    String path;
    String name;
    @Nullable String title;
    List<String> tags;
    @Nullable String mimeType;
    long size;
    @Nullable String storageId;  // moved from live (no blob copy)
    @Nullable String inlineText; // snapshot for inline docs
    @Nullable String kind;
    Map<String, String> headers;
    @Nullable String createdBy;  // original creator (not the archiver)
    Instant archivedAt;          // = version label
}
```

Indexes:

- `(tenantId, projectId, lineageId, archivedAt desc)` — Main access: version list per document.
- `(lineageId)` — Fallbacks (e.g., lineage-wide delete).

`archivedAt` (millisecond resolution) is sufficient as a human-readable version label. Uniqueness is guaranteed by Mongo's `_id` (ObjectId).

## 3. Storage Lifecycle

Storage blob ownership is **strictly exclusive** — no reference counting, no sharing between live and archive. This allows blobs to be deleted without complication as soon as their owning Document or Archive disappears.

### 3.1 Archive-on-Write (Pointer Move, No Copy)

When overwriting in `DocumentService.update`:

1. Read the live document (`findById`).
2. If content actually changes AND the cascade setting `documents.archive.enabled` is active AND `lastArchivedAt` (or `createdAt`, if no archive exists yet) is older than the min-interval: `DocumentArchiveService.archiveCurrent(live)`.
3. `archiveCurrent` builds the archive entry and **moves** `live.storageId` (pointer copy to the new Archive Document, then `null` on the Live). Inline text is copied as a string (small, cheap).
4. The live update writes the **new** blob (or new inline text) — the old blob now lives under the archive entry; the existing "delete old storage blob" branch in the update path must be skipped in this case.

Consequence: archiving itself only costs a Mongo insert and a pointer update — no blob read/write, no second GridFS file.

### 3.2 Restore (Copy)

Asymmetric to archiving — no pointer is shared during restore:

1. `DocumentArchiveService.restore(archive)` returns a `RestorePayload`.
2. For an inline archive, the payload carries the snapshot text.
3. For a storage archive, `restore` calls `StorageService.duplicate(archive.storageId, archive.tenantId)` — a new blob is created, the archive blob remains untouched.
4. `DocumentService.restoreArchive(liveDocId, archiveId)` **first** calls `archiveCurrent(live)` (thus the current version is retained as a version, the restore is visible as an undoable event), then applies the payload to the live dataset.

Restore is therefore: "adopt old version, save current version as new version." No one accidentally loses work by performing a restore.

### 3.3 Delete

| Action | Effect on Live | Effect on Archive |
|---|---|---|
| `DocumentService.trash(id)` (Soft-Delete to `_bin/`) | Path move, dataset remains. | Unchanged — archives are linked to `lineageId`, not `path`. |
| `DocumentService.delete(id)` (Hard-Delete from `_bin/`) | Live row + live blob deleted. | `DocumentArchiveService.deleteAllForLineage(tenantId, projectId, lineageId)` — all archive rows + their respective blobs deleted. |
| `DocumentService.deleteArchive(archiveId)` | Unchanged. | One archive removed: row + blob. |

Hard-delete of a live document cleans up the version history — archives without a living counterpart would be orphaned storage.

### 3.4 Orphan-Sweep (Cluster Master, Safety Net)

The normal paths in §3.1–§3.3 are designed so that no blob should "orphan" — `archiveCurrent` performs a pointer move, `restore` duplicates, `delete` cleans up cascadingly. In practice, remnants still remain:

- **Crash during hard-delete.** `DocumentService.delete` calls (1) `storageService.delete(liveBlob)`, (2) `repository.delete(doc)`, (3) `archiveService.deleteAllForLineage(...)`. If the process dies between steps 2 and 3, the entire archive series remains stuck — no live doc row to attach to.
- **Crash during doc-write.** During create/update, `DocumentService` first writes the blob (`storageService.store`) and only then persists the `DocumentDocument` row. If the process dies between these two steps, the blob remains without a reference.

`OrphanStorageSweepTick` (in `vance-brain.cluster`, master-gated — see cluster-project-management.md §4.6) calls `StorageOrphanCleanupService.sweepOnce(now, gracePeriod, batchSize)` hourly in two phases:

**Phase 1 — Orphan Archives.** For each archive entry, it checks if at least one live doc with the same `lineageId` exists. If not, the archive (including blob via `deleteArchive`) is deleted. **No grace period** — an archive is never created without a live anchor in the normal world, because `archiveCurrent` works via pointer move and the live doc row carries the `lineageId` until the end of the `update` call. An archive without a live doc is therefore definitely hard-delete debris.

**Phase 2 — Orphan Storage.** Cursor over `storage_data` with `isFinal: true AND createdAt < now − gracePeriod` (default `PT1H`). Per batch, a single `$in` lookup against `documents.storageId` and `document_archives.storageId`; everything in the batch that is referenced by neither a Doc nor an Archive is soft-deleted via `storageService.delete`. The existing `StorageCleanupScheduler` performs the final chunk wipe after the soft-delete window.

**Why `gracePeriod` is necessary.** Due to the crash-during-doc-write case above: between `storageService.store()` and `repository.save(doc)`, there is a window where the blob lives without a reference — if the sweep were to clear it immediately, it would also affect ongoing, legitimate write operations. `gracePeriod` must be longer than the longest expected doc-write; `PT1H` is generous for regular use cases (typical doc-writes are in the millisecond range).

**Why no `gracePeriod` is needed for Archives.** `archiveCurrent` does **not** write a new blob — it takes the `storageId` from the live doc via pointer move. During the archive save in Mongo, the live doc row continues to point to the same blob (the caller only updates the live doc storage ID after `archiveCurrent` returns). At no point does a blob exist that is pointed to by neither a Doc nor an Archive, **because an Archive would be reassigned a blob**.

**Memory + Index.** Cursor-based, batch size via config (`vance.storage.orphanSweep.batchSize`, default 500). Three indexes support the sweep queries:

- `documents.storageId` — `@Indexed(sparse=true)` (inline docs without storage are not in the index).
- `document_archives.storageId` — `@Indexed(sparse=true)`.
- `storage_data.final_createdAt_idx` — Compound-Partial `{ isFinal: 1, createdAt: 1 }` with `partialFilter: { isFinal: true }`. One entry per blob, not per chunk.

**What the sweep does not attempt:**

- Race against normal cleanup: between steps 2 and 3 of `DocumentService.delete`, archives of a lineage yet to be cleaned up would appear as orphans. The sweep then deletes them itself — thus only cleaning up what the standard cascade would have wanted anyway. Multiple deletes of the same row are idempotent for `storageService.delete` (soft-delete marker); for the archive itself, the second variant runs into `findById.isEmpty()` and is a no-op.
- Workspace files (see [workspace-management.md](/docs/workspace-management)) — these are outside `storage_data`. Separate cleanup path.
- RAG chunks (`rag_chunks`) — separate domain, separate service.

## 4. Trigger Logic

`DocumentService.update` decides before each inline text write whether an archive entry is created. Cascade order (first false answer wins):

1. **Operator Kill Switch** `vance.documents.archive.enabled` (`application.yml`, default `true`). `false` ⇒ never archive.
2. **Cascade Setting** `documents.archive.enabled` (Project → `_vance` → application-Default `true`). `false` ⇒ never archive.
3. **Content Diff**: only archive if `newInlineText != existing.inlineText`. Pure metadata edits (Title, Tags, Path, MIME-Type, ragEnabled) do not create a version.
4. **Min-Interval**: `lastArchivedAt` (or `createdAt` as fallback for the first version) plus the cascade setting `documents.archive.minVersionIntervalSeconds` (default 600s/10min) must be in the past. Save bursts within this window collapse to the last written version — the user gets one version per edit session, not per keystroke.

`shouldArchiveOnSave(doc)` (package-private in `DocumentService`) encapsulates the decision — tested individually.

**Restore** deliberately ignores the trigger logic and always archives. Otherwise, a restore immediately after a save would lose the current state.

**Concurrency**: the `@Version` field on the live document protects against archive-then-overwrite races. If a parallel writer loses, the UI enters its standard retry / error path.

## 5. REST API

All endpoints under `/brain/{tenant}/documents/{id}/archives*`, JWT-authorized, resource permissions as on the live document:

| Method | Path | Permission | Description |
|---------|------|-----------|--------------|
| `GET` | `/archives` | `READ` | List all archive versions (newest first) + count. Lightweight — `DocumentArchiveSummary` without `inlineText`. |
| `GET` | `/archives/{archiveId}` | `READ` | Full `DocumentArchiveDto` including snapshot `inlineText` for inline versions. |
| `GET` | `/archives/{archiveId}/content` | `READ` | Stream body — same contract as `/documents/{id}/content`. For storage-backed previews / download. |
| `POST` | `/archives/{archiveId}/restore` | `WRITE` | Archives the current live version, writes the archive content to live. Response: updated `DocumentDto`. |
| `DELETE` | `/archives/{archiveId}` | `DELETE` | Permanently removes a version (row + blob). Live remains untouched. |

Lineage security: each endpoint validates that `archive.lineageId == document.lineageId && archive.tenantId == document.tenantId`. Mismatch ⇒ 404 (not 403/400 — no leak about the existence of foreign lineages).

DTO inventory (`vance-api`):

- `DocumentArchiveSummary` (`@GenerateTypeScript`) — List entry.
- `DocumentArchiveDto` (`@GenerateTypeScript`) — Detail view.
- `DocumentArchiveListResponse` (`@GenerateTypeScript`) — Wrapper with `totalCount`.

TypeScript types are automatically generated via `generate-java-to-ts-maven-plugin`; the `index.ts` of `@vance/generated` re-exports them manually (see CLAUDE.md → DTO Generation).

## 6. Settings

| Key | Type | Scope-Cascade | Default | Effect |
|-----|-----|---------------|---------|--------|
| `documents.archive.enabled` | `BOOLEAN` | Project → `_vance` → `application.yml` (`vance.documents.archive.enabled`) | `true` | `false` completely disables archiving for the project. Existing archives are retained — they are only still readable, no new ones are created. |
| `documents.archive.minVersionIntervalSeconds` | `LONG`/`STRING` | Project → `_vance` → `application.yml` (`vance.documents.archive.minVersionIntervalSeconds`) | `600` (10 min) | Minimum interval between two archive entries per document. |

Operator override (highest priority): `vance.documents.archive.enabled` in `application.yml` — `false` disables the feature for the entire Brain instance, regardless of Project/Tenant settings.

Setting readings run via the existing `SettingService` cascade (`getBooleanValueCascade`, `getStringValueCascade`), no new resolvers.

## 7. Web-UI

In the Document Editor (`vance-face`), a new "Versions" block appears **below the Auto-Summary panel**:

- **Header** always shows the count; clickable to expand/collapse.
- **Expanded list**: scrollable, each row = an archive entry with `archivedAt` date (local timezone), path, size, and `[Restore]` / `[Delete]` buttons.
- **Clicking a row**: opens a preview modal with a read-only display of the `inlineText`. Saving is not available there.
- **Restore confirmation** in its own modal: explicitly explains that the current content is automatically saved as a new version (no data loss due to accidental restore).
- **Delete confirmation** also in a modal, with a note that only this version is removed and the live document remains untouched.

Component: `DocumentArchives.vue` — uses Vance primitives (`VModal`, `VButton`, `VAlert`), no direct DaisyUI classes outside `src/components/`. Composable: `useDocumentArchives.ts` encapsulates the five REST calls + local list/preview state.

After a successful restore, `DocumentArchives` swaps the selection via the `restored` event in `DocumentApp.vue` so that the opened document immediately shows the restored content — no second roundtrip needed.

i18n strings under `documents.archives.*` in `en.ts` + `de.ts`.

## 8. Service Interface

```
DocumentService              Live Document Lifecycle, Trigger Decision
   │
   ├─ archiveCurrent ────►   DocumentArchiveService.archiveCurrent
   ├─ delete         ────►   DocumentArchiveService.deleteAllForLineage
   ├─ listArchives   ────►   DocumentArchiveService.listForLineage
   ├─ countArchives  ────►   DocumentArchiveService.countForLineage
   ├─ findArchive    ────►   DocumentArchiveService.findById
   ├─ deleteArchive  ────►   DocumentArchiveService.deleteArchive
   └─ restoreArchive ──┬─►   DocumentArchiveService.archiveCurrent (live)
                       └─►   DocumentArchiveService.restore (payload)

DocumentArchiveService       Data ownership over document_archives
                             Blob-Move on archive, Blob-Copy on restore
                             Blob-Delete on row delete
```

Data ownership rule (from CLAUDE.md): no other service directly accesses `document_archives`. `DocumentArchiveRepository` is package-private; `DocumentService` is the only caller.

## 9. What is NOT in Scope (v1)

- **Diff viewer** between two versions.
- **Thinning / Retention** (condensed retention of older versions, e.g., one per hour / day / week).
- **Quotas** — no limit on number or total bytes per Document or Project.
- **Cross-Tenant Restore** — all operations are strictly scoped (Tenant, Project, Lineage).
- **Archives in RAG / Auto-Summary** — only the live version is indexed; version contents never flow into the vector store or summary.
- **CLI Surface** — the Foot CLI has no dedicated archive commands; the Web-UI is the v1 frontend.
- **Audit / Activity Feed** — no dedicated event log; the normal `event_log` does not receive versioning events. If needed, this will be added in `events.md`.

## 10. Migration

Newly introduced fields on `DocumentDocument`:

- `lineageId` — for existing documents, the field is empty (`""`) after the Mongo default. `DocumentService` does not need to perform a migration on the first read; **however**: an empty `lineageId` blocks archiving (`archiveCurrent` would otherwise throw). Therefore, the next save for each document creates a fresh `UUID` (see point below). An alternative would be a boot-time migrator; in v1, the lazy path is sufficient.
- `lastArchivedAt` — `null` starts OK.
- `version` — Spring Data starts with `null`; the first `save()` writes `1`.

**Lazy Backfill** for documents created before this feature: `DocumentService.update` populates an empty `lineageId` with a fresh UUID on the first save. There is no separate migrator — the version history begins with the first edit after rollout.

**Note for tests / bootstrap**: If code works directly with `DocumentDocument` builders, it must set a `lineageId` — otherwise, the protection check in `archiveCurrent` will apply. `DocumentService.create` does this automatically (`UUID.randomUUID()`); the update path adds it lazily.
