---
title: "Vancetope — RAG (Retrieval-Augmented Generation)"
parent: Specs
permalink: /specs/rag
---

<!-- AUTO-GENERATED from llm/specification/rag.md (translated from the German specification/public/rag.md) — do not edit here. -->

# Vancetope — RAG (Retrieval-Augmented Generation)

> How Vancetope places documents into a vector index, how the index is synchronized with the Project lifecycle, and how LLM Engines query hits from this index. Builds upon the existing, low-level RAG subsystem (`RagDocument`/`RagChunkDocument`/`RagBackend`) and adds a canonical **Project RAG layer** on top.
>
> See also: [project-lifecycle.md](/specs/project-lifecycle) | auto-summary.md | [llm-resource-management.md](/specs/llm-resource-management) | [knowledge-graph.md](/specs/knowledge-graph) (standalone system, not RAG) | planning/project-rag.md

---

## 1. Purpose

Documents of a Project should be addressable for RAG queries without explicit Tool calls. Specifically:

- a **Default RAG per Project** named `_documents`, automatically created on the first `bring()`,
- automatic indexing of all Documents under `documents/**` (path filter, MIME filter, user override),
- crash-/multi-Pod-safe incremental indexing using the same dirty-flag/scheduler pattern as the Auto-Summary,
- manual reindex/rebuild actions via REST and Web-UI,
- Recipe-driven AutoInject variant that patches RAG hits into the System Prompt per Turn.

Manual RAGs (with non-`_`-prefix) remain unchanged — user Tools (`rag_create`, `rag_add_text`, `rag_query`, `rag_delete`) continue to be an equally valid path alongside the Default RAG.

---

## 2. Terminology

