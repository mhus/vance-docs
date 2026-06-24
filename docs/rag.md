---
title: "Vance — RAG (Retrieval-Augmented Generation)"
parent: Documentation
permalink: /docs/rag
---

<!-- AUTO-GENERATED from specification/public/en/rag.md — do not edit here. -->

{% raw %}
---
# Vance — RAG (Retrieval-Augmented Generation)

> How Vance places documents into a vector index, how the index is synchronized with the Project lifecycle, and how LLM engines query hits from this index. Builds upon the existing, low-level RAG subsystem (`RagDocument`/`RagChunkDocument`/`RagBackend`) and adds a canonical **Project-RAG layer** on top.
>
> See also: [project-lifecycle.md](/docs/project-lifecycle) | auto-summary.md | [llm-resource-management.md](/docs/llm-resource-management) | [knowledge-graph.md](/docs/knowledge-graph) (standalone system, not RAG) | planning/project-rag.md

---

## 1. Purpose

Documents of a Project should be addressable for RAG queries without explicit Tool calls. Specifically:

- a **Default-RAG per Project** named `_documents`, automatically created on the first `bring()`,
- automatic indexing of all Documents under `documents/**` (path filter, MIME filter, user override),
- crash-/multi-Pod-safe incremental indexing using the same dirty-flag/scheduler pattern as the Auto-Summary,
- manual reindex/rebuild actions via REST and Web-UI,
- Recipe-driven AutoInject variant that patches RAG hits into the System-Prompt per Turn.

Manual RAGs (with non-`_`-prefix) remain unchanged — user Tools (`rag_create`, `rag_add_text`, `rag_query`, `rag_delete`) continue to be an equally valid path alongside the Default-RAG.

---

## 2. Terminology

| Term | Definition |
|---|---|
| **RAG** | A catalog unit (`RagDocument`) plus the set of its Chunks (`RagChunkDocument`). Unique per `(tenantId, projectId, name)`. |
| **Project-Default-RAG** | The RAG with the reserved name `_documents`. Idempotently created by `ProjectLifecycleService.bring()`, deleted on `close()`. Untouched on `suspend()`. |
| **Reserved Name** | RAG names with `_`-prefix are system property (`_documents`, potentially others later). `rag_create`/`rag_delete` reject them. |
| **Eligibility** | Filter that decides whether a Document lands in the Project-Default-RAG: path prefix `documents/` + textual MIME type + `ragEnabled` override. |
| **`ragDirty`** | Boolean on `DocumentDocument`. Set by DocumentService on Create/Update if the filter applies; cleared by the Indexer-Scheduler after successful write. Analogous to Auto-Summary-`summaryDirty`. |
| **`ragClaimedBy`/`ragClaimedAt`** | Atomic claim for the Indexer (analogous to Summary-`claimedBy`/`claimedAt`). TTL-based lock, recovery on Pod crashes. |
| **Indexer-Tick** | `ProjectRagIndexScheduler` runs periodically, claims a batch per Project, and calls `ProjectRagIndexer.reindexDocument` per Document. |

---

## 3. Data Model

### 3.1 `ProjectDocument` (unchanged)

No new fields. The Default-RAG is a standalone Mongo document (`RagDocument`) that references the Project Scope via `tenantId`+`projectId`+`name=_documents`.

### 3.2 `DocumentDocument` — RAG Fields

```java
// Project-RAG inclusion override. null = auto (default per filter),
// true = always include, false = never include.
@Nullable Boolean ragEnabled;

// Dirty flag for the project-RAG indexer.
boolean ragDirty;

// Atomic claim — set by claimForRagIndex, cleared by markRagClean.
@Nullable String ragClaimedBy;
@Nullable Instant ragClaimedAt;
```

Compound index `tenant_project_rag_claim_idx` on `(tenantId, projectId, ragDirty, ragClaimedBy)` for efficient claim querying.

### 3.3 `RagDocument` (unchanged)

Pins embedding provider, model, and dimension upon creation. Fields are **immutable** after Create — provider/model change is always "Drop + Re-Create", no in-place Re-Embed (see §6.2).

### 3.4 `RagChunkDocument`

