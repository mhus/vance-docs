# Vance — Vision & Goal

> This document defines what Vance is, for whom it is built, and the architectural decisions that follow.

---

## 1. The One Sentence

**Vance is a platform for hybrid AI thinking: a Brain that breaks down complex tasks into controllable, persistent Think Processes and works through them with the user — combined with specialized Clients that give it access to the local world.**

---

## 2. Scope: Vance works with you

> **Vance thinks and acts. Vance does not manage.**

Vance is a system for **structured work with AI** — research, analysis, writing, tool operation, reasoning-driven over multiple steps. Other AI tools advise or respond in a single turn. Vance processes a piece of work, delivers concrete outputs, and remains visible and controllable throughout.

### What Vance can do

- Break down a complex task into a **structured thinking tree**
- Persist this tree **over days/weeks** and process it autonomously or guided
- **Generate concrete artifacts** — Documents, Tool calls, Sub-Processes, data transformations
- Allow the user to **intervene at any time** (pause, reprioritize, inject new info, stop)
- **Distill insights** and find relationships between knowledge elements
- **Ingest external sources** (papers, documents, data) and operate on them
- **Export results** to external systems (Google Docs, Jira, Obsidian)

### What Vance deliberately is NOT

Vance produces artifacts but offers **no UI** to manage or edit them. Vance writes the document — you edit it in Google Docs. Vance creates the issue — you work on it in Jira. Vance generates the code — you commit it in your IDE. Specifically:

- Not a document editor → Google Docs, Notion, Obsidian
- Not a to-do list manager → Things, Todoist, Jira
- Not project management → Jira, Linear
- Not a file manager → Google Drive, Dropbox
- Not literature management → Zotero, Mendeley
- Not an IDE → Claude Code, Cursor, IntelliJ
- Not team chat → Slack, Teams

### The Cycle

```
External Sources → Import → Vance works → Export → External Systems
     (Papers,      (Connectors,   (Engines generate     (Google Docs,
      Data,         MCP,           Outputs:              Jira Issues,
      Documents)    Upload)        Documents,            Obsidian Notes)
                                   Tool-Calls, Plans)
```

Vance sits in the middle and works. Inputs come in from the left, artifacts go out to the right. UI management of artifacts happens in specialized external tools.

---

## 3. The Problem

Today's AI assistants are either:
- **Short-lived and smart** (Claude Code, ChatGPT) — good in the moment, forget everything after the session
- **Long-lived and dumb** (Notion AI, Obsidian Plugins) — store everything, think superficially
- **Long-lived and autonomous, but monolithic** (OpenClaw) — do a lot, but all in one lump without structure

None can:
1. Break down a complex task into a **structured thinking tree**
2. Persist this tree **over days/weeks**
3. Allow the user to **intervene at any time** (pause, reprioritize, inject new info)
4. **Continue working autonomously** when no client is connected
5. Use **different Clients** for different aspects of the work
6. **Actively seek connections** between knowledge elements

---

## 4. Target Audience

**Knowledge workers** — people who have complex, multi-stage thinking tasks:
- Thinking through architectural decisions
- Translating requirements into stories
- Structuring research projects over days
- Developing and iteratively refining strategies
- Conducting scientific literature reviews
- Systematically testing hypotheses

Not: Developers who need code completion.
Not: Casual chat users.
Not: Project managers who plan sprints.

---

## 5. Architecture: Brain + Clients

### 5.1 The Basic Principle

```
Brain thinks and acts.
Clients provide access and local tools.
External tools manage the artifacts.
```

The **Brain** (server) holds the entire cognitive state: Think Processes, Task trees, Memory, Knowledge Graph. It orchestrates LLM calls, plans, traverses, invalidates — and executes actions: writes Documents, calls server Tools, spawns Sub-Processes. It can continue working autonomously.

The **Clients** are the user's access points to the Brain. They are **not interchangeable views of the same content**, but **completely different aspects** of interaction. Additionally, they provide local Tools that can only run on the user's machine (Shell, Filesystem, local Git).

**External Tools** manage the produced artifacts: documents in Google Docs, issues in Jira, code in the IDE, files in Drive.

### 5.2 Clients

All local Clients are built on a common **TypeScript Client SDK**.

| Client | Target Audience | Function | Local Tools |
|--------|-----------------|----------|-------------|
| **CLI** | Developers | Terminal control, local execution | Shell, Git, Filesystem, Code analysis |
| **Desktop** (Electron) | Knowledge workers | Tree visualization, Dashboard, Drag-and-drop, Chat | Filesystem, PDF, LaTeX, local scripts |
| **Mobile** (PWA) | All, on the go | Status, Review, Approval, Steering | Limited (Camera, Files) |
| **Web UI** | All, no install | Dashboard, Read-only tree, Review | None (stateless, REST only) |

A Session has a maximum of 1 local Client (CLI/Desktop/Mobile). Web UI is not a Client — it's stateless.

### 5.3 Tech Stack

