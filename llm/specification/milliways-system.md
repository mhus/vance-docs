# Vancetope — Milliways (Sharing System)

> Persona: **Milliways**, the Restaurant at the End of the Universe (*The Hitchhiker's Guide to the Galaxy*) — the place where you sit down at a table to watch something together.
>
> Milliways is the way one person shows something to another: **"look — with a reason"**. The "something" is a **Subject** composed of four optional parts — title, link, snippet, document. A dispatcher, a handler SPI, and for each handler, a form that the handler itself declares. It is not a notification system and not a permission system.
>
> In the code, it's called **`milliways`**, for the user, it's called **Share**. The same separation as with Zarniwoop and Centauri: the Persona names the dispatcher, not the UI.
>
> See also: [user-interaction](user-interaction.md) | [user-notification-channel](user-notification-channel.md) | [permission-system](permission-system.md) | [settings-system](settings-system.md) | [server-tools](server-tools.md) | [cortex](cortex.md)

---

## 1. Purpose & Delimitation

**Problem.** A user has something in front of them and wants to show it to another person — a colleague in the Tenant or someone external. Without Milliways, they copy a link into an external medium or the content into an external email: the **reason** is lost, and no trace remains in the system.

The "something" is not always a document: a **search result** is a URL plus a snippet that Vance does not own and does not need to own to show it.

**Solution.** A dispatcher (`MilliwaysService`) and an SPI (`ShareHandler`). The user selects "Share...", gets a list of possible ways in **this** Project, chooses one, fills out the form **of the handler**, and is done.

### 1.1 The Core: Showing with a Reason

The text is not decoration; it is the payload. "Look" without a reason is noise — a scientist writes to another "look, the results from the test are ready," not a bare path. Therefore, the free-text field is in every handler form and is **mandatory** for the `inbox` handler.

### 1.2 Push vs. Pull — The Boundary to the Notification System

The fundamental distinction, and not a matter of taste:

| | [Notifications](user-notification-channel.md) / Inbox Dispatcher | **Milliways** |
|---|---|---|
| Direction | **Push** — the system prompts the user | **Pull** — it's there; the recipient sees it when they look |
| Trigger | a Process, an Agent, a Scheduler | **a human**, explicitly, with a form |
| Urgency | `Criticality`, thresholds, Quiet-Hours | none — it's never urgent |
| Channel selection | the system decides based on endpoint availability | **the sender** decides, visibly |

Consequence: Milliways does **not** call any `NotificationChannel` or `NotificationDispatcher`. With `inbox`-sharing, an entry is created that waits — no beep, no terminal bell, no push to the phone.

There is exactly **one** mechanical overlap with the Notification subsystem: the SMTP sending core. `EmailNotificationChannel` is still a stub; the `smtp`-handler builds the first real sending path, and it does **not** do so from scratch, but via `de.mhus.vance.toolpack.mail.SmtpSender`. There is one mailer, not two.

### 1.3 One Subject, Many Projections

**The fundamental rule:** every handler receives **the same** Subject and decides what to do with it. Milliways does not know — and does not need to know — whether a path leads inward or outward.

How the two built-in handlers answer this question is an *observation*, not a principle:

- **`inbox`** turns it into a **pointer**: document reference, link, snippet — plus the reason. A referenced document's content is not copied into the message; the recipient opens the original, or not, if they are not allowed to read it.
- **`smtp`** turns it into an **email**: reason as body, snippet quoted, link on its own line, and a referenced document as an **attachment**.
- **`app`** turns it into an **entry** in one of the sender's starred apps — a link in a links list, an Inbox note in GTD, an Issue in the Backlog. It shares *inward* and still has a write side — which is why "inward/outward" is not an axis by which the facade can categorize. §8 draws the consequences.

The `app`-handler also shows how far the SPI extends: it doesn't know **which** apps accept it — each app declares that itself (§7a). Previously, a handler lived in the `vance-addon-brain-links` Addon without Milliways having a single line about it; that was proof for §2 and is now a capability instead of a handler.

### 1.4 What Milliways Is Not

- **Not a permission system.** Sharing does **not** change any permissions. If someone cannot read the target, they still cannot read it after it's shared. No grant is created, no ACL is extended, no Project is opened. If a recipient needs permanent access, that's a grant via the [Permission System](permission-system.md) — a different process, with a different permission (`ADMIN`).
- **Not a copy mechanism.** `inbox`-sharing does not create a second version of the document. Two copies with one truth are worse than no access.
- **Not a public link.** There is no signed URL for people without an account. The way out is **email**. A public link system would have its own questions — expiration, revocation, indexing — and is not a side effect of a menu item.
- **Not a social network.** No posting, no feed, no sharing on external platforms. Nothing in the code is called `social`.
- **Not an LLM surface.** Milliways is user-triggered; see §8.3.
- **No return channel.** No "seen," no comment on the shared entry. The recipient replies in chat or by email.
- **No multiple targets per operation.** One Subject, one handler, one send. A folder is not a document, and a Subject carries at most one link and at most one document.
- **No link retrieval.** Vance does not fetch the page behind the URL — not for a preview, not for a favicon, not for a title. That would be an egress with entirely different questions (for that, there are `SsrfGuard` and `LinkPreviewService`, if ever desired).
- **No materialization.** A shared link does not become a document. If you want that, use **Clip** in the [Search App](app-search.md): Clip makes ephemeral things permanent, Share only shows them. That is the boundary between the two.
- **No note sending.** `title` alone is not a Subject (§3.2).

---

## 2. Architecture

```
   Cortex "Actions → Share…"  ──REST──►  MilliwaysController
        (Web-UI)                                │
                                                ▼
                                     ┌───────────────────────┐
                                     │ MilliwaysService      │
                                     │ · Resolve handler     │
                                     │ · Availability        │
                                     │ · Request form        │
                                     │ · Defang subject      │
                                     │ · Load document       │
                                     │ · Authorize + audit   │
                                     └──────┬────────────────┘
        ┌────────────────┬─────────────────┼──────────────────┬──────────────┐
        ▼                ▼                 ▼                  ▼              ▼
InboxShareHandler  SmtpShareHandler  GmailShareHandler   AppShareHandler  (Addons)
        │                │                 │                  │
MaximegalonService ServerToolService  OAuthConfigRegistry  VanceApplication
(OUTPUT_DOCUMENT)  SettingsSecret…    OAuthTokenRefresher  Registry
        │           SmtpSender        GmailApiClient          │
        │                └───── MailShareSupport ─────┐       │
        │                       MailMessage           │       │
        ▼                ▼                            ▼       ▼
Recipient's Inbox  SMTP Relay             Sender's Gmail  Entry in an App
      [PULL]        [outward]                [outward]       [inward]
```

The facade does **three** things itself — defanging and resolving the Subject, Sharer authorization, auditing — and delegates everything else. As with `RunSource`, the rule is: **each handler additionally enforces its own authorization** (§8.2); the facade does not consolidate this.

**Code Location.** SPI, Service, Controller, and all handlers in `vance-brain/.../milliways/`; DTOs in `vance-api` (`de.mhus.vance.api.milliways`) with `@GenerateTypeScript`. An Addon can contribute another `ShareHandler`-Bean without Brain knowing about it — and without changes to the Web-UI (§5).

---

## 3. Contract

### 3.1 `ShareHandler` (SPI)

```java
public interface ShareHandler {
    String id();                                    // Transport path, not medium
    Map<String, String> label();                    // localized, Client resolves
    ShareAvailability availability(ShareScope s);    // can it be done here, now, by this user?
    List<FormFieldDto> form(ShareScope s);          // choices already populated
    ShareResult share(ShareRequest r);              // execute
}
```

Four methods, not one. Without `form()`, the Web-UI would have to hardcode an input mask for each handler, and every new handler would be a UI release — the same lesson as with `ode`-Capabilities retrieval in [Zarniwoop](zarniwoop-service.md): **the source declares what can be entered.**

**`id()` names the transport path**, not the medium and not the recipient class: `smtp` instead of `mail`, `inbox` instead of `user`. A second way to reach the same target group (provider API mailer, chat DM) has its own configuration, its own errors, and its own availability — it becomes a **second handler**, not an `if` in the first. So that the user sees the choice when it exists, the **label** includes the transport (`E-Mail (SMTP)`). Same convention as with Zarniwoop protocols, which are named after their wire format.

### 3.2 The Subject

```java
public record ShareSubject(
        @Nullable String title,        // Label; never sufficient alone
        @Nullable String link,         // absolute http/https/mailto-URL
        @Nullable String snippet,      // quoted external text
        @Nullable DocumentRef document) {}
```

Four attributes, all optional, **additive**: a search result is a link plus a snippet, a highlighted passage is a document plus a snippet, a regular document share is just the document.

**An invariant: at least one of `document` / `link` / `snippet`.** `title` is the **label** of the thing, not the thing itself — without this rule, `title` plus reason would be a valid share and Milliways a **note sender**, arrived at by degeneration rather than by decision. No real case is lost: a search result always has a link or a snippet.

`DocumentRef` (`vance-shared/.../document/`) is reused, not reinvented — it is the type that `DocumentRefResolver` already produces.

**`displayTitle()` in one place.** Cascade: `subject.title` → document title → filename → link host → generic word. It feeds modal titles, email default subjects, and Inbox item titles — three places that would otherwise invent their own fallbacks and each presuppose a document.

### 3.3 The Remaining Records

```java
// What the caller names — builds the inbound layer.
public record ShareTarget(SecurityContext ctx, String tenantId,
                          String projectId, ShareSubject subject) {}

// What the handler receives: Target, sanitized Subject, resolved Document.
public record ShareScope(SecurityContext ctx, String tenantId, String projectId,
                         ShareSubject subject, @Nullable DocumentDocument document) {}

public record ShareAvailability(boolean available, @Nullable String statusText) {}
public record ShareRequest(ShareScope scope, Map<String, Object> values) {}
public record ShareResult(String message, Map<String, Object> details) {}
```

`projectId` is on the Target, **not** on the Subject: even a pure link share happens *within* a Project, and Pack resolution and authorization depend on it. Project-scoped, without `sessionId`/`processId` — sharing is an act on a thing, not within a Session.

**Two records instead of one.** A handler should never have to reload a document or ask if the Sharer is allowed to read it: the handler-side form carries the resolved document and only exists after `Document READ` is complete. It also carries the **sanitized** Subject (§7.3) — handlers cannot forget to defang because they never see the raw form. Therefore, the document is **not** in the `ShareRequest`: it is needed during form construction, not just upon submission. `ShareResult` does not carry a handler ID; the service knows who it called.

### 3.4 No `representation` Field

A "share in what form" parameter (raw / markdown / pdf) would be obvious. It remains outside: the **handler** decides this (`inbox`: not at all, `smtp`: raw), and a field that no one reads is maintenance debt. If rendering comes, the parameter comes **with its reader**.

### 3.5 Error Classes

| Type | Meaning | HTTP | Audit-`outcome` |
|---|---|---|---|
| `ShareException` | Input is unusable, user can fix it — empty Subject, disallowed URL scheme, missing mandatory field | 422 | `denied` |
| `ShareNotFoundException` | Handler or document does not exist | 404 | `denied` (only for read permission errors) |
| `ShareUnavailableException` | Handler exists but is not usable here | 409 | — (metric only) |
| `ShareTransportException` | The other side is broken | 502 | `failed` |
| `PermissionDeniedException` | Sharer is not allowed to read the Project or document — also from within a handler (`app`: `Project WRITE` on the target app) | 403 | `denied` |

`ShareTransportException` is **not** a `ShareException`. "The relay rejected it" cannot be fixed by anyone in the form; this is precisely what the two distinctions 422/502 and `denied`/`failed` depend on.

**One exception, deliberate:** the **empty Subject** is not audited. The invariant "at least one of document / link / snippet" is in the `ShareSubject` constructor (§3.3) and thus fires during construction from the request body, i.e., before the facade runs — the client gets 422, but neither an audit entry nor a counter is created. This is the price for a `ShareSubject` that shows nothing not being able to exist in the first place: having the check as a type invariant is worth more than an audit entry for a request that never had a Subject. All other `ShareException` cases occur **within** the facade and are counted and logged.

`ShareUnavailableException` remains "metric only" **even if it comes from `handler.share(...)`** — for example, because the Pack disappeared in the window between availability check and sending. This is the same situation as the previous check, not a rejection.

---

### 3.6 External Content is Defanged Once

The facade sanitizes the Subject during `ShareScope` construction so that **no handler can forget it** — handlers never see the raw form:

| Part | Rule |
|---|---|
| `link` | Scheme allow-list `http` / `https` / `mailto` via `SafeLink` (`vance-shared/.../net/`). Relative URLs rejected. Violation → `ShareException` (422). |
| `snippet` | Whitespace collapsed (`UntrustedContent.collapseWhitespace` — the same helper through which Zarniwoop sends its hit lines), length capped at `vance.milliways.snippet.max-chars` (default 2000), cut at the last word with `…`. |
| `title` | same, capped at 300 characters — it ends up in an email `Subject` header and an Inbox title. |
| empty after trimming | becomes "not present," so `parts()` does not claim parts that contain nothing. |

**Why `SafeLink` and not `SsrfGuard`.** The SSRF guard answers "are *we* allowed to fetch this" and therefore rejects any host that resolves to loopback / link-local / site-local. Here, the question is different: **no one fetches the URL** — the recipient's browser does that, from wherever it sits. A link to an intranet page is a perfectly normal thing to show a colleague; rejecting it would be a false rejection, and the DNS lookup would be paid for nothing. **Equally strict on schemes, more lenient on hosts.**

The allow-list is intentionally identical to that of the client (`client/packages/shared/src/safeUrl.ts`): two lists that diverge are worse than a borderline scheme that neither would have needed. The server-side check is still necessary because the **email path never touches the client** — the URL goes from the server to the relay and becomes clickable in the recipient's email program, where no browser guard is running.

---

## 4. Availability is a Declaration

The dispatcher lists **all** handlers with their status — not just the available ones:

```json
[ { "id": "inbox", "label": {"en":"Inbox"}, "available": true },
  { "id": "smtp",  "label": {"en":"E-Mail (SMTP)"}, "available": false,
    "statusText": "No SMTP pack configured in this project" } ]
```

A missing menu item reads as "does not exist"; a grayed-out one with a reason reads as "here is the lever." The same rule as in the provider panel of Centauri and Zarniwoop.

`available: false` is **not** an error and is not logged. A `POST` to an unavailable handler, however, is rejected with 409 — the list is a snapshot; the target decides.

**Order: alphabetical by `id`.** Not available-first and not Bean discovery order: a menu that reorders itself as soon as a Pack is configured or an Addon changes its load position is an annoyance without value.

**A defective handler does not take the list with it.** If `availability(...)` throws, the handler is considered unavailable (WARN + `metricService.exception`); the other paths remain visible.

**Duplicate `id` breaks boot** — two Beans with the same identifier would make the REST path ambiguous and silently shadow one.

---

## 5. The Form Comes from the Handler

Milliways does **not** include its own form engine. `form()` returns `List<FormFieldDto>` — the same grammar used by [Wizards](wizards.md), [Setting-Forms](setting-forms.md), and [Document-Templates](document-templates.md), rendered by the same `FormFields.vue`.

**Choices come pre-populated.** A `select`/`multi_select` already carries its options — **not** via `choicesFrom`. This marker is tied to setting form resolution and knows two sources; a handler knows its own options, and for recipients, also which ones the Sharer is even allowed to reach (§8.2).

**Two requests, not one.** The handler list is cheap; a form costs (user list, Pack list). The form is therefore fetched **only upon selection**: merely opening the menu should not deliver a user list.

**The Subject does not belong in the form.** Otherwise, it would be asked per handler, possibly differently, and the contract would be violated. It comes from the **caller** and is in the modal in its own zone above (§10).

**Long selection lists.** From **8** options, a `multi_select` in `FormFields.vue` gets a filter field and a limited height. The threshold is in the renderer, not the schema: how many lines fit is a property of the display, and a form author cannot know how many options a dynamic list will carry at render time. The filter hides **lines**, never a **selection** — below it says "n selected" plus "Reset," otherwise a filtered-out selection would look like no selection. Applies to all `multi_select` fields, including outside Milliways.

---

## 6. Handler `inbox` — as a Pointer

**Availability.** `available` if there is at least one reachable recipient (see below). Otherwise `unavailable("Nobody else in this tenant to share with")`.

**Form.**

| Field | Type | |
|---|---|---|
| `recipients` | `multi_select` | reachable users, `choices` populated, `required` |
| `text` | `textarea` (`rows: 4`) | **`required`** — the reason, §1.1 |

**Effect.** For each recipient, a `MaximegalonDocument` via `MaximegalonService.create`. The **item type follows the payload**: `OUTPUT_DOCUMENT` with document, otherwise `OUTPUT_TEXT` — an `OUTPUT_DOCUMENT` without a document would be a lie in the discriminator.

| Field | Value |
|---|---|
| `type` | `OUTPUT_DOCUMENT` with document, otherwise `OUTPUT_TEXT` |
| `originatorUserId` / `assignedToUserId` | Sharer / Recipient |
| `title` | `<Sharer Display Name> shared: <displayTitle()>` |
| `body` | the free text (Markdown) |
| `payload` | `documentRef: {documentId, projectId, path, title, mimeType}` · `link: {url, title}` · `snippet` — each only if the Subject carries the part |
| `tags` | `["share"]` |
| `requiresAction` | `false` |
| `criticality` | `NORMAL` |

`requiresAction: false` is the implementation of "Pull": the entry demands nothing; it sits there and is handled via the normal Inbox lifecycle (dismiss / archive), not answered.

**The snippet gets its own payload key and is never folded into the body.** The body is the sender's sentence and renders as Markdown; a snippet is external text and must remain a quote. A search result with `[click here](evil)` would otherwise become a link that looks like a colleague wrote it.

**`payload.documentRef` is the existing form** — `inbox_post` writes exactly the same structure for its optional `documentRef` parameter. An Inbox renderer thus serves both sources. The pointer is **not** an authored Reference: it carries `projectId` and `path` as resolved fields, not a `vance://…`-URI. The grammar from [document-refs](document-refs.md) is intended for human-written references; here, the server writes for a UI renderer.

**Reachable recipients** are active non-service accounts of the Tenant excluding the Sharer themselves, filtered with `PermissionService.check(ctx, Resource.InboxItem(tenant, null, recipient), WRITE)` — **the same** check that gates delivery. This ensures the form cannot offer anyone whom sharing would later reject, and the list is not a user directory output but a permission projection.

**Partial rejection.** A recipient who has become unreachable in the meantime ends up in `details.rejected` and the result message; the others are delivered. The entire operation is rejected only if **no** recipient remains — when sharing with five people, one person should not prevent the other four.

**Recipient's missing access.** A recipient without READ on the Project sees the entry but cannot access it upon clicking. This is correct and visible: Milliways shares a pointer, not access.

---

## 7. Handler `smtp` — as an Email

**Availability.** There must be an active `smtp_sender` Pack in the Project view (`ServerToolService.listConfigs`, cascade-resolved Project → `_vance` → Classpath). None → `unavailable("No SMTP pack configured in this project")`.

**There are no `mail.smtp.*`-settings.** The SMTP configuration is the [Server Tool Pack](server-tools.md) `smtp_sender` (Host, Port, TLS, User, Password, `from`, plus the abuse barriers `allowedFrom` / `allowedRecipientDomains`). A second configuration location for the same mail server would be a second truth.

**Form.**

| Field | Type | |
|---|---|---|
| `pack` | `select` | **only if more than one visible Pack**; label includes the From address |
| `to` | `string` | recipients, comma-/semicolon-/whitespace-separated, `required` |
| `subject` | `string` | `required`, `defaultValue` = `displayTitle()` |
| `text` | `textarea` | the reason → email body |

**Effect.** `SmtpConfig.fromParameters(...)` on the Pack parameters, secrets via `SettingsSecretResolver.resolveForConnector(...)`, then `SmtpSender.send(...)`.

**The body is the projection of the Subject:** the sender's sentence, below it the snippet as a `>`-quote, below that the link as a bare URL on its own line. Plain text, **no HTML body** — this keeps external text inert, and the URL is made clickable by any email program automatically, without us providing markup.

**Attachment only if the Subject names a document.** A link-only share travels in the body; there is nothing to attach and nothing to lose.

**Connector path, not restrictive path.** An email relay password is a `PASSWORD`-setting, and a connector is allowed to read them — see [settings-system](settings-system.md). The restrictive `resolve(...)` path would silently insert an empty string and leave the relay unauthenticated; the error would not be noticed as long as the relay does not require authentication.

**The Pack's barriers apply automatically.** `allowedFrom` / `allowedRecipientDomains` are configured for the LLM Tool and also apply here because sending goes **through** `SmtpSender` and not around it. They are **rejections**, not failures: `SmtpSender` throws `IllegalArgumentException` for them, the handler turns this into a `ShareException` (422). Otherwise, the operator would have drawn an exfiltration boundary and the user would read "Server broken."

**Body.** The sender's text, verbatim. No server-appended origin line: the From address already states who is writing, and an added Project name would leave the Tenant without anyone having decided that.

**One Pack does not ask, two ask.** If there is exactly one visible Pack, the field is omitted. A Pack name that the form never offered is rejected.

### 7.1 Attachments

`MailMessage` carries `attachments` (`Attachment(filename, mimeType, bytes)`). With attachments, the message becomes a `multipart/mixed`, whose **first** part is the previous body — plain or the `alternative`-pair, **nested instead of flattened**, otherwise clients treat the plaintext as a second body.

- **Bytes** via `DocumentService.loadContent(doc)` — also carries binary documents via `storageId`.
- **Filename** is the basename of the document path, **MIME** is the stored type (fallback `text/markdown`).
- **No conversion.** A `kind: canvas` goes out as YAML. This is honest — the recipient gets what is there — and rendering is a separate feature, not a side effect of a menu item.
- **Size limit** `vance.milliways.smtp.max-attachment-bytes` (default 10 MiB), checked **twice**: first against `document.size` (saves reading), then against the actual bytes. A named rejection is better than a relay timeout after forty seconds.
- **`text/*`-attachments are not byte-identical.** MIME transmits text parts in canonical form: `\n` arrives as `\r\n`. Content-wise lossless; byte equality only applies to binary (base64).

The LLM Tool `<pack>__send_message` receives **no** attachments. An Agent that can attach arbitrary files is an exfiltration path and needs its own justification.

---

## 7a. Handler `app` — as an Entry in an App

A handler for **every** starred app that can accept something, not one per app type. "Send to ToDo" is not an app, but a **capability** shared by Kanban, GTD, and Issues — and the only place that knows an app's capability is the app itself. Seven almost identical handler Beans would be the alternative, and the menu would list "Add to Kanban," "Add to GTD," "Add to Issues" side-by-side, where the user expects *one* "send to an app."

Therefore, the handler is located **in Brain** (`AppShareHandler`), not in an Addon: `VanceApplication` is there, and authorization is thus in one place instead of in every Addon.

### 7a.1 The Capability on `VanceApplication`

Two `default` methods, exactly the pattern of `describe()`/`status()` — the 13 apps that don't participate cost them nothing:

```java
default boolean acceptsShare(ShareIntake intake) { return false; }
default ShareIntakeResult acceptShare(ShareIntakeContext ctx) { … }
```

**`ShareIntake` is intentionally not a `ShareSubject`.** The handler maps; the app remains unaware of Milliways. Otherwise, the Applications SPI would be tied to the Sharing subsystem, and an app would no longer be conceivable without Milliways.

`acceptsShare` receives the Intake so an app can reject what it cannot use ("I need a link"). The capability is **type-** and not instance-related: whether a specific folder is defective shows up during writing, not in the selection. An app that throws when responding is considered "does not accept" — a broken app should not hide the others.

`ShareIntakeContext.body()` forms the parts that don't fit into a title **once** for all apps: note, link, snippet as a quote. The note leads because it is the one sentence a human wrote; the snippet is quoted because it describes the page and not the sender.

### 7a.2 Uniform Payload — The Key Decision

A handler declares `form()` **once**, before a choice has been made. For a handler across N app types, not only the selection but the entire **field set** would depend on the target: Kanban a column, GTD a list, Issues a label, Links a group. Dependent field sets are not supported by the form grammar, and a two-stage `form(scope, target)` would turn the modal into a wizard.

**So the form asks for a flat selection and an optional note.**

| Field | Type | |
|---|---|---|
| `app` | `select` | **only if more than one** line; highlighted app first, label includes the Project if the app is elsewhere |
| `note` | `textarea` | **optional** |

**Flat means: App *and* its inputs are lines of the same select.** An app that offers multiple locations appears as `App` and below as `App › Location`; the value is `project|path[|handle]`, the handle travels as `ShareIntakeContext.target` into the app. This brings the choice back without needing a dependent field — the grammar limit above applies unchanged, circumvented by more *lines*, not by more *fields*.

Which locations an app offers, it declares via `targets()` with `TargetPurpose.INTAKE` — the same SPI that [Inter-Links](inter-links.md) use for linking, just the other direction: `NAVIGATE` asks "where can a link point," `INTAKE` asks "where can something be stored."

Three rules:

- **The app itself leads its block.** If nothing is selected and Return is pressed, the exact behavior from before the locations is obtained.
- **An unknown handle loses the location, not the link.** The list may have changed between dialog opening and submission; the app falls back to its default input. A handle that the *form* never offered, however, is rejected — that is a manually entered input, not an outdated list.
- **An app that throws during listing loses its locations, not its line** — the same rule as with `acceptsShare`: a defective app must not hide the others.

The list remains short because `INTAKE` is inherently short (a backlog, an inbox, a handful of groups) and because the app decides how many it offers. If it became long, the answer would be a dependent field in the form grammar — not silent truncation here.

Each app places the item in its natural **inbox**:

| App | Inbox | Accepts |
|---|---|---|
| `links` | the chosen group, otherwise the end of the leading ("ungrouped") section — the app renders them **first** | only with `link` |
| `gtd` | `inbox/` via `GtdService.capture` — literally "the fast unprocessed path" | everything |
| `issues` | new Issue in the Backlog, without label/assignee/priority | everything |

**A Share is a handover, not an edit.** Refinement happens in the app, where one also sorts — the Links app has drag & drop over groups, GTD has processing the Inbox, Issues has labels. A shared link thus even lands visibly at the top instead of in a group that one first expands.

**The price, partially retracted:** group and position had initially both disappeared from the Links share dialog. The **group is back** — as a line in the flat list, not as a second field. The **position is not**: that is a sorting detail that belongs in the app, where one already orders by drag & drop.

Of the three accepting apps, only `links` therefore provides locations. `gtd` (`inbox/`) and `issues` (Backlog) have exactly **one** input, and that is identical to "the app itself" — offering a line that does the same as the one above would be noise.

**The note is optional**, unlike the reason for the `inbox`-handler: there, a human reads the sentence; here, it is a remark on an entry without recipients.

### 7a.3 Availability, Result, Order

**Candidate** is a starred entry with `type != null` (which *is* by contract the `app:` of an Application Manifest), whose app is resolvable via `VanceApplicationRegistry.find(type)` and answers `acceptsShare(intake)` with `true`. A starred entry whose Addon is not deployed thus silently drops out.

| | |
|---|---|
| no candidate, but starred apps | `unavailable("None of your starred apps takes this")` |
| no starred app at all | `unavailable("No app in your starred list")` |

Two reasons, kept separate: "nothing starred" is different to fix than "nothing starred that takes *this*."

Regarding `links`: a document is **not** entered as a `vance:`-link — `LinkUrls.normalise` and the Preview proxy are built on http, such an entry would be a card without preview and without title snapshot. If you want to link a document, use the [Binder](app-binder.md) — the same kind of boundary as between Clip and Share. Similarly, `teaser` and `image` remain empty there, and the snippet is **not** adopted: an empty `teaser` means "what the page says today," live from the proxy; saving it would be the second copy that becomes outdated in a place no one refreshes ([app-links](app-links.md) §4).

**"Already exists" is success.** `ShareIntakeResult.created == false` means: nothing is broken, it's just already there — the message says "Already in *X*". A `ShareException` would be a lie about the state, "Added" a lie about the list. (`links` can do this because the URL is the entry's identity; `gtd` and `issues` always create new ones.)

