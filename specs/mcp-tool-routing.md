---
title: "Vance — MCP & Tool Routing"
parent: Specs
permalink: /specs/mcp-tool-routing
---

<!-- AUTO-GENERATED from specification/public/en/mcp-tool-routing.md — do not edit here. -->

---
# Vance — MCP & Tool Routing

> Defines where MCP tools reside (server vs. client), how routing works, and what happens when no client is present.
> See also: [vision](/specs/vision) | [architecture-scopes-clients](/specs/architektur-scopes-clients) | [integrations-external-systems](/specs/integrationen-externe-systeme)

---

## 1. The Problem

A Task requires a Tool. Where does the Tool run?

| Situation | Example | Where must it run? |
|-----------|---------|--------------------|
| Brain works autonomously, no client connected | "Create Jira issue with the result" | **Server** — otherwise it won't work |
| User works on desktop | "Read the file ~/papers/review.pdf" | **Client** — file is local |
| Tool exists only on the server | "Search the web" (API key on server) | **Server** |
| Tool exists only on the client | "Read my Obsidian Vault" (local) | **Client** |
| Tool exists on both sides | "Search Google Drive" (OAuth possible on both sides) | **Either** — but Server is more robust |

---

## 2. Two MCP Runtimes

```
┌─────────────────────────────────────────────┐
│              Vance Brain                     │
│                                              │
│   Server MCP Client                          │
│     ├── Google Drive MCP Server              │
│     ├── Jira / Confluence MCP Server         │
│     ├── Gmail MCP Server                     │
│     ├── Slack MCP Server                     │
│     ├── Web Search Tool                      │
│     └── ... (remote-capable Tools)           │
│                                              │
│   Tool Router                                │
│     → Decides: Server or Client?             │
│     → Fallback if Client offline?            │
│                                              │
└──────────────┬───────────────────────────────┘
               │ WebSocket
               │ (Tool-Request / Tool-Result)
┌──────────────▼───────────────────────────────┐
│           Local Client                        │
│                                              │
│   Client MCP Client                          │
│     ├── Obsidian MCP Server (local Vault)    │
│     ├── Filesystem MCP Server                │
│     ├── Git MCP Server                       │
│     ├── IDE MCP Server                       │
│     ├── Local DB Tools                       │
│     └── ... (locally-bound Tools)            │
│                                              │
│   Native Tools (no MCP)                      │
│     ├── Shell Execution                      │
│     ├── File Read/Write                      │
│     └── Process Management                   │
│                                              │
└──────────────────────────────────────────────┘
```

### Server-MCP

| Aspect | Details |
|--------|---------|
| **When** | Always available, 24/7 |
| **For** | Remote APIs, Cloud Services, anything requiring an API key |
| **Advantage** | Autonomous operation — Brain can create Jira issues at night |
| **Disadvantage** | No access to user's local resources |
| **Auth** | API keys and OAuth tokens in the Brain (encrypted in MongoDB) |

### Client-MCP

| Aspect | Details |
|--------|---------|
| **When** | Only when a client is connected |
| **For** | Local files, local apps, local MCP servers the user already has |
| **Advantage** | Access to everything local, user may already have MCP server configured |
| **Disadvantage** | Offline when laptop is closed |
| **Auth** | Runs locally, uses the user's local credentials |

---

## 3. Tool Registry

Every Tool known to Vance has a **Location Type**:

```yaml
tools:
  - name: jira_create_issue
    location: server               # server | client | both | prefer_server | prefer_client
    mcp_server: jira-mcp
    description: "Creates a Jira issue"

  - name: read_local_file
    location: client
    type: native                    # native (no MCP, directly in Client SDK)
    description: "Reads a local file"

  - name: obsidian_read_note
    location: client
    mcp_server: obsidian-mcp
    description: "Reads a note from the local Obsidian Vault"

  - name: google_drive_search
    location: both                  # Server and Client can do this
    mcp_server: google-drive-mcp
    prefer: server                  # For 'both': which side is preferred?
    description: "Searches Google Drive"

  - name: shell_execute
    location: client
    type: native
    description: "Executes a shell command locally"

  - name: web_search
    location: server
    type: built_in
    description: "Web search"
```

### Location Types

| Type | Meaning |
|------|---------|
| `server` | Only on the server. Always available. |
| `client` | Only on the client. Only when connected. |
| `both` | Available on both sides. `prefer` determines default. |
| `prefer_server` | Shorthand for `both` + `prefer: server` |
| `prefer_client` | Shorthand for `both` + `prefer: client` |

---

## 4. Tool Router

The Brain has a **Tool Router** that decides for each Tool call:

```
Task needs Tool X
  │
  ├── Location = server?
  │     → Server executes. Done.
  │
  ├── Location = client?
  │     ├── Client connected?
  │     │     → Tool-Request via WebSocket to Client
  │     │     → Client executes, sends Result back
  │     └── Client NOT connected?
  │           → Task is marked as 'blocked'
  │           → blocked_reason: "Waiting for Client for Tool: read_local_file"
  │           → Brain continues with other Tasks (if any)
  │           → When Client connects → Task is automatically re-queued
  │
  ├── Location = both?
  │     ├── prefer = server?
  │     │     → Server executes.
  │     └── prefer = client?
  │           ├── Client connected? → Client executes.
  │           └── Client not present? → Fallback to Server.
  │
  └── Tool unknown?
        → Task failed with error
```

