# Vancetope — Anus Setup Wizard

> Interactive bootstrap mode of the Anus Admin Shell for **initial provisioning of a fresh Vancetope deployment**: creates Tenant + User, configures AI Provider (API Key, Model, Aliases, Embeddings) and optionally the complete Research Endpoint Cascade (Serper + keyless providers). Call: `anus --setup`. One-shot mode like [`--sudo`](#) — the process terminates after Save or Quit.
> See also: [java-cli-module-structure](../java-cli-modulstruktur.md) | [llm-resource-management](llm-resource-management.md) | [settings-system](settings-system.md)

---

## 1. Purpose

Production bootstrap of a Vancetope stack without `init-settings.yaml` secret knowledge and without Acme demo data. Specific use case: start Docker-Compose stack (Brain runs with `vance.bootstrap.acme=false`), then **once** start an Anus one-shot container with `--setup` — the operator clicks through tenant + user + provider + serper, writes everything, and the container exits.

**Distinction from existing paths:**

| Path | When | What |
|---|---|---|
| `BootstrapBrainService` (Brain) | every Brain boot | Idempotent Acme demo Tenant (`vance.bootstrap.acme=true`, default), for local development |
| `InitSettingsLoader` (Brain) | every Brain boot | Reads `confidential/init-settings.yaml` and writes Provider Keys / Aliases / Research to existing Tenants |
| `anus --sudo "<cmd>"` | unattended Ops script | Execute individual shell commands (`tenant list`, `user create …`) headless |
| `anus --setup` | **First-Boot Production** | Guided wizard, writes Tenant + User + Provider + Research in one flow |

The wizard does **not replace** the `init-settings.yaml` path — both serve the same settings store. The wizard is only the human-driven initial setup path; `init-settings.yaml` remains for replays after Mongo wipe and for automated deployments.

---

## 2. Invocation & Argv Handling

```
anus --setup
```

Argv parsing happens in `VanceAnusApplication.main` **before** Spring Boot — otherwise Spring Shell's `NonInteractiveShellRunner` would interpret `--setup` as a shell command and fail. Order:

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

### 4.1 Overview first

Immediately upon startup, the wizard outputs the **complete Tenant + User structure** (System Tenant `_vance` hidden, Service Accounts under Users shown with Tenant listing for completeness, but filtered during later User selection).

```
Vancetope Setup
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
- `c` → Sub-wizard: Tenant Name (lowercase, `_vance` reserved), Tenant Title. `tenantCreated = true`.
- `q` → exit without writing.

If there are no Tenants, the wizard jumps directly to the Create path — the selection question is omitted.

### 4.3 User Selection

```
Users in tenant 'acme':
  >> [1] marvin.acme - Marvin Acme - marvin@acme.de
  >> [2] wile.coyote - Wile E. Coyote - wile@acme.de
Select user [1-N], c) Create new, q) Quit: _
```

Service Accounts (name starts with `_`) are filtered. If no regular Users: direct Create sub-wizard. For Create: Login Name, Title (Default = Login), Email (optional), Password (mandatory, confirmation, masked input).

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
  8) AI base URL:          (n/a — provider uses its own endpoint)
  9) AI API key:           (not set)
 10) Embedding API key:    (keep existing)  (reuses chat key if blank)
 11) Serper key (research): (not set)

Edit [1-11], s) Save, q) Quit: _
```

With a Gateway, the AI lines look like this — the instance name is **in the line** because it *is* the configuration, not just a label:

```
  6) AI provider:          OpenAI-compatible gateway (own instance)  [cortecs]
  7) AI model:             deepseek-v4-pro
  8) AI base URL:          https://api.cortecs.ai/v1
  9) AI API key:           (not set)
 10) Embedding API key:    (provider has no embeddings — uses in-process model)
```

