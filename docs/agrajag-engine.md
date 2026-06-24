---
title: "Vance — Agrajag (Tool Health Diagnosis Engine)"
parent: Documentation
permalink: /docs/agrajag-engine
render_with_liquid: false
---

<!-- AUTO-GENERATED from specification/public/en/agrajag-engine.md — do not edit here. -->

---
# Vance — Agrajag (Tool Health Diagnosis Engine)

> Agrajag checks tools, classifies their errors, and writes their health state. In the Adams universe, Agrajag is one half of the diagnostic duo "Agrajag & Lunkwill"; in Vance, it is the first **Service Engine** (see [think-engines §7b](/docs/think-engines)) — an Engine that does not live in the user chat but works asynchronously as a system-driven specialist.
>
> This spec defines the **diagnosis logic**. The state model that Agrajag writes to is in [tool-availability](/docs/tool-availability). The Service Engine pattern, which Agrajag concretizes as a representative for future relatives (Lunkwill, Prak, Agrajag), is in [think-engines §7b](/docs/think-engines).

---

## 1. Purpose

When a Tool-Call fails, it's not always clear why. Some errors are unambiguous:

- Foot-WebSocket disconnected → `client_*` is obviously gone.
- MCP-Connection-Close-Frame → that one MCP-Tool is gone.
- Tool not in Registry → true "Unknown".

Others are ambiguous:

- A Tool responds with `500 Internal Server Error` — Server bug? Data problem? Auth expired?
- Sporadic Timeouts — Network glitch? Rate limit? Server hung?
- Schema-Violation in the response — Server update? Wrong input? Transitional state?

Agrajag is the specialist for **ambiguous technical symptoms**. Three questions Agrajag answers:

1. Is the tool truly broken — or is it a user-specific problem?
2. If broken: for how long is it expected to be (short glitch, longer outage, permanent)?
3. Can the user do something themselves (renew token, different account, clarify permissions)?

Agrajag writes its answers into the Tool-Health-Document (see [tool-availability §5](/docs/tool-availability)) and, if applicable, an Inbox-Item to the user.

---

## 2. What Agrajag is Not

- **Not a Repair Tool.** Agrajag diagnoses but does not repair (no MCP-Reconnect-Trigger, no Token-Refresh). Repair is Lunkwill's job in a later iteration.
- **Not a Health Cron.** Agrajag does not check periodically on its own. Diagnosis is triggered by specific tool errors or explicit user requests.
- **Not a Tool Inventory Tracker.** The Tool Registry knows which tools are available in the Project. Agrajag works *on* this list.
- **Not a Permission Diagnosis in the classical sense.** Permissions are configuration issues, not a Health-Issue — Agrajag recognizes them (`USER_PERMISSION` classification), sets a Cooldown, but **does not** write a Health-Doc status.

---

## 3. Two Layers

Agrajag breaks down into two clearly separated components with different costs:

```
                         Tool-Call throws Exception
                                    ↓
                          ┌─────────────────────┐
                          │   AgrajagChecker    │   sync, no LLM
                          │   (Java, in         │   Pattern-Matching
                          │   ToolDispatcher)   │   Cooldown-Check
                          └──────────┬──────────┘
                                     │
              ┌──────────────────────┼──────────────────────┐
              │                      │                      │
       clearly binary       clearly not-Health     ambiguous
              │                      │                      │
   Direct Health-Doc       Reflect to LLM,        Enqueue in
       (System Path)        Set Cooldown,         Agrajag-Queue
                           No Spawn                       │
                                                            ↓
                                                  ┌──────────────────┐
                                                  │   AgrajagEngine  │   async, LLM
                                                  │   spawn-per-task │   Probe + Diagnose
                                                  └────────┬─────────┘
                                                           ↓
                                              Health-Doc + Cooldown
                                              + optional Inbox-Item
```

Layer 1 (Checker) does 80–90% of the work, free of charge. Layer 2 (Engine) is the expensive LLM specialist for the difficult remainder.

---

## 4. AgrajagChecker (sync)

Resides in the error path of the `ToolDispatcher`. Pure Java logic, no LLM call, runs on the Lane of the calling Engine turn.

### 4.1 Decision Tree

