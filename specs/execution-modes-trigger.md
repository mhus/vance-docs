---
title: "Vance — Execution Modes & Trigger"
parent: Specs
permalink: /specs/execution-modes-trigger
---

<!-- AUTO-GENERATED from specification/public/en/execution-modes-trigger.md — do not edit here. -->

---
# Vance — Execution Modes & Trigger

> Defines how Think Processes are triggered and how the unified client session model works.
> Core principle: Everything is a client. Everything runs in a session.
> See also: [architektur-scopes-clients](/specs/architektur-scopes-clients) | [mcp-tool-routing](/specs/mcp-tool-routing) | [workflows](/specs/workflows)

---

## 1. Design Principle: Everything is a Client

There is no special path for autonomous work. Cron jobs, webhooks, the Brain Linker — everything connects as a client, opens a session, works, and disconnects.

The difference between clients: **some bring tools, some don't.**

The Brain always follows the same code path: open session → register client's tools → execute Think Process → close session.

---

## 2. Client Types

| Client Type | Human? | Brings Tools? | Session Duration | Typical Use Case |
|-----------|---------|-------------------|--------------|------------------|
| **CLI** | Yes | Yes (Shell, Git, FS, Code Analysis) | Hours | Developer working at terminal |
| **Desktop** | Yes | Yes (FS, PDF, LaTeX, local scripts) | Hours | Scientist at computer |
| **Mobile** | Yes | Few (Camera, files) | Minutes | Checking status, approving on the go |
| **Web UI** | Yes | No (but can open session) | Minutes | Browser dashboard, review, light steering |
| **Cron** | No | No | Minutes | Time-scheduled Think Process continuation |
| **Webhook** | No | No | Seconds/Minutes | External event triggers action |
| **Brain Linker** | No | No | Minutes | Internal knowledge graph analysis |

### What the Brain Sees

For the Brain, every client is the same:

```yaml
session:
  id: sess_abc123
  client:
    type: cron                   # cli | desktop | mobile | web | cron | webhook | brain_linker
    is_human: false              # true for cli/desktop/mobile/web
    available_tools: []          # empty for cron/webhook/linker
  scope:
    project_id: proj_5
    thinkProcessId: tp_12
  started_at: 2026-04-24T09:00:00
```

---

## 3. Human vs. System Clients

The only architectural difference:

| Aspect | Human Client | System Client |
|--------|-------------------|--------------|
| `is_human` | true | false |
| Chat History | Yes (persisted in session) | No |
| Approval | Inline — User responds in client | Async — Task becomes `waiting_approval`, Notification |
| Undo | Yes | No |
| Interactivity | User can intervene at any time | Runs through until complete/blocked |
| Session Duration | Open (until user closes or timeout) | Short (one run, then close) |
| Multiple Think Processes | Yes (user can switch) | No (one run = one Think Process/action) |

---

## 4. Web UI as a Client

Web UI was previously planned as stateless/REST-only. However, if a user in the browser wants to approve a task, steer a Think Process, or start a workflow, this is an interactive action that requires a session.

**Solution:** Web UI can optionally open a session (WebSocket upgrade). It then behaves like a client — without local tools, but with chat and approval.

```
Web UI Mode 1: Dashboard (REST only, stateless)
  → Display Think Process list, read results, browse memory
  → No session needed

Web UI Mode 2: Interactive (WebSocket, Session)
  → Steer Think Process, approve tasks, chat with Brain
  → Session is opened, client type: "web"
  → No local tools, but full interaction
```

This means: the Web UI is an **optional client**. It can operate as a pure dashboard (not a client) or as an interactive client (with a session). The user decides based on their needs.

---

## 5. Trigger → Client → Session → Execution

Every trigger generates the same flow:

