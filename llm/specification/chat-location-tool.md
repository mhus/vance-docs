# Chat Location Tool

**Status:** v1, built (2026-08-26). Browser verification still pending.

## 1. What it is

A client tool `location_get` that the Agent can call in a **Chat Session** to
query the **browser's geolocation**. It is the first client tool that is
bound to a **Session**, not a **page**: Cortex and Inbox only register their
tools when their page is open (`CortexClientToolService`,
`InboxClientToolService`); the chat session is always active, and the user is
always in front of it.

- **Client Service:** `@vance/vance-face` →
  `src/chat/chatClientToolService.ts` (`ChatClientToolService`).
- **Host:** `src/chat/ChatApp.vue` (the `/chat` route), where the tool is
  connected to the tab-singleton WebSocket.
- **Transport:** the same client tool mechanism as Cortex/Inbox —
  `client-tool-register` on WS-open, `client-tool-invoke`/`client-tool-result`
  with Correlation-Id, Brain blocks the LLM-sampling loop on the pending future.

## 2. The central point: the tool does not block on the permission prompt

Browser geolocation is **asynchronous and timeless**: the user accepts in 5
seconds, in 5 minutes, or not at all. However, the client tool mechanism blocks
the LLM loop on a future with the Brain timeout (30 s). The tool **does not**
wait for the prompt — it has its **own, short local timeout** (5 s) and
responds *before* the Brain timeout, with the status known at the time of
expiration.

Thus, the Agent **never** gets a 30-s timeout, but always an answer in ≤ 5 s.

## 3. The four states

`location_get` responds with `{ status, ... }`, not an exception. A non-`GRANTED`
status is **not an error** that the Agent needs to react to — it is a
**result** that the Agent manages itself.

| `status` | Meaning | Agent's behavior |
|----------|-----------|----------------------|
| `GRANTED` | Location available: `latitude`, `longitude`, `accuracy`, `timestamp` | complete |
| `DECLINED` | User has declined | **do not** ask again (terminal) |
| `PENDING` | Permission prompt is running, user has not responded in 5 s | **may** ask again; the browser prompt will then be gone, a second call reads the result, it does **not** trigger a second prompt |
| `UNAVAILABLE` | no geolocation support in the browser, or position not obtainable | **do not** ask again (terminal) |

**`PENDING` is the only retryable status.** The other three are terminal. The
Tool Description explicitly tells the Agent this: *DECLINED* and *UNAVAILABLE*
"Do not retry", *PENDING* "You may call location_get again after a short wait".

## 4. Permission status comes from the browser — no internal cache

The permission status check is done via `navigator.permissions.query({ name:
'geolocation' })`. The browser maintains the state **per origin, across
reloads** — once granted, it remains granted. Therefore, the tool **does not
cache anything itself**: it queries what the browser knows, and the browser is
the sole source of truth. A second call after `PENDING` reads `granted` if the
user clicked in the meantime, and responds with `GRANTED` — **without** a
second browser prompt.

The browser's tri-state is mapped to four states:

- `granted` → directly `getCurrentPosition` (no prompt, only the 5-s race for
  the callback, because the coordinates themselves are not yet available).
- `prompt` → `getCurrentPosition` triggers the browser prompt; 5-s race.
- `denied` → immediately `DECLINED` (terminal, no prompt, no race).

If `navigator.permissions` is missing (older browsers), the tool falls back to
the `prompt` branch: it queries directly via `getCurrentPosition` and lets the
result speak for itself.

## 5. The 5-s Race

```
getCurrentPosition(success, error, { timeout: 5000, maximumAge: 0 })
   │
   └─ parallel: 5-s-Timer
        │
        └─ whichever first wins:
             ├─ Permission comes in <5s → GRANTED / DECLINED / UNAVAILABLE
             └─ 5-s-Timer runs first → { status: 'PENDING', ... }
```

- `PENDING` response contains a message telling the Agent: *the user has been
  asked and has not yet responded, you can ask again or continue without
  location*.
- **A single in-flight Request per Service:** a second call while the first is
  running **awaits the first** (`pendingRequest`) instead of triggering a
  second permission prompt.
- `DECLINED`/`UNAVAILABLE`/`PENDING` are **not** returned as `error` — they
  are `result`. A client tool that returns a denied permission as `error`
  would be interpreted by the Agent as an error and retried; this is precisely
  the behavior that must be prevented.

## 6. What `location_get` does **not** do

- **It does not block the LLM loop** on the permission prompt (it has its own
  5-s timeout that expires before the Brain timeout).
- **It does not cache any permission state itself** (the browser is the cache).
- **It does not trigger a second prompt** on a second call (it reads the
  existing state).
- **It does not respond as `error` for `DECLINED`/`UNAVAILABLE`** (they are
  results, not errors).

## 7. Integration

`ChatApp.vue` (the `/chat` route) connects the `ChatClientToolService` to the
tab-singleton WebSocket, analogous to `ChatSidePanel`'s `attachedToolSocket`-watch:

- One `ChatClientToolService` instance per page, which survives session
  switches (like `InboxClientToolService`).
- Attach only if `mode === 'live'` **and** the socket is present —
  registration on a bare, unbound socket would result in a `403 "requires a
  bound session"` (the same gate as `ChatSidePanel`).
- `detach` in `onBeforeUnmount`.
- `watch([socket, () => mode.value === 'live'], …)` — re-attach after each
  fresh socket (e.g., after auto-reconnect), as soon as the session is live.

## 8. Not implemented (intentionally)

- **No `location_watch`** (continuous tracking). v1 is a one-time call.
- **No Reverse-Geocoding** (the Agent only gets `lat`/`lng`/`accuracy`; it
  must resolve place names itself via a search).
- **No Permission-Request-Tool** (no `location_request` as a two-stage flow).
  The Agent does not need control (user design decision) — `location_get`
  triggers the prompt directly.
- **No Headless-/Worker-Client integration.** The tool is only registered by
  the web chat page; `UNAVAILABLE` covers the in-browser case without
  geolocation. A client without a browser (Foot, Trillian-Worker) does not
  have `location_get` in its manifest, so there is no question it needs to
  answer.
- **No Precision Guarantees.** The Description tells the Agent: *Accuracy is a
  radius in metres, not a point — do not report false precision.*

## 9. Tool Surface Budget

The tool is **not deferred** (`deferred: false`) and **not** `primary: false`
— it is a permanent, small UI state tool like `cortex_get_active_tab` or
`inbox_show_thread`. It occupies one slot in the manifest per web chat session
(not per Cortex/Inbox session). The Tool Surface Budget (`server-tools.md` §14)
does not apply here because it is not a `ContextToolsApi.classify`-tool (not a
Brain-side server tool, but a client-driven `client-tool-register` frame that
carries a single tool per session).

## 10. Verification

- **Build:** `pnpm build` in `@vance/vance-face` — green.
- **Browser verification still pending:** `location_get` in a real web session,
  `GRANTED`/`DECLINED`/`PENDING`/`UNAVAILABLE` paths, reload after grant,
  second call after `PENDING`.
