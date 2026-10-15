---
title: "Desktop Agent Tools"
parent: Specs
permalink: /specs/desktop-agent-tools
---

<!-- AUTO-GENERATED from llm/specification/desktop-agent-tools.md (translated from the German specification/public/desktop-agent-tools.md) — do not edit here. -->

# Desktop Agent Tools

> **Status: Implemented (Stage 1+2, 2026-10-09).** `client_file_*` and
> `client_exec_*` in the Facelift desktop app (Electron, "Vancetope") — the
> Agent operates on the user's machine like the Foot-CLI, with a Permission-Gate.
> Planning history and discarded alternatives:
> `planning/desktop-agent-tools.md`. Feature description (files, tests,
> operation): `readme/desktop-agent-tools.md`.

## 1. Purpose and Scope

The desktop app loads the same deployed web UI as the browser, but as a
native program, it has access to the machine. The web UI detects the
Electron bridge, registers the file/exec families under its Session —
**execution, including the Permission-Gate, runs in the Electron Main Process**.

- **No OS security boundary** — the same boundary as
  [foot-sandbox](/specs/foot-sandbox) §1: The Gate intercepts mistakes and enforces
  user-in-the-loop confirmation; it is not a seatbelt.
- **No Mobile feature** — iPad/iPhone/Android do not get the bridge;
  `window.vanceDesktopTools` does not exist there.
- **No second sandbox model** — behavior and policy schema are 1:1
  foot-sandbox; new are **location** (Electron Main), **storage** (per Account,
  §5), and **transport** (Bridge/IPC).

## 2. Architecture

```
vance-face (deployed Web-UI, per Account-WebView)
  DesktopAgentToolService
    • registers client_file_* / client_exec_* Specs only if
      'vanceDesktopTools' in window (Capability-Gate)
      AND locally enabled (Enablement-Gate, §6)
    • Handler = thin forwarder to the Bridge
        │ contextBridge (preload-tools.ts, per Account-WebView, sandboxed)
        ▼  window.vanceDesktopTools.invoke(op, params)
  ┌────────────────────────────────────────────────────────────┐
  │ Electron Main Process          — trusted boundary          │
  │  • DesktopToolsService: Ops (fs/child_process), Job model  │
  │  • PermissionPolicy + PermissionGate: ALLOW/DENY/ASK,      │
  │    per-Account permissions.yaml                            │
  │  • ASK → native dialog (25 s Timeout → DENY)               │
  │  • Workdir per Account (CWD for relative paths)            │
  └────────────────────────────────────────────────────────────┘
```

| Layer | Location | Responsibility |
|---|---|---|
| Tool Specification + LLM Visibility | `vance-face` (`platform/desktopAgentTools.ts`) | `ToolSpec`s with **parity to foot**; registration via existing `client-tool-register` |
| Bridge | `facelift-desktop` `preload-tools.ts` | Thin, immutable contract: `invoke(op, params)` → IPC. No policy logic in the Renderer |
| Execution | `facelift-desktop` `src/tools/` | Op implementation, Exec Job model |
| Gate | `facelift-desktop` `src/tools/` | Verdict + Ask dialog + Policy persistence — **exclusively here** |

**The Renderer never decides.** The Account-WebView loads remote content;
everything running there is considered potentially compromisable. The Renderer can
only *request* (`invoke`), the Main makes the verdict. The Ask dialog is a
native `dialog.showMessageBox` — not an HTML overlay. The Policy is not even
readable in the Renderer.

## 3. Connection Profile `desktop`

The desktop app is a third client type: Web-UI interface, local
capabilities. Canonical constant `Profiles.DESKTOP = "desktop"` in
`vance-api` (`de.mhus.vance.api.ws.Profiles`). Wire default remains `web`.

- The Web-UI sets `?profile=desktop` **only if the Bridge exists** —
  a browser tab remains `web`, even with a faked UA
  (`isFaceliftDesktop()` is UI cosmetic, not a capability;
  [vance-facelift](/specs/vance-facelift) §5).
- **Session binding remains unchanged** ([client-protokoll-erweiterbarkeit
  §2.1a](/specs/client-protokoll-erweiterbarkeit)): Desktop Sessions carry
  `profile=desktop` fixed; cross-profile resume → `409 Profile Mismatch`.
  Intended — Recipes resolve Tool sets and Prompt appendices per Profile.
- Recipes that want to arm local Tools carry a
  `profiles.desktop` block ([recipes](/specs/recipes) §6a); `profiles.default`
  still applies as a catch-all.

