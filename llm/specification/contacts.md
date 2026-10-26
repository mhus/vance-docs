# Contacts — Address Book as a Typed Data Format over Documents

> Addon `vance-addon-brain-contacts`. Contacts (persons, organizations,
> groups) are stored as `kind: contact`-YAML under `_vance/contacts/` in three
> Scopes; reading and writing is done **exclusively** via the
> `ContactService` — by the `contact_*`-Tools, the REST surface, the
> Contact View, and the Kind Renderer.
> See also: [permission-system](permission-system.md) (R4, R7,
> `WriteActor.system`), [document-change-events](../document-change-events.md),
> [app-links](app-links.md) (patch semantics, no image URL as tool parameter).
> Planning and derivation: [`../../../../planning/archive/contacts.md`](../../planning/contacts.md).

---

## 1. Purpose and Scope

Vancetope knows **who someone is**: name, picture, emails, phone numbers,
addresses, organization, note, groups. Humans and Agents work on the
same contacts — humans via the Contact View, Agents via Tools.

Core principle: **Contacts are a supported data format, not files to be searched.**
The documents are the storage (and thus provide versioning, WebDAV, Project Copy,
Kits, Recycle Bin, and permissions); the interface is the service. The Agent
receives typed structures and does not need to know the YAML.

```
Agent (contact_*) · Contact View · REST · Kind Renderer
                      │
                      ▼
               ContactService ── ContactIndex (Cache per Project)
                      │  ContactCodec (YAML ⇄ ContactCard)
                      ▼
               DocumentService ── _vance/contacts/<uuid>.yaml (+ <uuid>.jpg|png)
                                  in _user_<login> · Project · _tenant
```

**Not:** not a CardDAV server, no synchronization with Google Contacts (would be a
later connector), no CRM, no separate Mongo collection. A contact is
not a Vance user; `vanceUser` is a hint, not a source of permissions.

## 2. Data Model

### 2.1 Standard

**vCard 4.0 (RFC 6350)** defines the meaning of fields and the exchange format
(Import/Export via **ez-vcard**, BSD-2, bundled in `.vab`). Internally, a
proprietary typed model `ContactCard`, stored as readable YAML. JSContact
(RFC 9553) was deliberately not chosen — hardly anyone uses it externally. jCard
is unreadable as a storage format.

### 2.2 Document

```yaml
$meta:
  kind: contact
contact:
  kind: individual            # individual | org | group
  fullName: Dr. Anna Berger   # FN
  name: {family: Berger, given: Anna, prefixes: [Dr.]}
  nicknames: [Anni]
  photo: 3f0c…e1.jpg          # managed by the service
  emails:
    - {value: anna@meridian.example, types: [work], pref: 1}
  phones:
    - {value: "+49 170 7654321", types: [cell]}
  addresses:
    - {types: [work], street: Hauptstraße 5, locality: Berlin, postalCode: "10115", country: DE}
  org: {name: Meridian GmbH, units: [Einkauf], ref: <uuid of an org contact>}
  title: Head of Purchasing
  role: …
  birthday: 1984-03-12        # or --03-12 without year
  anniversary: …
  urls: […]
  impps: [{value: "xmpp:anna@…"}]
  languages: [de, en]
  timezone: Europe/Berlin
  categories: [customer]
  note: |
    Likes short emails.
  related: [{value: <uuid>, types: [colleague]}]
  members: […]                # only kind: group
  vanceUser: anna             # Hint, no permissions
  extras: {X-SOCIALPROFILE: …}  # vCard properties without their own field
```

- Multi-valued fields are **always lists**. `types` follows vCard vocabulary;
  unknown values are preserved. `pref` (1 = preferred) instead of a separate
  primary flag.
- `extras` ensures lossless Import → Export.
- **Lenient reading:** a string where a value object should be is its `value`;
  an unquoted YAML date returns as the text the author typed (not as
  `Date.toString()`); a postal code as a number remains text.
- **Validation:** `kind_validate` (via the `ContactKindHandler`) reports with
  path (`doc.yaml:contact.emails[1]`) what the lenient reader discards or
  misinterprets: missing name, entry without `value`, unknown field,
  unknown `kind`, date outside `yyyy-MM-dd`/`--MM-dd`, `members` on a
  non-group, member neither UUID nor URI, photo name not `<uuid>.jpg|png`,
  reference without UUID or with unknown Scope.
- The KindHandler claims `_vance/contacts/<uuid>.yaml` **by path**;
  there is no body recognition (field names are too common).

### 2.3 Keys

