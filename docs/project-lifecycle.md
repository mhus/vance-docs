---
title: "Vance — Project Lifecycle"
parent: Documentation
permalink: /docs/project-lifecycle
render_with_liquid: false
---

<!-- AUTO-GENERATED from specification/public/en/project-lifecycle.md — do not edit here. -->

---
# Vance — Project Lifecycle

> Defines the status set of a Project, Pod ownership, the `bring` / `suspend` / `close` transitions, and the relationship to the Workspace. Complements [workspace-management.md](/docs/workspace-management) (what happens *within* a Project on disk) and [session-lifecycle.md](/docs/session-lifecycle) (what runs *within* a Session) — this spec is the overarching framework. Cluster-wide distribution of Projects to Pods (who calls `bring` when on which Pod) is covered in cluster-project-management.md, which sits one layer above.

---

## 1. What a Project Is

A Project is the **unit of ownership** in Vance:

- A Pod owns a Project (Pod affinity via `homeNode`/`claimedAt`)
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

- `bring` pulls any non-CLOSED Project to RUNNING (on the current Pod).
- `suspend` pulls any non-CLOSED Project to SUSPENDED.
- `close` is terminal from any status.
- Pod takeover is orthogonal: another Pod can claim a RUNNING Project (Lease-Takeover); the previous Pod only learns about it on the next write attempt.

---

## 4. Pod Affinity ≠ Lifecycle Status

`ProjectDocument` carries two orthogonal axes:

| Axis | Fields | Who sets? |
|---|---|---|
| Lifecycle Status | `status` | `ProjectLifecycleService` (see §5) |
| Pod Affinity | `homeNode`, `claimedAt` | `ProjectService.claim` |
| User Intent (distribute?) | `lifecycleType` (`HOMELESS`/`EPHEMERAL`/`PERMANENT`) | User on Create; SYSTEM Projects auto-`HOMELESS` (see cluster-project-management.md §2) |

`homeNode` is the **Cluster Node Name** of the owner Pod (e.g., `maya-prosser`), not an endpoint. Each Brain boot assigns a fresh Node Name from a dictionary (see `ClusterNodeNameGenerator`) and registers itself in `brain_pods`. Other Pods resolve the name via `ClusterService.resolveEndpoint(homeNode)` to `host:port` whenever needed. This indirection is intentional: a Pod restart with the same IP+Port (typical in K8s with stable service IPs) does **not** inherit its old claims because its Node Name is different — the stale detection in §5/§6 handles this cleanly.

`status` and `homeNode` are independent. Examples:

- `RUNNING` + `homeNode=maya-prosser` → Pod "maya-prosser" actively owns the Project
- `RUNNING` + `homeNode=null` → Owner Pod has disappeared; `ProjectWakeupTick` re-brings the Project if `requiresOwnerPod=true` (see §6.2)
- `SUSPENDED` + `homeNode=null` → suspended, no owner — any Pod can reclaim
- `SUSPENDED` + `homeNode=maya-prosser` → suspended, the named Pod last suspended (informational)

The CAS predicate in `ProjectService.claim` (§9) allows three acceptance cases: `homeNode IS NULL` (free), `homeNode == self` (refresh), `homeNode ∉ liveClusters` (Stale-Takeover). This prevents a RUNNING Project on Pod A from being stolen by Pod B as long as A is alive according to the `brain_pods` registry — a race between two parallel claims deterministically yields only one winner.

`lifecycleType` controls which `homeNode=null` orphans the Cluster Master actively re-brings: `PERMANENT` yes, `EPHEMERAL`/`HOMELESS` no. Details and the score model for distribution are in cluster-project-management.md. Engine lifecycle listeners do not touch `lifecycleType` — the user intent is static.

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
                                           # and status RUNNING — Claim Refresh)
