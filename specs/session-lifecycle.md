---
title: "Vancetope — Session Lifecycle"
parent: Specs
permalink: /specs/session-lifecycle
---

<!-- AUTO-GENERATED from specification/public/en/session-lifecycle.md — do not edit here. -->

---
# Vancetope — Session Lifecycle

> Defines the status set for Sessions and Engines (Think-Processes), the typed lifecycle properties of a Session, the suspend/archive/close behavior depending on the trigger, auto-restart and manual-resume after forced suspends, as well as the user-facing metadata (Title/Icon/Color/Tags/Pin) and the search infrastructure that makes Sessions portable as long-lived knowledge containers.
>
> This spec consolidates previously distributed statements from [architecture-scopes-clients §2](/specs/architektur-scopes-clients), execution-and-persistence §3 + §5, and [think-engines §3 + §5 + §6](/specs/think-engines). Where there are contradictions (especially the blanket suspend cascade, the mixing of logout with Session-Close, the two-mode view Interactive/Autonomous, and the original "Sessions will be deleted soon" assumption), **this file** takes precedence.

---

## 1. Three Driving Use Cases

Three types of Sessions, differing not in the Engine, but in their *lifecycle behavior*:

| | **Assistant Session** | **Event-driven Session** | **Long-running Session** |
|---|---|---|---|
| Who / by what started? | User via local client | Event (Cron, Webhook, ...) | User |
| Typical Profile | `foot` | (profile-free or own trigger-Profile) | `web` / `mobile` |
| Client at start? | yes | no | optional |
| Client during run? | yes, sequentially | no | optional, can leave |
| Disconnect behavior | Engine continues, Idle-Sweep parks after Throttle | n/a | Engine continues |
| Pause/Steer by User? | yes, directly | no (or via Monitor-Reattach) | yes, directly or via Monitor-Reattach |
| Termination | Logout / Idle-Sweep | all Engines idle → Auto-Close | Goal reached / Idle-Sweep |
| Default end state | `ARCHIVED` (resumable) | `CLOSED` (terminal) | `ARCHIVED` (resumable) |
| Typical tasks | Coding, research dialog | News gathering, reporting, routine jobs | Multi-step research, data collection, longer analysis |

**Important insight:** "Assistant vs. Autonomous" is not a separate axis. The difference lies in the **Lifecycle-Properties** of the Session (§5), which are typically derived from the **Profile** (§6), but are persistently decoupled from it.

**User-Sessions are long-lived.** A `foot`/`web`/`mobile`-Session is **not** a throwaway container by default, but a knowledge artifact: Working-Sessions ("do this, fix that") ultimately represent the de-facto spec of what was done; Discussion-Sessions ("how do we best do X?") can be resumed weeks later. Both are **archived, not deleted** — see §11. Hard Auto-Close remains reserved for `daemon` and event-driven triggers that do not carry human memory.

---

## 2. Three Orthogonal Axes

```
SessionStatus    INIT ──► RUNNING ⇄ IDLE ──suspend──► SUSPENDED ┬─[onSuspend=KEEP,  transitionAt]─► ARCHIVED ─reactivate─► IDLE
                                                                ├─[onSuspend=CLOSE, transitionAt]─► CLOSED
                                                                └─[abandoned-detection]──────────► CLOSED
                                                                            ARCHIVED ─user-delete─► CLOSED

BindStatus               bound  ⇄  unbound       (Connection binding; orthogonal to status)

EngineStatus             INIT ──► RUNNING ⇄ IDLE ⇄ BLOCKED   (engine-internal)
                                          └──► PAUSED / SUSPENDED ──resume──► IDLE
                                          └──► CLOSED (terminal)
```

`BindStatus` is *not* a lifecycle status, but an orthogonal boolean (`SessionDocument.boundConnectionId != null`). A Session can be `bound` or `unbound` in any lifecycle status, with two invariants: **`status=CLOSED` ⇒ `unbound`** and **`status=ARCHIVED` ⇒ `unbound`**. The order in `closeWithCascade` and `archiveWithCascade` (first `engine.stop`-cascade, then `unbind`, then status transition) maintains them.

`EngineStatus` is the status of a single Think Process. A Session aggregates over all its Engines (see §7), but also sets its *own* lifecycle status, because Suspend / Archive / Close are also actions *on* the SessionDocument, not just consequences of Engine actions.

---

## 3. Engine Status Set (7 States)

| Status | Meaning | Auto-Wakeup on new Pending-Msg? | Who is "next"? |
|---|---|---|---|
| `INIT` | Default when created, before `engine.start()` | n/a | — |
| `RUNNING` | Engine is currently running a turn | (running) | — |
| `IDLE` | Between turns, Pending-Queue empty | **yes** | nobody |
| `BLOCKED` | Engine has asked a question via the Inbox and is waiting for the answer | **yes** (the answer comes as a Pending-Msg) | User |
| `PAUSED` | User has explicitly paused | no | User (must send `resume`) |
| `SUSPENDED` | System has stopped (cascade from Session-Suspend, Pod-Shutdown, Lease-Loss) | no | System (Resume by Session-Resume / Manual-Resume) |
| `CLOSED` | Terminal | (terminal) | — |

`closeReason` as a side field to `CLOSED`: `DONE` (Goal reached) / `STOPPED` (User/Parent-Stop) / `STALE` (Engine-Version-Mismatch, stuck) / `ARCHIVED` (Session went to `ARCHIVED`, Engine was shut down in the process) / `USER_DELETE` (Session-Hard-Delete from archive). Does not control behavior — only audit/UI.

**Wakeup-Profile as a layer:** the Lane-Scheduler alone decides based on the status whether an incoming Pending-Message triggers a turn. `IDLE` and `BLOCKED` → Wakeup. `PAUSED` and `SUSPENDED` → Pending-Message is appended, but no Lane-Run. This is the core invariant that separates `IDLE`/`BLOCKED` from `PAUSED`/`SUSPENDED`.

**`PAUSED` vs. `SUSPENDED`:** same wakeup behavior (no auto), but different triggers and different resume triggers:
- `PAUSED` → User has stopped; wakeup only by user action (`process-resume`).
- `SUSPENDED` → System has stopped; wakeup typically by Session-Resume-Cascade or Manual-Resume (§10). Can also occur without Session-Suspend (e.g., Pod-Shutdown sets Engine-SUSPENDED without the Session having to be suspended — the Session proceeds in parallel).

**`INIT` is transient:** only `engine.start()` is allowed in `INIT` status. Other lifecycle calls (`pause`, `stop`, `steer`, `resume`) → 409. After `start()`, the status changes to `IDLE` (or directly `RUNNING` if `start` runs a first turn).

---

## 4. Session Status Set (6 States)

