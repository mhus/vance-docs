# Vancetope — Shooty (Guard System)

> **Shooty** is the cross-engine Guard system (Evolved from the
> Completion Guard; Codename after H2G2 — Shooty & Bang Bang, the
> space cops). A Guard is a **JS script** that runs at a
> **Point** (hook point) and makes imperative decisions — Judge via
> LightLlm, Doc-Reads, real checks — and acts imperatively. The **mechanism**
> is generic: script execution via the shared `ScriptExecutor`, scratch stores,
> round cap, opt-in no-op; only the Point and the fail strategy differ:
>
> | Point | Fires when | Typical action | Fail strategy |
> |---|---|---|---|
> | `STOP` / `TERMINATE` | Engine yield point | `continueWith(prompt)` — Follow-up to its own queue, engine continues working | **fail-open** |
> | `START` | Once per real user turn | `activateSkill(...)` — e.g., automatically activate Skills | **fail-open** |
> | `COMMAND` | Before each Engine Command dispatch | `deny(reason)` — e.g., judge if a Command is safe via LightLlm | **fail-closed, hard** |
> | `TOOL` | Before each exec-run execution (`exec_run` + `work_`/`client_`-backends) | `deny(reason)` — e.g., deterministically check if the Command is dangerous | **fail-closed, hard** |
>
> The codename refers to the **subsystem** (`ShootyGuardService`, this spec);
> the **surfaces remain `guard`**: `vance.guard.*` in the script API, the
> `//guard` verb, the `guard:` Recipe block (public contract, like "Inbox"
> remains the visible name alongside Maximegalon).
>
> See also: [recipes](recipes.md) (`guard:` block) | [engine-commands](engine-commands.md) (Runtime verb `guard`, COMMAND gate in the Dispatcher) | [script-document-api](script-document-api.md) §7a (`vance.guard.*`) | [light-llm-service](light-llm-service.md) (Judge backend for Guard scripts) | [frankie-engine](frankie-engine.md) / [arthur-engine](arthur-engine.md) (Yield and Turn Start points)

Example (deterministic Stop-Guard script):

```js
// _vance/guards/dev-done.js — no LLM, purely imperative
if (!vance.guard.loopValues.get('askedBuild')) {          // ask only once per loop
  vance.guard.loopValues.set('askedBuild', true);
  if (!/BUILD OK/.test(vance.guard.output)) {
    vance.guard.continueWith("Please run the build and report the result.");
  }
}
```

Examples for the new Points:

```js
// trigger: start — activate Skill matching the request; the script
// runs per real user turn, the script decides (here: only the first time).
if (/release|deploy/i.test(vance.guard.task) && !vance.guard.sessionValues.get('releaseSkl')) {
  vance.guard.sessionValues.set('releaseSkl', true);
  vance.guard.activateSkill('release-checklist');
}

// trigger: command — check Command for safety with LightLlm (Fail-closed!)
const v = vance.llm.callForJson("command-guard", "Is this command safe?", {
  command: vance.guard.command.name, args: vance.guard.command.args });
if (!v || !v.safe) vance.guard.deny(v.reason || "judged unsafe by the command guard");
```

---

## 1. Terminology and Delimitation

- **Guard = Script or Java Handler.** Judge and action are **not
  config fields** — they are control flow. A Guard **script** is a
  JS document (Document Cascade) or inline; a Guard **handler** is
  a Java bean (`GuardHandler`-SPI), referenced by name in the Recipe.
  Both forms run through the same `ShootyGuardService` — same
  Points, fail strategies, scratch stores, round caps, re-entrance.
- **Generic, not engine-specific.** A common
  `ShootyGuardService` (script and handler execution + cap + scratch) and a generic
  verb family `guard` — no `//frankie.guard`. Every Process can
  have Guards, at every Point.
- **Point instead of "only Yield".** The STOP/TERMINATE Guard fires only where
  an Engine signals "done" and would deliver — not per turn.
  The START Guard fires per real user turn, the COMMAND Guard per
  Command dispatch.
- **Recipe-only, opt-in.** Without a `guard:` block (or Runtime override),
  every Point is a pure no-op, zero cost. The v2 Completion Guard semantics
  remain unchanged.
- **The Guard does not guard itself.** Everything that arises from a Guard run
  (LightLm calls of the script, Commands of a
  Skill activation, future hooks) is outside Shooty's judgment —
  implemented as a re-entrance marker (see §6).

