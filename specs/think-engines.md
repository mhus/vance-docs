---
title: "Vancetope — Think Engines and Think Processes"
parent: Specs
permalink: /specs/think-engines
---

<!-- AUTO-GENERATED from llm/specification/think-engines.md (translated from the German specification/public/think-engines.md) — do not edit here. -->

# Vancetope — Think Engines and Think Processes

> A **Think Engine** is an interchangeable algorithm. A **Think Process** is a running instance that operates according to the algorithm of a Think Engine. The architecture is designed for multiple, named, registered Think Engines. Registered engines (as of code, the registry is the source of truth) include:
>
> - **Session/Chat:** [`arthur`](/specs/arthur-engine), [`eddie`](/specs/eddie-engine), [`zaphod`](/specs/zaphod-engine) (Multi-Head-Council)
> - **Worker:** [`ford`](/specs/ford-engine), [`frankie`](/specs/frankie-engine), [`benjy`](/specs/benjy-engine), [`wonko`](/specs/wonko-engine) (Review-Loop)
> - **Depth/Structure:** [`marvin`](/specs/marvin-engine), [`vogon`](/specs/vogon-engine)
> - **Mass/Decision:** [`wowbagger`](/specs/wowbagger-engine), [`zem`](/specs/zem-engine), [`jeltz`](/specs/jeltz-engine)
> - **Autonomy:** [`trillian`](/specs/trillian-engine) — technically four engines: `trillian-control`, `trillian-head`, `trillian-user`, `trillian-worker`
> - **Authoring/System:** [`slartibartfast`](/specs/slartibartfast-engine), [`hactar`](/specs/hactar-engine), [`agrajag`](/specs/agrajag-engine)
> - **Addon (experimental):** [`nutrimat-*`](/specs/nutrimat-engine) — one engine per loop type
>
> Not engines, but often mentioned alongside them: the workflow runtime `magrathea` ([workflows](/specs/workflows)) and the trigger subsystem `ursa`.
>
> **Engines vs. Recipes:** Engines are the algorithm layer (few, structurally distinct classes). The *user-facing* configuration is called a **Recipe** — named bundles of Engine + Default-Params + Prompt-Prefix + Tool-adjustments. Recipes are the view with which Arthur and clients spawn processes. Details: [recipes](/specs/recipes).
>
> See also: [vision §6 Think Engine](/specs/vision) | [workflows](/specs/workflows) | [architecture-scopes-clients](/specs/architektur-scopes-clients) | [arthur-engine](/specs/arthur-engine)

---

## 1. Concepts

The two terms are clearly separated:

| Term | What it is |
|---------|-----------|
| **Think Engine** | The **algorithm** (class / implementation) by which thinking occurs. Stateless with respect to a concrete instance. Registered with a unique name in the Think Engine Registry. |
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
| `defaultSettings` | Settings-Schema | (Spec-only, **not implemented in v1**) Typed parameter schema of the Engine. Currently, this information is carried by the Engine's associated Recipe (see [recipes](/specs/recipes) §10) as an untyped map; schema validation is an open point. |
| `allowedTools` | `Set<String>` | Default tool whitelist of the Engine. Recipes can overlay `allowedToolsAdd`/`Remove`. Empty Set = unrestricted. |
| `version` | Semver | For compatibility checks when resuming persisted Processes |

The Registry is implemented as a Spring service (`ThinkEngineService`) with auto-discovery via `List<ThinkEngine>` autowire.

A **plugin mechanism** (third parties bringing their own Think Engines) is **not in v1**. In v1, all entries are hardcoded in the Brain.

**Role vs. Recipe:** The Engine determines the *behavior* (lifecycle, Inbox handling, tool loop, streaming). The *appearance* (system prompt, validator wording, default params, tool whitelist adjustment) resides in the Recipe. When a Process is spawned, the appropriate Recipe (either explicitly named or via the `engine`-name convention) is copied to the Process (snapshot); the Engine consumes the override fields from the Process during a turn, not directly from the Recipe. This ensures that running Processes survive Recipe edits unchanged, and Engines remain stateless.

