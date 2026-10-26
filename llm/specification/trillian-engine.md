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
> observant voice of the Heart-of-Gold crew — the only one who doesn't lose sight of the
> overarching goal while Zaphod & Ford cause chaos.
>
> See also: [think-engines](think-engines.md) | [frankie-engine](frankie-engine.md) | [arthur-engine](arthur-engine.md) | [eddie-engine](eddie-engine.md) | [recipes](recipes.md)

---

## 1. Role and Classification

| Engine | Character | Owner | Termination |
|---|---|---|---|
| `arthur` | Reactive Session Chat Hub | Human | never DONE — STOPPED/SUSPENDED |
| `eddie` | Tenant Hub, Cross-Project Coordinator | Human | never DONE |
| `frankie` | Multi-Turn Worker, terminate-driven | spawning user | DONE per Task |
| **`trillian-control`** | **Reply-style Chat Host, without Action Schema** | **Human** | **never DONE** |
| **`trillian-user`** | **Endless-but-sleepy Orchestrator, cross-project** | **`_trillian-*` Service Account** | **never DONE** |
| `trillian-worker` | Frankie Fork: Per-Task Worker, may ask (§4.3) | `_trillian-*` (Loop) | DONE per Task |
| `trillian-head` | Frankie Fork: Conversation Head, replies in thread (§6f) | `_trillian-*` (Head) | with the thread |

**Use Cases (Vision, actually usable from Nature-A+):**

- PR Review Watchdog (Trillian observes GitHub, comments)
- Daily Briefing from multiple sources
- CI/CD Observer with autonomous reaction
- Cross-Project Mail Triage (Mail with PDF → move to target project workspace)
- Long research assignments running for days

## 2. Architecture: Engine Framework + Nature Behavior

Trillian will evolve structurally. Instead of bending each
generation into the Engine, the **Behavior layer** resides
in interchangeable `TrillianNature` implementations — the Engine
itself only knows the interface.

```
┌─────────────────────────────────────────────────────────────┐
│  TrillianControlEngine / TrillianUserEngine (Framework)    │
│  ──────────────────────────────────────────────────────────  │
│  • Loop mechanics (drainPending, LLM-Call, Tool-Dispatch)    │
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
│  │ TrillianNatureVoid    │  Nature `void`: all defaults    │
│  │ TrillianNatureA  …    │  Nature-A: personality, …    │
│  └───────────────────────┘                                  │
└─────────────────────────────────────────────────────────────┘
```

**Class Structure.** `TrillianNature` (SPI) → `TrillianNatureBase`
(abstract, all shared mechanics: attribute map and its rendering into
both prompts, peer lookup) → **one side of the head axis** → concrete
Natures:

```
TrillianNatureBase (abstract)             — what every Trillian does
  ├─ TrillianNatureSingleHead (abstract)  — one loop carries everything
  │    ├─ TrillianNatureVoid
  │    ├─ TrillianNatureAdam
  │    └─ (EE) TrillianNatureFunkwill
  └─ TrillianNatureMultiHead (abstract)   — one head per conversation thread
       └─ TrillianNatureColin
```

`TrillianNatureVoid` is an **empty** derivation of `SingleHead` — this
is precisely what makes it the baseline. New Natures derive **from one axis side**,
not from Nature `void`: otherwise, "what every Trillian does" and "what
Generation 0 does" would be the same class, and a later Nature `void` change
(or an experiment there) would silently land in every descendant. Void and Adam
are siblings; neither inherits from the other.

**The Head Axis.** `TrillianNature.multiHead()` indicates whether a Nature
has **one** loop for everything (void, Adam, Funkwill) or its own
conversation head per discussion thread (`Colin`, §6f). The axis is
structure, not a switch: the interface provides **no** default (whoever
implements it directly must decide), and both intermediate classes
answer it `final` — a Nature changes sides by deriving elsewhere,
not by overriding. What one side brings is in its class; only what
**every** Trillian does belongs in the base. The MultiHead side carries
the head prompt addendum: `headSystemAddendum(head)` is `final` there =
shared Persona (base rendering `personaOf` via the Peer) **plus**
`headPromptAddendum` — a dedicated hook that only the Head Engine calls;
`controlPromptAddendum` of the human's Control Session remains untouched
and never receives head text.
`//trillian info` shows the side of the resolved Nature (`heads`, §6a).
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
- **`trillian-colin`** — **the first MultiHead Nature.** Baseline of the
  conversation side: discussion threads are answered by a dedicated
  head (§6f), the loop remains work-side; call name "Colin", otherwise all
  hooks at defaults. Plan:
  `../../../../planning/archive/trillian-exposure.md`.
- Further Natures … — Personality, Traits, Mode Switch, Token
  Budget.

**Nature IDs are words, not characters.** Allowed is `[a-z0-9]+` —
`0`, `a`, but also `alpha` or `fast`. The ID is used in the
account name and in three Recipe names, so `TrillianNatureRegistry`
checks it on boot and **aborts startup** if it contains a hyphen
(then the account name could no longer be decomposed) or is `user`/`worker`
(then the Control Recipe `trillian-user` would collide with the User Loop family). An
*unknown* ID is different — it falls back to Nature `void` at runtime with a WARN,
because that is a configuration mismatch and must not kill a
running Engine.

The former convention "digits = test, letters = production" has been
dropped. It had no consumer, and with descriptive IDs, the distinction
is in the name anyway.

**Recipe Convention:**

| Recipe | Meaning |
|---|---|
| Recipe | Meaning |
|---|---|
| `trillian-void` | Nature `void` — Baseline, no persistence |
| `trillian-adam` | Nature-A `adam` — persistent attributes |
| `trillian-colin` | Nature `colin` — MultiHead: discussions run in heads (§6f) |
| `trillian-user-<n>` | User Loop Recipe per Nature — resolved from bootstrap as `USER_RECIPE_PREFIX + nature` |
| `trillian-worker-<n>` | Per-Task Worker per Nature — similarly derived (`WORKER_RECIPE_PREFIX + nature`) and passed to the User Loop as `params.workerRecipe` |
| `trillian-head-<n>` | Conversation Head per Nature (MultiHead only) — derived from Head Service as `TrillianNature.headRecipe()` (§6f) |

**There is no `trillian` anymore.** As long as `void` was the only Nature,
an alias to "the current one" was convenient and harmless. With `adam`, it
became wrong: Natures differ in *what they are* —
Adam's attributes survive a restart, Void's do not — so a Recipe "take
the latest" would silently start a different agent on the next default change.
This is precisely what pinned names are meant to protect against; an alias next to it
removes that protection for whoever uses it.
Both Natures are instead `listed: true` and appear side-by-side in the
Recipe picker. Where a default is still needed because no one was asked
— `trillian_session_create` without a Recipe argument — it now uses
`trillian-void` as a **named** Nature (`DEFAULT_CONTROL_RECIPE`), not
as a moving target.

**Both subsequent Recipes are derived by the Bootstrap from the Nature**; no one
types them. The Worker name was previously a literal in the User Loop prompt
("take `trillian-worker-void`") — this would have forced every new Nature to fork the
prompt just for one word, and a model that mistypes would spawn nothing.
Now the prompt reads `{{ params.workerRecipe }}`; derivation happens in exactly one place in
Java.

## 3. Two-Session Architecture

```
Tenant: acme

  Session 1 — Control           Project: <Human's current project>
    Owner: Human (Session Owner)
    Profile: foot / web  (bound connection)
    Engine: trillian-control
    Primary process: 'chat'
    Tools: task_enqueue + user_* control-tools + user_activity

         │ task_request ProcessEvent (cross-session)
         ▼

  Session 2 — Trillian-User  (system=true, headless)
    Project: _user__trillian-<nature>-<instance>  (Account Hub, with Home Pod)
    Owner: _trillian-<nature>-<instance> (Service Account)
    Engine: trillian-user
    Primary process: 'trillian-user-loop'
    Tools: project_list, process_spawn, cross_process_create,
           process_steer, process_status, process_history_text,
           peer_read_chat_memory, task_complete/failed/needs_input,
           schedule_* (own appointments), session_* (Sessions in projects)

         │ cross_process_create(projectId=X, recipe=trillian-worker-void)
         ▼

  Worker Process — per Task, in the Trillian-User-Session but with
  process.projectId = <Target Project>
    Owner: _trillian-<nature>-<instance>
    Engine: trillian-worker (Frankie Fork, §4.3; Recipe trillian-worker-<nature>)
    Tools: full Worker toolset (doc_*, file_*, exec_*) +
           trillian_done (result, closes) / trillian_ask (question, parks IDLE)

  Conversation Head — MultiHead Natures only (§6f), one per discussion thread,
  in the Trillian-User-Session
    Owner: _trillian-<nature>-<instance>
    Engine: trillian-head (Frankie Fork; Recipe trillian-head-<nature>)
    Tools: thread_get, thread_message_add, inbox_archive, task_enqueue,
           doc_* (read + write, bound to the Hub), web/research
```