Edit rules:
- **Tenant Name (1)** and **User Name (3)** are immutable — to change them, restart the wizard.
- **Tenant Title (2)** is editable; for an existing Tenant with a changed title, Save calls `tenantService.update`.
- **User Title (4)** / **User Email (5)** set `userFieldsChanged = true` for existing Users, so Save calls `userService.update(...)`.
- **AI Provider (6)** opens sub-selection. On change, `aiModel` is reset to the Provider default **and** `aiApiKey` / `embeddingApiKey` / `baseUrl` / `instanceName` are cleared — the existing key does not match the new Provider. For the Gateway preset, the instance name is prompted directly (§4.5): without it, the preset cannot write anything, it is part of the selection and not a separate menu item. Re-selecting the same preset prompts for the name again (empty = keep existing) — this is the way to change it later.
- **AI Model (7)** is free input (operator's responsibility to know which models the Provider has).
- **AI Base URL (8)** only accepts the Gateway preset; the others show `(n/a)`.
- **AI API Key (9)** / **Embedding Key (10)** / **Serper Key (11)** are masked input. Leaving blank means:
  - for **new Tenant**: `(not set)` — Save validates: no Save without chat key.
  - for **existing Tenant**: `(keep existing)` — Save does not overwrite, because PASSWORD settings are never decrypted for display (security decision: too much exposure for too little convenience).
- **`s` Save** → Validation + Save (see §5).
- **`q` Quit** → exit without writing, with message `Setup cancelled. No changes written.`.

### 4.5 Provider Preset

Four presets. The first three point to their provider's own API and bring their namespace; the fourth covers any OpenAI-compatible gateway and **lets the operator name the instance**:

| Preset | Instance (`settingsId`) | Default Model | Embedding Provider |
|---|---|---|---|
| Gemini | `gemini` | `gemini-2.5-flash` | gemini (self, reused chat key) |
| OpenAI | `openai` | `gpt-4o` | openai (self, reused chat key) |
| Anthropic | `anthropic` | `claude-sonnet-4-5` | `embedded` (in-process E5, keyless) |
| OpenAI-compatible gateway | **typed by operator** (`cortecs`, `openrouter`, …) | — (mandatory input) | `embedded` (the gateway may not serve embeddings) |

**Why the Gateway names its instance.** Settings are keyed `ai.provider.<instance>.*`. The Gateway preset used to write the fixed instance `openai` — a Cortecs setup would overwrite the real OpenAI key **and** redirect the `openai` instance to the Gateway, in one step, unannounced, and without both ever being configurable side-by-side. This collision was precisely why provider credentials are now stored per instance in their own setting form (see [llm-resource-management](llm-resource-management.md) §3).

The typed name goes through `ProviderPreset.normaliseInstanceName`: trimmed, lowercase, checked against `[a-z0-9._-]+`. The grammar is that of `ModelCatalog` — the name is both a Settings Key Segment **and** a directory name under `_vance/model/`; a name allowed here would result in settings that resolve, and a catalog that cannot. Lowercase instead of rejection, because `Cortecs` would otherwise silently become a second namespace alongside `cortecs`. An unusable name is **prompted again**, not replaced by a default — a silently chosen namespace is precisely the error this prevents.

A name that corresponds to a built-in provider (`openai`, `anthropic`, `gemini`) is **allowed** and not intercepted: an installation that only has a gateway may name it so. The wizard states beforehand what this means. The difference from before is not the possibility, but that someone articulates it.

**Read-Back:** `ai.default.provider` with a value that does not correspond to a fixed preset is read as a Gateway preset **with that name**. Otherwise, a re-run of the wizard on a Tenant with a functioning Gateway would offer to set up AI from scratch, and the first save would leave two instances.

**Deliberately excluded:** Ollama and MLX local servers (keyless, own protocol) — these continue to run via `init-settings.yaml` templates under `confidential/init-settings-*.yaml`.

---

## 5. Save Logic

After `s) Save`, the wizard writes strictly sequentially:

1. **Tenant.** If `tenantCreated` → `tenantService.ensure(name, title)` (incl. JWT key provisioning). Otherwise, if title changed → `tenantService.update`.
2. **`_tenant` Project.** Always `homeBootstrapService.ensureTenantProject(tenantId)`. Background: for Tenants other than `acme`, Brain otherwise only lazily creates `_tenant` on first login (`AccessController`). Since the wizard then writes settings under `SCOPE_PROJECT` + `_tenant`, the project must exist.
3. **User.** If `userCreated` → `passwordService.hash` + `userService.create`. Otherwise, if `userFieldsChanged` → `userService.update(title, email, …)`.
4. **AI Provider Settings.** Written under `SCOPE_PROJECT` / `_tenant`. Each key below is attached to **one** instance — the fixed `settingsId` of the preset or the typed name (`SetupState.effectiveInstance()`, the only place that decides this). Without a resolvable instance, the wizard writes **nothing** and states it:
   - `ai.default.provider` = `<instance>`
   - `ai.default.model` = `<aiModel>`
   - `ai.alias.default.{fast,analyze,deep,web,code}` = `<instance>:<model>` (all 5 initially point to the same model — operator can split later via setting form)
   - `ai.provider.<instance>.type` = `openai` — **only** for operator-named instance. A free name is only a namespace until then; only the type binds it to a protocol. The included instances have their `_provider.yaml` for this, a self-chosen name does not.
   - `ai.provider.<instance>.baseUrl` = Gateway endpoint (only if set)
   - `ai.provider.<instance>.apiKey` = encrypted (only if key was set)
   - `ai.embedding.provider` = `<instance>` (if `supportsEmbedding`) or `embedded`
   - `ai.embedding.apiKey` = encrypted (`embeddingApiKey` if set, otherwise `aiApiKey` for reuse)
5. **Research Bundle.** Two halves, and they are deliberately independent
   of each other — previously, the entire block depended on the Serper key; an installation
   without a Serper account would thus get **no** search source at all, not even the
   keyless ones.

   The endpoints are **documents** under `_vance/config/research/<id>.yaml` in the
   `_tenant` project (see [zarniwoop-service](zarniwoop-service.md) §8.1),
   the routing remains a setting — there, the key names a modality. Nothing is
   overwritten: a source file edited by the operator survives a
   re-run.

   - **always**, keyless: `wiki-de` (wikipedia) → `research.fallback.web` +
     `research.default.encyclopedia`; `hn-algolia` (hackernews) →
     `research.default.news`; `openlib` (openlibrary) →
     `research.default.book`; `openalex` → `research.default.academic`;
     `arxiv` → `research.fallback.academic`
   - **only with `serperKey`**: `serper-main` with `apiKey: "{noop}<key>"` +
     `research.default.web=serper-main`. The `{noop}` in the file indicates that
     this is a value and not an unresolved reference.

**Idempotence.** Re-running with the same inputs overwrites with identical values — `settingService.set(...)` is an upsert. Existing Tenants/Users are not "created" again (wizard remembers `created` flag per selection path).

**Audit.** Every settings write goes through the normal `AuditService.settingsUpdate`/`settingsPasswordRead` hooks of `SettingService` — no separate setup event.

---

## 6. Security & Write Discipline

- **API keys are never read back from settings.** The wizard shows `(keep existing)` for existing keys and only overwrites on explicit input. Rationale: a decrypt-and-redisplay (even masked by length) would trigger the plaintext path more often than necessary — and the wizard typically runs interactively on a terminal that has history scroll and screenshare.
- **Password input** (User Password, all API Keys, Serper) goes through `LineReader.readLine(prompt, '*')` — JLine echoes `*` per character, the plaintext never goes into the terminal history.
- **Reserved Names.** Tenant name `_vance` and User names with `_` prefix are explicitly rejected in the Create path — System Tenant and Service Accounts have their own, non-interactive provisioning paths.

---

## 7. What the Wizard Does NOT Do

- **No multi-tenant provisioning in one run.** Exactly one Tenant + one User per wizard run. To create multiple Tenants, run the wizard multiple times.
- **No complete settings UI.** The wizard only writes the Provider default + Research Bundle. Per-User settings, Recipes, OAuth Providers, Memory Hints, Quotas — these belong in the Web UI / Setting Forms.
- **No multi-provider combinations.** Exactly one Chat Provider + its Embedding path. Mixed setups (Gemini Chat + OpenAI Embedding) are done via the Web UI after the initial setup.
- **No Project Create.** Tenant + `_tenant` are sufficient for boot. Regular Projects are then created by the User through the Web UI, Catalog Kits via [Project-Kits-Catalog](project-kits-catalog.md).
- **No update of existing API keys via value comparison.** If the operator types nothing, nothing changes. If they type something, it is re-encrypted and saved — even if the plaintext is coincidentally identical to the existing one (wizard cannot check this, see §6).
- **No OAuth Provider Setup.** OAuth configuration (Provider document in the `_tenant` project + Client Secret) remains manual — the wizard is built for API key-based Cloud LLMs, OAuth is a separate code path with its own UI.
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
| OAuth Provider Step in Wizard | open, own UI |
