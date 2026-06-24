---
title: "Vance — WorkTarget & Generic File/Exec Tool-Layer"
parent: Documentation
permalink: /docs/work-target
---

<!-- AUTO-GENERATED from specification/public/en/work-target.md — do not edit here. -->

---
# Vance — WorkTarget & Generic File/Exec Tool-Layer

> A **WorkTarget** describes, per `ThinkProcess`, which backend the
> generic `file_*` and `exec_*` tools dispatch to: the user's local
> machine via Foot CLI (**CLIENT**) or a Brain server workspace root
> directory (**WORK**). The tools themselves are thin wrappers — they
> know neither filesystem paths nor sandbox logic; they call
> `ContextToolsApi.invoke(...)` on the backend tool selected by the
> target.
>
> Effect for Engines: a unified tool manifest entry per operation
> (`file_read`, `exec_run`, …), regardless of where the worker lands.
> Lunkwill uses this productively; other Engines can adopt the layer
> on-demand.
>
> See also: [lunkwill-engine](/docs/lunkwill-engine) | [workspace-management](/docs/workspace-management) | [prompts-and-manuals](/docs/prompts-and-manuals)

---

## 1. Role and Classification

Vance currently has three parallel storage/execution surfaces:

| Surface | Where | Tool-Prefix | Lifetime |
|---|---|---|---|
| User-Local Files | Foot-Host | `client_file_*` / `client_exec_*` | persistent (User owns) |
| Workspace RootDir | Brain-Server | `work_file_*` / `work_exec_*` | ephemeral (per-Process Sandbox) |
| Persistent Documents | MongoDB | `doc_*` | persistent, indexed |

Engines (especially Lunkwill + `coding`-Recipe) want to use the first
two **seamlessly** — depending on whether a Foot-Client is connected
or not. Directly hardcoding a set breaks on profile switch and
overloads the LLM manifest with two quasi-identical operations per
file action.

**Solution**: a per-Process **WorkTarget** + 12 generic tool wrappers
(`file_*` × 8, `exec_*` × 4). Wrappers are LLM-visible, backends
deferred. During the wrapper call, the `WorkTargetDispatcher` decides
which backend is actually executed.

## 2. Data Model

```java
// vance-shared/.../worktarget/
record WorkTarget(WorkTargetKind kind, @Nullable String dirName)
enum WorkTargetKind { CLIENT, WORK }
```

| Field | Meaning |
|---|---|
| `kind = CLIENT` | dispatch to `client_*`. `dirName` is ignored — Foot operates against its own `--workdir`. |
| `kind = WORK` | dispatch to `work_*`. `dirName` selects a named root directory of the Project; `null` → per-Process-Temp-RootDir (lazy via `WorkspaceService`, `deleteOnCreatorClose=true` — cleared when the Process closes). |

**Pseudo-Projects (`_user_<login>`, `_tenant`, `_vance`):** no
special path. These Projects are `ProjectKind.SYSTEM` +
`LifecycleType.HOMELESS` and get the same RootDir path
(`~/.vance/workspaces/<tenant>/<projectId>/`). Since Recipes on them
typically **do not** set a `dirName`, all WORK calls land in a
Temp-RootDir that disappears when the Process closes — de facto
"Workspaces are temporary" without needing to explicitly model this
in the layer. See `specification/workspace-management.md` §7.3-§8
for RootDir lifecycle.

**Persistence:** as a map under
`ThinkProcessDocument.engineParams["workTarget"]`. Standard
Recipe-Param-Copy on spawn inserts the default, `work_target_set`
writes at runtime. No separate Mongo-Collection — schema-free, one
entry per Process.

```yaml
# engineParams after Spawn
workTarget:
  kind: WORK         # or CLIENT
  dirName: src       # optional, only for WORK
```

## 3. Inheritance on Spawn

Sub-Workers inherit the `workTarget` of their spawn parent
(Unix-cwd-style — snapshot on spawn, then process-local). This means
all Workers of a Session **automatically** see the same backend
without Recipes or callers having to explicitly set it every time.

Inheritance pipeline during `process_create` (highest → lowest priority):

1. **Caller-Param**: `process_create(workTarget: {kind:WORK, dirName:"foo"})` — explicit override.
2. **Recipe-Default**: `params.workTarget` from the Recipe (e.g., `coding.yaml` Foot-Profile → CLIENT).
3. **Parent-Inheritance**: copy from the spawning Process if points 1-2 did not apply.
4. **Engine-Default-Resolution**: `WorkTargetService.defaultFor(process)` — see §4.

