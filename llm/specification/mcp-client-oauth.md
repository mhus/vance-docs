# MCP-Client-OAuth — Connect any MCP server via URL

> Vancetope as an **OAuth client** for remote MCP servers: an admin enters
> the URL of an MCP server in the **Server Tools** section of the Settings, a user
> clicks "Log in",
> and the server's tools run in the Brain with their token — similar to
> Claude Code or Cursor. Status: **v1 built** (2026-10-16). Planning:
> `planning/mcp-client-oauth.md`.
>
> See also: [server-tools.md](server-tools.md) (Server Tools as
> documents, `type: mcp_server`), [oauth-server.md](oauth-server.md) (the
> counterpart: Vancetope as an Authorization Server for its own MCP doors),
> [foot-tool-packs.md](foot-tool-packs.md) (local MCP packs of the CLI —
> not subject of this spec).

## 1. Purpose

Hosted MCP servers (Notion, Linear, Atlassian-Remote-MCP, …) require
an OAuth login according to the MCP "Authorization" specification: the client
reads the Protected Resource Metadata (RFC 9728) from the `401`, finds the
Authorization Server (RFC 8414), registers itself there, and sends
the browser to log in. Previously, Vancetope required three manual steps on
three pages — a self-registered OAuth app under "OAuth Providers",
Connect under "Connected Accounts", a Secret Template in the
`parameters`-JSON — and did not work at all with providers without manual
app registration.

**Foot demarcation:** The CLI client brings its own MCP/REST packs with
their own config; their tools arrive as client tools via the
connection. This spec only concerns the Brain's server tools.
`vance-toolpack` only recognizes `auth.type: oauth` as a marker (§3.1) — a
host that does not translate it aborts.

## 2. Configuration — the Tool YAML is the Source

OAuth is another authentication type in the existing `auth` block of an
`mcp_server` tool:

```yaml
# _vance/server-tools/notion.yaml (Project or _tenant)
type: mcp_server
description: "Notion workspace"
parameters:
  transport: http
  url: "https://mcp.notion.com/mcp"
  auth:
    type: oauth
    loginScope: user        # user | project | tenant — whose account (§4)
    scopes: "read write"    # optional; otherwise from Challenge / Metadata
    clientId: "…"           # optional; only for servers without self-registration
    clientSecret: "{{secret:tenant:notion.client_secret}}"   # optional, only with clientId
```

Invalid blocks (unknown `loginScope`, `clientSecret` without
`clientId`, OAuth without `url`) are tool loading errors. For `rest_api`,
`oauth` is a loading error.

## 3. Process

### 3.1 Runtime Translation

The Brain translates `type: oauth` before building the transport config into

```
{ type: bearer, token: "{{secret:mcp-oauth:access_token}}" }
```

(`McpOAuthSettings.effectiveConfig`, constant `BEARER_REFERENCE`). This is
**not** a setting reference: the connection pool attaches an
`McpOAuthBearerResolver` to the HTTP transport of exactly this tool, which
answers this single value on the connector path — with the access token of the
account chosen by the login scope for callers and project, directly from the
`OAuthTokenRefresher` (including refresh and "reconnect" errors). Everything
else is forwarded to the `SettingsSecretResolver`; any other
resolver finds nothing under this name and replaces it with empty. Because the
provider ID is derived from the tool's URL (§3.2) and the resolver
is only attached to this tool's transport, a login's token only goes to
the server for which it was issued — no tool document can direct it to
another URL. The restricted path (`resolve`, scripts, Compose) never receives it.

References in the `oauth.<providerId>.*` namespace are tightly scoped
(`SettingsSecretResolver`, named error `SecretAccessDeniedException`
instead of empty replacement):

- `refresh_token` and `client_secret` are **not** resolvable via **any** reference,
  in any Scope — they belong to the OAuth client stack
  (Login, Refresh), never a header;
- `project:`, `tenant:` and the cascade form `{{secret:oauth.…}}` resolve
  **no** `oauth.*` key at all — not even `access_token`.
  Shared logins are exclusively accessible via the transport of their MCP tool
  (above); the cascade would also end in `_tenant` with the raw
  token of a Tenant login;
- `user:` remains as before (own token with refresh, metadata like
  `cloud_id`) — this is the path for REST tools to personal logins.

### 3.2 Provider ID from the URL

`providerId = mcp-<host>-<hash8(url)>`. Not the tool name: the same
server in multiple projects (or as `_tenant` default plus
project override) shares login, client registration, and tokens. Tokens are
already bound to exactly this URL by `resource`.

### 3.3 Provider Type `mcp` — Created by the Brain

