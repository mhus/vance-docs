---
title: "Vance — Trillian Engine"
parent: Documentation
permalink: /docs/trillian-engine
---

<!-- AUTO-GENERATED from specification/public/en/trillian-engine.md — do not edit here. -->

---
# Vance — Trillian Engine

> **Trillian** is Vance's **Agentic User Loop** — a layer above
> Arthur/Eddie/Marvin/Lunkwill. From Trillian's perspective, these are the
> tools a human user works with in Vance —
> Trillian *uses* them in the same way, just without a human in front.
> Observe-Think-Act-Reflect as an endless loop that sleeps when there's nothing
> to do.
>
> Trillian is **not** a Worker (Lunkwill is a Worker), **not** a
> Plan-Engine (Marvin / Vogon), **not** a Chat-Host (Arthur / Eddie).
> Trillian is the **human's counterpart** — a user
> proxy with its own identity, session, and permissions.
>
> **Naming Note:** In the Adams universe, Trillian is the rational,
> observant voice of the Heart-of-Gold crew — the only one who doesn't lose sight of the
> overarching goal while Zaphod & Ford cause chaos.
>
> See also: [think-engines](/docs/think-engines) | [lunkwill-engine](/docs/lunkwill-engine) | [arthur-engine](/docs/arthur-engine) | [eddie-engine](/docs/eddie-engine) | [recipes](/docs/recipes)

---

## 1. Role and Classification

| Engine | Character | Owner | Termination |
|---|---|---|---|
| `arthur` | Reactive Session-Chat-Hub | Human | never DONE — STOPPED/SUSPENDED |
| `eddie` | Tenant-Hub, Cross-Project-Coordinator | Human | never DONE |
| `lunkwill` | Multi-Turn-Worker, terminate-driven | spawning user | DONE per Task |
| **`trillian-control`** | **Reply-style Chat-Host, without Action-Schema** | **Human** | **never DONE** |
| **`trillian-user`** | **Endless-but-sleepy Orchestrator, cross-project** | **`_trillian-*` Service-Account** | **never DONE** |

**Use Cases (Vision, actually usable from Nature-A+):**

- PR-Review-Watchdog (Trillian observes GitHub, comments)
- Daily-Briefing from multiple sources
- CI/CD Observer with autonomous reaction
- Cross-Project-Mail-Triage (Mail with PDF → move to target project workspace)
- Long research assignments that run for days

## 2. Architecture: Engine Framework + Nature Behavior

Trillian will evolve structurally. Instead of bending each
generation into the engine, the **behavior layer**
resides in interchangeable `TrillianNature` implementations — the engine
itself only knows the interface.

```
┌─────────────────────────────────────────────────────────────┐
│  TrillianControlEngine / TrillianUserEngine (Framework)    │
│  ──────────────────────────────────────────────────────────  │
│  • Loop mechanism (drainPending, LLM-Call, Tool-Dispatch)    │
│  • Inbox persistence, ChatLog                                │
│  • Cross-Project-Spawn-Routing                              │
│                                                              │
│         │  per Turn: natureRegistry.resolve(                 │
│         ▼            engineParams.nature)                   │
│                                                              │
│  ┌──────────────────────────────────────────────────┐       │
│  │ TrillianNature (Interface)                       │       │
│  │   • id(), title()                                │       │
│  │   • controlPromptAddendum / userPromptAddendum   │       │
│  │   • beforeControlTurn / afterControlTurn         │       │
│  │   • beforeUserTurn / afterUserTurn               │       │
│  │   • userLoopMayTerminate()                       │       │
│  └──────────────────────────────────────────────────┘       │
│         ▲                                                    │
│         │ implemented by                                  │
│  ┌──────┴────────────────┐                                  │
│  │ TrillianNature0       │  Nature-0: all defaults         │
│  │ TrillianNatureA  …    │  Nature-A: personality, …    │
│  └───────────────────────┘                                  │
└─────────────────────────────────────────────────────────────┘
```

**To create a new Nature** = a Spring `@Component` with the correct
`id()` plus override of the relevant hooks. The `TrillianNatureRegistry`
indexes on boot. Recipes pin via `params.nature: '<id>'`.

