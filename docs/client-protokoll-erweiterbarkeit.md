---
title: "Vance — Client Protocol & Extensibility"
parent: Documentation
permalink: /docs/client-protokoll-erweiterbarkeit
---

<!-- AUTO-GENERATED from specification/public/en/client-protokoll-erweiterbarkeit.md — do not edit here. -->

{% raw %}
---
# Vance — Client Protocol & Extensibility

> Defines the WebSocket protocol, how external systems connect as clients, and how Vance thereby becomes an open platform.
> See also: [execution-modes-trigger](/docs/execution-modes-trigger) | [architektur-scopes-clients](/docs/architektur-scopes-clients) | [mcp-tool-routing](/docs/mcp-tool-routing)

---

## 1. Core Idea

Anything that connects to the Brain is a client. The protocol is the same — whether a human is sitting at a terminal, a cron job fires, or an external robot knocks.

This makes Vance an **open platform**: any system that speaks WebSocket + JSON can use Vance as a thinking backend.

---

## 2. Client Protocol (WebSocket + JSON)

### 2.1 Connection Establishment

```
1. Client opens WebSocket to wss://brain.example.com/api/ws?profile=<profile>[&name=<name>]
2. Client sends: handshake (incl. JWT)
3. Brain responds: session_created or session_resumed
4. Client and Brain exchange messages
5. Client sends: disconnect (or connection breaks)
```

### 2.1a URL Query Parameters

Before the handshake, the client sets two connection properties via the WebSocket URL. They are known to the server **before** the first message and control behavior/routing:

| Param | Required | Values | Purpose |
|---|---|---|---|
| `profile` | no (default `web`) | open string, shape `^[a-z][a-z0-9_-]{0,31}$` | Connection profile. Selects the Recipe profile block for Spawns (see [recipes](/docs/recipes) §6a) |
| `name` | no | String, shape `^[a-zA-Z0-9_-]{1,64}$` | Client identifier for logs/UI |

**Profile is an open string, not an enum.** The server only checks the format (lowercase, alphanumeric + `_-`, ≤ 32 characters). Identity is *not* validated — Tenants can introduce their own profile names (`ci-bot`, `kiosk`, `slack-relay`, …) and create corresponding Recipe profile blocks without requiring changes to the Brain's code. What happens with an unknown profile name is decided exclusively by the Recipe Resolver (Cascade: exact-match-Block → `profiles.default`-Block → Recipe-Base).

**Canonical values** (maintained as string constants in `de.mhus.vance.api.ws.Profiles`; Recipes can use them as Profile-Block-Keys):

| Value | Meaning |
|---|---|
| `foot` | Terminal client (`vance-foot`) — includes Shell + Filesystem tools + client-side `agent.md` |
| `web` | Browser UI (`@vance/vance-face`) — no local tools, no Client Manual. **Wire-Default** if `?profile=` is missing |
| `mobile` | Mobile app (planned) — restricted tool set, shorter sessions |
| `daemon` | Reserved name for `vance-foot -d` headless mode (planned). Currently *no* special behavior — Connect proceeds like any other string, falls back to Default due to lack of Recipe block |
| `default` | Pseudo-profile — used by the Recipe Resolver as a catch-all key in `profiles.default`, never sent by the client |

**Daemon — planned, not implemented:** When Daemon mode arrives, `vance-foot -d` (Spring-Boot without JLine/REPL) will handle login like any other Foot-Connect, but after connecting, it will act as a pure Tool Provider in a `DaemonRegistry`. Brain Tools with `tool_type: daemon` and a matching `daemon_name` will route calls there. Until then, the token `daemon` has no special effect on the server — it is reserved in the spec text, not in the code.

Open spec points for the Daemon iteration: conflict resolution for duplicate `name`, dynamic tool manifest on connect vs. static in Brain tool entry, lifecycle on JWT refresh failure, `chat-process`-spawn suppression for Daemon connects.

**Profile binding of the Session:** When creating a Session, the Brain records the connection's Profile in `SessionDocument.profile` and in every spawned Process as `connectionProfile`. The Session is thus **bound to this profile** — a later resume attempt with a different profile will be rejected with `409 Profile Mismatch` (see `websocket-protokoll.md` §5.1). Reason: Tools/Manuals/Prompt-Defaults were resolved during spawn via the Recipe profile block; a cross-profile resume would offer incompatible tools to the new client. `session-list` includes the Profile in `SessionSummary.profile` so that pickers can hide mismatched sessions or mark them as unselectable. Auto-resume in `session-bootstrap` (without explicit `sessionId`) automatically filters server-side based on the current Profile.

