---
title: "Vancetope — Inter-Links"
parent: Specs
permalink: /specs/inter-links
---

<!-- AUTO-GENERATED from specification/public/en/inter-links.md — do not edit here. -->

---
# Vancetope — Inter-Links

> A link points not just to a **document**, but to a **location within an app**: page 3 of a Workbook, a page in the Wiki, a board in the Canvasbook. No separate data model is stored for this; instead, **a parameter** is added to the existing [`vance:` grammar](/specs/document-refs) — `?entry=<handle>`. Only the app that issued the handle knows what it means.
>
> See also: [document-refs](/specs/document-refs) (the grammar) | [cortex](/specs/cortex) (where the location ends up in the URL) | [milliways-system](/specs/milliways-system) §7a (the same SPI, different direction) | [doc-kind-canvas](/specs/doc-kind-canvas) / [app-workbook](/specs/app-workbook) (the UIs)

---

## 1. The Reference

```
vance:/<folder>/_app.yaml?entry=<handle>
```

The manifest **is** the document that is opened; `entry` specifies where within it. Thus, an
Inter-Link inherits everything that already applies to document references — parser, click interception,
`DocumentRefResolver`, the link allow-lists. There is **no** second storage location and **no**
second schema.

`entry` is an **opaque, app-specific string**. The system stores it and returns it unchanged; it never
interprets it. What it is, is decided by the app:

| App | Handle | Why this identity |
|---|---|---|
| Workbook | Document ID of the page | survives renaming *and* moving |
| Wiki | space-qualified slug (`ops/deploys`) | the address the Wiki uses anyway — in the URL and in `[[Wikilink]]` |
| Canvasbook | Document ID of the board | same as Workbook |

The choice follows the identity that the app **itself** uses. Two identities for the same page
would be worse than a slug that breaks upon renaming.

**Percent-encoding is mandatory.** A handle is foreign text and may contain `&`, `#`, or `=`;
unencoded, it will consume the rest of the query. Therefore, the reference is generated at **one** place:
`vanceRef()` in `@vance/components`. The same function knows the second pitfall — the cross-Project form
requires a **double** slash (`vance://<project>/<path>`), because the Project is a URI authority;
with a single slash, the Project name becomes the first path segment.

### 1.1 Stability

| Level | Form | Survives Move? |
|---|---|---|
| Path to app | Path `<folder>/_app.yaml` | **no** |
| Location in app | `entry=<handle>` | yes, where the app uses IDs |

The assurance is "as stable as the app itself," not "secure": a Kanban column or a
Links group *is* its name, so a rename always breaks it. Therefore, the strict rule is:

> **An unresolvable handle opens the app and stays there.** Never an error, never a blank
> page. The app falls back to its landing page.

This saves more links than any resolution mechanism. It is also why the location is bound **late**:
a URL fully calculated at creation cannot degrade.

---

## 2. The SPI: `targets()`

An app exposes its locations via **a single** `default` method on `VanceApplication`:

```java
enum TargetPurpose { NAVIGATE, INTAKE }

record AppTarget(String handle, String label, @Nullable String group) {}

default List<AppTarget> targets(TargetsContext ctx) { return List.of(); }
```

`TargetsContext` carries the same Scope as `describe()`/`status()` plus the `purpose`.

**One Purpose in the Context, not two methods.** For most apps, it's the same list. Where it
differs, the `if` belongs **within the app** — not in a caller that would need to know which
apps differ:

- **`NAVIGATE`** — "where can a link point". Any location the app can *open*.
- **`INTAKE`** — "where can something be deposited". Only locations that accept a new entry; see
  [Milliways](/specs/milliways-system) §7a.

An empty list means "no locations" — the link then addresses the app itself. Because `INTAKE` can be empty
while `NAVIGATE` is full, this also covers "linkable, but accepts nothing" without an additional flag.
`acceptsShare` remains unaffected: it answers "does it accept *this* Subject," not "where to".

**A location is something the app can open.** Therefore, Kanban has no `NAVIGATE` targets: a board
shows all columns simultaneously; there is no "open column". For the same reason, the
Links app provides groups only for `INTAKE`.

