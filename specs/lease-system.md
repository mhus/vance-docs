---
title: "Vancetope — Lease System (Resource Leases)"
parent: Specs
permalink: /specs/lease-system
---

<!-- AUTO-GENERATED from llm/specification/lease-system.md (translated from the German specification/public/lease-system.md) — do not edit here. -->

# Vancetope — Lease System (Resource Leases)

> Authoritative product reference for the limited, fair sharing of scarce
> resources across all Tenants. Planning + design history:
> [`../../../planning/archive/lease-system.md`](/specs/lease-system).
> Implementation documentation (AI perspective): `readme/lease-system.md`.
> See also: [settings-system](/specs/settings-system) (Scope Cascade),
> [server-tools](/specs/server-tools) (`mcp_server` tools, `lease` parameter),
> [mcp-tool-routing](/specs/mcp-tool-routing), [damogran-system](/specs/damogran-system)

---

## 1. What the System Is — and Is Not

A **Lease** is a slot on a logical resource (`tex2pdf` compilation,
MCP server browser session, Workspace Compose run). Concurrent usage is
limited by **four quota levels** that stack as a funnel:

| Level | Scope |
|---|---|
| `global` | across all Tenants — the resource ceiling |
| `tenant` | per Tenant — fairness **on** the resource |
| `project` | per Project — fairness **within** the Tenant |
| `user` | per User — e.g., exactly one active browser session |

An acquisition must obtain a free slot at **every configured level**
(check order narrow → wide: user → project → tenant → global);
levels without a cap are pass-through. `cap: 1` results in an exclusive Lease.

**What it is not:**

- **Not a deployment topology.** The levels are quota scopes on
  logical resources. How often a resource is physically deployed is
  irrelevant — k8s manages the Node, the Lease system manages admission.
- **Not access control.** The Lease is a voluntary agreement
  among cooperative consumers. Anyone allowed to write the consumer config
  can disable or bypass the Lease — this is accepted. Protection against
  misuse is provided by the resource itself (Rate-Limit, 429) and k8s.

**Multi-Pod:** The Brain is multi-pod capable; all Lease state resides in
MongoDB (`resource_lease_counters`, `resource_lease_holders`).
In-memory locks cover a single Pod and are insufficient here.

## 2. Lease Definitions — Config Documents

**Nothing about the Lease is hardcoded in the consumer.** A
Lease definition is a YAML document at the path
`_vance/config/lease/<name>.yaml`:

```yaml
name: tex                 # must match the filename
resource: tex2pdf         # Counter key (Default: name)
levels:
  global: 6
  tenant: 3
  project: 1
  user: 1                 # all four optional; none = NOOP-Lease
ttlSeconds: 120
waitMs: 10000
```

**Four layers**, resolved field-by-field (not first-document-wins):

1. **classpath** — `vance-defaults/_vance/config/lease/<name>.yaml`
   (Add-on defaults, e.g., tex add-on)
2. **System** — Tenant `_vance`, Project `_tenant` (Operator overrule)
3. **Tenant** — Holder's Tenant, Project `_tenant`
4. **Project** — Holder's Tenant + Project

**Field ownership** (most specific allowed layer wins):

| Field | Allowed Layers |
|---|---|
| `levels.global` | classpath → System — a Tenant cannot raise the global ceiling; entries from deeper layers are ignored |
| `resource` | classpath → System → Tenant — a Project does not unintentionally land on its own counter |
| `levels.tenant` | classpath → System → Tenant |
| `levels.project`, `levels.user`, `ttlSeconds`, `waitMs` | all four |

The merged definition is cached per `(tenant, project, name)` and
invalidated via the Document Change Event chain (local and cross-pod;
System layer writes drop the name everywhere).

**Fail-closed on broken config:** A layer that is unreadable
(store error) or fails to parse (broken YAML, non-numeric value,
Cap < 1) causes the load to fail with `LEASE_UNAVAILABLE` — and nothing
is cached. A silently skipped layer might carry the exact Cap that
protects the resource. Caps are ≥ 1 (`cap: 0` would not block, but create
the counter on the first Acquire); to disable a resource, specify this
on the consumer (`tex.lease: none`). Lease names are path segments and
follow `[A-Za-z0-9][A-Za-z0-9_-]{0,63}`.

**Consumer referencing** — two forms:

1. **Name reference** — the consumer config only specifies the name:
   tex: Setting `tex.lease` (`none`/empty = no Lease, Default `tex`);
   `mcp_server` tool config: parameter `lease: browser`. Same name =
   shared funnel.
