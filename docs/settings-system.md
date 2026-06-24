---
title: "Vance — Settings System"
parent: Documentation
permalink: /docs/settings-system
---

<!-- AUTO-GENERATED from specification/public/en/settings-system.md — do not edit here. -->

---
# Vance — Settings System

> Unified, typed settings system for all configurations.
> Core principle: Everything is a setting with a type. Passwords are encrypted. No separate config/secret system.
> See also: [identity-credentials](/docs/identity-credentials) | [llm-resource-management](/docs/llm-resource-management) | [architektur-scopes-clients](/docs/architektur-scopes-clients)

---

## 1. Design Principle

No separate config system and secret system. Everything consists of **typed settings** at different Scope levels. A `password` type is stored encrypted and never returned in plaintext. Everything else is transparently readable.

Like GitHub Repository Settings or K8s ConfigMaps + Secrets — but in one system.

---

## 2. Setting Types

| Type | Storage | Return via API | Example |
|-----|------------|-----------------|---------|
| `string` | Plaintext | Plaintext | `project.name = "Literature Review"` |
| `int` | Plaintext | Plaintext | `quota.daily_tokens = 500000` |
| `double` | Plaintext | Plaintext | `linker.confidence_threshold = 0.7` |
| `boolean` | Plaintext | Plaintext | `features.brain_linker_enabled = true` |
| `password` | **Encrypted** | **`"***"`** (masked) | `credentials.jira.api_key = "sk-..."` |

### Password Type Rules

- Encrypted when written (AES-256, master key from Environment)
- **Never** returned in plaintext when read via API, only `"***"` or `"[set]"`
- Decrypted **only internally** in the Brain, at the moment of the Tool-Call or LLM-Call
- **Never** appears in logs, chat output, Think Process results, or exports
- Can be overwritten and deleted, but not read

---

## 3. Scope Levels

Settings are **project attributes**: each setting is attached to a Project (or a Think Process). Tenant and User Scopes are syntactic sugar — they collapse to the `_tenant` system Project or the per-user `_user_<login>` Projects, respectively.

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

Reads translate the Storage reference back into the Wire form. This is also why `tenant` settings still exist in the UI — only persistence has been consolidated.

### Resolution — Two Separate Cascades

`SettingService` exposes **two** lookup APIs, with different Scopes. They are intentionally separated so that per-User preferences do not accidentally overwrite Tenant/Project defaults for security-relevant keys (LLM Provider, API Keys).

#### a) Project Cascade — `getStringValueCascade(tenantId, projectId, processId, key)`

Inner-to-outer, first-hit-wins. **No User Layer**:

```
1. Think-Process tp:                  storage think-process/tp
2. <projectId>-Project (e.g., "p"):    storage project/p
3. _tenant-Project:                    storage project/_tenant
4. → null
```

For everything related to the worker context: `ai.*` (Provider, Model, Aliases, API Keys), `web.*` (Search Keys), `memory.*` hints. A cascade variant for Passwords exists as `getDecryptedPasswordCascade(...)` — same order.

#### b) User API — `getUserStringValue(tenantId, userId, key)` and `getUserStringValueWithDefault(...)`

Direct read in the `_user_<login>` Project. **No Project Layer**, optional fallback to `_tenant`:

```
getUserStringValue(tenantId, userId, key) :=
  storage project/_user_<userId>
  → null (no fallback)

getUserStringValueWithDefault(tenantId, userId, key) :=
  1. storage project/_user_<userId>
  2. storage project/_tenant              (no <projectId>-Layer!)
  3. → null
```

For purely per-user preferences that should **not** be mixed with the Project context: `webui.language`, `telegram.conversation_id`, `notification.channel`, Terminal theme, ... The `<projectId>` layer is intentionally skipped — otherwise, switching to another Project would unexpectedly "change" the UI language.

#### Language: Three Settings, Three Cascades

Language breaks down into three concepts with different cascades. Resolved via [`LanguageResolver`](../repos/vance/server/vance-shared/src/main/java/de/mhus/vance/shared/settings/LanguageResolver.java):

