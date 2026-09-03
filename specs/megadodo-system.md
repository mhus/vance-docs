---
title: "Megadodo — Activity Feed per Project"
parent: Specs
permalink: /specs/megadodo-system
---

<!-- AUTO-GENERATED from llm/specification/megadodo-system.md (translated from the German specification/public/megadodo-system.md) — do not edit here. -->

# Megadodo — Activity Feed per Project

> **Megadodo** is the coarse activity log of a Project: what happened, and most importantly — what went wrong. Named after Megadodo Publications, the publishing house of the Guide on Ursa Minor Beta: a place that publishes without being smart itself.

Status: **v1 productive** (Entity + Service + REST + Insights-Tab), verified in browser on 2026-08-23. Design history: `planning/megadodo.md`.

## 1. Purpose

The user does not see the actual logs (SLF4J, Loki, Grafana) and should not see them — there are too many, they answer a different question, and they are behind operational access. Nevertheless, work is happening in their Project that they did not initiate: Schedulers fire, Hooks react, Events arrive, Tools fail.

Megadodo answers two questions and no others:

1. **What is happening in my Project?** — one event, one line.
2. **What went wrong?** — the more important case. A broken script in an Ursa Event, a Scheduler that has been failing since Tuesday, a Tool that Agrajag has shut down.

This leads to three strict rules:

- **Error lines carry a readable cause.** "Script `cleanup.js` line 14: `todo is not defined`", not "script execution failed". An error line from which one does not know what to do has failed its purpose.
- **Inclusion criterion for a new event:** *would the Project owner want to know about it?* — not *is it technically interesting?*
- **Errors are discoverable without searching** — highlighted, plus an "only errors" toggle.

**Distinction.** Megadodo does **not** replace SLF4J/Loki (operator level), **not** `llm_traces` (LLM roundtrips), **not** the detailed logs under `_vance/logs/` (one log per run), and **not** the [Run View](/specs/runs-view) (`runs.html` shows *running* instances, Megadodo the history). It is the layer above, which refers to these.

## 2. Data Model

`MegadodoEventDocument` (`vance-shared`, Collection `megadodo_events`) — append-only, no one ever updates a line.

| Field | Meaning |
|---|---|
| `tenantId` | |
| `projectId` | `null` = tenant-wide (User created, Project created) |
| `timestamp` | |
| `action` | dotted, lowercase: `scheduler.run`, `session.lifecycle` |
| `phase` | `START` / `END` / `SINGLE` |
| `outcome` | `success` / `failure` / `skipped`; `null` on `START` |
| `severity` | `INFO` / `WARN` / `ERROR` |
| `traceId` | groups the lines of **one operation** |
| `actor` | who; `null` = System |
| `refType` + `refId` | **which thing** — the UI wires the link from this |
| `message` | human-readable; for errors, the cause |
| `logPath` | Project path of the detailed log, if one exists |
| `details` | free-form |
| `expiresAt` | TTL anchor; `null` = unlimited |

### 2.1 `refId` vs. `traceId`

> **`refId` identifies the *thing*, `traceId` the *operation*.**

For the Scheduler, they diverge (`refId` = Scheduler name, `traceId` = the `correlationId` of **one** run) — this shows that they must be two fields. For Session lifecycle, they coincide; this is fine and no reason to merge them.

`traceId` is **never invented anew**: it is the ID that the operation already has — `correlationId` for Scheduler/Hook/Event, `sessionId` for Session lifecycle, the name for Project and User.

`refType` is a closed enum (`PROJECT`, `SESSION`, `PROCESS`, `USER`, `TOOL`, `SCHEDULER`, `HOOK`, `EVENT`, `DOCUMENT`), and the UI hardwires **one** jump target per value. This is intentional, instead of a generic URI in the dataset: where a Session is best displayed is decided by the view, not the emitter. A value unknown to the UI simply renders without a link.

### 2.2 `SINGLE` is mandatory

"User created" has no duration. A pure START/END pair would force point events to invent an end.

Conversely: where a START has been emitted, an END **must** follow — even in the skipped case. An operation without an END reads as "still running" in the collapsed view, and that is precisely the signal for hanging operations; a skipped Scheduler tick must not falsely trigger it.

## 3. Emitting

`MegadodoService` (`vance-shared`) — **a specialized method per event type**, called directly at the point where the event occurs.

