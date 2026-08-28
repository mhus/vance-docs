# Vancetope — Architecture: Scopes & Clients

> Defines the hierarchy of Scopes, the Client model, and the Session concept.
> See also: [vision](vision.md) | [workflows](workflows.md)

---

## 1. Scope Hierarchy

Five levels, from outer to inner. Each level has its own Memory that is inherited downwards.

| Level | Lifespan | Example | Memory Content |
|-------|-------------|----------|---------------|
| **Tenant** | Forever | "Mike's Vancetope" | API Keys, Preferences, Billing (v2+) |
| **Projekt-Gruppe** | Months/Years | "Doctoral Thesis", "Vancetope Dev" | Cross-cutting facts, terms, people |
| **Projekt** | Weeks/Months | "Literature Review", "Brain Architecture" | Project context, reference documents, tool config |
| **Session** | Hours/Days | "Monday morning work session" | Chat history, temporary context, undo history |
| **Think-Process** | within a Session | "Analyze papers on Attention" | Process goal, task tree, intermediate results |

### Memory Cascade (Downward Visibility)

```
Tenant Memory
  └→ Projekt-Gruppe Memory
       └→ Projekt Memory
            └→ Session Memory
                 └→ Think-Process Memory
```

Each node sees its own Memory plus everything above it. Nothing is visible laterally (between Processes of the same Session, between Sessions, between Projekts) — exchange only via the common parent level.

Internal sub-focus within a Think-Process (e.g., individual task tree nodes) is managed by the Think-Engine implementations themselves — this is no longer a global Scope level.

### Simplification for v1

- **Tenant:** Ignore, but provide `tenantId` field everywhere
- **Projekt-Gruppe:** Optional — can remain flat in v1 (only Projekts)
- **Mandatory in v1:** Projekt → Session → Think-Process

---

## 2. Sessions

A Session is a **contiguous block of work** — not a WebSocket connection and not a single thinking process. In v1, it is also the **Owner-Scope** of all Think-Processes started within it.

### Properties

| Aspect | Description |
|--------|-------------|
| **Duration** | Hours to days. "I'm working on the analysis this morning" |
| **Scope** | Belongs to a Projekt. Is owner of its Think-Processes. |
| **Client Binding** | 0 or 1 local client simultaneously (plus stored fingerprint, see [think-engines §6](think-engines.md)) |
| **Content** | Chat history of this work phase, its Think-Processes, temporary notes |
| **Persistence** | In MongoDB. Survives client disconnects |
| **End** | Explicitly closed or timeout — also terminates all associated Processes |

### Session ≠ Connection ≠ Think-Process

```
Session        lives hours/days              → a work window
Think-Process  lives within a Session        → the thinking process
Connection     lives minutes                 → a WebSocket connection
```

- A Session can own any number of Think-Processes in parallel.
- In v1, each Think-Process is firmly assigned to one Session and does **not** move to other Sessions. Reassigning (including handover to an Autonomous Session for remote control) is v2 — see [think-engines §10](think-engines.md).
- A Connection is the technical link of a client to a Session.

### Session has at most one local Client

```
Session
  └→ 0 or 1 Client (CLI / Desktop / Mobile) via WebSocket
```

Not multiple simultaneously. This eliminates synchronization complexity. If a new client binds to a Session, the old one is disconnected.

The Web UI is **not a client** in the Session sense. It accesses the Brain-API statelessly and is not bound to Sessions.

### Suspend Cascade

Session status and Process status are coupled: if the Session goes into `suspended` (client gone, but Session continues to live), **all** its Think-Processes also go into `suspended`. Reason: the Processes may need client-local tools at any time (Filesystem, Shell, Git), and these are not available without a client. When the Session resumes, they return to `ready` — subject to the fingerprint policy (see [think-engines §6](think-engines.md)).

### Two Session Types: Interactive vs. Autonomous

Sessions exist in two forms. The type is determined at creation and is then fixed.

| Type | Pod Binding | Client Tool Usage | Lives without Client? |
|-----|-------------|---------------------|-------------------|
| **Interactive** | on the **Home Pod** of the Projekt (Entry Pod proxied) | yes (Shell, Filesystem, Git, Client-MCP) | no — Processes are suspended on disconnect |
| **Autonomous** | **Lease Holder** with TTL-Lease, remotely controllable | no (server-side Tools only) | yes — continues to run on the Lease Holder |

