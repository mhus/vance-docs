---
title: "Damogran — Workspace Compose"
parent: Specs
permalink: /specs/damogran-system
---

<!-- AUTO-GENERATED from specification/public/en/damogran-system.md — do not edit here. -->

---
# Damogran — Workspace Compose

> A lightweight, linear batch runner over a named Workspace:
> provision Workspace → import Documents → execute a series of Tasks
> → export results. A Compose is a Document (Kind
> `compose`) **or** a YAML text; execution is transient (Work-in-
> Progress: test, repeat individual Tasks, have an LLM review).
>
> See also: [work-target](/specs/work-target) (File/Exec-Targets + Workspace-
> Roots), [cortex](/specs/cortex) (Run UI), [doc-kind-workpage](/specs/doc-kind-workpage)
> / [app-workbook](/specs/app-workbook) (inline `/compose`-block),
> [light-llm-service](/specs/light-llm-service) (the `llm`-Task),
> [vogon-engine](/specs/vogon-engine) / [workflows](/specs/workflows) (the orchestrators
> above it).

---

## 1. Purpose & Character

Damogran fills the gap between "calling a single tool" and "orchestrating a
workflow": it provisions a **Workspace**, populates it with files, runs a
sequence of steps on it, and retrieves results. Typical processes: compile a
LaTeX source to PDF, prepare data and run an analysis script, have an LLM
summarize files in the Workspace.

The character is **Work-in-Progress**: the Workspace is named and survives
between runs (within a work Session), allowing files to be edited, individual
Tasks to be re-fired, and iteration. No days/weeks-long runs — that is
[Magrathea](/specs/workflows).

**Naming.** Damogran is the remote planet where the *Heart of Gold* was secretly
built and launched — a transient, isolated build and launch site. Convention:
**Location = System without a Brain (Infrastructure), Character = LLM Agent.**
Damogran *calls* LLMs (as a Task type), but *is not* one — hence a location, like Magrathea.

## 2. Delimitation: Damogran vs. Vogon vs. Magrathea

| | **Vogon** | **Magrathea** | **Damogran** |
|---|---|---|---|
| What | ThinkEngine (Peer of Arthur/Ford) | Workflow Subsystem *above* the Engines | Batch Runner *below* the Orchestrators |
| Lifecycle | within a Session | cross-session, days/weeks-long, journaled | lightweight, quasi-synchronous, session-transient |
| Unit of a Step | LLM Worker Spawn per Phase | 9 Task Types (agent/shell/script/tool/…) | exec / js / python / spawn / llm / addon |
| Control Flow | Gates, Loops, Forks, Checkpoints | on/catch/retry, bounds, condition | **linear** (no Loops/Gates/Branches) |
| LLM Role | Steps *are* LLM | agent_task spawns LLM | calls LLM only as a Task type |
| First-Class | LLM Orchestration | State Machine | **Workspace** (provision + import/export) |

Damogran sits **below** the orchestrators and **above** the shared
execution layer (`ActionExecutorRegistry`/`TriggerAction`,
`LightLlmService`, `WorkspaceService`, `WorkTargetDispatcher`). It does not
duplicate orchestration but borrows step execution from the layer that Magrathea
also uses. If loops/branching are needed, call a Compose as *one step* from
Vogon/Magrathea.

## 3. Manifest Schema

