# Foot Tool Packs — Two Levels, One Selection, One Trust Gate

> How `vance-foot` loads MCP servers and REST APIs as client tools: definitions from the global **and** project-local `.vancetope`, selection via `.vancetope/config.yaml`, consent required for packs originating from the working directory.

## 1. What a Pack Is

A **Tool Pack** is a JSON file that describes a tool family that Foot offers to the Brain as client tools. Two types:

| `type` | Meaning |
|--------|-----------|
| `mcp_server` | MCP server, either as a subprocess (`transport: stdio`) or via HTTP (`transport: http`) |
| `rest_api` | OpenAPI spec → one tool per operation |

The sub-tools appear as `<pack>__<subtool>` (`chrome__take_snapshot`). Labels from the pack file plus automatic `mcp`, `mcp:<pack>`, `side-effect` — this allows Recipes to address a capability instead of generated names (see [recipes.md](recipes.md) §6.2).

```json
{
  "name": "chrome",
  "type": "mcp_server",
  "labels": ["browser"],
  "parameters": {
    "transport": "stdio",
    "command": ["npx", "-y", "chrome-devtools-mcp@latest"]
  }
}
```

## 2. Two Levels

Pack definitions are read from **two** directories — the same file format in both, a pack file can be copied between them without rewriting:

| Level | Location | Origin |
|-------|----------|--------|
| **global** | `$VANCE_HOME/foot-tools/` or `~/.vancetope/foot-tools/` | the user's own toolbox |
| **project** | `./.vancetope/foot-tools/` | comes with the working directory (e.g., from a cloned repo) |

**Merge Rule:** Union by pack **name**, the project wins. A project can thus

- contribute its own packs (name does not exist globally),
- redirect a global pack (same name, different `parameters`),
- locally disable a global pack (same name + `"enabled": false`),

without losing the other global packs. If `./.vancetope/foot-tools/` is missing, Foot behaves exactly as before.

This is intentionally **different** from other `.vancetope` resolution: `access.yaml`, `project.eddie.yaml`, `config.yaml`, and the Session Anchors follow "Project **instead of** global" (`VancePaths.activeDir()`). For packs, addition is correct — if someone adds their own MCP server in a project, they don't want to lose their global packs.

`--no-local` disables the project level for the entire run; then only the global level counts.

The Spring property `vance.foot.tools.dir` replaces only the **global** level (test path); the project level remains unaffected.

## 3. Selection via `.vancetope/config.yaml`

`config.yaml` controls **which** packs are active in this project — it does not define them. Definition and selection remain separate so that the file does not become a second pack format:

```yaml
toolPacks:
  enabled: true          # false = no packs at all in this project
  packs: [chrome]        # Allow-list; missing/empty = all found
  disabledPacks: [jira]  # Deny-list, applied after packs
```

Each field is individually optional: a missing block — or a missing field in the block — means "do not control," not "control to empty." Setting only `enabled: false` does not delete an allow-list. Names are compared **exactly**; a pack name is the namespace prefix of its sub-tools, prefix matching would be a footgun.

Order of the three filters before materialization: pack file `enabled` → `toolPacks:` selection → Trust Gate (§4).

## 4. Trust Gate for Project Packs

A pack definition contains a **command line** that Foot starts (`npx -y chrome-devtools-mcp@latest`), or an endpoint to which tool traffic goes. As long as packs only come from the home directory, the user wrote them themselves. A definition at the project level, however, is content of the working directory: `git clone` + `vancetope` would execute what the repo author has placed there — and this happens **before** any sandbox gate, because the [Foot Sandbox](foot-sandbox.md) checks brain-driven `client_exec_run`/`client_file_*` calls, not the materialization of a pack.

Therefore, each project pack asks once:

```
Project tool pack 'chrome' from /Users/me/src/repo/.vancetope/foot-tools/chrome.json
  wants to run: npx -y chrome-devtools-mcp@latest
Load it? [1] once  [2] always for this project  [3] no ›
```

- **Global packs never ask.**
- **"always"** lands in `<global .vancetope>/trusted-packs.yaml` — never in the project, otherwise the repo could authorize itself.
- An entry matches on **name + started command/endpoint**. If the repo later changes the command, the consent no longer applies, and it will be asked again.
- Without an interactive terminal (daemon, `--no-ui`, `--skill`-one-shot, dumb terminal), there is no one to ask: the pack will **not** be loaded, with a WARN line. Silent loading would be the wrong default precisely in cases of doubt. If it is needed there, move it to the global `foot-tools/`.
- Timeout (25 s) and unclear answer count as rejection.

```yaml
# ~/.vancetope/trusted-packs.yaml
trustedPacks:
  /Users/me/src/repo:
    - name: chrome
      reach: npx -y chrome-devtools-mcp@latest
```

## 5. Load Time

The boot load runs asynchronously on a daemon thread, **triggered from `VanceFootCommand`** — not from a `@PostConstruct`. Everything it depends on is only determined during command startup: `--no-local` (does the project level count?), the `toolPacks:` selection from `config.yaml`, and whether this run will have a terminal for the prompt. A bean init hook would race with all three.

Two consequences:

- `--no-tools` skips loading completely. Previously, the MCP subprocesses were still started, and only registration was suppressed.
- The prompt can wait until the REPL is ready (limited), because the load thread starts before `ChatRepl.run()`.

`/tools reload` follows the same path synchronously: already consented packs do not ask again.

## 6. What v1 Does Not Do

- **No pack definitions in `config.yaml`.** Definitions remain files; the YAML only controls selection.
- **No trust downgrade per sub-tool.** Consent applies to the pack, not to individual sub-tools (`disabledSubTools` in the pack file remains the adjustment knob).
- **No prompt via the REST debug interface.** `--rest-api` without PTY counts as "not askable" → project packs are rejected.
- **No revoke command.** To withdraw consent: delete the line from `trusted-packs.yaml`.
