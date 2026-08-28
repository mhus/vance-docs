---
title: "Vancetope — Completion Guard"
parent: Specs
permalink: /specs/completion-guard
---

<!-- AUTO-GENERATED from specification/public/en/completion-guard.md — do not edit here. -->

---
# Vancetope — Completion Guard

> A **Completion Guard** ensures that—especially with simpler models—"everything is truly done" at the end of a work unit. *What* "done" means and *how* it is reacted to is freely defined by a **JS Guard script**; the **mechanism** is generic: at the point where an Engine completes a work unit and would *deliver/yield*, the Guard script runs. It decides imperatively (LLM-Judge, Doc-Reads, real checks via Tools) and acts imperatively—typically, it injects a follow-up into its own Pending-Queue via `vance.guard.continueWith(prompt)`, so that the Engine continues working instead of yielding.
>
> The Guard is **cross-engine** (Frankie, Arthur, Eddie, and future Engines), **opt-in** (a pure no-op without configuration, zero cost), and **additively configurable** (Recipe block as Spawn-Default plus a Runtime Guard, installable via Command during operation).
>
> See also: [recipes](/specs/recipes) (`guard:` block) | [engine-commands](/specs/engine-commands) (Runtime verb `guard`) | [script-document-api](/specs/script-document-api) (`vance.guard.*`) | [light-llm-service](/specs/light-llm-service) (Judge backend for Guard scripts) | [frankie-engine](/specs/frankie-engine) (Yield points)

Example (deterministic Guard script):

```js
// _vance/guards/dev-done.js — no LLM, purely imperative
if (!vance.guard.loopValues.get('askedBuild')) {          // ask only once per loop
  vance.guard.loopValues.set('askedBuild', true);
  if (!/BUILD OK/.test(vance.guard.output)) {
    vance.guard.continueWith("Please run the build and report the result.");
  }
}
```

---

## 1. Terms and Delimitation

- **Guard = Script.** Judge and follow-up prompt are **no longer a config field** — they are control flow within the script. A Guard script is a JS document (Document-Cascade) or inline.
- **Generic, not engine-specific.** A common `CompletionGuardService` (script execution + Cap + Scratch) and a generic verb family `guard` — no `//frankie.guard`. Every Process can carry a Guard.
- **At the Yield point, not per Turn.** The Guard fires only where an Engine signals "done" and would deliver — not after every Turn (too expensive/noisy).

---

## 2. Yield Point per Engine

Each Engine calls `CompletionGuardService.evaluate(process, finalOutput, naturalStop)` at its Yield point. If no Guard is configured, this is a no-op.

| Engine | Yield Point |
|---|---|
| **Frankie** | the two stop paths (Natural-Stop / Tool-Terminate) |
| **Arthur** | after emitting the response, before the Process goes to IDLE (Reply generated **and** not waiting for user) |
| **Eddie** | analogous to Arthur |

Arthur and Eddie share the base class `StructuredActionEngine`; the call lives there **once** (`runCompletionGuard`), not twice per Engine.

---

## 3. Configuration

Two sources, **additive** (both apply simultaneously; Guards are checked sequentially, first match wins):

### 3.1 Recipe Block `guard:` (Spawn-Default)

A **list** of Guards ⇒ multiple scripts possible:

```yaml
guard:
  - script: _vance/guards/dev-done.js   # Document-Cascade path OR inline scriptBody
    params:                             # optional inputs → vance.params.*
      threshold: 3
    trigger: stop                       # stop | terminate | both   (Default: stop)
    maxRounds: 2                        # Cap against the guardRounds of the Process
    allowTools: false                   # false (Default): Supervisor-Surface; true: full Process-Tools
```

| Field | Type | Required | Meaning |
|---|---|---|---|
| `script` | `String` | one of two | Guard script path (Document-Cascade). |
| `scriptBody` | `String` | one of two | Inline Guard script. Exactly **one** of `script`/`scriptBody`. |
| `params` | `Map` | no | Inputs that the script sees as `vance.params.*` (this is how the bundled `llm-judge.js` is configured). |
| `trigger` | `stop \| terminate \| both` | no (`stop`) | Which Yield type the Guard applies to. |
| `maxRounds` | `int` | no | Hard cap against the `guardRounds` counter of the Process. |
| `allowTools` | `bool` | no (`false`) | Tool surface of the script (see §4.4). |

### 3.2 Runtime Guard (via Command during operation)