```yaml
title: My Compose           # optional; shown in the View above the "Run" button
description: What it does      # optional; same
showSource: false           # optional, UI only: true = also show YAML in the
                            #   rendered Workbook page (Default: off)
autoRun: true               # optional, UI only: false = skip during "Run All Until"
                            #   (can be manually continued via ▶)
session:                    # optional Mapping (missing = no process, process-less):
  enabled: true             #   default true if section present; false = explicitly off
  name: my-agent            #   optional: stable process identity (Re-Run = continuity)
  recipe: arthur            #   optional: makes the process an Agent (agent-Task);
                            #     missing = silent WORK-Holder (file/exec-Tools, inert)
  clean: false              #   true = reset process before run (fresh start)
output:                     # optional, UI only: fixed output list — overrides
  - path: out.txt          #   the (sometimes wrong/empty) run outputs; then
    uri: vance-workspace:/my-work/out.txt   #   NO $output is written
    kind: text
workspace:
  name: my-workspace        # named, retrievable Workspace (required)
  type: temp                # temp | git | node | python | ephemeral | <addon>
  clear: false              # true = clear before provisioning, then create new empty
  delete: false             # true = discard + stop Workspace (terminal, see below)
  options:                  # verbatim as handler metadata (handler-native Keys)
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
`title`/`description` (pure metadata — ignored by the runner, shown in the web UI
in the view above the "Run" button), the **`session`** section (missing = no
process; a mapping provides a Session process, see §4) and two **UI-only** flags
(ignored by the runner): `showSource` (the rendered Workbook page by default
shows **only** title/description + Run + Outputs — no YAML; `showSource: true`
also displays the source there; the Cortex `compose` editor separates Edit/View
anyway) and `autoRun` (`false` = skipped during the Workbook menu **"Run All
Until"**, still manually startable via ▶) and `output` (fixed output list
`{path, uri, kind?, title?}` — overrides the outputs reported by the run/`$output`
for display; if `output` is set, the run **does not** write `$output`, but uses
this list. For cases where auto-detection provides the wrong or no artifact). The
run bar of the Workbook block is a ▶/■ toggle (Run or Stop in a running run) plus
a "…" menu ("Run All Until", "Clear Output", "Clear All Output" — shared across
all Compose-family blocks, see §8). A Task item carries a `type` discriminator
(→ `DamogranTask` bean) plus type-specific fields. `output:` (a string) and
`outputs:` (list of strings or `{path, kind|as, title}` maps) declare the files
produced by the Task.

Parsing is fail-fast (`DamogranManifestParser`). The parser is pure and
independent of the caller.

## 4. Task Types

Task types are an **open SPI** (`DamogranTask`, one Spring bean per `type()` —
pattern like `SearchProtocol`/`KindHandler`). Deliberately **not** a
`TriggerAction` variant, as `TriggerAction` in `vance-api` is `sealed` and
cannot be extended by Addons. Built-in beans delegate downwards to the shared
execution layer — **no** parallel executor.

| Type | Does | Delegates to |
|---|---|---|
| `exec` | Shell command in Workspace | `ExecManager` |
| `js` | Workspace JS file (or inline `code`) | `ScriptActionExecutor` (WORKSPACE) |
| `python` | Python file (or inline `code`) | `ExecManager` (`.venv/bin/python` else `python3`) |
| `spawn` | Worker process (Recipe, fire-and-forget, new child process per Run) | `SpawnActionExecutor` / `TriggerAction.Recipe` |
| `agent` | Prompt as **Turn** to the Session process, **blocks** until response (Lane barrier); pins `vance-process:<pid>/<msgId>` | `EngineMessageRouter` + `LaneScheduler` |
| `llm` | Single-shot LLM call → Output file | `LightLlmService` |
| `tex-task` | LaTeX → PDF (Addon) | `Tex2PdfExecutor` |

LaTeX runs **exclusively** via `tex-task` — there is no standalone `tex2pdf`
tool and no `tex-compose` Kind anymore (fully migrated to Compose). `TexService`
only resolves the executor; file transport is handled by the `import` block.

**Time limit (`exec`/`python`, WORK + remote):** `deadlineSeconds` (alias
`timeoutSeconds`, default 600) is a **hard-kill deadline** — `ExecManager` sets
`SubmitOptions.withDeadline(...)`, the watchdog kills the subprocess on expiry,
and the Task fails cleanly (`status=TIMED_OUT`), **no orphaned process**. The
runner blocks until end-or-kill (`waitMs` = Deadline + Grace); a fast command
returns immediately. `DamogranTaskSupport` centralizes default + parsing
(`execDeadlineSeconds`). **`deadlineSeconds: 0` = no kill** — runs until natural
end (for long-runners; only useful in async-Run, otherwise the fast-path wait
blocks). The REST path is **async** (see §9); the LLM `compose_run` tool path is
still synchronous (push-wakeup = §11 open).

**v1 limits (intentional):**

- All built-ins are **WORK-only**.
- `js` calls `vance.tools.call(...)` with the **Tool Surface of the bound
  Process** (§3.5.6 in `script-engine.md`): `ScriptActionExecutor` resolves it
  via `ThinkEngineService.newContext(process).tools()` if the run is bound to a
  Process (active chat Session, Level-2 binding). This allows JS to call
  file/other tools, **provided the Engine/Recipe allow-set contains them** — so
  not in a pure chat (eddie, without `file_*`). **Chatless**, the web path binds
  to a project-scoped **Session Process** (`DamogranProcessResolver`, System
  Session `_damogran`, inert in `INIT` status, never lane-driven) **only if the
  `session:` section is enabled**, with `allowedToolsOverride = WORK_TARGET` —
  then the Compose gets the `file_*`/`exec_*` tools on its Workspace. **Without
  a `session:` section**, the chatless run is **process-less** (`processId =
  null`): `js` then sees an **empty Tool Surface** (`vance.files.isEnabled()` →
  `false`, return value continues), which is the intended degradation. Reason for
  the default: a process for every button run would be woken up by
  `EXEC_FINISHED` events of the Compose `exec` tasks and burn an LLM turn to no
  effect — the `WorkspaceComposeRunner` also does not register an Exec Owner
  without a process (`pushCompletionIfTracked` no-op). Process identity:
  `session.name` (stable across re-runs → memory continuity) or per-App/per-User
  fallback; `session.clean: true` discards the process + its conversation before
  the run. If the run binds to a **real** chat Process (active Session, Level-2
  binding), the section does not apply — the existing process is used as before.
  Guaranteed file production continues via `python`/`exec` (direct Workspace
  cwd). Node modules/Python deps come via a `node`/`python`-typed Workspace with
  `workspace.options.packages` (declarative package list, installed during
  provisioning — see §5).
- `spawn` is **fire-and-forget** (no blocking/output capture); for synchronous
  Workspace analysis with output file, use `llm`. Requires an owner Process (LLM
  `compose_run` always has one; chatless web run requires an active `session:`
  section, otherwise the Task fails cleanly with *"spawn task requires a process
  context"*). **`spawn` creates a new child process per run** (amnesic) — for
  sequential agent runs, use `agent`.
- `agent` delivers its `prompt` as a **Turn** to the **Session Process** (which
  the `session:` section provides — with `session.recipe` it is the Agent, e.g.,
  `arthur`). Because the Session Process is **stable** via `session.name`, each
  run continues the **same** conversation (memory continuity) — `session.clean:
  true` starts fresh. The Task **blocks until the response is available** (like
  any Compose Task → Run button remains busy/red, output appears complete):
  completion via **Lane barrier** (the process Lane is serial, a no-op after the
  Turn only runs afterwards — `LaneScheduler`), upper limit `deadlineSeconds`
  (default 300). Afterwards, the Task knows the **concrete response message** and
  pins it as **`vance-process:<pid>/<msgId>` output** (not just the process ID —
  that would drift to a different response on the next run). The UI loads exactly
  this message (`GET /brain/{tenant}/process/{id}/messages`) and displays the ID.
  Without an active `session:` the Task fails cleanly (*"agent task requires an
  enabled session"*).
- `llm` requires a declared output file; Recipe must be `internal: true`.

A Task returns its error via the result envelope
(`DamogranTaskResult.failure(...)`), not via exception — a failed Task renders
its error in the output region like a Jupyter traceback.

## 5. Workspace & Provisioning

The Workspace is a **named Workspace Root** (see
[work-target](/specs/work-target)). `workspace.type` is a *provisioning recipe*
(create venv, clone repo, `npm init`), **not a language lock** — you can run
Python in a `node` Workspace; it's just a directory. What the type controls is
the dependency *capability* of the respective language.

Provisioning (`DamogranComposeService`):

- Find and **reuse** Workspace by `descriptor.label == workspace.name`; `clear:
  true` disposes an existing one first (then create new empty); a type mismatch
  on reuse is a hard error.
- **`delete: true`** is a **terminal** special path **before** provisioning:
  dispose the Workspace (by label), if present, and return with `SUCCESS` + empty
  Task list — **idempotent** (if missing → no-op), no provisioning, no WorkTarget
  set, `type` irrelevant. The parser rejects `delete` combined with
  `clear`/`import`/`tasks`/`export` (fail-fast).
- New creation: `RootDirSpec` with `type`, `labelHint = name`,
  `deleteOnCreatorClose = false`, `creatorProcessId = "_damogran"` (stable,
  **project-scoped** creator — the Workspace is tied to the project lifecycle, not
  the Compose process, allowing re-runs).
- `workspace.options` are passed **verbatim** as RootDir metadata to the
  `WorkspaceContentHandler` (handler-native Keys, no mapping).
- **Deps Provisioning:** `node`/`python` Workspaces install a declarative package
  list from `workspace.options.packages` (list of specs: `numpy`, `pandas==2.0`
  or `lodash`, `axios@1.6`) during provisioning — pip into the venv, npm into
  `node_modules`. Declarative replacement for `requirements.txt` /
  `package.json`, which would only arrive via `import` **after** provisioning in
  a Compose. Installed **once** on new creation/`clear`; a reused Workspace
  retains them (package change requires `clear: true`). A spec with a leading `-`
  is rejected (option injection protection). The install runs synchronously
  during provisioning — for large deps, it counts towards run duration (async-Run
  advantageous, §9).

**Lifespan:** as long as the project is live on the Pod; disposed on project
unload/suspend. Not Mongo-snapshotted, not guaranteed across Pod restarts.

## 6. WorkTarget

`workspace.target` sets the [WorkTarget](/specs/work-target) of the Compose process
(a persisted `work_target_set` side effect, not new Session state). A separate
`ComposeRunner` bean per Target (Registry by `target()`): **WORK**
(`WorkspaceComposeRunner`, server-side RootDir — full Task set) as well as
**CLIENT** (connected Foot) and **DAEMON** (named Daemon) via the common
`RemoteExecComposeRunner` base. Remote is deliberately minimal (no managed
Workspace, only `exec` tasks + Import/Export — see §7).

**Backends per Target — no `if(isClient)` branching in Tasks/Loop.** The runner
binds three per-Target SPIs into the `DamogranContext`, each with WORK and
Remote implementation:

| SPI | WORK | CLIENT/DAEMON |
|---|---|---|
| `ComposeFileIo` (Import/Export bytes) | `WorkspaceFileIo` (RootDir) | `RemoteFileIo` (`file_*`-Tools, text) |
| `ComposeExec` (Shell) | `WorkspaceComposeExec` (`ExecManager`, jobId/Tail) | `RemoteComposeExec` (`exec_run`) |
| `ComposeGit` (`git:*`) | `WorkspaceComposeGit` (jgit/`GitService`) | `RemoteComposeGit` (`RemoteGit` via `ComposeExec`) |

Thus, `exec` Task (`DamogranTaskSupport.runExecTask`, ONE implementation for
both runners) and `git:*` Import/Export (via transport → `GitImporter`/
`GitExporter` → `ctx.git()`) are target-agnostic — the Task beans no longer
carry an `isWork()` check; only `js`/`python`/`llm`/`tex` are bound to a WORK
Workspace (no server-`workspacePath` → not executable). The mode change is
solely `workTargetService.set(...)` + the bound backends.

## 7. Import / Export (open SPI)

Import/Export, like Tasks, are an **open SPI**, dispatched by URI schema
(`DamogranTransport` = Dispatcher, no schema switch in the core):

- **`DamogranImporter { Set<String> schemes(); doImport(ctx, entry) }`** —
  selected by schema of `entry.from()`.
- **`DamogranExporter { Set<String> schemes(); doExport(ctx, entry) }`** —
  selected by schema of `entry.to()`.

**Invariant:** the local side is always the Workspace — Import `to` and Export
`from` are always workspace-relative; the Remote/Document side carries the
schema. Protocol-specific additional fields (branch, message, …) are in an
`options` map on the Entry.

Built-in beans:

| Schema | Import | Export |
|---|---|---|
| `vance` | Document → Workspace (`DocumentService.loadContent`) | Workspace → Document (Text→`upsertText`, else `createOrReplaceBinary`, MIME by `DamogranMime`) |
| `http`/`https` | Fetch → Workspace | — |
| `git` | clone/pull → Workspace folder | commit (+push) from Workspace folder |

**`vance:` path resolution** (three forms, `DamogranUri.resolveVance`):

- `vance:hello.tex` — same project, **relative to the directory of the compose
  Document** (`baseDir`). In `documents/tex1` → `documents/tex1/hello.tex` (like
  the old tex-compose). `baseDir` comes from execution: for `composePath`, the
  Doc directory; for inline-YAML, the `composeBasePath` (Cortex: folder of the
  open Document; Workbook: the `_app.yaml` folder of the App — App-relative,
  independent of the Page/Section); otherwise root-relative.
- `vance:/reports/x.pdf` — same project, **root-absolute** (leading slash).
- `vance://other-project/lib/x.cls` — **cross-project** (Authority = Project,
  root-relative there). Allowed only if the **Run Caller** (the user — directly
  via REST or via the Agent Session) has rights in the target project: the
  Importer `enforce`s `Document READ` against the Caller `SecurityContext`, the
  Exporter writes as `WriteActor.user(caller)` (Chokepoint enforced WRITE/R4).
  `findByPath` itself checks **nothing** — authorization sits with the Caller.
  Replaces the old tex-compose `CrossProjectFile` reference.

