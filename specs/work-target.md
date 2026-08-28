---
title: "Vancetope — WorkTarget & Generic File/Exec Tool-Layer"
parent: Specs
permalink: /specs/work-target
---

<!-- AUTO-GENERATED from specification/public/en/work-target.md — do not edit here. -->

---
# Vancetope — WorkTarget & Generic File/Exec Tool-Layer

> A **WorkTarget** describes, per `ThinkProcess`, which backend the
> generic `file_*` and `exec_*` tools dispatch to: the user's local
> machine via a session-bound Foot CLI (**CLIENT**), a Brain server
> Workspace RootDir (**WORK**), or a named `profile=daemon` Foot within
> the same Project (**DAEMON**). The tools themselves are thin wrappers
> — they know neither filesystem paths nor sandbox logic; they call
> `ContextToolsApi.invoke(...)` on the backend tool selected by the
> Target.
>
> Effect for Engines: a unified tool manifest entry per operation
> (`file_read`, `exec_run`, …), regardless of where the worker lands.
> Frankie uses this in production; other Engines can adopt the layer
> on-demand.
>
> See also: [frankie-engine](/specs/frankie-engine) | [workspace-management](/specs/workspace-management) | [prompts-and-manuals](/specs/prompts-and-manuals)

---

## 1. Role and Classification

Vancetope currently has three parallel Storage/Exec surfaces:

| Surface | Where | Tool-Prefix | Lifetime |
|---|---|---|---|
| User-Local Files | Foot-Host | `client_file_*` / `client_exec_*` | persistent (User owns) |
| Workspace RootDir | Brain-Server | `work_file_*` / `work_exec_*` | ephemeral (per-Process Sandbox) |
| Persistent Documents | MongoDB | `doc_*` | persistent, indexed |

Engines (especially Frankie + `coding`-Recipe) want to use the first
two **seamlessly** — depending on whether a Foot client is connected
or not. Directly hardcoding a set breaks on profile switches and
overloads the LLM manifest with two quasi-identical operations per
file action.

**Solution**: a per-Process **WorkTarget** + 13 generic tool wrappers
(`file_*` × 9, `exec_*` × 4). Wrappers are LLM-visible, backends
deferred. During a wrapper call, the `WorkTargetDispatcher` decides
which backend is actually executed.

`file_delete` is the newest addition and shows why the wrapper layer
is not just cosmetic: its two backends (`work_file_delete`,
`client_file_delete`) are **deferred**, meaning they are not in any
turn manifest. They would only be discoverable if the model itself
used `how_do_i` or `tool_list` — which it doesn't for a straightforward
task. Without wrappers, deletion would be implemented but practically
unreachable. On the CLIENT side, there's also a separate sandbox gate
— a read permission does not allow deletion, see
`specification/public/foot-sandbox.md` §3.1.

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
| `kind = CLIENT` | Dispatches to `client_*` via the session-bound Foot. `targetName` is ignored — Foot operates against its own `--workdir`. |
| `kind = WORK` | Dispatches to `work_*`. `targetName` selects a named RootDir of the Project; `null` → per-Process-Temp-RootDir (lazy via `WorkspaceService`, `deleteOnCreatorClose=true` — cleared on Process close). |
| `kind = DAEMON` | Dispatches to `client_*`, but **not** via the Session — instead, via the named `profile=daemon` Foot addressed by `targetName`. Routing via `DaemonRegistry` (`(tenantId, projectId, targetName)`). `targetName` is **mandatory** (record constructor throws otherwise). Offline Daemon → `ToolException` with a clear message. |

**Daemon Routing Detail:** A `profile=daemon` Foot registers its
manifest under the exact `client_*` names (`client_file_read`,
`client_exec_run`, …) — the same backend names the Dispatcher knows
for CLIENT. DAEMON thus sends the `client_*` name unchanged as the
wire tool name to the Daemon WS; only the WS resolution and the
pending registry (`DaemonRegistry`, correlation prefix `dt-`) differ
from the session-bound CLIENT path (`ct-`). Both paths share the
`DaemonToolInvoker`-Seam and the identical `CLIENT_TOOL_INVOKE`/
`CLIENT_TOOL_RESULT` protocol. Daemon registration + routing see
`planning/archive/foot-daemon-tools.md`.