2. status → RECOVERING                     # atomic via transitionStatus
3. workspaceService.init(tenant, projectId)# auto-recovers Snapshots if present
4. publish(ProjectEnginesStartRequested)   # Spring Event for Engine Listeners
5. status → RUNNING                        # atomic via transitionStatus
```

Idempotent: if status is already RUNNING and Pod is already owner, bring is a no-op (Pod claim is refreshed — step 1a is skipped, otherwise an actively connected client would be disconnected).

Step 1a covers the reconnect path after Pod death: stale `boundConnectionId` values would otherwise reject the first reconnect with `409 Already-Bound`. The reclaimer in §6.1 cleans this up on boot only for Projects that have `homeNode=self` — this does not cover the path where another Pod (or this Pod itself after restart) freshly takes over a Project. Therefore, it is explicitly done again during `bring`.

From `RECOVERING` (previous Pod crash mid-recovery), `bring` proceeds — `workspaceService.init` is crash-safe (see `workspace-management.md` §11.4).

`claim()` acts as a true CAS: two Pods hitting a fresh Project in parallel will see exactly one winner. The second receives `Optional.empty()`, which the `ProjectManagerService.claimForLocalPod` wrapper translates into a `ClaimRejectedException`. The associated `claimForLocalPodOrRedirect` variant (for connection bind paths) returns a `Redirect` with the current owner's endpoint in that case, resolved via `ClusterService.resolveEndpoint(homeNode)`.

### 5.2 suspend

`RUNNING|SUSPENDING → SUSPENDED` on the current Pod.

```
1. status → SUSPENDING                       # atomic via transitionStatus
2. publish(ProjectEnginesStopRequested)      # Spring Event for Engine Listeners
3. workspaceService.suspendAll(projectId)    # Snapshots to Mongo, Folder gone
4. status → SUSPENDED                        # atomic via transitionStatus
```

Idempotent: SUSPENDED → no-op. From SUSPENDING (crash mid-suspend), it restarts from step 2 — `suspendAll` and Engine stop are both idempotent.

CLOSED fails with `ProjectStatusConflictException`. INIT (never recovered) is allowed — goes directly to SUSPENDED without Workspace operations.

### 5.3 close

Any → CLOSED. Terminal.

```
1. workspaceService.dispose(projectId)     # Folder + Snapshots gone, terminal
2. projectService.close(tenant, name, closedGroupId)  # status=CLOSED, projectGroupId=closed-group
```

`close` does **not** emit `ProjectEnginesStopRequested` — the caller is responsible for stopping Engines beforehand (typically via a preceding `suspend`). Direct `close` on a `RUNNING` Project does not kill Engines; they will learn that the Project is gone on the next Workspace access via `WorkspaceQuotaExceededException` or similar.

`SYSTEM` Projects are blocked by the underlying `ProjectService.close` (Hub protection).

---

## 6. Crash Recovery

Every transition is idempotent, every transient state clearly means "try this step again".

| Crashed in | On next `bring` | On next `suspend` |
|---|---|---|
| `RECOVERING` | continue with Workspace init + → RUNNING | first complete bring, then suspend |
| `SUSPENDING` | bring pulls from SUSPENDING → RECOVERING (allowed via transitionStatus) and recovers anew | continue with suspendAll + → SUSPENDED |

`workspaceService.init` and `workspaceService.suspendAll` are defined as crash-safe in §11.4 of workspace-management.md: each takes the Snapshot/Folder pair as the source of truth and brings it to the desired state.

`bring`'s `transitionStatus` allows transitions from any non-CLOSED status to `RECOVERING` — including SUSPENDING. This is intentionally allowed: a crashed SUSPENDING is effectively no longer intended to be suspended (otherwise the user would not have called `bring`), and the recovery path cleans up for recovery.

### 6.1 ProjectStartupReclaimer

On boot — as an `@EventListener(ApplicationReadyEvent.class)` with `LOWEST_PRECEDENCE`, i.e., **after** `ClusterService` registration — the Reclaimer cleans up three things:

1. **Stale-`homeNode`-Cleanup:** an idempotent `updateMulti({homeNode: $nin: liveClusters}, {$set: {homeNode: null}})`. The live set comes from `BrainPodService.listLiveClusterNodeNames(clusterId, staleAfter)` and includes its own Node Name (belt-and-suspenders). N Pods during a rolling deploy converge to the same final state — the update operation is deterministic and idempotent. If the live set is empty (defensive guard), it is skipped to prevent misconfiguration from triggering a cluster-wide reset.
2. **Session-Unbind:** for every RUNNING Project whose `homeNode` points to its own Node Name, lingering `boundConnectionId` fields are deleted (`SessionService.unbindAllForProjects`). Otherwise, the next reconnect would be rejected with `409 Already-Bound`.
3. **Boot-Self-Pull:** the Pod actively pulls `PERMANENT` orphans up to its configured `resourcesStartupScore` to itself — see cluster-project-management.md §5.1. This replaces the old "grabs everything available" behavior.

`EPHEMERAL` Projects remain untouched — they are only brought when someone requests them via the `ProjectLocator` (see cluster-project-management.md §6).

### 6.2 Cluster Master Distributor

The former `ProjectWakeupTick` has been replaced by the rotating Cluster Master and its 60s Distributor Tick — see cluster-project-management.md §4 and §5.2. Only **one** Pod in the cluster holds the Master role and performs the distribution; the other Pods leave it alone. Race-freedom still comes from the CAS in `ProjectService.claim`, which remains the guarantee.

Distributor's selector: `lifecycleType=PERMANENT AND status IN (RUNNING, RECOVERING, SUSPENDING, SUSPENDED) AND (homeNode=null OR homeNode NOT IN liveClusters)`. Targeting based on `(currentScore/maxScore)` utilization of live Pods.

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
  └── Sessions (own Lifecycle, see session-lifecycle.md)
  └── Workspace (own mechanics, see workspace-management.md)
       └── RootDirs (handler-specific: temp, git, ...)
```

