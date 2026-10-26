# OAuth Server

> Vance as an OAuth 2.1 Authorization Server for its own MCP doors and — for its own clients — as a login. Status: **v1 built** (2026-10-14), in parallel with the existing login. Planning and decision history: `../../../../planning/archive/oauth-server.md`.
>
> See also: [integration-tokens.md](integration-tokens.md) (Profiles, Pin, Cut-Rule, Revocation — the OAuth token passes through the same narrowing), [mcp-server.md](mcp-server.md), [mcp-project-access.md](mcp-project-access.md), [trillian-exposure.md](trillian-exposure.md), [permission-system.md](permission-system.md).

## 1. Purpose

The three MCP doors — global `POST /brain/{t}/mcp`, project-specific `POST /brain/{t}/mcp/{project}`, Agents `POST /brain/{t}/agents` — previously only accepted a **statically configured Bearer**: a 24h ACCESS token or a manually minted Integration Token, copied into the client's `mcp.json`. MCP clients (Claude Code, Claude Desktop, Cursor) can log in themselves according to the **MCP Authorization Spec**: enter URL, browser opens, login + consent, done. For this, Vance assumes the role of the Authorization Server.

The same server handles the browser login for its own clients (foot `/login --browser`). The existing login (`POST /access/{user}`, cookies, Integration Tokens) remains **unchanged** alongside it — the transition is intentionally slow.

## 2. What it is not

- **Not a second permission model.** An OAuth token is an authentication method. It passes through the same filter chain, the same narrowing (`scp`/`pid`), and the same `PermissionService` cut as an Integration Token: it can **never do more** than the account behind it.
- **Not an OpenID Provider.** No ID Tokens, no UserInfo. Vance issues tokens for **its own** resources, not identities for third-party systems. The fact that metadata is also located under `openid-configuration` is a discovery convenience (§4.2).
- **Not a Spring Authorization Server.** Vance does not have a Spring Security filter chain; the Spring AS would bring one, has no Mongo store, and multi-tenant issuers with keys from `keystore_keys` would have to be built around it. The scope is small: OAuth 2.1 **only** Authorization Code + PKCE S256 + Refresh. No Implicit, no Password Grant, no Client Credentials.
- **Not the OAuth *Client*.** Vance as a client for Google/Slack/Atlassian is located under `/brain/{t}/oauth-client/…` (formerly `/oauth/…`, hard moved — callback URLs at providers had to be re-entered).

## 3. Core Decisions

### 3.1 Issuer per Tenant, from configuration only

```
issuer = {vance.web.public-base-url}/brain/{tenant}
```

The signing keys are already per Tenant (ES256), the Tenant check in the filter remains unchanged. The issuer is formed **exclusively** from `vance.web.public-base-url`, never from `Host`/`X-Forwarded-*`: a client compares the issuer of the metadata with the URL from which it retrieved it, and the token audience with the resource it requested — a value derived from request headers would be what the last hop claims. If the property is not an absolute http(s) URL, the server is **off**: endpoints respond 404/503, log ERROR.

### 3.2 The Door Determines the Narrowing

The client specifies the door as `resource` (RFC 8707). This determines the Profile and Pin — not a freely chosen Scope string:

| `resource` | `scp` | `pid` | OAuth-`scope` |
|---|---|---|---|
| `{issuer}/mcp` | `mcp` | — | `mcp` |
| `{issuer}/mcp/{project}` | `mcp-project` | `{project}` | `mcp-project` |
| `{issuer}/agents` | `agents` | — | `agents` |
| — | (none) | — | `account` |

A provided `scope` must match the door (`offline_access` is tolerated), otherwise `invalid_scope`. Scheme and host are compared case-insensitively, a trailing slash is ignored, otherwise exact. A Grant applies to **exactly one** door.

**Profile `mcp`** is new (`McpGlobalScopeProfile`, Surface `POST|GET /mcp`, `requiresProject() = false`): previously, the global door only knew the full ACCESS token. This profile is also available for Integration Tokens — the global door thus has a long-lived, narrowed credential for the first time.

### 3.3 `account` only for First-Party Clients

Without `resource`, a token is created **without** `scp`/`pid` — equivalent to the ACCESS token, including WebSocket. This is exclusively for hard-coded clients (currently `vancetope-foot`). A self-registered client that does not specify a door receives `invalid_target`: otherwise, any program could obtain full account access via a consent click.

