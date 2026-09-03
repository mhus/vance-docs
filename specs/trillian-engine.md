---
title: "Vancetope — Trillian Engine"
parent: Specs
permalink: /specs/trillian-engine
---

<!-- AUTO-GENERATED from llm/specification/trillian-engine.md (translated from the German specification/public/trillian-engine.md) — do not edit here. -->

# Vancetope — Trillian Engine

> **Trillian** is Vancetope's **Agentic User Loop** — a layer above
> Arthur/Eddie/Marvin/Frankie. From Trillian's perspective, these are the
> tools a human user works with in Vancetope —
> Trillian *uses* them in the same way, just without a human in front.
> Observe-Think-Act-Reflect as an endless loop that sleeps when there's nothing
> to do.
>
> Trillian is **not** a Worker (Frankie is a Worker), **not** a
> Plan Engine (Marvin / Vogon), **not** a Chat Host (Arthur / Eddie).
> Trillian is the **human's counterpart** — a user
> proxy with its own identity, its own Session, and its own
> Permissions.
>
> **Naming Note:** In the Adams universe, Trillian is the rational,
> observant voice of the Heart-of-Gold crew — the only one who doesn't
> lose sight of the overarching goal while Zaphod &
> Ford cause chaos.
>
> See also: [think-engines](/specs/think-engines) | [frankie-engine](/specs/frankie-engine) | [arthur-engine](/specs/arthur-engine) | [eddie-engine](/specs/eddie-engine) | [recipes](/specs/recipes)

---

## 1. Role and Classification

| Engine | Character | Owner | Termination |
|---|---|---|---|
| `arthur` | Reactive Session Chat Hub | Human | never DONE — STOPPED/SUSPENDED |
| `eddie` | Tenant Hub, Cross-Project Coordinator | Human | never DONE |
| `frankie` | Multi-Turn Worker, terminate-driven | spawning user | DONE per Task |
| **`trillian-control`** | **Reply-style Chat Host, without Action Schema** | **Human** | **never DONE** |
| **`trillian-user`** | **Endless-but-sleepy Orchestrator, cross-project** | **`_trillian-*` Service Account** | **never DONE** |

**Use Cases (Vision, actually usable from Nature-A+):**

- PR Review Watchdog (Trillian observes GitHub, comments)
- Daily Briefing from multiple sources
- CI/CD Observer with autonomous reaction
- Cross-Project Mail Triage (Mail with PDF → move to target project workspace)
- Long Research assignments running for days

## 2. Architecture: Engine Framework + Nature Behavior

Trillian will evolve structurally. Instead of bending each
generation into the Engine, the **Behavior Layer**
resides in interchangeable `TrillianNature` implementations — the Engine
itself only knows the interface.

```
┌─────────────────────────────────────────────────────────────┐
│  TrillianControlEngine / TrillianUserEngine (Framework)    │
│  ──────────────────────────────────────────────────────────  │
│  • Loop mechanics (drainPending, LLM-Call, Tool-Dispatch)    │
│  • Inbox persistence, ChatLog                                │
│  • Cross-Project Spawn Routing                              │
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
│  │ TrillianNatureVoid    │  Nature `void`: all defaults    │
│  │ TrillianNatureA  …    │  Nature-A: personality, …    │
│  └───────────────────────┘                                  │
└─────────────────────────────────────────────────────────────┘
```

**Class Structure.** `TrillianNature` (SPI) → `TrillianNatureBase`
(abstract, all shared mechanics: attribute map and its rendering in
both prompts, peer lookup) → concrete Natures. `TrillianNatureVoid` is
an **empty** derivation of the base — this is what makes it the baseline.
New Natures derive **from the base**, not from Nature `void`: otherwise,
"what every Trillian does" and "what Generation 0 does" would be the same class, and
a later Nature `void` change (or an experiment there) would silently
land in every descendant.

**To create a new Nature** = a Spring `@Component` with the correct
`id()` plus override of the relevant hooks. The `TrillianNatureRegistry`
indexes on boot. Recipes pin via `params.nature: '<id>'`.

**Nature Versioning:**

- **`trillian-void`** — Architecture spike. **Current implementation.**
  Proves two-session mechanics, cross-project spawn, true
  identity separation. No personality, no reflection, no
  persistence — all Nature hooks at defaults.
- **`trillian-adam`** (Nature-A) — **the first Nature with its own
  behavior.** Character on creation, persistent attributes, reflection
  after task completion. Own spec:
  `specification/public/trillian-nature-adam.md`.
