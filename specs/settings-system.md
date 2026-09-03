---
title: "Vancetope — Settings System"
parent: Specs
permalink: /specs/settings-system
---

<!-- AUTO-GENERATED from llm/specification/settings-system.md (translated from the German specification/public/settings-system.md) — do not edit here. -->

# Vancetope — Settings System

> Unified, typed settings system for all configurations.
> Core principle: Everything is a setting with a type. Secrets are encrypted. No separate config/secret system.
> See also: [identity-credentials](/specs/identity-credentials) | [llm-resource-management](/specs/llm-resource-management) | [architektur-scopes-clients](/specs/architektur-scopes-clients)

---

## 1. Design Principle

No separate config system and secret system. Everything is **typed settings** at different Scope levels. The two encrypted types (`password`, `hidden`) are stored encrypted and never returned in plaintext. Everything else is transparently readable.

Like GitHub Repository Settings or K8s ConfigMaps + Secrets — but in one system.

---

## 2. Setting Types

| Type | Storage | Return via API | Example |
|-----|------------|-----------------|---------|
| `string` | Plaintext | Plaintext | `project.name = "Literature Review"` |
| `int` | Plaintext | Plaintext | `quota.daily_tokens = 500000` |
| `double` | Plaintext | Plaintext | `linker.confidence_threshold = 0.7` |
| `boolean` | Plaintext | Plaintext | `features.brain_linker_enabled = true` |
| `hidden` | **Encrypted** | **`"[set]"`** (masked) | `deploy-token` (a script resolves it) |
| `password` | **Encrypted** | **`"[set]"`** (masked) | `smtp.password`, `ai.provider.default.apiKey` |

### 2.1 Two Dimensions: Value Type and Protection Class

The enum carries two things. `string`/`int`/`double`/`boolean` indicate **how the value is parsed**. `hidden` and `password` are not value types, but **protection classes over a string** — a spectrum of increasing protection:

```
string  →  hidden  →  password        increasing protection
```

Properly modeled, they would be a flag on each type. As an enum level, they fit into the existing concept; the price is that there is **no protected `int`/`boolean`** (practically irrelevant, but the boundary). Two predicates on `SettingType` are exactly the thresholds on this spectrum, both monotonic:

| Level | `encrypted()` — encrypted at rest | `referenceReadable()` — resolvable for dynamic elements |
|---|---|---|
| `string` (and the other value types) | no | yes |
| `hidden` | **yes** | yes |
| `password` | yes | **no** |

A future level is classified by stating between which thresholds it lies — append, set predicates. No further comparison in the code.

### 2.2 Rules for Both Encrypted Types

- Are encrypted upon writing (AES-256, master key from Environment) — the only write path is `setEncryptedSecret`, the generic `set()` rejects them
- Are **never** returned in plaintext when read via API, only `"[set]"`
- Are decrypted **only internally** in the Brain, at the moment of the Tool/LLM call
- **Never** appear in logs, chat output, Think Process results, or exports
- Can be overwritten and deleted, but not read
- Empty input means "do not change", not "explicitly empty" (§4)
- Both share the **ciphertext format**: a type change `password` ↔ `hidden` is a pure type update, the value does not need to be re-entered

### 2.3 `password` vs. `hidden` — Who Reads the Value

The only difference, and it determines the **reader**, not the encryption:

- **`password`** — a true secret. Read by compiled server code (LLM provider keys, `vault.clientSecret`) **and by connectors**: an SMTP/IMAP Tool document, a REST or MCP Tool Pack. For **dynamic elements** — Agents and scripts — it is neither readable nor writable.
- **`hidden`** — encrypted, but additionally resolvable by dynamic elements: `vance.secret(…)` in a script, a `secrets:` block in Compose, a secret provisioned via `vault_secret_generate`.

