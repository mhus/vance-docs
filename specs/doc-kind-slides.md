---
title: "Vance — Document Kind `slides`"
parent: Specs
permalink: /specs/doc-kind-slides
---

<!-- AUTO-GENERATED from specification/public/en/doc-kind-slides.md — do not edit here. -->

---
# Vance — Document Kind `slides`

> Specifies the **`slides` payload** for documents that carry a sequence of presentation slides, written as Markdown sections separated by CommonMark thematic breaks (`---`). Renderer is **Marpit** (`@marp-team/marpit`) — a pure markdown→HTML+CSS library, no runtime framework.
> See also: [doc-kind-mindmap](/specs/doc-kind-mindmap) | [doc-kind-items](/specs/doc-kind-items) | [web-ui](/specs/web-ui)

---

## 1. Purpose

Use cases: strategy decks, brainstorming summaries, workshop materials, Think Process output to be stored in a "presentable" format, onboarding documents for new project members. Embedded in reports, delivered as Worker output, manually maintained in a Project's Document Pool.

Distinctions:

- **data / records / tree**: no presentation dimension; if a slide deck is to be created from it, it should be a separate `kind: slides` document.
- **mindmap**: visual hierarchy, not a linear slide deck.
- **chart**: one chart per document; a deck can reference multiple charts (see §6.3).

**Design Principle — Markdown is the truth.** Slides are primarily Markdown sections, separated by CommonMark Thematic Breaks (`---`). This is exactly what reveal.js, Marp, Slidev, and Obsidian Advanced Slides have in common. No Vance-specific dialect. This makes the source format trivially human-editable, LLM-friendly, and round-trip stable.

**Design Principle — Marpit as renderer, not a slide runtime.** We use `@marp-team/marpit` (MIT, TypeScript-native, ~15 KB minified without themes). Marpit is a pure function `markdown → { html, css }`. Rationale:

- Its library character (no global state, no keyboard bindings, no custom app shell) fits Vance Editor embedding, analogous to `marked` for `kind: doc`.
- Microsoft-backed standard (official VS Code extension "Marp for VS Code"), actively maintained, no vendor lock-in.
- The slide separator is plain CommonMark — no proprietary syntax that might cause issues later.
- CSS scope is trivial: Marpit emits the theme CSS as a string, we wrap it in a container with a class prefix or a Shadow Root.

**Deliberately not using reveal.js**: it brings its own theme system, its own runtime, its own keyboard bindings, its own plugins — more of an "app" than a "lib". If we later need keynote-like live presentations, that will exist as a separate export path (see §6.5), not as a render layer in the editor.

**What this spec defines:**

- Markdown as the canonical format, `---` as the slide separator.
- Optional top-level `slides` block (Theme, Aspect-Ratio, Paginate, Default-Class).
- Per-slide directives via Marpit's HTML comment syntax (`<!-- _class: ... -->`, `<!-- _backgroundColor: ... -->`).
- Speaker notes via Marpit convention (`<!-- Speaker note text -->` without underscore prefix).
- JSON/YAML form as an alternative for machine generation (slides as a string array).
- Web-UI activation with two tabs (`Slides` / `Raw`).

**What it does not define:**

- Live presentation mode (fullscreen, remote control, speaker display). v1 is slide preview in the editor — arrow/keyboard navigable, but no fullscreen runtime. See §6.5.
- In-place WYSIWYG editing per slide. Editing in v1 is exclusively via the Raw tab (direct Markdown).
- PDF export, PPTX export. Marpit cannot do this directly; `@marp-team/marp-cli` can, but it's CLI-only and over-engineered for v1. See §6.4.
- Custom theme definition per document. Themes are globally registered (DaisyUI-oriented), not inline.
- Interactive elements in slides (animations, click-to-reveal, fragments). Deliberately excluded — as soon as we have fragments, we drift towards reveal.js specialization. Static slides are the 95% solution.
- Slide composition from multiple documents (include directives). One document = one deck.

---

## 2. Data Model

### 2.1 Top-Level (Canonical)

| Field     | Type                | Required | Meaning                                                                 |
|-----------|---------------------|----------|-------------------------------------------------------------------------|
| `kind`    | `string` = `"slides"` | yes      | For dispatcher recognition.                                             |
| `slides`  | `SlidesHeader`      | no       | Deck metadata (Theme, Aspect, Paginate, Default-Class). Default `{}`.   |
| `items`   | `string[]`          | yes      | Slide Markdown strings in order. At least one entry.                    |

Unknown top-level keys remain in `doc.extra` and are re-emitted verbatim when writing (pass-through like all other kinds).

### 2.2 SlidesHeader