```
ToolDispatcher.invoke(...) throws Exception
    ↓
AgrajagChecker.handle(toolName, callerUserId, callerSessionId, exception, response)
    ↓
1. errorSignature = computeSignature(exception, response)
   — typical: "http-403", "http-5xx", "timeout-30s", "connect-refused",
              "schema-violation", "auth-expired-marker"

2. classification = classifyByPattern(errorSignature, exception, response)
   — one of ToolHealthClassifications, or UNCLEAR

3. cooldown = lookupCooldown(toolName, scope, callerUserId, errorSignature)

4. switch:
   - cooldown active:
       → return original error to LLM, no Spawn
   - classification ∈ {TECHNICALLY_BROKEN binary-detectable like BACKEND_UNREACHABLE}:
       → ToolHealthService.markUnavailable(...) direct
       → setCooldown(..., default for class)
       → return typed error to LLM
   - classification ∈ {USER_PERMISSION, USER_INPUT}:
       → setCooldown(..., default for class)
       → return typed error to LLM, NO Health-Doc update
   - classification == UNCLEAR:
       → enqueue Agrajag-job (note Coalescing-Key)
       → setCooldown(..., short default ~30s)
       → return original error to LLM with hint "diagnosis pending"
```

### 4.2 Pattern Rules — Document Cascade

The Checker's classification rules are **not a hardcoded Java switch**, but are stored as YAML in the Vance Document System and merged via the normal Tenant→Project cascade. This allows a Tenant-Admin to adjust rules without touching Brain code, and project-specific peculiarities (e.g., "in this project, tool X delivers its auth error as a 200 with a JSON marker") can be overridden locally.

**Paths in the Cascade** (first match wins — standard Vance cascade analogous to [recipes §3](/docs/recipes)):

```
<project>/_vance/agrajag/error-patterns.yaml         Project-specific (rare)
   ↓
_vance/agrajag/error-patterns.yaml                   Tenant-wide (standard override point)
   ↓
classpath:vance-defaults/agrajag/error-patterns.yaml Bundled, shipped with Vance
```

**Format:**

```yaml
# First-match-wins — the order is semantic.
patterns:
  - id: http-401-expired-token
    match:
      httpStatus: 401
      bodyContains: ["expired_token", "token_expired"]
    signature: http-401-expired
    classification: USER_SPECIFIC_TECHNICAL
    cooldown: PT24H
    locked: true                              # must not be touched by auto-maintenance
    note: "Refresh token path is tool-specific; manual user hint."

  - id: http-403
    match: { httpStatus: 403 }
    signature: http-403
    classification: USER_PERMISSION
    cooldown: PT24H
    locked: true

  - id: http-429
    match: { httpStatus: 429 }
    signature: http-429
    classification: INTERMITTENT
    cooldown: header:retry-after              # Special value: read from Response-Header

  - id: connect-refused
    match:
      exceptionType: ["java.net.ConnectException", "java.net.UnknownHostException"]
    signature: connect-refused
    classification: TECHNICALLY_BROKEN
    healthAction: markUnavailable             # write Health-Doc directly, not queue
    cooldown: PT5M
    locked: true

  - id: http-5xx
    match: { httpStatusRange: [500, 599] }
    signature: http-5xx
    classification: UNCLEAR                   # → Queue to AgrajagEngine

  - id: socket-timeout
    match: { exceptionType: ["java.net.SocketTimeoutException"] }
    signature: timeout
    classification: UNCLEAR

  # Fallback — if nothing matches
  - id: fallback
    match: {}
    signature: unclassified
    classification: UNCLEAR
    locked: true
```

**Field Semantics:**