### 3.4 Consent: Third-Party Clients once, First-Party on every login

Third-party clients (DCR, CIMD) receive the consent page **once per (User, Client, Door)**; after that, grant reuse applies (§5.3).

First-party clients receive it **on every login**, with their own text ("Log in Vancetope CLI on this computer?", hint about full account access). Reason: the first-party client fetches the `account` scope to a loopback address with an arbitrary port. Without prompting, a link to `/authorize?client_id=vancetope-foot&redirect_uri=http://127.0.0.1:<port>/callback` with its own PKCE challenge would suffice, and the logged-in browser would deliver a full-access code to any local process listening on that port (RFC 8252 §8.6). Each first-party login also creates its **own Grant** — multiple foot installations of a user do not interfere with each other (rotation, `/logout`), and each appears individually in "Apps with Access".

The consent page is the protection against one-click theft: without prompting, a link to `/authorize` with the `client_id` of a client registered by the attacker (own redirect URI) would suffice, and the logged-in browser would silently deliver the code to the attacker. The page therefore shows **who** is asking (name — for DCR explicitly as "self-chosen, unverified", for CIMD with the full `client_id` URL, because on shared hosts like `github.io` the domain alone does not identify anyone) and **where** the code goes (redirect host, verified). For loopback redirects, it warns (any program on the computer could listen there) — both are required by the MCP spec.

Against clickjacking: Login and consent pages must not be embedded (`frame-ancestors 'none'`, `X-Frame-Options: DENY` in face-nginx and in the Vite dev server), and "Allow" only becomes active when the page is visible and focused and has been displayed for ~1 s; loss of focus re-disables the button (double-clickjacking via a pop-up slipped underneath).

(No cookie banner: Vance only sets technically necessary cookies. "Consent" here means authorization.)

## 4. Endpoints

### 4.1 Overview

Under `/brain/{t}/oauth/`:

| Route | Purpose | Auth |
|---|---|---|
| `GET resource/{mcp, mcp/{p}, agents}` | Protected Resource Metadata (RFC 9728) | public |
| `POST register` | Dynamic Client Registration (RFC 7591) | public, budget |
| `GET authorize` | Authorization Endpoint | reads login session itself |
| `GET authorize/resume/{id}` | Return after login | reads login session itself |
| `GET authorize/request/{id}` | Consent page: what is requested | Login |
| `POST authorize/consent` | Consent decision | Login + Ticket |
| `POST token` | `authorization_code` / `refresh_token` | Code+PKCE or Refresh Token |
| `POST revoke` | RFC 7009 | Token itself |
| `GET grants`, `DELETE grants/{id}` | "Apps with Access" | Login |

"Login" means: a **full** account credential (ACCESS token or cookie, or OAuth-`account`). A narrowed token can neither consent nor list Grants.

### 4.2 Discovery Chain

1. Request to a door without a valid token → `401` with `WWW-Authenticate: Bearer resource_metadata="{issuer}/oauth/resource{door}", scope="{scope}"`. Only the three doors carry the header; any other 401 remains bare.
2. Protected Resource Metadata: `resource` (canonical door URL), `authorization_servers: [issuer]`, `scopes_supported`, `bearer_methods_supported: [header]`. Also under `/.well-known/oauth-protected-resource/brain/{t}/{door}`.
3. Authorization Server Metadata — the same document content under all three locations that an MCP client tries for an issuer with a path:
   `/.well-known/oauth-authorization-server/brain/{t}` (RFC 8414 path insertion), `/.well-known/openid-configuration/brain/{t}`, `/brain/{t}/.well-known/openid-configuration`.
   Content: Endpoints, `response_types_supported: [code]`, `grant_types_supported: [authorization_code, refresh_token]`, **`code_challenge_methods_supported: [S256]`** (if this field is missing, an MCP client aborts), `token_endpoint_auth_methods_supported: [none]`, `client_id_metadata_document_supported`, `authorization_response_iss_parameter_supported: true`.

