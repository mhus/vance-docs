---
title: "Vancetope — Foot Sandbox"
parent: Specs
permalink: /specs/foot-sandbox
---

<!-- AUTO-GENERATED from specification/public/en/foot-sandbox.md — do not edit here. -->

---
# Vancetope — Foot Sandbox

> Permission gate for the Brain-driven **file** and **exec tools** of the Foot-CLI. Every incoming `client-tool-invoke` is checked against a central rule policy: `deny` → `allow` → otherwise **interactive prompt** in the REPL (allow/deny, once/always). Without the sandbox (`--no-sandbox`), everything runs unchecked. The protection catches mistakes — it is **not** an OS security boundary.
>
> See also: [websocket-protocol](/specs/websocket-protokoll) | [work-target](/specs/work-target) | [tool-availability](/specs/tool-availability)

---

## 1. Purpose

The Foot-CLI provides local capabilities to the Brain: file access (`client_file_*`) and shell execution (`client_exec_run`) on the user's machine. Without protection, the Brain — and thus the LLM — can read/write any path and start any command. The sandbox places a gate in front of this: the user defines what is allowed or forbidden without prompting; everything else is interactively queried.

**Distinction — what the sandbox is NOT:** Command matching on a shell string (`rm -rf /; curl x | sh`, `$(…)`, pipes, env expansion) is bypassable in principle. The sandbox is **protection against mistakes + user-in-the-loop confirmation**, not a cryptographic or OS-level security boundary (no seatbelt/landlock/container). Those who need hard isolation should encapsulate the Foot in a container.

The sandbox is **purely client-side** (Foot). Brain-side tools (`work_*`, `doc_*`) are not affected.

## 2. Mode

The sandbox is **on by default**. Three ways to disable it:

- CLI flag `--no-sandbox` (on `vance-foot`),
- `permissions.sandbox: false` in the central config,
- if the sandbox is disabled, **all** paths and commands are unrestricted.

**`--no-sandbox` overrides the file.** The flag disables the sandbox even if the config (or a local project file) sets `sandbox: true`. Rationale: the operator starting the binary on their machine is allowed to consciously escape — a project file cannot prevent this.

If the sandbox is off at startup, the Foot outputs a red, three-line framed warning (see §9).

## 3. Scope

For each incoming tool call, the tool name determines the **domain**:

| Tool | Domain | Subject Checked |
|---|---|---|
| `client_file_*` (`read`/`write`/`edit`/`list`/`grep`/`find`/`count`/`head_tail`) | **paths** | Parameter `path` (empty → CWD `.`) |
| `client_file_delete` | **delete** | Parameter `path` — **separate domain**, see §3.1 |
| `client_exec_run` | **commands** | Parameter `command` |
| everything else | — | **always allowed** |

Not in scope (always passed through): exec job inspection (`client_exec_status`/`_tail`/`_kill`/`_stat`), `client_javascript`, and dynamically loaded Pack tools (REST/MCP). These have no gate in v1 — separate trust boundary.

### 3.1 Why Deletion Has Its Own Domain

`client_file_delete` carries a `client_file_*` name but is **not** checked against `paths` rules. The reason is the difference in meaning between the rules a user actually writes and what they intend: someone who sets `allow: ["~/projects/**"]` allows the agent to **read and write** in their project tree — not to **empty** it. If both operations were in the same domain, every read permission would implicitly be a delete permission, retroactively for all already written configs.

Therefore: **Allow rules for deletion are separate** under `delete.allow`. Without such a rule, every deletion attempt ends in `ASK` (§6), i.e., with a prompt — never with a silent `ALLOW`.

**Deny, however, does cascade.** A path that is under `paths.deny` or in the Deny-Floor (§5.2) is also not deletable; `delete.deny` further tightens this. A prohibition must apply to every operation, otherwise it would not be a prohibition.

