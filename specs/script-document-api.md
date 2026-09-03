---
title: "Script Document API — Specification"
parent: Specs
permalink: /specs/script-document-api
---

<!-- AUTO-GENERATED from llm/specification/script-document-api.md (translated from the German specification/public/script-document-api.md) — do not edit here. -->

# Script Document API — Specification

> Status: v1. Binding product specification for running Cortex scripts
> to access project documents. Four stable contracts: ENV contract for spawned
> subprocesses, SCRIPT_RUN-JWT, label convention on `ExecJob`s, and the
> `vance.documents.*` API surface (JS in-JVM + Python via REST) plus
> the `vance.llm.*` surface for synchronous LightLlm calls (JS-only).
>
> See also: [cortex.md](/specs/cortex) | [llm-resource-management.md](/specs/llm-resource-management)

## 1. Definition and Delimitation

A **script run** is a single execution of a Cortex script (currently JavaScript via GraalJS or Python via Subprocess). The Document API is the interface through which the running script code can read and write project documents — symmetrically in both languages, with different transport.

**What the API is:**

- Stable contract `vance.documents.{read, write, exists, list, delete, meta}` on both sides.
- Scope-pinned to the Tenant and Project of the Run-Owner — scripts cannot access external projects.
- Permissions of the spawning user — no privilege escalation by the subprocess.

**What the API is not:**

- No Binary-Surface (`readBytes`/`writeBytes`) in v1 — Plain-Text covers current use cases, the GraalJS byte boundary is not worth the extra effort.
- No dynamic listing/globbing — `list(prefix)` is prefix-match, not pattern-match.
- No LLM-triggered Python — `execute_python` / `python_run` currently spawn without ENV injection. Document access works exclusively from the **Cortex Run Path** (user clicks Run on a Python or JS doc).

## 2. Spawn Paths and Availability

| Spawn Path | Language | Document API available |
|---|---|---|
| Cortex Run button on JS-Doc | JavaScript (GraalJS, in-JVM) | Yes — as `vance.documents` Host-Binding |
| Cortex Run button on Python-Doc | Python (Subprocess) | Yes — `import vance` from the bundled Helper |
| LLM `execute_javascript` Tool | JavaScript (GraalJS, in-JVM) | Yes — same Host-Binding path |
| LLM `execute_python` Tool | Python (Subprocess) | **No** — ENV injection intentionally not wired |
| LLM `python_run` Tool | Python (Subprocess) | **No** — see above |
| Magrathea `shell_task` | Shell | **No** — non-scripted execution |

The LLM-Python paths are intentionally excluded in v1: `vance.py` helper bundling and token minting currently only run in `PythonExecutionService.executeAsync(...)` with `username != null` — and only `PythonCortexController` passes the user through. A later extension to the LLM paths is a minor wiring effort, not a new contract.

## 3. ENV Contract (Subprocess Contract for Python)

When the Brain spawns a Python subprocess for a script run, the subprocess environment is **sealed**: the JVM environment is completely cleared before `ProcessBuilder.start()` (`pb.environment().clear()`), and only the variables listed below are set. This prevents leaks of Brain secrets (provider keys, DB credentials) into the script scope.

Guaranteed variables set per script run:

| Variable | Value | Expectation in script |
|---|---|---|
| `VANCE_BRAIN_URL` | `http://localhost:<server.port>/brain/<tenant>` | Base URL for REST calls — `vance.py` appends `/documents/...` |
| `VANCE_TENANT` | Tenant ID | informational only; URL already has the Tenant |
| `VANCE_PROJECT` | Project ID | as `?projectId=...` Query-Param to REST endpoints |
| `VANCE_SESSION` | Session ID, if present | informational; may be missing if the spawn has no session |
| `VANCE_RUN_ID` | UUID, allocated by Brain per run | in JWT as `srid` claim |
| `VANCE_TOKEN` | SCRIPT_RUN-JWT (see §4) | as `Authorization: Bearer ...` Header |

