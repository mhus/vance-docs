---
title: "Vance — Anus Setup Wizard"
parent: Specs
permalink: /specs/anus-setup-wizard
---

<!-- AUTO-GENERATED from specification/public/en/anus-setup-wizard.md — do not edit here. -->

---
# Vance — Anus Setup Wizard

> Interactive bootstrap mode of the Anus Admin Shell for **initial provisioning of a fresh Vance deployment**: creates Tenant + User, configures AI Provider (API Key, Model, Aliases, Embeddings) and optionally the complete Research Endpoint Cascade (Serper + keyless providers). Call: `anus --setup`. One-shot mode like [`--sudo`](#) — the process terminates after Save or Quit.
> See also: java-cli-module-structure | [llm-resource-management](/specs/llm-resource-management) | [settings-system](/specs/settings-system)

---

## 1. Purpose

Production bootstrap of a Vance stack without `init-settings.yaml` secret knowledge and without Acme demo data. Specific use case: Start Docker-Compose stack (Brain runs with `vance.bootstrap.acme=false`), then **once** start an Anus one-shot container with `--setup` — the operator clicks through tenant + user + provider + serper, writes everything, and the container exits.

**Distinction from existing paths:**

| Path | When | What |
|---|---|---|
| `BootstrapBrainService` (Brain) | every Brain boot | Idempotent Acme demo Tenant (`vance.bootstrap.acme=true`, Default), for local development |
| `InitSettingsLoader` (Brain) | every Brain boot | Reads `confidential/init-settings.yaml` and writes Provider Keys / Aliases / Research to existing Tenants |
| `anus --sudo "<cmd>"` | unattended Ops script | Execute individual shell commands (`tenant list`, `user create …`) headlessly |
| `anus --setup` | **First-Boot Production** | Guided wizard, writes Tenant + User + Provider + Research in one flow |

The wizard **does not replace** the `init-settings.yaml` path — both serve the same settings store. The wizard is only the human-driven initial setup path; `init-settings.yaml` remains for replays after Mongo wipe and for automated deployments.

---

## 2. Invocation & Argv Handling

```
anus --setup
```

Argv parsing happens in `VanceAnusApplication.main` **before** Spring Boot — otherwise, Spring Shell's `NonInteractiveShellRunner` would interpret `--setup` as a shell command and fail. Order:

1. `SudoBootstrap.parse(args)` — strips `--sudo`/`--sudo=` pairs (see `--sudo` path).
2. `SetupBootstrap.parse(remaining)` — strips `--setup` flags, sets `setupMode = true`.
3. Remaining Argv goes to Spring Boot.

`SetupBootstrap` is a static holder analogous to `SudoBootstrap` — acceptable because Anus is single-process (one JVM, one boot, then exit).

**Combination with `--sudo`:** `--sudo` wins. The `SudoShellRunner` has `HIGHEST_PRECEDENCE`, the `SetupShellRunner` `HIGHEST_PRECEDENCE + 1`. Specifying both simultaneously is an odd combination, but deterministically resolved — sudo commands run, Setup is skipped.

**Banner:** both one-shot modes disable the ASCII banner via `Banner.Mode.OFF` to keep wizard prompts and sudo output clean.

---

## 3. Lifecycle

```
main()
  ├─ SudoBootstrap.parse()
  ├─ SetupBootstrap.parse()        ← sets setupMode
  └─ SpringApplication.run()
        └─ SetupShellRunner (Order HIGHEST_PRECEDENCE+1)
              ├─ canRun() ⇒ SetupBootstrap.isSetupMode()
              ├─ AccessService.armForSudo()      ← same audit marking as --sudo
              ├─ shellContext.NONINTERACTIVE     ← suppresses JLine prompt
              ├─ SetupWizard.run()               ← stdout/stdin
              └─ AccessService.logout()          ← finally
        └─ ApplicationContext.close()
  └─ System.exit(0)
```

**Auth:** the wizard runs in the same "stacked" mode as `--sudo` — no password gate. Rationale: whoever starts Anus controls the deployment (local binary or Docker one-shot with the same volume access as Brain). An additional credential gate here would be security theater. Audit entry: `anus.sudo.arm` (same as sudo) — distinction via log line `Anus --setup: starting interactive setup wizard`.

---

## 4. Flow

### 4.1 Overview First

Immediately upon startup, the wizard outputs the **complete Tenant + User structure** (System Tenant `_vance` hidden, Service Accounts shown under Users in the Tenant listing for completeness, but filtered during later User selection).

```
Vance Setup
===========

Existing tenants:
  >> [1] Tenant: acme - Acme (gemini)
     - User: marvin.acme - Marvin Acme - marvin@acme.de
     - User: wile.coyote - Wile E. Coyote - wile@acme.de
```

The value in parentheses after the Tenant title is `ai.default.provider` (Setting). If empty: `—`. **Purpose:** the operator immediately sees if Acme is accidentally still active (`vance.bootstrap.acme=true`) and can exit with `q`.

### 4.2 Tenant Selection

```
Select tenant [1-N], c) Create new, q) Quit: _
```

- Number → Selection, loads `tenantTitle` + Provider defaults from settings.
- `c` → Sub-Wizard: Tenant Name (lowercase, `_vance` reserved), Tenant Title. `tenantCreated = true`.
- `q` → exit without writing.

If there are no Tenants, the wizard jumps directly into the Create path — the selection question is omitted.

### 4.3 User Selection

```
Users in tenant 'acme':
  >> [1] marvin.acme - Marvin Acme - marvin@acme.de
  >> [2] wile.coyote - Wile E. Coyote - wile@acme.de
Select user [1-N], c) Create new, q) Quit: _
```

Service Accounts (name starts with `_`) are filtered. If there are no regular Users: direct Create sub-wizard. For Create: Login Name, Title (Default = Login), Email (optional), Password (mandatory, confirmation, masked input).

### 4.4 Setup Menu

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
- **Tenant Name (1)** and **User Name (3)** are immutable — to change them, restart the wizard.
- **Tenant Title (2)** is editable; for an existing Tenant with a changed title, Save calls `tenantService.update`.
- **User Title (4)** / **User Email (5)** set `userFieldsChanged = true` for existing Users, so Save calls `userService.update(...)`.
- **AI Provider (6)** opens sub-selection. On change, `aiModel` is reset to the Provider default **and** `aiApiKey` / `embeddingApiKey` are cleared — the existing key does not match the new Provider.
- **AI Model (7)** is free input (operator's responsibility to know which models the Provider has).
- **AI API Key (8)** / **Embedding Key (9)** / **Serper Key (10)** are masked input. Leaving blank means:
  - for **new Tenant**: `(not set)` — Save validates: no Save without a chat key.
  - for **existing Tenant**: `(keep existing)` — Save does not overwrite, because PASSWORD settings are never decrypted for display (security decision: too much exposure for too little convenience).
- **`s` Save** → Validation + Save (see §5).
- **`q` Quit** → exit without writing, with message `Setup cancelled. No changes written.`.

### 4.5 Provider Preset

Supported in v1: **Gemini**, **OpenAI**, **Anthropic**. Each preset bundles:

| Preset | settingsId | Default Model | Embedding Provider |
|---|---|---|---|
| Gemini | `gemini` | `gemini-2.5-flash` | gemini (self, reused chat key) |
| OpenAI | `openai` | `gpt-4o` | openai (self, reused chat key) |
| Anthropic | `anthropic` | `claude-sonnet-4-5` | `embedded` (in-process E5, keyless) |

**Deliberately excluded:** Ollama (needs `baseUrl`, not in preset schema), Cortecs, MLX local server — these continue to run via `init-settings.yaml` templates under `confidential/init-settings-*.yaml`.

---

## 5. Save Logic

After `s) Save`, the wizard writes strictly sequentially:

1. **Tenant.** If `tenantCreated` → `tenantService.ensure(name, title)` (incl. JWT key provisioning). Otherwise, if title changed → `tenantService.update`.
2. **`_tenant` Project.** Always `homeBootstrapService.ensureTenantProject(tenantId)`. Background: for Tenants other than `acme`, Brain only lazily creates `_tenant` on first login (`AccessController`). Since the wizard then writes settings under `SCOPE_PROJECT` + `_tenant`, the project must exist.
3. **User.** If `userCreated` → `passwordService.hash` + `userService.create`. Otherwise, if `userFieldsChanged` → `userService.update(title, email, …)`.
4. **AI Provider Settings.** Written under `SCOPE_PROJECT` / `_tenant`:
   - `ai.default.provider` = `<preset.settingsId>`
   - `ai.default.model` = `<aiModel>`
   - `ai.alias.default.{fast,analyze,deep,web,code}` = `<provider>:<model>` (all 5 point to the same model in v1 — operator can split later via setting form)
   - `ai.provider.<provider>.apiKey` = encrypted (only if key was set)
   - `ai.embedding.provider` = `<preset.settingsId>` (if `supportsEmbedding`) or `embedded`
   - `ai.embedding.apiKey` = encrypted (`embeddingApiKey` if set, otherwise `aiApiKey` as reuse)
5. **Research Bundle.** Only if `serperKey` was set. Writes the complete block from `init-settings.yaml`:
   - `research.endpoint.serper-main.{protocol,baseUrl,apiKey,enabled}` + `research.default.web=serper-main`
   - keyless Providers with `enabled=true` as default/fallback endpoints:
     - `wiki-de` (wikipedia) → `research.fallback.web` + `research.default.encyclopedia`
     - `hn-algolia` (hackernews) → `research.default.news`
     - `openlib` (openlibrary) → `research.default.book`
     - `openalex` (openalex) → `research.default.academic`
     - `arxiv` (arxiv) → `research.fallback.academic`

**Idempotence.** Re-running with the same inputs overwrites with identical values — `settingService.set(...)` is an upsert. Existing Tenants/Users are not "created" again (wizard remembers `created` flag per selection path).

**Audit.** Every settings write goes through the normal `AuditService.settingsUpdate`/`settingsPasswordRead` hooks of `SettingService` — no separate setup event.

---

## 6. Security & Write Discipline

- **API keys are never read back from settings.** The wizard shows `(keep existing)` for existing keys and only overwrites on explicit input. Rationale: a decrypt-and-redisplay (even masked by length) would trigger the plaintext path more often than necessary — and the wizard typically runs interactively on a terminal that has history scroll and screenshare.
- **Password input** (User password, all API keys, Serper) goes through `LineReader.readLine(prompt, '*')` — JLine echoes `*` per character, the plaintext never goes into the terminal history.
- **Reserved Names.** Tenant name `_vance` and User names with `_` prefix are explicitly rejected in the Create path — System Tenant and Service Accounts have their own, non-interactive provisioning paths.

---

## 7. What the Wizard DOES NOT Do

- **No multi-Tenant provisioning in one run.** Exactly one Tenant + one User per wizard run. To provision multiple Tenants, run the wizard multiple times.
- **No complete Settings UI.** The wizard only writes the Provider default + Research Bundle. Per-User settings, Recipes, OAuth Providers, Memory Hints, Quotas — these belong in the Web UI / Setting Forms.
- **No multi-Provider combinations.** Exactly one Chat Provider + its Embedding path. Mixed setups (Gemini Chat + OpenAI Embedding) are done via the Web UI after the initial setup.
- **No Project Create.** Tenant + `_tenant` are sufficient for boot. Regular Projects are created by the User via the Web UI afterwards, Catalog Kits via [Project Kits Catalog](/specs/project-kits-catalog).
- **No update of existing API keys via value comparison.** If the operator types nothing, nothing changes. If they type something, it is re-encrypted and saved — even if the plaintext is coincidentally identical to the existing one (wizard cannot check this, see §6).
- **No OAuth Provider setup.** OAuth configuration (Provider document in the `_tenant` project + Client Secret) remains manual — the wizard is built for API key-based Cloud LLMs, OAuth is a separate code path with its own UI.
- **No Reset.** To undo a setup, use `anus tenant delete <name>` (via `--sudo` or interactively).

---

## 8. Configuration & Operations

**Docker One-Shot Pattern (target application):**

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

**Logging:** `anus.sudo.arm` Audit Row on start, per-settings update via `AuditService.settingsUpdate`. Stdout shows a save summary (`+ tenant created`, `~ AI defaults written (Gemini / gemini-2.5-flash)`, `+ Serper key written, research stack enabled`).

---

## 9. Status

| Component | Status |
|---|---|
| `SetupBootstrap` (Argv Stripper) | implemented |
| `SetupShellRunner` (Spring Shell Order) | implemented |
| `SetupWizard` (Listing + Selection + Menu + Save) | implemented |
| `ProviderPreset` (Gemini / OpenAI / Anthropic) | implemented |
| Research Bundle with Serper Key | implemented |
| `SetupBootstrapTest` (Parser) | implemented |
| Wizard Integration Tests (Service Wirings) | open, on demand |
| Ollama / Cortecs / local Provider Presets | deliberately excluded — `init-settings-*.yaml` remains the path |
| OAuth Provider step in Wizard | open, separate UI |