No fan-out layer, no configuration list that decides what counts: the call site *is* the decision, and the complete inventory of what can appear in the feed is the set of public methods of this class.

Rejected and why — details in `planning/megadodo.md`:

- **Megadodo as a second `AuditConsumer`.** `AuditService` discards events when the queue is full (by design: "Audit must never block a producer"). Acceptable for a compliance log; for a feed that answers "did my Scheduler fail last night?", the silently missing line is precisely the error the feature is supposed to prevent.
- **An emit allowlist as a property.** It would have filtered what is already individually hand-set — a second place for the same decision, and a forgotten entry fails silently.

### 3.1 Write Path

Synchronous, a Mongo insert, in `try/catch`, errors only logged. No worker, no queue: **diagnostics must never endanger the run they are logging** — the same rule by which `SchedulerLogService` catches its document upsert.

**Nothing is discarded during writing.** The silencing happens during reading (collapsing pairs, filtering action prefixes, "only errors"): a wrong decision there is a filter fix, during writing it would be data loss.

### 3.1a The Retention Lookup Reverses the Dependency

`MegadodoService` resolves its retention via the Settings cascade and thus depends on `SettingService`. An emit **from** `SettingService` closes the loop, and no Spring Context starts anymore.

This is resolved on the Settings side with an `ObjectProvider<MegadodoService>` — intentionally there and not vice versa: Settings are core infrastructure, the feed is diagnostics, and the core must not keep the diagnostic service open. The same pattern is used by `ProjectService` for the permission layer.

**For new emit points, this means:** a service that `MegadodoService` itself needs may only hold Megadodo lazily. Today, these are precisely `RetentionSettingCache` and `MongoTemplate`.

**And the lookup is cached.** It ran per feed line via `SettingService.getStringValueCascade` — up to three uncached Mongo reads, for a number that practically never changes. `RetentionSettingCache` (`vance-shared`, TTL 1 min) sits in front; the LLM Ledger uses the same cache and had the same problem twice (twice per model call *attempt*). Intentionally **no** general settings cache: most setting reads are correctness-relevant, an outdated credential is an error. This one is limited by its signature — key in, `int` out, and the only readers are retention paths.

### 3.2 Emit Points v1

| Area | Action | Form |
|---|---|---|
| Project | `project.lifecycle` | `SINGLE` on create/close, tenant-wide |
| Project Home | `project.home` | `SINGLE`, tenant-wide, **four** lines: *claimed* (`success`), *released* (**WARN**), *lost* (**ERROR**), *homeless* (**ERROR**). `traceId` = Project name, residences read as a history |
| Session | `session.lifecycle` | `START` on create, `END` on delete, `traceId = sessionId` |
| User | `user.lifecycle` | `START`/`END`, tenant-wide |
| Agrajag | `tool.health` | `START` on DOWN/DEGRADED, `END` on OK — **only actual transitions** |
| Ursa Scheduler | `scheduler.run` | `START` on tick, `END` on success/failure/skip |
| Ursa Hooks | `hook.run` | `START`/`END` |
| Ursa Events | `event.trigger` | `SINGLE` — the trigger interface reports only once when it's over |
| Settings | `setting.change` | `SINGLE`; `WARN` for encrypted types. Project-scoped Settings land in the Project feed, tenant-/user-scoped tenant-wide |
| Trillian | `trillian.wakeup` | `SINGLE` — **only the successful wakeup**, with findings as reason; `traceId` = idempotency key of the `<self-check>` command |
| Kits | `kit.lifecycle` | `SINGLE` on install/update/apply/uninstall. Four outcomes: `success`, `incomplete` (**WARN** — written, but something withheld), `failure` (**ERROR**), Uninstall as **WARN**/`success`. `traceId` = one operation |
| Kit Provisioning | `kit.provisioning` | `SINGLE`/`failure` (**ERROR**) — **only** what fails *before* a Kit has a name: unreachable host, unreadable `provisioning.yaml` |

**The value of a setting is never recorded** — not even for unencrypted types. A key that looks harmless today might hold a token tomorrow, and a feed line is significantly easier to read than the Settings Collection. Knowing who changed what where is enough for lookup. (The same rule applies in the Audit Log; see `AuditService.settingsUpdate`.)

