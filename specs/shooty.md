---
title: "Vancetope — Shooty (Guard System)"
parent: Specs
permalink: /specs/shooty
---

<!-- AUTO-GENERATED from llm/specification/shooty.md (translated from the German specification/public/shooty.md) — do not edit here. -->

# Vancetope — Shooty (Guard System)

> **Shooty** is the cross-engine Guard system (Evolved from the
> Completion Guard; codename from H2G2 — Shooty & Bang Bang, the
> space cops). A Guard is a **JS script** that runs at a
> **Point** (hook point) and makes imperative decisions — judging via
> LightLlm, doc reads, real checks — and acts imperatively. The **mechanism**
> is generic: script execution via the shared `ScriptExecutor`, scratch stores,
> round cap, opt-in no-op; only the Point and the fail strategy differ:
>
> | Point | fires when | typical action | Fail Strategy |
> |---|---|---|---|
> | `STOP` / `TERMINATE` | Engine yield point | `continueWith(prompt)` — Follow-up to its own queue, Engine continues working | **fail-open** |
> | `START` | once per real user turn | `activateSkill(...)` — e.g., automatically activate Skills | **fail-open** |
> | `COMMAND` | before each Engine command dispatch | `deny(reason)` — e.g., judge if a command is safe via LightLlm | **fail-closed, hard** |
>
> The codename refers to the **subsystem** (`ShootyGuardService`, this spec);
> the **interfaces remain `guard`**: `vance.guard.*` in the script API, the
> `//guard` verb, the `guard:` Recipe block (public contract, like "Inbox"
> remains the visible name alongside Maximegalon).
>
> See also: [recipes](/specs/recipes) (`guard:` block) | [engine-commands](/specs/engine-commands) (Runtime verb `guard`, COMMAND gate in the Dispatcher) | [script-document-api](/specs/script-document-api) §7a (`vance.guard.*`) | [light-llm-service](/specs/light-llm-service) (Judge backend for Guard scripts) | [frankie-engine](/specs/frankie-engine) / [arthur-engine](/specs/arthur-engine) (Yield and Turn Start points)

Example (deterministic Stop Guard script):

```js
// _vance/guards/dev-done.js — no LLM, purely imperative
if (!vance.guard.loopValues.get('askedBuild')) {          // ask only once per loop
  vance.guard.loopValues.set('askedBuild', true);
  if (!/BUILD OK/.test(vance.guard.output)) {
    vance.guard.continueWith("Please run build and report the result.");
  }
}
```

Examples for the new Points:

```js
// trigger: start — activate Skill appropriate to the request; the script
// runs per real user turn, the script decides (here: only the first time).
if (/release|deploy/i.test(vance.guard.task) && !vance.guard.sessionValues.get('releaseSkl')) {
  vance.guard.sessionValues.set('releaseSkl', true);
  vance.guard.activateSkill('release-checklist');
}

// trigger: command — check command for safety with LightLlm (Fail-closed!)
const v = vance.llm.callForJson("command-guard", "Is this command safe?", {
  command: vance.guard.command.name, args: vance.guard.command.args });
if (!v || !v.safe) vance.guard.deny(v.reason || "judged unsafe by the command guard");
```

---

## 1. Terms and Delimitation

- **Guard = Script.** Judge and action are **not a config field** — they are
  control flow within the script. A Guard script is a JS document
  (Document Cascade) or inline.
- **Generic, not engine-specific.** A common
  `ShootyGuardService` (script execution + cap + scratch) and a generic
  verb family `guard` — no `//frankie.guard`. Every Process can
  carry Guards, at every Point.
- **Point instead of "just Yield".** The STOP/TERMINATE Guard fires only where
  an Engine signals "done" and would deliver — not per turn.
  The START Guard fires per real user turn, the COMMAND Guard per
  command dispatch.
- **Recipe-only, opt-in.** Without a `guard:` block (or Runtime override),
  every Point is a pure no-op, zero cost. The v2 Completion Guard semantics
  remain unchanged.
- **The Guard does not guard itself.** Everything that arises from a Guard run
  (LightLlm calls from the script, commands from a
  Skill activation, future hooks) is outside Shooty's judgment —
  implemented as a re-entrance marker (see §6).