UUID v4, lowercase, is the `name` (file stem). In vCard export
`UID:urn:uuid:<uuid>`. **Every path is built from a parsed UUID
(`ContactIds`), never from caller text** — the service writes as SYSTEM
(§4), otherwise a smuggled path fragment would be a write access
somewhere under `_vance/`.

### 2.4 Groups

`kind: group` with `members`: UUIDs of other cards or URIs (`mailto:…`) for
people without a card.

- **Visibility rule:** a member must be in a Scope that is **at least as wide**
  as that of the group (`user` < `project` < `tenant`). A Tenant group
  only holds Tenant contacts, a Project group holds Project and Tenant contacts.
  Otherwise, another reader would see a member they cannot resolve — or the name
  of a private contact. Write paths reject violations; import omits such members
  and reports it.
- Groups do not nest (cycles and expansion semantics without need).
- A deleted member remains as a UUID and is displayed as "not found" — not
  silently removed.
- `categories` remain separate: Category = label on the contact, Group =
  named set with a note.

### 2.5 Kind `contact` outside the Address Book

A `kind: contact` document anywhere in the Project carries **either** its
own card (`contact:`, same codec) **or** a reference:

```yaml
$meta:
  kind: contact
ref:
  uuid: 3f0c…e1
  scope: tenant     # optional; missing → read cascade
```

The reference is **late-bound** via the reader's cascade. A dead
reference is displayed as "contact no longer exists". Embedded
cards are not in the index — they are content of the document, not part
of the address book.

## 3. Scopes and Cascade

| Scope | Project | Read | Write |
|---|---|---|---|
| `user` | `_user_<login>` (`HomeBootstrapService.hubProjectName`) | the User | the User (Service Account: WRITER is sufficient) |
| `project` | Working Project | Project-READ | Project-WRITE |
| `tenant` | `_tenant` | any Tenant member | WRITE on `_tenant` (Tenant Admin) |

- **Reading** merges in the order **`project` → `user` → `tenant`**;
  the same UUID in a more specific Scope shadows the broader one. Identical
  UUIDs in two Scopes arise from copying — especially through the
  **Project Copy**, which includes `_vance/` and thus the Project contacts
  with their UUIDs (intended: the copy is a complete Project). A Scope
  without read permission is silently omitted from a merged query and
  rejected if explicitly specified.
- **Folding:** for those working in their own Hub, `project` *is* equal to
  `user`; in `_tenant`, it is `tenant`. The service then only knows the
  canonical name.
- **Writing** goes to exactly one Scope, **Default `user`** (without User:
  `project`). `update`/`delete`/`move`/image search for the UUID only in the
  specified Scope; if it is elsewhere, the call fails with "lives in `tenant`,
  specify `scope: tenant`" — no silent fallback.
- **Confined processes** (`ThinkEngine.confinedToOwnProject`, e.g., the
  Trillian head): only Scopes whose Project is exactly their own. A human's
  Hub and Tenant must not leak out via an external channel.
  `EddieContext.isConfined` distinguishes this from mere Project pinning
  of Worker subprocesses, which may still read Hub and Tenant.

## 4. Permissions and Write Path

`_vance/` is a Reserved-Prefix (R4): a normal WRITER cannot write there via
`doc_write`, REST, WebDAV, or script API. This is intentional — contacts
only change via the service.

Pattern "dedicated authoring of a `_vance/`-Namespace"
([permission-system](permission-system.md)): the service **itself** checks
(`PermissionService.enforce` with READ or WRITE on the Scope Project) and
then writes as `WriteActor.system(subject)` — the real Subject remains
for auditing. The target path is code-fixed, never caller-controlled. Exception:
`contact_export_vcf` writes to a path chosen **by the caller** and therefore
does so as a normal `WriteActor.user`.

Admins may edit the files directly (WebDAV, Cortex); for this, the codec reads
tolerantly and `kind_validate` reports errors. Reading via the
document tools remains possible; the Manual still tells the Agent:
contacts only via `contact_*`.

## 5. Index and Search

- `ContactIndex`: for each `(tenant, projectId)`, a snapshot of the parsed
  cards, lazy on first access. Unreadable card files end up in
  `broken` and are reported to the tool and UI — "empty" is never a
  silent lie.
- **Invalidation** via `RoutedDocumentChangedEvent` for paths under
  `_vance/contacts/` (WebDAV, Kits, archive restore, for `_tenant` also other
  Pods) **plus 60 s TTL** as a fallback for the one case the router does not
  reach: a Pod that neither wrote nor holds the Project, but served a
  read request. The cache is not a store — the truth is the document.
