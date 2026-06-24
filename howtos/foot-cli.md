---
title: vance-foot CLI
parent: How-tos
nav_order: 1
permalink: /howtos/foot-cli
---

# vance-foot CLI
{: .no_toc }

A guided tour of the terminal client — what it's for, how to start it,
how to drive a session with slash commands, and which top-level flags
matter in practice.
{: .fs-5 .fw-300 }

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Why use Foot?

The Web UI ([`vance-face`](/specs/web-ui)) is the default way to talk to
a Brain. Foot is the terminal alternative — useful when you want:

- A REPL on a server or over SSH, no browser involved.
- Local-resource access from the same machine that runs the shell
  (files, processes, IDE bridge). The Brain reaches them through Foot,
  not the browser.
- Long-running sessions over flaky connections — Foot reconnects, the
  Brain keeps working in the meantime.
- IDE integration: spawn Foot from IntelliJ via the
  [`--intellij-mcp`](#intellij-integration) flag and your IDE becomes a
  Vance tool surface.

Foot is **not** a mirror of the Web UI. It does the things a terminal
is good at; for live documents, mindmaps, or the document editor,
switch to the Web UI.

## Build & launch

Foot is part of the [`vance`](https://github.com/mhus/vance) source
repo and ships as a Spring-Boot fat JAR. The Docker startup stack does
**not** include Foot (the CLI is local-side).

```bash
git clone https://github.com/mhus/vance.git
cd vance
mvn -pl server/vance-foot -am install            # builds the jar
java -jar server/vance-foot/target/vance-foot.jar
```

Prerequisites: Java 25, Maven 3.9+. The build also produces dependencies
in `~/.m2`; a clean build takes ~1 min.

First launch opens a [JLine 3](https://github.com/jline/jline3) REPL,
prints a small banner, and (unless `--no-connect` is set) opens a
WebSocket to the Brain configured in `vance.bootstrap.*` properties.

```
$ java -jar target/vance-foot.jar
Vance Foot 0.1.0 — terminal client
> Connecting to brain at https://localhost:9990 …
> Connected as wile.coyote@acme. Session bootstrapped (session-id: 0FK…).

>
```

Type a message and press Enter to send. The Brain replies inline; tool
calls and document writes are reported in the same stream. Type
`/quit` (or Ctrl-D) to exit.

## Connecting to a Brain

By default Foot reads the Brain URL and credentials from
`vance.bootstrap.*` in `application.yaml` (or environment variables
following Spring's naming rules). The most common config file is
`~/.vance/foot.yaml`:

```yaml
vance:
  bootstrap:
    brain-url: https://vance.example.com
    tenant: acme
    user: wile.coyote
    token: <JWT-refresh-token>
    project-id: research
```

Three ways to override:

- **Flags at startup**: `--project research --session 0FK… --recipe analyze`
  selects project, resumes a specific session, and pins the orchestrator
  recipe.
- **`/connect` slash command**: connect to a different Brain mid-session
  without restarting the JVM.
- **`--no-bootstrap`**: skip auto-bootstrap entirely, then `/connect`
  manually. Useful when the config file is wrong and you want to
  experiment.

## A typical session

```text
> /project-list                # what projects can I see?
> /project research            # switch to one
> /session-list                # past sessions in that project
> /session-resume 0FK…         # pick up where you left off
> /process-list                # running think-processes
                               # (empty = no agents running yet)
> Plan a kernel-security review of the new VPN module.
                               # type a request; the chat engine spawns
                               # workers as it sees fit
> /process-list                # now shows the spawned children
> /inbox                       # any items needing your input?
> /pause                       # halt the current process
> /stop                        # terminate it
> /title VPN review            # rename the session
> /quit                        # exit Foot (Brain keeps state)
```

Foot is fully **stateless on the client side** — quitting Foot does
not stop the Brain's work. Reconnect later, run `/session-resume`, and
you're back in the same conversation.

## Slash-command reference

All slash commands work inside the REPL. `/help` lists them with one
line each; full details on each command are in the
[engine specs](/specs/) (search for the command name).

### Connection & lifecycle

| Command | What it does |
|---|---|
| `/connect [url]` | Open WebSocket to the Brain (uses bootstrap if no url). |
| `/disconnect` | Close the WebSocket; Brain keeps working. |
| `/hub` | Hub-mode connection (multi-tenant routing). |
| `/ping` | Send a heartbeat ping. |
| `/quit` | Exit the REPL. |

### Project / session

| Command | What it does |
|---|---|
| `/project [name]` | Show or switch the active project. |
| `/project-create <name> <title>` | Create a new project. |
| `/project-list` | List visible projects. |
| `/projectgroup-list` | List project groups (multi-tenant setups). |
| `/session-create [--recipe <name>]` | Start a new session in the current project. |
| `/session-list` | List sessions in the active project. |
| `/session-resume <id>` | Resume a session by ID. |
| `/session-meta` | Show metadata for the current session. |
| `/session-bootstrap` | Re-run bootstrap on the current session. |
| `/session-unbind` | Detach the local Foot from the current session. |
| `/title <text>` | Set the session title. |

### Think processes

| Command | What it does |
|---|---|
| `/process` | Activate (focus) a think-process by short id. |
| `/process-list` | List running and recent processes in the session. |
| `/process-create <recipe> [args]` | Spawn a worker process with a specific recipe. |
| `/process-steer <message>` | Inject steering input into the active process. |
| `/process-compact` | Ask the active process to compact its memory. |
| `/pause` | Pause the active process. |
| `/stop` | Terminate the active process. |
| `/compact` | Same as `/process-compact` for the focused process. |

### Tooling, kits, skills

| Command | What it does |
|---|---|
| `/kit-list` | Project Kits installed in the current project. |
| `/skill` | Show / set the active skill on the focused process. |
| `/skill-list` | Skills available in the current project. |
| `/skill-clear` | Clear the active skill. |
| `/tools-register` | Register local-resource tools with the Brain. |
| `/tools-reload` | Re-read the local tool registry. |
| `/reload` | Reload the local agent doc. |
| `/ide` | IDE bridge — open the linked file in your IDE. |

### Inbox, support, UI helpers

| Command | What it does |
|---|---|
| `/inbox` | Show your inbox items in this session. |
| `/support <text>` | File a Fook ticket for the maintainers. |
| `/ui-inbox` | Open the Web UI's inbox view. |
| `/ui-documents` | Open the Web UI's document view. |
| `/markdown` | Toggle markdown rendering on/off. |
| `/clear` | Clear the screen. |
| `/verbosity <level>` | Set logging verbosity (`silent` … `debug`). |
| `/help [command]` | Help for one or all commands. |
| `/demo` | Lanterna TUI demo (not part of normal usage). |
| `/bootstrap` | Re-run bootstrap (resync project/session/tools). |

## Top-level flag reference

Flags passed when starting `java -jar vance-foot.jar`.

| Flag | Effect |
|---|---|
| `--no-connect` | Don't open the WebSocket at startup. Use `/connect` later. |
| `--no-bootstrap` | Skip `vance.bootstrap.*` auto-setup after the welcome banner. |
| `--no-ui` | No JLine REPL. JVM stays alive until SIGINT/SIGTERM — for daemon use. |
| `--no-tools` | Refuse local-resource tool registration. Brain cannot read files / spawn processes through this client. |
| `--no-tool-output` | Hide the "tool used" cosmetic block in the chat output. |
| `--no-markdown` | Print assistant replies verbatim, no markdown rendering. |
| `--profile <name>` | WebSocket profile sent on connect (server-side routes by profile). |
| `--name <value>` | Client identifier sent on connect (logs / multi-client routing). |
| `--agent-file <path>` | Override the agent doc uploaded to the Brain at bootstrap. |
| `--project <name>` | Set the active project; clears any session-id from config. |
| `--session <id>` | Resume this exact session. |
| `--recipe <name>` | Use this recipe as the session-chat orchestrator. |
| `--resume` | Resume the most recently used session. |
| `--last` | Same as `--resume`. |
| `--eddie` | Force the Eddie engine for the session chat. |
| `-d`, `--daemon` | Daemon mode: stay alive without a REPL (combine with `--no-ui`). |
| `-w`, `--web` | Open the Web UI bound to this session in the browser. |

### IntelliJ integration

| Flag | Effect |
|---|---|
| `--intellij-claude` | Bridge Claude Desktop's MCP socket through IntelliJ. |
| `--intellij-mcp` | Expose IntelliJ as an MCP tool surface to the Brain. |
| `--intellij-mcp-default` | Use IntelliJ MCP as the default tool backend. |

These need the IntelliJ Vance plugin running; see
[`vance-facelift`](/specs/vance-facelift) and
[`mcp-tool-routing`](/specs/mcp-tool-routing) for the protocol details.

## Patterns

**Daemon mode for headless workers.** A service account that runs a
Lunkwill or Trillian worker loop doesn't need a REPL:

```bash
java -jar vance-foot.jar \
  --no-ui --daemon \
  --project research \
  --session 0FK… \
  --recipe coding
```

Use systemd to keep the JVM alive. The Brain keeps state, Foot is just
the local-resource gateway.

**Quick attach to a running session.** Pop in to inspect what an
autonomous run is doing, then leave:

```bash
java -jar vance-foot.jar --resume
> /process-list
> /process-steer Please summarise what you've learned so far.
> /quit
```

The Brain keeps running. Reattach with `--resume` again any time.

**Read-only observation.** Connect without exposing local tools (useful
when watching a session from a machine that shouldn't be on the agent's
filesystem):

```bash
java -jar vance-foot.jar --no-tools --session 0FK…
```

The Brain treats this client as a viewer; `client_*` tools fail
fast on the worker side.

## Where to go next

- [Setup wizard](/specs/anus-setup-wizard) — provision the Brain's
  first tenant and user. Foot needs that to log in.
- [Recipes](/specs/recipes) — the recipe you pick with `--recipe`
  shapes what kind of session you get.
- [Project Kits](/specs/kits) — what `/kit-list` shows and how to add
  more.
