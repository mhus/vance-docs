---
title: "Vance Facelift — Specification"
parent: Documentation
permalink: /docs/vance-facelift
---

<!-- AUTO-GENERATED from specification/public/en/vance-facelift.md — do not edit here. -->

{% raw %}
---
# Vance Facelift — Specification

> Status: v1. This spec is binding for the Capacitor shell
> under `client_web/packages/facelift-bridge/`, the custom plugin
> `client_web/packages/facelift-account-webview/`, as well as for the
> Facelift-specific code paths in `client_web/packages/vance-face/`
> and `client_web/packages/shared/`. Ongoing decisions + unstable
> plans (Share Extension, Push, …) are located under
> `planning/vance-facelift*.md`.

## 1. Goals and Scope

`vance-facelift` is a **native iOS shell around the deployed Vance
web UI**. Instead of writing a mobile client from scratch, a Capacitor
wrapper loads the existing `vance-face` website per account in an
isolated WKWebView. Multi-identity, native bridges (Share, Voice, Push,
Files, Camera, …), and security-specific affordances (PIN/Biometric-Lock)
reside in the wrapper; the editor logic remains in the unchanged Vue website.

**What Facelift is:**

- A thin native wrapper (iOS, later Android) around the existing
  Vue web UI stack. A single code path for editor features —
  browser, Facelift, future desktop wrapper share the same
  `vance-face` bundle files.
- A replacement for the React Native skeleton under
  `client_web/packages/vance-fingers/`. Fingers will no longer
  be developed; mobile features will land in Facelift.
- An App Store distribution with clear native added value (multi-
  identity isolation, Share Extension, PIN lock, Files export, …) —
  sufficiently non-trivial to meet Apple Review Rule 4.2.

**What Facelift v1 explicitly is not:**

- No editor reimplementation. The website remains the source of truth;
  the wrapper does **nothing** with Chat / Inbox / Documents / … itself.
- No offline mode. WebView has internet or displays the website's error page.
- No Auth stack in the wrapper. Login happens in the website; the
  wrapper knows brain URLs + optional display names + (for Phase 2
  via Share Extension) a bearer token mirrored from login.
- No WebView added value beyond user-typing-URL-bar. Facelift is
  focused on Vance deployments; wrapper-side validation prevents
  non-Vance URLs from being saved (§6).

## 2. Module Structure

```
client_web/packages/
├── facelift-bridge/         @vance/facelift-bridge
├── facelift-account-webview/ @vance/facelift-account-webview
├── shared/                  @vance/shared        ← isFacelift(), requestBackToPicker(), …
└── vance-face/              @vance/vance-face    ← the hosted website; knows Facelift
                                                    via UA-suffix detect, otherwise unchanged
```

### 2.1 `@vance/facelift-bridge` — the Wrapper

Capacitor app (Capacitor 6, iOS 17 deployment target, Vue 3 + Vite +
Vue Router 4 + Tailwind). Bundle: only the Picker/Manage/Lock UI.

- `src/main.ts` — Boot. `configurePlatform` is **NOT** wired;
  the wrapper does not host website logic, only the native bridges
  on top.
- `src/router.ts` — Hash history. Routes: `/shell`, `/manage`,
  `/add`, `/edit/:id`, `/lock/setup`, `/lock/unlock`. Auth guard
  (Lock) checks `isUnlocked()` and otherwise routes to
  `/lock/unlock` or `/lock/setup`.
- `src/accounts/accountStore.ts` — Persistent account list in
  `@capacitor/preferences`. `Account = { id (UUID), faceUrl,
  displayName, createdAt, lastUsedAt }` — `faceUrl` is the URL of the
  `vance-face` deployment; the Brain is same-origin accessible via `/brain/*`
  proxy within it. Auto-activation on add.
- `src/lock/lockStore.ts` — PIN hash + salt in Preferences,
  Unlocked flag in-memory (§7).
- `src/views/ShellView.vue` — Host for the native per-account
  WKWebView. Persistent header (account switcher + Home + Reload
  + Manage); native WebView fills the rest (`VanceAccountWebView`
  plugin).
- `ios-template/` — committed source files for native iOS setup,
  pushed into the Xcode project by `scripts/cap-add-ios.sh`:
  - `App.entitlements` (App Group)
  - `VanceShareExtension/{ShareViewController.swift, Info.plist,
    MainInterface.storyboard, VanceShareExtension.entitlements}`