```
Trigger
  │
  ├── User opens CLI/Desktop/Mobile
  │     → Client connects
  │     → Session is created (or resumed)
  │     → Client registers tools
  │     → User works interactively
  │     → Session remains open
  │
  ├── User opens Web UI interactively
  │     → WebSocket upgrade
  │     → Session is created
  │     → No tools
  │     → User approves/steers
  │     → Session closes when user closes tab
  │
  ├── Cron fires
  │     → Internal system client connects
  │     → System session is created
  │     → No tools
  │     → Think Process continuation or workflow start
  │     → Session closes after run
  │
  ├── Webhook fires
  │     → Internal system client connects
  │     → System session is created
  │     → No tools
  │     → Execute configured action
  │     → Session closes after action
  │
  └── Brain Linker scheduled
        → Internal system client connects
        → System session is created
        → No tools
        → Knowledge graph analysis
        → Session closes after run
```

**One code path. Always.**

---

## 6. Cron Jobs

### Configuration

```yaml
cron_jobs:
  # Think Process Level: "Continue this Think Process"
  - id: cron_eng12_daily
    schedule: "0 9 * * *"
    scope:
      project_id: proj_5
      thinkProcessId: tp_12
    action: process_continue
    constraints:
      max_tasks: 3
      max_tokens: 50000
      stop_on_approval: true
      stop_on_client_tool: true

  # Project Level: "Start workflow regularly"
  - id: cron_weekly_review
    schedule: "0 9 * * MON"
    scope:
      project_id: proj_5
    action: run_workflow
    workflow_id: wf_weekly_review
    input:
      scope: "Last 7 Days"

  # Brain Linker
  - id: cron_linker_proj5
    schedule: "*/30 * * * *"
    scope:
      project_id: proj_5
    action: brain_linker
    strategies: [contradiction_scan, support_scan]
    constraints:
      max_llm_calls: 10
```

### What Happens During a Cron Run

```
1. Scheduler fires
2. System client connects, system session is created
3. Execute action:
   - process_continue: execute next task(s) of the Think Process
   - run_workflow: instantiate and start workflow
   - brain_linker: run knowledge graph analysis
4. If needed:
   - Task requires client tool → Task becomes 'blocked'
   - Task requires approval → Task becomes 'waiting_approval', Notification
5. Write run log
6. Close session
```

---

## 7. Webhooks

### Endpoint

```
POST /api/webhooks/{webhook_id}
  Headers: X-Webhook-Secret: <secret>
  Body: { ... event payload ... }
```

### Configuration

```yaml
webhooks:
  - id: wh_gdrive_new_paper
    source: google_drive
    secret: "vault://secrets/gdrive_webhook"
    action:
      type: run_workflow
      workflow_id: wf_ingest_paper
      input:
        file_url: "${event.file.url}"

  - id: wh_jira_done
    source: jira
    secret: "vault://secrets/jira_webhook"
    filter:
      event_type: issue_transitioned
      status_to: "Done"
    action:
      type: unblock_tasks
      match:
        blocked_by_external: "jira:${event.issue.key}"
```

### Flow

```
1. HTTP Request comes in
2. Validate secret
3. System client connects, system session is created
4. Execute configured action
5. Close session
6. Return HTTP 200
```

---

## 8. Run Log

Every run (whether user or system) is logged:

```yaml
run_log:
  id: run_456
  session_id: sess_sys_789
  client_type: cron
  trigger:
    type: cron
    cron_id: cron_eng12_daily
  scope:
    project_id: proj_5
    thinkProcessId: tp_12
  started_at: 2026-04-24T09:00:00
  finished_at: 2026-04-24T09:03:42
  status: completed_partial
  tasks_executed: 3
  tasks_blocked: 1
  blocked_reasons:
    - task_id: node_7_4
      reason: "Requires client tool: read_local_file"
  tokens_used: 12450
  notifications_sent:
    - type: push
      user: user_mike
      message: "Think Process 'Literature Review': 3 Tasks completed, 1 waiting for client"
```

Visible in the Web UI Dashboard and queryable via CLI: `vance runs --engine tp_12`.

---

## 9. Summary

> **Everything is a client. Everything runs in a session.**
>
> Human clients bring tools and work interactively.
> System clients bring no tools and run through.
> Web UI can do both — dashboard without a session or interactive with a session.
>
> The Brain has one code path. Always. No special treatment.

---

*See also: [architektur-scopes-clients](/specs/architektur-scopes-clients) | [mcp-tool-routing](/specs/mcp-tool-routing) | [workflows](/specs/workflows) | [knowledge-graph](/specs/knowledge-graph)*
