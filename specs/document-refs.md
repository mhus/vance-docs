---
title: "Vancetope — Document References"
parent: Specs
permalink: /specs/document-refs
---

<!-- AUTO-GENERATED from specification/public/en/document-refs.md — do not edit here. -->

---
# Vancetope — Document References

> A **Document Reference** addresses a document from within another document — in a Recipe, Skill, Guard, Embed, Link. There is **one** grammar for this, deterministically (no LLM) resolved by a central `DocumentRefResolver`. On a web interface, the same grammar is used as a **URI** with schema `vance:`; in Config/YAML, it's a **bare path** without a schema. The path part is identical.
>
> See also: [script-document-api](/specs/script-document-api) (`vance.documents.*`) | [completion-guard](/specs/completion-guard) (first consumer) | [doc-kind-workpage](/specs/doc-kind-workpage) / [app-binder](/specs/app-binder) (`vance:`-Embeds) | [inter-links](/specs/inter-links) (`?entry=`)

---

## 1. Grammar — RFC-3986 Reference Resolution

A reference is a **URI reference** and is resolved against the **Base** `vance://<currentProject>/<referrerDir>/` — according to RFC 3986, with **one** explicit deviation: the `vance:` schema is optional and does *not* make the reference absolute (see below).

| Form | Meaning |
|---|---|
| `path` | **relative** — to the directory of the *referring* document ("next to the Skill"). |
| `/path` | **absolute** within the *current* Project (from its root). |
| `//projectId/path` | the same path in a **different** Project (Authority = Project `name`, unique). |
| `vance:path` · `vance:/path` · `vance://projectId/path` | the same thing with a schema. |

`project == projectId` is the **Project name** (not the Mongo `id`) — consistent with the entity convention where `*Id` fields reference the `name`. The URI Authority *is* the Project name.

**The schema is a marker, not a mode.** `vance:` means "this is one of our references" and nothing else; **what follows it decides** — `vance:foo` is relative, just like `foo`, `vance:/foo` is absolute, `vance://p/foo` is a foreign project. This means there are three forms, not six, and the rule can be stated in one sentence: **Slashes decide, the schema does not.**

This deliberately deviates from RFC 3986, where a schema makes the reference absolute. The reason is that a reference here is always written from within a document, and "the file next to it" is the most common case; an author who prepends `vance:` to *distinguish* the reference would otherwise silently shift its target. To achieve the RFC interpretation, write `vance:/foo` — this is one more character and is visible.

### 1.1 Known Query Parameters

The query is **not** part of the addressing — it never changes *which* document is meant. It tells the consumer what to do with it and is therefore passed through unchanged to `DocumentRef.query`. A consumer that does not recognize a parameter ignores it.

| Parameter | Reader | Meaning |
|---|---|---|
| `kind` | Embed/Kind Renderer | Render hint if the target's Kind is insufficient or not set |
| `entry` | the addressed **Application** | a location *within* the app — see [inter-links](/specs/inter-links) |
| `mode`, `caption` | Markdown Embeds | Display (`preview`/`reference`), caption |

`entry` is the only parameter whose value **no one but the target** interprets: it is an opaque, app-specific handle. It must be percent-encoded when created — otherwise, foreign text with `&` or `=` will break the query — and it is neither validated nor resolved during resolution; whether it still means something is decided by the app when opened.

---

## 2. Resolution

The `DocumentRefResolver` (`vance-shared`, `@Service`, **pure** — no I/O, no document store):

```
resolve(ref, DocumentRefContext{currentProjectId, referrerDir}) → DocumentRef{projectId, path, query}
```

1. `#fragment` is discarded, `?query` is separated and returned on `DocumentRef.query` (see §1.1 — consumers that need it do not re-parse it).
2. Optional `vance:` schema is **only stripped** — no slash added, no special treatment; from here on, a reference with a schema is indistinguishable from one without.
3. `//authority/path` → different project; `/path` → current project from root; `path` → relative to `referrerDir`.
4. **Canonicalization:** `.`/`..` collapsed, empty and double separators removed; a `..` **beyond the project root** is a `DocumentRefException` (no silent escape).

