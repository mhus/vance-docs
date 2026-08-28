---
title: "Vault Access — Secret Manager (External or Settings)"
parent: Specs
permalink: /specs/vault-access
---

<!-- AUTO-GENERATED from specification/public/en/vault-access.md — do not edit here. -->

---
# Vault Access — Secret Manager (External or Settings)

> A Secret channel with **one** reference form, integrated into the existing
> `&#123;{secret:…}}` layer. Behind it is either an external manager
> (Infisical) or — without any configuration, as default — Vancetope's own
> `hidden` settings. Secrets are **never** stored in Vancetope in plain text,
> but are resolved **server-side** at runtime and usable wherever
> Vancetope already recognizes secrets — Tool Templates, SMTP, REST Tools, **and** the
> `secrets:` block in Compose. Additionally, secrets can be **provisioned**
> (server-side generated, without the model seeing the value) or written
> via two LLM tools.
>
> Status: v1 productive. Providers: **`settings`** (Default, no setup) and
> **Infisical** (self-hostable); other managers (HashiCorp/OpenBao, Bitwarden
> Secrets Manager) connect via the same SPI.
>
> Settings are referencable via the same layer. `PASSWORD` remains neither
> readable nor writable for agents and scripts, but is **usable** by connectors;
> `HIDDEN` is for secrets that a script or Compose task must resolve itself
> (§4.1/§4.2).
>
> See also [`settings-system.md`](/specs/settings-system) (Setting Types §2,
> Scope Cascade §3), [`damogran-system.md`](/specs/damogran-system) (Compose).
> Derivation of the type barrier: `planning/setting-type-hidden.md`.

## 1. Model

A secret has a **reference** (`vault:<key>`), never a value in the document.
Resolution happens server-side at the time of access; the value leaves the
server only in the outgoing call (HTTP header, exec environment). An agent
writes references, never values.

## 2. Binding — One Vault per Scope, Cascaded

The Vault connection is a group of cascading settings under `vault.*`:

| Key | Meaning |
|-----|-----------|
| `vault.type` | Provider discriminator (`settings` \| `infisical`) — **empty = `settings`** |
| `vault.baseUrl` | Endpoint (Infisical Cloud or self-hosted) |
| `vault.project` | Infisical Project/Workspace ID |
| `vault.environment` | Environment slug (`prod`, …) |
| `vault.path` | Default folder (`/`) |
| `vault.clientId` | Machine Identity Client ID (Universal Auth) |
| `vault.clientSecret` | Machine Identity Client Secret (`PASSWORD`, encrypted) |

**Exactly one binding per Scope.** `VaultService` determines the **innermost**
cascade layer (user → project → tenant) that carries `vault.type`, and reads **all**
keys from exactly this layer — atomically, so that a partially configured user level
does not assemble a mixed clientId/clientSecret binding. A binding set at the
user level thus wins as a whole over the project binding, and this over the
tenant-wide `_tenant` binding. Headless/service runs (no user) cleanly fall back
to project/tenant. Configuration is done via the *Vault* setting form
(Profile for user scope, Workspace for project scope). A **tenant-wide**
default Vault can alternatively be seeded at boot — the `vault.*` keys in the
Init Settings Template (`qa/init-settings.yaml.dist`) land via
`InitSettingsLoader` precisely in the `_tenant` layer, which the cascade reads as a fallback.

### 2.1 Default without Configuration: the Settings Vault

If `vault.type` is not set on **any** layer, this is **not an error** — access
falls back to the `settings` provider (§3.1). `&#123;{secret:vault:<key>}}`
thus works without any configuration, and a document written against
`vault:my-token` remains valid if Infisical is bound later: the **value**
moves, the **reference** does not. This is precisely why the provider-agnostic
prefix exists.

Practical consequence: `vault:` is the one agent-capable reference form from day 1.
Those who do not want to operate anything externally still use it — and later grow
into an external manager without document changes.

`VaultService.isConfigured(scope)` still says "**external** manager bound"
and is **not** a precondition for a read — it is only intended for status displays,
never to skip the Vault path. Which Vault served a call is on a **separate**
series — `vance.vault.bindings{outcome=settings|external}`
— to make visible how many installations run without an external manager.
Deliberately not folded into the result metric: its `outcome` values are
*terminal* outcomes, and `success / sum(outcomes)` should be a success rate.
An additional binding value in the same series would count every call of the
default installation twice and push the rate down to 50%.

