---
title: "Vancetope — Project Lifecycle"
parent: Specs
permalink: /specs/project-lifecycle
---

<!-- AUTO-GENERATED from llm/specification/project-lifecycle.md (translated from the German specification/public/project-lifecycle.md) — do not edit here. -->

# Vancetope — Project Lifecycle

> Defines the status set of a Project, Pod ownership, the `bring` / `suspend` / `close` transitions, and the relationship to the Workspace. It complements [workspace-management.md](/specs/workspace-management) (what happens *within* a Project on disk) and [session-lifecycle.md](/specs/session-lifecycle) (what runs *within* a Session) — this spec is the overarching framework. Cluster-wide distribution of Projects to Pods (who calls `bring` when on which Pod) is covered in cluster-project-management.md, which sits one layer above.

---

## 1. What a Project Is

A Project is the **ownership unit** in Vancetope:

- A Pod owns a Project (ownership **lease** via `homePodId`/`claimedAt`, §4)
- A Project has a Workspace on disk (exactly one RootDir container, see `workspace-management.md`)
- A Project has 0..N Sessions, which in turn have 0..N Think Processes (see `session-lifecycle.md`)
- Documents, RAGs, Settings, Skills are **all** Project-scoped

When a Project is suspended or closed, all subordinate concepts are tied to it. If it migrates to another Pod, the Workspace + Sessions must move with it. This spec defines how.

---

## 2. Status Set

Six statuses on `ProjectDocument.status`:

| Status | Meaning | Workspace Folder | Engines allowed? |
|---|---|---|---|
| `INIT` | Newly created, never recovered, no Workspace on disk | no | no |
| `RECOVERING` | Pod is bringing the Project online — Workspace recovery is running. Transient. | currently being built | no |
| `RUNNING` | Workspace is on disk, Pod is actively servicing | yes | yes |
| `SUSPENDING` | Suspend is running — Engines are being stopped, Workspace goes off-disk. Transient. | currently being dismantled | should be stopping |
| `SUSPENDED` | Workspace off-disk, Snapshots in Mongo, resumable | no (Snapshots in Mongo) | no |
| `CLOSED` | Terminal — no further operations, Snapshots deleted, moved to Archive-Group | no | no |

`RECOVERING` and `SUSPENDING` are **transient**. A healthy Project spends at most seconds to a few minutes there (Workspace recovery/suspend, Engine start/stop). If a Pod crashes in the middle of a transition, the next Pod takes over and re-runs the respective step — both steps are idempotent (see §6).

---

## 3. Status Diagram

```
                                 ┌──── bring (resume) ────┐
                                 ▼                        │
                     INIT ──bring──► RECOVERING ──► RUNNING ──suspend──► SUSPENDING ──► SUSPENDED
                                          ▲                                                  │
                                          └──── bring (after crash) ─────────────────────────┘
                                                                                              │
                                                          close (any non-CLOSED status) ──────► CLOSED
```

- `bring` moves any non-CLOSED Project to RUNNING (on the current Pod).
- `suspend` moves any non-CLOSED Project to SUSPENDED.
- `close` is terminal from any status.
- Pod takeover is orthogonal: another Pod can claim a RUNNING Project (Lease-Takeover); the previous Pod only learns about it on the next write attempt.

---

## 4. Ownership ≠ Lifecycle Status

`ProjectDocument` carries three orthogonal axes:

| Axis | Fields | Who sets? |
|---|---|---|
| Lifecycle Status (Intent) | `status` | `ProjectLifecycleService` (see §5) |
| Ownership (Fact, expires) | `homePodId`, `claimedAt` | `ProjectService.claim` |
| Does it even need an owner? | `ownerRequired` (derived) + `lifecycleType` (`HOMELESS`/`AUTO`/`EPHEMERAL`/`PERMANENT`) as override | Derived from documents or operator (see cluster-project-management.md §2, §2.1) |

