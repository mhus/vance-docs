---
title: "Vance — WorkTarget & Generic File/Exec Tool-Layer"
parent: Specs
permalink: /specs/work-target
---

<!-- AUTO-GENERATED from specification/public/en/work-target.md — do not edit here. -->

---
# Vance — WorkTarget & Generic File/Exec Tool-Layer

> A **WorkTarget** describes, per `ThinkProcess`, which backend the
> generic `file_*` and `exec_*` tools dispatch to: the user's local
> machine via a session-bound Foot CLI (**CLIENT**), a Brain server
> workspace root directory (**WORK**), or a named `profile=daemon` Foot
> within the same Project (**DAEMON**). The tools themselves are thin
> wrappers — they know neither filesystem paths nor sandbox logic; they
> call `ContextToolsApi.invoke(...)` on the backend tool selected by the
> Target.
>
> Effect for Engines: a unified tool manifest entry per operation
> (`file_read`, `exec_run`, …), regardless of where the worker lands.
> Frankie uses this productively; other Engines can adopt the layer
> on-demand.
>
> See also: [frankie-engine](/specs/frankie-engine) | [workspace-management](/specs/workspace-management) | [prompts-and-manuals](/specs/prompts-and-manuals)

---

## 1. Role and Classification

Vance currently has three parallel storage/exec surfaces:

| Surface | Where | Tool-Prefix | Lifetime |
|---|---|---|---|
| User-Local Files | Foot-Host | `client_file_*` / `client_exec_*` | persistent (User owns) |
| Workspace RootDir | Brain-Server | `work_file_*` / `work_exec_*` | ephemeral (per-Process Sandbox) |
| Persistent Documents | MongoDB | `doc_*` | persistent, indexed |

Engines (especially Frankie + `coding`-Recipe) want to use the first
two **seamlessly** — depending on whether a Foot-Client is connected
or not. Directly hardcoding a set breaks on profile switches and
overloads the LLM manifest with two quasi-identical operations per
file action.

**Solution**: a per-Process **WorkTarget** + 12 generic tool wrappers
(`file_*` × 8, `exec_*` × 4). Wrappers are LLM-visible, backends
deferred. On a wrapper call, the `WorkTargetDispatcher` decides which
backend is actually executed.

## 2. Data Model

```java
// vance-shared/.../worktarget/
record WorkTarget(WorkTargetKind kind, @Nullable String targetName)
enum WorkTargetKind { CLIENT, WORK, DAEMON }
```

`targetName` is a **kind-dependent qualifier** in a single field
(formerly two separate fields `dirName`/`daemonName`):

| Field | Meaning |
|---|---|
| `kind = CLIENT` | dispatch to `client_*` via the session-bound Foot. `targetName` is ignored — Foot operates against its own `--workdir`. |
| `kind = WORK` | dispatch to `work_*`. `targetName` selects a named RootDir of the Project; `null` → per-Process-Temp-RootDir (lazy via `WorkspaceService`, `deleteOnCreatorClose=true` — cleared on Process close). |
| `kind = DAEMON` | dispatch to `client_*`, but **not** via the Session — instead via the named `profile=daemon` Foot addressed by `targetName`. Routing via `DaemonRegistry` (`(tenantId, projectId, targetName)`). `targetName` is **mandatory** (record constructor throws otherwise). Offline Daemon → `ToolException` with a clear message. |

**Daemon Routing Detail:** A `profile=daemon` Foot registers its
manifest under the exact `client_*` names (`client_file_read`,
`client_exec_run`, …) — the same backend names that the Dispatcher
knows for CLIENT. DAEMON thus sends the `client_*` name unchanged as
the wire tool name to the Daemon WS; only the WS resolution and the
pending registry (`DaemonRegistry`, correlation prefix `dt-`) differ
from the session-bound CLIENT path (`ct-`). Both paths share the
`DaemonToolInvoker` seam and the identical `CLIENT_TOOL_INVOKE`/
`CLIENT_TOOL_RESULT` protocol. Daemon registration + routing see
`planning/archive/foot-daemon-tools.md`.

**Legacy Compatibility:** Existing `engineParams` with the old
sub-key `dirName` are still read by `WorkTarget.fromMap(...)`
(fallback to `targetName`); only `targetName` is written.

**Pseudo-Projects (`_user_<login>`, `_tenant`, `_vance`):** no
special path. These Projects are `ProjectKind.SYSTEM` +
`LifecycleType.HOMELESS` and get the same RootDir path
(`~/.vancetopetope/workspaces/<tenant>/<projectId>/`). Since Recipes
typically do **not** set a `dirName` on them, all WORK calls
land in a Temp-RootDir that disappears on Process close — de facto
"Workspaces are temporary" without needing to explicitly model that
in the layer. See `specification/workspace-management.md`
§7.3-§8 for RootDir lifecycle.

