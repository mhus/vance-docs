---
title: "Addon System"
parent: Specs
permalink: /specs/addon-system
---

<!-- AUTO-GENERATED from specification/public/en/addon-system.md — do not edit here. -->

---
# Addon System

> Status: v1 in production since 2026-06-03 (slideshow as reference Addon).
> Design discussion and discarded alternatives: `planning/addon-system.md`.

The Addon system allows third-party code to extend Brain and Face with Java
Beans (REST controllers, server tools, Vance applications) and Vue 3
editors. Distribution is as a `.vab` bundle, activation via the `addons`
collection in MongoDB, controlled by `vance-anus` CRUD. First first-party Addon:
`vance-addon-brain-slideshow`.

## 1. Trust Model and Scope

| Aspect | v1 |
|---|---|
| Who installs | Admin via `vance-anus` CRUD + Container build (for bundled) |
| Scope | System-wide; all Tenants see all active Addons |
| Trust Level | Code = trusted, no sandboxing |
| Per-Tenant activation | Not in v1 |
| Code Signing | SHA-256 checksum optional at `db.addons.checksum`, verified by entrypoint |
| Hot Reload | No — Container restart required |

## 2. Bundle Format `.vab`

An Addon is a ZIP file with the `.vab` extension:

```
<artifactId>-<version>.vab
├── META-INF/
│   ├── vance-addon.yaml      Manifest: id, version (minimum)
│   └── spring/
│       └── org.springframework.boot.autoconfigure.AutoConfiguration.imports
├── brain/
│   └── lib/
│       └── *.jar             Addon JAR + additional Java dependencies
└── face/                     optional — Module Federation Remote
    ├── remoteEntry.js
    ├── remoteEntry.ssr.js
    └── assets/…
```

`META-INF/` is mandatory. `brain/` and `face/` are both optional, but
usually at least one of them is present: a Brain-only Addon (server tool without UI)
has no `face/`, a pure UI Addon has no `brain/`.

### 2.1 Manifest

```yaml
# META-INF/vance-addon.yaml
id: slideshow
version: 1.0.0-SNAPSHOT
```

`id` is the stable Addon name (lowercase, hyphen-separated). The
Brain and Face entrypoints use it as a directory name under
`/shared/addons/<id>/<version>/`. `version` is the Maven version
(substituted via resource filtering with `@project.version@` delimiters
— Spring Boot Parent sets the filtering delimiters to `@…@`).

In v1, no further manifest fields are required. Future
extensions: `vanceApiVersion` range, `outbound:` host list,
`migrations:` sub-format.

### 2.2 Spring AutoConfiguration.imports

One class per Addon, in the standard path:

```
META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports
```

Content: one fully qualified class name per line, e.g.:

```
de.mhus.vance.addon.brain.slideshow.SlideshowAddon
```

The class itself:

```java
@AutoConfiguration
@ComponentScan(basePackageClasses = SlideshowAddon.class)
public class SlideshowAddon {}
```

`@ComponentScan(basePackageClasses=…)` is sufficient — all `@Service`,
`@Component`, `@RestController` in the package will be detected.

## 3. Persistence: `db.addons`

The MongoDB collection `addons` is the runtime source of truth. Schema
(via Spring Data MongoDB):

```
{
  _id:       ObjectId,
  name:      string  unique  business key, matches id in manifest
  path:      string           Source marker:
                              "bundled:<id>"    → /default-addons/*.vab in image
                              "https://..."     → URL to .vab, entrypoint loads + caches
  enabled:   bool             false = invisible in /face/addons, no unpack/mount
  checksum:  string?  optional sha256:<hex>, verified during URL download
  createdAt: Date    audit
  _class:    string  Spring Data type marker: "de.mhus.vance.shared.addon.AddonDocument"
}
```

Three operations write here:

| Who | How | Behavior |
|---|---|---|
| Brain entrypoint | `pymongo $setOnInsert` per bundled `.vab` | Insert only; existing rows (even `enabled=false`) remain |
| `vance-anus addon create/update/enable/disable/delete/set-checksum` | `AddonService` | Full CRUD |
| Manual `mongosh` | directly | Emergency path, not recommended workflow |

