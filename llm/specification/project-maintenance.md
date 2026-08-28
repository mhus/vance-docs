# Vancetope — Project Maintenance (Deletion and Renaming)

> The service tasks that touch **all** data of a Project: counting, deleting, propagating the name. One handler per Entity, one service that aggregates them, three commands in the Admin Shell.
> See also: [anus-setup-wizard](anus-setup-wizard.md) | [permission-system](permission-system.md) | [architektur-scopes-clients](architektur-scopes-clients.md) | [document-versioning](document-versioning.md)

---

## 1. Why it exists

Until now, a Project's life ended with `project close`: `CLOSED` status, workspace cleared, but the Project remained. A **hard** deletion path existed nowhere — not in the Shell, not in the Brain, not as a tool. `DELETE /brain/{tenant}/admin/projects/{name}` is also `close`.

This was not an oversight, but a gap with a concrete cost: a Project's data resides in **over twenty Collections**, and without a central place that knows them all, no one could get rid of a Project without leaving remnants. Remnants here are not just disk space — a Project's technical key is its `name`, so **the next Project with the same name inherits them**: consumed quota, old permission grants, "already fired" markers that silently prevent an `at:` scheduler from ever running.

Renaming has the same problem from the other side. `ProjectService.update` explicitly declares `name` as immutable, and that was correct as long as no one could update the references.

## 2. The Seam: One Handler per Entity

`ProjectDataHandler` (`vance-shared`, `de.mhus.vance.shared.project.maintenance`) is the sole extension point. A handler responds for **one** Entity to three questions:

| Method | Question |
|---|---|
| `count(tenant, project)` | How much of me belongs to this Project? |
| `delete(tenant, project)` | Get rid of it. |
| `rename(tenant, project, neu)` | The Project is now named differently. |
| `collections()` | For which Mongo Collections do I respond? |
| `order()` | When is it my turn? |
| `deleteNote(…)` | What does the line count not say? |
| `renameBlocker(…)` | Why can't I carry the rename? |

A new project-scoped Collection means: add a handler. No central list, no `switch`.

The default case is `MappedProjectDataHandler` — name document classes, and it's done; `count`/`delete`/`rename` and `collections()` are derived from it (the latter from the Mongo mapping, so it cannot drift apart). Few lines per Entity. Those who need more (Blobs, directories, lines found via a parent) implement the interface directly.

### 2.0 Where things are located

**SPI and all handlers in `vance-shared`**, next to their Entities — they must be there, otherwise the Admin Shell won't see them. **The two collectors (`ProjectMaintenanceService`, `UserMaintenanceService`) and the report are in `vance-anus`** (`de.mhus.vance.anus.maintenance`).

This is not a historical accident: both operations deliberately have **no REST surface and no LLM tool** (§10), and their gates — typed confirmation, drain — exist only at a terminal. As beans in the Brain, the collectors were unused, and an unused service that deletes tenant data is an invitation: the next person who wants "delete Project" in the Admin UI will attach a controller and get the sweep **without** the gates. The move makes the documented boundary structural.

Cost, explicitly stated: if a delete in the Brain is desired later, the two classes move back — and `HubProjectUserDataHandler` with them, because it is the **only** handler that depends on a collector, and therefore also the only one not located next to its Entity.

### 2.1 Data Sovereignty: A Deliberate Exception

The rule is: **only the responsible service accesses Mongo.** A handler does it directly — this is a deliberate exception, not a circumvention. Two things keep it tight: it is in the **same package** as its Entity's Document, Repository, and Service, so no one accesses foreign data; and it answers exclusively the three maintenance questions, not domain questions. The alternative would have been a `deleteByProject`/`renameProject` pair on twenty services that no other caller would ever use.

On a larger scale, the same applies to **anus**: as an admin tool, it is allowed direct database access. This is precisely why the Shell exists at all and why its POM says "speaks directly to MongoDB through vance-shared services".

### 2.2 Sort Index

`order()` is a **mandatory method without a default**. Equal values are allowed and mean "order between these two doesn't matter" — the normal case. Exactly one relationship is critical: a handler whose lines are found *via* another Entity must sort **before** it. Chat-Messages do not carry `projectId`, they are attached to their Session; if the Session handler runs first, the Sessions are gone, the Messages are untraceable — and **nothing reports an error**. This silent error type is why there is no inherited default: it would randomly place a new handler somewhere in the middle, and precisely in the cascade case, randomness is invisible.