**Persistence:** as a Map under
`ThinkProcessDocument.engineParams["workTarget"]`. Standard
Recipe param copy on Spawn inserts the default, `work_target_set`
writes at runtime. No separate Mongo collection — schema-free,
one entry per Process.

```yaml
# engineParams after Spawn
workTarget:
  kind: WORK            # CLIENT | WORK | DAEMON
  targetName: src       # WORK: RootDir name (optional) · DAEMON: Daemon name (mandatory) · CLIENT: ignored
```

## 3. Inheritance on Spawn

Sub-Workers inherit the `workTarget` of their Spawn-Parent
(Unix-cwd-style — snapshot on Spawn, then process-local). This
means all Workers of a Session **automatically** see the same backend
without Recipes or callers having to explicitly set it every time.

Inheritance pipeline on `process_create` (highest → lowest priority):

1. **Caller-Param**: `process_create(workTarget: {kind:WORK, dirName:"foo"})` — explicit override.
2. **Recipe-Default**: `params.workTarget` from the Recipe (e.g., `coding.yaml` Foot-Profile → CLIENT).
3. **Parent-Inheritance**: copy from the spawning Process if points 1-2 did not apply.
4. **Engine-Default-Resolution**: `WorkTargetService.defaultFor(process)` — see §4.

Implemented in `WorkTargetService.resolveSpawnParams(recipeParams, parentProcessId)`
and called by `SpawnActionExecutor` before each `ThinkProcessService.create` call.
Caller override and Recipe default land in `recipeParams`
(highest priority); if `workTarget` is missing there, the service looks at
the Parent and copies its entry into the fresh-engineParams.

**Important — Copy, not Live-Link:** the child Process receives a
**copy** of the Parent map. If the child later calls `work_target_set`,
this only changes its own `engineParams.workTarget` —
Parent and siblings remain unaffected. This allows for a safe
sandbox switch in a single Worker without sabotaging other
Workers.

## 4. Default Resolution

If, after §3, no explicit `workTarget` is present on `engineParams`,
`WorkTargetService.defaultFor(process)` resolves it:

```
if (ClientToolRegistry.entry(sessionId).isPresent())
    return WorkTarget(CLIENT, null);
else
    return WorkTarget(WORK, null);
```

Meaning: Foot-Connected → CLIENT (default Coding-UX), otherwise WORK with
process-temp-RootDir.

**Recipe-Defaults** override auto-resolution. Example
`coding.yaml`:

```yaml
params:
  workTarget:
    kind: WORK              # Default for web / API profiles
profiles:
  foot:
    params:
      workTarget:
        kind: CLIENT        # Foot-Profile switches to User-Local
```

## 4. Dispatch Logic

`WorkTargetDispatcher` is a Spring `@Service`. Per wrapper call:

1. Resolve Process, read `WorkTarget` (or default).
2. For `CLIENT`: Check Foot connectivity. If disconnected →
   `ToolException` with a clear message ("call `work_target_set` or
   reconnect"). Clean up params (Foot-Tools don't know `dirName`).
3. For `DAEMON`: Strip `dirName` from params (Foot-Client-Tools
   don't know it), build `DaemonKey` from `(process.tenantId,
   process.projectId, targetName)` and send the `client_*`-backend
   name via `DaemonToolInvoker.invoke(key, clientName, params,
   timeout)` to the Daemon WS. **Early-return** — no
   `ToolBus`/`ToolDispatcher` path. Offline/stale Daemon → the Invoker
   throws a clear `ToolException`. Timeout via
   `vance.worktarget.daemon-timeout-seconds` (Default 60s).
4. For `WORK`: if the caller has not set `dirName` itself
   and the Target has a `targetName` → inject it as a `dirName`-param
   (the WorkTarget field is generic, the tool param name remains `dirName`).
   Otherwise, pass it on (`WorkspaceDirResolver`
   will then fall back to Process-Temp).
5. Backend call (CLIENT / WORK):
   - With `ToolBus` (3-arg `Tool.invoke`): via `bus.invoke(backendName, params)` —
     respects Engine allow-set / primary-defer-filter.
   - Without Bus (2-arg `Tool.invoke`, e.g., Agrajag-Probes): via
     `ToolDispatcher.invoke(backendName, params, ctx)` directly —
     backend permission checks still apply.

## 5. Tools

### 5.1 Generic Wrappers (primary in Engines using `BaseEngineTools.WORK_TARGET`)

| Tool | Backend (CLIENT / WORK) |
|---|---|
| `file_read` | `client_file_read` / `work_file_read` |
| `file_write` | `client_file_write` / `work_file_write` |
| `file_edit` | `client_file_edit` / `work_file_edit` |
| `file_list` | `client_file_list` / `work_file_list` |
| `file_find` | `client_file_find` / `work_file_find` |
| `file_grep` | `client_file_grep` / `work_file_grep` |
| `file_head_tail` | `client_file_head_tail` / `work_file_head_tail` |
| `file_count` | `client_file_count` / `work_file_count` |
| `exec_run` | `client_exec_run` / `work_exec_run` |
| `exec_status` | `client_exec_status` / `work_exec_status` |
| `exec_tail` | `client_exec_tail` / `work_exec_tail` |
| `exec_kill` | `client_exec_kill` / `work_exec_kill` |

Spring bean names are `workTargetFileRead`, `workTargetExecRun`, … —
explicitly set to avoid class name collisions with Brain-side
`tools.exec.ExecRunTool` etc.

### 5.2 Meta-Tools (primary=false, accessible via `find_tools`)

| Tool | Purpose |
|---|---|
| `work_target_get` | Report current Target + available alternatives (Foot-Connected, RootDir names, names of online `profile=daemon` Foots in the Project). |
| `work_target_set` | Switch Target. `kind` ∈ {CLIENT, WORK, DAEMON}, optional `targetName` (WORK: RootDir; DAEMON: Daemon name, mandatory). Persistent on `engineParams.workTarget`. |

Not primary, because the Recipe usually sets the Target stably
and the LLM does not need to inspect or switch it. Accessible via
`find_tools('work_target')` for exceptional needs.

### 5.3 Backend Tools

Remain in the Engine allow-set (otherwise the Dispatcher cannot
call them), but:

- In Recipes, **remove** them from the LLM manifest via `allowedToolsDefer`
  so the LLM doesn't have to choose between three sets of the same operation.
  Example `coding.yaml` lists all 24 `client_*`/`work_*` names under `allowedToolsDefer`.
- Tool-level `primary=true/false` is orthogonal: Foot-Tools are
  `primary=true` for direct use in other Engines (Arthur, etc.),
  Recipe-Defer overrides this per-Recipe.

### 5.4 Exec-Output: Truncation and Paging

`exec_run` / `exec_status` stream the full `stdout`/`stderr` of a
job into two files on disk; the paths are provided as `stdoutPath` /
`stderrPath` in the tool result. Only a window with `inlineOutputCharCap`
(Default **8,000** chars, `vance.exec.inlineOutputCharCap`) is sent inline.

If either stream exceeds the cap, the renderer truncates it to
**HEAD_TAIL**: ~20% start + sentinel + ~80% end. Sentinel format:

```
<head><newline>…[truncated, N chars omitted]<newline><tail>
```

Rationale: Shell output is tail-heavy — exit status, stack traces,
compile errors are at the end. Pure HEAD would only show the LLM the
harmless startup lines and force a second tool call to `tail` it.

Additionally set in the render:

- `truncated: true` if at least one stream was truncated.
- `hint`: Instruction to the LLM to use further
  `exec_run` calls with bounded commands against `stdoutPath`/
  `stderrPath` for targeted paging (`head -N`, `tail -N`, `sed -n 'A,Bp'`,
  `grep -m N`).

Other tools in the WorkTarget layer (e.g., `file_read`, `file_grep`) have
**their own** paging parameters and do not use this truncation — it
conceptually belongs to `exec_*` because output there dynamically
occurs in unknown lengths.

## 6. Engine Integration

```java
public class FrankieEngine implements ThinkEngine {
    private static final Set<String> ENGINE_DEFAULT_TOOLS;
    static {
        Set<String> base = new LinkedHashSet<>();
        base.add("find_tools"); /* … */
        base.addAll(BaseEngineTools.WORK_TARGET);
        ENGINE_DEFAULT_TOOLS = unmodifiableSet(base);
    }

    @Override
    public Set<String> allowedTools() {
        return ENGINE_DEFAULT_TOOLS;
    }
}
```

`BaseEngineTools.WORK_TARGET` (in `tools.worktarget`) contains the 12
wrappers + 2 meta-tools + all 24 backend names. An Engine adopting the
layer includes this set in its `allowedTools()` and is done.
Recipes must remove the backends via `allowedToolsDefer` from the manifest
— otherwise the LLM sees duplicates.

## 7. What is NOT part of the WorkTarget Layer

- **Document-Operations (`doc_*`)** — another Storage-Surface with different
  semantics (persistent, indexed, ranked). Document-Tools are separate,
  no dispatch via WorkTarget.
- **Skill-Tools** — Skills have their own activation mechanism via
  `SkillResolver`. WorkTarget does not apply here.
- **Process-Control-Tools** (`process_stop` etc.) — global, no
  File/Exec-Surface.

## 8. Workspace-Confinement & Exec-Isolation (WORK-Backends)

The WORK-backends run Brain-side and **headless** — there is no
prompt for confirmation as with the Foot-Sandbox. The rule is strict:
**everything outside the Workspace folder (RootDir) is forbidden.**

**File-Tools (`work_file_*`) — Path-Confinement.** Every relative path is
centrally resolved by `WorkspaceRootService` (vance-shared) and checked for
containment; `WorkspaceService.resolve()` delegates there. Two
layers:

1. **Syntactic:** `base.resolve(path).normalize()` must still
   `startsWith(base)` — collapses `..`-traversal.
2. **Symlink:** the deepest existing ancestor of the target path is checked via
   `toRealPath()` and must remain within the real base. This
   closes the gap where a symlink *inside* the RootDir points outside
   (which `normalize()` alone misses). A dangling symlink is
   conservatively rejected.

Violation → `WorkspaceException` (REST/Tool error), no prompt.

**Exec (`work_exec_run`) — opt-in OS-Isolation.** The command runs with
`cwd = RootDir`, but a shell command can read arbitrary paths — not solvable
by path check. Optionally (default off), `ExecManager` wraps the
command in an isolation tool, analogous to Foot-Exec-Isolation:

```yaml
vance:
  exec:
    isolation:
      mode: custom            # none (default) | custom
      # {workdir} = RootDir-cwd of the job, {cmd} = command (one argv element)
      wrapper: "bwrap --bind {workdir} {workdir} --chdir {workdir}
                --unshare-net /bin/sh -c {cmd}"
```

`mode: custom` builds the argv from the template (no `sh -c` on the template,
no shell re-interpolation); active only with a valid `{cmd}` placeholder.
See also [foot-sandbox](/specs/foot-sandbox) §11 (same mechanism pattern
client-side).

**Kill/Deadline — graceful Process-*tree* (Brain *and* Foot).** A job runs
as `/bin/sh -c "<command>"`; `destroyForcibly()` on this shell alone would leave
children (compiler, trainer, …) orphaned. Both Exec implementations
— Brain `ExecManager.terminateTree(...)` and Foot
`ClientExecutorService.terminateTree(...)` (each used by `kill`, Cleanup
and Deadline-Watchdog) — therefore snapshot the process **+ all descendants**,
first send **SIGTERM** (clean shutdown / checkpoint), then after the
grace period (`vance.exec.killGraceMs`, Default 10s; Foot constant) **SIGKILL** to
survivors — non-blocking via the watchdog scheduler. The watchdog kill
applies upon expiration of the optional `deadlineSeconds`; without a deadline, the job
runs until its natural end (intended for long-running jobs). Important for CLIENT/DAEMON-
Compose, where `exec` runs on the Foot/Daemon.

**Configuration & Deployment.** The block lives in `application.yml`
(`vance.exec.isolation`), `mode` can be overridden by `VANCE_EXEC_ISOLATION_MODE` env-
variable, default `none` (even in the cloud, so dev/net-dependent
commands don't break). The **Brain-Docker-Image includes `bubblewrap`**,
so the provided default wrapper works immediately there, as soon as
an operator sets `mode: custom` — prerequisite is a container runtime
that allows unprivileged user namespaces. The default wrapper binds only
`/usr` `/bin` `/lib` (+ `/lib64`/`/etc/ssl` if present) read-only plus
the job RootDir read-write and disables the network; operators tune it
for their workloads.

## 9. References

- `vance-shared/.../workspace/WorkspaceRootService` — central containment gate (symlink-aware)
- `vance-shared/.../worktarget/` — Record + Enum
- `vance-brain/.../tools/worktarget/` — Service, Dispatcher, 14 Tools, BaseEngineTools
- `vance-brain/.../daemon/DaemonToolInvoker` — common Daemon-Invoke-Seam (used by `WorkTargetDispatcher` DAEMON path + `FootDaemonToolFactory`)
- `vance-brain/.../daemon/DaemonRegistry` — project-scoped Registry of `profile=daemon` Foots (Lookup, Pending-Lifecycle `dt-`)
- `vance-brain/.../tools/workspace/` — Brain-side Backends (`work_file_*`)
- `vance-brain/.../tools/exec/` — Brain-side Exec-Backends (`work_exec_*`)
- `vance-foot/.../tools/file/` — Foot-side Backends (`client_file_*`)
- `planning/work-target-and-tool-rename.md` — Migration Plan (4 Milestones)
- `specification/frankie-engine.md` — Engine that productively uses the layer
- `specification/workspace-management.md` — RootDir concept
