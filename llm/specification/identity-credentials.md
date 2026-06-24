---
# Vance — Identity, Credentials & Tool-Auth

> Defines the unified account model, how credentials work, and why everything is tied to an account.
> Core principle: User and Service Account are the same. Every client logs in. Credentials are tied to the account.
> See also: [multi-user-collaboration](multi-user-collaboration.md) | [mcp-tool-routing](mcp-tool-routing.md) | [execution-modes-trigger](execution-modes-trigger.md) | [client-protokoll-erweiterbarkeit](client-protokoll-erweiterbarkeit.md)

---

## 1. An Account Model

There is no separation between User and Service Account. Both are an **Account** with a flag:

```yaml
account:
  id: acc_mike
  tenant_id: tenant_acme
  name: "Mike Hummel"
  is_human: true                  # true = human, false = service/bot
  auth:
    type: oauth2                  # oauth2 | api_key
    # Human: OAuth2-Login (Google, GitHub, etc.)
    # Service: API-Key
    api_key: null                 # only if is_human=false
  email: mike@acme.org            # optional, may be null for services
  teams: [team_nlp_research]
  preferences:
    default_llm: claude-sonnet
    language: de
  permissions:
    - project: proj_5
      role: owner
    - project: proj_vance_dev
      role: editor
  created_at: 2026-04-23
```

```yaml
account:
  id: acc_github_ci
  tenant_id: tenant_acme
  name: "GitHub CI Bot"
  is_human: false
  auth:
    type: api_key
    api_key: "vance_sk_..."       # encrypted
  email: null
  teams: [team_engineering]
  permissions:
    - project: proj_vance_dev
      role: editor
  created_by: acc_mike            # Which human created this account
  created_at: 2026-04-23
```

### Why one model instead of two

- **Same Permissions Logic** — no special cases for "Service Account can do X but User can do Y"
- **Same Credential Logic** — Jira token works the same, whether human or bot
- **Same API** — `GET /api/accounts` returns everything, `?is_human=false` filters for bots
- **One Code Path** — aligns with the principle "everything is a client, everything has a Session"

### Differences via the flag

| Aspect | `is_human: true` | `is_human: false` |
|--------|-----------------|-------------------|
| Login | OAuth2 / Password | API-Key |
| Chat Capability | Yes | No (no human to respond) |
| Approval Capability | Yes (inline) | No (Tasks are blocked, Notification to creator) |
| Can create other Accounts | Yes (if Admin) | No |
| Has `created_by` | No (self-registered) | Yes (a human created it) |
| Notifications | Push, Email | Webhook-Callback, or to `created_by` |

---

## 2. Every Client Logs In

No anonymous access. Every client — whether CLI, Desktop, Cron, Webhook, or Robot — authenticates against an Account.

```
Client connects
  → Handshake with Auth-Token
  → Brain resolves: which Account?
  → Session is created with account_id
  → Credentials of this Account become available
```

| Client Type | Auth Method | Account Type |
|-----------|-------------|-------------|
| CLI | OAuth2 Flow → JWT | Human |
| Desktop | OAuth2 Flow → JWT | Human |
| Mobile | OAuth2 Flow → JWT | Human |
| Web UI | OAuth2 Flow → JWT | Human |
| Cron | Internal Token, `runs_as` Account | Human or Service |
| Webhook | Shared Secret, configured Account | Human or Service |
| Brain Linker | Internal System-Token | System (Tenant-Level) |
| External Robot | API-Key | Service-Account |

---

## 3. Credentials per Account

Each Account has its own Credentials for external services:

```yaml
# MongoDB Collection: credentials
credential:
  id: cred_001
  account_id: acc_mike            # belongs to this Account
  tenant_id: tenant_acme
  service: jira
  auth_type: oauth2
  data:                           # ENCRYPTED
    access_token: "enc:..."
    refresh_token: "enc:..."
    expires_at: 2026-05-23T10:00:00
  scopes: ["read", "write"]
  status: active                  # active | expired | revoked
  created_at: 2026-04-23
  last_used: 2026-04-23T14:00:00
```

### Credential Resolution

When the Brain needs a Credential, it searches along the chain:

```
1. Account of the current Session User → personal Credential
2. Team-Level Credential (shared within the team)
3. Tenant-Level Credential (organization-wide)
4. Nothing? → Task blocked, Notification
```

Team and Tenant Credentials are Credentials tied to a special Account (e.g., `acc_team_nlp` or `acc_tenant_acme_shared`), not to an individual human.

---

## 4. Cron Jobs Belong to an Account

```yaml
cron_job:
  id: cron_eng12_daily
  schedule: "0 9 * * *"
  scope:
    project_id: proj_5
    thinkProcessId: tp_12
  runs_as: acc_mike               # This Account's Credentials will be used
  action: process_continue
  constraints:
    max_tasks: 3
  created_by: acc_mike
```

What happens:
1. Scheduler fires
2. System Client connects **as acc_mike**
3. Session is created with `account_id: acc_mike`
4. Brain has access to Mike's Credentials
5. Tasks can use Mike's Jira token, Google Drive, etc.
6. Run-Log documents: "Cron cron_eng12_daily, runs_as acc_mike"

If Mike wants to delegate the Cron Job to his Service Account:
```yaml
  runs_as: acc_github_ci          # Service Account's Credentials instead of Mike's
```

---

## 5. Webhooks Belong to an Account

```yaml
webhook:
  id: wh_gdrive_new_paper
  runs_as: acc_mike               # or acc_github_ci
  secret: "vault://..."
  action: ...
```

Same logic: the Webhook runs under the configured Account, using its Credentials.

---