- `scripts/cap-add-ios.sh` — automates the one-time patches
  (deployment target up to 17, URL scheme + permission strings
  in Info.plist, App Group entitlement, Share Extension target via
  Ruby `xcodeproj` gem, App Icon + Splash via `@capacitor/assets`).
- `scripts/integrate-share-extension.rb` — programmatically adds the
  Share Extension target to the Xcode project.

**Deps:** `@capacitor/core/ios/preferences/splash-screen/status-bar`,
`@vance/facelift-account-webview`, `vue` + `vue-router` + `pinia`,
`@capacitor/assets` (dev). No Auth/REST/WS packages — intentionally.

### 2.2 `@vance/facelift-account-webview` — the Custom Plugin

Workspace-internal Capacitor plugin (Swift + TS-Proxy + .podspec).
Responsible for:

- **Multi-Identity WebView Hosting:** one WKWebView per account with
  its own `WKWebsiteDataStore(forIdentifier: accountUUID)` → true
  Cookie/IndexedDB/Service Worker isolation even with multiple
  users on the same Brain origin (§3.1).
- **JS Bridge** (see §3.3) — Capacitor plugin methods for the
  wrapper Vue code, plus WKScriptMessageHandler for the website.
- **WKNavigationDelegate** for `vance-facelift://` URL scheme
  capture (§4).
- **UA Suffix Injection** (§5).
- **Bridge User Script Injection** (§3.3).
- **Biometric API** (`LAContext` wrapper) — no external plugin,
  ~30 LoC Swift.
- **App Group File IO** for the Share Extension (§8).

`Sources/VanceAccountWebViewPlugin/VanceAccountWebViewPlugin.swift`
is the only Swift file. Pod is named `VanceFaceliftAccountWebview`
(Cocoapods naming convention; not to be confused with `vance-facelift`
as a URL scheme).

### 2.3 Dependency Rules (Strict)

| Package | May depend on |
|---|---|
| `@vance/facelift-account-webview` | `@capacitor/core` (peer). No other workspace package. |
| `@vance/facelift-bridge` | `@vance/facelift-account-webview`, `@capacitor/*`, Vue/Pinia/Router. **NOT** on `@vance/shared`, `@vance/vance-face`, `@vance/generated` — the wrapper has no Vance business logic. |
| `@vance/shared` | unchanged. Contains the `isFacelift()` / `requestBackToPicker()` helpers that the website uses, but no wrapper imports. |
| `@vance/vance-face` | unchanged. Detects Facelift via `isFacelift()` from `@vance/shared`, calls `window.vanceFacelift.*` defensively. Does not fail if the bridge is missing (= in the browser). |

## 3. Per-Account WebView Model

### 3.1 Isolation

Each account in `accountStore` has a UUID (`crypto.randomUUID()`).
The plugin creates a WKWebView per UUID with
`WKWebsiteDataStore(forIdentifier: UUID(accountId)!)` — iOS 17+ feature
for persistent, named data stores. Cookies, IndexedDB, LocalStorage,
Service Workers live separately per UUID.

Consequence: two accounts on the identical Brain origin (e.g., the same
Tenant with different users, or multiple Tenants on
`eddie.mhus.de`) do not see each other. When switching accounts
via the bottom sheet, the other WebView is only `isHidden=
true` — sessions / scroll positions / active WS connections continue
to live.

**Lifecycle:**

- `present(accountId, url, bounds)` — first time: WebView is created
  + URL loaded. Subsequent calls: show cached WebView +
  adjust bounds if necessary. No reload on re-show.
- `dismiss()` — hide, cache remains.
- `setBounds({top, left, width, height})` — change frame (header
  resize, device rotation, bottom sheet animation).
- `reload()` — `.reload()` on the current WebView.
- `navigateHome({accountId, url})` — reload visible WebView,
  without touching the DataStore.
- `remove({accountId})` — clear WebView + `WKWebsiteDataStore.
  remove(forIdentifier:)`. Called when removing an account in `/manage`
  so that the next reuse of the UUID gets an empty
  cookie jar.

### 3.2 Geometry

Wrapper header (Vue, in the Capacitor main WebView) persistently
sits on top. The plugin places the account WebView **below** the
header. `ShellView.vue` measures the header height via `ResizeObserver` +
`window.resize` and calls `setBounds(...)` through.

iOS Capacitor config: `contentInset: 'never'` so that CSS y=0 coincides
with UIKit y=0 — otherwise the native WebView overlaps the header
by the safe-area-top height. JS floor 110pt in `currentBounds()` as
a cold-start defensive (env(safe-area-inset-top) can return 0 in the very first
frame).

