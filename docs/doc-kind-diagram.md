---
title: "Vance — Document Kind `diagram`"
parent: Documentation
permalink: /docs/doc-kind-diagram
---

<!-- AUTO-GENERATED from specification/public/en/doc-kind-diagram.md — do not edit here. -->

{% raw %}
---
# Vance — Document Kind `diagram`

> Specifies the **`diagram` payload** for documents that carry a single, text-defined diagram (flowchart, sequence, state, ER, gantt, gitGraph, …) rendered to SVG. The renderer is **Mermaid** (`mermaid`, MIT) — a text-DSL → SVG library. The diagram source is an opaque string in Mermaid syntax; the renderer parses it at display time, the codec does not.
> See also: [doc-kind-chart](/docs/doc-kind-chart) | [doc-kind-graph](/docs/doc-kind-graph) | [doc-kind-mindmap](/docs/doc-kind-mindmap) | [web-ui](/docs/web-ui)

---

## 1. Purpose

Use cases: flowcharts in strategy documents, sequence diagrams for API sketches, state machines, ER models, Gantt timelines, Git branches, C4 architecture diagrams. Primarily intended as **LLM output** — a Worker describes a process or architecture and stores it as a visual artifact in the Project document pool. Secondarily, manually maintained by the User in the Raw tab.

Distinctions:

- **chart**: numerical data series with axes (Line/Bar/Pie/Heatmap/…). For visualizing data, not processes.
- **graph**: nodes + edges as a structured JSON model with drag-editing. `diagram` is text-DSL → SVG without editing interactivity.
- **mindmap**: hierarchical outline with radial rendering. While Mermaid itself has a `mindmap` diagram type, it is only one of many possible source variants here — semantically clean Mindmap documents remain `kind: mindmap`.
- **slides**: slide deck. A single Mermaid diagram can be referenced or embedded in a slide (see `slides` §6.3), but it is not a slide document.

**Design Principle — Text as Truth.** The `source` is the source. No structured representation of nodes/edges in Vance — Mermaid parses it itself at render time. Rationale:

- **LLM Fluency:** Mermaid syntax is in virtually every LLM training set (GitHub Markdown, documentation sites, Stack Overflow). Models write it compactly and usually syntactically correct. A custom JSON schema for it would first need to be explained in the prompt.
- **Token Efficiency:** 5-10 lines of Mermaid vs. dozens of lines of JSON with `x/y` coordinates. Mermaid (dagre internally) handles layout itself.
- **Consistent with existing pattern:** markmap = Markdown→Mindmap, Marpit = Markdown→Slides, Mermaid = DSL-Text→Diagram. Same persistence form (`source: string`).
- **Library-change resilient:** if we later want to support d2 or PlantUML in addition, this would be a new `dialect` value (see §2.1), not a new Kind and no schema migration path.

**Design Principle — Mermaid as Renderer, not as App.** We use `mermaid` as a pure library (`mermaid.render(id, src) → { svg }`). No pan/zoom plugin, no live editor, no custom toolbar in the render output. SVG is returned, we mount it into a container. Rationale:

- Library character (function, no global state, no UI shell) fits Vance editor embedding, analogous to `marked` for `kind: doc` and `marpit` for `kind: slides`.
- Industry standard — GitHub, GitLab, Obsidian, Notion render Mermaid natively in Markdown; roundtrip to other tools is trivial.
- Render errors are returned as an exception — UI can display them as a banner, the LLM can receive them as a tool result ("source had a syntax error on line N").

**PlantUML / d2 / draw.io intentionally excluded:** PlantUML requires a JVM/server, d2 is less LLM-familiar, draw.io is XML-based and not LLM-friendly. Mermaid is the only library that is simultaneously (a) pure client-side JS, (b) declarative-textual, and (c) LLM-native.

**What this spec defines:**