**Why two Sessions:**

| Aspect | Sibling Processes (discarded) | Two Sessions (Nature `void`) |
|---|---|---|
| Identity at runtime | `userId` from Session = Human — `_trillian-*` is phantom | Trillian-User runs as `_trillian-*` (own Session Owner) |
| Tool Surface | Trillian inherits foot connection from Human → can use `client_*` directly | Trillian-User Session is headless → `client_*` is structurally missing |
| Chat Pollution | Worker replies leak into Human chat | Own Session = own chat container |
| Permissions/Audit | wrong identity, wrong writer | correct identity, correct audit trail |

## 4. Engine Classes

### 4.1 TrillianControlEngine

- **Loop:** reply-style — drainPending → LLM-Turn → possibly Tool Calls →
  natural-stop → IDLE. Wakeup on User Input OR incoming
  task-event ProcessEvents.
- **No structured-action-schema** (unlike Arthur/Eddie). Tools
  selected directly by LLM; saves tokens + prevents the DELEGATE
  funnel trap (Arthur's structured "DELEGATE" action type
  forced the LLM to `process_spawn` indirection, which is
  semantically incorrect for Trillian).
- **Engine Role:** `trillian-control` — gates the Control Tools
  (`task_enqueue`, `user_*`).
- **Model:** Alias cascade `trillian-admin:analyze,trillian:analyze,default:analyze,default:fast`
  (D9) — without `ai.alias.trillian*` set, it falls back to `default:analyze`.
  Analyze tier primarily, because Gemini-Flash occasionally
  delivers finish=STOP with output=null for ambiguous tool sets.
- **Single-Retry-on-empty** in the loop logic against the Gemini quirk.

### 4.2 TrillianUserEngine

- **Loop:** endless-but-sleepy, Frankie-like pattern. drainPending →
  LLM → Tools → repeat → natural-stop = IDLE. No `_terminate`,
  no wallclock/idle-stuck safety nets (Orchestrator, not Worker).
- **`allowsCrossProjectSpawn=true`** — Trillian-User can spawn Workers
  in external projects via `cross_process_create`.
- **`asyncSteer=true`** — Trillian-Control does not wait synchronously during
  `task_enqueue` dispatch.
- **Engine Role:** `trillian-user`.
- **Model:** Alias cascade `trillian-<nature>:analyze,trillian:analyze,default:analyze,default:fast`
  (D9), resolved in the Hub — where the loop runs. Before startup, the
  model gate `trillian.allowed-models` (§6b) checks.
- **One turn cluster-wide:** The Hub's Home Pod wakes the loop, but
  a turn can still start elsewhere — the Bootstrap starts the
  loop on the Control Session's Pod, and a message routed
  while the Hub is between two holders will be delivered where it arrives
  (the Lane serializes only per Pod). A **Turn Lease** (`trillian_wakeup_claims`, key
  `lease/turn/<tenant>/<loopId>`, TTL 30 min for dead holders) allows
  exactly one turn to run; a Pod without a lease leaves its Inbox to the
  running turn, which checks again after release.

**Memory Context and Compaction.** Both Trillian Engines (Control + User) use the same `MemoryContextLoader` + `MemoryCompactionService` path as Arthur/Eddie/Ford/Frankie: `buildPromptMessages` appends `composeBlock(...)` (Languages, Agent-Doc, ARCHIVED_CHAT-Summary, RAG-Auto-Inject) to the System Prompt; `runTurn` calls `compactIfNeeded(...)` before the first LLM call and rebuilds the Prompt if `compacted()=true`. Otherwise, the `void` Nature User Loop under the `_trillian-<nature>-<instance>` Service Account would run autonomously over many turns and exceed the context window / trigger bill shock. See `planning/memory-compaction.md` §7 and `memory-knowledge-management.md` §10.

### 4.3 Worker Engine: `TrillianWorkerEngine extends FrankieEngine`

- Own Engine `trillian-worker` (since 2026-08-14), a **fork** of
  Frankie: Frankie's loop, tools, wallclock net, and guard unchanged, only
  the consequence of `_terminate` differs (Frankie's interface
  `onWorkerTerminate`). Recipe `trillian-worker-<nature>` pins the Engine.
- Full doc/file/exec tool surface plus two named exits:
  - **`trillian_done(summary, data?)`** — Result, closes the Worker
    (CLOSED/DONE, §11).
  - **`trillian_ask(question)`** — Question, the Worker **parks IDLE** with
    full context instead of closing; marker `trillianAskPending` on the
    process (deleted at the next turn start — the turn itself *is* the
    answer). The loop forwards the question via `task_needs_input` and
    steers the answer via `process_steer` into the **same** Worker.
- Why Engine instead of Prompt: The model was supposed to ask a question via natural-stop
  but instead called `trillian_done` — closing itself, the answer found no recipient.
  In a tool-calling loop, "end the turn without a tool" is the hardest
  instruction; a dedicated exit as a tool is the robust form.
- Worker has `parentProcessId = trillian-user-loop.id` — DONE event
  flows back to Trillian-User via `ParentNotificationListener`.

## 5. Task Lifecycle

```
Human                Control               Trillian-User             Worker
  │  "task X"            │                       │                       │
  ├─────────────────────►│                       │                       │
  │                      │ task_enqueue(desc)    │                       │
  │                      ├──────────────────────►│ task_request event    │
  │ "I'll do it."        │                       │                       │
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
| `user_stop` / `user_continue` | `trillian-control` | Control | Pause/resume User Loop |
| `user_clear` / `user_reset` | `trillian-control` | Control | Clear Inbox / Soft Reset |
| `user_attr_set(name, value)` | `trillian-control` | Control | Set free-form attribute on User Loop |
| `user_attr_clear` / `user_attr_list` | `trillian-control` | Control | Delete all attributes / list them |
| `user_activity` | `trillian-control` | Control | Live view of work side: running workers, inbox, next self-check, last lines — answer to "what are you doing right now?" (A1) |
| `user_project_request(projectId, …)` | `trillian-control` | Control | Request access to another project |
| `task_complete(taskId, result)` | — | User Loop | Task success to Control |
| `task_failed(taskId, reason)` | — | User Loop | Task failure to Control |
| `task_needs_input(taskId, question)` | — | User Loop | Escalation to Control |
| `cross_process_create(projectId, recipe, name, goal, …)` | `trillian-user` | User Loop | Spawn worker in any project |
| `peer_read_chat_memory(processName)` | — | User Loop | Observe sub-worker live |
| `schedule_add` / `_list` / `_update` / `_remove` | `trillian-user` | User Loop | Own permanent appointments in Hub (§6c) |
| `session_open` / `_send` / `_read` / `_list` / `_close` | `trillian-user` | User Loop | Sessions in projects under own identity (§6d) |
| `trillian_done(summary, data?)` | — | Worker | Signal DONE + Summary in chatLog |
| `trillian_session_create(initialMessage)` | — | external Engines | Spawn Trillian Session via Tool (without Recipe argument: `trillian-void`) |
| `trillian_session_send(sessionId, message)` | — | external Engines | Address existing Trillian Session |

**Mechanical safety net for task completion** (since 2026-10-14).
If the loop does not report a task, although its worker is finished — observed live:
it replied to the worker's DONE with "Task … done, awaiting more." and without a tool call —
the result never reached the client. The loop engine therefore keeps track
(`engineParams.taskWorkers`, Worker → Task, atomically per entry): a turn that
received **exactly one** task and spawned **exactly one** worker,
links both (anything else is ambiguous and remains the model's responsibility).
If the DONE/FAILED of a linked worker arrives and the turn does not report the task itself,
the engine reports it at the end of the turn — DONE as `result`, FAILED as `reason`,
text is the worker's summary — via the same path as the tools
(`TrillianInternalApi.concludeTask`, also used by `task_complete`/`task_failed`):
to the head that handed it over, otherwise to Control. Applies to every
task, not just conversations. A reported task loses its link.

The second loss path: a turn that receives a task and ends
**without a single tool call** (live: "Worker spawned, awaiting result."
without `process_spawn`). In the same turn, the engine adds **one** hint
("spawning means calling a tool — handle or report"); if no tool call
comes again, it reports the task as not taken over
(`task_failed`), instead of letting the client wait for a worker
that never existed.

In addition, the generic `wakeup_in(seconds, label, payload)` /
`wakeup_cancel(correlationId)` in the User Loop: the loop can schedule
itself to be woken up later, instead of ending a turn without a connection. The
Wakeup Registry is **in-memory** — a Brain restart discards scheduled
wakeups without a trace, and a `PAUSED`/`SUSPENDED`/`CLOSED` process
swallows them (otherwise, expired ticks would pile up in an Inbox
that no one drains during hours of pause). Thus suitable for polling over minutes
to hours; the standing agenda over days are the `schedule_*` appointments
(§6c).

**Visibility.** The role-gated tools are in the base toolset of the
respective Engine (`ENGINE_DEFAULT_TOOLS`) — a role-gated tool
missing there is invisible to the model, even if it is registered
as a Bean and works via `invoke`. The E2E probe for this is
`TrillianToolSurfaceE2ETest`.

Where Vance knows the time itself, polling is the wrong form anyway:
`PermissionRequestEffect` notifies the requesting Process directly
as soon as its access request has been decided —
no interval to guess, no LLM turn that determines "not yet".

## 6a. Direct Control: `//trillian`

