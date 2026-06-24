---
# Vance — Workspace Management

> Defines the Workspace of a Project: a container for temporary working files (Git checkouts, temp files, later persistent data) that are *not* persisted as Project Documents. Describes the on-disk layout, descriptor format, handler types, and service API. Suspend/Recover enables Pod migration and quota reclaim.
>
> Results of an Engine/Worker activity do **not** belong in the Workspace; instead, they are imported as Documents into the Project. The Workspace is ephemeral by design.

---

## 1. Purpose

Workers (Engines, Tools, Skills) need disk space for:
- checked-out Git repos
- intermediate results, build artifacts, tool outputs
- temporary files of any kind

This data does not live in MongoDB (too large / not JSON / tool-format-specific) and should not. It lives on the local Pod disk. This leads to two requirements that this spec addresses:

1. **Pod Migration:** If a Project moves to another Pod (lease takeover, manual move), the Workspace must move with it. Solution: Suspend → persistent Descriptor in MongoDB → Recover on the new Pod.
2. **Quota Reclaim:** If disk space becomes scarce, the Engine must be able to decide which Workspaces to offload (suspend). The same Suspend/Recover path solves this.

**What the Workspace is not:** not a Document store, not a persistence layer for results. If a file is relevant to the Project, the Worker imports it as a Document. Anti-pattern: "Worker writes PDF to Workspace and relies on it staying there."

---

## 2. Model

```
Project ──1:1──► Workspace ──1:N──► RootDir
```

| Term | Definition |
|---|---|
| **Workspace** | Container per Project. A folder on the Pod disk, with its own lifecycle. |
| **RootDir** | Granular unit within a Workspace. A folder with a sibling descriptor. A Worker creates its own RootDirs, not the Service in advance. |
| **WorkspaceContentHandler** | Plug-in per RootDir type (`temp`, `git`, later `persistent`). Implements Init/Suspend/Recover/Close. |
| **Descriptor** | JSON file next to the RootDir folder, describes type, creator, metadata. Sibling, not inside the folder — avoids collision with Worker content. |
| **Snapshot** | MongoDB Document that describes a suspended RootDir in a recoverable way. Written during Suspend, read during Recover. |

RootDirs are **the** unit for sharing, cleanup, and suspend. The Workspace itself is only a container and lifecycle bearer.

---

## 3. On-Disk-Layout

```
<workspaceRoot>/                              (configured per-Pod, e.g., /var/vance/workspaces/)
  <projectId>/                                (Workspace, 1:1 to Project)
    <dirName-A>/                              (RootDir folder)
    <dirName-A>.json                          (Sibling Descriptor)
    <dirName-B>/
    <dirName-B>.json
    workspace.json                            (Workspace metadata: tenant, projectId, createdAt, status)
```

`workspaceRoot` is configurable via Spring property (`vance.workspace.root`). Default: `${user.home}/.vance/workspaces/`.

`dirName` is unique within a Workspace. The Worker may suggest a hint (e.g., `repo-knowledge`); in case of collision, the Service appends `-2`, `-3`. If no hint → UUID. The `dirName` is the hard identifier; an optional `label` in the Descriptor stores the original hint for debug/audit.

**Sibling Descriptor instead of In-Folder:** the Descriptor is located **next to** the RootDir folder, not inside it. Advantages:
- Worker content never collides with Service metadata
- Orphan detection is trivial: folder without sibling JSON → cleanup; JSON without folder → recover/cleanup
- Descriptor readable without folder recursion

---

## 4. Descriptor Schema

One JSON file `<dirName>.json` per RootDir:

```json
{
  "tenant": "acme",
  "projectId": "proj-2025-research",
  "dirName": "repo-knowledge",
  "label": "knowledge",
  "type": "git",
  "creatorProcessId": "p-abc123",
  "creatorEngine": "marvin",
  "sessionId": "s-xyz789",
  "createdAt": "2026-05-01T14:23:11Z",
  "deleteOnCreatorClose": true,
  "metadata": {
    "repoUrl": "git@github.com:acme/knowledge.git",
    "branch": "main",
    "commit": "8f3c2a1"
  }
}
```

