---
title: "Vance — Think Engines and Think Processes"
parent: Documentation
permalink: /docs/think-engines
render_with_liquid: false
---

<!-- AUTO-GENERATED from specification/public/en/think-engines.md — do not edit here. -->

---
# Vance — Think Engines and Think Processes

> A **Think Engine** is a replaceable algorithm. A **Think Process** is a running instance that operates according to the algorithm of a Think Engine. Vance starts with **`arthur`** (reactive Session-Chat) and **`ford`** (Generalist-Worker); `vogon` (deterministic multi-phase runner) and `marvin` (deep-think — dynamic task-tree) will follow. The architecture is designed for multiple, named Think Engines.
>
> **Engines vs. Recipes:** Engines are the algorithm layer (3-5 structurally different classes). The *user-facing* configuration is called a **Recipe** — named bundles of Engine + Default-Params + Prompt-Prefix + Tool-adjustments. Recipes are the view through which Arthur and clients spawn. Details: [recipes](/docs/recipes).
>
> See also: [vision §6 Think Engine](/docs/vision) | [workflows](/docs/workflows) | architecture-scopes-clients | [arthur-engine](/docs/arthur-engine)

---

## 1. Terminology

The two terms are clearly separated:

| Term | What it is |
|---------|-----------|
| **Think Engine** | The **algorithm** (class / implementation) by which thinking is performed. Stateless with respect to a concrete instance. Registered with a unique name in the Think Engine Registry. |
| **Think Process** | A **running instance** that operates according to a Think Engine. Has status (`ready/running/paused/blocked/suspended/done/stopped/stale`), a task tree, a Goal, a Session as owner. Persisted as `ThinkProcessDocument`. |

When creating a Think Process, the Think Engine is selected by name. The selection remains fixed (no runtime change — see §10). The Process only holds the name (`thinkEngine` field); the algorithm code is fetched fresh from the Registry with each lifecycle call. This allows deployment-wide updates of a Think Engine without migrating running Processes.

---

## 2. Think Engine Registry

In the Brain, there is a **Think Engine Registry** — a name→implementation mapping that is populated during Brain startup and read at runtime when a Process is started or resumed.

Entry schema:

| Field | Type | Purpose |
|------|-----|-------|
| `name` | String (unique, lowercase-kebab) | Technical key, persisted in `ThinkProcessDocument.thinkEngine`. Business key, not a Mongo ID. |
| `title` | String | Display name for UI/CLI |
| `description` | String | Short description of what the algorithm does (for selection UIs) |
| `defaultSettings` | Settings-Schema | (Spec-only, **not implemented in v1**) Typed parameter schema of the Engine. Currently, this information is carried by the Engine's associated Recipe (see [recipes](/docs/recipes) §10) as an untyped map; schema validation is an open point. |
| `allowedTools` | `Set<String>` | Default tool whitelist of the Engine. Recipes can overlay `allowedToolsAdd`/`Remove`. Empty Set = unrestricted. |
| `version` | Semver | For compatibility checks when resuming persisted Processes |

The Registry is implemented as a Spring service (`ThinkEngineService`) with auto-discovery via `List<ThinkEngine>` autowire.

**Plugin mechanism** (third parties bringing their own Think Engines) is **not v1**. In v1, all entries are hardcoded in the Brain.

**Role vs. Recipe:** The Engine determines the *behavior* (lifecycle, Inbox handling, tool loop, streaming). The *appearance* (system prompt, validator wording, default params, tool whitelist adjustment) resides in the Recipe. When a Process is spawned, the appropriate Recipe (either explicitly named or via the `engine`-name convention) is copied to the Process (snapshot); the Engine consumes the override fields from the Process during a turn, not directly from the Recipe. This ensures that running Processes survive Recipe edits unchanged, and Engines remain stateless.

---

## 3. Think Engine Lifecycle Contract

Every Think Engine implements a uniform lifecycle interface. All calls receive the `ThinkProcessDocument` (mutable persistence) and a `ThinkEngineContext` (access surface, §4). The Think Engine class itself is **stateless** — it holds no reference to a concrete instance, and no runtime-relevant state resides in instance variables.

