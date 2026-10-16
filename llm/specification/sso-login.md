# SSO Login — Sign-in with Google

> Sign-in to Vancetope with an external OpenID Connect account, v1 Google.
> Two ways: **Workspace domain** (the domain of the address belongs to a Tenant,
> checked via `hd`) and **private Gmail accounts** (individually enabled in
> Tenants that the operator opens for this purpose). Afterwards, Vance issues the same
> credentials as the password login.
>
> Related: [`oauth-server.md`](oauth-server.md) (Vance as
> Authorization Server; `login.html` as login page also for foot
> `/login --browser`), [`permission-system.md`](permission-system.md),
> [`user-maintenance.md`](user-maintenance.md),
> [`vault-access.md`](vault-access.md).

## 1. Scope

- **No replacement for password login.** `POST /brain/{t}/access/{user}` remains
  unchanged for all non-SSO accounts.
- **Identity only, no permissions.** SSO answers "who is this"; permissions,
  Teams, Projects come from Vance (`PermissionResolver`). No adoption of
  Google groups.
- **No SAML, no SCIM.** v1 knows exactly one provider type: `google`.
- **Not the OAuth client of the connectors** (`brain/oauth/`). This retrieves
  API tokens and does not check an ID token; here, ID token validation is the core.

## 2. Configuration

One file for the entire installation: Tenant `_vance`, Project `_tenant`,
path `_vance/config/sso.yaml` (`SsoConfigService`, cache 30 s, invalidation
via the document change event on all Pods).

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
    clientSecret: "{{secret:tenant:sso.google.clientSecret}}"
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

- `clientSecret` only as `{{secret:…}}` reference, never plaintext. Resolved in
  the system Tenant via `SecretResolver.resolveForConnector` (PASSWORD setting
  in the `_tenant` Project of `_vance`), at each callback, never cached.
- `tenant` must exist and be active, never `_vance`.
- A domain that appears multiple times is dropped entirely — no one wins.
- `gmail.com`/`googlemail.com` under `domains` is an error: these domains
  belong to everyone; private accounts only run via `consumerAccounts`.
- `allow` contains local parts, no patterns. An existing but empty
  list is an error, not "all".
- **Unknown keys are errors.** A mistyped key would otherwise
  be a missing one — and a missing `allow` means "entire domain": `alow:`
  would silently open a domain. A provider, domain, or
  `consumerAccounts` entry with an unknown key is dropped; an
  unknown key at the top level is reported (nothing can expand access there,
  the rest is read). `autoCreate` must be a Boolean.
- Provider keys only `[a-z0-9-]+` — they are path segments of the callback,
  and the `BrainAccessFilter` opens exactly this form (the same constant,
  `SsoConfigParser.PROVIDER_KEY_REGEX`). `google_ws` is dropped instead of
  having an unreachable callback.

On the Google side, **one** OAuth client (type *Web application*) is sufficient for the
installation; Redirect URI is `<vance.web.public-base-url>/brain/_sso/google/callback`.
If `vance.web.public-base-url` is not set, SSO is off.

## 3. Flow

All endpoints are under `/brain/_sso/` — without Tenant in the path, open
(exception in `BrainAccessFilter`), budgeted per client address
(`vance.sso.requests-per-address`, default 60 per 10 min) — **separated by
type**: queries (`discover`, `options`), starts and `redeem` each count for
themselves, so that a full NAT address whose queries are exhausted can still
complete ongoing logins. The **callback is not budgeted**: It is unique due to
`state` + State cookie, every live one originates from a budgeted start, and
rejecting it would only discard a login already completed at Google.