Brain service: `de.mhus.vance.shared.addon.AddonService` is the only
entry, external modules access it (data sovereignty). REST controller
in `de.mhus.vance.brain.addon.AddonController` only provides read operations.

## 4. Backend Loading (Brain)

### 4.1 `vance-brain.jar` with PropertiesLauncher

`vance-brain/pom.xml` sets `<layout>ZIP</layout>` in the
`spring-boot-maven-plugin`. Result: `Main-Class` in `MANIFEST.MF` is
`org.springframework.boot.loader.launch.PropertiesLauncher` instead of
`JarLauncher`. PropertiesLauncher reads `-Dloader.path=…` and appends the
directories/JARs listed there to the classpath before the app starts.

### 4.2 Container Entrypoint (`deployment/docker/brain/docker-entrypoint.sh`)

Three phases, each idempotent:

**Phase 1 + 1b — Bundled Addons**

Loop over `/default-addons/*.vab`:
1. `unzip -p <vab> META-INF/vance-addon.yaml` → awk-parse `id`/`version`
2. If `/shared/addons/<id>/<ver>/.ready` is missing → unpack via atomic `unzip → rename → touch .ready`
3. `pymongo` upsert into `db.addons` with `$setOnInsert`: sets row only on insert (`enabled=true`, `path="bundled:<id>"`), existing rows with `enabled=false` are NOT overwritten

**Phase 1c — URL Addons (Cache)**

Inline Python via `pymongo`:
1. Iterate `db.addons.find({enabled: true})`, skip `bundled:` paths
2. For each URL row: Cache file `/shared/addons-cache/<name>.vab`
   - Exists + Checksum set + sha256 matches → cache hit
   - Exists + Checksum not set → cache hit (unverified)
   - Exists + Checksum mismatched → delete file, reload
   - Does not exist → curl with `-fsSL --retry 3 --retry-delay 2 --connect-timeout 15 --max-time 300`
3. After download: if checksum set, verify — on mismatch, delete file, skip row (loader.path will not contain the Addon)
4. Read manifest from cache, `id` must match row `name`
5. Unpack into `/shared/addons/<id>/<ver>/` (atomic rename, `.ready` marker)

**Phase 2 — loader.path**

```sh
LOADER_PATH=$(find /shared/addons -path '*/brain/lib/*.jar' | tr '\n' ',' | sed 's/,$//')
exec java $JAVA_OPTS -Dloader.path="$LOADER_PATH" -jar /app/vance-brain.jar
```

Spring Boot scans for `META-INF/spring/AutoConfiguration.imports` at startup
on the entire classpath — thus finding the Addon configs.
`@ComponentScan` in the Addon config picks the Beans.

### 4.3 Addon JAR Dependency Rules

The Addon Maven module may directly depend on Brain:

| Module | Compile Dependencies | Scope |
|---|---|---|
| `vance-addon-brain-<id>` | `vance-api`, `vance-shared`, `vance-brain` | `provided` |

`provided` because the mentioned modules are on the Brain classpath at runtime
— the Addon JAR does not need to bring them itself.

## 5. Frontend Loading (Face)

### 5.1 Module Federation Host

`vance-face` is the Host for `@module-federation/vite`. Remote list in v1
hardcoded in `vance-face/vite.config.ts`, with two mandatory details:

```ts
const addonRemotes: Record<string, any> = {
  vance_addon_slideshow: {
    name: 'vance_addon_slideshow',
    entry: '/addons/slideshow/remoteEntry.js',
    type: 'module',          // ⚠ Mandatory: Vite emits remoteEntry as ESM
  },
};

federation({
  name: 'vance_face',
  remotes: addonRemotes,
  shared: {
    vue:        { singleton: true, requiredVersion: '^3.5.0' },
    pinia:      { singleton: true },
    'vue-i18n': { singleton: true },
    // ⚠ NO @vance/components, NO @vance/shared — see §5.3
  },
});
```