- Further Natures … — Personality, Traits, Mode Switch, Token
  Budget.

**Nature IDs are words, not characters.** `[a-z0-9]+` is allowed —
`0`, `a`, but also `alpha` or `fast`. The ID is used in the
account name and in three Recipe names, so `TrillianNatureRegistry`
checks it on boot and **aborts startup** if
it contains a hyphen (then the account name could no longer be
decomposed) or is `user`/`worker` (then the
Control Recipe `trillian-user` would collide with the User Loop family). An
*unknown* ID is different — it falls back to Nature `void` at runtime with a WARN,
because that is a configuration mismatch and must not kill a
running Engine.

The former convention "digits = test, letters = production" has
been dropped. It had no consumer, and with descriptive IDs, the
distinction is in the name anyway.

**Recipe Convention:**

| Recipe | Meaning |
|---|---|
| `trillian` | Alias to current default Nature (today Nature `void`) |
| `trillian-void` | Pinned Nature `void` (survives default change) |
| `trillian-adam` | Pinned Nature-A `adam` — persistent attributes |
| `trillian-user-<n>` | User Loop Recipe per Nature — resolved from bootstrap as `USER_RECIPE_PREFIX + nature` |
| `trillian-worker-<n>` | Per-Task Worker per Nature — similarly derived (`WORKER_RECIPE_PREFIX + nature`) and passed to the User Loop as `params.workerRecipe` |

**Both follow-up Recipes are derived from the Nature by the bootstrap**, no one
types them. The Worker name was previously a literal in the User Loop prompt
("use `trillian-worker-void`") — this would have forced every new Nature to fork the
prompt just for one word, and a model that mistypes would spawn nothing.
Now the prompt reads `&#123;{ params.workerRecipe }}`; derivation happens in exactly one place in
Java.

## 3. Two-Session Architecture

```
Tenant: acme  /  Project: <Human's current project>

  Session 1 — Control
    Owner: Human (Session Owner)
    Profile: foot / web  (bound connection)
    Engine: trillian-control
    Primary process: 'chat'
    Tools: task_enqueue + user_* control-tools

         │ task_request ProcessEvent (cross-session)
         ▼

  Session 2 — Trillian-User  (system=true, headless)
    Owner: _trillian-<nature>-<instance> (Service Account)
    Engine: trillian-user
    Primary process: 'trillian-user-loop'
    Tools: project_list, process_spawn, cross_process_create,
           process_steer, process_status, process_history_text,
           peer_read_chat_memory, task_complete/failed/needs_input

         │ cross_process_create(projectId=X, recipe=trillian-worker-void)
         ▼

  Worker-Process — per Task, in the Trillian-User-Session but with
  process.projectId = <Target Project>
    Owner: _trillian-<nature>-<instance>
    Engine: frankie (via trillian-worker-void recipe)
    Tools: full Worker toolset (doc_*, file_*, exec_*) +
           trillian_done for Termination
```

**Why two Sessions:**

| Aspect | Sibling Processes (discarded) | Two Sessions (Nature `void`) |
|---|---|---|
| Identity at runtime | `userId` from Session = Human — `_trillian-*` is phantom | Trillian-User runs as `_trillian-*` (own Session Owner) |
| Tool Surface | Trillian inherits foot connection from Human → can use `client_*` directly | Trillian-User Session is headless → `client_*` is structurally missing |
| Chat Pollution | Worker replies leak into Human chat | Own Session = own chat container |
| Permissions/Audit | incorrect identity, incorrect writer | correct identity, correct audit trail |

## 4. Engine Classes

### 4.1 TrillianControlEngine

- **Loop:** reply-style — drainPending → LLM Turn → possibly Tool Calls →
  natural-stop → IDLE. Wakeup on User Input OR incoming
  task-event ProcessEvents.
- **No structured-action-schema** (unlike Arthur/Eddie). Tools
  selected directly by LLM; saves tokens + prevents the DELEGATE
  funnel trap (Arthur's structured "DELEGATE" action type
  forced the LLM into `process_spawn` indirection, which is
  semantically incorrect for Trillian).
- **Engine Role:** `trillian-control` — gates the Control Tools
  (`task_enqueue`, `user_*`).
- **Model Default:** `default:analyze,default:fast` — Analyze Tier
  primarily because Gemini-Flash occasionally
  returns finish=STOP with output=null for ambiguous tool sets.
- **Single-Retry-on-empty** in the loop logic against the Gemini quirk.

### 4.2 TrillianUserEngine