| Field | Required | Meaning |
|---|---|---|
| `tenant` | yes | Tenant ID (Audit, Cross-Pod-Migration-Sanity) |
| `projectId` | yes | Project ID (same info as folder path, redundant for standalone readability) |
| `dirName` | yes | Unique folder name in the Workspace |
| `label` | no | Worker-suggested hint, not unique |
| `type` | yes | Handler key: `temp`, `git`, `python`, later `persistent` |
| `creatorProcessId` | yes | Process that created the RootDir |
| `creatorEngine` | no | Engine name (`arthur`, `marvin`, ...) — Audit |
| `sessionId` | no | Owner Session, if process-oriented |
| `createdAt` | yes | ISO-Instant |
| `deleteOnCreatorClose` | yes | `true` → Cleanup on Worker close (see §8) |
| `metadata` | no | Handler-specific (Git: `repoUrl`, `branch`, `commit`; later others) |

The Descriptor is written upon creation and supplemented during Suspend (e.g., with the current commit after `git commit`). No mutation except by the Service.

---

## 5. RootDir Types and Handlers

```java
interface WorkspaceContentHandler {
  String type();
  void init(RootDir root, RootDirSpec spec);          // creates initial content
  void suspend(RootDir root);                          // updates descriptor for recover
  void recover(RootDir root, Descriptor descriptor);   // reconstructs content from descriptor
  void close(RootDir root);                            // final teardown
}
```

`init`/`recover` are the only paths where on-disk content is created. `suspend` must **not** delete the content — the Service does that afterwards. `suspend` updates the Descriptor with what is needed for Recover.

### 5.1 TempHandler (`type=temp`)

| Phase | Behavior |
|---|---|
| `init` | Creates an empty folder. |
| `suspend` | **No-op.** Temp content is not persisted — that's the point of Temp. |
| `recover` | Creates an empty folder. Content after Pod migration is lost, which is accepted. |
| `close` | Recursive delete of the folder. |

Consequence: a Pod restart or migration loses Temp content. If a Worker wants to save something from it, it must import it as a Document before Suspend. This asymmetry is intentional — it protects the architectural rule "results are Documents".

### 5.2 GitHandler (`type=git`)

| Phase | Behavior |
|---|---|
| `init` | `git clone <repoUrl> --branch <branch>`; sets `metadata.commit` to HEAD. |
| `suspend` | If Working Tree is dirty: `git checkout -B vance/suspend/<dirName>`, `git add -A`, `git commit -m "vance suspend"`, `git push origin vance/suspend/<dirName>`. Writes Suspend branch + Commit to `metadata`. |
| `recover` | `git clone <repoUrl>`, `git checkout <suspendBranch or branch>`. If Suspend branch exists: deleting `vance/suspend/<dirName>` after Recover is the Worker's responsibility (Engine decides whether to merge or discard changes). |
| `close` | Optional: Worker can set `commitOnClose: true`, then analogous to Suspend (push to Working branch). Otherwise: `clean` and delete. |

V1 Assumption: every Workspace Git checkout may create a `vance/suspend/<dirName>` branch in the remote. Operations convention: this namespace is reserved. Workers operating with repos without push rights must treat `suspend` as an error (comes with Project lifecycle validation).

### 5.3 PythonHandler (`type=python`)

Persistent Python working environment with local venv. Source files survive Suspend; the venv is deterministically reconstructed from `requirements.txt` during Recover.

**Descriptor Metadata:**

| Field | Meaning |
|---|---|
| `pythonPath` | Path to the interpreter with which the venv was last built (e.g., `/usr/bin/python3`, `/opt/homebrew/bin/python3.12`). **Purely informational** — not enforced during Recover. Default on `init` = the path to `python3` on the current Pod. |
| `repoUrl`, `branch`, `commit` | Like GitHandler — source files (`*.py`, `requirements.txt`, other config) are persisted via Git remote. |

There is **no** version pinning at the concept level. The Recover Pod uses its local `python3`. Whether this is ABI-compatible with the original `requirements.txt` is a deployment matter, not a code problem (see assumptions below).

**Lifecycle:**