**Nature Versioning:**

- **`trillian-0`** — Architecture spike. **Current implementation.**
  Proves two-session mechanism, cross-project spawn, true
  identity separation. No personality, no reflection, no
  persistence — all Nature hooks at defaults.
- **`trillian-a`** (Nature-A, coming) — persistent Trillians with
  their own home project, simple reflection after task completion.
- **`trillian-b`** … — Personality, Traits, Mode-Switch, Token-
  Budget.

Test Natures get digit IDs (`0`-`9`); Production Natures
letter IDs (`A`-`Z`).

**Recipe Convention:**

| Recipe | Meaning |
|---|---|
| `trillian` | Alias to current default Nature (today Nature-0) |
| `trillian-0` | Pinned Nature-0 (survives default change) |
| `trillian-a` | Pinned Nature-A (coming) |
| `trillian-user-<n>` | User-Loop-Recipe per Nature |
| `trillian-worker-<n>` | Per-Task Worker per Nature |

## 3. Two-Session Architecture

```
Tenant: acme  /  Project: <Human's current project>

  Session 1 — Control
    Owner: Human (Session-Owner)
    Profile: foot / web  (bound connection)
    Engine: trillian-control
    Primary process: 'chat'
    Tools: task_enqueue + user_* control-tools

         │ task_request ProcessEvent (cross-session)
         ▼

  Session 2 — Trillian-User  (system=true, headless)
    Owner: _trillian-0XXXX (Service-Account)
    Engine: trillian-user
    Primary process: 'trillian-user-loop'
    Tools: project_list, process_create, cross_process_create,
           process_steer, process_status, process_history_text,
           peer_read_chat_memory, task_complete/failed/needs_input

         │ cross_process_create(projectId=X, recipe=trillian-worker-0)
         ▼

  Worker-Process — per Task, in the Trillian-User-Session but with
  process.projectId = <Target-Project>
    Owner: _trillian-0XXXX
    Engine: lunkwill (via trillian-worker-0 recipe)
    Tools: full Worker-Toolset (doc_*, file_*, exec_*) +
           trillian_done for Termination
```

**Why two sessions:**

| Aspect | Sibling-Processes (discarded) | Two Sessions (Nature-0) |
|---|---|---|
| Identity at runtime | `userId` from Session = Human — `_trillian-*` is phantom | Trillian-User runs as `_trillian-*` (own Session-Owner) |
| Tool-Surface | Trillian inherits foot-Connection from human → can use `client_*` directly | Trillian-User-Session is headless → `client_*` is structurally missing |
| Chat-Pollution | Worker-Replies leak into Human-Chat | Own Session = own Chat-Container |
| Permissions/Audit | wrong identity, wrong writer | correct identity, correct audit trail |

## 4. Engine Classes

### 4.1 TrillianControlEngine

- **Loop:** reply-style — drainPending → LLM-Turn → possibly Tool-Calls →
  natural-stop → IDLE. Wakeup on User-Input OR incoming
  task-event ProcessEvents.
- **No structured-action-schema** (unlike Arthur/Eddie). Tools
  selected directly by LLM; saves tokens + prevents the DELEGATE-
  funnel trap (Arthur's structured "DELEGATE" action type
  forced the LLM into `process_create` indirection, which is
  semantically incorrect for Trillian).
- **Engine-Role:** `trillian-control` — gates the Control-Tools
  (`task_enqueue`, `user_*`).
- **Model-Default:** `default:analyze,default:fast` — Analyze-Tier
  primarily because Gemini-Flash occasionally
  delivers finish=STOP with output=null for ambiguous tool sets.
- **Single-Retry-on-empty** in the loop logic against the Gemini quirk.

### 4.2 TrillianUserEngine

- **Loop:** endless-but-sleepy, Lunkwill-like pattern. drainPending →
  LLM → Tools → repeat → natural-stop = IDLE. No `_terminate`,
  no wallclock/idle-stuck safety nets (Orchestrator, not Worker).
