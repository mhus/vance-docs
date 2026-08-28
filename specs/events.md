---
title: "Vancetope — Events"
parent: Specs
permalink: /specs/events
---

<!-- AUTO-GENERATED from specification/public/en/events.md — do not edit here. -->

---
# Vancetope — Events

> An **Event** is an externally triggerable, REST-accessible trigger that starts a workflow run. Events are YAML documents located under `_vance/events/<name>.yaml` in the Document Layer, are resolved via the usual cascade (`Project → _tenant`), and are addressable via a JWT-free endpoint: `GET|POST /brain/{tenant}/event/{project}/{event}`.
>
> Events are the third trigger path, alongside **Scheduler** (time-based) and **Ursahooks** (in-process). They serve as the bridgehead to the outside world — webhooks, IoT pushes, CI hooks, manual `curl` triggers.
>
> Authentication is **mandatory** and uses a YAML-configured Bearer Token; the token can be inline or resolved as a Setting reference via the Setting Cascade, to prevent secrets from ending up in documents editable by operators. An explicitly public Event declares this with `auth.public: true` — the insecure case is explicit, not silent.
>
> An Event responds differently depending on the Action variant — specifically, as the variant is capable. A **Script** runs to completion and returns its return value under `output`; a **Recipe** or **Workflow Spawn** is open and only reports that it has started (`workflowRunId`). `async: true` switches a Script to fire-and-forget, `async: false` is not allowed for Spawns: waiting for a lane-serialized Think Process is indefinite and can block on user input — which would be neither a result nor an error. No polling token, no rate limiting. *Note:* for historical reasons, the response field name is `workflowRunId`, but it carries both Workflow Run ID and Process ID — a rename is in the backlog.
>
> See also: [workflows](/specs/workflows) | [scheduler](/specs/scheduler) | [ursahooks](/specs/ursahooks) | [settings-system](/specs/settings-system) | [recipes](/specs/recipes)

---

## 1. Terminology

| Term | Definition |
|---|---|
| **Event-Doc** | YAML document under `_vance/events/<name>.yaml` in the Project or in the `_tenant` Tenant Scope. The filename (without `.yaml`) is the Event name. |
| **Event-Trigger** | A single REST call against `/brain/{tenant}/event/{project}/{event}`. If all checks pass, it dispatches the `TriggerAction` (Recipe/Script/Workflow) declared in the Event-Doc via the `ActionExecutorRegistry` and returns what the variant can provide: the spawned ID for Recipe/Workflow, the return value under `output` for a synchronous Script. |
| **Bearer-Token** | Optional shared Secret, configured in the Event YAML (inline or via Setting reference). Expected in the `Authorization: Bearer <token>` header. |
| **Payload** | JSON body of a POST call. Passed to the spawned Workflow under `params.payload` — no unpacking, no schema matching. |
| **runAs** | Identity under which the spawned Workflow Run operates. Defaults to the `createdBy` of the Event-Doc if not set in the YAML. |

**Event ↔ Scheduler ↔ Ursahook:** Three trigger paths in Vancetope. Scheduler triggers by time, Ursahook by Vancetope-internal lifecycle event, Event by external HTTP call. All three fire the same `TriggerAction` hierarchy (Recipe / Script / Workflow — see [trigger-actions](/specs/trigger-actions)) through the same `ActionExecutorRegistry`. None carry their own spawn logic — all pass parameters.

---

## 2. Event YAML Schema

```yaml
# _vance/events/github-pr.yaml

description: "GitHub PR Webhook → pr-review-Workflow"

# Action variant: exactly one of recipe: / script: / workflow:
workflow: pr-review                # Workflow name (Cascade: Project → _tenant)

enabled: true                      # default true; false → 404 (existence not leaked)

methods: [POST]                    # allowed HTTP methods, default: GET + POST. Only GET and POST are allowed in v1
auth:                              # MANDATORY — exactly one of the three
  tokenSetting: events.github.token  # Setting Cascade key — or:
  # token: hunter2                 # ...inline literal (test-friendly) — or:
  # public: true                   # ...explicitly open (IoT push, CI hook without header control)

params:                            # static params, merged into the Action Run; POST body additionally lands under params.payload
  source: "github"

runAs: ci-bot                      # optional; default: createdBy of the Event-Doc
async: false                       # only for script:; default script=false, spawn=true
outputToAgents: true               # default: false if runAs is set, otherwise true — see §8b
tags: [ci, github]
```