### 3.3 The `window.vanceFacelift`-Bridge

For each WebView, the plugin injects a WKUserScript at `atDocumentStart`:

```js
window.vanceFacelift = {
  accountId: '<uuid>',  // substituted per WebView
  exportFile(opts),     // { name, mime, base64 }  → iOS Files picker
  setShareCredentials(opts),  // { faceUrl, tenant, username, token, refreshToken? }
  setProjectSnapshot(projects)  // [{name, title?}, …]
};
```

Calls are passed to Swift via `webkit.messageHandlers.vanceFacelift.postMessage(...)`;
Swift dispatches by `action` field.

**Contract:**

- The bridge is a **fire-and-forget** API (no result promises
  in v1). On success, the native action runs; on error, Swift logs
  to the Xcode console.
- `accountId` is read-only — the website thus knows its own
  wrapper UUID without pulling it from storage.
- The bridge is **only available in Facelift**. `@vance/shared`'s
  `isFacelift()` (User-Agent match) is the gate — if `false`,
  `window.vanceFacelift` is undefined.
- Bridge extensions are **additive**: new actions without
  schema bump are allowed, as long as existing calls continue to work.

## 4. `vance-facelift://`-URL Scheme

Registered in `Info.plist` via `CFBundleURLTypes`. WebView
navigation to `vance-facelift://<action>[?params]` is intercepted
by the plugin's WKNavigationDelegate, canceled, and emitted as a
`urlOpen` event to JS. `ShellView.vue` listens + routes.

**v1 Actions (host segment is the action name):**

| URL | Effect in Wrapper |
|---|---|
| `vance-facelift://back-to-picker` | Native WebView `dismiss()`, Router → `/manage`. |
| `vance-facelift://add-account` | dismiss, Router → `/add`. |
| `vance-facelift://switch-account` | Open bottom sheet (account switcher). |

**Contract:**