---

## 3. Think Engine Lifecycle Contract

Every Think Engine implements a unified lifecycle interface. All calls receive the `ThinkProcessDocument` (mutable persistence) and a `ThinkEngineContext` (access surface, §4). The Think Engine class itself is **stateless** — it holds no reference to a concrete instance, and no runtime-relevant state resides in instance variables.

| Method | Purpose |
|---------|-------|
| `start(process, context)` | Initial entry from `INIT` status. Initial plan (task tree) from Goal + context. The first task is prepared and executed either directly or after user approval, depending on the Think Engine. Status transition: `INIT → IDLE` (or `RUNNING` if `start` directly performs a turn). |
| `pause(process, context)` | **User-driven pause.** The Lane completes the current turn up to the next safe boundary (tool boundary, step boundary, LLM call end — engine-specific) and then stops. Process goes to `PAUSED`. Control messages are still accepted but do **not** trigger a Lane wakeup until `resume` is called. Distinction from `suspend`: `suspend` is *system-driven*, `pause` is *user-driven*. Wakeup behavior is identical (no auto-wakeup), triggers and resume triggers are different — see [session-lifecycle §3 + §11](/specs/session-lifecycle). |
| `resume(process, context)` | Resume from `PAUSED` or `SUSPENDED`. The Lane is re-enabled, drains all pending messages (including control messages that arrived in the interim) and performs a turn. Status transition: `PAUSED / SUSPENDED → IDLE → (drain) → RUNNING`. |
| `suspend(process, context)` | **System-driven halt.** Triggers: Session suspend cascade (disconnect with `onDisconnect=SUSPEND`, idle sweep), pod shutdown, lease loss. Status transition: → `SUSPENDED`. The runner stops at the next boundary, state remains in the `process`. Is *not* called by the pause path. |
| `steer(process, context, message)` | User provides new information/direction at runtime. The Think Engine decides how to integrate the information into memory and plan. Allowed in `RUNNING`, `IDLE`, `BLOCKED`, `PAUSED`; in the `PAUSED` case, the correction waits in the pending queue for `resume`. A message arriving **during a running turn** is queued and picked up at the next loop boundary (active message queue — "Further Contract Requirements", `planning/active-message-queue.md` §4 P1). |
| `stop(process, context)` | Final stop by user or parent. Status transition: → `CLOSED` with `closeReason=STOPPED`. No further continuation. |

### Further Contract Requirements

- **Lane serialization:** all lifecycle calls for a Process run serially through its Think Process Lane. The Think Engine does not need to be thread-safe. See [architecture-scopes-clients §5](/specs/architektur-scopes-clients).
- **Pause/Resume across Brain Restart:** all runtime-relevant data lives in the `ThinkProcessDocument`. After a Brain restart, every Process must be resumable from its persisted state.
- **Version Compatibility:** in case of an incompatible `version` difference between persistence and resume, the Process goes into `stale`; it is not automatically resumed.
- **No own LLM Clients / Tool Handles:** all external accesses run exclusively through the `ThinkEngineContext`.
- **Active Message Queue (pickup at loop boundary):** Inbound messages arriving during a turn reside in the Inbox until the Engine picks them up at a **safe boundary** (after a completed tool result, before the next LLM call — never in the middle of a tool chain). `context.hasPending()` indicates "something is pending"; the pickup itself is **opt-in per Engine** (`pickupPendingMidLoop`, default off — deterministic runners like Hactar/Wowbagger/Vogon retain turn-atomic processing, sub-processes likewise: their turn is awaited by the parent). The aborted round ends without a terminal action and outputs its in-turn narration as an ASSISTANT message; the picked-up message is processed as current-turn input in the next turn. The persist-bound `process-steer`-Ack is the client side of the same chain — `planning/active-message-queue.md` §2 + §4 P1.

---

## 4. ThinkEngineContext

The `ThinkEngineContext` is the **only access surface** a Think Engine receives at runtime. It abstracts:

| Area | Content |
|---------|--------|
| **Knowledge** | Memory API with scope cascade (Tenant → Project Group → Project → Session), RAG queries, Knowledge Graph access, read access to project documents. |
| **Tools** | Unified Tool Invocation (server-side Tools, client-side Tools via Session, MCP-Tools). The Think Engine calls Tools only via the Context — it does not know whether the Tool runs locally on the client or server-side. |
| **LLM** | Access via `LlmResourceManagement` with per-call client instantiation. The Think Engine does not hold its own LLM clients. |
| **Settings** | Typed Settings with scope cascade. Think Engine's own keys reside in the Think Engine's namespace. |
| **Events** | Streaming of intermediate results and task tree updates to the bound client of the Session. |

The Context is **built fresh for each lifecycle call**. The Think Engine must not cache the Context. Reason: Session state changes (client binding, tool availability, active fingerprint) and the Context must reflect the current state.

**Tool demand is dynamic:** which Tools a task needs is decided at the concrete task — not generally per Think Engine or per Process. Therefore, there is no static tool category declaration at the Engine level. Which Tools are available during a call results from the Session state (client-bound / Autonomous).

---

## 5. Think Process Status and Session Binding

### Status

Seven statuses, plus `closeReason` as a sub-field to `CLOSED`. Full table including wakeup behavior in [session-lifecycle §3](/specs/session-lifecycle); here's the short version:

| Status | When | Auto-Wakeup on new Pending-Msg? |
|--------|------|---|
| `INIT` | Default upon creation, before `engine.start()` | n/a |
| `RUNNING` | Lifecycle call is currently running within the Lane | (running) |
| `IDLE` | Between turns, Pending-Queue empty | **yes** |
| `BLOCKED` | Engine has queried via Inbox, waiting for user response | **yes** (response arrives as Pending-Msg) |
| `PAUSED` | User has explicitly paused | no |
| `SUSPENDED` | System has halted (Cascade, Pod-Shutdown, Lease Loss) | no |
| `CLOSED` | Terminal | (terminal) |

`closeReason` (sub-field to `CLOSED`): `DONE` (Goal reached), `INCOMPLETE` (terminated without Goal, e.g., tool iteration budget exhausted), `STOPPED` (User/Parent stop via `engine.stop`), `FORCE` (Force-Stop: `CLOSED` written off-lane, no `engine.stop` — the cut, see [session-lifecycle §12.1](/specs/session-lifecycle)), `STALE` (Version-Mismatch, stuck), `ARCHIVED` / `USER_DELETE` / `ABANDONED` / `AUTO_CLOSE` (Session cascades, see [session-lifecycle §3](/specs/session-lifecycle)). Audit info, no behavior.

`PAUSED` and `SUSPENDED` have the same wakeup behavior (no auto-wakeup), but different triggers and resume triggers — see [session-lifecycle §3](/specs/session-lifecycle).

**Pause is a request, not an acknowledgment.** It operates via two
channels, and only one is prompt: the halt flag (`requestHalt`) is
written synchronously and is what an Engine loop head reads mid-turn
— this is why ESC works *within* the running turn. The
status change to `PAUSED`, however, is a Lane task and only lands at
the next safe boundary, i.e., after the current model call.

**No one waits for this Lane task.** The Lane one would wait for
is, by design, the busy one — which is why it was paused. The
caller is always a request thread (WS frame, REST), and measurements showed
70s on a single model call, which dragged down the entire WS connection
([live-ws §7.1a](/specs/live-ws)). `pausedProcessNames` in the
response therefore indicates what was *requested*; whoever needs the landed state
listens for the `ENGINE_PAUSED` progress ping.

`INIT` is transient: only `engine.start()` is allowed in `INIT` status; all other lifecycle calls in `INIT` → 409.

### Session as Owner

In v1: **a Think Process belongs to exactly one Session**. The Session is the owner:

- `ThinkProcessDocument` carries `sessionId` as a mandatory field.
- The list of all Processes for a Session is determined by a Session query.
- Session Close (see [session-lifecycle §9](/specs/session-lifecycle)): all non-`CLOSED` Processes run via `engine.stop` and go to `CLOSED` with `closeReason=STOPPED`.
- The Session inherits the `projectId` — the Process is thus implicitly also within the project scope (for memory cascade).