Fields unchanged. Existing `sourceRef` field is populated by the Project-RAG-Indexer as the **Document ID**, so that `ragService.removeBySource(ragId, docId)` can remove a Document from the RAG. Metadata map on the Chunks uses two convention keys:

- `kind`: `"content"` for Body-Chunks, `"summary"` for Summary-Chunks (see §4.3).
- `path`: Document path as plain text, primarily for debugging and UI display.

---

## 4. Indexing Pipeline

### 4.1 Filter

A Document lands in the `_documents`-RAG if and only if all three conditions are met (checked by `DocumentService.isRagEligible`):

1. `path.startsWith("documents/")` — everything under `_vance/`, `_bin/`, `_chatbox/`, `_slart/` etc. is **not** indexed.
2. `isTextual(mimeType)` — `text/*` or one of the code MIME types from the existing `CODE_MIME_WHITELIST`.
3. `ragEnabled != false` — the user override trumps the default; if `ragEnabled == true`, it is included even against conditions 1+2.

Order in code: first `ragEnabled` override (if set), otherwise path prefix, then MIME.

### 4.2 Dirty-Flag Maintenance

- **`DocumentService.create`** — after persisting, `ragDirty=true` is set if the filter applies.
- **`DocumentService.update`** — if body content, path, or `ragEnabled` change, `ragDirty=true` is set. The Indexer re-checks the filter upon pickup (race protection).
- **`DocumentService.delete`** — synchronous cleanup via `ragService.removeBySource(_documents, docId)`. No polling path needed: Delete is a Mongo-Delete + Mongo-Delete, no Embed calls.
- **`DocumentSummaryDriver.run`** — after successful Summary-Write, calls `documentService.markRagDirty(docId)` so that the Summary-Chunk is written in the next tick.

### 4.3 Indexer Pipeline (per Document)

`ProjectRagIndexer.reindexDocument(DocumentDocument)`:

```
1. Re-check filter §4.1.
2a. Filter says "no": ragService.removeBySource(_documents, docId) + markRagClean → done.
2b. Filter says "yes":
    a. ragService.removeBySource(_documents, docId)       # remove old Chunks
    b. ragService.addText(_documents, docId, content, {kind: "content", path})
    c. if rag.project.includeSummaries == true AND summary != null:
         ragService.addText(_documents, docId, summary, {kind: "summary", path})
    d. markRagClean(docId)
```

Failures from the Embed call are caught by the Scheduler-Tick → `releaseRagClaim(docId)` → TTL-based recovery on the next tick.

### 4.4 Scheduler (`ProjectRagIndexScheduler`)

Periodically (default 30s, configurable via `vance.rag.indexer.intervalMs`):

```
1. Determine Projects for this Pod: findRunningByHomeNode(selfNode) + findPodlessActive().
2. Per Project:
   a. Check rag.project.enabled cascade setting → skip if false.
   b. claimForRagIndex(tenant, project, podId, batchSize, claimTtl).
   c. Per claimed Doc: indexer.reindexDocument(doc).
      - Success: counter "outcome=success".
      - Failure: releaseRagClaim(docId) + counter "outcome=failed".
```

Settings:

| Key | Default | Effect |
|---|---|---|
| `vance.rag.indexer.batchSize` | 10 | Max Documents per Project per Tick |
| `vance.rag.indexer.intervalMs` | 30000 | Tick Interval |
| `vance.rag.indexer.initialDelayMs` | 60000 | Delay after Pod boot |
| `vance.rag.indexer.claimTtlMinutes` | 10 | Claim TTL |

Metrics (Micrometer-Counter): `vance.rag.indexer.runs` with tag `outcome ∈ {success, failed, skipped}`.

### 4.5 Cascade Settings

