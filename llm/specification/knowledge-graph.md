---
# Vance — Knowledge Graph & Insights

> How Vance not only stores knowledge but maps relationships and actively finds connections from a perspective.
> Designed for extensibility: v1 simple, later phases increasingly intelligent.
> See also: [memory-knowledge-management](memory-knowledge-management.md) | [vision](vision.md) | [architektur-scopes-clients](architektur-scopes-clients.md)

---

## 1. Design Principle: Extensible from the Start

The data model is built from day 1 to support a complete Knowledge Graph. However, features will be activated in stages:

| Phase | What | Brain Intelligence |
|-------|-----|-------------------|
| **v1** | Documents + simple relationships | None — Users and Think Processes set relationships manually |
| **v2** | Typed Relations, Insights as Entity Type | Think Process Tasks can produce relationships as output |
| **v3** | Brain Linker background process | Brain actively searches for contradictions, supports, gaps |
| **v4** | Complete Knowledge Graph with Confidence | Automatic synthesis, gap detection, graph queries |

This means: v1 does not require AI-powered graph analysis. But the collections, fields, and indices are already in place.

---

## 2. Data Model (Complete from the Start)

### 2.1 Entities

Everything in the Knowledge System is an Entity. In MongoDB, a `entities` collection:

```yaml
id: ent_abc123
tenant_id: tenant_1              # v2+, but field exists from v1
scope:
  group_id: grp_1                # optional
  project_id: proj_5
  thinkProcessId: tp_12              # optional — null = Project Scope
  node_id: node_7_1              # optional — null = Think Process Scope

type: document                   # Enum, see below
subtype: paper                   # Free, type-specific

title: "Attention is All You Need"
content: "..."                   # Text content, Summary, or null for files
file_ref: "files/proj_5/vaswani2017.pdf"  # optional — Path to binary

tags: [attention, transformer, foundational, 2017]
metadata:                        # Freely structured, type-specific
  author: "Vaswani et al."
  year: 2017
  relevance: high

status: active                   # active | stale | superseded | archived
confidence: null                 # 0.0-1.0, only for insights/claims (v2+)

source:                          # Origin
  type: user_upload              # user_upload | user_manual | think_process_result | tool_output | brain_linker
  thinkProcessId: null
  node_id: null

created_at: 2026-04-23T10:00:00
updated_at: 2026-04-23T14:30:00
created_by: user                 # user | engine | brain_linker
```

### 2.2 Entity Types

Defined in the Enum from the start, even if v1 does not actively use all of them:

| Type | v1 | Description |
|-----|-----|-------------|
| `document` | active | File, PDF, Upload |
| `note` | active | Free-text note |
| `result` | active | Think Process Task result |
| `fact` | active | Single fact ("Deadline is June 15th") |
| `folder` | active | Organizational container with `children` |
| `claim` | **Field exists, UI v2** | Assertion from a source |
| `insight` | **Field exists, UI v2** | Distilled insight |
| `hypothesis` | **Field exists, UI v2** | Assumption to be tested |
| `question` | **Field exists, UI v2** | Open question |
| `entity` | **Field exists, UI v2** | Concept, Person, Method, System |

### 2.3 Relations

Separate `relations` collection:

```yaml
id: rel_001
type: cites                      # Enum, see below
source_id: ent_abc123            # Entity that has the relationship
target_id: ent_def456            # Entity it points to
direction: directed              # directed | bidirectional

scope:
  project_id: proj_5
  thinkProcessId: tp_12              # optional

confidence: null                 # 0.0-1.0 (v3+)
evidence: null                   # Free text: why this relationship (v3+)

tags: []
metadata: {}

source:                          # Who created the relationship
  type: user_manual              # user_manual | think_process_result | brain_linker
  thinkProcessId: null
  node_id: null

created_at: 2026-04-23T14:00:00
created_by: user                 # user | engine | brain_linker
```

### 2.4 Relation Types

All defined in the Enum from the start. v1 only uses the simple ones:

#### Content-based Relationships

| Relation | v1 | Description |
|----------|-----|-------------|
| `relates_to` | active | Generic connection ("has something to do with each other") |
| `supports` | **Enum exists, v2** | A supports B |
| `contradicts` | **Enum exists, v2** | A contradicts B |
| `extends` | **Enum exists, v2** | A extends B |
| `refines` | **Enum exists, v2** | A refines B |
| `depends_on` | **Enum exists, v2** | A depends on B |
| `answers` | **Enum exists, v2** | A answers B |
| `raises` | **Enum exists, v2** | A raises question B |
| `compares_to` | **Enum exists, v2** | A is compared to B |

#### Origin Relationships

| Relation | v1 | Description |
|----------|-----|-------------|
| `extracted_from` | active | A was extracted from B |
| `derived_from` | active | A was derived from B |
| `produced_by` | active | A was produced by Think Process B |
| `cites` | active | A cites B |
| `input_for` | active | A was input for Task B |

