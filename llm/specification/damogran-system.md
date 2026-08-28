# Damogran — Workspace Compose

> A lightweight, linear batch runner over a named Workspace:
> provision Workspace → import Documents → execute a series of Tasks
> → export results. A Compose is a Document (Kind
> `compose`) **or** a YAML text; execution is transient (Work-in-
> Progress: test, repeat individual Tasks, have an LLM review).
>
> See also: [work-target](work-target.md) (File/Exec-Targets + Workspace-
> Roots), [cortex](cortex.md) (Run UI), [doc-kind-workpage](doc-kind-workpage.md)
> / [app-workbook](app-workbook.md) (inline `/compose`-block),
> [light-llm-service](light-llm-service.md) (the `llm`-Task),
> [vogon-engine](vogon-engine.md) / [workflows](workflows.md) (the orchestrators
> above it).

---

## 1. Purpose & Character

Damogran fills the gap between "calling a single tool" and "orchestrating a
workflow": it provisions a **Workspace**, populates it with
files, runs a sequence of steps on it, and retrieves results. Typical processes: compile a LaTeX source to PDF, prepare data and run an analysis script, have an LLM summarize files in the Workspace.

The character is **Work-in-Progress**: the Workspace is named and survives
between runs (within a work Session), allowing for file editing, re-firing individual Tasks, and iteration. Not a days/weeks-long run — that is [Magrathea](workflows.md).

**Naming.** Damogran is the remote planet where the *Heart of Gold* was secretly built and launched — a transient, isolated build and launch site. Convention: **Location = System without a Brain (Infrastructure), Character = LLM Agent.** Damogran *calls* LLMs (as a Task type), but *is not* one — hence a location, like Magrathea.

## 2. Delimitation: Damogran vs. Vogon vs. Magrathea

| | **Vogon** | **Magrathea** | **Damogran** |
|---|---|---|---|
| What | ThinkEngine (Peer of Arthur/Ford) | Workflow Subsystem *above* the Engines | Batch Runner *below* the Orchestrators |
| Lifecycle | within a Session | cross-session, days/weeks-long, journaled | lightweight, quasi-synchronous, session-transient |
| Unit of a Step | LLM Worker Spawn per Phase | 9 Task types (agent/shell/script/tool/…) | exec / js / python / spawn / llm / addon |
| Control Flow | Gates, Loops, Forks, Checkpoints | on/catch/retry, bounds, condition | **linear** (no Loops/Gates/Branches) |
| LLM Role | Steps *are* LLM | agent_task spawns LLM | calls LLM only as a Task type |
| First-Class | LLM Orchestration | State Machine | **Workspace** (provision + import/export) |

Damogran sits **below** the orchestrators and **above** the shared
execution layer (`ActionExecutorRegistry`/`TriggerAction`,
`LightLlmService`, `WorkspaceService`, `WorkTargetDispatcher`). It does not duplicate orchestration, but borrows step execution from the layer that Magrathea also uses. To use loops/branching, call a Compose as *one step* from Vogon/Magrathea.

## 3. Manifest Schema

```yaml
title: My Compose           # optional; shown in the View above the "Run" button
description: What it does      # optional; same
showSource: false           # optional, UI only: true = show YAML also in the
                            #   rendered Workbook page (Default: off)
autoRun: true               # optional, UI only: false = skip during "Run All Until"
                            #   (can be manually continued via ▶)
session:                    # optional Mapping (missing = no process, process-less):
  enabled: true             #   default true if section present; false = explicitly off
  name: my-agent            #   optional: stable process identity (Re-Run = continuity)
  recipe: arthur            #   optional: makes the process an Agent (agent-Task);
                            #     missing = silent WORK-Holder (file/exec-Tools, inert)
  clean: false              #   true = reset process before run (fresh start)
state:                      # optional List: short-lived state across runs (§9)
  - type: python            #   init/header/footer per type; { delete: true } wipe-all
    init: true
    header: 'import json'
output:                     # optional, UI only: fixed output list — overrides
  - path: out.txt          #   the (sometimes wrong/empty) run outputs; then
    uri: vance-workspace:/my-work/out.txt   #   NO $output is written
    kind: text
workspace:
  name: my-workspace        # named, discoverable Workspace (required)
  type: temp                # temp | git | node | python | ephemeral | <addon>
  clear: false              # true = clear before provisioning, then create empty
  delete: false             # true = discard + stop Workspace (terminal, see below)
  options:                  # verbatim as Handler-Metadata (handler-native Keys)
    repoUrl: https://…      #   git → repoUrl / branch / credentialAlias
    branch: main
  target: WORK              # WORK (default, full) | CLIENT (exec-only, Foot) | DAEMON (exec-only, name=daemon)

import:
  - from: vance:main.tex    # vance:<path> = Document; http(s)://… = external source
    to: main.tex            # workspace-relative
  - from: http://example.com/data.txt
    to: data.txt

tasks:
  - type: exec
    command: echo "Hello" > out.txt
    outputs: [out.txt]      # declared outputs (render in the output region)
  - type: llm
    recipe: analyze
    prompt: "Summarize data.txt"
    output: summary.md      # LLM response lands as a Workspace file

export:
  - from: output.pdf        # workspace-relative
    to: vance:output.pdf    # target Document
```