The `user_*` tools do the same, but only if Control is currently
responding and selects the appropriate tool. The command channel is the way for
the **human**: deterministic, without tokens, and available while a
turn is stuck — precisely when you want to check or stop something.

| Command | Effect |
|---|---|
| `//trillian` / `//trillian info` | State snapshot: Control (Status/Session/Nature, head axis `heads` of the resolved Nature — `single`/`multi`, §2), Worker (Account name, Status, Inbox depth, Attributes), list of running Task Workers with **target project** and age |
| `//trillian queue` | Contents of Worker Inbox: per entry type (`task_request` / `task_done` / …), taskId, truncated description, age |
| `//trillian task <description>` | Enqueue task directly, without Control LLM |
| `//trillian stop` | Worker Loop to `PAUSED` |
| `//trillian continue` (alias `resume`) | back to `IDLE` + wake Lane |
| `//trillian clear` | Discard pending **Task Requests**, result events remain |
| `//trillian clear all` | Discard the entire Inbox, including results |
| `//trillian attr` | List Worker attributes |
| `//trillian attr set <name> <value>` | Set attribute — rest of the line is the value, no quoting needed |
| `//trillian attr del <name>` / `attr clear` | Remove single attribute / all attributes |

**The queue is not a task list.** In the Worker's Engine Inbox,
besides waiting `task_request`s, there are also result events
(`task_done`, Worker replies) that the Loop retrieves in the next turn and
reports to Control. A blanket clear would therefore discard finished work:
the Loop never learns the result, and the task remains open forever.
Therefore, `clear` separates the two, and `queue` shows the type
per entry — you see what you're affecting before deleting.

**`task` makes the User Loop individually testable.** Otherwise, it depends on
Control: if the Chat LLM doesn't formulate the task or its provider call hangs,
the Loop doesn't even get a chance. The command enqueues via the same
`TrillianInternalApi.enqueueTask` as `task_enqueue` — a manually
submitted task is indistinguishable from one submitted by Control; the
only difference is who formulates the text (Control with inquiry discipline,
or the human verbatim).

**Lane Semantics.** The handler reports `runsOnLane() = false`. Each
subcommand reads or targets the **Peer**, never the addressed
Control Process; mutations serialize on the **Peer Lane** (in
`TrillianInternalApi.pausePeer` / `resumePeer`). Waiting on the Control Lane
would be backwards: a stop that is queued after the turn it is supposed to
interrupt is not a stop. See
[engine-commands](engine-commands.md) §5.

**`pausePeer` does not wait on the Peer Lane either.** It immediately sets the
out-of-band `requestHalt` flag and merely *queues* the `PAUSED` write operation
— without a join. This is the difference between "takes effect in the
current turn" and "takes effect after the current turn": both Trillian Engines
read `OrchestratorInterrupt.probe(...)` in the loop head, thus seeing the flag
mid-turn and exiting at the next safe boundary. The queued Lane task then writes
`PAUSED` and clears the flag — the same form as `SessionLifecycleService.pauseActiveInSession`,
just without the join. Waiting on the Lane would mean waiting for the exact turn
one is interrupting.

`pausePeer` is idempotent: an already `PAUSED` or `CLOSED` Peer is returned
unchanged. The counterpart `resumePeer` **always** clears the halt flag,
even if the status was not `PAUSED` — a pause that never reached a turn
leaves it set, and a resume without clearing would give the Peer a turn
that exits again at its first loop head check.

**One implementation, two entry points.** Command handlers and
`user_*` tools call the same `TrillianInternalApi`. Everything else
drifts apart, and then you debug the control instead of the issue.

**No ESC replacement.** ESC / `/pause` act per Session
(`pauseActiveInSession` → `findBySession`) and do **not** reach the
Peer Session — this is intentional: the Recipes set
`onIdle: NONE` and the Bootstrapper pins the same Daemon Policy, because
the Worker *should* continue running when the human is idle. A
control cascade across the Session boundary would destroy this property
and incidentally control an external, differently owned Session. The
Lifetime cascade on Session Close (§9) is unaffected by this — it is
lifecycle, not control.

## 6b. Insights View and Kill Switch

The Web Insights interface sees every Trillian of the Tenant as a **pair**
and can pause/resume the User Loop. Read and Write are
deliberately separated: the Read surface (`InsightsAdminController`) remains
read-only, the two mutations are on a dedicated Admin Controller
(`TrillianLoopController`) — the read-only guarantee of the Inspector should
remain readable as a property.

| Endpoint | Effect |
|---|---|
| `GET /brain/{tenant}/admin/trillian` | State snapshot per pair: Control (Session, holding User + Title, Process Status/Nature), Worker (Account + Title, Session, Status, last run, Inbox Depth, Attributes), Task Workers, Pending Inbox, `loopsEnabled` |
| `POST /brain/{tenant}/admin/trillian/{controlProcessId}/pause` | Worker Loop to `PAUSED` — same semantics as `//trillian stop` |
| `POST /brain/{tenant}/admin/trillian/{controlProcessId}/resume` | back + Lane Wakeup — like `//trillian continue` |

The view is the **read twin of `//trillian info`**: same sources
(`TrillianInternalApi.findPeer` / `snapshotPeerState` / `readAttributes` /
`listPending` / `listTaskWorkers`), but typed DTOs
(`TrillianInsightsDto` + subtypes in `vance-api`) instead of rendered maps.
The definition "which processes are Task Workers" (not the Loop itself,
not `CLOSED`, target project visible) is exactly once in
`TrillianInternalApi.listTaskWorkers` and is read jointly by Command and View.
Pause/resume run via `TrillianInternalApi.pausePeer`/
`resumePeer` (Lane opt-out as in §6a) and respond with the **newly
read state of the pair** — the row is replaced instead of reloading the entire list.
Addressing via the **Control Process** Mongo ID,
Gate `Action.ADMIN` on the Session.

**Two gates on the User Loop**, both relaxed-by-default and self-healing
(suppressed loop → next Control turn tries to build again, the
Control conversation says why once and remains fully operable):