**`type: 'module'` is critical:** without this hint, the
Federation runtime loads `remoteEntry.js` as a classic `<script>`, and the
ESM `import` statement at the beginning throws `Cannot use import statement
outside a module`. The Federation `Record<string,string>` TS surface
hides the object form — `Record<string, any>` bypasses this without
loss of functionality.

### 5.2 Remote Vite Config

Three build options are critical — all result from the
remote mount path `/addons/<id>/`, not from the doc root:

```ts
export default defineConfig({
  base: '',                  // ⚠ Mandatory — see below
  plugins: [
    vue(),
    federation({
      name: 'vance_addon_slideshow',
      filename: 'remoteEntry.js',
      exposes: {
        './SlideshowApp': './src/SlideshowApp.vue',
      },
      shared: {
        vue: { singleton: true, requiredVersion: '^3.5.0' },
        // DO NOT share Workspace packages — see §5.3
      },
      dts: false,             // see hint below
    }),
  ],
  build: {
    target: 'esnext',
    minify: false,
    cssCodeSplit: true,       // ⚠ Mandatory — see below (Default true, do not override)
  },
});
```

**`base: ''` is mandatory.** Vite default `base: '/'` generates in
`preload-helper.js` an `assetsURL = function(dep) { return "/"+dep }`
and bundles chunk preload paths as root-absolute (`/assets/X.js`). The
Host, however, serves the remote files under `/addons/<id>/` — the
preload hrefs thus end up as `/assets/X.js` instead of
`/addons/<id>/assets/X.js` and 404. For Addons with eager cross-
chunk imports (e.g., a Codec eager + the View lazy), the
async component load fails completely. Empty base → `assetsURL =
function(dep, importerUrl) { return new URL(dep, importerUrl).href }`
and the resolution `new URL('./X.js', chunkUrl)` correctly lands
under `/addons/<id>/assets/X.js`. Symptom of incorrect
setting: `register()` fires, but `CalendarView` 404s.

**`cssCodeSplit: true` (Vite default) is mandatory.** Federation
injects CSS `<link rel=stylesheet>` tags per expose via the
`virtualExposes.js` `cssAssetMap`. With `cssCodeSplit: false`, Vite
bundles everything into a global `style.css` without expose assignment, the
map is `{}`, and the Host never sees the Addon styles — the editor
renders as unstyled DOM. Symptom: component renders,
but has no styles.

`dts: false` disables the DTS plugin of `@module-federation/vite` —
it internally tries to run `vue-tsc` with its own tsconfig and
fails on `.vue` files. The actual type generation already runs via
the `vue-tsc -b` step in the build script.

### 5.3 Why Workspace Packages are NOT shared

`@module-federation/vite` emits a `loadShare__<pkg>` module for each entry in the `shared:` block. For **npm packages** (vue, pinia), this is a lazy lookup. For **Workspace packages**, the plugin builds top-level `await` code with `await import("./<impl-chunk>.js")`. This impl-chunk in turn statically imports from the `loadShare` module → ESM cycle with TLA deadlock, no console error, Host boot hangs indefinitely (silent failure).

Workaround: `@vance/components` and `@vance/shared` are **not** shared. Each consumer (Host + each Addon) bundles its own copy. Trade-off:
- `@vance/components`: ~12–20 KB duplication per Addon — acceptable
- `@vance/shared`: actually has state (`configurePlatform` bindings)
  → cross-bundle state is instead shared via `globalThis.__VANCE_PLATFORM__`
  (see §5.4)

If a state singleton in `@vance/shared` is added in the future that cannot
be distributed via `globalThis`, the sharing problem must be
fundamentally solved — e.g., `@vance/shared` as a published
npm package instead of a Workspace package.

### 5.4 `globalThis` State for `@vance/shared`

Because `@vance/shared` is not shared via Federation, each copy
has its own module-scoped `bindings` variable. When the Host
calls `configurePlatform({ storage, rest })`, it configures only its
own copy — the Addon copy remains unconfigured and throws
`platform not configured` on the first `brainFetch` call.

