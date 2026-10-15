# Vancetope — Chat Themes

> A **Chat Theme** is a named CSS file that controls the appearance of a Session's web chat transcript. A Recipe selects it with a single `webTheme:` line; the server delivers the CSS filtered and scoped to the client, which applies it to the transcript.
>
> **Own vocabulary, shared pipeline.** Chat Themes are intentionally **not** Report Themes: a Report Theme adheres to the openhtmltopdf print subset (`@page`, no CSS variables, absolute colors), while a Chat Theme is browser CSS (design tokens, Dark Mode, `:hover`). What is shared is the **mechanics** — document cascade, name validation, `CssSanitizer`, `CssScopePrefixer` — not the files. See [report-themes](report-themes.md) (distinction in §1 there).
>
> **Persistence:** Themes are stored as CSS files under `_vance/chat-themes/<name>.css` in the Document Layer. The cascade lookup `project → _tenant → classpath:vance-defaults/` runs via `DocumentService.lookupCascade` — the same mechanism as Recipes, Manuals, and Report Themes.
>
> See also: [recipes](recipes.md) §2 (`webTheme` field) | [web-ui](web-ui.md) (Chat area) | Operator/Author Manual: `_vance/manuals/chat-themes.md` (bundled) | Plan: [planning/chat-themes.md](../planning/chat-themes.md)

---

## 1. Terms and Distinction

| Term | What it is |
|---|---|
| **Chat Theme** | A CSS file under `_vance/chat-themes/<name>.css`, resolved via the Document Cascade. Affects **only** the Session's web chat transcript. |
| **`webTheme` Recipe Field** | Top-level field in the Recipe YAML. Value = Theme name, validated against `[a-z0-9-]+` **at Recipe load time**. Pure UI metadata — Spawn, Engine, and Tool logic never read it. |
| **Default Theme** | `_vance/chat-themes/default.css`, bundled and **rule-free**. The normal state of every Session (details §4). |
| **Scope Root** | The class `.chat-theme` on the transcript frame — server-side, every selector gets it (doubled) as a prefix. |

**Chat Themes are not Report Themes.** `_vance/report-themes/` and `_vance/chat-themes/` are separate namespaces; a name in one namespace is invisible in the other. A single file for both engines would be constrained to the lowest common denominator (print subset vs. browser CSS + Dark Mode) — this was intentionally not built.

**Chat Themes are not Shell Theming.** `ui_custom_css` (Tenant Shell stylesheet, tenant-ADMIN-gated, unscoped) remains a separate system. Boundary: *Named Themes style content, never the Shell.*

**Chat Themes are not Foot Theming.** The CLI client is a terminal; `webTheme` is meaningless there (like `title`/`category`).

**No per-Message Theming.** The theme applies to the **entire transcript** of the Session — user messages, AI responses, and worker echoes inherit it. The composer and toolbar outside the transcript container remain unstyled.

## 2. Recipe Field `webTheme`

```yaml
# recipes/<name>.yaml
description: …
engine: arthur
webTheme: acme        # ← optional, pure UI metadata
```

| Aspect | Rule |
|---|---|
| Validation | `[a-z0-9-]+` **at load time** (`RecipeLoader.parseWebTheme`). An invalid value **fails the Recipe load** — the name later becomes a path segment of the endpoint, a typo warrants an author error message, not a theme that silently never applies. Not under `params` (open map — the documented "params swallow misplaced fields" trap). |
| Existence | Not checked at load time — the cascade is runtime. An unresolvable name degrades to `default` at serve time (fail-open). |
| Consumer | `ChatThemeResolver.effectiveThemeName` is the **one** place where the Recipe layer and Chat Theme layer meet: Recipe name → `webTheme` value → Fetch name (never `null`/blank; `default` if nothing more specific applies). Recipe load error → WARN + `default` — a session list or bootstrap never fails due to a styling issue. |

## 3. Theme Storage and Cascade

```
_vance/chat-themes/<name>.css
  1. Project:   <project>/_vance/chat-themes/<name>.css
  2. _tenant:   _vance/_vance/chat-themes/<name>.css
  3. Classpath: vance-brain/src/main/resources/vance-defaults/_vance/chat-themes/<name>.css
```