**git aspect.** git is deliberately **not** a Workspace type here (that remains
`GitHandler`, which as a type rarely fits, because Workspace handlers are mutually
exclusive — for script work, you need node/python). Instead: a stateless
`GitService` (JGit + `GitAuthProvider`) with `cloneOrPull`/`commitAndPush` on
any `Path`; `GitImporter`/`GitExporter` use it. Thus, any Workspace type can
contain a git-cloned folder without "being a git Workspace". Options:

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

git export requires `from` to be a git working tree (cloned by git import or a
`type: git` Workspace). More complex git operations remain `exec` matters.
Addons extend with further schemas (S3, gdrive, …) through their own
Importer/Exporter beans.

**Remote (CLIENT/DAEMON).** The `RemoteExecComposeRunner` handles Import/Export
itself (no jgit, no `WorkspaceService`): `vance:`/`http:` **text-based** via the
remote `file_*` tools (`RemoteFileIo`), and **`git:*`** via the remote host's
`git` via `exec_run` — `RemoteGit` builds the shell commands (Import = idempotent
clone-or-pull, Export = add-all + commit-if-changed + push `HEAD[:branch]`,
POSIX-quoted). If `git` is missing on the host → non-zero exit → run error.
`credentialAlias` is **WORK-only** (Vault) and is rejected remotely; there, the
host's git credentials apply (ssh-Key / credential helper). **Binary** copy
remains WORK-only.

