---
title: "Password Security — Hashing, Policy & Brute-Force Protection"
parent: Specs
permalink: /specs/password-security
---

<!-- AUTO-GENERATED from specification/public/en/password-security.md — do not edit here. -->

---
# Password Security — Hashing, Policy & Brute-Force Protection

> Vancetope authenticates local user accounts via a password stored as a
> **BCrypt hash** (Cost 12) in `UserDocument.passwordHash`. This foundation is
> surrounded by three layers of governance: a **global password policy**
> (minimum length, byte upper limit, blacklist of common passwords), a
> **temporary brute-force lockout** (Mongo-based, auto-unlock), and a
> **self-service password change** in the profile. All password setting paths
> run through **one** central policy choke point.
>
> **Guiding Principle:** simple, yet secure. Length beats complexity (NIST-aligned, no
> enforced character classes); cryptography is encapsulated and
> swappable in one place; lockout state is business state in MongoDB (**not** Redis).
> The policy is a global minimum standard in code — not a per-Tenant setting.
>
> **Scope Delimitation:** This describes **local password authentication**.
> **Authorization** (who can do what) is covered in
> [`permission-system.md`](/specs/permission-system); external secrets (`&#123;{secret:…}}`,
> Vault) in [`vault-access.md`](/specs/vault-access). SSO (e.g., Google) and 2FA are
> **not** implemented but are provisioned in the data model (§8).
>
> Status: Policy, uniform BCrypt cost, brute-force lockout (Brain-Login +
> WebDAV) and self-service change built and tested (Unit + `@Tag("it")`-E2E
> `PasswordPolicyLockoutE2ETest`).

## 1. Hashing — `PasswordService`

`de.mhus.vance.shared.password.PasswordService` (`vance-shared`) is the **only**
place that hashes and verifies account passwords.

- **Algorithm:** BCrypt with salt (embedded in the hash string), work factor
  `BCRYPT_COST = 12`, uniform across all tenants. No caller instantiates its
  own `BCryptPasswordEncoder` — anus and Setup Wizard also hash via
  this service. Old hashes with an older cost continue to verify (the cost
  is embedded in the stored hash).
- **API:** `hash(plaintext)` → salted hash; `verify(plaintext, hash)` → boolean.
- **Timing Side-Channel / User Enumeration:** `verifyDecoy(plaintext)` performs a
  full BCrypt comparison against an internal decoy hash and discards
  the result. Any error path that would otherwise short-circuit **before** the
  actual `verify` (unknown user, inactive, no hash, locked) calls `verifyDecoy`
  — thus, the response latency for "user does not exist" is indistinguishable
  from "wrong password". Consistently applied in Brain-Login **and** WebDAV-Login.

The algorithm is encapsulated: a later change (e.g., Argon2) would only require
a modification in `PasswordService`.

## 2. Policy — `PasswordPolicyService`

`de.mhus.vance.shared.password.PasswordPolicyService` (`vance-shared`) enforces a
**global, hardcoded** minimum standard (deliberately **not** a per-Tenant setting form
— a minimum standard, not a Tenant authentication configuration). NIST-aligned:

| Rule | Value | Rationale |
|-------|------|-----------|
| Minimum length | **10 characters** | Length > complexity |
| Maximum (hard, UTF-8) | **72 bytes** → reject | BCrypt silently truncates at 72 bytes; longer passwords would be unknowingly weakened |
| Blacklist | bundled common password list, **case-insensitive** | blocks common/leaked passwords that pass the length rule (`password123` etc.) |
| Character classes | **none** enforced | enforced classes are counterproductive according to NIST |

`validate(plaintext)` returns normally on success and otherwise throws
`PasswordPolicyException` with a **user-facing** English message (exactly one
failed rule). The blacklist (`common-passwords.txt`, Classpath resource)
is loaded into a `HashSet` once at startup.

## 3. Brute-Force Lockout

Failed attempt counters and temporary locks are stored as fields on `UserDocument`
(§7) and are managed **atomically** via `MongoTemplate` in `UserService`
(data sovereignty). **No Redis** — lockout is persistent business state, not
ephemeral live state.

| Parameter | Value |
|-----------|------|
| Threshold | **5** consecutive failed attempts |
| Lockout duration | **15 minutes**, then **auto-unlock** (no admin action required) |

- `recordFailedLogin(tenant, name)` — increments `failedLoginAttempts` (`$inc` +
  `lastFailedLoginAt`); if the counter reaches the threshold, `lockedUntil = now +
  15min` is set **and the counter is reset to 0** (fresh window after
  expiration).
- `resetLoginFailures(tenant, name)` — zeroes counter + `lockedUntil` on
  successful login (guarded in the happy path to keep the normal case write-free)
  and on every password change.
- `isLocked(user)` — pure check `lockedUntil != null && now < lockedUntil`.