**A connector is not a dynamic element**, even if its config contains a `&#123;{secret:…}}` reference — it is operator configuration. Therefore, an SMTP password or a Jira token remains `password`: **usable, but invisible to Agents and scripts.** This is precisely the purpose of the two types. If every reference were equally "dynamic", every configured Tool credential would become `hidden`, and `password` would remain only for compiled code — the distinction would be worthless.

A dynamic element encountering a `password` setting will fail with a **named error** instead of an empty substitution. The question when choosing is therefore not "how secret is it", but **"does a script or a Compose task need to resolve the value itself"**.

The distinction is deliberately **not a permission**: an Agent acts with the `SecurityContext` of the human, so no role check can separate "the human typed the value" from "the model called a Tool". Details, write rules, and derivation: [`vault-access.md`](/specs/vault-access) §4 and `planning/setting-type-hidden.md`.

#### Reserved Keys — The Second Barrier

Because connectors read `password`, the **type** is no longer what keeps a reference away from `ai.provider.<instance>.apiKey`. A Tool document declares its target URL directly next to its headers; a reference to the provider key in the header would therefore send it wherever the document points. Connector documents are in the reserved `_vance/` namespace and require ADMIN to write — this is an authorization, not a containment, boundary.

Therefore, `SecretReferenceKeyPolicy` checks **before every lookup** and on **both** paths (`resolve` as well as `resolveForConnector`) the key name against `vance.settings.secret-reference-deny-keys` (default `ai.provider.*,vault.*`). A match throws — as with a type violation — a named error, not an empty substitution. The list is separate from `vance.settings.agent-write-deny-keys` (same grammar, same default): "an Agent may not write this" and "no reference may resolve this" are different questions, and a shared list would mean that hardening one side silently changes the other. Both are operator properties from `application.yml`, **not** Settings — otherwise an Agent with Settings write permission could expand its own scope.

The `vault:` Scope is excluded: its key names an entry in the Vault's namespace, not a Setting.

---

## 3. Scope Levels

Settings are **project attributes**: each Setting is attached to a Project (or a Think Process). Tenant and User Scopes are syntactic sugar — they collapse to the `_tenant` system Project or the per-user `_user_<login>` Projects, respectively.

### Storage Layer (what is actually in Mongo)

Only two `referenceType` values are persisted:

| `referenceType` | `referenceId` | Meaning |
|---|---|---|
| `project` | `_tenant` | Tenant-wide defaults |
| `project` | `_user_<login>` | Per-user Settings |
| `project` | `<projectId>` | Project-specific |
| `think-process` | `<processId>` | Innermost — only for the lifetime of the Process |

### Wire Layer (what the Admin API shows)

The `AdminSettingsController` maps Wire ↔ Storage transparently. The UI still sees four Reference Types and does not need to know about the `_tenant`/`_user_<login>` trick:

| Wire-`referenceType` | Wire-`referenceId` | is mapped to Storage |
|---|---|---|
| `tenant` | (any) | `project / _tenant` |
| `user` | `<login>` | `project / _user_<login>` |
| `project` | `<projectId>` | passthrough |
| `think-process` | `<processId>` | passthrough |

Reads translate the Storage Reference back into the Wire form. This is also why `tenant` Settings still exist in the UI — only persistence has been consolidated.

### Resolution — Two Separate Cascades

`SettingService` exposes **two** lookup APIs, with different Scopes. They are intentionally separated so that per-User preferences do not accidentally overwrite Tenant/Project defaults for security-relevant keys (LLM provider, API keys).

#### a) Project Cascade — `getStringValueCascade(tenantId, projectId, processId, key)`

Inner-to-outer, first-hit-wins. **No User layer**:

```
1. Think-Process tp:                  storage think-process/tp
2. <projectId>-Project (e.g., "p"):    storage project/p
3. _tenant-Project:                    storage project/_tenant
4. → null
```

For everything related to the worker context: `ai.*` (Provider, model, aliases, API keys), `web.*` (Search keys), `memory.*` hints. A cascade variant for Passwords exists as `getDecryptedPasswordCascade(...)` — same order.

