---
title: "Selection Reference — what a message pointed to"
parent: Specs
permalink: /specs/selection-reference
---

<!-- AUTO-GENERATED from specification/public/en/selection-reference.md — do not edit here. -->

---
# Selection Reference — what a message pointed to

> An app selection travels as a **per-turn hint** and is then forgotten.
> A message referring to it remains. The **Selection Reference** is
> the persistent half: label + at least one address, persisted on the
> USER chat message that made the reference.
>
> Status: v1 built (Brain + Web-UI), not yet verified in the browser.
>
> See also [`inter-links.md`](/specs/inter-links) (the `vance:` grammar including
> `?entry=`), [`centauri-service.md`](/specs/centauri-service) and
> [`app-search.md`](/specs/app-search) (the first two sources),
> [`milliways-system.md`](/specs/milliways-system) (the same label-plus-address
> invariant on `ShareSubject`).

## 1. The Problem

`ActiveAppContext.selection` answers **"where is the reader currently looking"**.
`ClientTurnContextResolver` deliberately discards the hint after the turn — carrying
it along would mean telling the model that the reader is in a folder they
left minutes ago.

However, a message like *“can you find out more about the selected case?”* does not
describe a moment — it makes a **reference**. The sentence ends up in the history,
but the reference does not. What remains is a pronoun without a referent: as soon
as the entry is scrolled out of the feed, no one — human or agent — knows what
was being talked about.

**The rule from which everything follows:** a reference belongs to the *utterance*
that made it, not to the *moment* in which it originated.

## 2. Form: Label + at least one address

```
label      "From bed expansion to strengthening emergency services"
vanceUri   vance:/apps/newsfeed/_app.yaml?entry=hrafnagud%2F6928769
url        https://mehrnews.com/news/6928769
```

- **`label`** is the *name* of the thing, not the thing itself. Mandatory — it is the
  last line of defense if both addresses are dead.
- **`vanceUri`** addresses the entry **in this installation**, in the
  Inter-Links grammar. The handle is app-specific and opaque; for feeds, it is
  `<sourceId>/<itemId>` — exactly the pair that `feed_item` takes. This means the
  address for clicking and the address for rereading are **one** string.
- **`url`** addresses the thing at its origin, for `web_fetch`.

**Both, where both exist** — they die independently: the `vanceUri` if the source
no longer serves the item (streams are time-partitioned); the `url` if the publisher
moves it or puts it behind a paywall. Storing only one would mean choosing one of
the two types of death.

**Label alone is not a reference** and will be discarded: a line that only says
"something was there" takes up space in every future prompt and contributes nothing.
Milliways has the same invariant on `ShareSubject`.

**No Body.** Content is reloadable via both addresses and is external text; copying
it would mean putting an unlimited excerpt into every subsequent prompt.

### 2a. Not every selection is addressable

| App | `vanceUri` | `url` |
|-----|-----------|-------|
| feeds | ✓ `?entry=<sourceId>/<itemId>` | ✓ Article |
| search | — | ✓ Hit |
| links | ✓ `?entry=<url>` | ✓ Target |

A **search hit has no handle on our side** — a search is stateless, its address
*is* the address. This is precisely the difference where Zarniwoop is a search
source and Jaglan is a Mount, and it must not be smoothed over here.

## 3. Who declares the reference: the App

It is declared by the **app-specific UI** (`ActiveAppContext.selectionRef`),
because only it knows what a click on one of its cards means — and because for
feeds and search, the server could not even look up the line: a stream entry is
not in any document. The client and server halves of an app are in the same
addon, so the declaration remains in one hand.

The `selection` string remains unchanged next to it. Two fields with different
lifespans instead of a parsed string: a decomposition at `" — "` would be
silently incorrect for titles with a dash.

## 4. What the Brain does with it

`SelectionReferenceIngest` is the gateway (`vance-brain/applications/`):

1.  **Harden label** — collapse whitespace (a `\n` in an external headline would
    otherwise open a new line in the middle of the prompt), truncate to 200 characters.
2.  **`url` against `SafeLink`** — only `http`/`https`/`mailto`. The value is
    presented to a *human* as a link and to the model as "you may fetch this";
    a `javascript:` has no place in either role.
3.  **`vanceUri`** must start with `vance:`; the rest of the grammar is the
    resolver's business, not this gateway's.
4.  **Check invariant** — without an address, the entire reference is discarded.
    This exactly restores the previous behavior: nothing is written.

It is persisted as `meta.selectionReference` on the USER message — and
**per message**, not per turn: a Drain can hold two inputs from two app tabs,
and the reference belongs to the sentence, not to the delivery.

It is written at the persistence points of the Engines that accept chat turns:
**Arthur**, **Eddie**, **Frankie** (as Session-Primary), and **Trillian-Control**.

## 5. Replay in the Prompt

`ChatHistoryRenderer.renderUser` appends a line during replay:

```
[vance] This message pointed at: "<label>" — <vanceUri> — <url>
```

The same construction as the failure block on the Assistant side: **from metadata
at replay time**, deterministic (the prompt cache remains stable) and without
touching the text the user wrote. Formulated as a fact about the past turn, not
as an instruction — otherwise the model reads it as a new command to fetch the article.

**Addresses are enumerated, not explained.** Which tool belongs to which address
is in the app's Active-App block (`feed_item` or `web_fetch`); an instruction
per referring message would repeat itself with every turn.

For the **current** turn, none of this happens: there, the Active-App block
already states what is marked. The line is for everything that comes after.

## 6. In the UI

The chat bubble renders the reference below the message (`↳ Label · ↗`), the
label as a `vance:` link via `MarkdownView` — i.e., via the host's link handler,
which opens the tab in Cortex instead of navigating. Visible, because otherwise
it would fix the agent's memory but not the human's.

The return path is **late-bound**: the Feeds app accepts `?entry=`, marks the
entry, and scrolls to it *if* it is on the page. If it is not — stream has
advanced, source no longer serves it — the app opens and stays where it is.
Never an error, never an empty page; this is the property that allows such links
to be issued at all. The handle also moves into the Cortex URL (`useAppEntry`),
so that F5 and a shared link reproduce the position.

## 7. What it is not

-   **Not a selection register.** A persistent store of "my last selections"
    would be a third concept between two existing ones: *Marking* is by
    definition fleeting ("this one, now"), and for "I want to keep this" there
    is **Clip** — which becomes a document. A register in between would need
    a lifespan, eviction, a UI to view and clear, and would introduce exactly
    the risk against which the per-turn hint was written: context that claims
    to be current.
-   **No Cortex text areas.** `boundDocSelection` are character offsets; after
    two edits, they point elsewhere. If this ever comes, it will be as a *quote*,
    not a range.
-   **No compaction protection** in v1. A summary may shorten the line; whether
    it deserves `STRENGTH:pinned` will be decided by practice.
-   **No LLM tool.** The reference is created by sending a message, not by a call.

## 8. "Compare that with my selection from earlier"

This falls out, without needing anything specific for it: both references are in
the history, each with a label and addresses. The agent reads the full text via
the tool associated with the address. The limit is compaction — what has been
summarized is gone like any other content.
