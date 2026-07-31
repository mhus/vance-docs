---
title: "Vancetope — Document Versioning"
parent: Specs
permalink: /specs/document-versioning
---

<!-- AUTO-GENERATED from specification/public/en/document-versioning.md — do not edit here. -->

---
# Vancetope — Document Versioning

> Every overwritten document leaves an archived version. Versions reside in their own Mongo collection, are linked to the active document by a stable `lineageId`, and can be viewed, restored, or deleted individually. This feature can be disabled per Project via the setting cascade.
>
> See also: [project-lifecycle](/specs/project-lifecycle) | [rag](/specs/rag) | [settings-system](/specs/settings-system) | [web-ui](/specs/web-ui)

---

## 1. Purpose

Vancetope is a Think Engine tool — users frequently write, refactor, and delete notes, tables, mind maps, and small code snippets. Without versioning, every overwrite irrevocably loses the old content. Document Versioning is the safety net: after every significant edit, the previous version is stored as an independent archive version that can be restored at any time.

Deliberately excluded (v1):

- **No Diff Viewer** — only read-only preview per version; comparison is done by the browser if the user opens tabs side-by-side.
- **No Automatic Thinning** — versions remain until manually deleted or the active document is deleted. Retention policies are explicitly for later.
- **No Versioning for trash/`_vance/trash/`** — Soft-Delete and versioning are orthogonal; a second layer of protection for deleted documents is not necessary.
- **No Versioned Restore History** — the restore itself archives the previous live version (see §4), but Vancetope does not track "who restored to which version when". The who/when lives in the `createdBy` field of the created Archive entries.

## 2. Data Model

### 2.1 Lineage ID on the Active Document

`DocumentDocument` gets three new fields:

| Field | Type | Description |
|------|------|-------------|
| `lineageId` | `String` (UUID, indexed) | Assigned once at creation, then immutable. Carried along during rename, Inline⇄Storage switch, and restore. Connects the active document with all archive entries in its history. |
| `lastArchivedAt` | `@Nullable Instant` | Wall-clock time of the last archive entry for this document. `null` until the first archive step has run. Together with the Min-Interval setting, determines whether the next save creates a new archive version. |
| `version` (`@Version`) | `@Nullable Long` | Spring Data Optimistic Lock. Throws `OptimisticLockingFailureException` on concurrent writers to prevent Archive-then-Overwrite from colliding with a parallel Save-Race. |

### 2.2 Archive Collection

Separate collection `document_archives`. Deliberately separated from `documents` because:

- Active lookups (`tenantId + projectId + path` unique) remain performant — no filter on a status is needed.
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
- `(lineageId)` — Fallbacks (e.g., Lineage-wide Delete).

`archivedAt` (millisecond resolution) is sufficient as a human-readable version label. Uniqueness is guaranteed by Mongo's `_id` (ObjectId).

## 3. Storage Lifecycle

Storage Blob ownership is **strictly exclusive** — no reference counting, no sharing between Live and Archive. This allows Blobs to be deleted without complication as soon as their owning Document or Archive disappears.

### 3.1 Archive-on-Write (Pointer-Move, no Copy)

When overwriting in `DocumentService.update`:

1. Read the live document (`findById`).
2. If content actually changes AND the cascade setting `documents.archive.enabled` is active AND `lastArchivedAt` (or `createdAt`, if no archive exists yet) is older than the Min-Interval: `DocumentArchiveService.archiveCurrent(live)`.
3. `archiveCurrent` builds the Archive entry and **moves** `live.storageId` (pointer copy to the new Archive-Document, then `null` on Live). Inline text is copied as a String (small, cheap).
4. Live-Update writes the **new** Blob (or new inline text) — the old Blob now lives under the Archive entry; the existing "delete old storage blob" branch in the update path must be skipped in this case.

Consequence: archiving itself only costs a Mongo insert and a pointer update — no Blob read/write, no second GridFS file.

### 3.2 Restore (Copy)

Asymmetric to archiving — no pointer is shared during restore:

1. `DocumentArchiveService.restore(archive)` provides a `RestorePayload`.
2. For an inline archive, the Payload carries the snapshot text.
3. For a storage archive, `restore` calls `StorageService.duplicate(archive.storageId, archive.tenantId)` — a new Blob is created, the Archive Blob remains untouched.
4. `DocumentService.restoreArchive(liveDocId, archiveId)` **first** calls `archiveCurrent(live)` (thus the current version is recorded as a version, the restore is visible as an undoable event), then the Payload is applied to the Live dataset.