| Phase | Behavior |
|---|---|
| `init` | Obtain sources: if `repoUrl` exists, clone like GitHandler; otherwise, empty folder + `git init` (Worker sets remote later if needed). Then: `<pythonPath> -m venv .venv` and write default `.gitignore` (`.venv/`, `__pycache__/`, `*.pyc`). **Default `labelHint` = `python`** — RootDirs end up as `dirName=python`, `python-2`, … and are filterable via `descriptor.label == "python"`. Worker can override (e.g., `analysis-env`). |
| `suspend` | Like GitHandler: `git commit -A` + push to `vance/suspend/<dirName>`. `.venv/` is excluded by `.gitignore`. Fails with `WorkspaceSuspendNotConfiguredException` if no remote is set — Worker must either configure remote or not suspend Project. |
| `recover` | Git clone like GitHandler; `python3 -m venv .venv` with the **local** interpreter of the Recover Pod; if `requirements.txt` exists in the checkout: `.venv/bin/pip install -r requirements.txt`. |
| `close` | Recursively delete folder + `.venv`. |

**Package Operations** are Brain Tools, not a Handler path:
- `python_pip_install(dirName, package)`: `.venv/bin/pip install <package>`, then `.venv/bin/pip freeze > requirements.txt`. Lockfile is in the RootDir and is regularly pushed with the next Suspend.
- `python_pip_uninstall(dirName, package)`: analogous, `pip uninstall` + `pip freeze`.
- `python_run(dirName, file, args?)`: Subprocess via `ExecManager` with `.venv/bin/python <file>`. CWD = RootDir, logs in `vance.exec.base-dir` (see §12.3) — not in the RootDir. For persisted multi-file projects.
- `execute_python(code, args?, flags?, waitMs?)`: One-shot execution — JavaScript analog (`execute_javascript`) for Python. Tool creates a default Python RootDir with `labelHint=_python` if needed (idempotent, reused between calls), writes a transient `_inline_<ts>.py` file, and executes it via the same `ExecManager` pipeline. LLM does **not** need to know about RootDir types, `python_create`, or `python_install` — `pip`-installed packages remain available between calls because of the same venv. Primarily for single-snippet calculations.

**Interpreter change at runtime:** Service method `rebuildVenv(projectId, dirName, pythonPath)` discards the `.venv/`, calls `<pythonPath> -m venv .venv` and `pip install -r requirements.txt` anew. Source files remain untouched. Brain Tool `python_set_interpreter(dirName, pythonPath)` calls this.

**Assumptions / Constraints:**
- Pod image has `python3` in PATH. Otherwise, `init`/`recover` fails with a clear error message.
- Pod images should maintain **consistent Python versions**. If Pods drift apart (e.g., 3.12 ↔ 3.10), `pip install -r requirements.txt` may fail during Recover due to Wheel ABI mismatches. The `pip` error appears cleanly in the Recover log — deployment discipline, no workaround in the Service.
- Suspend strictly requires a Git remote. Those who want to experiment "locally only" use `temp` or accept that the Project is not suspendable.

**What is NOT persisted:**
- `.venv/` — platform-specific binaries, reconstructable from `requirements.txt`
- `__pycache__/`, `*.pyc` — bytecode cache
- `pyvenv.cfg` — regenerated by `python -m venv`

### 5.4 Future Handlers

`persistent` (data that should survive between Sessions without Document form) is explicitly not V1. If a use case arises: a separate handler type, a separate Mongo-backed store or Object-store-backed.

---

## 6. Workspace Lifecycle

```
                ┌──── recover ────┐
                ▼                 │
INIT ──init──► RUNNING ──dispose──► DISPOSED
                │
                └──suspend──► (off-disk, Snapshots in Mongo) ──recover──► RUNNING
```

| Status | Meaning |
|---|---|
| `INIT` | Workspace Document exists in Mongo, folder not yet created. Short-lived. |
| `RUNNING` | Folder exists, Workers may create / read / write RootDirs. |
| `DISPOSED` | Folder deleted, Snapshots deleted, Workspace Document terminal. Project is terminated. |

`SUSPENDED` is **not a Workspace status**. Suspend means: all RootDirs are as Snapshots in Mongo, the folder is gone. The Workspace itself no longer exists — a Recover calls `init` anew and pulls the Snapshots back in. This asymmetry saves a status; the Project carries the Suspend state (see Project Lifecycle, separate spec).

**Write lock via `dispose()`:** As soon as the Service calls `dispose()` for a RootDir or the Workspace, it rejects further write calls for that path with `WorkspaceDisposedException`. Atomic via Mongo status update with pre-condition.

---

## 7. Service API

`WorkspaceService` lives in `vance-shared` (no AI stack needed). The consuming Brain Tools remain in `vance-brain` and access via the Service API.

### 7.1 Workspace Lifecycle