| Method | Purpose |
|---------|-------|
| `start(process, context)` | Initial entry from `INIT` status. Initial plan (task tree) from Goal + context. The first task is prepared and executed either directly or after user approval, depending on the Think Engine. Status transition: `INIT → IDLE` (or `RUNNING` if `start` directly drives a turn). |
| `pause(process, context)` | **User-driven pause.** Lane finishes the current turn up to the next safe boundary (tool boundary, step boundary, LLM call end — engine-specific) and then stops. Process goes to `PAUSED`. Control messages are still accepted but do **not** trigger a Lane wakeup until `resume` is called. Distinction from `suspend`: there *system-driven*, here *user-driven*. Wakeup behavior identical (no auto), triggers and resume triggers different — see [session-lifecycle §3 + §11](/docs/session-lifecycle). |
| `resume(process, context)` | Resume from `PAUSED` or `SUSPENDED`. Lane is re-enabled, drains all pending messages (including control messages that arrived in the meantime) and drives a turn. Status transition: `PAUSED / SUSPENDED → IDLE → (drain) → RUNNING`. |
| `suspend(process, context)` | **System-driven halt.** Trigger: Session suspend cascade (disconnect with `onDisconnect=SUSPEND`, idle sweep), Pod shutdown, lease loss. Status transition: → `SUSPENDED`. Runner stops at the next boundary, state remains in the `process`. Is *not* called by the pause path. |
| `steer(process, context, message)` | User provides new information/direction at runtime. The Think Engine decides how to integrate the information into memory and plan. Allowed in `RUNNING`, `IDLE`, `BLOCKED`, `PAUSED`; in the `PAUSED` case, the correction waits in the pending queue for `resume`. |
| `stop(process, context)` | Final stop by user or parent. Status transition: → `CLOSED` with `closeReason=STOPPED`. No further continuation. |

### Further Contract Requirements

- **Lane Serialization:** All lifecycle calls for a Process run serially through its Think Process Lane. The Think Engine does not need to be thread-safe. See architecture-scopes-clients §5.
- **Pause/Resume across Brain Restart:** All runtime-relevant data lives in the `ThinkProcessDocument`. After a Brain restart, every Process must be resumable from its persisted state.
- **Version Compatibility:** In case of an incompatible `version` difference between persistence and resume, the Process goes into `stale`; it is not automatically resumed.
- **No Own LLM Clients / Tool Handles:** All external access runs exclusively through the `ThinkEngineContext`.

---

## 4. ThinkEngineContext

The `ThinkEngineContext` is the **only access surface** a Think Engine receives at runtime. It abstracts:

| Area | Content |
|---------|--------|
| **Knowledge** | Memory API with scope cascade (Tenant → Project Group → Project → Session), RAG queries, Knowledge Graph access, read access to project documents. |
| **Tools** | Unified Tool Invocation (server-side Tools, client-side Tools via Session, MCP Tools). The Think Engine calls Tools only via the Context — it does not know whether the Tool runs locally on the client or server-side. |
| **LLM** | Access via `LlmResourceManagement` with per-call client instantiation. The Think Engine does not hold its own LLM clients. |
| **Settings** | Typed Settings with scope cascade. Think Engine's own keys are in the Think Engine's namespace. |
| **Events** | Streaming of intermediate results and task tree updates to the bound client of the Session. |

The Context is **built fresh for each lifecycle call**. The Think Engine must not cache the Context. Reason: Session state changes (client binding, tool availability, active fingerprint) and the Context must reflect the current state.

**Tool demand is dynamic:** which tools a task needs is decided at the concrete task — not generally per Think Engine or per Process. Therefore, there is no static tool category declaration at the Engine level. Which tools are available at the time of the call results from the Session state (client-bound / Autonomous).

---

## 5. Think Process Status and Session Binding

### Status

Seven statuses, plus `closeReason` as a sub-field to `CLOSED`. Full table including wakeup behavior in [session-lifecycle §3](/docs/session-lifecycle); here's the short version:

| Status | When | Auto-Wakeup on new Pending-Msg? |
|--------|------|---|
| `INIT` | Default upon creation, before `engine.start()` | n/a |
| `RUNNING` | Lifecycle call is currently running within the Lane | (running) |
| `IDLE` | Between turns, pending queue empty | **yes** |
| `BLOCKED` | Engine has queried via Inbox, waiting for user response | **yes** (response comes as Pending-Msg) |
| `PAUSED` | User has explicitly paused | no |
| `SUSPENDED` | System has halted (Cascade, Pod shutdown, Lease loss) | no |
| `CLOSED` | Terminal | (terminal) |