**Mandatory field (Action variant):** Exactly one of `recipe:`, `script:`, `workflow:` — disjunction analogous to Scheduler. Recipe variant spawns a ThinkProcess (with `initialMessage?` field); Script variant executes a JS Document/Workspace Script in the `TRIGGER_SCOPED` sandbox; Workflow variant starts a Magrathea Workflow Run. Schema details: [trigger-actions §3](/specs/trigger-actions).

Everything else has sensible defaults (`enabled: true`, `methods: [GET, POST]`, no Auth, no Params).

**Mutually exclusive:** `auth.token:` and `auth.tokenSetting:` must not both be set.

**Method Whitelist:** Only `GET` and `POST` in v1. `PUT`/`DELETE` are rejected by the loader — they have no semantic role in a one-shot trigger.

---

## 3. REST Endpoint

```
GET  /brain/{tenant}/event/{project}/{event}                      → 200 EventTriggerResponse
POST /brain/{tenant}/event/{project}/{event}                      → 200 EventTriggerResponse
       Headers (optional): Authorization: Bearer <token>
       Body (POST, optional): application/json
```

### 3.1 Routing: The Trigger goes where the Project is

An Event spawns work on the Project's Lane, so it must run where the Project is hosted. Process on the Pod that receives the HTTP call:

1. Resolve Event, check `enabled`, check method, **check Bearer Token**.
2. `ProjectLocator.locate(autoStart=true)` — **blocking** until the Project is up (Workspace restored, Engines started, status `RUNNING`).
3. If another Pod holds the Lease, the Trigger is forwarded there (`UrsaEventForwarder`).

**The order is part of the guarantee:** an unknown Event name or an incorrect token must **not** bring up a Project — otherwise, the endpoint becomes a way to make foreign clusters work.

**Cold Start is intentional.** An Event Trigger is reactive and therefore **not** a reason to keep a Project permanently on a Pod (see cluster-project-management.md §2.1). The first trigger after a restart pays for the start, every subsequent one finds the Project up. The alternative would be to bind every Project to a Pod with a webhook year-round.

**Exactly one hop**, enforced via the `X-Vance-Event-Forwarded` header — otherwise, a lease changing ownership mid-flight could cause the request to ping-pong between two Pods.

**The marker alone proves nothing, and therefore it is not sufficient.** This route is JWT-free and never passes through the `InternalAccessFilter`, so the Internal Token is not checked anywhere on `/brain/**` — any caller could set the header and thus bypass owner resolution, placing work on a Lane that does not even exist on this Pod. The hop must therefore authenticate with the Shared Secret (`X-Vance-Internal-Token`, constant-time via `MessageDigest.isEqual` in `UrsaEventForwarder.isTrustedHop`).

An **unproven** marker is **ignored and logged (WARN)**, not rejected: the request then continues via normal owner resolution. This gradation is secure — a Pod that is itself the owner finds itself and works locally — while a 4xx would cause a genuine forward to fail due to an incorrectly set secret. Forwarding occurs to the **public** endpoint with the original token: the target Pod authenticates itself instead of trusting the hop, and a `401` from the owner remains a `401`. If the owner does not respond, it's a `502` — continuing locally would place the work on the wrong Lane. If, however, the *placement* already fails, the trigger continues locally (fail-open), as it did before the introduction of routing.

`triggerAdmin` and the `event_fire` tool are **not routed**: they run from a process context that is already within the Project.

Response format:

```json
{
  "event": "github-pr",
  "workflowName": "pr-review",
  "workflowRunId": "a3f9c1d2"
}
```

### Error Codes

| Status | Meaning |
|---|---|
| `200` | Action dispatched. For Workflow Action, `workflowRunId` in the body; for Recipe Action, the Process ID under the same field (historical name); for synchronous Script Action, the return value under `output` (scalar/array under `output.value`, object as itself — same convention as in the Workflow Layer). For `async: true`, neither. |
| `401` | Event requires Bearer Auth, no/wrong token sent. |
| `404` | Event does not exist, is `enabled: false`, or is the wrong method (see below). |
| `405` | Event exists but does not accept the HTTP method. |
| `415` | POST body is not `application/json`. |
| `400` | POST body is not parseable JSON. |
| `429` | Too many asynchronous Script Events are already running (§3.2). |
| `502` | Workflow Spawn failed (e.g., Workflow YAML missing, required param empty). |
| `503` | Magrathea is disabled (`vance.services.magrathea=false`), or `auth.tokenSetting:` references an empty Setting (Misconfig). |