## 2. Points and their Anchors

### 2.1 STOP / TERMINATE — Yield Point (unchanged from v2)

Each Engine calls
`ShootyGuardService.evaluate(process, finalOutput, naturalStop)` at its yield point.

| Engine | Yield Point |
|---|---|
| **Frankie** | the two stop paths (Natural Stop / Tool Terminate) |
| **Arthur** | a turn with chat output that does **not** wait for the user (DELEGATE/WAIT delivery, before the Process goes to IDLE) |
| **Eddie** | analogous to Arthur |

Arthur and Eddie share the base class `StructuredActionEngine`; the
call lives there **once** (`runCompletionGuard`). **Gate (conscious v2
decision):** the Guard fires only on `appendedChat &&
!awaitingUserInput` — a conversational reply parks the Process as
await-user (BLOCKED) — challenging every "hi!" with "really done?"
would be exactly what the gate prevents. The
DELEGATE/WAIT yields, however, would otherwise go empty to IDLE — precisely there,
`continueWith` gives the Process more work. Frankie has no gate: its Natural
Stop always delivers.

### 2.2 START — per real User Turn

`ShootyGuardService.guardsOnTurnStart(process, inbox)` — the common anchor
for all Engines: **first** `resetIfUserTurn` (budget reset + loop scratch wipe),
**then** `runStartGuards` (order is binding — the script starts on
a clean slate; the order is in this single method so it cannot
drift per Engine):

| Engine | Anchor |
|---|---|
| **Arthur / Eddie** | `StructuredActionEngine.guardsOnTurnStart` (delegates to the service anchor) |
| **Ford** | `runTurnFor`, Turn head — the `steer()` input runs through the same method |
| **Frankie** | `runTurn`, directly after `drainPending` and before prompt construction — a Start Guard that activates a Skill brings it into the **same** turn |
| **Trillian** | inherits `FrankieEngine.runTurn` — START runs with Frankie's anchor |

Semantics (intentionally so): no config field "Spawn or Turn" — the START Point
fires **once per real user turn** (detection like `resetIfUserTurn`:
`fromUser ≠ _guard`), and the **script decides** what it does
("every turn" vs. "only the first time" via Scratch). Consequence:

- "Once per Process" flags belong in `sessionValues` (survives the reset).
- Guard-injected turns fire **nothing** — otherwise, each
  Completion Guard round would multiply the Start Guards.

### 2.3 COMMAND — Gate before Dispatch

`ShootyGuardService.gateCommand(process, command)` — called in the
`EngineCommandDispatcher` **after** handler lookup, **before** `handler.handle`
(unknown verbs are not checked — they execute nothing). Thus runs on
the Lane with a fresh Process.

**Exceptions to the Gate:**
- Verb **`guard`** — Self-management: otherwise, a defective COMMAND Guard
  locks the user out of `//guard clear`, the only way to disable it.
- **Re-entrance marker active** (Guard origin, §6) — a Start Guard that
  activates Skills must not run through its own COMMAND Gate (and
  generated LightLlm calls not at all: they are not commands).

**v1 boundary:** The Gate only judges **Engine Commands** (Control Plane:
`//verb`, Skill sequences, planned LLM/Scheduler sources). **LLM Tool Calls**
(`file_*`, `exec_*` — `ToolDispatcher`) are a possible later Point
(`tool`), intentionally not part of v1.

## 3. Configuration

Two sources, **additive** (both apply simultaneously; Guards are
checked sequentially — at the Yield Point, the first hit wins; at the
COMMAND Point, the first denial refuses):

### 3.1 Recipe Block `guard:` (Spawn Default)

```yaml
guard:
  - script: _vance/guards/dev-done.js   # Document Cascade path OR inline scriptBody
    params:                             # optional inputs → vance.params.*
      threshold: 3
    trigger: stop                       # start | command | stop | terminate | both (Default: stop)
    maxRounds: 2                        # Cap against the guardRounds of the Process (only stop/terminate)
    allowTools: false                   # false (Default): Supervisor Surface; true: full Process Tools
```