| Key | Default | Effect |
|---|---|---|
| `rag.project.enabled` | `true` | Completely disables the `_documents`-RAG for a Project. Indexer no-op, AutoInject no-op. Manual RAGs unaffected. |
| `rag.project.includeSummaries` | `true` | Whether `summary`-Chunks are written in addition to the `content`-Chunk. |
| `rag.autoInject.enabled` | `null` | Tenant/Project override for `rag.autoInject` (Recipe-Param, see §5). `null` = Recipe wins; explicit `true`/`false` overrides the Recipe. |
| `ai.embedding.provider` | `none` | Embedding backend for RAG. Values: `none` (RAG off for the Tenant — no indexing, no Embed call, no WARN logs), `embedded` (in-process E5-small-v2, keyless, 384-dim, ~120 MB in JAR), `gemini`, `openai`. Pinned when **creating** new RAGs; existing RAGs continue to use their original backend unless the Tenant switches back to `none` (Kill-Switch — see §6.1). |
| `ai.embedding.model` | provider-dependent (Gemini: `gemini-embedding-001`) | Model name. For `embedded`, the field is ignored; for `openai`, e.g., `text-embedding-3-small` or an Ollama model name (`nomic-embed-text`) behind `baseUrl`. |
| `ai.embedding.apiKey` | — | PASSWORD setting, separate from the Chat-LLM-Credential-Namespace (`ai.provider.*.apiKey`). Ignored for `embedded`/`none`. Mandatory for `gemini`/`openai` — even for keyless OpenAI-compatible endpoints (Ollama/TEI), a non-empty placeholder must be present. |
| `ai.embedding.baseUrl` | — | Only read by the `openai` provider. Empty = `https://api.openai.com`. Routes OpenAI-compatible endpoints: Ollama (`http://localhost:11434/v1`), TEI in the cluster, vLLM, OpenRouter, Cortecs. |

---

## 5. AutoInject — RAG Hits in the System Prompt

**Status:** implemented for **Arthur** (Reactive-Chat-Engine). Other Engines (Ford, Marvin, Vogon, Eddie, Jeltz) are not yet connected — the `RagAutoInjectService` is generic and can be docked to any Engine that can add a dynamic system block via `ObjectProvider`-injection.

Variant C — Pre-Turn Hybrid with Threshold:

```
1. Pre-Turn-Hook (in the Engine, after the Memory-Block) checks:
     - Cascade-Setting rag.autoInject.enabled (Tenant/Project) if set → wins.
     - otherwise Recipe-Param rag.autoInject (default false).
   Off → skip, no RAG-Block.
2. Extract the last User-Message of the Turn from the Inbox.
   (For multiple UserChatInput entries: concatenation.)
3. ragService.query(_documents, userMessage, topK) — the RagService
   makes the Embed call internally with the RAG's pinned model.
4. Filter out hits with score < rag.minScore.
5. If ≥1 hit: dynamic SystemMessage (Markdown block <rag-context>)
   is added below the Memory-Block:

     <rag-context>
     Top relevant excerpts from the project's documents. Cite the
     source path when you use these.

     - documents/notes/topic.md (score 0.81)
       Vance is a Think Engine, not a productivity tool. …
     - documents/architecture.md [summary] (score 0.72)
       Multi-Pod cluster with Mongo-centric state. …

     </rag-context>

6. Tool-Surface: rag_query remains unchanged in the Tool-Whitelist
   (no separate expose mechanism in v1 — the Tool is Recipe-
   driven via the normal allowedTools schema).
```

Recipe-Params (on `process.engineParams`):

```yaml
rag:
  autoInject: false    # default — no automatic Inject
  minScore: 0.65       # Threshold, model-dependent
  topK: 5
```

Cascade-Setting `rag.autoInject.enabled` (Tenant/Project, default not set) allows a Tenant-wide override that trumps the Recipe. Three-value semantics:

- not set → Recipe-Param decides.
- `true` → Force AutoInject, even if Recipe says `false`.
- `false` → Disable AutoInject, even if Recipe says `true`.

Failure-Modes:

- No `_documents`-RAG present (e.g., Embed-Provider not configured) → silent skip.
- Embed/Query-Call fails → warn-log, silent skip (no RAG-Block, Turn continues normally).
- Inbox contains no User-Text (e.g., pure Wakeup-Turn) → silent skip.

Render style is **statically defined in `RagAutoInjectService.composeBlock`**, not Pebble-templated. If a Recipe wants a different style, that's a follow-up refactor (separate `rag.template`-Param or Pebble-Var).

---

## 6. Lifecycle Integration

### 6.1 Project Lifecycle