**Highlighted first** is a decision *of this handler*: `StarredService` provides file order and explicitly does not sort `highlight`, so that a visual emphasis never silently chooses a target. A list in front of a human is the other case, and sorting therefore happens in `form()`.

### 7a.4 What is Not Yet Included

**Kanban** writes its card documents in the Tool itself (`KanbanCardCreateTool` → `DocumentService`); there is no service layer that could call `acceptShare`. Including Kanban means first elevating this logic into a `KanbanService` — a legitimate refactor that is not smuggled in here. The capability with three apps is more than one app from day one, and Kanban will be added with two methods as soon as the service exists.

**Journal** is open, and there it is a product question: a Journal is chronologically ordered prose; a shared link can be an entry. The app should decide that itself — that is the point of the capability SPI.

---

## 7b. Handler `gmail` — as an Email from Your Own Account

The same projection as `smtp`, different transport: sent via the **Gmail API** with the **sharing user's** OAuth token. The email thus comes from them personally and lands in their "Sent" folder — with the SMTP handler, it comes from the Project's relay address.

**Why a second handler and not a mode.** `id()` names the transport (§3.1). Everything that defines a handler is different here: the configuration (a Tenant OAuth app instead of a relay Pack), the availability question (does *this user* have a connection), the errors (revoked consent, missing scope), and the sender identity. An `if` in the SMTP handler would have had to branch on each of these points.