The two root variants require a gateway that forwards `/.well-known/{oauth-authorization-server,oauth-protected-resource,openid-configuration}/…` to the Brain — configured in the face image (`deployment/docker/face/nginx.conf`) and in the Vite dev proxy. The nginx route is anchored at both ends and only allows the discovery paths (tenant/project segment without `.`/`..`/`;`) — otherwise, a prefix match would forward arbitrary paths like `…/..;/actuator` to the Brain. The third variant runs over the usual `/brain` route and works without gateway changes; the MCP spec requires clients to try all three.

### 4.3 Authorize Flow

1. `GET /authorize?response_type=code&client_id&redirect_uri&state&code_challenge&code_challenge_method=S256&resource[&scope]`.
2. **Until client and redirect URI are verified**, errors go to an error page, never as a redirect — otherwise, an open redirect to an unverified URI. After that, errors go as `error=…&error_description=…&state&iss` to the client.
3. `state` is limited to 1024 characters (otherwise `invalid_request`, without `state` in the callback). Validated → **Pending Request** (`oauth_server_requests`, TTL 10 min). Everything to which the code is later bound (client, exact redirect URI, PKCE challenge, resource, narrowing) is now fixed; the browser only carries the request ID.
4. No login session → `302 {base}/login.html?tenant={t}&next=/brain/{t}/oauth/authorize/resume/{id}`. `login.html` already knew `next` (same-origin, relative); `tenant` is new: it pre-fills the tenant and prevents a live session of a **different** tenant from skipping the form — otherwise, the browser would oscillate between login and endpoint.
5. Logged in → Request is **bound** to the user (the first one wins; a forwarded link does not become consent for a second person).
6. Third-party with a live Grant of the same user for the same client and the same door → Request is atomically adopted, immediate code. Otherwise (and always for first-party) → `302 {base}/oauth-consent.html?tenant={t}&request={id}`.
7. Each view of the consent page issues a **new Consent Ticket**; only its hash is stored, only the last one is valid.
8. Consent POST with Request ID + Ticket (CSRF protection in addition to `SameSite=Lax`). The request is **atomically adopted** (`findAndRemove` on ticket hash) when decided — a double POST receives 404 instead of a second code. Upon consent, the **Door Gate** (§6) checks — no Grant without access. Then Grant (Audit **WARN**), Code, redirect `redirect_uri?code&state&iss`.

Errors in client resolution (CIMD retrieval, unknown client) show a generic error page ("client could not be verified"), the cause is only in the log — distinguishing "does not resolve" / "no public address" would be a DNS oracle into the internal network. If the server is off, `/authorize` responds before the tenant is looked up.

Every redirect to the client carries **`iss`** (RFC 9207) so that the client can distinguish a response from this server from a mix-up response.

### 4.4 Token Endpoint

- `authorization_code`: `code`, `redirect_uri` (exactly as in the request), `client_id`, `code_verifier` (43–128 characters, `S256` must match), optional `resource` (must be the door of the Grant). **Verify first, then consume**: the code is read, client, redirect URI, and PKCE are checked, and only then is it atomically stamped (`usedAt`). Anyone who does not meet the binding consumes nothing — otherwise, anyone who reads a code (local listener on loopback redirect) could "burn" it without a verifier and thus revoke a long-lived Grant. A second redemption of a consumed code **by a caller who meets the binding** is a **replay** and revokes the Grant (OAuth 2.1 §4.1.3). Code lifetime 60 s.
- `refresh_token`: `refresh_token`, `client_id`, optional `resource`. `resource` and account status are checked **before** rotation — a rejected request leaves the presented token valid (otherwise, a refresh with a wrong `resource` would make the token a replay candidate). Rotation (§5.2).
- A duplicate form parameter is `invalid_request`. Every `invalid_grant` carries the same description; details ("issued to another client", "already used") are only in the log.
- Response: `access_token`, `token_type: Bearer`, `expires_in`, `refresh_token`, `scope`; always `Cache-Control: no-store`.
- With every issuance, it is checked that the account is still active and allowed to log in (`status ACTIVE`, `loginEnabled`) — a locked user loses their Grants on the next refresh, not only after a year.

### 4.5 Registration