2. **Inline definition** — MCP configs may carry a Lease config inline
   (`lease: { name: …, levels: { … } }`); inline means: no layers, no merge.
   `name` is mandatory. Because the tool config is usually project-writable,
   the same field ownership applies to inline as to the Project layer:
   only `levels.project`, `levels.user`, `ttlSeconds`, `waitMs`.
   `resource`, `levels.global`, and `levels.tenant` are rejected, and the
   counter resides on a project-private resource
   (`mcp-inline:<tenant>/<project>/<name>`) — otherwise, a Project with
   `resource: tex2pdf` and a high `global` ceiling could occupy the shared
   funnel of all Tenants. Shared ceilings belong in a name reference.

## 3. Consumer Contract

```java
Lease lease = resourceLeaseService.acquire(LeaseRequest.builder()
        .type("tex")                  // Handler type, set by consumer code
        .lease("tex")                 // Name reference (or .inline(def))
        .tenantId(t).projectId(p).userId(u)
        .holderRef(processId)         // consumer-specific
        .pod(clusterService.selfPodId())
        .podBound(true)              // Resource dies with the Pod?
        .build());                    // LeaseBusyException / LeaseUnavailableException

lease.updatePayload(Map.of("jobId", jobId));  // often only known after acquire
lease.check();                                 // EVERY usage step
lease.release();                               // try-with / idempotent
```

- **`acquire`** waits up to `waitMs` (Poll with Jitter — waiting Pods
  must not race the counter in lockstep), then a typed error `LEASE_BUSY`
  with diagnosis (resource, level, occupancy). Never block indefinitely —
  the call runs on a Lane. Fail-closed: If Mongo is unreachable →
  `LEASE_UNAVAILABLE`, the resource is not used unprotected. A type
  without a registered handler is rejected (the Reaper must be able to
  dispatch later).
- **`check()` — Check-at-Use:** call at **every usage step**.
  Throws `LEASE_LOST` if the Lease was lost (Idle-Reap/Pod-Reap),
  and simultaneously acts as a Touch: `lastSeenAt = now` — the TTL clock
  runs from the last usage, not from acquisition. No background heartbeat
  timers.
- **TTL invariant per consumer:** TTL > longest interval between
  two `check()` calls. A poll loop keeps its Lease alive through its
  own polling.
- **NOOP path:** no Lease referenced or no Caps configured →
  `acquire` returns `Lease.NOOP` without any Mongo traffic.

## 4. Storage Model (MongoDB)

**`resource_lease_counters`** — one Doc per `(resource, level, scope)`,
`_id = <resource>|<level>|<scope>`; the User scope is `tenant/user`
(cross-project — "one browser session per User" does not multiply with
the number of Projects). Acquisition is an atomic
conditional update **without** upsert: if the filter `count < cap` matches,
it increments; if it does not match, the level is full — unless the Doc
does not yet exist. In that case, a pure `_id` upsert creates it with
`count: 0`, and the conditional update runs a second time. An upsert
*within* the conditional update would be incorrect: with simultaneous
first use, the loser's insert would collide with the `_id`, and Mongo
only retries such upserts with a pure `_id` equality filter — the loser
would falsely report Busy.

**`resource_lease_holders`** — one Doc per held Lease (Holder first:
PENDING → per level Counter-Inc **then** `$push` of the key into `levels`
→ HELD). An incremented Counter never exists without a Holder Doc that
knows about it. `lastSeenAt`/TTL run on **Mongo server time**
(write `$currentDate` — also on creation, the Holder is created via upsert
— `$$NOW` in the Reap filter) — Reaper and Holder are on different Pods.
No Mongo TTL index: deletion must decrement the Counters. A Touch counts
as "still held" if it **matches** the Doc, not if it changes it: two
touches in the same millisecond write the same value, Mongo reports
`nModified = 0`.

**Rollback:** If an attempt fails — level full *or* store error
mid-funnel — it deletes its Holder Doc and decrements the already
taken levels; a half-booked Holder would otherwise block a Cap-1 slot
for an entire TTL. Only the one who deletes the Holder Doc decrements:
if a Reaper has already taken it, it has decremented the registered
levels, the rest is left to reconcile.

**Release** = `findOneAndDelete` on the Holder Doc, then decrement of
the registered levels — only the one who deletes the Doc decrements;
Release and Reaper are thus idempotent.

**Reconcile:** a crash window remains between Counter-Inc and Level-Push
(and between Delete and decrement). The periodic sweep recalculates
the Counters from the Holder-`levels` and corrects discrepancies —
only Counters whose `updatedAt` is older than a safety margin
(`vance.lease.reconcile-safety-ms`, Default 60 s), and only if
`count`/`updatedAt` have remained unchanged since reading. Counters that
no Holder books anymore are deleted by reconcile instead of being zeroed
— otherwise, a dormant Doc would remain forever per User/Project; the next
Acquisition creates it anew.