**Auth for `vance:` sources/targets:** on the **Run Caller**, not on
`findByPath` (which checks nothing). Import `enforce`s `Document READ`, Export
writes as `WriteActor.user(caller)` → the DocumentService chokepoint decides on
the provider (R3/R4). An internal System Run without a Caller writes as SYSTEM.

## 8. Output Model (Notebook-like)

A Task delivers an output manifest: `{ status, outputs: [{path, kind, mime,
title}], error?, log? }`. The outputs are **transient and workspace-sourced** —
not serialized into the Document, but loaded fresh from the Workspace via the
Workspace REST on each run. Pod restart / Project unload → Workspace gone →
Outputs gone, until re-execution (exactly like Jupyter after kernel restart).

- **Addressing:** each output carries a `vance-workspace:/<dir>/<path>` URI
  (parallel to `vance:` for Documents). The client loads it from
  `GET /brain/{tenant}/projects/{project}/workspace/file`.
- **Rendering:** `ComposeOutput` (vance-face) renders Markdown/Text/Image/PDF
  by file type; **structured Vancetope Kinds** (records→table, tree, chart, …) via
  `resolveRenderer(kind,'inline')`, but only if the output **explicitly**
  declares a Kind (`outputs: [{ path: x.yaml, as: records }]`) — this way, only
  canonically formatted content passes through the Kind renderers, a raw `.csv`
  remains text. Cortex uses `ComposeOutput` directly; the Workbook block gets it
  injected via `provide('vance:compose-output-component', …)` (identical
  rendering, no REST coupling in `@vance/block-editor`).
