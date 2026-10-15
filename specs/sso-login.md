---
title: "SSO Login — Sign-in with Google"
parent: Specs
permalink: /specs/sso-login
---

<!-- AUTO-GENERATED from llm/specification/sso-login.md (translated from the German specification/public/sso-login.md) — do not edit here. -->

# SSO Login — Sign-in with Google

> Sign-in to Vancetope using an external OpenID Connect account, v1 Google.
> Two methods: **Workspace domain** (the domain of the address belongs to a Tenant,
> checked via `hd`) and **private Gmail accounts** (individually enabled in
> Tenants that the operator opens for this purpose). Afterwards, Vance issues the same
> credentials as the password login.
>
> Related: [`oauth-server.md`](/specs/oauth-server) (Vance as
> Authorization Server; `login.html` as login page also for foot
> `/login --browser`), [`permission-system.md`](/specs/permission-system),
> [`user-maintenance.md`](/specs/user-maintenance),
> [`vault-access.md`](/specs/vault-access).

## 1. Scope

- **No replacement for password login.** `POST /brain/{t}/access/{user}` remains
  unchanged for all non-SSO accounts.
- **Identity only, no permissions.** SSO answers "who is this"; permissions,
  teams, projects come from Vance (`PermissionResolver`). No adoption of
  Google groups.
- **No SAML, no SCIM.** v1 supports exactly one provider type: `google`.
- **Not the OAuth client of the connectors** (`brain/oauth/`). That retrieves
  API tokens and does not validate an ID token; here, ID token validation is the core.

## 2. Configuration

One file for the entire installation: Tenant `_vance`, Project `_tenant`,
path `_vance/config/sso.yaml` (`SsoConfigService`, cache 30 s, invalidation
via the document change event on all pods).

**Why central:** At login, the Tenant is unknown — the domain of the
address provides it. And which domain belongs to which Tenant is decided
only by the operator: if the assignment were in the Tenant, the admin of any
Tenant could enter `acme.com` and redirect Acme users' logins to
their Tenant. **Write access to `_vance` is therefore equivalent to
"can redirect logins of any Tenant".**

```yaml
providers:
  google:
    type: google                          # only type in v1
    clientId: "1234-abc.apps.googleusercontent.com"
    clientSecret: "&#123;{secret:tenant:sso.google.clientSecret}}"
    # issuer: "http://localhost:7777"     # test seam only (QA fake provider)

domains:                                  # Workspace domains
  - domain: acme.com
    tenant: acme
    provider: google
    autoCreate: false                     # unknown address → create account?
    allow: [wile.coyote, road.runner]     # optional; missing = entire domain
    maxSessionDays: 7                     # optional, default 7, 1–90

consumerAccounts:                         # private Gmail accounts
  provider: google
  tenants: [mhus]
  maxSessionDays: 7
```

Loading is **fail-closed per entry** (`SsoConfigParser`): A defective
provider takes its domains with it, a defective domain entry is dropped
alone, each with an ERROR log. None of this can expand access:

- `clientSecret` only as `&#123;{secret:…}}` reference, never plaintext. Resolved in
  the system Tenant via `SecretResolver.resolveForConnector` (PASSWORD setting
  in the `_tenant` project of `_vance`), on each callback, never cached.
- `tenant` must exist and be active, never `_vance`.
- A domain that appears multiple times is completely dropped — no one wins.
- `gmail.com`/`googlemail.com` under `domains` is an error: these domains
  belong to everyone; private accounts only work via `consumerAccounts`.
- `allow` contains local parts, no patterns. An existing but empty
  list is an error, not "all".

On the Google side, **one** OAuth client (type *Web application*) is sufficient for the
installation; Redirect URI is `<vance.web.public-base-url>/brain/_sso/google/callback`.
If `vance.web.public-base-url` is not set, SSO is disabled.

## 3. Flow

All endpoints are under `/brain/_sso/` — no Tenant in the path, open
(exception in `BrainAccessFilter`), budgeted per client address
(`vance.sso.requests-per-address`, default 60 per 10 min).