**However, the "who" must arrive.** `SettingService.set(...)` does not know the caller, so there are `setAs(...)`/`setEncryptedSecretAs(...)` alongside it with an actor parameter, which is filled by the paths that *have* it: Admin REST, Setting Forms, Profile Editor. A `null` is not an unknown here, but a statement — **not a human, but the server**: a token refresh, a bootstrap, a service writing its own salt. This is precisely why there are two forms instead of a mandatory field that half the callers would have to invent.

**The silent round gets no line.** A due Trillian self-check, whose nature finds nothing, rearms and continues — hourly, per loop, forever. This is the normal case, and normal cases do not belong in a feed that one reads to find anomalies. The same principle as with `tool.health`, where only actual transitions count: the change is recorded, not the beat. The cross-check ("is the heartbeat running at all?") is answered by the `log.trace` line of the tick, not the feed.

**Where a Project has lived.** A Project belongs to exactly one Pod at any given time and migrates if a Pod dies, restarts, or the Master redistributes. "Which Pod was it on when that happened" was not answerable afterwards: there was only the *current* `homePodId` and a log line on a Pod that might be gone.

**Four lines, one per thing that is actually observable:**

| Line | Severity | who notices it | when |
|---|---|---|---|
| `claimed` | INFO | the taking-over Pod, in `ProjectService.claim` | a Project arrives here |
| `released` | WARN | the releasing Pod, `@PreDestroy` | clean shutdown |
| `lost` | **ERROR** | the losing Pod, `ProjectLeaseService` reconciliation | Pod was still running, Lease was gone anyway — GC pause, Mongo outage, Master redistribution |
| `homeless` | **ERROR** | the Master, `ClusterDistributorTick` | no one holds it and it could not be placed |

A single arrival line is **not** sufficient, and this is the reason for the split: "arrived on B" says that A is finished — but not whether A left cleanly, not whether A is still running and just doesn't have it anymore, and above all nothing about a Project that has **no** home at all. The latter precisely *does not* generate an arrival line because nothing has taken it over.

**The arrival line carries where it came from — and when that Lease was last renewed.** Without the timestamp, two consecutive claims only say "something happened in between"; with it, they say *how long* the Project was in limbo, and thus whether the handover was orderly or a failure. This is necessary because one type of departure remains unobservable: a Pod terminated with SIGKILL executes neither a shutdown hook nor a reconcile tick.

**The line contains `ip:port`**, not just the Pod ID: an operator's question is "which machine", and a Pod ID no longer answers that once the Pod is gone. Source is `LocationService.getPodAddress()` via `ClusterService.selfEndpoint()` — the same address the Pod writes to the Cluster Registry.

**Writing happens on transition, not on tick.** `claim` is idempotent and is also the Lease renewal; every path that *uses* a Project passes through there — one line per call would be one line per Session Create. A rejected claim (another Pod holds a live Lease) also writes nothing, as nothing has moved. And the renewal beat runs every minute on each Pod: a healthy round writes nothing.

**`homeless` is the one exception to this and repeats** — once per Distributor round, as long as the state persists. Unlike a Tool disruption, which has a state transition, this is not a one-time event but an ongoing incident: each round is another one in which a Project wanted to run and did not. A successfully placed Project gets **no** line here — that is written by the target Pod on claim, including its origin.

**Why Kits are even here.** A Kit is the only thing that installs *software* into a Project: Documents, Recipes, Tool definitions, Credentials. Whether that happened — and whether **all** of it happened — must be verifiable by the Project owner. Moreover, it happens via the Provisioning path without anyone watching, and its failures are inherently silent: a host that does not respond; a credential that could not be delivered and still reports the install as a success. Until these lines existed, the only trace was a log line on the Pod that currently owned the Project. Precisely this class — "didn't work and no one noticed" — is what the feed is for.

**Emitting happens in `KitService`, not at the caller.** This ensures that Admin REST, LLM Tools, Project Create, and Provisioning generate the same lines — and the one path that runs unattended is not the one that remains silent.

Three distinctions, all intentional:

- **`incomplete` is a separate line**, not a detail on a success line: an install that reports completion while a credential is missing otherwise looks exactly like a complete one.
- What was skipped due to a **Document Lock** is *not* in the feed — that is the lock at work, not a failure.
- **Argument errors do not get a line.** "apply and writeManifest together" is immediately visible to the caller; the emit is therefore *within* the block that encloses resolve and write, not around the parameter checks before it.