- **Loop:** endless-but-sleepy, Frankie-like pattern. drainPending →
  LLM → Tools → repeat → natural-stop = IDLE. No `_terminate`,
  no wallclock/idle-stuck safety nets (Orchestrator, not Worker).
- **`allowsCrossProjectSpawn=true`** — Trillian-User can spawn Workers
  in foreign projects via `cross_process_create`.
- **`asyncSteer=true`** — Trillian-Control does not wait synchronously during
  `task_enqueue` dispatch.
- **Engine Role:** `trillian-user`.
- **Model Default:** `default:analyze,default:fast`.

**Memory Context and Compaction.** Both Trillian Engines (Control + User) use the same `MemoryContextLoader` + `MemoryCompactionService` path as Arthur/Eddie/Ford/Frankie: `buildPromptMessages` appends `composeBlock(...)` (Languages, Agent-Doc, ARCHIVED_CHAT-Summary, RAG-Auto-Inject) to the System Prompt; `runTurn` calls `compactIfNeeded(...)` before the first LLM call and rebuilds the prompt if `compacted()=true`. Otherwise, the `void` Nature User Loop under the `_trillian-<nature>-<instance>` service account would run autonomously over many turns and exceed the context window / trigger bill shock. See `planning/memory-compaction.md` §7 and `memory-knowledge-management.md` §10.

### 4.3 Worker Engine: Frankie with trillian-worker-Recipe

- Frankie as Engine. **Own Recipe** `trillian-worker-<n>` with:
  - Full doc/file/exec Tool Surface
  - **`trillian_done(summary, data?)` Tool** as mandatory Termination
    (see §6)
  - Prompt discipline: "at task end, ALWAYS call `trillian_done`,
    never natural-stop"
- Worker has `parentProcessId = trillian-user-loop.id` — DONE event
  flows back to Trillian-User via `ParentNotificationListener`.

## 5. Task Lifecycle

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

Routing between Sessions is Vancetope standard: `EngineMessageRouter`
dispatches by-processId, transparently crossing Session/Pod boundaries.

## 6. Trillian-specific Tools

| Tool | Role-Gate | Caller | Purpose |
|---|---|---|---|
| `task_enqueue(description)` | `trillian-control` | Control | Push task to User Loop Inbox |
| `user_status` | `trillian-control` | Control | Status + Inbox Depth of User Loop |
| `user_stop` / `user_continue` | `trillian-control` | Control | Pause/Resume User Loop |
| `user_clear` / `user_reset` | `trillian-control` | Control | Clear Inbox / Soft Reset |
| `user_attr_set(name, value)` | `trillian-control` | Control | Set free-form attribute on User Loop |
| `user_attr_clear` / `user_attr_list` | `trillian-control` | Control | Delete all attributes / List them |
| `task_complete(taskId, result)` | — | User Loop | Task success to Control |
| `task_failed(taskId, reason)` | — | User Loop | Task failure to Control |
| `task_needs_input(taskId, question)` | — | User Loop | Escalation to Control |
| `cross_process_create(projectId, recipe, name, goal, …)` | `trillian-user` | User Loop | Spawn Worker in any project |
| `peer_read_chat_memory(processName)` | — | User Loop | Observe sub-worker live |
| `trillian_done(summary, data?)` | — | Worker | Signal DONE + Summary in chatLog |
| `trillian_session_create(initialMessage)` | — | external Engines | Spawn Trillian Session via Tool (Default Nature) |
| `trillian_session_send(sessionId, message)` | — | external Engines | Address existing Trillian Session |

In addition, the generic `wakeup_in(seconds, label, payload)` /
`wakeup_cancel(correlationId)` in the User Loop: the loop can
schedule itself to wake up later, instead of ending a turn without a follow-up. The
Wakeup Registry is **in-memory** — a Brain restart discards planned
wakeups without a trace, and a `PAUSED`/`SUSPENDED`/`CLOSED` process swallows
them (otherwise, expired ticks would pile up in an inbox that no one drains
during hours of pause). Thus suitable for polling over minutes
to hours, not for a standing agenda over days.

Where Vance knows the time itself, polling is the wrong
form anyway: `PermissionRequestEffect` notifies the requesting
Process directly as soon as its access request has been decided —
no interval to guess, no LLM turn that determines "not yet".

## 6a. Direct Control: `//trillian`

The `user_*` tools do the same, but only if Control is currently
responding and selects the appropriate tool. The command channel is the way for
the **human**: deterministic, token-free, and available when a
turn is stuck — precisely when one wants to check or stop something.