Solution: `@vance/shared/src/platform/index.ts` externalizes the `bindings` to
`globalThis.__VANCE_PLATFORM__`. Each copy reads and writes
there. Thus:
- Host copy calls `configurePlatform` on boot → writes to globalThis
- Addon copy calls `getRestConfig()` → reads from globalThis → configured

Advantages:
- No coupling Host ↔ Addon (no Addon code references `vance-face`)
- Works in Web and React Native (`globalThis` is in both)
- Addon author writes `import { brainFetch } from '@vance/shared'` unchanged

### 5.5 Container Entrypoint (`deployment/docker/face/docker-entrypoint.sh`)

Analogous to Brain, with nginx symlinks as output:

**Phase 1 — Bundled unpack (without symlink)**

Like Brain Phase 1: `/default-addons/*.vab` → `/shared/addons/<id>/<ver>/`,
`.ready` marker. **No symlink** in this phase — it is
set in 1c, controlled by `db.addons`.

**Pre-Phase — Symlink Wipe**

`find $NGINX_ADDONS_ROOT -mindepth 1 -maxdepth 1 -exec rm -rf {} +` —
all old symlinks removed. This ensures a restart always reflects the
current `/face/addons` response, even if an Addon was disabled in the interim.

**Phase 1c — Query Brain + Resolve or Fetch per Row**

```sh
for i in $(seq 1 60); do
    addons_json=$(curl -fsS --max-time 5 "$BRAIN_INTERNAL_URL/face/addons") && break
    sleep 5
done
```

60 attempts × 5s = max 5 min wait for Brain. Default
`BRAIN_INTERNAL_URL=http://brain:9990` (docker-compose service DNS;
in K8s the internal service DNS). If the cap is exceeded, nginx starts
with an empty Addon list — static page runs, `/addons/*` 404.

For each row in the JSON:
- `bundled:<id>` → `latest_version_for "$name"` scan in `/shared/addons/<name>/*/`,
  symlink `$NGINX_ADDONS_ROOT/$id → /shared/addons/<id>/<ver>/face`
- `http(s)://...` → Cache + Verify (see Brain Phase 1c, identical logic
  in shell form with curl + sha256sum), then unpack + symlink

**Phase 2 — nginx**

```sh
exec nginx -g 'daemon off;'
```

`nginx.conf` serves `/usr/share/nginx/html/`, the symlinks under
`/addons/<id>/` fall under `location /` with `try_files`.

### 5.6 `/face/addons` REST Endpoint

`vance-brain` exposes `GET /face/addons` (marked as auth-free by `BrainAccessFilter`,
path prefix `/face/` bypasses Tenant/JWT requirement).
Provides only enabled rows as `AddonDto` (name, path, checksum). v1 is
hardcoded as the only `/face/` endpoint; convention: all future
face bootstrap discovery routes live under it.

### 5.7 Dev Mode: Vite Middleware

`vance-face`'s `vite.config.ts` contains the `vanceAddonDevServe()` plugin
that intercepts two paths in the Dev server:

1. **`/addons/<id>/*`** — bridges to
   `repos/vance/server/vance-addon-brain-<id>/client/dist/<path>`.
   Thus, the Dev server serves the Federation remote files that
   are delivered in the Prod image by the face entrypoint via nginx symlink.

2. **`/face/addons`** — stand-in for the static JSON that the
   face entrypoint writes out as an nginx static asset in the Prod image.
   In Dev mode, the plugin lists all `vance-addon-brain-*/client/dist/`
   that have a `remoteEntry.js` as `[{name: <id>, path: "bundled:<id>"}, …]`.
   Without this endpoint, `loadAddonRegistrations()` gets 404 and
   fails silently — Federation imports in the code still run
   (static imports recognizable by the bundler), but runtime kind
   contributions via `register()` are never called.

Dev workflow:
- `pnpm --filter @vance-addon/<id> build` once → `client/dist/` exists
- `pnpm --filter @vance/vance-face dev` → Dev server, HMR for `vance-face`
- Change Slideshow code → `pnpm --filter @vance-addon/<id> build` again,
  hard reload in browser