**The projection is shared, not the transport.** `MailShareSupport` (brain, `milliways/`) holds what both do the same — the three form fields, the body (`bodyOf`), the attachment (`attachmentOf`), the parsing of the recipient line, and the domain reduction for the audit. Two copies of this would be two different emails, depending on which path the sender chooses. The assembly of the message itself is in `MailMessage` (`vance-toolpack/mail/`): SMTP hands it to a relay, Gmail sends exactly the same bytes as a request body.

**No second configuration location.** The account is the existing OAuth connection: the Tenant admin registers the Google app under "OAuth Providers," the user connects once under "Connected Accounts," `OAuthTokenRefresher` keeps the token fresh. The handler itself does not read or write any token. The Provider ID is configurable (`vance.milliways.gmail.provider-id`, default `google`), because a Tenant may name its Provider config differently.

**Three separate reasons for "unavailable"** — each with the sentence that states *who* needs to do what:

| State | Message is directed at |
|---|---|
| Tenant has no Google Provider config | the Admin ("OAuth Providers") |
| User has never connected their account | the User ("Connected Accounts") |
| connected, but without mail scope | the User ("reconnect") |

The **scope check is intentional.** Google issues exactly the scopes that have been consented to; a Google connection created for Drive or Calendar is not allowed to send mail. Without the check, the handler would appear ready, lead the sender through the entire form, and then fail with Google's 403. It is checked against a **list** (`gmail.send`, `gmail.compose`, `gmail.modify`, `https://mail.google.com/`), not against a prefix — `gmail.readonly` shares the prefix and allows nothing. An **unknown** scope list is considered allowed: the setting is only written if the Provider delivers a `scope`-claim, and reporting an older working connection as broken is the more expensive error. The included Google Kit covers this case via its `mail`-option (`gmail.modify`).

