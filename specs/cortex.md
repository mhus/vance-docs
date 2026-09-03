---
title: "Vancetope Cortex — Specification"
parent: Specs
permalink: /specs/cortex
---

<!-- AUTO-GENERATED from llm/specification/cortex.md (translated from the German specification/public/cortex.md) — do not edit here. -->

# Vancetope Cortex — Specification

> Status: v1. Binding product spec for the unified Chat + Document + Execute work environment of the Web UI. Implementation resides in `client_web/packages/vance-face/src/cortex/` plus the backend under `vance-brain/src/main/java/de/mhus/vance/brain/{python,script}/cortex/`.
>
> See also: [web-ui.md](/specs/web-ui) | [script-engine.md](/specs/script-engine) | [user-interaction.md](/specs/user-interaction)

## 1. Definition and Scope

**Cortex** is the project-bound work environment of the Web UI: chat, documents, and script execution in a browser session, with the chat agent as an active companion to an edited Doc-Tab. Cortex replaces the older ScriptCortex (`scripts.html`), which no longer exists.

**What Cortex is:**

- A route (`/cortex`) in the workspace — see [web-ui](/specs/web-ui) §3.
- Project file tree, multiple documents as tabs, persistent chat panel on the right with a Help sub-tab.
- Client tools (WS) dynamically registered with the Brain, allowing the agent to directly edit the chat-bound Doc.
- Run surface for executable Doc types (`.py` and `.js` with `@server` header — §5.1), with Validate + Slart-Generate/Update as additional actions for JavaScript.

**What Cortex is not:**

- Not a real-time status mirror beyond chat — other editor data comes via REST snapshot on page load (see [web-ui.md](/specs/web-ui) §1).
- Not a second auth context: uses the same JWT session as `/chat`.
- No dedicated persistence layer: all edits go through the normal `documents`-REST endpoints.
- No dedicated scripting language. Cortex relies on the Brain-side `ScriptCortexController` (JavaScript via GraalJS) and `PythonCortexController` (Python via ExecManager + venv).

## 2. Entry and Data Model

Cortex is opened from a chat (`/chat?sessionId=X` has an "Open in Cortex" button → `/cortex?sessionId=X`) and directly from the file explorer (`/documents`, click on a row → `/cortex?project=…&doc=…`). The chat has a Project (mandatory in the chat model), so the Cortex Project is known. No in-place Project change — a different Project means a new Cortex Session (new browser tab or close+open).

`ChatSessionDocument` carries two Cortex fields:

- `openDocumentIds: List<String>` — Order of open tabs during the last Cortex visit.
- `chatBoundDocumentId: String?` — The Doc the agent is working on (tools operate on it). Must be included in `openDocumentIds` or `null`.

Persisted via `PUT /brain/{tenant}/sessions/{id}/cortex-state` with body `{ openDocumentIds, chatBoundDocumentId }`. Restored on mount of the Cortex app.

## 3. Layout

```
+---------------------------------------------------------+
| Cortex · <Project> · <Chat-Title>                  [x] |
+-----------+----------------------------------+----------+
|           | [Tab A *] [Tab B] [Tab C]  [+]  | [Chat][Help]
| File-Tree +----------------------------------+----------+
|           |                                  |          |
|           |   Document Tab Shell             | Chat-    |
|           |   (Toolbar + Body)               | History  |
|           |                                  |          |
|           |                                  | [input]  |
+-----------+----------------------------------+----------+
```

Three zones:

- **Sidebar (left):** `FileTreeSidebar` showing all Doc paths of the Project (same `documents`-API as `/documents`).
- **Main (center):** `EditorTabs` for open Docs plus a `DocumentTabShell` for the active tab.
- **Right-Panel (right):** `CortexRightPanel` with two sub-tabs — `Chat` and `Help`. Help changes per active Doc (see §6).

## 4. DocumentTabShell — Body Dispatch

A single tab shell that renders each Doc kind. Resolver: `resolveBinding(doc): DocTypeBinding`. Lookup order:

1. **`@vance/kind-registry`** first — `resolveKindFor(doc.kind, doc.mimeType)`. Captures addon-contributed Kinds (e.g., Calendar) plus all built-ins migrated to the registry. Mounts `kindEntry.editor ?? kindEntry.view`. Uses `kindEntry.parse` / `kindEntry.serialize` if available, otherwise the View is fed with `:document="DocumentDto"` instead of `:doc="model"`.
2. **Hand-rolled Bindings** for Kinds that `DocumentApp.vue` (in `src/document/`) still hardcodes dispatching: `tree`, `list`, `checklist`, `records`, `chart`, `sheet`, `graph`, `mindmap`, `slides`, `diagram`, plus `image`. Bindings reference the Views from `src/document/` directly — no Cortex-specific renderer classes.
3. **Catch-all `code`-Binding** — `CodeEditor` from `@vance/components` on the raw `inlineText`.

Four `BindingMode`-Enum modes:

- `'code'` — CodeEditor with text selection mirroring to the Cortex store (for `doc_get_selection`).
- `'image'` — `ImageView`, read-only.
- `'typed-model'` — Codec-parsed `inlineText` → typed Model → View with `:doc`. On `@update:doc`, it is serialized back.
- `'kind-registry'` — structurally identical to `typed-model`, source of the pair is the `KindEntry`.

**Shell Toolbar (always):** Reload, Path, View/Edit-Toggle (typed-model + kind-registry only), Properties-Deep-Link (`↗`) to `/documents`, Dirty-Indicator (`●`), Debug-Pill `[binding-id] mime-type` with Tooltip `binding=… mode=… kind=… mime=…`.

**Toolbar per mode additionally** (see §5).

**Parse-Error-Fallback:** typed-model + kind-registry parse `inlineText` on-render. On error, the Shell shows an error banner and a `CodeEditor` on the raw text, so the user can fix the malformed file.

## 5. Run / Validate / Slart — Language Adapters

Run capability is orthogonal to Doc Type Binding. `resolveRunAdapter(doc): RunAdapter | null` finds the appropriate language adapter per Doc.

### 5.1 RunAdapter

Interface:

```ts
interface RunAdapter {
  id: string;                          // 'js' | 'py' | …
  label: string;                       // 'Run JS' | 'Run Python'
  matches(doc): boolean;               // mime / extension
  execute(input): Promise<RunHandle>;  // start + return live handle
}

interface RunHandle {
  id: string;
  state: Ref<RunState>;                // 'idle'|'starting'|'running'|'finished'|'failed'|'cancelled'
  logLines: Ref<string[]>;
  result: Ref<unknown>;
  error: Ref<string | null>;
  durationMs: Ref<number | null>;
  cancel(): Promise<void>;
  detach(): void;
}
```

Active adapters:

| Adapter | Match | Backend Endpoint | Transport | Log Streaming |
|---|---|---|---|---|
| `jsRunner` | (`.js` / `.mjs` / `.mjsh` / `.cjs` or `*/javascript`) **and** `@server` in header | `POST /brain/{tenant}/scripts/execute` + `script-execution-*` WS events | WebSocket Push + Polling Fallback | Live |
| `pythonRunner` | `.py` or `text/x-python` | `POST /brain/{tenant}/python/execute` + `GET /brain/{tenant}/python/executions/{id}` | REST + Polling (1.5 s interval) | ~1.5 s latency |

An adapter is registered in `cortex/runners/runnerRegistry.ts`. New language (Shell, R, …) = new adapter entry, Shell + Backend-REST analogous.