| Endpoint | Purpose |
|---|---|
| `GET discover?email=` | Reports only `{sso, provider}` by domain. **Never** names the Tenant (no Tenant enumeration via domains). Always `false` for Gmail addresses — no one reveals whether a Gmail address is enabled anywhere. |
| `GET options?tenant=` | `domains`: there are SSO domains on the installation (login page asks for work address). `sso`: the bound Tenant accepts private Google accounts (button without address). |
| `GET start?email=&tenant=&next=` | Creates the pending request, sets the State cookie, redirects to Google. With `app_redirect` (App), instead first the confirmation page (§8.1). |
| `GET {provider}/callback` | Validates, resolves the account, sets the login cookies, redirects to `next`. For an App start, instead hands over code to the App (§8.1). |
| `POST redeem` | The WebView of an App redeems the handover code with its PKCE verifier and receives cookies + token body as with password login (§8.1). |

### 3.1 Start

1. `next` only as same-origin path (a leading `/`, no `//`, no
   backslash, no control characters — the same rule as `readNextParam` on the
   login page) and as a valid URI reference, as it stands (no
   spaces, `|`, `{`, `"`, broken `%`): It becomes the `Location` of the
   callback, and an unparsable path must be rejected here, not
   after the login is already consumed.
2. **Expected Tenant** from `?tenant=` or from `next` (`/brain/{t}/…`, this
   is how the OAuth resume from foot, MCP, Apps returns).
3. Mode:
   - Address with configured domain → **domain**. If the page points to a
     different Tenant than the domain → rejected (`tenant-mismatch`).
   - otherwise expected Tenant exists, opened for `consumerAccounts`, no or a
     Gmail address → **consumer**.
   - otherwise: no SSO.
4. Pending request in `sso_login_requests` (TTL 10 min): Hash of `state`,
   `nonce`, PKCE verifier, Provider, mode, Domain, expected Tenant, `next`.
5. Browser cookie `vance_sso_state` (HttpOnly, `SameSite=Lax`, path
   `/brain/_sso/`, 10 min) — binds the callback to the browser that
   started it (Login CSRF).
6. Redirect to Google: `response_type=code`, `scope=openid email profile`, PKCE
   S256, `state`, `nonce`, `prompt=select_account`, `login_hint`, in
   domain mode `hd=<domain>` — **only** pre-selection in the account chooser, no protection.

### 3.2 Callback

1. `state` must match the cookie; Pending request **atomically acquire**
   (`findAndRemove`) — a second call finds nothing.
2. Exchange code at the Token Endpoint (TLS, with verifier and Client Secret).
3. Validate ID token (§4.1), then the rule of the mode (§4.2/§4.3).
4. Resolve account (§5).
5. **Same issuance as password login** (`LoginTokenIssuer`, which
   `AccessController` also uses): Home bootstrap, ACCESS + REFRESH, Cookies,
   each with session maximum (§6). Audit `auth.login` with
   `method: sso`, `provider`, `issuer`, `kind` (`domain`/`consumer`).
6. Redirect to `next` (default `/`).

Any rejection leads to `login.html?sso_error=rejected|error` — coarse and
uniform; the reason is in the audit (`auth.sso.rejected`), not in the URL.

## 4. Validation Rules

### 4.1 ID Token (`IdTokenVerifier`)

- Signature against the provider's JWKS (cached according to `Cache-Control`, an
  unknown `kid` triggers a re-fetch at most once per minute).
  This would not be necessary for a token directly from the Token Endpoint (OIDC Core
  §3.1.3.7) — it costs little and holds if the path ever changes.
- `iss` ∈ {`https://accounts.google.com`, `accounts.google.com`} (or the
  configured Issuer, which discovery must confirm). **Always the canonical
  spelling** is stored and searched (`ExternalIdentity.canonicalIssuer`: with
  scheme, without trailing slash) — the Issuer is half of the identity key, two
  spellings would be two identities.
- `aud` contains the Client ID; if multiple audiences or `azp` is set,
  `azp` must be the Client ID.
- `exp` in the future, `iat` not in the future (60 s tolerance).
- `nonce` equals the Pending Request.

### 4.2 Workspace Domain

- `email_verified == true`.
- **`hd` == configured domain**, and the domain of the address is the same.
  This is the actual protection: a private Google account can be created with
  any foreign address (`someone@acme.com`) and then also has
  `email_verified=true` — but no `hd`. Only the Workspace organization of the
  domain sets `hd=acme.com`.
