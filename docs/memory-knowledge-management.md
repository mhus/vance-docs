---
title: "Vance — Memory & Knowledge Management"
parent: Documentation
permalink: /docs/memory-knowledge-management
---

<!-- AUTO-GENERATED from specification/public/en/memory-knowledge-management.md — do not edit here. -->

{% raw %}
---
# Vance — Memory & Knowledge Management

> Defines how knowledge in Vance is structured, stored, tagged, and made searchable.
> See also: [vision](/docs/vision) | [architektur-scopes-clients](/docs/architektur-scopes-clients) | [workflows](/docs/workflows)

---

## 1. Problem with the Previous Concept

The Memory model from brainstorming think flow and the prototype is too simplistic:
- Flat list of strings (`GlobalMemoryService`)
- No file reference — text only
- No structure — no folders, no files, no context
- No tagging — not filterable, not categorizable
- No RAG — not semantically searchable
- No Scope isolation — everything is global or nothing

A real project system requires a **Knowledge Management System** as an integral part of the Brain.

---

## 2. What Memory in Vance Actually Is

Memory is not just "facts the Brain remembers." It is the entire knowledge accumulated within a Scope. This includes:

| Type | Examples | Origin |
|-----|-----------|----------|
| **Facts** | "Supervisor is Prof. Müller", "Deadline is June 15th" | User, Think Process result |
| **Files** | PDFs, papers, images, code snippets | User upload, Think Process output, Tool result |
| **Notes** | Free-text notes, summaries, ideas | User, Think Process result |
| **Results** | Output of a Task node, intermediate and final results | Think Process Execution |
| **References** | Links, citations, cross-references between documents | Think Process, User |
| **Structured Data** | Tables, JSON, YAML configurations | Tools, Think Process Output |

---

## 3. Organizational Structure

### 3.1 Documents as the Basic Unit

Everything in Memory is a **Document**. A Document has:

```yaml
id: doc_abc123
scope: think-process/tp_12          # or project/proj_5, group/grp_1
type: note                     # note | file | result | fact | reference
title: "Summary: Attention is All You Need"
content: "..."                 # Text content or file path
mime_type: text/markdown       # or application/pdf, image/png, etc.
tags: [attention, transformer, foundational, 2017]
source:
  type: think_process_result          # user_upload | think_process_result | tool_output | manual
  thinkProcessId: tp_12
  node_id: node_7_1
created_at: 2026-04-23T10:00:00
updated_at: 2026-04-23T14:30:00
metadata:
  author: "Vaswani et al."
  year: 2017
  relevance: high
```

### 3.2 Folders / Files

Documents can be organized into **Folders**. A Folder is itself a Document of type `folder`:

```yaml
id: doc_folder_papers
scope: project/proj_5
type: folder
title: "Papers"
tags: [literature]
children:
  - doc_abc123    # Attention is All You Need
  - doc_def456    # Sparse Attention Survey
  - doc_ghi789    # Flash Attention Paper
```

Folders can be nested:
```
Project: Literature Review
  └── Papers/
  │     ├── Foundational/
  │     │     ├── Attention is All You Need.pdf
  │     │     └── BERT.pdf
  │     ├── Efficiency/
  │     │     ├── Flash Attention.pdf
  │     │     └── Sparse Attention Survey.pdf
  │     └── Unread/
  └── Notes/
  │     ├── Hypothesis 1.md
  │     └── Contradictions.md
  └── Results/
        ├── Think-Process: Paper Analysis/
        │     ├── Extraction Vaswani.md
        │     └── Extraction Flash Attention.md
        └── Think-Process: Hypothesis Check/
              └── Counterarguments.md
```

### 3.3 Tagging System

Tags are freely definable and can be used hierarchically:

```
Tags:
  #attention          → Topic
  #efficiency         → Topic
  #foundational       → Category
  #hypothesis         → Document Type
  #contradiction      → Status
  #unread             → Workflow Status
  #high-relevance     → Rating
  #thinkProcess:tp_12      → automatically set for Think Process result
  #2017               → Year
```

Tags can be combined in searches:
- "All papers with `#attention` and `#efficiency`"
- "All results with `#contradiction`"
- "Everything `#unread` in the project"