#### Temporal Relationships

| Relation | v1 | Description |
|----------|-----|-------------|
| `version_of` | active | A is a new version of B |
| `supersedes` | **Enum exists, v2** | A supersedes B |
| `invalidated_by` | **Enum exists, v2** | A was invalidated by B |

---

## 3. What v1 Can Do

### 3.1 Manually Set Simple Relationships

Users and Think Processes can create relationships:

```
# User in Client
memory link vaswani2017.pdf --relates-to flash_attention.pdf
memory link extraktion_ergebnis --extracted-from vaswani2017.pdf
memory link notiz_hypothese --cites paper_x paper_y

# Think Process Task Output
An extract node automatically generates:
  result_doc --extracted_from-- input_doc
  result_doc --produced_by-- engine/node
```

### 3.2 Automatic Origin Relationships

The Brain automatically sets the following during Task execution:

| Event | Relation | Automatic |
|-------|----------|------------|
| Task receives input document | `input_for` | Yes |
| Task generates result | `produced_by` + `derived_from` | Yes |
| Task explicitly references a document | `extracted_from` or `cites` | Yes |
| User uploads new version | `version_of` | Yes (if same title/tag) |

### 3.3 Simple Graph Queries

```
# Find everything related to a document
GET /api/entities/{id}/relations

# Find all results originating from a specific paper
GET /api/entities?related_to={id}&relation=extracted_from

# Find all documents without relationships (Orphans)
GET /api/entities?orphans=true&scope=project/proj_5
```

### 3.4 Simple Visualization

Desktop/Web Client shows:
- Document detail view with "Related" section
- Simple connection lines between documents
- No Force-Graph visualization in v1 — only lists

---

## 4. What v2 Adds: Typed Relations + Insights

### 4.1 Think Process Tasks Produce Typed Relationships

An `analyze` node can now output not only text but also Relations:

```yaml
- id: analyze_comparison
  goal: "Compare Flash Attention with Reformer"
  output_types: [result, relations]
  # LLM output is parsed:
  #   → result stored as document
  #   → Relations like "Flash supports Hypothesis X" are extracted
```

### 4.2 Insights and Claims as Entity Types

Users and Think Processes can now explicitly create Insights and Claims:

```
memory insight "Flash Attention optimizes IO, not Compute" \
  --derived-from extraktion_flash.md roofline_analysis.md \
  --supports hypothesis_sparse_orthogonal
```

### 4.3 Confidence Values

Relations and Insights receive Confidence Scores:
- Manually: User sets Confidence
- Think Process-based: Verify node assesses Confidence
- Later (v3): Brain Linker calculates from amount of evidence

### 4.4 Richer Visualization

- Graph view per Project (D3 Force-Graph)
- Color coding by Entity Type and Relation Type
- Filter by Confidence, Scope, Tags

---

## 5. What v3 Adds: Brain Linker

### 5.1 Background Process

A dedicated Brain Task that runs periodically or event-triggered:

```yaml
# Brain Linker as a special type of Think Process
think_engine: brain_linker
trigger:
  - on: new_entity              # new document/result
  - on: cron                    # periodically
    schedule: "*/30 * * * *"    # every 30 min
  - on: user_request            # "Find connections"
scope: project
```

### 5.2 Linker Strategies (Individually Activatable)

| Strategy | What it does | LLM Costs |
|-----------|-------------|------------|
| **Contradiction Scan** | Check new claims against existing ones | Medium |
| **Support Scan** | Check new evidence against hypotheses | Medium |
| **Orphan Linking** | Connect unconnected entities | Low (Embedding pre-filter) |
| **Synthesis Suggestion** | N claims on the same topic → suggest insight | High |
| **Gap Detection** | Hypotheses without evidence, unanswered questions | Low |

Each strategy can be individually enabled/disabled and has its own token budget.

### 5.3 Pre-filter via Embeddings

Before querying the LLM, the Brain filters using Cosine Similarity:

```
New Claim C
  → Calculate embedding of C
  → Find top 20 most similar existing claims/insights
  → Present only these 20 to the LLM: "Does C contradict any of these?"
  → Saves ~95% of LLM calls
```

---

## 6. What v4 Adds: Complete Knowledge Graph

- Graph Traversal Queries: "Show the path from Paper A to Hypothesis Z"
- Automatic Confidence calculation from evidence network
- Cross-project linkages at the group level
- Timeline view: how an insight evolved
- Export as knowledge base (JSON-LD, RDF, or simple Markdown)
- Potentially migrate from MongoDB adjacency lists to Neo4j if necessary

---

## 7. MongoDB Schema (v1-ready, v4-capable)

### Collection: `entities`

