---
title: Concepts
nav_order: 3
permalink: /concepts
---

# Concepts
{: .no_toc }

The core terms in Vance. Each will later link to its own page.
{: .fs-5 .fw-300 }

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Assignment

What the user (or another process) wants done. Has context, tools and a goal.
It's executed by a recipe + an engine.

## Engine

A Java algorithm with a lifecycle — the LLM does **not** drive the flow, the
code does. The engine decides when an LLM call happens, which tool is called,
and when an assignment is finished.

## Recipe

YAML configuration: engine + default params + prompt prefix + tool adjustments.
Few engines (structural algorithms), many recipes (named configuration
bundles). If you want a new type of assignment, you write a recipe — no Java.

## Think Process

A running assignment instance, persisted in MongoDB. Has status, task tree,
inbox and history. Survives disconnects and restarts.

## Scope

Hierarchy: tenant → project group → project → session → think-process.
Memory cascades downward and is isolated laterally. Permissions, quotas and
settings hang off the scope.

## Project Kit

A Git repo with skills, recipes, tools and settings that gets imported into
a project. Makes a project productive immediately and enables central
maintenance of team standards.

## Document

In Vance, **almost everything is a Document** — persisted in MongoDB,
addressable by name within a scope, versioned via `document_archives`,
served through one [`DocumentService`](/specs/server-tools) API. Same
read/write/list/event surface for all of:

- **Markdown content** — notes, specs, plans, drafts
- **Manuals** (`_vance/manuals/<topic>/<name>.md`) — on-demand context for the LLM
- **Recipes** (`_vance/recipes/<name>.yaml`) — engine + params + prompt
- **Skills** (`_vance/skills/<name>/skill.md` + manuals)
- **Scheduler configs** (`_vance/scheduler/<name>.yaml`) — recurring triggers
- **Events** (`_vance/events/<name>.yaml`) — external HTTP-triggered actions
- **Ursahook configs** — subscriptions to internal lifecycle events
- **Server-tool packs** (`_vance/server-tools/<name>.yaml`)
- **Setting forms** (`_vance/setting_forms/<name>.yaml`) — the YAML form schemas behind the Web UI's settings tabs
- **Application manifests** (`_app.yaml`) — `kind: application` configs (Calendar, Kanban, …)
- **Scripts** — `SCRIPT_JS` and Python entries, executed by Hactar

New subsystems plug in by being a Document type, not a new storage backend.
Cache coherence is handled by [`DocumentChangedEvent`](/specs/document-change-events)
across pods.

## Manual

A short Markdown document the LLM loads on demand via `manual_read('name')`.
Engine prompts stay compact and stable; capability details, domain knowledge
and how-tos live in manuals — the model pulls them when needed. The
mechanism is intentionally lazy: most turns load zero manuals.
Spec: [prompts-and-manuals](/specs/prompts-and-manuals).

## Skill

A trigger-activated capability — short skill body lists the relevant manuals
as a menu, the model pulls detail via `manual_read`. Skills are how
[Project Kits](#project-kit) bundle thinking patterns (`decision-frame`,
`code-review`, `feynman-method`, …). Spec: [skills](/specs/skills).

## Cascade

Most resources resolve through a **cascade across scopes**. When a process
asks for "the `analyze` recipe", it doesn't get a single hardcoded file —
Vance walks the cascade and picks the first match:

```
think-process  →  session  →  project  →  tenant  →  bundled defaults
```

A project override masks the tenant default. A tenant override masks the
bundled default. The session-level override masks everything else.

Some resources (Eddie's personal hub state, per-user preferences) live in a
dedicated `_user_<login>` project that sits between the regular project and
the tenant — so the **user-project** is a fifth level on those paths.

The cascade applies to:

- **Settings** ([`SettingService`](/specs/settings-system) cascade) — including AI provider keys, model aliases, quotas
- **Recipes** — project-local `recipes/<name>.yaml` overrides tenant, overrides bundled
- **Prompts** — prompt prefixes can be overridden at any cascade level
- **Manuals** — same file path in a project's `_vance/manuals/` masks the bundled one
- **Server-tool packs** — project-defined tool packs replace bundled
- **Project Kits** — kit inheritance (e.g. `security` → `code-development` → `basic`) is itself a cascade

Resolution is **first-match-wins** for content (recipes, manuals, prompts),
and **deep-merge** for structured data (`ai-models.yaml` per-key override).
Details: [recipes §cascade](/specs/recipes), [llm-resource-management §3a](/specs/llm-resource-management).

## Trigger

The three ways something starts running in Vance — the
[Ursa](/specs/ursahooks) trigger subsystem fires the same action hierarchy
(recipe / script / workflow) from any of:

- **Scheduler** — time-based, cron-style
- **Ursahook** — internal lifecycle events (process started, document
  changed, session bootstrapped …)
- **Event** — external HTTP calls (webhooks, IoT, CI hooks)

All three are just [Documents](#document) under `_vance/scheduler/`,
`_vance/events/`, `_vance/hooks/`. To add a new trigger, you write a YAML
document, not Java.