**Legacy Compatibility:** Existing `engineParams` with the old
sub-key `dirName` are still read by `WorkTarget.fromMap(...)`
(fallback to `targetName`); only `targetName` is written.

**Pseudo-Projects (`_user_<login>`, `_tenant`, `_vance`):** no
special path. These Projects are `ProjectKind.SYSTEM` +
`LifecycleType.HOMELESS` and get the same RootDir path
(`~/.vancetope/workspaces/<tenant>/<projectId>/`). Since Recipes
typically **do not** set a `dirName` on them, all WORK calls land
in a Temp-RootDir that disappears on Process close — de facto
"Workspaces are temporary" without needing to explicitly model this
in the layer. See `specification/workspace-management.md`
§7.3-§8 for RootDir lifecycle.

**Persistence:** as a Map under
`ThinkProcessDocument.engineParams["workTarget"]`. Standard
Recipe-Param-Copy on spawn inserts the default, `work_target_set`
writes at runtime. No separate Mongo collection — schema-free,
one entry per Process.

```yaml
# engineParams after Spawn
workTarget:
  kind: WORK            # CLIENT | WORK | DAEMON
  targetName: src       # WORK: RootDir name (optional) · DAEMON: Daemon name (mandatory) · CLIENT: ignored
```

## 3. Inheritance on Spawn

Sub-workers inherit the `workTarget` of their spawn parent
(Unix-cwd-style — snapshot on spawn, then process-local). This
means all workers of a Session **automatically** see the same backend
without Recipes or callers having to explicitly set it every time.

Inheritance pipeline on `process_spawn` (highest → lowest priority):

1. **Caller-Param**: `process_spawn(workTarget: {kind:WORK, dirName:"foo"})` — explicit override.
2. **Recipe-Default**: `params.workTarget` from the Recipe (e.g., `coding.yaml` Foot profile → CLIENT).
3. **Parent-Inheritance**: copy from the spawning Process if points 1-2 did not apply.
4. **Engine-Default-Resolution**: `WorkTargetService.defaultFor(process)` — see §4.

Implemented in `WorkTargetService.resolveSpawnParams(recipeParams, parentProcessId)`
and called by `SpawnActionExecutor` before each `ThinkProcessService.create`-call.
Caller override and Recipe default land in `recipeParams`
(highest priority); if `workTarget` is missing there, the service
looks at the parent and copies its entry into the fresh-engineParams.

**Important — Copy, not Live Link:** the child Process receives a
**copy** of the parent map. If the child later calls `work_target_set`,
this only changes its own `engineParams.workTarget` —
parent and siblings remain unaffected. This allows for a safe
sandbox switch in a single worker without sabotaging other workers.

## 4. Default Resolution

If, after §3, no explicit `workTarget` is present in `engineParams`,
`WorkTargetService.defaultFor(process)` resolves it:

```
if (ClientToolRegistry.entry(sessionId).isPresent())
    return WorkTarget(CLIENT, null);
else
    return WorkTarget(WORK, null);
```

This means: Foot-Connected → CLIENT (default Coding-UX), otherwise WORK
with process-temp-RootDir.

**Recipe-Defaults** override auto-resolution. Example `coding.yaml`:

```yaml
params:
  workTarget:
    kind: WORK              # Default for web / API profiles
profiles:
  foot:
    params:
      workTarget:
        kind: CLIENT        # Foot profile switches to User-Local
```

## 4. Dispatch Logic

`WorkTargetDispatcher` is a Spring `@Service`. Per wrapper call:

1. Resolve Process, read `WorkTarget` (or default).
2. For `CLIENT`: Check Foot connectivity. If disconnected →
   `ToolException` with a clear message ("call `work_target_set` or
   reconnect"). Clean up params (Foot tools do not know `dirName`).
3. For `DAEMON`: Strip `dirName` from params (Foot client tools
   do not know it), build `DaemonKey` from `(process.tenantId,
   process.projectId, targetName)` and send the `client_*`-backend
   name via `DaemonToolInvoker.invoke(key, clientName, params,
   timeout)` to the Daemon WS. **Early-return** — no
   `ToolBus`/`ToolDispatcher` path. Offline/stale Daemon → the invoker
   throws a clear `ToolException`. Timeout via
   `vance.worktarget.daemon-timeout-seconds` (default 60s).
4. For `WORK`: If the caller has not set `dirName` itself
   and the Target has a `targetName` → inject it as a `dirName`-param
   (the WorkTarget field is generic, the tool param name remains `dirName`).
   Otherwise, pass it on (`WorkspaceDirResolver` will then fall back
   to Process-Temp).
5. Backend call (CLIENT / WORK):
   - With `ToolBus` (3-arg `Tool.invoke`): via `bus.invoke(backendName, params)` —
     respects Engine-Allow-Set / primary-defer-filter.
   - Without Bus (2-arg `Tool.invoke`, e.g., Agrajag-Probes): via
     `ToolDispatcher.invoke(backendName, params, ctx)` directly —
     backend permission checks still apply.

### 4.1 Param Contract — Three Schemas, One Truth

Each wrapper involves **three** schemas: its own and one for each backend. These drift, and the dispatcher passes parameters unchanged — a parameter not read by the active backend therefore **silently disappeared**. For a caller, "ignored" is indistinguishable from "had no effect"; an agent then tries a larger number, then another, and finally starts diagnosing the tool. (Specifically on 2026-08-11: `file_read maxChars` was declared as "WORK only", the CLIENT backend instead paginates via `startLine`/`maxLines` — which the wrapper did not offer. A Frankie turn burned 8 iterations and four spawned Agrajag diagnostic processes on this.)

Three rules derived from this:

1. **The wrapper parameter must mean the same thing on both backends.** Where only one backend had a capability, the other side is brought up to speed, not the parameter documented as target-specific. A wrapper parameter that invents a name no backend reads is a bug.
2. **The wrapper declares the full union.** A parameter supported by both backends but concealed by the wrapper is a capability the LLM cannot reach — and the reason an agent writes `exec_run "grep -n -i -A3 …"` instead of using `file_grep`.
3. **Unsupported parameters are reported, not swallowed.** `WorkTargetDispatcher.rejectUnknownParams` knows two cases: *unknown to all* (hallucinated name) and *declared-but-ineffective* (the wrapper advertises it, the active backend does not implement it) — the second is more dangerous because the caller read the name from the schema. Parameters declared only by the **backend** remain allowed (backends legitimately offer more than the wrapper advertises). **Fail-open**: if the backend is not resolvable or declares no properties, nothing is rejected. A validation layer must never be the reason a functioning call starts to fail.

`dirName` is the one deliberate exception to "declared means it works": WORK-only, silently removed on CLIENT/DAEMON, documented as ignored there in every wrapper. It doesn't exist at all for job ID tools (`exec_status`/`exec_tail`/`exec_kill`) — these address a running process, not a directory.

**Shared Walk-Defaults.** Depth limit, default line cap, and the generated content filter (`node_modules`, `target`, `dist`, `.git`, …) are in `de.mhus.vance.api.tools.FileWalkDefaults` — in `vance-api`, because that is the only module that **both** sides are allowed to see (`vance-foot` is by design limited to `vance-api`). A `file_grep` that skips `node_modules` on one target and enters it on another would be the wrapper failing at its sole task. The `limit`-**upper bounds** deliberately remain per tool (grep 1000 match lines, find 2000 file lines — different units); they only need to match between CLIENT and WORK of the same tool.

### 4.2 The Symmetry Guard

Convention alone won't maintain this: the three classes reside in two Maven modules without dependencies on each other and are extended independently. Therefore, `WorkTargetToolSymmetryTest` in **`qa/ai-test`** (`@Tag("it")`, no LLM, no container, pure schema reflection) — `qa/` is the only module that sees `vance-brain` **and** `vance-foot`. For this, `vance-foot` attaches a `classes`-artifact alongside the boot-fat-jar; the boot-jar retains its name and role.

The test iterates over all 13 triples and checks:

- **Backend Symmetry** — `client_x` and `work_x` declare the same parameters (modulo `dirName`).
- **Wrapper Fidelity** — the wrapper declares **exactly** the common set, plus `dirName` where the WORK backend takes one. Less hides a capability, more promises what no backend delivers.
- **`required`-Equality** — a parameter that is mandatory on one target and optional on the other causes the same call to succeed or fail depending on the worker's location.

**Without an exception list.** If a future parameter truly only makes sense on one target, the honest encoding is a separate tool — not a wrapper that lies about half its surface.

### 4.3 Vocabulary — One Concept, One Parameter Name

The symmetry rules from §4.1 ensure that a tool understands the same thing on both targets. They say nothing about whether **two** tools name the same concept identically — and this is precisely where the `file_*` and `doc_*` families had shortcomings: a line window was called `offset`/`limit` in `doc_read_lines` and `startLine`/`maxLines` in `file_read`, a path scope was `folder`, `parentPath`, or `pathPrefix` depending on the listing tool, an edit was `old_string` here and `oldText` there. Each variant costs the model a guess, and a failed guess is silent: the unknown key is dropped, the tool responds about something else.

Canonical, for the families `doc_*`, `file_*`, `work_file_*`, `client_file_*`:

| Concept | Name | Replaces |
|---|---|---|
| Line window (start + count) | `startLine`, `maxLines` | `offset`, `limit` (as line count) |
| Line range (inclusive from–to) | `fromLine`, `toLine` | `from`, `to` (as line number) |
| Character range (0-based, end exclusive) | `fromChar`, `toChar` | `from`, `to` (as offset) |
| First/last N lines | `head`, `tail` | — |
| Directory scope | `path` | — |
| Path prefix scope | `pathPrefix` | `folder`, `parentPath` |
| Target of a write operation | `newPath` | `targetPath`, `target` |
| Search/replace text | `oldText`, `newText`, `replaceAll` | `old_string`, `new_string`, `replace_all` |
| Result upper bound | `limit` | — |
| Project | `projectId` | `project` |
| Document ID | `id` | `documentId` |

After renaming, `limit` **only** means "upper bound of results" and `maxLines` **only** means "number of lines" — previously, `limit` was one thing in `doc_read_lines` and another in `doc_find`/`doc_grep`/`file_find`.

**One name per concept also means: one name per unit.** `doc_replace_lines` addresses lines and is therefore called `fromLine`/`toLine`; `doc_get_selection` cuts with `substring()` and is therefore called `fromChar`/`toChar`. Unifying both to `fromLine`/`toLine` would have been worse than the original `from`/`to`: a model passing `fromLine=12` to a character offset would not get an error, but the wrong snippet. Where unification would obscure the unit, the unit wins.

**The narrowness of the scope is part of the rule, not a shortcut.** Outside these families, the same words mean something different and retain their spelling: `from`/`to` are time ranges in the Calendar-/Gantt-/Journal-tools and node IDs in `canvas_edge_add`; `folder` is the app folder in about 35 Application tools (`kanban_*`, `gtd_*`, `issue_*`, …); `targetPath` is the output file of the seven `image_*`-tools; `target` is an edge end in the Graph and Relations tools. A global renaming would have been incorrect.

**Aliases remain readable but undeclared.** Old spellings continue to be accepted at runtime (`KindToolSupport.paramStringAliased` and siblings) so that prompts, manuals, and calls already in progress do not break. They are **not** in the schema — otherwise, the second name would again be an option. Guard: `ToolVocabularyTest` (`vance-brain`, runs in `wb build`) checks the declared side against the table and fails with "`offset` → use `startLine`" if an old spelling returns.

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

### 5.2 Meta-Tools (primary=false, reachable via `tool_list`)

| Tool | Purpose |
|---|---|
| `work_target_get` | Report current Target + available alternatives (Foot-Connected, RootDir names, names of online `profile=daemon` Foots in the Project). |
| `work_target_set` | Switch Target. `kind` ∈ {CLIENT, WORK, DAEMON}, optional `targetName` (WORK: RootDir; DAEMON: Daemon name, mandatory). Persistent on `engineParams.workTarget`. |

Not primary, because the Recipe usually sets the Target stably
and the LLM does not need to inspect or switch it. Reachable
via `tool_list(prefix='work_target')` for exceptional needs.

### 5.3 Backend Tools

Remain in the Engine-Allow-Set (otherwise the Dispatcher cannot
call them), but:

- In Recipes, **remove** them from the LLM manifest via `allowedToolsDefer`
  so the LLM doesn't have to choose between three sets of the same operation.
  Example `coding.yaml` lists all 24 `client_*`/`work_*` names under `allowedToolsDefer`.
- Tool-level `primary=true/false` is orthogonal: Foot tools are
  `primary=true` for direct use in other Engines (Arthur, etc.),
  Recipe-Defer overrides this per-Recipe.

### 5.4 Exec Output: Truncation and Paging

`exec_run` / `exec_status` stream the full `stdout`/`stderr` of a
job into two files on disk; the paths are returned as `stdoutPath` /
`stderrPath` in the tool result. Only a window with `inlineOutputCharCap`
(default **8,000** chars, `vance.exec.inlineOutputCharCap`) is sent inline.

If either stream exceeds the cap, the renderer truncates it using
**HEAD_TAIL**: ~20% beginning + sentinel + ~80% end. Sentinel format:

```
<head><newline>…[truncated, N chars omitted]<newline><tail>
```

Reasoning: Shell output is tail-heavy — exit status, stack traces,
compile errors are at the end. Pure HEAD would only show the LLM the
harmless startup lines and force a second tool call to `tail`.

Additionally set in the render:

- `truncated: true` if at least one stream was truncated.
- `hint`: Instruction to the LLM to use further `exec_run` calls
  with bounded commands against `stdoutPath`/`stderrPath` for targeted
  paging (`head -N`, `tail -N`, `sed -n 'A,Bp'`, `grep -m N`).

Other tools in the WorkTarget layer (e.g., `file_read`, `file_grep`) have
**their own** paging parameters and do not use this truncation — it
conceptually belongs to `exec_*` because output there dynamically
occurs with unknown length.

### 5.5 Client Platform in the Prompt (`## Environment`)

With the `CLIENT`-Target, `exec_run`/`file_*` runs on the **user's local
machine** — the server only knows its OS/Shell if the client reports it.
Foot sends a `ClientContext` (`os`/`arch`/`shell`/`cwd`/`sandboxEnabled`)
in the `X-Vancetope-Client-Context` header during the handshake (see
[websocket-protokoll](/specs/websocket-protokoll) §2); the server parks it in
the `ConnectionContext`.

For turns with a bound client connection, Engines inject a **dynamic**
`## Environment` system block (`PromptEnvironmentBlock`) derived from this
(appended next to the date block via `PromptDateContextResolver`). The block
names the OS, working directory, the actual exec shell (`/bin/sh` vs.
`cmd.exe`), and the sandbox state — so the LLM generates commands in the
correct dialect (Windows `cmd.exe` instead of bash), instead of assuming
POSIX and failing on a Windows Foot. The lookup is
`process → sessionId → ClientToolRegistry.entry → ConnectionContext`; it
is a **no-op** without a bound client (headless / web) or without a sent
`ClientContext`. Ephemeral, not persisted — the block exists only as long
as the connection is active.

## 6. Engine Integration

```java
public class FrankieEngine implements ThinkEngine {
    private static final Set<String> ENGINE_DEFAULT_TOOLS;
    static {
        Set<String> base = new LinkedHashSet<>();
        base.add("tool_list"); /* … */
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
Recipes must remove the backends from the manifest via `allowedToolsDefer`
— otherwise the LLM sees duplicates.

## 7. What is NOT part of the WorkTarget Layer

- **Document-Operations (`doc_*`)** — different Storage-Surface with different
  semantics (persistent, indexed, ranked). Document tools are separate,
  no dispatch via WorkTarget.
- **Skill-Tools** — Skills have their own activation mechanism via
  `SkillResolver`. WorkTarget does not apply here.
- **Process-Control-Tools** (`process_stop` etc.) — global, no
  File/Exec-Surface.

## 8. Workspace Confinement & Exec Isolation (WORK-Backends)

The WORK-backends run Brain-side and **headless** — there is no
prompt for confirmation as with the Foot sandbox. The rule is strict:
**everything outside the Workspace folder (RootDir) is forbidden.**

**File-Tools (`work_file_*`) — Path Confinement.** Every relative path is
centrally resolved by `WorkspaceRootService` (vance-shared) and checked for
containment; `WorkspaceService.resolve()` delegates there. Two layers:

1. **Syntactic:** `base.resolve(path).normalize()` must still
   `startsWith(base)` — collapses `..`-traversal.
2. **Symlink:** the deepest existing ancestor of the target path is checked via
   `toRealPath()` and must remain within the real base. This closes the gap
   where a symlink *inside* the RootDir points outwards (which `normalize()`
   alone misses). A dangling symlink is conservatively rejected.

Violation → `WorkspaceException` (REST/Tool error), no prompt.

**Exec (`work_exec_run`) — opt-in OS-Isolation.** The command runs with
`cwd = RootDir`, but a shell command can read arbitrary paths — not solvable
by path check. Optionally (default off), `ExecManager` wraps the command
in an isolation tool, analogous to Foot-Exec-Isolation:

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

**Kill/Deadline — graceful process-*tree* (Brain *and* Foot).** A job runs
as `/bin/sh -c "<command>"`; `destroyForcibly()` on this shell alone would
leave children (compiler, trainer, …) orphaned. Both Exec implementations
— Brain `ExecManager.terminateTree(...)` and Foot
`ClientExecutorService.terminateTree(...)` (each used by `kill`, cleanup,
and deadline watchdog) — therefore snapshot the process **+ all descendants**,
first send **SIGTERM** (clean shutdown / checkpoint), then after the
grace period (`vance.exec.killGraceMs`, default 10s; Foot constant)
**SIGKILL** to survivors — non-blocking via the watchdog scheduler. The
watchdog kill applies when the optional `deadlineSeconds` expires; without
a deadline, the job runs to its natural end (intended for long-running tasks).
Important for CLIENT/DAEMON compose, where `exec` runs on the Foot/Daemon.

**Configuration & Deployment.** The block resides in `application.yml`
(`vance.exec.isolation`), `mode` can be overridden by `VANCE_EXEC_ISOLATION_MODE`
env var, default `none` (even in the cloud, so dev/net-dependent commands don't break).
The **Brain-Docker-Image includes `bubblewrap`**, so the provided default wrapper
works immediately once an operator sets `mode: custom` — prerequisite is a
container runtime that allows unprivileged user namespaces. The default wrapper
binds only `/usr` `/bin` `/lib` (+ `/lib64`/`/etc/ssl` if present) read-only
plus the job RootDir read-write and disables networking; operators tune it
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
- `specification/frankie-engine.md` — Engine that uses the layer in production
- `specification/workspace-management.md` — RootDir concept