| Field | Required | Meaning |
|---|---|---|
| `id` | yes | Stable identifier. Unique within the file. Used as key during cascade merge (an `id` in a higher layer completely replaces the entry from a deeper layer with the same `id` — no field merge). |
| `match` | yes | Selector. Multiple fields = AND. Allowed: `httpStatus`, `httpStatusRange`, `exceptionType` (Array, OR), `bodyContains` (Array, OR substring-match), `errorCode` (Tool-Result-JSON `error.code`). Empty object `{}` = Fallback. |
| `signature` | yes | Stable String for Cooldown-Key. Should be short and descriptive. |
| `classification` | yes | One of `ToolHealthClassification` plus `UNCLEAR` (= escalate to AgrajagEngine). |
| `cooldown` | no | Duration ISO-8601 or special value `header:<name>`. Default depends on classification (see [tool-availability §6](/docs/tool-availability)). |
| `healthAction` | no | `none` (Default), `markUnavailable`, `markDegraded`. For `markUnavailable`/`markDegraded`, the Checker writes directly to the Health-Doc, without a queue hop. |
| `locked` | no | Default `false`. If `true`, the rule will not be touched by future auto-maintenance mechanisms. Admins can still edit it manually — `locked` is a marker, not an ACL. See "Learning" below. |
| `note` | no | Audit comment, optionally copied to the Health-Doc `note` field upon match. |

**Cascade Merge:** during Brain boot (or on setting change hot-reload), the effective pattern list per `(tenantId, projectId)` is assembled:

1. Bundled patterns as base.
2. Tenant layer replaces bundled entries with the same `id` and appends new entries **before** the bundled fallback.
3. Project layer does the same against the tenant stage.

The final order determines which rule matches first. New tenant rules can be prioritized before bundled rules by replacing a known `id` — or additional rules can be inserted with their own `id` directly before the `fallback` rule.

**"Locked" Concept:** in the current state (no auto-learning), `locked` is pure documentation. As soon as we later build a learning layer (Agrajag observes that a certain 5xx variant was classified as `TECHNICALLY_BROKEN` 20 times in a row → automatically suggests a new pattern rule / adjusts an existing one), it respects the flag: a rule with `locked: true` will neither be changed nor removed by auto-maintenance. Tenant-Admins set `locked` on rules whose classification they consider final — even if practical data suggests otherwise.

**Default Patterns (Bundled)** — the following list is the initial set shipped with Vance. It is reflected 1:1 in `classpath:vance-defaults/agrajag/error-patterns.yaml`:

| `id` | Match | `signature` | `classification` | `cooldown` | `locked` |
|---|---|---|---|---|---|
| `http-401-expired-token` | HTTP 401 + body marker | `http-401-expired` | `USER_SPECIFIC_TECHNICAL` | 24 h | ✓ |
| `http-401-generic` | HTTP 401 (no marker) | `http-401` | `UNCLEAR` | — | — |
| `http-403` | HTTP 403 | `http-403` | `USER_PERMISSION` | 24 h | ✓ |
| `http-404-endpoint` | HTTP 404 (Tool-Endpoint itself) | `http-404` | `UNCLEAR` | — | — |
| `http-429` | HTTP 429 | `http-429` | `INTERMITTENT` | `header:retry-after` | ✓ |
| `http-5xx` | HTTP 500-599 | `http-5xx` | `UNCLEAR` | — | — |
| `socket-timeout` | `SocketTimeoutException` | `timeout` | `UNCLEAR` | — | — |
| `connect-refused` | `ConnectException` / `UnknownHostException` | `connect-refused` | `TECHNICALLY_BROKEN` (`healthAction: markUnavailable`) | 5 min | ✓ |
| `schema-violation` | Tool-Result-Schema faulty | `schema-violation` | `UNCLEAR` | — | — |
| `manual-read-not-found` | `ToolException` + body `"Manual not found"` | `manual-not-found` | `USER_INPUT` | 5 min (default) | ✓ |
| `tool-exception-generic` | `ToolException` without further info | `tool-exception` | `UNCLEAR` | — | — |
| `fallback` | empty `match: {}` | `unclassified` | `UNCLEAR` | — | ✓ |

**Principle — User-Input errors must not degrade Tool-Health.** The `manual-read-not-found` pattern is the canonical implementation of the rule: a `ToolException("Manual not found: '<name>'")` occurs when the LLM calls `manual_read` with a name that does not exist in the Project, nor in the Tenant `_vance`, nor in the Bundled Classpath — typically when an Addon-Manual like `doc-kind-calendar` is referenced, but the Addon has not been installed. This is not a Tool failure but **incorrect input from the Model**.