The Brain side sees nothing of this: it calls the `file_delete` wrapper, which dispatches to `client_file_delete` or `work_file_delete` depending on the Work Target (`specification/public/work-target.md`).

## 4. Config Storage

### 4.1 Two Sources

- **Central** `~/.vancetope/permissions.yaml` — the user's full policy (allow + deny + `sandbox`). Override of the file via property `vance.permissions.file`.
- **Local** `./.vancetope/permissions.yaml` (CWD) — **tightening only**. Override via `vance.permissions.local-file`.

The project-local `.vancetope/` is otherwise intended for ordinary local config; permissions are deliberately separated in their own `permissions.yaml`.

### 4.2 Tightening-only Merge

The local file may only make the policy **stricter**, never broader:

| Aspect | Behavior |
|---|---|
| `paths.deny` / `commands.deny` / `delete.deny` (local) | **appended** to central denies |
| `paths.allow` / `commands.allow` / `delete.allow` (local) | **ignored** (would broaden) |
| `sandbox: true` (local) | **forces** sandbox on (even if central `false`) |
| `sandbox: false` (local) | **ignored** (cannot weaken) |

Resolution rule: Sandbox is on if the central config does not explicitly say `false`; a local `sandbox: true` additionally forces it on. A **missing** local file has no effect (the `sandbox` field is nullable, the POJO default does not force anything).

### 4.3 Schema

```yaml
# ~/.vancetope/permissions.yaml  (central — full policy)
permissions:
  sandbox: true
  paths:
    deny:  ["/etc/**"]                                # Floor (~/.ssh etc.) is implicit
    allow: ["~/projects/**", "./**"]
  commands:
    deny:  ["^\\s*rm\\s+-rf\\s+/", "\\|\\s*sh\\b"]     # Regex on command string
    allow: ["^git( |$)", "^ls( |$)", "^cat ", "^sed -n"]
  delete:                                           # only client_file_delete (§3.1)
    deny:  ["~/projects/**/src/**"]                 # optional, further tightens
    allow: ["~/projects/scratch/**"]                # if rule is missing → every deletion prompts

# ./.vancetope/permissions.yaml  (local — tightening only; allow/sandbox:false ignored)
permissions:
  sandbox: true
  paths:
    deny: ["./dist/**"]
  commands:
    deny: ["^git push"]
  delete:
    deny: ["./**"]                                  # do not delete anything in this project
```

## 5. Matching

- **Paths — Glob.** A path rule is a glob (`~/projects/**`, `/etc/**`, `./build/*`). `~` expands to home, relative globs against the CWD; matching is against the **canonical** subject path.
- **Commands — Regex.** A command rule is a `java.util.regex` pattern, checked via `find()` against the raw command string. Anchoring (`^`/`$`) is determined by the rule author. A broken pattern breaks loading with a clear message (fail-fast).

### 5.1 Path Canonization (Bypass Protection)

The subject path is canonized **before** matching: `~` expands, resolved relative to CWD, `.`/`..` collapsed (`normalize`), symlinks resolved via `toRealPath` (fallback to normalized-absolute if the target does not yet exist — a write to a new file is legitimate, the `..` collapse has already happened there). Without this step, `~/foo/../.ssh/id_rsa` would bypass any `~/.ssh/**` deny rule.

### 5.2 Default Deny-Floor

A bundled, **non-overridable** Deny-Floor is always evaluated in addition to the file rules:

```
~/.ssh/**   ~/.aws/**   ~/.gnupg/**   ~/.vancetope/**
```

This ensures that a missing/empty config protects credentials out of the box, and an accidental `allow: ["~/**"]` cannot enable these paths.

## 6. Evaluation

For each tool call, a verdict of `ALLOW` / `DENY` / `ASK` is reached:

1. Sandbox off → `ALLOW`.
2. Tool outside scope → `ALLOW`.
3. Determine subject (canonize path or read command; empty command → `DENY`).
4. **deny** matches → `DENY` (hard, **no** prompt).
5. **allow** matches → `ALLOW`.
6. nothing matches → `ASK`.

