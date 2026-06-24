---
title: "Vance — Integrations & External Systems"
parent: Documentation
permalink: /docs/integrationen-externe-systeme
---

<!-- AUTO-GENERATED from specification/public/en/integrationen-externe-systeme.md — do not edit here. -->

{% raw %}
---
# Vance — Integrations & External Systems

> Defines what Vance itself does, what external tools do, and how the connection looks.
> Core principle: Vance thinks, external tools manage.
> See also: [vision](/docs/vision) | [multi-user-collaboration](/docs/multi-user-collaboration) | [memory-knowledge-management](/docs/memory-knowledge-management)

---

## 1. Design Principle

**Vance is a thinking system, not a productivity suite.**

Vance does not rebuild:
- No document editor (for that there's Google Docs, Notion, Obsidian)
- No project management tool (for that there's Jira, Linear, Things)
- No file storage (for that there's Google Drive, Dropbox)
- No reference management (for that there's Zotero, Mendeley)
- No chat/messaging (for that there's Slack, Teams)

Instead: **Vance integrates with these tools** and uses them as data sources and action targets.

---

## 2. What Vance Does Itself vs. What Stays External

| Function | Vance | External | Rationale |
|----------|-------|--------|-----------|
| **Thinking / Planning** | Yes — Core Feature | — | This IS Vance |
| **Task Trees** | Yes — Think Process Tasks | — | Core Feature |
| **Knowledge Graph** | Yes — Insights, Relations | — | Core Feature |
| **Memory / RAG** | Yes — Entities, Embeddings | — | Requires Scope-Awareness |
| **Store Documents** | References + Metadata + Cache | Original remains external | Vance is not the master for files |
| **Edit Documents** | No | Google Docs, Notion, Obsidian | Vance can generate drafts, editing is external |
| **Todo Lists (manual)** | No | Things, Todoist, Jira | Vance has task trees, not manual todos |
| **Project Management** | No | Jira, Linear | Vance plans thinking processes, not sprints |
| **Reference Management** | No | Zotero, Mendeley, BibTeX | Vance reads and understands papers, but does not manage a library |
| **Code Management** | No | Git, GitHub | CLI client can operate Git |
| **Communication** | Notifications only | Slack, Email, Teams | Vance informs, does not chat |
| **Calendar** | No | Google Calendar | Potentially Trigger: "Deadline in 3 days" |

---

## 3. External Document Sources

### 3.1 The Problem

Knowledge is not only in Vance. A researcher has:
- Papers in Zotero
- Notes in Obsidian
- Draft documents in Google Docs
- Data in local folders
- Code in Git repos
- Team knowledge in Confluence
- References as BibTeX

Vance must be able to **read and understand** this knowledge without duplicating it.

### 3.2 Two Integration Patterns

#### Pattern A: Import (Copy into Vance)

```
External Source → Vance imports → Entity in Memory → RAG-indexed
```

- Vance has a copy of the document
- Independent of the source (source can go offline)
- Risk: Copy becomes outdated if original changes
- Good for: PDFs, papers, static references

#### Pattern B: Connector (Live Connection)

```
External Source ← Vance reads on demand → Cache + Entity Reference → RAG-indexed
```

- Vance only keeps a reference + cache
- On access: fresh data from the source
- Sync strategy: periodic, on-access, or webhook
- Good for: Google Drive, Confluence, Git Repos (living documents)

### 3.3 Connector Architecture

```
┌─────────────────────────────────────────┐
│              Vance Brain                 │
│                                          │
│  Source Registry                         │
│    ├── Connector: Google Drive           │
│    ├── Connector: Zotero                 │
│    ├── Connector: Local Filesystem       │
│    ├── Connector: Confluence             │
│    ├── Connector: Git Repository         │
│    ├── Connector: BibTeX File            │
│    └── Connector: Obsidian Vault         │
│                                          │
│  Sync Think Process                             │
│    ├── Periodic Scan (configurable)  │
│    ├── Webhook Listener (if available) │
│    └── On-Demand Fetch                   │
│                                          │
│  Processing Pipeline                     │
│    ├── Text Extraction (PDF, DOCX, etc.) │
│    ├── Metadata Extraction              │
│    ├── Chunking + Embedding              │
│    └── Entity + Relation Creation      │
└─────────────────────────────────────────┘
```

### 3.4 Connector Types

| Connector | Source | Auth | Sync | What Vance Sees |
|-----------|--------|------|------|----------------|
| **Google Drive** | Folders/files in Drive | OAuth2 | Webhook + periodic | Documents, Sheets, Slides as text |
| **Zotero** | Library, Collections | API Key | Periodic | Papers with metadata (author, year, abstract, tags) |
| **BibTeX** | `.bib` file | File access | On-change | References with metadata |
| **Local Filesystem** | Folder on the machine | CLI client | On-demand | Files, read via CLI client |
| **Git Repository** | Repo (local or remote) | SSH/Token | On-demand / Hook | Code, README, Issues |
| **Confluence** | Spaces, Pages | OAuth2/Token | Periodic | Wiki pages as text |
| **Notion** | Databases, Pages | API Key | Periodic | Pages, databases as structured data |
| **Obsidian Vault** | Vault folder | File access | On-change | Markdown notes with links and tags |
| **Slack** | Channels, Threads | OAuth2 | Webhook | Messages, threads as context |
| **Jira** | Issues, Epics | OAuth2/Token | Webhook | Tickets with status, description, comments |
| **Web URL** | Any URL | — | On-demand | Page content as text |

### 3.5 Connector in MongoDB

```yaml
id: conn_google_drive_papers
type: google_drive
tenant_id: tenant_acme
project_id: proj_5                    # or null for Team/Tenant-wide
config:
  folder_id: "1AbCdEfG..."
  include_patterns: ["*.pdf", "*.docx"]
  exclude_patterns: ["_archive/*"]
auth:
  type: oauth2
  token_ref: "vault://secrets/gdrive_token"  # encrypted
sync:
  strategy: periodic                  # periodic | webhook | on_demand
  interval_minutes: 60
  last_sync: 2026-04-23T14:00:00
  last_status: success
auto_tagging:
  enabled: true
  tags: [external, google-drive, papers]
auto_relations:
  enabled: true                       # Automatically create relations between imported Docs
status: active                        # active | paused | error
```

### 3.6 What Happens During Sync

```
1. Connector scans source
   → Identify new/changed files

2. For each new/changed file:
   → Extract text (PDF, DOCX, HTML, Markdown)
   → Extract metadata (author, date, title)
   → Create/update Entity in Memory
        type: document
        subtype: external
        source: { type: connector, connector_id: conn_google_drive_papers }
        file_ref: cache/gdrive/1AbCdEfG/paper.pdf  (local cache)
        external_ref: "https://drive.google.com/file/d/..."  (original URL)

3. RAG Pipeline
   → Chunking + Embedding
   → Scope-aware indexing

4. Optional: Auto-Relations
   → Check new documents against existing ones (v2+, via Brain Linker)
```

---

## 4. Actions in External Systems

Vance doesn't just read — it can also write to external systems:

| Action | System | Example |
|--------|--------|---------|
| **Create Document** | Google Docs, Obsidian | Create Think Process result as a draft in Google Docs |
| **Create Issue** | Jira, Linear, GitHub | Generate a ticket from a task result |
| **Send Message** | Slack, Email | Notification when Think Process is complete |
| **Save File** | Google Drive, local FS | Export result documents |
| **Create Note** | Obsidian, Notion | Create an insight as a note in Obsidian Vault |
| **Add Reference** | Zotero, BibTeX | Add a found paper to the library |

These actions are **Tools** that the Brain or the Client can execute:
- Remote Tools (Google Docs, Jira, Slack) → Brain executes
- Local Tools (Obsidian Vault, local FS) → Client executes

---

## 5. Manual Todo Lists

### 5.1 Does Vance Need Its Own Todos?

**No — but Vance can create and track todos in external systems.**

The difference:
- **Think Process Tasks** are thinking tasks that the Brain executes. Not manual.
- **Manual Todos** are tasks for humans: "Write email", "Prepare for meeting". These belong in Things, Todoist, Jira.

What Vance can do:
- Derive a todo for the user from a Think Process result and write it to the external system
- Read the status of external todos (via Connector) and consider them in the context of a Think Process
- Recognize "Blockers": Think Process waits for a manual todo before it can proceed

### 5.2 Integration Pattern

```
Think Process Task "Identify next steps"
  → Result: "User needs to procure Paper X and contact supervisor"
  → Brain creates:
      - Jira Issue: "Procure Paper X" (via Jira Connector)
      - Todoist Task: "Contact supervisor" (via Todoist Connector)
  → Think Process Task is marked as "blocked"
      blocked_by: [jira_issue_123, todoist_task_456]
  → When external todos are completed → Connector reports status
  → Think Process can continue
```

---

## 6. Document Editing

### 6.1 Vance Creates, External Edits

Vance can **create** documents (Think Process output: draft of a paper, an analysis, a story). But editing happens externally:

```
Think Process "Paper Draft" 
  → Result: Markdown text of the draft
  → User says: "Export to Google Docs"
  → Brain creates Google Doc via Connector
  → User edits in Google Docs
  → On next sync: Vance reads the current version
  → Think Process "Review Draft" uses the edited version as input
```

### 6.2 Round-Trip Pattern

```
Vance creates Draft → Export to external system → User edits externally
      ↑                                                    │
      └────── Connector syncs changed version back ────┘
```

This is cleaner than building a proprietary editor. Vance is the thinker, not the desk.

---

## 7. MCP as a Universal Connector

Many of the integrations mentioned above already exist as **MCP Servers**:
- Google Drive MCP
- Slack MCP
- Jira/Confluence MCP
- GitHub MCP
- Obsidian MCP

Instead of building a separate connector for each service, Vance could use MCP as a universal integration protocol:

```
Vance Brain
  └→ MCP Client
       ├── Google Drive MCP Server
       ├── Slack MCP Server
       ├── Jira MCP Server
       ├── Obsidian MCP Server
       └── Custom MCP Server (for custom integrations)
```

### Advantages
- Hundreds of existing MCP Servers
- Standardized protocol
- Community-maintained
- New service = install new MCP Server, no Vance code needed

### Disadvantages
- MCP is optimized for tool calls, not for bulk sync
- No native webhook/polling support
- Potentially a hybrid approach needed: MCP for single actions, custom connectors for sync

### Recommendation
- **MCP for actions** (create issue, send message, read file)
- **Custom connectors for sync** (periodic scan, webhook listener, bulk import)
- **MCP as a tool layer for Think Processes** (Think Process has access to MCP tools: "Search in Google Drive")

---

## 8. Connector Architecture in the Brain

```
┌──────────────────────────────────────────────┐
│                 Vance Brain                    │
│                                                │
│  ┌──────────────┐    ┌───────────────────┐    │
│  │ MCP Client   │    │ Sync Connectors   │    │
│  │              │    │                   │    │
│  │ Tool Calls:  │    │ Bulk Import:      │    │
│  │ - read file  │    │ - Google Drive    │    │
│  │ - create doc │    │ - Zotero          │    │
│  │ - post msg   │    │ - Confluence      │    │
│  │ - search     │    │ - Obsidian Vault  │    │
│  │              │    │ - Git Repo        │    │
│  │ For Think Processes  │    │ - BibTeX          │    │
│  │ and Brain    │    │                   │    │
│  └──────────────┘    │ Periodic or       │    │
│                      │ Webhook-triggered │    │
│                      └──────────┬────────┘    │
│                                 ▼              │
│                    ┌────────────────────┐      │
│                    │ Processing Pipeline│      │
│                    │ Text Extraction    │      │
│                    │ Metadata           │      │
│                    │ Chunking+Embedding │      │
│                    │ Entity+Relations   │      │
│                    └────────────────────┘      │
└──────────────────────────────────────────────┘
```

---

## 9. Implementation Phases

| Phase | What | When |
|-------|-----|------|
| **v1** | Manual import (upload), local filesystem via CLI client | Phase 3 (Memory) |
| **v1.5** | MCP Client in the Brain — Think Processes can use MCP tools | Phase 5 |
| **v2** | First sync connectors: Google Drive, Obsidian Vault | Phase 6+ |
| **v2** | Export actions: Create document in Google Docs, Jira issue | Phase 6+ |
| **v3** | Further connectors: Zotero, Confluence, Notion, Slack, BibTeX | Phase 8+ |
| **v3** | Webhook listener for live sync | Phase 8+ |
| **v4** | External Todo Tracking (blocked_by external tasks) | Phase 10+ |

---

## 10. Summary

> **Vance thinks. External tools manage.**
>
> Vance does not build editors, todo lists, or file managers.
> Instead, Vance reads from external sources (Connectors + MCP),
> thinks about them (Think Processes + Knowledge Graph),
> and writes results back to external systems (MCP + Export).
>
> The cycle: External → Import → Think → Export → External

---

*See also: [vision](/docs/vision) | [multi-user-collaboration](/docs/multi-user-collaboration) | [memory-knowledge-management](/docs/memory-knowledge-management) | [knowledge-graph](/docs/knowledge-graph)*
{% endraw %}