Plus minimal shell defaults to keep the subprocess functional (Python's `subprocess` module, pip caches):

```
PATH=/usr/local/bin:/usr/bin:/bin
HOME=<JVM user.home>
LANG=C.UTF-8
LC_ALL=C.UTF-8
```

**Contract detail Loopback Addressing**: `VANCE_BRAIN_URL` always addresses `localhost` with the local Spring port. Subprocess and Brain share the same Pod (same JVM instance). Cross-Pod routing is Out-of-Scope in v1 — long-running scripts that should survive Pod migration are a separate future extension.

Implementation: `ScriptRunEnvironmentBuilder` in `vance-brain/src/main/java/de/mhus/vance/brain/access/`. Consumed by `PythonExecutionService.executeAsync(...)`.

## 4. SCRIPT_RUN-JWT

A dedicated JWT type with lifecycle binding to the Registry, not to the TTL. The token remains valid as long as the run is `RUNNING` in the `ExecutionRegistryService`.

### 4.1 Claims

In addition to the standard claims from `VanceJwtClaims`:

| Claim | Name | Description |
|---|---|---|
| `sub` | (Standard) | Username of the spawning user — determines permissions |
| `tid` | `tid` | Tenant ID |
| `tt` | `tt` | `script_run` (lowercase enum-name) |
| `srid` | `srid` | Run ID (UUID), allocated by Brain at spawn; identical to `cortex.runId` label on ExecJob |
| `pid` | `pid` | Project ID — scope pin to the spawning project |
| `sid` | `sid` | Session ID, optional (only set if the spawn has a session) |
| `iat` / `exp` | (Standard) | issuedAt / expiresAt — `exp` is 24h Safety-Net |

Issuance: `JwtService.createScriptRunToken(tenantId, username, runId, projectId, sessionId, expiresAt)`. Signed with the Tenant-`JWT_SIGNING`-Key — the same mechanism as standard tokens. No separate signing keys.

### 4.2 Validation

Upon arrival via the `BrainAccessFilter`, the token undergoes additional checks (beyond signature verification performed by `AccessFilterBase`):

1. **Token Type Acceptance:** `BrainAccessFilter.isTokenTypeAcceptable` explicitly allows `SCRIPT_RUN` in addition to `ACCESS`. `REFRESH` remains strictly rejected.
2. **Loopback Origin:** `request.getRemoteAddr()` must be a loopback address (`127.0.0.1`, `::1`, `0:0:0:0:0:0:0:1`). HTTP-spoofable headers like `X-Forwarded-For` are **not** consulted.
3. **Registry-RUNNING-Check:** The `srid` claim must appear as a `cortex.runId` label on an `ExecutionRegistryEntry` whose status is `RUNNING` and whose Tenant/Project match the claims.

If any of the three checks fail → 401 Unauthorized. Implementation of additional checks: `ScriptRunAuthService` in `vance-brain/src/main/java/de/mhus/vance/brain/access/`.

### 4.3 Lifecycle

Token validity **automatically** ends as soon as the ExecJob reaches a terminal status (`COMPLETED`, `FAILED`, `KILLED`, `ORPHANED`). No blocklist maintenance is needed: the Registry status check immediately detects the transition.

The `exp` claim is only a safety net for orphaned Registry entries (e.g., Brain restart in the middle of a run). 24h is generous, as an orphaned run is already a defect.

## 5. ExecJob Label Convention

Cross-cutting per-instance metadata on `ExecJob.labels()` and `ExecutionRegistryEntry.labels()`, defined in `vance-brain/src/main/java/de/mhus/vance/brain/tools/exec/ExecLabels.java`. Stored in-memory, **never** sent to Micrometer/Prometheus (cf. CLAUDE.md metric tag rule — this does not apply here, as there is no aggregation).

### 5.1 Reserved Keys

| Key | Values | Who sets |
|---|---|---|
| `cortex.source` | `cortex` / `llm-tool` / `workflow` / `manual` | Spawn Caller |
| `cortex.language` | `python` / `js` / `shell` | Spawn Caller |
| `cortex.runKind` | `script` / `shell` / `install` / `uninstall` / `validate` | Spawn Caller |
| `cortex.document` | Full Doc Path (e.g., `scripts/foo.py`) | Spawn Caller, if the run is tied to a Doc |
| `cortex.runId` | UUID, identical to `srid` JWT claim | `ScriptRunEnvironmentBuilder`, automatically during token mint |

### 5.2 User-/Tool-set Keys

Freely assignable. Convention: `meta.*` namespace or unprefixed. Reserved Keys (prefix `cortex.`) are reserved for the spawn site.

### 5.3 Filtering

`ExecutionRegistryService.list(filter, labelSelector)` performs an AND-Equals-Match across all provided selector keys. Entries without the required key do not match. Used by `ScriptRunAuthService` for runId lookup; Phase 5 (Runs Panel) will use the same API for Doc filtering.

## 6. `vance.documents.*` API Surface

Symmetric in JS and Python. Same contract, language-idiomatic binding.

### 6.1 Methods

| Method | Signature | Behavior |
|---|---|---|
| `read(path)` | → String (UTF-8) | Throws on Missing |
| `write(path, content)` | → void / DocumentDto | Idempotent (Upsert). Refused for `_vance/trash/` prefix |
| `exists(path)` | → bool | Non-throwing check |
| `delete(path)` | → bool | Soft-Delete (Move to `_vance/trash/`). Returns `false` on Missing |
| `list(prefix?)` | → List of Summaries | `_vance/trash/` and `_vance/` automatically excluded |
| `meta(path)` | → Summary | Throws on Missing |

### 6.2 Summary Form

```
{
  id, path, name, title,
  kind, mimeType, size,
  tags,        # List<String>
  createdAt,   # ISO-String
  version      # Long
}
```

JS returns JS objects, Python returns Dicts. Fields are identical.

### 6.3 Path Convention

- Forward-slash-separated.
- **Relative path → relative to the run's `documentBasePath`** ("current path"),
  **Leading-slash → project-root-absolute** (slash is stripped). The
  `documentBasePath` is set at spawn: Workbook-Form/Input/Button-Runs
  set it to the **script's folder** (e.g., `apps/grades` for
  `apps/grades/calc.js`), so `read('data/x.json')` resolves to
  `apps/grades/data/x.json`. **Default is empty (= Project Root)** — for
  all other consumers (Cortex, Hactar, Python-REST), relative paths
  remain root-relative, exactly as before. This applies equally to `read`/`write`/
  `exists`/`delete`/`meta` and the `list(prefix)` prefix.