| Status | Meaning |
|---|---|
| `INIT` | Session created, bootstrap (create Chat-Process, start Engine) not yet completed |
| `RUNNING` | At least one Engine is `RUNNING`, or an Engine is `IDLE/BLOCKED` with a non-empty Pending-Queue |
| `IDLE` | All non-`CLOSED`-Engines are in `IDLE` or `SUSPENDED`, or the Session has no Engines (yet) |
| `SUSPENDED` | Session is externally stopped — all Engines have gone to `SUSPENDED` in cascade. Transient: if `transitionAt` expires, it goes to `ARCHIVED` or `CLOSED` (depending on `onSuspend`); if a Resume comes before, it returns to `IDLE`/`RUNNING` |
| `ARCHIVED` | Long-term storage. All Engines `CLOSED` (`closeReason=ARCHIVED`), Pod-Lease released, Pending-Queues cleared. Conversation-History and User-Metadata remain. No auto-wakeup; only explicit user-`reactivate` (§11.2) reactivates the Session. UI default filter hides `ARCHIVED` |
| `CLOSED` | Terminal. All Engines `CLOSED`, no more resume possible, then eligible for Hard-Delete. Reached only by (a) explicit User-Delete from `ARCHIVED`, (b) `onSuspend=CLOSE`-Profile (daemon/event-driven), or (c) Abandoned-Detection (§9.1) |

`RUNNING` and `IDLE` are **derivable rollups** over the Engine statuses and are updated with every Engine status change (listener on `ThinkProcessStatusChangedEvent`). `INIT` / `SUSPENDED` / `ARCHIVED` / `CLOSED` are, however, **their own lifecycle points** of the Session, set by explicit operations.

`BLOCKED` and `PAUSED` on an Engine count as "Session is busy" — the Session remains in `RUNNING` because the User is engaged and idle-sweepers should not touch it.

---

## 5. Lifecycle Properties on the Session

Four typed Properties on the `SessionDocument`, resolved from the Recipe-Cascade during `session-create` (see §6) and then **immutable**:

| Property | Values | Meaning |
|---|---|---|
| `onDisconnect` | `SUSPEND` / `KEEP_OPEN` / `CLOSE` | What happens when the bound client leaves? |
| `onIdle` | `SUSPEND` / `NONE` | What happens if all Engines are idle longer than `idleTimeoutMs`? |
| `onSuspend` | `KEEP` / `CLOSE` | What happens after the `SUSPENDED` phase expires? `KEEP`: after `suspendKeepDurationMs` → `ARCHIVED` (long-term storage, resumable). `CLOSE`: after `suspendKeepDurationMs` → `CLOSED` (terminal). `CLOSE` is for daemon/event-driven Sessions that do not carry human memory |
| `idleTimeoutMs` | Duration | If `onIdle=SUSPEND`: time of idle before trigger. Ignored if `onIdle=NONE`. |
| `suspendKeepDurationMs` | Duration | If `onSuspend=KEEP`: time in SUSPENDED until transition to ARCHIVED. If `onSuspend=CLOSE`: time in SUSPENDED until transition to CLOSED. Both via `transitionAt`-timestamp (§9). |

The entire lifecycle behavior of the Session can be expressed by combining these five values. Lifecycle code reads *only* these fields; the Profile-String is **not** read by the lifecycle machine.

### Typical Combinations

| Use Case | onDisconnect | onIdle | onSuspend | idleTimeout | suspendKeep | Auto-End-State |
|---|---|---|---|---|---|---|
| `foot`-Assistant | `KEEP_OPEN` | `SUSPEND` | `KEEP` | 1 h | 24 h | `ARCHIVED` |
| `web` / `mobile` | `KEEP_OPEN` | `SUSPEND` | `KEEP` | 30 min | 24 h | `ARCHIVED` |
| `daemon` Tool-Relay | `CLOSE` | `NONE` | n/a | — | — | `CLOSED` (directly from Disconnect) |
| Event-driven Job | `KEEP_OPEN` | `SUSPEND` | `CLOSE` | 0 | 0 | `CLOSED` |
| Long-running Research | `KEEP_OPEN` | `SUSPEND` | `KEEP` | 4 h | 7 days | `ARCHIVED` |

The values are examples. `onDisconnect=KEEP_OPEN` + `onIdle=SUSPEND` + `idleTimeoutMs=0` is the trick for "Session closes itself as soon as it has nothing left to do" (event-driven), without needing a fourth enum value.

**Why `foot` is no longer `SUSPEND`:** the original idea was "CLI gone ⇒ `client_*`-tools gone ⇒ Engine can't do anything ⇒ park immediately". This is too pessimistic: firstly, dynamic tools (MCP, external services) have the same "can disappear at any time" problem, so the Engine layer must be able to handle "tool not available" as a clean error anyway (Engine decides: re-plan, escalate to user, block). Secondly, there is enough work without `client_*` (research, LLM-only turns, server tools) that a disconnect-suspend would abort. With `KEEP_OPEN` + `idleTimeout=1h`, the Session continues as long as it has something to do; as soon as it rests and no one pings (see §7), the Idle-Sweep parks it cleanly.

---

## 6. Property Resolution: Recipe-driven, Profile as Default Provider

Recipes carry the lifecycle defaults — *within* their existing `profiles:` block (see [recipes §6a](/specs/recipes)). There is **no** hardcoded Profile→Default table in the Brain; the `default`-Recipe in `recipes.yaml` is the global fallback source.

### Schema in the Recipe

```yaml
arthur:
  engine: arthur
  profiles:
    foot:
      session:
        onDisconnect: KEEP_OPEN
        onIdle: SUSPEND
        onSuspend: KEEP
        idleTimeoutMs: 3600000              # 1h
        suspendKeepDurationMs: 86400000     # 24h
    web:
      session:
        onDisconnect: KEEP_OPEN
        onIdle: SUSPEND
        onSuspend: KEEP
        idleTimeoutMs: 1800000              # 30min
        suspendKeepDurationMs: 86400000
    mobile:
      session:
        onDisconnect: KEEP_OPEN
        onIdle: SUSPEND
        onSuspend: KEEP
        idleTimeoutMs: 1800000
        suspendKeepDurationMs: 86400000
    daemon:
      session:
        onDisconnect: CLOSE
    default:
      session:
        onDisconnect: KEEP_OPEN
        onIdle: SUSPEND
        onSuspend: KEEP
        idleTimeoutMs: 1800000
        suspendKeepDurationMs: 86400000

event-news:
  engine: vogon
  profiles:
    default:
      session:
        onDisconnect: KEEP_OPEN
        onIdle: SUSPEND
        onSuspend: CLOSE
        idleTimeoutMs: 0
```

### Resolution during `session-create`

Resolved by the `RecipeResolver` along with the other Recipe fields (`params`, `allowedTools`, `prompt`):