| Command | Effect |
|---|---|
| `//trillian` / `//trillian info` | State overview: Control (Status/Session/Nature), Worker (Account Name, Status, Inbox Depth, Attributes), list of running Task Workers with **target project** and age |
| `//trillian queue` | Contents of the Worker Inbox: per entry type (`task_request` / `task_done` / …), taskId, truncated description, age |
| `//trillian task <description>` | Enqueue task directly, without Control LLM |
| `//trillian stop` | Set Worker Loop to `PAUSED` |
| `//trillian continue` (alias `resume`) | Back to `IDLE` + wake Lane |
| `//trillian clear` | Discard pending **Task Requests**, result events remain |
| `//trillian clear all` | Discard the entire Inbox, including results |
| `//trillian attr` | List Worker attributes |
| `//trillian attr set <name> <value>` | Set attribute — the rest of the line is the value, no quoting needed |
| `//trillian attr del <name>` / `attr clear` | Remove single attribute / all attributes |

**The queue is not a task list.** In the Worker's Engine Inbox,
besides waiting `task_request`s, there are also result events
(`task_done`, Worker replies) that the loop retrieves in the next turn and
reports to Control. A blanket clear would therefore
discard completed work: the loop never learns the result, and the task remains
open forever. Therefore, `clear` separates the two, and `queue` shows the type
per entry — one sees what will be affected before deleting.

**`task` makes the User Loop individually testable.** Otherwise, it depends on
Control: if the Chat LLM doesn't formulate the task or its provider call hangs,
the loop never gets to it. The command enqueues via the same
`TrillianInternalApi.enqueueTask` as `task_enqueue` — a manually
submitted task is indistinguishable from one submitted by Control; the difference
is only who formulates the text (Control with query discipline, or the human literally).

**Lane Semantics.** The handler reports `runsOnLane() = false`. Each
subcommand reads or targets the **Peer**, never the addressed
Control Process; mutations serialize on the **Peer Lane** (in
`TrillianInternalApi.pausePeer` / `resumePeer`). Waiting on the Control Lane
would be backwards: a stop that is pending after the turn it is supposed to
interrupt is not a stop. See
[engine-commands](/specs/engine-commands) §5.

**`pausePeer` does not wait on the Peer Lane either.** It immediately sets the
out-of-band `requestHalt` flag and merely *enqueues* the `PAUSED` write
— without a join. This is the difference between "takes effect in the
current turn" and "takes effect after the current turn": both Trillian Engines
read `OrchestratorInterrupt.probe(...)` in the loop head, thus seeing the flag
mid-turn and exiting at the next safe boundary. The enqueued Lane task then
writes `PAUSED` and clears the flag — the same form as
`SessionLifecycleService.pauseActiveInSession`, just without the join.
Waiting on the Lane would mean waiting for the exact turn one is interrupting.

`pausePeer` is idempotent: an already `PAUSED` or `CLOSED` Peer is
returned unchanged. The counterpart `resumePeer` **always** clears the halt flag,
even if the status was not `PAUSED` — a pause that never reached a
turn leaves it set, and a resume without clearing would give the Peer
a turn that exits again at its first loop head check.

**One implementation, two entry points.** Command handler and
`user_*` tools call the same `TrillianInternalApi`. Everything else
drifts apart, and then one debugs the control instead of the actual issue.

**No ESC replacement.** ESC / `/pause` act per Session
(`pauseActiveInSession` → `findBySession`) and do **not** reach the
Peer Session — this is intentional: the Recipes set
`onIdle: NONE` and the Bootstrapper pins the same Daemon Policy because
the Worker *should* continue running when the human is idle. A
control cascade across the Session boundary would destroy this property
and, incidentally, control a foreign, differently owned Session. The
Lifetime cascade on Session Close (§9) is unaffected by this — it is
lifecycle, not control.

## 7. Cross-Project Mechanics

Trillian-User can spawn Workers in foreign projects via
`cross_process_create(projectId, …)`. Mechanics:

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
Trillian's own Session with projectId override — no new
Session lifecycle per task. Result: fewer Sessions in the Tenant, all
Workers of a Trillian kept together under one Session,
parallelizable.

## 8. Bootstrap

`TrillianSessionBootstrapper` is called by `SessionChatBootstrapper`
after the Chat Process has been created. Trigger:
`process.thinkEngine == "trillian-control"` (Nature-agnostic — the
Recipe alias `trillian` and all future Nature Recipes trigger
the same bootstrap path).

Sequence:

1. **Adopt or create** service account. If a Process
   of this Session already carries a `trillianUserName` and the
   account still exists, it is reused — this is the case after a
   reactivation, where the archived, renamed Chat Process carries the name
   forward. Only otherwise is a fresh account minted, named
   **`_trillian-<nature>-<instance>`** (e.g., `_trillian-void-1535`,
   `_trillian-alpha-4711`): leading `_` as service account marker,
   the Nature ID as a separate part, four random digits as instance with
   uniqueness check in the Tenant. Three parts, so that the Nature can be
   read back from the name and is not limited to a single character. The
   **display name is on `UserDocument.title`** and is only *initialized*
   on creation (`Trillian <nature>-<instance>`) —
   a human can freely rename it in the User Editor without the
   account name changing; `//trillian info` shows both.
   When adopting, step 1b is omitted — the grant already exists.
1b. **Seed authority** — `PermissionBootstrap.grantProjectAdmin(tenant,
   controlProject, trillianName)` via `ObjectProvider.ifAvailable`
   (no-op if an external Governor manages the rights). Without
   a grant, the account exists but can do nothing: every Tool Call
   runs via `ToolDispatcher` → `enforce(EXECUTE)`, which
   resolves to WRITER-on-project. **Scope is deliberately the Control Project**
   — Trillian represents the human in the project in which it
   was started, and nowhere else. Cross-Project Spawn
   (`cross_process_create` into a foreign project) thus remains
   denied until someone explicitly grants it (see §13).
2. Read Nature from `controlProcess.engineParams.nature` (Default `0`).
3. User Recipe Name = `trillian-user-` + nature; resolve via
   `RecipeResolver.applyDefaulting`.
4. Create second Session — Owner = `_trillian-*`, Profile = `headless`,
   `system=true`, in the **same project** as Control. Owner is the
   **account name**, not the Mongo ID: `SessionDocument.userId` carries
   `UserDocument.name` by contract, and the entire auth chain
   (`SecurityContext`, Team Lookup, Grant Matching) keys off of it.
5. Spawn Primary Process `trillian-user-loop` in the second Session,
   `parentProcessId = controlProcess.id` (cross-session parent).
6. Set cross-references in `engineParams` of both Processes
   (`peerProcessId`, `peerSessionId`, `trillianUserName`).
6b. **Announce identity in Control Chat** — a persistent
   ASSISTANT-`ChatMessageDocument` names the minted account name,
   its project, and the note that it must be enabled for other projects.
   Deliberately persistent instead of `NOTIFY`:
   the name is random per session, is only needed later
   (grant for a second project) and would be gone as a fleeting
   notification exactly then. Best-effort — an error here does not
   abort the bootstrap.
7. Start User Process on its own Lane (`thinkEngineService.start`
   blocking via LaneScheduler).

## 9. Cleanup Lifecycle

`TrillianCleanupListener` listens for `ThinkProcessStatusChangedEvent`
with `newStatus == CLOSED`. If the closing Process has the
trillian-control-Engine:

1. Read Peer Session ID from `engineParams.peerSessionId`
2. `SessionLifecycleService.closeWithCascade(peerSessionId)` —
   closes the User Loop Process + all Worker Processes with it
3. Revoke account grants (`PermissionBootstrap.revokeAll`),
   **then** delete the `_trillian-*` service account
   (`UserService.delete`). The order is binding: `UserService.
   delete` does **not** cascade into the Grant Storage; a grant must
   not outlive its subject. Errors during revoke do not block account deletion.

**Exception: Archiving.** The archive cascade closes every Process of the
Session, so it would also land here and destroy the account —
"archiving" would thus effectively mean "discarding", and reactivating would mint
a stranger. The listener therefore exits on
`CloseReason.ARCHIVED`; this case is handled by the lifecycle hook.

### 9a. Session Lifecycle Cascade

The Process status is the wrong hook for something that depends on the
**Session**: Any path that ends a Session without setting exactly
this Process to CLOSED would silently bypass the cleanup work
— a deleted Control left the Worker Session, along with
ChatMessages, Processes, and Memories, as a shell (invisible because
`system=true`).

`TrillianSessionLifecycleHook` therefore implements the generic
[`SessionLifecycleHook`](/specs/session-lifecycle) and pulls the
Worker Session along:

| Control | Worker Session | Service Account |
|---|---|---|
| closed | closed | **deleted** (listener above) |
| archived | **archived** | **remains** |
| reactivated | old deleted, new built | **the same** (adoption, §8.1) |
| deleted | **hard deleted** | deleted |