| Term | Definition |
|---|---|
| **RAG** | A catalog unit (`RagDocument`) plus the set of its Chunks (`RagChunkDocument`). Unique per `(tenantId, projectId, name)`. |
| **Project-Default-RAG** | The RAG with the reserved name `_documents`. Idempotently created by `ProjectLifecycleService.bring()`, deleted on `close()`. Untouched on `suspend()`. |
| **Reserved Name** | RAG names with an `_`-prefix are system-owned (`_documents`, potentially others later). `rag_create`/`rag_delete` reject them. |
| **Eligibility** | Filter that determines whether a Document lands in the Project-Default-RAG: path prefix `documents/` + textual MIME type + `ragEnabled` override. |
| **`ragDirty`** | Boolean on `DocumentDocument`. Set by DocumentService on Create/Update if the filter applies; cleared by the Indexer-Scheduler after successful write. Analogous to Auto-Summary's `summaryDirty`. |
| **`ragClaimedBy`/`ragClaimedAt`** | Atomic claim for the Indexer (analogous to Summary's `claimedBy`/`claimedAt`). TTL-based lock, recovery on Pod crashes. |
| **Indexer-Tick** | `ProjectRagIndexScheduler` runs periodically, claims a batch per Project, and calls `ProjectRagIndexer.reindexDocument` per Document. |

---

## 3. Data Model

### 3.1 `ProjectDocument` (unchanged)

No new fields. The Default RAG is a standalone Mongo Document (`RagDocument`) that references the Project Scope via `tenantId`+`projectId`+`name=_documents`.

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

Compound index `tenant_project_rag_claim_idx` on `(tenantId, projectId, ragDirty, ragClaimedBy)` for efficient claim queries.

### 3.3 `RagDocument` (unchanged)

Pins Embedding Provider, Model, and Dimension upon creation. Fields are **immutable** after Create — changing Provider/Model always means "Drop + Re-Create", not in-place Re-Embed (see §6.2).

### 3.4 `RagChunkDocument`

Fields unchanged. The existing `sourceRef` field is populated by the Project-RAG-Indexer as the **Document ID**, allowing `ragService.removeBySource(ragId, docId)` to remove a Document from the RAG. The metadata map on the Chunks uses two convention keys:

- `kind`: `"content"` for Body Chunks, `"summary"` for Summary Chunks (see §4.3).
- `path`: Document path as plain text, primarily for debugging and UI display.

---

## 4. Indexing Pipeline

### 4.1 Filter

A Document lands in the `_documents`-RAG if and only if all three conditions are met (checked by `DocumentService.isRagEligible`):

1. `path.startsWith("documents/")` — everything under `_vance/`, `_vance/trash/`, `_chatbox/`, `_slart/`, etc. is **not** indexed.
2. `isTextual(mimeType)` — `text/*` or one of the code MIME types from the existing `CODE_MIME_WHITELIST`.
3. `ragEnabled != false` — the user override trumps the default; if `ragEnabled == true`, it is included even against conditions 1+2.

Order in code: first `ragEnabled` override (if set), otherwise path prefix, then MIME.

### 4.2 Dirty Flag Maintenance

- **`DocumentService.create`** — after persisting, `ragDirty=true` is set if the filter applies.
- **`DocumentService.update`** — if body content, path, or `ragEnabled` change, `ragDirty=true` is set. The Indexer re-checks the filter on pickup (race protection).
- **`DocumentService.delete`** — synchronous cleanup via `ragService.removeBySource(_documents, docId)`. No polling path needed: Delete is a Mongo Delete + Mongo Delete, no Embed calls.
- **`DocumentSummaryDriver.run`** — after successful Summary write, calls `documentService.markRagDirty(docId)` so that the Summary Chunk is written in the next tick.

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

Failures from the Embed call are caught by the Scheduler tick → `releaseRagClaim(docId)` → TTL-based recovery on the next tick.

### 4.4 Scheduler (`ProjectRagIndexScheduler`)

Periodically (default 30s, configurable via `vance.rag.indexer.interval-ms`):

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
| `vance.rag.indexer.batch-size` | 10 | Max Documents per Project per tick |
| `vance.rag.indexer.interval-ms` | 30000 | Tick interval |
| `vance.rag.indexer.initial-delay-ms` | 60000 | Delay after Pod boot |
| `vance.rag.indexer.claim-ttl-minutes` | 10 | Claim TTL |

Metrics (Micrometer counter): `vance.rag.indexer.runs` with tag `outcome ∈ {success, failed, skipped}`.

### 4.5 Cascade Settings

| Key | Default | Effect |
|---|---|---|
| `rag.project.enabled` | `true` | Completely disables the `_documents`-RAG for a Project. Indexer no-op, AutoInject no-op. Manual RAGs unaffected. |
| `rag.project.includeSummaries` | `true` | Whether `summary` Chunks are written in addition to `content` Chunks. |
| `rag.autoInject.enabled` | `null` | Tenant/Project **default** for Recipes without explicit RAG stance. Accepts `ON`/`OFF`/`AUTO` **and** legacy `true`/`false` (see §5). `null`/`AUTO` = no enforcement at this Scope. Does **not** override a Recipe that explicitly sets `ON`/`OFF` (innermost-wins). |
| `ai.embedding.provider` | `none` | Embedding backend for RAG. Values: `none` (RAG off for the Tenant — no indexing, no Embed call, no WARN logs), `embedded` (in-process E5-small-v2, keyless, 384-dim, ~120 MB in JAR), `gemini`, `openai`. Pinned when new RAGs are **created**; existing RAGs continue to use their original backend unless the Tenant switches back to `none` (kill switch — see §6.1). |
| `ai.embedding.model` | provider-dependent (Gemini: `gemini-embedding-001`) | Model name. Ignored for `embedded`; for `openai` e.g. `text-embedding-3-small` or an Ollama model name (`nomic-embed-text`) behind `baseUrl`. |
| `ai.embedding.apiKey` | — | PASSWORD setting, separate from the Chat LLM credential namespace (`ai.provider.*.apiKey`). Ignored for `embedded`/`none`. Mandatory for `gemini`/`openai` — even for keyless OpenAI-compatible endpoints (Ollama/TEI), a non-empty placeholder must be present. |
| `ai.embedding.baseUrl` | — | Only read by the `openai` provider. Empty = `https://api.openai.com`. Routes OpenAI-compatible endpoints: Ollama (`http://localhost:11434/v1`), TEI in cluster, vLLM, OpenRouter, Cortecs. |

---

## 5. AutoInject — RAG Hits in the System Prompt

**Status:** implemented for **Arthur** (Reactive-Chat-Engine). Other Engines (Ford, Marvin, Vogon, Eddie, Jeltz) are not yet connected — the `RagAutoInjectService` is generic and can be docked to any Engine that can add a dynamic System block via `ObjectProvider` injection.

Variant C — Pre-Turn Hybrid with Threshold:

```
1. Pre-Turn-Hook (in the Engine, after the Memory block) resolves
   enablement via innermost-wins (first decisive level wins):
     a. Recipe-Param rag.autoInject == ON/OFF → wins (Recipe identity).
     b. else Cascade-Setting rag.autoInject.enabled (Tenant/Project),
        ON/OFF (also true/false) → wins.
     c. AUTO / not set anywhere → hard default OFF.
   Off → skip, no RAG block.
2. Extract the last User Message of the Turn from the Inbox.
   (For multiple UserChatInput entries: concatenation.)
3. ragService.query(_documents, userMessage, topK) — the RagService
   makes the Embed call internally with the RAG's pinned model.
4. Filter out hits with score < rag.minScore.
5. If ≥1 hit: dynamic SystemMessage (Markdown block <rag-context>)
   is added below the Memory block:

     <rag-context>
     Top relevant excerpts from the project's documents. Cite the
     source path when you use these.

     - documents/notes/topic.md (score 0.81)
       Vancetope is a Think-Tool, not a productivity tool. …
     - documents/architecture.md [summary] (score 0.72)
       Multi-Pod cluster with Mongo-centric state. …

     </rag-context>

6. Tool-Surface: rag_query remains unchanged in the Tool whitelist
   (no separate expose mechanism in v1 — the Tool is Recipe-
   driven via the normal allowedTools schema).
```

Recipe Params (on `process.engineParams`):

```yaml
rag:
  autoInject: AUTO     # ON | OFF | AUTO (default AUTO → hard floor OFF)
  minScore: 0.65       # Threshold, model-dependent
  topK: 5
```

**Three-value vocabulary (`ON`/`OFF`/`AUTO`) on Recipe Param *and* Setting `rag.autoInject.enabled`.** Legacy booleans are mapped (`true`→`ON`, `false`→`OFF`) — the Setting key remains `.enabled`, no new key. YAML caution: bare `ON`/`OFF` are collapsed to booleans by SnakeYAML — for the Enum value in the Recipe, **quote** (`"OFF"`) or write `AUTO`/`false`.

Why three values instead of just rotating precedence on a boolean: a boolean cannot distinguish "Recipe explicitly says OFF" (→ override Setting) from "Recipe says nothing" (→ let Setting decide) — both would be `false`. Only the third value `AUTO` (= default) makes "defer" expressible.

Precedence **innermost-wins** (consistent with all other Vancetope cascades):

- **Recipe `ON`/`OFF` wins** over the Setting — the RAG stance is part of the Recipe identity. A `discuss`-like Recipe pins `OFF` and cannot be forcibly activated by any Project.
- Recipe `AUTO`/absent → Cascade Setting `rag.autoInject.enabled` decides: `ON`/`OFF` wins, `AUTO`/absent defers further.
- `AUTO`/absent at all levels → hard default `OFF`.

`AUTO` means "no enforcement at this Scope": if set at a Scope, it overrides an outer `ON`/`OFF` back to the default. An absolute operator kill switch (Setting overrides even Recipe-`ON`) deliberately **does not** exist — this would contradict innermost-wins; if ever needed, an explicit `rag.autoInject.force` would be added (YAGNI).

Failure Modes:

- No `_documents`-RAG present (e.g., Embed Provider not configured) → silent skip.
- Embed/Query call fails → warn-log, silent skip (no RAG block, Turn continues normally).
- Inbox contains no user text (e.g., pure wakeup Turn) → silent skip.

Render style is **statically defined in `RagAutoInjectService.composeBlock`**, not Pebble-templated. If a Recipe wants a different style, that's a subsequent refactor (separate `rag.template`-Param or Pebble-Var).

---

## 6. Lifecycle Integration

### 6.1 Project Lifecycle

| Hook | Action | Tolerance |
|---|---|---|
| `ProjectLifecycleService.bring()` (after `workspaceService.init`) | `ProjectRagService.ensureDefaultRag(tenant, project)` | Tenant with `ai.embedding.provider=none` ⇒ silent skip (Optional empty, no WARN, no RAG Doc created). Otherwise best-effort: Embedding Provider misconfig does not throw, but warn-logs. Project reaches RUNNING in both cases. |
| `ProjectLifecycleService.suspend()` | no RAG action | — |
| `ProjectLifecycleService.close()` (after `workspaceService.dispose`) | `ProjectRagService.disposeDefaultRag(tenant, project)` | Best-effort: warn-log on error. |

**Tenant Kill Switch.** `ai.embedding.provider=none` not only affects creation but also ongoing operations against existing data. `ProjectRagIndexScheduler` checks `RagService.isEmbeddingEnabled(tenantId)` per tick + per Tenant and completely skips the claim path (counter `vance.rag.indexer.runs{outcome=tenant_disabled}`). `RagService.modelFor(rag)` throws a clear exception if someone still makes a direct Embed/Query call against an old RAG — this prevents a Tenant from accidentally continuing Embed calls after officially deactivating RAG.

`suspend` deliberately leaves the RAG intact — index storage is cheap in Mongo, resume uses it immediately.

### 6.2 Provider Change = Drop + Re-Create

`RagDocument.embeddingProvider`/`-Model`/`-Dimension` are **immutable after Create**. A change from e.g. `gemini:text-embedding-004` to `openai:text-embedding-3-small` always proceeds as:

1. `rag.reindex(rebuild=true)` (REST/UI button or service call).
2. Server: `disposeDefaultRag` → `ensureDefaultRag` with current setting → `markAllForReindex`.
3. Scheduler re-indexes all eligible Docs into the fresh RAG.

Reason: Embeddings are not model-portable. Vector spaces of different models are geometrically incomparable; a mixed index would be garbage. Drop + Re-Create is the only clean migration.

---

## 7. REST Surface

Under `/brain/{tenant}/projects/{project}/rag`, JWT-protected, Permission `WRITE` on the Project Resource (same gate for status read and reindex):

| Method | Path | Description |
|---|---|---|
| `POST` | `/reindex?rebuild={bool}` | `rebuild=false` queues all Docs for re-index. `rebuild=true` first drops and re-creates with current settings. Returns `{rebuild, documentsQueued}`. |
| `GET` | `/status` | Read-only snapshot: `{exists, ragId, embeddingProvider, embeddingModel, chunkCount, createdAt}` for the Web-UI. |

Manual RAGs continue to be managed via the `rag_*` Tools on the WebSocket Tool Surface — no REST Surface for them in v1.

---

## 8. Web-UI

### 8.1 Documents Editor — `ragEnabled` Tristate

In the Document detail next to the `autoSummary` block, a radio tristate "Project RAG":

- **Auto** — follows filter §4.1 (default).
- **Always index** — `ragEnabled=true`.
- **Never index** — `ragEnabled=false`.

Wire format: `DocumentUpdateRequest.ragEnabled: "auto" | "on" | "off"`. Server parses into Boolean|null and calls `documentService.setRagEnabledOverride(docId, value)`. Sets `ragDirty=true` so the Indexer adjusts the Chunks in the next tick.

### 8.2 Insights Editor — RAG Tab

Dedicated top tab "RAG" in the Insights Editor (next to Sessions, Recipes, …). Content:

- Status Card: `_documents` RAG present? Provider/Model, Chunk count, Created-At.
- Action Card with three buttons:
  - **Reindex** — `POST .../rag/reindex?rebuild=false`, incremental rebuild with pinned model.
  - **Rebuild with current embedding model** — `POST .../rag/reindex?rebuild=true`, confirmation dialog. Drop + Re-Create + Bulk-Dirty-Set.
  - **Refresh** — new GET status call.

Manual RAGs are **not** managed in the UI v1 — they only appear as a side effect of Tool calls and are visible via Tooling.

---

## 9. Manual RAGs (User Tools)

Still available, unchanged in v1:

- `rag_create(name, title?, description?, chunkSize?, chunkOverlap?)` — rejects Reserved Names with `_`-prefix.
- `rag_add_text(ragId, sourceRef?, text, metadata?)`
- `rag_add_workspace_file(ragId, sourceRef?, path)`
- `rag_add_document(ragId, documentId)` and `rag_add_path(ragId, pathPrefix)` — user-triggered bulk import of individual Docs.
- `rag_query(ragId, query, topK)` — manual querying.
- `rag_delete(ragId)` — rejects Reserved Names.
- `rag_list(projectId)` — lists all RAGs (Default + manual) of a Project.

User Tools may **read** the `_documents`-RAG (`rag_query`, `rag_list`), but **not delete or rename it**. Writing (`rag_add_*`) to the Default RAG is allowed, but the next Indexer tick will overwrite manually added Chunks for the same `sourceRef` — useful only as a quick test, not as a production pattern.

---

## 10. Failure Modes

| Scenario | Behavior |
|---|---|
| Embedding Provider not configured | `ensureDefaultRag` warn-logs, Lifecycle still reaches RUNNING. `findDefaultRag` returns empty until correction. Indexer tick implicitly skips Projects without RAG (Indexer calls `ensureDefaultRag` itself and fails there). |
| Embed call fails (Network, Rate-Limit) | Indexer warn-logs, `releaseRagClaim`, TTL expiration → next tick retries. Self-healing. |
| Bulk import via Kit / Restore | Sets `ragDirty=true` on all eligible Docs. Indexer processes the queue with `batchSize` — no Embed storm. |
| Pod crash between Claim and Write | Claim TTL expires, another Pod (or the same after reboot) re-claims. |
| `_documents`-RAG manually deleted (direct Mongo access) | Re-created on next `bring()` or reindex, empty. Existing Docs are `ragDirty=false` and are only picked up on the next touch — therefore: after such a reset, call `rag.reindex(rebuild=false)` once (Bulk-Dirty-Set across all ACTIVE Docs). |
| Race "Doc Update + Claim in parallel" | Update sets `ragDirty=true` again. Claim holds the TTL lock. When Indexer finishes, it sees the second dirty mark and the Doc is re-collected in the next tick. Duplicate work, but consistent. |

---

## 11. What this Spec DOES NOT Cover

- **Federated Query** across multiple RAGs in one call. To do this, call `rag_query` per RAG.
- **Token-based Chunking.** Character-based as today. Token chunking when LLM context boundaries become tight.
- **Background Reindex for very large Projects.** v1 does `rag.reindex` synchronously (markAllForReindex), the Web-UI button blocks briefly. For >1000 Documents, potentially a follow-up PR with `GET /rag/reindex/status`.
- **JSON Export to the `_vance/...`-Document layer.** Mongo is the source of truth, no double storage.
- **In-place Re-Embed** on Provider change. Always "Drop + Re-Create" (§6.2).
- **Cross-Project-Search.** A RAG query is within the Project Scope; tenant-wide search is not v1.
- **AutoInject Variant A or B** (Pre-Turn without Threshold / Tool-only). Plan is Variant C (Hybrid with Threshold).

---

## 12. Relation to Other Specs

- [project-lifecycle.md §5.1, §5.3](/specs/project-lifecycle) — `bring()`/`close()` as RAG lifecycle anchors.
- auto-summary.md (readme) — identical dirty-flag/claim pattern; Summary Driver bumps `ragDirty` so Summary Chunks land.
- [llm-resource-management.md §3a](/specs/llm-resource-management) — Cascade Resolution for `ai.embedding.*` settings.
- [knowledge-graph.md](/specs/knowledge-graph) — standalone system (Relations + Insights), not RAG. Both can exist in parallel per Project.
- [recipes.md](/specs/recipes) — `params.rag.*` as Recipe Surface for AutoInject (Phase 5).
- planning/project-rag.md — Implementation plan + phases + trade-offs.