Restore is therefore: "adopt old version, save current version as new version". No one accidentally loses work by performing a restore.

### 3.3 Delete

| Action | Effect on Live | Effect on Archive |
|---|---|---|
| `DocumentService.trash(id)` (Soft-Delete to `_vance/trash/`) | Path move, dataset remains. | Unchanged — Archives are linked to `lineageId`, not `path`. |
| `DocumentService.delete(id)` (Hard-Delete from `_vance/trash/`) | Live-Row + Live-Blob deleted. | `DocumentArchiveService.deleteAllForLineage(tenantId, projectId, lineageId)` — all Archive-Rows + their respective Blobs deleted. |
| `DocumentService.deleteArchive(archiveId)` | Unchanged. | One Archive removed: Row + Blob. |

Hard-Delete of a Live-Document cleans up the version history — archives without a living counterpart would be orphaned storage.

### 3.4 Orphan-Sweep (Cluster-Master, Safety-Net)

The normal paths in §3.1–§3.3 are designed so that no Blob should "orphan" — `archiveCurrent` performs a pointer move, `restore` duplicates, `delete` cleans up cascadingly. In practice, remnants still remain:

- **Crash during Hard-Delete.** `DocumentService.delete` calls (1) `storageService.delete(liveBlob)`, (2) `repository.delete(doc)`, (3) `archiveService.deleteAllForLineage(...)`. If the process dies between step 2 and 3, the entire Archive series remains — no Live-Doc-Row left to attach to.
- **Crash during Doc-Write.** During Create/Update, `DocumentService` first writes the Blob (`storageService.store`) and only then persists the `DocumentDocument`-Row. If the process dies between these two steps, the Blob remains without a reference.

`OrphanStorageSweepTick` (in `vance-brain.cluster`, master-gated — see cluster-project-management.md §4.6) calls `StorageOrphanCleanupService.sweepOnce(now, gracePeriod, batchSize)` hourly in two phases:

**Phase 1 — Orphan-Archives.** For each Archive entry, it checks if at least one Live-Doc with the same `lineageId` exists. If not, the Archive (including Blob via `deleteArchive`) is deleted. **No Grace-Period** — an Archive is never created without a living anchor in the normal world, because `archiveCurrent` works via pointer-move and the Live-Doc-Row carries the `lineageId` until the end of the `update` call. An Archive without a Live-Doc is therefore definitely Hard-Delete-crumbs.

**Phase 2 — Orphan-Storage.** Cursor over `storage_data` with `isFinal: true AND createdAt < now − gracePeriod` (default `PT1H`). Per batch, a single `$in`-lookup against `documents.storageId` and `document_archives.storageId`; everything in the batch that is referenced by neither Doc nor Archive is soft-deleted via `storageService.delete`. The existing `StorageCleanupScheduler` performs the final chunk wipe after the Soft-Delete window.

**Why `gracePeriod` is necessary.** Due to the crash-in-Doc-Write case above: between `storageService.store()` and `repository.save(doc)`, there is a window where the Blob lives without a reference — if the sweep were to clear it immediately, it would also affect ongoing, legitimate write operations. `gracePeriod` must be longer than the longest expected Doc-Write; `PT1H` is generous for regular use cases (typical Doc-Writes are in the millisecond range).

**Why no `gracePeriod` is needed for Archives.** `archiveCurrent` does **not** write a new Blob — it takes the `storageId` from the Live-Doc via pointer-move. During the Archive-Save in Mongo, the Live-Doc-Row continues to point to the same Blob (the Caller only updates the Live-Doc-Storage-Id after `archiveCurrent` returns). At no point does a Blob exist that is pointed to by neither Doc nor Archive, **because an Archive would be reassigned a Blob**.

**Memory + Index.** Cursor-based, batch size via Config (`vance.storage.orphanSweep.batchSize`, default 500). Three indexes support the Sweep-Queries:

- `documents.storageId` — `@Indexed(sparse=true)` (inline-Docs without Storage are not in the index).
- `document_archives.storageId` — `@Indexed(sparse=true)`.
- `storage_data.final_createdAt_idx` — Compound-Partial `{ isFinal: 1, createdAt: 1 }` with `partialFilter: { isFinal: true }`. One entry per Blob, not per Chunk.

