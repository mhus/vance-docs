---
title: App Privacy
nav_order: 100
permalink: /privacy-apps
---

# Privacy Policy for the Vancetope Apps
{: .no_toc }

Covers the Vancetope app for iOS and the Vancetope Capture browser
extension — including the macOS app that hosts the Safari version of
the extension. The documentation website has its own policy:
[Datenschutz](/datenschutz).
{: .fs-5 .fw-300 }

Last updated: 3 September 2026
{: .fs-3 .fw-300 }

## Contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## 1. The short version

Vancetope is a client for a server that **you or your organisation run**.
There is no service of ours behind it. The apps hold no account with us,
send nothing to us, and have no backend we operate that could receive
your content.

- **No tracking.** No analytics, no crash reporting, no advertising
  identifiers, no third-party SDKs, no cross-app or cross-site
  measurement.
- **No data collection by us.** We receive nothing. The apps transmit
  what you put into them to exactly one place: the server address you
  entered yourself.
- **Credentials stay on the device.** Your app PIN is never stored, only
  a hash of it. Access tokens and the list of servers you configured are
  stored locally and are sent to nothing but your own server.

Two things are worth reading rather than skipping, because they are the
places where something does leave for a destination that is not your
server:

- Content you look at can cause requests to whoever hosts it — a link
  card fetches an icon, a map loads tiles, a video embeds a player. What
  those are, and how an operator can switch them off, is
  [section 6](#6-requests-caused-by-content).
- Voice input on iOS is transcribed by iOS itself, which may process the
  audio on Apple's servers — [section 3.3](#33-device-permissions).

What happens to your content *after* it reaches your server is governed
by whoever operates that server — see [section 5](#5-the-server-you-connect-to).

## 2. Controller

Responsible for the data processing described here:

Mike Hummel
Berliner Str. 10
95119 Naila
Germany

Email: hummel@sipgate.de

Further details in the [Impressum](/impressum).

This applies to the apps as distributed. It does **not** make us the
controller for a Vancetope server that someone else operates.

## 3. Vancetope for iOS

The app exists to do two things a browser on the same device cannot, and
both of them explain why it stores what it stores.

**Several accounts at the same time.** A browser keeps one session per
server, because that is what a cookie is — so a private login and a
business login on the *same* Vancetope server cannot be open at once. In
a browser you need two browsers. The app gives every account you add its
own web view with its own isolated storage container, so those two
logins sit side by side and neither can see the other's session. That
isolation is the app's whole point, and it is why there is a list of
accounts on the device at all.

**The Apple side of the device.** The website on its own cannot reach
the parts of iOS that make it feel like an app. Through the app it can:
take a photo or pick one from your library, dictate text instead of
typing it, read a reply back to you, save a document to the Files app,
and appear as a destination in other apps' share sheets — the "share to
Vancetope" entry, covered in [section 3.4](#34-share-extension).

Each of those touches something iOS guards, so each is described below:
the storage in [3.1](#31-what-stays-on-your-device), what goes out in
[3.2](#32-what-leaves-your-device-and-where-it-goes), and the
permissions in [3.3](#33-device-permissions).

### 3.1 What stays on your device

**In the app's own preferences** (iOS `UserDefaults`):

| Data | Purpose |
|---|---|
| The list of accounts — server address, the label you gave it, an internal identifier, and when it was created and last used | So the app knows which servers to offer |
| Which account is the active one | So the app reopens where you left off |
| A hash of your app PIN, plus a random salt | To check the PIN without storing it. The PIN itself is not stored |
| Whether you declined to set a PIN | So the app stops asking on every launch |
| Whether Face ID / Touch ID is enabled | Your preference for unlocking |

**In the web view's own storage,** kept in a separate container per
account: cookies, local storage and other browser storage belonging to
the website you loaded — your login session, in other words. Accounts
are isolated from one another, so two accounts on the same server do not
share a session.

**In a container shared between the app and its share extension.** The
share extension is a separate process that iOS starts on its own, so it
cannot ask the running app for anything — it has to be able to read what
it needs and reach your server by itself. The app therefore keeps three
things in a shared container for it:

| Data | Purpose |
|---|---|
| A reduced copy of the account list — internal identifier, server address, label | To fill the extension's account picker |
| The list of projects on each account — name and title | To fill the extension's project picker |
| Per account: an access token your server issued, plus the server address and tenant it belongs to | So the extension can post the shared item to your server without you signing in again |

That token is a credential. It is written by the website after you have
signed in there, it is stored on the device and nowhere else, and it is
sent to nothing but the server that issued it.

All of the above — preferences, web-view storage and shared container —
is removed by iOS when you delete the app.

### 3.2 What leaves your device, and where it goes

To the server address you entered:

- **Adding an account** requests `/config.json` from the address you
  typed, to confirm it is a Vancetope server before saving it. Nothing
  but the request itself is sent.
- **Using the app** is the website talking to its own server, exactly as
  it would in a browser. What that involves is up to that server; see
  [section 5](#5-the-server-you-connect-to).
- **Sharing into the app** sends the shared item from the share
  extension straight to the server you picked — see
  [section 3.4](#34-share-extension).

Beyond that, the app itself contacts no server of ours and no third
party. Content you *view* can still cause requests elsewhere; that is
[section 6](#6-requests-caused-by-content).

One path leaves the app without going onto a network at all: **saving a
document to Files.** When you export a document, the app writes it into
its own temporary folder and hands it to the iOS file picker, where you
choose the destination. It goes exactly where you point it — a folder,
iCloud Drive, another app — and the app neither reads that destination
afterwards nor keeps a copy beyond the temporary file iOS clears out.

### 3.3 Device permissions

Requested only when the feature is used, and only for that feature:

- **Camera** and **Photo library** — to attach pictures to documents and
  messages. Attaching a file from the Files app needs no permission: iOS
  hands over the one file you picked and nothing else.
- **Microphone** and **Speech recognition** — for voice input in the
  editor. The transcription is not done by us: the app hands the audio
  to **iOS's own speech recognition**, and iOS may process it on
  **Apple's servers** rather than on the device. That is Apple's
  processing, under Apple's privacy policy, and it is the one case where
  something you dictate can reach a party other than your own server.
  The microphone is live from when you switch dictation on until you
  switch it off again — it is a toggle, not a press-and-hold — and in
  the hands-free talk mode it re-arms itself after each reply so it can
  hear what you say next. If you would rather it never ran, do not grant
  the microphone permission and type instead.
- **Face ID / Touch ID** — to unlock the app. iOS performs the check
  itself; the app is told only whether it succeeded and never receives
  biometric data.

Spoken output — having a reply read back to you — needs no permission
and is the reassuring counterpart to dictation: it uses the voices built
into iOS, the text is turned into sound **on the device**, and nothing
is sent anywhere to do it.

### 3.4 Share extension

Installing the app puts Vancetope into the iOS share sheet, so it
becomes a "send to" destination from any other app. Choosing it opens a
small compose sheet: pick an account, pick a project, optionally add a
note, send.

- **What can be shared** is a link, the page you are on, or text you
  selected. The extension does not accept files.
- **What is sent** is that link or text plus your note, the project you
  chose, and nothing else.
- **Where it goes** is your server, directly. The extension posts it
  itself — using the access token from the shared container described in
  [section 3.1](#31-what-stays-on-your-device) — to the share inbox of
  the account you selected. It does not route through the main app, and
  it sends to nowhere else.

## 4. Vancetope Capture (browser extension)

Saves the page you are looking at into a link list on your Vancetope
server. Available for Chrome, Firefox and Safari; the Safari version is
distributed as a macOS app that contains the extension, and stores its
data inside that app.

### 4.1 What stays in your browser

In the extension's local storage — deliberately **not** browser sync
storage, so credentials never travel to other machines signed into the
same browser profile:

| Data | Purpose |
|---|---|
| One entry per destination you set up: the server address, the tenant, the access token you pasted, and the project and folder it is pinned to | To reach your server and know where to file the capture |
| Your label for each destination, the target folder for saved pages, and which destination is currently selected | So the choice survives closing the popup |

### 4.2 What opening the popup sends

Opening the popup asks your server two questions about the destination
that is currently selected: which group headings that link list has, and
whether **the address of the page you are on** is already in it. That
second one means the address of the current page is sent to your server
when you open the popup, before you have saved anything.

It is scoped deliberately:

- **Only when you open the popup** — never in the background, and never
  per page you visit. A toolbar badge that marked each page as saved or
  not would have to ask your server about every URL you open, which
  would hand it your browsing history for the sake of an icon.
- **Only the selected destination** — not all of them. With several
  servers configured, answering "is this page in any of my lists" would
  tell every one of them what page you are on, every time.

### 4.3 What a capture sends

Only when you explicitly trigger it, and only to the destination you
selected:

- **Saving a link** sends the address and title of the current page,
  plus the note, group and tags you entered.
- **Saving a page** sends the page as your browser has rendered it. For
  a page that is not HTML — a PDF, an image — the file is fetched using
  your existing browser session and sent as it is.

That second one is the point of the extension, and it is worth being
explicit about: it is intended for pages a server cannot fetch by itself
— behind a login, behind a paywall, on an internal network. If you
capture such a page, **its content, including content only your session
can see, is transmitted to your server.** That happens on your
instruction and nowhere else.

### 4.4 Access to websites

The extension holds no standing permission for the pages you browse. It
reads a page only through the browser's *active tab* mechanism: your
click on the toolbar button grants it access to **that one tab, for that
one action**, and the grant lapses afterwards. It runs no code in the
background, registers no content script, and has no way to read a page
you have not captured from.

Access to **your own server's address** is a separate, one-time grant:
the browser asks you to confirm it when you add a destination in the
settings, because the extension has to be able to reach that host from
then on.

## 5. The server you connect to

This is the part that differs from most apps, and it is the part worth
reading.

**The apps host nothing.** They are clients. Where the server is, is
something you type into the app yourself, and the apps talk to that
address and no other. There is no service of ours behind them and no
account with us.

That server holds your account and everything you put into it —
documents, messages, captured pages — and its operator decides how that
data is stored, logged, backed up and for how long. In the normal case
the operator is **you or your organisation**, which is also who runs
Vancetope: it is software you deploy, and obtaining the app does not get
you a server.

- If **you or your organisation** run the server, you are the controller
  for that data, and the answers are yours to give.
- If **someone else** runs it — an organisation that provides one for
  its people, say — ask them. This policy cannot describe a system we do
  not operate, and processing on it is outside our responsibility.

**We offer no Vancetope server for other people to use.** There is no
instance you can sign up to and no hosted tier. Installing an app gets
you a client; the server is yours to run.

## 6. Requests caused by content

Neither app contains analytics, crash reporting, advertising or
attribution code. Nothing is measured across apps or websites. The iOS
app declares this to Apple in its privacy manifest as well: no tracking,
no collected data types, and no tracking domains.

The apps themselves load nothing from third-party servers — no fonts, no
scripts, no CDNs. But the *content* you open in them can, in the same way
it would in any browser, and being precise about that is more useful than
claiming otherwise:

| When you… | your device requests | which learns |
|---|---|---|
| view a card for an external link | an icon for that site from Google's favicon service | the address of that site |
| view a card whose preview has an image | that image from the site the link points at | that its preview was displayed |
| open a map | map tiles from OpenStreetMap's public tile server, unless the server's operator configured a different one | roughly which area you are looking at |
| open a video document | the player from `youtube-nocookie.com`, YouTube's no-cookie host | that the video was opened |

These requests are made by your device to the party that serves the
content, at the moment the content is displayed. Nothing identifying you
is attached by us, no profile is built, and nothing about them comes back
to us. Google, OpenStreetMap and YouTube are US providers, so where such
a request happens it involves a transfer to the USA — see
[section 8](#8-legal-bases). An operator who wants none of it can point
the map setting at their own tile server and keep external links,
previews and video documents out of their projects; a browser-level
content blocker stops the rest.

## 7. Storage period

Everything described in sections 3 and 4 stays on your device until you
remove it, and only there:

- Deleting the iOS app removes the account list, the PIN hash, the
  web-view sessions and the shared container with its access token.
- Removing a destination in the extension's settings deletes its entry
  including the token; uninstalling the extension removes all of them.

We hold nothing, so there is nothing for us to keep or to delete. Data on
a Vancetope server is kept for as long as its operator keeps it
([section 5](#5-the-server-you-connect-to)).

## 8. Legal bases

Where the processing described here is subject to the GDPR:

- **Providing the apps' functionality** rests on Art. 6(1)(b) GDPR —
  processing necessary to deliver what you asked for. Transmitting a
  capture, a shared item or an editor keystroke to your own server is
  the function itself.
- **Storing data on your device** — the account list, the PIN hash, the
  access tokens, the web-view session — is strictly necessary to provide
  the service you requested, and rests on § 25(2) no. 2 TDDDG together
  with Art. 6(1)(b) GDPR. There is no separate purpose behind it and no
  further processing on our side.
- **Requests caused by content** ([section 6](#6-requests-caused-by-content))
  rest on Art. 6(1)(f) GDPR — the legitimate interest in displaying the
  content you opened as it was meant to be displayed. Where such a
  request reaches a US provider, the transfer happens as part of
  retrieving that content and is bounded by it; you can avoid it by not
  opening that content or by using a content blocker.
- **Voice input** ([section 3.3](#33-device-permissions)) is carried out
  by iOS at your request, on the basis of Art. 6(1)(b) GDPR, and the
  microphone permission you grant is revocable at any time in iOS
  settings. Apple's processing of the audio is Apple's own.

## 9. Your rights

Within the limits of the applicable law you have the right to
information (Art. 15 GDPR), rectification (Art. 16), erasure (Art. 17),
restriction of processing (Art. 18), data portability (Art. 20) and to
object to processing (Art. 21). You also have the right to complain to a
data protection supervisory authority (Art. 77 GDPR).

For data held on the apps themselves, the shortest route is direct — see
[section 7](#7-storage-period). For data on a Vancetope server, address
the operator of that server ([section 5](#5-the-server-you-connect-to)).

For anything concerning the apps as distributed, use the contact address
in [section 2](#2-controller).

## 10. Children

The apps are not directed at children and collect nothing about their
users, including age.

## 11. Changes

This policy is updated when the apps change in a way that requires it.
The version published here, with the date at the top, is the one that
applies.