- **Model Gate** `trillian.allowed-models` (Default `*`): the Loop identity
  only runs on approved models. Resolved Hub
  (`_user_<trillian>`) → Project → `_tenant`, **without** think-process-Scope —
  a `setting_set` must not open its own gate. The first
  **non-empty** value wins: an empty value (e.g., a field cleared in the Setting Form)
  is skipped so that it does not silently open a Tenant restriction to `*` —
  lifting for a project is only possible with an explicit `*`.
  It is set via the Setting Form `agent-model-allowlists`, together
  with `wowbagger.allowed-models`.
- **Self-Check Cadence** `trillian.wakeup.ladder` (Default `10,20,40,60`) and
  `trillian.wakeup.night-minutes` (Default `120`): how often a quiet Loop
  checks — per Trillian via the same Cascade (Hub Project overrides
  Tenant). Details and immediate wake-up on a conversation contribution:
  [trillian-nature-adam](trillian-nature-adam.md) §7.
- **Kill Switch** `trillian.enabled` (Default on): `false` means **no new**
  User Loop starts. Checked in `TrillianSessionBootstrapper.doBootstrap`
  **before** each minting (no Account, no Home, no Session, no Loop
  remain) and fail-fast in the tool `trillian_session_create` (before
  Session Create, `ToolException`). Same Cascade, same Scope prohibition.

**Running loops are never affected.** Both gates block starts; stopping
is done individually — `//trillian stop`, the pause endpoint, or Stop/Force-Stop
from [session-lifecycle §12.1](session-lifecycle.md). A global toggle
does not kill external, possibly nearly finished work. `loopsEnabled` in the view
answers with the same Cascade "could a new Loop start?" — i.e.,
not "is something running right now", but "will the next turn
build a Loop".

## 6c. Appointments and Standing Goals (A4, A5)

A Trillian has its own calendar: a YAML per appointment under
`_vance/trillian/schedules/<name>.yaml` in the **Hub** — survives restarts
and returns as a `[schedule_due]` line in the `<self-check>`. Deliberately
**not** `_vance/scheduler/` (where Ursa loads its runs) and **not**
Ursa as execution path: Ursa is only a semantic reference.

- **One concept:** `due` (ISO-8601) + optional `next` (`30m`, `2h`, `1d`,
  Floor 5 min). After firing, `next` calculates **from now** (D10) —
  missed appointments never materialize, nothing piles up.
  Without `next`, a one-shot: fires once (even if belated) and sets
  itself to `enabled: false`.
- **Names** are a path segment (`[a-z0-9][a-z0-9_-]{0,63}`) — a `/`
  would have placed the appointment in a subfolder whose name the store
  cannot write back; the appointment would then fire on every wake.
  Hand-edited documents: an unquoted timestamp (YAML-1.1-Date)
  is read, an uncalculable `next` makes the entry
  ineffective instead of continuously firing.
- **Cadence independent of the ladder.** The self-check ladder
  (10/20/40/60 min, measured in silence) indicates when the loop looks
  around; the **Schedule Marker** (`engineParamOverrides.trillianNextScheduleAt`
  = earliest active `due`) indicates when an appointment is due. The
  heartbeat fires appointments in the scan raster (≤ 1 min) — even while a
  worker is running and the ladder is therefore off. The marker is written by the
  `schedule_*` tools and delivery; a missing marker is calculated
  by the heartbeat, and every ladder wake recalculates it (so
  hand-edited documents are also noticed).
- **Delivery:** exactly the **reported** appointments are updated —
  not "what is due now" (an intervening one-shot would otherwise be
  silently disabled), individually, so that a broken entry does not
  hold up the others.
- **`[bored]` (A5), opt-in per Nature** (`TrillianNature.acceptsBoredFindings`,
  today `adam`): after an hour of silence and with standing goals in
  `_vance/trillian/goals.yaml`, the self-check adds a `[bored]` line —
  the loop deliberately spends idle tokens for a small step.
  A watchdog Nature remains at Empty-Discard.
- **`goals.yaml` is written by the human.** The Trillian is WRITER (§8), `_vance/`
  is only readable for it per R4; a SYSTEM write path like for appointments and
  attributes deliberately does not exist for goals.

Doctrine for the model: Manual `trillian-schedules`, hook in the Loop Prompt.

## 6d. Sessions in Projects (A6, D6)

Instead of spawning a worker, the Loop can **go** into a project and
talk to the agent there (flavor 2): `session_open`
creates a session in the target project — **Owner = the Trillian Account**,
never `system=true`, client name `trillian-session:<mode>:<account>`.

- **Own Sessions, proven by the Owner.** The client name is a
  claim (a WS client sets it during handshake freely), the owner is the
  proof: every point checks `session.userId == <account in name>`. A
  human who names their session after a Trillian achieves nothing.
  The Loop's Home Session carries no marking — `session_close`
  cannot end its own Loop.
- **One stay per (Project, Recipe):** a second `session_open`
  returns the open session (`status: reused`). Idleness ends it:
  `onIdle SUSPEND` after 4 h, `onSuspend CLOSE`.
- **Rights:** `START` in the target project on opening, `EXECUTE`/`READ` on the
  Session on **every** `session_send`/`session_close`/`session_read` —
  a revoked grant also ends control.
- **Addressing like with humans:** `session_send` prefixes `@ai`; a
  message starting with `@<person>` only lands in chat, the Engine
  does not run. Delivery via `EngineMessageRouter` (cross-pod).
- **Collaboration strength decides the Nature** (`sessionCollab`, Default
  `JOIN`) on opening; the mode is in the client name. `JOIN` and `SOLO`
  (private, `allowMultipleClients=false`) flow back, `WATCH` does not.
- **Flowback** (`TrillianSessionReplyListener`): the chat process's
  response and lines from **humans** become the
  `<session-reply session from>` event; interim notes, worker lines,
  its own messages, and lines without sender are not forwarded.
  The target is the **currently living** Loop of the Account (the Loop is
  fluid, D1); multiple lines before the next turn are drained together.
  The text is foreign and rendered with «…» and origin hint.
- **End:** closes the Control Session, the Lifecycle Hook closes all
  open Sessions of the Account with it (§9).

Doctrine for the model: Manual `trillian-sessions`, hook in the Loop Prompt.

## 6e. "Operator" Mode of Operation (P7)