| Setting | Meaning | Cascade |
|---|---|---|
| `webui.language` | UI Chrome (buttons, labels). | User-only (no cascade). |
| `chat.language` | Language in which the assistant responds/listens. | `think-process → _user_<userId> → <projectId> → _tenant` — User default can be overridden by a Project (e.g., an English code review Project for a German-speaking User). |
| `content.language` | Language in which Documents/Insights/Memory entries are written. | `think-process → <projectId> → _tenant` — deliberately **without** User layer, because content belongs to the Project (otherwise Project with Documents in three languages depending on author). |

Default fallback: `LanguageResolver.DEFAULT_LANGUAGE = "en"`. The MemoryContextLoader renders both languages in a `## Languages` block in the System Prompt — Engines thus get the correct language context without further action. The historical `context.language` key no longer exists; migration is "manual" (replace settings rows, the resolver does not read the old key).

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
  type: "PASSWORD",                          // STRING | INT | LONG | DOUBLE | BOOLEAN | PASSWORD
  value: "enc:aes256:...",                   // encrypted for PASSWORD, otherwise plaintext
  description: "Anthropic API Key",          // optional, for UI/documentation
  createdAt: ISODate,
  updatedAt: ISODate
}

// Compound index:
// { tenantId: 1, referenceType: 1, referenceId: 1, key: 1 }  — unique
```

### Bootstrap Order

For settings to be written to the `_tenant` Project, the Project must already exist during settings operations. Two paths:

- **Demo Tenant `acme`:** `InitBrainService` calls `homeBootstrapService.ensureVance(ACME)` directly before `InitSettingsLoader.loadIfPresent()` — the loader places its YAML entries in `(project, _tenant)` without the caller needing to know.
- **Other Tenants:** `_tenant` is created lazily (idempotently) by `AccessController` on the first user login, before settings can be set via the Admin REST API.

---

## 5. Naming Conventions (Keys)

Dot notation, grouped by area:

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

### Credentials (External Services)

```
credentials.jira.type                string     "oauth2"
credentials.jira.access_token        password   "eyJ..."
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

Recipe name that is spawned by the selector-routed `process_create`
if the trigger-gated selector returns NONE (user text does not trigger
a special Recipe). Empty string = no fallback (caller receives NONE
and decides itself). See
[recipe-routing.md](/docs/recipe-routing) §6.

---

## 6. API

### Reading Settings

```
GET /api/settings?scope=account/acc_mike
  → All settings for this account (passwords masked)

GET /api/settings?scope=project/proj_5&key=llm.*
  → All LLM settings for this project

GET /api/settings/resolved?scope=think-process/tp_12&account=acc_mike&project=proj_5
  → Resolved settings (cascade applied), shows effective values
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

### Writing Settings

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

### Deleting Settings

```
DELETE /api/settings?scope=account/acc_mike&key=llm.default_model
  → Override removed, falls back to the next Scope level
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
  → Shows all effective settings with origin
```

---

## 8. In the Brain (Internal)

```java
@Service
public class SettingsService {

    // Resolves a setting value through the Scope cascade
    public <T> T get(String key, Class<T> type, SettingsContext ctx) {
        // ctx contains: thinkProcessId, accountId, projectId, teamId, tenantId
        // Checks: engine → account → project → team → tenant → default
    }

    // Resolves a password (decrypted)
    // ONLY use internally, never return to API/client
    public String getSecret(String key, SettingsContext ctx) {
        Setting s = resolve(key, ctx);
        if (s.getType() != SettingType.PASSWORD) throw ...;
        return decrypt(s.getValue());
    }

    // All settings for a Scope
    public List<Setting> list(Scope scope) { ... }

    // All effective settings (cascade resolved)
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
├── Think Process Defaults
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
Everything is a setting.
Settings have types: string, int, double, boolean, password.
Passwords are stored encrypted and never returned in plaintext.
Settings exist at Scope levels: Tenant → Team → Project → Account → Think Process.
Lower levels override higher levels.
One system, one code path, one API.
```

---

*See also: [identity-credentials](/docs/identity-credentials) | [llm-resource-management](/docs/llm-resource-management) | [architektur-scopes-clients](/docs/architektur-scopes-clients)*