- **Root-relative paths are fully qualified within the project scope — the root folder is part of the path.** A file appearing in the Cortex Web UI under the "documents" tree node as `mail-rules.md` is programmatically addressed as `documents/mail-rules.md` (or `/documents/mail-rules.md`). The Web UI renders the root folder as a tree section (cosmetic); it must be included in the API/`scriptRef` path. The same applies to `scripts/foo.js`, `data/bar.csv`, etc.
- Delimitation: this is the **document system** (Documents + Paths). The
  WORK sandbox (`work_file_*`) is a separate system (Files + Directories)
  with its own workdir — not to be confused.
- Standard folders: `documents/`, `scripts/`, `data/`, `notes/`.
- Reserved prefixes (write-forbidden from scripts): `_vance/trash/` (Trash), `_vance/` (System-managed Configs/Manuals).
- `_chatbox/`, `_slart/`, `_user_<login>/` are also system-managed; write attempts to these paths go through the `DocumentService` permission check, which performs the rejection within the script subject scope.

### 6.4 Error Semantics

| JS | Python | Trigger |
|---|---|---|
| `Error("not found …")` | `VanceError("Document not found: …")` | Doc does not exist (read/meta) |
| `Error("path must not be empty")` | `VanceError("…")` | Empty/null Path |
| `Error("project-scoped run required")` | `VanceError("…")` | Script runs without project scope |
| — | `VanceError("HTTP 401 …")` | Token revoked (Run no longer RUNNING) — LLM should not catch this |
| — | `VanceError("HTTP 403 …")` | Permission check failed |