Implemented in `WorkTargetService.resolveSpawnParams(recipeParams, parentProcessId)`
and called by `SpawnActionExecutor` before each `ThinkProcessService.create`-call.
Caller-Override and Recipe-Default land in `recipeParams` (highest
priority); if `workTarget` is missing there, the Service looks at the
Parent and copies its entry into the fresh-engineParams.

**Important — Copy, not Live-Link:** the child Process receives a
**copy** of the Parent map. If the child later calls `work_target_set`,
this only changes its own `engineParams.workTarget` — Parent and
siblings remain unaffected. This allows for a safe sandbox switch
within a single Worker without sabotaging other Workers.

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

**Recipe-Defaults** override the auto-resolution. Example `coding.yaml`:

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

`WorkTargetDispatcher` is a Spring-`@Service`. Per wrapper call:

1. Resolve Process, read `WorkTarget` (or default it).
2. For `CLIENT`: Check Foot-Connectivity. If disconnected →
   `ToolException` with a clear message ("call `work_target_set` or
   reconnect"). Clean up parameters (Foot-Tools do not know `dirName`).
3. For `WORK`: if the caller has not set `dirName` itself and the
   Target has one → inject it. Otherwise, pass it on
   (`WorkspaceDirResolver` will then fall back to Process-Temp).
4. Backend call:
   - With `ToolBus` (3-arg `Tool.invoke`): via `bus.invoke(backendName, params)` —
     respects Engine-Allow-Set / primary-defer-Filter.
   - Without Bus (2-arg `Tool.invoke`, e.g., Agrajag-Probes): via
     `ToolDispatcher.invoke(backendName, params, ctx)` directly —
     Backend-Permission-Checks still apply.

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

Spring-Bean-Names are `workTargetFileRead`, `workTargetExecRun`, … —
explicitly set to avoid class name collisions with Brain-side
`tools.exec.ExecRunTool` etc.

### 5.2 Meta-Tools (primary=false, accessible via `find_tools`)

| Tool | Purpose |
|---|---|
| `work_target_get` | Report current Target + available alternatives (Foot-Connected, RootDir names). |
| `work_target_set` | Switch Target. Persistent on `engineParams.workTarget`. |

Not primary, because the Recipe usually sets the Target stably and the
LLM does not need to inspect or switch it. Accessible via
`find_tools('work_target')` for exceptional needs.

### 5.3 Backend-Tools

Remain in the Engine-Allow-Set (otherwise the Dispatcher cannot call
them), but:

- In Recipes, **remove** them from the LLM manifest via `allowedToolsDefer`
  so that the LLM does not have to choose between three sets of the
  same operation. Example `coding.yaml` lists all 24
  `client_*`/`work_*` names under `allowedToolsDefer`.
- Tool-Level `primary=true/false` is orthogonal: Foot-Tools are
  `primary=true` for Direct-Use in other Engines (Arthur, etc.),
  Recipe-Defer overrides this per-Recipe.

## 6. Engine Integration

```java
public class LunkwillEngine implements ThinkEngine {
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
wrappers + 2 meta-tools + all 24 backend names. An Engine that adopts
the layer includes this set in its `allowedTools()` and is done.
Recipes must remove the backends from the manifest via `allowedToolsDefer`
— otherwise the LLM will see duplicates.

## 7. What is NOT part of the WorkTarget Layer

- **Document-Operations (`doc_*`)** — different storage surface with
  different semantics (persistent, indexed, ranked). Document-Tools
  are separate, no dispatch via WorkTarget.
- **Skill-Tools** — Skills have their own activation mechanism via
  `SkillResolver`. WorkTarget does not apply here.
- **Process-Control-Tools** (`process_stop` etc.) — global, no
  File/Exec-Surface.

## 8. References

- `vance-shared/.../worktarget/` — Record + Enum
- `vance-brain/.../tools/worktarget/` — Service, Dispatcher, 14 Tools, BaseEngineTools
- `vance-brain/.../tools/workspace/` — Brain-side Backends (`work_file_*`)
- `vance-brain/.../tools/exec/` — Brain-side Exec-Backends (`work_exec_*`)
- `vance-foot/.../tools/file/` — Foot-side Backends (`client_file_*`)
- `planning/work-target-and-tool-rename.md` — Migration Plan (4 Milestones)
- `specification/lunkwill-engine.md` — Engine that uses this layer productively
- `specification/workspace-management.md` — RootDir Concept