**Form.** `to` / `subject` / `text` — the same three as for SMTP, in the same order. **No sender question**: it's your own account; there's nothing to choose. (The SMTP handler asks for the relay because the answer there changes who the email appears to be from.)

**No From header.** Google sets this itself to the account's address. One invented by us is either redundant or rejected as an unregistered Send-as alias.

**Wire.** `GmailApiClient` (brain, `milliways/`) is the only place that talks to the Gmail API — the `*Client`-convention for outbound REST to external systems. The **Media Upload form** of `users.messages.send` is used: the request body **is** the RFC-5322 message, `Content-Type: message/rfc822`. The alternative — a JSON wrapper with the base64url-encoded message in the `raw`-field — caps at 5 MB and bloats every attachment by a third, for nothing. `users/me` is fixed: there is deliberately no way from here to address an external mailbox.

**The error classification is the point of the Exception.** `GmailException` carries `status` and `refusal`, and the handler translates along these two questions, not along a message text:

| Response | becomes | because |
|---|---|---|
| 401 / 403 | `ShareUnavailableException` (409) | Token gone or scope missing — sender reconnects, then it works |
| remaining 4xx | `ShareException` (422) | the request was wrong, sender can fix it |
| 5xx / IO | `ShareTransportException` (502) | we tried, the other side is broken |