## 3. Providers

`VaultProvider` (SPI, `vance-shared`): `type()` + `readSecret(binding, scope, key)` +
`writeSecret(binding, scope, key, value)` (Default `UnsupportedOperationException`)
+ `requiresEndpoint()` (Default `true`).
`VaultService` selects the provider by `vault.type`. Providers are stateless —
they receive the resolved `VaultBinding` per call.

`InfisicalVaultProvider` (`vance-brain`) delegates to `InfisicalClient`: Universal
Auth login (`POST /api/v1/auth/universal-auth/login`) with access token cache per
`(baseUrl, clientId)` + one-time 401 refresh retry; secrets via the v4 API
(`/api/v4/secrets/{name}` with `projectId`/`environment`/`secretPath`, value under
`secret.secretValue`). Older self-hosted instances may require a different
API version.

## 4. Reference Grammar

Fixed, provider-agnostic prefix `vault:` (which manager is behind it is determined
solely by `vault.type` — a provider change does not invalidate references):

```
&#123;{secret:vault:<key>}}
```

is located in `SettingsSecretResolver` alongside the existing scopes
(`project:`/`tenant:`/`user:`/Cascade-Default). An error (provider unreachable,
Auth rejected) **fail-closed** to empty + WARN — the dependent call then fails
with 401 instead of propagating. A **missing binding** is no longer an error:
it selects the Settings Vault (§2.1).

### 4.0a The Counterpart: `{noop}` for a Declared Literal

```
{noop}sk-abc123
```

A value starting with `{noop}` is taken **literally**: prefix removed, no
resolution. The syntax is that of Spring Security's
`DelegatingPasswordEncoder`. Valid wherever `&#123;{secret:…}}` is valid.

**Whether a credential is a reference or in plain text is decided by the
configurator** — this layer does not make the choice. What it provides is a
notation in which the choice is *visible*: a naked literal value passes through
unchanged anyway, so `{noop}` is first an **explanation** and only then a
mechanism. It becomes strictly necessary for a literal value that itself contains
`&#123;{`. A literal that should start with `{noop}` is written
`{noop}{noop}…`.

It is implemented in `SecretResolver` itself, not in the implementations: an
implementation only provides `substitute`/`substituteForConnector`, the
literal is intercepted by the default method `resolve`. The difference is not
academic — the passthrough resolver used by `McpConnection`, `RestHttpInvoker`, and
`McpHttpTransport` without an injected resolver would otherwise have passed the
prefix into an `Authorization` header. (For the same reason, the constant is
`SecretResolver.PASSTHROUGH` and no longer `NOOP`: it means the opposite of `{noop}`.)

The first major consumers are the source configuration documents of Zarniwoop,
Centauri, and Jaglan — there the credential is in a file, and whether it is a
reference or a declared plain text must be visible from the file.

### 4.1 Who May Resolve: Connector vs. Dynamic Element

The criterion is **not** whether a reference is involved — but **who reads the
value**:

| Caller | Examples | May Resolve |
|---|---|---|
| **Connector** (Operator Config) | SMTP/IMAP Tool Document, REST and MCP Tool Pack | `PASSWORD` **and** `HIDDEN` |
| **Dynamic Element** | Script `vance.secret(…)` (JS/Python), Compose `secrets:` | only `HIDDEN` |

A connector is configuration, not a dynamic element — even if its config
contains a `&#123;{secret:…}}` reference. Therefore, a credential that only it uses
remains `PASSWORD`: **usable, but neither readable nor writable for agents and
scripts.** This is precisely the purpose of the two types. Without this
separation, every tool credential set up by the operator would become `HIDDEN`
and `PASSWORD` would only remain for what compiled code reads with a fixed key —
the distinction would be practically worthless.

Technically: `SecretResolver` has two paths. `resolve(…)` is the **restrictive**
default (only HIDDEN), `resolveForConnector(…)` reads both types. The default is
intentionally the narrower one — an implementation that does not know the
separation will therefore only become **narrower**, never broader. The three
dynamic surfaces call `resolve` unchanged; the eight connector locations
(REST Invoker, MCP Transport + Connection, SMTP, IMAP Factory) call
`resolveForConnector`.