- `ContactSearch` (pure functions): every word of the query must hit somewhere;
  per field exactly > word prefix > substring; Name > Mail/Phone >
  Organization/Title > Category > Address/URL/Role > Note. Diacritics
  folded ("muller" finds "Müller"). Phone numbers compared via
  normalized digits without trunk prefix, suffix matching —
  `0170 7654321` finds `+49 170 7654321`. No embeddings, no
  number plan library.
- Filters: `email`, `phone`, `org`, `category` (exact), `kind`, `scope`.

## 6. Images

- File next to the card: `_vance/contacts/<uuid>.jpg` (opaque) or `.png`
  (with transparency — pixel-wise checked, because the decoder gives every PNG an
  alpha channel). **Never Base64 in YAML** — it would bloat every read access.
- **Always scaled down:** centered square, side length at most
  `vance.contacts.photo-size` (Default 512, 32…2048), never upscaled,
  EXIF rotation respected. Input up to 15 MB, JPEG/PNG/GIF/BMP (Scrimage from
  the Brain; WebP deliberately not — JNI).
- **Gravatar** as an explicit action (Tool `contact_photo_gravatar`,
  button in the view): SHA-256 of the trimmed, lowercase address,
  `d=404` — "no avatar" is a response, not a generated placeholder image.
  Never automatically on creation or import: every query tells Gravatar that
  someone knows this address. The only communication partner is the
  `GravatarClient` (`vance.contacts.gravatar-url`).
- **No image URL as tool parameter** (lesson from `links`): a model would
  otherwise invent a plausible address. Images come from a Project document, an
  upload, a vCard `PHOTO` with data, or from Gravatar.

## 7. vCard Import and Export

- Reads 2.1/3.0/4.0, writes 4.0, images embedded.
- Two legacy issues are folded on reading: `TYPE=PREF` (3.0) becomes `pref: 1`,
  the email type `INTERNET` is omitted.
- **Identity:** a `UID` that is a UUID becomes the card ID; any other
  `UID` (Google: `google-12345`) ends up in `extras.X-VANCE-SOURCE-UID` and is
  the reconciliation key on the next import of the same export — re-importing
  updates instead of duplicating.
- Groups are imported last (their members must exist beforehand).
- `PHOTO` as a pure URL is not fetched, only reported.
- Report: new / updated / skipped with reason / hints.

## 8. Tools

All with `scope` (`user|project|tenant`); read tools without `scope` = all three
merged, write tools without `scope` = `user`. Parameter names are the
YAML field names — a grammar for tools and files.

| Tool | Purpose |
|---|---|
| `contact_search` | Free text + filter; compact hits with `id`/`scope`; reports unreadable card files |
| `contact_get` | Full card, for groups resolved members, groups it belongs to |
| `contact_create` | New card; returns the UUID |
| `contact_update` | Patch: missing = unchanged, passed replaces, `""`/`null`/`[]` clears; lists entirely — also `addEmails`/`removeEmails`, `addPhones`/`removePhones` (notation irrelevant), `addCategories`/`removeCategories` |
| `contact_delete` | Card + image to recycle bin; names groups that still list it |
| `contact_move` | Change Scope, UUID and image remain; names groups that can no longer resolve it afterwards |
| `contact_group_members` | Add/remove members (checks §2.4) |
| `contact_photo_set` | Image from an image document of the Project, or `remove: true` |
| `contact_photo_gravatar` | Avatar via Gravatar (explicit, external contact) |
| `contact_import_vcf` | Import `.vcf` document of the Project |
| `contact_export_vcf` | Write vCard file (selection: `ids`, `group`, `category`, `scope`) |

