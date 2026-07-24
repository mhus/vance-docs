---
title: "Script Document API — Specification"
parent: Specs
permalink: /specs/script-document-api
---

<!-- AUTO-GENERATED from specification/public/en/script-document-api.md — do not edit here. -->

---
# Script Document API — Specification

> Status: v1. Binding product spec for running Cortex scripts to access
> Project documents. Four stable contracts: ENV contract for spawned
> subprocesses, SCRIPT_RUN-JWT, label convention on `ExecJob`s, and the
> `vance.documents.*` API surface (JS in-JVM + Python via REST) plus
> the `vance.llm.*` surface for synchronous LightLlm calls (JS-only).
>
> See also: [cortex.md](/specs/cortex) | [llm-resource-management.md](/specs/llm-resource-management)

## 1. Definition and Scope

A **Script Run** is a single execution of a Cortex script (currently JavaScript via GraalJS or Python via Subprocess). The Document API is the interface through which the running script code can read and write Project documents — symmetrically in both languages, with different transport.

**What the API is:**

- Stable contract `vance.documents.{read, write, exists, list, delete, meta}` on both sides.
- Scope-pinned to the Tenant and Project of the Run owner — scripts cannot access external Projects.
- Permissions of the spawning user — no privilege escalation by the subprocess.

**What the API is not:**

- No Binary-Surface (`readBytes`/`writeBytes`) in v1 — Plain-Text covers current use cases; the GraalJS byte boundary is not worth the extra effort.
- No dynamic Listing/Globbing — `list(prefix)` is prefix-match, not pattern-match.
- No LLM-triggered Python — `execute_python` / `python_run` currently spawn without ENV-injection. Document access works exclusively from the **Cortex Run path** (user clicks Run on a Python or JS doc).

## 2. Spawn Paths and Availability

| Spawn Path | Language | Document API available |
|---|---|---|
| Cortex Run button on JS-Doc | JavaScript (GraalJS, in-JVM) | Yes — as `vance.documents` Host-Binding |
| Cortex Run button on Python-Doc | Python (Subprocess) | Yes — `import vance` from the bundled Helper |
| LLM `execute_javascript` Tool | JavaScript (GraalJS, in-JVM) | Yes — same Host-Binding path |
| LLM `execute_python` Tool | Python (Subprocess) | **No** — ENV-injection intentionally not wired |
| LLM `python_run` Tool | Python (Subprocess) | **No** — see above |
| Magrathea `shell_task` | Shell | **No** — non-scripted execution |

The LLM-Python paths are intentionally excluded in v1: `vance.py` helper bundling and token minting currently only run in `PythonExecutionService.executeAsync(...)` with `username != null` — and only `PythonCortexController` passes the user through. A later extension to the LLM paths is minor wiring work, not a new contract.

## 3. ENV Contract (Subprocess Contract for Python)

When the Brain spawns a Python subprocess for a script run, the subprocess environment is **sealed**: the JVM environment is completely cleared before `ProcessBuilder.start()` (`pb.environment().clear()`), and only the variables listed below are set. This prevents leaks of Brain secrets (provider keys, DB credentials) into the script scope.

Guaranteed variables set per script run:

| Variable | Value | Expectation in script |
|---|---|---|
| `VANCE_BRAIN_URL` | `http://localhost:<server.port>/brain/<tenant>` | Base URL for REST calls — `vance.py` appends `/documents/...` |
| `VANCE_TENANT` | Tenant ID | informational only; URL already contains the Tenant |
| `VANCE_PROJECT` | Project ID | as `?projectId=...` Query-Param to REST endpoints |
| `VANCE_SESSION` | Session ID, if present | informational; may be missing if the spawn has no Session |
| `VANCE_RUN_ID` | UUID, allocated by Brain per Run | in JWT as `srid` claim |
| `VANCE_TOKEN` | SCRIPT_RUN-JWT (see §4) | as `Authorization: Bearer ...` Header |