### 6.5 Implementation

- **JavaScript:** `ScriptDocumentApi` Inner-Class in `VanceScriptApi`, calls `DocumentService` directly (in-JVM, no REST, no JWT). Only available if the constructor was called with `DocumentService` — legacy paths without the service get `vance.documents = null`.
- **Python:** Bundled `vance.py` Helper under `vance-brain/src/main/resources/python-helpers/`. Uses `urllib.request` from stdlib — no `requests` dependency forced in user venv. Copied to workspace by `PythonHelperBundler` at spawn.

## 7. `vance.llm.*` API Surface

Synchronous single-shot LLM calls from within the script — no process spawn, no Lane lock, no async event flow. The backend is the [`LightLlmService`](/specs/light-llm-service); the script surface is just a thin adapter that pulls Tenant/Project/Process scope from the `ToolInvocationContext` and passes it to the service.

**Availability.** v1 only in JavaScript (in-JVM GraalJS). Python helper will not be extended as long as LLM-Python paths (`execute_python`/`python_run`) do not have Document access — the cascade "no Doc access → no LLM access" keeps the subprocess contract flat.

### 7.1 Methods

```js
// Raw text reply — the caller post-processes itself (Free-Text-Label,
// title, summary).
const text = vance.llm.call(recipeName, userPrompt, pebbleVars?);

// Schema-validated response — Jeltz-style Retry-Loop. Returns
// the parsed JSON as Map.
const obj = vance.llm.callForJson(recipeName, userPrompt, pebbleVars?);

// Same, plus the model's identity — for scripts that
// permanently store the response. `{ result: {...}, model: "openai:gpt-4o" }`,
// nested instead of merged, so the model's fields don't collide with
// our `model`.
const ans = vance.llm.callForJsonWithModel(recipeName, userPrompt, pebbleVars?);
```

| Method | Return | Behavior |
|---|---|---|
| `call(recipe, prompt)` / `(recipe, prompt, vars)` | String | Empty/null `vars` allowed; Recipe Pebble template renders without additional variables. |
| `callForJson(recipe, prompt)` / `(recipe, prompt, vars)` | Map | Recipe must instruct the LLM to output JSON; `LightLlmService` automatically retries on parse/schema errors up to `maxAttempts`. |
| `callForJsonWithModel(recipe, prompt)` / `(recipe, prompt, vars)` | Map with `result` + `model` | Like `callForJson`. `model` is the **resolved** name (`<providerInstance>:<modelName>`), not the alias from the Recipe — not derivable from the Recipe alone, because the cascade can change without the Recipe changing. For scripts that archive the result: without the value, a later run cannot be compared to an earlier one. `model` can be `null` and must then be stored as *unknown*. |

### 7.2 Recipe Requirement

The addressed Recipe **must** have `internal: true` in its YAML — `LightLlmService` rejects non-internal Recipes. This keeps spawn Recipes (for `process_spawn`) and LightLlm config profiles cleanly separated. Bundled examples: `discovery`, `follow-up`, `engine-output-translator`, `hactar-args-extract`. Tenant-/Project-Overrides via `recipes` collection are allowed; the `internal` flag must be maintained.

### 7.3 Scope Cascade

The service call automatically inherits:

- `tenantId` — from the bound scope (required). A script without tenant scope throws `ScriptHostException`.
- `projectId` — from the scope, optional. Setting cascades (model aliases, quotas, prompt defaults) consider the project path.
- `processId` — from the scope, optional. Per-Process setting overrides apply (e.g., a process-specific `ai.alias.fast` from the Magrathea workflow).

**None** of these values come from the script code — analogous to `vance.documents.*`, the trust boundary is server-side.

### 7.4 Error Semantics