Without the explicit pattern, the generic `tool-exception-generic` would apply → `UNCLEAR` → Diagnosis Worker spawns → Worker executes `tool_probe_as_system(tool='manual_read')` without `name` parameter → Probe throws *"'name' is required"* → Health-Doc goes to `TECHNICALLY_BROKEN → DOWN` → `manual_read` is unusable for the rest of the Session/Project. This is prevented because `USER_INPUT` neither spawns diagnosis nor touches the Health-Doc — the model sees the error verbatim and can immediately retry with a corrected name.

**When a new `*-not-found` rule is useful:** when an existing Tool throws a "USER assumed something existing" error message (typically `scratchpad_get`, `doc_read`, `recipe_describe`, …), and the Tool is otherwise technically available. Pattern: `bodyContains: ["…not found"]` + `classification: USER_INPUT` + `signature: <tool>-not-found`. A generic `"not found"` as a match substring would collect all convergence errors — therefore, a separate rule per Tool with the exact error message of the Tool.

**Not via the Pattern Table, but as a System Event** (see §9):
- Foot-Disconnect → `client_*` on SESSION-Scope directly `DOWN`.
- MCP-Connection-Close-Frame → MCP-Tool on PROJECT-Scope directly `DOWN`.

These events do not originate from a failed Tool-Call but from the connection layer and go directly through `ToolHealthService.markUnavailable(...)`, without involving the Checker.

### 4.3 What the Checker Does Not Do

- No LLM-Call.
- No Probe attempt (no `tool_probe_as_*`).
- No History-Lookup beyond the Cooldown key.
- No Inbox-Items (that's Agrajag's job).

---

## 5. AgrajagEngine (async)

A Think-Engine like all others (see [think-engines](/docs/think-engines)), but with service topology and a narrower behavioral framework.

### 5.1 Lifecycle

- **Spawn-per-task.** One Agrajag-Process per job. No long-lived drain loop.
- **Status Path:** `INIT → RUNNING → CLOSED(DONE|STALE)`. No `BLOCKED`, no `PAUSED`, no `SUSPENDED` (Agrajag does not ask back, does not wait).
- **Typical Duration:** 1–4 LLM-Turns (Probe-Loop, see §5.2). With clear history evaluation, possibly a single turn without a probe.
- **Owner:** System-Session per Project (see §7). No user chat sees the Process directly.
- **Implementation Status:** v0.3.0 — LLM-driven Probe-Loop + deterministic Apply-Path are implemented.

### 5.2 Diagnosis Sequence

Per Agrajag-Spawn, a **langchain4j-style Tool-Loop** runs:

1. **Input Snapshot.** Engine loads job (`engineParams.toolName/scope/scopeId/errorSignature/originatingUserId/note`) plus the closest Health-Doc entry including History (max the last `HISTORY_CONTEXT_LIMIT` entries) and active Cooldowns.
2. **Prompt Construction.** System-Prompt explains the output contract (§5.3) and describes the Probe-Tools. User-Prompt contains the input snapshot in Markdown — Failure-Block + History-Block + Cooldown-Block.
3. **Tool-Loop.** Chat-Call with the Probe-Tools as `toolSpecifications`:
   - **LLM calls Probe-Tool** → Engine executes via `ContextToolsApi.invoke`, appends `ToolExecutionResultMessage` to the conversation, calls again.
   - **LLM responds without Tool-Call** → this response contains the structured output, step 4.
   - **Iteration-Limit** (`maxProbes` from `engineParams`, default 3, hardcap 6): if exceeded and LLM still generates Tool-Calls, the Engine sends a final message "probe-limit reached — summarise now" and obtains a final no-tool-Turn.
4. **Parse Output.** The JSON block is extracted from the final response text (Markdown-Fence ` ```json … ``` ` or brace-balanced Slice); the string is deserialized to `Map<String,Object>` via Jackson. For non-parseable output: Fallback DEGRADED + 15 min Recovery + Audit-Note.
5. **Apply Deterministically.** Engine calls depending on `classification`:
   - `TECHNICALLY_BROKEN` / `USER_SPECIFIC_TECHNICAL` → `markUnavailable`
   - `INTERMITTENT` → `markDegraded`
   - `WORKING` → `markAvailable`
   - `USER_PERMISSION` / `USER_INPUT` → **no Health-Doc update** (the Cooldown was already set by the Checker)
   - `UNCLEAR` → `markDegraded` with fallback recovery if no ETA provided
   - `cooldownAdjustments[]` → one `setCooldown` call per entry
   - All writes with Audit-Label `agrajag-engine/<processId>`.