Plus minimal shell defaults to keep the subprocess functional (Python's `subprocess` module, pip caches):

```
PATH=/usr/local/bin:/usr/bin:/bin
HOME=<JVM user.home>
LANG=C.UTF-8
LC_ALL=C.UTF-8
```

**Contract Detail Loopback Addressing**: `VANCE_BRAIN_URL` always addresses `localhost` with the local Spring port. Subprocess and Brain share the same Pod (same JVM instance). Cross-Pod routing is Out-of-Scope in v1 — long-running scripts that need to survive Pod migration are a separate future extension.

Implementation: `ScriptRunEnvironmentBuilder` in `vance-brain/src/main/java/de/mhus/vance/brain/access/`. Consumed by `PythonExecutionService.executeAsync(...)`.

## 4. SCRIPT_RUN-JWT

A dedicated JWT type with lifecycle binding to the Registry, not to the TTL. The token remains valid as long as the Run is `RUNNING` in the `ExecutionRegistryService`.

### 4.1 Claims

In addition to the standard claims from `VanceJwtClaims`:

| Claim | Name | Description |
|---|---|---|
| `sub` | (Standard) | Username of the spawning user — determines permissions |
| `tid` | `tid` | Tenant ID |
| `tt` | `tt` | `script_run` (lowercase enum-name) |
| `srid` | `srid` | Run ID (UUID), allocated by Brain at spawn; identical to `cortex.runId` label on the ExecJob |
| `pid` | `pid` | Project ID — scope-pin to the spawning Project |
| `sid` | `sid` | Session ID, optional (only set if the spawn has a Session) |
| `iat` / `exp` | (Standard) | issuedAt / expiresAt — `exp` is a 24h safety net |

Issuance: `JwtService.createScriptRunToken(tenantId, username, runId, projectId, sessionId, expiresAt)`. Signed with the Tenant's `JWT_SIGNING` key — the same mechanism as standard tokens. No separate signing keys.

### 4.2 Validation

Upon arrival via the `BrainAccessFilter`, the token undergoes additional checks (beyond signature verification performed by `AccessFilterBase`):

1. **Token Type Acceptance:** `BrainAccessFilter.isTokenTypeAcceptable` explicitly allows `SCRIPT_RUN` in addition to `ACCESS`. `REFRESH` remains strictly rejected.
2. **Loopback Origin:** `request.getRemoteAddr()` must be a loopback address (`127.0.0.1`, `::1`, `0:0:0:0:0:0:0:1`). HTTP-spoofable headers like `X-Forwarded-For` are **not** consulted.
3. **Registry-RUNNING-Check:** The `srid` claim must appear as a `cortex.runId` label on an `ExecutionRegistryEntry` whose status is `RUNNING` and whose Tenant/Project match the claims.

If any of the three checks fail → 401 Unauthorized. Implementation of additional checks: `ScriptRunAuthService` in `vance-brain/src/main/java/de/mhus/vance/brain/access/`.

### 4.3 Lifecycle

Token validity **automatically** ends as soon as the ExecJob reaches a terminal status (`COMPLETED`, `FAILED`, `KILLED`, `ORPHANED`). No blocklist maintenance is needed: the Registry status check immediately detects the transition.

The `exp` claim is only a safety net for orphaned Registry entries (e.g., Brain restart in the middle of a Run). 24h is generous, as an orphaned Run is already a defect.

## 5. ExecJob Label Convention

Cross-cutting per-instance metadata on `ExecJob.labels()` and `ExecutionRegistryEntry.labels()`, defined in `vance-brain/src/main/java/de/mhus/vance/brain/tools/exec/ExecLabels.java`. Stored in-memory, **never** sent to Micrometer/Prometheus (cf. CLAUDE.md metric tag rule — this does not apply here, as there is no aggregation).

### 5.1 Reserved Keys

| Key | Values | Who sets |
|---|---|---|
| `cortex.source` | `cortex` / `llm-tool` / `workflow` / `manual` | Spawn Caller |
| `cortex.language` | `python` / `js` / `shell` | Spawn Caller |
| `cortex.runKind` | `script` / `shell` / `install` / `uninstall` / `validate` | Spawn Caller |
| `cortex.document` | Full Doc Path (e.g., `scripts/foo.py`) | Spawn Caller, if the Run is associated with a Doc |
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

JS returns JS-Objects, Python returns Dicts. Fields are identical.

### 6.3 Path Convention

- Forward-slash-separated.
- **Relative path → relative to the Run's `documentBasePath`** ("current path"),
  **Leading-slash → project-root-absolute** (slash is stripped). The
  `documentBasePath` is set at spawn: Workbook-Form/Input/Button-Runs
  set it to the **script's folder** (e.g., `apps/grades` for
  `apps/grades/calc.js`), so `read('data/x.json')` resolves to
  `apps/grades/data/x.json`. **Default is empty (= Project Root)** — for
  all other consumers (Cortex, Hactar, Python-REST), relative paths
  remain root-relative, exactly as before. This applies equally to `read`/`write`/
  `exists`/`delete`/`meta` and the `list(prefix)` prefix.