The block of ordinary handlers is numbered from **100 in 100-step increments** (inventory in §11, at runtime `project handlers`). Two areas are intentionally left free:

- **below 100** for anything that must run before *every* Entity — not just before a parent. The Trillian handler is at 50 and is precisely the case for which the area exists (§7a).
- **the gaps between steps**, to insert a new handler between two existing ones without renumbering.

The Project document itself is **not** a handler and does not carry an index (see §4). Two tests in the Admin Shell enforce the order: cascades before their parents, and the Trillian handler before all others.

## 3. The Coverage Problem, and the two answers to it

A missing handler does not announce itself. The lines simply remain. This is the same danger that `StorageReferenceSource` guards against from the other side ("Silence must never mean *unreferenced*") — here it means: Silence must never mean *nothing present*.

Two layers, and neither replaces the other:

**(a) Build-time — the drift guardian.** `ProjectDataCoverageTest` boots the Admin Shell, scans the classpath for `@Document` classes with a `projectId` field, and requires a handler for each. It runs **in the Shell** because that is the process with the narrowest classpath (`vance-shared` + Addons, no Brain): a handler that only the Brain has is not available to the operator during `project delete`, so "covered" must mean covered *here*. The test has its own floor — a scanner that finds nothing would report perfect coverage.

**(b) Runtime — the probe.** `ProjectMaintenanceService.unaccountedCollections` queries the **database**, not the code: which Collection contains lines for this Project that no handler claims? This catches what (a) cannot see — Collections written without a Document class. It reports, **never** acts: deleting from a Collection that no one claims would be guessing what its fields mean.

The probe is deliberately not perfectly accurate: it only counts in Collections where a **sample** of the first 20 documents shows a `projectId`. A `count({projectId: X})` across every Collection would be a full scan without an index, and `storage_data` (Blob chunks) is huge. The cost is in the code: a project-scoped Collection whose first 20 lines all do not set the field escapes the probe.

## 4. Error Policy: The Project Document Goes Last

A handler that throws an exception **does not stop the run** — the remaining Entities are processed, the error is noted in its report line. But the Project document is only removed if **every** handler has succeeded.

This is the critical invariant. The document is the index back to the Project's data; if it falls while data remains, that data is no longer addressable. Therefore, the Project document is not a handler but a matter for the service: the condition "all others were successful" cannot be expressed as `order()`.

From this follows the **idempotence requirement** for every handler: the rerun is the repair path. An aborted delete is completed by the same command.

For rename, the order is justified in reverse but motivated similarly: the handlers update their references, **then** the document — as long as it carries the old name, a half-finished rename is at least addressable under that name.

## 5. Two Gates

**Drain first.** A Project currently held by a Pod is being processed: Engines are running, Workspace is mounted on its disk, Sessions are open. Deleting it under this Pod does not fail loudly but produces a process that operates on data that no longer exists. Therefore, `delete` and `rename` **first release the Project from its Pod** — the same mechanism as `project drain`: Engines stop, Workspace snapshot, drop lease (§5a).

**Live Lease.** After a successful drain, no one holds the lease anymore, so the gate in the maintenance service opens automatically. It remains nonetheless — as a second barrier for cases where the drain was skipped (`--no-drain`) or someone else just accessed it; `--force` is the operator saying: the holder is demonstrably gone. The question is answered by `ProjectOwnership` (`vance-shared/.../project/`) — `homePodId` is not read directly anywhere. The lease TTL comes from the same property that binds the Brain (`vance.cluster.lease.ttl`, default 5 min), so a tuned cluster and the Shell give the same answer.

**Typed Confirmation.** Before Delete **and** Rename. The **Project name** is requested, not `yes` — the purpose is to make the hand pause at the *correct* Project, and a yes/no question does not achieve that. Headless (`--sudo`) means there's no one to ask, so the same string must arrive as `--confirm <name>`; refusing instead of accepting prevents a scripted delete from being one typo away from the wrong Project.