Interactive Sessions are the normal case for active work. They run on the Home Pod of their Projekt (the Brain process that has claimed the Projekt — Workspace and stateful Tools live there); clients connect to any Brain process (Entry Pod), which proxies the WS connection to the Home Pod. Autonomous Sessions are the mechanism for autonomous Brain operation (Vision §6) — they live on a TTL-based Lease Holder and are remotely controlled by clients via REST forwards. In v1, a Think-Process starts directly in the Session type in which it is created; switching between types is v2.

Each Interactive Session **automatically gets a Session-Chat-Think-Process** upon creation. The `SessionService` reads which Think-Engine is used for this from the `session.defaultChatEngine` setting:

- Initial / Development Phase: `ford` (minimal, no Tools — see [ford-engine](ford-engine.md)) as a Walking Skeleton.
- Target State: `arthur` (reactive, with Tools, orchestrates Worker-Processes — see [arthur-engine](arthur-engine.md)).

The Chat-Process is the primary interaction channel of the Session. Autonomous Sessions do not have a Chat-Process.

Persistence details, Pod ownership, Lease mechanism, and Command routing are described in [execution-und-persistenz](../execution-und-persistenz.md).

---

## 3. Client Model

### Two Categories

| | Local Clients | Brain Web UI |
|--|----------------|-------------|
| **Connection** | WebSocket, Session-bound | REST, stateless |
| **Local Tools** | Yes (Filesystem, Shell, Git, etc.) | No |
| **Session Binding** | Yes — exactly one per Session | No |
| **Installation** | Yes (App/Binary) | No (Browser only) |
| **Purpose** | Productive work, local execution | Monitoring, Review, light editing |

### Tech Stack: TypeScript throughout

All clients are built on a common **TypeScript Client SDK**:

```
TypeScript Client SDK
  ├── WebSocket communication with Brain
  ├── Session management (connect, disconnect, resume)
  ├── Local Tool Registry and Execution (Node.js APIs)
  ├── Task reception and result feedback
  └── Streaming of Brain output
```

All UIs are built on top of this:

```
Client SDK (TypeScript)
  ├── CLI (Node.js + Ink/Readline)
  ├── Desktop (Electron + React)
  ├── Mobile (React Native or PWA)
  └── Shared UI Components (React)
         ├── Tree visualization (D3)
         ├── Think-Process-Dashboard
         ├── Chat-Interface
         └── Memory-Browser
```

### Local Clients in Detail

#### CLI Client

| Aspect | Details |
|--------|---------|
| **Target Audience** | Developers |
| **Runtime** | Node.js |
| **UI** | Terminal (Ink or Readline) |
| **Local Tools** | Full — Shell, Filesystem, Git, Code analysis, Build tools |
| **Platform** | macOS, Linux, Windows |

#### Desktop Client

| Aspect | Details |
|--------|---------|
| **Target Audience** | Knowledge workers, scientists |
| **Runtime** | Electron (Node.js Backend + Chromium Frontend) |
| **UI** | React — Tree visualization, Dashboard, Drag-and-drop, Chat |
| **Local Tools** | Full — Filesystem, local scripts, PDF processing, possibly LaTeX |
| **Platform** | macOS, Linux, Windows |
| **Code Sharing** | UI components shared with Web UI and Mobile |

#### Mobile Client

| Aspect | Details |
|--------|---------|
| **Target Audience** | Everyone — on the go |
| **Runtime** | React Native or PWA |
| **UI** | Reduced version of Desktop components |
| **Features** | Think-Process status, Task review, Steering, Chat, Approval, Notes |
| **Local Tools** | Limited — no Shell, no Git, but Camera, files, voice input |
| **Platform** | iOS, Android |

### Brain Web UI

| Aspect | Details |
|--------|---------|
| **Target Audience** | Everyone — when no client is installed |
| **Runtime** | React SPA in the browser |
| **Connection** | REST + possibly Server-Sent Events for live updates |
| **Features** | Dashboard, Think-Process overview, Tree view (read/light-edit), Memory Browser, Result review |
| **Local Tools** | None |
| **Session Binding** | None |
| **Code Sharing** | Shared React components with Desktop/Mobile |

---

## 4. Overall Architecture