## 4. Bridge Contract

The Preload (`facelift-desktop/src/preload-tools.ts`) is injected **per
Account-WebView** and exposed via `contextBridge`:

```ts
interface VanceDesktopTools {
  version: string;
  getContext(): { os: string; arch: string; shell: string;
                  cwd: string; sandboxEnabled: boolean; timezone: string };
  invoke(op: string, params: Record<string, unknown>): Promise<
    | { ok: true; result: Record<string, unknown> }
    | { ok: false; error: string; denyReason?: string }>;
  /** Read-only view of per-Account enablement (§6) — read at bind. */
  toolsEnabled: { get(): Promise<boolean> };
}
```

- Registration rides on `client-tool-register` with `source: "desktop"` — the Account-WebView registers its Agent Tools and the Web-UI its UI-State Tools (`source: "chat"`) over the same socket; server-side, a registration only replaces the declared `source` groups ([websocket-protokoll](/specs/websocket-protokoll) §Client-Tool-Register).
- **Tool Packs:** the Bridge extends the namespace with `pack_invoke`
  with `{pack, tool, args}` (closed op grammar — Pack names never become
  part of the op syntax) and `packs.list()` → `{tools, errors}` — the
  materialized Pack Tools **plus the failed Packs with error**
  (a failed server must be visible, not silently absent;
  §12).
- **IPC** `desktop-tools:invoke` (channel `desktop-tools:tools-enabled:get`
  for enablement); handlers in Main resolve the Account-WebView via its
  `webContents.id` — the WebView instance is the isolation boundary (§8).
- `op` is a closed namespace; unknown Ops → error, no
  fallthrough. The contract is thin: new Tool parameters flow as
  `params` without changing the Bridge code.
- **Sandboxed Preloads are self-contained:** they may only `electron`
  require; IPC channel literals are inline in the Preload, not in a
  shared module (risk of crash, see readme).

### 4.1 Ops and Foot Parity

| Op | Tool Name (Wire) |
|---|---|
| `file.read` / `file.write` / `file.edit` / `file.list` / `file.grep` / `file.find` / `file.count` / `file.head_tail` | `client_file_*` |
| `file.delete` | `client_file_delete` (separate Gate domain, foot-sandbox §3.1) |
| `exec.run` / `exec.status` / `exec.tail` / `exec.kill` / `exec.stat` | `client_exec_*` (Job model) |

**Parity is the contract:** Name, `paramsSchema`, response format, and
error image (incl. `denyReason`) correspond to the Foot-CLI; deviations are
a Spec bug. `ToolSpec.allowedProfiles` is `["desktop"]`. The Brain
dispatches via the generic `file_*`/`exec_*` wrappers
([work-target](/specs/work-target)) to the `client_*` names — whether a
Foot or the Desktop app is behind it is irrelevant to the dispatcher.

### 4.2 Exec Job Model

Brain-side, `client-tool-invoke` blocks for a maximum of 30 s. Therefore, the
same form as in the Foot applies: `exec.run` starts the process and returns
immediately with a `jobId`; `status`/`tail`/`kill`/`stat` address the Job. Jobs
live per Account in the Main Process; app termination kills running Jobs
(`will-quit` → `killAll` — no shell orphans).

## 5. Sandbox & Permissions

**Behavioral Spec: [foot-sandbox](/specs/foot-sandbox), complete.** Matching
(Glob for paths, Regex for commands), path canonization with symlink and
`..` resolution, default-deny floor (`~/.ssh|aws|gnupg|vancetope`), delete
as a separate domain, exact "always" rules — identical. Deltas:

| Aspect | Foot-CLI | Desktop App |
|---|---|---|
| Policy file | `~/.vancetope/permissions.yaml` (one per machine) | **per Account**: `<userData>/tools/<accountId>/permissions.yaml` — schema identical, storage not shared |
| CWD for relative paths/globs | `--workdir` | Account's Workdir (§9) |
| `ASK` interface | REPL menu, 25 s | native Electron dialog, 25 s, Timeout → `DENY`; not displayable → immediate `DENY`; one prompt at a time (Mutex) |
| "always" | writes rule + Reload | identical — into the asking Account's per-Account file |
| Rule management | File by hand | **in Account management** (Shell): rule list with revocation per rule, add rule (Glob/Regex), reset to empty policy (§5.1) |
| Disable | `--no-sandbox` | UI switch in Account management (§5.1), two-click confirmation + warning banner; `sandbox: false` still possible directly in config file |