1. `bootstrapRecipe.profiles.{profile}.session` — exact Profile match
2. `bootstrapRecipe.profiles.default.session` — Recipe's own catch-all
3. `defaultRecipe.profiles.{profile}.session` — global default table
4. `defaultRecipe.profiles.default.session` — global catch-all
5. Baked-in security default in the Brain — if someone breaks the `default`-Recipe

Plus two orthogonal override mechanisms:

- **Settings-Override:** `vance.session.idleTimeoutMs` / `vance.session.suspendKeepDurationMs` etc. with Tenant→Project cascade. Takes precedence over the Recipe result (Admin wins against Recipe-Author).
- **Caller-Override in the `session-create`-Request:** explicitly set fields override everything. Emergency exit for special cases without Recipe-Edit.

Order from weak to strong: Recipe → Settings → Caller-Explicit.

**"Bootstrap-Recipe":** the Recipe of the Top-Level-Process at Session-Create. For Interactive: Chat-Process-Recipe. For event-driven: Recipe named by the trigger. Worker-Recipes (via `process_spawn` later) have **no** effect on the Session-Lifecycle — `session:`-block in Worker-Recipes is ignored.

Profile remains on the `SessionDocument` as an **audit field** (which profile was active at bind) — Tool-Routing, Recipe-Selection, Logging. Lifecycle logic does not read it.

---

## 7. Session Idle Detection

A Session is idle *from a lifecycle perspective* when it has nothing pending — no Engine is working, none is waiting for user input.

**Definition "Session is idle":** no non-`CLOSED`-Engine is in `RUNNING`, `BLOCKED` or `PAUSED`. In other words: all non-`CLOSED`-Engines are in `IDLE` or `SUSPENDED`, or the Session has no Engines.

| Engine Status | counts as Session-Idle? |
|---|---|
| `INIT` | yes (engine has not yet become active) |
| `RUNNING` | no (engine is working) |
| `IDLE` | yes (engine has no work) |
| `BLOCKED` | no (engine is waiting for user) |
| `PAUSED` | no (user has stopped, wants to return) |
| `SUSPENDED` | yes (system-stopped, no user engaged) |
| `CLOSED` | yes (terminal, is no longer part of session activity) |

**Idle-Sweep** (`@Scheduled`, approximately every 60 s, implemented as `SessionIdleSweeper`):
- Mongo-Pre-Filter via `status_activity_idx`: Sessions with `status ∈ {RUNNING, IDLE}` and `onIdle=SUSPEND` and `lastActivityAt < (now − coarseCutoffSeconds)` (Default 30 s — cheap cut through the obviously fresh).
- Per hit: check in-app "since `lastActivityAt` ≥ `idleTimeoutMs` idle?" — the per-Session-Timeout is immutable from the Recipe.
- Per hit that matches the timeout: check "no Engine in `RUNNING`/`BLOCKED`/`PAUSED`?" — if so, Session is *not* idle and will not be touched.
- If all three conditions are met → Suspend-Cascade (§9) with `suspendCause=IDLE`.
- `onIdle=NONE` → nothing to do (already filtered out by the Mongo query).

`lastActivityAt` is updated on every inbound WS-frame (including Vancetope-protocol ping, default every 30 s) by `SessionService.heartbeat`. **Indirect consequence:** as long as a client is connected and pings, the Session remains fresh and idle-suspend does not trigger — an additional condition "no WS-Bind active" is not necessary. As soon as the WS-Connection is gone, the pings stop, `lastActivityAt` ages, and after `idleTimeoutMs` the Sweeper parks it cleanly. Engine status changes and Pending-Message appends can additionally refresh `lastActivityAt`, but this is primarily a bind-stale protection for autonomous Engines without client-ping.

---

## 8. Disconnect Behavior

On WebSocket-Disconnect (clean or lost) — see `VanceWebSocketHandler.afterConnectionClosed`:

1. `boundConnectionId` is cleared (`unbind()`).
2. Lookup `session.onDisconnect`:
   - `SUSPEND` → Suspend-Cascade with `suspendCause=DISCONNECT` (§9).
   - `KEEP_OPEN` → Session remains in its status (`RUNNING`/`IDLE`). Engines continue running (or remain in their current status). Idle-Detection (§7) may take effect later.
   - `CLOSE` → Close-Cascade directly: all Engines `engine.stop()` → `CLOSED` (with `closeReason=STOPPED`), Session `CLOSED`. (Deliberately not `ARCHIVED` — daemon-Sessions do not carry human memory.)

Logout (WS-Type `LOGOUT`) explicitly calls the same path, plus WS-Close. **Logout ≠ Close** — the Session remains `KEEP_OPEN` depending on the `onDisconnect`-property (default for `foot`/`web`/`mobile`; Idle-Sweep may park it) or goes to `SUSPENDED` (`onDisconnect=SUSPEND` for profiles that truly cannot do anything without the client). Only `onDisconnect=CLOSE` (daemon) leads directly to `CLOSED`.

### 8.1 Bind-Takeover for stale `boundConnectionId`

If a Pod crashes hard or a TCP-Connection breaks without a clean `afterConnectionClosed`-call, the `boundConnectionId` remains attached to the Session. A subsequent reconnect would otherwise be rejected indefinitely with `409 Already-Bound` — no one can lift the lock-holdings on behalf of a dead Pod.

`SessionService.tryBind` therefore performs an additional CAS-branch since the Cluster-Project-Management extension: a bind is also accepted if the existing `boundConnectionId` is "stale", i.e., `lastActivityAt` is older than `vance.session.bind-stale-after` (Default `PT2M`).

`lastActivityAt` is updated on **every** incoming WS-frame by `SessionService.heartbeat` — including the Vancetope-protocol `PING` (Default `vance.brain.ws.pingIntervalSeconds=30s`). As long as the client pings and the Pod is alive, the bind remains "fresh". As soon as a Pod is gone, the heartbeats stop, the TTL expires, and the next reconnect takes over cleanly.

### 8.2 Multi-User-Sessions: Bind-Holder Escalation + Heartbeat

In `SessionDocument.allowMultipleClients=true`-Sessions, the Mongo-bind still attaches to exactly **one** Connection — the additional participants only live in the `SessionConnectionRegistry` (see `specification/multi-user-sessions.md` §3). This leads to two special paths:

- **Disconnect** with Survivors: `VanceWebSocketHandler.afterConnectionClosed` first tries `SessionService.tryEscalateBind(sessionId, leavingEditorId, survivorEditorId)` — atomic `updateFirst` on `boundConnectionId`. If successful, a remaining participant takes over the Mongo-bind, **`onDisconnect` is skipped** and the Session remains live for the others. Only when no survivor is left does the regular `unbind` + `onDisconnect`-path from §8 run.
- **Heartbeat** is multi-user-aware: `heartbeat(sessionId, editorId)` matches if either `boundConnectionId == editorId` OR `allowMultipleClients == true`. This way, a secondary Connection without Mongo-bind survives the pre-frame heartbeat check in `VanceWebSocketHandler.dispatch`. Uses `getMatchedCount()` (not `getModifiedCount()`) so that a millisecond-identical `lastActivityAt`-value does not yield a false-positive drop.