**Not in v1:** Reassigning a Process to another Session (e.g., to an event-driven Session for remote control of a thinking process without a local client). The architecture does not fundamentally block this — the feature will come in v2 (see open points).

---

## 6. Suspend Cascade and Client Fingerprint

### Disconnect Behavior and Suspend Cascade

What happens on client disconnect depends on the typed `onDisconnect` property of the Session (`SUSPEND` / `KEEP_OPEN` / `CLOSE`), not directly on the Profile. The Profile only feeds the defaults during `session-create` via the Recipe — at runtime, the lifecycle machine exclusively reads the property. Consolidated overview in [session-lifecycle §5 + §8](/specs/session-lifecycle); here are the implications for Engines:

| `onDisconnect` | On Disconnect | Engine Impact |
|---------|----------------|-------------------|
| `SUSPEND` | Session → `SUSPENDED` (Cascade), `suspendCause=DISCONNECT` | All non-`CLOSED` Processes → `SUSPENDED`; `engine.suspend(process, ctx)` on each Lane. |
| `CLOSE` | Session → `CLOSED` directly | All Processes → `CLOSED` with `closeReason=STOPPED`; `engine.stop(process, ctx)` on each Lane. |
| `KEEP_OPEN` | Session remains `OPEN` | Engines continue running. A later `SUSPENDED` only occurs via idle detection ([session-lifecycle §7](/specs/session-lifecycle)). |

`SUSPENDED` means: no new lifecycle calls. A currently running call completes up to the next safe point (Lane boundary, next task boundary).

Upon Session resume (new client bind or manual resume, [session-lifecycle §10](/specs/session-lifecycle)), all Processes return to `IDLE` — subject to the fingerprint policy below. `IDLE` ≠ automatic continuation: the next turn only starts when the Pending-Queue contains a message (auto-wakeup) or via explicit `process-resume`. WLAN flickering should not cause a Process to wobble back and forth.

### Client Fingerprint

Client-side Tools (Shell, Filesystem, Git) access **a specific machine in a specific working directory**. If the client context changes between Suspend and Resume, running tool references (e.g., "analyze `./paper.pdf`") point to nothing or — worse — to a completely different file with the same name.

The Session therefore stores a **Fingerprint** upon initial client bind:

- `machineId` — stable device identifier (queryable from OS)
- `workingDir` — absolute path where the client was started
- optional: `userHome`, OS username

Upon Resume, Brain checks the new Fingerprint against the stored one:

| Case | Policy |
|------|--------|
| **identical** | Normal Resume. All Processes go from `suspended` to `ready`. |
| **`machineId` different** | Resume denied (HTTP 409 or WS error code). Client must create a new Session. The old Session remains `suspended` and can be resumed by the original client. |
| **same machine, different `workingDir`** | Resume possible, but Processes remain in `suspended` and get the flag `contextDrift=true`. The user explicitly decides per Process: `resume` (at their own risk), `stop`, or `reset` (delete / restart Process). |

Background for the milder policy with `workingDir` change: the user might intentionally open the same client in a different sub-working directory without affecting the ongoing analysis. The decision lies with the user, not the system.

**Openly recognized:** Client context drift is not fully solvable. Files on the client can be moved, renamed, deleted, changed between Suspend and Resume — without Brain noticing. The Fingerprint policy only addresses the coarse case "different location". Finer invalidation (e.g., hash per referenced file) remains v2+.

---

## 7. Concrete Think Engines

### `ford` — Minimal Chat (Walking Skeleton)

Two heads, no brain. Minimal chat engine: user message → LLM → response. No tools, no memory, no orchestration. Purpose: first implementation to validate the entire Think Engine framework end-to-end. Remains in the Registry afterwards as a debug/smoke test engine.

Until Arthur is production-ready, Ford is the **default** for Interactive Sessions (via setting `session.defaultChatEngine`).

