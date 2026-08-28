---
title: "Vancetope — Engine Commands"
parent: Specs
permalink: /specs/engine-commands
---

<!-- AUTO-GENERATED from specification/public/en/engine-commands.md — do not edit here. -->

---
# Vancetope — Engine Commands

> An **Engine Command** is a generic, named function call to a **running** Think Process — the runtime-mutable control layer above the spawn-static Recipe. Where a Recipe seeds the initial state at spawn and then remains unchanged, the Command channel allows setting, reconfiguring, and cleaning up behavior *during operation* — without respawn. The channel **deliberately has no fixed command vocabulary**: it transports `name` + `args`; *which* verbs exist and *what* an Engine does with them is up to the Engine.
>
> **Distinction:** A Command is **Control-Plane** — deterministic, no LLM turn, no token. This sharply distinguishes it from an `action:`/User Prompt (which triggers a model turn) and from Tools (which the model itself calls).
>
> See also: [skills](/specs/skills) (Skills fire Command sequences on activate/deactivate) | [completion-guard](/specs/completion-guard) (first generic verb family `guard`) | [think-engines](/specs/think-engines) | [websocket-protokoll](/specs/websocket-protokoll)

---

## 1. Terms and Distinction

Much of this previously existed as scattered individual fields, each with its own handler (`mode` + `PROCESS_MODE_CHANGED`, `promptOverride`, `activeSkills` + `SkillSteerProcessor`, `ExternalCommand` + `PROCESS_STEER`). This layer **unifies** that: one envelope, one funnel, one dispatch.

| Term | What it is |
|---|---|
| **Engine Command** | Named function call `name + args` to a running Process. |
| **Verb** | The `name` of a Command, namespaced (`guard`, `trillian`, in the future `mode.set`). |
| **Handler** | Engine-/subsystem-side receiver of a Verb (SPI-Bean). |
| **Dispatcher** | Registry `verb → handler`, executes a Command on the Lane. |

Boundary to neighboring concepts:

- **Recipe** — immutable for the process lifetime. Seeds the initial state, does not mutate thereafter. Command is the runtime-mutable overlay on top.
- **Tool** — called by the model, within the LLM turn. Command is Control-Plane, from the User/Skill/System, **outside** the turn.
- **`action:` / User Prompt** — triggers a model turn. Command never does.
- **`PROCESS_PROGRESS/STATUS`** — transient activity status ("searching web..."), fades. A Command is an *input*, not a status output.

---

## 2. Envelope

The core is a generic function call, deliberately without a fixed vocabulary:

```
EngineCommand { name: "namespace.verb", args: Map<String,Object> }
```

- **Namespaced verbs** prevent collisions between subsystems, analogous to Tool naming. Generic verbs are flat (`guard`, `echo`, `ping`), engine-scoped verbs carry the Engine name — either as the entire verb (`trillian`) or as a prefix (`<engine>.<verb>`) if an Engine needs multiple independent verbs.
- **Result optional:** a Command *may* deliver a result on the same channel (`EngineCommandResult` → `ProcessCommandResponse` with `outcome` + `message` + optional `value`). Necessary, e.g., for query verbs (`guard get`) and so a Skill sequence knows if a step failed.

**Arg Grammar (v1).** The `//`-surface sends the raw rest of the line as **one** `text` argument — `EngineCommand.parse("guard status set phase review")` results in verb `guard`, `args={text: "status set phase review"}`. Handlers with subcommands (`guard`, `scratchpad`) parse the subcommand themselves from `text`. Structured `k=v` arguments are a later extension — until then, multi-valued configuration is built via **multiple setter commands** (see `llm` below in §9: `//llm temperature 0.2` + `//llm topP 0.9` instead of one command with two arguments).

---

## 3. Client Surface: `//` vs `/`

Two slash levels, cleanly separated:

- **`//verb args`** = Pass-through to the Engine (raw function call over the Command channel).
- **`/verb`** = Client/REPL command, handled locally by the Client Dispatcher (Foot: `/share`, `/aa`, `/skill`, ...), never reaches the Engine as a Command.

Mnemonic: single slash = curated client commands, double slash = generic to the Engine. In vance-foot, `ChatInputService` branches off the `//`-input, builds the `ProcessCommandRequest`, and renders the `ProcessCommandResponse`. The Web UI follows the same surface.

---

## 4. One Funnel, Many Sources

All sources produce the same `EngineCommand` → **one** dispatch:

1. **User** via `//command` (built).
2. **Skill** activate/deactivate sequences (built — see [skills](/specs/skills) §2a).
3. *(planned)* **LLM itself** (self-modification, "I'm entering Planning Mode").
4. *(planned)* **Scheduler / Hook**.