Probe-Tools (§6.1) verify **before invocation** that the Target-Tool is `safety: SAFE_PROBE` — write operations never pass through.

### 5.2a Why LLM Does Not See Health-Write-Tools

`AgrajagEngine.allowedTools()` contains **only** `tool_probe_as_user`, `tool_probe_as_system`, `tool_health_read`. The write tools (`tool_health_set_*`, `tool_health_clear_cooldown`) are active in the Tool Manifest but enabled for the Engine itself via Engine Role (`tool-health-writer`) — the LLM does not get to see them. Rationale: cleanly separates responsibilities. LLM diagnoses (output schema), Engine acts deterministically. This prevents "half-diagnosis" where the LLM calls multiple `set_*` tools and then fails to provide a final output.

The write tools remain in the Registry for (a) future Service Engines (Lunkwill, Prak) that need other write paths, (b) Admin-/REST-driven manual Health updates.

### 5.3 Diagnosis Output Schema

Agrajag produces structured output, not free text. Output is enforced in the Recipe as `outputSchema` (analogous to Vogon, see [structured-engine-output](/docs/structured-engine-output)):

```json
{
  "classification": "TECHNICALLY_BROKEN",
  "scope": "PROJECT",
  "expectedRecoveryAt": "2026-05-23T15:00Z",
  "humanNote": "MCP gateway returns 502 since 14:00; matches earlier incident on 2026-05-19",
  "userActionHint": null,
  "cooldownAdjustments": [
    {"errorSignature": "http-502", "userId": null, "duration": "PT30M"}
  ]
}
```

- `classification`: from the Enum (see [tool-availability §3.2](/docs/tool-availability)).
- `scope`: where the status is written.
- `expectedRecoveryAt`: optional, can be null for "unknown".
- `humanNote`: for `lastDiagnosis.note` + optional Inbox-Item text.
- `userActionHint`: non-null for `USER_SPECIFIC_TECHNICAL` — short plain text for the user ("Renew Atlassian token in Settings").
- `cooldownAdjustments`: allows Agrajag to set multiple Cooldowns simultaneously (e.g., `http-5xx` 30 min, `timeout-30s` 5 min).

**Output Parsing Tolerance:** the Engine extracts the JSON block from the response text (Markdown-Fence ` ```json … ``` ` or brace-balanced Slice). `classification` with an unknown value falls back to `UNCLEAR`; `expectedRecoveryAt` with a non-parseable value becomes `null`. Violations therefore do not lead to re-prompts, but to fallback behavior — the diagnosis job should be bounded.

Strict schema validation like Jeltz/Vogon (`validatePlanChildren` with re-prompt hint, see [structured-engine-output](/docs/structured-engine-output) §3) is deliberately not applied here — diagnosis output is never user-facing, and a 10-min degraded tool is more acceptable than a stuck diagnosis process.

---

## 6. Tools

Agrajag has access to a small set of special Tools, which are shielded from other Engines by Engine Role. All carry `safety: SAFE_PROBE`.

### 6.1 Probe Tools

```yaml
- name: tool_probe_as_user
  description: |
    Probe a tool as a specific user. Read-only — target tool's invocation
    is forced to a safe-probe mode (read-only call signature only).
  safety: SAFE_PROBE
  requiresEngineRoles: [tool-prober]
  params:
    toolName: string
    userId: string                 # null = system / no credentials
    sampleInput: object            # minimal valid input for the tool
  returns:
    success: boolean
    durationMs: int
    statusCode: int|null           # for HTTP-backed tools
    errorSignature: string|null
    rawResponse: string            # truncated, audit only

- name: tool_probe_as_system
  description: |
    Probe a tool with no user credentials (tenant defaults if available).
    Used to distinguish user-specific from generic-technical issues.
  safety: SAFE_PROBE
  requiresEngineRoles: [tool-prober]
  params:
    toolName: string
    sampleInput: object
  returns: <same as above>
```