The middleware is pattern-based: `/addons/<id>/*` automatically maps
to `vance-addon-brain-<id>` — new Addons do not need config
extension.

## 6. Admin Workflow: `vance-anus`

Spring Shell commands for the `addons` collection (all `@RequiresAuth`):

| Command | Does |
|---|---|
| `addon list` | All rows (including disabled), columns: NAME, PATH, ENABLED, CHECKSUM, CREATED |
| `addon show --name <n>` | Single row |
| `addon create --name <n> --path <p> [--checksum sha256:…]` | Insert; fails if name exists |
| `addon update --name <n> --path <p>` | Change path (name immutable) |
| `addon set-checksum --name <n> --checksum <c>` | Set checksum or delete with empty string |
| `addon enable --name <n>` / `disable --name <n>` | Flip flag |
| `addon delete --name <n>` | Hard delete of the row (cache file remains for cleanup cron job) |

Implementation: `vance-anus/src/main/java/de/mhus/vance/anus/shell/AddonCommands.java`.
The commands call `AddonService` (in `vance-shared`) — the same service
as the Brain controller, thus same data sovereignty, same constraints.

## 7. Build and Deploy Pipeline

### 7.1 Produce `.vab`

In the Addon Maven pom, three plugins in the `package` phase: TS Gen (for
DTOs), exec for `pnpm` (Federation remote build), maven-assembly-plugin
for the ZIP, maven-antrun-plugin for `.zip → .vab` rename. Complete
pom template see `readme/addon-development.md`.

### 7.2 Container Image Build

`deployment/docker/{brain,face}/build-image.sh` stages all
`vance/vance-addon-brain-*/target/*.vab` to `deployment/docker/{brain,face}/addons/`
before `docker build`:

```bash
ADDON_STAGE="deployment/docker/brain/addons"
rm -rf "${ADDON_STAGE}" && mkdir -p "${ADDON_STAGE}"
for vab in vance/vance-addon-brain-*/target/*.vab; do
  cp "${vab}" "${ADDON_STAGE}/"
done
```

Glob-based: every new first-party Addon is automatically included.

### 7.3 Image Layout

| Image | Contents |
|---|---|
| `vance-brain` | Slim `vance-brain.jar` (PropertiesLauncher), `/default-addons/*.vab`, `pymongo`+`unzip`+`curl` for the entrypoint |
| `vance-face` | nginx + `vance-face/dist/`, `/default-addons/*.vab`, `unzip`+`curl`+`jq` for the entrypoint |
| `vance-anus` | Spring Shell REPL with `AddonCommands` (same `vance-shared` as Brain) |

## 7a. Manuals and Cascade Resources in the Addon JAR

Each Addon ships its own Manuals (and other Cascade
Resources like Recipes, Setting Forms, Skills) in its own module under:

```
<addon>/src/main/resources/vance-defaults/_vance/<topic>/<file>
```

In the built Addon JAR, they are under `vance-defaults/_vance/...`, in the
`.vab` under `brain/lib/<addon>.jar`, in the container under
`/shared/addons/<id>/<ver>/brain/lib/<addon>.jar` and thus via
`-Dloader.path` on the Brain classpath.

`DocumentService.lookupCascade()` (`vance-shared`) finds them
automatically. Two Spring `ResourcePatternResolver` modes are used,
both work across JAR boundaries:

- **`classpath:vance-defaults/<path>`** — single resource. Returns
  the first hit. PropertiesLauncher orders Addon JARs before the App
  JAR, so the Addon wins on path duplication. For clean
  migrations (resource out of `vance-brain`, into Addon), there is
  no duplication — the only hit comes from the Addon JAR.
- **`classpath*:vance-defaults/<prefix>*`** — listing all hits
  across all classpath entries. Addon Manuals automatically appear in the listing
  without configuration.

**Consequence for migration**: if a Java module moves to the Addon
(e.g., Calendar Stage 2.x), its resources move with it. No
registration in a central registry, no boot hook in Brain,
no seeding in MongoDB. Just `git mv vance-brain/.../resource.md
<addon>/.../resource.md`.