`tryBind` for non-Owners on a shared Session is "free-or-stale only" — thus never stealing the Owner-Bind. `tryBindWithUserTakeover` remains Owner-only.

CAS-Predicate in `tryBind`:

```
status NOT IN (CLOSED, ARCHIVED)
AND ( boundConnectionId IS NULL                   -- free
   OR boundConnectionId = newConnectionId         -- idempotent (same connect)
   OR lastActivityAt < now - bindStaleAfter )     -- stale takeover
```

`bindStaleAfter` is generously set to 4 times the ping interval: a single missed ping plus network jitter still defends the bind, only sustained silence (≥120 s) releases it.

This mechanism particularly covers **HOMELESS-Sessions** (see cluster-project-management.md §2), where no Pod-change hook applies that could unbind all Sessions across the board. For non-HOMELESS projects, the bind is additionally explicitly deleted during `bring()` (see [project-lifecycle.md](/specs/project-lifecycle) §5.1) — the bind-takeover is the universal safety net underneath.

### 8.2 Stale-Bind-Sweep (Cluster-Master)

The `tryBind`-takeover from §8.1 only cleans up if someone wants to connect to a specific Session. Sessions without an active reconnect attempt — typically all system and user project sessions (`_user_*`, `_tenant`, long-archived demo projects) — would otherwise point to a long-dead `boundConnectionId` indefinitely. Without a cleaner, this accumulates with every Pod-restart (in a production environment, 86 stale binds were observed from 28 days of runtime).

`SessionStaleBindSweepTick` (in `vance-brain.cluster`) therefore periodically sweeps over **all** Sessions in the Cluster, exactly once per round — the tick runs on every Pod, but is no-op'd on all non-master Pods (`ClusterMasterService.isLocalPodMaster()`-gate, same pattern as cluster-project-management.md §4.6).

**Sweep-Query** — pure `updateMulti` on the `sessions`-Collection, loads no Documents into the JVM:

```
filter:  boundConnectionId != null AND lastActivityAt < now - bindStaleAfter
update:  $set { boundConnectionId: null }
```

`lastActivityAt` is **deliberately not** touched: the original timestamp is diagnostic information, from which one can later deduce when the connection effectively died.

**Index** — `bound_activity_idx` on `SessionDocument` as a Compound-Partial:

```
def:            { boundConnectionId: 1, lastActivityAt: 1 }
partialFilter:  { boundConnectionId: { $type: 'string' } }
```

The Partial-Filter is the trick — only Bound-Sessions are in the index, Idle-Sessions (the majority) contribute nothing. For cluster sizes beyond tens of thousands of Sessions, the sweep remains consistently cheap.

**Defaults** in `application.yml`:

```yaml
vance:
  session:
    bindStaleAfter: PT2M
    staleBindSweep:
      interval: PT60S
      initialDelay: PT2M
```

`interval` may be noticeably smaller than `bindStaleAfter` — a more frequent sweep does no harm, as the filter skips all fresh items anyway, but the typical waiting period until release is thus reduced to <90 s.

**Relationship to `bring()`-Cleanup** (see [project-lifecycle.md](/specs/project-lifecycle) §5.1): the two clean up different scenarios:

| Scenario | bring()-Cleanup | Master-Sweep |
|---|---|---|
| Pod crashed, new Pod takes over project | **immediately** (latency path for reconnect) | later, if needed anyway |
| Session for project not actively held by a Pod (`_user_*`, archived) | never | **that is its job** |
| Crash recovery after `bindStaleAfter` | via `tryBind`-Takeover ad-hoc | cleans up the silent backlog |

The former `ProjectStartupReclaimer.clearStaleSessionBindings`-call during `ApplicationReadyEvent` was **removed without replacement** — it was effectively dead because `ClusterNodeNameGenerator` chooses a new Node-Name on every boot and `projectsOwnedByLocalPod()` is therefore always empty directly after boot. The Master-Sweep cleanly covers this path.

### 8.3 Lease-Reclaim: a living Connection does not die from an expired Lease

The pre-frame check in `VanceWebSocketHandler.dispatch` closes the Connection if `heartbeat` does not match. A miss, however, has **two** causes, and only one justifies the close:

- **The Session now belongs to someone else** (another Pod/Tab has taken over) or is `CLOSED`/`ARCHIVED` → Close is correct.
- **The Lease has merely expired and no one has stolen it** (`boundConnectionId=null`, typically after the Stale-Bind-Sweep) → Close is incorrect: the frame that triggered the check in the first place is proof that this client is alive.

`dispatch` therefore first tries `tryBind(sessionId, editorId)` (**"reclaim"**) on a miss. The CAS-predicate from §8.1 allows exactly the harmless cases (free / ourselves / holder stale) and continues to reject a genuine foreign takeover — there, the close takes effect as before.

**Why this is important:** a close in the middle of a running turn costs the client everything attached to the connection — registered `client_*`-tools, in-flight Tool-Dispatches, Busy-/Progress-Tracking — while the Engine in the Brain continues to work undisturbed. The client reconnects, adopts via `takeover`, and faces a Session with half a state that has long since resumed computation.

**Client duty: the Keep-Alive-Ping must be outbound-driven.** The Lease lives from frames that **arrive at the Brain**. Downstream traffic (Chat-Chunks, Progress-Pings) proves a living socket, but **does not** renew anything. A client that skips its ping due to fresh *inbound* traffic falls silent precisely during a long Engine-Turn — after `bindStaleAfter`, the Sweep releases the Lease. The skip condition of a Keep-Alive-Loop must therefore only be based on the **client's own last send time** (as in `ConnectionService.sendKeepAlivePing` in `vance-foot`). Conversely, a missing `PONG` may only discard the connection as dead if **no** inbound traffic is running — otherwise, a Pong waiting behind streaming frames would tear down a healthy connection.

---

## 9. Suspend-Cause, `transitionAt`, Sweeper

When transitioning to `SUSPENDED`, three runtime fields are stamped on the Session-Document:

| Field | Value |
|---|---|
| `suspendedAt` | `Instant` — now |
| `suspendCause` | `IDLE` / `DISCONNECT` / `FORCED` |
| `transitionAt` | `Instant` — time at which the Sweeper triggers the next transition |

**Naming note:** in the code state of 2026-05, the field is called `deleteAt` from the time when the Sweeper exclusively deleted. Rename to `transitionAt` is pending; Spec uses the new name.