`McpOAuthProvider extends GenericOAuth2Provider` (`typeId = mcp`) only brings
the MCP-specifics: the RFC-8707 parameter `resource` during authorize,
code exchange, and refresh — the canonical `resource` value from the
Protected Resource Metadata (§3.4), fallback MCP URL — and a
public client with PKCE S256. The provider entry `_vance/oauth/<providerId>.yaml`
in `_tenant` is created **on the first login**, not when saving the
tool — saving remains a document write without network:

```yaml
type: mcp
clientId: "…"
authorizeUrl: "…"            # from Authorization Server Metadata
tokenUrl: "…"
scopes: [ … ]
extra:
  mcpUrl: "https://mcp.notion.com/mcp"
  resource: "https://mcp.notion.com/mcp"   # RFC 9728, checked (§3.4)
  issuer: "https://auth.notion.com"        # RFC 8414, checked (§3.4)
  issParameterSupported: false             # RFC 9207, §3.4a
  usePkce: true
  registration: cimd | dcr | manual
  title: "Notion workspace"   # Display in Connected Accounts
  managed: true
  tls:                        # only if the tool has a tls block
    skipVerification: false
    trustedCaPemPath: "/etc/vance/ca.pem"
```

The loader requires `authorizeUrl`, `tokenUrl`, `extra.mcpUrl`, and
`extra.usePkce: true` for `mcp`. Concurrent first logins on a pod
are serialized by a monitor per `(tenant, provider)`. If the last tool
is deleted, the provider **remains** — another project can use the same
server, and a leftover entry is harmless.

**Reuse.** A provider written by the Brain (`managed: true`)
is only used as long as it matches the tool: same `mcpUrl`, `issuer`, and
`resource` present, same `tls` block, for `auth.clientId` same
client ID **and** same (resolved) secret with `registration: manual`,
without `auth.clientId` no manual registration, and — if set on the tool —
same `scopes`. Otherwise, discovery runs again and the document
is overwritten (for DCR with new registration; tokens of the old
client then end in "re-login" on the next refresh). An `mcp` document
not written by the Brain belongs to the operator and is never
replaced.

**TLS.** The tool's `tls` block applies to discovery, registration,
code exchange, and refresh — but only fully on the **origin of the MCP server**.
For any other host (Authorization Server, named by a foreign response), only
`trustedCaPemPath` is adopted, `skipVerification` never (`McpOAuthProvider.endpointTls`).

### 3.4 Discovery and Registration

1. Unauthenticated MCP `initialize` to the URL. `2xx` ⇒ Abort with
   "Server does not require login — `auth.type: none`". `401` ⇒
   Evaluate `WWW-Authenticate`: `resource_metadata`, `scope`.
2. Protected Resource Metadata — from the specified URL, otherwise
   `/.well-known/oauth-protected-resource<path>` and origin root. Without
   `resource` ⇒ Abort. `resource` must **cover** the MCP URL
   (RFC 9728 §3.3): the same URL or a URL on the same origin whose
   path is a whole segment prefix of the MCP path (origin or
   parent path — the MCP spec allows both as canonical server URI);
   compared after normalization of casing, default port, and
   trailing `/`, never with query or fragment. Otherwise ⇒ Abort, the
   metadata is not used. The value is stored as `extra.resource`
   and sent as RFC-8707-`resource`.
3. Authorization Server Metadata (`oauth-authorization-server`,
   fallback `openid-configuration`). The `issuer` of the metadata must exactly
   match the identifier for which it was retrieved (RFC 8414 §3.3; only a
   trailing `/` is tolerated) — if missing or deviating ⇒
   Abort, no silent fallback. The declared `issuer` and
   `authorization_response_iss_parameter_supported` are stored in the
   Provider Document (§3.4a). If `code_challenge_methods_supported` is missing
   or does not name `S256` ⇒ Abort (the MCP spec requires not to
   proceed then).
4. Client Identity, in this order:
   - **manual**, if `auth.clientId` is set (Secret via
     Connector resolution into the Tenant `PASSWORD` setting
     `oauth.<providerId>.client_secret`; resolved in the project that
     defines the tool — there for a project tool, in `_tenant` for a
     `_tenant` or bundled tool, without user);
   - **CIMD**, if the Authorization Server reports
     `client_id_metadata_document_supported` **and** the
     `vance.web.public-base-url` is HTTPS with public addresses:
     `client_id` = `…/brain/{tenant}/oauth-client/client-metadata.json`
     (public, accessible without token);
   - **DCR** (RFC 7591) at the `registration_endpoint` — public client,
     `token_endpoint_auth_method: none`. If the server does provide a secret,
     it is stored as above;
   - otherwise Abort with "Enter client ID on the tool".

