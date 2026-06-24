---
title: "Vance — Inline & Embedded Content"
parent: Specs
permalink: /specs/inline-and-embedded-content
---

<!-- AUTO-GENERATED from specification/public/en/inline-and-embedded-content.md — do not edit here. -->

---
# Vance — Inline & Embedded Content

> Defines how structured content (tables, mindmaps, graphs, code, images, PDFs, ...) is displayed in chat messages and document bodies. Two delivery channels, one common render path in the frontend.
> See also: [web-ui](/specs/web-ui) · [recipes](/specs/recipes) · [doc-kind-mindmap](/specs/doc-kind-mindmap) · [doc-kind-sheet](/specs/doc-kind-sheet) · [doc-kind-graph](/specs/doc-kind-graph) · [doc-kind-slides](/specs/doc-kind-slides)

---

## 1. Purpose

LLMs generate — and users upload — content that appears in a chat conversation: code snippets, tables, mindmaps, diagrams, images, PDFs. This content should be displayed **embedded** in the Web UI (sortable table, rendered mindmap, PDF viewer), pass cleanly as Markdown in plain-text clients (Foot-CLI, external tools), and/or leave a clear indication of where the binary content is located.

We define two orthogonal delivery channels for such artifacts:

| Channel | Where content lives | Delivery form | When |
|---------|--------------------|------------|------|
| **Inline** | In the message text itself (Fenced Code Block) | ` ```<kind>\n<content>\n``` ` | Streamable text artifacts, ephemeral, in the chat flow |
| **Embedded** | In the Document Store, referenced | Markdown link / Image link with `vance:`-URI: `[text](vance:/...)` or `![alt](vance:/...)` | Binary content (image, PDF, audio, video), uploads, persisted deliverables |

Both channels arrive at the Web UI using the **same renderer per kind**. The renderer decides based on the delivery channel whether to render content directly (inline) or load the referenced Document and then render it (embedded). From a UX perspective, the user sees the same mindmap or table element in both cases — with additional "Open / Download" actions leading to the Document editor in the embedded path.

**What this spec defines:**
- Fence syntax for inline artifacts (`kind` as language tag).
- `vance:` URI scheme for embedded references (Markdown link and image link).
- Frontend registry per `kind` with inline and embedded adapters.
- Fallback behavior for unknown kinds and non-renderable combinations.
- Promote path (Inline → Embedded, user action).
- Recipe/Engine instruction: how the LLM is instructed on which channel is suitable for which artifact.

**What it does not define:**
- Content schemas per `kind` — these are in the respective `doc-kind-*` specs (`doc-kind-mindmap`, `doc-kind-sheet`, ...).
- Storage of Documents in the store — see `workspace-management.md` and the doc-kind specs.
- Multimodal upstream to the LLM (how an image goes as pixels to vision models) — see `llm-resource-management.md` extension Multimodal (separate spec item).
- WebSocket wire format of the chat message — see `client-protokoll-erweiterbarkeit.md`. Inline/embedded content lives **within** the message body Markdown; the protocol requires no adaptation.

---

## 2. Inline Channel — Fenced Code Block with `kind`-Tag

**Syntax:** Standard Markdown fenced code block. The language tag **is** the `kind`:

````markdown
```mindmap
- Vance
  - Brain
    - Engines
  - Foot
  - Face
```
````

````markdown
```table
| Column A | Column B |
| -------- | -------- |
| 1        | 2        |
```
````

````markdown
```java
public record User(String name, int age) {}
```
````