| Trigger | Thrown as |
|---|---|
| Recipe not `internal: true` / not found / LLM provider exhausted | `ScriptHostException` with Recipe name + LightLlm message |
| `callForJson` retry budget exhausted | `ScriptHostException` "schema validation exhausted: …" |
| Empty Recipe name | `ScriptHostException` "recipeName must not be empty" |
| `null` as Prompt | `ScriptHostException` "userPrompt must not be null" |
| Script without Tenant scope | `ScriptHostException` "vance.llm requires a tenant-scoped run" |
| `LightLlmService` not injected (trigger-scoped, Unit-Test-Stub) | `vance.llm` is `null` — JS access `vance.llm.call(...)` fails with TypeError |

### 7.5 Delimitation from `vance.process.spawn`

Rule of thumb:

- **`vance.llm.callForJson`** if the script needs a sub-second classification / evaluation per item and the Recipe has a clear JSON schema. No Engine boot, no Lane cost, no History write.
- **`vance.process.spawn`** if a long-running worker should be created (Eddie/Arthur/Vogon/Marvin) that inherits a Session, uses Tools, maintains History, chats with the user.

LightLlm is explicitly not a replacement for the Engine layer — no Tool calls, no multi-turn history, no streaming. If the script needs reasoning that uses these properties: spawn. If it only needs a classification / a title / a mini-summary: `vance.llm`.

### 7.6 Implementation

- **JavaScript:** `ScriptLightLlmApi` Inner-Class in `VanceScriptApi`, delegates to an injected `LightLlmService` (in-JVM, no REST, no JWT). Constructor path: 8-arg `VanceScriptApi(...)` with `lightLlmService`; all other overloads set `vance.llm = null`. `GraaljsScriptExecutor` injects the Spring Bean.
- **Python:** Out of Scope for v1 — see §10.

## 7a. `vance.guard.*` API Surface (Guard-Runs only)

Only present if the script runs as a [Completion Guard](/specs/completion-guard) at the yield point (otherwise `null`). The `CompletionGuardService` builds the surface with yield context, a cap-aware continue hook, and the transient scratch stores.

### 7a.1 Context (read-only)

| Member | Type | Meaning |
|---|---|---|
| `guard.task` | `String` | First user message of the evaluated task. |
| `guard.output` | `String` | Final output the Engine would deliver. |
| `guard.round` | `int` | Previous Guard fires of this Process (0 on first yield). |
| `guard.maxRounds` | `int` | Hard cap — `continueWith` refuses beyond this. |
| `guard.naturalStop` | `boolean` | `true` Natural-Stop, `false` explicit Terminate. |

### 7a.2 Action

- `guard.continueWith(prompt)` → `boolean` — injects `prompt` into its own pending queue (prefix `[completion-guard]`, sender `_guard`) and schedules a turn, so the Engine continues working. **Cap-aware:** returns `false` (no injection) if `maxRounds` is reached. *Named `continueWith` because `continue` is a JS reserved word.*

### 7a.3 Scratch Stores

`guard.loopValues` (per Process/Loop) and `guard.sessionValues` (per Session) — each a store that survives across re-entrant Guard runs (**transient, in-memory, not persistent**). This way, a script remembers "already asked" and raises a concern exactly **once**:

| Method | Effect |
|---|---|
| `get()` | entire Map as read-only copy (for `lv.get().key`) |
| `get(key)` | Single value (or `undefined`) |
| `set(key, value)` | stores (deep-copied); `null`/`undefined` deletes the key |
| `has(key)` | whether the key is set |
| `remove(key)` | delete key |

```js
if (!vance.guard.loopValues.get('askedTests')) {
  vance.guard.loopValues.set('askedTests', true);
  if (needsTests) vance.guard.continueWith("Bitte Tests schreiben.");
}
```

Loop-Scratch is reset with a real user turn along with the round cap (see [completion-guard.md](/specs/completion-guard) §6).

### 7a.4 Implementation