**One callback for all `mcp` providers:** `…/oauth-client/_mcp/callback`.
A CIMD document must exactly name its `redirect_uris` and thus does not
change with every new server. The provider comes from the state; each
callback path serves exactly one type of provider (the common one only `mcp`,
the provider-specific one all others).

### 3.4a Mix-up Protection on the Common Callback (RFC 9207)

Multiple Authorization Servers respond on the common path. The state
binds the provider, the provider document its `issuer`. The callback
checks the `iss` parameter before code exchange
(`GenericOAuth2Provider.checkAuthorizationResponseIssuer`):

- `iss` present ⇒ must exactly match `extra.issuer`, otherwise `400`;
- `iss` missing ⇒ only allowed if the server **does not** report
  `authorization_response_iss_parameter_supported`;
- Providers without `extra.issuer` (manually maintained, own callback path)
  are not checked. Older `mcp` documents without `issuer` are
  re-discovered on the next login (§3.3 Reuse).

`returnTo` is checked at start and callback
(`OAuthFlowService.safeReturnPath`): only a simple path of the same
origin — starts with exactly one `/`, no backslash, no control or
whitespace characters, without schema and authority. Anything else ⇒ `/`.

### 3.5 SSRF

The MCP URL is entered by an admin and may — like any server tool —
be internal. Any URL that the Brain learns from a **response**
(`resource_metadata`, `authorization_servers`, endpoints,
`registration_endpoint`) is only retrieved if it is on the origin of the
MCP URL **or** is HTTPS and resolves exclusively to public
addresses (address fence from `ClientMetadataDocumentResolver`). Each
retrieval: a deadline for headers and body (10 s), 64 KB size limit during
streaming, no redirects.

### 3.6 Public Clients in General

Without a secret, a provider is a public client — this applies to any
type, not just `mcp`. `GenericOAuth2Provider` then omits `client_secret`;
init and refresh only require the secret if PKCE is off
(`missesClientSecret`).

## 4. Login Scope — Whose Account

| `loginScope` | Token is stored as `PASSWORD` setting … | May log in |
|---|---|---|
| `user` (Default) | in the user's Hub (`_user_<login>`) | anyone with READ on the project |
| `project` | in the project where the tool is **called** | ADMIN on the project |
| `tenant` | in `_tenant` | ADMIN on the Tenant |

Carried by `OAuthTokenOwner` (`USER`/`PROJECT`/`TENANT`, storage project)
through state, callback, `OAuthTokenStore`, refresher, and
`OAuthDisconnectedEvent`. A tool defined in `_tenant` with
`loginScope: project` requires a login per project — there is
**no** fallback to a Tenant token; those who want an account for all
use `tenant`. In `_tenant` itself, there is no project account (its
storage project is that of the Tenant account): a project login there is
rejected (`400` at the login endpoints, the tool is skipped in the catalog,
the admin list shows it without a login button), and
`{{secret:project:oauth.…}}` resolves to empty there. For `project`/`tenant`, all users act under the
logged-in account; the provider does not see who triggered the action
in the Brain. Connections of a project login are additionally
keyed per project in the pool.

Existing providers (Slack, Google, …) only know `USER` — their behavior
is unchanged.

**Logout** deletes all `oauth.<providerId>.*` settings of the account —
tokens, expiration, scopes, flat claims — **except**
`oauth.<providerId>.client_secret`: for the Tenant account, the
client secret is in the same namespace on `_tenant` and belongs to the
client registration, not the login. For the same reason, the
flat claim projection of a token response never writes the reserved
keys (`access_token`, `refresh_token`, `expires_at`, `scopes`,
`extra`, `client_secret`).

**Refresh across Pods.** Shared accounts are used by all pods; if the
Authorization Server rotates refresh tokens, it treats a second redemption
of the old one as a replay and revokes the entire grant. The
refresher therefore uses a cluster claim in Mongo (`oauth_refresh_claims`,
`OAuthRefreshClaimService`, Insert = acquisition, Holder-checked deletion = release,
takeover after 30 s, TTL index cleans up after one hour) in addition to the monitor per pod.
Whoever does not get the claim waits and re-reads the token — the fresh one
from the holder — instead of refreshing themselves; even after acquisition,
it is re-read first. No Redis (optional, only for live features). The
resource lease system does not fit here: it is a quota funnel with
handler types and revocation, not a mutex. The claims clean themselves up
and do not need a maintenance handler.

## 5. Without Login