```java
Workspace init(String projectId);                  // overload, empty Tenant
Workspace init(String tenantId, String projectId); // INIT → RUNNING; auto-recovers
                                                   //   if Snapshots exist
void recoverAll(String projectId);                 // alias to init for explicit
                                                   //   ProjectService path
void suspendAll(String projectId);                 // calls Handler.suspend, persists
                                                   //   Snapshots, deletes folder
void dispose(String projectId);                    // DISPOSED, everything + Snapshots gone
Optional<Workspace> get(String projectId);
```

`init` is the central entry point. If Snapshots exist in the `workspace_snapshots` Mongo collection at the time of the call, `init` automatically recovers them (deletes partial folder state if necessary, writes Descriptors, calls Handler.recover, deletes Snapshots upon success). This makes Pod migration and crash recovery the same code path — the caller does not have to distinguish between "fresh init" and "recover".

`recoverAll` exists as a spec-compliant alias for ProjectService callers who want to follow the explicit lifecycle step in §11.2.

### 7.2 RootDir Operations

```java
RootDirHandle createRootDir(CreateSpec spec);
  // spec: type, creatorProcessId, creatorEngine, sessionId,
  //       deleteOnCreatorClose, labelHint, handlerMetadata
  // Service resolves dirName (hint collision handling), writes Descriptor,
  // calls Handler.init, returns Handle.

void disposeRootDir(String projectId, String dirName);
  // Handler.close, delete folder + Descriptor.

void disposeByCreator(String projectId, String creatorProcessId);
  // Iterates over all RootDirs of the Project with creatorProcessId match
  // AND deleteOnCreatorClose=true; calls disposeRootDir.

List<RootDirHandle> listRootDirs(String projectId);
RootDirHandle getRootDir(String projectId, String dirName);
```

### 7.3 Temp Convenience

Special methods for the most common case — Worker wants a short-lived file without worrying about RootDir creation:

```java
Path createTempFile(String projectId, String creatorProcessId, String prefix, String suffix);
Path createTempDirectory(String projectId, String creatorProcessId, String prefix);
```

Implementation: lazily creates a RootDir of type `temp` per `(projectId, creatorProcessId)`, with `deleteOnCreatorClose=true`. The first call creates it, subsequent calls reuse it. The Service caches the mapping in-memory; after Pod restart, Workers are gone anyway, the cleanup trigger §8 cleans up based on `deleteOnCreatorClose` + non-existent process.

This means the Worker does not have to call `createRootDir`, manage a handle, or perform cleanup for standard cases — methods return `Path`, the rest happens behind the API.

### 7.4 Default RootDir Resolution

Worker Tools usually don't need to know which RootDir they are writing to. The Service maintains a second map (in addition to the Temp cache from §7.3):

```java
void           setWorkingDir(String projectId, String creatorProcessId, String dirName);
Optional<String> getWorkingDir(String projectId, String creatorProcessId);
void           clearWorkingDir(String projectId, String creatorProcessId);
RootDirHandle  getOrCreateTempRootDir(String projectId, String creatorProcessId);
```

`setWorkingDir` registers a RootDir as "working RootDir" for a Process. `git_checkout` with `asWorkingDir=true` sets this automatically (see §12.4). When the Process is CLOSED, the mapping is cleared via the brain-side listener; automatically on `disposeRootDir`/`dispose`.

The resolution order **does not live in the Service**, but in the brain-side helper `WorkspaceDirResolver`, because it is based on `ToolInvocationContext` (which `vance-shared` does not know). Order:

1. Caller explicitly passed `dirName` → use this.
2. `workspace.getWorkingDir(projectId, creator)` is set → use this.
3. Otherwise: `workspace.getOrCreateTempRootDir(projectId, creator)` — lazy Temp RootDir with `deleteOnCreatorClose=true`.

`creator` is `ctx.processId()`, fallback `ctx.sessionId()`. If both are missing, the Tool throws an error — default resolution requires a process-related identity, otherwise cleanup cannot be assigned.

Skill bindings (`vance.workspace.read/write/...`, [skills.md §10](skills.md)) should use the same logic — either by direct call to `WorkspaceDirResolver` or by an analogous helper layer in the Skill runtime.

### 7.5 RootDirHandle