`closeReason` (sub-field to `CLOSED`): `DONE` (Goal reached), `STOPPED` (User/Parent stop), `STALE` (Version mismatch, stuck). Audit info, no behavior.

`PAUSED` and `SUSPENDED` have the same wakeup behavior (no auto), but different triggers and resume triggers — see [session-lifecycle §3](/docs/session-lifecycle).

`INIT` is transient: only `engine.start()` is allowed in `INIT` status; all other lifecycle calls in `INIT` → 409.

### Session as Owner

In v1: **a Think Process belongs to exactly one Session**. The Session is the owner:

- `ThinkProcessDocument` carries `sessionId` as a mandatory field.
- The list of all Processes of a Session is determined by Session query.
- Session Close (see [session-lifecycle §9](/docs/session-lifecycle)): all non-`CLOSED` Processes run via `engine.stop` and go to `CLOSED` with `closeReason=STOPPED`.
- The Session inherits the `projectId` — the Process is thus implicitly also within the project scope (for memory cascade).

**Not in v1:** Reassigning a Process to another Session (e.g., to an event-driven Session for remote control of a thought process without a local client). The architecture does not fundamentally block this — the feature will come in v2 (see open points).

---

## 6. Suspend Cascade and Client Fingerprint

### Disconnect Behavior and Suspend Cascade

What happens on client disconnect depends on the typed `onDisconnect` property of the Session (`SUSPEND` / `KEEP_OPEN` / `CLOSE`), not directly on the Profile. The Profile only feeds the defaults during `session-create` via the Recipe — at runtime, the lifecycle machine exclusively reads the property. Consolidated overview in [session-lifecycle §5 + §8](/docs/session-lifecycle); here are the implications for Engines:

| `onDisconnect` | On Disconnect | Engine Impact |
|---------|----------------|-------------------|
| `SUSPEND` | Session → `SUSPENDED` (Cascade), `suspendCause=DISCONNECT` | All non-`CLOSED` Processes → `SUSPENDED`; `engine.suspend(process, ctx)` on each Lane. |
| `CLOSE` | Session → `CLOSED` directly | All Processes → `CLOSED` with `closeReason=STOPPED`; `engine.stop(process, ctx)` on each Lane. |
| `KEEP_OPEN` | Session remains `OPEN` | Engines continue running. A later `SUSPENDED` only occurs via idle detection ([session-lifecycle §7](/docs/session-lifecycle)). |

`SUSPENDED` means: no new lifecycle calls. A currently running call finishes up to the next safe point (Lane boundary, next task boundary).

Upon Session resume (new client bind or manual resume, [session-lifecycle §10](/docs/session-lifecycle)), all Processes return to `IDLE` — subject to the fingerprint policy below. `IDLE` ≠ automatic continuation: the next turn only starts when the Pending Queue contains a message (auto-wakeup) or through explicit `process-resume`. WLAN flickering should not cause a Process to wobble back and forth.

### Client Fingerprint

Client-side tools (Shell, Filesystem, Git) access **a specific machine in a specific working directory**. If the client context changes between suspend and resume, running tool references (e.g., "analyze `./paper.pdf`") point to nothing or — worse — to a completely different file with the same name.

The Session therefore stores a **Fingerprint** upon initial client bind:

- `machineId` — stable device identifier (queryable from OS)
- `workingDir` — absolute path where the client was started
- optional: `userHome`, OS username

Upon resume, Brain checks the new fingerprint against the stored one:

| Case | Policy |
|------|--------|
| **identical** | Normal resume. All Processes go from `suspended` to `ready`. |
| **`machineId` different** | Resume denied (HTTP 409 or WS error code). Client must create a new Session. The old Session remains `suspended` and can be resumed by the original client. |
| **same machine, different `workingDir`** | Resume possible, but Processes remain in `suspended` and get the `contextDrift=true` flag. The user explicitly decides per Process: `resume` (at their own risk), `stop`, or `reset` (delete / restart Process). |

Background for the milder policy with `workingDir` change: the user could deliberately open the same client in a different sub-working directory without affecting the ongoing analysis. The decision lies with the user, not the system.

**Openly recognized:** Client context drift is not fully solvable. Files on the client can be moved, renamed, deleted, modified between suspend and resume — without Brain knowing about it. The fingerprint policy only addresses the coarse case "different location". Finer invalidation (e.g., hash per referenced file) remains v2+.