If the account's token is missing, the factory provides **no** tools
(`ToolPackUnavailableException`): the registry skips the pack without
WARN and caches nothing, so it is available after login in the next turn.
A logout or a new shared login (`OAuthDisconnectedEvent`) clears
the tenant's tool list caches and closes the affected
MCP connections. No `NOTIFY`, no automatic scope upgrade —
`insufficient_scope` means "re-login".

## 6. User Interfaces

**Settings section "Server Tools"** (kind `vance-server-tool`,
[settings-panel.md](settings-panel.md) §3.1 — replaced `tools.html`; the
form is the child view, thus also in the Cortex tab of the same document):

- **Add** creates a disabled MCP server (name, then URL and
  auth type in the form); any other type is selected in the form.
- MCP servers have a **form** instead of the raw `parameters`-JSON
  with everything `McpConfig` knows (Transport HTTP/stdio, URL or Command,
  cwd, env, Auth none/OAuth/Bearer/API-Key/Basic, Login Scope, Scopes,
  Client ID/-Secret, TLS, Timeouts, `defaultArgs`, Lease) and a
  JSON toggle; unknowns are preserved.
- The open entry shows the **login status** of the account chosen by the
  scope, with **Log in / Re-login / Log out**, provided the
  caller is allowed for this scope. `returnTo` is the open view plus
  `mcpLogin=1`; the view acknowledges the return and removes the parameter.
  Login and test act on the **saved** state.
- **Test connection:** `initialize` + `tools/list` as caller;
  toggles per tool write `disabledSubTools`. Without login, the test
  shows the discovery findings (Issuer, registration type, Scopes), without
  registering anything.

**Connected Accounts** lists `mcp` providers with their title; there,
any user can log in for servers with personal login, once the
provider exists (usually after the admin's first login).

## 7. Endpoints

| Method + Path | Purpose |
|---|---|
| `POST /brain/{t}/oauth-client/mcp/prepare?project&tool` | Ensure provider (discovery + registration for the first time), return login status. Errors as `502` with plaintext |
| `POST /brain/{t}/oauth-client/mcp/init?project&tool&returnTo` | Ensure provider and start code flow for the login scope's account; response `ServerToolOAuthStartDto` (`authorizationUrl`), the UI navigates there. Deliberately **not** a navigable `GET`: the start has side effects (discovery, registration, provider document in `_tenant`) and must not be triggerable cross-site via the SameSite=Lax session cookie |
| `DELETE /brain/{t}/oauth-client/mcp/connection?project&tool` | Remove account login |
| `GET /brain/{t}/oauth-client/_mcp/callback` | Common callback for all `mcp` providers (`OAuthController`); checks `iss` (§3.4a) |
| `GET /brain/{t}/oauth-client/client-metadata.json` | Client ID Metadata Document, public |
| `POST /brain/{t}/admin/projects/{p}/server-tools/{name}/test` | Connection test (ADMIN on project) |

`ServerToolDto.oauth` (`providerId`, `loginScope`, `status`
`CONNECTED|NOT_CONNECTED|EXPIRED`, `canConnect`) carries the status to the
admin list.

## 8. Code Locations

- `vance-brain/oauth`: `McpOAuthProvider`, `OAuthTokenOwner`,
  `OAuthTokenStore`, `OAuthFlowService`, `OAuthController` (common
  callback), `GenericOAuth2Provider` (public clients,
  `decorateTokenParams`, `tlsFor`, `iss` check),
  `OAuthTokenRefresher` + `OAuthRefreshClaimService` (cluster claim).
- `vance-brain/tools/mcp/oauth`: `McpOAuthSettings`,
  `McpAuthDiscoveryClient`, `McpOAuthService`, `McpOAuthController`,
  `McpServerTestService`, `McpOAuthBearerResolver` (Bearer on transport).
- `vance-brain/tools/mcp`: `McpConnectionPool` (attaches the Bearer resolver
  to the HTTP transport), `McpToolPackFactory`.
- `vance-api`: `ServerToolOAuthStartDto` (response from `mcp/init`).
- `vance-toolpack`: `AuthSpec.Type.OAUTH`, `McpConfig.withAuth`.
- Web-UI: `kindViews/ServerToolFormView.vue`, `kindViews/McpServerForm.vue`,
  `kindViews/mcpServerParams.ts`, `kindViews/serverToolSettingsProvider.ts`,
  `composables/useAdminServerTools.ts` (`login` → `POST mcp/init`).
- E2E: `qa/ai-test/.../McpClientOAuthE2ETest` against `FakeMcpOAuthServer`
  (MCP server + Authorization Server with DCR, PKCE and `resource` check).