---

## 5. Dispatch Contract

- **Registry `verb → handler`.** Each handler is a bean (`EngineCommandHandler`-SPI) with `verb()` + `handle(process, command)`.
- **Unknown verb = defined no-op + WARN**, never crash. A command to an Engine/system that does not know the verb is without effect and logged.
- **Lane semantics.** A Command mutates a running Process → runs **on the Lane** (serialized via `laneScheduler`), never in parallel to a turn. The Dispatcher receives a **freshly loaded** Process to ensure it operates on the current state.
- **Lane opt-out for externally-addressed verbs.** This refers to the Lane of the **mutated** Process. A verb that does not touch the addressed Process at all — a pure query, or the target is *another* Process (which then serializes on **its** Lane) — reports `EngineCommandHandler.runsOnLane() = false` and runs directly in the WS handler. Without this, a diagnostic verb would be blocked precisely when the addressed turn is stuck, and a stop would wait behind the turn it is supposed to abort. The Dispatcher query is deliberately negatively formulated (`bypassesLane(verb)`): only an **explicit** opt-out by a known handler skips serialization — unknown verb, missing handler, or a test double with zero-value land on the Lane.
- **Batch atomicity.** A Skill-activate sequence is **one Lane unit**, applied before the next turn — not scattered across turns.

**Transport (current state).** No `SteerMessage`-variant and no reuse of `ExternalCommand` (Engines render those into the prompt — wrong Control-Plane semantics). Instead, a **direct Lane dispatch in the WS handler**:

```
Client  --PROCESS_COMMAND(ProcessCommandRequest{processId, command, text})-->  ProcessCommandHandler
        --laneScheduler.submit-->  EngineCommandDispatcher.dispatch(freshProcess, EngineCommand)
        --EngineCommandResult-->  ProcessCommandResponse{outcome, message, value}  --> Client
```

Interactive `//`-commands do not require crash survival; Lane serialization (the actual requirement) is met, a durable pending-queue path is deferred until a durable Command source (Scheduler) needs it.

**Convention: idempotent setters, no imperatives** (`mode.set(x)` instead of `enterMode()`). This is the only way for double execution and cleanup to be well-defined — a prerequisite for robust Skill `deactivate:` even after *partial* activation.

---

## 6. Permanent Engine-Agnostic Verbs

Two diagnostic verbs are always present (no Engine opt-in), serving as reference implementations of the contract:

| Verb | Effect | Handler |
|---|---|---|
| `echo <text>` | replies with the same `text` as `message` | `SystemEchoCommandHandler` |
| `ping` | replies `pong` | `PingCommandHandler` |

`//ping` → `pong`, `//echo hello` → `hello` — useful for checking Command round-trip from a client.

---

## 7. Metrics

`vance.engine.commands{verb, outcome}` — Counter per dispatch. The `verb`-tag is set **only for known verbs** (cardinality: unknown verbs from typos must not explode the metric), `outcome` carries fixed vocabulary (`ack`/`error`/`no_handler`).

---

## 8. Status Field (planned)

Generalization of `ProcessMode` + `PROCESS_MODE_CHANGED` to a free, **sticky** status field (Engine → Client), deliberately separated from the transient `PROCESS_PROGRESS/STATUS`:

| | `PROCESS_PROGRESS/STATUS` | Status Badge (planned) |
|--|--|--|
| Meaning | "current activity" | "what mode am I in" |
| Lifecycle | Event, fades | sticky, until Engine changes it |
| Persistence | none | on the process doc |

Planned as a short, persisted `statusLabel` field (Plain-Text, single line, hard cap ~48 characters), set via the first "real" verbs `status.set(...)` / `status.clear()`, pushed via the Live-Envelope. Not yet implemented. Design history: [planning/engine-commands.md](/specs/engine-commands) §3.

---

## 9. Verb Vocabulary (ongoing)

The channel does **not** hardwire a fixed vocabulary; specific verbs grow as needed:

| Verb Family | Scope | Status | Reference |
|---|---|---|---|
| `echo`, `ping` | generic | ✅ built | §6 |
| `guard` (`script`/`inline`/`get`/`clear`/`status`) | generic | ✅ built | [completion-guard](/specs/completion-guard) §3 |
| `llm` (`<param> <value>`/`<param> clear`/`get`) | generic | ✅ built | below |
| `thinking` (`<level>`/`get`/`clear`) | generic | ✅ built | below |
| `scratchpad` (`list`/`get <key>`/`delete <key>`/`block`) | generic | ✅ built | below |
| `trillian` (`info`/`queue`/`task`/`stop`/`continue`/`clear`) | engine-scoped (Trillian-Control) | ✅ built | [trillian-engine](/specs/trillian-engine) §6a |
| `status.set`/`status.clear` | generic | planned | §8 |
| `mode.set`, Planning-Mode | generic | planned | — |

