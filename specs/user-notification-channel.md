---
title: "User Notification Side-Channel"
parent: Specs
permalink: /specs/user-notification-channel
---

<!-- AUTO-GENERATED from specification/public/en/user-notification-channel.md — do not edit here. -->

---
# User Notification Side-Channel

> Short, attention-grabbing user pings — "BEEP, finished XXX". Separate
> from the progress side-channel (live status, no audio) and from the
> inbox (persistent items with answer lifecycle). Ephemeral, side-channel
> only, no replay.

## 1. Purpose

Engines, server-tools, and script-runs need a mechanism to actively
ping the user — terminal bell, browser notification, iOS local
notification — without creating an Inbox item. Typical triggers:

- A long-running Worker-Process reports "finished".
- A Hactar script processes a batch and has completed.
- A Sub-Engine has entered `WAITING` and requires User-Input
  (Inbox-Item is created separately; the Notification *additionally*
  informs via the sound channel).
- A Quota-Limit has been exceeded or a script has crashed
  (`severity=ERROR`).

What it is **not**:

- **Not an Inbox-Replacement.** If the user needs to answer or
  archive something, it belongs in the Inbox (`specification/user-interaction.md`).
- **Not a Progress-Replacement.** Token-Counts, Tool-Boundaries, Plan-
  Updates continue to flow as `process-progress` (silent, non-
  intrusive).
- **Not an Audit-Log.** If the user misses the frame (offline, sleeping,
  different tab), they won't see it. For persistence: Inbox.

## 2. Delimitation

| Channel | Purpose | Persist | Audio | Response? |
|---|---|---|---|---|
| `process-progress` | Live Status (Metrics/Plan/Status) | ephemeral | no | no |
| `notify` (this Doc) | Attention Ping | ephemeral | **yes** | no |
| `inbox-item-added` | Persistent Inbox | persistent | no | optional |

## 3. WebSocket Message

`MessageType.NOTIFY = "notify"`. Server → Client, push-only.

Payload: [`NotificationDto`](../vance/vance-api/src/main/java/de/mhus/vance/api/notification/NotificationDto.java)

```
NotificationDto {
  text                 String                   // ≤120 characters recommended
  severity             NotificationSeverity     // INFO | WARN | ERROR
  emittedAt            Instant?                 // Server timestamp
  sourceProcessId      String?                  // for Process-Origin
  sourceProcessName    String?
  sourceProcessTitle   String?
  sessionId            String?                  // for Deep-Link
}

enum NotificationSeverity { INFO, WARN, ERROR }
```

Default-Severity is `INFO`. Server-side, `null` is upgraded to `INFO`
in `NotificationService.publish`.

## 4. Routing

**v1: session-bound.** `NotificationService.publish(process, text,
severity)` calls `ClientEventPublisher.publish(sessionId, …)` and the
frame goes to all connections bound to that Session. If the user has
no active client for the Session, the Notification goes nowhere — no
persist, no replay, no email fallback.

User-bound Multi-Session-Fanout (user has two tabs open in different
Sessions) is **v2**. v1 expects the user to be on the Owner-Session
when the Process finishes — otherwise, they have the Inbox.

## 5. Severity → Client-Rendering

The server only specifies the Severity; the client maps it to its platform.
Reference:

| Severity | Foot (Terminal) | Web | iOS (Capacitor) |
|---|---|---|---|
| `INFO` | Bell + cyan Toast | 600 Hz Beep + neutral Toast | `.passive` / default sound |
| `WARN` | Bell + yellow Toast | 900 Hz Beep + warning Toast | default + accented sound |
| `ERROR` | Bell + red Toast | 1200 Hz Beep + Error-Toast + `requireInteraction` Browser-Notification | `.timeSensitive` / critical sound (if entitled) |

All three Severities trigger the Terminal-Bell (` `) or a
WebAudio-Beep or an iOS-Sound — Severity only controls the prominence
(pitch, banner color, OS-Interruption-Level), not whether a sound occurs.

## 6. Emission Paths (Server)

| Path | API | Who |
|---|---|---|
| Server-Tool | `vance_notify(text, severity?)` | LLM in every Engine |
| Script | `vance.process.notify(text, severity?)` | Hactar scripts via the ExecutingPhase-Bridge |
| Java-direct | `NotificationService.publish(process, text, severity)` | Engines, Tools, internal Workers |

The Tool and Script API both internally rely on
`NotificationService.publish(...)`. Filters (like `ProgressLevel`)
are intentionally absent — a Notification is by definition explicit
and the user should see it.

Tool-Description clarifies: only at notable boundaries (finished, Wait
ended, escalation), not for chat status — that is Progress.

## 7. Client Implementation

### 7.1 Foot

`ConnectionService` registers a handler for `notify`. The renderer
writes ` ` (BEL — the OS-Terminal flashes / beeps) and outputs a
single colored line via JLine:

```
[NOTIFY · INFO]  Worker-1 finished: 47 Tasks completed
```