Top-Level: `workspace` (required), `import`, `tasks`, `export`, plus optional
`title`/`description` (pure metadata — ignored by the runner, shown in the web UI in the view above the "Run" button), the **`session`** section (missing = no process; a mapping provides a Session process, see §4), the **`state`** section (short-lived state across runs, see §9) and two **UI-only** flags (ignored by the runner): `showSource` (the rendered Workbook page by default shows **only** title/description + run + outputs — no YAML; `showSource: true` also displays the source there; the Cortex `compose`-editor separates Edit/View anyway) and `autoRun` (`false` = skipped during the Workbook menu **"Run All Until"**, can still be manually started via ▶) and `output` (fixed output list `{path, uri, kind?, title?}` — overrides the outputs reported by the run/`$output` for display; if `output` is set, the run **does not** write `$output`, but uses this list. For cases where auto-detection provides the wrong or no artifact). The run bar of the Workbook block is a
▶/■ toggle (Run or Stop during a running run) plus a "..." menu ("Run All Until",
"Clear Output", "Clear All Output" — shared across all Compose-family blocks,
see §8). A Task item
carries a `type` discriminator (→ `DamogranTask`-Bean) plus type-specific
fields. `output:` (a string) and `outputs:` (list of strings or
`{path, kind|as, title}`-maps) declare the files produced by the Task.

Parsing is fail-fast (`DamogranManifestParser`). The parser is pure and
independent of the caller.

## 4. Task Types

Task types are an **open SPI** (`DamogranTask`, one Spring Bean per
`type()` — pattern like `SearchProtocol`/`KindHandler`). Deliberately **not** a
`TriggerAction`-variant, as `TriggerAction` in `vance-api` is `sealed` and cannot
be extended by Addons. Built-in Beans delegate downwards to the
shared execution layer — **no** parallel executor.