## 2. Points and their Anchors

### 2.1 STOP / TERMINATE — Yield Point (unchanged from v2)

Every Engine calls `ShootyGuardService.evaluate(process, finalOutput, naturalStop)`
at its yield point.

| Engine | Yield Point |
|---|---|
| **Frankie** | the two Stop paths (Natural-Stop / Tool-Terminate) |
| **Arthur** | a turn with chat output that **does not** wait for the user (DELEGATE/WAIT delivery, before the Process goes to IDLE) |
| **Eddie** | analogous to Arthur |

Arthur and Eddie share the base class `StructuredActionEngine`; the
call lives there **once** (`runCompletionGuard`). **Gate (conscious v2
decision):** the Guard fires only when `appendedChat &&
!awaitingUserInput` — a conversational reply parks the Process as
await-user (BLOCKED) — challenging every "hi!" with "really done?"
would be exactly what the gate prevents. The
DELEGATE/WAIT yields, however, would otherwise go empty to IDLE — precisely there
`continueWith` gives the Process more work. Frankie has no gate: its Natural
Stop always delivers.

### 2.2 START — per real User Turn

`ShootyGuardService.guardsOnTurnStart(process, inbox)` — the common anchor
of all Engines: **first** `resetIfUserTurn` (budget reset + loop scratch wipe),
**then** `runStartGuards` (order is binding — the script starts on a
clean slate; the order is in this one method so it cannot
drift per Engine):

| Engine | Anchor |
|---|---|
| **Arthur / Eddie** | `StructuredActionEngine.guardsOnTurnStart` (delegates to the service anchor) |
| **Ford** | `runTurnFor`, Turn head — the `steer()` input runs through the same method |
| **Frankie** | `runTurn`, directly after `drainPending` and before prompt construction — a Start Guard that activates a Skill brings it into the **same** Turn |
| **Trillian** | inherits `FrankieEngine.runTurn` — START runs via Frankie's anchor |

Semantics (intentionally so): no config field "Spawn or Turn" — the START Point
fires **once per real user turn** (detection like `resetIfUserTurn`:
`fromUser ≠ _guard`), and the **script decides** what it does
("every turn" vs. "only the first time" via Scratch). Consequence:

- "Once per Process" flags belong in `sessionValues` (survives the reset).
- Guard-injected Turns fire **nothing** — otherwise, each
  Completion Guard round would multiply the Start Guards.

### 2.3 COMMAND — Gate before Dispatch

`ShootyGuardService.gateCommand(process, command)` — called in the
`EngineCommandDispatcher` **after** handler lookup, **before** `handler.handle`
(unknown verbs are not checked — they execute nothing). Thus runs on
the Lane with a fresh Process.

**Exceptions from the Gate:**
- Verb **`guard`** — Self-Management: otherwise, a defective COMMAND Guard
  locks the user out of `//guard clear`, the only way to disable it.
- **Re-entrance marker active** (Guard origin, §6) — a Start Guard that
  activates Skills must not run through its own COMMAND Gate (and
  generated LightLm calls not at all: they are not Commands).

### 2.4 TOOL — Gate before exec-run execution

**v3.2 — the `tool`-Point (formerly "v1-boundary"):** The COMMAND Gate
continues to judge only **Engine Commands** (Control-Plane: `//verb`, Skill sequences,
planned LLM/Scheduler sources). LLM Tool Calls have had their own
Point since v3.2: **`TOOL`** fires in the `ToolDispatcher` **before the execution** of
exec-run calls — scope is name-derived `exec_run` including `work_`/
`client_`-backends (any surface the model can reach); other
Tool families (`file_*`, `python_run`, …) can be added later. Fail-
closed like COMMAND (Denial or Guard error ⇒ Tool Call fails hard with
caller-visible error message, the model can react), no Round-Cap
(fires exactly once per call), re-entrance marker applies (Guard's own Exec
Calls are not guarded themselves). Headless calls without a Process are never
subject to the Point.

**No Round-Cap at the COMMAND/TOOL Point:** both fire exactly
once per call, a continueWith spiral cannot arise there; the backstop is
the script timeout.

## 3. Configuration

Two sources, **additive** (both apply simultaneously; Guards are
checked sequentially — at the Yield Point, the first hit wins, at the
COMMAND Point, the first denial refuses):