- **`allowsCrossProjectSpawn=true`** — Trillian-User can spawn
  Workers in external projects via `cross_process_create`.
- **`asyncSteer=true`** — Trillian-Control does not wait synchronously during
  `task_enqueue` dispatch.
- **Engine-Role:** `trillian-user`.
- **Model-Default:** `default:analyze,default:fast`.

### 4.3 Worker-Engine: Lunkwill with trillian-worker-Recipe

- Lunkwill as engine. **Own Recipe** `trillian-worker-<n>` with:
  - Full doc/file/exec Tool-Surface
  - **`trillian_done(summary, data?)`-Tool** as mandatory termination
    (see §6)
  - Prompt discipline: "always call `trillian_done` at task end,
    never natural-stop"
- Worker has `parentProcessId = trillian-user-loop.id` — DONE-Event
  flows back to Trillian-User via `ParentNotificationListener`.

## 5. Task-Lifecycle

```
Human                Control               Trillian-User             Worker
  │  "task X"            │                       │                       │
  ├─────────────────────►│                       │                       │
  │                      │ task_enqueue(desc)    │                       │
  │                      ├──────────────────────►│ task_request event    │
  │ "Queued (taskId=…)"  │                       │                       │
  │◄─────────────────────┤                       │                       │
  │                      │                       │ cross_process_create  │
  │                      │                       ├──────────────────────►│ spawn
  │                      │                       │                       │ doc_list (in X)
  │                      │                       │                       │ trillian_done(summary)
  │                      │                       │                       │ → CLOSED (DONE)
  │                      │                       │ DONE event with       │
  │                      │                       │ enriched summary      │
  │                      │                       │◄──────────────────────┤
  │                      │                       │                       │
  │                      │                       │ task_complete(        │
  │                      │                       │    taskId, result)    │
  │                      │ task_done event       │                       │
  │                      │◄──────────────────────┤                       │
  │ "Done — N Docs."     │                       │                       │
  │◄─────────────────────┤                       │                       │
```

Routing between sessions is Vance standard: `EngineMessageRouter`
dispatches by-processId, transparently crossing session/pod boundaries.

## 6. Trillian-Specific Tools

| Tool | Role-Gate | Caller | Purpose |
|---|---|---|---|
| `task_enqueue(description)` | `trillian-control` | Control | Push task to User-Loop-Inbox |
| `user_status` | `trillian-control` | Control | Status + Inbox-Depth of User-Loop |
| `user_stop` / `user_continue` | `trillian-control` | Control | Pause/resume User-Loop |
| `user_clear` / `user_reset` | `trillian-control` | Control | Clear Inbox / Soft-Reset |
| `user_attr_set(name, value)` | `trillian-control` | Control | Set free-form attribute on User-Loop |
| `user_attr_clear` / `user_attr_list` | `trillian-control` | Control | Delete all attributes / list them |
| `task_complete(taskId, result)` | — | User-Loop | Task success to Control |
| `task_failed(taskId, reason)` | — | User-Loop | Task failure to Control |
| `task_needs_input(taskId, question)` | — | User-Loop | Escalation to Control |
| `cross_process_create(projectId, recipe, name, goal, …)` | `trillian-user` | User-Loop | Spawn Worker in any project |
| `peer_read_chat_memory(processName)` | — | User-Loop | Observe sub-worker live |
| `trillian_done(summary, data?)` | — | Worker | Signal DONE + Summary in chatLog |
| `trillian_session_create(initialMessage)` | — | external Engines | Spawn Trillian-Session via Tool (Default-Nature) |
| `trillian_session_send(sessionId, message)` | — | external Engines | Address existing Trillian-Session |

## 7. Cross-Project Mechanism

Trillian-User can spawn Workers in external projects via
`cross_process_create(projectId, …)`. Mechanism:

1. Tool validates: `projectId` exists in Tenant + is not
   SYSTEM.
2. Tool dispatches via `ActionExecutorRegistry` with `TriggerContext.
   sessioned(tenantId, projectId=TARGET, …)` — overwrites
   `ctx.projectId()` in the Action path.