### Fallback Strategy

This is the core: **what happens when the Brain operates autonomously and needs a Client Tool?**

This case occurs particularly in **Autonomous Sessions** (see execution-and-persistence §3.2) — by definition, no client is present to execute `location: client` tools. The strategies below apply there regularly; in Interactive Sessions, they apply only as long as the client is temporarily disconnected.

| Strategy | Behavior | Configurable via |
|----------|----------|------------------|
| **block** | Task becomes `blocked`, waits for Client | Default for `location: client` |
| **skip** | Task is skipped, next Task | Think-Process-Setting |
| **fallback** | Uses Server alternative if available | Tool-Config `fallback_tool` |
| **queue** | Task goes into a "pending-client" Queue | Default for autonomous operation |

```yaml
- name: read_local_file
  location: client
  offline_strategy: block          # block | skip | queue

- name: google_drive_search
  location: both
  prefer: client
  offline_strategy: fallback       # falls back to Server version
```

---

## 5. Client Tool Discovery

When a Client connects, it reports its available Tools:

```json
// Client → Brain on Connect
{
  "type": "client_connected",
  "session_id": "sess_123",
  "client_type": "desktop",
  "available_tools": [
    {
      "name": "obsidian_read_note",
      "type": "mcp",
      "mcp_server": "obsidian-mcp-tools"
    },
    {
      "name": "shell_execute",
      "type": "native"
    },
    {
      "name": "read_local_file",
      "type": "native"
    },
    {
      "name": "git_status",
      "type": "native"
    }
  ]
}
```

The Brain merges this with its Server Tool Registry:

```
Server Tools (always present):
  jira_create_issue, gmail_send, web_search, google_drive_search, ...

+ Client Tools (now available):
  obsidian_read_note, shell_execute, read_local_file, git_status, ...

= Active Tool Registry for this Session
```

When the Client disconnects, the Client Tools are removed from the active Registry. Running Tasks that require Client Tools become `blocked`.

---

## 6. Tool Routing in the Task Tree

Tasks can explicitly specify which Tools they need:

```yaml
- id: extract_from_paper
  goal: "Extract core theses from paper"
  tools: [read_local_file]          # needs Client
  execution_target: auto             # Router decides

- id: create_jira_story
  goal: "Create Jira Story from result"
  tools: [jira_create_issue]        # Server Tool
  execution_target: auto

- id: analyze_code
  goal: "Analyze the code in the repo"
  tools: [shell_execute, git_status] # Client Tools
  execution_target: client            # explicitly Client
```

`execution_target`:
- `auto` — Router decides based on Tool Location
- `server` — must run on the Server
- `client` — must run on the Client
- `any` — doesn't matter, take what's available

---

## 7. Typical Configurations

### Scientist (Desktop Client)

```
Server-MCP:
  - Google Scholar Search
  - Gmail (send paper requests)
  - Google Drive (shared documents)

Client-MCP:
  - Obsidian Vault (local notes)
  - Zotero (local library)
  - LaTeX Compiler (local)

Client Native:
  - Filesystem (read papers)
  - PDF Extraction (local)
```

### Developer (CLI Client)

```
Server-MCP:
  - Jira (create issues)
  - Confluence (read/write docs)
  - Slack (notifications)

Client-MCP:
  - Git MCP Server
  - IDE MCP Server (VS Code)

Client Native:
  - Shell (execute commands)
  - Filesystem (read/write code)
  - Build Tools (Maven, npm)
```

### Autonomous Night Operation (no Client)

```
Only Server-MCP available:
  - Web Search (research)
  - Google Drive (read documents)
  - Gmail (send result summary)
  - Jira (create issues)

Tasks requiring Client Tools:
  → blocked, waiting for next Client connection
```

---

## 8. Think-Process Tool Configuration

Per Think Process, it can be configured which Tools are available:

```yaml
engine:
  id: eng_literature_review
  tools:
    server: [web_search, google_drive_search, gmail_send]
    client: [obsidian_read_note, read_local_file, zotero_search]
    auto_fallback: true    # Fall back to Server alternative if Client is offline
```

This prevents a Think Process from having unnecessary Tools (e.g., an analysis Think Process does not need `shell_execute`) and makes the LLM Toolset more focused per Think Process.

---

## 9. Implementation Phases

| Phase | What |
|-------|------|
| **v1 (Phase 2)** | Server-side Tools only, hardcoded (Web Search, etc.) |
| **v1 (Phase 5)** | Client Native Tools (Shell, Filesystem) via WebSocket |
| **v1.5 (Phase 6)** | Server-MCP Client: first MCP servers in the Brain |
| **v2 (Phase 10)** | Client-MCP: Client reports local MCP servers |
| **v2 (Phase 10)** | Tool Router with fallback strategies |
| **v2 (Phase 10)** | Tool Discovery on Client Connect |
| **v3** | Think-Process-specific Tool Configuration |
| **v3** | MCP-Server Hot-Reload (new Tools without restart) |

---

*See also: [integrations-external-systems](/specs/integrationen-externe-systeme) | [architecture-scopes-clients](/specs/architektur-scopes-clients) | [vision](/specs/vision)*