## 5. Reap — Two Reasons

| Reason | Trigger | Effect |
|---|---|---|
| **Idle** | `lastSeenAt + ttlSeconds < $$NOW` | Delete Holder Doc, decrement Counter, Handler Dispatch (§6) |
| **Pod dead** | Holder Pod dead according to `ClusterService` criterion (same as Project ownership: not stopped, not stale) | Immediately release **all** Leases of the Pod; TTL is now only responsible for Idle |

Reap runs as a lazy Sweep on `acquire` (only Idle, only the affected
resource) plus a `@Scheduled` sweep (`vance.lease.reap-interval`, Default
30 s; Idle + Pod dead + Reconcile). Due to delete idempotence, it does
not matter how many Pods reap simultaneously. **Both paths dispatch the
Handlers** (§6): the lazy Sweep passes its Holders via the
`LeaseRevocationListener`-SPI (shared) to the `LeaseRevocationDispatcher`
(brain), which sends them asynchronously through the same matrix — the
acquiring thread waits neither for Handlers nor for a Pod-POST.
The lazy Reap is often the common case (another Pod wants the slot);
without dispatch, the resource would continue to run.

## 6. Lease Types and Handlers

A released Lease does not notify the consumer itself — a Reap that
only decrements the slot would let the resource continue to run
(Chromium in container, Compile-Poll) and the Counter would count claims
instead of instances. Therefore, **every Lease type has a `LeaseHandler`**
(Spring Bean; interface in `vance-shared`, registry in `vance-brain`):

- **Type and `podBound` are set by the consumer code** (LeaseRequest), not
  the config — only the code knows what it needs to clean up.
  `podBound=true` means: the resource lives in the Holder Pod and dies with it.
- **`payload`** in the Holder Doc carries what the Handler needs for cleanup
  (mcp: Endpoint + `Mcp-Session-Id`; tex: Job-Id) — updatable afterwards,
  because values are often only known after acquisition.
- **A regular `release()` does not call the Handler** — the Holder cleans
  up its resource itself. `onRevoked` only runs on revocation.

**Dispatch Matrix** (`podBound` is written to the Holder Doc on Acquire,
so the Reaper can decide without the Handler):

| Case | Behavior |
|---|---|
| Holder Pod alive (this Pod) | Handler local |
| Holder Pod alive (foreign) | internal POST `/internal/lease/revoked` (Document Change Events pattern); POST failure counts as "unreachable" → path below |
| Holder Pod dead + `podBound` | only release — the resource died with the Pod |
| Holder Pod dead + not `podBound` | Handler runs on the Reaper Pod with the Payload (e.g., DELETE of the Remote Session) |

**"Pod alive" has exactly one definition** (`LeasePodLiveness`), shared
by Sweepers (Pod-dead-Reap), Dispatchers, and the operational view (§9):
the Project ownership criterion (`ClusterService.resolveEndpointByPodId` —
not stopped, not stale, Endpoint known), and **the own Pod is always alive**
— it is obviously performing the check. A (still) missing or delayed
own heartbeat entry neither makes it a Reap target for its own Leases
nor causes the local Handler of a `podBound` resource, which is still
running here, to fail.

A lost notification is additionally secured by `check()`: the Holder
receives `LEASE_LOST` on the next step.

**Module cut:** Storage, Counter, Idle-Reap, and Reconcile in
`vance-shared` (`ResourceLeaseService` — only needs Mongo);
Pod-dead detection, Handler Registry, Dispatcher, forwarding, and
internal Controller in `vance-brain` (`ClusterService` and the
Cross-Pod-Controller live there; shared has no web endpoints). The
seam is `LeaseRevocationListener`: shared only knows the interface, brain
provides the implementation; without it (anus), a Reap is only logged.

## 7. Consumers

**tex2pdf (`vance-addon-brain-tex`)** — Type `tex`, Setting `tex.lease`,
bundled default definition
(`vance-defaults/_vance/config/lease/tex.yaml`: global 6, tenant 3,
project 1). `acquire` before submit, `updatePayload(jobId)` afterwards,
`check()` in each poll iteration, `release` on result. Overload
appears as `LEASE_BUSY` instead of remote 429. Handler `tex` is
`podBound` (the poll state lives in the Pod): `onRevoked` marks the
**running** poll loop as aborted (`TexCompileTracker`: the loop
registers and unregisters, a revocation after loop end leaves nothing);
the remote job itself cannot be aborted (no cancel endpoint) and
expires server-side. The Compile carries the User of the Damogran run,
so `levels.user` applies; a store error during `check()` ends as an
error result like any other compile error.