### 5.1 Rule Management in the Shell (implemented)

The Account management (Edit Account view, Desktop-gated) shows the Account's
Policy structured (paths/commands/delete × allow/deny), allows **revoking
individual rules** (incl. "Allow always") via `desktop-shell:policy:*`
and **resetting** to the empty Policy (everything asks again). The
default-deny floor is only visibly readable, not removable. Channels are
Shell-only — the Account-WebView never reaches Policy management.

**Master switch:** "Disable sandbox" per Account in the same section —
first click arms (auto-disarm after 5 s), second confirms; off =
the Gate allows everything without prompting, **including the Deny-Floor**
(foot-sandbox §2). A red warning banner remains visible while disabled;
the Client-Context reports `sandboxEnabled: false` so the Agent's
environment block remains honest.

**Confinement** (`confineToWorkdir`, default off): Paths outside the
Account Workdir are set to **DENY** instead of ASK — the Workdir becomes the
visible boundary of the Agent. Explicit rules still win outside
(deny remains deny, an explicit Allow applies), commands are not
confinement-capable (their rules are separate anyway), the delete domain
follows confinement. The check is a canonical prefix comparison
(realpath form of the Workdir) in Policy evaluation; a switch in
Account management (`desktop-shell:confine:*`).

**Why per-Account instead of the central Foot file:** A Facelift Account
can have a different trust level than the next (external Tenant vs.
own), and relative Globs (`./**`) resolve against the per-Account Workdir
— in a shared file, the same rules would mean something different per Account.
The Foot file remains untouched.

The Ask dialog names the Tool, subject (path/command), and Account — the
user sees *whose* Session is asking (v1 shows the Account ID as a label).

## 6. Enablement + Shell Button

The function is **off by default** (fail-safe), enabled per Account.
Two Gates, both must be green, otherwise the families are not
registered:

1. **Capability-Gate** — `'vanceDesktopTools' in window`.
2. **Enablement-Gate** — local in the Desktop app, per Account.

**Storage: Client, not Brain setting.** The capability exists
exclusively on this machine — the server could not enforce a setting,
it would only see what the client registers. Enablement is
the same category as Sandbox Policy and Workdir: a **property of the
Client per Account** (a Facelift Account = a Brain login, so the same
granularity as a per-user setting, only locally decided and locally
enforceable; it does not travel to other machines). Storage:
`<userData>/tools/tools-config.json`, keyed by `accountId`, fields
`toolsEnabled` (default `false`) and `workdir`.

Enablement is read at **Session-Bind/WS-Open** (the moment
`client-tool-register` occurs) — a toggle takes effect from the next binding.
Enablement only unlocks registration; what the Agent is allowed to do in
individual cases is still decided solely by the Gate (§5).

### 6.1 Button in the Shell Renderer (dual-function)

The switch is in the **Shell-Topbar** (facelift-bridge, next to Home),
not in the hosted Web-UI. Reason: **Ownership follows Enforcement**
— enablement switches a Main-Process capability, its switch belongs in
the Client-UI; constant visibility on every route; Mobile never renders it
(`isDesktop()`-Gated).

- **Background color = state:** blue = on, gray = off. Click toggles
  enablement of the **active Account** — write path **only** via the
  Shell-Preload-API (`faceliftDesktop.toolsEnabledGet/Set({accountId})` on
  the `desktop-shell:*` channels). The Account-WebView Bridge is
  **read-only** (`toolsEnabled.get()`): Remote content can honor enablement,
  never change it.
- **Icon color = activity:** The Main counts in-flight invokes per Account
  and pushes 0↔n transitions as a `desktop-shell:activity` event
  (`{accountId, active}`) to the Shell. Idle: white (on) or gray (off);
  active: **red + pulsating**, tooltip "Agent is working on your machine…".
- **No Kill-Switch in v1** — a running Turn ends normally; stopping via
  the existing Stop/Force-Stop surface (session-lifecycle).

**Web-UI consequence:** The Web-UI (`vance-face`) has **no** switch and
no activity indicator. The `DesktopAgentToolService` remains — it queries
enablement via the Bridge and decides registration at bind.

## 7. Client-Context via Query Parameter

Browser WS cannot use custom headers; the Desktop app provides the
`ClientContext` (os/arch/shell/cwd/sandboxEnabled/timezone, values from
`getContext()`) as a **query parameter `clientContext`** in the WS URL:
`?profile=desktop&clientContext=<urlencoded JSON>`. The server parses it
generically like the Foot header (`handshake-final`; missing/corrupt → ignored,
never breaks). Spoofable and harmless: The Context carries no authority —
whoever fakes `windows` only sabotages themselves. The header remains in parallel
(foot changes nothing); details [websocket-protokoll](/specs/websocket-protokoll) §Handshake.