In addition, pod-local and **not** in the document: what *this* JVM has actually brought up (`ProjectActivationRegistry`). "Already RUNNING" is not "already running here" — the separation of the three lifecycles is described in `planning/project-ownership-lease-design.md` §2.

### 4.1 Ownership is a Lease

`homePodId` names the holder, `claimedAt` indicates when it was last renewed. **A lease that is no longer renewed has expired — and an expired lease means that no one owns the Project**, whatever the fields may still say. This is why a crashed Pod is harmless without anyone cleaning up after it: nothing permanent claims to be true, so nothing needs to be cleaned up on shutdown (which wouldn't be possible anyway — `kill -9`, OOM, and Pod eviction do not execute `@PreDestroy`).

**`homePodId`, not `homeNode`.** The holder is the per-JVM fresh `BrainPodDocument.podId` UUID, not the Node name: `vance.cluster.node-name` is configurable, and a restart with a pinned name would otherwise read its own dead predecessor as "already mine". `homeNode` remains as a denormalized display value in the document, **no decision depends on it**.

**Strict read rule:** `homePodId` and `claimedAt` are read in `ProjectOwnership` (`vance-shared.project`) and in the claim path — **nowhere else**. Any other caller queries this class. A handwritten comparison line somewhere in the tree is how the twelve divergent interpretations of `homeNode` arose, and each looked correct individually.

Anyone needing an endpoint resolves the holder ID via `ClusterService.resolveEndpointByPodId(podId)`. There is a **second** check there, intentionally: ownership and liveness are two questions with two clocks, and the lease TTL is the longer one. A `kill -9`'d holder retains a valid lease for up to `leaseTtl`, while its `brain_pods` line is `RUNNING` with a dead `host:port` — any hop there would be a connect timeout.

### 4.2 Status and Ownership are Independent

- `RUNNING` + valid lease → this Pod actively owns the Project
- `RUNNING` + **expired** lease → the normal case of recovery. Boot self-pull or master distributor bring it back if `ownerRequired` (or `PERMANENT`) demands it — see cluster-project-management.md §5.1/§5.2
- `SUSPENDED` → will **not** be retrieved. The recovery selector only takes `INIT`/`RECOVERING`/`RUNNING`, because `SUSPENDED` expresses the opposite intent and `bring` pushes any non-RUNNING status to RUNNING: a suspend would otherwise expire with the holder's lease and restart exactly the scheduler whose costs were the reason

### 4.3 The CAS Predicate

`ProjectService.claim` accepts three cases, all decidable **locally on the document**: `homePodId IS NULL` (free), `homePodId == self` (renewal), or `claimedAt` is missing/older than `leaseTtl` (expired). No `liveClusters` set that first needs to be collected and secured against the empty set — and the predicate is thus indexable, where the predecessor required a `$nin` that grew with cluster size.

Two Pods hitting a fresh Project in parallel will see exactly one winner. The TTL is **read policy**, not baked into the date: increasing it takes effect immediately, instead of waiting for rolling leases.

**Boundary, explicitly stated:** Lease, not fencing. A Pod that stands for TTL-long and then continues to run can briefly cause side effects while another owns. This is countered by a generous TTL, drift deactivation in `ProjectLeaseService`, and existing atomic per-fire claims.

---

## 5. ProjectLifecycleService — API

`ProjectLifecycleService` lives in `vance-brain.project`. It is the **only** place where lifecycle transitions are orchestrated — `ProjectService` only knows the individual atomic operations.

```java
ProjectDocument bring(String tenantId, String projectName);
ProjectDocument suspend(String tenantId, String projectName);
ProjectDocument close(String tenantId, String projectName, String closedGroupId);
```

### 5.1 bring

`INIT|SUSPENDED|RECOVERING|SUSPENDING → RUNNING` on the current Pod.

```
1. claim()                                 # CAS — Pod now owns the Project;
                                           #       throws ClaimRejectedException
                                           #       if another live Pod holds it
1a. sessionService.unbindAllForProjects    # idempotent stale cleanup
                                           # (skipped if Pod is already owner
                                           # and status is RUNNING — Claim-Refresh)
2. status → RECOVERING                     # atomic via transitionStatus
3. workspaceService.init(tenant, projectId)# auto-recovers Snapshots if present
4. publish(ProjectEnginesStartRequested)   # Spring event for Engine listeners
5. status → RUNNING                        # atomic via transitionStatus
```

**Idempotence keys on `ProjectActivationRegistry`, not `status`.** The shortcut needs "already running *here*", and `status` cannot answer that: the field is shared, and after a crash, it still says `RUNNING` because only an explicit `suspend` writes it back. Read as "nothing to do", the new lease holder owned the Project without ever starting anything for it — no Workspace, no Session unbind, no `ProjectEnginesStartRequested`, so Scheduler, Hooks, Tool-Preload, and Kit-Provisioning remained dark, silent, and error-free somewhere (`planning/project-ownership-lease-design.md` §1.2). The shortcut therefore only applies if the status is RUNNING **and** this JVM has the Project in its registry; then only the lease is renewed and step 1a is omitted, otherwise an actively connected client would be disconnected.

Step 1a covers the reconnect path after Pod death: stale `boundConnectionId` values would otherwise reject the first reconnect with `409 Already-Bound`. It sits here because `bring` passes through **every** claim path — Self-Pull, Distributor, Locator, Direct-Spawn — and because it is the latency-critical path for the next reconnect. Cluster-wide, `SessionStaleBindSweepTick` on the Master also cleans up, catching Sessions of Projects that currently belong to no one.

From `RECOVERING` (previous Pod crash mid-recovery), `bring` passes through — `workspaceService.init` is crash-safe (see `workspace-management.md` §11.4).

`claim()` acts as a true CAS: two Pods hitting a fresh Project in parallel will see exactly one winner. The second gets `Optional.empty()` back, the wrapper `ProjectManagerService.claimForLocalPod` translates that into a `ClaimRejectedException`. The associated variant `claimForLocalPodOrRedirect` (for connection bind paths) returns a `Redirect` with the endpoint of the current holder in that case, resolved via `ClusterService.resolveEndpointByPodId(homePodId)`.

**Owning is not Running.** `claimForLocalPod` is the raw lease primitive: it makes the Pod the holder and does **not** put the Project into the Activation Registry. Any path that reacts to someone wanting to *use* the Project (Session-Create/Resume/Bootstrap, Workspace-Adopt) must therefore call `bring` — a claimed but never brought Project holds its hooks and schedulers here and executes none of them.

### 5.2 suspend

`RUNNING|SUSPENDING → SUSPENDED` on the current Pod.

```
1. status → SUSPENDING                       # atomic via transitionStatus
2. publish(ProjectEnginesStopRequested)      # Spring event for Engine listeners
3. workspaceService.suspendAll(projectId)    # Snapshots to Mongo, folder gone
4. status → SUSPENDED                        # atomic via transitionStatus
```

Idempotent: SUSPENDED → no-op. From SUSPENDING (crash mid-suspend), it restarts from step 2 — `suspendAll` and Engine-Stop are both idempotent.

CLOSED breaks with `ProjectStatusConflictException`. INIT (never recovered) is allowed — goes directly to SUSPENDED without Workspace operations.

### 5.3 close

Any → CLOSED. Terminal.

```
1. workspaceService.dispose(projectId)     # Folder + Snapshots gone, terminal
2. projectService.close(tenant, name, closedGroupId)  # status=CLOSED, projectGroupId=closed-group
```

`close` **does not** emit `ProjectEnginesStopRequested` — the caller is responsible for stopping Engines beforehand (typically via a preceding `suspend`). Direct `close` on a `RUNNING` Project does not shut down Engines; they learn that the Project is gone on the next Workspace access via `WorkspaceQuotaExceededException` or similar.

`SYSTEM` Projects are blocked by the underlying `ProjectService.close` (Hub protection).

---

## 6. Crash Recovery

Every transition is idempotent, every transient state clearly means "try this step again".

| Crashed in | On next `bring` | On next `suspend` |
|---|---|---|
| `RECOVERING` | continue with Workspace-Init + → RUNNING | complete bring first, then suspend |
| `SUSPENDING` | bring moves from SUSPENDING → RECOVERING (allowed via transitionStatus) and recovers anew | continue with suspendAll + → SUSPENDED |

`workspaceService.init` and `workspaceService.suspendAll` are defined as crash-safe in §11.4 of workspace-management.md: each takes the Snapshot/Folder pair as the source of truth and brings it to the desired state.

`bring`'s `transitionStatus` allows transitions from any non-CLOSED status to `RECOVERING` — including SUSPENDING. This is intentionally allowed: a crashed SUSPENDING is effectively no longer intended to be suspended (otherwise the user would not have called `bring`) and the recovery path cleans up for recovery.

### 6.1 Boot Self-Pull

On boot — `@EventListener(ApplicationReadyEvent.class)` — `ProjectStartupReclaimer` does two things, and delegates the pulling to `ProjectSelfPullService`:

1. **Derive `ownerRequired` anew** (`releaseNoLongerQualifying`), so that a Project whose last scheduler was deleted during downtime is not fetched for work that no longer exists. Runs **before** the pull, which reads exactly this flag.
2. **Self-Pull:** Greedily pull Projects that need an owner and have no live lease to this Pod — Cap `min(startupScore + 50 %, localHeadroom)`, see cluster-project-management.md §5.1/§5b.

**There is no more stale cleanup.** The predecessor started with an `updateMulti` that nulled `homeNode` on every Project whose owner Node had fallen out of the live registry. With ownership as a lease, there is nothing to clean up: an unrenewed lease has expired, an expired one blocks no one, and the Claim-CAS takes it over at that point. The old wipe was also the **only** reconciliation, and it ran **only here** — a Pod that crashed and restarted within the stale window thus kept its claims forever, and a long-lived cluster never reconciled.

**The candidate selector is "needs an owner and has no live lease"** — the derived `ownerRequired` for `AUTO` Projects plus everything an operator has pinned to `PERMANENT`, and only for statuses that express the intent to run. Its predecessor selected on `PERMANENT` **alone** and thus hit nothing, because nothing in the tree ever wrote that value — hence `brought=0 skipped=0` on every boot (`planning/project-ownership-lease-design.md` §1.1).

**Precondition instead of Listener Order:** both barriers of the self-pull — eligibility and headroom — are read from its own `brain_pods` line and respond **permissively** without it. The pull therefore states its precondition itself (`ensureRegistered()` + `isRegistered()`) and otherwise skips; an `@Order` is not sufficient, because an `@EventListener` without `@Order` gets the same `LOWEST_PRECEDENCE`.

The boot pull can be disabled via `vance.cluster.self-pull.boot`, an additional periodic pull can be enabled via `.scheduled` (default off) — see §5b of the Cluster Spec.

### 6.2 Cluster Master Distributor

The former `ProjectWakeupTick` has been replaced by the rotating Cluster Master and its 60s distributor tick — see cluster-project-management.md §4 and §5.2. Only **one** Pod in the cluster holds the Master role and performs the distribution; the other Pods skip it. Race-freedom still comes from the CAS in `ProjectService.claim`, which remains the guarantee.

Distributor's selector (`ProjectService.findProjectsNeedingOwner`): `status IN (INIT, RECOVERING, RUNNING) AND (lifecycleType=PERMANENT OR (lifecycleType=AUTO AND ownerRequired)) AND (homePodId IS NULL OR Lease expired)`.

`SUSPENDED`/`SUSPENDING` are **not** included, and that's the point: `bring` pushes every non-RUNNING status to RUNNING, so a suspend would not have survived its holder's lease. Targeting runs via eligibility (Labels, §3a of the Cluster Spec) and then utilization `(currentScore/effectiveMaxScore)` of the allowed live Pods.

---

## 7. Engine Hooks (Spring Events)

Two records in `vance-brain.project`:

```java
record ProjectEnginesStartRequested(String tenantId, String projectName) {}
record ProjectEnginesStopRequested(String tenantId, String projectName) {}
```

Fired by `ProjectLifecycleService` in the steps above. **V1 has no listeners** — Engine cleanup is operator- or script-driven. Consequences for V1 tests:

- Before `suspend`: manually set existing ThinkProcesses to `STOPPED`/`CLOSED`, otherwise they write to a disappearing Workspace.
- After `bring`: existing ThinkProcesses are not automatically restarted — Sessions that were running before must be reactivated by the caller.

V2 will implement listeners that enumerate all running Processes via `ThinkProcessService.findByProject` and shut them down or bring them up via `engine.stop`/`engine.resume`. This is related to the suspend cascade from `session-lifecycle.md` §9.

---

## 8. Relationship to Sessions and Workspace

```
Project (LIFECYCLE status here)
  └── Sessions (own lifecycle, see session-lifecycle.md)
  └── Workspace (own mechanics, see workspace-management.md)
       └── RootDirs (handler-specific: temp, git, ...)
```

**Project is the outermost shell.** Sessions and Workspace are under Project ownership; their status is informational, their lifecycle is controlled by the Project lifecycle in the worst case (Suspend, Close). The Project enforces:

- on `suspend`: Workspace goes off-disk (Engines stop via Event-Hook)
- on `close`: Workspace is disposed (Snapshots gone, terminal)
- on `bring`: Workspace recovers (auto via `workspaceService.init`)

Sessions can live independently of the Project status (own lifecycle properties), but if the Project is SUSPENDED, there is no Workspace anymore — Sessions that need Workspace tools will fail. A `bring`-cascade would have to reactivate Sessions; V2 does this.

---

## 9. ProjectService — Atomic Building Blocks

`vance-shared.project.ProjectService` contains the individual Mongo operations, without orchestration:

| Method | Effect |
|---|---|
| `claim(tenant, name, selfPodId, selfNodeName, selfAddress, leaseTtl)` | CAS update: sets `homePodId`/`homeNode`/`claimedAt` and deletes `pendingSince` if `homePodId IS NULL OR == selfPodId OR claimedAt is missing/older than leaseTtl`. `Optional.empty()` = another Pod holds a valid lease. Rejects CLOSED, and podless names with `IllegalArgumentException` |
| `renewLeases(selfPodId, now)` | an `updateMulti` over everything this Pod holds — O(1) per beat, independent of tenant and project count. The **matched** count is the answer to "how many do I still hold" and provides drift detection for free |
| `releaseLeases(selfPodId, …)` | releases all leases on shutdown. Best-effort: correctness does not depend on it, an unrenewed lease expires itself |
| `releaseLease(tenant, name, selfPodId, …)` | releases **one** lease, guarded by "still belongs to me" — the drain primitive (§5c of the Cluster Spec) |
| `transitionStatus(tenant, name, expected, target)` | atomic findAndModify; throws `ProjectStatusConflictException` if the status is not expected |
| `close(tenant, name, closedGroupId)` | sets status=CLOSED + projectGroupId; rejects SYSTEM Projects |
| `findRunningByHomePodId(podId)` / `findByHomePodId(podId)` | Projects of this holder (RUNNING or status-independent for the heartbeat snapshot). Keyed on the Pod ID with an index behind it, not on the Node name |
| `sumScoreByHomePodId(podId)` | Sum of `homeResourceScore` — the load the Pod reports about itself per beat |
| `findProjectsNeedingOwner(leaseTtl, limit[, skip])` | "needs an owner and has no live lease" (§6.2). Index range scan; `skip` because the self-pull discards candidates for a reason the query cannot express |
| `findPendingPlacement(leaseTtl, pendingTtl)` | Projects that could not be placed anywhere on the last attempt — the set reported by the demand notification (§5a of the Cluster Spec) |
| `markPendingPlacement(tenant, name, now)` | sets `pendingSince`, **only if empty**, so it means "waiting since" instead of "last asked" |
| `setOwnerRequired(tenant, name, value)` / `findOwnerRequired()` | the derived flag; written only if it flips |
| `setLifecycleType(tenant, name, value)` | atomic switch between `AUTO`, `EPHEMERAL`, and `PERMANENT`; refuses `HOMELESS` and SYSTEM Projects |
| `setPlacement(tenant, name, selector, score)` | Selector and score; validates the selector via `PodSelector` (§3a of the Cluster Spec) |

**Removed** with the lease refactoring: `findPermanentOrphans` (replaced by `findProjectsNeedingOwner` — the old selector hit nothing because `PERMANENT` had no writer) and `clearStaleHomeNodes` (there is no stale state to clean up anymore, §6.1).

`ProjectLifecycleService` builds on these methods and adds the Workspace steps and event emission. `ProjectManagerService` (vance-brain) is the Brain-side façade for **Ownership** — it fetches Pod ID, Node name, and lease TTL from `ClusterService` and translates `claim`'s `Optional.empty()` into `ClaimRejectedException` / `ClaimResult.Redirect`. It no longer needs a live set: the CAS predicate is local to the document (§4.3).

**"Which Pod *should* run it" is not here**, but in `ProjectPlacementService` (`vance-brain.cluster.placement`, §5 of the Cluster Spec). The separation is the lesson from seven scattered answers to this question: `ProjectManagerService` enforces a decision, it does not make it.

---

## 10. What This Spec Does Not Govern

- **Engine listeners** for `ProjectEngines{Start,Stop}Requested` beyond `UrsaSchedulerService` — V2, together with Session suspend cascade from `session-lifecycle.md` §9.
- **Auto-suspend on inactivity** at the Project level (analogous to Session idle sweep) — comes with the quota sweeper from `workspace-management.md` §9.
- **Cross-Pod Process Migration:** a running Think Process remains on its Pod. On Pod death, the Process dies, the Project is brought up anew on another Pod, the next trigger may spawn a new Process. No live migration.
- **Migration of old Mongo data** with status values `PENDING`/`ACTIVE`/`ARCHIVED` or the legacy `podIp` field — the old field remains physically in documents but is no longer read by the mapper; an optional `db.projects.updateMany({}, {$unset: {podIp: ""}})` cleans it up after stabilization. The same applies to the former `requiresOwnerPod` field (see cluster-project-management.md §10).
- **Distribution of Projects to Pods in the Cluster** — *which* Pod should run a Project, eligibility, score model, Master role: all in cluster-project-management.md. This spec here knows the individual `bring` on the local Pod and the **ownership lease** (§4); the selection before that does not belong here.

---

## 11. Relation to Other Specs

- cluster-project-management.md — Cluster-wide distribution: eligibility via labels/selectors (§3a), score and capacity model (§3, §3b), Master role, the placement façade and its triggers (§5), demand notification (§5a), self-pull switches (§5b), drain (§5c). Sits one layer above this spec.
- [workspace-management.md §11](/specs/workspace-management) — Workspace part of the Suspend/Recover/Close flows. ProjectLifecycleService delegates there.
- [session-lifecycle.md](/specs/session-lifecycle) — Session/Engine lifecycle. The Engine hook events (V2) interlock with the Session suspend cascade.
- [architektur-scopes-clients.md](/specs/architektur-scopes-clients) — Scope hierarchy Tenant → Project Group → Project → Session.
- [vision.md](/specs/vision) — what a Project is in the product sense.