- **Persistent results** are created via the `export` block (Document) — opt-in,
  after which the normal document-sourced path renders.
- **Refresh persistence via `$output:`:** The in-memory run result does not
  survive a browser refresh. Scanning the Workspace **does not** help — a named
  Workspace is **not exclusive** to one Compose (multiple Composes fire on it
  sequentially), so "file is there" does not prove that *this* Compose created
  it. Instead, a **successful** run writes the produced artifact list into the
  manifest itself, into a managed `$output:` block; on (re)load, it is read back
  and rendered, provided no fresh run `result` is available.

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
  - **Writing without round-trip:** `$output` is a **managed, always latest**
    block. After the run: cut out existing `$output:` block (from that line to
    EOF, including marker comment), append freshly serialized — the handwritten
    part above remains **byte-identical** (no comment/order loss). Cortex emits
    `update:doc` → Shell serializes (Identity) → 2s auto-save; the Workbook block
    writes via `updateAttributes({ yaml })` → Workpage auto-save.
  - **Only the list, no content:** `$output` only holds `vance-workspace:` refs;
    `ComposeOutput` continues to load the content from the (transient) Workspace.
    If another Compose fires the same file anew between run and refresh, the list
    is correct, the content best-effort — true persistence only via `export:`.
  - **In-flight via `$run:`:** If the start provides a `runId` (run >30s), the UI
    parks it in a managed `$run:` block (instead of `$output:`; both are mutually
    exclusive) and **polls** `GET …/run/{runId}` every 3s — shows status +
    `currentTask` + **Tail** (live progress). On refresh, the UI reads `$run`,
    resumes polling; on completion → `$output` (success) or `$run` deleted (error
    / run lost after Pod restart). Cortex `ComposeView` + Workbook block share
    the logic. **Who writes the managed `$output:` block** depends on the trigger:
    for a **browser run** (▶) the client; for an **agent-triggered
    `compose_block_run`** the **server** (via `ComposeBlockCodec`, byte-identical)
    — the browser then only tracks such a run (signal + poll) and **does not**
    write `$output` itself (the server owns the write; the open editor receives
    it via `documents.changed`).
  - **Run Bar (Workbook Block):** ▶ starts; as long as the start REST is running
    (Phase 1, no `runId` yet) a busy "…" (nothing to kill); only with `runId`
    (Phase 2, polling) does it become ■ Stop → `cancelCompose(runId)` → server-side
    cancellation (kill). Next to it, a "…" menu: **"Run All Until"** (all
    Compose-family blocks on the page — `vance-compose` **and**
    `vance-compose-*` — sequentially from top to here, each waiting for
    completion; `autoRun: false` is skipped, stops on first error), **"Clear
    Output"** (reset managed block + display of this block) and **"Clear All
    Output"** (clears the outputs of **all** Compose-family blocks on the page).
    Batch operations run via the shared **`useComposeBatch`** composable with
    **per-editor state**: the currently running block lights up (busy button,
    live tail, "(i/n)"), the others wait — not everything in the triggering
    block. The edit textarea grows with content (no scroller). The Cortex
    `ComposeView` mirrors ▶/"…"/■ **Run/Busy/Stop** + **"Clear Output"** (without
    "Run All Until" — there are no sibling blocks there).
  - **Script Blocks (`/compose-js` · `/compose-bash` · `/compose-python` ·
    `/compose-agent`):** Compose blocks via the
    block-extension-registry
    (built-ins in `@vance/block-editor/builtins`, Fences
    `vance-compose-{js,bash,python,agent}`), limited to **exactly one Task** with
    a fixed type (`js`/`exec`/`python`/`agent`, script field `code`/`command`/`prompt`).
    Two panes: **Script** editor + still editable **Settings YAML**
    (title/description/workspace/session/unknown). A script edit re-serializes the
    manifest with the Task normalized to the fixed type (other top-level **and**
    Task keys are preserved); a YAML edit re-normalizes on blur (foreign/additional
    Tasks overwritten). The **Agent Block** (`/compose-agent`, Task `agent`,
    Prompt in script pane) merges the `session:` section (`scriptComposeCodec`
    `sessionForce`/`sessionDefaults`): **always** `session.enabled: true`,
    **default** `session.recipe: arthur` — the user-set Session fields (`name`,
    own `recipe`, `clean`) are preserved. The Session process is thus the Agent
    (§4); since the Task **blocks until the response is available**, run button
    busy state and output clear-on-start apply as with any Compose Task.
    `ComposeProcessOutput` then fetches the pinned response message from the
    `vance-process:<pid>/<msgId>` output (one fetch, no poll) and displays the
    message ID. Run/Stop/Tail/Output share with `vance-compose` via the
    `useComposeRun` composable; the **same "…" menu palette** (**Run All Until** ·
    Clear Output · **Clear All Output**) via `useComposeBatch` — the `/compose-*`
    are thus on par with the full block. Host callbacks via provide/inject
    (`vance:compose-host`), as Registry nodes have no per-instance `configure()`.
  - **Code:** `postComposeRun`/`pollComposeRun`/`cancelComposeRun` +
    `read/writeComposeOutputs` + `read/writeComposeRun` in `@vance/shared`
    (Cortex) and mirrored in `@vance/block-editor` (`extensions/composeOutputs.ts`
    + Host callbacks `runCompose`/`pollCompose`/`cancelCompose`, as block-editor
    remains REST-/`@vance/shared`-decoupled).