- The website uses these URLs as "raise an event" — typically in
  buttons / menu items that are only visible under Facelift
  (cf. `EditorTopbar.vue`'s User menu).
- In the browser, these clicks are no-op (the scheme is not
  registered).
- New actions: Wrapper must extend the switch-case in
  `ShellView.handleFaceliftUrl()`. Unknown actions
  are logged + ignored.

## 5. Facelift Detection

Per-account WebView sets `WKWebViewConfiguration.applicationName-
ForUserAgent = "VanceFacelift/<version>"`. iOS appends this suffix
to the normal Safari UA:

```
Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15
(KHTML, like Gecko) Mobile/15E148 VanceFacelift/0.1.0
```

**Detection Contract (`@vance/shared/facelift/index.ts`):**

```ts
export function isFacelift(): boolean;
export function getFaceliftVersion(): string | null;
export function requestBackToPicker(): void;
export function requestSwitchAccount(): void;
export function requestAddAccount(): void;
```

`isFacelift()` matches `/\bVanceFacelift\//`. Brain-side identical via
`User-Agent` HTTP header — the Brain may respond differently to Facelift
(cookie settings, optionalized routes, etc.), but v1 does not do this.

`request*()` helpers fire `window.location.href = 'vance-facelift://
<action>'`; no-op outside of Facelift.

## 6. `/config.json` — Brain Runtime Configuration

Statically delivered under `vance-face`'s nginx root as
`/config.json`. Pod entrypoint overwrites with Pod env values at
container start (no Vite `VITE_*` variable pattern — image remains
deployment-agnostic).

**Schema (v1):**

```json
{
  "product": "vance",
  "schema": 1,
  "version": "<face-build-version>",
  "deployment": "<env-VANCE_DEPLOYMENT>",
  "hostname": "<env-HOSTNAME>",
  "buildSha": "<env-VANCE_BUILD_SHA>",
  "title": "<env-VANCE_FACE_TITLE>",
  "backlink": "<env-VANCE_FACE_BACKLINK>"
}
```

`product === "vance"` is the identifier. Extensions are additive;
`schema` bumps only on breaking changes.

**Consumers:**

- `vance-face` itself (`src/platform/runtimeConfig.ts`) — displays
  `title` + `backlink` under the "vance" wordmark on the login
  page + in the EditorTopbar.
- Wrapper `verifyVanceUrl(url)` in `facelift-bridge/src/accounts/
  verifyVanceUrl.ts` — before `addAccount()` + on faceUrl edit calls
  `CapacitorHttp.get(<url>/config.json)`, checks `product === "vance"`.
  Prevents typos like `https://google.de` from being saved. **Does not
  exclude intentional fraud** (any server can deliver a matching file) —
  this is accepted.

`vance-face`'s Vite dev server proxy to `/brain/*` is hardcoded to
`http://localhost:9990` (no build-time env var). In production, face
is same-origin-served by brain; if the two are ever separated, the
Brain URL will move into `/config.json` (schema extension, loader
refactor — Phase 2).

## 7. PIN + Biometric Lock

Mandatory lock before each wrapper boot. Vue routes with
`meta.skipLockGuard !== true` are blocked by the router's `beforeEach`
as long as `isUnlocked() === false`.

**Persistence (`facelift-bridge/src/lock/lockStore.ts`):**

- `vance.lock.pinSalt` (16-byte random hex, new on PIN set)
- `vance.lock.pinHash` (SHA-256 over `salt:pin`, hex)
- `vance.lock.biometricEnabled` (`"true"` / `"false"`)

All in `@capacitor/preferences` = iOS `UserDefaults`. **Wipes on
App uninstallation** (unlike Keychain — intentionally, so a
reinstallation lands on the setup page and not in a PIN
lock loop without a reset button).

Unlock flag (`isUnlocked()`) is **in-memory**. App background →
foreground remains unlocked; hard kill from the multitasker re-locks
on the next cold start.

**Setup Flow:**

- `/lock/setup` → enter PIN (4–6 digits) → Confirm → save.
- On re-setup via `/manage` → "Change PIN" v1: no old PIN check
  (app is unlocked, this is the implicit authority). v2 adds
  verification.

**Unlock Flow:**

- `/lock/unlock` → PIN pad. On correct PIN:
  `markUnlockedByBiometric()` or `verifyPin()` set
  `unlockedInMemory = true`, router jumps to `next` query or `/`.
- If `isBiometricEnabled()`: `onMounted` immediately triggers
  `tryBiometricUnlock()` → on success, proceeds without PIN.

**Biometric API:** thin wrapper around plugin methods
`isBiometricAvailable()` + `authenticateBiometric({reason})`.
Native implementation via `LAContext.evaluatePolicy(.deviceOwner-
AuthenticationWithBiometrics, …)`. **No** external
`capacitor-native-biometric` pod.

**Info.plist:** `NSFaceIDUsageDescription` is set; otherwise iOS crashes
on the first Face ID attempt.

## 8. App Group + Share Extension Data Flow

App Group Identifier: `group.de.mhus.vance.facelift`. Activated on
both targets (App + VanceShareExtension) via entitlement file. App
Groups require Apple Developer Program — Personal Team in Xcode
cannot activate it (planning/vance-facelift-share-extension.md).

The Share Extension runs as a separate iOS process and cannot
access the `@capacitor/preferences` data of the main app. The
wrapper therefore mirrors relevant state snapshots as JSON files into
the App Group container:

| File | Writes | Reads | Content |
|---|---|---|---|
| `accounts.json` | Wrapper (`accountStore.saveAll()` + Boot) | Extension | `Account[]` without tokens — `{id, faceUrl, displayName}` |
| `credentials.json` | Website (`pushShareCredentials()` from `loginWeb.ts` + `silentLogin`) | Extension | `{[accountId]: {faceUrl, tenant, username, token, refreshToken}}` — partial-merge per account |
| `projects-<accountId>.json` | Website (`pushProjectSnapshot()` from `useTenantProjects.reload()`) | Extension | `[{name, title?}, …]` |

Bridge methods in the plugin: `setAccountSnapshot({accountsJson})`,
`setShareCredentials({accountId, credentialsJson})`,
`setProjectSnapshot({accountId, projectsJson})`.

Extension UI (see `client_web/packages/facelift-bridge/ios-template/
VanceShareExtension/ShareViewController.swift`): SLComposeService-
ViewController with account picker + project picker; on "Post" POST
to `/brain/{tenant}/share/inbox` (Bearer token from `credentials.json`).

**Brain Endpoint (`vance-brain/src/main/java/de/mhus/vance/brain/
inbox/rest/InboxController.java`):**

```
POST /brain/{tenant}/share/inbox
Authorization: Bearer <token>
Content-Type: application/json
Body: InboxShareRequest  { projectName, title?, body?, sharedUrl? }
→ 201 InboxItemDto
```

Creates an Inbox Item with `type=OUTPUT_TEXT`, `requires-
Action=false`, tags `share` + `project:<name>`, payload with
`source=share-extension`. User processes further in the Inbox editor.

## 9. "Open in Vance App" Banner

`vance-face`'s `IndexApp.vue` renders a narrow strip at the top on login:

```
📱 Vance has a native iOS app — Open ›
```

Visible **only** if:

- `navigator.userAgent` matches `/iPhone|iPad|iPod/`
- `!isFacelift()` — i.e., not already in the wrapper

Tap → `window.location.href = 'vance-facelift://'`. iOS launches the
Facelift app if installed (the URL scheme is registered);
otherwise, nothing visually happens (App Store link comes in Phase 2,
once Vance is in the Store).

## 10. Asset Pipeline

Source SVGs under `facelift-bridge/assets/icon-source.svg` +
`splash-source.svg` with the mathematical italic v (U+1D463, STIX
Two Math) as a trademark. Pipeline:

1. `pnpm assets:regenerate-png` — `qlmanage`-based SVG→PNG
   conversion (macOS-only, no dev dep needed)
2. `pnpm assets:generate` — `@capacitor/assets` fan-out to all
   iOS sizes (Icon Set, Splash for light/dark)

Both steps run automatically in `pnpm cap:add:ios` (= `scripts/
cap-add-ios.sh`).

## 11. Build + Deploy Paths

| What | Command | Result |
|---|---|---|
| Build wrapper bundle | `wb build facelift` | DTOs (vance-api) are not needed here; only `@vance/facelift-account-webview` + `@vance/facelift-bridge` |
| Set up iOS project | `pnpm cap:add:ios` (in `facelift-bridge`) | `ios/` folder with Cocoapods, Entitlements, Share Extension target |
| Native build | Xcode `⌘B` | App + Extension are built together |
| Simulator | Xcode `⌘R` | App runs. Share Extension requires configured App Groups (Paid Dev Program). |
| Device | see `planning/vance-facelift-device-deploy.md` | Personal Team: 7-day signing, no Share Extension. Paid Team: full. |

`vance-face` and `vance-brain` have **no** Facelift-specific
build path. The website is deployed as usual (`wb build face`,
Docker image); the wrapper loads it at runtime per account.

## 12. What Facelift Does NOT Do (v1)

These points are **intentionally** not implemented. If a suggestion
in this direction comes up: first discuss spec change, do not
build ad-hoc.

- **No browser mode.** The WebView is limited to the Brain origin of
  the respective account URL; navigations are not further
  filtered (Vance Brain is the trusted source).
  Hard origin lock + external link to Safari is Phase 2 (cf.
  planning, if needed).
- **No Push Notifications.** APNs setup + server dispatcher are
  Phase 4 (planning/vance-facelift-share-extension.md noted).
- **No Universal Links.** `vance-facelift://` is sufficient for in-app
  + cross-app triggers. Universal Links (`https://eddie.mhus.de/...`
  opens the app) will come when Brain delivers Apple site association.
- **No iCloud Sync of the account list.** App uninstallation =
  account list gone. Re-entry accepted.
- **No Voice / STT, no Camera plugin in the wrapper.** The existing
  browser file inputs in `vance-face` (Documents upload, Chat
  attach) open the iOS system picker — which offers Photo Library +
  Take Photo + Files app anyway. Capacitor plugins are only
  included if a use case requires more control.
- **No Android counterpart.** Facelift v1 is iOS-only. Android build
  is a later workflow (Capacitor supports it, but the
  Account WebView needs a WebKit Android counterpart + the App
  Groups logic needs to be rewritten).

## 13. Reference

- `planning/vance-facelift.md` — Architecture decisions (MPA-vs-
  SPA-Shell, Wrapper-vs-Native, Bridge model)
- `planning/vance-facelift-share-extension.md` — Status + steps for
  the Share Extension after Dev Program activation
- `planning/vance-facelift-device-deploy.md` — Personal Team
  (free, 7-day) vs. Paid Dev Program ($99/year) for deployment
  to own iPhone/iPad
- `client_web/packages/facelift-bridge/README.md` — Setup instructions
  including Xcode click steps for App Groups
- `client_web/packages/facelift-account-webview/ios/Sources/.../
  VanceAccountWebViewPlugin.swift` — the central Swift implementation
- `specification/web-ui.md` — Web UI specification (what Facelift
  hosts); §3 Editor Inventory, §7 Style Guide
- `specification/user-interaction.md` — Inbox model that the
  Share Extension fills
{% endraw %}