---

## 4. Scope-Bound Memory

Each Scope has its own Memory area. Documents belong to exactly one Scope but are visible in higher Scopes.

### 4.1 Scope Affiliation

| Scope | Typical Content |
|-------|-----------------|
| **Project Group** | Overarching facts, global references, team knowledge |
| **Project** | Project documents, papers, reference material, configuration |
| **Session** | Chat history, temporary context of a work phase |
| **Think Process** | Think Process notes, intermediate results, Think Process-specific context |

### 4.2 Visibility Rule

A Think Process sees:
1. Its own Think Process Memory
2. Session Memory of its own Session
3. Project Memory of its own Project
4. Project Group Memory of its own Group

A Think Process does NOT see:
- Memory of other Think Processes (only via explicit reference)
- Memory of other Sessions
- Memory of other Projects
- Memory of other Project Groups

### 4.3 Promotion / Demotion

Documents can be moved between Scopes:
- **Promote:** Think Process result → Project Memory (if it's relevant across projects)
- **Demote:** Project document → Think Process-specific (if it only applies to one Think Process)
- **Auto-Promote:** Certain tags trigger automatic promotion (e.g., `#project-relevant`)

---

## 5. RAG Indexing

### 5.1 Basic Principle

Every Document is indexed into a **VectorStore** upon creation/update. The VectorStore is Scope-aware — queries are executed against the correct Scope area.

### 5.2 Indexing Pipeline

```
Document created/updated
  → Chunking (Markdown sections, PDF pages, etc.)
  → Embedding (via langchain4j `EmbeddingModel`)
  → Store in VectorStore with Scope metadata
       scope: think-process/tp_12
       session: sess_7
       project: proj_5
       group: grp_1
       tags: [attention, efficiency]
       doc_id: doc_abc123
       doc_type: note
```

### 5.3 Scope-aware RAG Query

When a Think Process performs a RAG query:

```
Query: "What do we know about Sparse Attention scalability?"
Scope: Think Process tp_12, Session sess_7, Project proj_5, Group grp_1

→ Search in VectorStore with filter:
    (scope = think-process/tp_12)
    OR (scope = session/sess_7)
    OR (scope = project/proj_5)
    OR (scope = group/grp_1)
  
→ Results weighted by Scope proximity:
    Think Process Memory: Weight 1.0 (most relevant)
    Session Memory:       Weight 0.8
    Project Memory:       Weight 0.5
    Group Memory:         Weight 0.3
```

### 5.4 Tag Filters in RAG

RAG queries can additionally be filtered by tags:

```
Query: "Scalability"
Tags: [#efficiency, #benchmark]
→ Only chunks from documents that have BOTH tags
```

### 5.5 What is Indexed

| Document Type | Chunking Strategy |
|-------------|-------------------|
| Markdown Notes | Sections (## Headings as separator) |
| PDFs | Pages, possibly paragraphs for text-heavy PDFs |
| Think Process Results | Entire output as one chunk (usually short enough) |
| Facts | Each fact as its own chunk |
| Code Snippets | Entire snippet as one chunk |
| Structured Data | Key-value pairs as individual chunks |

### 5.6 VectorStore Technology

| Option | Pro | Con |
|--------|-----|--------|
| **MongoDB Atlas Vector Search** | Same DB as rest, no extra service | Less mature than specialized solutions |
| **Qdrant** | Performant, good filters, Open Source | Additional service |
| **pgvector (PostgreSQL)** | Proven, SQL queries | Second DB next to MongoDB |
| **Embedded (In-Memory)** | Simple for v1 | Does not scale |

**Recommendation:** MongoDB Atlas Vector Search for v1 — one service, one DB, all-in-one. Migrate to Qdrant if performance needs grow. langchain4j abstracts the VectorStore via `EmbeddingStore` anyway.

---

## 6. Memory Operations

### 6.1 For the User (via Client)

```
memory add "Deadline is June 15th"              → Fact to current Scope
memory upload paper.pdf --tags attention,2024   → Upload file with tags
memory search "Sparse Attention"                → Semantic search
memory browse                                    → Folder view in current Scope
memory tag doc_abc123 --add important            → Add tag
memory promote doc_abc123 --to project           → Promote to Project level
memory list --tags hypothesis --scope engine     → Filtered listing
```

### 6.2 For the Brain (automatically)

```
On Think Process Start:
  → Load relevant Memory into Think Process context
  → Prepare RAG index for this Scope

On Task Execution:
  → RAG query against Scope cascade
  → Result is automatically saved as a Document
  → Auto-tagging based on node type (extract→#extraction, verify→#verification)

On Task Change:
  → Mark affected result documents as #stale
  → Re-index after new execution
```

### 6.3 For Think Processes (via Tools)

Think Processes have Memory Tools available:

```
memory_store(content, tags, scope)     → Store document
memory_query(question, tags, scope)    → RAG search
memory_list(tags, scope)               → List documents
memory_read(doc_id)                    → Read document
memory_tag(doc_id, tags)               → Set tags
```

---

## 7. Interaction with Task Tree

### 7.1 Input Memory

Each Task node can reference **Input Documents**:

```yaml
- id: extract_paper_1
  goal: "Extract core theses"
  input_docs: [doc_abc123]         # Explicit reference
  input_query: "Sparse Attention"  # Or RAG query
  input_tags: [#unread, #attention] # Or tag filter
```

### 7.2 Output Memory

Each Task result is automatically saved as a Document:

```yaml
id: doc_result_node_7_1
scope: think-process/tp_12
type: result
title: "Extraction: Attention is All You Need"
tags: [extraction, attention, foundational, #auto:node_7_1]
source:
  type: think_process_result
  thinkProcessId: tp_12
  node_id: node_7_1
```

### 7.3 Memory Enrichment by the Tree

The Task tree constantly produces new knowledge:
```
extract    → new facts, summaries
analyze    → new insights, evaluations  
verify     → confirmations, contradictions
synthesize → aggregated documents
```

This knowledge automatically flows into Think Process Memory and is available for subsequent Tasks via RAG. The tree builds its own knowledge.

---

## 8. Example: Scientist Workflow

```
Project: "Transformer Efficiency Review"

Project Memory:
  ├── Papers/
  │     ├── vaswani2017.pdf         #foundational #attention
  │     ├── dao2022_flashattention.pdf  #efficiency #hardware
  │     └── kitaev2020_reformer.pdf     #efficiency #sparse
  ├── Facts/
  │     ├── "Supervisor: Prof. Müller"
  │     ├── "Deadline: 15.06.2026"
  │     └── "Focus: Inference efficiency, not Training"
  └── References/
        └── survey_overview.md       #meta #survey

Think Process "Paper Analysis" Memory:
  ├── Results/
  │     ├── extraction_vaswani.md    #extraction #foundational
  │     ├── extraction_flash.md      #extraction #efficiency
  │     └── comparison_methods.md    #synthesis #comparison
  └── Notes/
        ├── "Flash Attention optimizes IO, not Compute"  #insight
        └── "Reformer and Flash Attention are orthogonal"  #insight

Think Process "Hypothesis Check" Memory:
  ├── Results/
  │     └── counterarguments.md        #verification #hypothesis
  └── Notes/
        └── "Hypothesis 1 holds under restriction X"  #finding
```

RAG Query in Think Process "Hypothesis Check":
```
"What are the hardware requirements of Flash Attention?"

→ Searches:
  1. Think Process "Hypothesis Check" Memory (nothing relevant)
  2. Project Memory → finds dao2022_flashattention.pdf chunks
  3. Also: Results from Think Process "Paper Analysis" → extraction_flash.md

→ But NOT: Memory from other Projects
```

Wait — there's a problem here: Think Process "Hypothesis Check" only sees the results of Think Process "Paper Analysis" if they have been promoted to Project level. Otherwise, they are isolated within the Think Process Scope.

**Solution:** Think Process results tagged as `#project-relevant` are automatically promoted to Project Scope. Or: an explicit "publish to project" action after Think Process completion.

---

## 9. Open Questions

1. **Automatic vs. Manual Promotion:** Should Think Process results automatically flow into Project Memory, or must the user explicitly do so? Automatic = less friction, but risk of noise. Manual = cleaner, but more work.

2. **Cross-Think-Process Visibility:** Should Think Processes within the same Project see the results of other Think Processes? This would loosen Scope isolation but is often useful. Possible solution: opt-in via Think Process config.

3. **Versioning:** If a document is updated (e.g., after a Task re-run), should old versions be retained? Important for traceability, but costs storage.

4. **Embedding Costs:** Every document is embedded. With many PDFs, this can become expensive. Strategy: embed only relevant chunks? Or lazy embedding on first query?

5. **File Size Limits:** Large PDFs (100+ pages) must be handled differently than short notes. Define chunking strategy per type.

---

## 10. Conversation History Compaction

Chat history grows with each turn — in long Sessions, it eventually exceeds the model's context window and drives up token costs. Vance has two orthogonal paths to fold older turns from active replay without deleting the history.

### 10.1 Data Format

A Compaction lives as a special Memory Document:

| Field | Value |
|---|---|
| `kind` | `ARCHIVED_CHAT` (Enum value in `MemoryKind`) |
| `content` | LLM-generated summary of the compacted range |
| `sourceRefs` | IDs of the archived `ChatMessageDocument` rows |
| `metadata.compactedMessages` | Number of compacted messages |
| `metadata.recompaction` | `true` for the range path (otherwise absent) |

The original Chat Messages get `archivedInMemoryId` set to the ID of the new Memory. This means:

- `ChatMessageService.history(...)` still provides them (audit path, trace).
- `ChatMessageService.activeHistory(...)` filters them out (LLM replay path only sees summary + younger turns).
- `history_search` / `history_recall` (see `planning/process-history-search.md`) finds them via tags and full-text — the archived original content remains discoverable for the LLM, just no longer automatically in the prompt.

### 10.2 Sliding-Window Path (automatic, size-based)

`MemoryCompactionService.compact(process)` runs at the beginning of a turn if the estimated tokens exceed the `compactionTriggerRatio` (default ~0.7) of the model's context window. It compacts the oldest `total - keepRecent` messages into a single summary. On repeated runs, `compact` chains new summaries via `supersededByMemoryId` to the previous ones — the audit chain remains coherent.

The trigger is mechanical (token threshold), aiming at **size**, not topic boundaries. Engines (currently Ford) call it themselves; Worker Engines usually do not.

### 10.3 Range-Based Recompaction Path (Plan Mode Hook, opt-in)

`MemoryCompactionService.compactRange(process, fromCreatedAt, toCreatedAt, topicLabel)` compacts an **explicit time range** of the active history — not the oldest N turns, but a sub-topic block that the user has actively completed.

Trigger: the last Todo of a Plan flips to `COMPLETED`, and before the `MODE:plan` marker there are ≥ 2 USER turns about other topics → `PlanModeService.maybeOfferRecompaction` posts an Inbox Item (`type=APPROVAL`, Tag `RECOMPACTION_OFFER`). If the user accepts, `RecompactionOfferAnsweredListener` calls `compactRange` with the range coordinates stored in the payload. In addition to normal compaction, the range path inserts a `SYSTEM` marker with tag `RECOMPACTION:<topicLabel>` at the end of the range — it appears visibly in the chat as a topic stitch.

The trigger is semantic (topic completion), aiming at **focus**, not size. It works engine-agnostically thanks to shared `PlanModeService` — Arthur and Eddie both benefit without engine-specific code.

Details: [plan-mode](/docs/plan-mode) §15, `planning/topic-recompaction.md`.

### 10.4 Relationship of the Two Paths

They are **orthogonal and non-competing**:

- Sliding-Window runs even when no Plan is involved (pure long-session hygiene).
- Range-Compaction only runs on Plan completion with prior history — actively confirmed by the user.
- Both use the same persistence (`ARCHIVED_CHAT` Memory + `archivedInMemoryId` on the Chat rows). A turn can theoretically be archived by both paths; `markArchived` is idempotent — the second path finds the turn already archived and skips it.

---

*See also: [vision](/docs/vision) | [architektur-scopes-clients](/docs/architektur-scopes-clients) | [workflows](/docs/workflows) | brainstorming think flow | [plan-mode](/docs/plan-mode)*
{% endraw %}