**The eventless Provisioning round gets no line** — the same principle as above. The tick runs every four hours over every Project on the Pod; "checked, nothing to do" would be the normal case and would make the feed unreadable. A *permanently* broken host, however, reports itself again in each round, and this is intentional: unlike a Tool disruption, which has a state transition, each round here is a separate failed attempt.

**`kit.provisioning` is intentionally a separate action** and not part of `kit.lifecycle`: it fires *before* a Kit has a name — unreachable host, unreadable provisioning document — so there is no Kit operation it could belong to. The failures of operations that a round *starts* are reported by `kit.lifecycle` just like any other caller.

The Scheduler `START` originates at the tick (not after the spawn): the reader wants to see that something has begun, and the detailed log path is only calculable there. The `END` comes, depending on the action type, from the process termination listener (Recipe), synchronously (Script), or not at all (Workflow — for this, there is `runs.html`).

## 4. Retention

`expiresAt` is calculated per write from the Settings cascade, Mongo's TTL monitor cleans up. **No prune job** — a job that must run for data to remain limited will eventually not run; the predecessor `EventLogService.deleteOlderThan` had no caller at all.

Tri-state, the same convention as for Scheduler/Event/Web Run logs:

| Value | Meaning |
|---|---|
| `> 0` | Retention in days, clamped to 3650 |
| `0` | `expiresAt` remains `null` → unlimited (Mongo skips documents without the indexed field) |
| `< 0` | do not write at all |

Property `vance.megadodo.retention-days` (Default 90), overridable per Tenant/Project via the setting `megadodo.retentionDays`. Read via the `RetentionSettingCache` (§3.1a) — a change thus takes effect with a delay of up to one minute, which is inconsequential for "when do future lines expire".

## 5. Reading

REST under `/brain/{tenant}/megadodo`:

| Endpoint | Purpose |
|---|---|
| `GET ?projectId&from&to&minSeverity&action&refType&refId&actor&q&cursor&limit` | one feed page, newest first |
| `GET /trace/{traceId}` | all lines of an operation, oldest first |

**Paging is keyset**, not offset — the feed grows while being read, and an offset shifts the boundary between two pages (the same lesson on which the [Centauri](/specs/centauri-service) merge is built). The cursor is Base64 of `(epochMillis, mongoId)` and opaque; a broken cursor means "start from the beginning", no error page — an old bookmark should show the latest page.

The query fetches **one more line** than the limit to detect the existence of the next page without a second count query; the extra line never reaches the caller.

### 5.1 Authorization

`Action.ADMIN`, intentionally: the feed shows what ran under foreign identities and which Tools failed.

- with `projectId` → `Resource.Project(tenant, projectId)`
- without → `Resource.Tenant(tenant)`

Tenant-wide lines (User created, Project created) do not carry a `projectId` and therefore cannot belong to a Project scope — reading them is a Tenant Admin decision.

**The checked scope is the read scope.** This applies to *both* endpoints, and for the trace, it is where things can go wrong: `projectId` comes as a query parameter, is checked — and must then also be in the query. `byTrace` therefore filters on `(tenantId, traceId, projectId)`. Otherwise, `?projectId=<own>` with a foreign `traceId` would be a working view into another Project, and the `traceId` is no obstacle for this: it is never invented anew (§2.1), so it is a borrowed ID — `sessionId`, `correlationId`, and for `setting.change` literally `scope:scopeId:key`, thus enumerable.

## 6. Web UI

Tab **Activity** in `insights.html` (`MegadodoTab.vue`) — not to be confused with the existing `EventsTab`, which shows Ursa Event *definitions*.

**Lines are collapsed by `traceId`**: one line per operation with duration, outcome, and colored status bar; a click expands and shows the individual lines. This keeps the store complete and the view calm.

- Color bar on the left is the "is something broken" signal: red = failed, yellow = running/skipped, green = finished.
- "Only failures" is a toggle, not a clicked-together filter line.
- An operation **without END** appears as `running` — for a Scheduler run stuck in `BLOCKED`, this is the desired visibility.
- **Expanding loads `GET /trace/{traceId}` afterwards**, instead of recycling the loaded page. Under "only failures", the page contains only the END line — but duration and Run Log link are attached to the START line, and these are needed precisely when an error occurs.
- Duration is **not** denormalized; it is in the two timestamps.

## 7. What v1 does not do

No live push (the view is manually refreshed — Insights convention), no export, no LLM Tool, no severity-dependent retention (the field allows it, v1 does not use it), no aggregation ("this Scheduler failed 12 times this week").