**DCR** (RFC 7591): public clients only (`token_endpoint_auth_method: none`, no secret — PKCE is the binding), `grant_types ⊆ {authorization_code, refresh_token}`, 1–10 redirect URIs, each `https://…` or `http://` on loopback, without fragment and user info and **not on its own origin** (`vance.web.public-base-url` — otherwise the consent page would show a trustworthy-looking redirect host; also applies to CIMD, and **again during Authorize**: a loopback registration fits any port, on a server running on loopback itself (Dev), thus also on its own). `client_name` is sanitized (control, bidi, zero-width, private-use characters removed, whitespace collapsed, max 120 characters; also applies to CIMD). The endpoint is open and therefore fenced: budget **per client address (5/h)** below the upper limit per tenant and pod (60/h; both configurable: `vance.oauth-server.registrations-per-address-per-hour` / `…-per-tenant-per-hour`) — otherwise, 60 anonymous requests would block any real registration for an hour. The client address is determined from `X-Forwarded-For` only along internal proxies (from right, up to the first public address, IP literals only) — a prepended entry does not shift the counter; `server.forward-headers-strategy` is deliberately off because it would globally change `getRemoteAddr()` (loopback check from SCRIPT_RUN). Field length limits, and registrations without use for 30 days and without a live (not revoked, not expired) Grant are cleaned up (`OAuthClientCleanup`). "Use" is a code issuance or a code exchange — an anonymous `/authorize` call does not keep a registration alive. A registration grants nothing.

In MCP Spec Revision 2026-07-28, DCR is **deprecated** in favor of CIMD, but remains for existing clients.

**CIMD** (Client ID Metadata Documents): `client_id` is an HTTPS URL to a JSON hosted by the client manufacturer. The Brain fetches it during Authorize — the **only** place where the Brain retrieves a user-chosen URL, therefore fenced (SSRF): HTTPS on default port, path mandatory; **every** address to which the host resolves must be public — IPv4 via a blocklist (0/8, 10/8, 100.64/10, 127/8, 169.254/16, 172.16/12, 192.0.0/24, 192.0.2/24, 192.88.99/24, 192.168/16, 198.18/15, 198.51.100/24, 203.0.113/24, everything from 224), IPv6 via an **allowlist** (`2000::/3` without Teredo/ORCHID `2001::/23`, `2001:db8::/32`, 6to4 `2002::/16`, `3fff::/20`) — this excludes IPv4-mapped/-compatible, NAT64, ULA, link-local, Multicast; the cluster `10.42.…` is unreachable. No system proxy (otherwise the proxy would resolve and bypass the check), no redirects.

The retrieval is fenced against exhaustion because it runs before every login: **hard total deadline 5 s** for header **and** body (a server that sends headers and then remains silent would otherwise hold a request thread indefinitely), size limit 64 KB already during streaming, maximum 8 concurrent retrievals per pod (the next one is immediately rejected, not queued), failures negatively cached for 60 s; both caches are size-limited (positive 1,000 entries / 10 min, negative 10,000 / 60 s). All retrieval errors have a uniform message; document parse errors remain specific. The document must name itself (`client_id` = URL), carry a `client_name` and acceptable redirect URIs. Remaining gap: DNS rebinding between check and connection — the response is only parsed as client metadata and never returned, keeping it away from a read primitive. Can be disabled: `vance.oauth-server.client-metadata-documents-enabled`.

**First-Party** (`OAuthClientResolver.FIRST_PARTY`): hard-coded, not registrable — they are the only ones allowed `account`, so their redirect URIs cannot be anything a third party chooses. `vancetope-foot`: `http://127.0.0.1/callback`, `http://[::1]/callback` — IP literals, no `localhost` (RFC 8252 §8.3: `localhost` can point elsewhere via resolver/hosts file). Third-party clients may continue to register `localhost` (Claude Code, among others, use it).

**Redirect Matching** is exact, with the one exception from RFC 8252 §7.3: for loopback, the port does not count (a CLI binds a free port per login). Path and query count.

## 5. Grant and Tokens

### 5.1 Grant

`oauth_server_grants` (`OAuthServerGrantDocument`): the consent record — `grantId`, Tenant, User, Client (+ name snapshot), Resource, Scope, `scp`, `pid`, timestamp, `revokedAt`/`revokeReason`, hash of the live Refresh Token and a capped history (20) of replaced ones, sliding and absolute end. **No TTL index**: an expired or revoked Grant remains visible in the owner's list.