| Field                | Type        | Default       | Meaning                                                          |
|----------------------|-------------|---------------|------------------------------------------------------------------|
| `theme`              | `string`    | `"default"`   | Theme name from the registered set. v1: `default`, `dark`, `vance`. |
| `aspect`             | `string`    | `"16:9"`      | `"16:9"` or `"4:3"`. Other values are clamped to `"16:9"`.       |
| `paginate`           | `boolean`   | `false`       | Slide page numbering at the bottom right.                        |
| `defaultClass`       | `string`    | `null`        | Applied to every slide unless it has its own `_class` directive. |
| `header`             | `string`    | `null`        | Optional Markdown header (at the top of each slide).             |
| `footer`             | `string`    | `null`        | Optional Markdown footer (at the bottom of each slide).          |

Pass-through for unknown header keys: yes, in `slides.extra` (analogous to `chart.extra`).

### 2.3 Slide Content

Each `items[i]` is a **Markdown string** describing the content of **one** slide. What Marpit understands per slide corresponds 1:1 to what the Marpit documentation describes as "directives" and "spot directives":

| Construct                                          | Meaning                                              |
|----------------------------------------------------|------------------------------------------------------|
| `# Title`                                          | Slide title (h1, Markdown as usual).                 |
| Normal Markdown content                            | Lists, code blocks, tables, images, links, emphasis. |
| `<!-- _class: lead -->`                            | Spot directive: sets class only for this slide.      |
| `<!-- _backgroundColor: #1a1a1a -->`               | Spot directive: background color only for this slide. |
| `<!-- _color: white -->`                           | Spot directive: text color.                          |
| `<!-- _paginate: false -->`                        | Spot directive: disables pagination on this slide.   |
| `<!-- Speaker note in plain comment -->`           | Speaker note (Marpit convention: HTML comment without `_`-prefix directive). |

This is the **Marpit standard**, not a Vance dialect. What Marpit does not support (e.g., `<!-- .slide: data-transition="zoom" -->` from reveal.js), we also do not support.

**Canonical JSON form:**

```json
{
  "$meta": { "kind": "slides" },
  "slides": {
    "theme": "default",
    "aspect": "16:9",
    "paginate": true
  },
  "items": [
    "# Vance\n\nA Think Tool, not a productivity app.",
    "<!-- _class: lead -->\n\n## Why?\n\n- Focus on thinking\n- Not on managing\n- LLM as the worker, not the toy",
    "## Architecture\n\n- Brain\n- Foot\n- Face\n\n<!-- Each layer has its own deployment cadence. -->"
  ]
}
```

---

## 3. On-Disk Formats

### 3.1 Markdown (Canonical)

```markdown
---
kind: slides
slides:
  theme: default
  aspect: "16:9"
  paginate: true
---

# Vance

A Think Tool, not a productivity app.

---

<!-- _class: lead -->

## Why?

- Focus on thinking
- Not on managing
- LLM as the worker, not the toy

---

## Architecture

- Brain
- Foot
- Face

<!-- Each layer has its own deployment cadence. -->
```

**Reading Rules:**

- Front-matter like all other kinds (`---` fences at the beginning of the file, **before** the first slide content). Front-matter is optional — without front-matter, the kind is known from the Document Header Mapping (`HeaderStrategy`).
- Slide separator: **CommonMark Thematic Break** (`---`, `***`, or `___` on a line, surrounded by blank lines). Canonically written as `---`.
- The first section after front-matter is `items[0]`. Each subsequent thematic break starts the next section.
- Blank lines directly after the separator are trimmed during parsing (leading blank lines per slide removed). Trailing whitespace is preserved.
- HTML comments within a slide section remain part of `items[i]` — Marpit interprets them at render time.

**Writing Rules:**

- Front-matter with `kind: slides` and `slides:` block (if defaults are overridden).
- Slides are joined with `\n\n---\n\n` (blank line + `---` + blank line).
- Trailing newline at the end of the file: yes, one.

### 3.2 JSON

Identical to the canonical form from §2:

```json
{
  "$meta": { "kind": "slides" },
  "slides": { "theme": "default", "aspect": "16:9", "paginate": true },
  "items": [
    "# Vance\n\nA Think Tool.",
    "## Why?\n\n- Focus"
  ]
}
```

- 2-space indent.
- Order of top-level keys: `$meta`, `slides`, `items`, then unknown pass-through keys in insertion order.
- `items[i]` are **strings** (multi-line, with `\n`). When building a slide programmatically, fully formatted Markdown text is inserted.

### 3.3 YAML