**Existence Leakage:** Disabled Events explicitly return `404`, not `403` — so an attacker cannot deduce from the response code that the Event name exists. Bearer mismatch returns `401` because it indicates existence to the caller; this is acceptable because Bearer Auth is opt-in anyway.

### 3.2 Limit for Asynchronous Script Events (`429`)

`vance.events.async.max-concurrent` (default **32**, `0` = off) limits how many `async: true` Script Events can run concurrently. If no slot is available, the endpoint responds **429** and the call is not accepted.

The reason is the combination of three characteristics of this route: no JWT, no rate limit, and an immediate response for `async: true`. As long as the script ran on the request thread, the Servlet pool was an implicit ceiling; immediate responses removed it. `timeoutSeconds` limits *how long* a run takes, never **how many** — an `auth.public: true` script event with `async: true` would otherwise allow a caller to start work as fast as they can open connections.

**Rejected instead of queued:** someone who hears "not now" can try again; someone silently placed in a queue cannot distinguish an accepted run from a discarded one.

**A throttled trigger does *not* write a Log Document.** One document per rejection would turn the brake into an amplifier — the same consideration as for `404` (§8a). Throttling is visible via the metric (`vance.ursaevents.triggers`, `outcome=throttled`) and a WARN line.

`0` is the documented emergency exit for a deployment that places its own limiter in front; the Boot then logs a WARN line so the decision is in the log.

### Authentication Bypass in `BrainAccessFilter`

The Event endpoint is the only `/brain/...` route outside the JWT mint that can be reached without a JWT. The bypass in `BrainAccessFilter` is tightly restricted by the regex `^/brain/[^/]+/event/[^/]+/[^/]+/?$`; all other `/brain/{tenant}/event/...` paths continue through normal JWT validation. The actual Auth logic resides in `UrsaEventService` and decides per Event whether a Bearer Token is expected.

---

## 4. Payload Handling

If a POST carries a JSON body, it is merged **as a whole** under the key `payload` into the Workflow Params:

```yaml
# Event-Doc:
params:
  source: "github"
```

```json
// POST-Body:
{ "pr_url": "https://github.com/x/y/pull/42", "branch": "main" }
```

Results in the `start()` call:

```java
workflowService.start(tenantId, projectId, "pr-review",
    Map.of(
      "source", "github",
      "payload", Map.of("pr_url", "...", "branch", "main")
    ),
    runAs);
```

The Workflow extracts its expected fields from `params.payload.<key>`. This form is deliberately chosen:

1. No unpacking schema, no mapping in the Event YAML — Events remain lean.
2. Static `params:` from the YAML do not conflict with the caller payload, because the latter sits under its own key.
3. Workflows can treat the `payload` block as an opaque blob (e.g., pass it to an `agent_task`) or extract specific fields.

GET calls have no body — `params.payload` is then missing; static params still arrive.

---

## 5. Auth Mode

### 5.1 Inline Literal

```yaml
auth:
  token: hunter2
```

Test-friendly, but plaintext in the YAML — only for Dev/Demos. If the Event-Doc is distributed or exported via a Kit, the token travels with it.

### 5.2 Setting Cascade

```yaml
auth:
  tokenSetting: events.github.token
```

The `UrsaEventService` resolves the token via `SettingService.getStringValueCascade(tenantId, projectId, /*thinkProcessId*/null, key)` — i.e., Project Setting > `_tenant` Setting > empty. If the Setting is missing or empty, the endpoint responds with `503` (Misconfig). Recommended for production Events: maintain the Setting in the Setting Editor, the Event YAML only contains the reference key.

### 5.3 Constant-time Comparison

The token comparison uses `MessageDigest.isEqual(...)` — no string comparison via `.equals()`. This ensures that response latency does not depend on the token prefix (no timing side-channel on the token content).

### 5.4 No Auth Block = Public

Events without `auth:` are accessible without a token. This is legitimate for trivial health pings or purely internal endpoints — the operator decides consciously.

---

## 6. Cascade Resolution