- **Name:** `[a-z0-9-]+` — no slashes, no dots, no traversal. The cascade path is built by the resolver, never taken from user input.
- **No subfolders**, no field merge between levels — first-hit-wins, as with Recipes/Manuals/Report Themes.
- **Hot-Reload:** `_tenant`/Project layer fresh per lookup; Classpath layer requires a Brain restart.
- **Management:** "Chat Themes" section on the Settings page ([settings-panel.md](settings-panel.md) §3) — flat, path-based inventory, creation with name grammar check (`[a-z0-9-]+`, same regex as the resolver), editing inline in the CodeEditor (CSS highlighting via MIME type). Intentionally **no server-side child handler**: the pipeline is fail-open — an invalid theme falls back to `default.css`, there is no finding that the runtime does not absorb itself.
- Bundled: `default.css` (rule-free) as well as `eddie.css` (pastel blue transcript, Recipe `eddie`), `creator.css` (pastel red transcript, Recipe `creator`), and `wowbagger.css` (warm sand transcript with meander mosaic frieze as Data-URI-SVG, Recipe `wowbagger`) — each with a darkened `data-mode=dark` variant of the same color family.

## 4. Default Layer — `default.css` is the Normal State

Unlike the Report system (`default.css` as an always-loaded base layer **under** an optional theme), a Chat Session resolves to **exactly one** theme:

| Situation | Delivered CSS |
|---|---|
| Recipe with `webTheme: X`, X in the cascade | X |
| Recipe with `webTheme: X`, X missing everywhere / X invalid (Regex) | `default.css` + WARN (fail-open) |
| Recipe without `webTheme:` / Chat Process without Recipe / Recipe load fails | `default.css` |
| Fetch error (network/5xx) in client | no `<style>` (fail-open) |

- **The bundled `default.css` is rule-free** (comments + token catalog). This means "no theme" and "default theme" are visually identical — existing chats do not change. The visual no-op (light + dark) is a verification criterion; a smoke test guards it.
- **`default` is an override point:** A Project or `_tenant` layer with its own `default.css` restyles *every* Chat Session in the scope, without touching a Recipe — feature, not bug.
- Uniformity simplifies the client: it fetches exactly once per session, there is no "has theme / has no theme" branch.

## 5. Server: Endpoint & Pipeline

**Route:**

```
GET /brain/{tenant}/projects/{project}/chat-themes/{name}/css
```

Project in the path is mandatory — the cascade starts project-local; a tenant-global route would silently cut off the Project layer.

**Pipeline (in this order):**

1. **Auth:** Project-`READ` — same visibility as the Recipe listing (`RecipeController`). **No** READ-gate per document: The theme is styling config, composed of config layers, never from a single user document.
2. **Resolve:** `ChatThemeResolver.resolveStylesheet(tenant, project, name)` — Cascade lookup; Miss/invalid → `default`; if even the bundled default is missing (internal error) → empty CSS + WARN, **never** an abort. No 404 path: the client injects the response as `<style>` and has no error state for styling.
3. **Sanitize:** `CssSanitizer.sanitize(...)` shared unchanged with the Doc Preview — `@import`, external `url()` (only `data:` survives), `javascript:`, IE relics.
4. **Scope:** `CssScopePrefixer.scope(css, ".chat-theme")` — parameterized (Report path behaves identically, tests run with it).
5. **Response:** `text/css; charset=utf-8`, `Cache-Control: private, max-age=60` (private: the response can differ per Project layer — a shared cache would serve one project the theme of another), ETag = MD5-Content-Hash (Classpath layer has no `storageId`).

**Owner:** `de.mhus.vance.brain.chattheme.ChatThemeResolver` (`@Service`) — Cascade + Default-Fallback + `effectiveThemeName`. It is **not** a special case of `ReportThemeResolver` (which carries Report contracts that do not apply here); shared are the static utilities.

## 6. Scoping & Dark Mode

**Scope Class:** `.chat-theme` on the **transcript scroll container** (the full message area, not just the centered column) — the client sets it **always**, even for the default theme. `ChatTheme.vue` renders a fragment (`<style>` + Slot-Content, no own wrapper div); `ChatView` binds the class and `data-mode` to the container.

- **Doubling:** `.chat-theme.chat-theme h1 { … }` — same specificity (0,2,0 → classification per selector form) as the Vue-scoped styles of `MessageBubble`/`MarkdownView`; source order decides ties, the injected `<style>` is later in the DOM → theme wins. (Analogous to report-themes.md §9.6, to be verified against the chat structure, not assumed.)
- **Pre-Scoped Pass-Through:** A selector that **already contains** the scope class (`.chat-theme[data-mode=dark] .msg-user { … }`) is **not touched** — leak-proof (everything remains under `.chat-theme`), but allows control for rules that the pure descendant prefix cannot express.

**Dark Mode — Authoring Contract:**