**Attributes travel with it.** They are stored in the `engineParams` of the
Worker **Process** (§10a) — Mongo-persistent, thus surviving restart,
Pod change, and archiving itself. Only reactivation deletes the
old Worker Session and thus its carrier. The hook therefore saves them
beforehand to the closed Control Process
(`engineParams.carriedWorkerAttributes`), and the Bootstrap sets them on
the new Worker during adoption — and clears the temporary storage again
so that no outdated Persona is resurrected.

**The account survives archiving** — archived means put away,
not discarded. A Trillian that returns with a different identity, without
attributes, and without rights has not returned.
Downside: an archived Trillian continues to hold its project grants,
even though no one uses them (visible via `permission_grant_list`); if one
wants to reclaim them, **delete** the Session instead of archiving it.

**Recursion protection via the Engine, not via wiring.** The
hook only acts on a Session that has a Process with the Engine
`trillian-control`. The wiring is not suitable for this: **both**
sides carry `peerSessionId`, each pointing to the other (the
Bootstrap sets it in §8 Step 6 on Control *and* User Loop). If one
keys off of this, the deletion will be sent back and forth between the two
Sessions until the stack is full — observed as `StackOverflowError` on the first
reactivate — and along the way, the Worker side deletes the shared
service account because `trillianUserName` is also on both.

Nature `void` remains ephemeral insofar as the account is bound to *its* Session
— it does not exist beyond its end. Across
Brain restarts, Pod changes, and archiving, it
remains preserved (§10b).

## 10. ProcessEvent Persistence

Both Engines (`TrillianControlEngine`, `TrillianUserEngine`)
persist **all** non-UserChatInput SteerMessages
(ProcessEvent, Reply, ToolResult, ExternalCommand) as USER role in
`ChatMessageDocument`. Background:

Without persistence, a ProcessEvent only lives in the current Lane Turn
(as an extras list). After natural-stop, it disappears. For
multi-turn correlation — task_request (Turn N) ↔ worker-reply
(Turn N+M) — the LLM can no longer find the `taskId` in N+M.
Persistence makes the XML-rendered Event markup a permanent
part of the Chat History, which the LLM sees as context in every turn.

`SteerMessage.Reply` (Worker natural-stop) and
`SteerMessage.ProcessEvent` (terminal DONE/FAILED) are
rendered differently (`<worker-reply …>` vs.
`<process-event type="done" …>`) — both are explained in the
Trillian-User-Prompt as valid Task Result signals.

## 10a. Trillian-User-Attributes (free-form)

Control can set arbitrary Key-Value pairs on the Trillian-User-Loop-Process
via `user_attr_set(name, value)`. Storage:
`process.engineParams.attributes` (`Map<String, Object>`) — at
runtime for **every** Nature, including `adam`. What distinguishes
the Natures is **durability** (§10a, "Durability").

The active `TrillianNature` decides how the attributes are interpreted.
Nature `void` does both:

- **`userPromptAddendum(process)`** — renders
  `process.engineParams.attributes` (= the User Loop's own attributes)
  as a Markdown block in the User Loop prompt.
- **`controlPromptAddendum(process)`** — follows
  `process.engineParams.peerProcessId` to the User Loop and renders
  **the same** attributes also in the Control Prompt.

This makes Control + User Loop behave **consistently**: if the
human sets `user_attr_set(persona="witty Swabian who only speaks Swabian")`,
both Control's chat response and all spawned Workers speak in the
style of this Persona. Storage remains single-source-of-truth on the
User Loop; Control reads cross-process via Peer Lookup.

Render example (same markup on both sides, only one word
context different):

```markdown
## Attributes (currently active on this Trillian)
- **persona:** witty Swabian who only speaks Swabian
- **language:** German
- **tone:** factual
```

Nature-A+ can read the same map as a typed Persona schema
(Traits vector, Mode default, Token budget hint), as a Memory Cascade
source for Reflection phases, or as a Routing hint for Sub-Worker
Recipe selection. The convention of attribute names is up to the Control
LLM — Nature documentation recommends well-known names per Nature. And yes:
Nature-A can **decide differently** whether Control should also
see the attributes (e.g., if Control only delegates instead of
responding itself) — the hook is overridable.

Tools: `user_attr_set` / `user_attr_clear` / `user_attr_list`,
all engine-role-gated to `trillian-control`. API:
`TrillianInternalApi.setPeerAttribute` /
`clearPeerAttributes` / static `readAttributes(process)`.

### Nature-specific: Durability, Character, Reflection

How a Nature handles attributes is its decision and
not that of the framework. Nature `void` keeps them in `engineParams`, where they
die with the Process lines. Nature-A `adam` gives each Trillian a
character, stores the attributes as a document, and keeps a
reflection journal — all via the hooks below, without the Engine
knowing about it.

Fully described in **`specification/public/trillian-nature-adam.md`**.

The hooks that the framework offers for this:

| Hook | Who calls | Purpose |
|---|---|---|
| `callName(attributes)` | Bootstrap (greeting) | Call name, Default `"Trillian"` |
| `initialAttributes(tenant, project, account)` | Bootstrap, if nothing passed | Start values for a fresh Worker Loop |
| `attributesChanged(worker, attributes)` | `TrillianInternalApi` after each mutation | Establish durability |
| `taskConcluded(worker, taskId, outcome, summary)` | `dispatchTaskEvent`, only `done`/`failed` | Learn from a conclusion |
| `accountDiscarded(tenant, project, account)` | `TrillianSessionLifecycleHook`, before account deletion | Release everything under the name |
| `controlPromptAddendum` / `userPromptAddendum` | Both Engines per Turn | Prompt overlay |
| `beforeControlTurn` / `afterControlTurn` / `beforeUserTurn` / `afterUserTurn` | Both Engines | Turn lifecycle |

`attributesChanged` is deliberately attached to the **mutation funnel** in
`TrillianInternalApi`, not to the tools: `user_attr_set` and
`//trillian attr set` share this API, and a Nature that only learned from
one of the two would be worse than one that learned from neither.
The same applies to `taskConcluded` and `dispatchTaskEvent`. All hooks
swallow errors — the authoritative write operation has already
occurred at this point.

## 10b. Resilience: Pod Restart, Cross-Pod Move, Suspend

Trillian is persistent in Mongo (Session/Process Documents,
ChatMessage History, Engine Inbox Messages, engineParams.attributes).
In-memory are only the Lane Queue + the Foot WS binding of the
Control Session — both are reconstructible on boot.

**Pod Pinning:** Sessions follow the home cluster of their project
(`ProjectDocument.homeCluster`). `ProjectManagerService.
claimForLocalPod` is atomic via Mongo-findAndModify — at
runtime, there is exactly **one** Pod that runs the Lanes of the
Trillian-User-Loop. In case of Pod failure: `ProjectStartupReclaimer`
releases stale Claims, the next Pod takes over, Lanes wake up via
`EngineMessageService.findInboxedByTargets` on boot.

**Suspend Behavior:** Trillian runs daemon-style — Control Recipes
(`trillian.yaml`, `trillian-void.yaml`) explicitly set
`onIdle: NONE`, and `TrillianSessionBootstrapper` explicitly pins the same
Daemon Policy to the User Session via
`SessionService.applyLifecycleConfig`. Thus:

- Async `task_done` events from the User Loop are processed even
  when the human is not actively chatting
- Control does not wait for a Resume Cascade on reconnect
- Sweeper (`SessionIdleSweeper`) automatically skips NONE-Sessions

`onSuspend: KEEP` with Default `suspendKeepDurationMs: 24h`. For
explicit suspend action (e.g., via `process_pause`), there is a 24h
period before the Suspend Sweeper closes — enough buffer for longer
breaks.

**Cross-Project Worker on Pod Move:** Worker Process has
`process.projectId = Target Project`, the Pod that claims this
Target Project runs the Lane. If Trillian-User-Session is in
Project A (Pod 1) and Worker spawns for Project B (Pod 2),
this is normal Vancetope Cross-Pod operation — `EngineMessageRouter`
routes ProcessEvents between the Pods.

## 11. Worker Termination and `enrichWithLastReply`

Frankie in worker-mode skips its normal `persistAssistantReply` path
on tool-terminate — therefore, Workers that terminate via
`trillian_done` must write the Summary **themselves** to
`chatLog`. `TrillianDoneTool` does this before returning
the `_terminate=true` result:

1. Look up current Process from `ctx.processId()`
2. Append Summary as ASSISTANT message to `ChatMessageDocument`
3. Return Result Map with `_terminate=true` + summary

This allows `ParentNotificationListener.enrichWithLastReply` to find the
Summary and append it to the DONE-ProcessEvent. Trillian-User
gets the actual Summary instead of the generic "Child process X
status=done".

## 12. Vancetope Core Adaptation — `ThinkEngineService.newContext`

Before Trillian, `ThinkEngineService.newContext()` always read the `projectId`
for the `ToolInvocationContext` from the Session
(`session.getProjectId()`). For Cross-Project Workers
(`process.projectId != session.projectId`), this led to tools like
`doc_*` / `file_*` always operating on the Session Project,
not on the Worker Project.

Fix (Trillian prerequisite, generally valid):

```java
String processProjectId = process.getProjectId();
String projectId = (processProjectId != null && !processProjectId.isBlank())
        ? processProjectId
        : session.getProjectId();
```

Process-projectId takes precedence. Risk-free for non-cross-project
Engines (where both are the same). Eddie's `DELEGATE_PROJECT` is
unaffected because a new Session is created in the target project there anyway.

## 13. Limitations Nature `void`

Deliberately excluded (comes from Nature-A; what `adam` already
implements is marked):

- **Personality** (Traits, Principles)
- **Reflection Phases** (light / full / Error Analysis / periodic) —
  a simple form built into Nature-A `adam` (one line per
  completion, success as well as failure); the gradation by type is open
- **Mode Switch** Low/High/Sleep with Cadence Tiering
- **Token Budget** Soft/Hard with Setting Cascade
- **Plan Revision** / Correction Check between Sub-Goals
- **Trillian-User Persistence** beyond Session Destroy — for
  attributes solved in Nature-A `adam` (see its spec), for the rest
  open
- **Own `_user_<trillian-name>` Home Project** (persistent Trillians)
- **Automatic Cross-Project Rights** for `_trillian-*`. The Bootstrap
  grants ADMIN on **exactly one** project (that of the Control Session, §8
  Step 1b); `cross_process_create` into a foreign project runs into a DENY
  without approval. This remains so — an ephemeral, LLM-controlled
  account cannot grant itself rights (otherwise self-escalation).
  The path to this has been **explicit approval** since 2026-08-10:
  `user_project_request(projectId, reason)` (control-role-gated) submits
  a request that an administrator of the target project approves via the Inbox
  — only then does `allowsCrossProjectSpawn=true` (§7)
  become practically effective. The generated account name remains internal; the tool
  fills Subject and Role (WRITER) itself. Mechanics:
  `planning/permission-request-inbox.md`.
- **Self-Evolution** of Traits between Runs
- **Cortex Right Panel Display** for Trillian-User Status

These points are reflected in Nature-A+ as an override of the
`TrillianNature` hooks — no new Engine build needed.

## 14. Tenant Setup & Discovery

Bundled Default Recipes (in the Cascade under
`vance-brain/src/main/resources/vance-defaults/_vance/recipes/`):

- `trillian.yaml` — Default Alias (today Nature `void`)
- `trillian-void.yaml` — Pinned Nature `void` Control
- `trillian-user-void.yaml` — Pinned Nature `void` User Loop
- `trillian-worker-void.yaml` — Pinned Nature `void` Worker

Foot Start:

```bash
java -jar vance-foot.jar --recipe trillian       # default-Nature
java -jar vance-foot.jar --recipe trillian-void     # pinned Nature `void`
```

Brain Logs on Bootstrap show identity assignment + Session pair:

```
Minted Trillian service-account '_trillian-<nature>-<instance>' for control session '…'
Trillian user-session created id='…' owner='<trillian-id>' project='…'
TrillianUser.start tenant='…' session='<user-session>' id='<user-process>'
Bootstrapped Trillian pair: control id='…' session='…' / user id='…' session='…' trillianUser='_trillian-<nature>-<instance>'
```

## 15. References

- `planning/trillian-engine.md` — Design process history (v1
  Sibling Processes → v2-Pivot to Two Sessions, discussion of
  Eddie reuse, Cross-Project pattern decision,
  Chinese whispers analysis). Remains as design note; this spec is
  authoritative.
- `specification/public/trillian-nature-adam.md` — Nature-A `adam`:
  Character, persistent attributes, reflection journal, worker episodes.
- `specification/think-engines.md` — Engine Registry,
  `allowsCrossProjectSpawn`, Lifecycle contract.
- `specification/frankie-engine.md` — Worker Loop Pattern,
  `_terminate` convention, ParentNotificationListener.enrichWithLastReply.
- `specification/eddie-engine.md` — Cross-Project Pattern via
  structured-action-schema; Trillian deliberately chooses a different path.
- `specification/recipes.md` — Recipe Cascade, `allowedToolsAdd` vs.
  spawn-time-membership.
- `specification/architektur-scopes-clients.md` — Session/Process
  Scope hierarchy.
- `CLAUDE.md` section "Think-Process / Scope Peculiarities" —
  ProcessEvent, drainPending, Auto-Wakeup.