#### Empty vs. Unset — `""` Breaks the Cascade, `null` Does Not

The cascade does **not** ask "is there a non-empty value here?", but "is the key set here?". This allows three states per layer to be distinguished, and the middle one is the important one:

| Layer State | Cascade |
|---|---|
| Key does not exist | continues outwards |
| Key exists, value `null` | continues outwards |
| Key exists, value `""` | **stops here** and returns `""` |

`""` is therefore the canonical representation for **"explicitly nothing at this level"**. Consumers consistently treat blank as "not configured" and fall back to their own default (`ChatBehaviorBuilder.resolveBaseUrl` → `null` → Provider default; `getIntValue`/`getBooleanValue*` → `defaultValue`). The effect: an inner layer can **disable** an outer value without replacing it — e.g., Tenant routes `ai.provider.openai.baseUrl` to a gateway, a Project runs with `""` against the actual Provider default.

There is **no placeholder sentinel** for this (no `-`, no `__none__` at this level). A magic value would have to be known by each of the dozens of cascade consumers and would propagate as a literal everywhere else. To explicitly write empty, write `""`:

- **Setting Forms:** Clear field — the form engine decides between `DELETE` (own override) and `WRITE ""` (inherited) based on the live layer, see [setting-forms.md §6.4](/specs/setting-forms).
- **Admin-REST / Raw Editor:** `PUT .../admin/settings/{referenceType}/{referenceId}/{key}` with `{"value": "", "type": "STRING"}`. `value: null` (or omitted) creates a row that **continues to cascade** — this is rarely what is intended.

**Exception for encrypted types (`password`/`hidden`):** there, an empty input means "do not change", not "explicitly empty" — a credential is never cleared by an empty input (see §2.2).

#### b) User API — `getUserStringValue(tenantId, userId, key)` and `getUserStringValueWithDefault(...)`

Direct read in the `_user_<login>` Project. **No Project layer**, optional fallback to `_tenant`:

```
getUserStringValue(tenantId, userId, key) :=
  storage project/_user_<userId>
  → null (no fallback)

getUserStringValueWithDefault(tenantId, userId, key) :=
  1. storage project/_user_<userId>
  2. storage project/_tenant              (no <projectId> layer!)
  3. → null
```

For purely per-user preferences that should **not** be mixed with the Project context: `webui.language`, `display.timezone`, `telegram.conversation_id`, `notification.channel`, Terminal theme, ... The `<projectId>` layer is intentionally skipped — otherwise, switching to another Project would unexpectedly change the UI language or the displayed time.

#### Language: Three Settings, Three Cascades

Language breaks down into three concepts with different cascades. Resolved via [`LanguageResolver`](../repos/vance/server/vance-shared/src/main/java/de/mhus/vance/shared/settings/LanguageResolver.java):

| Setting | Meaning | Cascade |
|---|---|---|
| `webui.language` | UI chrome (buttons, labels). | User-only (no cascade). |
| `chat.language` | Language in which the assistant replies/listens. | `think-process → _user_<userId> → <projectId> → _tenant` — User default can be overridden by a Project (e.g., an English code review Project for a German-speaking User). |
| `content.language` | Language in which Documents/Insights/Memory entries are written. | `think-process → <projectId> → _tenant` — deliberately **without** User layer, because content belongs to the Project (otherwise Project with Documents in three languages depending on author). |

Default fallback: configurable via the property `vance.language.default` (`application.yml`), code default `en`. `LanguageResolver` falls back to this value if no Scope setting applies — local installations thus set an installation-wide default language (e.g., `de`) without maintaining per-User settings. The fallback applies to the **defaulting** methods `chatLanguage()` / `contentLanguage()` (Wizard/Template/Setting Form rendering). The **nullable** `findChatLanguage()` / `findContentLanguage()` remain unaffected (`null` in case of true absence). The MemoryContextLoader renders both languages in an `## Languages` block in the system prompt — Engines thus get the correct language context without further action. **Note:** `formatLanguageBlock` uses `find*` resolution and remains empty ("no opinion") if the setting is missing — the `vance.language.default` fallback thus controls the rendering defaults, but (yet) not the Engine language block; letting it apply there is a deliberate change in behavior that is part of the prompt language migration to English (see `planning/prompt-language-english-migration.md`). The historical `context.language` key no longer exists; migration is "manual" (replace Settings rows, the resolver does not read the old key).