## 8. Isolation (Multi-Account)

1. **Bridge instance per Account-WebView** — the Main knows the origin
   of each `invoke`; Account A can never trigger on behalf of B.
2. **Client Config per Account** — Policy including `sandbox` flag and enablement
   per Account; one Account can disable the Tools without affecting others.
3. **Workdir per Account** as CWD — relative paths/globs of one Account
   never resolve in another's tree.
4. **The Ask dialog names the Account** — enablement belongs to the asking
   Account, not "the app".

No process-level isolation in v1: All Ops run in the Main Process under
the user identity, identical to the Foot. The boundary is the Policy.

**Storage semantics of the Face in the app:** The Account-WebView is the
"tab" — it dies with the app, the persistent partition (localStorage)
survives. What is in `sessionStorage` in the browser (per tab) is lost
with every app restart, while localStorage lives on — the
inverse asymmetry to the browser tab, which lives for days or is restored
with sessionStorage. The Face therefore chooses the carrier
based on Bridge presence (`getDesktopTools()`): the
Project memory (`lastProject`) is in the app's localStorage
(one WebView per Account = exactly one "tab"; restart loss would be the
only thing the app forgets). Deliberately NOT moved: age keys
(`ageKeyStore` — die with the WebView, that is the
security design) and purely cosmetic states (panel tab,
View/Edit reset on restart is safe-by-default).

## 9. Workdir

One Workdir per Account, persisted in the Desktop Config, default `~`
(deliberately broad — the Gate intercepts). Relative path parameters and relative
Policy Globs resolve against it. **No per-Project Workdir in v1** — one
Account, one Workdir, like foot one JVM, one Workdir.

**Configuration in Account management** (Shell, Edit Account view):
Display of current Workdir + native directory dialog ("Choose…",
`workdirPick`/`workdirSet` via the Shell-Preload-Bridge on
`desktop-shell:workdir:*`) + Confinement switch (§5.1). The Main validates (non-empty absolute path);
changes take effect with the **next Invoke** (the Config is read per
operation), `clientContext.cwd` with the **next Bind**. The
Account-WebView never reaches the configuration — same trust boundary as
for enablement (§6).

## 10. Threat Model (Summary)

| Risk | Countermeasure |
|---|---|
| Compromised Face deployment (main threat) | Default-off enablement, Capability-Gate, Main-Gate, Default-Deny-Floor, ASK with Account context |
| XSS in Renderer | Renderer only forwards, never decides (§2); dialog native |
| Clipboard reading by remote content (`clipboard-read` is granted to WebView without prompt — SheetView paste needs it; Copy buttons need `clipboard-sanitized-write`) | conscious tradeoff: a compromised Face deployment could read the clipboard; an OS prompt does not exist in Electron for this. Boundary: the grant applies exactly to the two clipboard permissions, everything else remains deny-by-default |
| UA-/Profile-/Context-Spoofing | No Tool without Bridge, no Exec without Gate; wrong Context sabotages the spoofer |
| Overly broad Policy (`allow: ["~/**"]`) | User decision as with foot; Default-Deny-Floor |
| Version skew Face ↔ App | Contract = Op names + Params; parity obligation (§4.1) |
| App termination during exec job | `will-quit` kills Jobs (§4.2) |

## 11. Deliberate v1 Gaps

- **No `EXEC_FINISHED`-Push** — there is no Client→Brain push channel for
  Job terminations; the Agent polls `exec.status` (termination of a running Turn
  is thus possible, just not event-driven).
- **Ask dialog shows Account ID** as label, not display name.

## 12. Tool Packs (MCP Passthrough)

> Implemented: Stage 1 (stdio), 2026-10-09. Planning history:
> `planning/desktop-tool-packs.md` — also covers expansion stages
> (HTTP transport, REST Packs, management UI, Foot migration to
> common file).

The Desktop app is a **second Pack host** alongside the Foot: It starts
MCP servers locally and passes their Tools through as Client Tools — the same
machine role as the Foot (foot-tool-packs.md), the same
user contracts, different format (an `mcp.json` instead of individual Pack files)
and different runtime (TypeScript client `@modelcontextprotocol/sdk`).

**Configuration — one file, all Clients (staged):**