The row is the **revocation channel** for all tokens of the Grant — the same role as `integration_tokens`. Every write operation is single-field `$set`, conditionally for race conditions, never a `save()` of a read copy (otherwise, an outdated writeback would silently set `revokedAt` to `null`).

### 5.2 Tokens

**Access Token**: JWT, `TokenType.OAUTH` (`tt=oauth`), ES256 with the Tenant key, lifetime 1 h. Claims `sub`, `tid`, `jti` = Grant ID, `cid` = Client, for doors additionally `scp`, `pid` and `aud` = canonical door URL.

**Refresh Token**: opaque, `{grantId}.{256 Bit Random}`, in the DB only as SHA-256. **Rotating** (required for public clients by the MCP spec): each refresh issues a new one and remembers the replaced ones (the last 20). If a **replaced** one is presented again, a copy exists — the entire Grant is revoked (`refresh-replay`). Rotation is conditional on the currently live hash; two simultaneous refreshes with the same token do not both win. A new code exchange starts a **new branch** (the old token is then considered replaced, not a replay).

Lifetimes: Access 1 h, Refresh 30 days sliding, Grant absolute 365 days — same for all scopes, configurable (`vance.oauth-server.access-token-ttl-seconds`, `…refresh-token-ttl-days`, `…grant-max-lifetime-days`).

### 5.3 Reuse

Only for third-party clients (first-party: §3.4). An `/authorize` for the same combination (User, Client, Resource) with a live Grant does not show consent again, but issues a new code for the existing Grant. The Door Gate is **re-queried** in this process — the config may have changed since then.

### 5.4 Revocation and Liveness

- Unknown or revoked Grant ID → Token dead; identity (Tenant, User) and Pin of the claims are cross-checked against the row (project rename stops the token, as with Integration Tokens). Additionally, the account must be active and allowed to log in — a locked user also loses their Access Token within the cache window, not only on refresh. The temporary brute-force lock is deliberately **not** counted (otherwise, anyone could disable third-party tokens via failed logins).
- Cache of the liveness decision: `vance.oauth-server.liveness-cache-ttl-seconds` (default 30) = revocation latency on other pods. Key is the full claim set (Grant, Tenant, User, Pin), not just the Grant ID.
- Revocation by the owner (`DELETE grants/{id}`, foreign ID → 404), by the client (`POST revoke` with Access or Refresh Token; `client_id` must match if specified — for both token types; always responds 200), or automatically: Code/Refresh replay, Project Rename/Delete (`project-renamed`/`project-deleted`), **Password Change** (`password-changed`, all Grants of the user — `UserPasswordChangedEvent`).
- Every actual revocation is audited (`auth.oauth-grant.revoke` with reason, actor = owner), replays additionally as `auth.oauth-grant.replay` (WARN) — they are an indication of theft — and published `OAuthGrantRevokedEvent`.
- **Consequences of revocation**: Open WebSockets of an `account` Grant are closed — immediately on the pod that revoked, otherwise by a sweep (`vance.oauth-server.ws-grant-sweep-interval`, default 60 s) plus cache window. Integration Tokens minted with an `account` OAuth token carry `parentGrantId` and are revoked with the Grant (Audit `auth.integration-token.revoke`); a mere **expiration** of the Grant leaves them alive.

## 6. Filters and Door Gates

**Filter** (`BrainAccessFilter` → `OAuthAccessTokenAuthService`):

- **Narrowed OAuth Token**: same structure check as an Integration Token (`NarrowedCredentialCheck`: profile exists, Pin present where required, **no Pin for a profile without project reference** (`mcp`, `agents` — there the Pin would not reach tool execution), WS upgrade blocked, Surface covers method+path), **plus Audience**: `aud` must be the canonical URL of exactly the door addressed by the request. Then Liveness.
- **`account` Token**: full credential like ACCESS, plus Liveness.
- `SecurityContextFactory` narrows tokens with `pid` to their project (`restrictedUser`), like INTEGRATION and SCRIPT_RUN. The global door `/mcp` additionally rejects any credential with `pid` itself (403).
- Outside of `/brain/{tenant}/`, only ACCESS authenticates — INTEGRATION, OAUTH, and SCRIPT_RUN are rejected there (fail-closed for future routes without tenant).
- The WebSocket handshake (`VanceHandshakeInterceptor`) performs its own check: only full account credentials without `pid` (ACCESS via Header/Query/Cookie, OAuth-`account` with `jti`), otherwise 403 — the block is not solely dependent on the filter regex.
- Where `== TokenType.ACCESS` previously meant "may create credentials" (Integration Token minting), `VanceJwtClaims.isFullAccountCredential()` now decides — a narrowed token still may not mint anything.