**Name Grammar for Rename.** The new name must be suitable as a path segment (`[A-Za-z0-9][A-Za-z0-9._-]*`, no `..`), because the Workspace folder is `<root>/<tenant>/<project>` — a `../` within it would move the working directory out of its root. This is checked **only during rename**, not during `create`: there, the exposure is principally the same, but enforcing the rule retroactively would reject names that installations already carry. Breaking existing Projects to close a hole no one has gone through is the worse trade-off; catching up `create` belongs to a migration that can examine what exists externally.

**Not Overridable** is the SYSTEM protection: `_vance` and the Per-User-Hubs are addressed by their name from code and settings. This is an Entity invariant and therefore resides in `ProjectService`, not in the maintenance service — even `--force` cannot bypass it.

## 5a. Drain and Re-placement

Both operations run in three stages:

1. **Drain** — Query home Pod (`/internal/cluster/projects/home`), then `/internal/cluster/release` **on that Pod**. The release must reach the holding Pod because it dismantles in-memory state that only exists there.
2. The maintenance operation itself.
3. For **Rename**: `project claim` under the **new** name — but only if a Pod was actually holding it before. A Project that no one held has no state to restore, and placing it here would start something the rename did not request.

The drain brings two things beyond order:

- **The Lease gate opens automatically** (§5). `--force` thus becomes what it should be: the exception for an unreachable holder, not the normal case.
- **The Workspace is snapshotted by the Pod that has it.** This is the only way a rename can take a working directory located on a foreign disk: the snapshot lines travel with the Project (`projectId` + descriptor are rewritten), and the next placement restores the folder under the new name. Without drain, the folder remains on the foreign machine — see the limitation in §6.

**A failed drain aborts**, unless with `--force`. Not knowing if a Pod is still working on the Project is precisely the situation where proceeding is unsafe. A 409 ("this Pod no longer holds it") is considered *failed*, not "no one holds it": the lease may have moved between query and release, and then another Pod is working on it. The hint is accordingly "try again".

**`--no-drain`** disables the entire step — for rename, this also means re-placement. For cases where the cluster is unreachable and cleanup is still necessary; the consequences are in the option description.

If the rename fails *after* the drain, the output states that the Project still carries the old name and is unplaced, along with a ready `project claim` call. An operator without this hint would be the worst part of this failure.

## 6. What the Rename takes — and what it doesn't

**Structured means: fields.** `projectId` columns, the Settings Scope (`referenceType`/`referenceId`), Tool-Health and Permission-Scope IDs, `documentRef.projectId` in Inbox threads, the `activeProjects` list of Pod rows, the Workspace directory including descriptors, the `_id` markers of the One-Shot Scheduler.

**Free text is not taken.** A `vance:` URI in a Markdown body, a Project name in a Recipe, a path in a Prompt. A pattern over foreign text hits code blocks and quotes just as reliably as real links; this is not a rename, but a search-and-replace gamble on user content. The command explicitly states this afterwards and names the old name so it can be searched for.

Two further honest limitations:

- **Absolute paths *within* moved files.** A Python virtualenv carries its own location in its scripts; after moving, it is broken, `rebuildPythonVenv` is the repair.
- **The Workspace is local — unless drained.** A Workspace lives on the disk of the Pod that ran the Project; the handler layer alone cannot touch it from another machine and **reports that it did not see a folder** (a report that would have been silent would read as "there was nothing", and that is a different statement). This is precisely why the commands take the detour via the drain: the holding Pod itself puts the folder as a snapshot into Mongo, and then it is transportable (§5a). What remains is the case of `--no-drain` or an unreachable Pod with `--force`.

## 7. Intentional Remnants

Two handlers respond to "delete" with *I deliberately leave this behind*, and the report states it (`deleteNote`), because a `0` would otherwise be indistinguishable from "there was nothing":

- **Inbox Threads.** A thread is not Project data: it belongs to the people in it and outlives what it was about. Its `documentRef` carries the document's title and path — after the Project is deleted, this is the only proof of what it was about. It points to nothing, and a pointer to something deleted is the truth. **For rename, the opposite applies**: the old name could later be recreated by someone else, then the link resolves — to the wrong document.
- **Lifecycle lines in the Activity Feed.** `project.lifecycle` events are written to the tenant with `projectId = null`, precisely so the Feed handler does not take them along: the proof that a Project was deleted must survive the deletion.