```java
class RootDirHandle {
  String dirName();
  String type();
  Path path();                     // absolute Path to the folder
  Descriptor descriptor();
  String creatorProcessId();
  // Sharing: Handle can be passed to other Workers.
  // dispose() is only called by the Creator (or ProjectService).
}
```

Handles are **not** refcounted. If Worker A creates a RootDir with `deleteOnCreatorClose=true` and passes it to Worker B, and Worker A ends, the RootDir is gone — even if B still has the Handle. Consumers must know that they cannot rely on shared RootDirs whose Creator they are not. A later V2 can add refcounting if a use case demands it.

---

## 8. Cleanup Triggers

Four sources for cleanup, all using the same Service code.

| Trigger | Effect |
|---|---|
| Worker closes (Process → CLOSED) | `disposeByCreator(projectId, creatorProcessId)` — all RootDirs with `deleteOnCreatorClose=true` are removed. RootDirs without this flag remain (belong to the Project, not the Worker). |
| Project Suspend | `suspendAll(projectId)` — Handler.suspend per RootDir, Snapshots in Mongo, folder gone. |
| Project Close | `dispose(projectId)` — everything terminal. |
| Quota / Disk Pressure | see §9 |

Worker-Close-Trigger lives in ProcessLifecycle: on status change to `CLOSED` (not `SUSPENDED`!), a listener calls `disposeByCreator`. Pause/Suspend leave RootDirs untouched — the Worker can continue on resume.

---

## 9. Quota / Disk Pressure

V1: monitoring only, no auto-eviction.

- Service checks available disk space on `workspaceRoot` during `createRootDir` and `createTempFile/Directory`.
- Soft limit (default 80% occupied) → `log.warn` with `projectId`, `dirName`, free space.
- Hard limit (default 95% occupied) → `WorkspaceQuotaExceededException`, operation fails. Worker must perform its own cleanup or ask the user the Inbox item question.
- Thresholds via setting `vance.workspace.soft-limit-percent` / `hard-limit-percent`.

V2 (separate Spec): Quota Sweeper that suspends LRU projects until below soft limit. Triggers Project Suspend (not Workspace Suspend directly — Project Lifecycle must first shut down Engines). Comes with Project Lifecycle Spec.

---

## 10. Suspend Snapshot in MongoDB

`WorkspaceSnapshotDocument` (Collection `workspace_snapshots`):

| Field | Meaning |
|---|---|
| `id` | Mongo-ObjectId |
| `tenant` | Tenant ID |
| `projectId` | Index: all Snapshots of a Project |
| `dirName` | Folder name for Recover |
| `descriptor` | Embedded Descriptor (see §4) — complete snapshot |
| `suspendedAt` | Instant |

Recover Flow:
1. ProjectService calls `WorkspaceService.init(projectId)` on the new Pod.
2. Service creates Workspace folder, status RUNNING.
3. Service calls `recoverAll(projectId)` → loads all Snapshots.
4. Per Snapshot: create folder, write Descriptor, call Handler.recover.
5. Snapshot Documents are deleted (or marked as `consumed` — V2 for Audit).

Crash during Recover: Snapshot remains in Mongo, Pod has half a folder. On retry: Service detects incomplete folder (Descriptor exists, but Handler has not yet acknowledged `recover`), deletes it and retries. Idempotent.

**Data Sovereignty:** Snapshots belong to the WorkspaceService — no other Service reads or writes the collection. ProjectService only calls `suspendAll` / `recoverAll` as API calls.

---

## 11. Project Lifecycle Integration

The Workspace Lifecycle is controlled by the Project Lifecycle. The following process is binding; the Project Lifecycle Spec references it (instead of describing its own Workspace mechanics).

### 11.1 Project Status Map to Workspace Operations

| Project Status | Workspace Action | Engines |
|---|---|---|
| `INIT` | — (Workspace does not exist yet) | not started |
| `RECOVERING` | `WorkspaceService.init(projectId)` + `recoverAll(projectId)` | not started |
| `RUNNING` | normal RootDir operations allowed | started |
| `SUSPENDING` | `suspendAll(projectId)` (see §11.2) | stopped beforehand |
| `SUSPENDED` | Workspace folder does not exist; Snapshots in Mongo | stopped |
| `CLOSING` | `dispose(projectId)` | stopped beforehand |
| `CLOSED` | terminal — no Snapshots, no folder | terminal |

### 11.2 Recover Flow