| Level | File | Trust |
|---|---|---|
| global | `~/.vancetope/mcp.json` | User's own file — never asks |
| project | `<workdir>/.vancetope/mcp.json` | comes with the Workdir (Repo!) — **Trust dialog**: once / always for this workdir / no; 25 s Timeout = rejection; "always" matches Name+Command and lands in `<userData>/tools/<accountId>/trusted-packs.yaml` (never in Workdir) |

Format: `mcpServers` map; Key = Pack name; fields `command` (stdio),
`labels`, `enabled`, `disabledSubTools`. Merge: Union by name,
Project wins. Selection (which Packs are active) separately in
`<workdir>/.vancetope/config.yaml` (`toolPacks:` block, like foot-tool-packs
§3: `enabled`/`packs`/`disabledPacks`, exact names, each field optional).

**Tool interface:** `<pack>__<subtool>` (Budget family = Pack name),
Labels = Pack labels + automatically `mcp`, `mcp:<pack>`, `side-effect` —
existing `@label` Recipes apply unchanged. Registration with the
Agent Tools in a `client-tool-register` (`source: "desktop"`,
`allowedProfiles: ["desktop"]`, `deferred: true`).

**Invocation:** `pack_invoke {pack, tool, args}` — **v1 ungated** (foot-
parity: loading the Pack is consent; the Trust-Gate covers materialization).
The Brain invocation timeout (30 s) applies unchanged.

**Lifecycle:** Materialization per Account (server start, `initialize` +
`tools/list`) lazy on first access; **"Reload tool packs"** in Account
management discards the cache and reconnects (mcp.json edits
without app restart). App termination kills server processes (`killAll`, like
Exec Jobs).

**Failures are visible:** `packs.list()` returns `{tools, errors}`;
the Tool inventory (insights) and reload status show the cause of error
per Pack (e.g., `spawn npx ENOENT`).

**Pack Home per Project (2026-10-12):** Pack processes run with a
HOME that matches the **currently selected Project in the Face** — the
Face reports `tenant + project` with every effective selection change
(`rememberProject` hook, Bridge member `packs.setProject`, optional for
old builds); the Main resolves:
`packHomeByProject["tenant/project"] ?? packHome ?? actual Home` and
respawns servers **only on actual Home change** (Project change without
its own entry is free). Spawn: `HOME` + `cwd` to the Project Home,
but `npm_config_cache`/`XDG_CACHE_HOME` pinned to the actual user cache directories
— otherwise `npx` redownloads per Project. Config client-owned
in `tools-config.json` (`packHome`, `packHomeByProject`), UI in
EditAccount; Toggle-Tooltip in Shell shows Project + effective Home.
An orphaned/defective Home directory is recursively created before spawning
(deleted directories would otherwise cause a misleading
`spawn <cmd> ENOENT`). The Home is client-private, not secret: the
Agent sees it via `client_file_list` results anyway; it is
not actively hidden and not explicitly reported in `clientContext`.

**Pack Credentials per Account (2026-10-12):** Packs authenticate
via Env variables; `mcp.json` **declares** only references
(`"env": {"JIRA_TOKEN": "${secret:envtest.token}"}` — literals for
harmless config allowed, plaintext tokens never: the file can be shared
or in the repo). The **values** are managed by the end-user with a click in
the app (EditAccount → "Pack credentials": one line per reference with
origin Pack and `set`/`missing` chip, input in Shell modal — the
value only goes Renderer→Main, never comes back). Storage per Account in
`<userData>/tools/<accountId>/*.pack-secrets.yaml`, values
**`safeStorage`-encrypted** (macOS Keychain; unreadable without Keychain);
only the Main Process reads. Resolution at spawn time; a
missing Secret is a **visible Pack error with name** ("waiting
for credential 'x' — set it in the app"), not a silent 401 on call.
Setting/deleting triggers Respawn (like Pack Home). Syntax family deliberately
like the Foot (`${env:NAME}`) — `${secret:…}` = Client-Account-Store;
`&#123;{secret:…}}` (Brain syntax) remains taboo: PASSWORD settings never go
to Clients (settings-system.md).

**PATH contract (macOS):** An app launched from Finder inherits a
minimal PATH — the Main retrieves the login shell PATH (`zsh -l`,
mind quotings: the outer `/bin/sh` expands `$PATH` unquoted
itself) at startup, with fallback to common dev paths. Otherwise, `npx`/Homebrew
binaries for MCP spawns and `exec_run` would be invisible.
