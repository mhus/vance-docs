# Integration Tokens

> Long-lived, narrowed credentials for external integrations — browser extension, script, webhook consumer. Status: **v1 built**, browser verification pending.

## 1. Purpose

An external integration needs credentials that are **not** the full credentials of its human user. A browser plugin that adds links to a list should be able to add links to a list — and nothing else. It keeps its credentials for months on a device that is not the server.

This brings together three requirements that otherwise conflict:

1. **Long-lived** — nobody types a password into an extension monthly.
2. **Narrow** — the credentials must only access the surface area of the integration.
3. **Revocable** — precisely *because* they are long-lived and stored off-premises.

The existing `ACCESS` token only fails (1), and the `REFRESH` token only fails (2) and (3). `INTEGRATION` is the fourth token type that fulfills all three simultaneously.

## 2. What it is not

**Not a second authorization path.** An Integration Token is an **authentication method**, not a reason to bypass credential requirements. There is no `/public/` namespace, no endpoint that checks its own key, and no controller that behaves differently for this case than usual. The token passes through the same filter chain, sets the same three request attributes as a JWT, and lands in the same `SecurityContext`.

The reason is mechanical, not aesthetic: `SecurityContextFactory.fromRequest` **throws** if the attributes are missing. A controller behind an open prefix therefore cannot call `authority.enforce(request, …)` — it would have to invent its authorization outside the permission system, and the same resource would have two doors with different locks. Whoever had the key would have rights not listed in any grant.

**Not a second secret.** A JWT with `jti` plus a registry entry *is* the combination of a signed token and a revocable key. The signed part carries the claims, the entry carries the liveness. Two credentials in an extension would be two attack surfaces for one property.

**No API key exchange for short-lived tokens.** The design (`REFRESH`-like: long-lived key mints 15-minute tokens) was considered and rejected. Its only advantage is a signature-based hot path without a DB lookup — an optimization without load for an integration with a handful of requests per day. The cost would be worse revocation (the exchanged token lives until expiration and cannot be killed), refresh logic in the client, and the question of how the Scope survives the exchange.

## 3. The Two Narrowings

A token carries two restrictions, and both are necessary because each alone leaves a hole.

### 3.1 Scope Profiles (`scp`) — which surface area

A **name**, not a path list. It is resolved at **check time** against the beans in the running process.

This is the fundamental decision of this system. These tokens are by definition long-lived; a path list baked in at mint time is a permission decision that freezes on that day, while URLs continue to evolve. Specifically in this tree: `POST`, `PATCH`, and `DELETE` on `/addon/links/entry` are **the same path**. If someone splits this, a year-old token would grant too much or too little — without error, without a trace.

The price is that you cannot tell what a token is allowed to do just by looking at it. The profile registry answers this, with the current truth.

A profile is a **ceiling**, never a permission.

**`scp` is a list** because a third-party tool regularly does more than one thing — a browser extension that remembers links *and* imports pages needs two capabilities and should still only be set up once.

The alternative would have been to merge the surface areas into *one* profile. Then someone would have to declare a profile that names routes of two foreign modules — and a profile describes an **integration**, not an app. As a list, each profile stays with its owner, and the union is the human's decision at minting.

This does not break §4: the union of two ceilings remains capped by the account's grants and the project pin. The rule states that the token cannot do more than the account — not that it may only have one capability.

Two rules during checking: **an unknown profile kills the token** (it was issued to carry a capability that this Brain no longer has; silently serving the rest answers a different question), and **if any carried profile requires a project, the token needs one** — the alternative would be to decide the pin per hit route, then "is this token pinned?" would depend on which endpoint it is currently calling.

### 3.2 Project Pin (`pid`) — which segment

The surface area alone does not limit the **target**. `POST /addon/links/entry?projectId=…` takes the project as a query parameter — a token narrowed only by surface area could write to the Links app of *any* project. That would be the same breadth, just shifted.

Therefore, the token additionally carries the project, and `PermissionService` cuts against it — against the resource that the endpoint **actually touched**, not against a parameter whose name the filter would have to guess.

A profile that does not require a project must explicitly state this (`requiresProject()`); the default is `true`, because a token that has forgotten which project reaches all.

## 4. Intersection, never Union

> **The security property:** an Integration Token can **never do more** than the account behind it — only less.

Enforced in `PermissionService.check`, at the same place that already guards "exactly one provider, otherwise boot fail". The `PermissionResolver`-SPI does **not even see** the narrowing — no provider, not even an EE governor, can accidentally widen a narrowed context.

Three subtleties, all with a test:

- **The narrowing is checked before the system trust shortcut.** `WriteReason.SYSTEM` means "this write operation is policy-legitimate", not "this caller may write to another project". Scope is answered before policy, otherwise the system branch would carry a narrowed token out of its project.
- **Resources without a project are rejected** — Tenant, User, Team, Inbox-Item, tenant-scoped Setting. Fail-closed, because "we cannot classify" must not be read as "it's okay": otherwise, every new `Resource` type would silently widen every already issued token.
- **The `switch` is exhaustive over the sealed `Resource`.** A new type breaks compilation exactly here — the moment when it must be decided whether it carries a project.

## 5. Revocation

A JWT is self-contained: once signed, it is valid until expiration, and there is no way back. The registry entry (`integration_tokens`, key `jti`) is the way back.

- **Unknown `jti` is considered revoked.** Covers both: a mint that died between signing and writing, and a manually deleted entry.
- **Every write operation on the entry touches exactly one field** (`$set` via `MongoTemplate`), never a `save()` of the currently read document. Otherwise, `lastUsedAt` is a lost update on the field that must never lose: request reads the entry, owner revokes, request writes back its outdated copy — and `revokedAt` is silently `null` again, permanently. Revocation is conditional on `revokedAt is null`, which structurally keeps the original timestamp instead of via read-then-write.
- **The project pin is cross-checked**, just like Tenant and User: the signature proves that the claims are ours, the comparison proves that they were minted *for this entry*. This is where a **project rename** stops the token instead of silently redirecting it — a signed claim cannot follow a rename. Without the check, a token whose project was renamed would point to the **new** project that inherits the old name. The maintenance handler additionally stamps `revokedAt` during a rename, so the owner's list also reflects this.
- **The entry is written before the token.** The error case is then an entry without a token (harmless, appears in the list) instead of a token without an entry.
- **No TTL index.** An expired entry remains — it is what the owner sees in "my tokens".
- **The token itself is never stored.** It appears exactly once, in the mint response. An interface that can display credentials again is a second place from which they can leak.

### 5.1 The Cache TTL *is* the Revocation Latency

The liveness check is cached (`vance.integration-token.cache-ttl-seconds`, default 30). This is the conscious trade-off: without a cache, every request costs a Mongo read; with an unlimited cache, a revoked token continues to work.

Crucially, **who sets the number**: the latency is an operator's configuration, not a property of a token issued a year ago. On the pod that revokes, it takes effect immediately (local eviction); other pods notice it within the window. A cross-pod invalidation channel is deliberately **not** built — a channel that can silently fail makes the barrier less reliable, not more.

`lastUsedAt` is written from the same cache miss, so at most once per window. It is the only thing that ever reveals a leaked or forgotten token.

## 6. Minting

`POST /brain/{tenant}/integration-tokens` — **only for oneself** and **only with an `ACCESS` token**.

The second condition is more important: a narrowed credential must not generate credentials, otherwise it would escape its own restrictions profile by profile. The same rule from which `AccessController.refreshToken` only accepts `ACCESS`.

Additionally, the mint requires `WRITE` on the pinned project. The intersection from §4 would make an overly broad token ineffective anyway — but a token that logs in and then loses every call is a bad thing to pass around. Better to reject at the moment of error.

| Route | |
|---|---|
| `GET …/integration-tokens/profiles` | What this Brain offers — source for the mint form |
| `GET …/integration-tokens` | Own tokens (never with value) |
| `POST …/integration-tokens` | Mint; response carries the token **once** |
| `DELETE …/integration-tokens/{tokenId}` | Revoke |

Lifetime: Default 90 days, maximum 365. Generous, because revocation is the control and expiration is the safety net — but not unlimited: a credential whose issuance no one remembers should expire on its own.

A foreign token ID during revocation is **404, not 403** — a stranger should not learn that an ID exists through a "you are not allowed".

The mint writes an audit entry at **WARN**: unlike a login, it creates something that continues to run while no one is watching.

## 7. Declaring Profiles

`IntegrationScopeProfile` is a bean, declared by the owner of the surface area — the same seam as `ShareHandler`, `RunSource`, `DamogranTask`. Duplicate `id` or a profile without surface areas **break the boot**: an ambiguity in an authorization input is a startup error, not a warning.

`IntegrationSurface` carries **method and path**, path Ant-style and relative to the Tenant-Root. A pattern without a leading `/` is rejected — it would never match and would appear configured.

### 7.1 Included: `links-capture`

Exactly the three capture routes of the Links app (`app-links.md` §6.1):