**Door Gates** — checked during consent (no Grant without access) **and** with every call:

| Door | Gate |
|---|---|
| `/mcp/{project}` | READ on the project **and** an entry in `_vance/config/mcp-access.yaml` that allows the OAuth caller |
| `/mcp` | an entry in `_vance/config/mcp-global-access.yaml` of the `_tenant` project |
| `/agents` | READ on the tenant; which Trillian responds is decided by `exposure.yaml` (`allowedCounterparts` is already user-based and applies unchanged) |

### 6.1 `mcp-access.yaml` — Extension

Who an entry allows is now described by three filters, all of which **must** match (`McpCallerFilter`, together with §6.2):

```yaml
default: deny
access:
  - name: claude-code-mike
    oauth: true              # OAuth Grants only
    users: [mike]            # this account only (empty = any)
    mode: rw
    paths: ["spec/"]
  - name: extension
    token: "<integration-token-id>"
    mode: ro
  - name: everyone-read
    mode: ro                 # no filter: any caller, including OAuth
  - name: no-oauth
    oauth: false             # all except OAuth Grants
    mode: ro
```

`token` with `oauth: true` matches no one and is a load error (file considered corrupt → deny). Likewise, a written but invalid filter: a non-empty `users` list without a valid entry (`[~]`, `[42]`, `[""]`), an empty `users` string, a `token` that is not a non-empty string — otherwise the entry would silently open for everyone. Only a missing key or explicitly `users: []` means "everyone". `users` also affects Integration Tokens. Entries without filters have always applied "to any authenticated caller" — this includes OAuth Grants. Details: [mcp-project-access.md](mcp-project-access.md) §3.

### 6.2 `mcp-global-access.yaml` — New

The global door is possible via OAuth (and via Integration Token with profile `mcp`), but **who** may use it this way is determined by the Tenant Admin:

```yaml
# _tenant: _vance/config/mcp-global-access.yaml
default: deny
access:
  - name: mike-claude
    oauth: true
    users: [mike]
  - name: ci-bot
    token: "<integration-token-id>"
```

Same filter grammar, but **no** `mode`/`paths` (load error) — behind the global door is the full tool catalog under the account's Grants, not a document surface. Separate file, only in `_tenant`: `mcp-access.yaml` is read via cascade and is the fallback for project doors in `_tenant`; a block for the global door within it would be invisible in every project with its own file. Under `_vance/` → writing requires ADMIN. **Fail-closed**: without a file, no narrowed credential passes through the global door. The full login token (ACCESS) is not affected.

## 7. User Interfaces

- **Consent Page** `oauth-consent.html` (single page): client name with origin hint (CIMD: full `client_id` URL), door, acting account, redirect host, loopback warning, Allow/Deny; for first-party, a separate text (§3.4). Not embeddable, "Allow" delayed and focus-bound (§3.4). If the browser is logged in to a different tenant, it offers login to the correct one.
- **"Apps with access to your account"** on `connected-accounts.html`, under outgoing accounts: OAuth Grants **and** Integration Tokens in a list with revocation — for the user, it's the same question ("what else can act as me?"). The missing central token list from [integration-tokens.md](integration-tokens.md) §8 is thus present.
- **foot** `/login --browser [project]`: Discovery via `{httpBase}/brain/{t}/.well-known/openid-configuration`, loopback listener on free port, PKCE, `state` and `iss` check, Scope `account`. `access.yaml` contains `authMethod: oauth` and the endpoints; the connect cascade then refreshes at the Token Endpoint instead of `/access/{user}`, a rejection leads back to `/login --browser`. `/login` with password remains unchanged.
  - **Discovery is not blindly trusted**: the `issuer` must be exactly `{httpBase}/brain/{t}`, all endpoints http(s), without user info, within the origin of `httpBase` and through the same transport rule (`TransportGuard`) as `httpBase` — otherwise, Refresh Token and Verifier would go to a host named by the discovery response, and the browser opener would open `file://`/UNC paths.
  - **Listener**: explicitly binds to `127.0.0.1`, accepts only `GET /callback`; a request with wrong or missing `state` receives 400 and the login continues to wait (until timeout) — a foreign local request does not abort it. `iss` is mandatory.
  - **Refresh under file lock** (`access.yaml.lock`, JVM lock + `FileChannel.lock`): after the lock, `access.yaml` is re-read and a token that has become fresh in the meantime is adopted — two foot processes on the same file would otherwise rotate against each other and trigger replay revocation. Writing is atomic (temp file 0600 + `ATOMIC_MOVE`). The `.gitignore` entry is `.vancetope/access.yaml*` (covers the lock file).
  - A new login revokes the replaced OAuth login (best effort) — each login has its own Grant (§3.4).
  - `/logout` revokes the Grant on the server; if the server does not confirm this, foot warns visibly and refers to "Apps with Access".