`ScriptGuardApi` + `ScriptGuardScratchApi` Inner-Classes in `VanceScriptApi`; the continue hook is the `GuardScriptHost` interface (Impl in `CompletionGuardService`). Passed through via `ScriptRequest.guardApi` to the 13-arg `VanceScriptApi`-Constructor. Tool surface see [completion-guard.md](/specs/completion-guard) §4.4.

## 8. `vance.settings.*` API Surface

Synchronous read-only access to the Setting Cascade from within the script. The surface is intentionally not writable — settings are written by Kits, Setting Forms, or Admin REST, not from user scripts.

**Availability.** v1 only in JavaScript (in-JVM GraalJS). Python helper will follow once `execute_python`/`python_run` get Doc access (§10).

### 8.1 Methods

```js
const v   = vance.settings.get('mail.pack');                    // String | null
const s   = vance.settings.get('mail.pack', 'fallback');        // String with Default
const i   = vance.settings.getInt('mail.maxPerRun', 5);
const l   = vance.settings.getLong('mail.byteLimit', 1048576);
const d   = vance.settings.getDouble('mail.threshold', 0.7);
const b   = vance.settings.getBoolean('mail.dryRun', false);
```

All accessors provide the default for "missing / blank / unparseable". For `getBoolean`, `true | 1 | yes | on` (case-insensitive) are read as true, everything else as false.

### 8.2 Cascade

Delegates to `SettingService.getStringValueCascade(tenant, projectId, processId, key)` or the `Boolean` variant. Walk order: **think-process → project → `_tenant`**. The user layer is intentionally excluded — see `SettingService` JavaDoc. Tenant/Project/Process comes from the bound scope, identical to `vance.documents.*` and `vance.llm.*`.

### 8.3 Error Semantics

| Trigger | Thrown as |
|---|---|
| Empty Key | `ScriptHostException` "vance.settings: key must not be empty" |
| Script without Tenant scope | `ScriptHostException` "vance.settings requires a tenant-scoped run" |
| `SettingService` not injected | `vance.settings` is `null` — JS access fails with TypeError |

### 8.4 Password Filter

`SettingService` hides `SettingType.PASSWORD` entries in the cascade lookup. Scripts never see IMAP passwords, API keys, etc. via `vance.settings.get(...)` — credentials travel exclusively through `resolver:` templates in Tool Configs.

### 8.5 Implementation

- **JavaScript:** `ScriptSettingsApi` Inner-Class in `VanceScriptApi`. Constructor path: 9-arg `VanceScriptApi(...)` with `settingService`; all other overloads set `vance.settings = null`. `GraaljsScriptExecutor` injects the Spring Bean.

## 9. Cross-Refs to other Specs

- [cortex.md](/specs/cortex) §5 ("Run / Validate / Hactar") — the Cortex UI side of the Run button.
- [llm-resource-management.md](/specs/llm-resource-management) — JWT issuance in general.
- [light-llm-service.md](/specs/light-llm-service) — Backend behind `vance.llm.*` (§7); Recipe-as-Config, Schema-Loop.
- `planning/script-document-api.md` — Implementation plan with phase breakdown and architectural discussion, archivable after all phases are complete.

## 10. Out of Scope (Migration Path for Later)

- **LLM-Python Paths:** Include `execute_python`, `python_run` — minor wiring effort (`ScriptRunEnvironmentBuilder` + `PythonHelperBundler` call, Username from `ToolInvocationContext.userId()`).
- **`vance.llm.*` for Python:** Symmetric REST surface in the `vance.py` helper (synchronous, calls a Brain endpoint behind the token mint). Awaits the above point — once LLM-Python paths have Doc access, the cascade can be consistently extended to LLM access.
- **Binary API:** `readBytes` / `writeBytes` plus Multipart upload for large files.
- **Cross-Project Read:** Read-only access to the Tenant default project for Manuals/Configs, possibly `vance.documents.tenantRead(path)`.
- **Cortex Runs Panel:** Phase 5 from the Planning Doc — consumes the label system for the Doc-bound Runs list.
- **Long-Running-Pod Migration:** Subprocess in its own worker pod with PVC; Brain URL must then use service discovery instead of loopback.