See **[ford-engine](/specs/ford-engine)**.

### `arthur` — Session Chat (Reactive, with Tools)

The target default engine for the Session Chat Process. Reactive: maintains chat with the user, orchestrates Worker Processes via Tool calls (`process.start`, `process.steer`, `process.stop`), never reaches `done`.

See **[arthur-engine](/specs/arthur-engine)** — it simultaneously contains the concrete framework API (Interface, Context, SteerMessage, Pending-Queue, Persistence Integration) that all Engines adhere to.

### `marvin` — Deep-Think (Dynamic Task Tree)

Asynchronous tree runner: persistent, dynamically growing task tree (PLAN/WORKER/USER_INPUT/AGGREGATE nodes). Synchronous worker pattern (Marvin drives Worker Lane directly, reads structured JSON output, routes). User I/O is indirect — Marvin passes via `summarizeForParent` to Arthur, who decides whether it's an Inbox item.

See **[marvin-engine](/specs/marvin-engine)**.

### `vogon` — Strategy-Runner (Deterministic Multi-Phase Choreography)

Reads YAML strategies (bundled in `strategies.yaml`, later also Tenant/Project Mongo) and executes them phase-by-phase. Per phase: Worker spawn (Recipe-driven, synchronous) → optional Inbox checkpoint → Gate evaluation → next phase. State persistent in `engineParams.strategyState`, brain-restart-safe. v1: linear phase list, AND/OR gates. v2: loops, forks, escalations, bounds.

See **[vogon-engine](/specs/vogon-engine)**.

### `zaphod` — Multi-Head-Council (Horizontal Multi-Perspective)

Multiple independent heads (each a Ford sub-process with its own Persona) address the same question; a synthesizer LLM call combines the answers into a single recommendation with consensus / differences / conclusion. v1: `council` pattern only, sequential heads, direct synthesizer LLM call. v2: parallel heads, further patterns (`debate`, `generator-critic`, `branch-and-vote`).

See **[zaphod-engine](/specs/zaphod-engine)**.

### `deep-think` — Batch-like Deep Analysis (Historical)

First sketch of an LLM-generated task tree planning. Replaced by `marvin` — `marvin` is the concrete implementation of this pattern. Entry remains for vision history; see `marvin-engine.md` for the current status.

References: [vision §6 Think Engine](/specs/vision), [workflows](/specs/workflows), brainstorming think flow (historical).

### `agrajag` — Tool Health Diagnosis (Service Engine)

First Service Engine (see §7b). Diagnoses ambiguous tool errors, classifies them, writes the tool health state to `tool_health`. Spawn is not user-driven but from an `AgrajagChecker` in the tool dispatch path or via a system event queue. Two-layer model — the synchronous checker performs 80–90% of classification programmatically without LLM; only ambiguous cases go to the LLM engine.

See **[agrajag-engine](/specs/agrajag-engine)** and **[tool-availability](/specs/tool-availability)**.

### Derivations of Existing Engines (Forks)

Besides new algorithms, there are **derivations**: an Engine that inherits the
algorithm of another and deviates only at named interfaces —
for example, `trillian-worker` and `trillian-head`, both `extends FrankieEngine`.
The rule "new capability = Recipe, not Engine" still applies; a fork is
the exception for precisely what a Recipe cannot do: the consequence of an
outcome (`_terminate` parks instead of closing), tool *membership*
and engine roles, the rendering and persistence of steer messages, an
engine prompt that contradicts that of the base. The base engine documents
its interfaces and derivations in its spec (Frankie:
[frankie-engine](/specs/frankie-engine) §11.4).

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

**The central consequence: User I/O Tools (`inbox_post` etc.) belong in Top-Level Recipes — not in the Engine Default.**

Today, exactly one Top-Level Recipe (`arthur`) exists — its Engine `arthur` has `inbox_post` in the default pool, its Recipe prompt is geared towards user chat. Other Engines (`marvin`, `ford`, possibly `vogon`) do *not* have `inbox_post` in the default pool; their default Recipes (`marvin`, `ford`, `marvin-worker`) are sub-oriented.