- **Root-relative paths are fully qualified within the Project scope — the root folder is part of the path.** A file appearing in the Cortex Web UI under the "documents" tree node as `mail-rules.md` is programmatically addressed as `documents/mail-rules.md` (or `/documents/mail-rules.md`). The Web UI renders the root folder as a tree section (cosmetic); it must be included in the API/`scriptRef` path. The same applies to `scripts/foo.js`, `data/bar.csv`, etc.
- Distinction: this is the **Document System** (Documents + Paths). The
  WORK sandbox (`work_file_*`) is a separate system (Files + Directories)
  with its own Workdir — not to be confused.
- Standard Folders: `documents/`, `scripts/`, `data/`, `notes/`.
- Reserved Prefixes (write-forbidden from scripts): `_vance/trash/` (Trash), `_vance/` (System-managed Configs/Manuals).
- `_chatbox/`, `_slart/`, `_user_<login>/` are also system-managed; write attempts to these paths go through the `DocumentService` permission check, which performs the rejection within the script subject scope.

### 6.4 Error Semantics

| JS | Python | Trigger |
|---|---|---|
| `Error("not found …")` | `VanceError("Document not found: …")` | Doc does not exist (read/meta) |
| `Error("path must not be empty")` | `VanceError("…")` | Empty/null Path |
| `Error("project-scoped run required")` | `VanceError("…")` | Script runs without Project scope |
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
// Title, Summary).
const text = vance.llm.call(recipeName, userPrompt, pebbleVars?);