Identical to Scheduler and Ursahooks: an Event-Doc can be overridden per Project, otherwise the Tenant default version from `_vance/events/<name>.yaml` is used. The Resource Layer (Classpath under `vance-defaults/`) is **not** supported for Events — Event configs carry tenant-/project-specific secrets, a Classpath Layer would be a security footgun.

```
GET  /brain/acme/event/p1/github-pr
  UrsaEventLoader.load("acme", "p1", "github-pr")
    1. _vance/events/github-pr.yaml in Project p1 ?
    2. _vance/events/github-pr.yaml in the _tenant Project of acme ?
    3. otherwise → Optional.empty() → 404
```

---

## 7. Relationship to Workflows

An Event spawns a Workflow Run — not a ThinkSession and not directly a Recipe. Thus:

- Audit trail is in the Workflow Journal (`magrathea_journal`), not in a separate Event Log.
- Bounds, Tools, allowedTools, Cancel — all from the Workflow Spec.
- One-Shot vs. Long-Running is decided by the Workflow, not the Event. A single Event call can start a 7-day Workflow — the HTTP response only says "the run was registered", not "the run is finished".

If a caller needs a "sync-Workflow" (an immediate response), that belongs in the Workflow itself (terminal task with result mapping to another system), not in the Event. Events remain fire-and-forget.

---

## 8. What Events are not (v1)

- **No Rate Limit, no Throttling.** Whoever knows the token can escalate. Operator responsibility — and typically OK for webhook sources, as the triggering system itself controls frequency.
- **No Signature Validation à la GitHub `X-Hub-Signature-256`.** Bearer Token is sufficient for v1. For provider-specific signatures, a dedicated webhook receiver is a better place than the generic Event endpoint.
- **No Replay Protection.** Tokens are static, no nonce tracking.
- **No Output Collection for Spawns.** For Recipe and Workflow Actions, the caller receives the spawned ID (Workflow Run ID / Process ID) and must poll themselves if they need the result — for Workflows via `GET /brain/{tenant}/project/{project}/workflows/runs/{runId}`, for Processes via `GET .../processes/{id}`. Synchronous Script Actions are exempt: they return their return value directly under `output`.
- **No Async/SSE Variant.** Connection closes after `200`.
- **No STARTED/COMPLETED Lifecycle Log like with the Scheduler.** Events are sync — Auth + Spawn Submission in milliseconds. The sync outcome (success / unauthorized / disabled / spawn_failed / …) is materialized per trigger as a Markdown document under `_vance/logs/events/<name>/…` (see §8a); the *run* telemetry (Workflow Journal, Process Lifecycle) remains in the respective subsystem.

If any of these points arise: stop, extend the Spec, then implement. Do not add ad-hoc.

---

## 8a. Trigger Log Documents

Every trigger — webhook or admin test — leaves a **Markdown document per call** under

```
_vance/logs/events/<eventName>/<isoStamp>-<correlationId>.md
```