## 6. Credential Management

### For Humans (CLI / Desktop / Web)

```
vance integrations list
  jira         active    last used: 2h ago
  google_drive active    last used: 1d ago
  slack        expired   needs refresh

vance integrations connect jira
  → Opens OAuth flow in browser
  → Token is stored on the Account

vance integrations revoke jira
  → Token is deleted
  → Warning: "3 Cron Jobs use this Credential"
```

### For Service Accounts

Service Accounts receive Credentials manually:

```
vance accounts create-service "GitHub CI Bot" --team engineering
  → Account created, API-Key generated

vance accounts add-credential acc_github_ci --service jira --type api_key
  → Enter API-Key
  → Stored encrypted
```

Alternatively: Service Account inherits Team/Tenant Credentials and does not need its own.

### OAuth Tools — Implemented Status

The OAuth integration of external tools (Slack, Atlassian/Jira, Google
Workspace, GitHub, arbitrary OIDC providers) follows a
**three-layer model**:

1. **Provider-Config** (Bean type + Endpoints + Scopes + `clientId`)
   is stored as a YAML document `oauth/<providerId>.yaml` in the
   `_tenant` Project. Tenant Admin maintains it via the Web UI
   ("OAuth Providers") or directly on the document.
2. **Client-Secret** (the OAuth app secret at the provider) is stored as a
   Tenant-`PASSWORD`-Setting `oauth.<providerId>.client_secret`,
   AES-256-GCM-encrypted. **Never** in the YAML body.
3. **User-Tokens** (Access + Refresh + Metadata) are stored per
   `(tenant, user, providerId)` as User-`PASSWORD`-Settings under
   `oauth.<providerId>.*`. Users manage them themselves via the Web UI
   ("Connected Accounts") through the browser OAuth dance.

**Bean Architecture:** An `OAuthProvider` interface (`typeId`,
`buildAuthorizeUri`, `exchangeCode`, `refresh`) plus three Bean types
that cover the spectrum — `OidcProvider` (discovery-driven,
covers Keycloak/Okta/Auth0/Microsoft/Google), `GenericOAuth2Provider`
(standard RFC-6749 with manual endpoints, for GitHub and generic
SaaS) plus quirk subclasses per provider with non-standard responses
(Slack v2, Atlassian-`cloud_id`, Google's
`access_type=offline`).

**Auto-Refresh:** Tool-Configs reference the Access-Token via
`{{secret:user:oauth.<providerId>.access_token}}`. The
`SettingsSecretResolver` routes this variant through the
`OAuthTokenRefresher`, which reads `expires_at` and refreshes the token 60s before
expiration. A per-`(tenant, user, providerId)`-lock prevents
parallel Tool-Calls from triggering multiple refreshes (Slack
invalidates the old Refresh-Token after use — a race condition
would cause all subsequent calls to 401). Refresh-Failure → specific
`OAuthExpiredException` with a "User must reconnect" signal.

**What is not included:** Tenant-Scope-Tokens (Service-Account-Bot
for the entire company) remain the classic API-Key model from §3.
Per-Tenant-OAuth-Apps with deployment-wide defaults are a future iteration.
Multi-Account per Provider per User (private Slack + work Slack)
is also a future iteration.

**Implementation Documentation:** [`readme/tool-oauth.md`](../../readme/tool-oauth.md)
with an end-to-end example (register Slack app → Provider-Config →
User-Connect → Tool-Call with Auto-Refresh).
**Planning Documentation:** [`planning/tool-oauth.md`](../../planning/tool-oauth.md)
with architectural decisions, sequence of steps, effort.

---

## 7. Encryption

All Credential data is encrypted at-rest. The Brain decrypts only at the moment of the Tool-Call.

| Option | Effort | Security |
|--------|---------|-----------|
| AES-256, Key from Environment | Low | Good for v1 |
| HashiCorp Vault | Medium | Better, Key Rotation |
| MongoDB CSFLE | Medium | Field-level Encryption |
| AWS KMS / GCP KMS | Medium | Cloud-native, Audit-Trail |

**v1:** AES-256 with Environment Key. Later Vault integration.

---

## 8. Account Lifecycle

```
Human:
  1. User registers (or is invited)
  2. Account created: is_human=true
  3. User connects Integrations (OAuth-Flows)
  4. User may create Service Accounts
  5. User creates Cron Jobs (runs_as: own Account or Service Account)

Service:
  1. Human creates Service Account: is_human=false
  2. API-Key is generated
  3. Credentials are added manually (or inherits Team/Tenant)
  4. External Robot uses API-Key to connect
```

### Deleting an Account

```
Human is deactivated:
  → All Sessions are closed
  → All Cron Jobs where runs_as=this_account are paused
  → Credentials are revoked
  → Projects/Think Processes remain (ownership can be transferred)
  → Warning: "5 Cron Jobs and 2 Webhooks are affected"

Service Account is deleted:
  → Same logic
  → created_by User is notified
```

---

## 9. Summary

```
Account (is_human flag)
  ├── has Credentials (Jira, Google, Slack, ...)
  ├── has Permissions (Projects, Roles)
  ├── has Cron Jobs (runs_as: this Account)
  ├── has Webhooks (runs_as: this Account)
  └── Clients log in as this Account

Session
  └→ references an Account
       └→ Brain uses Credentials of this Account

One model. One code path. No special cases.
```

---

*See also: [multi-user-collaboration](multi-user-collaboration.md) | [mcp-tool-routing](mcp-tool-routing.md) | [execution-modes-trigger](execution-modes-trigger.md) | [client-protokoll-erweiterbarkeit](client-protokoll-erweiterbarkeit.md)*