| Field | Type | Required | Meaning |
|---|---|---|---|
| `script` | `String` | one of two | Guard script path (Document Cascade). |
| `scriptBody` | `String` | one of two | Inline Guard script. Exactly **one** of `script`/`scriptBody`. |
| `params` | `Map` | no | Inputs that the script sees as `vance.params.*`. |
| `trigger` | `String` | no (`stop`) | The Point: `start \| command \| stop \| terminate \| both` (`both` = Stop+Terminate, legacy shorthand). One Guard per Point — multiple Points = multiple entries. |
| `maxRounds` | `int` | no | Hard cap against the `guardRounds` counter of the Process. **Only evaluated at the STOP/TERMINATE Point** — START runs once per turn, COMMAND once per command; there, the backstop is the script timeout (30s). |
| `allowTools` | `bool` | no (`false`) | Tool Surface of the script (see §5.4). |

### 3.2 Runtime Guard (via Command during operation)

An **additional** Guard alongside the Recipe Guards, installable via the generic
[`guard` verb family](/specs/engine-commands) — engine-agnostic,
persisted per-Process. The Runtime Guard is a **STOP Guard** (runs with
`trigger=stop` and the default `maxRounds`):

| Command | Effect |
|---|---|
| `//guard script <path>` | Set Runtime Guard = script path |
| `//guard inline <script>` | Set Runtime Guard = inline body (mutually exclusive with `script`) |
| `//guard get` | Display Runtime Guard + Recipe Guards |
| `//guard clear` | Discard Runtime Guard |
| `//guard status [session] [set/del/clear …]` | Inspect/edit Guard Scratch |

A typical way to activate is a Skill that fires `//guard script …` in its
`activate:` sequence and `//guard clear` in `deactivate:` — see
[skills](/specs/skills) §2a.

## 4. Mechanics

### 4.1 Script Execution (all Points)

A synchronous run via the shared [`ScriptExecutor`](/specs/script-document-api)
(GraalJS, **no** Process spawn, **no** Lane lock):

- Load body: `script` → Document Cascade (`DocumentService.lookupCascade`),
  otherwise inline `scriptBody`.
- Bindings: `params` as `vance.params.*`; the Guard interface as
  `vance.guard.*` (see §5).
- Wall-clock timeout (30s) + statement limit; a long Guard blocks
  the Lane — for real long verification `vance.process.spawn(...)` (async).
- **Shared runtime environment:** the Scratch stores are keyed per **Process**
  or per **Session**, not per Point. A START Guard sets
  `skillsActivated=true`, a STOP Guard reads it.

### 4.2 Actions — per Point

- **`vance.guard.continueWith(prompt)`** (STOP/TERMINATE): cap-aware — becomes
  a no-op after `maxRounds` (returns `false`). `guardRounds` is atomically
  incremented, the prompt is appended as a Pending Message (prefix
  `[completion-guard]`, sender `_guard`), a turn is scheduled. "Fired" is
  derived from this. Outside the yield point, the action throws (script bug).
- **`vance.guard.activateSkill(name, args?)`** (any Point): sticky,
  auto-trigger-like (`SkillSteerProcessor.activate`, `oneShot=false`,
  `runAction=false`) — no separate action turn; at the START Point before
  prompt construction, the Skill takes effect in the same turn. Runs with the
  re-entrance marker set (§6), the Activate sequence bypasses the COMMAND Gate.
- **`vance.guard.setTurnPrompt(text)`** (START): **replaces** the system prompt
  of this turn completely — not additive: Recipe prompt, Skill blocks, and
  date context are gone for the turn; what the Guard wants (including Skills it
  activated itself) must be folded into the text. **One text per turn**
  (last call wins), cleared on the next real user turn — if no START Guard sets
  it, the prompt is **not manipulated** (default). A
  `_guard` follow-up turn (continueWith round) inherits the replacement: the same
  unit of work. Implemented via a `TurnContextHandler`
  (`GuardTurnContextHandler`): ephemeral request augmentation before **every**
  LLM request — the replacement never ends up in history, replay, or
  compaction. Engine coverage is free because every START Engine sends its
  requests through the `TurnContextHandlerRegistry` anyway. The
  handler runs **last** (`@Order(LOWEST_PRECEDENCE)`): "replaces
  completely" is the final word — system messages from request-augmenting
  handlers that ran before (Research-Pressure-Nudge) are also replaced.
  A handler that needed to survive a replacement would require higher
  precedence and a documented reason; there is none.