in the firing Project. Mirror to the [Scheduler Log Documents](/specs/scheduler#9a-scheduler-log-documents) — the LLM finds both via `document_list`/`document_read`, no additional tool needed.

### Content

YAML Front Matter + Markdown body with a fixed field list. Example:

```markdown
---
kind: ursa-event-log
event: github-pr
correlationId: evt_550e8400-…
source: public        # public (webhook) | admin (UI test)
httpMethod: POST
runAs: user_alice
firedAt: 2026-06-09T08:15:00Z
durationMs: 42
outcome: success      # success | disabled | method_not_allowed | unauthorized
                      # | auth_misconfigured | magrathea_unavailable
                      # | spawn_failed | bad_payload | permission_denied
targetName: review-pr   # recipe / workflow / script:<path>
spawnedId: run_xyz
---

# Event 'github-pr' — evt_550e…

- **Fired:** 2026-06-09T08:15:00Z (public POST)
- **Outcome:** success (42 ms)
- **RunAs:** user_alice
- **Target:** review-pr
- **Spawned:** run_xyz
```

### Write Pattern

Unlike the Scheduler: **a single** document per trigger (no `outcome: pending` mid-flight). Events are sync — Resolve + Auth + Spawn-Submit take milliseconds, the outcome is fixed upon return and is written once via `UrsaEventLogService.record(...)` in a `finally` block from `UrsaEventService.trigger`/`triggerAdmin`. Async telemetry of the spawned Workflow or Recipe run lands in its own surface (Workflow Journal or Process Lifecycle).

### What is NOT logged

- **`not_found` triggers** (Event name does not exist): no document. Otherwise, arbitrary webhook spam with `/brain/{tenant}/{project}/events/<random>` could clutter the Document Layer.
- **Payload Body**: only size (`payloadSizeBytes`, as soon as it reaches the method) and Content-Type. Bodies are deliberately not persisted — webhook payloads often contain secrets/PII; the document is a diagnostic feed, not a forensic archive.

### TTL

`DocumentDocument.expiresAt` with MongoDB TTL. Per-Tenant/-Project override via Setting `events.log.retentionDays`, resolution per write operation (project → `_tenant` → `application.yml` default under `vance.events.log.retention-days`, default **7**). Same tri-state mechanism as for the Scheduler ([scheduler.md §9a](/specs/scheduler#9a-scheduler-log-documents)):

| Value | Meaning |
|---|---|
| `> 0` | Retention in days, clamped to `<= 365`. |
| `0` | **Infinite** — Document is written, `expiresAt` remains `null`, Mongo does not clean up. |
| `< 0` | **Disabled** — no Document write; metrics continue to count. |

---

## 8b. Agent Tools for Events

Five tools in the `events` toolset, mirroring the `scheduler` set:

| Tool | Label | Effect |
|---|---|---|
| `event_list` | `read-only, events` | All Events in the Project Scope (project-local + cascade-resolved from `_tenant`), sorted by name. |
| `event_get(name)` | `read-only, events` | Complete YAML + shaped metadata. Resolved via the `project → _tenant` cascade. |
| `event_set(name, yaml)` | `write, events` | Upsert: validates YAML with the same loader used by the webhook trigger, creates or replaces the document (previous state is auto-archived by the Document Layer). Cascade Tenant entries are shadowed, not modified — the write creates a project-local override. Response carries `created: true|false`. **No** lockMode-gate like with Scheduler — the `auth.tokenSetting:` cascade is the actual protection layer, and Settings are not writable via this tool. |
| `event_delete(name)` | `write, events` | Hard-delete of the **project-local** copy; a cascade-resolved Tenant entry of the same name remains untouched (analogous to `scheduler_delete`). Response carries `deleted: true|false`. |
| `event_fire(name, payload?)` | `admin, events` | Calls the Event from the current Project Scope — **without Bearer Token check**, because the Engine is already trustworthy through the Tenant/Project Gate. Just like the UI test trigger, the path goes via `UrsaEventService.triggerAdmin`, the Log Document accordingly carries `source: admin`. For a synchronous Script, the return value comes back under `output`, provided `outputToAgents` allows it — thus, an Event is a regular function call for an Agent and not just a testing tool. |

| Parameter | Mandatory | Description |
|---|---|---|
| `name` | ✓ | Event name (without `.yaml` suffix). |
| `payload` | – | Optional JSON object; lands in the Workflow/Recipe under `params.payload`. |

**`event_fire` Response:** `correlationId`, `logPath` (pointing to the written Log Document), `targetName` (Recipe/Workflow/`script:<path>`), `spawnedId` (process- or workflowRunId) and — for a synchronous Script with allowed visibility — `output`. The output is capped at 4000 characters; if truncated, it carries `truncated: true` and `totalChars` so the model does not mistake a truncated response for a complete one. On failure, the tool throws a `ToolException` with the server reason (`not_found`, `disabled`, `magrathea_unavailable`, `spawn_failed`, …); the Log Document was still written (exception `not_found` — skip log as in §8a).

This mirrors `scheduler_fire` from [scheduler.md §9](/specs/scheduler#9-agent-tools): the Agent can trigger an Event on its own, immediately view the result via `document_read(path = logPath)`, and report in the chat whether the configuration holds.

**`outputToAgents` — who can see the result.** `event_fire` skips the Bearer check; the caller has therefore not authenticated. As long as the Event runs under its own identity, this is inconsequential — it provides data that an Agent in the same Project would have access to anyway. As soon as `runAs:` assumes a **foreign** identity, it is a boundary transgression, and the output is withheld by default; `outputToAgents: true` explicitly releases it.

**The same rule applies on the *unauthenticated* webhook path** (`auth.public: true`, i.e., `!requiresAuth`): there too, the HTTP response only carries the output if `outputToAgents` releases it — otherwise, `output: null` is returned. The criterion is the same in both cases and it is not the channel, but the lack of authentication: `auth.public: true` **plus** `runAs:` is precisely the `event_fire` constellation on the webhook surface. Withholding the output from the Agent in the Project while simultaneously providing it as the return value of a privileged script to an **anonymous** caller would reverse the control.

The **authenticated** webhook is unaffected and always receives the output — it has authenticated, and that is the whole difference.

Withheld also means **withheld in the Log Document** (`output: [withheld — outputToAgents: false]`): the log is in the Project's Document Layer, so its audience is the same Agent. If the value were there, the block would be mere decoration.

The older gate `$meta.privileged` answers a different question — *who can write such documents*, not *who can call them*. `outputToAgents` is the second half and does not replace it.

---

## 9. Modules / Code

| Layer | Class | Responsibility |
|---|---|---|
| `vance-api/ursaevents` | `EventDto`, `EventTriggerResponse`, `EventSource` | Wire contract. `authConfigured`/`authType` for the UI without secret leak. |
| `vance-shared/ursaevents` | `UrsaEventLoader`, `ResolvedUrsaEvent`, `UrsaEventParseException` | YAML parsing, Cascade lookup, validation. No Auth logic, no HTTP. |
| `vance-brain/ursaeventtrigger` | `UrsaEventService`, `UrsaEventController`, `UrsaEventLogService` | REST endpoint, Bearer check, Workflow Spawn delegation. `UrsaEventLogService` writes a Markdown document per trigger under `_vance/logs/events/…` (§8a). |
| `vance-brain/tools/ursaevent` | `UrsaEventListTool`/`GetTool`/`SetTool`/`DeleteTool` (`event_list`/`get`/`set`/`delete`), `UrsaEventFireTool` (`event_fire`) | Agent Tools: CRUD set mirrors scheduler/hook (Upsert via `event_set`, Cascade-resolved Read), plus `event_fire` for end-to-end verification. Mutations write/delete the YAML documents under `_vance/events/`; `event_fire` routes via `triggerAdmin` (no Bearer), see §8b. |
| `vance-brain/access` | `BrainAccessFilter` (`EVENT_TRIGGER_PATH` bypass) | JWT-free path. |

The `UrsaEventService` has `ObjectProvider<MagratheaWorkflowService>` — if Magrathea is feature-flagged off, the service returns `503` and spawning does not occur.

Package naming: `vance-brain/events/` has long been reserved for the S2C notification pipeline (WebSocket push); the external trigger classes are therefore located under `vance-brain/ursaeventtrigger/` to clearly separate the two subsystems.

---

## 10. Example Setup

### 10.1 GitHub PR Webhook

```yaml
# _vance/events/github-pr.yaml
description: "GitHub PR Hook → pr-review"
workflow: pr-review
methods: [POST]
auth:
  tokenSetting: events.github.token
runAs: ci-bot
```

```bash
# Setting in the Project:
vance settings:set events.github.token=<your-token>

# GitHub Repository → Settings → Webhooks → Add webhook:
URL:           https://brain.example.com/brain/acme/event/p1/github-pr
Content type:  application/json
Secret:        <your-token>          # GitHub sends it in the X-Hub-Signature-Header,
                                     # we accept the Authorization-Header instead —
                                     # GitHub-specific signature is not implemented in v1.
```

### 10.2 IoT Sensor Push

```yaml
# _vance/events/sensor-alert.yaml
description: "IoT Sensor Threshold Exceeded"
workflow: sensor-triage
methods: [POST]
auth:
  tokenSetting: events.sensor.token
```

```bash
curl -X POST \
  -H "Authorization: Bearer $SENSOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sensor": "kitchen-temp", "value": 47.3, "unit": "C"}' \
  https://brain.example.com/brain/acme/event/home/sensor-alert
```

The `sensor-triage` Workflow reads `params.payload.sensor`, `params.payload.value`, … and decides.

### 10.3 Manual Trigger

```bash
# Health Ping, no Auth:
curl https://brain.example.com/brain/acme/event/p1/healthcheck
```

```yaml
# _vance/events/healthcheck.yaml
description: "Lightweight Health-Workflow"
workflow: health-ping
