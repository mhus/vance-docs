---
title: "Vancetope — Per-Scope HOME for Agent Subprocesses"
parent: Specs
permalink: /specs/homes
---

<!-- AUTO-GENERATED from llm/specification/homes.md (translated from the German specification/public/homes.md) — do not edit here. -->

# Vancetope — Per-Scope HOME for Agent Subprocesses

> **Homes** provide each Scope (Project, Tenant, User) with its own `HOME` for
> the subprocesses that agents start (`work_exec_run`, `python_run`,
> script runs). Previously, all projects and Tenants of a Pod shared the
> Brain's process Home — every agent shell saw the caches and
> runtime write messages of all others (Fix for `mhus/vance#63`).
>
> See also: [agent-toolbox](/specs/agent-toolbox) (sealed
> Exec-Env, `VANCE_EXEC_ENV`), [work-target](/specs/work-target)
> (Exec surfaces), [project-maintenance](/specs/project-maintenance)
> (delete/rename). Design history: `planning/home-isolation.md`.

---

## 1. Purpose — and what a Home is not

Three reasons why `HOME` is a scope directory and not the
process Home:

- **Isolation.** Caches and runtime-written config of one Scope
  do not affect the next: a `~/.npm` state left by one project
  does not belong in the next build of another.
- **The process Home is a credential store.** The Brain process lives in
  a Home that can carry deployment material — it should never be in the
  environment of an agent-controlled command (the same argument as the
  Sealed-Exec in `agent-toolbox.md`; `HOME` is part of the
  allow-list there, and this contract states *which* value belongs in it).
- **Eviction.** Growing tool caches are a Node disk and thus a
  k8s eviction path. A known Home can be budgeted (§3).

**Homes are disposable State (Persistence A):** what lies here may die with
the Pod. Caches and runtime config belong here; credentials
are re-materialized from their grants and never exist here as the sole
copy.

**Not here:** Workspace contents (these are in the Workspace root),
non-project configuration, shared artifacts between Scopes.

## 2. Scope Model

The granularity is chosen by the **`home-scope`** setting on the
Project Cascade — a value from `project | tenant | user`:

| Value | `HOME` of the subprocess | Sharing |
|---|---|---|
| `project` (Default) | `<homes>/<tenant>/<project-name>` | none — full isolation |
| `tenant` | `<homes>/<tenant>/_tenant` | all projects of the Tenant |
| `user` | `<homes>/<tenant>/_user_<login>` | all projects of this User |

- **Fail-safe is `project`.** Missing or unparseable ⇒ narrowest
  isolation, with WARN log — a typo in the setting can never *widen* sharing.
- **Resolution without Think Process Scope.** The setting is read as
  `user → project → _tenant`, never via the process — a
  `setting_set` with process scope must not widen its own gate
  (the same pattern as `wowbagger.allowed-models`).
- **The key vocabulary is that of the permission language** (`_tenant`,
  `_user_<login>`, otherwise the project `name`) — the directory name is
  derived from the enum **in the code**, never from setting text.
- `user` without user context (e.g., `work_exec_run` without user) falls back to the
  project Home: still isolated, just less shared.

## 3. Layout, Budget, Configuration

```
<homes-root>/<tenant>/<scope-key>/        e.g., homes/acme/_user_alice
```

- **`vance.homes.root`** — Root of the Home tree. Empty (Default) ⇒
  Sibling of the configured Workspace root (`<workspace>/../homes`).
  Deliberately a separate tree: nothing that lists, serves, or exports
  Workspace contents reaches a Home, and no filter needs to remember
  an exception. To have Homes on a different medium, set the root explicitly.
- **`vance.homes.max-bytes`** — Size budget per Home directory
  (Default 2 GiB, `0` = off). Measurement is coarse (at most one
  tree traversal every 5 minutes per Scope); exceeding budget **prevents the
  subprocess from starting** — the error message states the size, budget, and the three
  options (clean up, increase budget, `0`). The Home itself belongs to the
  agent: cleaning up is its responsibility.
- **`home-scope`** — Setting, see §2 (not a Property: the choice belongs in
  the Scope Cascade, not in the deployment config).

## 4. Contract for Subprocesses

- The scoped `HOME` is in the **sealed** child environment
  (`ExecEnvPolicy` base → scoped `HOME` → Caller Extras), on both
  Exec surfaces (`work_exec_run` in the Brain, script/Python runs) — the
  Brain's process Home is not visible to any subprocess.
- **Order is contract:** Caller Extras may override `HOME` (and `PATH`) —
  a script run that pins its own `HOME` wins over the resolved one;
  the base never wins over an Extra.
- The **Foot** deliberately inherits the host's user Home: it runs on
  the human's workstation, its `HOME` *is* their Home. Homes are
  a Brain construct for agent subprocesses.

## 5. Maintenance (delete / rename)

Two data handlers in `vance-shared` (`homes` — deliberately not a Mongo entity, but
filesystem state) answer the three maintenance questions:

- **`project delete`** deletes exactly the **project-scoped** Home. Under
  `tenant`/`user`, the Home is shared and remains — the handler reports this
  as `deleteNote` instead of counting it as deleted.
- **`user delete`** deletes `_user_<login>` (OWNED: it exists because of the
  account).
- **`rename`** (Project and User) moves the Home: the Scope Key follows
  the name. If the target already exists, `renameBlocker` blocks instead
  of silently merging.
- **Path segment hardening:** Tenant and Scope Key are checked against `/`, `\`,
  NUL, `.` and `..` before becoming path segments — the
  rule that makes a naming convention path-safe.

## 6. Decisions and Pitfalls

- **Why Setting instead of Property:** sharing granularity is a
  decision of the project operator, not the deployment — and the
  Scope Cascade allows a Tenant default with a Project exception.
- **Why Sibling instead of in the Workspace:** a Home contains caches and
  credential material; it must not appear in any Workspace list, export,
  or sync. A tree outside makes this a structural rather than a filtering
  discipline.
- **Why Budget instead of Prohibition:** the agent needs caches (maven, npm,
  pip); a prohibition would secretly drive them into the Pod FS. Budget + clear
  error guides instead of blocking.
- **Pitfall `home-scope` change:** a Home created under `project`
  does not disappear when switching to `tenant` — it remains as an
  unused directory and is only cleaned up via maintenance.
  Known, accepted (maintenance continues to count it as a project-scoped
  Home).
- **Size check is coarse by design:** between two checks, a job
  can write more than the budget. The floor is the Pod quota, the budget
  is the *visible* limit — not the ultimate one.