Reference: Calendar shipped 6 Manuals
(`app-calendar.md`, `calendar-aggregate.md`, `calendar-app-create.md`,
`calendar-export-ics.md`, `doc-kind-calendar.md`, `ics-to-calendar.md`)
in `vance-addon-brain-calendar/src/main/resources/vance-defaults/_vance/manuals/`.

## 7b. Document Kind Contribution via `@vance/kind-registry`

An Addon can contribute a new Document Kind (e.g., `kind: calendar`).
The Host dispatches in `DocumentApp.vue` via the runtime registry
`@vance/kind-registry`, which, like `@vance/shared`, sits on `globalThis` state
(`__VANCE_KIND_REGISTRY__`).

Workflow:

1. Addon additionally exposes `./register`:

   ```ts
   // <addon>/client/src/register.ts
   import { defineAsyncComponent } from 'vue';
   import { registerKind } from '@vance/kind-registry';
   import { parseFoo, FooCodecError, type FooDocument } from './fooCodec';

   const FooView = defineAsyncComponent(() => import('./FooView.vue'));

   export function register(): void {
     registerKind<FooDocument>({
       id: 'foo',
       matches: (kind, mime) =>
         (kind ?? '').toLowerCase() === 'foo' && /yaml|json/.test(mime ?? ''),
       view: FooView,
       parse: parseFoo,
       isParseError: (e) => e instanceof FooCodecError,
       tabLabelKey: 'documents.detail.tabFoo',
       parseErrorKey: 'documents.detail.fooParseError',
     });
   }
   ```

2. Host `vance-face/src/platform/loadAddonRegistrations.ts` fetches
   `/face/addons`, dynamically imports the `./register` expose for each enabled Addon,
   calls `register()`. With `loadAddonRegistrations()` awaited **before** `mount()`,
   the registry is already populated at the first `DocumentApp` render.

3. `DocumentApp.vue` resolves via `resolveKind('foo')` and renders
   `<component :is="entry.view" :doc="parsed" mode="embedded">`. Host
   does not know the Addon-specific codec — the `parse`/`isParseError`
   hooks in the registry entry abstract everything.

Calendar is the reference implementation
(`vance-addon-brain-calendar/client/src/register.ts`); see
[doc-kind-calendar](/specs/doc-kind-calendar) for the specific YAML schema.

### 7b.1. Brain-side Kind Registration via `KindHandler`

For the central `doc_create(kind=…, path=…, content=…)` tool and the
`KindResolver` to recognize an Addon's own Kind as known, the Addon
**in addition to client registration** exposes a Spring Bean
of type `KindHandler`:

```java
// <addon>/server/src/main/java/.../FooKindHandler.java
package de.mhus.vance.addon.brain.foo;

import de.mhus.vance.shared.document.kind.KindHandler;
import org.springframework.stereotype.Service;

@Service
public class FooKindHandler implements KindHandler {
    @Override public String getName() { return "foo"; }
}
```

Spring's `@ComponentScan(basePackageClasses=<AddonConfig>.class)`
picks up the Bean. The central `KindRegistry` (in the `vance-shared`
module, `@Service`) collects all `KindHandler` Beans via constructor
injection on boot and exposes `Set<String> names()` (immutable).

The `KindResolver` consults `KindRegistry`:

- **exact match** (case-insensitive) — direct hit
- **substring match** — e.g., "foo-event" → `foo` (more tolerant fallback)
- **unresolvable on create** → `"text"` as ultimate fallback (silent;
  is **not** in the Manual, so the LLM treats `kind` as a mandatory parameter)
- **unresolvable on update** → existing `kind` remains

This makes the LLM `doc_create(kind="foo", …)` robust against typos
or unknown Kind values, without the Addon having to write tool glue
for it. Reference implementation: `CalendarKindHandler` in the
`vance-addon-brain-calendar` module.

Today, `KindHandler` only carries the name. Later extension points
(per-kind `defaultStub()`, `defaultMimeType()`, `validate(body)`) can be
added as default methods — the existing registration contract
remains stable.

## 7c. Prompt Fragments per Engine

