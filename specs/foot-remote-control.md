---
title: "Vancetope — Foot Remote Control"
parent: Specs
permalink: /specs/foot-remote-control
---

<!-- AUTO-GENERATED from specification/public/en/foot-remote-control.md — do not edit here. -->

---
# Vancetope — Foot Remote Control

> Remote control of running CLI clients via the existing Brain WebSocket.
> See also: [live-ws](/specs/live-ws) (Envelope, Channel Inventory),
> [foot-sandbox](/specs/foot-sandbox) (Permission Gate, whose prompt can be answered
> remotely here), [signals-channel](/specs/signals-channel) (same
> channel structure).
> Status: v1 built, not yet verified in browser.

> Derivation, discarded approaches, and deviations during construction:
> [planning/foot-remote-control.md](/specs/foot-remote-control).

---

## 1. Purpose

Foot runs and works on the laptop. The user is on the go. Remote Control
makes visible what the client is currently doing and allows interaction where it is **waiting**.

The valuable moment is not typing a chat message, but an open sandbox query:
`client_exec_run` wants to do something for which no rule exists, and without an
answer, it defaults to a Deny after 25 seconds. This exact point is accessible
from a mobile phone.

## 2. What it is not

**Not a terminal mirror.** What is transmitted are *lines* (`ChatTerminal.Line` with
level and sequence number), not an ANSI byte stream. Foot does not operate a PTY; for
a true mirror, it would need to be hooked under a PTY master. The only
gain of a terminal emulator would be the Lanterna full-screen UI — and that is
deliberately blocked remotely (§6).

Consequence for the interface: a `<pre>` in monospace, colored by
`level` with the theme of the web UI. **No `xterm.js` dependency.**

## 3. Channel

A dedicated Live-WS channel **`clients`** (`LiveChannels.CLIENTS`), not
`control` — which, according to [live-ws](/specs/live-ws) §3.1, is reserved for Keepalive,
Auth-Refresh, and Capability-Handshake.

All frames are **Notifications**. There is no Request/Reply and thus no
Cross-Pod RPC; the effect of a command appears in the output stream, which the
watcher has already subscribed to anyway.

| Direction | Frame | Purpose |
|---|---|---|
| foot → brain | `client-announce` | After each WELCOME: clientId, Label, Version, Capabilities |
| foot → brain | `client-heartbeat` | Refresh Roster-TTL; payload is the State |
| foot → brain → watcher | `client-output` | Line batch with `seq` |
| foot → brain → watcher | `client-state` | Connection, Session, UI mode, busy |
| foot → brain → watcher | `client-prompt` | Client is waiting for an answer |
| watcher → brain | `client-list` | Request roster → Answer `client-roster` |
| watcher → brain → foot | `client-attach` / `client-detach` | Output streaming on/off, replay from `sinceSeq` |
| watcher → brain → foot | `client-input` | A line, as typed at the JLine prompt |
| watcher → brain → foot | `client-interrupt` | Pause or Stop |

## 4. Session and Project Independent

A client is reachable **as soon as its WebSocket is established** — without a bound
Session, without a Project. This is not a convenience, but a prerequisite: a
foot that is currently working should be operable, no matter what it's doing.

A precedent is `profile=daemon`, which has always registered without a Session.
The difference is the key: Daemons are project-scoped, Remote-Clients are **user-scoped**.

## 5. Multi-Pod: Routing via `clientId`, never via Pod

The core of the design. Pod 1 holds the foot, Pod 2 the browser; the
Project Home Pod redirection does not help because a Remote Client has no Project.

**Both directions are Redis Pub/Sub on a channel whose key is the `clientId`.**
The publishing Pod never knows where the target is located; the subscribing Pod
is, by definition, the one that holds it.

This naturally handles the reconnect case: if foot lands on Pod 3 after a disconnection,
Pod 3 subscribes to the same key, and Pod 1 releases it on WS close.
The Watcher notices nothing because it never addressed a Pod. There is **no
Pod-to-Pod tunnel** for this channel.

### 5.1 The Inventory

What Pub/Sub cannot do is "which clients do I have": for this, a Redis HASH per
user with Heartbeat-TTL, structured like the Presence Roster of the
documents-channel.

```
vance:{tenant}:remote:clients:{userId}
  └── clientId → { podId, host, cwd, pid, version, uiMode, sessionId, lastSeen }
```

`podId` is included solely for diagnosis. The inventory self-heals:
a Pod change overwrites the entry on the next Announce, a dead Pod
is removed by TTL.

**Without Redis** (`vance.redis.enabled=false`, default), only clients on the same
Pod are visible. The response carries `crossPod=false`, and the interface states this
instead of implying "no other clients".

## 6. `clientId` and Reconnect

`clientId` is **process-stable**, not the WS-Session-Id:

- Reconnect (even to another Pod) → same Id, the process is alive.
- Restart → new Id. This is honest, the working state is gone anyway.

`ChatTerminal` assigns a monotonic `seq` per line, independent of the
500-line ring buffer. On Attach, foot delivers from `sinceSeq`; if the ring
did not go back far enough, the batch carries `truncated=true` — the gap is **reported**,
not concealed by a shorter list.

The same applies during ongoing operation: the send queue is limited, and
an overflow sets `truncated` on the next batch. The Watcher should not have to
infer the gap from a `seq` jump — otherwise, every consumer
must correctly implement continuity checking, and whoever forgets it will display a
fragmented log as complete.

Commands that fall into a reconnect gap are **lost and remain so**.
A queue would deliver a "yes" to a permission query that no longer exists
minutes later.

## 7. What is remotely blocked