- Top-level fields `source` (Mermaid-DSL string) and optional `diagram` block (Theme, Look).
- Format mapping md/json/yaml — canonical is Markdown with a single ```` ```mermaid ```` code fence.
- Web UI activation with two tabs (`Diagram` / `Raw`).
- Render path with lazy loading of the Mermaid library.
- Error display for broken syntax, plus error surfacing for LLM tool calls.

**What it does not define:**

- Mermaid sub-type validation in `vance-api`. The `source` is opaque; we do not open it. Mermaid syntax updates automatically land with library upgrades without spec changes.
- In-place WYSIWYG editing. Editing in v1 is exclusively via the Raw tab on the text. Mermaid has no official editor mode; third-party tools like Mermaid Live Editor are separate apps.
- Live reload of the `Diagram` tab when typing in the `Raw` tab. v1: User switches tabs to see the result. Side-by-side live preview is v2 (see §6.2).
- Multiple diagrams in one Document. One Document = one diagram. Multiple diagrams = multiple Documents. Collective display lives in a `kind: doc` Markdown with multiple ```` ```mermaid ```` fences (see §6.4).
- Custom theme CSS per Document. Themes are the five Mermaid built-ins (`default`/`dark`/`forest`/`neutral`/`base`) — anything further is v3+.
- PNG/PDF export. Mermaid can output SVG; SVG download is trivial, PNG/PDF belongs in the `export` path of a Document operator (analogous to Records → CSV).
- Interactive diagram features (clickable nodes, tooltip drilldown). Mermaid supports this with `click <id> "url"` directives; this happens without our involvement in the `source` — we do not filter it, but we also do not actively enable it.

---

## 2. Data Model

### 2.1 Top-Level

| Field      | Type                     | Required | Meaning                                                                   |
|------------|--------------------------|----------|---------------------------------------------------------------------------|
| `kind`     | `string` = `"diagram"`   | yes      | For dispatcher recognition.                                               |
| `dialect`  | `string`                 | no       | Renderer dialect. Default `"mermaid"`. In v1, `"mermaid"` is the only accepted value; unknown values fall back to the Raw editor. |
| `diagram`  | `DiagramHeader`          | no       | Render metadata (Theme, Look). Default `{}`.                              |
| `source`   | `string`                 | yes      | The diagram source text in the language specified by `dialect`. At least one non-whitespace character. |

Unknown top-level keys remain in `doc.extra` and are re-emitted verbatim when writing (pass-through like all other Kinds).

`dialect` is present as a field now so that a later switch to d2 or PlantUML does not become a breaking change. v1 only writes this field if it **does not** match the default — the canonical Markdown default case does not require it.

### 2.2 DiagramHeader

| Field         | Type                                           | Default      | Meaning                                                                   |
|---------------|------------------------------------------------|--------------|---------------------------------------------------------------------------|
| `theme`       | `enum` `default`\|`dark`\|`forest`\|`neutral`\|`base` | `"default"` | Mermaid built-in theme. Other values are clamped to `default` with a codec warning when read. |
| `look`        | `enum` `classic`\|`handDrawn`                  | `"classic"`  | Mermaid 10+: `handDrawn` activates the rough.js sketch style.              |
| `fontFamily`  | `string`                                       | `null`       | Optional font family override. Missing → Mermaid default.                 |

Pass-through for unknown header keys: yes, in `diagram.extra` (analogous to `chart.extra` and `slides.extra`).

**Intentionally excluded:** `securityLevel` is not user-configurable — we enforce `securityLevel: 'strict'` centrally in the renderer (see §5.4). This prevents HTML in the `source` from being executable; this is security-relevant and does not belong in the user document.

### 2.3 Mermaid as Source Language