## 8. Maintenance

- `oauth_server_grants`: User handler OWNED, Order 400 (next to Integration Tokens — an orphaned credential is a live secret); Project handler Order 100, Delete = Revoke (`project-deleted`), **Rename revokes** (`project-renamed`) — both via the Grant Service, thus with audit and event.
- `oauth_server_requests`, `oauth_server_codes`: TTL-indexed; User handler OWNED; Requests additionally Project handler.
- `oauth_server_clients`: no user/project reference; cleanup via the 30-day rule.

## 9. Limitations and Future Work

- **Web UI and Desktop** continue to log in via `POST /access/{user}` + Cookies. Converting them to OAuth clients is circular as long as the login page itself belongs to the Web UI; whether password login will be abolished is open and a separate decision.
- **Client Credentials** for autonomous agents without humans ([trillian-exposure.md](trillian-exposure.md) §4) — requires confidential clients and an account model for the agent.
- **Device Flow** for foot over SSH/headless.
- **WebSocket for narrowed tokens** — only necessary if a narrowed door requires WS.
- **Project Pin on the global door** is rejected instead of being passed through to tool execution (`ToolDispatcher` does not know a restricted `SecurityContext`). A pinned global credential would require exactly that.
- No `insufficient_scope`-403: a token that misses its door receives the 401 with challenge.

## 10. Reference

- `vance-shared/oauthserver`: `OAuthServerClient*`, `OAuthServerGrant*`, `OAuthServerAuthRequest*`, `OAuthServerCode*`, `OAuthServerAuthorizationService`, `OAuthSecrets`, Data handlers.
- `vance-shared/jwt`: `TokenType.OAUTH`, `VanceJwtClaims.oauth(…)` (`aud`, `cid`), `isFullAccountCredential()`, `JwtService.createOAuthAccessToken`.
- `vance-brain/oauthserver`: `OAuthServerSettings`, `OAuthDoor(s)`, `OAuthClientResolver`, `ClientMetadataDocumentResolver`, `RedirectUris`, `OAuthAuthorizationFlow`, `OAuthTokenService`, `OAuthDoorGate`, `OAuthAccessTokenAuthService`, `OAuthClientNames`, `ClientAddresses`, Controller (`OAuthDiscoveryController`, `OAuthRegistrationController`, `OAuthAuthorizeController`, `OAuthTokenController`, `OAuthGrantController`), `OAuthClientCleanup`.
- `vance-brain/access`: `NarrowedCredentialCheck`, `BrainAccessFilter.unauthorizedChallenge`.
- `vance-brain/ws`: `OAuthWebSocketRevocationService`, `VanceHandshakeInterceptor`.
- `vance-shared`: `OAuthGrantRevokedEvent`, `OAuthServerPasswordChangeListener`, `UserPasswordChangedEvent`, `IntegrationTokenGrantRevocationListener`.
- `vance-brain/mcpserver`: `McpCaller`, `McpCallerFilter`, `McpGlobalScopeProfile`, `McpGlobalAccess{Config,Service}`.
- face: `oauth-consent.html`, `connected-accounts/ConnectedAppsSection.vue`, `@vance/shared` `rest/oauthServer.ts`.
- foot: `OAuthBrowserLogin`, `OAuthClient`/`HttpOAuthClient`, `FootAuthService.loginWithBrowser`.
- E2E: `qa/ai-test` `OAuthServerE2ETest`.