### 3.1 Recipe Block `guard:` (Spawn Default)

```yaml
guard:
  - script: _vance/guards/dev-done.js   # Document Cascade path OR inline scriptBody
    params:                             # optional inputs → vance.params.*
      threshold: 3
    trigger: stop                       # start | command | stop | terminate | both (Default: stop)
    maxRounds: 2                        # Cap against the guardRounds of the Process (only stop/terminate)
    allowTools: false                   # false (Default): Supervisor surface; true: full Process tools
```

```yaml
guard:
  - handler: fence-check            # Java Handler by name — shared evaluation machinery
    trigger: stop                   # optional; without trigger, the Handler runs at ALL Points
    maxRounds: 2
  - script: _vance/guards/dev-done.js   # Scripts and Handlers mix freely in ONE list (order = evaluation)
```

| Field | Type | Required | Meaning |
|---|---|---|---|
| `script` | `String` | one of three | Guard script path (Document Cascade). |
| `scriptBody` | `String` | one of three | Inline Guard script. Exactly **one** of `script`/`scriptBody`/`handler`. |
| `handler` | `String` | one of three | Name of a Java `GuardHandler` (§3.3). |
| `params` | `Map` | no | Inputs that the script sees as `vance.params.*`. |
| `trigger` | `String` | no (`stop`; Handler: `all`) | The Point: `start \| command \| tool \| stop \| terminate \| both` (`both` = Stop+Terminate, legacy shortcut). Scripts: one Guard per Point — multiple Points = multiple entries. Handlers additionally `all` (Default): runs at all Points, unused hooks are no-ops. |
| `maxRounds` | `int` | no | Hard cap against the `guardRounds` counter of the Process. **Evaluated only at the STOP/TERMINATE Point** — START runs once per turn, COMMAND once per Command; there, the backstop is the script timeout (30s). |
| `allowTools` | `bool` | no (`false`) | Tool surface of the script (see §5.4). |

**Guard Script Library and Validation.** Reusable Guard scripts live under `_vance/guards/<name>.js` (Document Cascade, referenced by the Recipe block); the "Guards" settings area (kind `vance-guard`) inventories, creates, and edits them in raw text. **No top-level `return` in Guard scripts** — GraalJS rejects it as a statement (SyntaxError), and at the fail-open Points, the error would be silently swallowed: the Guard would then never run. Use if/else for early exits. The `GuardDocKindHandler` validates saved scripts with the parse-only GraalJS check (`JsValidationService`, with executor options `js.top-level-await` + experimental gate) — a finding is exactly what the Engine would not evaluate. (The bundled `llm-judge.js` shipped with top-level `return` and thus never ran — fixed.)

### 3.2 Runtime Guard (via Command during operation)

An **additional** Guard alongside the Recipe Guards, installable via the generic
[`guard` verb family](engine-commands.md) — engine-agnostic,
persisted per-Process. The Runtime Guard is a **STOP Guard** (runs with
`trigger=stop` and the default `maxRounds`):

| Command | Effect |
|---|---|
| `//guard script <path>` | Set Runtime Guard = script path |
| `//guard inline <script>` | Set Runtime Guard = inline body (mutually exclusive to `script`) |
| `//guard get` | Display Runtime Guard + Recipe Guards |
| `//guard clear` | Discard Runtime Guard |
| `//guard status [session] [set/del/clear …]` | Inspect/edit Guard Scratch |

A typical way to activate is a Skill that fires `//guard script …` in its
`activate:` sequence and `//guard clear` in `deactivate:` — see
[skills](skills.md) §2a.

### 3.3 Guard Handlers (Java Defaults)

An entry with `handler: <name>` references a `GuardHandler` bean instead
of a script — the same evaluation machinery, only the "body" is a
typed, testable Java method instead of GraalJS. The handler implements the
hooks it needs — `onStart` / `onCommand` / `onStop` / `onTerminate`,
default no-ops — and receives a `GuardContext`: the Java equivalent to
`vance.guard.*` with the same actions (cap-aware `continueWith`, `deny`,
`activateSkill`, `setTurnPrompt`) and the same scratch stores (script and
handler flags share the board).

- **All Points, one Handler.** Without `trigger`, the handler runs at every
  Point; unoverridden hooks are free no-ops. `trigger:` restricts,
  `trigger: all` is the explicit form of the default.