#### Timezone: `display.timezone`

The user's display timezone is a single per-user Setting `display.timezone` (IANA ID, e.g., `Europe/Berlin`), resolved via [`TimezoneResolver`](../repos/vance/server/vance-shared/src/main/java/de/mhus/vance/shared/settings/TimezoneResolver.java) via `getUserStringValueWithDefault` — cascade `_user_<userId> → _tenant`, code fallback `UTC`. Consumers:

- the **Current-Date-Block** in the prompt (renders in the user's zone instead of server zone — see [prompt-caching](/specs/prompt-caching) §5b),
- the **`current_time`** Tool (default zone without explicit `zone` parameter),
- the **Scheduler** (`scheduler_set` writes the user's zone into the YAML when creating — [scheduler](/specs/scheduler) §10c).

The `PromptDateContextResolver` (vance-brain) lifts `Process → Session → userId` for this and is headless-proof. `display.timezone` is set in the Web UI profile (timezone selector with browser default seed on first load) or in the Foot-CLI via `/timezone`; both write via the self-service `PUT /brain/{tenant}/profile/settings/display.timezone` path (key is in the Profile allowlist).

For Passwords, analogously: `getDecryptedUserPassword(tenantId, userId, key)` — direct, no fallback (per-user Secrets are explicit).

Team and Account Scopes are not modeled in v1. If they are added, they will sit between Project and `_tenant` in the Project cascade.

---

## 4. Data Model

### MongoDB Collection: `settings`

```javascript
{
  _id: ObjectId,
  tenantId: "acme",
  referenceType: "project",                  // project | think-process
  referenceId: "_tenant",                     // see Storage Layer §3
  key: "ai.providers.anthropic.api_key",     // Dot notation, hierarchical
  type: "PASSWORD",                          // STRING | INT | LONG | DOUBLE | BOOLEAN | HIDDEN | PASSWORD
  value: "enc:aes256:...",                   // encrypted for PASSWORD/HIDDEN, otherwise plaintext
  description: "Anthropic API Key",          // optional, for UI/documentation
  createdAt: ISODate,
  updatedAt: ISODate
}

// Compound index:
// { tenantId: 1, referenceType: 1, referenceId: 1, key: 1 }  — unique
```

### Bootstrap Order

For Settings to be written to the `_tenant` Project, the Project must already exist during Settings operations. Two paths:

- **Demo Tenant `acme`:** `InitBrainService` calls `homeBootstrapService.ensureVance(ACME)` directly before `InitSettingsLoader.loadIfPresent()` — the loader places its YAML entries in `(project, _tenant)` without the caller needing to know.
- **Other Tenants:** `_tenant` is lazily created (idempotently) on the first User login via `AccessController`, before Settings can be set via the Admin-REST.

---

## 5. Naming Conventions (Keys)

Dot notation, grouped by area:

### Preferences (per-user)

```
display.timezone                     string     "Europe/Berlin"
webui.language                       string     "de"
chat.language                        string     "de"
```

Per-user Keys (Storage in the `_user_<login>` Project, Cascade User → `_tenant`). `display.timezone` + `webui.language` are writable via the self-service Profile endpoint; see §3b.

### LLM

```
llm.default_model                    string     "claude-sonnet-4"
llm.planning_model                   string     "claude-sonnet-4"
llm.execution_model                  string     "claude-sonnet-4"
llm.light_model                      string     "gemini-2.5-flash"
llm.providers.anthropic.api_key      password   "sk-ant-..."
llm.providers.anthropic.priority     int        1
llm.providers.google.api_key         password   "AIza..."
llm.providers.google.priority        int        2
llm.providers.ollama.endpoint        string     "http://localhost:11434"
llm.failover.enabled                 boolean    true
llm.failover.max_retries             int        2
llm.failover.fallback_to_local       boolean    true
```

### Quotas

```
quota.daily_tokens                   int        500000
quota.monthly_tokens                 int        10000000
quota.max_tokens_per_call            int        8192
quota.warn_at_percent                int        80
quota.downgrade_at_percent           int        95
```

### Credentials (external services)

```
credentials.jira.type                string     "oauth2"
credentials.jira.access_token        password   "eyJ..."      # the Jira connector uses it
credentials.jira.refresh_token       password   "dGhp..."
credentials.jira.instance_url        string     "https://acme.atlassian.net"
credentials.google_drive.type        string     "oauth2"
credentials.google_drive.token       password   "ya29..."
credentials.slack.webhook_url        password   "https://hooks.slack.com/..."
```

### Features

```
features.brain_linker_enabled              boolean    true
features.auto_continue                     boolean    false
features.max_think_processes_per_project   int        20
features.max_concurrent_think_processes    int        5
```

### Think Process Defaults

```
process.stop_after_each_task         boolean    true
process.max_depth                    int        5
process.allow_dynamic_children       boolean    true
process.auto_promote_results         boolean    false
```

### Connectors

```
connectors.sync_interval_minutes     int        60
connectors.max_per_project           int        10
```

### Routing

```
routing.fallback.recipe              string     hactar
```

Recipe name that is spawned by `process_spawn` when the trigger-gated selector returns NONE (user text does not trigger a special Recipe). Empty string = no fallback (caller receives NONE and decides itself). See [recipe-routing.md](/specs/recipe-routing) §6.

---

## 6. API

### Read Settings

```
GET /api/settings?scope=account/acc_mike
  → All Settings for this Account (passwords masked)

GET /api/settings?scope=project/proj_5&key=llm.*
  → All LLM Settings for this Project

GET /api/settings/resolved?scope=think-process/tp_12&account=acc_mike&project=proj_5
  → Resolved Settings (cascade applied), shows effective values
  → Includes "source" field: where the value comes from (tenant/team/project/account/engine)
```

Response:
```json
{
  "settings": [
    {
      "key": "llm.default_model",
      "type": "string",
      "value": "claude-sonnet-4",
      "source": "account/acc_mike"
    },
    {
      "key": "llm.providers.anthropic.api_key",
      "type": "password",
      "value": "***",
      "source": "project/proj_5"
    },
    {
      "key": "quota.monthly_tokens",
      "type": "int",
      "value": 5000000,
      "source": "project/proj_5"
    }
  ]
}
```

### Write Settings

```
PUT /api/settings
  Body: {
    "scope": { "type": "account", "id": "acc_mike" },
    "key": "llm.providers.anthropic.api_key",
    "type": "password",
    "value": "sk-ant-new-key-123"
  }
  → Stored (encrypted for password)
```

### Delete Settings

```
DELETE /api/settings?scope=account/acc_mike&key=llm.default_model
  → Override removed, falls back to next Scope level
```

### Bulk Operations

```
PUT /api/settings/bulk
  Body: {
    "scope": { "type": "project", "id": "proj_5" },
    "settings": [
      { "key": "quota.monthly_tokens", "type": "int", "value": 5000000 },
      { "key": "llm.providers.anthropic.api_key", "type": "password", "value": "sk-..." }
    ]
  }
```

---

## 7. CLI

```
vance settings list
  llm.default_model          = claude-sonnet-4     (account)
  llm.light_model            = gemini-2.5-flash    (tenant)
  quota.daily_tokens         = 500000              (account)
  quota.monthly_tokens       = 5000000             (project)
  credentials.jira.api_key   = ***                 (account)

vance settings get llm.default_model
  claude-sonnet-4 (source: account/acc_mike)

vance settings set llm.default_model claude-opus-4
  Updated: llm.default_model = claude-opus-4 (account/acc_mike)

vance settings set credentials.jira.api_key --type password
  Enter value: ****
  Updated: credentials.jira.api_key = *** (account/acc_mike)

vance settings delete llm.default_model
  Deleted: llm.default_model (account/acc_mike)
  Effective value now: claude-sonnet-4 (from: tenant/tenant_acme)

vance settings resolved --engine tp_12
  → Shows all effective Settings with origin
```

---

## 8. In the Brain (internal)

```java
@Service
public class SettingsService {

    // Resolves a Setting value through the Scope cascade
    public <T> T get(String key, Class<T> type, SettingsContext ctx) {
        // ctx contains: thinkProcessId, accountId, projectId, teamId, tenantId
        // Checks: engine → account → project → team → tenant → default
    }

    // Resolves a Secret (decrypted) — the path for compiled
    // server code with a fixed key. Reads both encrypted types.
    // ONLY use internally, never return to API/client
    public String getSecret(String key, SettingsContext ctx) {
        Setting s = resolve(key, ctx);
        if (!s.getType().encrypted()) throw ...;
        return decrypt(s.getValue());
    }

    // Resolves a Secret for an authored &#123;{secret:…}} reference.
    // Only returns HIDDEN, PASSWORD throws SecretAccessDeniedException.
    public String getReferenceSecret(String key, SettingsContext ctx) { ... }

    // All Settings for a Scope
    public List<Setting> list(Scope scope) { ... }

    // All effective Settings (cascade resolved)
    public List<ResolvedSetting> resolved(SettingsContext ctx) { ... }
}
```

### LLM Factory Uses Settings

```java
public ChatClient createForSession(Session session, String purpose) {
    SettingsContext ctx = SettingsContext.from(session);
    
    String model = settings.get("llm." + purpose + "_model", String.class, ctx);
    String provider = determineProvider(model, ctx);
    String apiKey = settings.getSecret("llm.providers." + provider + ".api_key", ctx);
    
    return ChatClient.builder()
        .model(provider, model)
        .apiKey(apiKey)
        .build();
}
```

---

## 9. Desktop / Web UI

Settings page in the client, grouped by area:

```
Settings
├── LLM
│   ├── Default model:     [claude-sonnet-4  ▼]     (account)
│   ├── Planning model:    [claude-sonnet-4  ▼]     (tenant default)
│   ├── Light model:       [gemini-2.5-flash ▼]     (tenant default)
│   ├── Anthropic API Key: [••••••••••] [Edit]       (project)
│   └── Google API Key:    [Not set]    [Set]        
│
├── Quotas
│   ├── Daily tokens:      [500,000]                 (account)
│   └── Monthly tokens:    [5,000,000]               (project)
│
├── Integrations
│   ├── Jira:              Connected ✓  [Revoke]     (account)
│   ├── Google Drive:      Connected ✓  [Revoke]     (account)
│   └── Slack:             Not connected [Connect]
│
├── Think-Process Defaults
│   ├── Stop after task:   [✓]                       (tenant default)
│   └── Max depth:         [5]                       (tenant default)
│
└── Features
    ├── Brain Linker:      [✓]                       (tenant)
    └── Auto-continue:     [ ]                       (account)

(source) shows where the value comes from — hover for details
```

---

## 10. Summary

```
Everything is a Setting.
Settings have types: string, int, double, boolean — plus the protection classes hidden and password.
Both encrypted types are stored encrypted and never returned in plaintext.
Only hidden is resolvable via a &#123;{secret:…}} reference; password is only read by server code.
Settings exist at Scope levels: Tenant → Team → Project → Account → Think-Process.
A lower level overrides a higher one.
One system, one code path, one API.
```

---

*See also: [identity-credentials](/specs/identity-credentials) | [llm-resource-management](/specs/llm-resource-management) | [architektur-scopes-clients](/specs/architektur-scopes-clients)*