What is accepted as `source` is exactly what Mermaid (version pinned in `@vance/vance-face`'s `package.json`) understands. Currently, Mermaid covers, among others:

| Diagram Type         | First Source Line                   | Note                                            |
|----------------------|-------------------------------------|-------------------------------------------------|
| Flowchart            | `flowchart TD` / `flowchart LR` / … | Primary use case.                               |
| Sequence Diagram     | `sequenceDiagram`                   |                                                 |
| Class Diagram        | `classDiagram`                      |                                                 |
| State Diagram        | `stateDiagram-v2`                   | `stateDiagram` (old) is also accepted.          |
| ER Diagram           | `erDiagram`                         |                                                 |
| User Journey         | `journey`                           |                                                 |
| Gantt                | `gantt`                             |                                                 |
| Pie Chart            | `pie`                               | Caution: simple pie. Data-rich pies → `kind: chart`. |
| Gitgraph             | `gitGraph`                          |                                                 |
| Mindmap              | `mindmap`                           | Possible, but **Convention:** true Mindmap documents use `kind: mindmap` with markmap. |
| Timeline             | `timeline`                          |                                                 |
| C4                   | `C4Context` / `C4Container` / …     |                                                 |
| Block / Packet / Architecture | `block-beta` / `packet-beta` / `architecture-beta` | Beta diagram types — functional but unstable. |

The table is informative, not prescriptive. Vance does not validate the source — Mermaid does this during rendering and throws an exception for broken syntax, which appears as a banner in the UI and as an error message in the LLM tool result.

**Mermaid's own Frontmatter:** Mermaid allows YAML frontmatter directly **within** the source (`---\ntitle: …\nconfig:\n  theme: dark\n---\nflowchart TD\n…`). This is Mermaid's own syntax and opaque to Vance — pass-through, no conflict with the Vance Document frontmatter (which is outside the code fence).

**Canonical Form** (JSON):

```json
{
  "$meta": { "kind": "diagram" },
  "diagram": { "theme": "default", "look": "classic" },
  "source": "flowchart TD\n  A[Start] --> B{Decision}\n  B -->|yes| C[OK]\n  B -->|no| D[End]\n"
}
```

---

## 3. On-Disk Formats

### 3.1 Markdown (Canonical)

```markdown
---
kind: diagram
diagram:
  theme: default
  look: classic
---

\`\`\`mermaid
flowchart TD
  A[Start] --> B{Decision}
  B -->|yes| C[OK]
  B -->|no| D[End]
\`\`\`
```

**Reading Rules:**

- Frontmatter like all other Kinds (`---` fences at the beginning of the file). Frontmatter is optional — without it, the Kind is known from the Document Header Mapping (`HeaderStrategy`).
- Body: The codec expects **exactly one** ```` ```mermaid ```` (or ```` ```<dialect> ````) code fence. The content of the fence becomes `source`.
- Multiple fences in the body: the first one wins, codec warning, remaining fences land in `doc.extra._unparsedBody` as raw text (round-trip stable).
- No fence: empty `source`. Codec warning, render shows empty state.
- Text before/after the fence is parked in `doc.extra._preamble` / `doc.extra._postamble` as raw text — round-trip stable, but not visible in the `Diagram` tab.

**Writing Rules:**

- Frontmatter with `kind: diagram`. `diagram:` block only if it deviates from defaults (at least one non-default field).
- Body: a single ```` ```mermaid ```` code fence with the `source` content, separated by blank lines. A trailing newline at the end of the source is normalized (exactly one).
- `_preamble`/`_postamble`/`_unparsedBody` from `doc.extra` are re-emitted in the order `preamble → fence → postamble → unparsedBody`.
- If `dialect != "mermaid"`: the fence info string is the dialect name. This makes later d2 support a pure renderer extension.

### 3.2 JSON

Identical to the canonical form from §2:

```json
{
  "$meta": { "kind": "diagram" },
  "diagram": { "theme": "dark", "look": "handDrawn" },
  "source": "sequenceDiagram\n  Alice->>Bob: Hello\n  Bob-->>Alice: Hi\n"
}
```

- 2-space indent.
- Order of top-level keys: `$meta`, `dialect?`, `diagram`, `source`, then unknown pass-through keys in insertion order.
- `source` is a **string** (multi-line, with `\n`). When building the Document programmatically, insert fully formatted source text. No array form, no per-line splitting.
- `dialect` is only emitted if ≠ `"mermaid"`.

### 3.3 YAML

```yaml
$meta:
  kind: diagram
diagram:
  theme: dark
  look: handDrawn
source: |
  sequenceDiagram
    Alice->>Bob: Hello
    Bob-->>Alice: Hi