`tool_probe_as_user` invokes the Target-Tool via a special Dispatcher path that assumes the probe identity (see [identity-credentials](/docs/identity-credentials)). Write operations are blocked at the Manifest level — only Tools with `safety: SAFE_PROBE` or an explicit `read-only-probe-call` marker are allowed.

### 6.2 Health-Write-Tools

> **Note:** The write tools are present in the Registry and shielded by the Engine Role `tool-health-writer`, but are **not** exposed by `AgrajagEngine` in the LLM Manifest (see §5.2a). They are reserved for (a) future Service Engines (Lunkwill, Prak), (b) Admin- and REST-driven paths.

```yaml
- name: tool_health_set_unavailable
  safety: SAFE_PROBE
  requiresEngineRoles: [tool-health-writer]
  params:
    scope: SESSION|USER|PROJECT|TENANT|GLOBAL
    scopeId: string|null
    toolName: string
    classification: enum            # ToolHealthClassification
    expectedRecoveryAt: instant|null
    note: string

- name: tool_health_set_available
  requiresEngineRoles: [tool-health-writer]
  params: {scope, scopeId, toolName, note}

- name: tool_health_set_cooldown
  requiresEngineRoles: [tool-health-writer]
  params:
    scope, scopeId, toolName,
    errorSignature, userId|null,
    duration, classification, note

- name: tool_health_clear_cooldown
  requiresEngineRoles: [tool-health-writer]
  params: {scope, scopeId, toolName, errorSignature, userId|null}
```

