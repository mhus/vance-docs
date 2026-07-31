# Permission System — Authorization via Pluggable Providers

> Vancetope authorizes every access via a narrow, abstract interface
> (`PermissionService.enforce(SecurityContext, Resource, Action)`). The
> **decision logic** resides behind a pluggable `PermissionResolver`-SPI,
> provided by a **Provider Addon** — either the included **Simple-Auth**
> (role-based, Grants in MongoDB) or a commercial **Governor** (rights from an
> external system). Exactly **one** provider is mandatory: otherwise, the Brain
> (and the anus-Context) will not boot. Simple-Auth is the only included
> provider — there is intentionally no separate "Allow-All" provider; an open
> installation simply grants broad permissions.
>
> **Guiding Principle:** minimal, not enterprise. Roles (READER/WRITER/ADMIN)
> on two Scopes (TENANT, PROJECT); everything deeper (Session/Process/Document/Inbox)
> **inherits** from the Project or is handled by a few code rules. No per-object ACLs.
>
> Status: Interface + "exactly one provider"-guard + all enforcement points +
> `$meta.privileged`-runAs-gate + `InboxAuthz` built; the Simple-Auth modules
> `vance-addon-shared-simpleauth` (Resolver R2–R7 + Grant-Storage + Bootstrap +
> Migration) and `vance-addon-brain-simpleauth` (Admin-REST + LLM-Tools + Web-UI-
> Area) built and tested; the federated Grant management UI + the generic
> `addon.html`-host + the dynamic landing tiles in `vance-face` are
> live (pnpm-Build green). The landing tile metadata comes from **one** source
> (Addon Manifest `META-INF/vance-addon.yaml` `tile:`) and appears in
> `/face/addons` in both Dev (vite-Middleware) and **Prod**
> (`AddonManifestRegistry` → `AddonDto.tile`). `vance-addon-anus-simpleauth`
> (Grant-CRUD-Shell-Commands + Setup-Wizard-Admin-Seed) built. Implementation plan/
> history: [`planning/permission-system-concept.md`](../../planning/permission-system-concept.md).

## 1. Architecture: Interface ⇥ Implementation

Three strictly separated layers:

| Layer | Knows | Task |
|-------|-------|------|
| **Enforcement Point** (Controller, WS-Handler, Tools, Loader) | only `Action` + own data | queries `enforce(ctx, Resource, Action)` — "is the subject allowed to do this?" |
| **Grant Admin Surface** (UI/Tools/anus — Simple-Auth only) | `GrantRole` | assigns roles |
| **Provider / Resolver** (Addon) | maps `Action` → internal (Role *or* Governor logic) | answers |

**Strict Rule:** No enforcement point ever reasons about roles or grants — no
`if (user.isAdmin())` at a call site. Roles are the model *of the
default provider*, not of the interface. This keeps the provider pluggable
without touching a single enforcement point.

**Core Types** (`vance-shared/.../permission/`):
- `PermissionResolver` — SPI `boolean isAllowed(SecurityContext, Resource, Action)`. Never throws; returns `false` for missing data (fail-closed). Evaluates **user policy exclusively** — `WriteReason` is **not** part of the SPI (see R1 / §5a).
- `PermissionService` — `check(...)`/`enforce(...)` (throws `PermissionDeniedException` → REST 403, WS-Error-Frame). First enforces the **framework trust boundary** (SYSTEM-Subject **or** `WriteReason.SYSTEM` → allowed, without asking the provider), then delegates actual user writes to the single resolver. This prevents any provider from breaking internal plumbing and eliminates the need for any provider to replicate SYSTEM trust.
- `Resource` (sealed) — `Tenant`, `Project`, `Document`, `Setting`, `Session`, `ThinkProcess`, `Team`, `User`, `InboxItem`. Records carry the `name`-foreign keys of their parents, never Mongo-`id`.
- `Action` — `READ, WRITE, CREATE, DELETE, START, EXECUTE, ADMIN, IMPERSONATE`.
- `SecurityContext` — `record(subjectType, subjectId, tenantId, teams[])`. `SYSTEM`-singleton for internal callers.

## 2. Providers are Mandatory — and Live in Addons

