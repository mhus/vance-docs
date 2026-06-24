---
title: "Vance — Anus Setup Wizard"
parent: Documentation
permalink: /specs/anus-setup-wizard
---

<!-- AUTO-GENERATED from specification/public/en/anus-setup-wizard.md — do not edit here. -->

# Vance — Anus Setup Wizard

> Interactive bootstrap mode of the Anus admin shell for **first-time
> provisioning of a fresh Vance deployment**: creates tenant + user,
> configures the AI provider (API key, model, aliases, embeddings) and
> optionally the full research-endpoint cascade (Serper + keyless
> providers). Invocation: `anus --setup`. One-shot mode like
> [`--sudo`](#) — the process exits after Save or Quit.
> See also: java-cli-modulstruktur | llm-resource-management | settings-system

---

## 1. Purpose

Production bootstrap of a Vance stack without secret `init-settings.yaml`
knowledge and without Acme demo data. Concrete use case: start the
Docker Compose stack (Brain runs with `vance.bootstrap.acme=false`),
then **once** launch an Anus one-shot container with `--setup` — the
operator clicks through tenant + user + provider + Serper, everything
is written, and the container exits.

**Delineation from existing paths:**

| Path | When | What |
|---|---|---|
| `BootstrapBrainService` (Brain) | every Brain boot | Idempotent Acme demo tenant (`vance.bootstrap.acme=true`, default), for local development |
| `InitSettingsLoader` (Brain) | every Brain boot | Reads `confidential/init-settings.yaml` and writes provider keys / aliases / research onto existing tenants |
| `anus --sudo "<cmd>"` | unattended ops scripting | Run single shell commands (`tenant list`, `user create …`) headlessly |
| `anus --setup` | **first-boot production** | Guided wizard, writes tenant + user + provider + research in one flow |

The wizard does **not** replace the `init-settings.yaml` path — both
target the same settings store. The wizard is purely the
human-driven first-setup path; `init-settings.yaml` remains for
replays after a Mongo wipe and for automated deployments.

---

## 2. Invocation & argv handling

```
anus --setup
```

Argv parsing happens in `VanceAnusApplication.main` **before** Spring
Boot — otherwise Spring Shell's `NonInteractiveShellRunner` would
interpret `--setup` as a shell command and fail. Order:

1. `SudoBootstrap.parse(args)` — strips `--sudo` / `--sudo=` pairs (see
   the `--sudo` path).
2. `SetupBootstrap.parse(remaining)` — strips `--setup` flags, sets
   `setupMode = true`.
3. Remaining argv goes to Spring Boot.

`SetupBootstrap` is a static holder analogous to `SudoBootstrap` —
acceptable because Anus is single-process (one JVM, one boot, then
exit).

**Combination with `--sudo`:** `--sudo` wins. The `SudoShellRunner`
has `HIGHEST_PRECEDENCE`, the `SetupShellRunner` has
`HIGHEST_PRECEDENCE + 1`. Passing both at once is a strange combo, but
resolves deterministically — sudo commands run, setup is skipped.

**Banner:** both one-shot modes switch the ASCII banner off via
`Banner.Mode.OFF` so wizard prompts and sudo output stay clean.

---

## 3. Lifecycle

```
main()
  ├─ SudoBootstrap.parse()
  ├─ SetupBootstrap.parse()        ← sets setupMode
  └─ SpringApplication.run()
        └─ SetupShellRunner (Order HIGHEST_PRECEDENCE+1)
              ├─ canRun() ⇒ SetupBootstrap.isSetupMode()
              ├─ AccessService.armForSudo()      ← same audit marker as --sudo
              ├─ shellContext.NONINTERACTIVE     ← suppresses the JLine prompt
              ├─ SetupWizard.run()               ← stdout/stdin
              └─ AccessService.logout()          ← finally
        └─ ApplicationContext.close()
  └─ System.exit(0)
```

**Auth:** the wizard runs in the same "stacked" mode as `--sudo` — no
password gate. Rationale: whoever can launch Anus controls the
deployment (local binary, or Docker one-shot with the same volume
access as the Brain). An additional credential gate here would be
security theater. Audit entry: `anus.sudo.arm` (same as sudo) —
distinguished by the log line `Anus --setup: starting interactive setup
wizard`.

---

## 4. Flow

### 4.1 Overview first

Immediately on start the wizard prints the **complete tenant + user
structure** (system tenant `_vance` hidden, service accounts shown
under their tenant for completeness in the tenant listing, but filtered
out of the later user selection).

```
Vance Setup
===========

Existing tenants:
  >> [1] Tenant: acme - Acme (gemini)
     - User: marvin.acme - Marvin Acme - marvin@acme.de
     - User: wile.coyote - Wile E. Coyote - wile@acme.de
```

The value in parentheses after the tenant title is `ai.default.provider`
(setting). Empty: `—`. **Purpose:** the operator sees immediately
whether Acme is still active accidentally (`vance.bootstrap.acme=true`)
and can exit with `q`.

### 4.2 Tenant selection

```
Select tenant [1-N], c) Create new, q) Quit: _
```

- Number → selection, loads `tenantTitle` + provider defaults from
  settings.
- `c` → sub-wizard: tenant name (lowercase, `_vance` reserved), tenant
  title. `tenantCreated = true`.
- `q` → exit without writing.

If there are zero tenants the wizard jumps straight into the create
path — the selection question is skipped.

### 4.3 User selection

```
Users in tenant 'acme':
  >> [1] marvin.acme - Marvin Acme - marvin@acme.de
  >> [2] wile.coyote - Wile E. Coyote - wile@acme.de
Select user [1-N], c) Create new, q) Quit: _
```

Service accounts (name starts with `_`) are filtered out. Zero regular
users → direct create sub-wizard. On create: login name, title (default
= login), email (optional), password (required, with confirmation,
masked input).

### 4.4 Setup menu

```
Setup
-----
  1) Tenant:               acme  (new)
  2) Tenant title:         Acme
  3) Username:             wile.coyote  (new)
  4) User title:           Wile E. Coyote
  5) User email:           wile@acme.de
  6) AI provider:          Gemini
  7) AI model:             gemini-2.5-flash
  8) AI API key:           (not set)
  9) Embedding API key:    (keep existing)  (reuses chat key if blank)
 10) Serper key (research): (not set)

Edit [1-10], s) Save, q) Quit: _
```

Edit rules:
- **Tenant name (1)** and **user name (3)** are immutable — to change
  them, restart the wizard.
- **Tenant title (2)** is editable; if the tenant exists and the title
  changed, Save calls `tenantService.update`.
- **User title (4)** / **user email (5)** set `userFieldsChanged =
  true` for existing users, so Save calls `userService.update(...)`.
- **AI provider (6)** opens a sub-selection. On change, `aiModel` is
  reset to the provider default **and** `aiApiKey` / `embeddingApiKey`
  are cleared — the existing key doesn't fit the new provider.
- **AI model (7)** is free-text input (operator is expected to know
  which models the provider offers).
- **AI API key (8)** / **embedding key (9)** / **Serper key (10)** are
  masked input. Leaving blank means:
  - on a **new tenant**: `(not set)` — Save validates: no chat key,
    no save.
  - on an **existing tenant**: `(keep existing)` — Save does not
    overwrite, because PASSWORD settings are never decrypted for
    display (security decision: too much exposure for too little
    convenience).
- **`s` Save** → validation + save (see §5).
- **`q` Quit** → exit without writing, with the message
  `Setup cancelled. No changes written.`.

### 4.5 Provider presets

v1 supports: **Gemini**, **OpenAI**, **Anthropic**. Each preset
bundles:

| Preset | settingsId | Default model | Embedding provider |
|---|---|---|---|
| Gemini | `gemini` | `gemini-2.5-flash` | gemini (itself, reuses chat key) |
| OpenAI | `openai` | `gpt-4o` | openai (itself, reuses chat key) |
| Anthropic | `anthropic` | `claude-sonnet-4-5` | `embedded` (in-process E5, keyless) |

**Deliberately out of scope:** Ollama (needs `baseUrl`, doesn't fit the
preset schema), Cortecs, MLX local server — these continue to flow
through `init-settings.yaml` templates under
`confidential/init-settings-*.yaml`.

---

## 5. Save logic

After `s) Save` the wizard writes strictly sequentially:

1. **Tenant.** On `tenantCreated` → `tenantService.ensure(name, title)`
   (incl. JWT key provisioning). Otherwise, if the title changed →
   `tenantService.update`.
2. **`_tenant` project.** Always
   `homeBootstrapService.ensureTenantProject(tenantId)`. Background:
   for tenants other than `acme`, the Brain otherwise creates `_tenant`
   only lazily on first login (`AccessController`). Since the wizard
   then writes settings under `SCOPE_PROJECT` + `_tenant`, the project
   must exist.
3. **User.** On `userCreated` → `passwordService.hash` +
   `userService.create`. Otherwise, on `userFieldsChanged` →
   `userService.update(title, email, …)`.
4. **AI provider settings.** Written under `SCOPE_PROJECT` / `_tenant`:
   - `ai.default.provider` = `<preset.settingsId>`
   - `ai.default.model` = `<aiModel>`
   - `ai.alias.default.{fast,analyze,deep,web,code}` =
     `<provider>:<model>` (all five point to the same model in v1 —
     operator can split them later via the setting form)
   - `ai.provider.<provider>.apiKey` = encrypted (only if a key was
     entered)
   - `ai.embedding.provider` = `<preset.settingsId>` (if
     `supportsEmbedding`) or `embedded`
   - `ai.embedding.apiKey` = encrypted (`embeddingApiKey` if set,
     otherwise `aiApiKey` as reuse)
5. **Research bundle.** Only if `serperKey` was set. Writes the full
   block from `init-settings.yaml`:
   - `research.endpoint.serper-main.{protocol,baseUrl,apiKey,enabled}`
     + `research.default.web=serper-main`
   - keyless providers with `enabled=true` as default/fallback
     endpoints:
     - `wiki-de` (wikipedia) → `research.fallback.web` +
       `research.default.encyclopedia`
     - `hn-algolia` (hackernews) → `research.default.news`
     - `openlib` (openlibrary) → `research.default.book`
     - `openalex` (openalex) → `research.default.academic`
     - `arxiv` (arxiv) → `research.fallback.academic`

**Idempotency.** Re-running with the same inputs overwrites with
identical values — `settingService.set(...)` is upsert. Existing
tenants/users are not "created" again (the wizard tracks a `created`
flag per selection path).

**Audit.** Every settings write goes through the normal
`AuditService.settingsUpdate` / `settingsPasswordRead` hooks of
`SettingService` — no separate setup event.

---

## 6. Security & write discipline

- **API keys are never read back from settings.** The wizard shows
  `(keep existing)` for existing keys and only overwrites on explicit
  input. Rationale: a decrypt-and-redisplay (even masked by length)
  would trigger the plaintext path more often than necessary — and the
  wizard typically runs interactively on a terminal that has history
  scroll and screen sharing.
- **Password input** (user password, all API keys, Serper) goes
  through `LineReader.readLine(prompt, '*')` — JLine echoes `*` per
  character, the plaintext never lands in terminal history.
- **Reserved names.** Tenant name `_vance` and user names with a `_`
  prefix are explicitly rejected in the create path — the system
  tenant and service accounts have their own non-interactive
  provisioning paths.

---

## 7. What the wizard does NOT do

- **No multi-tenant provisioning in one run.** Exactly one tenant +
  one user per wizard run. Multiple tenants → launch the wizard
  multiple times.
- **No full settings UI.** The wizard only writes the provider default
  + research bundle. Per-user settings, recipes, OAuth providers,
  memory hints, quotas — those belong in the Web UI / setting forms.
- **No multi-provider combinations.** Exactly one chat provider plus
  its embedding path. Mixed setups (Gemini chat + OpenAI embeddings)
  go through the Web UI after the first setup.
- **No project create.** Tenant + `_tenant` is enough for boot. Regular
  projects are created later by the user through the Web UI, catalog
  kits via project-kits-catalog.
- **No update of existing API keys via value comparison.** If the
  operator types nothing, nothing changes. If they type something, it
  is re-encrypted and saved — even if the plaintext happens to match
  the existing one (the wizard cannot tell, see §6).
- **No OAuth provider setup.** OAuth configuration (provider document
  in the `_tenant` project + client secret) stays manual — the wizard
  is built for API-key based cloud LLMs, OAuth is a separate code path
  with its own UI.
- **No reset.** To roll back a setup, use `anus tenant delete <name>`
  (via `--sudo` or interactive).

---

## 8. Configuration & operations

**Docker one-shot pattern (the target use case):**

```bash
# Brain runs with vance.bootstrap.acme=false in compose
docker compose up -d brain mongo

# Setup container (same image as Brain, different entrypoint args)
docker run --rm -it \
  --network <compose-net> \
  -e SPRING_DATA_MONGODB_URI=... \
  <vance-image> anus --setup
```

**Local without Docker:**

```bash
cd vance/vance-anus
java -jar target/vance-anus.jar --setup
```

**Logging:** `anus.sudo.arm` audit row at start; per-settings update
via `AuditService.settingsUpdate`. Stdout shows a save summary
(`+ tenant created`, `~ AI defaults written (Gemini / gemini-2.5-flash)`,
`+ Serper key written, research stack enabled`).

---

## 9. Status

| Component | State |
|---|---|
| `SetupBootstrap` (argv stripper) | implemented |
| `SetupShellRunner` (Spring Shell order) | implemented |
| `SetupWizard` (listing + selection + menu + save) | implemented |
| `ProviderPreset` (Gemini / OpenAI / Anthropic) | implemented |
| Research bundle on Serper key | implemented |
| `SetupBootstrapTest` (parser) | implemented |
| Wizard integration tests (service wirings) | open, on demand |
| Ollama / Cortecs / local provider presets | deliberately out — `init-settings-*.yaml` remains the path |
| OAuth provider step in the wizard | open, separate UI |