**Enforcement:** Both password login surfaces check `isLocked` before `verify`
(including `verifyDecoy` + uniform 401/Reject, so a locked account is
indistinguishable from a wrong password) and count failed attempts:
`AccessController` (JWT mint, only the password path — the refresh token path is
excluded, as it's not a guessing attack) and `VanceWebDavSecurityManager`
(Basic-Auth for WebDAV).

## 4. Setting Paths — One Policy Choke Point

Every path that sets a password calls `PasswordPolicyService.validate` **before**
`PasswordService.hash`:

| Path | Endpoint / Command | Module |
|------|--------------------|-------|
| Admin: Create user | `POST /brain/{tenant}/admin/users` | `UserAdminController` (`vance-brain`) |
| Admin: Set password | `PUT /brain/{tenant}/admin/users/{name}/password` | `UserAdminController` |
| Self-Service (§5) | `PUT /brain/{tenant}/profile/password` | `ProfileController` |
| Operator Shell | anus `user create` / `user set-password` | `UserCommands` (`vance-anus`) |
| Initial Setup | Admin password step | `SetupWizard` (`vance-anus`) |

A policy violation on REST paths results in **HTTP 400** with the
policy message; in the anus shell, it results in an error message (re-prompt). A
**null/empty** password during creation creates a passwordless account (SSO-only,
§8) — the policy only applies when a password is set.

`UserService.setPasswordHash(tenant, name, hash)` is the only store point:
it stamps `passwordChangedAt` and **deletes the lockout state** (a fresh
password restarts the error window). The plaintext is never logged.

**Bootstrap Exception:** `BootstrapBrainService` (Acme demo seed) hashes directly via
`PasswordService` (Cost 12), but **bypasses the policy** — it's a seed path,
not user input. The demo seed passwords are intentionally short (tied to QA fixtures)
and only active behind `vance.bootstrap.acme`.

## 5. Self-Service Password Change

`PUT /brain/{tenant}/profile/password` (`ProfileController`) — the subject is the
authenticated user from the JWT, **not** a path parameter: one can only
change their **own** password. Body `ProfilePasswordRequest{currentPassword,
newPassword}`:

1. `currentPassword` is verified against the stored hash (incorrect → 400;
   a passwordless/SSO-only account cannot use this flow).
2. `newPassword` is validated against the policy (violation → 400).
3. `setPasswordHash` stores the new hash (+ `passwordChangedAt` + lockout reset).

Admin-driven resets continue to use the `/admin/users/{name}/password`
path (Action.ADMIN). Web-UI: a dedicated **Security** tab in `profile.html`
(current + new + repeat, client-side pre-check + server-side
policy message); `users.html` displays the server 400 message in the set-password dialog.

## 6. Login Flow (Order of Gates)

`POST /brain/{tenant}/access/{username}` (`AccessController.createToken`),
password path — every rejection is a uniform **401** without a body, the reason only
in Audit/DEBUG:

1. Exactly one of Password / Refresh Token (otherwise 401).
2. User exists → otherwise `verifyDecoy` + 401.
3. `status == ACTIVE` → otherwise `verifyDecoy` + 401.
4. `loginEnabled` (Service Accounts / manually locked) → otherwise `verifyDecoy` + 401.
5. **Lockout** (`isLocked`, §3) → otherwise `verifyDecoy` + 401 (`reason=locked`).
6. Hash present → otherwise `verifyDecoy` + 401.
7. `verify` → incorrect: `recordFailedLogin` + 401; correct: if counter is not empty
   `resetLoginFailures`, then issue JWT (+ optional Refresh Token).

Existing tokens remain valid until expiration — JWT verification (filter)
consults neither `loginEnabled` nor the lockout; only the mint endpoints do.

## 7. Data Model — `UserDocument`

Relevant fields (`de.mhus.vance.shared.user.UserDocument`, Collection `users`):

| Field | Type | Meaning |
|------|-----|-----------|
| `passwordHash` | `@Nullable String` | BCrypt hash; `null` = no local password (SSO-only, §8) |
| `failedLoginAttempts` | `int` | consecutive failed attempts since last success |
| `lockedUntil` | `@Nullable Instant` | in the future ⇒ locked (auto-unlock afterwards) |
| `lastFailedLoginAt` | `@Nullable Instant` | timestamp of the last failed attempt (diagnosis) |
| `passwordChangedAt` | `@Nullable Instant` | last password change; tracked, not enforced today |

The lockout fields are deliberately named **login-generic** (not
`passwordFailed*`), so that a later 2FA failed attempt can share the same counter.

## 8. Forward-Compatibility (SSO / 2FA — Not in Scope)

Goal v1: simple, secure password authentication. SSO (e.g., Google) and 2FA will come later;
the data model decisions do not preclude this:

- **Password is not the only credential.** `passwordHash == null` already means
  "no local password" today (login handles the null hash cleanly).
  Policy/Lockout do **not** assume every user has a password — a
  later SSO-only account remains valid.
- **Lockout fields are login-generic** → 2FA failed attempts share the counter.
- **SSO/2FA config is per-Tenant** and will later be stored as settings on the
  Tenant's `_vance` Project, under the reserved namespaces
  **`auth.sso.*`** and **`auth.mfa.*`** (not currently occupied). The global
  password policy remains orthogonal to this.
- **UserDocument grows additively** (`mfaSecret`/`mfaEnabled`/`recoveryCodes`,
  `externalIdp`/`ssoSubject` as new optional fields, no migration) — therefore
  **no** "auth type" enum now, which would need to be refactored later.
- The self-service `/profile/password` remains purely password-related; 2FA enrollment
  will get its own endpoints under `/profile/mfa/*`.

## 9. What Password Security Does NOT Do (v1)

- No password **expiration** / no enforced rotation (`passwordChangedAt` is
  only tracked).
- No **reuse prevention** / password history.
- No **tenant-configurable** policy (deliberately a global minimum standard in code).
- No Redis for lockout (persistent state → MongoDB).
- The anus operator credential (`vance.anus.access.password-hash`) is a
  separate surface (not a Tenant user) and not covered here.

## Reference

- [`permission-system.md`](/specs/permission-system) — Authorization (who can do what)
- [`vault-access.md`](/specs/vault-access) — External secrets (`&#123;{secret:…}}` / Vault)
- [`audit-system.md`](/specs/audit-system) — `authLoginFailure`/`authLoginSuccess` trail
- [`architektur-scopes-clients.md`](/specs/architektur-scopes-clients) — Tenant/User/Session model