While `uiMode == FULLSCREEN` (Lanterna-Excursion), foot rejects input and
explains why. Two reasons: the Excursion exclusively owns the TTY, JLine does not
read — and a remotely triggered full screen would hijack the screen of a computer
where no one is sitting.

The rejection comes as text from the client (`inputBlockedReason`) and is
displayed unchanged; the interface does not guess.

## 8. Authorization

Attaching to a foot is practically shell access to its machine.
Therefore, two independent barriers.

**Server-side: only the owner.** The Roster is stored under the User-Id, so a
client of another user is not rejected, but *not found* — the response is `404`,
not `403`. Here, **no** Admin override applies; this is where "Tenant Admin can do anything"
does not apply.

Frames **from the client** are assigned via the socket binding of the Announce,
never via the `clientId` in the payload. Otherwise, any connection
could overwrite a foreign client's Roster entry or forge output.

**Client-side: `vance.remote.mode`.**

| Mode | Meaning |
|---|---|
| `off` | The client never registers, it is not listable. `--no-remote-control` |
| `ask` (Default) | Registers and streams output, **rejects input** until `/remote allow` runs locally |
| `allow` | Accepts input immediately. `--remote-control` — the mode to set *before* leaving |

The mode can also be stored **per Project** — `defaults.remoteControl` in
`.vancetope/config.yaml`, like `recipe` or `sandbox` next to it:

```yaml
defaults:
  remoteControl: allow   # off | ask | allow (true/false as alias for allow/off)
```

Precedence as everywhere in foot: `application.yaml < .vancetope/config.yaml <
CLI`. `--remote-control`/`--no-remote-control` thus override the file.
The field is **nullable** and not pre-filled with `ask`: a Project that says nothing
must not silently revert a client from an `allow` that `application.yaml` set.
An unknown value falls back to `ask` — a typo never widens access.

Deliberately **no** blocking prompt on first Attach: the case for which the
feature exists is without a person in front of it, and a prompt that then always
leads to rejection is not a security question, but a delayed error message.

**Every accepted line is echoed locally** (`❯ [remote] …`). A silent
secondary channel into a terminal that someone reads later is excluded.

Two details that follow from the same rule:

- A `client-announce` to a `clientId` already owned by another user
  is rejected with `409`. The IDs are random enough that this is not a
  realistic attack — but the consequence would be severe: the usurper
  would own the routing entry, the frames of the real client would be considered
  "unregistered", and its owner would no longer be able to access their own machine.
- **`client-detach` is authorized like any other Watcher frame.** Otherwise,
  knowledge of a `clientId` would be sufficient to detach a stranger's Watcher
  and silence their client.

The Watcher identity (`RemoteAttachRequest.watcherId`) is set by **the Brain**
from the connection, never the sender. The client counts its Watchers via this;
a value supplied by the sender would allow one Watcher to log out another.

## 9. Prompts

If a client is blocked on a question, a `client-prompt` goes to the Watchers —
with text, subject, and selectable answers.

**An answer is a regular input.** Each option carries the line it submits
(`"1"`…`"4"`); the client routes it via its normal input path to the waiting
prompt. There is no second answer protocol that could get out of sync with the menu.

**However, a prompt answer does not run through the input executor.** It is
single-threaded, and a chat submit occupies it for the entire roundtrip —
including the tool call whose permission query is waiting for precisely this answer.
The answer would queue behind it, and the prompt would time out to a Deny.
It is therefore delivered directly on the socket thread
(`ChatInputService.offerToActivePrompt`, non-blocking). The same trap
`submitFromRepl` has always avoided for the local REPL.

Because an answer is input, it is also subject to the mode gate from §8: in
`ask` without `/remote allow`, the buttons are **deactivated**, with a visible
reason. An active button whose rejection only lands in the distant terminal
would be worse than none at all.

The Sandbox prompt has received **two** adjustments for this:

1. An attached Watcher is considered an answer surface. Without this, a foot without
   a live region could never be unlocked remotely.
2. The timeout follows the answer surface: 25 s locally, `vance.remote.prompt-timeout`
   (default 5 min) as soon as someone is watching. The 25 s are tailored for someone
   at the keyboard and would reject before a notification is read.

v1 only announces the permission query as a prompt card; `ask_user` and
line prompts are already answerable (a single input line suffices), but do not
yet appear as a separate card.

## 10. User Interface

Tab **Clients** next to the Session list in the Chat Editor (`PickerView`). A
running client is a *peer* to the Session — one switches between "what I talked to"
and "what is currently running for me". A separate HTML entry would be a
page that is mostly empty.

List, line stream, status line, input line, prompt card,
Pause/Stop/Detach. The tab deliberately ignores the sidebar's project selection.

## 11. Configuration

| Property | Default | Meaning |
|---|---|---|
| `vance.remote.mode` | `ask` | see §8 |
| `vance.remote.heartbeat` | 30 s | Roster refresh |
| `vance.remote.flush-interval` | 250 ms | Line bundling |
| `vance.remote.max-batch-lines` | 200 | Lines per frame |
| `vance.remote.prompt-timeout` | 5 min | Prompt window when Watcher is attached |
| `vance.remote.roster-heartbeat-ms` (Brain) | 30000 | TTL refresh of Roster keys |

CLI: `--remote-control`, `--no-remote-control`.
Project: `defaults.remoteControl` in `.vancetope/config.yaml` (see §8).
Slash: `/remote status\|allow\|deny\|on\|off`.

## 12. Not in v1

No terminal emulator and no ANSI. No full-screen operation. No
persistence (no output archive beyond the ring buffer). No sharing with other
users — only the owner. **No LLM Tool**: what remotely controls a foreign shell
does not get a silent agent path. Mobile (`vance-fingers`/facelift) to follow.