- **Names lazily validated.** Recipes travel (Kits), the set of handlers varies
  per distribution (Addons provide handlers as beans) — an unknown name
  does not brick a Recipe on loading, but counts like a
  missing script during Guard execution: fail-open at START/STOP, fail-closed at COMMAND.
- **Duplicate names boot-fail** (`GuardHandlerRegistry`).
- **Included defaults:** `fence-check` (deterministic, LLM-free
  validation of output: never-closed fences, empty fence bodies →
  repair via `continueWith`; unknown `vance-*`-kinds are allowed —
  placeholder contract of the block editor), `exec-check` (output mentions
  Build/Exec commands without reported result → run and report result;
  `commands`/`results` regexes can be overridden via `params`) and
  `exec-danger` (TOOL-Point: deterministic danger scan of the `exec_run`-
  command — defaults only clearly catastrophic like `rm -rf /`, fork bombs,
  raw device writes, `curl … | sh`, `shutdown`; anything debatable (`rm -rf`
  on Scratch, `--force`-pushes) remains a project matter, `patterns` regexes via
  `params` completely replace the defaults).

Handlers are the place for **included defaults**; user-typed,
project-specific Guards remain JS scripts.

## 4. Mechanics

### 4.1 Guard Execution (all Points)
A script entry runs synchronously via the shared [`ScriptExecutor`](script-document-api.md)
(GraalJS, **no** Process spawn, **no** Lane lock):

- **Form:** a `handler:` entry dispatches to the `GuardHandler` method of the
  Point (`GuardContext` instead of `vance.guard.*` bindings, same host, same
  scratch stores); script entries run as follows via the `ScriptExecutor`.

- Load body: `script` → Document Cascade (`DocumentService.lookupCascade`),
  otherwise inline `scriptBody`.
- Bindings: `params` as `vance.params.*`; the Guard surface as
  `vance.guard.*` (see §5).
- Wall-clock timeout (30s) + statement limit; a long Guard blocks
  the Lane — for truly long verification `vance.process.spawn(...)` (async).
- **Shared runtime environment:** the scratch stores are keyed per **Process**
  or per **Session**, not per Point. A START Guard sets
  `skillsActivated=true`, a STOP Guard reads it.

### 4.2 Actions — per Point

- **`vance.guard.continueWith(prompt)`** (STOP/TERMINATE): cap-aware — becomes
  a no-op after `maxRounds` (returns `false`). `guardRounds` is atomically
  incremented, the prompt is appended as a pending message (prefix
  `[completion-guard]`, sender `_guard`), a Turn is scheduled. "Fired" is
  derived from this. Outside the Yield Point, the action throws (script bug).
- **`vance.guard.activateSkill(name, args?)`** (any Point): sticky,
  auto-trigger-like (`SkillSteerProcessor.activate`, `oneShot=false`,
  `runAction=false`) — no separate Action Turn; at the START Point before
  prompt construction, the Skill takes effect in the same Turn. Runs with the
  re-entrance marker set (§6), the Activate sequence bypasses the COMMAND Gate.
- **`vance.guard.setTurnPrompt(text)`** (START): **replaces** the system prompt
  of this Turn completely — not additive: Recipe prompt, Skill blocks, and
  date context are gone for the Turn; what the Guard wants (including Skills it
  activated itself) must be folded into the text. **One text per Turn**
  (last call wins), cleared at the next real user Turn — if no
  START Guard sets it, the prompt is **not manipulated** (Default). A
  `_guard` follow-up Turn (continueWith round) inherits the replacement: the same
  unit of work. Implemented via a `TurnContextHandler`
  (`GuardTurnContextHandler`): ephemeral request augmentation before **every**
  LLM request — the replacement never ends up in history, replay, or
  compaction. Engine coverage is free because every START Engine sends its
  requests through the `TurnContextHandlerRegistry` anyway. The
  handler runs **last** (`@Order(LOWEST_PRECEDENCE)`): "replaces completely" is
  the final word — system messages of request-augmenting handlers that ran
  before (Research-Pressure-Nudge) are also replaced.
  A handler that needed to survive a replacement would need higher
  precedence and a documented reason; there is none.
- **`vance.guard.deny(reason)`** (COMMAND): denies the Command hard;
  result is `EngineCommandResult{outcome=ERROR, deniedByGuard=true}` with
  the reason in the message. Outside the COMMAND Point, the action throws.
