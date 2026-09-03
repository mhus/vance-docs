# Web Grab

> Import the page you are currently viewing as a document.
> `POST /brain/{tenant}/grab`, Impl `vance-brain/.../webgrab/`.
> Status: **v1 built**, browser verification open.

## 1. The Core Decision: Content Comes Along, Not the URL

A grab sends **bytes**, not an address. This is not convenience; it is the
entire reason for its existence:

> If the server could fetch the page itself, you wouldn't need a plugin —
> `web_fetch` has existed for a long time, and an Agent has it.

What the server does **not** get: pages behind a login, behind a paywall, on the
intranet, or assembled by JavaScript. These are precisely what the browser sees.
Therefore, the extension sends what it has rendered, along with the session it
has.

Two side effects, both good: the service makes **no outgoing request** (thus no
SSRF surface to defend), and the distinction from the [Links app](app-links.md)
becomes sharp — the latter stores a **reference**, while the grab stores
**content the server could never see**.

## 2. Two Types, One Rule

| What arrives | What happens |
|---|---|
| `text/html`, `application/xhtml` | → Markdown, with Frontmatter |
| everything else (PDF, image, …) | Bytes stored unchanged |

This is the complete type logic. Converting a PDF would lose precisely what makes
it a PDF; leaving HTML as HTML creates a document that no one will want to open
in a year.

## 3. `HtmlToMarkdown`

Pure function, no IO. Preserves headings, lists (nested), code fences with
language, blockquotes, emphasis, and GFM tables; links and images are made
**absolute** against the source URL — a saved page whose links all point to
`/about` is one that cannot be followed.

**Why this exists alongside `WebFetchTool.htmlToText`:** the latter produces
plain flowing text (jsoup `.text()`). This is correct for a prompt, where
structure costs tokens and provides little benefit. It is incorrect for a
document — headings, lists, and links are precisely what makes a saved page
readable, and flattening cannot be undone.

### 3.1 The Content Heuristic Is a Heuristic

A real page is mostly not the article: navigation, cookie banners, related
articles sidebars, footers. Readability would be clean — a Readability port to
Java is disproportionate for a grab endpoint.

Instead: `<article>` / `<main>` / `[role=main]` are preferred, among several
**the one with the most text** (an overview page is a stack of teasers, and the
first is a headline with two sentences), otherwise `<body>`; after that, tags
that are by definition ancillary are removed. This works for most pages and
fails **visibly** (too much retained) rather than invisibly (the article
silently disappeared).

A landmark with almost nothing in it is discarded — otherwise, a page with
visible text produces an empty document.

**`<header>` is only stripped if the root is `<body>`.** Within an `<article>`,
it is the title block; removing it would take the headline with it.

### 3.2 Two Detail Decisions

**A non-rectangular table becomes text**, not a grid. A layout table rendered as
a grid is worse than its cells as paragraphs — the reader gets a single-column
table where the page had a sidebar.

**A fragment link is a link as soon as there is a base.** `#fn1` resolved against
the source URL points to the footnote of the original page, and that is useful
for the reader of a copy. Without a base URL, it resolves to nothing and becomes
text. The **resolved** value is checked, so "is there a base" decides.

Escaping is kept minimal: only what would accidentally turn text into *structure*
(`\`, `` ` ``, `*`, `_`, `[`, `]`, `<`), plus `|` in table cells. No paranoid
escaping — prompt injection is inherent in grabbing, and the Web UI sanitizes
anyway.

## 4. Naming — The Input Value Is Hostile

The document name comes from the page's `<title>`: foreign text arriving via an
endpoint that writes to disk. `../../etc/passwd` is the obvious case; a title
consisting of `.`, an empty one, or 400 emoji characters are what actually
occur.

`GrabNaming.slug` is an **allow-list**, not a deny-list — a deny-list is a bet
that it is complete, and the interesting inputs are precisely those no one
thought of. Everything outside `[a-z0-9-]` becomes a separator, so `etc-passwd`
comes out: no escape, no error, a name.

Umlauts are transliterated (otherwise `bergre` would appear where `Übergröße`
was), the length is truncated **at the end** (the separator is appended before
its character, the umlaut branch writes two — the loop condition alone is not
enough), and the result never ends with `-` and is never empty.

The **folder** goes through the same mill: the worst a wrong value can do is
place the document in an unexpected location **within its Project**.

An unknown MIME type gets `.bin`. Guessing an extension from a type we don't
know is how an `.exe` gets named `.png`.

## 5. Collision: Suffix, Never Overwrite

Grabbing the same page twice is normal — you saw it again and forgot.
Overwriting would silently take what someone wrote into the first copy. A second
`post-2.md` is slightly messy and destroys nothing, and messy is the error a
human can see and fix.

**The existence check is not the safeguard; `create` is.** Two simultaneous
grabs both find `post.md` free; the loser gets `DocumentAlreadyExistsException`
and takes the next name.

## 6. Frontmatter

```yaml
---
title: "…"
source: https://…
grabbedAt: 2026-09-01T…Z
---
```

The fenced `key: value` form that `MarkdownHeaderStrategy` reads anyway — the
source travels **with the document** instead of as a sentence in the body that
the next edit removes. The title is sanitized: a `:` or a newline in it would
prematurely end the flat header and dump the rest into the body.

## 7. REST

`POST /brain/{tenant}/grab` — **multipart**, because a grabbed PDF is bytes, and
Base64 in a JSON body would bloat it by a third.

| | |
|---|---|
| `?projectId=` | Required |
| `?url=` | Required — resolves every relative link and is the only proof of origin |
| `?folder=` | Optional, Default `web` |
| `?title=` | Optional, overrides the page title (someone renamed it in the popup) |
| Part `content` | The bytes; the **Part-Content-Type** determines the path |

**Separate route instead of `/documents/upload`**, for the same two reasons
`/capture` won against `/entry`: a narrow route creates a narrow profile (the
generic upload would mean "create any document at any path"), and the conversion
must live somewhere — via the generic endpoint, every future client would have to
rebuild it.

**Authorization is the usual, and that's the point:** nothing needed to be built
for the token here. `Resource.Document CREATE` against the target Project, and a
Project-pinned [Integration Token](integration-tokens.md) is already restricted
to its Project by `PermissionService`. The check is against the **folder**, not
the final path — the name is only generated after reading the content, and an
authorization decision must not depend on work already performed for a
potentially unauthorized caller.

Cap: 32 MB per grab, 4 MB HTML to parse, 1 MB generated Markdown (with
`*(truncated)*` marker).

## 8. The `web-grab` Profile

Exactly **one** surface: `POST /grab`. No read route — a grab writes what the
browser already has and never needs to see what's in the Project.

Precisely this asymmetry is why `web-grab` and `links-capture` remain
**separate** instead of becoming a "browser-extension" profile: a token can carry
both ([Multiple Profiles](integration-tokens.md)), and then the union is the
human's decision instead of one baked into a profile that no one reads again.

## 9. Limitations (v1)

- **No Readability.** See §3.1 — the heuristic is named, not hidden.
- **No Dedup.** Grabbing the same page twice results in two documents. `source:`
  in the Frontmatter makes later dedup possible, but it is not built.
- **No LLM Tool.** An Agent has `web_fetch` + `doc_write`; the grab exists for
  what the server cannot fetch, and an Agent has no browser.
- **No automatic link entry.** Grab and Link are two conscious actions;
  composition happens in the popup, not on the server.