| Hook | Action | Tolerance |
|---|---|---|
| `ProjectLifecycleService.bring()` (after `workspaceService.init`) | `ProjectRagService.ensureDefaultRag(tenant, project)` | Tenant with `ai.embedding.provider=none` ⇒ silent skip (Optional empty, no WARN, no RAG-Doc created). Otherwise best-effort: Embedding-Provider misconfiguration does not throw, but warn-logs. Project reaches RUNNING in both cases. |
| `ProjectLifecycleService.suspend()` | no RAG action | — |
| `ProjectLifecycleService.close()` (after `workspaceService.dispose`) | `ProjectRagService.disposeDefaultRag(tenant, project)` | Best-effort: warn-log on error. |

**Tenant Kill-Switch.** `ai.embedding.provider=none` acts not only on creation but also continuously against existing data. `ProjectRagIndexScheduler` checks `RagService.isEmbeddingEnabled(tenantId)` per tick + per Tenant and completely skips the claim path (Counter `vance.rag.indexer.runs{outcome=tenant_disabled}`). `RagService.modelFor(rag)` throws a clear exception if someone still directly makes an Embed/Query call against an old RAG — thus, a Tenant cannot accidentally continue making Embed calls after officially deactivating RAG.

`suspend` deliberately leaves the RAG in place — index storage is cheap in Mongo, Resume uses it immediately.

### 6.2 Provider Change = Drop + Re-Create

`RagDocument.embeddingProvider`/`-Model`/`-Dimension` are **immutable after Create**. A change from, e.g., `gemini:text-embedding-004` to `openai:text-embedding-3-small` always proceeds as:

1. `rag.reindex(rebuild=true)` (REST/UI button or service call).
2. Server: `disposeDefaultRag` → `ensureDefaultRag` with current setting → `markAllForReindex`.
3. Scheduler re-indexes all eligible Docs into the fresh RAG.

Reason: Embeddings are not model-portable. Vector spaces of different models are geometrically incomparable; a mixed index would be garbage. Drop + Re-Create is the only clean migration.

---

## 7. REST Surface

Under `/brain/{tenant}/projects/{project}/rag`, JWT-protected, Permission `WRITE` on the Project-Resource (same gate for status read and reindex):

| Method | Path | Description |
|---|---|---|
| `POST` | `/reindex?rebuild={bool}` | `rebuild=false` queues all Docs for re-index. `rebuild=true` first drops and then re-creates with current settings. Returns `{rebuild, documentsQueued}`. |
| `GET` | `/status` | Read-only Snapshot: `{exists, ragId, embeddingProvider, embeddingModel, chunkCount, createdAt}` for the Web-UI. |

Manual RAGs continue to be managed via the `rag_*`-Tools on the WebSocket-Tool-Surface — no REST-Surface for this in v1.

---

## 8. Web-UI

### 8.1 Documents-Editor — `ragEnabled`-Tristate

In the Document-Detail next to the `autoSummary`-block, a radio tristate "Project RAG":

- **Auto** — follows filter §4.1 (default).
- **Always index** — `ragEnabled=true`.
- **Never index** — `ragEnabled=false`.

Wire-Format: `DocumentUpdateRequest.ragEnabled: "auto" | "on" | "off"`. Server parses into Boolean|null and calls `documentService.setRagEnabledOverride(docId, value)`. Sets `ragDirty=true` so the Indexer adjusts the Chunks in the next tick.

### 8.2 Insights-Editor — RAG-Tab

Own Top-Tab "RAG" in the Insights-Editor (next to Sessions, Recipes, …). Content:

- Status-Card: `_documents` RAG present? Provider/Model, Chunk count, Created-At.
- Action-Card with three buttons:
  - **Reindex** — `POST .../rag/reindex?rebuild=false`, incremental rebuild with pinned model.
  - **Rebuild with current embedding model** — `POST .../rag/reindex?rebuild=true`, confirmation dialog. Drop + Re-Create + Bulk-Dirty-Set.
  - **Refresh** — new GET-Status-Call.

Manual RAGs are **not** managed in the UI v1 — they only appear as a side effect of Tool calls and are visible via Tooling.

---