- **Client direction:** `vance.process.notify(...)` / `progress(...)` — as before.

### 4.3 COMMAND: Fail-closed, hard — and Sequence Abort

If a COMMAND Guard is defined and **fails** (script error, timeout,
script not found) **or denies** (`deny`): the Command call
fails hard. For the caller, veto/failed is the same hard error
(`deniedByGuard`), and the **sequence loop stops**: `SkillCommandRunner`
aborts the remaining Commands of a Skill `activate:`/`deactivate:` sequence
(the existing best-effort rule for regular handler errors remains —
especially for `deactivate:` cleanup sequences; a Guard denial is a
conscious veto, not a transient error).

Thus, "the Guard never blocks" **only applies to STOP/START** (there
fail-open: script error ⇒ skip, allow Yield/Turn normally, WARN +
metric; an already performed injection remains valid). At the COMMAND/TOOL-
Point, blocking *is* the task — the fail strategy is a **per-Point
rule**. (The original Round-Cap statement of the COMMAND Point is with the
TOOL extension in §2.3.)

### 4.4 Tool Surface (all Points, unchanged)

A Guard is a **supervisor, not a worker**:

- `allowTools: false` (Default) — **Supervisor Surface**: `vance.llm`,
  `vance.documents`, `vance.process` (notify/progress/spawn) are present;
  `vance.tools` is restricted to `{process_spawn}`.
- `allowTools: true` — the **full Tool Surface of the Process**
  (`ThinkEngineService.newContext(process).tools()`), including exec/file.

## 5. `vance.guard.*` — the Script Surface

Only present in Guard runs (otherwise `null`). Full reference in
[script-document-api.md](script-document-api.md) §7a.