3. `SpawnActionExecutor` calls `ThinkProcessService.create` with
   `projectId=TARGET`. Prerequisite: Engine must
   declare `allowsCrossProjectSpawn=true` — Trillian-User does.
4. Spawned Worker has `process.projectId=TARGET`,
   `process.sessionId=Trillian-User-Session.id`.

**Unlike Eddie:** Eddie's `DELEGATE_PROJECT`/`STEER_PROJECT`
run via structured-action-schema and create a NEW Session
in the target project. Trillian's `cross_process_create` is a direct
tool without a structured-action funnel, and the Worker lands in
Trillian's own session with projectId-override — no new
session lifecycle per task. Result: fewer sessions in the tenant, all
workers of a Trillian kept together under one session,
parallelizable.

## 8. Bootstrap

`TrillianSessionBootstrapper` is called by `SessionChatBootstrapper`
after the Chat-Process has been created. Trigger:
`process.thinkEngine == "trillian-control"` (Nature-agnostic — the
recipe alias `trillian` and all future Nature recipes trigger
the same bootstrap path).

Sequence:

1. Create `_trillian-0XXXX`-Service-Account (5-digit random
   numbers, uniqueness check in the Tenant; Production Natures later
   with first name pool `_trillian-alicia` etc.).
2. Read Nature from `controlProcess.engineParams.nature` (Default `0`).
3. User-Recipe-Name = `trillian-user-` + nature; resolve via
   `RecipeResolver.applyDefaulting`.
4. Create second session — Owner = `_trillian-*`, Profile = `headless`,
   `system=true`, in the **same project** as Control.
5. Spawn Primary Process `trillian-user-loop` in the second session,
   `parentProcessId = controlProcess.id` (cross-session parent).
6. Set cross-references in `engineParams` of both Processes
   (`peerProcessId`, `peerSessionId`, `trillianUserName`).
7. Start User-Process on its own Lane (`thinkEngineService.start`
   blocking via LaneScheduler).

## 9. Cleanup-Lifecycle

`TrillianCleanupListener` listens for `ThinkProcessStatusChangedEvent`
with `newStatus == CLOSED`. If the closing Process has the
`trillian-control`-engine:

1. Read Peer-Session-Id from `engineParams.peerSessionId`
2. `SessionLifecycleService.closeWithCascade(peerSessionId)` —
   closes the User-Loop-Process + all Worker-Processes
3. Delete `_trillian-*`-Service-Account (`UserService.delete`)

Ephemeral in Nature-0 — no persistence, no user recycling.

## 10. ProcessEvent Persistence

Both Engines (`TrillianControlEngine`, `TrillianUserEngine`)
persist **all** non-UserChatInput SteerMessages
(ProcessEvent, Reply, ToolResult, ExternalCommand) as USER-role in
`ChatMessageDocument`. Background:

Without persistence, a ProcessEvent only lives in the current Lane-Turn
(as an extras list). After natural-stop, it disappears. For
multi-turn correlation — task_request (Turn N) ↔ worker-reply
(Turn N+M) — the LLM can no longer find the `taskId` in N+M.
Persistence makes the XML-rendered Event-Markup a permanent
part of the Chat-History, which the LLM sees as context in every turn.

`SteerMessage.Reply` (Worker-natural-stop) and
`SteerMessage.ProcessEvent` (terminal DONE/FAILED) are
rendered differently (`<worker-reply …>` vs.
`<process-event type="done" …>`) — both are explained in the
Trillian-User-Prompt as valid Task-Result signals.

## 10a. Trillian-User-Attributes (free-form)