An Addon can inject **trigger instructions** into an Engine system prompt
— e.g., *"if user says `Calendar` → `calendar_create`"*. This
supplements the `manual_read` pattern for content that **always**
needs to be in the prompt (tool triggers, hard rules), not just on-demand. Manuals
remain the source for schema details and deeper instructions.

Convention — one Markdown snippet per Engine per Addon:

```
<addon>/src/main/resources/vance-defaults/_vance/prompts/<engine>/<addon-id>.md
```

Example: `vance-addon-brain-calendar/.../prompts/arthur/calendar.md`
supplements the Arthur prompt; `prompts/eddie/calendar.md` would supplement Eddie
if the Addon provides it.

`AddonPromptFragmentRegistry` (in `vance-brain`) scans
`classpath*:vance-defaults/_vance/prompts/*/*.md` across all JARs on boot,
validates each fragment via Pebble compile (fail-fast), caches per
Engine sorted alphabetically. Unlike Manuals, fragments do **not**
run through the Document Cascade — they are pure classpath resources
and do not change at runtime.

Fragments are Pebble templates and see the same render context as
the Engine default prompt (`tier`, `provider`, `mode`, `profile`,
`recipe`, `engine`, `lang`, `params`, `voiceMode`).

Complete convention (fragment vs. Manual, placement rule,
auto-append) in [prompts-and-manuals §7a](/specs/prompts-and-manuals#7a-addon-fragments--pebble-snippets-per-engine).

## 8. What v1 does not do (planned for later)

| Topic | Status |
|---|---|
| Manifest `vanceApiVersion` validation | Not in v1 |
| Admin REST API (POST `/admin/addons`) | Not in v1 — `anus` CRUD is sufficient |
| Self-Heal from Git Source | Not in v1 — URL path is sufficient |
| Dynamic Remote Registration in `vance-face` (`/face/addons` as Bootstrap) | Not in v1 — `addonRemotes` hardcoded |
| K8s Rollout Restart on Install | Not in v1 — Admin does this manually |
| Shared Volume between Brain and Face | No — each container has its own `.vab` copy + its own cache |
| Per-Tenant Activation | Not in v1 |
| Hot Reload without Restart | Not in v1 |
| Mobile Addons (vance-fingers) | Outside v1 scope |
| Cleanup cron job for old `/shared/addons/<id>/<ver>/` | Not in v1 |

## 9. Conventions

- **Maven artifactId**: `vance-addon-brain-<id>`; Foot pendant would be `vance-addon-foot-<id>`. `<id>` lowercase, hyphen-separated, matches `vance-addon.yaml id`.
- **Java package**: `de.mhus.vance.addon.brain.<id>` (root) plus sub-packages as needed.
- **Federation name**: `vance_addon_<id>` (underscore, because Module Federation names should be JS identifier-safe).
- **npm package name**: `@vance-addon/<id>` (no `brain` suffix — the client is always Brain-Addon-related in v1).
- **`/shared/addons/<id>/<ver>/`** as unpacked root in both containers. nginx symlink target `/usr/share/nginx/html/addons/<id>/` without version (one active version per id in v1).
- **`/shared/addons-cache/<name>.vab`** for URL downloads.
- **Path format in `db.addons`**: `bundled:<id>` for image-bundled, `https://…` or `http://…` for URL-installed.
- **Checksum format**: `sha256:<64-hex-lowercase>`.

## 10. Creating a New Addon

Step-by-step guide using the Slideshow pattern:
`readme/addon-development.md`.

## 11. References

- `planning/addon-system.md` — Original design doc, discarded options
- `readme/addon-development.md` — How-to for Addon authors
- `readme/local-docker-test.md` — Local test setup
- `vance/vance-addon-brain-slideshow/` — Reference implementation
- `vance/vance-shared/src/main/java/de/mhus/vance/shared/addon/` — `AddonDocument` + `AddonService`
- `vance/vance-anus/src/main/java/de/mhus/vance/anus/shell/AddonCommands.java` — CRUD
- `repos/vance/client/packages/shared/src/platform/index.ts` — `globalThis` bridge