Severity → ANSI-color. No persist in the scrollback (the Toast-line
remains, but that's View-Layer, not History).

### 7.2 Web (vance-face)

Global WS-Subscriber in the Boot-path (`bootWeb.ts`), not in a
separate HTML-Entry — Notifications should also arrive in `/documents`,
`/inbox`, `/cortex`, etc.

**Hybrid-Render-Policy** depending on `document.visibilityState`:

| State | Render Path |
|---|---|
| Tab visible | In-App-Toast (top right, FIFO-Stack, 4.5s Auto-Dismiss). Browsers suppress OS-Notifications in the focused tab anyway, and the user is looking. |
| Tab hidden + Permission `granted` | OS-Notification via Browser Notification API (Notification Center / System-Banner). Click → `/chat?sessionId=…`. |
| Tab hidden + Permission missing/denied | Toast as fallback — not lost, becomes visible once the user refocuses the tab. |

**WebAudio-Beep** always plays (if `AudioContext` allows) — sound is
platform-independent and helpful. Permission is requested **lazily**
on the first frame (never up-front); in a hidden tab, the browser
typically queues the prompt until the next focus, which is OK.

The In-App-Toast is therefore no longer a parallel second channel, but
a fallback + active-tab visibility. A pure Toast implementation without
native Notification would leave the user silent in the background — a
pure native one without Toast would be suppressed in the active tab
and users without permission would lose out.

### 7.3 Facelift (Capacitor / iOS)

Facelift is a thin Capacitor-wrapper around the deployed Vue-Web-UI:
a separate WKWebView per account, which executes the website. The
WS-connection lives **within the WebView** — therefore, the website
handles its own Notifications (WebAudio-Beep + In-App-Toast from §7.2)
without an additional Capacitor layer.

Native Background-Banners (`@capacitor/local-notifications` or similar)
are intentionally **not** included in v1: If the app is in the background,
the WKWebView is suspended, the WS is dead, and the Notification goes
nowhere according to §4 anyway. True Background-Push would require Web Push
(Service-Worker) + APNs on the server-side — this does not fit the
"ephemeral, session-bound, no persist" model and is deferred to v2.
For persistent pings → Inbox + Email/Push-Channel in the
Inbox-Notification-Dispatcher.

### 7.4 Mobile (vance-fingers)

v1 Stub — no audio, no system banner. Tracking only for later
Expo-Notifications integration: an empty subscriber hook that currently
does nothing on a `notify`-frame. v2 uses
`expo-notifications`.

## 8. v1-Scope

**Included:**

- `MessageType.NOTIFY` + `NotificationDto` + `NotificationSeverity` in
  `vance-api` (incl. `@GenerateTypeScript`).
- `NotificationService` in `vance-brain/notification/` (analogous to
  `ProgressEmitter`).
- Server-Tool `vance_notify` + Tool-Manual.
- Script-API `vance.process.notify(...)` via `VanceScriptApi.ScriptProcessApi`
  + Bridge in Hactar `ExecutingPhase`.
- Foot-Client: Handler in `ConnectionService` + JLine-Renderer.
- Web-Client: Boot-Subscriber + Pinia-Store + WebAudio-Beep +
  Browser-Notification.
- Facelift inherits the WebView-internal Notifications of the website — no
  separate Capacitor-Wiring v1.
- Spec + CLAUDE.md-Reference.

**Excluded:**

- User-bound Multi-Session-Fanout (v2; v1 is session-bound).
- Persistence / Late-Join-Replay (by definition ephemeral — use Inbox).
- Per-User Notify-Settings / Quiet-Hours (this is an Inbox matter; a
  Notification is always transient and respects nothing).
- Mobile (`vance-fingers`) — v2.
- Native iOS-Background-Banner (Web Push / APNs) — v2; v1-Facelift
  only renders the WebView-internal Notifications.
- Email-Channel — explicitly not. To receive email, post an Inbox-Item.

## 9. Examples

### Script reports Batch-Done

```javascript
// hactar-script
const rows = vance.documents.list({ folder: "input" });
for (const r of rows) { /* process */ }
vance.process.notify(`Batch finished: ${rows.length} documents processed`);
```

→ Foot: Bell + `[NOTIFY · INFO]  arthur · worker-1: Batch finished: …`
→ Web: 600 Hz Beep + Toast bottom right.

### Engine reports critical error

```java
notificationService.publish(process,
    "LLM-Provider returned 401 — check credentials",
    NotificationSeverity.ERROR);
```

→ iOS: System-Banner with sound (`timeSensitive`).
→ Web: 1200 Hz Beep + red Toast + Browser-Notification that does not
auto-dismiss.

## 10. Implementation Order

1. `MessageType.NOTIFY` + `NotificationDto` + `NotificationSeverity` in
   `vance-api/notification/` (with `@GenerateTypeScript("notification")`).
2. `NotificationService` in `vance-brain/notification/` — single push-
   point, builds Source-Block from `ThinkProcessDocument`, defaults
   Severity to `INFO`.
3. Server-Tool `vance_notify` + Tool-Manual.
4. `VanceScriptApi.ScriptProcessApi.notify(...)` + `ExecutingPhase`-
   Bridge (BiConsumer like for `progress`).
5. Foot-Client: Handler in `ConnectionService` + JLine-Renderer.
6. Web-Client: Boot-Subscriber + Pinia-Store + WebAudio-Beep +
   Browser-Notification.
7. Facelift: no separate Wiring v1 — WebView-internal Toast/Beep from
   §7.2 is sufficient.
8. Unit-Test `NotificationServiceTest`.