| Component | Technology |
|-----------|-------------|
| Brain | Java 25 / Spring Boot 4, MongoDB (sync), langchain4j + langgraph4j (see [java-cli-modulstruktur](../java-cli-modulstruktur.md) §1.5 for the mandatory stack) |
| Client SDK | TypeScript |
| CLI | Node.js (TypeScript) |
| Desktop | Electron + React (TypeScript) |
| Mobile | PWA (React) |
| Web UI | React SPA (TypeScript) |
| Shared UI | React component library |

Two languages: Java (Brain), TypeScript (everything else). Clear boundary at the API.

### 5.4 Integrations

Vance integrates with external systems in two ways:

| Method | For | Examples |
|--------|-----|----------|
| **MCP Client** | Tool Calls (single actions) | Create Google Docs, create Jira issue, send Slack message |
| **Sync Connectors** | Bulk Import (data sources) | Scan Google Drive folder, index Zotero library, read Git repo |

The Brain reads from external sources, thinks about them, and writes results back. For details, see [integrationen-externe-systeme](integrationen-externe-systeme.md).

---

## 6. Core Features

### Engines
- Think Process Lifecycle: create, pause, resume, stop
- Task tree: LLM-generated decomposition, traversal, execution
- Stop-after-each-Task as default
- Autonomous operation via **Autonomous Sessions**: Brain continues working on a TTL-based Lease Holder, Clients control remotely — see [execution-und-persistenz](../execution-und-persistenz.md)
- Steering: send new info to a running Think Process at runtime
- Multiple Engine classes, registry-based: Session-Layer (`arthur`, `eddie`), Worker (`ford`, `marvin`, `vogon`, `zaphod`, `jeltz`), Authoring (`slartibartfast` — Recipe-YAML + SCRIPT_JS), Script-Executor (`hactar` v2 — Load + Validate + Execute), Tool-Health-Diagnosis (`agrajag`), Workflow-Runtime (`magrathea`) — see [think-engines](think-engines.md)
- Configuration via **Recipe** (YAML): Engine + Default-Params + Prompt-Prefix + Tool-Customizations, cascaded Bundled → Tenant → Project — see [recipes](recipes.md)

### Memory & Knowledge
- Scope hierarchy: Tenant → Group → Project → Session → Think Process
- Document-based Memory with Tags and Folders
- Scope-aware RAG (semantic search along the Scope cascade)
- Knowledge Graph with typed relationships (gradual v1→v4)
- Brain Linker: active search for contradictions, supports, gaps (v3+)

### Workflows
- Dedicated Workflow Runtime **Magrathea** (not a Think Engine, separate Lifecycle class)
- Deterministic phase/step pipelines with Gates, Output Schemas, Tool calls, Sub-Process spawns
- Workflow definitions as YAML Documents, cascaded via Project Kits
- Mixable with Engine calls: a Workflow step can spawn an Engine, an Engine Task can spawn a Workflow

### Collaboration (v3+)
- Tenants, Teams, Users with role-based access control
- Project Sharing: private / team / tenant
- Parallel work on different Think Processes within the same Project
- Not: Google-Docs-style real-time editing on the same tree

For details: [architektur-scopes-clients](architektur-scopes-clients.md) | [workflows](workflows.md) | [knowledge-graph](knowledge-graph.md) | [multi-user-collaboration](multi-user-collaboration.md)

---

## 7. What Vance is NOT (extended)

Vance produces artifacts but offers no UI to manage or edit them. UI management resides in specialized external tools.

| Not | Why not | Instead |
|-----|-------------|-------------|
| A document editor | Vance writes Documents, but has no editor UI | Edit in Google Docs, Notion, Obsidian |
| A content management system | Vance does not manage file hierarchies | Connectors to Google Drive, Dropbox |
| A project management tool | Vance plans Think Processes, not sprints | Integration with Jira, Linear |
| A collaboration tool | No Slack replacement, no real-time editing | Parallel Think Processes, not real-time collab |
| A to-do list manager | Vance has Task trees, not manual to-do lists | Export to Things, Todoist, Jira |
| A notebook / wiki | Vance actively produces content, but has no wiki UI | Export to Obsidian, Notion |
| A code editor / IDE | Vance generates code, but offers no editor UI | Claude Code, Cursor, IntelliJ |
| A workflow automator | Vance is not a generic data flow orchestrator | Workflows are Engine structures for thinking work |
| A literature management system | Vance reads and understands Papers, but has no library UI | Connector to Zotero, Mendeley |

---

## 8. The Acid Test

Vance is successful if a knowledge worker can say:

> "Yesterday I started an architectural analysis. Vance autonomously processed three out of five subtasks overnight. This morning, I saw the progress on my phone, reprioritized a task, and then opened the desktop client on my laptop to run the code analysis locally. The results automatically flowed back into the tree. Vance also found a contradiction to an earlier insight and pointed it out to me."

No system can do that today.

---

*See also: [architektur-scopes-clients](architektur-scopes-clients.md) | [workflows](workflows.md) | [knowledge-graph](knowledge-graph.md) | [multi-user-collaboration](multi-user-collaboration.md) | [integrationen-externe-systeme](integrationen-externe-systeme.md) | [brainstorming think flow](../reference/brainstorming think flow.md) | [Other Agent Tools](../reference/Andere Agenten Tools.md)*