```
GET  /addon/links/groups
GET  /addon/links/entry/lookup
POST /addon/links/capture
```

This is a narrower permission than it seems: **a token with this profile cannot read the list.** It can ask for a URL it already knows, fetch group names, and save. This is exactly what such a tool does — badge, dropdown, save.

Two omissions are instructive:

- **`GET /addon/links/scan`** is excluded. A capture tool only wanted the full list to answer "is this page already saved"; `/entry/lookup` answers that with one entry.
- **`POST /addon/links/groups`** is excluded, although `GET` on the same path is included — and it *rewrites the headings*. This is the sharpest case for method-aware surface areas in this profile: reading the contents of a dropdown must not carry the right to redefine them. A path-based profile would have silently allowed both here.

Also excluded: `/entry` with all three verbs, `/entry/viewed` (a capture tool doesn't check anything off — nothing it knows says a human has read a page), `reorder`, `group/rename`, `rebuild`.

### 7.1a Included: `web-grab`

Exactly one surface area, `POST /grab` — see [web-grab.md](web-grab.md). No
read route: a grab writes what the browser already has. Separated from
`links-capture` instead of merged into a "browser-extension" profile, because a
token can carry both, and the union is then the human's decision instead of one
baked into a profile that no one reads again.

Such a tool never needs to delete: `/capture` is idempotent on the URL and reports which of the two cases occurred.

## 7.2 User Interface

There is (yet) no central "my tokens" page; minting happens where access is
needed — for `links-capture` behind the ⚙ of the Links app
(`app-links.md` §8.2). The REST connection is nevertheless in **`@vance/shared`**
(`rest/integrationTokens.ts`), not in the addon: the credential belongs to the
account, not the app that happens to offer the button — and the profile page as
a second caller should not have to rebuild this.

### The Connection String

What a third-party tool needs, in a copyable field
(`@vance/shared/rest/integrationConnection.ts`):

```
vancetope1.<base64url({brainUrl, tenant, projectId, target?, profile, token, expiresAt?})>.<checksum>
```

- **`target` is a destination, not a boundary.** The token is narrowed to the *project*; the folder only indicates where to write. Any interface displaying it must state this.
- **Built in the browser**, because the external Brain URL is the only thing a server behind a proxy reliably answers incorrectly.
- **The checksum covers what the JWT signature does not** — URL, project, folder. Damage check, not a security measure.

## 8. Limitations (v1)

- **The WebSocket is blocked.** After the upgrade, the `SecurityContext` is built from `ConnectionContext`, which only carries Tenant and User — a pinned token would emerge **unpinned**. Today, no one declares this; precisely for this reason, the block is already there, otherwise the first profile with `/ws` would silently expose an un-narrowed socket. To open it correctly means: teach `ConnectionContext` the narrowing.
- **No central token page.** Minting and revocation are only available where a profile offers an interface for it (today: the ⚙ of the Links app). A list across all profiles belongs in the profile but is not built.
- **No CORS.** The Brain does not set CORS headers; this is a header issue, not an auth issue. From an MV3 background worker with `host_permissions`, it is not needed; from a content script, an open endpoint would not help either.
- **The project pin is a single project**, not a list.

## 9. Maintenance

`integration_tokens` carries `projectId` **and** `userId`, thus has both handlers:

- **User Handler**, `OWNED`, Order **400** (before the usual block): an orphaned credential is not stale data, but a living secret — and here sharper, because the entry *is* the revocation instance. If it remained, the token would continue to authenticate externally as a user who no longer exists. The early position is a security margin, not a cascade: a partially failed run should not be one that left behind a functional credential.
- **Project Handler**, Order 100: Deletion **is** revocation (unknown `jti` = dead). If the entry remained, the next project with the same name would be born with a stranger's living credential. The **rename revokes**: the pin lives in the signed claims and cannot follow a rename; the entry therefore no longer describes the token afterwards — the cross-check in §5 closes the hole, the `revokedAt` stamp makes it visible in the list.

## 10. Reference

- `TokenType.INTEGRATION`, `VanceJwtClaims.integration(…)` (`vance-shared/jwt`)
- `IntegrationTokenDocument` / `-Repository` / `-Service` (`vance-shared/integration`)
- `SecurityContext.restrictedUser(…)`, `PermissionService.withinCredentialScope` (`vance-shared/permission`)
- `IntegrationScopeProfile`, `IntegrationSurface`, `IntegrationScopeRegistry`, `IntegrationTokenAuthService`, `IntegrationTokenController` (`vance-brain/access`)
- `LinksCaptureScopeProfile` (`vance-addon-brain-links`)