**Future extensions without Engine code changes:**

```yaml
# Sub-variant of a currently top-level engine:
- name: arthur-sub
  engine: arthur
  promptPrefix: |
    You are a sub-Arthur under a Vogon. Your result flows
    back to your caller. You do NOT talk directly to the user.
  allowedToolsRemove: [inbox_post]

# Top-level variant of a currently sub-oriented engine:
- name: vogon-cron
  engine: vogon
  promptPrefix: |
    You are an automatic workflow runner without user chat. At the end,
    create an OUTPUT_TEXT inbox item with your synthesis.
  allowedToolsAdd: [inbox_post]
```

The Engine code does not need to know anything for this — it has its default pool, the Recipe modifies it, the `ContextToolsApi` filters tool calls against the effective pool. If it's not in the pool, it cannot be called, simple as that.

**Project Binding: Sub-Process vs. Engine Confinement.** A sub-process
(with `parentProcessId`) remains in its inherited project for project-addressed tools — a hallucinated `projectId` is silently re-routed
(`EddieContext.resolveProject`), a protection against hallucination. Stricter is
the Engine property **`ThinkEngine.confinedToOwnProject()`** (since
2026-10-14): a trust boundary for processes acting on behalf of third parties
(the Trillian conversation head communicates with an external counterpart
with Trillian's rights). A foreign `projectId` is **rejected**
("out of reach") instead of being re-routed — otherwise the model reports the foreign project
as empty —, and a document loaded by ID must be in its own project
(`EddieContext.requireReadableById`).

**What flows up the hierarchy:**

No matter where a process is in the hierarchy: when it transitions to a terminal status (`DONE`, `BLOCKED`, `STOPPED`, `FAILED`), its **Parent** is notified via a `ProcessEvent`. The content of the event is provided by the Engine itself via the hook:

```java
default ParentReport summarizeForParent(
        ThinkProcessDocument process, ProcessEventType eventType);
```

Default produces a generic status line. Engines that synthesize an independent final result (Marvin's Tree-AGGREGATE, Vogon's phase synthesis) override the hook and provide the actual content — `humanSummary` (Markdown for LLM consumption) plus optional `payload` (structured for workflow orchestrators).

`ParentNotificationListener` calls the hook on every relevant status transition. Top-level processes (no Parent) ignore the signal — they have user I/O tools in their pool for this and use them directly (e.g., Arthur `inbox_post` with the rule of thumb in the Recipe prompt: for substantial DONE reports, an Inbox item; for quick lookups, only chat).

**This makes arbitrary nesting depth recursively consistent**: Arthur → Vogon → Marvin, Arthur → Vogon → Arthur-Sub → Ford, all with the same mechanism.

---

## 7b. Service Engine Topology

Besides Top-Level and Sub Processes (§7a), there is a third topology: **Service Engines**. They are not a separate class hierarchy and not a new interface — but a combination of Recipe markers and spawn mechanics that together result in a different lifecycle than a user worker.

### Worker vs. Service — the Axis

| Aspect | Worker (e.g., Ford as Sub) | Service (e.g., Agrajag) |
|---|---|---|
| Who triggers the spawn? | A User Engine via `process_spawn` | System event, AgrajagChecker in the Dispatcher, or REST endpoint |
| Does a caller wait for the result? | Yes — Parent Engine receives `ParentReport` | No — result is a side effect (Doc update, Inbox item) |
| Output Path | `ProcessEvent` to Parent | Doc update + optional Inbox item |
| Owner Session | Parent's User Session | System Session per Project with `system: true`, `userId: _system` |
| User Visibility | Indirect (via Parent in chat) | Hidden — only via Inspector / Admin UI |
| Lifecycle | dependent on task | spawn-per-task, short |

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
- `roles: [...]` are audience tags that match with `requiresEngineRoles` in Tool manifests — Service Engines get special Tools visible that are not available to other Engines.

### Engine Roles as Audience Filter

Tool manifests can declare `requiresEngineRoles: [...]`. The manifest builder filters during tool listing per Engine — tools whose roles are not carried by the Engine are invisible in the manifest. This makes LLM-facing special tools (tool health writer, audit read APIs, repair actors) **safe even if** an Engine would know them by name — they simply do not exist for it.

Plus an orthogonal `safety` marker (`SAFE_PROBE` vs. `MUTATING`), which an Engine can hard enforce if needed (Agrajag's probe turn only allows `SAFE_PROBE` tools).

### System Session Bootstrap

Service Engines live in a System Session per `(tenantId, projectId, serviceName)`:

- `userId: _system`, `displayName: _<service>`, `system: true`.
- Lifecycle Properties: typically `onIdle: SUSPEND`, short `idleTimeoutMs` (e.g., 5 min), `onSuspend: KEEP`.
- Bootstrapping runs analogous to the scheduler pattern — lazy on first assignment or eager on Project Bring on the hosting Pod.
- User Context Threading: the spawn assignment carries `originatingUserId`; the Service Process is instantiated with this user in the `ThinkEngineContext` (relevant for tools like Agrajag's `tool_probe_as_user`).

### Who else is coming?

Agrajag is the first concrete Service Engine. Already named in the Adams universe and foreseeable as the same engine type:

- **Frankie** — generic Pi-style Executor Engine, active (see [frankie-engine](/specs/frankie-engine)). Currently with user-spawnable `coding` Recipe; planned service Recipes: `frankie-repair` (MCP reconnect, token refresh trigger; roles: `tool-health-writer`, `repair-actor`), `frankie-fook-upstream` (GitHub ticket worker).
- **Prak** — Audit Engine (read scan via tool calls + anomaly detection). Roles: `audit-reader`, `audit-writer`.
- **Agrajag** — Failure Tracking (categorizes recurring engine failures). Roles: `audit-reader`, `failure-tracker`.

The infrastructure defined here (queue with coalescing, system session bootstrap, engine roles, `category: service`) is generically designed for all four — see [agrajag-engine §12](/specs/agrajag-engine).

---

## 8. Client View

- **Process Creation** (WS): Client sends Goal + `thinkEngine` (name from Registry). Implicitly bound to the current Session. Default if `thinkEngine` is not specified: `deep-think`.
- **Process List**: retrievable per Session; each Process carries status, Goal, Think Engine name, last task, optionally `contextDrift` flag.
- **Discovery**: an endpoint (`GET /think-engines` or WS handler `thinkengines-list`) provides available Registry entries (`name`, `title`, `description`, `defaultSettings`) for selection UIs.
- **Lifecycle Commands**: the client sends high-level commands (`process-create`, `process-start`, `process-pause`, `process-resume`, `process-steer`, `process-stop`, `process-reset`) — the Brain resolves them into lifecycle calls of the Think Engine.

---

## 9. Relationship to Workflows

Workflows (task tree templates, see [workflows](/specs/workflows)) are **orthogonal** to Think Engines. A template instantiates a pre-filled task tree — which Think Engine then executes this tree is a separate selection at Process start.

In v1, every template start is executed with `deep-think`. Later, templates can optionally prescribe a Think Engine (e.g., "this workflow requires the `debate` algorithm"), but this is not v1 scope.

---

## 10. Open Points

- **No runtime change of Think Engine:** a Process cannot change its Think Engine. If this ever changes, it will be a version bump with a migration story.
- **Removed Registry entries:** what happens if a persisted Process has `thinkEngine=x`, but `x` is no longer in the Registry? Default: Process goes into `stale`, no fallback algorithm.
- **Session end policy for Processes:** are Processes set to `stopped` or deleted with the Session close? Details per policy (timeout cleanup, user close, admin force) will be specified when cleanup is built.
- **Process reassignment (v2):** Reassigning a Think Process to another Session, including Autonomous Session for remote control of a thinking process without a local client. Not today, architecture does not block it.
- **Finer Fingerprint invalidation:** per-file hash or Git-HEAD as an additional Fingerprint component. v2, if `machineId + workingDir` proves insufficient.