For the `delete` domain, step 4 runs over **two** lists — first `paths.deny` including the Floor, then `delete.deny` — and step 5 exclusively over `delete.allow`. A hit in `paths.allow` therefore does nothing here; this is precisely the asymmetry from §3.1.

`ASK` triggers the interactive prompt (§7). A `DENY` from step 4 **never** prompts — that is the purpose of a deny rule. If a call is denied, the Foot reports a clear `denyReason` (path/command + whether it was a deny rule or a missing allow rule) to the Brain.

## 7. Interactive Prompt

If a call hits `ASK`, the Foot displays a menu in the REPL and blocks until the user responds:

```
🔒 Permission required: client_file_write
   path: /Users/hummel/projects/x/out.txt
   [1] allow once   [2] allow always   [3] deny once   [4] deny always
```

- **allow once / deny once** — applies only to this single call, no stored state.
- **allow always / deny always** — additionally writes an **exact** rule to the central `~/.vancetope/permissions.yaml` (§8) and reloads the policy; future identical subjects will be automatically resolved.

**Timeout & Fallback:** The menu has 25 seconds (just under the Brain's ~30s tool timeout). If it expires → `DENY`. If **no** interactive interface is available → immediate `DENY`, without menu, with a WARN log line (tool + subject) for auditability. This is **explicitly** decided: with `--no-ui` / Daemon, `VanceFootCommand` sets `PermissionService.setInteractive(false)` before connecting — so an early tool invoke automatically denies instead of blocking for input that never comes (additionally, the fallback "no REPL attached" applies).

**Serialization:** Only **one** prompt is active at a time (mutex). A second one that does not get the slot in time is rejected.

## 8. Persistence of "always"

"Always" answers are written **exclusively** to the central file (the local one is read-only project tightening). The rule is an **exact match**:

- **Path:** the canonical path itself, as a glob without wildcards (matches exactly this path).
- **Command:** `^\Q<command>\E$` (`Pattern.quote`) — matches exactly this string.

Broader rules (directory globs, command prefixes) are written manually by the user into `permissions.yaml`. Writing is idempotent; existing rules are preserved.

## 9. Startup Warning

If the sandbox is off at startup (by flag or config), `vance-foot` outputs a red, bold-framed three-line warning directly before the prompt:

```
┌──────────────────────────────────────────────────────────────────┐
│ ⚠  SANDBOX DISABLED — all file & exec commands run unrestricted.   │
└──────────────────────────────────────────────────────────────────┘
```

Even headless (Daemon/`--no-ui`), the line is emitted (then goes to log/stdout).

## 10. Architecture

Package `de.mhus.vance.foot.permission`:

| Component | Role |
|---|---|
| `PermissionConfig` | YAML-bound POJO (`sandbox` nullable `Boolean`, `paths`/`commands` with `allow`/`deny`) |
| `PermissionConfigLoader` | reads central + local, builds `effectiveConfig()` (tightening merge), `loadPolicy()`, `appendRule()` (always-writer) |
| `PermissionPolicy` | immutable, compiled matchers; `evaluatePath` / `evaluateCommand` → `PermissionDecision` |
| `PermissionPaths` | `canonicalize()` (bypass protection) + `globMatcher()` |
| `PermissionService` | Runtime holder: sandbox status + active policy, `reload()`, `disableSandbox()` |
| `PermissionPrompt` | implements `InteractivePermissionResolver`: menu, timeout, headless→deny, always→persist+reload |
| `PendingPermissionPrompt` | Cross-thread handoff WS↔REPL (`ArrayBlockingQueue(1)`, `ReentrantLock`-mutex) |
| `InteractivePermissionResolver` | Interface that decouples the `tools`-gate from the UI-heavy prompt |

The gate itself is `de.mhus.vance.foot.tools.ClientSecurityService.permit(toolName, params)`, which sits in `ClientToolService.dispatch` before every tool call. The red box renders `ChatTerminal.printBoxed`; the CLI flag is in `VanceFootCommand` (`--no-sandbox`).

### 10.1 Thread Model & Deadlock Avoidance

`client-tool-invoke` runs inline on the WebSocket receive callback. an `ASK` prompt **blocks** this callback until a response (or 25s). This is consistent with existing behavior — a `client_exec_run` already blocks the callback for up to 15s.

The user's response is intercepted in `ChatInputService` **on the REPL input thread, before the Async Chat Executor** (`PendingPermissionPrompt.offerAnswer`) and never routed to the Brain or the slash dispatcher. This is mandatory: the Async Executor is typically stuck in the chat roundtrip, whose tool call is waiting precisely for this response — if the response were queued there, a deadlock would occur.

### 10.2 Known v1 Limitations

- Response + tool runtime together can exceed the Brain's ~30s tool timeout; the tool still finishes locally. No "pending" heartbeat to the Brain in v1.
- Hot-reload of the file only at boot and after every "always" write; no file watcher.
- `client_javascript` and Pack tools (REST/MCP) are ungated in v1.

## 11. Exec Isolation (opt-in)

The command gate (§6) decides **whether** a command may run — but it does not limit **what** it accesses (regex on the shell string is bypassable through quoting, `$HOME`, subshells). Those who want to strictly confine the filesystem access of an allowed command can activate **Exec Isolation**: the command then runs in an OS isolation wrapper (bubblewrap, sandbox-exec, container, ...) instead of directly under `/bin/sh -c`.

Isolation and gate are **orthogonal**: first Allow/Deny/Ask, then the allowed command runs in isolation.

### 11.1 Configuration

```yaml
permissions:
  exec:
    isolation:
      mode: custom            # none (default) | custom
      workdir: "./"           # only writable path ({workdir})
      # {cmd} = original command (one argv element), {workdir} = resolved path
      wrapper: "bwrap --ro-bind /usr /usr --ro-bind /bin /bin --ro-bind /lib /lib
                --bind {workdir} {workdir} --chdir {workdir} --unshare-net
                /bin/sh -c {cmd}"
```

- `mode: none` (Default) → command runs unchanged under the platform shell.
- `mode: custom` → `ClientExecutorService` builds the **argv** from the `wrapper` template: whitespace-separated tokenized, `{workdir}` replaced inline, `{cmd}` as **one** argv element (so the inner `sh -c {cmd}` parses the full command as a single argument). The template is **never** re-interpreted by a shell → the wrapper itself is not command-injectable.

### 11.2 Activation Conditions

Isolation is only active if **all** apply: sandbox on (`--no-sandbox` also disables isolation), `mode: custom`, and the `wrapper` template contains the `{cmd}` placeholder. If the template is invalid (empty / no `{cmd}`), isolation is **deactivated** with an error log — the Allow/Deny/Ask gate still applies, but the command then runs unisolated.

### 11.3 Local-Tightening

As with the rules (§4.2), the local file may only tighten, here asymmetrically: the **central** isolation is decisive; a local `./.vancetope/permissions.yaml` can only **introduce** isolation where none is centrally defined — it cannot disable the central one (`mode: none` is ignored) nor replace its wrapper.

### 11.4 Caveats & Alternative

Isolation deliberately breaks commands that need host paths/env/network — that is its purpose, but it causes friction. Env expansion and subshells are resolved by the kernel/container, not the gate. For "scratch-confined exec" without a local wrapper: the **WorkTarget WORK** executes `exec` server-side in a scratch-rootDir (different trust model — see [work-target](/specs/work-target)).

**v2 (planned):** convenient presets `mode: bwrap | docker | sandbox-exec` with platform detection and clear error messages for missing wrapper binary.