An `OAuthExpiredException` between availability check and sending — revoked in Google's UI, or a rejected refresh — is also `unavailable`, not `failed`: nothing broke.

**Size limit** `vance.milliways.gmail.max-attachment-bytes`, default 25 MiB (Google's documented attachment limit). It only buys a named rejection *before* the upload — the API rejects above that anyway —, and for a 25 MB document, it's worth the button.

**Audit.** `provider`, `recipientDomains`, `recipientCount`, optionally `attachment`/`attachmentBytes` and the Gmail `id` as `messageId`. Domains, not addresses — the same rule as for SMTP (§8.4).

---

## 8. Authorization, Audit, Metrics

### 8.1 The Sharer

**The Project is not a free selector.** Before **every** handler call — even before listing — `PermissionService.enforce(ctx, Resource.Project(tenant, project), READ)` is performed. `projectId` comes from the request body and decides which Packs resolve, whose relay sends, and to which Project the audit attributes the operation; without this check, a user without any rights on `finance` could list its `smtp_sender`-Packs including **From addresses** and subsequently send via their credentials. For the document-carrying case, the check costs nothing — a document-`READ` already inherits from the Project.

Beyond that, the facade only checks **what the Subject claims**. If it names a document, then additionally `PermissionService.enforce(ctx, Resource.Document(tenant, project, path), READ)`. You share what you are allowed to read; and whoever is not allowed to read it does not need to know which paths lead out of a document.

**A Subject without a document has nothing else against which to check** — link and snippet come from the sender. This is not a loophole that the facade should cover with an invented Resource: it does not know where a path leads (§1.3), and consequently cannot categorize by it. The brake for the outward path sits in the handler that takes it.

**The consequence, explicitly stated:** with a link and snippet, any user **of a Project** can send arbitrary text outward via **this** Project's relay. Before the Subject, this was impossible because a readable document was always attached. This is **decided**, not overlooked — if something is shared, it is shared; the Pack barriers are the brake, and the price is made visible in the audit (§8.4), not by a prohibition. What is **not** covered by this is the choice of an external Project: the Project-`READ` above prevents that.

For `smtp`, it remains `READ`: anyone who can read a document can copy its content out anyway — a `WRITE`-demand would be theater. The effective outbound control is the recipient domain barrier of the Pack (§7).

### 8.2 The Handlers

- **`inbox`:** Recipient selection **and** delivery against `Resource.InboxItem(tenant, null, recipient)` + `WRITE` (Rule R5 / `InboxAuthz`, the same one `inbox_post` uses).
- **`smtp`:** no additional permission beyond §8.1; the barrier is the Pack configuration.
- **`app`:** `Resource.Project` + `WRITE` on the Project **of the target app** — not on that of the Share. The Starred list is per-user across Projects, so the app can be elsewhere. The app value from the form is not authoritative: it is checked against the current candidate list, otherwise the form would be a way to name any Project. The app itself does not perform any further checks — `acceptShare` is only called with granted permission, and that is stated in the SPI.

### 8.3 No Agent Access

There is **no** `share_document`-Tool. Milliways is triggered by a human via REST, with a form in front of it. The reason is the same as for the Centauri return channel: what leaves the house does not get a silent path. If an Agent is to share later, then as its own, `deferred` Tool family with its own gate — not by a handler being callable by a Tool incidentally.

### 8.4 Audit

Every executed or rejected operation goes via `AuditService`: `action=milliways.share`, `actor` = Sharer, `target` = `<projectId>/<path>` (without document: only `<projectId>`), `outcome` ∈ `success` / `denied` / `failed`, `details` with `handler`, **`subject`** (which parts: `document`/`link`/`snippet`), **`linkHost`** if a link was included, plus handler-specific details.

`subject` and `linkHost` are the counterpart to §8.1: without them, a document-less share leaves no trace of what left the house — `target` carries a path only if one exists. The **host**, not the full URL, for the same reason that the mail handler logs recipient domains and not addresses.

The **sanitized** Subject (§3.6) is logged, not the raw form: a snippet of pure whitespace is "not present" after trimming, and an audit entry claiming `snippet` when no handler ever saw one answers the question "what left the house" incorrectly. Only the error path of the resolution itself falls back to the raw form — there, sanitization is precisely what failed.

**For mail, domains are logged, not full addresses.** The audit log answers "did something go out and roughly where" — not "with whom does this employee correspond."

### 8.5 Metrics

`vance.milliways.shares` with tags `handler` and `outcome` ∈ `success` / `denied` / `failed` / `unavailable`. No Tenant-/Project-/User-tags. `unavailable` is **counted, but not audited**: nothing left the house and no one was rejected for security reasons — but an increase means that clients are acting on an outdated handler list.

---

## 9. REST

Under `/brain/{tenant}/share` — user-side, **not** `/admin`.

| | |
|---|---|
| `POST /handlers` | Body `{ projectId, subject }` → all handlers with `available` + `statusText` |
| `POST /handlers/{id}/form` | Body `{ projectId, subject }` → `List<FormFieldDto>`, `choices` populated |
| `POST /handlers/{id}` | Body `{ projectId, subject, values }` → `ShareResultDto` |

**All three are `POST`, even the two reads.** The Subject carries link and snippet, which do not fit into a query string; two paths for the same thing would be worse than an unfashionable verb.

Status codes according to §3.5.

---

## 10. User Interface

**Two zones in the modal.** Above, the **Subject** — `displayTitle()` as an editable title field, below it the link as `href` (only if `safeUrl` would also render it), the snippet as a blockquote, the document path as a line. Below that, the **Handler Form**. Only the title is editable: a search engine's title is rarely what the sender wants to say, while link and snippet are quotes.

**Cortex.** Menu **Actions → "Share…"** in the menu bar (`EditorApp.vue`, next to File/View/Chat), disabled without an open tab. Not in the document toolbar: that is full with Reload, View/Edit, Download, Properties, and Notes, and Share is a document **action** like Save, not a view switch. Even less so in the global user menu — that belongs to the account, not the document.

Flow: Click → Modal with the handler list (available ones clickable, unavailable ones grayed out with `statusText` as subtitle and tooltip) → Selection loads the form → `FormFields.vue` renders → Submit → `ShareResult.message` as `VAlert`.

Every opening loads the handlers **anew** — availability can change between two clicks, and a cache here saves a cheap call and risks incorrect information. A 409 when fetching the form leads **back to the list**, not to an error message on a form that cannot be submitted.

**From within an App.** `EditorApp` provides the open function as `provide('vance:share', fn)` — the same string-key bridge as `vance:embed-component`. A federated Addon injects it and calls it with a Subject, without importing `vance-face`; if the host is missing, there is no button and no error.

For this, there is **one** component instead of a button per app: **`VShareButton`** in `@vance/components` takes a Subject and calls the injected `vance:share`. It renders **nothing** if the host does not share, and carries `click.stop` because the cards in all three apps are toggles themselves — sharing an entry is not a request to collapse it. The label is a prop because the Primitives package has no i18n.

It is attached to the entries of three apps, each providing the best available description as a snippet and **not reloading anything** for it:

| App | Subject |
|---|---|
| [Search](app-search.md) | Title + URL of the hit, `snippet` otherwise `body` |
| [Feeds](centauri-service.md) | Title + URL of the entry, `summary` otherwise `body` |
| [Links](app-links.md) | Title (otherwise Host) + URL, `teaser` otherwise `note` |

This closes the loop: a Feed entry can move via the `app`-handler into a Links list or the GTD Inbox, a Link entry via `inbox` to a colleague.

**Inbox.** If an item carries a `payload.documentRef`, the detail view renders a card with title, path, and "Open in Cortex" (`/cortex?project=…&doc=<id>` — the documented Cortex URL contract, no path resolution). It is read **by form, not by item type**: an `OUTPUT_DOCUMENT`-share and an `APPROVAL` that incidentally references a document deserve the same link. Without `documentId`, **no** link is rendered, otherwise clicking lands in an empty Cortex.

A `payload.link` renders as its own card, also form-driven and also only if `safeUrl` allows it; a `payload.snippet` as a blockquote in plaintext, **never** through `MarkdownView`.

---

## 11. Status & Roadmap

**Status:** productive. Four handlers — `inbox`, `smtp`, `gmail`, `app` —, the Subject with four parts, REST and Web-UI wired. The `app`-handler serves three apps via the `VanceApplication`-capability (`links`, `gtd`, `issues`).

`gmail` (§7b) is built and unit-tested, but **not browser-verified** and **not run against a real Google account** — this requires a registered OAuth app with `gmail.send`/`gmail.modify` and a connected user. The three unavailability paths, error classification, and wire form are covered against mocks; what remains open is precisely what only a real send shows (does Google accept our MIME assembly, is the Media Upload form correct, does the email land in "Sent").

Browser-verified: sharing via `inbox` (form, success message, Inbox entry for recipient, deep-link back to document), the 422 rejection path, the **grayed-out** `smtp`-handler including 409 on direct `POST`, the filter display for long selection lists, and the `app`-handler via the share button of a Links entry: selection across three candidates (Links / GTD / Issues), **Kanban is missing from the list despite being starred** — it does not declare the capability —, GTD target writes `inbox/rust-programming-language.md` with note before the link, Issues target writes `items/1-…md` with quoted snippet, a second time to the same Links app replies "Already in…" with `created: false`, and a manually crafted `POST` to the starred Kanban app is rejected with 422. **Not** browser-verified: a real email send (requires a reachable relay).

An observation from runtime that does **not** concern the handler: the Links entry outputs `teaser ?? note` from the *Manifest* as a snippet, not the live-resolved teaser that appears on the card. So, whoever shares a card with a visible page description only sends title and link. Consistent with "`links_list` only returns saved items" ([app-links](app-links.md)), but surprising on screen — open product question, not a bug.

**Foreseeable, not committed:**

- Rendering representations (`representation`-parameter **with** reader: PDF via the existing TeX-Compose path, HTML email body)
- `EmailNotificationChannel` consumes the sending path built in §7
- Further handlers in Addons (Matrix, Chat DM, other provider API mailers like Microsoft Graph) — the SPI supports this without changes, and also without changes to the Web-UI; `gmail` is the precedent for what an OAuth-backed transport looks like
- A `share_document`-Tool with its own gate, if Agents are to share

**Open:** the result and rejection messages come in English from the server (convention for server-side user-facing strings) and thus appear in a German UI. An alternative would be to build the message in the client from `details` and use `message` only as a fallback for unknown handlers — this makes `details` a soft contract. Not decided.

---

## References

- SPI, Dispatcher, Handler: `repos/vance/server/vance-brain/src/main/java/de/mhus/vance/brain/milliways/`
- DTOs: `repos/vance/server/vance-api/src/main/java/de/mhus/vance.api.milliways/`
- Message assembly (both mail transports): `repos/vance/server/vance-toolpack/src/main/java/de/mhus/vance.toolpack.mail/MailMessage.java`
- SMTP sending core: `repos/vance/server/vance-toolpack/src/main/java/de/mhus/vance.toolpack.mail/SmtpSender.java`
- Web-UI: `client/packages/vance-face/src/components/ShareModal.vue`, `…/cortex/EditorApp.vue`, `…/inbox/InboxApp.vue`
- REST Client: `client/packages/shared/src/rest/share.ts`
- Tests: `…/vance-brain/src/test/java/de/mhus/vance.brain.milliways/`, `…/vance-toolpack/src/test/java/de/mhus/vance.toolpack.mail/SmtpSenderAttachmentTest.java`
- Implementation documentation: `readme/milliways.md`
- Planning history (incl. discarded variants and browser protocols): `planning/milliways-sharing.md`, `planning/milliways-gmail-handler.md`