The Recipe defines the Tool Surface, the Nature the doctrine — the Turn
does not choose a mode of operation. `trillian-operator` is the same Nature `void`,
but pins the Loop `trillian-user-operator` via `params.userRecipe`,
which additionally carries the `foreign_*` document tools (`foreign_project_list`,
`foreign_doc_list|search|read|copy`): small cross-project jobs ("check
it out", "fetch the document") are done by the Loop itself, longer ones
go to Workers. Writing *in* a foreign project remains with the Worker,
who has rights and context there.

## 6f. Conversation Heads (MultiHead, Nature `colin`)

A MultiHead Nature answers every **discussion thread** addressed to
its account with a dedicated conversation head process —
the Loop remains free of external conversation texts. Plan and decision history:
`../../../../planning/archive/trillian-exposure.md` (Phase 1 and 2 implemented; the door to the outside:
[trillian-exposure](trillian-exposure.md)).

**What a conversation is** (`TrillianHeadService.isConversation`): an open
thread with the tag `discussion` (`MaximegalonService.TAG_DISCUSSION` —
set by every discussion opener: `POST /inbox/discussions`, the
Agents door), which is not an Ask and carries no Effect. A notification
that only lands on Trillian's desk — a shared document, a
process output, a scheduler note — often carries a body, but was not
opened to be answered: no head, no sweep, no conclusion. Without this
boundary, every notification would cost a head slot and a model call
and reply "system". The opening post of a body-only thread (the form of
every opener) counts as a contribution — for the listener as well as for
the sweep (`TrillianHeadService.openerOf`).

```
Contribution in Thread T (not by Trillian itself)
  → MaximegalonMessageEvent / MaximegalonCreatedEvent
  → TrillianThreadListener: Conversation? MultiHead? live Loop?
  → TrillianHeadService.ensureHead(loop, nature, T)
  → EngineMessageRouter → Head for T: <thread-message …> as Turn input
  → Head: reads/writes Hub documents, researches, task_enqueue for long-running tasks
  → Turn end: the reply is posted in T (onNaturalStop)
  → Counterpart's farewell / agent_close / idle → T archived
  → Sweep closes the head (one place, all causes)
```

- **The Head is its own Engine: `TrillianHeadEngine extends
  FrankieEngine`** — the same fork as the Per-Task Worker
  (`TrillianWorkerEngine`, §4.3): Frankie's loop form (drainPending → LLM →
  Tools → natural-stop → IDLE, no termination tool), with the
  conversation surface instead of the work surface. Five fork interfaces,
  none touching Frankie's protocol (Frankie's side: [frankie-engine](frankie-engine.md) §Derivations):
  - **Surface and Role.** `allowedTools()` is the Head's surface:
    the conversation (`thread_get`, `thread_message_add`, `inbox_archive`), the
    **Hub documents** for reading (`doc_list`/`find`/`count`/`grep`/`read`/
    `info`/`summary`, `pdf_read`) and writing (`doc_write`/`edit`/
    `append`/`replace_lines` — same as Trillian Workers; rights are
    those of the Account, WRITER, so never `_vance/`), **research** (`web_fetch`,
    `web_search`, `research_*`), `task_enqueue` plus Discovery and
    Scratchpad. The Head checks itself — live test (2026-10-14)
    showed that a Head that has to delegate for every lookup
    doesn't find the handover and cancels. Not included: `exec`/`file`,
    and **deliberately no Worker Pool** — that carries `process_list`/`stop`/
    `steer`, `inbox_list` and the `wakeup_*` tools, and the Head lives in the
    Loop Session next to the Loop and all other Heads: a counterpart must
    neither list nor control or stop them, nor list other conversations.
    Only Control can do that.
  - **The boundary is Trillian, not the Head** (decided 2026-10-14).
    A Head is a face of Trillian, not an independent actor: it acts
    with the rights of the Trillian Account, and all conversations — including
    those of external counterparts of other Heads — are conversations of this Account.
    The Thread tools therefore check the Account's right, **not** whether the
    `threadId` is the Head's own thread; a Head can only reach an external thread
    via a known ID (no `inbox_list`). Similarly, it reads the entire Hub
    **including `_vance/`** (Journal, `goals.yaml`, `exposure.yaml`, Attributes) —
    deliberately, the content is considered uncritical towards the counterpart.
    Only writing is protected: `_vance/` by R4, and standing instructions are therefore
    under `_vance/trillian/agent.md` (Recipe param `agentDocument` in all
    Trillian Recipes, [agent-document](agent-document.md)) instead of in the
    Hub root — a Head is WRITER on the Hub and must not overwrite
    what Loop and Worker obey. The Head Prompt does not mention these boundaries:
    a rejected write action is sufficient answer for the Head.
  - **Bound to the Hub**
    (`ThinkEngine.confinedToOwnProject()`): Trillian is WRITER on its human's project (§8) —
    a `projectId` argument or a document ID outside the Hub is **rejected**
    ("out of reach"), not silently redirected to the Hub: otherwise, the model
    reports the external project as empty (observed live). An Active Project slot
    is ignored (`EddieContext.resolveProject` / `requireReadableById`). Sub-processes
    retain the silent redirection — there it is hallucination protection, not a boundary.
    For long-running work, `task_enqueue` remains with the Loop. No
    `user_*`. Role is
    `trillian-task-requester`, **not** `trillian-control`: `task_enqueue`
    is gated on the Requester role, which Control and Heads share; the
    Control role would release `user_*` control, and an
    `allowedToolsAdd` in the Head Recipe could then actually fetch it.
  - **Prompt.** Own Engine Prompt `_vance/prompts/trillian-head-prompt.md`
    (conversation doctrine: the reply is the turn completion, may ask questions,
    work independently, hand over long-running tasks, completion by counterpart)
    instead of Frankie's Worker Prompt — which says
    "no chat partner, no questions", and a Recipe `promptPrefix`
    can only append, not retract. Additionally, the Engine appends
    `TrillianNature.headSystemAddendum(head)`: on the MultiHead side
    `final` = shared Persona (the Loop's attributes, read via the Peer link)
    + `headPromptAddendum` of the Nature. Control never receives Head text.
  - **Rendering.** Contributions as `<thread-message>` with Provenance/«…»,
    Task results with full `result`/`reason`.
  - **Persistence** of Steer Messages as Chat History (§10 contract — a
    conversation lives across turns, a worker task is turn-local).
  - **The reply is the turn completion** (`onNaturalStop`, since
    2026-10-14). If a Head turn ends with text, the Engine posts it as
    an Account contribution to the thread — once (if the same text was already
    there since the last message from the counterpart, via `thread_message_add`,
    not again) and always without reasoning markup
    (`LlmResponseSanitizer.stripUnconditional`, also an orphaned
    `</think>`), because the thread goes externally. `thread_message_add`
    remains for interim states. Occasion for live test: replies that the model
    wrote as plain text — the natural turn completion — reached
    no one; the reminder ladder only caught it after minutes.

  **Conclusion: the counterpart ends the conversation.** Replies or a
  completed task do not end it; the Head only archives on a
  farewell signal from the counterpart (or `<thread-conclude>`), everything else
  is closed by the inactivity sweep. Observed live: a Head told "archive
  when the task is done" archives after the first reply — the next
  question then runs into "conversation archived".

  The Recipe `trillian-head-<nature>` only pins Engine, Nature, and Model
  and classifies the worker-deferred built Thread tools with
  `allowedToolsAdd` to *primary* (the same pattern as Adam's Loop Recipe).
- **One Head per Thread, in the Hub, in the Loop Session.** The join is the
  `engineParams` marker `trillianHeadThread`. Name `trillian-head-<threadId>`,
  for every additional Head of the same thread `-2`, `-3`, … — names are unique per
  Session, **even for CLOSED processes**; a thread whose Head
  died (Force-Stop, crash, thread reopened) thus gets a new one
  instead of an eternal collision. The name is deterministic from
  the Session state: two Pods serving the same thread simultaneously
  collide on the unique index, the loser re-reads and takes over the
  winner's Head — the contribution in hand is not lost.
  Head limit per Trillian (`TrillianNature.headLimit()`, Default 5) limits
  parallel conversations — the Exposure Config can lower it, never raise it (it
  is the barrier against costs and thread flood); Head model gate like that of the Loop
  (`trillian.allowed-models`).
- **Task Flowback: Results go to the client.** `task_enqueue`
  carries its own Process ID as `replyTo` — unless it is the Loop's Peer
  (Control): its results go there anyway. The Loop records
  the assignment during drain (`engineParams.taskReplies`);
  `task_complete`/`task_failed` consume it, `task_needs_input` only reads
  it (the task is not finished, its result must still find the Head).
  A Head receives the result as a `<process-event>` (with full
  `result`/`reason`) and writes it to the thread. If a Head closes,
  it takes the addresses still pointing to it with it — a late
  result then falls back to the Peer.
- **Write discipline on the Loop's `engineParams`.** Two Lanes write
  to the same process: the Loop (`taskReplies`) and Control (`attributes` via
  `user_attr_*` / `//trillian attr`). Both therefore write **only individual
  entries atomically** (`ThinkProcessService.setEngineParamEntry` —
  `$set`/`$unset` on `engineParams.<key>.<entry>`), never the entire map
  back; a full-map write by one side would roll back the other Lane's change.
  The Nature receives the map in `attributesChanged` as it stands in Mongo after the write.
- **Head and Thread end together.** The Sweep (`TrillianHeadSweepTick`,
  Hub's Home Pod, standard cadence 60 s) is the **single** closing point for
  Heads: a thread that is archived (by the Head itself, by the
  counterpart, by a human, by the Sweep) takes its Head with it —
  deliberately **not** via archive event, because the Head archiving in the turn
  would be closed mid-turn. Additionally, the mechanical ends:
  unanswered contributions receive a reminder round (`reminder=true`) after
  `vance.trillian.head.reminder-after-ms` (Default 5 min), a fixed fallback
  contribution after `fallback-after-ms` (Default 1 h); the message limit closes at
  ~480 with nudge and ~495 mechanically (hard wall remains `MAX_MESSAGES` = 500);
  **idleness** closes the Sweep with a farewell contribution: nothing owed
  (the last message is from Trillian), the Head is not running
  (RUNNING/INIT), none of its tasks are open in the Loop (`taskReplies`),
  and the window has expired since the last activity — last contribution or last Head turn,
  whichever was later — (`vance.trillian.head.idle-ms`, Default 1 h; per Trillian `idleMinutes` in
  the Exposure Config). Measured at the Head, not just the Thread: whoever
  works for an hour or waits for their Loop is not idle, even if
  no one writes. An owed contribution first goes through reminder and
  fallback; its post starts the window. Heads have no
  wake-up tools — appointments are the Loop's business.
- **Conversations without a Head.** An open thread with an unanswered contribution
  and no living Head (rejected at the Head limit or model gate on entry,
  Head died, contribution arrived while the Loop was down — also an
  unanswered body-only opener) is delivered again per
  round — a freed slot picks it up. If this fails until the end of the
  reminder window, the Sweep rejects in the thread
  ("cannot accept this conversation right now, please try again later") — the
  counterpart never waits for silence; if they write again, it starts over.
- **`headConcluded`: once per conversation, with the true cause.**
  `COMPLETED` (Head or human archived), `LIMIT`, `INACTIVITY`,
  `ACCOUNT_ENDED`. If the Sweep ends a conversation with a Head, it sets the
  cause **before** archiving as an override marker (`headConclusion`) on
  the Head; the closing round reads it and reports. A conversation without a Head
  has no closing round and reports directly on ending. A thread in which
  Trillian was never involved (headless, manually archived) reports nothing.
- **Trillian end archives open conversations.** The Lifecycle Hook
  closes every open Conversation Thread for MultiHead Natures with a
  farewell contribution before Account and Hub fall — the counterpart should
  not write to a thread that no one reads anymore. The Heads have already
  died with the Loop Session's cascade (without a closing round),
  so this path reports `ACCOUNT_ENDED` itself, once per thread. SingleHead threads
  are human affairs and remain untouched.
- **Heads are not Task Workers** (`listTaskWorkers` filters them): they are
  Trillian in conversation, not Trillian at work.
- **Distinction from `inbox_unread`:** that is SingleHead behavior (Adam §7).
  The Loop of a MultiHead Nature has neither Thread tools nor Thread
  findings — a thread that would reach both Head and Loop would be
  answered twice.

## 7. Cross-Project Mechanics

Trillian-User can spawn Workers in external projects via
`cross_process_create(projectId, …)`. Mechanics:

1. Tool validates: `projectId` exists in Tenant + is not
   SYSTEM.
2. Tool dispatches via `ActionExecutorRegistry` with `TriggerContext.
   sessioned(tenantId, projectId=TARGET, …)` — overrides
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
Session Lifecycle per Task. Result: fewer Sessions in the Tenant, all
Workers of a Trillian kept together under one Session,
parallelizable.

## 8. Bootstrap

`TrillianSessionBootstrapper` is called by `SessionChatBootstrapper`
after the Chat Process has been created, and — because the Loop
is fluid (D1) — at the head of every Control Turn and every `//trillian`
command (`ensureUserLoop`). Trigger:
`process.thinkEngine == "trillian-control"` (Nature-agnostic).

**Serialized per Control Process, cluster-wide:** a Bootstrap Lease
(`trillian_wakeup_claims`, `lease/bootstrap/<tenant>/<controlId>`, TTL
2 min for dead holders). Whoever does not get the Lease leaves the build to
the holder. Under the Lease, the Control Process is **freshly read** — a
copy from before waiting would not carry the wiring that the holder
has written in the meantime.

Sequence — everything that can reject, **before** minting:

1. **Kill Switch** `trillian.enabled` (§6b). Off → Loop suppressed,
   nothing created.
2. Nature from `controlProcess.engineParams.nature` (Default `void`).
3. **Adopt Account or choose a name.** If a Process of this Session
   carries a `trillianUserName` and the Account still exists,
   it is reused (reactivation, rebuild of the fluid Loop).
   Otherwise, a fresh name **`_trillian-<nature>-<instance>`** (four
   random digits; free means: no Account **and no Hub** of this
   name — an incompletely swept Hub would otherwise be inherited). Only
   choose, do not write anything yet.
4. Resolve User Recipe (`params.userRecipe` or `trillian-user-<nature>`) via
   `RecipeResolver.applyDefaulting`.
5. **Model Gate** `trillian.allowed-models` (§6b): Model resolved in the
   future Hub, Allowlist via Hub → Control Project → `_tenant`.
   Rejected → Loop suppressed, announced once, **nothing minted**.
6. Resolve User Recipe's Engine.
7. **Mint** (only for fresh name): `createServiceAccount`, title
   `Trillian <nature>-<instance>`; the name is **immediately** written
   to the Control Process — if something fails afterwards, the next
   attempt adopts this Account instead of minting another.
8. **Hub** `ensureHome` → `_user__trillian-<nature>-<instance>`; after
   creating the Loop, re-derive `ownerRequired` (a living Loop is
   waiting work) and place the Hub here (`bring`; if another Pod already
   holds it, it wakes it).
9. **Seed Authority** — `PermissionBootstrap.grantProjectWriter(tenant,
   controlProject, account)`, on **every** Bootstrap (idempotent; an
   attempt that died between Mint and Grant would otherwise leave an
   Account without rights). Scope deliberately only the Control Project; further
   projects by request (§13). **WRITER, never ADMIN** (since 2026-10-14): a
   Trillian works in its human's project, it does not manage it —
   ADMIN would mean granting permissions and rewriting `_vance/` (R4), and a
   Trillian is controlled by agents, and from Exposure also by counterparts.
   Re-seeding lowers the ADMIN that earlier versions seeded; a
   deliberately granted ADMIN grant by a human is left untouched. On
   its own Hub, Trillian as a Service Account is also WRITER
   (permission-system R7) — its stores (Attributes, Journal, Schedules)
   write as `WriteReason.SYSTEM`.
10. Loop Session in the **Hub** — Owner = Account **Name**, Profile
    `headless`, `system=true`, Daemon Lifecycle.
11. Primary Process `trillian-user-loop`, `parentProcessId =
    controlProcess.id` (cross-session parent); carried attributes
    (`carriedWorkerAttributes`, otherwise `Nature.initialAttributes`).
    If Create fails due to double process, the newly created empty
    Session is deleted again.
12. Wiring in `engineParams` of both Processes (`peerProcessId`,
    `peerSessionId`, `trillianUserName`).
13. **Announce identity in Control Chat** — persistent ASSISTANT
    line with Account Name and Hub. Best-effort.
14. Start User Process on its own Lane.

**Rebuild of the fluid Loop** (`ensureUserLoop`): if Loop Process or
Session is dead, the old Loop's attributes are parked and the
wiring removed — **in a single** write operation (two write operations
from the same copy had deleted the parked attributes again) —, then
the sequence above runs with adoption. Errors here do not leave the Control Turn
stuck on `RUNNING`; `//trillian` states the reason for a suppressed Loop.

## 9. Cleanup Lifecycle

**Lifetime = Control Session (D1).** `TrillianSessionLifecycleHook`
(§9a) completely removes Trillian on **closing and deleting** the
Control Session, in this order:

1. Close Loop Session (`closeWithCascade`) — processes run *as*
   the Account and must end before it.
2. Discard stored Nature attributes (`accountDiscarded`).
3. Revoke Grants (`PermissionBootstrap.revokeAll`) — a Grant must not
   outlive its subject, even if the Account is already gone.
4. **Close all open Sessions of the Account** — including those opened
   via `session_open` in external projects (§6d).
5. **Sweep Hub** via `TrillianHubSweeper` (`UserHubSweeper`-SPI): close
   living Hub Sessions, then run **every `ProjectDataHandler`** on
   the Hub, the project document only afterwards and only if
   all passed. Deleting only the project document (formerly:
   `ProjectService.deleteUserHub`) left Schedules, Goals, Settings,
   Loop Session, and Chat under the Hub name — inherited by the next
   Trillian of the same name. The Sweeper is the **named exception** to
   "the Brain does not call maintenance handlers": the gate is the closing of
   the Session by the human, strictly by **form** (it refuses everything
   except `_user__trillian-…`).
6. **Delete Account** — only if the Hub is gone. Otherwise, it remains as
   a name reservation until a subsequent run (or `user delete`)
   finishes sweeping the Hub.

Archiving the Control Session only pauses (Account and Hub remain,
§9a). The end of a Trillian via **project deletion** (anus
`project delete`) runs via `TrillianProjectDataHandler` (Order 50): it
first sweeps each Account's Hub via the same `UserHubSweeper` (implemented
in the shell via `ProjectMaintenanceService.deleteUserHub`) and
only deletes the Account if the Hub is gone — otherwise, the Account remains,
the handler reports the run as incomplete, and `user delete` on the
Account is the repair path.

### 9a. Session Lifecycle Cascade

The Process Status is the wrong hook for something that depends on the
**Session**: every path that ends a Session without setting exactly
this Process to CLOSED silently bypassed the cleanup work — a deleted
Control left the Worker Session, along with ChatMessages, Processes, and Memories,
as a shell (invisible because `system=true`).

`TrillianSessionLifecycleHook` therefore implements the generic
[`SessionLifecycleHook`](session-lifecycle.md) and pulls the
Worker Session along:

| Control | Worker Session | Service Account |
|---|---|---|
| closed | closed | **deleted**, Hub swept (§9) |
| archived | **archived** | **remains** (with Hub) |
| reactivated | old deleted, new built | **same** (Adoption, §8) |
| deleted | **hard deleted** | deleted, Hub swept |

The Loop Session itself is **fluid**: if it is closed or
archived without the Control Session ending, the next
Control Turn rebuilds it with the same Account (§8) — its end
removes nothing.

**Attributes travel with it.** They are stored in the `engineParams` of the
Worker **Process** (§10a) — Mongo-persistent, thus surviving restart,
Pod change, and archiving itself. Only reactivation deletes the
old Worker Session and thus its carrier. The hook therefore saves them
beforehand to the closed Control Process
(`engineParams.carriedWorkerAttributes`), and the Bootstrap sets them on the
new Worker during adoption — and clears the temporary storage again
so that no outdated Persona is resurrected.

**The Account survives archiving** — archived means put away,
not discarded. A Trillian that returns with a different identity, without
attributes, and without rights has not returned.
Conversely: an archived Trillian retains its project grants,
even though no one uses them (visible via `permission_grant_list`); whoever
wants to retrieve them **deletes** the Session instead of archiving it.

**Recursion protection via the Engine, not via the wiring.** The
hook only acts on a Session that has a Process with the Engine
`trillian-control`. The wiring is not suitable for this: **both**
sides carry `peerSessionId`, each pointing to the other (the
Bootstrap sets it in §8 Step 6 on Control *and* User Loop). Whoever
keys on this sends the deletion back and forth between the two Sessions
until the stack is full — observed as `StackOverflowError` on the first
reactivate — and along the way lets the Worker side delete the shared
Service Account, because `trillianUserName` is also on both.

Nature `void` remains ephemeral insofar as the Account is bound to *its* Session
— it does not exist beyond its end. Across Brain restarts, Pod changes, and archiving,
however, it remains preserved (§10b).

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

`SteerMessage.Reply` (Worker-natural-stop) and
`SteerMessage.ProcessEvent` (terminal DONE/FAILED) are
rendered differently (`<worker-reply …>` vs.
`<process-event type="done" …>`) — both are explained in the
Trillian-User Prompt as valid Task Result signals.

## 10a. Trillian-User Attributes (free-form)

Control can set arbitrary Key-Value pairs on the Trillian-User-Loop-Process
via `user_attr_set(name, value)`. Storage:
`process.engineParams.attributes` (`Map<String, Object>`) — at
runtime for **every** Nature, including `adam`. What distinguishes
Natures is **durability** (§10a, "Durability").

The active `TrillianNature` decides how the attributes are interpreted.
Nature `void` does both:

- **`userPromptAddendum(process)`** — renders
  `process.engineParams.attributes` (= the User Loop's own attributes)
  as a Markdown block in the User Loop Prompt.
- **`controlPromptAddendum(process)`** — follows
  `process.engineParams.peerProcessId` to the User Loop and renders
  **the same** attributes also in the Control Prompt.

This ensures that Control + User Loop behave **consistently**: if the
human sets `user_attr_set(persona="witty Swabian …")`, both Control's
chat response and all spawned Workers speak in the style of this Persona.
Storage remains single-source-of-truth on the User Loop; Control reads
cross-process via Peer Lookup.

**Write only per entry.** `user_attr_set`/`_clear` and
`//trillian attr` write each attribute as a single atomic entry
(`engineParams.attributes.<key>`, `ThinkProcessService.setEngineParamEntry`),
never the entire `engineParams` map back: the Loop writes to the same
process from its own Lane (`taskReplies`, §6f), and a full-map write
by one side would roll back the other's change. The Nature receives
the map in `attributesChanged` as it stands in Mongo after the write.

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
source for reflection phases, or as a routing hint for sub-worker
Recipe selection. The convention for attribute names lies with the Control
LLM — Nature documentation recommends well-known names per Nature. And yes:
Nature-A can **decide differently** whether Control should also
see the attributes (e.g., if Control only delegates instead of
responding itself) — the hook is overridable.

Tools: `user_attr_set` / `user_attr_clear` / `user_attr_list`,
all engine-role-gated to `trillian-control`. API:
`TrillianInternalApi.setPeerAttribute` /
`clearPeerAttributes` / static `readAttributes(process)`.

### Nature-specific: Durability, Character, Reflection

How a Nature handles attributes is its decision, not the framework's.
Nature `void` keeps them in `engineParams`, where they die with the Process lines.
Nature-A `adam` gives each Trillian a character, stores attributes as a document,
and keeps a reflection journal — all via the hooks below, without the Engine
knowing about it.

Fully described in **`specification/public/trillian-nature-adam.md`**.

The hooks the framework offers for this:

| Hook | Who calls | Purpose |
|---|---|---|
| `callName(attributes)` | Bootstrap (greeting) | Call name, Default `"Trillian"` |
| `initialAttributes(tenant, project, account)` | Bootstrap, if nothing passed | Initial values for a fresh Worker Loop |
| `attributesChanged(worker, attributes)` | `TrillianInternalApi` after each mutation | Establish durability |
| `taskConcluded(worker, taskId, outcome, summary)` | `dispatchTaskEvent`, only `done`/`failed` | Learn from a conclusion |
| `accountDiscarded(tenant, project, account)` | `TrillianSessionLifecycleHook`, before Account deletion | Release everything under the name |
| `controlPromptAddendum` / `userPromptAddendum` | Both Engines per Turn | Prompt overlay |
| `headSystemAddendum(head)` → `headPromptAddendum(head)` | Head Engine per Turn (MultiHead only, §6f) | Persona + Nature text in Head |
| `headConcluded(tenant, account, thread, cause)` | Head Sweep / Trillian End (§6f) | Once per ended conversation |
| `beforeControlTurn` / `afterControlTurn` / `beforeUserTurn` / `afterUserTurn` | Both Engines | Turn Lifecycle |

`attributesChanged` is deliberately tied to the **mutation funnel** in
`TrillianInternalApi`, not to the tools: `user_attr_set` and
`//trillian attr set` share this API, and a Nature that only learned from
one of the two would be worse than one that learns from neither.
The same applies to `taskConcluded` and `dispatchTaskEvent`. All hooks
swallow errors — the authoritative write operation has already occurred
at this point.

## 10b. Resilience: Pod-Restart, Cross-Pod-Move, Suspend

Trillian is persistent in Mongo (Session/Process-Documents,
ChatMessage-History, Engine-Inbox-Messages, engineParams.attributes).
In-Memory is only the Lane Queue + the Foot-WS-Binding of the
Control Session — both are reconstructible on boot.

**The Loop lives in the Hub, and the Hub has a Home Pod** (since
2026-10-13 — D2 "no Home Pod" is revised, Plan
`planning/user-hub-home.md`). The Hub `_user__trillian-…` is placed
like any project via a Lease:

- **Placement:** a living Loop is waiting work —
  `TrillianOwnerRequirement` registers it with `ProjectOwnerRequirementService`
  (`ownerRequired`), Distributor and Boot-Pull keep the Hub on
  a Pod. Re-derived on Bootstrap and on Loop closure.
- **Wake-up:** `TrillianHeartbeatTick` only wakes Loops in Hubs that
  its Pod holds (`findRunningByHomePodId` + an indexed query of
  living Loops, `engine_status_idx`). Whether an appointment or self-check
  is due is stored in the process (`engineParamOverrides`) — if the
  holder dies, the Distributor re-places the Hub, and its next round
  finds the Loop still due.
- **Turn:** the Turn Lease (§4.2) keeps the Loop cluster-wide on one
  Turn; the Lane serializes only per Pod.
- **Build:** the Bootstrap Lease (§8) keeps the pair's rebuild on one
  Pod.

The **Control Session** continues to follow its project's Home Cluster.

**Suspend behavior:** Trillian runs daemon-style — the Control Recipes
(`trillian-void.yaml`, `trillian-adam.yaml`) explicitly set
`onIdle: NONE`, and `TrillianSessionBootstrapper` explicitly pins the same
Daemon Policy to the User Session via
`SessionService.applyLifecycleConfig`. Thus:

- Async `task_done` events from the User Loop are processed even
  when the human is not actively chatting
- Control does not wait for Resume Cascade on reconnect
- Sweeper (`SessionIdleSweeper`) automatically skips NONE Sessions

`onSuspend: KEEP` with Default `suspendKeepDurationMs: 24h`. For
explicit suspend action (e.g., via `process_pause`), there is a 24h
grace period before the Suspend Sweeper closes — enough buffer for longer
breaks.

**Cross-Project Worker on Pod Move:** Worker Process has
`process.projectId = Target Project`, the Pod claiming this
Target Project runs the Lane. If Trillian-User-Session is in
Project A (Pod 1) and spawns Worker for Project B (Pod 2),
this is normal Vancetope Cross-Pod operation — `EngineMessageRouter`
routes ProcessEvents between Pods.

## 11. Worker Termination and `enrichWithLastReply`

Frankie in worker-mode skips its normal `persistAssistantReply` path
on tool-terminate — therefore, Workers terminating via
`trillian_done` must write the Summary **themselves** to
`chatLog`. `TrillianDoneTool` does this before returning the
`_terminate=true` result:

1. Look up current Process from `ctx.processId()`
2. Append Summary as ASSISTANT message to `ChatMessageDocument`
3. Return Result map with `_terminate=true` + summary

This allows `ParentNotificationListener.enrichWithLastReply` to find
the Summary and append it to the DONE-ProcessEvent. Trillian-User
gets the actual Summary instead of the generic "Child process X
status=done".

**The second exit: `trillian_ask`.** It also exits the turn via
`_terminate`, but `TrillianWorkerEngine.onWorkerTerminate` sees the
`trillianAskPending` marker and parks the Worker **IDLE** instead of closing it (§4.3).
Because the `_terminate` path does not notify anyone,
`TrillianAskTool` delivers the question itself: ASSISTANT message to the
`chatLog` and `emitReply` — the same channel as a natural-stop, so the
Loop sees the familiar `<worker-reply>` form — plus an acknowledgment as
USER message in the Worker's history (otherwise the model asks the question
again in the next turn).

## 12. Vancetope Core Adaptation — `ThinkEngineService.newContext`

Before Trillian, `ThinkEngineService.newContext()` always read the `projectId`
for the `ToolInvocationContext` from the Session
(`session.getProjectId()`). For Cross-Project Workers
(`process.projectId != session.projectId`), this led to
tools like `doc_*` / `file_*` always operating on the Session Project,
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
unaffected, because a new Session is created in the target project there anyway.

## 13. Limitations Nature `void`

Deliberately excluded (available from Nature-A; what `adam` already
implements is marked):

- **Personality** (Traits, Principles)
- **Reflection Phases** (light / full / error analysis / periodic) —
  a simple form built into Nature-A `adam` (one line per
  completion, success as well as failure); the staggering by type is open
- **Mode Switch** Low/High/Sleep with Cadence Tiering
- **Token Budget** Soft/Hard with Setting Cascade
- **Plan Revision** / Correction Check between Sub-Goals
- **Trillian-User Persistence** beyond Session Destroy — for
  attributes solved in Nature-A `adam` (see its spec), for the rest
  open
- **Automatic Cross-Project Rights** for `_trillian-*`. The Bootstrap
  grants WRITER on **exactly one** project (that of the Control Session, §8
  Step 9); `cross_process_create` into an external project runs into a DENY
  without approval. This remains so — an ephemeral, LLM-controlled
  Account cannot grant itself rights (otherwise self-escalation).
  The path to this has been the **explicit approval** since 2026-08-10:
  `user_project_request(projectId, reason)` (control-role-gated) submits
  a request that an administrator of the target project approves via the Inbox
  — only then does `allowsCrossProjectSpawn=true` (§7)
  become practically effective. The generated Account name remains internal; the tool
  fills Subject and Role (WRITER) itself. Mechanics:
  `planning/permission-request-inbox.md`.
- **Self-Evolution** of Traits between Runs
- **Cortex Right Panel Display** for Trillian-User Status

These points are reflected in Nature-A+ as overrides of the
`TrillianNature` hooks — no new Engine build needed.

## 14. Tenant Setup & Discovery

Bundled Default Recipes (in the Cascade under
`vance-brain/src/main/resources/vance-defaults/_vance/recipes/`):

- `trillian-void.yaml` — Nature `void` Control (`listed`)
- `trillian-user-void.yaml` — Nature `void` User Loop
- `trillian-operator.yaml` / `trillian-user-operator.yaml` — Nature `void`,
  "operator" mode with `foreign_*` tools (§6e)
- `trillian-worker-void.yaml` — Nature `void` Worker
- `trillian-adam.yaml` — Nature `adam` Control (`listed`)
- `trillian-user-adam.yaml` / `trillian-worker-adam.yaml` /
  `trillian-adam-reflect.yaml` — the Adam family
- `trillian-colin.yaml` / `trillian-user-colin.yaml` /
  `trillian-worker-colin.yaml` — the Colin family (Control `listed`,
  Loop **without** Thread tools, §6f)
- `trillian-head-colin.yaml` — the Conversation Head (§6f), `listed: false`:
  never picked by humans, spawned by Head Service by name

Foot Start:

```bash
java -jar vance-foot.jar --recipe trillian-void     # Nature `void`
java -jar vance-foot.jar --recipe trillian-adam     # Nature `adam`
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
  Sibling Processes → v2-Pivot to Two-Sessions, discussion of
  Eddie reuse, Cross-Project pattern decision,
  Chinese whispers analysis). Remains as design note; this spec is
  authoritative.
- `planning/trillian-next-gen.md` — Trillian Next-Gen: Home, Identity,
  Model Gate, Appointments, Sessions (A1–A6, D1–D10).
- Manuals `_vance/manuals/trillian-schedules.md` and
  `_vance/manuals/trillian-sessions.md` — Loop doctrine for §6c/§6d.
- `specification/public/trillian-nature-adam.md` — Nature-A `adam`:
  Character, persistent attributes, reflection journal, worker episodes.
- `specification/think-engines.md` — Engine Registry,
  `allowsCrossProjectSpawn`, Lifecycle contract.
- `specification/frankie-engine.md` — Worker Loop pattern,
  `_terminate` convention, ParentNotificationListener.enrichWithLastReply.
- `specification/eddie-engine.md` — Cross-Project pattern via
  structured-action-schema; Trillian deliberately chooses a different path.
- `specification/recipes.md` — Recipe Cascade, `allowedToolsAdd` vs.
  spawn-time-membership.
- `specification/architektur-scopes-clients.md` — Session/Process-
  Scope hierarchy.
- `CLAUDE.md` Section "Think-Process / Scope Peculiarities" —
  ProcessEvent, drainPending, Auto-Wakeup.