**Rules:**
- The first token after the backticks is the `kind`. Lowercase, ASCII, no whitespace.
- Body is plain text. The content schema is determined by the respective kind (e.g., `mindmap`-body is a bullet list according to [doc-kind-mindmap §3.1](/specs/doc-kind-mindmap#31-markdown), `table`-body is Markdown table or CSV according to [doc-kind-sheet](/specs/doc-kind-sheet), `java`-body is Java source).
- Optional fence meta after the kind, comma-separated, `key=value` form: ` ```mindmap theme=dark,direction=right `. Reserved for renderer-specific hints. Unknown meta-keys are ignored.
- Standard programming languages (`java`, `python`, `sql`, `bash`, ...) are **valid kinds**. The `code`-renderer (default for language tags) provides syntax-highlighted `<pre>` (CodeMirror Read-Mode). Special Vance-kinds (`mindmap`, `table`, `graph`, `tree`, `sheet`, `records`, ...) have dedicated renderers.
- The list of kinds is **open**. The server does not know the list; the frontend has a registry and falls back to the plain renderer (`<pre>`-box with copy button) for unknowns.

**Streaming:** Inline fences are streamed token by token from the LLM and displayed (at least as `<pre>`) in the UI as they arrive. As soon as the closing ` ``` ` arrives, the renderer can switch to the special canvas if the registry knows the `kind`.

---

## 3. Embedded Channel — Markdown Link with `vance:`-URI

**Syntax:** Standard Markdown link or image link syntax. The link target is a `vance:`-URI:

```markdown
See [Q1-Summary](vance:/documents/immobilien/summary.pdf?kind=pdf) for details.

![Architecture Diagram](vance:/diagrams/architecture.png?kind=image)

Cross-Project Reference: [Template](vance://templates-shared/documents/reports/q-template.md?kind=markdown)
```

Two link syntaxes, two default render modes:

| Markdown Form | Default Render Mode | Typical Use |
|---------------|---------------------|---------------------|
| `[text](vance:/...)` | **reference** — compact card / badge with Open/Download actions | Links in prose flow, references, lists |
| `![alt](vance:/...)` | **preview** — inline render of content (image, mindmap render, small PDF preview) | Visual embedding, images, diagrams |

The default mode can be overridden via `?mode=preview` or `?mode=reference` in the query string.

### 3.1 URI Scheme

```
vance:/<path>                              → current Project (empty Authority)
vance://<projectId>/<path>                 → Cross-Project, same Tenant (projectId as Authority)
```

This is exactly the `file:`-URI pattern (`file:///local/path` vs. `file://server/path`). Standard URI parsers in all languages process it without custom code:

- JS: `new URL("vance:/documents/foo.pdf?kind=pdf")` → `protocol="vance:", hostname="", pathname="/documents/foo.pdf", searchParams.get("kind")="pdf"`
- Java: `new URI("vance://immobilien/documents/q1.pdf")` → `getAuthority()="immobilien", getPath()="/documents/q1.pdf"`
- Python: `urlparse("vance:/foo")` → `netloc="", path="/foo"`

The **path component** (`<path>`) is the `name` of the Document (1:1, including all slashes). Examples of real Document names:
- `documents/immobilien/summary.pdf`
- `roadmap/progress.json`
- `diagrams/architecture.png`

There is no magic prefix (`documents/` is not implicit) — what is in the Document as `name` is in the URI path. Path components with special characters are URI-encoded (Spaces → `%20`).

**Cross-Tenant is explicitly not defined.** There is no `vance://<tenant>/<project>/...` scheme. To move data between Tenants, export and import — this is workflow, not reference. The resolver does not accept URIs with a Tenant segment.

### 3.2 Query Parameters

| Parameter | Required | Meaning |
|-----------|---------|-----------|
| `kind` | recommended | Render hint: determines which canvas the frontend builds without a metadata roundtrip. Optional — if omitted, the resolver loads the Document metadata and uses `document.kind`. |
| `mode` | optional | `preview` or `reference` — overrides the default from the link syntax. |
| `caption` | optional | Caption text below the artifact (useful for image links, as the `alt`-text is already in `![alt](...)`). |

Example with all parameters:
```markdown
![Quarterly Cover](vance:/diagrams/q1-cover.png?kind=image&mode=preview&caption=Cover%20Q1%202026)
```

Reserved for later, **not** v1:
- `version=<n>` — specific Document version (see Versioning Spec, when it comes)
- Fragment `#anchor` — scroll target within the rendered Document (e.g., `#item-3` in an Items Document)

### 3.3 Kind Hint — Behavior

The `kind`-hint is the only way to know which renderer is initialized without a metadata roundtrip. Conflict behavior:

1. **Hint present, Document-Kind matches:** First paint with hint, then silent metadata verification.
2. **Hint present, Document-Kind differs:** First paint with hint, upon metadata load the renderer switches to the actual Kind. Dev-Mode: small warning toast ("Kind hint did not match — Engine drift?"). Prod-Mode: silent fix. **Actual Document-Kind always wins.**
3. **Hint missing:** Frontend briefly shows a skeleton loader, loads metadata, renders with `document.kind`.
4. **Document not resolvable (path stale / Cross-Project without Access):** Disabled card with clear explanation. No fallback to hint renderer with phantom content.

### 3.4 Resolution

Frontend renderer pipeline during Markdown rendering:

1. `marked`-parser sees Link/Image token with `href`.
2. Link/Image renderer override checks `href` for `vance:`-scheme.
3. **Non-`vance:`-scheme** (`https:`, `http:`, `mailto:`, ...) → pass through unchanged, normal Markdown link.
4. **`vance:`-scheme** → parse URI, build `EmbedRef` object (see §4), pass to dispatch component `<VanceEmbed>`.
5. `<VanceEmbed>` looks in the renderer registry (see §4) and delegates to the `embedded`-adapter of the matching Kind.

---

## 4. Frontend Renderer Registry

The Web UI maintains a central registry that assigns two optional adapters to each `kind`:

```ts
type FenceMeta = Record<string, string>

type EmbedRef = {
  path: string                       // URI-Path (= document name), URI-decoded
  project?: string                   // undefined = current Project
  kindHint?: string                  // from ?kind=
  mode: 'preview' | 'reference'      // from ?mode= or derived from Link syntax (! → preview)
  caption?: string                   // from ?caption=
  text: string                       // Link text or Image-alt
  raw: string                        // original URI string
}

type Renderer = {
  inline?: (content: string, meta: FenceMeta) => Component
  embedded?: (ref: EmbedRef) => Component
  // Display name for Empty-/Reference-States. Can be missing, then "<kind>".
  label?: string
}

const registry: Record<string, Renderer> = {
  // Vance-Kinds (text-based, both paths)
  mindmap:  { inline: InlineMindmap,  embedded: EmbeddedMindmap },
  tree:     { inline: InlineTree,     embedded: EmbeddedTree    },
  list:     { inline: InlineList,     embedded: EmbeddedList    },
  items:    { inline: InlineItems,    embedded: EmbeddedItems   },
  records:  { inline: InlineRecords,  embedded: EmbeddedRecords },
  // Binary-only — no Inline adapter
  pdf:      {                          embedded: PdfViewer       },
  image:    {                          embedded: ImageViewer     },
  audio:    {                          embedded: AudioPlayer     },
  video:    {                          embedded: VideoPlayer     },
}
```

Standard language fences (` ```java`, ` ```json`, ` ```yaml`, ...) are **deliberately not** in the registry — they fall back to normal Markdown `<pre><code class="language-…">` rendering. Reason: inline code snippets in chat as a full editor canvas are visually overwhelming, and broken LLM outputs (action JSON wrapped in ` ```json`) would appear disproportionately prominent. See §11.4 for specific registry configuration.

**Lookup logic during rendering:**

1. **Inline Fence** with `kind`:
   - Registry has `kind` + `inline`-adapter → Adapter renders.
   - Registry has `kind` but **no** `inline`-adapter (e.g., `pdf` inline) → Fallback `<pre>` with a subtle warning ("`pdf` can only be displayed as a Document — see save button on the right").
   - Kind unknown → Fallback `<pre>` with Copy button, plain text display.

2. **Embedded Link** (` [text](vance:/...) ` or ` ![alt](vance:/...) `):
   - Parse URI, build `EmbedRef`.
   - Determine effective Kind: first `ref.kindHint`, then (after metadata load) `document.kind`.
   - Registry has Kind + `embedded`-adapter → Adapter renders with the (hinted/loaded) Document.
   - Registry has Kind but **no** `embedded`-adapter → Generic reference card (name, icon, size, "Open / Download").
   - Kind unknown → Generic reference card.
   - URI not resolvable (path stale / Cross-Project without Access) → Disabled card with reason.

**Preview vs. Reference Mode for Embedded:**

- `mode: preview` (default for `![]()` syntax, or explicitly via `?mode=preview`): Renderer shows the content directly embedded (image, small PDF preview first page, rendered mindmap, ...). Clicking the element opens the Document editor in a new tab.
- `mode: reference` (default for `[]()` syntax, or explicitly via `?mode=reference`): Compact card or badge with icon, filename, size — clickable like a link. No inline preview.
- User Toggle: every embedded block in the Web UI has a small mode-switch action ("as card / as preview"). User choice is a view preference, does not change the source Markdown.

**Channel-specific Default Actions** (UI implementation details in §11.6):

- **Inline Block:** Primary *Download* (body as file, filename = `<kind>-<timestamp>.<ext>`) + *Raw* (toggle render ↔ source, shows the fence body in read-only code editor). Secondary *Copy* (fence body to clipboard) and *Save as Document* (Promote path §9).
- **Embedded Block:** Primary *Copy* (Document content to clipboard) + *Open* (tab-open of the Document editor). Secondary *Download* (original file from Document Store).

Raw is deliberately inline-only: inline carries the source directly in the fence body, and the user often wants to view or copy the raw source, especially for mindmap/graph/table kinds where the canvas obscures the format. Embedded shows the Document — to get the source form there, click *Open* and see the Raw View tab in the Document editor.

All actions are visible via a hover toolbar on the block header (same pattern as ChatGPT/Claude.ai Artifacts).

---

## 5. Fallback Chain

| Situation | Inline | Embedded |
|-----------|--------|----------|
| Kind known, renderer available | Special Canvas | Special Canvas (with Doc-Load) |
| Kind known, no suitable adapter (e.g., `pdf` inline) | `<pre>`-Plain + Hint | Generic Reference Card |
| Kind unknown | `<pre>`-Plain + Copy Button | Generic Reference Card with Mime/Name |
| Kind-Hint vs. actual Document-Kind differs | — | Renderer switches to actual Kind after Metadata-Load (Dev-Toast, otherwise silent) |
| URI with unknown Scheme (`foo:`) | — | Standard Markdown Link (not touched by Vance) |
| `vance:`-URI with stale path (Document does not exist) | — | Disabled Card "Document not found: `<path>`" |
| `vance://<project>/`-URI, Project does not exist or no Read-Access | — | Disabled Card "No access to Project `<project>`" or "Project not in Tenant" |
| `vance:`-URI with Tenant segment (e.g., `vance:///<tenant>/<project>/...`) | — | Disabled Card "Cross-Tenant references not supported" |
| Inline with broken Fence syntax (no Lang-Tag) | `<pre>` without Kind, plain | — |

**Important:** A fallback is never an error. In the worst case, the user sees a compact hint block — never an empty area or a cryptic stack trace message. Inline Markdown consumers (external tools, logs) continue to see valid Markdown.

---

## 6. Foot-CLI / Plain-Text Clients

Foot renders Markdown textually (see `instructions/foot-ui.md`). For inline and embedded blocks:

- **Inline Fences** are displayed like normal Markdown code blocks: backticks remain visible or are converted into a box frame (Lanterna-Excursion shows box, Default-REPL shows raw backticks). Body is plain text. Programming languages get subtle syntax highlighting if JLine/Lanterna supports it; otherwise monospace.

- **Embedded Links** (`vance:`-URI) are rendered as compact reference card equivalents:
  ```
  ┌─ pdf  documents/immobilien/summary.pdf ───┐
  │  Q1 Quarterly Report                      │
  │  → /doc open documents/immobilien/...     │
  │  → /doc download documents/immobilien/... │
  └───────────────────────────────────────────┘
  ```
  Foot uses the `?kind=`-hint from the URI directly for the icon/label. If the hint is missing, Foot generically shows "document" and only queries metadata via WS upon user open.

- **External Links** (`https:`-URI etc.) remain as clickable Markdown links with underline format — clicking opens the system default browser via OS open command.

- Foot offers slash commands `/doc open <path>` and `/doc download <path> [target]`, which work with `vance:`-paths (Cross-Project: `/doc open <projectId>/<path>` with explicit Project token). This gives the CLI user access to the Document without Foot needing its own PDF/image renderers.

External plain-text consumers (exports, logs) see exactly the same: the Markdown text with fenced blocks and Markdown links remains correct Markdown. `vance:`-URIs are valid URIs according to RFC 3986 and do not break any tool — worst case is a non-clickable link text.

---

## 7. Recipe/Engine Instruction

The LLM prompt prefix (Recipe `promptPrefix` or Engine default prompt, see [recipes §5](/specs/recipes#5)) instructs the LLM when to choose which channel. Convention:

````markdown
## Rich Content Output

You can return structured artifacts in your messages. Use one of two channels:

### Inline — Fenced code block (for everything text-based)
Use a fenced code block with a kind tag for content you generate inline.
Streaming is supported. Kinds you may use:
- `java`, `python`, `sql`, `bash`, `json`, `yaml`, `xml` — code/config
- `table` — Markdown table or CSV
- `mindmap` — bullet-list mindmap (see vance docs)
- `tree`, `graph`, `records`, `items`, `sheet` — structured kinds

Example:
```mindmap
- Topic
  - Subtopic
```

### Embedded — Markdown link with vance: URI (for documents)
Use a Markdown link or image-link with a `vance:` URI ONLY when:
- you have generated a binary artifact (image, PDF) via a tool that returned a document path
- the user explicitly asked to save something as a Document
- you are referencing a Document the user uploaded earlier or that exists in the project

URI form:
- Same project: `vance:/<document-path>?kind=<kind>`
- Cross-project (same tenant): `vance://<projectId>/<document-path>?kind=<kind>`

Always include the `?kind=` hint — the frontend uses it for the initial render
without a metadata roundtrip. The path is the document's name (e.g.
`documents/immobilien/summary.pdf`), 1:1, including all slashes.

Link syntax:
- Reference (card/badge): `[Title](vance:/<path>?kind=<kind>)`
- Preview (inline render, e.g. image): `![alt](vance:/<path>?kind=<kind>)`

Examples:
- Reference a PDF: `See [Q1-Report](vance:/documents/q1.pdf?kind=pdf) for details.`
- Embed a generated image: `![Architecture](vance:/diagrams/arch.png?kind=image)`
- Cross-project: `[Template](vance://templates-shared/reports/q-template.md?kind=markdown)`

Never invent paths. Embedded links must point to documents that exist
(either uploaded, generated via a tool, or referenced from context).
````

**Hard Rules:**

- LLM may write `vance:`-links **only** if it has a **real** Document path (either from a tool call, from Project context, or from user upload). Fake paths are a validation error.
- The Recipe Validator (Slartibartfast `ValidatingPhase`) checks `vance:`-links against the schema; a link with an unresolvable path leads to a re-generate loop.
- LLM may not use a Tenant segment in the URI — Cross-Tenant does not exist in the schema.
- `?kind=` is strongly recommended for every `vance:`-link. If the hint is missing, it is not an error (renderer falls back to metadata load), but Engine Recipes flag it as drift.

**Tool Surface for Document Creation:**
- `image_generate(prompt, …) -> { path, name, mime }` — generates image, persists, returns Document path. LLM builds `![alt](vance:/<path>?kind=image)` from it.
- `document_save(kind, content, name) -> { path }` — persists inline content as Document (Promote trigger; can also be used autonomously by the LLM if generated content is explicitly desired as a Document).
- Standard Document tools (`document_create`, `document_update`) exist anyway (see `server-tools.md`) and return `path`.

---

## 8. Format Matrix (Default List, openly extensible)

| Kind | Inline-Fence | Embedded-Link-Syntax | Renderer Note |
|------|:------------:|:---------------------|----------------|
**Currently registered Vance-Kinds** (see §11.4 for implementation):

| Kind | Inline-Fence | Embedded-Link-Syntax | Renderer |
|------|:------------:|:---------------------|----------|
| `mindmap` | ✓ | `[name](vance:/…?kind=mindmap)` | markmap-Render. |
| `tree` | ✓ | `[name](vance:/…?kind=tree)` | Nested-Bullet-Outline. |
| `list`, `items` | ✓ | `[name](vance:/…?kind=list)` | Flat Bullet-List. |
| `records` | ✓ | `[name](vance:/…?kind=records)` | HTML table with schema header. |
| `image`, `svg` | ✗ | `![alt](vance:/…?kind=image)` | `<img>`-tag with Click-to-Zoom-Lightbox. |
| `pdf` | ✗ | `![cover](vance:/…?kind=pdf)` (Preview) or `[name](…)` (Reference) | pdfjs-dist Viewer with Page-Navigation. |
| `audio` | ✗ | `[name](vance:/…?kind=audio)` | HTML5-`<audio>`-Player. |
| `video` | ✗ | `[name](vance:/…?kind=video)` | HTML5-`<video>`-Player. |
| `youtube` | ✓ (URL/ID in body) | — | YouTube-Iframe via `youtube-nocookie.com` (Privacy-Mode). Fence-Body = `https://youtu.be/<id>`, `https://www.youtube.com/watch?v=<id>` or bare 11-char ID. Meta-Keys: `start=N` (seconds offset), `title=...` (caption). No autoplay. External source — no Document Store path. |
| `slides` | ✗ | `[name](vance:/…?kind=slides)` | Marpit-Render in editor tab (see [doc-kind-slides](/specs/doc-kind-slides) §5). Embedded link opens Document. **Deliberately no Inline-Fence**: Slides are presentation artifacts, not chat stream content; `---` as slide separator within a fenced block would be semantically a second Markdown level without added value. |

**Deferred / not registered** — fall back to standard Markdown rendering:

| Kind | Status | Reason |
|------|--------|------------|
| `graph` | Editor-only | Drag-drop edges + VueFlow render too intertwined with edit handlers for a simple read-only adaptation. |
| `sheet` | Editor-only | Cell formula evaluation + schema edit is non-trivial to represent read-only. |
| `java`, `python`, `sql`, `json`, `yaml`, `xml`, `bash`, `markdown`, … | Standard Markdown `<pre>` | Deliberate decision: inline code snippets as a full editor canvas is visual overshoot. Fallback is `<pre><code class="language-…">` (marked + DOMPurify). Also protects against broken LLM outputs that wrap action JSON in ` ```json`. |
| **(unknown)** | Fallback `<pre>` | — |

The registry is **open** — new kinds are registered in the frontend, no server intervention needed. Recipes/Engine prompts document the recommended subset (§10.2); the LLM may suggest other kinds, which then fall back to the plain renderer.

---

## 9. Promote Path: Inline → Embedded

User action "Save as Document" on an inline block:

1. Frontend reads fence body + Kind.
2. Calls `POST /brain/{tenant}/documents` with body `{ kind, content, name: <user-prompted> }`. Server persists as Document.
3. Server responds with `{ path, name }` (Document-Path = `name`-field).
4. Frontend **locally** replaces the inline block in the chat with an embedded link `[<name>](vance:/<path>?kind=<kind>)` or `![<name>](vance:/<path>?kind=<kind>)` (image style for `image`/`svg`-kinds, link style otherwise). Toast confirms: "Saved as Document: <name>".
5. Future chat responses from the Engine know the Document via the Project memory pipeline and can reference it via a `vance:`-link.

**Original message content remains unchanged** — the inline fence is part of the audit trail. The embedded link is a frontend state materialized by the Document's existence. Upon reload, we see the original fence again — until the user triggers the promote action again or an explicit edit path is built (not v1).

Conversely, there is **no** automatic Inline→Embedded promote by the Engine. The Engine decides at creation which channel is appropriate; subsequent movement is a user matter.

---

## 10. Engine Integration

Three mechanisms ensure that Engines (and thus the LLM) use inline and embedded content **reliably** — not as "the LLM can do it if it feels like it," but as a central output feature.

### 10.1 Tool `document_link` — Canonical Link Builder

The kind of a Document lives in the MongoDB metadata, not in the LLM context. While the LLM often knows the path or name of a Document, it must query the server for the reliable kind. Instead of two steps (`document_find` → manual URI construction), there is **one** tool call that returns the finished Markdown link string:

```
Tool: document_link
Purpose: Build a Markdown link to a Document. Resolves path, kind, project,
         applies link-vs-image syntax automatically.

Parameters:
  query       string,    required.  Document path (e.g., "documents/q1/summary.pdf")
                                    or search query (e.g., "Q1 Quarterly Report").
                                    Exact path match takes precedence.
  text        string,    optional.  Link/Alt text. Default: document.title,
                                    Fallback: path leaf segment.
  mode        enum,      optional.  "preview" | "reference". Default derived
                                    from kind (see below).
  imageStyle  boolean,   optional.  Force "![...](...)"-syntax. Default: true for
                                    kind=image, false otherwise.
  project     string,    optional.  Cross-Project name (same Tenant). Default
                                    = current Project.

Returns:
  {
    markdownLink: "[Q1-Report](vance:/documents/q1/summary.pdf?kind=pdf)",
    path: "documents/q1/summary.pdf",
    kind: "pdf",
    project: null,            // null = current Project
    title: "Q1 2026 Quarterly Report"
  }

Errors:
  DOCUMENT_NOT_FOUND          query matched no Document
  DOCUMENT_AMBIGUOUS          multiple matches; top 3 candidates in error body
  CROSS_PROJECT_DENIED        project exists, but user has no read access
  CROSS_PROJECT_NOT_IN_TENANT project is in a different Tenant
```

**Default Mode Heuristic** in the tool:
- `kind in {image, svg}` → `mode=preview`, `imageStyle=true` → `![alt](...)`
- `kind in {pdf, video}` → `mode=preview`, `imageStyle=false` → `[text](...)` but renderer shows inline preview
- `kind in {audio}` → `mode=reference`, `imageStyle=false` → compact player card
- all others → `mode=reference`, `imageStyle=false` → reference card

User overrides via `mode`/`imageStyle` parameters take precedence.

**Implementation:** `vance-brain/.../tools/document/DocumentLinkTool.java`. Resolver uses `DocumentService` (data sovereignty convention, no direct repository access). Cross-Project lookup via `ProjectService.findInTenant(currentTenant, project)` with access check via `AccessService`. The Engine **never** constructs the `vance:`-URI itself — the tool is the single source of truth for the URI form. If the schema changes (e.g., new query parameters), only this class is adapted.

**Note:** Documents created by other tools (`document_create`, `document_save`, `image_generate`, ...) return the ready-made `markdownLink` field in their tool response in addition to the `path` — same logic as `document_link`, just no second tool call is needed. The LLM copies the link string from the tool result directly into its response.

### 10.2 Recipe Prompt Snippet — Always in `promptPrefix`

Every Engine Recipe (`eddie.yaml`, `arthur.yaml`, `ford.yaml`, `marvin.yaml`, `vogon.yaml`, `slartibartfast.yaml`) includes the following section firmly in its `promptPrefix`. It is identical across Engines — single source of truth via YAML anchor:

```markdown
## Rich Content & Document Links

Rich artifacts go through two channels:

**Inline** — Fenced code block, for content you generate right now:
- Use ```mindmap, ```table, ```graph, ```tree, ```records, ```items for structured artifacts
- Use ```java, ```python, ```sql, ```json, ```yaml, ```xml, ```bash etc. for code/config
- Body is the content. Streams naturally during generation.

**Embedded** — Markdown link to a Document in the workspace:
- ALWAYS build the link via the `document_link` tool. It returns the ready-to-insert
  `markdownLink` string with the correct `vance:` URI, kind hint, and link syntax.
- Use it after creating a Document (any `document_*` or `image_generate` tool — their
  responses already include a `markdownLink` field, no extra call needed) or when
  referencing a Document the user mentioned.
- NEVER hand-construct `vance:` URIs. The tool ensures correctness across renames,
  cross-project lookups, and access checks.

Channel choice:
- Quick conversational artifacts (a snippet, a small table, a brainstorm mindmap) → inline.
- Long content (>500 lines), binary outputs (image/pdf), or content the user asks to save → save as Document, then embed the returned link.
```

Token cost: ~220 tokens per turn — acceptable for a central feature. With prompt caching (see `prompt-caching.md`), the section is practically free after the first turn per session.

**Detailed Manual** under `_vance/manuals/inline-and-embedded.md` (bundled by default Project Kit, see `project-kits-catalog.md`): contains the full format matrix, all edge cases (Cross-Project URI, fragment anchors, versioning), examples per kind. If the LLM needs a special form (rare), it can call the manual via `document_read` — one-time round-trip, then in conversation memory.

**Skill mechanism is explicitly wrong here.** Skills are for capability activation ("do X if the user asks for Y"). Rich content output is an always-on output convention — Persona layer, not Skill layer. Skill description matching is heuristic; an always-on feature must not slip through.

### 10.3 Voice Output — `MarkdownToSpeech`-Strip

Engines generate Markdown uniformly. Voice clients (Mobile-Voice, Foot-with-TTS, later Web-Voice-Mode) strip Markdown **client-side** before TTS synthesis via `vance-shared/voice/MarkdownToSpeech.java`. This keeps the Engine output uniform; only the client render pipeline differs.

**Strip Rules v1:**

| Markdown Construct | Voice Representation |
|--------------------|---------------------|
| `[text](url)` | `text` (URL is dropped, link text is spoken) |
| `![alt](url)` | `alt` (Alt text as description) |
| `[text](url)` with empty `text` | "Link to `<host>`" (host extracted from URL) |
| ` ```<kind>\n…\n``` ` | "(Code block with N lines)" — body is **not** read aloud |
| Headers (`#`/`##`/…) | Plain text + period at end of sentence (TTS pause hint) |
| Bullet List (`- ` / `* `) | "First: ...; Second: ...; ..." |
| Numbered List (`1. ` etc.) | "One: ...; Two: ...; ..." |
| Bold/Italic (`**…**`, `_…_`, `__…__`) | Markers removed, text remains |
| Inline Code (`` `…` ``) | Text without marking |
| Horizontal Rule (`---`, `***`) | Pause token (two periods for TTS) |
| Tables (pipe syntax) | "(Table with X rows, Y columns)" — content is not read aloud |
| HTML Tags (`<br>`, `<span>`, …) | stripped |
| Footnote Refs (`[^1]`) | stripped |

**Where the strip sits:** Client-side in the TTS pipeline. Server sends raw Markdown over WebSocket. Voice client (Mobile-Voice-Layer, Foot-TTS-Subscriber) calls `MarkdownToSpeech.strip(message)` and passes the result to the system TTS (iOS/Android Speech-Synthesis, or Cloud-TTS if configured).

**Java Spec Stub:**
```java
package de.mhus.vance.shared.voice;

public final class MarkdownToSpeech {
    /** Convert Markdown to voice-friendly plain text. Idempotent on plain text. */
    public static String strip(String markdown) { ... }
}
```

Located in `vance-shared` because both Java-Foot (TTS-Subscriber-Mode) and prospectively a Brain-Side-Push (e.g., Notification-TTS) use it. Mobile (TypeScript) gets a port-identical `markdownToSpeech.ts` in `@vance/shared/voice/` — test suite with same golden inputs (see `web-ui.md`).

**Eddie-Recipe-Note:** Eddie uses the **same** Rich-Content section as all other Engines (§10.2). There is **no** Voice-special recipe. Eddie may output Markdown links and inline fences; the strip pipeline normalizes this per client. This keeps the Engine output uniform and avoids recipe bifurcation ("Voice-Eddie" vs. "Text-Eddie") — output channel is chosen by the client, not the LLM.

**Test Surface:** `MarkdownToSpeechTest` in `vance-shared/src/test/...` with golden files per rule — typical Engine output samples (with embed link, with mindmap fence, with mixed bullet/header structure) plus the expected voice form. Language locale is hardcoded `de` in v1 for connector words ("Erstens", "Eins", "Tabelle mit") — a later i18n pass will make this configurable per Tenant locale.

**What v1 does not do:**
- Sentence-Boundary-Smoothing (SSML-pause-markup) — we leave this to the respective TTS engine.
- Reading inline code with phonetic pronunciation (e.g., "underscore" instead of `_`) — symbolism sounds inconsistent in TTS, better to strip.
- Language switching within an output (code in English, prose in German) — the strip treats everything as one locale.

### 10.4 External Link Previews — OpenGraph Cards for https-Links

Every external `https://`-link that the LLM leaves in a chat reply (web_search results, user-mentioned sources, image_search source pages) gets a Slack-/Telegram-style preview card in the Web UI with `og:title`, `og:description`, `og:image`, `og:site_name`. The inline link remains clickable text — the card appears **below** the paragraph as additional context.

**Why not pure-Frontend?** Browser fetch to external domains fails due to CORS — most sites do not set `Access-Control-Allow-Origin: *`. Slack/Discord/Telegram all have a server proxy for this reason. Vance also: a thin `LinkPreviewService` in the Brain fetches OG tags once, caches them tenant-agnostically in `link_preview_cache` (Mongo, TTL index), and responds to all clients via a REST endpoint.

**Architecture:**

| Layer | Component | Task |
|---|---|---|
| Brain | `LinkPreviewController` → `GET /brain/{tenant}/link-preview?url=<...>` | JWT-gated CORS-Bypass. Always responds 200 — `ok=false` for dead/inaccessible links |
| Brain | `LinkPreviewService` | Fetch (Browser-UA, follow redirects, max 256 KiB body), Jsoup-Parse, OG/Twitter/HTML-Fallbacks, Cache |
| Brain | `LinkPreviewCacheDocument` | Mongo TTL-Index. OK 7 days, Failures 60 min. Tenant-agnostic |
| Frontend | `@vance/shared/rest/linkPreview.ts` | Wrapping around the REST endpoint, in-flight-Dedup, Tab-scoped LRU (50 entries) |
| Frontend | `LinkCard.vue` | Card with image + title + site name. IntersectionObserver: fetches only when scrolled into view |
| Frontend | `MarkdownView.vue` | Finds up to **three** external https-links per paragraph, appends a `LinkCard` as VNode below each paragraph |

**OG-Tag-Resolution-Cascade** (each value takes the first non-blank):
- `title`: `og:title` → `twitter:title` → `<title>`
- `description`: `og:description` → `twitter:description` → `meta[name=description]`
- `image`: `og:image` → `twitter:image` (relative URLs are resolved against the final page URL)
- `siteName`: `og:site_name` → Hostname fallback
- `type`: `og:type` (lowercased)

**Non-HTML-Responses:** PDFs, images, videos etc. have no OG tags, but are legitimate links. The service then provides a minimal card with filename-from-path + hostname + content-type-derived `type` (`pdf`, `image`, `video`, `audio`, `binary`). UX output: "Q1-Report.pdf • example.com".

**Failure-UX:** If the proxy cannot reach the URL (4xx/5xx/Timeout/`no_metadata`-verdict): the card shows a dimmed "Preview unavailable" with hostname. This way, the user **sees** that the link is dead — Phase B's output validator also benefits from this as a side effect.

**What is excluded** (no card):
- `vance:`-URIs → own embedded rendering (§3)
- `mailto:`, `tel:`, `#anchor`, other non-http schemes
- Image links (`![alt](url)`) — image renders itself, card would be redundant
- Same-origin links (possibly later, v1: all external)

**Tuning** (all via `_vance` / Project / Process Cascade):
- `web.linkPreview.timeoutMs` — Default 4000
- `web.linkPreview.cacheTtlOkHours` — Default 168 (7 days)
- `web.linkPreview.cacheTtlFailMinutes` — Default 60
- `web.linkPreview.maxBodyBytes` — Default 262144 (256 KiB)

**What v1 does not do:**
- Per-user setting to disable cards — comes later as `webui.chat.linkPreview.enabled`
- Foot-CLI does not render cards (plain Markdown remains Foot's convention)
- Mobile client: no RN card component yet (`@vance/shared/rest/linkPreview.ts` is platform-neutral, so usable there when the component comes)
- Cross-Origin avatars of `og:image`: no proxy resolution — fetched directly by the client (images generally have `Access-Control-Allow-Origin: *`)

---

## 11. Web-UI Implementation

Concrete implementation in `packages/vance-face/`. The abstract adapters from §4 are attached to Vue components and a compile-time registry. No plugin mechanism, no dynamic discovery: a new kind = new view + registry entry + `wb build face`.

### 11.1 Existing Components

Existing Document Views in `packages/vance-face/src/document/`:

| File | Kind | Codec |
|-------|------|-------|
| `ListView.vue` | `list` | `listItemsCodec.ts` |
| `TreeView.vue` | `tree` | `treeItemsCodec.ts` |
| `MindmapView.vue` | `mindmap` | `mindmapAdapter.ts` (uses `treeItemsCodec` as data basis) |
| `RecordsView.vue` | `records` | `recordsCodec.ts` |
| `GraphView.vue` | `graph` | `graphCodec.ts` |
| `SheetView.vue` | `sheet` | `sheetCodec.ts` |

`DocumentApp.vue` currently handles Kind dispatch via explicit switch (`sel.kind === 'list'` etc.). Chat `MessageBubble.vue` currently only renders `<MarkdownView>` — fenced blocks appear as generic `<pre><code>`, `vance:`-links as plain Markdown links. Both will be enhanced as part of this spec.

### 11.2 Mode Prop on Existing Views

Each of the six views gets a prop:

```ts
mode: 'editor' | 'inline' | 'embedded'
```

- `'editor'` (current behavior): Full-page, edit controls, tab bar, edit state management.
- `'inline'`: Compact read-only render. Content comes as `content: string` (fence body), parsed by the existing codec.
- `'embedded'`: Compact read-only render. Content comes as `document: DocumentDto` (from REST load).

One codec logic, one view component, three usage modes. **No** parallel stack `InlineMindmap` vs `EmbeddedMindmap` vs `MindmapView` — the `mode`-prop switches layout and toolbar. Edit paths remain active only in `'editor'`.

### 11.3 New Views for Binary Kinds

New in `packages/vance-face/src/document/`:

| File | Kind | Library |
|-------|------|---------|
| `PdfView.vue` | `pdf` | `pdfjs-dist` (mentioned in `web-ui.md` Tech-Stack) |
| `ImageView.vue` | `image` | native `<img>` + Lightbox-Toggle |
| `AudioView.vue` | `audio` | HTML5 `<audio>` |
| `VideoView.vue` | `video` | HTML5 `<video>` |

Binary kinds have **no** `'inline'`-mode (see §8). With `mode='editor'`, they render in the Document editor as a full player; with `mode='embedded'`, as a compact inline player in the chat.

### 11.4 Registry

New file `packages/vance-face/src/kindRenderers/registry.ts`. It contains **only Vance-specific kinds** — ordinary code/data languages (` ```java`, ` ```json`, ` ```yaml`, ...) deliberately fall back to standard Markdown `<pre><code class="language-…">` rendering, so that a broken LLM response wrapping its action JSON in ` ```json` does not become a large canvas.

```ts
import { defineAsyncComponent, type Component } from 'vue'

export type KindRenderer = {
  inline?: Component
  embedded?: Component
  label: string
  icon: string
}

const MindmapView = defineAsyncComponent(() => import('@/document/MindmapView.vue'))
const ListView    = defineAsyncComponent(() => import('@/document/ListView.vue'))
const TreeView    = defineAsyncComponent(() => import('@/document/TreeView.vue'))
const RecordsView = defineAsyncComponent(() => import('@/document/RecordsView.vue'))
const ImageView   = defineAsyncComponent(() => import('@/document/ImageView.vue'))
const PdfView     = defineAsyncComponent(() => import('@/document/PdfView.vue'))
const AudioView   = defineAsyncComponent(() => import('@/document/AudioView.vue'))
const VideoView   = defineAsyncComponent(() => import('@/document/VideoView.vue'))

export const kindRegistry: Record<string, KindRenderer> = {
  // Vance structured kinds — share their full View across the three
  // modes (editor / inline / embedded) via the `mode` prop.
  mindmap: { inline: MindmapView, embedded: MindmapView, label: 'Mindmap', icon: '🧠' },
  tree:    { inline: TreeView,    embedded: TreeView,    label: 'Tree',    icon: '🌳' },
  list:    { inline: ListView,    embedded: ListView,    label: 'List',    icon: '•'  },
  items:   { inline: ListView,    embedded: ListView,    label: 'Items',   icon: '•'  },
  records: { inline: RecordsView, embedded: RecordsView, label: 'Records', icon: '▤'  },

  // Binary kinds — embedded only.
  image: { embedded: ImageView, label: 'Image', icon: '🖼' },
  svg:   { embedded: ImageView, label: 'SVG',   icon: '🖼' },
  pdf:   { embedded: PdfView,   label: 'PDF',   icon: '📄' },
  audio: { embedded: AudioView, label: 'Audio', icon: '🔊' },
  video: { embedded: VideoView, label: 'Video', icon: '🎬' },

  // External-source embeds — inline-only, no Document load. Fence
  // body carries the URL or video ID.
  youtube: { inline: YouTubeView, label: 'YouTube', icon: '▶' },

  // Graph + Sheet remain editor-only for now (drag-drop / cell-formula
  // logic too intertwined with edit handlers). Standard Markdown fallback
  // handles them via §5 until their Views grow the `mode` prop.
}

export function resolveRenderer(
  kind: string,
  channel: 'inline' | 'embedded',
): KindRenderer | null {
  const entry = kindRegistry[kind.toLowerCase()]
  if (!entry) return null
  if (channel === 'inline' && !entry.inline) return null
  if (channel === 'embedded' && !entry.embedded) return null
  return entry
}
```

`defineAsyncComponent` for each entry → initial bundle remains lean. Pdfjs (~1.5 MB) loads only when a PDF appears in chat or Document editor for the first time.

**`CodeView` exists as a component** in `document/CodeView.vue`, but is **not registered in the registry**. It is available for later, should syntax highlighting in chat prove valuable; until then, standard Markdown code rendering suffices.

### 11.5 `<CodeView>` — Available, Currently Not Registered

`<CodeView>` exists as a thin wrapper around `<CodeEditor :read-only="true">` with Kind→Mime mapping (`java → text/x-java`, `python → text/x-python`, `json → application/json`, `yaml → application/yaml` etc.). `<CodeEditor>` has a `readOnly`-prop (independent of the `disabled`-prop, without dimming).

**It is currently not registered in the registry**, because fenced code block rendering (`<pre><code class="language-…">`) is visually more appropriate for chat inline snippets than a full CodeMirror canvas. To switch it, add an entry to `kindRegistry` with `CodeView` as the `inline`/`embedded`-adapter per language — no further code changes needed.

### 11.6 `<KindBox>` and Channel Wrappers

New component `packages/vance-face/src/components/KindBox.vue` as a common frame:

```vue
<template>
  <div class="kind-box border rounded">
    <div class="kind-box-header flex items-center gap-2 px-3 py-2 bg-base-200">
      <span class="kind-icon">&#123;{ icon }}</span>
      <span class="kind-label font-medium">&#123;{ label }}</span>
      <span v-if="title" class="text-base-content/60 truncate">— &#123;{ title }}</span>
      <div class="ml-auto flex gap-1">
        <slot name="actions" />
      </div>
    </div>
    <div class="kind-box-body p-2">
      <slot />
    </div>
  </div>
</template>
```

Plus two wrappers that set the channel defaults and retrieve the rendering from the registry:

- `<InlineKindBox kind="..." :content="..." :meta="...">` — Header actions: **Download**, **Raw** (toggle), Secondary menu: Copy, Save as Document.
- `<EmbeddedKindBox kind="..." :ref="...">` — Header actions: **Copy**, **Open**, Secondary menu: Download.

`<InlineKindBox>` internally renders the registry's `inline`-renderer in `mode='inline'`. On Raw-toggle, it replaces the body slot with `<CodeEditor :read-only :mime-type>` with the fence body as source. Toggle state persists per block position in `useChatViewState()` (or a lightweight `ref` in the enclosing MessageBubble).

`<EmbeddedKindBox>` resolves the `EmbedRef` via the Document cache (§11.8), then renders the registry's `embedded`-renderer in `mode='embedded'`. During loading, it shows a skeleton frame of appropriate height.

Action implementations:

- **Download (Inline):** `Blob` creation from `content`, `URL.createObjectURL`, programmatic click. Filename `<kind>-<yyyymmddhhmm>.<ext>` with extension map (`mindmap → md`, `table → md`, `json → json`, `yaml → yaml`, fallback `txt`).
- **Raw (Inline):** Body slot switch between renderer and `<CodeEditor :read-only :mime-type>`.
- **Copy (Embedded):** For text kinds, Document source string (YAML/JSON/Markdown form) to clipboard. For binary kinds: filename + `vance:`-URI to clipboard (actual binary copy via browser API unreliable).
- **Open (Embedded):** `window.open('/document/' + projectId + '/' + path, '_blank')` (or Router-Navigate, depending on MPA strategy).
- **Download (Embedded, secondary):** Document REST API `GET /brain/{tenant}/documents/<path>/raw` as Blob, same trigger click as Inline.
- **Save as Document (Inline, secondary):** Promote path §9 — modal with name input, then `POST /brain/{tenant}/documents`, then locally replace block.

### 11.7 Hook in `<MarkdownView>`

`<MarkdownView>` is switched from pure `v-html` (marked + DOMPurify) to a **token walker**:

```ts
const tokens = marked.lexer(source)
return tokens.map(token => {
  if (token.type === 'code' && token.lang) {
    const { kind, meta } = parseFenceLang(token.lang)
    const r = resolveRenderer(kind, 'inline')
    if (r?.inline) {
      return h(InlineKindBox, { kind, content: token.text, meta })
    }
    // Unknown Kind / no Inline adapter → Standard-<pre><code>
  }
  if (token.type === 'link' && token.href.startsWith('vance:')) {
    const ref = parseVanceUri(token.href, { text: token.text, imageStyle: false })
    return h(EmbeddedKindBox, { kind: ref.kindHint ?? 'unknown', ref })
  }
  if (token.type === 'image' && token.href.startsWith('vance:')) {
    const ref = parseVanceUri(token.href, { text: token.text, imageStyle: true })
    return h(EmbeddedKindBox, { kind: ref.kindHint ?? 'image', ref })
  }
  // All other tokens: individually through marked.parser([token]) + DOMPurify → v-html
  return h('div', { innerHTML: DOMPurify.sanitize(marked.parser([token])) })
})
```

`parseFenceLang(lang)` decomposes `mindmap theme=dark,direction=right` into `{ kind: 'mindmap', meta: { theme: 'dark', direction: 'right' } }`. Format v1: first token = Kind, then optional whitespace and comma-separated `key=value`. Unknown meta-keys are ignored by the renderer.

```ts
function parseFenceLang(lang: string): { kind: string; meta: FenceMeta } {
  const [kind, ...rest] = lang.trim().split(/\s+/)
  if (rest.length === 0) return { kind, meta: {} }
  const meta = Object.fromEntries(
    rest.join(' ').split(',').map(p => {
      const [k, ...v] = p.split('=')
      return [k.trim(), v.join('=').trim()]
    }).filter(([k]) => k),
  )
  return { kind, meta }
}
```

`parseVanceUri(href, opts)` builds the `EmbedRef` (§4) from the URI:

```ts
function parseVanceUri(href: string, opts: { text: string; imageStyle: boolean }): EmbedRef {
  const url = new URL(href)
  const project = url.hostname || undefined  // empty = current project
  const path = decodeURIComponent(url.pathname.replace(/^\//, ''))
  const kindHint = url.searchParams.get('kind') ?? undefined
  const modeOverride = url.searchParams.get('mode') as 'preview' | 'reference' | null
  const mode = modeOverride ?? (opts.imageStyle ? 'preview' : 'reference')
  const caption = url.searchParams.get('caption') ?? undefined
  return { project, path, kindHint, mode, caption, text: opts.text, raw: href }
}
```

### 11.8 Document Cache

Embedded Document loads go through a Pinia store `packages/vance-face/src/document/documentRefStore.ts`:

```ts
type CacheKey = `${string}::${string}` // `${projectId ?? ""}::${path}`

export const useDocumentRefStore = defineStore('documentRef', {
  state: () => ({
    cache: new Map<CacheKey, DocumentDto>(),
    pending: new Map<CacheKey, Promise<DocumentDto>>(),
  }),
  actions: {
    async resolve(ref: EmbedRef): Promise<DocumentDto> {
      const key: CacheKey = `${ref.project ?? ''}::${ref.path}`
      const hit = this.cache.get(key)
      if (hit) return hit
      const inflight = this.pending.get(key)
      if (inflight) return inflight
      const p = fetchDocument(ref.project, ref.path).then(doc => {
        this.cache.set(key, doc)
        this.pending.delete(key)
        return doc
      })
      this.pending.set(key, p)
      return p
    },
  },
})
```

- Cache lifetime: **Session** (page reload clears). No TTL expiration in v1.
- Pending map prevents N-fold parallel loads of the same ref (e.g., a mindmap embedded five times in chat).
- WebSocket invalidation (`Document_UPDATE` → drop cache entry) remains open for v2 — those concerned about staleness reload the tab.

### 11.9 Extending with a New Kind

Steps for a new Kind (e.g., `kind: timeline`):

1. Write View component `packages/vance-face/src/document/TimelineView.vue` with `mode`-prop.
2. Write Codec `timelineCodec.ts` (if parse/serialize needed).
3. Add registry entry in `kindRenderers/registry.ts`.
4. Extend Engine Recipe snippet (§10.2), include new Kind in known kinds.
5. `wb build face` — done.

No plugin registration, no hot-reload discovery. Compile-time map with type-check and IDE autocomplete. If the frontend sees an unknown Kind (e.g., because an Engine comes in a newer build, but the frontend is old), the §5 fallback chain automatically applies.

---

## 12. Open Issues

- **Stale Path Robustness:** If a referenced Document is renamed/moved, the `vance:`-link breaks. Options: (a) optional `?id=<documentId>`-fallback as a move-robust reference; (b) Document rename hook that updates all active links in open chats (complicated); (c) acceptance of the stale card with "Document renamed — new path: ..." via server lookup. V1 proposal: Option (c), additional `?id=` as tie-breaker only in v2.
- **Embedded Block with Live Preview for Large Documents:** Should a 100-page PDF in embedded `mode: preview` load all pages directly in chat? V1: only first page (pdfjs supports page range). User clicks for full screen.
- **Inline Fence Limit:** We do not set a hard limit for inline body size, but practically, mindmaps > 200 items, tables > 500 rows, code > 1000 lines should be embedded. The Recipe prompt includes a heuristic ("if content is longer than ~500 lines, save as Document and write a `vance:`-link"). Hard enforcement not in v1.
- **Fragment Anchors:** `vance:/<path>?kind=items#item-3` — scroll target within a rendered Document. Reserved for v2; frontend ignores fragments in v1.
- **Version-Specific Refs:** `?version=<n>` for deterministic linking to a specific Document version. Requires versioning in the Document Store — separate spec item.
- **External URLs as Embedded:** ` ```embed\nkind: pdf\nurl: https://… ` or similar — explicitly not v1, external content must first be imported into the store via `document_import_url`-tool. Then it is a normal Document with a `vance:`-link.
- **Inline Fence with Embedded Mix:** May a mindmap inline body reference a `vance:`-link (node links to Document)? Indirectly yes, via the `link:`-field in the node (see doc-kind-mindmap §2) — the linking semantics are a matter of the respective Kind, not this spec.
- **Same-URI in Multiple Occurrences:** If the same resource is embedded twice in the same message (e.g., once reference, once preview), the resolver loads once and caches per `<project,path>`-key. Cache lifetime = session.