**`llm` / `thinking` — Runtime Overlay over the Recipe `engineParams`.** Both verbs write the same overlay: the `engineParamOverrides` field (Map) on the `ThinkProcessDocument`. `EngineChatFactory.effectiveParams(process)` merges this overlay **before** the spawn-static `engineParams` and is read freshly per turn by `applySamplingParams` / `readThinkingLevel` — Precedence: **Override > Recipe Default > Option Default**. No respawn needed; the change takes effect from the next model call. Sub-callers with `lockSampling` (Judges, Validators) are unaffected — they skip `applySamplingParams`.

- **`llm`** overrides the sampling knobs. Whitelist (case-insensitive, canonical camelCase stored): `temperature`, `topP`, `topK`, `maxTokens`, `seed`, `frequencyPenalty`, `presencePenalty`. `//llm temperature 0.2` sets (typed: double/int/long, non-number → error), `//llm topK clear` discards a key, `//llm get` (or empty) lists the active overrides. The whitelist is deliberate: **no** `model` (runtime model switching is a separate topic — alias resolution + capability gating) and **no** `disableCache`. `stopSequences` (list) is missing in v1 because the v1 arg grammar takes the rest as a single text.
- **`thinking`** is the ergonomic alias for the key `thinking` with `ThinkingLevel` validation: `//thinking <level>` (`off`/`minimal`/`low`/`medium`/`high`), `//thinking get`, `//thinking clear`. Provider-side capability gating remains the safety net: a model without Thinking-Capability silently downgrades to `off`.

Both are engine-agnostic — they apply to any Engine that builds its turn chat via `EngineChatFactory.forProcess` (Arthur, Eddie, Frankie, Ford, Marvin, Zaphod, Trillian, Jeltz, Agrajag, Slartibartfast phases).

**`scratchpad` — Insight into the running process's notes.** The `scratchpad_*`-tools only write and read *for the Engine*; this verb gives the human the same view:

- `//scratchpad list` (or empty) — all slots with their size, uncapped (unlike the prompt block).
- `//scratchpad get <key>` — full content of a slot. Unknown key is `OK` with `(not set)`, not an error.
- `//scratchpad delete <key>` (`del`/`rm`) — drop a slot (Tombstone via `ScratchpadService.delete`).
- `//scratchpad block` — the rendered prompt block **verbatim**, i.e., exactly what the model sees per turn, including caps and size hints. Diagnostic path for [prompt-caching](/specs/prompt-caching) §5c.

**No `set`.** The Scratchpad is the Engine's private notepad, and the channel to communicate something to it is the chat. `delete` is the justified exception: since the prompt block puts every slot into *every* turn, an outdated note is permanent context pollution that the user would otherwise only get rid of by ending the process.

**Scope boundary:** the verb affects the addressed process. Notes of a closed process or a worker process are not accessible here — the same boundary as the prompt block (see `planning/scratchpad-review.md` §7).

---

## 10. Anchors (Current Code)

- Envelope + Dispatch: `vance-brain/.../command/{EngineCommand, EngineCommandDispatcher, EngineCommandHandler, EngineCommandResult}`.
- Permanent verbs: `vance-brain/.../command/{SystemEchoCommandHandler, PingCommandHandler}`.
- Generic Runtime-Param-Overrides: `vance-brain/.../command/{LlmCommandHandler, ThinkingCommandHandler}` + Overlay field `ThinkProcessDocument.engineParamOverrides` + atomic setter `ThinkProcessService.setEngineParamOverride` + Merge/Precedence in `EngineChatFactory.effectiveParams` (consumed by `applySamplingParams` + `readThinkingLevel`).
- Scratchpad insight: `vance-brain/.../command/ScratchpadCommandHandler` (reads `ScratchpadService`, renders for `block` the same `ScratchpadPromptBlock` as the prompt path).
- Transport: `vance-api/.../command/{ProcessCommandRequest, ProcessCommandResponse, EngineCommandOutcome}`, `MessageType.PROCESS_COMMAND`, `vance-brain/.../ws/handlers/ProcessCommandHandler`.
- Client Surface: vance-foot `ChatInputService` (`//verb`-Branch + Render).
- Design history & deferred decisions: [planning/engine-commands.md](/specs/engine-commands).