**Browser Session (Brain-MCP-Client)** — Type `mcp`, parameter `lease` in
the `mcp_server` tool config. The Lease is tied to the **Session lifecycle
in `McpConnection`** (not the pool — `ensureInitialized` re-opens after
`close()` silently): acquire on Session-Open, Payload
(Endpoint + Session-Id) after `initialize`, check on every
`tools/call`, release on Close. The bridge is the narrow
`SessionGuard`-interface in `vance-toolpack` (no Spring, no Mongo) —
the Brain implements it lease-backend, Foot gets none.
`podBound` follows the transport (stdio: subprocess dies with the Pod;
HTTP: session lives in the foreign server). A failure after acquire
(transport open, handshake, payload update) immediately returns the Lease.

`LEASE_LOST` on `tools/call` closes the Session
(`McpSessionRevokedException` via the `SessionGuard`-interface); the
next call opens a new one and acquires anew — otherwise, the connection
would fail on every call until pool invalidation.

Handler `mcp`, two cases:

- The Session is in this Pod's pool **and still holds the revoked
  Lease** (token comparison) → close pool connection. A delayed
  revocation for a session that has since been re-opened closes nothing.
- Holder Pod dead, not `podBound` (HTTP) → the Reaper Pod loads the
  Tool Config via the Cascade (Payload: Tool Name, Endpoint, Session-Id)
  and sends the Session-DELETE **with the configured Auth**. If the tool
  now points to a different endpoint, the DELETE is omitted.

**Workspace Compose Run** — v2 candidate: exclusive Lease (Cap 1) per
`(tenant, project, workspace-name)` for the entire run; `withLabelLock`
currently only secures provisioning, the subsequent run proceeds
unprotected in the shared directory.

**Prerequisite (included, independent of Lease):**
`McpHttpTransport.close()` sends the Session Termination DELETE with the
`Mcp-Session-Id`-header and the same Auth as the Session's requests —
previously, the server-side session remained unused on every connection
teardown (pool invalidate, OAuth disconnect, shutdown), and an anonymous
DELETE would fail on any authenticated server.

## 8. Metrics

`vance.lease.acquire{resource,outcome=success|busy|noop|unavailable}`,
`vance.lease.check{resource,outcome=ok|lost}`,
`vance.lease.release{resource,outcome=ok|already-released|error}`,
`vance.lease.reap{reason=idle|pod|revoke}`, `vance.lease.reconcile{outcome=corrected}`.
Tags low-cardinality; no Tenant-/User-Ids as tags.

## 9. Operations — View and Revocation

Two interfaces, separated by **scope**:

| Interface | Scope | Read | Act |
|---|---|---|---|
| Insights → **Leases** (Web-UI) | own Tenant, `Tenant`/`ADMIN` | Holders of the Tenant; Counters of `tenant`/`project`/`user` levels | Revoke a Holder of the Tenant |
| anus `lease …` | all Tenants | Holders, Counters including `global`, merged definition | Revoke a Holder or all Holders of a Pod, Reaper round, Reconcile |

**The `global` level belongs to no Tenant.** Its occupancy sums all
Tenants and therefore only appears in anus. A revocation via Insights
only affects a Holder of the path Tenant — tokens are global, Tenant
binding is in the delete filter, not in the client.

**Revocation is a Reap based on Operator decision**, not a `release`:
Holder document removed, booked levels returned, then the Handler of the
type runs via the same `LeaseRevocationDispatcher` as during the Sweep
(§5, `podBound` matrix). Only releasing the slot would let the resource
continue to run. The Holder itself notices it on the next `check()`
(`LEASE_LOST`). Metric: `vance.lease.reap{reason=revoke}`.

**anus reads directly from Mongo, revokes via the Brain**
(`/internal/lease/admin/…`, Shared-Secret): only the Brain has
Handler Registry and Pod Routing. `--force` revokes directly in Mongo
without the Brain — in case none is reachable. In this case, **no**
Handler runs: the slot is free, the Holder fails on the next `check()`,
a resource in a foreign system (Remote-MCP-Session of a dead Pod) is
left to its own expiration. The output states this.

Commands: `lease list` (Filter Tenant/Resource/Pod/Type), `lease show`,
`lease counters` (with `BOOKED` = number of Holders booking the Counter,
and drift marker), `lease definition` (merged definition as an
Acquisition would see it in scope — cache discarded beforehand, anus is
not tied to the change event chain), `lease revoke`, `lease revoke-pod`,
`lease sweep` (a Reaper round now, with Handlers), `lease reconcile`
(Counter drift, needs no Brain and no Handler).

**Make drift visible instead of hiding it:** Both interfaces show,
besides the Counter status, the number of Holders that book it — the
value to which Reconcile corrects. A difference is drift from a
crash window, not a display error.