- **`vance.guard.deny(reason)`** (COMMAND): hard denies the command;
  result is `EngineCommandResult{outcome=ERROR, deniedByGuard=true}` with
  the reason in the message. Outside the COMMAND Point, the action throws.
- **Client direction:** `vance.process.notify(...)` / `progress(...)` — as before.

### 4.3 COMMAND: Fail-closed, hard — and Sequence Abort

If a COMMAND Guard is defined and **fails** (script error, timeout,
script not found) **or denies** (`deny`): the command call
fails hard. For the caller, veto/failed is the same hard error
(`deniedByGuard`), and the **sequence loop stops**: `SkillCommandRunner`
aborts the remaining commands of a Skill `activate:`/`deactivate:` sequence
(the existing best-effort rule for regular handler errors remains —
especially for `deactivate:` cleanup sequences; a Guard denial is a
conscious veto, not a transient error).

Thus, "the Guard never blocks" **only applies to STOP/START** (there,
fail-open: script error ⇒ skip, allow Yield/Turn normally, WARN +
metric; an already performed injection remains valid). At the COMMAND Point,
blocking *is* the task — the fail strategy is a **per-Point rule**.

**No round cap at the COMMAND Point:** the Point fires exactly once per command;
a continueWith spiral cannot occur there; the backstop is
the script timeout.

### 4.4 Tool Surface (all Points, unchanged)

A Guard is a **supervisor, not a worker**:

- `allowTools: false` (default) — **Supervisor Surface**: `vance.llm`,
  `vance.documents`, `vance.process` (notify/progress/spawn) are present;
  `vance.tools` is limited to `{process_spawn}`.
- `allowTools: true` — the **full Tool Surface of the Process**
  (`ThinkEngineService.newContext(process).tools()`), including exec/file.

## 5. `vance.guard.*` — the Script Interface

Only available in Guard runs (otherwise `null`). Full reference in
[script-document-api.md](/specs/script-document-api) §7a.

**Context (read-only):** `guard.task` (first user message; at the START Point: the
user input of **this** turn), `guard.output` (final output; `''` at
START/COMMAND Point), `guard.round` / `guard.maxRounds` (only meaningful at the Yield Point),
`guard.naturalStop`, **`guard.point`**
(`'start' | 'command' | 'stop' | 'terminate'`), **`guard.command`** (at the
COMMAND Point `{name, args}`, otherwise `null`).

**Actions:** `guard.continueWith(prompt)` → `boolean` (STOP/TERMINATE);
`guard.deny(reason)` (COMMAND); `guard.activateSkill(name, args?)` → `boolean`
(any Point); `guard.setTurnPrompt(text)` (START — completely replaces the system prompt
of the turn, one text per turn, default: no manipulation).
Unavailable actions throw `ScriptHostException`.

**Scratch — "already asked":** `guard.loopValues` (per Process/Loop; reset on
a real user turn) and `guard.sessionValues` (per Session;
survives the reset), each a store with `get()` / `get(key)` / `set(key,value)` /
`has(key)` / `remove(key)`. **Transient, in-memory, not persistent** —
shared across all Points of the Process.

## 6. Re-entrance: The Guard does not guard itself

For the duration of each Guard script run, the service sets a
**re-entrance marker** (InheritableThreadLocal — inheritable because GraalJS evaluates on
a watchdog child thread; host actions run there). The
COMMAND Gate skips everything with an active marker:

- **LightLlm calls from the script** — never subject to the Gate (not commands),
  and thus never self-guarding.
- **Commands fired by the script** — currently: the Activate sequence of a
  Skill activation from `vance.guard.activateSkill`. Otherwise, Guard scripts
  do not fire Engine Commands (the Script API has no command sending); should
  that arise, the marker automatically applies.