- Expected Tenant (if set) == Tenant of the domain.
- `allow` (if set) contains the local part.

Limitation: For secondary/alias domains of a Workspace, `hd` presumably carries
the primary domain — such addresses will be rejected. Deliberately not solved
until needed.

### 4.3 Private Gmail Accounts

`gmail.com` belongs to everyone, a domain assignment would be wrong. Therefore:

- The Tenant comes **from the entry point**, never from the address; without
  a bound Tenant, no Consumer login.
- Only Tenants in `consumerAccounts.tenants`.
- **`hd` must be missing** (an account with `hd` belongs to the domain path),
  and the address must end in `gmail.com`. An account without `hd` under a
  foreign domain remains rejected — precisely the attack `hd` protects against.
- Only **prepared** accounts, no `autoCreate`, no `allow`.

Only those explicitly enabled by an admin with a full address, in a Tenant
opened by the operator, can enter. Preparing a foreign Gmail address allows
that person into **their** Tenant, no one into a foreign one.

### 4.4 Address Normal Form (`ExternalEmails`)

Lowercase, trimmed. For Gmail additionally: dots in the local part are removed,
`googlemail.com` becomes `gmail.com` (Google puts both spellings in the same
mailbox). Plus addresses (`wile+x@…`) are rejected, not truncated —
otherwise `wile+x` would be a second path to `wile`.

## 5. Account Resolution (`SsoAccountResolver`)

Identity = `(issuer, sub)`, on the account as `UserDocument.externalIdentity`
(unique partial index over `issuer`+`subject`). In this order:

1. **Bound account** with this `(issuer, sub)` → this is the person. If it is
   in a different Tenant than the login → rejected (`tenant-moved`;
   a re-assigned domain is an admin matter, not a silent move).
2. **Prepared account** in the Tenant with `expectedEmail` == normal form of
   the address → atomically bind (`findAndModify` only on still unbound). The name
   of the account does not matter; the admin chose it.
3. Only with `autoCreate` (domain path only): Name from the local part
   (`^[a-z0-9][a-z0-9_.-]*$`, no `_` prefix). If the name is taken **in any
   state** → rejected (`name-taken`), no automatic suffix.
4. Otherwise rejected (`not-prepared`).

New accounts (step 3, and `user sso-prepare` for a missing account)
are created **in one write operation with their identity** — never first without
and then added: a collision with the unique indices would otherwise leave a
passwordless account that the lifecycle listeners have already seen.
It is checked in advance whether `(issuer, sub)` is already bound or the address
is already taken in the Tenant (prepared **or** already bound — the address
remains with the account after binding); an index collision in the race becomes
an `ExternalIdentityException` (anus: "Refused", Login: `identity-taken`), never
a raw `DuplicateKeyException`.

**"Prepared" is an explicit state**, not a side effect:
`externalIdentity` without `subject`, with `expectedEmail` — set only by
`user sso-prepare`. "Has no password" is not enough; passwordless accounts
exist for other reasons (`--no-password`, Service Accounts), and none
of them may be taken over by a login with a matching name. The same
applies to multiple domains per Tenant: `wile@acme.com` and `wile@acme-labs.com`
are two people — step 2 separates them by full address, step 3
only allows the first to get the name.

`ACTIVE` status and `loginEnabled` apply as with password login;
Service Accounts are never SSO-capable.

## 6. No Password, Session Maximum

**An SSO account has no password and cannot get one.**
`UserService.setPasswordHash` refuses (`ExternalIdentityException`; Admin REST
responds 409, anus reports "Refused"). Password login fails as with
incorrect password (no hint "is SSO account"). Thus, no access survives
offboarding via a password.

**No session from password time either.** Preparing an
existing account sets `UserDocument.tokensNotBefore` (and
`passwordChangedAt`): Login tokens whose `iat` is not after this (to the
second, the second itself counts as before) are invalid —