**Workspace Access & Pod Routing:** The `WorkspaceController` routes read
accesses to the project's home Pod. If the project is unclaimed or the home node
is stale (no live endpoint), the Controller **adopts** the project to the local
Pod (`ProjectManagerService.claimForLocalPod`, whose CAS accepts a `null`/stale
claim and only rejects a live foreign holder) and serves locally — otherwise a
404 would occur, even if the file is local.

## 9. Triggers

- **LLM Tool** `compose_block_run(id | path)` / `compose_block_clear_output(id | path)`
  — the **server-authoritative** path, so the Agent *completes* a Compose block
  of a **Document** (not just edits it). Two forms: a top-level `kind: compose`
  Document (entire Doc = Manifest) **or** an inline `vance-compose` fence in a
  Workpage — the user **selected** block (`CortexTurnSelectionHolder`) or the
  only one; only this fence is changed (`ComposeFenceLocator`). The run reads the
  **saved** Document (a `doc_edit` of the same Turn is included → no race, no
  client roundtrip), executes the same async `runAsync`+`onDone` machinery as
  `compose_run`, and writes the result **server-side** via `ComposeBlockCodec`
  back into the managed `$output:` block (byte-identical to the browser's TS
  serialization) — via the same `DocumentService` writer identity path as the
  `doc_*` tools, so `documents.changed` fires with Agent identity and an open
  editor updates live. `compose_block_clear_output` strips `$output:`/`$run:`.
  During the run, an ephemeral `compose-run` signal is sent over the
  [`signals`-channel](/specs/signals-channel) to open viewers (status `running`/`done`/
  `failed`) — **no** Document write for the transient state. LLM contract in the
  Manual `damogran-compose.md`. History: `planning/agent-compose-run.md`.