**`@server` — Language ≠ Executability (§5.1b).** `matches` answers not "which language", but "can *this* document be executed by the adapter". For JS, these are two questions: since **frontend JS** is also in the same editor, the extension is no longer proof that the Brain should execute the script. It is therefore declared by the author — a worthless flag line `@server` in the first JSDoc block (`hasServerTag` in `cortex/runners/jsDocument.ts`, block detection identical to the Brain's `ScriptHeaderParser`, so that a later mention in normal documentation does not activate the button). For this, `RunnerDocument` carries an optional `inlineText` — a matcher that reads a declaration *in* the document needs the body; a tab not yet loaded reads as "not declared" and re-evaluates as soon as the content is available.

The boundary runs along **capability vs. language**, not along "JS yes/no": Validate is a language feature and applies to both types (§5.3), Run is a capability and requires the declaration. Consequence for consumers: `isJsLanguage` and help resolution (§6) depend on `isJsDocument`, **not** on a found adapter.

Deliberately **UI only**: `POST /scripts/execute` does not check the tag. Backend enforcement would break every existing script (Guards, Kit scripts, `hactar_run`, Scheduler do not carry the tag), and the tag answers an editor question — "do I offer this button" — not a security question. The `ScriptHeaderParser` therefore does not know `@server`; because its `TAG_PATTERN` requires a value, the worthless line silently passes through (no Unknown-tag warning).

**Save-before-Run:** If the tab is dirty, the shell flushes synchronously before the adapter call (`store.saveTab`). The backend path loads the Doc body via `scriptId` from MongoDB — without pre-save, the previous state would run.

**UI in Toolbar:** `▶ Run X` button, Args-Input (single-line JSON, default `{}`), Cancel button during Running. Log panel slides up under the editor (collapsible, max 45% height), shows Status-Badge + Duration + color-coded log lines + Result. Close button detaches the handle (backend job continues).

### 5.1a Script Document API

Every Cortex Run has internal access to the Project documents of its owner Project via `vance.documents.*` — `read`, `write`, `list`, `exists`, `delete`, `meta`. JS sees this as a native host binding, Python via bundled `import vance` over loopback-REST. Contract, ENV variables, SCRIPT_RUN-JWT format, and label convention are defined in [script-document-api.md](/specs/script-document-api) — the `cortex.runId` label described there flows back into the Runs listing logic (future Cortex Runs panel).

### 5.2 PEP 723 Inline-Dependencies (Python)

`PythonExecutionService` parses PEP-723 block (`# /// script ... # ///`) in the Python source and installs declared `dependencies` into the project's venv before the script runs. Hash marker `.vance_inline_deps_hash` in the RootDir caches the last successfully installed state — unchanged Deps skip the pip step. Failed pip leaves the marker unchanged, the next Run tries again.

### 5.3 Validate + Slart (JavaScript only)

Additional toolbar buttons if `isJsDocument(doc)` — **language, not adapter** (§5.1). A frontend JS without `@server` has no Run adapter, but gets the same language actions, as far as they make sense without server semantics:

- **`✓ Validate`** (Quick: Parse + JSDoc-Header + Tool-Allowlist via `POST /scripts/validate`) and **`🔍 Deep Review`** (LLM-Review via `POST /scripts/validate-deep`, server-side cached by content hash) are **two separate toolbar buttons**. Backend delegates both endpoints internally to `HactarService.validate(...)` and `HactarService.deepValidate(...)` respectively. Results are rendered by `CortexValidatePanel` **inline below the editor** in the style of the Run-Log panel; both panels may be open simultaneously (Deep-Review after a FAILED-Run is exactly the case where both are desired). Cached Deep-Review appears with indicator *"matches current"* / *"content changed since"*. State resides in `useScriptValidation` and is discarded on tab change — a result belongs to the document for which it was created.

  The former `CortexValidateDialog` is **removed**: the modal offered both runs behind one button, thus it was a click that carried no decision, and it obscured exactly the code its warnings pointed to.
- **`✨ Generate`** (visible if editor is empty / new Script-Doc) opens `CortexHactarDialog` with `mode=CREATE`. Description-Input + Submit via `POST /scripts/generate { mode: "CREATE", prompt }` with polling on `GET /scripts/generations/{id}/result`. Backend spawns Slart with `outputSchemaType=SCRIPT_JS`. Deliberately remains **without** `@server`-gate: for an empty file there is no header yet, a gate here would make the bootstrap path unreachable. Instead, the `JsScriptArchitect` writes the flag as a mandatory tag in the generated header — otherwise every generated script would end up without a Run button.
- **`✨ Update`** (visible if editor has content **and** the document declares `@server` — Slart's `JsScriptArchitect` writes against the server-side `vance.*`-API, for a frontend script the result would be incorrect) opens the same dialog with `mode=UPDATE`, additionally sends `existingScriptId` + optional `failureReason` (from a last FAILED-Run from the Run panel). Slart's `JsScriptArchitect` injects the existing script as an "EXISTING SCRIPT" block + the failure reason as a "what to fix" hint into the user prompt. "Apply to editor" writes the new code via `update`-Emit through the normal pipeline (dirty → auto-save).

Python has no Validate/Generate endpoints — the buttons are then hidden.

## 6. Chat-Binding and Help-Tab

**Bind-Pointer:** At most one Doc is chat-bound at a time. Topbar shows the bind status as `🔗 <status>`; agent tools target the bound Doc. The bound Doc is sent per turn as `ProcessSteerRequest.boundDocumentId` (per-turn LLM context, not persisted).

**Bind-Mode** (switchable via the `Chat` menu in the Topbar):

- **`auto`** (Default): the bound Doc follows the active tab — the agent always sees the Doc the user currently has open. Additionally, the current text selection of the active tab travels as `boundDocSelection` (`{from,to}`-range, only if non-empty and in the bound Doc) with the steer; the model reads the selected text on-demand via `doc_get_selection`.
- **`pinned`**: the bound Doc is fixed to a specific Doc (menu "Pin to current tab"), regardless of the active tab. If the pinned tab is closed, the mode automatically reverts to `auto`.
- **`off`** (menu "Unbind chat"): nothing is bound, no selection is sent.

### The URL *is* the State

Cortex keeps its entire view in the URL — no hidden storage. An earlier
`sessionStorage` approach has been abandoned because it lost state on mode changes and
created restore/echo races. This way, the view survives hard navigations (Chat ↔ chatless),
browser history, F5, and bookmarks, and each browser tab remains independent.

| Param | Meaning |
|---|---|
| `open` | open tabs as document IDs, in tab order |
| `doc` | the visible tab; always a member of `open` |
| `bind` / `pin` | Chat binding (`pinned`/`off`) and optionally the pinned Doc |
| `at` / `sg` | Mirror of two `localStorage` preferences (Auto-Target, Follow-ups) — the truth lies there, the URL only carries them for shared links |
| `entry` | **Sub-position per app tab** (see below) |
| `q` | **Read parameters per tab** (see below) |

Active tab changes are navigable (`pushState`), pure open/close or preference changes
rewrite the current entry (`replaceState`).

In addition, there are two **one-time handoff parameters** that `writeCortexView` *always* removes
on the first rewrite (otherwise F5 would trigger the Create dialog again): `create` and `path`. `path`
addresses by **path** instead of ID — a star entry or a run link stores `(project,
path)` because that is the stable business key; Cortex resolves it to an ID on boot and
writes the canonical URL. The ID form remains the state, the path is the entry.

**`q` — with which parameters a tab was read.** The same `<docId>:<value>` form as `entry`
and for the same reason: two parameterized tabs must not contend for **one** parameter. The
value is the query of a [parameterized view](/specs/jaglan-system) (`from=…&to=…`) without a leading
`?`, percent-encoded, because `&` and `=` have their own grammar.

It belongs to the **view**, not the document — the same Mongo line responds differently per parameter set.
Precisely why it must be in the URL: a diagram over a time window is only shareable and
bookmarkable if the window travels with it. Three consequences that belong together: the tab's content retrieval
carries the query, a tab with a query is **read-only** (a save would affect the *document*, not the
calculated response), and opening the same file with a different window is a **reload
of the same tab**, not a second one.

This is generated in three ways: a `vance:` link with query (the click passes through the foreign part of the
query — Ref-specific words like `kind`/`entry`/`mode`/`caption` remain here, exactly the list
from `MountQuery.RESERVED`), the handoff `?path=<path>?<query>` for a manually typed link,
and Back/Forward.

**`entry` — which location in an app is open.** Comma-separated `<docId>:<handle>` pairs, handle
percent-encoded, restricted to members of `open`. The handle is app-specific and opaque — see
[inter-links](/specs/inter-links).

The host owns this state, not the app. Workbook and Wiki previously wrote a naked
`?page=` directly to the location; with two such tabs, they contended for **one** parameter and the
second won. The binding to the tab document ID is precisely what makes them independent — and the
tab IDs are known only to the host.

Apps communicate with it via two injections: `vance:app-entry` (reactive map for reading) and
`vance:report-app-entry` (report what is now open), encapsulated in `useAppEntry`. Without a host,
both degrade to null/no-op — the app continues to run, just without URL memory. Back/Forward is
thus the host's responsibility; the apps have lost their own `popstate` handlers.

**Right-Panel — Chat + Help:** `CortexRightPanel` has two sub-tabs.

- *Chat* — `CortexChatPanel`, own WS connection, tool service attachment, message stream. Remains mounted (`v-show`) when Help is active, so that the WS and message buffer survive.
- *Help* — `CortexHelpPanel`. Loads Markdown via `useHelp`-Composable (`help/{lang}/{path}`). Path resolution in `cortex/help.ts`:
  1. `isJsDocument(doc)` → `script-cortex.md` — based on the **language**, not the adapter (§5.1): a frontend JS without `@server` has no adapter, and the header/validate documentation still applies. There is no second frontend help file — `script-cortex.md` covers both types and leads with the `@server` section, instead of leaving the frontend page without help.
  2. `runAdapter.id === 'py'` → `python-cortex.md`
  3. `kind-registry`-Binding → `doc-kind-<kindId>.md` (convention)
  4. Hand-rolled Binding → fixed mapping in `BINDING_HELP`
  5. Default → `cortex.md`

Missing help file (404) → "No help available" hint, no crash.

## 7. Client-Tools via WebSocket

Cortex registers a **small UI state tool set** with the Brain per session (`CortexClientToolService.attach(ws)`):

- `doc_get_selection` — returns the current text selection in the active tab (Code + Markdown — typed views have no selection adapter in v1).
- `cortex_get_active_tab` — which Doc is currently in the foreground (may differ from the chat-bound Doc).
- `cortex_open_file` — open / bring user tab to foreground in Cortex.

**What is NO LONGER here:** the body mutation family (`cortex_read` / `cortex_edit` / `cortex_append` / `cortex_write`). Document edits by the agent now run via the regular server-side `doc_*`-tools since the refactor (`planning/cortex-document-invalidation.md`). Cortex is informed via `DOCUMENT_INVALIDATE`-frames on the session WS and fetches fresh content via REST — buffer coherence via 3-way-merge on dirty state.

**WS-Frames:**

- Client → Brain: `client-tool-register { tools: ToolSpec[] }`
- Brain → Client: `client-tool-invoke { name, params, correlationId }`
- Client → Brain: `client-tool-result { correlationId, result, error? }`
- Brain → Client: `document-invalidate { documentId, path, kind }` — Side-channel frame, tells the tab that the server has just mutated a Doc of this session.

Tool set is static per session — tab switch does not change the registered set, but only shifts the bind pointer resolution internally.

**"AI editing..."-Banner:** is currently derived from the frequency of `DOCUMENT_INVALIDATE`-frames (client-side — no server involvement, no additional LLM contract). Visible as long as frames arrived within the last ~1.5s.

## 8. Save Strategy

- **Auto-Save with Debounce ≈ 2 s** per Doc. Watcher on `(id, inlineText.length, dirty)` key tuple.
- **Dirty-Indicator** (`●`) in tab header + in DocumentTabShell toolbar.
- **Flush on**: tab close, tab switch (away from old tab), Cortex close, `beforeunload` handler.
- **Pre-Run-Flush** synchronously in `onRun()` (see §5.1).

`store.saveTab(id)` writes via `PUT /brain/{tenant}/documents/{id}/content` with body as raw text. Content-Type is the current Mime of the Doc; the server reclassifies if necessary.

## 9. Path-Extension-MIME-Bias

The server typically delivers `text/javascript`/`text/x-python`/`text/typescript` for `.js`/`.py`/`.ts`/... — but not every file has this (upload, migration, third-party systems). The Shell derives the **language for syntax highlighting from the file extension**. Server MIME is a fallback for unknown extensions. See `effectiveMimeType` in `DocumentTabShell.vue` for the map.

Conversely: the Brain-side `DocumentService.mimeFromPath()` knows the same extension map and sets the correct Mime when creating via `POST /documents` if the client does not provide a Mime.

## 10. Cross-Spec References

| Topic | Where documented |
|---|---|
| Editor Inventory (general) | [web-ui.md](/specs/web-ui) §3 |
| Mandatory Components + Style Guide | [web-ui.md](/specs/web-ui) §7 |
| JavaScript Sandbox (GraalJS) | [script-engine.md](/specs/script-engine) |
| Knowledge Graph + Document Kinds | [knowledge-graph.md](/specs/knowledge-graph) |
| Inbox + Notification Dispatcher | [user-interaction.md](/specs/user-interaction) |
