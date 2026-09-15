# Vancetope — Document Kind `qrcode`

> Specifies the **`qrcode`** payload for documents whose body is a QR code payload (typically a URL), rendered as a scannable symbol. Server-side, it's a name-only kind (like `formula`): there is no structural codec and nothing to validate — the entire interpretation of the body lies with the client renderer.
> See also: [doc-kind-chart](doc-kind-chart.md) | [doc-kind-diagram](doc-kind-diagram.md) | [inline-and-embedded-content](inline-and-embedded-content.md) | [web-ui](web-ui.md)

---

## 1. Purpose

Use cases: a shared URL as a scan code (invite, guest Wi-Fi, login link), a vCard or Wi-Fi string, a short text as a physically scannable artifact. Stored as a Project document, inline in chat (Fence), or embedded via document reference.

Distinctions:
- **`text` / `markdown`**: If the text is only meant to be read, a symbol is not needed. `qrcode` exists for the screen → camera transition.
- **`image`**: A QR code stored as a PNG is a binary artifact — not editable, not meaningfully versionable. `qrcode` stores the *data* and re-renders the symbol every time it's opened.
- **Link Shortener / Tracking**: Explicitly excluded. Vance generates the code client-side; no external request is made (the same principle as `web-grab` in reverse: no outgoing requests due to rendering).

**Design Principle — The Body is the Payload.** No nested schema: the document content is the text to be encoded, render options are flat Front-Matter keys. This keeps the raw document readable, an LLM can generate it in a `doc_write`, and editing in the raw editor is self-explanatory — typing the URL is the editing. YAML/JSON forms exist only for consistency with other Kinds (the `content` key carries the payload), Markdown is the recommended form.

**Design Principle — Client-only Rendering, Lenient.** The server does not generate image bytes and does not validate anything (Name-Only-KindHandler); an overly long payload only fails during rendering with a clear error message. Unknown option keys and malformed values silently fall back to their defaults — a QR document always renders if the payload fits into a symbol (~3 kB QR format upper limit), instead of failing due to a typo in `ecc:`.

**What this spec defines:**
- The three storage forms (Markdown Front-Matter, YAML, JSON) and the bare-payload form.
- The closed options list (`label`, `size`, `margin`, `ecc`, `dark`, `light`) including normalization (clamping, fallbacks).
- The inline fence form in chat, including fence parameters.
- Web UI activation: `QrCodeView` + `qrcode`-npm package, registration in Kind Registry and Renderer Registry.

**What it does not define:**
- Server-side QR image generation (export/REST). PNG download happens in the browser from the canvas.
- Barcodes of other symbologies (EAN, Code128, DataMatrix) — a separate Kind, if ever requested.
- Dynamic payloads (templates, server shortlinks), QR with logo overlay, analytics.
- Foot-CLI rendering (the TUI shows the raw text; an ASCII QR is conceivable but secondary).

## 2. Data Model

There is no typed server document. The client (`qrcodeCodec.ts`) lifts the body into the following model:

| Field     | Type      | Required | Meaning                                                         |
|-----------|-----------|----------|-----------------------------------------------------------------|
| `payload` | `string`  | yes      | The encoded text. Empty → empty state instead of symbol.        |
| `label`   | `string`  | no       | Caption below the symbol. Default `""`.                         |
| `size`    | `number`  | no       | Canvas size in px, clamped 64–2048. Default `320`.              |
| `margin`  | `number`  | no       | Quiet zone in modules, clamped 0–16. Default `4`.               |
| `ecc`     | `enum`    | no       | `low` \| `medium` \| `quartile` \| `high`. Default `medium`.    |
| `dark`    | `string`  | no       | Module color (HTML hex `#rgb`/`#rrggbb`). Default `#000000`.    |
| `light`   | `string`  | no       | Background (HTML hex). Default `#ffffff`.                       |

Normalization: `size`/`margin` are rounded to integers and clamped to the range; unknown `ecc` values and non-hex colors fall back to the default. All silent — no codec error, no banner.

## 3. Form Mapping

### 3.1 Markdown (recommended)

Front-Matter (`---`-fence) carries `kind: qrcode` + flat option keys; the body **after** the closing fence is the payload:

```markdown
---
kind: qrcode
label: Team invite
size: 512
ecc: high
---
https://example.com/invite
```

Values are read as flat `key: value` lines (quoting as in `list`); a body without Front-Matter is the complete payload. Markdown form knows **no** `content` key — the payload is the body.

### 3.2 YAML / JSON

Canonical `$meta` form as with all Kinds; the payload is in the `content` key:

```yaml
$meta:
  kind: qrcode
content: https://example.com/invite
label: Team invite
```

```json
{ "$meta": { "kind": "qrcode" }, "content": "https://example.com/invite" }
```

### 3.3 Detection

The client sniffs the form: body starts with `---` → Markdown; with `{` → JSON; contains line-starting `$meta:` or `content:` → YAML; otherwise, the entire (trimmed) body is the payload. Free-text payloads with `key: value`-like lines are **not** misinterpreted by this — YAML parsing only applies to the unambiguous top-level markers, and a YAML parse error falls back to bare payload. `content:` at the beginning of a line in free text is the one deliberate edge case: it is read as YAML form, which yields the same result.

### 3.4 Inline Fence (Chat)

```` ```qrcode ````-fence; the fence body is the payload, options as fence parameters (` ```qrcode size=512,ecc=high `) — the same key list as in §2, syntactically the `parseFenceLang` standard (`key=value`, comma-separated).

## 4. Web UI Activation

- **Rendering**: `QrCodeView.vue` (`kindViews/`), canvas rendering via the npm package `qrcode` (MIT). Modes `editor` / `inline` / `embedded` — the same three-mode contract as MapView/FormulaView. Read-only in all modes; PNG download reads the canvas (`toDataURL`), no server roundtrip.
- **Cortex**: Registration in `builtInKinds.ts` with identity codec (`parse`/`serialize` = String) — the View/Edit toggle shows rendered symbol vs. raw code editor. Matches `kind === "qrcode"` and text MIME types (markdown/plain/yaml/json); binary MIME types are deliberately excluded.
- **Chat/Embeds**: Entry in `kindRenderers/registry.ts` for both channels; icon `🔳`, label "QR Code".
- **i18n**: `kindViews.qrcode.*` (empty/error/canvasLabel/download) in `en` + `de`.
- **Server**: Name-Only-`KindHandler` in `BuiltInKindHandlers` (like `formula`) — registers the name for `doc_write`/`doc_create_kind` schemas, no validation. Manual `kind-qrcode.md`, Help `doc-kind-qrcode.md`.

## 5. Outlook (not v1)

- Export as SVG instead of/in addition to PNG.
- Foot-CLI: ASCII QR rendering in the TUI.
- `qrcode` as a block fence in the WorkPage editor (the inline channel covers chat; WorkPage fences follow the general fence rollout).
