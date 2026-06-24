---
title: "Vance — Help System"
parent: Specs
permalink: /specs/help-system
---

<!-- AUTO-GENERATED from specification/public/en/help-system.md — do not edit here. -->

---
# Vance — Help System

> A **generic help subsystem** delivers Markdown/text help content from the Brain to the Web UI (and potentially other clients). Content resides as static resources in the Brain, delivered via a single REST endpoint with **language fallback to English**. The Web UI (e.g., the Recipes editor) loads individual help files on demand and renders them in the right panel.
> See also: [web-ui](/specs/web-ui) | [recipes](/specs/recipes)

---

## 1. Purpose

Web UI editors require context-sensitive help — a field reference for YAML editors, how-tos for workflows, a glossary for terms. This content should be:

- **Maintainable in the backend** (no frontend rebuild for documentation updates of a single resource).
- **Multilingual**, allowing growth without creating every file per language.
- **Format-flexible**: primarily Markdown, but HTML, Plain Text, or JSON are also possible.
- **Generically reusable** for any future client (Web UI, Mobile, Electron) — no editor-specific API.

The Help system is intentionally **read-only** and **static at runtime**: content is delivered with the Brain and changes only via deploy/restart. Tenant- or project-specific help is explicitly not a goal — for that, there are Settings, Recipes, and Documents.

---

## 2. Resource Layout

```
vance-brain/src/main/resources/help/
  en/
    recipe-field-docs.md
    <topic>.md
    <topic>/<sub>.md          ← nesting allowed
  de/
    recipe-field-docs.md      ← optional, overrides en
    ...
```

**Rules:**
- **`en` is mandatory** for every resource. Other languages are optional translations.
- Paths may only contain `[A-Za-z0-9._-]` and `/`. No `..`, no absolute paths — the loader rejects them with a 400.
- File extension controls the `Content-Type` of the response: `.md` → `text/markdown`, `.txt` → `text/plain`, `.html` → `text/html`, `.json` → `application/json`. Unknown extensions: `application/octet-stream`.

---

## 3. REST Endpoint

```
GET /brain/{tenant}/help/{lang}/{*path}
```

**Auth:** like all Brain routes via JWT (`BrainAccessFilter`). Tenant-in-Path must match the `tid` claim — Help content is generic, but the auth wall remains consistent.

**Parameters:**

| Parameter | Value | Validation |
|---|---|---|
| `lang` | ISO-639-1 two-letter (`en`, `de`, …) | Regex `^[a-z]{2}$` — otherwise 400 |
| `*path` | arbitrarily deep resource path | Regex `^[A-Za-z0-9._-]+(/[A-Za-z0-9._-]+)*$` — otherwise 400 |

**Resolution:**

1. Attempt to load `help/{lang}/{path}` from the classpath.
2. If not found **and** `lang != "en"` → attempt `help/en/{path}`.
3. If also not found → **404**.

**Response Headers:**
- `Content-Type` by extension (see above).
- `Cache-Control: max-age=300` — Help content changes only via deploy; short browser caching is sufficient.

**Errors:**

| Status | When |
|---|---|
| 200 | Resource found (lang or en-fallback) |
| 400 | Lang or Path invalid (see regexes) |
| 401 | JWT missing or invalid |
| 403 | Tenant in Path does not match JWT `tid` |
| 404 | Neither `{lang}` nor `en` has the resource |

---

## 4. Frontend Integration

In `@vance/shared/rest`:

```ts
// GET-only variant of brainFetch, returns body as string or null on 404.
brainFetchText(path: string): Promise<string | null>
```

In `@vance/vance-face/src/composables/useHelp.ts`:

```ts
const help = useHelp();
await help.load('recipe-field-docs.md');
help.content.value;   // string | null
help.loading.value;   // boolean
help.error.value;     // string | null
```

**Language selection:** `useHelp` reads `navigator.language`, truncates to two letters (`en-US` → `en`, `de-DE` → `de`), and sends this as the `lang` path segment. Browsers without a recognizable language fall back to `en`.

**Render:** Editors pass `help.content` to `<MarkdownView>` (or another suitable rendering component).

---

## 5. Conventions for New Help Resources

1. **English file first** — `resources/help/en/<topic>.md`. Other languages follow optionally.
2. **Naming:** kebab-case, descriptive for the respective UI context (`recipe-field-docs.md`, not `help1.md`).
3. **Tone:** factual, concise, "like a field manual" — not marketing text. Field references with type + default + 1-line explanation per field; deeper context only if it cannot be understood without reading the source code.
4. **No external images/assets.** If necessary, they belong in the same `help/` subtree and are referenced via relative paths.
5. **If content is very editor-specific**, keep it maintainable alongside the editor — clearly document the link structure in the MD so that the relationship remains understandable in case of spec drift.

---

## 6. What the Help System IS NOT

- **Not a CMS function** — no UI for editing help content at runtime. To change help, modify the resource and deploy.
- **Not a Tenant/Project variant** — help is global. Behavior adjustments per Tenant belong in Settings/Recipes.
- **Not a templating engine** — content is delivered 1:1. Variable substitution (e.g., `&#123;{tenant}}`) is done by the client, if necessary.
- **No search, no index** — this will come only when the need is real. For now: known path, known topic.

---

## 7. Status

| Component | Status |
|---|---|
| `HelpController` (`/brain/{tenant}/help/{lang}/{*path}`) | implemented |
| Path/Lang validation + en-fallback | implemented |
| `brainFetchText` in `@vance/shared` | implemented |
| `useHelp` Composable in `@vance/vance-face` | implemented |
| `recipes-editor` Right-Panel with `recipe-field-docs.md` | implemented |
| Bundled `help/en/recipe-field-docs.md` | implemented |
| Translations (`de/`) | open |
| Further Topics (Inbox, Scopes, Document-Editor, …) | open, on demand |