---

## 7. Concrete Think Engines

### `ford` — Minimal Chat (Walking Skeleton)

Two heads, no brain. Minimal chat engine: user message → LLM → response. No tools, no memory, no orchestration. Purpose: first implementation to validate the entire Think Engine framework end-to-end. Remains in the Registry as a debug/smoke test engine afterwards.

Until Arthur is production-ready, Ford is the **default** for Interactive Sessions (via setting `session.defaultChatEngine`).

See **[ford-engine](/docs/ford-engine)**.

### `arthur` — Session Chat (Reactive, with Tools)

The target default engine for the Session Chat Process. Reactive: maintains chat with the user, orchestrates worker processes via tool calls (`process.start`, `process.steer`, `process.stop`), never reaches `done`.

See **[arthur-engine](/docs/arthur-engine)** — it simultaneously contains the concrete framework API (Interface, Context, SteerMessage, Pending Queue, Persistence Integration) that all Engines are based on.

### `marvin` — Deep-Think (Dynamic Task-Tree)

Asynchronous tree runner: persistent, dynamically growing task tree (PLAN/WORKER/USER_INPUT/AGGREGATE nodes). Synchronous worker pattern (Marvin drives worker lane directly, reads structured JSON output, routes). User I/O is indirect — Marvin forwards via `summarizeForParent` to Arthur, who decides whether it's an Inbox item.

See **[marvin-engine](/docs/marvin-engine)**.

### `vogon` — Strategy-Runner (Deterministic Multi-Phase Choreography)

Reads YAML strategies (bundled in `strategies.yaml`, later also Tenant/Project Mongo) and executes them phase-by-phase. Per phase: worker spawn (Recipe-driven, synchronous) → optional Inbox checkpoint → gate evaluation → next phase. State persistent in `engineParams.strategyState`, brain-restart-safe. v1: linear phase list, AND/OR gates. v2: loops, forks, escalations, bounds.

See **[vogon-engine](/docs/vogon-engine)**.

### `zaphod` — Multi-Head-Council (Horizontal Multi-View)

Multiple independent heads (each a Ford sub-Process with its own Persona) address the same question; a synthesizer LLM call combines the answers into a single recommendation with consensus / differences / conclusion. v1: only `council` pattern, sequential heads, direct synthesizer LLM call. v2: parallel heads, further patterns (`debate`, `generator-critic`, `branch-and-vote`).

See **[zaphod-engine](/docs/zaphod-engine)**.

### `deep-think` — Batch-like Deep Analysis (Historical)

First sketch of an LLM-generated task tree planning. Replaced by `marvin` — `marvin` is the concrete implementation of this pattern. Entry remains for historical vision; see `marvin-engine.md` for the current status.

References: [vision §6 Think Engine](/docs/vision), [workflows](/docs/workflows), brainstorming think flow (historical).

### `agrajag` — Tool Health Diagnosis (Service Engine)

First Service Engine (see §7b). Diagnoses ambiguous tool errors, classifies them, writes the tool health state to `tool_health`. Spawn is not user-driven but from an `AgrajagChecker` in the Tool Dispatch path or via a System Event Queue. Two-layer model — the synchronous checker performs 80–90% of the classification programmatically without LLM; only ambiguous cases go to the LLM Engine.

See **[agrajag-engine](/docs/agrajag-engine)** and **[tool-availability](/docs/tool-availability)**.

### Further — Not Binding

The Registry opens the way for further algorithms. Concrete names and specifications will only come when we actually build them — **do not anticipate**. Brainstorming directions (no commitment): lighter variants without iteration, multi-perspective variants with multiple roles, strictly template-driven variants without LLM planning.

---

## 7a. Hierarchy Role: Top-Level vs. Sub — a Recipe Property

Engines are **generically nestable**. A concrete process has a **hierarchy role** (Top-Level or Sub), but this is **not in the Engine code**, but determined by the *Recipe* with which the process was spawned.

**Specifically:**