## 7a. Trillian: The Project also deletes a user

Trillian is the only Engine that creates a **real User**: the User loop runs headless under its own `_`-prefixed service account with its own grant on the Project. This account is **not** Project data — it resides in `users`, which is tenant-scoped, not project-scoped. Without its own handler, nothing in the entire run would touch it: for each Trillian, a user **corpse** would remain, and invisibly so, because service accounts are filtered from the normal user list.

The handler does the same thing that the Session lifecycle already does when closing or deleting a Trillian Control Session (`TrillianSessionLifecycleHook`) — a Project delete is just another way a Trillian ends, and requires the same end: revoke grants, then delete account.

**Why Sort Index 50.** Below everything else, and this is critical rather than merely orderly: **the account name exists only on the process lines.** It is in the `engineParams` of the Control Process under `trillianUserName`; there is no reference from the User back to the Project. If the Think Process handler runs first, the name is gone, the account unreachable — and again, nothing reports an error.

**All generations, not the latest.** *All* Control Processes of the Project are read, including closed ones from earlier archive/reactivate cycles, and every found account name is released. Normally, an account is reused across a reactivate, so the set is small — but a previously failed release appears here as an additional name, and "the current generation" would bypass precisely that.

**What it does not do.** The Nature attributes and the Journal (`_vance/trillian/...`) are *not* discarded here, although the Session path does: these are ordinary documents of this Project, the `documents`-handler clears them away a few steps later. Reaching into Nature would mean reaching from a process without a Brain for a Brain component — for no effect.

**Rename does nothing**, and that is an answer, not a gap: the account name does not carry a Project name, its grant is updated by the `permission-grants`-handler, and the attribute document travels with the Project like any other.

For anus to be able to do this, the two persisted markers (`trillian-control` as Engine name, `trillianUserName` as param key) are in `vance-shared` (`TrillianProcessKeys`); `TrillianSessionBootstrapper` delegates its constants there, so there is one authority and not two. Everything else about Trillian remains in the Brain.

## 8. A Deliberate Trade-off: Billing

`llm_usage_records`, `llm_usage_daily`, and `image_call_records` are billing. Deleting them lowers what the tenant's spend history shows for months long past.

They are deleted anyway — because the alternative is worse in the direction that matters: a Project quota is tied to the Project name, so leftover lines are inherited by the next Project of that name and count against a budget it never consumed. Missing history is visible; a quota silently consumed by a predecessor is not.

## 9. Two Document Classes Moved to `vance-shared`

The Admin Shell has `vance-shared` and **no** Brain (`vance-anus/pom.xml`: "Speaks directly to MongoDB through vance-shared services. Never starts the AI stack."). Two project-touching documents were in `vance-brain` and thus invisible to it:

| Class | from | to | why it must be |
|---|---|---|---|
| `ImageCallRecord` | `brain.fenchurch` | `shared.fenchurch` | `projectId`, quota basis |
| `OneShotFireDocument` | `brain.ursascheduler` | `shared.ursascheduler` | Project is in the `_id`, no TTL |

Only the **documents** have moved; `ImageCallTracker`, `UrsaOneShotFireService`, and all the rest remain in the Brain. The cut follows the one already made for `OAuthStateDocument` and the web caches: persistence in shared, service where it belongs. The `_id` grammar of the One-Shot marker has moved to the document — it is a property of the line, and the maintenance handler must be able to find a Project's markers without having the Brain scheduler on the classpath.

`ursa_fire_claims` has **not** moved and has no handler: the marker has a TTL of one hour, it cleans itself up. `vance_activity` and `notification_deliveries` are user-scoped (Eddie Sessions live in the `_user_*`-Hub, a SYSTEM Project that is never deleted) and thus not Project data.

## 10. Commands

```
project inspect -T <tenant> -n <name>
project delete  -T <tenant> -n <name> [--confirm <name>] [--force] [--no-drain]
project rename  -T <tenant> -n <name> --to <neu> [--confirm <name>] [--force] [--no-drain]
```

`project inspect` writes nothing and is the dry run for both. The report is the same table for all three operations — `ENTITY | ROWS | COLLECTIONS | NOTE`, total sum, then optionally the `WARNING` section with unclaimed Collections.

