# Vance — Document Lock

> A soft, voluntary edit protection mechanism per document. Each document carries a `lockedFor: Set<WriterRole>` with the blocked Writer classes (`AI`, `USER`, `KIT`); a write attempt by a blocked class is rejected by the `DocumentService`. The lock is orthogonal to the actual permissions system — it prevents accidents, not malicious access. Any participant can release it at any time.
>
> See also: [document-versioning](document-versioning.md) | [documents-channel](documents-channel.md) | [kits](kits.md) | [web-ui](web-ui.md)

---

## 1. Purpose

Vance documents are written by many actors: humans in Cortex / Foot, LLMs via Document-Tools, scripts via `vance.documents.write`, Engines, Kit-Apply during import. The **permissions system** (Tenant/Project membership, Role) remains unaffected — it governs **who is allowed** to access a Document at all. This addresses the orthogonal question: **should a specific Document prevent accidental write access, even if the writer is principally allowed?**

Typical triggers:

- **Kit Import:** Skills, Manuals, Recipe-Files from a Kit should not be overwritten by the LLM if it becomes "creative" during the Session.
- **User Fork:** A user has heavily customized a Kit default and wants to protect it against future Kit updates — but still wants to work on it themselves.
- **Operator Freeze:** An audit/contract Document should not be accidentally changed by a human; however, Kit-Apply may refresh it if the template has been upstreamed.
- **Full Freeze:** A note marked as "finished" — no one touches it without explicit unlock.

**Soft Lock:** Any participant (human via UI, LLM via its own tool, Kit-Operator via CLI flag) can release the lock if they make a conscious decision. There is no master override hierarchy, no cryptographic locking. This is intentional — Vance data should remain repairable at all times.

## 2. Data Model

### 2.1 WriterRole Enum

Three Writer classes, in `vance-api`:

```java
public enum WriterRole {
    AI,     // LLM/Tools, Engine-Spawns, Script API
    USER,   // manual user write (Cortex Save, Foot, REST PUT /content)
    KIT     // KitApplyService during Install/Update
}
```

The roles are **independently selectable** — no auto-add logic, no "if X then Y" magic. The user marks what they want to lock, the server stores exactly that. Common useful combinations:

| `lockedFor`        | Meaning                                              |
|--------------------|------------------------------------------------------|
| `{}`               | No lock (Default)                                    |
| `{AI}`             | AI protection: Kit default that LLM should not touch |
| `{AI, USER}`       | Operator Freeze: only Kit-Apply still refreshes      |
| `{AI, KIT}`        | User Fork: User edits, Kit/AI stay away              |
| `{AI, USER, KIT}`  | Full Freeze: no one writes anymore                   |

Other combinations (`{USER}`, `{KIT}`, `{USER, KIT}` without AI) are also allowed — even if semantically unusual.

### 2.2 Persistence — Live State vs. Initial Hint

**Live, authoritative** on `DocumentDocument` (`vance-shared`):

```java
@Builder.Default
private Set<WriterRole> lockedFor = EnumSet.noneOf(WriterRole.class);
```

This field is live state in the Mongo record, **not** part of the file content. Every user/LLM action only changes this value. Migration: missing ⇒ empty set, no backfill action needed.

**Initial Hint** in the `$meta` header of the file (optional, Markdown only):

```yaml
---
$meta:
  lockedForInitial: [AI, KIT]
---
# Skill: Threat Modeling
…
```

Behavior:

- On Document-Create, `DocumentDocument.lockedFor` is seeded once from `$meta.lockedForInitial` (via `DocumentService.parseLockedForInitial`).
- On subsequent writes, the field is **read but ignored** — user toggles do not propagate back into the file content.
- Different field names (`lockedFor` vs. `lockedForInitial`) make it immediately visible in a diff: one is seed, the other is live state.
- YAML and JSON `$meta` strategies drop list values during parsing — header content ends up as `Map<String,String>`. For these formats, `$meta.lockedForInitial` therefore does **not** seed; Kit manifest override (`documents: [{path, lockedForInitial}]`) is the fallback.

### 2.3 API Surface

`DocumentDto` (in `vance-api`) exposes the field as a sorted array:

```typescript
interface DocumentDto {
  …
  lockedFor: WriterRole[];
}
```

TS generation produces `WriterRole` as a true Enum (`WriterRole.AI` etc.); Sets serialize stably via `EnumSet` iteration order.

## 3. Enforcement

### 3.1 WriterIdentity → WriterRole Mapping