- in `BrainAccessFilter` for ACCESS tokens (`LoginSessionCheck`, account status
  cached per account for 30 s, `vance.access.login-session-cache-ttl-seconds`),
- at each renewal (Refresh Token login, `POST /refresh`) without cache
  (`session-superseded`).

Additionally, an account with `externalIdentity` only renews sessions **with**
`sxp` — a token without a maximum duration does not originate from an SSO login
and must not carry an unlimited refresh chain. `sso-unlink` leaves the floor:
Old password sessions do not return even after unbinding. OAuth grants are
terminated as before by `UserPasswordChangedEvent`. The floor is deliberately a
separate field and not `passwordChangedAt`: Someone who changes their password
in the profile should not be logged out of the session in which they changed it.

**Session maximum.** If someone is blocked at Google, Vance learns nothing
about it. Therefore, every token of an SSO session carries the claim **`sxp`** —
the hard end of the session (login + `maxSessionDays`):

- ACCESS and REFRESH tokens never extend beyond `sxp`.
- Each renewal (Refresh Token login, `POST /refresh`) adopts `sxp`
  unchanged and refuses if it is reached (`session-ended`). After that, a new
  Google login is required.
- An OAuth Grant (foot, MCP, Apps) originating from an SSO session ends
  at the latest with it (`absoluteExpiresAt` = min(Grant duration, `sxp`)).
- If `/oauth/authorize` (or consent) is served with an OAuth token of the
  `account` scope instead of the login cookie, the session end is the
  `absoluteExpiresAt` of **its** Grant (OAuth tokens do not carry `sxp`).
  A Grant from a Grant never outlives its parent Grant — otherwise
  a capped session would be extended via a chain of authorizations.
  An unfindable Grant terminates the session immediately.
- No querying of the Google Admin API, no Google Refresh Token — the
  maximum duration is the visible commitment.
- Immediate lockout: Set account to `DISABLED`.

The maximum duration is fixed at login; a later change of
`maxSessionDays` affects new sessions.

## 7. Administration

anus (`SsoCommands`):

- `sso config show` — the file as it is, and how the Brain reads it
  (Provider, Domains, Gmail Tenants, discarded entries).
- `sso config import -f <file> [--dry-run]` — validates and writes
  `_vance/config/sso.yaml`. If the Brain were to discard even one entry,
  **nothing** is written (fail-closed on loading would otherwise mean: a typo
  silently disables a domain). The Brain adopts the file after 30 s at the latest.
  The Client Secret is stored next to it as a PASSWORD setting in the `_vance` Tenant
  (`setting set-secret -T _vance -s tenant -k <key> -t PASSWORD`).

anus (`UserCommands`):

- `user sso-prepare -T <tenant> -n <name> -e <address>` — the address must belong to
  a domain pointing to this Tenant, or be Gmail if the Tenant is open.
  A missing account is created passwordless; an existing one loses its password,
  all previously issued login tokens become invalid (`tokensNotBefore`, §6),
  its OAuth Grants are revoked (`UserPasswordChangedEvent`). Service Accounts and
  already bound accounts are refused; an address is prepared for at most one
  account per Tenant (unique partial index).
- `user sso-unlink -T <tenant> -n <name>` — removes binding or
  preparation; after that, the account has no access until a password is set
  or it is re-prepared.
- `user show` displays the SSO state.

Audit: `auth.sso.prepared`, `auth.sso.linked`, `auth.sso.user-created`,
`auth.sso.unlinked`, `auth.sso.rejected` (with reason), `auth.login`
(`method: sso`). Brute-force lockout remains a password matter.

Delete/rename account: The binding is on the document and moves with it or
disappears with it; the same `sub` can then be re-bound.

## 8. User Interfaces

- **`login.html`**: Top unchanged Tenant/User/Password. Below, after
  "or": If SSO domains exist, the page asks for the work address and
  offers "Continue with Google". If a Tenant opened for Gmail accounts is
  determined — from `?tenant=` or, if the page was opened without it (App,
  naked `/login.html`), from the Tenant field (typed or remembered) —,
  the button also works without an address. Without
  SSO configuration, the page looks as before.