There is **no LLM tool** and **no REST endpoint** for this. This is an operator task at the Shell: the typed confirmation is half the security, and an agent that can fulfill it is no security. Those who need it in the cluster use `anus --sudo "project delete …"`.

## 11. Handler Inventory

| Sort | Handler | Collections |
|---|---|---|
| 50 | `trillian-accounts` | `users` (only Trillian service accounts, §7a) |
| 100 | `chat-messages` | `chat_messages` (via Sessions) |
| 200 | `engine-messages` | `engine_messages` (via Processes, both ends) |
| 300 | `marvin-nodes` | `marvin_nodes` (via Processes) |
| 400 | `settings-process-scope` | `settings` (`referenceType=think-process`) |
| 500 | `documents` | `documents` + Blobs |
| 600 | `document-archives` | `document_archives` + Blobs |
| 700 | `jaglan-folder-state` | `jaglan_folder_state` |
| 800 | `sessions` | `sessions` |
| 900 | `session-groups` | `session_groups` |
| 1000 | `think-processes` | `think_processes` |
| 1100 | `memories` | `memories` |
| 1200 | `rag-index` | `rags`, `rag_chunks` |
| 1300 | `magrathea-runs` | `magrathea_tasks`, `magrathea_journal`, `magrathea_timers` |
| 1400 | `activity-feed` | `megadodo_events` |
| 1500 | `llm-traces` | `llm_traces` |
| 1600 | `llm-usage` | `llm_usage_records`, `llm_usage_daily` |
| 1700 | `tool-usage-stats` | `tool_usage_stats` |
| 1800 | `prak-runs` | `prak_runs` |
| 1900 | `image-calls` | `image_call_records` |
| 2000 | `ursa-oneshot-markers` | `ursa_oneshot_fires` (`_id`-Prefix, both forms) |
| 2100 | `settings` | `settings` (`referenceType=project`) |
| 2200 | `tool-health` | `tool_health` (`scope=PROJECT`) |
| 2300 | `workspace` | `workspace_snapshots` + folder on disk |
| 2400 | `permission-grants` | `permission_grants`, `permission_requests` (Addon) |
| 2500 | `inbox-thread-refs` | `maximegalon_threads` (only `documentRef`) |
| 2600 | `cluster-pod-rows` | `brain_pods` (`activeProjects`) |

**Two pitfalls in this table, both encountered and fixed in operation on 2026-08-27** — recorded here because a future handler would take the same paths:

- **`ursa-oneshot-markers`: the `_id`-Prefix must not be a Regex.** The marker ID separates its parts with `\0`, and a BSON regex is transmitted as a cstring — which cannot carry a NUL. The pattern builds cleanly in Java and only dies during serialization; `count`, `delete`, and `rename` thus threw for **every** Project. A `>= prefix < prefix⁺`-range says the same thing, uses the same index, and carries the NUL as ordinary string content.
- **`cluster-pod-rows`: `activeProjects` during rename requires two updates.** Mongo rejects an update that touches a path twice (`$pull` + `$addToSet` on the same list). Add before pull, so the window in between carries the name twice instead of not at all — a heartbeat falling into the other window publishes a Pod that looks empty.

Both were covered by tests that mocked `MongoTemplate` and therefore never encoded anything. A handler test that does not at least once truly convert the query to BSON only tests its own stubbing.

`trillian-accounts` is below the 100-block because it must run before *everything* (§7a). The four after it are **cascades** — they are found via Sessions or Think Processes and must therefore precede them (§2.2). Everything above is freely sorted; the values are placeholders with gaps, not a statement about importance.

`permission-grants` comes from `vance-addon-shared-simpleauth` and not from the core — which authorization provider a deployment runs is a choice, and only the provider knows where its grants are located. An EE Governor brings its own, or none, because its grants live outside Vance. Both directions are security-relevant here: a leftover grant is inherited by the next Project of that name, an un-updated one locks out everyone except the Tenant Admin.

## 12. What does not belong

- **No `project copy`.** Copying is not the inverse of deleting and requires decisions that deleting does not know (Sessions included? Usage history included? Grants included?).
- **No Undo function.** Blobs are soft-deleted (soft-delete window), Mongo lines are not. The way back is a backup.
- **No Cross-Tenant-Move.** The tenant is in every predicate; changing it is a different operation.