| Endpoint | Purpose |
|---|---|
| `GET discover?email=` | Reports only `{sso, provider}` per domain. **Never** names the Tenant (no Tenant enumeration via domains). Always `false` for Gmail addresses — whether a Gmail address is enabled anywhere is not disclosed. |
| `GET options?tenant=` | `domains`: there are SSO domains on the installation (login page asks for work address). `sso`: the bound Tenant accepts private Google accounts (button without address). |
| `GET start?email=&tenant=&next=` | Creates the pending request, sets the state cookie, redirects to Google. |
| `GET {provider}/callback` | Validates, resolves the account, sets the login cookies, redirects to `next`. For an app start, instead, passes a handoff code to the app (§8.1). |
| `POST redeem` | The WebView of an app redeems the handoff code with its PKCE verifier and receives cookies + token body like with password login (§8.1). |

### 3.1 Start

1. `next` only as same-origin path (a leading `/`, no `//`, no
   backslash, no control characters — the same rule as `readNextParam` on the
   login page).
2. **Expected Tenant** from `?tenant=` or from `next` (`/brain/{t}/…`, this
   is how the OAuth resume returns from foot, MCP, Apps).
3. Mode:
   - Address with configured domain → **domain**. If the page points to a
     different Tenant than the domain → rejected (`tenant-mismatch`).
   - Otherwise, expected Tenant exists, opened for `consumerAccounts`, no
     or a Gmail address → **consumer**.
   - Otherwise: no SSO.
4. Pending request in `sso_login_requests` (TTL 10 min): Hash of `state`,
   `nonce`, PKCE verifier, Provider, mode, domain, expected Tenant, `next`.
5. Browser cookie `vance_sso_state` (HttpOnly, `SameSite=Lax`, path
   `/brain/_sso/`, 10 min) — binds the callback to the browser that
   started it (login CSRF).
6. Redirect to Google: `response_type=code`, `scope=openid email profile`, PKCE
   S256, `state`, `nonce`, `prompt=select_account`, `login_hint`, in
   domain mode `hd=<domain>` — **only** pre-selection in the account chooser, no protection.

### 3.2 Callback

1. `state` must match the cookie; pending request **atomically acquire**
   (`findAndRemove`) — a second call finds nothing.
2. Exchange code at the token endpoint (TLS, with verifier and client secret).
3. Validate ID token (§4.1), then apply the mode's rule (§4.2/§4.3).
4. Resolve account (§5).
5. **Same issuance as password login** (`LoginTokenIssuer`, also used by
   `AccessController`): Home bootstrap, ACCESS + REFRESH, cookies,
   each with session maximum (§6). Audit `auth.login` with
   `method: sso`, `provider`, `issuer`, `kind` (`domain`/`consumer`).
6. Redirect to `next` (default `/`).

Any rejection leads to `login.html?sso_error=rejected|error` — coarse and
uniform; the reason is in the audit (`auth.sso.rejected`), not in the URL.

## 4. Validation Rules

### 4.1 ID Token (`IdTokenVerifier`)

- Signature against the provider's JWKS (cached according to `Cache-Control`, an
  unknown `kid` triggers a re-fetch at most once per minute).
  This would not be necessary for a token directly from the token endpoint (OIDC Core
  §3.1.3.7) — it costs little and holds if the path ever changes.
- `iss` ∈ {`https://accounts.google.com`, `accounts.google.com`} (or the
  configured issuer, which discovery must confirm).
- `aud` contains the client ID; if multiple audiences or `azp` is set,
  `azp` must be the client ID.
- `exp` in the future, `iat` not in the future (60 s tolerance).
- `nonce` equals the pending request.

### 4.2 Workspace Domain

- `email_verified == true`.
- **`hd` == configured domain**, and the domain of the address is the same.
  This is the actual protection: a private Google account can be created with
  any foreign address (`someone@acme.com`) and will then also have
  `email_verified=true` — but no `hd`. Only the workspace organization of the
  domain sets `hd=acme.com`.
- Expected Tenant (if set) == Tenant of the domain.
- `allow` (if set) contains the local part.

Limitation: For secondary/alias domains of a Workspace, `hd` presumably contains the
primary domain — such addresses will be rejected. Deliberately not solved until
needed.