ProjectService on new Pod:
1. Project status `RECOVERING`.
2. `WorkspaceService.init(projectId)` — creates Workspace folder, status `RUNNING`.
3. `WorkspaceService.recoverAll(projectId)` — per Snapshot: create folder + Descriptor, Handler.recover (e.g., GitHandler clone + checkout). Idempotent on crash (see §10).
4. Start Engines (status `RUNNING` of the Engines).
5. Project status `RUNNING`.

### 11.3 Suspend Flow

ProjectService on old Pod (e.g., triggered by idle sweep / Pod shutdown / quota eviction / manual):
1. Project status `SUSPENDING`.
2. Stop Engines (controlled, with timeout — falls under Engine Suspend Cascade, see [session-lifecycle.md §9](session-lifecycle.md)).
3. `WorkspaceService.suspendAll(projectId)`:
   - Set Workspace status to `SUSPENDING` (blocks further writes).
   - Per RootDir: Handler.suspend → Descriptor is supplemented (e.g., GitHandler pushes Suspend branch).
   - Write Snapshot Document per RootDir to Mongo.
   - Delete folder + Sibling Descriptor.
   - Delete Workspace folder.
4. Project status `SUSPENDED`.

Order is strict: **first stop Engines, then Workspace Suspend**. Otherwise, running Engines would write to a disappearing Workspace → undefined behavior.

### 11.4 Crash during Suspend

If Pod dies between step 3.2 and 3.4 of §11.3:
- Snapshots exist in Mongo (or not, if not yet written).
- Workspace folder still exists (or partially deleted).

Recovery on the next Pod that takes over the Project:
- If Snapshots exist + folder exists → delete folder, continue with Snapshots as source of truth.
- If no Snapshots + folder exists → Project was still in RUNNING state before crash, not in Suspend. Repeat Suspend attempt in Project Lifecycle (or recover Project regularly, depending on lease status).

ProjectService decides this based on the persisted Project status; WorkspaceService only provides `suspendAll`/`recoverAll` as atomic operations.

### 11.5 Relationship to Engine Suspend

Engine Suspend (status `SUSPENDED` on a Process, [session-lifecycle.md §3](session-lifecycle.md)) is **not** the same as Workspace Suspend:

- Engine Suspend pauses the Engine turn, persists Engine state in Mongo (Lane pause, Pending queue remains).
- Workspace Suspend cleans up the disk.

In the Project's Suspend Cascade, both run sequentially: first all Engines to `SUSPENDED` (Engine state in Mongo), then Workspace Suspend (disk empty). On Recover, vice versa: Workspace Recover (disk back), then Engine Resume (Lane pause lifted).

---

## 12. Migration of Existing Workspace Tools

The current implementation does not know a RootDir model. The migration to the new spec happens in two steps:

### 12.1 Current State

| Component | File | Current Behavior |
|---|---|---|
| `WorkspaceService` | `vance-brain/.../tools/workspace/WorkspaceService.java` | API: `projectRoot/read/write/list/delete` via `(projectId, relativePath)`, Sandbox via `startsWith(root)` |
| `WorkspaceProperties` | dito | `vance.workspace.baseDir` (default `data/workspaces`), `defaultReadCharCap` |
| `WorkspaceReadTool` | dito | Brain Tool `workspace_read` |
| `WorkspaceWriteTool` | dito | Brain Tool `workspace_write` |
| `WorkspaceListTool` | dito | Brain Tool `workspace_list` |
| `WorkspaceDeleteTool` | dito | Brain Tool `workspace_delete` |
| `WorkspaceExecuteJavaScriptTool` | dito | Brain Tool `execute_workspace_javascript` |
| `ExecManager` | `vance-brain/.../exec/ExecManager.java` | Uses `projectRoot()` as CWD for shell commands |
| `RagAddWorkspaceFileTool` | `vance-brain/.../rag/...` | Reads files via `WorkspaceService.read()` |
| `KitRepoLoader` | `vance-brain/.../kit/...` | JGit clone, **not** workspace-integrated |

### 12.2 Migration Step 1: Service Conversion

- Move `WorkspaceService` to `vance-shared`.
- Elevate internal implementation to the new model: each `(projectId, relativePath)` path is resolved against the default RootDir of the calling Process (see §7.4). The current API (`read/write/list/delete` with `relativePath`) remains visible to Skills and Tools.
- Path Sandbox remains — now applies per RootDir, not per Workspace.
- `WorkspaceProperties.baseDir` becomes `vance.workspace.root` (see §3). `defaultReadCharCap` remains.