**Relationship to `client.type` in the Handshake** (§2.2): the two fields are **orthogonal**.
- `profile` (URL param) → behavior routing: which Tools/Manuals/Recipe Defaults apply
- `client.type` (Handshake JSON) → identity tag: what *is* this client (`cli`, `slack-bot`, `cron-job`, `external` …) — for logs, service account selection, audit

Examples: an `external` Robot client can choose `profile=web` (not bringing client tools). A `cli` can theoretically set `profile=web` if it deliberately wants to forgo its local tools. Consistency between the two is client responsibility, not enforced.

### 2.2 Handshake

```json
// Client → Brain
{
  "type": "handshake",
  "client": {
    "type": "cli",                    // cli | desktop | mobile | web | cron | webhook
                                      // | brain_linker | external | robot
    "name": "Mikes CLI",              // Human-readable Name
    "version": "1.2.0",
    "is_human": true,
    "capabilities": {
      "chat": true,                   // Can display chat messages
      "approval": true,               // Can answer approval requests
      "streaming": true,              // Can display streamed results
      "notifications": true           // Can receive notifications
    },
    "tools": [                        // Empty list = no local tools
      {
        "name": "shell_execute",
        "type": "native",
        "description": "Execute shell commands locally"
      },
      {
        "name": "obsidian_read_note",
        "type": "mcp",
        "mcp_server": "obsidian-mcp-tools",
        "description": "Read notes from local Obsidian vault"
      }
    ]
  },
  "auth": {
    "token": "jwt_abc123..."         // Auth Token
  },
  "session": {
    "resume": "sess_abc123"          // Optional: resume existing session
    // or: "project_id": "proj_5"  // New session in this project
  }
}
```

```json
// Brain → Client
{
  "type": "session_created",          // or "session_resumed"
  "session_id": "sess_abc123",
  "project": {
    "id": "proj_5",
    "name": "Literature Review"
  },
  "active_think_processes": [
    {
      "id": "tp_12",
      "title": "Flash Attention Analyse",
      "status": "paused",
      "pending_tasks": 3
    }
  ],
  "server_tools": ["web_search", "jira_create_issue", "gmail_send"]
}
```

### 2.3 Message Types

#### Client → Brain

| Type | Purpose | Payload |
|------|---------|---------|
| `process-start` | Start new Think Process | `{ goal, workflow_id?, input? }` |
| `process-continue` | Execute next Task | `{ thinkProcessId }` |
| `process-pause` | Pause Think Process | `{ thinkProcessId }` |
| `process-stop` | Stop Think Process | `{ thinkProcessId }` |
| `process-steer` | Provide new info to running Think Process | `{ thinkProcessId, message }` |
| `task-list` | Query projected Task list | `{ thinkProcessId }` |
| `task-move` | Reprioritize Task | `{ task_id, before_task_id }` |
| `task-cancel` | Cancel Task | `{ task_id }` |
| `task-rerun` | Rerun Task | `{ task_id }` |
| `task-approve` | Approve Task result | `{ task_id, approved: true/false }` |
| `memory-add` | Add Entity | `{ type, title, content, tags }` |
| `memory-search` | RAG search | `{ query, scope?, tags? }` |
| `memory-link` | Create relation | `{ source_id, target_id, type }` |
| `tool-result` | Result of a Client Tool call | `{ request_id, result }` |
| `chat` | Chat message to the Brain | `{ message }` |
| `disconnect` | Disconnect cleanly | `{}` |

#### Brain → Client

| Type | Purpose | Payload |
|------|---------|---------|
| `process-status` | Think Process status changed | `{ thinkProcessId, status, current_task? }` |
| `task-update` | Task status changed | `{ task_id, status, result? }` |
| `task-list` | Response to task-list | `{ thinkProcessId, tasks: [...] }` |
| `tool-request` | Brain needs Client Tool | `{ request_id, tool_name, args }` |
| `approval-request` | Brain needs approval | `{ task_id, result_preview }` |
| `stream-chunk` | LLM output streaming | `{ thinkProcessId, task_id, chunk }` |
| `stream-end` | Streaming finished | `{ thinkProcessId, task_id }` |
| `notification` | Notification | `{ level, message, context? }` |
| `chat` | Brain responds to chat | `{ message }` |
| `memory-result` | Response to memory-search | `{ results: [...] }` |
| `error` | Error | `{ code, message, context? }` |

---

## 3. External / Robot Clients

### 3.1 What is a Robot Client?

Any external system that connects as a client and interacts with the Brain automatically:

| Robot Type | Example | What it does |
|----------|---------|-----------|
| **CI/CD Step** | GitHub Actions, Jenkins | After deploy: starts Architecture Review Think Process |
| **n8n / Zapier Node** | n8n Workflow | On event: triggers Vance workflow, waits for result |
| **External Coding Agent** | IDE or CLI coding assistant with Vance Tool | Uses Vance as a Deep Think backend for complex questions |
| **Another Vance System** | Vance Instance B | Cross-system Knowledge exchange |
| **Custom Script** | Python/Node.js Script | Batch import of documents, result export |
| **Monitoring Bot** | Alerting system | On anomaly: starts analysis Think Process |
| **Slack Bot** | Slack App | User types in Slack, bot delegates to Vance |

### 3.2 Handshake of a Robot Client

```json
{
  "type": "handshake",
  "client": {
    "type": "external",
    "name": "GitHub Actions CI Bot",
    "version": "1.0.0",
    "is_human": false,
    "capabilities": {
      "chat": false,
      "approval": false,              // Robot cannot approve
      "streaming": false,
      "notifications": false
    },
    "tools": [
      {
        "name": "github_api",
        "type": "native",
        "description": "Access GitHub API for repo operations"
      }
    ]
  },
  "auth": {
    "token": "service_token_xyz..."   // Service Account Token
  },
  "session": {
    "project_id": "proj_vance_dev"
  }
}
```

### 3.3 Typical Robot Flow

```
Robot connects
  → Handshake: type=external, is_human=false, tools=[...]
  → Session is created

Robot starts Workflow:
  → { type: "process-start", goal: "Review Architecture after deploy v2.3.1",
      workflow_id: "wf_architecture_review",
      input: { commit_sha: "abc123", changed_files: [...] } }

Brain works:
  → Brain plans tree, executes Tasks
  → Needs Tool? → If Robot Tool: tool-request to Robot
  → Needs Approval? → Task is blocked (Robot cannot approve)
     → Notification to human user

Robot waits for result:
  → Receives: process-status, task-update, stream-chunk
  → When Think Process is finished: reads result

Robot disconnected:
  → Session closes
  → If Think Process is still running: Brain continues autonomously
```

### 3.4 Robot Client that brings Tools

The special thing: a Robot client can register **its own Tools**. Example: a CI/CD bot brings `github_api`, `docker_inspect`, `kubectl_get`. The Brain can use these Tools in its Tasks — as long as the Robot is connected.

```
CI-Bot connects with Tools: [github_api, docker_inspect]
  → Brain: "Ah, I can now query GitHub and Docker"
  → Think Process Task: "Check if the new container starts healthy"
  → Brain sends: tool-request { tool: "docker_inspect", args: { container: "app-v2.3.1" } }
  → CI-Bot executes locally, sends result back
  → Brain uses result for next thinking step
```

---

## 4. Vance as a Backend for other AI Systems

### 4.1 External Coding Agent as Client

An IDE or CLI coding agent can integrate Vance as a Deep Think Tool:

```
User in Coding Agent: "Thoroughly analyze the architecture of this repo"
Agent:
  → Connects as client to the Vance Brain
  → Starts Think Process: "Architecture Review for repo X"
  → Brings Tools: [shell_execute, read_file, git_log]
  → Brain plans tree, uses the Agent's local Tools
  → Result flows back into the Agent conversation
```

### 4.2 MCP Server Mode

Alternatively: Vance exposes itself as an **MCP Server**. Then any MCP-capable system (desktop chats, IDE extensions, coding agents) can use Vance as a Tool without implementing the client protocol.

```
MCP Tool: vance_start_engine
  Input: { goal: "...", project_id: "..." }
  Output: { thinkProcessId: "tp_42", status: "running" }

MCP Tool: vance_get_result
  Input: { thinkProcessId: "tp_42" }
  Output: { status: "done", result: "..." }

MCP Tool: vance_search_knowledge
  Input: { query: "...", project_id: "..." }
  Output: { results: [...] }
```

This is simpler than a full client — but without session, without tools, without streaming. Good for quick queries, not for interactive work.

### 4.3 Dual-Mode

Vance can offer both simultaneously:

```
Vance Brain
  ├── WebSocket API (full Client Protocol, Sessions, Tools, Streaming)
  │     ├── CLI Client
  │     ├── Desktop Client
  │     ├── Mobile Client
  │     ├── Web UI (optional)
  │     ├── Cron / Webhook / Linker
  │     └── External Robot Clients
  │
  └── MCP Server (simple Tool Calls, stateless)
        ├── Desktop Chat Apps
        ├── IDE Extensions
        ├── Coding Agents
        └── Other MCP-capable Systems
```

---

## 5. Authentication for External Clients