- **LLM Tool** `compose_run(composePath | composeYaml)` — **async**: short run
  inline, long (>15s fast-path) → `{ runId, running:true }` + a
  `COMPOSE_FINISHED`-ProcessEvent (payload `runId`/`status`/`result`) to the
  calling Process, as soon as it's finished (`ComposeRun.onDone` →
  `EngineMessageRouter.dispatch`). This allows a model Process to end the Turn
  and sleep for hours waiting for the Wakeup (instead of blocking/polling).
- **REST (async)** `POST /brain/{tenant}/compose/run` — starts a
  **background run** (`runId`, in-Pod `ComposeRunRegistry`) and waits for a
  fast-path (30s): finished → result **inline** (existing shape + `runId`,
  `running:false`); still running → `{ runId, running:true, status, workspace,
  currentTaskIndex }`. `GET /brain/{tenant}/compose/run/{runId}?projectId=…`
  polls: status + `currentTask` + **`tail`** (last lines of the running Exec
  job, live from `ExecManager.tail` — **stdout + stderr merged**, as many
  long-runners write their progress to stderr) + on completion, the result shape.
  The UI shows the tail continuously in Phase 2 (placeholder until first output).
  `POST …/run/{runId}/cancel?projectId=…` **cancels**:
  `ComposeRun.requestCancel()` (runner stops before the next Task) +
  `ExecManager.kill` of the running Exec job (a long-runner stops immediately
  instead of waiting for the deadline). In-Pod (Pod restart loses the run). Body
  additionally `{ projectId, composePath | composeYaml, composeBasePath?,
  sessionId? }`. With `sessionId`, the run binds to the **primary chat Process**
  of this Session (the Compose sets *its* WorkTarget → the Workspace is shared
  with what happens in the chat; variant a). The Cortex `compose` view and the
  Workbook block automatically pass the active Cortex `sessionId`
  (`provide('vance:session-id')` in EditorApp). Without a usable chat Process (no
  `sessionId`, foreign Session, or no `chatProcessId` yet), it depends on the
  manifest's **`session:` section**: missing/disabled → **process-less**
  (`processId = null`, no `spawn`, `js` with empty Tool Surface — avoids an idle
  process that `EXEC_FINISHED` events would wake up and cost an LLM turn);
  enabled → chatless **Session Process** (`DamogranProcessResolver`) with
  WorkTarget tools on the Workspace. Identity: `session.name` (stable →
  continuity), otherwise **per App** (Workbook App folder via `appKey` —
  collaborative, shared Workspace, Presence) or **per (Project, User)** for a
  standalone `compose` file (one user executes their files serially). This
  prevents parallel runs of different Apps/Users from colliding on the shared
  WorkTarget.