```yaml
$meta:
  kind: slides
slides:
  theme: default
  aspect: "16:9"
  paginate: true
items:
  - |
    # Vance

    A Think Tool, not a productivity app.
  - |
    <!-- _class: lead -->

    ## Why?

    - Focus on thinking
    - Not on managing
  - |
    ## Architecture

    - Brain
    - Foot
    - Face
```

Block-style sequences with `|`-literal scalars for the slides (preserve newlines, no escape theater). 2-space indent. `$meta:` as the first top-level key.

### 3.4 Codec Impact

Dedicated lightweight codec `slidesCodec.ts` in `@vance/shared`:

- Markdown → Parse: detach front-matter, split body at thematic breaks, trim leading blank lines per slide.
- Markdown → Write: front-matter + join with `\n\n---\n\n`.
- JSON/YAML: identical to Items codec convention — `$meta`-wrapper, `slides`-block, `items`-array.

Server-side: **no dedicated endpoint, no slide parser**. The `HeaderStrategy` path automatically mirrors `kind: slides` to `DocumentDocument.kind`. The `slides:` block is transparent to the server — like all other top-level keys.

---

## 4. Server Path

Like tree, mindmap, items: **no dedicated endpoint**, no server-side slide renderer. Slides are display content; the backend transports them as body.

`DocumentDocument.kind = "slides"` via `HeaderStrategy`. Search/RAG indexes the `inlineText`-body as usual — slides are full-text searchable (LLM can retrieve "the slide with the architecture").

---

## 5. Web-UI

### 5.1 Editor Activation

- **`kind === 'slides'`** + Format ∈ {md, json, yaml} → two tabs: `Slides` (Default) / `Raw`.
- Otherwise (not a Slides document): unchanged.

### 5.2 `Slides` Tab

Read-only render based on `@marp-team/marpit`:

- Adapter `slidesDocumentToMarpitInput(doc: SlidesDocument): { markdown: string, options: MarpitOptions }` constructs a single Markdown string that Marpit understands (joined with `---`) from the `slides`-block + `items[]`.
- `new Marpit(options).render(markdown) → { html, css }`.
- HTML is mounted into a scoped container element, CSS is injected directly before it as `<style scoped>`. We prefix the CSS selector scope via Marpit's `container` option to prevent DaisyUI/Tailwind styles from bleeding through and vice versa.
- Layout: vertical slide stream **or** single-slide view with arrow keys/buttons. v1: **Single-Slide-View** is default; a switch at the bottom left toggles to "all slides one below the other" (stream mode for print preview/long-scroll reading).
- Navigation: `←` / `→`, `PgUp` / `PgDown`, optional `Home` / `End`. Slide index at the bottom center (`3 / 12`).
- Thumbnails strip (left, narrow, scrollable) is **v2**. For v1, the index is sufficient.

### 5.3 `Raw` Tab

CodeMirror 6 with Markdown mode (for md) or JSON/YAML mode accordingly. Editing the source text, live preview is not synchronized in v1 — the user switches to the `Slides` tab to see the result.

Side-by-side live preview (CodeMirror left, Marpit render right) is **v2**. Rationale: in v1, we do not want to interfere with the editor layout apparatus; this pattern only becomes viable when at least two kinds benefit from it.

### 5.4 Feature Set v1

| Feature                                | v1 | Note |
|----------------------------------------|----|------|
| Slide Render (Marpit)                  | ✓  | per-slide HTML + scoped CSS |
| Single-Slide-View + Nav                | ✓  | Keyboard + buttons |
| Stream-View (all slides one below the other) | ✓  | Toggle |
| Theme Selection per Document           | ✓  | `slides.theme`, registered themes |
| Paginate Toggle                        | ✓  | `slides.paginate` |
| Per-Slide Directives (`_class`, `_backgroundColor`, …) | ✓ | Marpit pass-through |
| Speaker Notes                          | (◯)| **persisted** in Markdown comment, **not displayed** in v1 |
| Thumbnails Strip                       | ✗  | v2 |
| Side-by-Side Live Preview              | ✗  | v2 |
| In-Place WYSIWYG Edit                  | ✗  | v3+ |
| Fullscreen Presentation Mode           | ✗  | see §6.5 |
| PDF/PPTX Export                        | ✗  | see §6.4 |
| Image Embedding (Document Attachments) | (◯)| external URLs yes, document-internal attachments is a separate spec item |

(◯) = Data goes round-trip stable, but UI does not yet support it.

### 5.5 Components

- `<SlidesView>` — top-level Slides tab. Receives `:doc: SlidesDocument`, calls adapter + Marpit, mounts HTML+CSS in Shadow-Root or scoped container.
- `<SlidesNav>` — index display at the bottom, arrow buttons, stream/single toggle.
- Tab bar like with mindmap (`content-tab` class from `DocumentApp.vue`).