Calculation of `transitionAt` is the only place where `suspendCause` and `onSuspend` interact:

| `suspendCause` | `onSuspend` | `transitionAt` | Target Status |
|---|---|---|---|
| `IDLE` | `KEEP` | `suspendedAt + suspendKeepDurationMs` | `ARCHIVED` |
| `IDLE` | `CLOSE` | `suspendedAt` (immediately eligible) | `CLOSED` |
| `DISCONNECT` | `KEEP` | `suspendedAt + suspendKeepDurationMs` | `ARCHIVED` |
| `DISCONNECT` | `CLOSE` | `suspendedAt` | `CLOSED` |
| `FORCED` | `KEEP` | `suspendedAt + FORCED_FLOOR` | `ARCHIVED` |
| `FORCED` | `CLOSE` | `suspendedAt + FORCED_FLOOR` | `CLOSED` |

`FORCED_FLOOR` is a hard system constant, default e.g. 7 days, overrideable via setting `vance.session.forced-floor-ms` (Tenant-Level). Recipe-Authors can *not* override it — it is a safety lower bound, specifically to secure against the forced-suspend pathology: Pod crashes during ongoing work, operator has time to intervene.

**Sweeper** (`@Scheduled`, approximately every 60 s):
```
for each session with status=SUSPENDED and transitionAt <= now:
    if abandonedSessionEvaluator.isAbandoned(session):
        closeWithCascade(session, closeReason=ABANDONED)   # skips ARCHIVED
    else if session.onSuspend == KEEP:
        archiveWithCascade(session)
    else:
        closeWithCascade(session, closeReason=AUTO_CLOSE)
```
Sweeper knows no policy — only `transitionAt` and the Abandoned-predicate. UI/Admin can extend `transitionAt` pointwise (Web-action "Extend") without touching lifecycle code.

**Resume** (back to `RUNNING`/`IDLE`) resets all three runtime fields to `null` (Session is alive again). Resume from `ARCHIVED` is a different path — see §11.2.

### Suspend-Cause-Mapping

| Trigger | `suspendCause` |
|---|---|
| Idle-Sweep (§7) | `IDLE` |
| Disconnect with `onDisconnect=SUSPEND` (§8) | `DISCONNECT` |
| Pod-Shutdown / Lease-Loss / Admin-Suspend during ongoing work | `FORCED` |

The `FORCED`-marking is also relevant for the Engine later: on a resume, `engine.resume()` can decide via `process.lastSuspendCause` whether it wants to rollback a turn that was interrupted mid-way. This is an Engine-concern, not Lifecycle — but the Cause-field is the information it depends on.

### Memory-Cleanup on Suspend

`SUSPENDED` is not just a status label, but is intended to actively remove the Session from Brain-Memory — otherwise, Lane-Bookkeeping and Engine-local maps accumulate over long Pod-runtimes. The Suspend-Cascade therefore cleans up during the transition to `SUSPENDED`:

1. **Engine-local state** — each Engine deletes its per-Process-maps in `engine.suspend()` (e.g., Arthur's `currentTurnHadUserInput`). Eddie additionally closes its Worker-Connection-Pool (`closeAll(processId)`).
2. **Lanes** — after the last `engine.suspend()` on a Process-Lane, the Cascade calls `LaneScheduler.forget(processId)` for each Process that is not `CLOSED`. Lane is lazily recreated on the next submit (e.g., after Resume).
3. **`pendingMessages`** — remain on the `ThinkProcessDocument` in Mongo. They are part of the data snapshot, not the memory footprint, and are drained on resume.

Thus, a `SUSPENDED` Session actually lives "only in the DB". The Reactivate-path (Engine-Resume or Archive-Reactivate) rebuilds the necessary runtime structure each time — the cleanup path does not need to be able to rebuild anything.

### 9.1 Abandoned-Detection

Without a filter, the archive would fill up with test sessions, typos, and aborted attempts. During the `SUSPENDED → (ARCHIVED|CLOSED)` transition, the `AbandonedSessionEvaluator` therefore evaluates whether the Session is "abandoned"; if so, it goes directly to `CLOSED` (skipping `ARCHIVED`).

**Predicate — all three conditions must be met:**

1. **No complete Q&A-Pair.** Across all `ChatMessageDocument`s of the Session: fewer than `min-qa-pairs` (Default 1) completed User-Assistant pairs. Threshold as Tenant-Setting `vance.session.abandoned-detection.min-qa-pairs`.
2. **No Side-Effects.** No Document created or changed in this Session, no Tool-Call with persistent effect, no Insight generated, no Memory-entry, no Sub-Process spawned.
3. **No User-Investment.** Neither `title` (manual, not Auto-Suggest!), Tags, Icon, Color nor Pin were set by the User. Manual changes are marked via the `userTouchedAt`-field on the `SessionDocument`; LLM-Auto-Title only writes to `titleAutoGenerated=true` and explicitly does not count as User-Investment.

If even one of these is not met (i.e., ≥1 Q&A-Pair exists, OR Side-Effects, OR User-Investment) → regular path to `ARCHIVED`.

**Settings:**

| Setting | Default | Effect |
|---|---|---|
| `vance.session.abandoned-detection.enabled` | `true` | Turns detection on/off entirely (Tenant-Level). |
| `vance.session.abandoned-detection.min-qa-pairs` | `1` | Minimum Q&A-Pairs. More restrictive: `2` also deletes single-Q&A-Sessions. |

**Implementation:** Predicate resides in an `AbandonedSessionEvaluator` in `vance-shared`. Called by the Sweeper (§9) and by manual `closeWithCascade`. One place, one Predicate, no scattered heuristic stack.

`closeReason=ABANDONED` is a separate value, so that audit/UI layer can distinguish "Session was throwaway" from "Session was actively closed".

---

## 10. Forced-Suspend: Auto-Restart and Manual-Resume

A `FORCED`-suspended Session is "work was in flight, abruptly interrupted" — it lies in `SUSPENDED` and waits to be brought back up before `transitionAt` (= `suspendedAt + FORCED_FLOOR`) pushes it to `ARCHIVED`.

### 10.1 Auto-Restart via `application.yaml`

```yaml
vance:
  session:
    auto-restart-forced:
      enabled: false              # Default: off
      max-concurrent: 3           # concurrent Resume-calls
      delay-between-ms: 500       # short pause between calls
```

The recovery pass runs on:
- Brain-Boot — after `ProjectStartupReclaimer` (extend existing component or add a new one next to it).
- Lease-Takeover — if this Brain-process takes over the Lease of a foreign Session (e.g., after crash of the previous Lease Holder).

For each found Session with `status=SUSPENDED`, `suspendCause=FORCED`, in the Owner-Set of this Pod:
1. Per Engine: `engine.resume(process, ctx)` on the Process-Lane (serialized).
2. Engine-Status `SUSPENDED → IDLE`. Pending-Queue is drained, if non-empty → `RUNNING`.
3. Session-Status `SUSPENDED → IDLE` or `RUNNING` (per Rollup).
4. Runtime fields (`suspendedAt`, `suspendCause`, `transitionAt`) to `null`.

Across all Sessions, the `max-concurrent`-limit applies; `delay-between-ms` is waited between Resume-calls. Protection against Thundering-Herd on boot.

`enabled: false` as default: a freshly booted Brain should not restart Sessions on its own. Tenants/Deployments with real Autonomous-Workflows set it to `true`.

**Only `FORCED`.** `IDLE` and `DISCONNECT`-Suspends remain — they were intentional, the trigger for Wakeup is not Pod-boot, but Reconnect / next Event / Manual-Resume.

### 10.2 Manual-Resume via REST + Web UI

Regardless of the Auto-Restart flag, there are always two manual paths.

**REST-Endpoint:**

```
POST /brain/{tenant}/session/{sessionId}/resume
```

- Auth via the standard Tenant/User-Permission-Schema (Owner or Admin).
- Works for all Suspend-Causes (`IDLE`, `DISCONNECT`, `FORCED`) — generic.
- Acts like the Auto-Restart step: Engines to `IDLE`, drain Pending, nullify Runtime fields.
- Response: current Session-State.

Resume **from `ARCHIVED`** is a different endpoint (`/reactivate`, §11.2) — the Engines no longer exist there and must be respawned, while `resume` restarts a SUSPENDED-Engine.

**Web UI:**

A Session overview with filter `status=SUSPENDED` shows:
- `suspendCause` (FORCED gets warning accent)
- `suspendedAt`, `transitionAt` (Countdown to Archive)
- Engine count + statuses
- **Resume** button → calls the REST endpoint
- **Extend** button → moves `transitionAt` further, without resuming

In v1, a simple list is sufficient. Filters by Cause / Owner will come with practice.

---

## 10a. Lifecycle-Hooks: what is attached to a Session moves with it

`SessionLifecycleService` thoroughly cleans up a Session's **own** rows — ChatMessages, Processes, Memories, group memberships. It knows nothing of things that are attached to a Session *elsewhere*, and a subsystem holding such things previously had no reliable point in time to react.

```java
public interface SessionLifecycleHook {
    default void onSessionArchived(SessionDocument session) {}
    default void onSessionUnarchived(SessionDocument session) {}
    default void onSessionDeleted(SessionDocument session) {}
}
```

Implementations are Spring-Beans; `SessionLifecycleService` calls all of them at the three transitions.

- **`onSessionDeleted` fires *before* the rows are removed** — the link to the attachment typically lies in the `engineParams` of a Process, and those are immediately gone.
- **`onSessionUnarchived` fires *before* the fresh Chat-Process is spawned**, so a Hook can prepare what the Bootstrap picks up.
- **A throwing Hook is logged and skipped.** The transition requested by the user must occur — a failed Hook leaves its own chaos, not a half-archived Session.
- **Idempotence is mandatory:** "close, then delete" allows two paths to run.

**Lifetime, not control.** Archiving, Reactivating, and Deleting belong here. Pause, Stop, and Suspend deliberately end at the Session boundary — a headless worker should continue running while no one is watching.

The first (and so far only) consumer is Trillian: its worker lives in a second, headless Session and follows its Control-Session through all three transitions. Details and the special role of the service account in archiving: [trillian-engine](/specs/trillian-engine) §9a.

## 11. ARCHIVED-Lifecycle

`ARCHIVED` is the default resting state of every User-Session. It is not "put away and forgotten", but a deliberately lightweight knowledge container: all active resources are released, the persisted artifacts (Conversation-History, User-Metadata, Insights) are intact and searchable.

### 11.1 Archive-Cascade

`archiveWithCascade(session)` is the transition `OPEN/SUSPENDED → ARCHIVED`:

1. **Engines off.** For each non-`CLOSED`-Engine: `engine.stop(process, ctx)` with `closeReason=ARCHIVED`. Engine-Status terminal.
2. **Pending-Queues cleared.** All `pendingMessages` on `ThinkProcessDocument`s are cleared. Conversation-History in `ChatMessageDocument` remains unchanged — it *is* the archive.
3. **Resources released.** Pod-Lease released, Connection-Bind cleared, Memory-Cache-Refs resolved.
4. **Runtime fields cleared.** `suspendedAt`, `suspendCause`, `transitionAt`, `boundConnectionId`, `claimedByPodIp`, `leaseRenewedAt` → `null`.
5. **`archivedAt = now`** stamped.
6. **Session-Status** `→ ARCHIVED`.

Result: Session exists in the DB, is filterable/searchable/listable, but costs no runtime resources (no Lease, no Wakeup, no Sweeper-touch).

`archiveWithCascade` is idempotent: called twice is no-op on an already archived Session.

### 11.2 Reactivate from Archive (User-Action)

> **The Recipe moves with it.** The fresh Chat-Process is spawned with the `recipeName` of the archived predecessor. Without this, the spawn falls back to the Tenant-Default — a reactivated `trillian`-Session came back as an **Arthur**-Session, and the Trillian-pairing was omitted because its Bootstrap keys on the Control-Engine. Every non-default Recipe was affected; only with Arthur-Sessions was it not noticed because the result coincidentally matched.

From `ARCHIVED`, Resume is only possible via explicit User-Trigger (no auto-wakeup, no Sweeper-reactivation):

**REST-Endpoint:**

```
POST /brain/{tenant}/session/{sessionId}/reactivate
```

Effect:
1. Bootstrap-Recipe is re-resolved (same Recipe as original create; Profile = current Caller-Profile).
2. New Engine-instance is spawned per Recipe. The Conversation-History from `ChatMessageDocument` is provided to it as Memory-Context — Engine-specific either as full re-play (small chats) or as summary plus tail (long chats). Engine-Layer decides, not Lifecycle-Layer.
3. Engine-Status `INIT → IDLE`.
4. Session-Status `ARCHIVED → IDLE`.
5. `archivedAt` cleared, `reactivatedAt = now` stamped (Audit-field, not Lifecycle-relevant).

`reactivate` is **not** a direct counterpart to `resume`: the old Engine-instances are dead, a new generation is spawned. From a user perspective, it's "continue where I left off"; technically, it's "Engine starts fresh with the old Conversation as memory".

Reactivate is always User-initiated (Web/Mobile/CLI) — Auth via Owner or Tenant-Admin.

### 11.3 Manual Archive (User-Action)

Web/Mobile/foot-Users can manually archive a `RUNNING`/`IDLE`/`SUSPENDED`-Session at any time:

```
POST /brain/{tenant}/session/{sessionId}/archive
```

Effect: identical to Archive-Cascade from §11.1. Useful primarily for "Working-Session is done, I'm checking it off" — User signals that the Session is content-wise completed, without deleting it.

### 11.4 Manual Delete

From `ARCHIVED`, a Session can be explicitly deleted:

```
DELETE /brain/{tenant}/session/{sessionId}
```

Effect:
1. Session-Status `ARCHIVED → CLOSED` with `closeReason=USER_DELETE`.
2. Hard-Delete of dependent Collections: all `ChatMessageDocument`s, `ThinkProcessDocument`s, `ProcessEvent`s, session-scoped `MemoryDocument`s of the Session.
3. `SessionDocument` itself is deleted.

`DELETE` from `RUNNING`/`IDLE`/`SUSPENDED` implicitly archives first, then deletes — avoids semi-open resource locks.

Auth: only Owner or Tenant-Admin. Hard-Delete is un-undoable; UI must show confirm-prompt.

---

## 12. User Operations

### 12.1 Process Level (per `processId`)

Five operations, status transitions in detail in [think-engines §3 + §5](/specs/think-engines).

#### Start
- Engine method: `start(process, ctx)`
- Status: `INIT → IDLE` (or `INIT → RUNNING`, if `start` directly runs a turn)

#### Pause
- Engine method: `pause(process, ctx)` — new, see think-engines §3
- Status: `RUNNING / IDLE / BLOCKED → PAUSED`
- Lane finishes current turn up to the next boundary. Steering messages are still accepted, but **do not** trigger a Wakeup until `resume`.
- Trigger: WS `process-pause`, REPL `/pause` / ESC, Web-Pause-Button, Brain-Tool `process_pause`.
- **Session-wide `process-pause` (without `processName`, that's the ESC case) filters server-side** via `SessionLifecycleService.isInterruptible`: only what actually has something to interrupt is paused — `RUNNING` (mid-turn) and `INIT` (spawned, first turn pending). `IDLE` remains `IDLE` (nothing to hold; a flip to `PAUSED` would provide the next User-Message with a false "USER INTERRUPTED — RECONSIDER"-Preamble from `ProcessSteerHandler`), `BLOCKED` remains `BLOCKED` (waiting for an answer — pausing would strand the answerer; `/stop` is for that), `PAUSED`/`SUSPENDED`/`CLOSED` are already stopped. The `ENGINE_HALT_REQUESTED`-Pings use the same filter, so an ESC on a resting Session remains silent.
- **Clients send ESC unconditionally.** The decision "was anything running at all?" belongs on the Brain-side: a client-side busy counter is reconstructed from turn-boundary pings and becomes incorrect on a reconnect mid-turn — a gate on it would take away the stop button from the user exactly when they need it (see §8.3).

#### Steer (Correction)
- Engine method: `steer(process, ctx, message)`
- Status: none; correction lands in `pendingMessages`.
- Allowed in `RUNNING`, `IDLE`, `BLOCKED`, `PAUSED`. In the `PAUSED`-case, the correction waits for `resume`.

#### Continue (Resume)
- Engine method: `resume(process, ctx)`
- Status: `PAUSED / SUSPENDED → IDLE → (drain pending) → RUNNING`

#### Stop
- Engine method: `stop(process, ctx)`
- Status: → `CLOSED` with `closeReason=STOPPED`. Terminal.

### 12.2 Session Level (per `sessionId`)

Three user operations that affect the entire Session-Document plus all Engines:

#### Archive
- REST: `POST /brain/{tenant}/session/{sessionId}/archive`
- Effect: Archive-Cascade (§11.1). Can be called any number of times (idempotent).

#### Reactivate
- REST: `POST /brain/{tenant}/session/{sessionId}/reactivate`
- Effect: §11.2. Only from `ARCHIVED`.

#### Delete
- REST: `DELETE /brain/{tenant}/session/{sessionId}`
- Effect: §11.4. Hard-Delete, requires Confirm.

Plus the Resume from §10.2 for SUSPENDED → OPEN.

---

## 13. Pod-Ownership: Connection-Bind and Pod-Lease

Two mechanisms, depending on Bind-Status:

| Mechanism | When | Holder |
|---|---|---|
| **Connection-Bind** | Session is `RUNNING`/`IDLE` and a Client is connected | `SessionDocument.boundConnectionId` (atomic via `tryBind`) |
| **Pod-Lease** | Session is `RUNNING`/`IDLE`/`SUSPENDED` without an active Client (e.g., `web`/`mobile` between reconnects, event-driven, FORCED-suspended) | `SessionDocument.claimedByPodIp` + `leaseRenewedAt` (Heartbeat-driven) |

`ARCHIVED`-Sessions have **neither** Bind nor Lease. `CLOSED`-Sessions also do not.

Lease-mechanic unchanged from execution-and-persistence §3 + §5. On Pod-Crash, another Pod takes over after Lease-Timeout. The taking-over Pod applies the Auto-Restart-Pass to its new Sessions (§10.1), depending on the Config-Flag.

**Monitoring-Reattach** (for `web`/`mobile`/event-driven Sessions, "monitor in a positive sense"): second Connection binds via `session-monitor`, without setting the exclusive `boundConnectionId`-lock. Multiple Monitor-Connections are possible. A Monitor-Connection receives:
- Live Inbox and Progress pushes
- Right to `process-pause`, `process-steer`, `process-resume`, `process-stop`
- *no* right to reroute the Session's Lease Holder

---

## 14. Session-Metadata: Title, Icon, Color, Tags, Pin

To keep Sessions navigable as long-lived knowledge containers in a UI with potentially thousands of entries, each `SessionDocument` carries a small set of user-facing metadata. All fields are optional and mutable — they are explicitly *not* part of the Lifecycle-Properties (§5), but purely UI-/Search-layer.

| Field | Type | Who sets | Meaning |
|---|---|---|---|
| `title` | `String` (nullable, ≤ 200 chars) | User (manual) or LLM (Auto-Suggest) | Display-Name. Fallback in UI: first User-Message truncated, then "Untitled" |
| `titleAutoGenerated` | `boolean` | System | `true` as long as Title is from LLM-Auto-Suggest; `false` as soon as User manually edits. Controls Abandoned-Detection (§9.1) |
| `icon` | `String` (nullable, ≤ 8 chars) | User or LLM | Unicode-Emoji (single codepoints or ZWJ-sequences like 👨‍💻). No Font-Icon-Set — Emoji is portable across Web/Mobile/CLI, no versioning, findable in full-text search |
| `color` | `enum` (nullable) | User or LLM | One of 12 fixed colors: `slate`, `red`, `orange`, `amber`, `green`, `teal`, `cyan`, `blue`, `indigo`, `purple`, `pink`, `rose`. Theme determines concrete hex values. `null` = no accent color. Enum is called `AccentColor` and is shared with Documents (`DocumentDocument.color`, set via `doc_set_color`-Tool) — same palette, same TS-representation |
| `tags` | `List<String>` (lowercase, ≤ 20 tags, each ≤ 50 chars) | User | Free tags for categorization. Normalized: lowercase, trim, deduped, max-length cap. Multi-filter in UI |
| `pinned` | `boolean` (default `false`) | User | Pinned-Sessions appear at the top of the default list, sorted before all others by `lastActivityAt` |
| `userTouchedAt` | `Instant` (nullable) | System | Timestamp on first manual User-change to metadata or properties. `null` as long as User has not touched the Session. Evaluated in §9.1 |

### 14.1 LLM-Auto-Suggest

After the first completed Q&A-Pair, the `SessionMetadataSuggester` triggers a small LLM-Call (`tier=SMALL`, no streaming) with the conversation start as input and a structured response `{title, icon, color}`. Result:

1. If `title == null && titleAutoGenerated == false` → set `title`, `titleAutoGenerated=true`.
2. If `icon == null` → set `icon`.
3. If `color == null` → set `color`.

Existing User-values are **not** overwritten — Auto-Suggest only fills empty fields. `titleAutoGenerated=true` remains until the first manual edit action on `title`, after which it flips to `false` and Auto-Suggest never touches the field again.

Tags and Pin are **never** set automatically — both are pure User-signals.

### 14.2 REST-Endpoints

```
PATCH /brain/{tenant}/session/{sessionId}/metadata
Body: { title?, icon?, color?, tags?, pinned? }
```

Sets each passed field (null/missing = unchanged). Sets `userTouchedAt = now` on the first call for a Session if the patch changes at least one field. Sets `titleAutoGenerated = false` if `title` is in the patch.

Owner or Tenant-Admin. Works on any Session-Status except `CLOSED`.

---

## 15. Search

As the number of Sessions grows, search becomes the primary navigation. Three stages, tiered by effort and search quality:

### Stage 1 — Metadata-Match (v1, default)

Mongo Text-Index on `SessionDocument` fields `title` and `tags`:

```java
@CompoundIndex(name = "session_text_search",
               def = "{ 'title': 'text', 'tags': 'text' }",
               weights = "{ 'title': 10, 'tags': 5 }")
```

Tags as filter (not Text-Search) additionally: regular index `{ 'tags': 1 }`.

`pinned` + `lastActivityAt` Compound for Default-Sorting: `{ 'pinned': -1, 'lastActivityAt': -1 }`.

Scope: User typically only sees their own Sessions; Tenant-Admin can scope-up. Project-Filter is standard mandatory filter (Sessions are attached to Projects, a Cross-Project-Search only comes explicitly via Admin-UI).

### Stage 2 — Full-text over Conversation-History (v1)

Mongo Text-Index on `ChatMessageDocument`:

```java
@CompoundIndex(name = "chat_msg_text_search",
               def = "{ 'content': 'text' }")
```

Search-Query then joins against `SessionDocument` (`sessionId`, Owner-Filter, Project-Filter, Archive-Filter) and returns "Sessions containing word X" plus match-snippets.

Mongo has **one** Text-Index per Collection; if more searchable fields are added later, they are merged into the existing index.

Performance limit: up to ~1M Messages per Tenant without problems. For larger volumes → Stage 3.

### Stage 3 — Semantic Search (v2, optional)

Vancetope already has RAG-Embedding-Infrastructure for the Memory-System (see [memory-knowledge-management.md](/specs/memory-knowledge-management)). Re-use for Session-Search:

- Embedding-Index over Conversation-Chunks (existing RAG-pipeline).
- Search-Query embeds, vector-search, Re-Rank against Stage 1 + 2.
- Triggered exclusively when User explicitly selects "Semantic Search" — Embedding-Calls are slower and cost quota.

Stage 3 will **not** be built in v1. Spec keeps the path open so that the search layer is modeled three-stage from the beginning (`SessionSearchService` with Strategy-Plugins).

### 15.1 UI Conventions

- Default list view: only `RUNNING`/`IDLE`/`SUSPENDED`. Filter "also archived" shows `ARCHIVED` with visual differentiation (grayed-out icon-wash). `CLOSED` is never visible in the UI — Session is dead.
- Sorting: `pinned` first, then by `lastActivityAt` desc.
- Filter-Chips: Status, Project, Tag, Owner (for Tenant-Admin).
- Search bar: Stage-1-hits inline (Sessions with Title/Tag-Match), Stage-2-hits under "Matches in Conversations" (Message-Snippets with Session-Link).

Details of the Web-UI in [web-ui.md](/specs/web-ui).

---

## 16. What this Spec does not regulate

- **Trigger-Definitions-Schema** (Cron-entry, Webhook-Spec) for event-driven Sessions — separate Spec.
- **Lane-Re-Queue / 5xx-Resilience** on Engine-Layer — orthogonal, separate Spec.
- **Stale-Detection-Criteria** in detail (Heartbeat-Drift, Engine-Version-Mismatch, RUNNING-without-activity-Timeout) — separate Spec.
- **Engine-/Recipe-Selection per Profile** — regulated by [recipes.md](/specs/recipes).
- **Permissions:** who may initiate an event-driven Session, who may perform Monitor-Reattach — separate Spec.
- **Reactivate-Engine-Mechanic in detail** (full Re-Play vs. Summary, Memory-Hydration) — regulated by the Engine-Layer per Engine.
- **Embedding-Schema for Stage-3-Search** — regulated by [memory-knowledge-management.md](/specs/memory-knowledge-management).

---

## 17. Relation to other Specs

- [architecture-scopes-clients §2](/specs/architektur-scopes-clients) — Session basic model, Client-binding. The two-type table there (Interactive/Autonomous) is outdated; the primary distinguishing feature is the Lifecycle-Properties (§5), fed from the Profile (§6).
- execution-and-persistence §3 + §5 — Pod-Lease, Pod-Shutdown, Command-Routing. Mechanics remain unchanged.
- [recipes.md §6a](/specs/recipes) — Profile-Block-Schema, where the Lifecycle-Defaults reside.
- [think-engines §3](/specs/think-engines) — Lifecycle-Method-Table. Including `pause(process, ctx)`.
- [think-engines §5](/specs/think-engines) — Engine-Status-Table.
- [think-engines §6](/specs/think-engines) — Disconnect-Behavior. Refers to §8 here.
- [memory-knowledge-management.md](/specs/memory-knowledge-management) — RAG-Infrastructure that Stage-3-Search (§15) may use.
- [web-ui.md](/specs/web-ui) — UI conventions for Session-List, Metadata-Editor, Search.