// Schema-validated response — Jeltz-style Retry-Loop. Returns
// the parsed JSON as Map.
const obj = vance.llm.callForJson(recipeName, userPrompt, pebbleVars?);
```

| Method | Return | Behavior |
|---|---|---|
| `call(recipe, prompt)` / `(recipe, prompt, vars)` | String | Empty/null `vars` allowed; Recipe Pebble template renders without additional variables. |
| `callForJson(recipe, prompt)` / `(recipe, prompt, vars)` | Map | Recipe must instruct the LLM to output JSON; `LightLlmService` automatically retries on parse/schema errors up to `maxAttempts`. |

### 7.2 Recipe Requirement

The addressed Recipe **must** have `internal: true` in its YAML — `LightLlmService` rejects non-internal Recipes. This keeps spawn Recipes (for `process_create`) and LightLlm config profiles cleanly separated. Bundled examples: `discovery`, `follow-up`, `engine-output-translator`, `hactar-args-extract`. Tenant-/Project-overrides via `recipes` collection are allowed; the `internal` flag must be maintained.

### 7.3 Scope Cascade

The service call automatically inherits:

- `tenantId` — from the bound scope (required). A script without Tenant scope throws `ScriptHostException`.
- `projectId` — from the scope, optional. Setting cascades (model aliases, quotas, prompt defaults) consider the Project path.
- `processId` — from the scope, optional. Per-Process setting overrides apply (e.g., a Process-specific `ai.alias.fast` from the Magrathea workflow).

**None** of these values come from the script code — analogous to `vance.documents.*`, the trust boundary is server-side.

### 7.4 Error Semantics

| Trigger | Thrown as |
|---|---|
| Recipe not `internal: true` / not found / LLM provider exhausted | `ScriptHostException` with Recipe name + LightLlm message |
| `callForJson` retry budget exhausted | `ScriptHostException` "schema validation exhausted: …" |
| Empty Recipe name | `ScriptHostException` "recipeName must not be empty" |
| `null` as Prompt | `ScriptHostException` "userPrompt must not be null" |
| Script without Tenant scope | `ScriptHostException` "vance.llm requires a tenant-scoped run" |
| `LightLlmService` not injected (trigger-scoped, Unit-Test-stub) | `vance.llm` is `null` — JS access `vance.llm.call(...)` fails with TypeError |

### 7.5 Distinction from `vance.process.spawn`

Rule of thumb:

- **`vance.llm.callForJson`** if the script needs a sub-second classification / evaluation per item and the Recipe has a clear JSON schema. No Engine boot, no Lane cost, no History write.
- **`vance.process.spawn`** if a long-running worker should be created (Eddie/Arthur/Vogon/Marvin) that inherits a Session, uses Tools, maintains History, and chats with the user.

LightLlm is explicitly not a replacement for the Engine layer — no Tool calls, no multi-turn History, no streaming. If the script needs reasoning that uses these properties: spawn. If it only needs a classification / a title / a mini-summary: `vance.llm`.

### 7.6 Implementation

- **JavaScript:** `ScriptLightLlmApi` Inner-Class in `VanceScriptApi`, delegates to an injected `LightLlmService` (in-JVM, no REST, no JWT). Constructor path: 8-arg `VanceScriptApi(...)` with `lightLlmService`; all other overloads set `vance.llm = null`. `GraaljsScriptExecutor` injects the Spring Bean.
- **Python:** Out of Scope for v1 — see §10.

## 8. `vance.settings.*` API Surface

Synchronous read-only access to the Setting cascade from within the script. The surface is intentionally not for writing — Settings are written by Kits, Setting Forms, or Admin REST, not from user scripts.

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

`SettingService` filters out `SettingType.PASSWORD` entries in the cascade lookup. Scripts never see IMAP passwords, API keys, etc. via `vance.settings.get(...)` — credentials travel exclusively through `resolver:` templates in Tool configs.

### 8.5 Implementation

- **JavaScript:** `ScriptSettingsApi` Inner-Class in `VanceScriptApi`. Constructor path: 9-arg `VanceScriptApi(...)` with `settingService`; all other overloads set `vance.settings = null`. `GraaljsScriptExecutor` injects the Spring Bean.

## 9. Cross-Refs to Other Specs

- [cortex.md](/specs/cortex) §5 ("Run / Validate / Hactar") — the Cortex UI side of the Run button.
- [llm-resource-management.md](/specs/llm-resource-management) — JWT issuance in general.
- [light-llm-service.md](/specs/light-llm-service) — Backend behind `vance.llm.*` (§7); Recipe-as-Config, Schema-Loop.
- `planning/script-document-api.md` — Implementation plan with phase breakdown and architectural discussion, archivable after all phases are complete.

## 10. Out of Scope (Migration Path for Later)

- **LLM-Python Paths:** Include `execute_python`, `python_run` — minor wiring work (`ScriptRunEnvironmentBuilder` + `PythonHelperBundler` call, Username from `ToolInvocationContext.userId()`).
- **`vance.llm.*` for Python:** Symmetric REST surface in the `vance.py` helper (synchronous, calls a Brain endpoint that sits behind the token mint). Awaits the above point — once LLM-Python paths have Doc access, the cascade can be consistently extended to LLM access.
- **Binary API:** `readBytes` / `writeBytes` plus Multipart upload for large files.
- **Cross-Project-Read:** Read-only access to the Tenant default Project for Manuals/Configs, possibly `vance.documents.tenantRead(path)`.
- **Cortex Runs Panel:** Phase 5 from the Planning Doc — consumes the label system for the Doc-bound Runs list.
- **Long-Running-Pod-Migration:** Subprocess in its own worker Pod with PVC; Brain URL must then use service discovery instead of loopback.