### 5.6 Themes

v1 set:

- `default` — light background, dark text, neutral sans-serif. Marpit's built-in default is sufficient.
- `dark` — dark background, light text.
- `vance` — aligned with DaisyUI tokens (CSS variable-based theme, light/dark follows the active DaisyUI theme).

Themes live under `packages/vance-face/src/components/slides/themes/*.css`, are Marpit theme CSS (registered via `marpit.themeSet.add(css)`). Custom theme authoring per document is v2 — until then, this set is sufficient.

---

## 6. Future (not v1)

### 6.1 Thumbnails Strip

A vertical strip with mini-previews to the left of the slide view. Clicking jumps to the slide. Marpit can deliver HTML per slide individually (`render(markdown).html` has slide boundaries), allowing small previews to be iframed or easily realized with CSS `transform: scale()`.

### 6.2 Side-by-Side Live Preview

CodeMirror left, Marpit render right, scroll-synchronized per slide. Once we have this pattern, it will also apply to `kind: doc` with Markdown — thus, a cross-kind layout component spec, not slides-only.

### 6.3 Embed Directives (Chart, Mindmap, …)

A slide references another document in the same Project via Vance URI: `![](vance:document/<id>)` renders the linked document inline (Chart becomes SVG, Mindmap becomes markmap render, etc.). The convention for `vance:` URLs belongs in a separate spec, then this one will attach to it.

### 6.4 Export — PDF, PPTX, HTML

`@marp-team/marp-cli` can do this (Chromium-headless for PDF, OOXML generator for PPTX, static HTML with `bespoke`-player). Server-side as an export action of a Document Operator — belongs in the `export` path (analogous to Records → CSV), not in the editor.

### 6.5 Fullscreen Presentation Mode

If we want to present keynote-style: separate viewer route (`/present/:documentId`), browser fullscreen API, arrow/click navigation, optional speaker notes on a second window. Render engine remains Marpit; the viewer is additive. Only useful when actual users "hold" the deck live.

### 6.6 In-Place WYSIWYG Edit per Slide

Instead of raw Markdown editing, click-into-slide editing (double-click on title changes h1, double-click on bullet list edits bullets). This would overwrite Marpit's output with `contenteditable`-patches and project back to the Markdown source. Requires robust Markdown round-trip — non-trivial, at the earliest after the Markdown editing experience in the `kind: doc`-editor is saturated.

### 6.7 Speaker Notes Display

Marpit delivers speaker notes per slide via a `comments`-array on each rendered slide. UI variant: a small panel below the single-slide view that displays the notes of the active slide. Trivial addition — awaits the first use case where someone actually maintains speaker notes.

### 6.8 Theme Authoring in the Editor

User registers a new theme inline in the document (`slides.themeCss: |\n  ...`). Marpit can do it, but we introduce security issues (user CSS breaking out of the container) — so v3+ and only in conjunction with Shadow DOM mount.

---

## 7. Open Issues

- **Slide Identity on Edit:** if the user reorders or inserts slides in the Raw tab, there is no stable slide ID. Speaker notes, edit cursor position, etc., are referenced positionally. OK for v1 (raw edit, no UI state mapping per slide), but as soon as the thumbnails strip + per-slide components come into play, we may need invisible slide IDs (`<!-- _slide-id: ulid-... -->`). Decision deferred to v2.
- **Default Aspect:** `16:9` is the industry default, but for in-editor preview (editor height usually limited), `4:3` is more readable. We might separate "On-Screen-Aspect" (render box) from "Logical-Aspect" (theme layout). v1: only `16:9`/`4:3` as theme layout, render box adapts proportionally.
- **Image Hosting:** external URLs (`https://…`) work immediately. Document-internal images (`vance:document/<id>` for a `kind: image`-document) first require the `vance:` URI spec item from §6.3. Until then, anyone who wants images will use external URLs.
- **CSS Scoping Strategy:** Marpit's `container` option (class prefix) **or** Shadow DOM mount. Class prefix is easier to debug; Shadow DOM is more isolation-secure. Decision upon the first real theme conflict with DaisyUI — likely class prefix will suffice because Marpit itself does not emit utility CSS (Tailwind-like).
- **Single-Source vs. Slides-Array in Storage:** Markdown stores linearly (slides as sections in the file), JSON/YAML stores as an array. This is transparent during Markdown→JSON round-trip via codec; for external tooling that only sees JSON, it must be clear that `items[i]` is a Markdown string and not a pre-structured slide representation. A documentation note is sufficient.