The `DocumentService` maps an inbound `WriterIdentity` (with `editorId` / `userId` / `displayName`) to the `WriterRole` of the writer:

| `WriterIdentity.editorId` | → Role |
|---------------------------|--------|
| `_kit` (sentinel `EDITOR_ID_KIT`) | `KIT` |
| `_tool` (sentinel `EDITOR_ID_TOOL`), null | `AI` |
| any other ID (real client UUID) | `USER` |

`DocumentService.KIT_IDENTITY` and `TOOL_IDENTITY` are the pre-built sentinel records. `KitApplyService` calls all Document-Writes with `KIT_IDENTITY`; LLM-Tools use `TOOL_IDENTITY`; REST controllers build the Identity from JWT + `X-Editor-Id` header — see `documents-channel.md` §Writer-Identity.

### 3.2 Check Matrix

`DocumentService.requireWriteAllowed(doc, identity)` is the central gate, called in every mutating method (`replaceContent`, `update`, `delete`, `trash`):

```
lockedFor contains →   AI                | USER              | KIT
─────────────────────┼───────────────────┼───────────────────┼───────────────────
Writer Role: AI     | DocumentLocked    | OK                | OK
Writer Role: USER   | OK                | DocumentLocked    | OK
Writer Role: KIT    | OK                | OK                | DocumentLocked
```

The `DocumentService.DocumentLockedException` (inner class) carries `blockedRole` + `lockedFor` (defensive copy, unmodifiable). A user-driven REST lock change does **not** go through this check — otherwise, a locked Document could never be unlocked. `setLockedFor(id, roles)` only writes the `lockedFor` field, not content.

### 3.3 Error Behavior — Three Surfaces

**REST.** `@ExceptionHandler` in `DocumentController` maps `DocumentLockedException` to HTTP 409 with a structured body:

```json
{
  "error": "document_locked",
  "blockedRole": "USER",
  "lockedFor": ["AI", "USER"],
  "message": "Document is locked against USER writes (lockedFor=[AI, USER])"
}
```

The Web-UI catches this and can offer a "Document is locked — unlock first?" action.

**LLM-Tools.** The `ToolDispatcher` has a specific catch for `DocumentLockedException` and translates it into a `ToolException` with a clear `document_locked:` prefix:

```
document_locked: write blocked because the document's lockedFor set
contains USER (full set: [AI,USER]). Ask the user to unlock via the
document properties panel, or call document_lock_remove if you have
a clear reason.
```

This way, the model sees a recognizable signal instead of a generic "Tool failed: …" wrapper and can decide whether to ask the user or unlock itself.

**Kit-Apply.** The `KitInstaller` catches `DocumentLockedException(KIT)` per file and treats it as a skip-with-log: the individual Document remains unchanged, other files of the same Kit update proceed normally. Skipped paths are added to `KitOperationResultDto.documentsSkipped` and are visible in the Op-Report.

## 4. Lock Mutation

### 4.1 REST

```
PATCH /brain/{tenant}/documents/{id}/lock
Body: { "lockedFor": ["AI", "KIT"] }
```

This is a deliberate separate endpoint, **not** part of `PUT /documents/{id}` — it prevents a single write call from accidentally changing content **and** lock status simultaneously. The body is `DocumentLockRequest` (in `vance-api`); `null`/empty `lockedFor` clears the lock. The response is the fresh `DocumentDto`.

### 4.2 LLM-Tools

Three tools in the Document-Tool-Set:

- **`document_lock_set(documentId, lockedFor)`** — Complete reassignment. An empty array clears the lock.
- **`document_lock_add(documentId, role)`** — Add a role. No-op if already present.
- **`document_lock_remove(documentId, role)`** — Remove a role. No-op if not present.

All three tools write via `DocumentService.setLockedFor(...)`, which is not blocked by the lock check itself (otherwise, no unlock possibility). There is **no** "reason" requirement when removing roles — the three roles are independent, and the user is informed about this via the Tool-Description.

### 4.3 Web-UI

`DocumentPropertiesPanel` in Cortex shows three independent checkboxes (`AI` / `USER` / `KIT`) with hover tooltips ("Block LLM / tool writes", "Block manual user writes", "Freeze against Kit-Apply updates"). No UI magic — boxes are freely selectable. Lock changes are persisted together with Title/Tags/MIME/Color via the single "Save properties" button; internally, the save first fires the `PATCH /lock` and then the `PUT /documents/{id}`, if both are dirty.