An **additional** Guard alongside the Recipe Guards, installable via the generic [`guard` verb family](/specs/engine-commands) — engine-agnostic, persisted per-Process (survives Suspend/Resume). Since a Guard v2 has only **one** field (the script path), **one** setter is sufficient:

| Command | Effect |
|---|---|
| `//guard script <path>` | Set Runtime Guard = script path (active once set) |
| `//guard inline <script>` | Set Runtime Guard = **inline** script body (mutually exclusive with `script`) |
| `//guard get` | Display Runtime Guard + Recipe Guards |
| `//guard clear` | Discard Runtime Guard (path **and** inline) |
| `//guard status` | Display Guard Scratch (`loopValues` + `sessionValues`) |
| `//guard status set <key> <value>` | Set Scratch value (loop; command-set values are **Strings**) |
| `//guard status del <key>` | Delete Scratch key (loop) |
| `//guard status clear` | Clear loop Scratch |
| `//guard status session …` | same ops on `sessionValues` |

The Scratch set writes to the same map that the Guard script reads — this allows inspecting, resetting (`del` so the Guard re-checks a concern), or seeding an "already asked" flag at runtime. Since command arguments are untyped, the value lands as a String; scripts use truthy checks (`if (loopValues.get('x'))`), so this works.

`script` and `inline` are mutually exclusive — setting one deletes the other; `inline` wins if both were ever set. The Runtime Guard runs with `trigger=stop` and the default `maxRounds`. A typical way to activate it is a Skill that fires `//guard script …` (or `//guard inline …`) in its `activate:` sequence and `//guard clear` in `deactivate:` — see [skills](/specs/skills) §2a. Example:

```yaml
activate:
- guard inline vance.process.notify('Hello World!');
deactivate:
- guard clear
```

The inline body is "everything after `inline`" (case-preserving, multi-line possible if the Skill YAML provides the `activate:` entry as a block scalar).

---

## 4. Mechanics

### 4.1 Script Execution

A synchronous run via the shared [`ScriptExecutor`](/specs/script-document-api) (GraalJS, **no** Process Spawn, **no** Lane Lock):

- Load body: `script` → Document-Cascade (`DocumentService.lookupCascade`), otherwise inline `scriptBody`.
- Bindings: `params` land as `vance.params.*`; the Guard surface as `vance.guard.*` (see §5).
- Wall-clock timeout (30s) + statement limit; a long Guard **blocks the Lane** — for truly long verification, use `vance.process.spawn(...)` (async) instead of a long Guard timeout.
- Cost: the script decides — a deterministic check is free, a `vance.llm.*`-Judge costs a small LLM call.

### 4.2 Action: `vance.guard.continueWith(prompt)`

If needed, the script calls `vance.guard.continueWith(prompt)`:

1. **Cap-aware** — becomes a no-op after `maxRounds` (returns `false`, the script sees it).
2. `guardRounds` is atomically `$inc`-remented, the fixed prompt is appended as a Pending-Message (prefix `[completion-guard]`, sender `_guard`, so UI/History can distinguish it from a real user turn), a Turn is scheduled.
3. At the next Yield, the Guard script runs again — until it no longer calls `continueWith` **or** the Cap applies. **No Engine needs to change its IDLE logic.**

"Fired" (`GuardEvaluation.fired`, by which the Engine recognizes that it continues working instead of yielding) is **derived** from "has injected `continueWith`" — there is no script return value.

First match wins: if multiple Guards are configured, the first one whose script injects wins; the remaining ones are checked again at the next completion.

### 4.3 Loop Safety

- **`guardRounds`-Cap** (int on `ThinkProcessDocument`, atomic `$inc` **before** injection, **persistent**) against `maxRounds`. If the Cap is reached, the script is skipped or `continueWith` is refused. Persistent because a process changing pods must not lose the counter.
- **Trigger-Match:** a `stop`-Guard does not fire on an explicit terminate and vice versa.
- **Fail-open:** Script errors (Timeout / Parse / Guest-Exception / Script not found) ⇒ skip Guard, allow normal Yield, WARN + metric. The Guard must **never** block the Engine. If the script has already injected before the error, the injection remains valid.

### 4.4 Tool Surface

A Guard is a **supervisor, not a worker**:

- `allowTools: false` (Default) — **Supervisor-Surface**: `vance.llm`, `vance.documents`, `vance.process` (notify/progress/spawn) are available; `vance.tools` is limited to `{process_spawn}` (no exec/file/arbitrary tools).
- `allowTools: true` — the **full Tool Surface of the Process** (`ThinkEngineService.newContext(process).tools()`), including exec/file.