| Component | Carries what |
|---|---|
| **Engine Code** | Algorithm + Default Tool Pool (`allowedTools()`). Does **not** know if the running process is top or sub. No `if(parentProcessId == null)` logic. |
| **Recipe** | Configuration of a use case: Prompt + Param Defaults + `allowedToolsAdd`/`allowedToolsRemove`. Makes an Engine either a Top-Level or a Sub Process. |
| **Spawner** | Selects the appropriate Recipe for the spawn context (Session Bootstrap → `arthur`-Recipe; Vogon Phase → a Sub-Recipe). |

**The central consequence: User I/O tools (`inbox_post` etc.) belong in Top-Level Recipes — not in the Engine Default.**

Today, exactly one Top-Level Recipe (`arthur`) exists — its Engine `arthur` has `inbox_post` in the default pool, its Recipe Prompt is geared towards user chat. Other Engines (`marvin`, `ford`, possibly `vogon`) do *not* have `inbox_post` in the default pool; their default Recipes (`marvin`, `ford`, `marvin-worker`) are sub-oriented.

**Future extensions without Engine code changes:**

```yaml
# Sub-variant of a currently top-level Engine:
- name: arthur-sub
  engine: arthur
  promptPrefix: |
    You are a sub-Arthur under a Vogon. Your result flows
    back to your caller. You do NOT talk directly to the user.
  allowedToolsRemove: [inbox_post]

# Top-Level variant of a currently sub-oriented Engine:
- name: vogon-cron
  engine: vogon
  promptPrefix: |
    You are an automatic workflow runner without user chat. At the end,
    create an OUTPUT_TEXT inbox item with your synthesis.
  allowedToolsAdd: [inbox_post]
```

The Engine code doesn't need to know anything for this — it has its default pool, the Recipe modifies it, the `ContextToolsApi` filters tool calls against the effective pool. If it's not in the pool, it can't be called, simple as that.

**What flows up the hierarchy:**

No matter where a process is located: when it transitions to a terminal status (`DONE`, `BLOCKED`, `STOPPED`, `FAILED`), its **Parent** is notified via a `ProcessEvent`. The content of the event is provided by the Engine itself via the hook:

```java
default ParentReport summarizeForParent(
        ThinkProcessDocument process, ProcessEventType eventType);
```

Default produces a generic status line. Engines that synthesize an independent final result (Marvin's Tree-AGGREGATE, Vogon's phase synthesis) override the hook and provide the actual content — `humanSummary` (Markdown for LLM consumption) plus optional `payload` (structured for workflow orchestrators).

`ParentNotificationListener` calls the hook on every relevant status transition. Top-level processes (no parent) ignore the signal — they have user I/O tools in the pool and use them directly (e.g., Arthur `inbox_post` with the rule of thumb in the Recipe Prompt: for substantial DONE reports, an Inbox item; for quick lookups, only chat).

**This makes arbitrary nesting depth recursively consistent**: Arthur → Vogon → Marvin, Arthur → Vogon → Arthur-Sub → Ford, all with the same mechanism.

---

## 7b. Service Engine Topology

In addition to Top-Level and Sub Processes (§7a), there is a third topology: **Service Engines**. They are not a separate class hierarchy and not a new interface — but a combination of Recipe markers and spawn mechanics that together result in a different lifecycle than a user worker.

### Worker vs. Service — the Axis

| Aspect | Worker (e.g., Ford as Sub) | Service (e.g., Agrajag) |
|---|---|---|
| Who triggers the Spawn? | A User Engine via `process_create` | System event, AgrajagChecker in the Dispatcher, or REST endpoint |
| Does a Caller wait for the result? | Yes — Parent Engine receives `ParentReport` | No — result is a side effect (Doc update, Inbox item) |
| Output Path | `ProcessEvent` to Parent | Doc update + optional Inbox item |
| Owner Session | Parent's User Session | System Session per project with `system: true`, `userId: _system` |
| User Visibility | Indirect (via Parent in chat) | Hidden — only via Inspector / Admin UI |
| Lifecycle | dependent on the task | spawn-per-task, short |

Both topologies share the same Engine lifecycle contract (§3). A Service Engine is, in every structural sense, a regular Think Engine; what makes it a "Service" Engine is the trigger and owner side plus the Recipe markers below.

### Recipe Markers

Service Engines declare themselves in the Recipe:

```yaml
agrajag:
  engine: agrajag
  category: service                   # UI filter, Session listing skip
  roles: [tool-prober, tool-health-writer]
  ...
```