`VLockBadge` (in `packages/vance-face/src/components/`) renders a 🔒 icon in the tab header next to the path with compact role initials (e.g., `A·K` for `{AI, KIT}`) plus tooltip "Locked against: AI, KIT". An empty `lockedFor` does not render the badge at all.

**USER-Lock and Code Editor.** If `USER ∈ lockedFor`, the `DocumentTabShell` passes the `CodeEditor` in `readOnly` mode to the User-Tab — the edit view is still displayed (user can read, syntax highlighting remains, notes visible), but keystrokes are dropped at the CodeMirror level. Save is additionally intercepted by the 409 from the server. Typed-Model-Views (ChecklistView, MindmapView, …) currently have **no** general Lock-Gating — follow-up.

## 5. Kit-Apply

With the `$meta.lockedForInitial`-Seed from §2.2, the seeding side is trivial. The actual effect of a `KIT` entry in the lock set becomes apparent during re-apply:

| Apply State                                  | Behavior                               |
|----------------------------------------------|----------------------------------------|
| Document does not exist                      | Create + Seed from `$meta.lockedForInitial` |
| Exists, `KIT ∉ lockedFor`                    | Content is overwritten; `lockedFor` remains |
| Exists, `KIT ∈ lockedFor`                    | Write skipped; path in Op-Report `documentsSkipped` |

Lock level **does not propagate** from Kit update to existing Documents — if the Kit author changes their `$meta.lockedForInitial` between two versions, only new installations will see the new seed. Force-reset to Kit defaults requires an explicit operator command (planned: `wb kit apply --reset-locks --force`; not yet implemented).

**Binary files** (PDFs, images, …) do not carry a `$meta` header. Optional fallback in the Kit manifest:

```yaml
documents:
  - path: assets/cheatsheet.pdf
    lockedForInitial: [AI]
```

Deliberately the same field name as the `$meta` key, so the mental mapping is consistent.

## 6. What the Lock Does NOT Do

- **No permissions model.** Tenant/Project membership and Action-Permissions remain the sole authorization sources. A user without write permission will still fail the permission check, completely independent of the lock.
- **No cryptographic locking.** An operator with Mongo access can set / clear the field directly. This is intentional — the lock is meant to block accidents, not prevent disaster recovery.
- **No Document-Delete protection at the system level.** Garbage collection (e.g., `_chatbox/...` expiration, Session cleanup) currently uses `delete(id)` with `TOOL_IDENTITY` → `AI` role. A user who absolutely wants to freeze a Session workspace can set a `USER`-lock, but cleanup would then no longer be able to clear it. If the need becomes real: a fourth `SYSTEM` role as a bypass.
- **No inheritance over directory hierarchies.** Locks are per Document. Pattern-based locks (e.g., `_vance/manuals/*` as a group) are out-of-scope for v1.
- **No audit log for lock changes.** `document_archives` (see `document-versioning.md`) will later archive the lock level if the need arises — currently, there is no who/when trace.
- **No time-based auto-unlock.** Locks remain until manually removed.

## 7. Implementation References

| Layer | File |
|-------|------|
| Enum | `vance-api/.../api/documents/WriterRole.java` |
| DTOs | `vance-api/.../api/documents/DocumentDto.java`, `DocumentLockRequest.java` |
| Document Field | `vance-shared/.../document/DocumentDocument.java` (`lockedFor`) |
| Service Gate | `vance-shared/.../document/DocumentService.java` — `requireWriteAllowed`, `setLockedFor`, `writerRoleOf`, `normalizeLockedFor`, `parseLockedForInitial`, `DocumentLockedException`, `KIT_IDENTITY` |
| REST | `vance-brain/.../brain/documents/DocumentController.java` — `updateLock`, `handleDocumentLocked` |
| LLM-Tools | `vance-brain/.../brain/tools/document/DocLock{Set,Add,Remove}Tool.java` |
| Tool-Dispatcher | `vance-brain/.../brain/tools/ToolDispatcher.java` — `document_locked:` translation |
| Kit-Apply | `vance-brain/.../brain/kit/KitInstaller.java` — Skip-on-KIT + `documentsSkipped`-Report |
| Web-UI | `vance-face/.../cortex/components/DocumentPropertiesPanel.vue`, `DocumentTabShell.vue` (USER-readonly), `components/VLockBadge.vue` |
| Tests | `vance-shared/.../test/.../document/DocumentLockTest.java` |