**What the Sweep does not attempt:**

- Race against normal-Cleanup: between step 2 and 3 of `DocumentService.delete`, Archives of a yet-to-be-cleaned Lineage would appear as Orphan. The Sweep then deletes them itself — thus only cleaning up what the standard cascade would have wanted anyway. Multiple deletes of the same row are idempotent for `storageService.delete` (Soft-Delete-Marker); for the Archive itself, the second variant runs into `findById.isEmpty()` and is a no-op.
- Workspace-Files (see [workspace-management.md](/specs/workspace-management)) — these are outside `storage_data`. Separate cleanup path.
- RAG-Chunks (`rag_chunks`) — separate domain, separate service.

## 4. Trigger Logic

`DocumentService.update` decides before each inline-text write whether an Archive entry is created. Cascade Order (first false answer wins):

1. **Operator Kill-Switch** `vance.documents.archive.enabled` (`application.yml`, default `true`). `false` ⇒ never archive.
2. **Cascade Setting** `documents.archive.enabled` (Project → `_vance` → application-Default `true`). `false` ⇒ never archive.
3. **Content-Diff**: only archive if `newInlineText != existing.inlineText`. Pure metadata edits (Title, Tags, Path, MIME-Type, ragEnabled) do not create a version.
4. **Min-Interval**: `lastArchivedAt` (or `createdAt` as fallback for the first version) plus the cascade setting `documents.archive.minVersionIntervalSeconds` (Default 600s/10min) must be in the past. Save bursts within this window collapse to the last written version — the user gets one version per edit session, not per keystroke.

`shouldArchiveOnSave(doc)` (package-private in `DocumentService`) encapsulates the decision — tested individually.

**Restore** deliberately ignores the trigger logic and always archives. Otherwise, a restore immediately after a save would lose the current state.

**Concurrency**: the `@Version` field on the live document protects against Archive-then-Overwrite races. If a parallel writer loses, the UI enters its standard retry / error path.

## 5. REST API

All endpoints under `/brain/{tenant}/documents/{id}/archives*`, JWT-authorized, resource permissions as on the live document:

| Method | Path | Permission | Description |
|---------|------|-----------|--------------|
| `GET` | `/archives` | `READ` | List of all archive versions (newest first) + Count. Lightweight — `DocumentArchiveSummary` without `inlineText`. |
| `GET` | `/archives/{archiveId}` | `READ` | Complete `DocumentArchiveDto` including snapshot-`inlineText` for inline versions. |
| `GET` | `/archives/{archiveId}/content` | `READ` | Stream-Body — same contract as `/documents/{id}/content`. For Storage-backed Previews / Download. |
| `POST` | `/archives/{archiveId}/restore` | `WRITE` | Archives the current live version, writes the archive content to live. Response: updated `DocumentDto`. |
| `DELETE` | `/archives/{archiveId}` | `DELETE` | Permanently removes a version (Row + Blob). Live remains untouched. |

Lineage security: each endpoint validates that `archive.lineageId == document.lineageId && archive.tenantId == document.tenantId`. Mismatch ⇒ 404 (not 403/400 — no leak about the existence of foreign lineages).

DTO Inventory (`vance-api`):

- `DocumentArchiveSummary` (`@GenerateTypeScript`) — List entry.
- `DocumentArchiveDto` (`@GenerateTypeScript`) — Detail view.
- `DocumentArchiveListResponse` (`@GenerateTypeScript`) — Wrapper with `totalCount`.

TypeScript types are automatically generated via `generate-java-to-ts-maven-plugin`; the `index.ts` of `@vance/generated` re-exports them manually (see CLAUDE.md → DTO Generation).

## 6. Settings

| Key | Type | Scope-Cascade | Default | Effect |
|-----|-----|---------------|---------|--------|
| `documents.archive.enabled` | `BOOLEAN` | Project → `_vance` → `application.yml` (`vance.documents.archive.enabled`) | `true` | `false` completely disables archiving for the Project. Existing archives are retained — they are only still readable, no new ones are created. |
| `documents.archive.minVersionIntervalSeconds` | `LONG`/`STRING` | Project → `_vance` → `application.yml` (`vance.documents.archive.minVersionIntervalSeconds`) | `600` (10 min) | Minimum interval between two archive entries per document. |