**Context (read-only):** `guard.task` (first user message; at the START Point: the
user input of **this** Turn), `guard.output` (final output; `''` at the
START/COMMAND Point), `guard.round` / `guard.maxRounds` (only at the Yield Point
`guard.naturalStop`, **`guard.point`**
(`'start' | 'command' | 'tool' | 'stop' | 'terminate'`), **`guard.command`** (at the
COMMAND Point `{name, args}`, otherwise `null`), **`guard.tool`** (at the TOOL Point
`{name, args}` — for `exec_run`, the Command is in `args.command`;
otherwise `null`).

**Actions:** `guard.continueWith(prompt)` → `boolean` (STOP/TERMINATE);
`guard.deny(reason)` (COMMAND/TOOL); `guard.activateSkill(name, args?)` → `boolean`
(any Point); `guard.setTurnPrompt(text)` (START — replaces the system prompt
of the Turn completely, one text per Turn, Default: no manipulation).
Unavailable actions throw `ScriptHostException`.

**Scratch — "already asked":** `guard.loopValues` (per Process/Loop; reset at the
real user Turn) and `guard.sessionValues` (per Session;
survives the reset), each a store with `get()` / `get(key)` / `set(key,value)` /
`has(key)` / `remove(key)`. **Transient, in-memory, not persistent** —
shared across all Points of the Process.

## 6. Re-entrance: The Guard does not guard itself

For the duration of each Guard script run, the service sets a
**re-entrance marker** (InheritableThreadLocal — inheritable because GraalJS evaluates on
a watchdog child thread; host actions run there). The
COMMAND Gate skips everything with an active marker:

- **LightLm calls of the script** — never subject to the Gate (not Commands),
  and thus never self-guarded.
- **Commands fired by the script** — currently: the Activate sequence of a
  Skill activation from `vance.guard.activateSkill`. Otherwise, Guard scripts
  do not fire Engine Commands (the Script API has no Command sending); should
  that arise, the marker automatically applies.
- **Spawned child processes** are *not* covered — a child is a new
  Process with its own Recipe; its Guards run normally (intended).

## 7. Loop Safety and `guardRounds` Reset (STOP/TERMINATE, unchanged)

- **`guardRounds`-Cap** (int on `ThinkProcessDocument`, atomic `$inc`
  **before** injection, persistent) against `maxRounds`.
- **Trigger Match:** a `stop`-Guard does not fire on an explicit
  Terminate and vice versa; START/COMMAND Guards are not consulted at Yield Points
  at all.
- **`resetIfUserTurn`** runs at **Turn Start** and resets `guardRounds` to 0
  **and** clears the Loop Scratch as soon as the drained Inbox carries real
  user input (`fromUser ≠ _guard`). After that, the START Guards run.
  Thus, each new user request starts with a full budget and a clean slate;
  the guard's own injection deliberately does not replenish the budget.

## 8. Data Model (generic on `ThinkProcessDocument`)

- `guardRounds` (int) — Cap counter, atomic `$inc`, reset via
  `resetGuardRounds`. Persistent.
- `guardScriptOverride` / `guardScriptBodyOverride` (nullable String) — the
  Runtime Guard (STOP Point).
- Loop/Session Scratch — **not** on the Document: in-memory in the
  `ShootyGuardService` (bounded LRU, non-persistent).

## 9. Visibility & Metrics

Firings and denials are logged and counted via `vance.guard.evaluations{outcome}`
(`fired` / `denied` / `passed` / `script_error` / `handler_error` — a Command Gate that
fail-closed denies on a script or handler error counts `script_error`/`handler_error`). `passed`
means: **at least one Guard ran and none failed** — a
script error counts `script_error`, never additionally `passed` (fail-open means
"the Engine continues", not "the Guard agreed"). A
COMMAND denial is seen by the caller as a regular Command error response with the
denial message (`outcome=ERROR`), including the `//`-client. Guard scripts can
additionally send `vance.process.notify(...)` / `progress(...)`.

## 10. Anchors (Current Code)

- Service: `vance-brain/.../guard/ShootyGuardService.java` (`evaluate` /
  `runStartGuards` / `gateCommand` / `guardsOnTurnStart` = Reset + Start /
  `resetIfUserTurn` / Re-entrance marker `inGuardRun`).
- Script Surface: `vance-brain/.../script/VanceScriptApi.java`
  (`ScriptGuardApi` with `point`/`command` + `ScriptGuardScratchApi`), Callback
  `GuardScriptHost` (`continueWith` / `deny` / `activateSkill` / `setTurnPrompt`).
- Turn Prompt Replacement: `vance-brain/.../guard/GuardTurnContextHandler.java`
  (`TurnContextHandler`, hooked into the `TurnContextHandlerRegistry` —
  Engine coverage without further wiring).
- Yield Points: `vance-brain/.../frankie/FrankieEngine.java` (both Stop paths);
  `vance-brain/.../thinkengine/action/StructuredActionEngine.java`
  (`runCompletionGuard` + `guardsOnTurnStart`).
- Turn Start (START): `ShootyGuardService.guardsOnTurnStart` (Reset + Start,
  in one place) — called by `StructuredActionEngine.guardsOnTurnStart`
  (Arthur/Eddie), `Ford.runTurnFor` (Turn head) and
  `FrankieEngine.runTurn` (after `drainPending`).
- COMMAND Gate: `vance-brain/.../command/EngineCommandDispatcher.java`
  (`gate`, exempt: verb `guard` + Re-entrance);
  `EngineCommandResult.deniedByGuard`; Sequence abort in
  `vance-brain/.../skill/SkillCommandRunner.java`.
- Recipe Block: `guard:` list → `ResolvedRecipe.guards` (sealed:
  `ScriptGuard` | `HandlerGuard` + `GuardPoint`).
- Handler SPI: `vance-brain/.../guard/handler/` — `GuardHandler` (Hooks +
  `name()`), `GuardContext` (Java equivalent to `vance.guard.*`),
  `GuardHandlerRegistry` (Boot-fail on duplicate names), `GuardToolCall`;
  Defaults `FenceCheckHandler` (`fence-check`), `ExecCheckHandler`
  (`exec-check`) and `ExecDangerHandler` (`exec-danger`, TOOL Point).
- TOOL Gate: `vance-brain/.../tools/ToolGuardGate.java` (Scope rule + Process-
  Lookup, fail-closed also in the glue path) called from
  `vance-brain/.../tools/ToolDispatcher.java` (`invoke`, before Permission-Enforce);
  Guard logic `ShootyGuardService.gateTool`.
- Runtime Command: `vance-brain/.../command/GuardCommandHandler.java`.
- Bundled reusable Guard: `vance-defaults/_vance/guards/llm-judge.js`.
- Author Manual: `vance-defaults/_vance/manuals/completion-guards.md`
  (`manual_read('completion-guards')`).
- Design History: [planning/shooty.md](../../planning/shooty.md) +
  [planning/archive/completion-guard.md](../../planning/archive/completion-guard.md).