`contact_search` and `contact_get` are directly visible, the rest `deferred`
with `searchHint`. Manual `_vance/manuals/contacts.md`, Arthur fragment
`_vance/prompts/arthur/contacts.md` (hook to the Manual, "never `doc_*` on
`_vance/contacts/`", "do not invent image URLs").

## 9. REST

`/brain/{tenant}/addon/contacts/…`, `projectId` optional (without: only `user` and
`tenant`). Authorization is in the service, not the controller — the three
Scopes are three Projects, and only the service knows where a call lands.

| Route | |
|---|---|
| `GET contacts?q&scope&kind&category` | `ContactListView`: hits, reader's Scopes with write permission, default Scope, unreadable files |
| `GET/PUT/DELETE contact/{id}` · `POST contact` | read / replace / delete / create |
| `POST contact/{id}/move` · `POST contact/{id}/members` | |
| `GET/PUT/DELETE contact/{id}/photo` · `POST contact/{id}/gravatar` | Image (multipart upload) |
| `POST import` · `GET export?ids&scope&category` | vCard (multipart upload / `text/vcard` download) |
| `GET document?projectId&path` | what a `kind: contact` document shows |

Errors: `404 contact-not-found`, `400 contact-invalid`, `502
gravatar-unavailable`, permissions via the global Permission Advice.

## 10. Web-UI

- **Contact View** as an Addon Area (`addon.html?addon=contacts`, "Contacts" tile
  on the start page) — **not** an `app: contacts` instance: the data
  is in a fixed location, every app instance would show the same thing. Toolbar
  with Project selection, search (debounced, server search), Scope segment,
  type filter, import/export, "New Contact"; left the list with avatar and Scope,
  right card or form. State in the URL (`project`, `contact`, `scope`).
- **Form** maintains the fields that people manually maintain; everything else
  (nicknames, messengers, relations, members, `extras`, other types) remains
  unchanged.
- **Kind Renderer** `ContactKind.vue` for `kind: contact` in Cortex and in
  Embeds: card with image, for address book cards "Open in Contacts".
- Images via `brainFetchBlob` → Object-URL, cached per version (an `<img>`
  cannot carry a bearer token).
- New icon meanings `mail`, `kind-contact`. Texts only in `en.ts`.

## 10a. Kind `contact-board` — Pinned Contacts for a Topic

A `kind: contact-board` document is a curated, ordered list of
contacts with a **heading** and **note** per entry — "who's who" for a
Project, a contract, an event. Groups do not provide this: they are
address book data without work notes.

```yaml
$meta:
  kind: contact-board
title: Meridian Contract
pins:
  - uuid: 3f0c…e1
    scope: tenant          # Scope found during pinning
    label: Purchasing Contact Person
    note: |
      Decides on framework agreements. Call **only in the morning**.
```

- **Name by content**, not by UI (like `calendar`, `canvas`):
  the document is a board, "Editor" would be the second tab.
- **Pins are references**, not copies: a card always shows the current
  address book status, resolved via the **reader's** cascade. The Scope
  in which the contact was located during pinning is stored — so the pin
  resolves identically for every reader (`user` = the respective reader's Hub).
- **Unresolvable** (deleted, or another's private contact): heading
  and note remain — they are content of the board —, the card shows "not
  available". No distinction between "deleted" and "not visible", otherwise
  the board would reveal the existence of a private contact.
- **Visibility:** whoever pins a contact narrower than the board's audience
  (board in Project → `project`, in `_tenant` → `tenant`, in Hub → `user`),
  receives a **warning**, not a prohibition — only the UUID is in the document.
- **Write path:** the path comes from the author, so normal user writes
  (`WriteActor.user`), authorized by the `DocumentService` like any document change.
  Every mutation (`pin`/`unpin`/`update`/`reorder`) responds with the entire
  board; a reorder that does not know a newly added pin appends it
  instead of deleting it.
- **Notes are Markdown**, collapsed in the UI (one line preview),
  expanded rendered (marked + DOMPurify), edited by click. Deliberately
  **no Workbook blocks**: a Tiptap editor per card conflicts with Drag &
  Drop (own drag handling) and would be difficult; Markdown is the storage format
  of the Workpage, a later block editor does not break the format.
- **Lenient reading:** pin without readable UUID and second pin of the same contact
  are discarded; `kind_validate` reports both with path.
- **UI** `ContactBoardKind.vue`, two tabs: *Pinned* (cards with
  handle to drag, heading inline editable, note expandable, "Details",
  "Unpin") and *Contacts* (the embedded address book view with
  "Pin to Board"). Live reload via `documents.changed` on the board path.
- **Tools** (deferred): `contact_board_get`, `contact_board_create`,
  `contact_board_pin`, `contact_board_unpin`, `contact_board_update` (heading,
  note, position; the note is entirely replaced). **REST**
  `/brain/{tenant}/addon/contacts/board` (`GET`, `POST|PATCH|DELETE pin`,
  `POST reorder`). **Template** "Contact Board" (`_vance/templates/contact-board.yaml`).

## 11. Later (deliberately not v1)

Milliways recipients from contacts/groups, calendar participants,
`@`-mention, contact as chat context (`activeApp.selection`), merge duplicates,
CardDAV/Google connector, nested groups, semantic search via `note`,
edit group members in the UI via picker (currently via Tool/REST).