**Handle grammar.** `AppTarget` rejects an empty handle, an empty label, and a `|` in the handle
— the latter because the Milliways selection value is `project|path[|handle]`. Validation occurs where
handles **originate**, so no consumer needs to escape.

---

## 3. Where the Location Ends Up: the Cortex URL

A location is **per-tab state** and therefore belongs to the host, not the app:

```
/cortex?open=…&doc=…&entry=<docId>:<handle>,<docId>:<handle>
```

Details of the parameter in [cortex](/specs/cortex). For apps, the seam matters:

| Injection | Direction |
|---|---|
| `vance:app-entry` | reactive map `docId → handle`; the app reads **its** entry |
| `vance:report-app-entry` | the app reports the location it currently has open |

Encapsulated in `useAppEntry(appDocId)` (`@vance/components`). **Without a host, both sides degrade to
null/no-op** — the app continues to function, just without URL memory. This leads to the rule for apps:
the reported value is a **suggestion**, not state; the app retains its own active location.

The app must **react** to changes, not just read on mount: a link to the same tab
does not remount anything; the jump then happens solely via this map.

---

## 4. Where the Selection Comes From

Two routes, because the two questions have different costs:

| Route | Cost | Answer |
|---|---|---|
| `GET /brain/{tenant}/applications?projectId=…` | one manifest read per app | `{ starred, project }` |
| `GET /brain/{tenant}/applications/targets?projectId=…&path=…&purpose=NAVIGATE` | one folder scan | `{ targets }` |

There is **no** field "this app has locations" in the listing: it would scan every app to draw a list
before anyone has chosen anything. The locations appear when an app is selected.

**Two lists, not one.** `starred` are the caller's favorites and cross Projects;
`project` is everything in the Project being edited. An app in both appears only under `starred`.
Favorites here are a **shortcut, not a boundary** — unlike in the Milliways dialog, where the
Starred list is the *entire* selection, because sending is a conscious act. Linking usually happens to
the app one is working in, and that is rarely starred.

**Authorization.** The caller's `Project READ` covers the Project list. Favorites can point to external
Projects and are checked **per entry**; a match that fails validation is silently dropped
— it is one's own bookmark that has become outdated. The Targets route checks against the Project
**of the app**, not against that of the caller.

A folder without a manifest or with an unknown `app:` results in `404`. An app that throws an error during listing
returns an **empty** list: "no locations" is a usable answer; the link to the app itself
continues to work.

---

## 5. The UIs

Both pickers share `useApplicationPicker` (listing + second step) and `vanceRef` (the URI). A
third picker does not write a fetch.

**Block Editor** (`VLinkPicker`, shared by Workbook, Wiki, Kanban, GTD, Issues, Journal) — five
tabs: `Project document` · `This app` · `Starred` · `Applications` · `Direct URL`. "This app"
appears only if the host passes its locations; the list comes **locally** from the host, without a roundtrip
— the host holds it anyway, and the app is the only one that knows its own pages.

**Canvas** (`DocPicker` for `doc`-nodes) — four tabs: `Document` · `This App` · `Favorites` · `Apps`.

In both cases: the **app itself** is always selectable (a link to "the book," not to a page
within it), and the **currently open** location is missing from "This App" — a link to oneself is a dead
click.

The dialog has a **fixed** height. With five tabs, the content length varies greatly, and a panel
that changes size with each tab click pulls the tab bar away from under the pointer.

---

## 6. What Is Not Included

- **No separate schema.** A `vance-link:` would open the same click path a second time and
  touch four allow-lists — for the value of one parameter.
- **No relay.** A server endpoint that resolves and redirects on click has no sender
  (no server code builds a frontend URL), and the web UI handles login redirection better
  (`index.html?next=…`). If a sender emerges, the task is a helper function that
  builds `/cortex?…` with the **document ID** — not an endpoint.
- **No ID form on `vance:`.** The path to the app remains path-based. App folders are rarely
  moved; pages within them are moved constantly.
- **No LLM tools** for generating such links.

Derivation, discarded approaches, and history: `planning/inter-links.md`.