**Project is the outermost shell.** Sessions and Workspace are under Project ownership; their status is informational, their lifecycle is controlled by the Project lifecycle in the worst case (Suspend, Close). The Project enforces:

- on `suspend`: Workspace goes off-disk (Engines stop via Event hook)
- on `close`: Workspace is disposed (Snapshots gone, terminal)
- on `bring`: Workspace recovers (auto via `workspaceService.init`)

Sessions can live independently of the Project status (own lifecycle properties), but if the Project is SUSPENDED, there is no Workspace anymore — Sessions that need Workspace tools will fail. A `bring`-cascade would have to reactivate Sessions; V2 will do this.

---

## 9. ProjectService — Atomic Building Blocks

`vance-shared.project.ProjectService` contains the individual Mongo operations, without orchestration:

| Method | Effect |
|---|---|
| `claim(tenant, name, selfCluster, liveClusters)` | CAS update: sets `homeNode=selfCluster` + `claimedAt` if `homeNode IS NULL OR == selfCluster OR ∉ liveClusters`. Returns `Optional<ProjectDocument>` (empty = another live Pod holds it). Rejects CLOSED. |
| `transitionStatus(tenant, name, expected, target)` | atomic findAndModify; throws `ProjectStatusConflictException` if status is not expected |
| `close(tenant, name, closedGroupId)` | sets status=CLOSED + projectGroupId; rejects SYSTEM Projects |
| `findRunningByHomeNode(node)` | RUNNING Projects owned by the specified Cluster Node |
| `findByHomeNode(node)` | all Projects with Owner = Cluster Node (status-independent, for Heartbeat snapshot) |
| `findPermanentOrphans(limit)` | `lifecycleType=PERMANENT` + Status non-CLOSED + `homeNode IS NULL OR ∉ liveClusters` — candidates for Boot-Self-Pull and Master Distributor (see cluster-project-management.md) |
| `clearStaleHomeNodes(liveClusters)` | idempotent `updateMulti`-bulk cleanup for the Reclaimer |
| `setLifecycleType(tenant, name, value)` | atomic switch between `EPHEMERAL` and `PERMANENT`; denied for `HOMELESS`-/SYSTEM Projects |

`ProjectLifecycleService` builds on these methods and adds the Workspace steps and event emission. `ProjectManagerService` (vance-brain) is the Brain-side façade — it injects `ClusterService` for the live set and translates `claim`'s `Optional.empty()` into `ClaimRejectedException` / `ClaimResult.Redirect`.

---

## 10. What This Spec Does Not Govern

- **Engine Listeners** for `ProjectEngines{Start,Stop}Requested` beyond the `UrsaSchedulerService` — V2, together with Session suspend cascade from `session-lifecycle.md` §9.
- **Auto-Suspend on Inactivity** at the Project level (analogous to Session idle sweep) — comes with the Quota Sweeper from `workspace-management.md` §9.
- **Cross-Pod-Process-Migration:** a running Think Process remains on its Pod. On Pod death, the Process dies, the Project is re-brought on another Pod, the next trigger may spawn a new Process. No live migration.
- **Migrations of old Mongo data** with status values `PENDING`/`ACTIVE`/`ARCHIVED` or the legacy `podIp` field — the old field remains physically in documents but is no longer read by the mapper; an optional `db.projects.updateMany({}, {$unset: {podIp: ""}})` cleans it up after stabilization. The same applies to the former `requiresOwnerPod` field (see cluster-project-management.md §10).
- **Distribution of Projects to Pods in the Cluster** — who calls `bring` when on which Pod, score model, Master role: all in cluster-project-management.md. This spec only covers the individual `bring` on the local Pod.

---

## 11. Relation to Other Specs

- cluster-project-management.md — Cluster-wide distribution: `lifecycleType`, score model, Master role, three spawn paths. Sits one layer above this spec.
- [workspace-management.md §11](/docs/workspace-management) — Workspace part of the Suspend/Recover/Close flows. ProjectLifecycleService delegates there.
- [session-lifecycle.md](/docs/session-lifecycle) — Session/Engine lifecycle. The Engine hook events (V2) interlock with the Session suspend cascade.
- [architektur-scopes-clients.md](/docs/architektur-scopes-clients) — Scope hierarchy Tenant → Project Group → Project → Session.
- [vision.md](/docs/vision) — what a Project is in the product sense.