### 12.3 Migration Step 2: Tool Extension

Existing Tools get an optional `dirName` parameter:

| Tool | Current | New |
|---|---|---|
| `workspace_read` | `(path)` | `(path, dirName?)` |
| `workspace_write` | `(path, content)` | `(path, content, dirName?)` |
| `workspace_list` | `()` | `(dirName?)` |
| `workspace_delete` | `(path)` | `(path, dirName?)` |
| `execute_workspace_javascript` | `(path)` | `(path, dirName?)` |

`dirName` omitted → default resolution via §7.4. This keeps most LLM tool calls unchanged; Workers who need to explicitly switch between RootDirs (e.g., Marvin with two Git checkouts) use the parameter.

`ExecManager`: Current spec = CWD was `projectRoot`. New spec = CWD is a RootDir chosen by `dirName` (parameter in `work_exec_run` tool, default resolution as in §7.4). Log files (`{jobId}/stdout.log`) remain in ExecManager's own `vance.exec.base-dir` (separate property, not under the Workspace) — RootDir content thus remains free of Service artifacts.

`RagAddWorkspaceFileTool`: also gets an optional `dirName`.

### 12.4 New Tool: `git_checkout`

First example of a typed-handler tool. API:

```
Tool: git_checkout
Parameters:
  repoUrl: string                 # required
  branch: string                  # optional, default = repo default branch
  label: string                   # optional, dirName-Hint
  asWorkingDir: boolean           # optional, default false
  credentialAlias: string         # optional, picks credential from credential store
Returns:
  dirName: string                 # unique
  path: string                    # absolute path to the checkout
```

The tool internally calls `WorkspaceService.createRootDir(type=git, …)` with GitHandler metadata. `asWorkingDir=true` sets the newly created RootDir as `workingDir()` in the EngineContext for subsequent tool calls — the LLM can then `workspace_read/write` without `dirName` and works in the repo.

`KitRepoLoader` remains for Kit imports (different use case, not workspace-bound — see [kits.md](kits.md)). The GitHandler also uses JGit; code sharing (helpers for auth, clone strategies) lives in `vance-shared`.

### 12.5 Skill Bindings

`vance.workspace.read/write/list/delete` ([skills.md §10](skills.md)) get an optional second argument for `dirName`, analogous to §12.3. Default resolution identical. This makes existing Skills binary compatible.

---

## 13. What This Spec Does Not Regulate

- **Project Status Machine** (`init`, `recover`, `running`, `suspending`, `suspended`, `closing`, `closed`) including triggers (Pod shutdown, quota eviction, manual admin), Pod lease, and crash recovery — separate Project Lifecycle Spec. This Spec only defines the Workspace portion (§11).
- **Quota Eviction Strategy** (LRU, size, TTL) — Project Lifecycle / Operations Spec.
- **Refcounting for shared RootDirs** — V2, for now owner-only dispose.
- **Patch-based Git Suspend** instead of Suspend branch — V2.
- **Document Storage for files that should end up in the Project** — existing DocumentService, separate from the Workspace.
- **Concrete Tool Schemas** (LLM-facing JSON schema of `workspace_*` and `git_checkout`) — live on the respective `@Component Tool`, here only parameter form sketched.

---

## 14. Relation to Other Specs

- [session-lifecycle.md](session-lifecycle.md) — Session/Engine Lifecycle. Worker-Close-Trigger (§8) depends on Engine status `CLOSED`. Engine Suspend is *not* Workspace Suspend (§11.5).
- [architektur-scopes-clients.md](architektur-scopes-clients.md) — Project Scope. Workspace is 1:1 to the Project.
- [skills.md §10](skills.md) — Skill Runtime exposes `vance.workspace.*`; backend is the Service defined here. `dirName` parameter analogous to §12.5.
- [kits.md](kits.md) — Kit import/export should be migrated to TempHandler in the medium term instead of its own Tmp logic. `KitRepoLoader` (JGit) remains parallel to the `git_checkout` tool — Kit imports are not workspace-bound.
- [project-lifecycle.md](project-lifecycle.md) — Project Lifecycle Service (`bring`/`suspend`/`close`) calls `init` / `suspendAll` / `dispose`. Process see §11.