- **Cortex**: Kind `compose` opens with **Edit** tab (raw YAML editor, editable/
  savable) + **View** tab (Run + Output region). Selectable as Kind `compose` in
  the New Document dialog (YAML MIME).
- **Workbook**: inline `vance-compose` block (slash `/compose`). The fence body
  *is* the Compose YAML (inline editable); "Run compose" posts the current
  content and renders the outputs below.

## 10. Architectural Placement

- Core in `vance-brain`, package `de.mhus.vance.brain.damogran`:
  `DamogranManifest`(+Parser), `DamogranTask`-SPI + `DamogranTaskExecutor`,
  `DamogranComposeService` (Dispatcher) → `ComposeRunner`-SPI (bean per
  `workspace.target`): `WorkspaceComposeRunner` (WORK — Provision/Import/Tasks/
  Export) + `ClientComposeRunner`/`DaemonComposeRunner` (CLIENT/DAEMON — exec via
  `client_exec_run` + text-`import`/`export`, no managed Workspace; common base
  `RemoteExecComposeRunner`; DAEMON name = `workspace.name`). Import/export is
  target-agnostic via `ComposeFileIo` on the Context (`WorkspaceFileIo` =
  server-RootDir · `RemoteFileIo` = `file_*`-Tools) — thus the Remote Runner also
  uses the Import/Export SPI (`DamogranImporter`/`DamogranExporter`) +
  `DamogranTransport`-Dispatcher + Built-in-Beans (`VanceDocumentImporter`/
  `HttpImporter`/`VanceDocumentExporter`, `GitImporter`/`GitExporter` on
  `GitService`), Built-in-Task-Beans, `ComposeRunTool`, `ComposeController`,
  `DamogranMime`/`DamogranResponse`/`DamogranUri`/`DamogranWorkspaceIo`.
- Kind `compose` in `BuiltInKindHandlers` (`vance-shared`).
- Client: `compose`-Kind editor (`ComposeView`/`ComposeOutput`) in `vance-face`;
  `vance-compose` block in `@vance/block-editor`; Host `runCompose` in the
  Workbook Addon.
- Addon Task `tex-task` as `DamogranTask`-bean in the tex-Addon.

## 11. Open (v2)

- **CLIENT/DAEMON**: **binary** import/export (today remote only **text** via
  `vance:`/`http:` → `vance:`; `git:*` already runs via remote-exec).
- `spawn`-Task with blocking/output capture.

**Deliberately not:** managed Remote Workspace (lifecycle/confinement for
CLIENT/DAEMON). Not the use case — confinement is already handled by the Foot
sandbox (`permissions.yaml`), working directory lifecycle by the shell commands
themselves. The effort (rebuilding WORK-`WorkspaceService` on the Foot/Daemon) is
disproportionate. If ergonomics are ever needed: an optional
`workspace.options.cwd` that the Remote Runner passes to `exec_run` — without
confinement/lifecycle.

*(Completed: JS Tool Surface (`vance.tools.list/has` + `vance.files`); chatless
Carrier Process; CLIENT- **and** DAEMON-Target (exec) via `ComposeRunner`-SPI;
`import`/`export` target-agnostic via `ComposeFileIo` — also remote;
**async-Runner** — REST-poll + `$run`/Tail-UI + LLM-`COMPOSE_FINISHED`-Wakeup;
chatless Carrier **per App / per (Project,User)** (no WorkTarget collision);
**Deps-Provisioning** — `node`/`python`-Workspace installs `options.packages`
during provisioning (npm/pip, once, option injection protection); **remote `git:*`
import/export** via the host's `git` via exec (`RemoteGit`, clone-or-pull /
commit-push, `credentialAlias` WORK-only).)*

---

Implementation History: `planning/damogran-system.md`.