### 4.3 Private Gmail Accounts

`gmail.com` belongs to everyone, a domain assignment would be wrong. Therefore:

- The Tenant comes **from the entry point**, never from the address; without
  a bound Tenant, no consumer login.
- Only Tenants in `consumerAccounts.tenants`.
- **`hd` must be missing** (an account with `hd` belongs on the domain path), and the
  address must end in `gmail.com`. An account without `hd` under a foreign domain
  remains rejected — precisely the attack `hd` protects against.
- Only **prepared** accounts, no `autoCreate`, no `allow`.

Only those explicitly enabled by an admin with their full address, in a Tenant
opened by the operator, can gain access. If someone prepares a foreign Gmail address,
they allow that person into **their** Tenant, not into a foreign one.

### 4.4 Address Normal Form (`ExternalEmails`)

Lowercase, trimmed. For Gmail additionally: dots in the local part are removed,
`googlemail.com` becomes `gmail.com` (Google delivers both spellings to the same
mailbox). Plus addresses (`wile+x@…`) are rejected, not truncated —
otherwise `wile+x` would be a second path to `wile`.

## 5. Account Resolution (`SsoAccountResolver`)

Identity = `(issuer, sub)`, on the account as `UserDocument.externalIdentity`
(unique partial index over `issuer`+`subject`). In this order:

1. **Bound account** with this `(issuer, sub)` → this is the person. If it is
   in a different Tenant than the login → rejected (`tenant-moved`;
   a re-assigned domain is an admin matter, not a silent move).
2. **Prepared account** in the Tenant with `expectedEmail` == normal form of the
   address → atomically bind (`findAndModify` only on still unbound). The name
   of the account does not matter; the admin chose it.
3. Only with `autoCreate` (domain path only): Name from the local part
   (`^[a-z0-9][a-z0-9_.-]*$`, no `_` prefix). If the name is taken **in any
   state** → rejected (`name-taken`), no automatic suffix.
4. Otherwise rejected (`not-prepared`).

**"Prepared" is an explicit state**, not a side effect:
`externalIdentity` without `subject`, with `expectedEmail` — set only by
`user sso-prepare`. "Has no password" is not sufficient; passwordless accounts
exist for other reasons (`--no-password`, service accounts), and none of them
may be taken over by a login with a matching name. The same applies to multiple
domains per Tenant: `wile@acme.com` and `wile@acme-labs.com` are two people —
step 2 separates them by full address, step 3 allows only the first to get the name.

`ACTIVE` and `loginEnabled` status apply as with password login;
service accounts are never SSO-enabled.

## 6. No Password, Session Maximum

**An SSO account has no password and cannot get one.**
`UserService.setPasswordHash` refuses (`ExternalIdentityException`; Admin REST
responds 409, anus reports "Refused"). Password login fails as with
incorrect password (no hint "is SSO account"). Thus, no access survives
offboarding via a password.

**Session maximum.** If someone is blocked on Google, Vance does not
learn about it. Therefore, every token of an SSO session carries the claim **`sxp`** —
the hard end of the session (login + `maxSessionDays`):

- ACCESS and REFRESH tokens never extend beyond `sxp`.
- Every renewal (Refresh Token login, `POST /refresh`) adopts `sxp`
  unchanged and refuses if it is reached (`session-ended`). After that,
  a new Google login is required.
- An OAuth Grant (foot, MCP, Apps) arising from an SSO session ends
  at the latest with it (`absoluteExpiresAt` = min(Grant lifetime, `sxp`)).
- No querying of the Google Admin API, no Google Refresh Token — the
  maximum is the visible commitment.
- Immediate lockout: set account to `DISABLED`.

The maximum is fixed at login; a later change to `maxSessionDays` affects new sessions.

## 7. Administration

anus (`SsoCommands`):

- `sso config show` — the file as it is, and how the Brain reads it
  (providers, domains, Gmail Tenants, discarded entries).
