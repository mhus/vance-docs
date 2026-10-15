---
title: "Vancetope — Designer App"
parent: Specs
permalink: /specs/app-designer
---

<!-- AUTO-GENERATED from llm/specification/app-designer.md (translated from the German specification/public/app-designer.md) — do not edit here. -->

# Vancetope — Designer App

> A **Designer App** (`app: designer`) is a collection of web designs: A design is a **folder of ordinary documents** — `index.html` plus any CSS/JS/Assets — and the app displays each design folder as a **live preview in a sandboxed iframe**. No build step, no framework: Anyone who can write documents can write a design, and an Agent can create it with `doc_write` just as a human can via the editor.
>
> The core is the **Content Endpoint** `GET /brain/{tenant}/addon/designer/content/{appDocId}/{previewToken}/{design}/{path…}`: It delivers the files of a design to the browser — authenticated via a short-lived `DESIGN_PREVIEW` JWT, which is **embedded as a path segment** in the URL, with a per-request READ check. This allows the preview to run in an **Opaque-Origin Iframe** (no cookies, no `Authorization` header, no access to the Vance API) without opening a security hole.
>
> See also: [bistromath-system](/specs/bistromath-system) (the *other* "behavior from documents" approach: app logic instead of static designs) | [doc-kind-application](/specs/doc-kind-application) | [report-themes](/specs/report-themes) (the first "file as web content" path, PDF-only) | [permission-system](/specs/permission-system) (per-request check, project confinement)

---

## 1. Purpose and Delimitation

**Problem.** Designs — landing pages, mockups, style studies — are currently HTML/CSS/JS. In Vance, there was no place for them: a `workpage` renders blocks, an image is static, and "view in browser" meant exporting files.

**Solution.** An app type whose entire substance comes from the document tree: The app is a folder with `_app.yaml` (`app: designer`), each design a subfolder with `index.html` as its entry point. The app reads the tree live (no registry document), and the browser renders the preview itself.

**Boundary with Bistromath.** A Bistromath app is a *program* (views, state, `vance.*` host API, data access). A design is *static web content* — there is deliberately no host API access, no cookies, no interaction with Vance. Both are "behavior from documents," but the trust levels are different: A Bistromath program runs in a controlled sandbox **with** an API bridge, a design runs in a hard sandbox **without**.

**Not a Website Host.** The content endpoint is authenticated and read-only and serves for preview; publishing is done via export or an external host.

---

## 2. File and Folder Model

```
designs/                     ← App folder
  _app.yaml                  ← Manifest (designer_app_create writes it)
  _index.md                  ← generated catalog (app_rebuild)
  landing/                   ← Design = subfolder
    index.html               ← Entry — without it, the folder is not a design
    style.css, script.js     ← ordinary documents, relatively referenced
    design.yaml              ← optional: title, description (editable per design)
    assets/logo.png          ← Binary documents are delivered with their MIME type
```

- **A design is the first path level under the app folder.** Names with a leading `_` are reserved (manifest, artifacts) and never designs.
- **Folders without `index.html` are not designs** — no error, they remain in the tree and do not appear in the app.
- **`design.yaml`** (title/description) is metadata display, leniently parsed; a broken file does not hide the design.
- All files are ordinary documents: `doc_write`, upload, locking, history — the Designer does not add a second file system.
- **Design order** is in the manifest (`config.designer.order`) — written by drag-and-drop from the catalog list, read by the scan: listed designs first in list order, the rest alphabetically. The scan reads it leniently; a broken manifest falls back to alphabetical order.

---

## 3. The Preview: Sandbox + Path Segment Token

### 3.1 Why the Token is in the Path and Not in the Query

The Preview iframe runs with `sandbox="allow-scripts"` — **Opaque Origin**. This is the security boundary: no cookie access, no `Authorization` header, no way back to the host page. The price: The browser **no longer automatically authenticates** sub-resource requests (`style.css`, images, fonts) — and a query parameter (`?token=…`) does not survive the first **relative** URL resolution of the design.

Therefore, the token is **as a path segment** before the design:

```
GET /brain/{tenant}/addon/designer/content/{appDocId}/{previewToken}/{design}/{inner…}
```

`css/style.css`, resolved relatively from `.../{design}/`, ends up again **within** the same token prefix. This is the only reason for the URL form — it is not a convention, but the condition for relative sub-resources to work.