If a dynamic element encounters a `PASSWORD` setting, it **does not** substitute
empty, but throws a `SecretAccessDeniedException` with key and solution. Reason:
an denied secret would otherwise be indistinguishable from a missing one and
would arrive as an opaque 401 — the same logic as with `OAuthExpiredException`.
Per channel, this arrives as a JS `Error`, HTTP 403 (Python endpoint), or visible
Compose task failure.

**`vault:` follows the provider.** With an external manager, no setting type is
involved. With the **Settings Vault** (default, §2.1), these are settings — and
there, HIDDEN-only applies because the caller in this case is a dynamic element.

**Reserved Keys — R3, regardless of type.** Since connectors read `PASSWORD`, the
type alone no longer separates the provider key from a reference. A
tool document names target URL and header side-by-side; a
`&#123;{secret:project:ai.provider.openai.apiKey}}` in the header would therefore go
where the same document points. `SecretReferenceKeyPolicy` therefore rejects keys
from `vance.settings.secret-reference-deny-keys` **before any lookup** — on both
paths (`resolve` and `resolveForConnector`) and regardless of whether the setting
even exists (otherwise it would be a trial channel). Deliberately a separate list
next to `agentWriteDenyKeys`: same grammar, but writing and resolving are
different questions — and therefore also different length lists (e.g.,
`kit.token.*` is only on the write list because a provisioning document legitimately
*references* the key).