Control can set arbitrary Key-Value pairs on the Trillian-User-Loop-Process
via `user_attr_set(name, value)`. Storage:
`process.engineParams.attributes` (`Map<String, Object>`). In
Nature-0 ephemeral with the session; from Nature-A+ this moves to a
Home-Project-Document (analogous to Eddie's Personality-Pattern).

The active `TrillianNature` decides how the attributes are interpreted.
Nature-0 does both:

- **`userPromptAddendum(process)`** — renders
  `process.engineParams.attributes` (= the User-Loop's own attributes)
  as a Markdown block in the User-Loop-Prompt.
- **`controlPromptAddendum(process)`** — follows
  `process.engineParams.peerProcessId` to the User-Loop and renders
  **the same** attributes also in the Control-Prompt.

This makes Control + User-Loop **consistent**: if the human
sets `user_attr_set(persona="funny Swabian who only speaks Swabian …")`,
both Control's chat response and all spawned Workers speak in the
style of this persona. Storage remains single-source-of-truth on the
User-Loop; Control reads cross-process via Peer-Lookup.

Render example (same markup on both sides, only one word
context different):

```markdown
## Attributes (currently active on this Trillian)
- **persona:** funny Swabian who only speaks Swabian
- **language:** German
- **tone:** factual
```

Nature-A+ can read the same map as a typed Persona-Schema
(Traits-Vector, Mode-Default, Token-Budget-Hint), as a Memory-Cascade-
source for Reflection-Phases, or as a Routing-Hint for Sub-Worker-
Recipe selection. The convention of attribute names is up to the Control-
LLM — Nature documentation recommends well-known names per Nature. And yes:
Nature-A can **decide differently** whether Control should also
see the attributes (e.g., if Control only delegates instead of
answering itself) — the hook is overridable.

Tools: `user_attr_set` / `user_attr_clear` / `user_attr_list`,
all engine-role-gated to `trillian-control`. API:
`TrillianInternalApi.setPeerAttribute` /
`clearPeerAttributes` / static `readAttributes(process)`.

## 10b. Resilience: Pod-Restart, Cross-Pod-Move, Suspend

Trillian is persistent in Mongo (Session/Process-Documents,
ChatMessage-History, Engine-Inbox-Messages, engineParams.attributes).
In-Memory are only the Lane-Queue + the Foot-WS-Binding of the
Control-Session — both are reconstructible on boot.

**Pod-Pinning:** Sessions follow their project's home cluster
(`ProjectDocument.homeCluster`). `ProjectManagerService.
claimForLocalPod` is atomic via Mongo-findAndModify — at
runtime there is exactly **one** Pod that runs the Lanes of the
Trillian-User-Loop. In case of Pod-Failure: `ProjectStartupReclaimer`
resolves stale Claims, the next Pod takes over, Lanes wake up via
`EngineMessageService.findInboxedByTargets` on boot.

**Suspend Behavior:** Trillian runs daemon-style — Control-Recipes
(`trillian.yaml`, `trillian-0.yaml`) explicitly set
`onIdle: NONE`, and `TrillianSessionBootstrapper` explicitly pins the same
Daemon-Policy to the User-Session via
`SessionService.applyLifecycleConfig`. Thus:

- Async `task_done`-Events from the User-Loop are processed even
  when the human is not actively chatting
- Control does not wait for Resume-Cascade on reconnect
- Sweeper (`SessionIdleSweeper`) automatically skips NONE-Sessions

`onSuspend: KEEP` with Default `suspendKeepDurationMs: 24h`. For
explicit suspend action (e.g., via `process_pause`), there is a 24h
period before the Suspend-Sweeper closes — enough buffer for longer
breaks.

**Cross-Project-Worker on Pod-Move:** Worker-Process has
`process.projectId = Target-Project`, the Pod that claims this
Target-Project runs the Lane. If Trillian-User-Session is in
Project A (Pod 1) and Worker for Project B is spawned (Pod 2),
this is normal Vance Cross-Pod operation — `EngineMessageRouter`
routes ProcessEvents between the Pods.

## 11. Worker Termination and `enrichWithLastReply`

Lunkwill in worker-mode skips its normal `persistAssistantReply`-path
during tool-terminate — therefore, Workers that
terminate via `trillian_done` must write the Summary **themselves** to
`chatLog`. `TrillianDoneTool` does this before returning
the `_terminate=true`-Result:

1. Look up current Process from `ctx.processId()`
2. Append Summary as ASSISTANT-Message to `ChatMessageDocument`
3. Return Result-Map with `_terminate=true` + summary

This allows `ParentNotificationListener.enrichWithLastReply` to find the
Summary and append it to the DONE-ProcessEvent. Trillian-User
receives the actual Summary instead of the generic "Child process X
status=done".

## 12. Vance-Core Adaptation — `ThinkEngineService.newContext`

Before Trillian, `ThinkEngineService.newContext()` always read the `projectId`
for the `ToolInvocationContext` from the Session
(`session.getProjectId()`). For Cross-Project-Workers
(`process.projectId != session.projectId`), this led to
tools like `doc_*` / `file_*` always operating on the Session-Project,
not on the Worker-Project.

Fix (Trillian prerequisite, generally valid):

```java
String processProjectId = process.getProjectId();
String projectId = (processProjectId != null && !processProjectId.isBlank())
        ? processProjectId
        : session.getProjectId();
```

Process-projectId takes precedence. Risk-free for non-cross-project
Engines (where both are the same). Eddie's `DELEGATE_PROJECT` is
unaffected, as a new session is created in the target project anyway.

## 13. Nature-0 Limitations

Deliberately excluded (coming from Nature-A):

- **Personality** (Traits, Principles)
- **Reflection Phases** (light / full / error analysis / periodic)
- **Mode-Switch** Low/High/Sleep with Cadence-Tiering
- **Token-Budget** Soft/Hard with Setting-Cascade
- **Plan-Revision** / Correction-Check between Sub-Goals
- **Trillian-User-Persistence** beyond Session-Destroy
- **Own `_user_<trillian-name>`-Home-Project** (persistent Trillians)
- **True ACL** for `_trillian-*` (granular cross-project rights —
  currently runs on `AllowAllPermissionResolver`)
- **Self-Evolution** of Traits between Runs
- **Cortex-Right-Panel-Display** for Trillian-User-Status

These points will be reflected in Nature-A+ as overrides of the
`TrillianNature`-Hooks — no new engine construction needed.

## 14. Tenant-Setup & Discovery

Bundled-Default-Recipes (in the cascade under
`vance-brain/src/main/resources/vance-defaults/_vance/recipes/`):

- `trillian.yaml` — Default-Alias (today Nature-0)
- `trillian-0.yaml` — Pinned Nature-0 Control
- `trillian-user-0.yaml` — Pinned Nature-0 User-Loop
- `trillian-worker-0.yaml` — Pinned Nature-0 Worker

Foot-Start:

```bash
java -jar vance-foot.jar chat --recipe trillian       # default-Nature
java -jar vance-foot.jar chat --recipe trillian-0     # pinned Nature-0
```

Brain-Logs during Bootstrap show identity assignment + session pair:

```
Minted Trillian service-account '_trillian-0XXXX' for control session '…'
Trillian user-session created id='…' owner='<trillian-id>' project='…'
TrillianUser.start tenant='…' session='<user-session>' id='<user-process>'
Bootstrapped Trillian pair: control id='…' session='…' / user id='…' session='…' trillianUser='_trillian-0XXXX'
```

## 15. References

- `planning/trillian-engine.md` — Design process history (v1
  Sibling-Processes → v2-Pivot to Two-Sessions, discussion of
  Eddie reuse, Cross-Project-Pattern decision,
  Chinese Whispers analysis). Remains as design note; this spec is
  authoritative.
- `instructions/trillian-engine.md` — Original idea + Nature
  concept (letter/digit prefix, evolution path).
- `specification/think-engines.md` — Engine-Registry,
  `allowsCrossProjectSpawn`, Lifecycle contract.
- `specification/lunkwill-engine.md` — Worker-Loop-Pattern,
  `_terminate`-convention, ParentNotificationListener.enrichWithLastReply.
- `specification/eddie-engine.md` — Cross-Project-Pattern via
  structured-action-schema; Trillian deliberately chooses a different path.
- `specification/recipes.md` — Recipe-Cascade, `allowedToolsAdd` vs.
  spawn-time-membership.
- `specification/architektur-scopes-clients.md` — Session/Process-
  Scope hierarchy.
- `CLAUDE.md` section "Think-Process / Scope Peculiarities" —
  ProcessEvent, drainPending, Auto-Wakeup.