- **Spawned child processes** are *not* covered — a child is a new
  Process with its own Recipe; its Guards run normally (intended).

## 7. Loop Safety and `guardRounds` Reset (STOP/TERMINATE, unchanged)

- **`guardRounds`-Cap** (int on `ThinkProcessDocument`, atomic `$inc`
  **before** injection, persistent) against `maxRounds`.
- **Trigger Match:** a `stop` Guard does not fire on an explicit
  Terminate and vice versa; START/COMMAND Guards are not consulted at Yield Points
  at all.
- **`resetIfUserTurn`** runs at **Turn Start** and resets `guardRounds` to 0
  **and** clears the Loop Scratch as soon as the drained Inbox contains real
  user input (`fromUser ≠ _guard`). After that, the START Guards run.
  Thus, each new user request starts with a full budget and a clean slate;
  the guard's own injection deliberately does not replenish the budget.

## 8. Data Model (generic on `ThinkProcessDocument`)

- `guardRounds` (int) — Cap counter, atomic `$inc`, reset via
  `resetGuardRounds`. Persistent.
- `guardScriptOverride` / `guardScriptBodyOverride` (nullable String) — the
  Runtime Guard (STOP Point).
- Loop-/Session-Scratch — **not** on the Document: in-memory in the
  `ShootyGuardService` (bounded LRU, non-persistent).

## 9. Visibility & Metrics

Firings and denials are logged and counted via `vance.guard.evaluations{outcome}`
(`fired` / `denied` / `passed` / `script_error` — a Command Gate that
fail-closed denies on a script error counts `script_error`). `passed`
means: **at least one Guard ran and none failed** — a
script error counts `script_error`, never additionally `passed` (fail-open means
"the Engine continues", not "the Guard agreed"). A
COMMAND denial is seen by the caller as a regular command error response with the
denial message (`outcome=ERROR`), including the `//`-client. Guard scripts can
additionally send `vance.process.notify(...)` / `progress(...)`.

## 10. Anchors (Current Code)

- Service: `vance-brain/.../guard/ShootyGuardService.java` (`evaluate` /
  `runStartGuards` / `gateCommand` / `guardsOnTurnStart` = Reset + Start /
  `resetIfUserTurn` / Re-entrance marker `inGuardRun`).
- Script Interface: `vance-brain/.../script/VanceScriptApi.java`
  (`ScriptGuardApi` with `point`/`command` + `ScriptGuardScratchApi`), Callback
  `GuardScriptHost` (`continueWith` / `deny` / `activateSkill` / `setTurnPrompt`).
- Turn Prompt Replacement: `vance-brain/.../guard/GuardTurnContextHandler.java`
  (`TurnContextHandler`, hooked into the `TurnContextHandlerRegistry` —
  Engine coverage without further wiring).
- Yield Points: `vance-brain/.../frankie/FrankieEngine.java` (both stop paths);
  `vance-brain/.../thinkengine/action/StructuredActionEngine.java`
  (`runCompletionGuard` + `guardsOnTurnStart`).
- Turn Start (START): `ShootyGuardService.guardsOnTurnStart` (Reset + Start,
  in one place) — called by `StructuredActionEngine.guardsOnTurnStart`
  (Arthur/Eddie), `Ford.runTurnFor` (Turn head) and
  `FrankieEngine.runTurn` (after `drainPending`).
- COMMAND Gate: `vance-brain/.../command/EngineCommandDispatcher.java`
  (`gate`, exempt: verb `guard` + Re-entrance);
  `EngineCommandResult.deniedByGuard`; Sequence Abort in
  `vance-brain/.../skill/SkillCommandRunner.java`.
- Recipe Block: `guard:` list → `ResolvedRecipe.guards` (`GuardConfig` +
  `GuardPoint`).
- Runtime Command: `vance-brain/.../command/GuardCommandHandler.java`.
- Bundled reusable Guard: `vance-defaults/_vance/guards/llm-judge.js`.
- Author Manual: `vance-defaults/_vance/manuals/completion-guards.md`
  (`manual_read('completion-guards')`).
- Design History: [planning/shooty.md](/specs/shooty) +
  planning/archive/completion-guard.md.