- **Profile**: SSO accounts see "You sign in with Google (...)" instead of the
  password form.
- **foot**: nothing new — `/login --browser` runs via `login.html`.
- **Native Apps (iOS, Mac)**: §8.1.

### 8.1 Native Apps (facelift iOS, Desktop)

Google blocks OAuth in embedded WebViews, and a login in the
system browser would leave the cookies there. Therefore, login in the App
runs via the system browser and is **handed over** to the WebView:

1. The login page recognizes the bridge `window.vanceFacelift.browserSignIn`.
   It generates a PKCE pair; the verifier remains in the WebView.
2. It calls `browserSignIn(<origin>/brain/_sso/start?…&app_challenge=<S256>)`.
   The wrapper appends `app_redirect` and opens the URL:
   - **iOS:** `ASWebAuthenticationSession` (shares the Safari session —
     existing Google login, Passkeys, Face ID), Redirect
     `vance-facelift://sso-done`; the session delivers it only to the
     calling App.
   - **Desktop (Electron):** Standard browser, Redirect to a briefly
     opened loopback port `http://127.0.0.1:<port>/sso-done` (RFC 8252
     §7.3) — no OS registration, no conflict between installations.
   Both wrappers only accept `/brain/_sso/start` of the page's own origin
   — the bridge is not an "open any URL".
3. The server accepts as `app_redirect` **only** these two forms, and only
   together with an S256 challenge. An App start **never directly** redirects
   to Google, but shows a **confirmation page** (see below): who receives the
   login ("the Vancetope app on this device" or "the Vancetope
   desktop app on this computer (local port N)"), the address, and the warning
   to only proceed if the App is currently waiting for it. "Continue to Google"
   is a simple link to the Google URL; the State cookie is set with the page.
   In the callback, it **does not** set cookies in the system browser, but
   creates a handover code (`sso_handoffs`, one minute, unique, hash only)
   and redirects to `app_redirect?code=…` (rejections to `app_redirect?error=…`,
   so the App closes its browser instead of showing the login page in it).
4. The WebView calls `POST /brain/_sso/redeem {code, verifier}`. If the
   verifier does not match, the code is still consumed — whoever presents it
   without a verifier has intercepted it. The account is checked again (active,
   `loginEnabled`, session end). Result: the same cookies and the same
   token body as with password login, with `sxp` — in the WebView's partition.
   On iOS, the page passes the token to the Share Extension as usual.

An intercepted code (foreign App with the same scheme, listening process on the
loopback port) is worthless without the verifier. Older App versions without a
bridge fall back to the previous navigation (login lands in the system browser).

**Why the confirmation page.** The verifier only protects as long as the
initiator of the login is also the redeemer. However, an attacker can
build a start link with **their** challenge and send it to the victim; if the
victim opens it in the normal browser and logs in, the code lands with the
owner of the redirect on the victim's device — a foreign App that
has registered `vance-facelift://`, or a process on the loopback port — and
they redeem it with the matching verifier. Cryptographically, this is not
distinguishable (initiator and redeemer are both the attacker); only the human
in the browser can distinguish it. Therefore, the page names the recipient
before Google is asked. The rest is bound to this browser: The
Google URL carries a `state` that only the cookie set here redeems — a
link generated elsewhere fails at the callback. The page is static HTML
without script, `Content-Security-Policy: default-src 'none'; frame-ancestors
'none'`, `X-Frame-Options: DENY` (no hidden embedding with injected
click), `Referrer-Policy: no-referrer`. For the App, this means one more tap;
the wrappers remain unchanged (they only open the start URL).

## 9. Later

- Further OIDC Providers (`type: oidc`; Entra with `tid` as counterpart to `hd`).
- A separate client per domain.
- Groups → Teams.
- Secondary domains of a Workspace (`hd` ≠ address domain).