```
┌──────────────────────────────────────────────────────────┐
│                 TypeScript Client SDK                      │
│   WebSocket · Session · Local Tools · Task Runner          │
├──────────┬───────────────┬───────────────────────────────┤
│ CLI      │ Desktop       │ Mobile                         │
│ Node.js  │ Electron+React│ React Native / PWA             │
│ Terminal │ Full UI       │ Reduced UI                     │
│ All      │ All local     │ Limited                        │
│ local    │ Tools         │ local Tools                    │
│ Tools    │               │                                │
└────┬─────┴──────┬────────┴──────────┬────────────────────┘
     │            │                   │
     └────────────┼───────────────────┘
                  │ WebSocket (max 1 per Session)
                  ▼
┌──────────────────────────────────────────────────────────┐
│                     Vancetope Brain                           │
│                   Java / Spring Boot                      │
│                                                           │
│  Think-Process Registry · Task Tree · Memory Manager             │
│  LLM Orchestration · Invalidation · Tool Dispatcher       │
│  Session Manager · Lane Serializer                        │
│  Autonomous Operation (Cron, Background Think-Processes)             │
│                                                           │
│  REST API  ◄─── Brain Web UI (React SPA, stateless)       │
│  WebSocket ◄─── Local Clients (Session-bound)             │
│                                                           │
├──────────────────────────────────────────────────────────┤
│  MongoDB · LLM Providers · Remote Tools                   │
└──────────────────────────────────────────────────────────┘
```

### Language Distribution

| Component | Language | Rationale |
|-----------|---------|-----------|
| **Brain** | Java 25 / Spring Boot 4 | Experience, prototype exists, langchain4j + langgraph4j, Kubernetes-native. Mandatory stack: [java-cli-modulstruktur](../java-cli-modulstruktur.md) §1.5 |
| **Client SDK** | TypeScript | One SDK for all clients, Node.js for local tools |
| **CLI** | TypeScript / Node.js | Use SDK directly |
| **Desktop** | TypeScript / Electron + React | SDK + UI, full local tools via Node.js |
| **Mobile** | TypeScript / React Native or PWA | Same codebase as Desktop (reduced) |
| **Web UI** | TypeScript / React | Shared components with Desktop |
| **Shared UI** | React component library | Tree, Dashboard, Chat — build once, use everywhere |

---

## 5. Lanes

Lanes are **Execution-Queues that guarantee serialization**.

| Lane Type | Scope | Purpose |
|----------|-------|-------|
| **Think-Process Lane** | 1 per Think-Process | Prevents two lifecycle calls of the same Process from running simultaneously |
| **Project Lane** | 1 per Projekt | Serializes project-wide operations (Memory updates, etc.) |

If a client says `continue` and the Process-Lane is currently busy (Brain is working on the next Task), the request is queued. No race condition, no interleaved state.

---

## 6. What a Workday Looks Like

```
08:00  Scientist opens Desktop Client (Electron)
       → Connects to Projekt "Literature Review"
       → Creates new (Interactive) Session
       → Starts Think-Process (deep-think): "Papers on Transformer Efficiency"
       → Brain plans task tree, scientist works through 3 Tasks
       → Pauses the Process

09:30  Starts second Think-Process: "Hypothesis: Sparse Attention scales better"
       → Brain plans tree, works on first Task
       → Scientist provides feedback via Steering
       → Brain integrates, adjusts tree

10:00  Desktop Client disconnected (Meeting)
       → Session goes into suspended → both Processes also suspended
       → Brain waits, no autonomous continuation (Interactive Session)

12:00  Checks on phone (Mobile Client / PWA)
       → New fingerprint (different machineId) → Resume of Desktop Session denied
       → Sees Session list read-only: status of running Processes, latest results
       → Can optionally open a new Mobile-Session in the same Projekt
       → Disconnected

14:00  Back at computer, Desktop Client open again
       → Same fingerprint → Resume of original Session
       → Processes go from suspended back to ready
       → Continue Process 1 → Brain sends local Task
       → Desktop executes it (parse PDF), results flow into the tree

18:00  Developer colleague uses CLI Client for another Projekt
       → Own Session, own Projekt
       → Brain sends Shell-Tasks → CLI executes
       → Same Brain, different work contexts

20:00  Scientist checks Brain Web UI in browser at home
       → Sees overall status of all Processes (across Sessions/Projekts)
       → Reads result summaries
       → No local execution needed, no client install
```

**Note on autonomous continuation:** The scenario above uses an Interactive Session — when the client is gone, the Processes rest. If someone wants their thinking process to continue during a meeting, in v2 they can reassign the Process to an Autonomous Session (remote control without client dependency). This is not implemented in v1.

---

*See also: [vision](vision.md) | [workflows](workflows.md) | [brainstorming think flow](../reference/brainstorming think flow.md)*