### 3.2 The `DESIGN_PREVIEW` Token Type

- **Minting:** `POST /brain/{tenant}/addon/designer/preview-session?projectId&folder` — normally authenticated (Cookie/Bearer), READ on the app manifest is enforced. Response: `{token, expiresAt}`.
- **Claims:** `tid` (Tenant), `pid` (Project), `fld` (App folder). TTL default 30 minutes, configurable via `vance.designer.preview-token-ttl-seconds` (kebab-case, see property rule).
- **The token type is not accepted as Bearer by any access filter.** Only the Content Controller validates it. A leaked token can therefore never open another REST surface — it can only re-read files **from that one app folder** that its minter was already allowed to read, plus the **`style.css` of the Design Skills** in the project scope (Skill Style Previews, §4d — the same surface that the token's catalog already shows), and only until `expiresAt`.
- **Per-Request READ Check:** Each content fetch builds a `SecurityContext` from the token claims (project-confined via `restrictedToProject` — the same attenuation as for integration credentials, see permission-system) and enforces READ on the addressed document. A revocation takes effect on the next fetch, not only when the token expires.

### 3.3 Validation in the Content Controller (in this order)

1. Token: Signature, type, tenant match, `pid`/`fld` present — otherwise **404** (the route confirms nothing about existence).
2. `appDocId` from the URL must be the manifest document that matches the `fld` claim (tenant, project, path) — otherwise 404. This ensures that a token for App A can never deliver App B.
3. Path resolution via `DesignerPaths` (pure, tested): empty inner path → `index.html`; `..`, `.`, backslash, empty segments, `/` in design name → 404. The composition from validated segments guarantees that the resulting path remains within the design folder.
4. Load document by path — 404 if unknown.
5. Enforce READ (per-request, see above).
6. Deliver with `storageId`-ETag + `Cache-Control: no-cache` (same freshness rule as the Document Content Endpoint: edit visible on next reload, unchanged file a cheap 304) and `X-Content-Type-Options: nosniff`. **MIME correction on delivery** for the two preview-critical extensions: `.html`/`.htm` is served as `text/html`, `.css` as `text/css` — regardless of the stored MIME (historical `doc_write` kind default error: `index.html` rendered as `text/markdown` with `nosniff` as source code). All other files retain their stored MIME; `designer_validate` continues to report the discrepancy so that the data can be fixed at the source.

**Filter Exception:** `BrainAccessFilter` exempts the route from the Bearer requirement (like WebDAV/Office callbacks: controller-side auth). The exception is limited to exactly this path form.

### 3.4 What the Sandbox Makes Secure (and What It Deliberately Cannot Do)

- Design code runs, can style itself, animations, canvas, everything — but **without** `allow-same-origin` there are: no cookies, no `localStorage` of the Vance origin, no `parent` access, no Vance REST calls with credentials. A malicious design written by a project member **cannot** act in the viewer's session.
- External requests (CDN fonts, external images) are technically possible — the endpoint cannot prevent them (the browser loads them directly). The Manual advises local assets; it's no more than a hint, and no more is needed: Designs are project content from people with WRITE.
- **No `allow-forms`, no `allow-popups`, no `allow-top-navigation`** — the whitelist remains `allow-scripts`.

---

## 4. App Type (`VanceApplication`)

| SPI Method | Behavior |
|---|---|
| `create` | Writes `_app.yaml` (via `designer_app_create` tool **or** the Application Template `_vance/templates/designer.yaml`, `app:` dispatch — the same call); Config block `designer.index.outputPath: _index.md`. **Seeds a starter design `hello/`** if the folder doesn't have one yet (index.html + style.css with relative reference + design.yaml) — the acceptance of the scaffold is something visibly running, not a note about itself (Bistromath Hello World rule); the relative CSS reference simultaneously demonstrates the sub-resource contract of the preview |
| `refresh` | Scans and writes `_index.md` (catalog of Markdown links) — readable anywhere Markdown renders |
| `describe` | 🎨 |
| `status` | Number of designs + first 8 designs as card items |
| `targets` | Designs as `AppTarget`s (NAVIGATE; Handle = design name) |
| `promptInject` | Short chunk: folder, design names, authoring method (`doc_write`), `design` skill hint, Manual reference `manual_read('app-designer')` — **plus the open design page** (see below) |

The per-app prompt injection path exists and is used here as with Links/Feeds (see [prompts-and-manuals](/specs/prompts-and-manuals), `ActiveAppPromptResolver`).

**The open design page travels with the turn.** The client reports the design preview as app selection (`vance:report-app-selection`, like Links/Canvasbook): as `selection` travels **only the design name**, everything else (title, file list) the server reads from its own scan — an authority for what a design is, not a second copy that is correct until someone edits the first (same rule as Links: only the URL travels). The permanent reference (`SelectionReference`): Label = title snapshot, `vanceUri` = `vance:/<folder>/_app.yaml?entry=<design>` — roundtrip-capable because the client consumes the same handle as `?entry=` (`useAppEntry`): Click = `push`, auto-selection/restore = `replace`, tab switch pulls back the selection. Server-side, `appendOpenDesign` phrases it as "The design currently open in the preview is `landing` …" — **deliberately not "selection"** (chat model reads this as a text area; lesson from Links), lists the files, and names the `doc_write` path. A stale name (deleted in another tab) silently disappears.

**Scan (`DesignerFolderReader`):** lists the app folder, grouped by the first path level, design = group with `index.html`; `design.yaml` metadata lenient, order from the manifest. No intermediate state — every view/status/refresh response is a live scan.

### 4a. Design Mutations (REST)

Four endpoints, all Project-WRITE-enforced, all with the **same response**: the freshly scanned catalog (`DesignerView`) — the client replaces its state with a form, and a failed drag resynchronizes from the server instead of recalculating locally. Business logic resides in `DesignerApplication` (data sovereignty over the folder), the controller is an inbound adapter:

| Endpoint | Effect |
|---|---|
| `POST …/addon/designer/design` | Creates a design: Entry stub `index.html` (HTML-escaped title field), plus `design.yaml` if title/description are given. Invalid name (traversal, reserved) or existing design ⇒ 400 |
| `DELETE …/addon/designer/design?name=` | Moves **every** file of the design to the trash — the reconstructible delete, as in the document editor |
| `POST …/addon/designer/reorder` | Persists the complete order in `config.designer.order`; names that are not designs are dropped (a stale client catalog must not nail down ghost positions) |
| `POST …/addon/designer/design-meta` | Upsert of `design.yaml`: empty values remove their key, foreign keys survive |

### 4b. Agent Tools (LLM)

| Tool | Effect |
|---|---|
| `designer_app_create` | Manifest + Seed (see above) |
| `designer_design_delete` | Moves a design completely to the trash (same as the ✕ button). **Deliberately the only design mutation tool**: Creation is `doc_write` — an agent writes real content, a stub tool would have no added value; editing is also `doc_write`. Deletion, however, would be file-by-file `doc_delete` with fragmentation risk — that's worth a tool |
| `designer_validate` | Static folder check (`{ok, errors, warnings, findings[]}`, pattern `workbook_validate`): **names what the catalog silently drops** — folders without `index.html` (classic authoring error, invisible in the app), broken `design.yaml`, ghost entries in `designer.order`, missing manifest, **MIME breaches** (stored MIME ≠ extension, e.g., `index.html` as `text/markdown` — with `nosniff` the preview shows raw source code; entry file = Error with re-save hint, other files = Warning). The reader provides `scanFull` for this (the full picture including dropped states) — a grouping pass feeds catalog and validator, the two views cannot diverge |

The Manual (`app-designer.md`) is the complete authoring guide: file layout, `doc_write` workflow, responsive + Dark Mode authoring (`prefers-color-scheme` reacts to the preview toggle), validate and delete calls. The `promptInject` names folders, designs, and the validate hint.

### 4c. Bundled Example Skill

`_vance/skills/design-blueprint/` (Classpath layer in the Addon): the demonstration skill — **visible, trigger-less, and agent-advertised** (`enabled: true`, no `triggers:` block, `activation: agent`): appears in `/skill list` and in the "Available skills" section of the Turn context, but never activates on a keyword; the agent calls it itself via `skill_activate` if a brief matches, the user via `/skill design-blueprint` (Skills Spec §4g — this field is why the agent is allowed to see it despite missing triggers). (Deliberately not `enabled: false` — that would make it **invisible**, the loader skips disabled skills in the listing.) It shows the pattern of how Designer Skills carry sample assets:

- `SKILL.md` — Authoring workflow for a landing page in the Designer (create app → load blueprint stylesheet as reference → write actual files → validate).
- `style.css` — a complete, usable stylesheet (token set, mobile-first grid with breakpoints, `prefers-color-scheme` Dark Mode), **directly in the skill folder next to `SKILL.md`** (formerly `references/blueprint.css` — the path has been fixed since the style preview convention, see below and §4d). It also remains a `referenceDoc` with `loadMode: ON_DEMAND` — reloadable via `manual_read('Designer Blueprint Stylesheet')` without costing tokens upfront.

To customize: copy the folder to the Project or `_tenant` layer and edit (Resource layer is deliberately silent). Also fixed: `SkillSteerProcessor.activate` now refuses explicit activation of disabled skills with a copy hint (`DisabledSkillException`) — previously this was possible, contrary to the Skills Spec ("neither explicitly nor implicitly activatable"; the implicit side was already checked in `SkillTriggerMatcher`). The discovery test (`BundledSkillResourceTest`) checks frontmatter, the `design` label, and the asset against the actual Classpath glob pattern — the loader would only skip broken bundled skills with WARN.

**Label Convention `design`:** A skill with tag `design` is a design blueprint — activatable to create designs in the Designer. `tags` travel into the Skill Panel (`SkillSummaryDto`), discovery indexes Title/Description/Triggers. The Manual (`app-designer.md`, section "Design skills") tells the agent: before designing from scratch, check the **Available-skills** section in the context (`activation: agent`) and activate a suitable `design` skill via `skill_activate`; the `promptInject` provides the hint per turn.

**`style.css` Convention:** A design skill carries its house stylesheet as `style.css` **directly next to `SKILL.md`** — the same filename that a design folder uses. This is the *actual* stylesheet file (also a referenceDoc), not a preview-only copy: The Skill Catalog (§4d) renders exactly this file as a live style preview. It is read tier-pinned via skill sibling resolution (`SkillLoader.readSkillFile` — the same mechanism as referenceDocs, never re-cascaded); if it's missing, the catalog shows the skill without a preview, it doesn't hide it.

### 4d. Design Skill Catalog (REST + Style Previews)

Two endpoints, two trust models as with View/Content:

| Endpoint | Effect |
|---|---|
| `GET …/addon/designer/design-skills?projectId&sessionId&processName` | Lists the skills visible in the project scope with tag `design` (cascade-deduplicated, disabled skipped), sorted by title: Name, Title, Description, Version, Source Tier, `style` (style.css present). `sessionId`+`processName` are **optional**: Only with an open chat does the server join the active status per skill — including `fromRecipe` (Recipe-bound activation, which ✕ in the UI deactivates; READ on the Think Process — the same resource as for `process-skill`-WS-LIST). Without chat, `active`/`fromRecipe` remain **absent**, not `false` — without an active chat, there is no activation status, and "inactive" would be an assertion the server cannot make. A stale Process Handle degrades to "nothing active" instead of failing the entire catalog. LIST-READ on the project covers the metadata |

Both endpoints roughly evaluate: unknown or style-less skill, broken token, wrong pin → `404`. With an open chat, the **Modal** offers the SkillPanel pair: ▶ writes `/skill <name> ` (trailing space for arguments) as **Composer Prefill** — the user completes and submits themselves, the Composer remains the only activation path — and ✕ performs the same `process-skill`-CLEAR round-trip (Recipe-bound skills: ✕ disabled). The Remote possesses neither Composer nor Socket for this: The Host provides both as injects (`vance:compose-prompt` through the expose chain EditorApp → CortexRightPanel → CortexChatPanel → ChatSidePanel → `ChatComposer.setText`; `vance:process-skill-clear` wraps the tab-singleton WS with fixed process name `chat`). The CLEAR response carries the post-mutation `activeSkills`, the modal updates its badges without relisting.
---

## 5. Client Surface

- **Kind Registration:** `application:designer` (Federation Remote `@vance-addon/designer`, `kinds:` in `vance-addon.yaml` as load trigger). The host resolves via explicit ID lookup; `matches()` is intentionally `false` (as with all app kinds).
- **`DesignerApp.vue`:** Design catalog on the left (name, title, description, file count), live preview on the right. Session minting automatically (also renews 60s before expiration), reload button mints fresh and remounts the iframe. Empty state explains the folder/entry model.
- **Catalog Operations:** "New Design" button (name/title/description, modal), ✎-edit title/description, ✕-delete with confirmation modal (trash hint), drag-and-drop sorting of the list (`vue-draggable-plus`, entire card = handle) — each mutation adopts the server response, a failure resynchronizes.
- **Design Skill Catalog (§4d):** Toolbar button "Design Skills" opens a modal: for each skill with tag `design`, a small framed style preview box on the left (sandboxed iframe like the main preview, token from the same preview session) and on the right title, name, description, source badge, and — **only with an open chat** — the active badge plus the SkillPanel control pair: ▶ = Composer Prefill `/skill <name> `, ✕ = `process-skill`-CLEAR (disabled for Recipe binding). The chat view comes from the host: `inject('vance:session-id')` (null in chatless tab) + the injects `vance:compose-prompt`/`vance:process-skill-clear`; without chat, the modal shows a hint instead, not a false "inactive".
- **Preview Settings** (bar above the preview):
  - **Color Scheme ◐/☀/☾** — `color-scheme` on the iframe element propagates into the browser context of the design: `@media (prefers-color-scheme: dark)` in the design reacts to the toggle without the design needing to be wired for it. "◐" = like system, "☀"/"☾" enforce light/dark.
  - **Responsive Presets 🖥/▭/▯** — Desktop (fills), Tablet (820 px), Phone (390 px); device rendering is centered with letterbox and shadow in the preview area.
  - **Rotate ⟳** — portrait/landscape swaps the preset width (Tablet 820/1180 px, Phone 390/844 px); only visible for device presets.
- **`DesignerAppKind.vue`:** WS reaction via `useDocumentPrefixReaction` on the app folder prefix — remote changes (new design, edited CSS) reload the catalog.
- i18n complete (en/de, own namespace `designer.*`), no DaisyUI classes outside `@vance/components`.

---

## 6. Files

| File | Role |
|---|---|
| `vance-addon-brain-designer/.../DesignerPaths.java` | Pure path arithmetic + traversal rules (11 Unit Tests) |
| `.../DesignerFolderReader.java` | Live scan of the app folder |
| `.../DesignerPreviewTokenService.java` | Mint/Validate of `DESIGN_PREVIEW` tokens |
| `.../DesignerContentController.java` | `view`, `preview-session`, Content Route (per-request READ, ETag, 404 coarsening), `design-skills`, `skill-preview` |
| `.../DesignerSkillService.java` + `DesignerSkill(List).java` | Design Skill Catalog: Tag filter, style.css convention, demo body rendering; DTOs generated to `client/src/generated/designer/` |
| `.../DesignerApplication.java` | App SPI: create/refresh/describe/status/targets/promptInject |
| `.../DesignerAppCreateTool.java` | `designer_app_create` — only writes the manifest |
| `.../templates/designer.yaml` | Application Template (Create Dialog): `app: designer` dispatch, title/description fields |
| `.../_vance/skills/design-blueprint/style.css` | Example asset of the `style.css` convention (formerly `references/blueprint.css`) |
| `vance-shared/.../TokenType.java`, `VanceJwtClaims.java`, `JwtService.java` | `DESIGN_PREVIEW` type, `fld` claim, Mint/Parse |
| `vance-brain/.../BrainAccessFilter.java` | Route release (controller-side auth) |
| `vance-brain/.../SecurityContextFactory.java` | `fromDesignPreviewClaims` — project-restricted context |
| `vance-brain/.../SkillLoader.java` (`readSkillFile`) + `SkillResolver` | Tier-pinned sibling read for skill assets — same rule as referenceDocs |
| `client/src/*` | Federation Remote: DesignerApp, api (URL builder with path token), Skill Catalog Modal, i18n, Tests |

---

## 7. Open / Later

The points that this step deliberately does not solve (Step 2+ of the "Designer"):

- **Preview Thumbnails** (as OpenDesign shows them): Catalog cards currently show metadata, not miniature renderings. An image per design would be a `design.yaml` field or a server-side rendered poster — open.
- **Per-Design Manuals/Prompt Fragments** beyond the app content.
- **Skills with Design Assets** — implemented: the `style.css` convention (§4c/§4d) turns the already existing sibling file capability (`referenceDocs`) into a design skill convention with live style preview. The inverse case remains open: a skill that also makes its structural examples (entire HTML sections) previewable.
- **Export/Publish** a design as a ZIP or to an external host.