`PermissionService` injects **exactly one** `PermissionResolver`. 0 or >1 →
**Boot-Fail** with a clear message (no silent default, no ambiguous
selection). Since `PermissionService` is in `vance-shared`, the guard applies in
every context that scans shared — Brain **and** anus.

A provider addon registers classpath-based via
`@AutoConfiguration` + `META-INF/spring/...AutoConfiguration.imports` — JAR on
classpath ⇒ provider active, JAR removed ⇒ gone. Two providers:

- **Simple-Auth** — the included role-based implementation, intentionally
  divided **into three `vance-addon-*-simpleauth` modules** along the layer
  naming convention (clear separation instead of one module with context
  conditionals):
  - **`vance-addon-shared-simpleauth`** (Spring-Library, `vance-shared` only) — Mongo-Entity `PermissionGrantDocument` + Repository + `PermissionGrantService`, `MongoPermissionResolver` (R2–R7; R1-SYSTEM-Trust is in the framework's `PermissionService`), `PermissionBootstrap`-Impl, Migration, `@AutoConfiguration`. Context-neutral, loads into **both** hosts (Brain + anus) because both persist + check grants. Package `de.mhus.vance.simpleauth`. **No Client** → does not follow the `vance-addon-brain-*`-federation convention.
  - **`vance-addon-brain-simpleauth`** (+ `vance-brain`, with `client/`-federation) — Admin-REST under `/brain/{tenant}/admin/permission-grants`, LLM-Grant-Tools (`permission_grant_set`/`_list`/`_remove`), Web-UI-Area. Only in Brain. Package `de.mhus.vance.simpleauth.brain`.
  - **`vance-addon-anus-simpleauth`** (+ spring-shell) — Grant-CRUD-Commands. Only in the anus-Context.
- **EE-Governor** (commercial) — its own `PermissionResolver`, fetches rights externally; does not implement the Vancetope Grant surfaces.

There is **no** shipped "Allow-All" provider — Simple-Auth is the only included
production provider. Dev/IDE-Bundles (`vance-brain-all1/all2`) load Simple-Auth;
the Acme bootstrap seeds `marvin.acme` as TENANT-ADMIN, so that real role-based
enforcement is also active in Dev. A deliberately open installation grants broad
permissions (e.g., a Team-WRITER grant tenant-wide).

**Test Exception:** `qa/ai-test` boots a bare `VanceBrainApplication` without a
provider addon on the classpath and would fail at the guard. The E2E tests check
AI flows, not authorization — therefore, an `@AutoConfiguration` **only on the
test classpath** (`AitestAllowAllPermissionConfig` + Test-`AutoConfiguration.imports`)
registers a permissive `PermissionResolver` that satisfies the guard with exactly
one provider, without enforcing. Purely test-scoped — Prod/Dev remain Simple-Auth.

The `vance-addon-shared-simpleauth` core only depends on `vance-shared`
(`MongoPermissionResolver` only needs `PermissionGrantService`/`TeamService`),
so it loads identically in Brain and anus; the Brain and anus surfaces live in
their own modules with their own dependencies. The package root
`de.mhus.vance.simpleauth` is intentionally outside the component scan bases of
the Brain (`de.mhus.vance.brain`/`.shared`), so that beans are registered
exclusively via `@AutoConfiguration` and not duplicated.

## 3. Subject & Membership Model

- **USER** — authenticated human (JWT). `subjectId = UserDocument.name`.
- **TEAM** — not a separate SubjectType, but an aggregation: Grants can be
  attached to a Team; team membership travels with `SecurityContext.teams()`
  and is combined with user grants in the Resolver (max role wins). Teams are
  **organizational** — the Team↔Project association (`ProjectDocument.teamIds`)
  states "which team works on the project" and controls Inbox routing, but is
  **not** the authorization source.
- **SYSTEM** — internal callers (Scheduler, Lifecycle-Listener, Engine-System-Writes,
  Migrations). `SecurityContext.SYSTEM`, always allowed.

## 4. Roles, Grants & Cascade (Default Provider)

Roles are totally ordered — `READER < WRITER < ADMIN` — and map to Actions:

```
READ                                    → READER
WRITE, CREATE, DELETE, START, EXECUTE   → WRITER
ADMIN, IMPERSONATE                      → ADMIN
```

Grants live in a separate collection `permission_grants` (in the Simple-Auth-Addon,
not in `ProjectDocument`), key `(tenantId, scopeType, scopeId, subjectType,
subjectId)` → exactly one role grant per subject/scope. Two scopes: `TENANT` and
`PROJECT`. A Tenant-Grant covers every project of the tenant; a Project-Grant only
its own. Intentionally **no** Deny-Grants (only additive, max role wins).

`effectiveRole(subject, tenant, project)` = max over (a) direct User-Grants,
(b) Team-Grants of the subject's teams, (c) Tenant-Grant. Grant lookups are
short-TTL cached per scope (Caffeine, ~30–60 s; Multi-Pod TTL-only, no
cross-pod invalidation).

## 5. Code Rules (R2–R7 in Resolver, R1 in Framework)

- **R1 SYSTEM (Framework Trust Boundary, in `PermissionService` — not in Resolver)** — a write is unconditionally allowed if the `subject` is `SecurityContext.SYSTEM` **or** the `WriteActor` carries server-built `WriteReason.SYSTEM` (covers migrations, bootstrap, lifecycle logs, Slart Recipes, Kit install, scheduler/OAuth controllers). Trust lies in the **character of the write**, which the call site honestly declares (§5a) — it cannot be falsified from user input. This boundary is drawn by `PermissionService` **before** delegation: the provider never sees SYSTEM and only evaluates genuine user policy (R2–R7); `WriteReason` therefore does not reach the resolver. This prevents any new provider from breaking internal plumbing and eliminates the need for any provider to reimplement SYSTEM trust. **Not** a carte blanche for user-driven writes that merely "conveniently" set SYSTEM.
- **R2 Tenant-READ implicit** — every JWT-authenticated user has `Tenant READ` of their own tenant; actual visibility is filtered per-project.
- **R3 Project Inheritance** — Session/ThinkProcess/Setting/Document inherit: `effectiveRole >= minRole(action)`.
- **R4 Reserved-Prefix** — Writes to `_vance/…` are **server-only**: only `WriteReason.SYSTEM` writes, **no** User-Actor — not even **ADMIN**. `_vance` is server-owned system config; admin edits occur via dedicated tools that set SYSTEM (§5a), not via generic user-driven writes. The single `_vance/`-prefix subsumes all config namespaces (recipes `_vance/recipes/`, hooks `_vance/hooks/`, events `_vance/events/`, scheduler `_vance/scheduler/`, model, setting-forms, wizards, templates, manuals, logs …). External `_user_<x>/…`-hubs are covered by R7. **READ** on `_vance/…` remains open (follows the project role or is readable for every tenant member on the `_vance`-project — the cascade resolves here for all). **Enforce-vs-internal:** the WRITE reservation applies at the enforcement points (LLM-Tools/REST/WebDAV/Script-API); internal services write logs/recipes directly via `DocumentService` (no enforce) or as SYSTEM (Framework bypass) and are unaffected.
- **R5 Inbox-Assignee** — an item is accessible if the user is its assignee or shares a team with the assignee. The same semantics are shared by REST and WS via the `InboxAuthz`-helper.
- **R6 Impersonation** — see §6.
- **R7 Podless-Owner** — the user `<login>` implicitly has ADMIN on their `_user_<login>`-hub project; `_tenant` is readable for tenant members and writable by Tenant-ADMIN (Settings cascade); `_vance` is **read-only** for tenant members (WRITE only SYSTEM, see R4) — unlike `_tenant`, **no** ADMIN writes to it via policy.

Tenant boundary is strict: a USER never acts cross-tenant.

## 5a. Write-Actor Contract: *Input* vs. *Policy*

Every `DocumentService`-write takes a `WriteActor` = (`subject`, `reason`).
Authorization itself belongs **exclusively** to the provider (§1, §5) — the call
site does not authorize. But the call site has a non-delegable duty: **to provide
an honest authorization-*input*.** This is not policy, but a fact about the
calling context that only the call site knows.

- **Who acts** (`subject`) + **honest character of the write** (`reason`) → **Call Site**.
- **Is this Subject allowed this Action on this Resource** → **Provider** (Roles/Grants/R2–R7). The SYSTEM-Trust (R1) sits before it in the Framework.

**`reason`-Triage (strict):**

- **`WriteReason.SYSTEM`** only for **genuinely internal plumbing, where the path is code-determined** — Migration, Bootstrap, Lifecycle-Logs (`_vance/logs/…`), Slart-Recipe-Persist, Kit-Install, Scheduler-/OAuth-Controller. The setter knows exactly which file is being written; there is no freely selectable target path. The **Framework** (`PermissionService`) allows this **before** the provider (R1: `SecurityContext.SYSTEM` or the server-built SYSTEM-Reason) — so the provider does not see the SYSTEM-Trust at all. **Only server code can build a SYSTEM-Reason-Actor** — the trust signal cannot be falsified from user input.
- **`WriteReason.USER`** for **every write whose target path originates from the caller** — LLM-Tools, REST, WebDAV, Script-API (`vance.documents.*`), Template-Apply with user-selected target, Addon-Editors. The Actor carries the **actual Subject** (User + Teams, via `SecurityContextFactory.forToolSubject` → `null userId` ⇒ `SecurityContext.SYSTEM` for headless/Scheduler-runs), and the provider applies normal checks (R3/R4 — `_vance/` is server-only, no user write). A script can therefore **not** write to `_vance/` in a user-driven way (not even as Admin) — only a dedicated tool that owns the policy itself and sets SYSTEM writes there.

**Dedicated Authoring of a `_vance/`-Namespace (Pattern):** the `scheduler_set`/`hook_set`/`event_set`-tools and the scheduler-/hook-REST controllers write auto-executing config under `_vance/{scheduler,hooks,events}/`. Since `_vance/` is server-only, a `WriteReason.USER`-write there would fail at the chokepoint **for everyone** (even ADMIN). These surfaces are therefore **dedicated authoring tools that own the policy themselves**: they explicitly `enforce` **Project-ADMIN** and then write `WriteActor.system(subject)` (retaining the actual subject for audit). This is the legitimate form of "SYSTEM-Write" — *not* a convenient bypass, but a separate, stricter authorization before the SYSTEM-Write.

**Anti-Pattern (was the cause of several findings in Review-2):** a user-driven write that passes `WriteActor.SYSTEM` **without its own authorization** because it is "convenient" — this bypasses R4/Lock/`privileged` fail-open. Criterion when writing write-code: *Is the target path code-fixed or caller-controlled?* Caller-controlled ⇒ `USER`, **unless** the surface is a dedicated `_vance/`-authoring tool with its own ADMIN check (then SYSTEM after the check).

**No Pre-Provider-*Policy*-Check.** Reserved-Prefix, roles, etc., are **not** hardcoded at call sites — that would separate policy from the pluggable provider. The call site only provides the honest input; the installed provider decides. The **only** pre-provider check is the SYSTEM-Trust boundary (R1) — and that is intentionally *not* a policy, but the definition of the trust boundary ("the server trusts its own internal actor"), which no provider may override.

**SYSTEM-Trust in the Framework (implemented).** SYSTEM-Trust has been moved from the provider to the framework: `PermissionService` intercepts both SYSTEM-Subject **and** `WriteReason.SYSTEM` before delegation, so the provider **only** sees genuine user writes and internal plumbing can never be broken. `WriteReason` is therefore no longer an SPI concept — the `PermissionResolver`-SPI is purely 3-arg (`subject, resource, action`). **Open (Target Hardening):** an SPI conformance test kit that pins the minimum guarantees of each provider (default-deny, Reserved-Prefix protection, Tenant isolation).

## 6. Privileged Documents & `runAs`

Scheduler, Hook, and Event documents can carry a `runAs: <user>`, so that
the spawned process runs under a different identity — a privilege escalation
**via configuration**. Secured by a persistent document flag:

- `$meta.privileged: true` is seeded to `DocumentDocument.privileged` upon creation (analogous to `$meta.lockedForInitial`).
- **`runAs` is honored for execution only if the persisted source document is `privileged`.** The Ursa-Loaders silently drop a `runAs` from a non-privileged document. (Validation/Preview and bundled/in-code sources retain the raw value — they do not execute anything or are trustworthy.)
- **Who may write such a document** is governed by R4: Scheduler/Hook/Event-YAMLs are under reserved prefixes ⇒ ADMIN. A normal WRITER cannot even create them.

Distinction: code-internal `runAs` in Java (trusted server code) is the
`SecurityContext.SYSTEM`-mechanism (R1) — no check, no flag.

The Action `IMPERSONATE` is the abstract verb for this (Default-Provider maps it
to ADMIN); it is intentionally separate from `ADMIN` so that a Governor
can map impersonation independently.

## 7. Enforcement Points

Inbound layers call `enforce`, services trust their callers. Wired are, among
others: Document-REST (per-Doc READ/WRITE/CREATE), Project-/Tenant-Admin,
Damogran-Compose (`Project WRITE/READ`), Office (`Document WRITE` before
token issuance), Execution (Cross-Project-Scope-Guard in `ExecutionRouter` +
tail/kill), Cross-Project-Spawn (`Project START`), Trillian-Session-Send
(`Session EXECUTE`), Kit-Tools (`Project WRITE/READ` on the target project),
WebDAV (CREATE before Lock-null materialization, per-child-check during recursive
DELETE), Inbox REST+WS (`InboxItem` READ/WRITE, R5), and the central
`ToolDispatcher` (`EXECUTE` on the deepest Scope-Resource, with
team-resolved subject).

The Tool path resolves team memberships via a short-TTL cache
(`ToolDispatcher`), cross-scope tool actions via
`SecurityContextFactory.forToolSubject(...)`.

## 8. Bootstrap & Admin Surfaces

Initial rights come via the shared-SPI **`PermissionBootstrap`**
(`grantTenantAdmin`/`grantProjectAdmin`/`grantProjectTeamWriter`, intent-named,
no role leak). Consumers inject `ObjectProvider<PermissionBootstrap>`
and call `ifAvailable(...)` — present (Simple-Auth loaded) ⇒ seed, absent ⇒
No-op:

- **Project Creator** → PROJECT-ADMIN (`ProjectLifecycleService.create`).
- **Tenant-Bootstrap-Admin** → TENANT-ADMIN (`BootstrapBrainService` / anus-Setup-Wizard).
- **`_user_<login>`-Hub** → Owner rule R7 (no grant needed).

Grant Management (only if Simple-Auth loaded):
- **Web-UI** (production) — a federated Addon-Area (`@vance-addon/simpleauth`, expose `./area` = `PermissionsArea.vue`: list/grant/revoke grants on a TENANT- or PROJECT-Scope), accessed via the generic host `addon.html?addon=simpleauth` in `vance-face` (`AddonHostApp` loads `./area`, presence-gated via `/face/addons`). The landing tile is dynamically rendered from the declarative `tile:` block of the Addon-`META-INF/vance-addon.yaml` (single source, delivered in `/face/addons` by the vite-Middleware in Dev or the `AddonManifestRegistry` in Prod) and appears only if the Addon is loaded **and** `WebUiLevel` is sufficient (admin). Double gate: Addon presence + UI level; the REST additionally enforces ADMIN on the scope.
- **anus** (production) — the Setup-Wizard seeds the provisioned user as TENANT-ADMIN via the shared-SPI (`PermissionBootstrap`, `ifAvailable`; the wizard only creates Admins, all other users later via tooling); `vance-addon-anus-simpleauth` contributes the spring-shell-Commands `permission grant list/set/remove` (Operator-god-mode, cross-tenant, without per-scope-enforce).
- **LLM-Tools** `permission_grant_set`/`_remove`/`_list` (ADMIN-gated).

## 9. Non-Goals

Deliberately excluded: per-document ACLs, field/attribute-level rights, ABAC,
Deny-Grants, custom roles, cross-tenant sharing, grant expiry,
session-/process-granular grants, a generic provider plugin framework for
the UI. The `document-lock` (`lockedFor`) remains orthogonal — soft
edit protection, not authorization.