Operator Override (highest priority): `vance.documents.archive.enabled` in `application.yml` — `false` deactivates the feature for the entire Brain instance, regardless of Project/Tenant settings.

Setting readings run via the existing `SettingService`-cascade (`getBooleanValueCascade`, `getStringValueCascade`), no new resolvers.

## 7. Web-UI

In the Document-Editor (`vance-face`), a new "Versions" block appears **below the Auto-Summary panel**:

- **Header** always shows the count; clickable to expand/collapse.
- **Expanded List**: scrollable, each row = an archive entry with `archivedAt` date (local timezone), path, size, and `[Restore]` / `[Delete]` buttons.
- **Clicking a row**: opens a preview modal with a read-only display of the `inlineText`. Saving is not available there.
- **Restore Confirmation** in its own modal: explicitly explains that the current content is automatically saved as a new version (no data loss due to accidental restore).
- **Delete Confirmation** also in a modal, with a note that only this version is removed and the live document remains untouched.

Component: `DocumentArchives.vue` — uses Vancetope-Primitives (`VModal`, `VButton`, `VAlert`), no direct DaisyUI classes outside of `src/components/`. Composable: `useDocumentArchives.ts` encapsulates the five REST calls + local list/preview state.

After a successful restore, `DocumentArchives` swaps the selection via the `restored`-event in `DocumentApp.vue` so that the opened document immediately shows the restored content — no second roundtrip needed.

i18n-Strings under `documents.archives.*` in `en.ts` + `de.ts`.

## 8. Service Interface

```
DocumentService              Live-Document-Lifecycle, Trigger Decision
   │
   ├─ archiveCurrent ────►   DocumentArchiveService.archiveCurrent
   ├─ delete         ────►   DocumentArchiveService.deleteAllForLineage
   ├─ listArchives   ────►   DocumentArchiveService.listForLineage
   ├─ countArchives  ────►   DocumentArchiveService.countForLineage
   ├─ findArchive    ────►   DocumentArchiveService.findById
   ├─ deleteArchive  ────►   DocumentArchiveService.deleteArchive
   └─ restoreArchive ──┬─►   DocumentArchiveService.archiveCurrent (live)
                       └─►   DocumentArchiveService.restore (payload)

DocumentArchiveService       Data sovereignty over document_archives
                             Blob-Move on archive, Blob-Copy on restore
                             Blob-Delete on row delete
```

Data sovereignty rule (from CLAUDE.md): no other service directly accesses `document_archives`. `DocumentArchiveRepository` is package-private; `DocumentService` is the only caller.

## 9. What is NOT in Scope (v1)

- **Diff Viewer** between two versions.
- **Thinning / Retention** (condensed retention of older versions, e.g., one per hour / day / week).
- **Quotas** — no limit on number or total bytes per Document or Project.
- **Cross-Tenant-Restore** — all operations are strictly scoped (Tenant, Project, Lineage).
- **Archives in RAG / Auto-Summary** — only the live version is indexed; version contents never flow into the Vector Store or the Summary.
- **CLI-Surface** — the Foot-CLI has no dedicated archive commands; the Web-UI is the v1 frontend.
- **Audit / Activity-Feed** — no dedicated event log; the normal `event_log` does not receive versioning events. If needed, this will be added in `events.md`.

## 10. Migration

Newly introduced fields on `DocumentDocument`:

- `lineageId` — for existing documents, the field is empty (`""`) after the Mongo default. `DocumentService` does not need to perform a migration on the first read; **however**: an empty `lineageId` blocks archiving (`archiveCurrent` would otherwise throw an error). Therefore, the next save for each document creates a fresh `UUID` (see point below). An alternative would be a boot-time migrator; for v1, the lazy path is sufficient.
- `lastArchivedAt` — `null` starts OK.
- `version` — Spring Data starts with `null`; the first `save()` writes `1`.

**Lazy Backfill** for documents created before this feature: `DocumentService.update` populates an empty `lineageId` with a fresh UUID on the first save. There is no separate migrator — the version history begins with the first edit after roll-out.

**Note for Tests / Bootstrap**: If code works directly with `DocumentDocument`-builders, it must set a `lineageId` — otherwise, the protection check in `archiveCurrent` will be triggered. `DocumentService.create` does this automatically (`UUID.randomUUID()`); the update path adds it lazily.