**The `vault:` exception is an exception at the resolver level, not a loophole.**
`SettingsSecretResolver` excludes the `vault:` scope from the check because a
Vault key usually names an entry in a *foreign* namespace: an Infisical secret
named `ai.provider.openai.apiKey` is not the identically named setting, and
rejecting it would be a rejection due to accidental lexical equality. Since the
**Settings Vault** is the default, this reasoning no longer applies to it — the
key it receives **is** a setting key and goes literally to
`getReferenceSecretCascade`. So `SettingsVaultProvider.readSecret` applies the list
**itself**, before each lookup. An external manager does not do this. This keeps
the second barrier ("a reserved key is unreachable by its name, regardless of its
type") intact for the default installation, without making claims about foreign
Vaults.

### 4.2 Write Side: `PASSWORD` is Untouchable for Agents

Symmetric to reading. There are exactly two agent-accessible
setting write paths — `tool_template_apply` and the Kit install — and for both
applies (`SettingWriteOrigin.AGENT`):

| Rule | Effect |
|---|---|
| **W1** | an existing `PASSWORD` setting is never overwritten |
| **W3** | an agent may not write keys from `vance.settings.agent-write-deny-keys` (Default `ai.provider.*,vault.*`) at all — regardless of type and whether the setting exists. The read counterpart is `secretReferenceDenyKeys` (§4.1) |

**The type follows usage, not origin.** A Kit template that installs an SMTP or
REST credential writes `PASSWORD` — even if an agent triggered the apply and the
value once passed through the model context. A one-time exposure during writing
does not justify a permanent weakening of the credential, which is then only used
by a connector. `HIDDEN` is only written by those who know that a script or a
Compose task must resolve the value itself — for example, `vault_secret_generate`.

W3 is a property and **not** a setting — as a setting, an agent with setting
write rights could extend its own rights.

## 5. Compose Injection (`secrets:`)

An `exec` task declares a `secrets:` map (env name → reference). The values are
resolved at runtime and injected as a **sealed environment** into precisely this
command (**WORK target only**):

```yaml
tasks:
  - type: exec
    secrets:
      DEPLOY_TOKEN: vault:deploy-token
    command: 'curl -H "Authorization: Bearer $DEPLOY_TOKEN" …'
```

Env names are parse-validated (identifier). Two leak controls:

- **State Deny List:** the exec state wrapper skips injected secret names
  in the env delta serialization, so that a script that re-sets the same name
  does not persist it to the state store (the process env form is already
  excluded via the baseline snapshot).
- **Output Masking:** a `SecretMasker` replaces known injected values in the
  LLM-/document-facing result log with `***` (best-effort, exact substring).

## 6. Script Access (`vance.secret`)

Scripts pull secrets via `vance.secret('<ref>')` (full grammar) — the
leak-free pull, counterpart to Compose env injection. The value lives only in a
script variable, never in env or state.

- **JS (in-JVM)**: `ScriptSecretApi` on `vance.secret`, resolved directly via the
  `SecretResolver` with the bound run scope (never script-supplied). Pulled
  values go into a per-run tee; a string return is masked.
- **Python (subprocess)**: `vance.py` `secret(ref)` → `GET /brain/{tenant}/script/secret`
  (only with SCRIPT_RUN token). Server-side, a runId-keyed
  `ScriptSecretAccumulator` records the pulled values; `ExecJobRenderer` masks
  stdout/stderr of the run with it.

Boundary: the capability depends on the standard script API — available where
`vance.documents` is also available (Cortex spawn). The LLM `execute_python`/
`execute_javascript` path does not mint a SCRIPT_RUN token and does not yet have
the contract.

## 7. Write Tools

Both `deferred` + non-primary (opt-in, sensitive), gated on project scope
`Action.WRITE`:

- **`vault_secret_generate(key, [format], [length])`** — generates the value
  server-side (`SecureRandom`; `alphanumeric`/`hex`/`uuid`), writes it, and
  returns **only** the reference, never the value. The leak-free way to
  provision credentials.
- **`vault_secret_set(key, value)`** — writes a given value (which by
  definition has already passed through the model context); does not echo it back.

Provider-side, write is a create-or-update (PATCH→POST); the hard backstop
remains the scope of the Machine Identity — a read-only token will cause the write
to fail, regardless of what the Vancetope gate says.

## 8. Security & v1 Limitations

- **Settings are only referencable as `HIDDEN`** (§4.1/§4.2). Until the
  introduction of the type, the `&#123;{secret:…}}` layer exposed **every** encrypted
  setting to models and scripts — including `vault.clientSecret`, i.e., the
  Vault credential itself, allowing a script to completely read the Vault.
  This is closed; `PASSWORD` is neither readable nor writable for agents.
- **Leak reversal on write:** Reading never exposes the value to the model; a
  value written via `vault_secret_set`, however, has already passed through the
  context. For true secrecy, use `vault_secret_generate`.
- **Masking is best-effort:** only exact raw values in the result log; transformed
  forms (base64, url-encoded, copied to another variable) slip through.
  Live exec tail and server-local exec log files are **not** masked in v1.
  With `vance.secret` (script pull), a JS string return or Python stdout is
  masked — an object graph return or console/log outputs are not.
- **WORK-only:** `secrets:` injection on CLIENT/DAEMON targets is ignored with a
  warning (no sealed-env channel there).
- **No Value Cache** in v1 (token cache in client yes); one remote GET per
  resolve, consistent with the existing `&#123;{secret:project:}}` resolution.

## 9. Implementation

`vance-shared`: `de.mhus.vance.shared.vault.{VaultProvider, VaultService,
VaultBinding, VaultScope, VaultException, SettingsVaultProvider}`. `vance-brain`:
`de.mhus.vance.brain.vault.{InfisicalVaultProvider, InfisicalClient,
ComposeSecretResolver, SecretMasker, ScriptSecretAccumulator, VaultToolSupport,
VaultSecretGenerateTool, VaultSecretSetTool}`, plus `secrets:` processing in
`damogran.{DamogranManifest, DamogranManifestParser, ComposeExec,
WorkspaceComposeExec, ExecDamogranTask, DamogranTaskSupport}`, the `vault:` scope in
`tools.rest.SettingsSecretResolver`, and the script pull via
`script.{VanceScriptApi.ScriptSecretApi, ScriptSecretController}` +
`tools.exec.ExecJobRenderer`-masking + `python-helpers/vance.py`. Setting form
`_vance/setting_forms/vault.yaml`, Manual `_vance/manuals/vault-secrets.md`.

The type barrier from §4.1/§4.2 is in `vance-shared`:
`settings.{SettingType (predicates encrypted/referenceReadable),
SecretAccessDeniedException, SettingWriteOrigin, AgentSettingKeyPolicy}` plus
`SettingService.{getReferenceSecret, getReferenceSecretCascade,
getReferenceUserSecret, setAgentSecret, setEncryptedSecret}`. Origin-threading in
`brain.kit.{KitService, KitInstaller, TemplateApplier}`. Existing data:
`shared.schema.migrations.Migrator_2026_08_11_001_HiddenSettingType`.