- `category: service` enables UI and listing filters (Process does not appear in the user process list; Session is `system: true`).
- `roles: [...]` are audience tags that match with `requiresEngineRoles` in tool manifests — Service Engines get special tools visible that are not available to other Engines.

### Engine Roles as Audience Filter

Tool manifests can declare `requiresEngineRoles: [...]`. The manifest builder filters during tool listing per Engine — tools whose roles are not carried by the Engine are invisible in the manifest. This ensures that LLM-facing special tools (tool health writer, audit read APIs, repair actors) are **safe even if an Engine knew them by name** — they simply do not exist for it.

Plus an orthogonal `safety` marker (`SAFE_PROBE` vs. `MUTATING`), which an Engine can hard enforce if needed (Agrajag's probe turn only allows `SAFE_PROBE` tools).

### System Session Bootstrap

Service Engines live in a System Session per `(tenantId, projectId, serviceName)`:

- `userId: _system`, `displayName: _<service>`, `system: true`.
- Lifecycle properties: typically `onIdle: SUSPEND`, short `idleTimeoutMs` (e.g., 5 min), `onSuspend: KEEP`.
- Bootstrapping runs analogous to the scheduler pattern — lazy on the first job or eager on project bring-up on the hosting pod.
- User Context Threading: the spawn job carries `originatingUserId`; the Service Process is instantiated with this user in the `ThinkEngineContext` (relevant for tools like Agrajag's `tool_probe_as_user`).

### Who else is coming?

Agrajag is the first concrete Service Engine. Already named in the Adams universe and foreseeable as the same Engine type:

- **Lunkwill** — generic Pi-style Executor Engine, active (see [lunkwill-engine](/docs/lunkwill-engine)). Currently with user-spawnable `coding`-Recipe; planned Service Recipes: `lunkwill-repair` (MCP reconnect, token refresh trigger; roles: `tool-health-writer`, `repair-actor`), `lunkwill-fook-upstream` (GitHub ticket worker).
- **Prak** — Audit Engine (read scan via tool calls + anomaly detection). Roles: `audit-reader`, `audit-writer`.
- **Agrajag** — Failure Tracking (categorizes recurring Engine failures). Roles: `audit-reader`, `failure-tracker`.

The infrastructure defined here (queue with coalescing, System Session bootstrap, Engine roles, `category: service`) is generically designed for all four — see [agrajag-engine §12](/docs/agrajag-engine).

---

## 8. Client View

- **Process Creation** (WS): Client sends Goal + `thinkEngine` (name from Registry). Implicitly bound to the current Session. Default if `thinkEngine` is not specified: `deep-think`.
- **Process List**: queryable per Session; each Process carries status, Goal, Think Engine name, last task, possibly `contextDrift` flag.
- **Discovery**: an endpoint (`GET /think-engines` or WS handler `thinkengines-list`) provides available Registry entries (`name`, `title`, `description`, `defaultSettings`) for selection UIs.
- **Lifecycle Commands**: the client sends high-level commands (`process-create`, `process-start`, `process-pause`, `process-resume`, `process-steer`, `process-stop`, `process-reset`) — the Brain resolves them into lifecycle calls of the Think Engine.

---

## 9. Relationship to Workflows

Workflows (task tree templates, see [workflows](/docs/workflows)) are **orthogonal** to Think Engines. A template instantiates a pre-filled task tree — which Think Engine then executes this tree is a separate selection at Process start.

In v1, every template start is executed with `deep-think`. Later, templates can optionally prescribe a Think Engine (e.g., "this workflow requires the `debate` algorithm"), but this is not v1 scope.

---

## 10. Open Points

- **No Runtime Change of Think Engine:** a Process cannot change its Think Engine. If this ever changes, it will be a version bump with a migration story.
- **Removed Registry Entries:** what happens if a persisted Process has `thinkEngine=x`, but `x` is no longer in the Registry? Default: Process goes into `stale`, no fallback algorithm.
- **Session End Policy for Processes:** are Processes set to `stopped` or deleted with Session close? Details per policy (timeout cleanup, user close, admin force) will be specified when cleanup is built.
- **Process Reassignment (v2):** Reassigning a Think Process to another Session, including Autonomous Session for remote control of a thought process without a local client. Not today, architecture does not block it.
- **Finer Fingerprint Invalidation:** per-file hash or Git-HEAD as an additional fingerprint component. v2, if `machineId + workingDir` proves insufficient.