## 9. Manual RAGs (User-Tools)

Still available, unchanged in v1:

- `rag_create(name, title?, description?, chunkSize?, chunkOverlap?)` — rejects Reserved-Names with `_`-prefix.
- `rag_add_text(ragId, sourceRef?, text, metadata?)`
- `rag_add_workspace_file(ragId, sourceRef?, path)`
- `rag_add_document(ragId, documentId)` and `rag_add_path(ragId, pathPrefix)` — user-triggered bulk import of individual Docs.
- `rag_query(ragId, query, topK)` — manual querying.
- `rag_delete(ragId)` — rejects Reserved-Names.
- `rag_list(projectId)` — lists all RAGs (Default + manual) of a Project.

User-Tools may **read** the `_documents`-RAG (`rag_query`, `rag_list`), but **not delete or rename it**. Writing (`rag_add_*`) to the Default-RAG is allowed, but the next Indexer-Tick will come through and overwrite manually added Chunks for the same `sourceRef` — useful only as a quick test, not as a production pattern.

---

## 10. Failure Modes

| Scenario | Behavior |
|---|---|
| Embedding-Provider not configured | `ensureDefaultRag` warn-logs, Lifecycle still reaches RUNNING. `findDefaultRag` returns empty until correction. Indexer-Tick implicitly skips Projects without RAG (Indexer calls `ensureDefaultRag` itself and fails there). |
| Embed-Call fails (Network, Rate-Limit) | Indexer warn-logs, `releaseRagClaim`, TTL expiration → next tick tries again. Self-healing. |
| Bulk-Import via Kit / Restore | Sets `ragDirty=true` on all eligible Docs. Indexer processes the queue with `batchSize` — no Embed-Storm. |
| Pod-Crash between Claim and Write | Claim-TTL expires, another Pod (or the same after reboot) claims again. |
| `_documents`-RAG manually deleted (Mongo direct access) | Re-created empty on next `bring()` or reindex. Existing Docs are `ragDirty=false` and are only picked up on the next touch — therefore: after such a reset, call `rag.reindex(rebuild=false)` once (Bulk-Dirty-Set across all ACTIVE Docs). |
| Race "Doc-Update + Claim in parallel" | Update sets `ragDirty=true` again. Claim holds the TTL-lock. When Indexer finishes, it sees the second dirty mark and the Doc is collected again in the next tick. Duplicate work, but consistent. |

---

## 11. What this Spec DOES NOT Cover

- **Federated-Query** across multiple RAGs in one call. Those who want this call `rag_query` per RAG.
- **Token-based Chunking.** Character-based as today. Token-chunking when LLM-Context-Boundaries become tight.
- **Background-Reindex for very large Projects.** v1 makes `rag.reindex` synchronous (markAllForReindex), the Web-UI button blocks briefly. For >1000 Documents, potentially a follow-up PR with `GET /rag/reindex/status`.
- **JSON-Export to the `_vance/...`-Document-Layer.** Mongo is the Source-of-Truth, no double storage.
- **In-place Re-Embed** on Provider change. Always "Drop + Re-Create" (§6.2).
- **Cross-Project-Search.** A RAG-Query is within the Project-Scope; tenant-wide search is not v1.
- **AutoInject Variant A or B** (Pre-Turn without Threshold / Tool-only). The plan is Variant C (Hybrid with Threshold).

---

## 12. Relation to Other Specs

- [project-lifecycle.md §5.1, §5.3](/docs/project-lifecycle) — `bring()`/`close()` as RAG-Lifecycle anchors.
- auto-summary.md (readme) — identical Dirty-Flag/Claim pattern; Summary-Driver bumps `ragDirty` so Summary-Chunks land.
- [llm-resource-management.md §3a](/docs/llm-resource-management) — Cascade-Resolution for `ai.embedding.*`-Settings.
- [knowledge-graph.md](/docs/knowledge-graph) — standalone system (Relations + Insights), not RAG. Both can exist in parallel per Project.
- [recipes.md](/docs/recipes) — `params.rag.*` as Recipe-Surface for AutoInject (Phase 5).
- planning/project-rag.md — Implementation plan + phases + trade-offs.
{% endraw %}