```javascript
{
  _id: ObjectId,
  tenant_id: String,              // v2+, Index
  scope: {
    group_id: String,             // optional, Index
    project_id: String,           // Index
    thinkProcessId: String,            // optional, Index
    node_id: String               // optional
  },
  type: String,                   // Index, Enum
  subtype: String,                // optional
  title: String,                  // Text index for search
  content: String,                // optional, for RAG chunking
  file_ref: String,               // optional, Path to binary
  tags: [String],                 // Index (Multikey)
  metadata: Object,               // freely structured
  status: String,                 // Index, Enum
  confidence: Number,             // optional, 0.0-1.0
  source: {
    type: String,                 // Enum
    thinkProcessId: String,
    node_id: String
  },
  children: [ObjectId],           // for type=folder
  created_at: Date,               // Index
  updated_at: Date,
  created_by: String              // user | engine | brain_linker
}

// Indices:
// { "scope.project_id": 1, "type": 1 }
// { "scope.thinkProcessId": 1 }
// { "tags": 1 }
// { "status": 1 }
// { "title": "text", "content": "text" }  // Full-text search
```

### Collection: `relations`

```javascript
{
  _id: ObjectId,
  tenant_id: String,
  type: String,                   // Index, Enum
  source_id: ObjectId,            // Index, Ref → entities
  target_id: ObjectId,            // Index, Ref → entities
  direction: String,              // directed | bidirectional
  scope: {
    project_id: String,           // Index
    thinkProcessId: String             // optional
  },
  confidence: Number,             // optional, 0.0-1.0
  evidence: String,               // optional, Free text
  tags: [String],
  metadata: Object,
  source: {
    type: String,                 // user_manual | think_process_result | brain_linker
    thinkProcessId: String,
    node_id: String
  },
  created_at: Date,
  created_by: String
}

// Indices:
// { "source_id": 1, "type": 1 }
// { "target_id": 1, "type": 1 }
// { "scope.project_id": 1 }
// Compound for Graph Traversal:
// { "source_id": 1, "target_id": 1 }
```

### Collection: `entity_embeddings`

```javascript
{
  _id: ObjectId,
  entity_id: ObjectId,            // Ref → entities
  chunk_index: Number,            // 0-based, for multi-chunk documents
  chunk_text: String,             // the embedded text
  embedding: [Number],            // Vector (1536-dim or similar)
  scope: {
    project_id: String,           // for Scope filter in RAG
    thinkProcessId: String
  },
  created_at: Date
}

// Vector Index (MongoDB Atlas):
// { "embedding": "vectorSearch" }
// Filter Index:
// { "scope.project_id": 1 }
```

---

## 8. API (v1)

### Entities

```
POST   /api/entities                       → Create Entity
GET    /api/entities?scope=...&type=...&tags=...  → List filtered
GET    /api/entities/{id}                  → Read Entity
PUT    /api/entities/{id}                  → Update Entity
DELETE /api/entities/{id}                  → Delete Entity (soft: status=archived)

POST   /api/entities/{id}/upload           → Upload file to Entity
GET    /api/entities/{id}/file             → Download file

POST   /api/entities/search                → RAG Search
         Body: { query: "...", scope: "...", tags: [...] }
```

### Relations

```
POST   /api/relations                      → Create Relation
GET    /api/entities/{id}/relations         → All Relations of an Entity
GET    /api/relations?type=...&scope=...    → List filtered
DELETE /api/relations/{id}                  → Delete Relation
```

### Graph Queries (v2+)

```
GET    /api/graph/neighbors/{id}?depth=2   → Neighbors up to depth N
GET    /api/graph/path?from=...&to=...     → Path between two Entities
GET    /api/graph/orphans?scope=...        → Unconnected Entities
GET    /api/graph/contradictions?scope=... → All Contradictions (v3+)
```

---

## 9. Phase Summary

```
v1: Documents + Tags + simple Relations (cites, extracted_from, relates_to)
    Automatic origin Relations during Task execution
    MongoDB schema is complete, UI shows "Related" lists
    RAG search is Scope-aware

v2: Typed Relations (supports, contradicts, extends, ...)
    Insights, Claims, Hypotheses as Entity Types
    Think Processes produce Relations as output
    Confidence values
    Graph visualization in client

v3: Brain Linker background process
    Active contradiction and support detection
    Synthesis suggestions
    Gap detection
    Embedding pre-filter for LLM costs

v4: Complete Knowledge Graph
    Cross-project linkages
    Timeline / Version history
    Automatic Confidence calculation
    Potentially Neo4j migration
```

In each phase: the data model does NOT change. Only more fields are populated and more logic is activated.

---

*See also: [memory-knowledge-management](memory-knowledge-management.md) | [vision](vision.md) | [architektur-scopes-clients](architektur-scopes-clients.md) | [workflows](workflows.md)*