**v1-Boundary:** `vance.documents.write` is also accessible in Supervisor mode (not tool-gated); only exec/file/arbitrary tools depend on `allowTools`.

---

## 5. `vance.guard.*` — the Script Surface

Only present in Guard runs (otherwise `null`). Full reference in [script-document-api.md](/specs/script-document-api) §7a.

**Context (read-only):** `guard.task` (first user message), `guard.output` (final output), `guard.round` (previous fires), `guard.maxRounds`, `guard.naturalStop`.

**Action:** `guard.continueWith(prompt)` → `boolean` (cap-aware, see §4.2). *Named `continueWith` because `continue` is a JS reserved word.*

**Scratch — "already asked":** `guard.loopValues` (per Process/Loop) and `guard.sessionValues` (per Session), each a store with `get()` / `get(key)` / `set(key,value)` / `has(key)` / `remove(key)`. **Transient, in-memory, not persistent.** This allows a script to remember across re-entrant runs that a concern has already been checked — so "did you run tests?" is asked exactly **once** instead of in an endless loop.

```js
if (!vance.guard.loopValues.get('askedTests')) {
  vance.guard.loopValues.set('askedTests', true);
  if (needsTests) vance.guard.continueWith("Please write tests.");
}
```

**Client direction:** via the existing typed channels `vance.process.notify(text, sev)` (`NOTIFY`) and `vance.process.progress(text, payload)` (`PROCESS_PROGRESS`) — no generic "raw send".

---

## 6. `guardRounds`-Reset per User-Turn

The `guardRounds` counter is **only** incremented. For a Frankie worker (= exactly one lifetime task), a per-lifetime cap is correct. A long-lived chat Engine (Arthur, Eddie) would, however, accumulate the counter over many user turns and **permanently** disable the Guard after `maxRounds` fires.

Therefore: `CompletionGuardService.resetIfUserTurn(process, inbox)` runs at **Turn start** and resets `guardRounds` to 0 **and** clears the **loop scratch** as soon as the drained Inbox contains **real** user input — recognized by `UserChatInput.fromUser` **not** being the Guard injection sender `_guard`. This ensures that **every new user request** starts the "are you really done?" negotiation with a full budget and a clean "already asked" slate; the Guard's own follow-up injection (sender `_guard`) deliberately does **not** replenish its budget (otherwise, no convergence).

---

## 7. Data Model (generic on `ThinkProcessDocument`)

- `guardRounds` (int) — Cap counter, atomic `$inc`, reset via `resetGuardRounds`. **Persistent.**
- `guardScriptOverride` (nullable String) — the Runtime Guard (script path).
- Loop-/Session-Scratch — **not** on the Document: in-memory in `CompletionGuardService` (bounded LRU, non-persistent). Pod changes lose the Scratch → in extreme cases, a concern is asked twice; the persistent Cap provides a hard limit.

---

## 8. Visibility

The user should see that the Guard took effect. In v1, firing is **logged** (`Completion guard fired id=… round=… prompt=…`) and counted via the metric `vance.guard.evaluations{outcome}` (`fired`/`passed`/`script_error`). A Guard script can additionally send `vance.process.notify(...)` / `progress(...)` to the client.

---

## 9. Anchors (Current Code)

- Service: `vance-brain/.../guard/CompletionGuardService.java` (`evaluate` / `runGuardScript` / `resolveGuards` / `resetIfUserTurn`).
- Script Surface: `vance-brain/.../script/VanceScriptApi.java` (`ScriptGuardApi` + `ScriptGuardScratchApi`), Callback `GuardScriptHost`.
- Frankie Yield: `vance-brain/.../frankie/FrankieEngine.java` (both stop paths).
- Arthur/Eddie Yield: `vance-brain/.../thinkengine/action/StructuredActionEngine.java` (`runCompletionGuard` + `resetGuardBudgetForUserTurn`).
- Recipe Block: `guard:` list → `ResolvedRecipe.guards` (`GuardConfig` + `GuardTrigger`).
- Runtime Command: `vance-brain/.../command/GuardCommandHandler.java` (verb `guard`).
- Bundled reusable Guard: `vance-defaults/_vance/guards/llm-judge.js`.
- Author Manual (agent-facing, on-demand): `vance-defaults/_vance/manuals/completion-guards.md` (`manual_read('completion-guards')`).
- Design History: [planning/completion-guard.md](/specs/completion-guard).