| Client Type | Auth Method |
|-----------|-------------|
| Human Clients | OAuth2 / JWT (User Login) |
| Cron / Linker | Internal Service Token (no external Auth) |
| Webhook | Shared Secret in Header |
| External Robot Clients | Service Account + API Key or OAuth2 Client Credentials |
| MCP Server | API Key in MCP Config |

### Service Accounts

For Robot clients, there are Service Accounts:

```yaml
service_account:
  id: sa_github_ci
  tenant_id: tenant_acme
  name: "GitHub CI Bot"
  permissions:
    - project: proj_vance_dev
      role: editor                 # can start and edit Think Processes
    - project: proj_research
      role: viewer                 # can only read
  api_key: "vance_sk_..."         # encrypted
  created_by: user_mike
  created_at: 2026-04-23
```

---

## 6. Client SDK Variants

The TypeScript Client SDK is for human clients (CLI, Desktop, Mobile). For Robot clients, there are lightweight variants:

| Variant | Language | For |
|----------|---------|-----|
| `@vance/sdk` | TypeScript | CLI, Desktop, Mobile, Web |
| `@vance/sdk-lite` | TypeScript | Node.js Bots, n8n Custom Nodes |
| `vance-sdk-python` | Python | Python Scripts, Jupyter Notebooks, ML Pipelines |
| `vance-sdk-java` | Java | JVM-based Systems, Spring Integrations |
| REST Documentation | Any Language | For everything else — raw WebSocket + JSON |

The Lite SDKs only wrap the WebSocket protocol and message types. No UI components, no local Tool Registry.

---

## 7. Examples

### n8n Node

```javascript
// n8n Custom Node: Vance Deep Think
const ws = new VanceLiteClient({
  url: 'wss://brain.example.com/api/ws',
  apiKey: 'vance_sk_...',
  clientType: 'external',
  clientName: 'n8n Workflow: Weekly Report'
});

await ws.connect({ projectId: 'proj_5' });

const process = await ws.startThinkProcess({
  goal: 'Create Weekly Report from last week\'s data',
  workflowId: 'wf_weekly_report',
  input: { data: inputData }
});

// Wait for result (polling or event)
const result = await ws.waitForThinkProcess(process.id, { timeout: 300000 });

await ws.disconnect();
return result;
```

### Python Script (Scientist)

```python
# Batch import of papers into a Vance project
from vance_sdk import VanceClient

client = VanceClient(
    url='wss://brain.example.com/api/ws',
    api_key='vance_sk_...',
    client_type='external',
    client_name='Paper Import Script'
)

client.connect(project_id='proj_literature_review')

for pdf_path in glob('papers/*.pdf'):
    client.memory_add(
        type='document',
        subtype='paper',
        title=extract_title(pdf_path),
        file=pdf_path,
        tags=['imported', 'unread', '2026']
    )

# Start analysis Think Process for the new papers
client.start_engine(
    goal='Analyze the newly imported papers',
    workflow_id='wf_paper_analysis'
)

client.disconnect()
```

### GitHub Actions

```yaml
# .github/workflows/architecture-review.yml
name: Architecture Review
on:
  push:
    branches: [main]
    paths: ['src/main/**']

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Trigger Vance Architecture Review
        uses: vance-ai/github-action@v1
        with:
          brain_url: ${{ secrets.VANCE_URL }}
          api_key: ${{ secrets.VANCE_API_KEY }}
          project_id: proj_vance_dev
          workflow_id: wf_architecture_review
          input: |
            commit_sha: ${{ github.sha }}
            changed_files: ${{ steps.changed.outputs.files }}
          wait_for_result: true
          timeout: 600
```

---

## 8. Implementation Phases

| Phase | What |
|-------|-----|
| **v1 (Phase 4)** | Define WebSocket protocol, human clients |
| **v1 (Phase 5)** | TypeScript Client SDK |
| **v2 (Phase 10)** | Lite SDK, Service Accounts, external Client Auth |
| **v2** | MCP Server Mode |
| **v3** | Python SDK, GitHub Action, n8n Node |
| **v3** | Robot Client Documentation + Examples |

---

## 9. Summary

> **Vance is an open platform.**
>
> Anything that speaks WebSocket + JSON is a valid client.
> Human clients bring UIs and local Tools.
> Robot clients bring automation and external Tools.
> MCP Server Mode provides lightweight access without WebSocket.
>
> This makes Vance the thinking backend for arbitrary systems.

---

*See also: [execution-modes-trigger](/docs/execution-modes-trigger) | [architektur-scopes-clients](/docs/architektur-scopes-clients) | [mcp-tool-routing](/docs/mcp-tool-routing) | [integrationen-externe-systeme](/docs/integrationen-externe-systeme)*
{% endraw %}