1. **Primary: Design Tokens.** Themes style via DaisyUI CSS variables (`var(--color-primary)`, `var(--color-base-content)`, …) — which flip with `<html data-theme>`; a token-based theme is automatically dark-mode correct. Catalog in the bundled `default.css`.
2. **Explicit Overrides** via the Pass-Through form: The mode is on the `<html>` (**ancestor**, not descendant — descendant prefixing cannot represent ancestor selectors, hence the rule). The client mirrors the resolved mode as `data-mode="light|dark"` on the Scope Root (`resolvedUiTheme`-Ref from `platform/themeWeb.ts`), the author writes `.chat-theme[data-mode=dark] …`.
3. **Deliberate Boundary:** no CSS nesting, no `&` (like Report Themes). Nesting renders incorrectly — documented compromise, not a bug.

**Stable Theme Hooks on the Transcript:** `MessageBubble` carries the visually inert classes `msg-row` + `msg-user` / `msg-assistant` / `msg-system` on the bubble row — the per-role anchors that a theme can address (template-only, no own style, no logic).

## 7. Session Wiring (Bootstrap, Resume, Client)

The client never knows the Recipe resolution, only the result — `ChatThemeResolver.effectiveThemeName` is the sole server-side source:

| Area | Field | Source |
|---|---|---|
| `SessionBootstrapResponse` (WS-Reply) | `chatTheme: string?` | `chatProcess.recipeName` → Resolver; `null` only without Chat Process |
| WS `SessionSummary` (`session-list` — the chat's resume path) | `chatTheme: string?` | Batch-Join `chatProcessId → recipeName` (one Repo call) → Resolver, memoized per request on `(project, recipe)` |
| REST `SessionSummaryRichDto` (`GET /sessions` — Picker) | `chatTheme: string?` | same Join as in the WS handler |
| `RecipeListedDto` (Recipe Picker) | `webTheme: string?` | `ResolvedRecipe.webTheme` — pure display |

**Client (`vance-face`):**

- `ChatTheme.vue` — the theme injector (pattern: `MarkdownDocumentPreview.vue`): fetches `projects/{project}/chat-themes/{name}/css` once per session (in-memory cache, bound map; browser cache covers cross-tab via `max-age=60`) and renders a fragment — the CSS as `<style>` **in the light DOM** (no Shadow DOM, same reasoning as report-themes.md §9.3) before the Slot-Content. Fail-open: Error → no `<style>`, WARN, no error banner.
- `ChatView` binds the scope class `chat-theme` + `data-mode` to the Transcript Scroll Container and passes `chatTheme ?? 'default'` + `chatProjectId` to the injector — Composer/Toolbar are outside the Scope Root.
- `ChatApp` holds `chatTheme` as Session-Resolved-State (next to `chatProjectId`), populated/reset in `resolveSessionAndProcess`/Socket-Reset.
- `MarkdownView` and `MessageBubble` retain their logic and styles — the frame merely encloses them; DOMPurify is not involved (CSS comes from the filtered endpoint, never from message content).

## 8. Creator Delegation — Who Creates Themes

A Chat Theme is persistent project configuration — precisely the domain of the
**Creator** worker (the same pattern as Scheduler/Events/Hooks/Tenant-UI).
Its manual `_vance/creator/manuals/chat-theme.md` (`audience: creator`, loaded via
`manualPaths`, `manual_read('chat-theme')`) covers the entire process:
create Theme CSS via `doc_write` under `_vance/chat-themes/<name>.css`, then
select it via the Recipe `webTheme:` line — for bundled Recipes via
Project Override **with all fields** (first-hit-wins, no merge).

Two boundaries that the manual explicitly tells the agent:

- **Project-Layer only.** The Creator is a worker — `EddieContext.resolveProject`
  constrains it to the inherited project; the `_tenant` layer (tenant-wide theme,
  `default.css` override) is Operator work. The agent states this openly, instead
  of repeating write attempts.
- **`recipe_describe` now shows every parsed Recipe field.** Previously, the
  tool only showed a snippet — a reconstructed override from that would have
  silently lost Guards/Modes/Profile/Metadata. The complete output is the
  prerequisite for the override-is-the-entire-file rule to be followed
  without knowing the original.

## 9. What Chat Themes are NOT (v1)

- **No Theme in Inbox/Search/LinkCards.** Only the Session's chat; the other MarkdownView surfaces do not see a theme (report-themes.md §9.9 remains valid for them).
- **No Theme Editor, no Discovery UI.** Themes are managed as CSS Documents (Cortex, `doc_write`, Kit).
- **No Hot-Reload Push.** The client caches for 60 s (browser) — a theme edit shows after expiration or a hard reload.
- **No DOCX/ODT equivalent** — this exclusively concerns the web chat.

## 10. Files

| File | Role |
|---|---|
| `vance-brain/.../chattheme/ChatThemeResolver.java` | Cascade + Default-Fallback + `effectiveThemeName`, `@Service` |
| `vance-brain/.../chattheme/ChatThemeController.java` | Endpoint, Pipeline resolve → sanitize → scope, Cache-Header + ETag |
| `vance-brain/.../tools/report/CssScopePrefixer.java` | Parameterized + Pre-Scoped-Pass-Through (Report path unchanged) |
| `vance-brain/.../resources/vance-defaults/_vance/chat-themes/default.css` | Bundled Default: rule-free, Token Catalog |
| `vance-brain/.../resources/vance-defaults/_vance/chat-themes/eddie.css` | Pastel blue (light + dark variant), Recipe `eddie` (`webTheme: eddie`) |
| `vance-brain/.../resources/vance-defaults/_vance/chat-themes/creator.css` | Pastel red (light + dark variant), Recipe `creator` (`webTheme: creator`) |
| `vance-brain/.../resources/vance-defaults/_vance/chat-themes/wowbagger.css` | Warm sand transcript with meander mosaic frieze (light + dark variant), Recipe `wowbagger` (`webTheme: wowbagger`) |
| `vance-addon-brain-nutrimat/.../resources/vance-defaults/_vance/chat-themes/nutrimat.css` | Warm red with exclamation mark mosaic frieze (light + dark variant), Recipes `nutrimat-janx`/`redbull`/`clubmate`/`absint`/`salitos` (`webTheme: nutrimat`, bundled in the Nutrimat Addon — Classpath tier of the Cascade) |
| `vance-brain/.../resources/vance-defaults/_vance/manuals/chat-themes.md` | Operator/Author Manual (Creation, Override, Debugging) |
| `vance-brain/.../resources/vance-defaults/_vance/creator/manuals/chat-theme.md` | Creator Manual (`audience: creator`) — Theme + `webTheme`-Override as delegation process, including Tenant boundary |
| `vance-brain/.../resources/vance-defaults/_vance/recipes/creator.yaml` | Mechanism bullet + `manual_read('chat-theme')` |
| `vance-brain/.../tools/recipe/RecipeDescribeTool.java` | Complete Recipe field view — prerequisite for complete Project Overrides |
| `vance-brain/.../recipe/RecipeLoader.java` + `ResolvedRecipe.java` | `webTheme` field: Parse + Load-Time Validation |
| `vance-api/.../ws/SessionSummary.java`, `.../thinkprocess/SessionBootstrapResponse.java`, `.../session/SessionSummaryRichDto.java`, `.../recipe/RecipeListedDto.java` | `chatTheme`/`webTheme` fields (TS generation runs with) |
| `vance-brain/.../ws/handlers/SessionListHandler.java`, `.../ws/handlers/SessionBootstrapHandler.java`, `.../session/SessionListController.java`, `.../recipe/RecipeController.java` | Server wiring of fields |
| `client/.../chat/ChatTheme.vue` | Transcript Frame: Fetch, Cache, `<style>`-Injection, `data-mode` |
| `client/.../chat/MessageBubble.vue` | Inert hook classes `msg-row`/`msg-user`/`msg-assistant`/`msg-system` |
| `client/.../platform/themeWeb.ts` | `resolvedUiTheme`-Ref (reactive mode mirror) |
| `client/.../chat/ChatApp.vue`, `client/.../chat/ChatView.vue` | `chatTheme`-State + Frame integration |

**Tests:** `ChatThemeResolverTest` (Cascade/Fallback/effectiveThemeName + Bundled-Default-Smoke), `ChatThemeControllerTest` (Pipeline, Header, Pass-Through, Project-READ), `CssScopePrefixerTest` (Parameterization + Pass-Through), `RecipeLoaderTest` (`webTheme`-Parse/Validation), `ChatTheme.test.ts` (Fetch fail-open, Cache, `data-mode`).

## 11. History

- **v1 (production, this spec):** Recipe field `webTheme`, own `_vance/chat-themes/` namespace with rule-free `default.css` as normal state, name-based CSS endpoint (Project-READ, sanitize + scope), Bootstrap-/Session-List-Wiring (WS + REST), `ChatTheme.vue` frame with `data-mode` mirror and Pre-Scoped-Pass-Through on the Prefixer. Plan: [planning/chat-themes.md](../planning/chat-themes.md).
- **Open (if at all):** Theme Discovery Listing (`GET …/chat-themes`), Picker Preview of the Theme (`RecipeListedDto.webTheme` is available, UI does not yet show it), Theme Editor.