| Type | Does | Delegates to |
|---|---|---|
| `exec` | Shell command in the Workspace | `ExecManager` |
| `js` | Workspace JS file (or inline `code`) | `ScriptActionExecutor` (WORKSPACE) |
| `python` | Python file (or inline `code`) | `ExecManager` (`.venv/bin/python` else `python3`) |
| `spawn` | Worker process (Recipe, fire-and-forget, new child process per run) | `SpawnActionExecutor` / `TriggerAction.Recipe` |
| `agent` | Prompt as **Turn** to the Session process, **blocks** until response (Lane-Barrier); pins `vance-process:<pid>/<msgId>` | `EngineMessageRouter` + `LaneScheduler` |
| `llm` | Single-shot LLM call → Output file | `LightLlmService` |
| `tex-task` | LaTeX → PDF (Addon) | `Tex2PdfExecutor` |
| `r` | R-Script (inline `code` or Workspace `script` file) → new Workspace files (Addon) | `RExecutionService` (Rserve) |
| `state-status` | Inspects the [State Store](#9-state-store-short-lived-state-across-runs) (info/header/footer/cache) | — |

LaTeX runs **exclusively** via `tex-task` — there is no standalone
`tex2pdf` tool and no `tex-compose` kind anymore (fully migrated to Compose).
`TexService` only resolves the executor; file transport is handled by the
`import` block.

**R (`r`, Addon `vance-addon-brain-rlang`)** is the second Addon Task and shares
the Rserve-Eval core `RExecutionService` with the `r_script` tool (tex-
pattern: `RDamogranTask` binds the Eval to the Workspace/Output model, the tool
to Temp-Dir + Document import). Three R special rules: **WORK-only** (R runs on
the Pod-Singleton-Rserve-Daemon, not via the `WorkTargetDispatcher` — no
CLIENT/DAEMON routing; a CLIENT-Compose cannot carry an `r`-Task),
**Isolation** only via Daemon-Fork-per-Connection + `setwd(<RootDir>)` (no
per-Workspace-interpreter), **no Package Provisioning** (packages from the R-Image
of the Brain). Outputs = declared `output:` entries **plus** all new
top-level files that the script wrote to the Workspace (File-Diff, Dedup by
path; Kind/Mime via `DamogranMime`); stdout/Value rides as `log`.

**Time limit (`exec`/`python`, WORK + remote):** `deadlineSeconds` (alias
`timeoutSeconds`, default 600) is a **hard-kill deadline** — `ExecManager`
sets `SubmitOptions.withDeadline(...)`, the watchdog kills the subprocess upon
expiration, and the Task fails cleanly (`status=TIMED_OUT`), **no orphaned
process**. The runner blocks until end-or-kill (`waitMs` = deadline +
grace); a fast command returns immediately. `DamogranTaskSupport`
centralizes default + parsing (`execDeadlineSeconds`). **`deadlineSeconds: 0`
= no kill** — runs until natural end (for long-runners; only useful in
async-run, otherwise the fast-path-wait blocks). The REST path is
**async** (see §10); the LLM-`compose_run`-tool path is still synchronous (push-wakeup
= §12 open).

**v1-limits (intentional):**

- All Built-ins are **WORK-only**.
- `js` calls `vance.tools.call(...)` with the **Tool Surface of the bound
  Process** (§3.5.6 in `script-engine.md`): `ScriptActionExecutor` resolves it via
  `ThinkEngineService.newContext(process).tools()` if the run is bound to a
  Process (active chat Session, Level-2 binding). This allows JS
  to call file/other tools, **provided the Engine/Recipe allow-set contains them**
  — so not in a pure chat (eddie, without `file_*`).
  **Chatless**, the web path binds **only if the `session:` section is enabled** to
  a project-scoped **Session Process** (`DamogranProcessResolver`,
  System-Session `_damogran`, inert in `INIT` status, never lane-driven) with
  `allowedToolsOverride = WORK_TARGET` — then the Compose gets the
  `file_*`/`exec_*` tools on its Workspace. **Without a `session:` section**, the
  chatless run runs **process-less** (`processId = null`): `js` then sees an
  **empty Tool Surface** (`vance.files.isEnabled()` → `false`, return value continues),
  which is the desired degradation. Reason for the default: a process with every
  button run would be woken up by `EXEC_FINISHED` events of the Compose `exec` tasks
  and burn an LLM turn to no avail — the `WorkspaceComposeRunner`
  also does not register an Exec-Owner without a process (`pushCompletionIfTracked`
  No-op). Process identity: `session.name` (stable across re-runs → memory continuity)
  or per-app/per-user fallback; `session.clean: true` discards the process +
  its conversation before the run. **Identity of the Session Process:** `runAs` is
  a mandatory argument of `resolveComposeSession` — the web path passes the
  authenticated caller, an internal caller without a user must
  **explicitly** name `SessionService.SYSTEM_OWNER` (resolves via
  `SessionService.actingUserId` to "no user" → `SecurityContext.SYSTEM`).
  For the **Agent** (`session.recipe`), the latter is **forbidden**: a
  freely-promptable process never runs with system authority, but always under
  a real principal with their grants. If a run encounters a Session
  with the same key but a **different owner** (shared `name:`/`app:` keys), it is
  closed and freshly created instead of reused — otherwise the new
  caller would inherit the grants of the previous owner. Continuity is thus per
  (Key, Owner); the same rule applies `SystemSessionResolver` to
  Scheduler `runAs` changes. If the run binds to a **real** chat process
  (active Session, Level-2 binding), the section does not apply — the existing
  process is used as before. Guaranteed file production continues via
  `python`/`exec` (direct Workspace-cwd). Node modules/Python deps come via
  a `node`/`python`-typed Workspace with `workspace.options.packages`
  (declarative package list, installed during provisioning — see §5).
- `spawn` is **fire-and-forget** (no blocking/output capture); for synchronous
  Workspace analysis with output file, use `llm`. Requires an owner process
  (LLM-`compose_run` always has one; chatless web run requires an active
  `session:` section, otherwise the Task fails cleanly with *"spawn task requires a
  process context"*). **`spawn` creates a new child process per run**
  (amnesic) — for sequential Agent runs, use `agent`.
- `agent` delivers its `prompt` as a **Turn** to the **Session Process** (which
  the `session:` section provides — with `session.recipe` it is the Agent,
  e.g., `arthur`). Because the Session Process is **stable** via `session.name`,
  each run continues **the same** conversation (memory continuity) —
  `session.clean: true` starts fresh. The Task **blocks until the response is available**
  (like any Compose Task → Run button remains busy/red, output appears
  complete): Completion via **Lane-Barrier** (the process Lane is serial, a
  no-op after the turn only runs afterwards — `LaneScheduler`), upper limit
  `deadlineSeconds` (default 300). After that, the Task knows the **concrete
  response message** and pins it as **`vance-process:<pid>/<msgId>` output**
  (not just the process ID — that would drift to a different response on the next run).
  The UI loads exactly this message (`GET /brain/{tenant}/process/{id}/messages`)
  and displays the ID. Without an active `session:`, the Task fails cleanly
  (*"agent task requires an enabled session"*).
- `llm` requires a declared output file; Recipe must be `internal: true`.

A Task returns its error via the result envelope
(`DamogranTaskResult.failure(...)`), not via exception — a failed
Task renders its error in the output region like a Jupyter traceback.

## 5. Workspace & Provisioning

The Workspace is a **named Workspace Root** (see
[work-target](work-target.md)). `workspace.type` is a *provisioning recipe*
(create venv, clone repo, `npm init`), **not a language lock** — you can run Python
in a `node` Workspace; it's just a directory. What the type controls is the
dependency-*capability* of the respective language.

Provisioning (`DamogranComposeService`):

- Find and **reuse** Workspace by `descriptor.label == workspace.name`;
  `clear: true` disposes an existing one first (then create empty); a type mismatch
  on reuse is a hard error.
- **`delete: true`** is a **terminal** special path **before** provisioning:
  dispose the Workspace (by label), if present, and return with `SUCCESS` +
  empty Task list — **idempotent** (if missing → No-op), no
  provisioning, no WorkTarget set, `type` irrelevant. The parser rejects `delete`
  combined with `clear`/`import`/`tasks`/`export` (fail-fast).
- New creation: `RootDirSpec` with `type`, `labelHint = name`,
  `deleteOnCreatorClose = false`, `creatorProcessId = "_damogran"` (stable,
  **project-scoped** creator — the Workspace is tied to the Project lifecycle, not
  the Compose process, allowing re-runs).
- `workspace.options` are passed **verbatim** as RootDir metadata to the
  `WorkspaceContentHandler` (handler-native keys, no mapping).
- **Deps-Provisioning:** `node`/`python`-Workspaces install a
  declarative package list from `workspace.options.packages` (list of specs:
  `numpy`, `pandas==2.0` or `lodash`, `axios@1.6`) during provisioning — pip into
  the venv, npm into `node_modules`. Declarative replacement for `requirements.txt` /
  `package.json`, which would only arrive via `import` **after** provisioning in a Compose.
  Installed **once** on new creation/`clear`; a reused Workspace retains them
  (package change requires `clear: true`). A spec with a leading `-` is rejected
  (option injection protection). The install runs synchronously during provisioning —
  for large deps, it counts towards run duration (async-run advantageous, §10).

**Lifespan:** as long as the Project is live on the Pod; disposed on
Project unload/suspend. Not Mongo-snapshotted, not guaranteed across Pod restarts.

## 6. WorkTarget

`workspace.target` sets the [WorkTarget](work-target.md) of the Compose process
(a persisted `work_target_set` side effect, not new Session state).
A separate `ComposeRunner`-Bean per Target (Registry by `target()`):
**WORK** (`WorkspaceComposeRunner`, server-side RootDir — full Task set)
as well as **CLIENT** (connected Foot) and **DAEMON** (named Daemon) via the
common `RemoteExecComposeRunner` base. Remote is deliberately minimal (no
managed Workspace, only `exec`-Tasks + Import/Export — see §7).

**Backends per Target — no `if(isClient)` branching in Tasks/Loop.** The
runner binds three per-Target SPIs into the `DamogranContext`, each with WORK and
Remote implementation:

| SPI | WORK | CLIENT/DAEMON |
|---|---|---|
| `ComposeFileIo` (Import/Export bytes) | `WorkspaceFileIo` (RootDir) | `RemoteFileIo` (`file_*`-tools, text) |
| `ComposeExec` (Shell) | `WorkspaceComposeExec` (`ExecManager`, jobId/Tail) | `RemoteComposeExec` (`exec_run`) |
| `ComposeGit` (`git:*`) | `WorkspaceComposeGit` (jgit/`GitService`) | `RemoteComposeGit` (`RemoteGit` via `ComposeExec`) |

Thus, `exec`-Task (`DamogranTaskSupport.runExecTask`, ONE implementation
for both runners) and `git:*`-Import/Export (via transport → `GitImporter`/
`GitExporter` → `ctx.git()`) are target-agnostic — the Task Beans **do not**
carry an `isWork()` check anymore; only `js`/`python`/`llm`/`tex` are bound to a WORK-Workspace
(no server-`workspacePath` → not executable). The mode change is
solely `workTargetService.set(...)` + the bound backends.

## 7. Import / Export (open SPI)

Import/Export are an **open SPI** like Tasks, dispatched by URI scheme
(`DamogranTransport` = Dispatcher, no schema switch in the core):

- **`DamogranImporter { Set<String> schemes(); doImport(ctx, entry) }`** —
  selected by schema of `entry.from()`.
- **`DamogranExporter { Set<String> schemes(); doExport(ctx, entry) }`** —
  selected by schema of `entry.to()`.

**Invariant:** the local side is always the Workspace — Import-`to` and
Export-`from` are always Workspace-relative; the remote/Document side carries the
schema. Protocol-specific additional fields (branch, message, ...) are in an
`options`-map on the entry.

Built-in Beans:

| Schema | Import | Export |
|---|---|---|
| `vance` | Document → Workspace (`DocumentService.loadContent`) | Workspace → Document (Text→`upsertText`, else `createOrReplaceBinary`, MIME via `DamogranMime`) |
| `http`/`https` | Fetch → Workspace | — |
| `git` | clone/pull → Workspace folder | commit (+push) from Workspace folder |

**`vance:`-path resolution** (three forms, `DamogranUri.resolveVance`):

- `vance:hello.tex` — same Project, **relative to the directory of the compose
  Document** (`baseDir`). In `documents/tex1` → `documents/tex1/hello.tex`
  (like the old tex-compose). `baseDir` comes from execution: for
  `composePath` the Doc directory; for inline-YAML the `composeBasePath`
  (Cortex: folder of the open Document; Workbook: the `_app.yaml` folder of the
  App — App-relative, independent of the Page/Section); otherwise root-relative.
- `vance:/reports/x.pdf` — same Project, **root-absolute** (leading slash).
- `vance://other-project/lib/x.cls` — **cross-project** (Authority = Project,
  root-relative there). Allowed only if the **run caller** (the user — directly via
  REST or via the Agent Session) has rights in the target Project: the Importer
  `enforce`s `Document READ` against the caller-`SecurityContext`, the Exporter
  writes as `WriteActor.user(caller)` (Chokepoint enforced WRITE/R4). `findByPath`
  itself checks **nothing** — authorization sits with the caller. Replaces the old tex-compose
  `CrossProjectFile` reference.

**git aspect.** git is deliberately **not** a Workspace type here (that remains
`GitHandler`, which as a type rarely fits, because Workspace handlers
are mutually exclusive — for script work you need node/python). Instead:
a stateless `GitService` (JGit + `GitAuthProvider`) with
`cloneOrPull`/`commitAndPush` on any `Path`; `GitImporter`/
`GitExporter` use it. Thus, any Workspace type can carry a git-cloned folder
without being "a git Workspace". Options:

```yaml
import:                                    # git = clone, or pull on re-run
  - from: git:https://github.com/acme/repo.git
    to: repo                               # subfolder in Workspace (local)
    branch: main                           # optional
    credentialAlias: gh                    # optional → GitAuthProvider
export:                                    # git = add-all + commit (+push)
  - from: repo                             # Workspace folder (git working tree)
    to: git:https://github.com/acme/repo.git
    branch: main
    message: "Update from Damogran"
    push: true                             # default true; false = commit only
    credentialAlias: gh
```

git-Export requires `from` to be a git working tree (cloned by git-Import
or a `type: git`-Workspace). More complex git operations remain `exec` matters.
Addons extend with further schemes (S3, gdrive, ...) through their own
Importer/Exporter Beans.

**Remote (CLIENT/DAEMON).** The `RemoteExecComposeRunner` handles Import/Export
itself (no jgit, no `WorkspaceService`): `vance:`/`http:` **text-based**
via the remote `file_*`-tools (`RemoteFileIo`), and **`git:*`** via the `git`
of the remote host via `exec_run` — `RemoteGit` builds the shell commands (Import =
idempotent clone-or-pull, Export = add-all + commit-if-changed + push
`HEAD[:branch]`, POSIX-quoted). If `git` is missing on the host → Non-Zero-Exit →
Run error. `credentialAlias` is **WORK-only** (Vault) and is rejected remotely;
there, the host's git credentials apply (ssh-Key / credential
helper). **Binary** copy remains WORK-only.

**Auth for `vance:` sources/targets:** on the **Run-Caller**, not on `findByPath` (which
checks nothing). Import `enforce`s `Document READ`, Export writes as
`WriteActor.user(caller)` → the DocumentService chokepoint decides on the
provider (R3/R4). An internal System-Run without a caller writes as SYSTEM.

## 8. Output Model (Notebook-like)

A Task delivers an output manifest: `{ status, outputs: [{path, kind, mime,
title}], error?, log? }`. The outputs are **transient and Workspace-sourced** —
not serialized into the Document, but freshly loaded from the Workspace via
Workspace-REST with each run. Pod restart / Project unload → Workspace gone →
Outputs gone, until re-execution (exactly like Jupyter after kernel restart).

- **Addressing:** each output carries a `vance-workspace:/<dir>/<path>`-URI
  (parallel to `vance:` for Documents). The client loads it via
  `GET /brain/{tenant}/projects/{project}/workspace/file`.
- **Rendering:** `ComposeOutput` (vance-face) renders Markdown/Text/Image/PDF
  by file type; **structured Vancetope Kinds** (records→table, tree, chart,
  …) via `resolveRenderer(kind,'inline')`, but only if the output **explicitly**
  declares a Kind (`outputs: [{ path: x.yaml, as: records }]`) — this way,
  only canonically formatted content passes through the Kind renderers, a raw `.csv`
  remains text. Cortex uses `ComposeOutput` directly; the Workbook block gets it
  injected via `provide('vance:compose-output-component', …)` (identical
  rendering, no REST coupling in `@vance/block-editor`).
- **Persistent results** are created via the `export` block (Document) —
  opt-in, after which the normal document-sourced path renders.
- **Refresh persistence via `$output:`:** The in-memory run result does not survive
  a browser refresh. Scanning the Workspace **does not** help — a
  named Workspace is **not exclusive** to a Compose (multiple Composes
  fire on it sequentially), so "file is there" does not prove that *this*
  Compose created it. Instead, a **successful** run writes the
  produced artifact list into the manifest itself, into a managed
  `$output:` block; upon (re)loading, it is read back and rendered, provided
  no fresh run `result` is available.

  ```yaml
  workspace: { name: my-work, type: temp }
  tasks: [ … ]

  # generated — last run outputs (do not edit)
  $output:
    - path: sorted.csv
      uri: vance-workspace:/my-work/sorted.csv
      kind: records
      title: Sorted
  ```

  - **Invisible to the Runner:** `$`-prefix keys are ignored by the
    `DamogranManifestParser` (like `$meta`) — `$output` is pure last-run cache,
    never execution-relevant.
  - **Writing without round-trip:** `$output` is a **managed, always
    last** block. After the run: cut out existing `$output:` block (from the line to
    EOF, including marker comment), append freshly serialized — the
    handwritten part above remains **byte-identical** (no
    comment/order losses). Cortex emits `update:doc` → Shell
    serializes (Identity) → 2s auto-save; the Workbook block writes via
    `updateAttributes({ yaml })` → Workpage auto-save.
  - **Only the list, no content:** `$output` only holds `vance-workspace:`-refs;
    `ComposeOutput` continues to load the content from the (transient) Workspace. If
    another Compose re-fires the same file between run and refresh, the list
    is correct, the content best-effort — true persistence only via `export:`.
  - **In-flight via `$run:`:** If the start provides a `runId` (run >30s), the UI
    parks it in a managed `$run:` block (instead of `$output:`; both are mutually
    exclusive) and **polls** `GET …/run/{runId}` every 3s — shows status +
    `currentTask` + **Tail** (live progress). On refresh, the UI reads `$run`,
    resumes polling; on completion → `$output` (success) or `$run`
    deleted (error / run lost after Pod restart). Cortex `ComposeView` +
    Workbook block share the logic. **Who writes the managed `$output:` block**
    depends on the trigger: for a **browser run** (▶) the client; for
    an **agent-triggered `compose_block_run`** the **server** (via
    `ComposeBlockCodec`, byte-identical) — the browser then only tracks such a run
    (signal + poll) and **does not** write `$output` itself (the server
    owns the write; the open editor receives it via `documents.changed`).
  - **Run Bar (Workbook Block):** ▶ starts; as long as the start REST is running
    (Phase 1, no `runId` yet) a busy "..." (nothing to kill); only with
    `runId` (Phase 2, polling) does it become ■ Stop → `cancelCompose(runId)` →
    server-side cancellation (kill). Next to it a
    "..." menu: **"Run All Until"** (all Compose-family blocks on the page —
    `vance-compose` **and** `vance-compose-*` — sequentially from top to here, each
    waiting for completion; `autoRun: false` is skipped, stops on first
    error), **"Clear Output"** (reset managed block + display of this block)
    and **"Clear All Output"** (clears the outputs of **all** Compose-family blocks on the
    page). Batch operations run via the shared **`useComposeBatch`**-
    Composable with **per-editor state**: the currently running block lights up
    (busy button, live tail, "(i/n)"), the others wait — not everything in the
    triggering block. The edit textarea grows with content (no scroller).
    The Cortex `ComposeView` mirrors ▶/"..."/■ **Run/Busy/Stop** + **"Clear Output"**
    (without "Run All Until" — there are no sibling blocks there).
  - **Script Blocks (`/compose-js` · `/compose-bash` · `/compose-python` · `/compose-r` · `/compose-agent`):**
    Compose blocks via the [block-extension-registry](../../planning/archive/block-extension-registry.md)
    (built-ins in `@vance/block-editor/builtins`, Fences `vance-compose-{js,bash,python,r,agent}`),
    limited to **exactly one Task** with fixed type (`js`/`exec`/`python`/`r`/`agent`, script field
    `code`/`command`/`prompt`). The **R-Block** (`/compose-r`, Task `r`, inline `code`) is
    WORK-only (Rserve-Daemon) — see Addon Task table above. Two panes: **Script** editor + still editable
    **Settings-YAML** (title/description/workspace/session/unknown). A script edit
    re-serializes the manifest with the Task normalized to the fixed type
    (other top-level **and** Task keys are preserved); a
    YAML edit re-normalizes on blur (foreign/additional Tasks overwritten). The
    **Agent Block** (`/compose-agent`, Task `agent`, Prompt in the script pane) merges
    the `session:` section (`scriptComposeCodec` `sessionForce`/`sessionDefaults`):
    **always** `session.enabled: true`, **default** `session.recipe: arthur` — the
    user-set Session fields (`name`, own `recipe`, `clean`) are
    preserved. The Session process is thus the Agent (§4); since the Task
    **blocks until the response is available**, Run button busy state and
    Output clear-on-start apply as with any Compose Task. `ComposeProcessOutput` then
    fetches the pinned response message from the `vance-process:<pid>/<msgId>` output
    (a fetch, not a poll) and displays the message ID. Run/Stop/Tail/Output are shared with `vance-compose` via the
    `useComposeRun`-Composable; the **same "..." menu palette** (**Run All Until** ·
    Clear Output · **Clear All Output**) via `useComposeBatch` — the `/compose-*`
    are thus on par with the full block. Host callbacks via provide/inject
    (`vance:compose-host`), as Registry nodes have no per-instance `configure()`.
  - **Code:** `postComposeRun`/`pollComposeRun`/`cancelComposeRun` +
    `read/writeComposeOutputs` + `read/writeComposeRun` in `@vance/shared` (Cortex)
    and mirrored in `@vance/block-editor` (`extensions/composeOutputs.ts` +
    Host callbacks `runCompose`/`pollCompose`/`cancelCompose`, as block-editor
    remains REST-/`@vance/shared`-decoupled).

**Workspace access & Pod routing:** The `WorkspaceController` routes read
accesses to the Project's home Pod. If the Project is unclaimed or the
home node is stale (no live endpoint), the Controller **adopts** the Project
to the local Pod (`ProjectManagerService.claimForLocalPod`, whose CAS accepts a
`null`/stale claim and only rejects a live foreign holder) and
serves locally — otherwise a 404 would occur, even if the file is local.

## 9. State Store (short-lived state across runs)

The named Workspace only persists **files** between runs — in-memory
**variables** (Python/JS locals, Bash env) are gone after each Task. The
**State Store** closes this gap for the four code-executing Tasks (`exec`,
`python`, `js`, `r`): a per-document, per-type managed directory, from which
the handler **deserializes** a `state` object before the run and then
**serializes** it, plus persisted **header/footer** code fragments that it
wraps around the script.

Soberly: State is **convention + auto-injected boilerplate over a
state file**, not a new persistence substrate. Character (intentional):
**short-lived** (lives in the Workspace, dies with `clear`/unload/Pod restart — like the
outputs), **opt-in** (without `state:`-op, no directory exists → no
persistence) and **isolated per document**.

### 9.1 `state:` section

Top-level next to `session:` — a **list of operations** that Damogran
processes **sequentially before the Tasks** (after provisioning/WorkTarget, before import):

```yaml
state:
  - delete: true            # deletes the COMPLETE store (all types); stands alone
  - type: python            # type required once init/header/footer are set
    init: true              # clears / creates the type folder empty
    header: |               # persisted prologue fragment (newly injected every run)
      import pandas as pd
    footer: ''              # persisted epilogue fragment (empty allowed)
```

| Entry | Effect | `type` |
|---|---|---|
| `{ delete: true }` | wipe of the entire `<docKey>/`-store (all types) | forbidden (stands alone) |
| `{ type: <t>, init: true }` | clears/creates the type folder empty | required |
| `{ type: <t>, header: … }` / `footer: …` | writes the file (creates folder) | required |

In **one** entry: `init` before `header`/`footer` writes. `type` is only
required for writing/clearing ops; the Task otherwise fetches its type folder
automatically. The parser is fail-fast (delete-alone, type-required,
`workspace.delete` excludes `state`). The "initial State-Compose" is a
Compose with only `state:` and no `tasks:`.

### 9.2 Storage & Activation

```
<workspace>/_damogran-state/<docKey>/<type>/{header, footer, cache.json|cache.env}
```

- **`_`-prefix = internal.** `docKey` is the **Compose Document identity** (the
  Doc path; for inline blocks, the Page path) — thus different
  Documents do **not** mix their state, while blocks of the same Page share it. The
  user axis falls out correctly for free (standalone file = per-(Project,User)-
  Workspace ⇒ user-isolated; Workbook App = per-App-Workspace ⇒ shared).
- **Activation = folder existence:** a code Task of type `T` is wrapped if
  `_damogran-state/<docKey>/<T>/` exists — otherwise plain run. `init`/`header`/
  `footer` creates, `delete` removes (no separate `enabled`).
- **Cache created lazily:** `init` does not create a cache; the first run
  deserializes "nothing" (`state = {}`), mutates, serializes.
- **Intra-run continuity for free:** two same-type Tasks in the same run share
  the state (Task 2 sees Task 1's writes).
- `docKey` source on REST run: `composePath` (or `composeBasePath` for inline);
  a pure inline-YAML run without Document identity has **no** state.

### 9.3 Wrapping per Type

Process per code Task: `deserialize → header → body → footer → serialize`. header/
footer are persisted **code** (newly injected every run), cache is the
persistent **`state` object** (JSON-round-tripped; only JSON-compatible values —
string/int/bool/list/map).

| Task | Serialization | Cache | FS |
|---|---|---|---|
| `exec` (bash) | Env-Delta (`declare -p` of new/changed vars against baseline snapshot) — wrapper runs via `bash` | `cache.env` | native |
| `python` | `json.load`/`json.dump` of a `state`-dict; body is inlined into a wrapper | `cache.json` | native |
| `r` | `jsonlite::fromJSON`/`write_json` of a `state`-list (`jsonlite` must be in R-Image); `setwd(RootDir)` | `cache.json` | native |
| `js` | **Handler-mediated** (server-side JS has no FS): Handler injects `cache.json` as `state`-literal, wrapper returns `JSON.stringify(state)`, Handler writes it back. **v1: JS-Output = serialized State** | `cache.json` | Handler |

`tex`/`llm`/`spawn`/`agent` carry **no** state (no user script to
wrap). All **WORK-only** — a `state:` on CLIENT/DAEMON is rejected.

### 9.4 `state-status`-Task

Inspects the store (renders like a notebook cell):

```yaml
tasks:
  - type: state-status
    for: python    # optional; missing = all types
    mode: info     # info (default: files + mtime + size) | header | footer | cache
```

## 10. Triggers

- **LLM Tool** `compose_block_run(id | path)` / `compose_block_clear_output(id | path)`
  — the **server-authoritative** path, so the Agent can *complete* a Compose block of a
  **Document** (not just edit it). Two forms: a top-level
  `kind: compose`-Document (entire Doc = Manifest) **or** an inline
  `vance-compose`-Fence in a Workpage — the user-**selected** block
  (`CortexTurnSelectionHolder`) or the only one; only this Fence is changed
  (`ComposeFenceLocator`). The run reads the **saved** Document (a
  `doc_edit` of the same turn is included → no race, no client roundtrip), executes
  the same async `runAsync`+`onDone` machinery as `compose_run` and writes
  the result **server-side** via `ComposeBlockCodec` into the managed
  `$output:` block (byte-identical to the browser's TS serialization) —
  via the same `DocumentService`-Writer-Identity path as the `doc_*`-tools, so
  that `documents.changed` fires with Agent identity and an open editor updates
  live. `compose_block_clear_output` strips `$output:`/`$run:`. During
  the run, an ephemeral `compose-run` signal is sent over the
  [`signals`-channel](signals-channel.md) to open viewers (status `running`/`done`/
  `failed`) — **no** Document write for the transient state. LLM contract in
  Manual `damogran-compose.md`. History: `planning/agent-compose-run.md`.
- **LLM Tool** `compose_run(composePath | composeYaml)` — **async**: short run
  inline, long (>15s fast-path) → `{ runId, running:true }` + a
  `COMPOSE_FINISHED`-ProcessEvent (payload `runId`/`status`/`result`) to the
  calling Process, as soon as it's finished (`ComposeRun.onDone` →
  `EngineMessageRouter.dispatch`). This allows a model Process to end the turn
  and sleep for hours waiting for the wakeup (instead of blocking/polling).
- **REST (async)** `POST /brain/{tenant}/compose/run` — starts a
  **background run** (`runId`, in-Pod-`ComposeRunRegistry`) and waits for a
  fast-path (30s): finished → result **inline** (existing shape + `runId`,
  `running:false`); still running → `{ runId, running:true, status, workspace,
  currentTaskIndex }`. `GET /brain/{tenant}/compose/run/{runId}?projectId=…`
  polls: status + `currentTask` + **`tail`** (last lines of the running
  Exec job, live from `ExecManager.tail` — **stdout + stderr merged**, as many
  long-runners write their progress to stderr) + on completion the result shape.
  The UI shows the tail continuously in Phase 2 (placeholder until first output).
  `POST …/run/{runId}/cancel?projectId=…` **cancels**: `ComposeRun.requestCancel()`
  (runner stops before the next Task) + `ExecManager.kill` of the running
  Exec job (a long-runner stops immediately instead of waiting for the deadline).
  In-Pod (Pod restart loses the run). Body additionally `{ projectId,
  composePath | composeYaml, composeBasePath?, sessionId? }`. With `sessionId`
  the run binds to the **primary chat Process** of this Session (the Compose
  sets *its* WorkTarget → the Workspace is shared with what happens in the chat;
  variant a). The Cortex `compose`-view and the Workbook block automatically pass
  the active Cortex `sessionId` (`provide('vance:session-id')` in
  EditorApp). Without a usable chat Process (no `sessionId`, foreign Session, or
  no `chatProcessId` yet) it depends on the **`session:` section** of the manifest:
  missing/disabled → **process-less** (`processId = null`, no `spawn`, `js` with empty
  Tool Surface — avoids an idle process that `EXEC_FINISHED` events
  would wake up and cost an LLM turn); enabled → chatless
  **Session Process** (`DamogranProcessResolver`) with WorkTarget tools on the
  Workspace. Identity: `session.name` (stable → continuity), otherwise **per App**
  (Workbook App folder via `appKey` —
  collaborative, shared Workspace, Presence) or **per (Project, User)** for a
  standalone `compose`-file (a user executes their files serially). Thus
  parallel runs of different Apps/Users do not collide on the shared
  WorkTarget.
- **Cortex**: Kind `compose` opens with **Edit** tab (raw YAML editor,
  editable/savable) + **View** tab (Run + Output region). Selectable as Kind `compose`
  in the New Document dialog (YAML-MIME).
- **Workbook**: inline `vance-compose`-block (slash `/compose`). The Fence body
  *is* the Compose-YAML (inline editable); "Run compose" posts the current
  content and renders the outputs below.

## 11. Architectural Placement

- Core in `vance-brain`, package `de.mhus.vance.brain.damogran`:
  `DamogranManifest`(+Parser), `DamogranTask`-SPI + `DamogranTaskExecutor`,
  `DamogranComposeService` (Dispatcher) → `ComposeRunner`-SPI (Bean per
  `workspace.target`): `WorkspaceComposeRunner` (WORK — Provision/Import/Tasks/
  Export) + `ClientComposeRunner`/`DaemonComposeRunner` (CLIENT/DAEMON — exec via
  `client_exec_run` + text-`import`/`export`, no managed Workspace; common
  base `RemoteExecComposeRunner`; DAEMON-name = `workspace.name`). Import/export
  is target-agnostic via `ComposeFileIo` on the Context (`WorkspaceFileIo` =
  server-RootDir · `RemoteFileIo` = `file_*`-tools) — thus the
  Remote-Runner also uses the Import/Export-SPI (`DamogranImporter`/
  `DamogranExporter`) + `DamogranTransport`-Dispatcher + Built-in-Beans
  (`VanceDocumentImporter`/`HttpImporter`/`VanceDocumentExporter`,
  `GitImporter`/`GitExporter` on `GitService`), Built-in-Task-Beans,
  `ComposeRunTool`, `ComposeController`, `DamogranMime`/`DamogranResponse`/
  `DamogranUri`/`DamogranWorkspaceIo`.
- **State (§9):** `DamogranStateService` (data ownership over `_damogran-state/`,
  `applyOps`/`resolve`/`listTypes`) + `StateStatusDamogranTask`. `state:` is read by
  the parser (`StateSpec`), `docKey` rides as `stateKey` on `ComposeRun`
  into the `DamogranContext`; `WorkspaceComposeRunner` calls `applyOps` before import.
  Wrapping in `ExecDamogranTask`/`PythonDamogranTask`/`JsDamogranTask` +
  `RDamogranTask` (Addon). `RemoteExecComposeRunner` rejects `state:`.
- Kind `compose` in `BuiltInKindHandlers` (`vance-shared`).
- Client: `compose`-Kind-Editor (`ComposeView`/`ComposeOutput`) in `vance-face`;
  `vance-compose`-block in `@vance/block-editor`; Host-`runCompose` in the
  Workbook-Addon.
- Addon-Task `tex-task` as `DamogranTask`-Bean in the tex-Addon.

## 12. Open (v2)

- **CLIENT/DAEMON**: **binary** import/export (today remote only **text** via
  `vance:`/`http:` → `vance:`; `git:*` already runs via remote-exec).
- `spawn`-Task with blocking/output capture.
- **State:** separate JS log channel (today JS output = serialized State);
  file lock for concurrent runs on the same state (today best-effort,
  last one wins); remote state (transport state file to host).

**Deliberately not:** managed Remote-Workspace (lifecycle/confinement for CLIENT/
DAEMON). Not the use case — confinement is already handled by the Foot sandbox
(`permissions.yaml`), working directory lifecycle is handled by the shell commands themselves.
The effort (rebuilding WORK-`WorkspaceService` on the Foot/Daemon) is
disproportionate. If ergonomics are ever needed: an optional
`workspace.options.cwd` that the Remote-Runner passes to `exec_run` — without
confinement/lifecycle.

*(Completed: JS-Tool-Surface (`vance.tools.list/has` + `vance.files`); chatless
carrier process; CLIENT- **and** DAEMON-Target (exec) via `ComposeRunner`-SPI;
`import`/`export` target-agnostic via `ComposeFileIo` — also remote;
**async-Runner** — REST-poll + `$run`/Tail-UI + LLM-`COMPOSE_FINISHED`-Wakeup;
chatless carrier **per App / per (Project,User)** (no WorkTarget collision);
**Deps-Provisioning** — `node`/`python`-Workspace installs `options.packages`
during provisioning (npm/pip, once, option injection protection); **remote `git:*`
import/export** via the host's `git` per exec (`RemoteGit`, clone-or-pull /
commit-push, `credentialAlias` WORK-only); **State Store** (§9) — `exec`/`python`/
`js`/`r` carry JSON-`state` + header/footer across runs of the same document,
`DamogranStateService` + `_damogran-state/<docKey>/<type>/`, WORK-only,
`state-status`-Task.)*

---

Implementation history: `planning/damogran-system.md`.