`DocumentRefContext.root(project)` for Config that addresses from the root; `DocumentRefContext.fromReferrerDocument(project, referrerDocPath)` sets `referrerDir` to the parent folder of the referring document (thus `guard.js` next to `_vance/skills/x/skill.yaml` becomes `_vance/skills/x/guard.js`).

### 2.1 Same Resolution in the Browser

A `vance:` link in a rendered document is resolved **client-side** — the server never sees it. `parseVanceUri` (`vance-face`) is the twin of the resolver: the same three forms, the same canonicalization, the same abortion when breaking out of the project root.

What it lacks is the referrer: the renderer receives a Markdown string and does not know which document it originated from. This information is therefore provided **by the host** via `provide`/`inject` (`DOCUMENT_REFERRER_KEY`, `provideDocumentReferrer(pathRef)`) and is deliberately declared **per document**, not per page:

| Provider | Declares |
|---|---|
| Cortex Tab (`DocumentTabShell`) | the document of the tab |
| `EmbeddedKindBox` | the **embedded** document — references within it are next to *it*, not next to the host |
| none (Chat, Inbox, search results) | empty = Project root |

The last case is the **correct** answer and not a fallback: a chat text does not belong to any document, so there is nothing it could be relative to. This is precisely why it is `provide` and not a property — the innermost provider wins at every nesting depth, and a property would have to be passed through every intermediate component.

**Boundary:** only the *path* travels, not the project. A relative reference **within** a document embedded from a foreign project still lands in the current project.

---

## 3. Enforcement Remains at the Call Site

The resolver **only** calculates the target `(projectId, path)` — a cross-project reference implies **no** access. The caller loads the document via its normal path and applies the usual permission check to the resolved project (READ, analogous to [`foreign_*`](/specs/foreign-document-access)). Separation as in the [Permission System](/specs/permission-system): Resolver = pure calculation, Enforcement = separate. Where a consumer has operator-trusted input (Recipe/Runtime-Guard-Config), it can waive the check — this is a call-site decision, not a resolver property.

---

## 4. Consumers

The resolver is available as an **`@Service`** (`resolve`) **and** as a pure **static** method (`resolveRef`) — static call sites that cannot hold a Bean share the same logic.

**Consumers (v1):**
- [Completion-Guard](/specs/completion-guard) script loader — Guard script references are project-relative from the root, so that `/absolute` and `//other-project/...` work (injected Bean).
- `ScriptDocumentApi` (`vance.documents.read/write/exists/delete/meta`) — Single document access via `resolveRef` (relative to `documentBasePath`), **with same-project-Clamp**: a cross-project reference is rejected (Sandbox invariant), `..` is canonicalized (hardening).

**Deliberately NOT targets** (no authored ref or different semantics — forcing would change behavior or require hacks):
- **`ScriptDocumentApi.list(prefix)`** — the prefix is a `startsWith` match where the **trailing slash is significant** (`notes/` ≠ `notes`). Canonicalization would strip it → remains literal.
- **`BinderResolver.stripToPath`** — a **project-agnostic, same-project, URL-decoding** path reducer (static, widely used). Deliberately discards the Authority and percent-decodes (`vance:`-URIs are encoded). A true migration would require a placeholder project context + would treat `//`-refs differently — no clean gain. Cross-project Binder entries would be a **feature**, not a refactor.
- **Fixed-path `lookupCascade`-Loader** (Recipe/Skill/Manual/...) — load **fixed internal paths** (`_vance/recipes/<name>.yaml`), no authored Refs; nothing to resolve.

---

## 5. Anchors (Current Code)

- `vance-shared/.../document/DocumentRefResolver.java` (+ `DocumentRef`, `DocumentRefContext`, `DocumentRefException`).
- First consumer: `vance-brain/.../guard/CompletionGuardService.java` (`loadScript`).