- `sso config import -f <file> [--dry-run]` — validates and writes
  `_vance/config/sso.yaml`. If the Brain were to discard even one entry,
  **nothing** is written (fail-closed on loading would otherwise mean: a typo
  silently disables a domain). The Brain adopts the file after 30 s at the latest.
  The client secret is stored separately as a PASSWORD setting in the `_vance` Tenant
  (`setting set-secret -T _vance -s tenant -k <key> -t PASSWORD`).

anus (`UserCommands`):

- `user sso-prepare -T <tenant> -n <name> -e <address>` — the address must belong to
  a domain pointing to this Tenant, or be Gmail for an open Tenant.
  A missing account is created passwordless; an existing one loses its password,
  its OAuth grants are revoked (`UserPasswordChangedEvent`). Service accounts
  and already bound accounts are refused; an address is prepared for at most one
  account per Tenant (unique partial index).
- `user sso-unlink -T <tenant> -n <name>` — removes binding or
  preparation; after that, the account has no access until a password is set
  or it is re-prepared.
- `user show` displays the SSO status.

Audit: `auth.sso.prepared`, `auth.sso.linked`, `auth.sso.user-created`,
`auth.sso.unlinked`, `auth.sso.rejected` (with reason), `auth.login`
(`method: sso`). Brute-force lockout remains a password matter.

Delete/rename account: The binding is on the document and moves with it or
disappears with it; the same `sub` can then be re-bound.

## 8. User Interfaces

- **`login.html`**: Unchanged Tenant/User/Password at the top. Below, after
  "or": If SSO domains exist, the page asks for the work address and
  offers "Continue with Google". If a Tenant opened for Gmail accounts is
  determined — from `?tenant=` or, if the page was opened without it (App,
  naked `/login.html`), from the Tenant field (typed or remembered) —,
  the button also works without an address. Without
  SSO configuration, the page looks as before.
- **Profile**: SSO accounts see "You sign in with Google (...)" instead of the
  password form.
- **foot**: nothing new — `/login --browser` uses `login.html`.
- **Native Apps (iOS, Mac)**: §8.1.

### 8.1 Native Apps (facelift iOS, Desktop)

Google blocks OAuth in embedded WebViews, and a login in the
system browser would leave the cookies there. Therefore, login in the app
occurs via the system browser and is **handed over** to the WebView:

1. The login page recognizes the bridge `window.vanceFacelift.browserSignIn`.
   It generates a PKCE pair; the verifier remains in the WebView.
2. It calls `browserSignIn(<origin>/brain/_sso/start?…&app_challenge=<S256>)`.
   The wrapper appends `app_redirect` and opens the URL:
   - **iOS:** `ASWebAuthenticationSession` (shares the Safari session —
     existing Google login, Passkeys, Face ID), redirect
     `vance-facelift://sso-done`; the session delivers it only to the
     calling app.
   - **Desktop (Electron):** Standard browser, redirect to a briefly
     opened loopback port `http://127.0.0.1:<port>/sso-done` (RFC 8252
     §7.3) — no OS registration, no conflict between installations.
   Both wrappers only accept `/brain/_sso/start` of the page's own origin —
   the bridge is not an "open any URL".
3. The server accepts `app_redirect` **only** these two forms, and only
   together with an S256 challenge. In the callback, it **does not** set
   cookies in the system browser, but creates a handoff code (`sso_handoffs`,
   one minute, single-use, hash only) and redirects to
   `app_redirect?code=…` (rejections to `app_redirect?error=…`, so the app
   closes its browser instead of showing the login page in it).
4. The WebView calls `POST /brain/_sso/redeem {code, verifier}`. If the
   verifier does not match, the code is still consumed — whoever presents it
   without the verifier has intercepted it. The account is checked again (active,
   `loginEnabled`, session end). Result: the same cookies and the same
   token body as with password login, with `sxp` — in the WebView's partition.
   On iOS, the page passes the token to the Share Extension as usual.

An intercepted code (foreign app with the same scheme, listening process on the
loopback port) is worthless without the verifier. Older app versions without the bridge
fall back to the previous navigation (login lands in the system browser).

## 9. Later

- Additional OIDC providers (`type: oidc`; Entra with `tid` as counterpart to `hd`).
- A separate client per domain.
- Groups → Teams.
- Secondary domains of a Workspace (`hd` ≠ address domain).