In practice, the Engine will almost always produce an output via schema instead of calling these tools directly — Engine code translates the schema output into tool calls in a deterministic post-step (analogous to Vogon's `postActions`).

### 6.3 History-Read-Tool

```yaml
- name: tool_health_read
  description: Read the current health document + history for a tool.
  safety: SAFE_PROBE
  requiresEngineRoles: [tool-health-reader]
  params: {scope, scopeId, toolName}
  returns: <ToolHealthDocument as JSON>
```

This allows Agrajag to read the history during the diagnosis turn — "was already broken 5 min ago" becomes concrete.

---

## 7. System Session and Bootstrap

Agrajag does not live in a User Session, but in a **System Session per Project**:

- One Session per `(tenantId, projectId)` with `system: true`, `userId: _system`, `displayName: _agrajag`. Analogous to the Scheduler pattern.
- During bootstrap (either Brain boot for projects with `homeCluster == thisPod` or lazy on the first Agrajag job), the Session is created if not already present.
- The Session is `system: true` → hidden in the User-Session list, no auto-title, no abandoned-detection.
- `onIdle: SUSPEND` with a short `idleTimeoutMs` (e.g., 5 min) — an Agrajag-Session does not consume Pod resources when idle.

**User-Context-Threading:** even if the Session itself has a System-Owner, the **Agrajag-Process** carries the `originatingUserId` from the job. The `ThinkEngineContext` exposes this as "Identity-for-Tool-Probes" — `tool_probe_as_user` with `userId=originatingUserId` then uses these User-Credentials. If the Engine sets `userId=null`, it falls back to Tenant-Defaults. This is the mechanism by which Agrajag can "test with a different user".

**Lifecycle Position:** the bootstrapping of an Agrajag-Session is the responsibility of the Brain-Pod hosting the Project. Upon Project-Pod change (`bring()`), the old Session is unbound, the new Pod creates its own or takes over the existing one.

---

## 8. Queue and Coalescing

One logical Queue per Project for Agrajag jobs. In v1 as a persistent sub-collection or as `pendingMessages` on a long-lived Agrajag-Coordinator-Process (for simplification, probably the latter — standard `pendingMessages` mechanism will be reused, the Coordinator-Process itself does no diagnosis, but spawns an Agrajag-Child each time).

### 8.1 Job Schema

```json
{
  "serviceType": "agrajag",
  "scope": "PROJECT",
  "scopeId": "essay-pipeline",
  "toolName": "mcp_search",

  "originatingUserId": "alice",
  "originatingSessionId": "sess_abc",
  "originatingProcessId": "proc_xyz",

  "trigger": "tool_call_error",        # or "user_request", "scheduled_recheck"
  "errorSignature": "http-5xx",
  "errorDetail": "...",                # truncated tool result

  "createdAt": "..."
}
```

### 8.2 Coalescing-Key

`(serviceType, scope, scopeId, toolName, errorSignature, originatingUserId)`

On append: if a job with the same key is already queued → no second entry, optional merge of `errorDetail` (list of previous signals, max N).

If the Tool-Health-Doc has a fresh `lastCheckedAt < N min` for the same classification → the job is not accepted at all, the Checker directly receives "already diagnosed" and reflects the existing state to the LLM.

---

## 9. Trigger Sources

Three legitimate ways to create an Agrajag job:

| Trigger | Layer | Who | When |
|---|---|---|---|
| **Tool-Call Error** (most common) | `AgrajagChecker` in Dispatcher | any User-Engine indirectly | on `UNCLEAR` classification |
| **System-Event** | `ToolHealthService` | Lifecycle code | optional, as audit trail for binary events |
| **User-Request** | `process_create(recipe="agrajag", params={toolName})` from Chat or REST | Arthur / direct REST-Call from UI button | User explicitly asks "check if X works" |

For User-Request, Agrajag acts as a Worker with a Response (Parent is the calling Engine or the REST-Caller waits for the Process-Result). For Tool-Call Error and System-Event, Agrajag is fire-and-forget — the Health-Doc write is the result.

---

## 10. Recipe

```yaml
agrajag:
  engine: agrajag
  description: Tool-health diagnostic service engine.
  category: service                    # UI-/List-Filter-Marker
  roles: [tool-prober, tool-health-writer, tool-health-reader]

  params:
    model: default:fast                # Diagnosis is not deep analysis
    maxProbes: 3                       # hard probe limit per diagnosis
    maxIterations: 3

  outputSchema:
    type: object
    required: [classification, scope, humanNote]
    properties:
      classification: {enum: [...]}
      scope: {enum: [SESSION, USER, PROJECT, TENANT, GLOBAL]}
      expectedRecoveryAt: {type: string, format: date-time, nullable: true}
      humanNote: {type: string, maxLength: 500}
      userActionHint: {type: string, nullable: true, maxLength: 200}
      cooldownAdjustments: {type: array, items: {...}}

  postActions:
    - on: schema-valid-output
      do: writeHealthDoc                # deterministic translator
                                        # outputSchema → tool_health_set_*

  allowedTools:
    - tool_probe_as_user
    - tool_probe_as_system
    - tool_health_read
    # tool_health_set_* implicitly via postActions

  promptPrefix: |
    You are Agrajag, a tool-health diagnostic engine. You investigate a single
    tool error report and produce a structured classification.

    Available investigative actions: probe the tool as the originating user,
    probe it as system (no user credentials), or rely on the recent history
    if it is informative.

    Output schema:
      classification: one of TECHNICALLY_BROKEN, USER_SPECIFIC_TECHNICAL,
                      USER_PERMISSION, USER_INPUT, INTERMITTENT, WORKING
      scope:          where the status applies (narrowest fitting Scope)
      expectedRecoveryAt: estimate based on the history pattern, or null
      humanNote:      short audit note, ≤ 500 chars
      userActionHint: only for USER_SPECIFIC_TECHNICAL, ≤ 200 chars,
                      addressed to the user (German if user prefers, else English)
      cooldownAdjustments: any additional cooldown entries to set

    Guidelines:
    - Prefer reading history over probing when the same signature appeared
      recently. Pattern of repeated INTERMITTENT in the last hour → suggest
      a longer expectedRecoveryAt.
    - If probe as user fails but probe as system succeeds → USER_SPECIFIC_TECHNICAL.
    - Never call write tools directly — your output schema is the only contract.
    - Never speculate beyond evidence. Unknown is allowed: expectedRecoveryAt=null.
```

---

## 11. Direct User Trigger

Two variants:

**Via Chat / LLM-Tool-Call:**

Arthur (or another user-facing Engine) has a `process_create` in the Tool-Pool. The user says "Ask Agrajag if Google still works". Arthur calls `process_create(recipe="agrajag", params={toolName: "google_search", scope: "PROJECT", scopeId: <currentProject>})`. This spawns an Agrajag-Process under Arthur (Parent = Arthur), Agrajag performs its diagnosis, responds via `ParentReport` (see [think-engines §7a](/docs/think-engines)) back to Arthur, Arthur synthesizes the response in the chat.

Here, Agrajag is in **Worker Mode** — request-response, Parent waits.

**Via REST:**

```
POST /brain/{tenant}/tools/{toolName}/recheck?scope=PROJECT&scopeId={projectId}
```

UI button "Test connection". Endpoint enqueues an Agrajag job with `trigger=user_request`, polls the Health-Doc after a short timeout, delivers the updated result. Here, Agrajag is in **Service Mode** — fire-and-forget, the caller checks itself.

---

## 12. Generalization — Service Engine Pattern

The pattern introduced here is explicitly not Agrajag-specific. Three further Service Engines are foreseeable (already named in the Adams universe):

| Engine | Adams | Purpose | Roles |
|---|---|---|---|
| **Lunkwill** | Lunkwill | Repair — e.g., MCP-Reconnect, Token-Refresh-Trigger, Cache-Invalidation | `tool-health-writer`, `repair-actor` |
| **Prak** | Prak | Audit — periodic read scan over Tool-Calls + Tool-Results, Anomaly-Detection | `audit-reader`, `audit-writer` |
| **Agrajag** | Agrajag | Failure-Tracking — categorizes recurring Engine-Failures, provides diagnosis trends | `audit-reader`, `failure-tracker` |

Common infrastructure that all share (and which Agrajag concretizes):

1. **Job Queue** with Coalescing via typed Idempotency-Key.
2. **System Session per Project** with `system: true`, short Idle-Suspend.
3. **Spawn-per-task** Service-Process with System-User-Owner and optional User-Context-Threading.
4. **Engine Roles** as audience filter for Tools.
5. **Structured Output Schema** instead of free chat response.
6. **`category: service`-Recipe-Marker** for UI-/listing filters.

Implementation of these building blocks will occur during the Agrajag phase — Lunkwill etc. can reuse them once they arrive.

---

## 13. What This Spec Does Not Govern

- **Probe-Tool Implementation:** how `tool_probe_as_user` internally assumes a user identity — see [identity-credentials](/docs/identity-credentials) (User-Credentials-Vault, Probe-Identity-Switch).
- **History-Retention-Policy:** Default ring buffer size and Tenant override — see [tool-availability §10](/docs/tool-availability).
- **Cron-driven Recheck:** deliberately not. Reactivation happens organically via `expectedRecoveryAt` + naive retry by the next actual Tool-Call.
- **Lunkwill / Prak / Agrajag Detail Specs.** Separate specs when the Engines are actually built — do not anticipate.
- **Auto-Learning of Pattern Rules:** §4.2 provides for a `locked` flag that a future learning system will respect. The learning mechanism itself (when a new rule can be automatically suggested, who confirms it, how it is versioned) is the scope of a separate later spec — today, pattern rules are maintained exclusively manually.
- **Editor-UI for the Pattern File:** a web UI for editing `_vance/agrajag/error-patterns.yaml` is not v1. Tenant-Admins edit the YAML file directly (via the existing Document-Editor in the Web-UI or via CLI).
- **Cross-Pod-State-Sync:** not necessary. Tool-Health lives in Mongo, is readable across Pods.

---

## 14. Relation to Other Specs

- [tool-availability](/docs/tool-availability) — State model that Agrajag writes to.
- [think-engines §7b](/docs/think-engines) — Service-Engine topology + Engine Roles concept.
- [structured-engine-output](/docs/structured-engine-output) — Output-Schema-Validation, same mechanism as Vogon.
- [recipes](/docs/recipes) — `roles:` and `category:` as new Recipe fields.
- [identity-credentials](/docs/identity-credentials) — User-Credentials for `tool_probe_as_user`.
- [session-lifecycle §7](/docs/session-lifecycle) — Idle-Suspend for the System-Session per Project.
- [mcp-tool-routing](/docs/mcp-tool-routing) — MCP-Connection-Lifecycle-Events trigger direct System-Path write.
- [server-tools](/docs/server-tools) — `safety: SAFE_PROBE` marker in the Tool Manifest.