```

Single-Document: Top-level mapping with `$meta: { kind: diagram }` as the first key, followed by `dialect?`, `diagram` block, and `source` as a `|`-literal scalar. Block-style mapping, 2-space indent. `|` preserves newlines without escape acrobatics.

### 3.4 Codec Impact

Dedicated lightweight codec `diagramCodec.ts` in `@vance/shared`:

- Markdown → Parse: detach frontmatter, search body for Mermaid code fence (`fenced_code` with info string == `dialect`), extract first fence, rest into `extra._preamble`/`_postamble`/`_unparsedBody`.
- Markdown → Write: frontmatter + `<preamble>\n\n\`\`\`<dialect>\n<source>\n\`\`\`\n\n<postamble>` composition.
- JSON/YAML: identical to items codec convention — `$meta` wrapper, optional `dialect`, `diagram` block, `source` as string.

Server-side: **no dedicated endpoint, no server-side Mermaid rendering**. The `HeaderStrategy` path automatically mirrors `kind: diagram` to `DocumentDocument.kind`. The `source` lands as part of the `inlineText` body and is thus RAG-indexable — the LLM can indeed find "the sequence diagram for the login flow" via full-text search.

---

## 4. Server Path

Like chart, graph, slides: **no dedicated endpoint**, no server-side Mermaid parser. Diagrams are display content; the backend transports them as body.

`DocumentDocument.kind = "diagram"` via `HeaderStrategy`. Search/RAG indexes the `inlineText` body (= the full Markdown wrapper including Mermaid source) as usual.

**LLM Tool Path** (informative, belongs in the Tool Spec): `document_create(kind="diagram", source="flowchart TD\n  ...")` is the expected call. Tool implementation persists the Document; the render roundtrip only happens when a client (Web UI, later Mobile) opens the Document. This means the backend has no Mermaid dependency and no render latency in the hot path.

---

## 5. Web UI

### 5.1 Editor Activation

- **`kind === 'diagram'`** + `dialect === 'mermaid'` (or default) + Format ∈ {md, json, yaml} → two tabs: `Diagram` (Default) / `Raw`.
- **`kind === 'diagram'`** + unknown `dialect` → `Raw` editor only, banner message in editor: "Unsupported diagram dialect: `<value>`".
- Otherwise (not a Diagram Document): unchanged.

When switching `Diagram → Raw`, the parsed model is serialized back; when switching `Raw → Diagram`, the codec reparses the current body and re-renders.

### 5.2 `Diagram` Tab

Read-only render based on `mermaid`:

- Adapter `diagramToMermaidInput(doc: DiagramDocument): { source: string, config: MermaidConfig }` builds the Mermaid init config (`theme`, `look`, `fontFamily`) from the `diagram` block and passes through `source`.
- Render call: `mermaid.render(uniqueId, source).then(({ svg }) => { container.innerHTML = svg })`.
- `mermaid` is **lazy-loaded** (`import('mermaid')`), not at editor boot. Only when the `Diagram` tab is activated. Mermaid weighs ~700 KB minified gzipped — users who don't open a diagram don't pay for it. Markmap already does this for `kind: mindmap`.
- Layout: Diagram container fills editor content to 65 vh / min. 420 px height (analogous to Mindmap and Graph). SVG is initially scaled to `width: 100%, height: auto`.
- Pan/Zoom **not** in v1. Users with diagrams that are too large scroll — or split the diagram. Pan/Zoom is §6.1.
- SVG download button bottom right: saves the rendered SVG as a file (`<document.title>.svg`). Pure client-side action, no server roundtrip.

### 5.3 `Raw` Tab

CodeMirror 6 with Markdown mode (for md) or JSON/YAML mode. **Within** the Mermaid code fence, no Mermaid-specific syntax highlighting applies in v1 — the CodeMirror Markdown mode shows the fence content as a code block (monospace, slightly offset), which is sufficient. A Mermaid-specific CodeMirror mode does not exist out-of-the-box; a custom mode would be v2/v3.

Editing the source text, live preview is not synchronized in v1 — users switch to the `Diagram` tab to see the result.

### 5.4 Render Configuration & Security

Mermaid is called with the following init — **always**, not user-configurable:

```js
mermaid.initialize({
  securityLevel: 'strict',  // blocks HTML/JS in the source
  startOnLoad: false,       // we render manually per Document
  theme: doc.diagram?.theme ?? 'default',
  look: doc.diagram?.look ?? 'classic',
  fontFamily: doc.diagram?.fontFamily ?? undefined,
})
```

`securityLevel: 'strict'` is mandatory. This prevents an LLM, which generates a Diagram Document via a tool, from injecting a `<script>` tag into the `source` that would then fire in the browser during rendering. `click <id> "url"` (Mermaid's own interaction) remains active but is treated as secure link navigation — no JS hook.

### 5.5 Error Display

Mermaid throws an exception during rendering if the `source` is syntactically broken. The `<DiagramView>` catches this and displays:

- Banner at the top of the Diagram tab: red alert (`VAlert`) with the Mermaid error message (e.g., `Parse error on line 3: Expecting '...' got '...'`).
- Below it, the original source as a code block (read-only, with line numbers) — so the user immediately sees where Mermaid stopped.
- No crash, no empty tab — the editor remains usable, the Raw tab works.

For LLM tool calls (e.g., `document_create(kind="diagram", source="...")`), Mermaid render validation is **not** performed in the tool path — the backend persists blindly, the error only appears during the first client render. Rationale: a backend without a headless browser cannot safely render Mermaid. If one wants to force the LLM to write "valid Mermaid", an optional validator roundtrip via `LightLlmService` with a render probe in the client can be set up — out of scope for v1.

### 5.6 Feature Scope v1

| Feature                                | v1 | Note |
|----------------------------------------|----|------|
| Diagram Render (Mermaid)               | ✓  | SVG, scoped Container |
| Theme `default`/`dark`/`forest`/`neutral`/`base` | ✓ | via `diagram.theme` |
| Look `classic`/`handDrawn`             | ✓  | Mermaid 10+ |
| Lazy-Load of Library                   | ✓  | only when `Diagram` tab is activated |
| Syntax Error Banner                    | ✓  | Mermaid exception as Alert |
| SVG Download                           | ✓  | bottom right, Filename = Document Title |
| Pan / Zoom                             | ✗  | see §6.1 |
| Mermaid-CodeMirror Mode                | ✗  | see §6.3 |
| Side-by-Side Live-Preview              | ✗  | see §6.2 |
| In-Place WYSIWYG Edit                  | ✗  | not planned — no library does this well |
| Multiple Diagrams per Document         | ✗  | see §6.4 |
| PNG/PDF Export                         | ✗  | see §6.5 |
| Custom Theme CSS                       | ✗  | v3+ |
| Clickable Nodes (Mermaid `click`)      | (◯)| **persisted** in source, **activated** in render (Mermaid's own feature) — we do not filter, we do not promote |

(◯) = Data passes through round-trip stable, activation via Mermaid's own syntax.

### 5.7 Components

- `<DiagramView>` — top-level Diagram tab. Receives `:doc: DiagramDocument`, calls adapter + Mermaid (lazy), mounts SVG into a scoped container. Holds error state and renders banner on exception.
- `<DiagramDownloadButton>` — small button bottom right; serializes current SVG to Blob, triggers download.
- Tab bar like for mindmap/slides (`content-tab` class from `DocumentApp.vue`).

### 5.8 Visual Conventions

- Default theme aligns with DaisyUI theme via Mermaid's `default`/`dark` — light/dark follows the active DaisyUI theme (changing DaisyUI theme triggers re-render with matching Mermaid theme).
- SVG is mounted without an additional frame, the editor background shines through. No card, no border.
- Render latency typically <50 ms for small diagrams (<50 nodes). A subtle skeleton block shows a loading spinner for initial library loading (~700 KB).

---

## 6. Future (Not v1)

### 6.1 Pan / Zoom

Mermaid provides pure SVG without its own pan/zoom functionality. A library like `svg-pan-zoom` (~10 KB, MIT) can be applied to the SVG node afterwards. Useful once real diagrams become too large for the editor viewport — until then, browser scrolling is sufficient.

### 6.2 Side-by-Side Live-Preview

CodeMirror on the left, Mermaid render on the right, re-rendering with debounce (~300 ms) while typing. Once we have this pattern, it will also apply to `kind: doc` with Markdown and `kind: slides` with Marpit — thus, a cross-Kind layout component spec, not diagram-solo. Until then: tab switching.

### 6.3 Mermaid-Specific CodeMirror Mode

A custom CodeMirror 6 mode for Mermaid syntax (keywords like `flowchart`, `sequenceDiagram`, arrow operators `-->`, block brackets). Significantly increases editing comfort but is non-trivial — no official mode exists, a custom implementation would be 200-500 lines of Lezer grammar. Awaits actual user pain.

### 6.4 Multiple Diagrams per Document

Currently: one Document = one diagram. If collective displays emerge (e.g., "System overview with five sub-diagrams"), the natural form would be a `kind: doc` Markdown Document with multiple ```` ```mermaid ```` code fences — no schema change to `kind: diagram` needed. The `kind: doc` renderer would then need the Mermaid adapter as an additional Markdown renderer plugin. A separate spec point for `kind: doc`.

### 6.5 Export — PNG, PDF

`mermaid.render()` outputs SVG; PNG is possible via a canvas intermediate step (`svg-to-png` or similar, ~5 KB), PDF via `jsPDF` (likely already in the bundle for `kind: chart`). Server-side export via Headless Chromium would be the clean path — belongs in the `export` path of a Document operator, not in the editor.

### 6.6 LLM-side Auto-Repair

If the LLM writes a syntactically incorrect diagram, this is currently an error during rendering. Future pattern: `document_create(kind="diagram", source=...)` validates via `LightLlmService` (single-shot LLM call with Mermaid render probe as schema replacement), retries up to 2x on error. Requires browser- or Node-side Mermaid headless render in the Brain — a separate spec point, awaits demand.

### 6.7 Embed Directive in Slides / Markdown Documents

A `kind: slides` or `kind: doc` references a `kind: diagram` Document via Vance URI: `![](vance:document/<id>)` renders the diagram inline. The convention for `vance:` URLs belongs in a separate spec, then this one attaches to it (same point as [doc-kind-slides §6.3](/docs/doc-kind-slides#63-embed-direktiven-chart-mindmap-)).

### 6.8 Further Dialects: d2, PlantUML

`dialect: "d2"` or `dialect: "plantuml"`. d2 is an npm package (`@terrastruct/d2`), runs client-side, ~300 KB — comparable to Mermaid in style and LLM prevalence. PlantUML requires a render server (Java) — not compatible with the v1 no-backend render principle; only useful as a server-side export path. Decision will come only when there is actual user demand.

---

## 7. Open Issues

- **Dialect validation on write:** does the codec accept arbitrary `dialect` values in pass-through (for forward compatibility), or does it reject unknown dialects with a codec warning? Suggestion: accept with warning, render then falls back to Raw editor (see §5.1). This allows a future Vance client with d2 support to read an old Vance v1 Document without it appearing broken.
- **Theme auto-switch:** if the browser user switches between DaisyUI Light and DaisyUI Dark, should the `Diagram` tab automatically switch between Mermaid `default` and `dark`? Suggestion: yes, provided `diagram.theme` is not explicitly set (i.e., default case). If a theme is explicitly set, the user's choice remains.
- **Multiple render performance:** if a user frequently clicks the `Diagram` tab open and closed, should Mermaid re-render it every time? Cache the last SVG output, invalidate on `source`/`diagram` change. Trivial memoization, belongs in `<DiagramView>` implementation.
- **Server-side RAG-Indexing:** the `inlineText` body contains the raw Mermaid source. RAG finds "Sequence Diagram for Login Flow" because "sequenceDiagram" and "Login" appear as tokens — this is OK. Should additionally extracted labels (node names, edge descriptions) be indexed as a structured meta-field? v1 no, because this would require a server-side Mermaid parser, which we deliberately avoid. If searching by node name becomes relevant, full-text fallback is usually sufficient.
- **Document Title vs. Mermaid Frontmatter Title:** Mermaid accepts a `title:` field in its own source frontmatter, which is rendered above the diagram. The Vance Document also has a `title`. Conflict behavior: both remain independent, the user decides. We do not interfere with the `source`.
{% endraw %}
