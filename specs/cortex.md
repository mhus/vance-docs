---
title: "Vance Cortex — Specification"
parent: Specs
permalink: /specs/cortex
---

<!-- AUTO-GENERATED from specification/public/en/cortex.md — do not edit here. -->

---
# Vance Cortex — Specification

> Status: v1. Binding product spec for the unified Chat + Document + Execute work environment of the web UI. Implementation resides in `client_web/packages/vance-face/src/cortex/` plus the backend in `vance-brain/src/main/java/de/mhus/vance/brain/{python,script}/cortex/`.
>
> See also: [web-ui.md](/specs/web-ui) | [script-engine.md](/specs/script-engine) | [user-interaction.md](/specs/user-interaction)

## 1. Definition and Scope

**Cortex** is the Project-bound work environment of the web UI: Chat, documents, and script execution in a browser Session, with the Chat Agent as an active companion to an edited Doc tab. Cortex replaces the older ScriptCortex (`scripts.html`), which no longer exists.

**What Cortex is:**

- A single editor (`cortex.html`) as a Multi-Page-App entry.
- Project file tree, multiple documents as tabs, persistent Chat panel on the right with a Help sub-tab.
- Client tools (WS) dynamically registered with the Brain, allowing the Agent to directly edit the chat-bound Doc.
- Run surface for executable Doc types (`.js` / `.py` currently), with Validate + Slart-Generate/Update as additional actions for JavaScript.

**What Cortex is not:**

- Not a real-time status mirror beyond the Chat — other editor data arrives via REST snapshot on page load (see [web-ui.md](/specs/web-ui) §1).
- Not a second Auth context: uses the same JWT Session as `chat.html`.
- No dedicated persistence layer: all edits go through the normal `documents`-REST endpoints.
- No dedicated scripting language. Cortex relies on the Brain-side `ScriptCortexController` (JavaScript via GraalJS) and `PythonCortexController` (Python via ExecManager + venv).

## 2. Entry and Data Model

Cortex is opened **exclusively from within a Chat**. `chat.html?sessionId=X` has an "Open in Cortex" button → `cortex.html?sessionId=X`. The Chat has a Project (mandatory in the Chat model), so the Cortex Project is known. No in-place Project change — different Project = new Cortex Session (new browser tab or close+open).

`ChatSessionDocument` carries two Cortex fields:

- `openDocumentIds: List<String>` — order of open tabs during the last Cortex visit.
- `chatBoundDocumentId: String?` — the Doc the Agent is working on (tools operate on it). Must be included in `openDocumentIds` or `null`.

Persisted via `PUT /brain/{tenant}/sessions/{id}/cortex-state` with body `{ openDocumentIds, chatBoundDocumentId }`. Restored on mount of the Cortex app.

## 3. Layout

```
+---------------------------------------------------------+
| Cortex · <Project> · <Chat Title>                  [x] |
+-----------+----------------------------------+----------+
|           | [Tab A *] [Tab B] [Tab C]  [+]  | [Chat][Help]
| File Tree +----------------------------------+----------+
|           |                                  |          |
|           |   Document Tab Shell             | Chat     |
|           |   (Toolbar + Body)               | History  |
|           |                                  |          |
|           |                                  | [input]  |
+-----------+----------------------------------+----------+
```

Three zones:

- **Sidebar (left):** `FileTreeSidebar` across all Doc paths of the Project (same `documents`-API as `documents.html`).
- **Main (center):** `EditorTabs` for open Docs plus a `DocumentTabShell` for the active tab.
- **Right-Panel (right):** `CortexRightPanel` with two sub-tabs — `Chat` and `Help`. Help changes per active Doc (see §6).

## 4. DocumentTabShell — Body Dispatch

A single tab shell that renders each Doc kind. Resolver: `resolveBinding(doc): DocTypeBinding`. Lookup order:

1. **`@vance/kind-registry`** first — `resolveKindFor(doc.kind, doc.mimeType)`. Captures addon-contributed Kinds (e.g., Calendar) plus all built-ins migrated to the Registry. Mounts `kindEntry.editor ?? kindEntry.view`. Uses `kindEntry.parse` / `kindEntry.serialize` if available, otherwise the View is fed with `:document="DocumentDto"` instead of `:doc="model"`.
2. **Hand-rolled Bindings** for the Kinds that `DocumentApp.vue` (in `src/document/`) still hardcodes dispatching: `tree`, `list`, `checklist`, `records`, `chart`, `sheet`, `graph`, `mindmap`, `slides`, `diagram`, plus `image`. Bindings reference the Views from `src/document/` directly — no Cortex-specific renderer classes.
3. **Catch-all `code`-Binding** — `CodeEditor` from `@vance/components` on the raw `inlineText`.

Four modes of the `BindingMode`-Enum:

- `'code'` — CodeEditor with text selection mirroring to the Cortex store (for `cortex_get_selection`).
- `'image'` — `ImageView`, read-only.
- `'typed-model'` — Codec-parsed `inlineText` → typed Model → View with `:doc`. On `@update:doc`, it is serialized back.
- `'kind-registry'` — structurally identical to `typed-model`, source of the pair is the `KindEntry`.

**Shell Toolbar (always):** Reload, Path, View/Edit-Toggle (typed-model + kind-registry only), Properties-Deep-Link (`↗`) to `documents.html`, Dirty-Indicator (`●`), Debug-Pill `[binding-id] mime-type` with Tooltip `binding=… mode=… kind=… mime=…`.

**Toolbar per mode additionally** (see §5).

**Parse-Error-Fallback:** typed-model + kind-registry parse `inlineText` on-render. In case of error, the Shell shows an error banner and a `CodeEditor` on the raw text, so the user can fix the malformed file.

## 5. Run / Validate / Slart — Language Adapters

Run capability is orthogonal to the Doc type binding. `resolveRunAdapter(doc): RunAdapter | null` finds the appropriate language adapter for each Doc.

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

Active Adapters:

| Adapter | Match | Backend Endpoint | Transport | Log Streaming |
|---|---|---|---|---|
| `jsRunner` | `.js` / `.mjs` / `.mjsh` / `.cjs` or `*/javascript` | `POST /brain/{tenant}/scripts/execute` + `script-execution-*` WS events | WebSocket Push + Polling Fallback | Live |
| `pythonRunner` | `.py` or `text/x-python` | `POST /brain/{tenant}/python/execute` + `GET /brain/{tenant}/python/executions/{id}` | REST + Polling (1.5 s interval) | ~1.5 s Latency |

An adapter is registered in `cortex/runners/runnerRegistry.ts`. New language (Shell, R, …) = new adapter entry, Shell + Backend-REST analogous.

**Save-before-Run:** If the tab is dirty, the Shell flushes synchronously before the adapter call (`store.saveTab`). The backend path loads the Doc body via `scriptId` from MongoDB — without pre-save, the previous state would run.

**UI in Toolbar:** `▶ Run X` button, Args input (single-line JSON, default `{}`), Cancel button during Running. Log panel slides up below the editor (collapsible, max 45% height), shows Status badge + Duration + color-coded log lines + Result. Close button detaches the handle (backend job continues).

### 5.1a Script Document API

Every Cortex Run has internal access to the Project documents of its owner Project via `vance.documents.*` — `read`, `write`, `list`, `exists`, `delete`, `meta`. JS sees this as a native host binding, Python via bundled `import vance` over loopback-REST. The contract, ENV variables, SCRIPT_RUN-JWT format, and label convention are defined in [script-document-api.md](/specs/script-document-api) — the `cortex.runId` label described there flows back into the Runs listing logic (future Cortex Runs panel).

### 5.2 PEP 723 Inline-Dependencies (Python)

`PythonExecutionService` parses the PEP-723 block (`# /// script ... # ///`) in the Python source and installs declared `dependencies` into the Project's venv before the script runs. A hash marker `.vance_inline_deps_hash` in the RootDir caches the last successfully installed state — unchanged Deps skip the pip step. Failed pip leaves the marker unchanged, the next Run tries again.

### 5.3 Validate + Slart (JavaScript only)

Additional toolbar buttons if `runAdapter.id === 'js'`:

- **`✓ Validate`** opens `CortexValidateDialog` (Modal). Quick-Validate (Parse + JSDoc-Header + Tool-Allowlist via `POST /scripts/validate`) + Deep-Validate (LLM-Review via `POST /scripts/validate-deep`, server-side cached by content hash). Backend internally delegates both endpoints to `HactarService.validate(...)` and `HactarService.deepValidate(...)` respectively. Cached Deep-Review appears with indicator *"matches current"* / *"content changed since"*.
- **`✨ Generate`** (visible if editor is empty / new Script Doc) opens `CortexHactarDialog` with `mode=CREATE`. Description input + Submit via `POST /scripts/generate { mode: "CREATE", prompt }` with polling on `GET /scripts/generations/{id}/result`. Backend spawns Slart with `outputSchemaType=SCRIPT_JS`.
- **`✨ Update`** (visible if editor has content) opens the same dialog with `mode=UPDATE`, additionally sends `existingScriptId` + optional `failureReason` (from a last FAILED Run from the Run panel). Slart's `JsScriptArchitect` injects the existing Script as an "EXISTING SCRIPT" block + the Failure Reason as a "what to fix" hint into the user prompt. *"Apply to editor"* writes the new code via `update`-Emit through the normal pipeline (dirty → auto-save).

Python has no Validate/Generate endpoints — the buttons are then hidden.

## 6. Chat-Binding and Help-Tab

**Bind-Pointer:** Exactly one Doc is chat-bound at a time. Topbar shows the bound Doc as `🔗 path/of/file`. Agent's tools target this — the user-visible active tab (`activeDocument`) can differ.

Auto-Bind: first opened Doc after Restore. Auto-Prune: if the bound Doc is closed, the Bind switches to the first remaining tab. Manual Binding: button click in the Topbar.

**URL-Sync:** the active tab is mirrored in `?doc=<documentId>`; browser back/forward navigates through the tab history.

**Right-Panel — Chat + Help:** `CortexRightPanel` has two sub-tabs.

- *Chat* — `CortexChatPanel`, own WS connection, Tool Service attachment, Message stream. Remains mounted (`v-show`) when Help is active, so the WS and message buffer survive.
- *Help* — `CortexHelpPanel`. Loads Markdown via `useHelp`-Composable (`help/{lang}/{path}`). Path resolution in `cortex/help.ts`:
  1. `runAdapter.id === 'js'` → `script-cortex.md`
  2. `runAdapter.id === 'py'` → `python-cortex.md`
  3. `kind-registry`-Binding → `doc-kind-<kindId>.md` (convention)
  4. Hand-rolled Binding → fixed mapping in `BINDING_HELP`
  5. Default → `cortex.md`

Missing Help file (404) → hint *"No help available"*, no crash.

## 7. Client Tools via WebSocket

Cortex registers a **small UI state tool set** with the Brain per Session (`CortexClientToolService.attach(ws)`):

- `cortex_get_selection` — returns the current text selection in the active tab (Code + Markdown — typed Views have no selection adapter in v1).
- `cortex_get_active_tab` — which Doc is currently in the foreground (can differ from the chat-bound Doc).
- `cortex_open_file` — open / bring user tab to foreground in Cortex.

**What is NOT here anymore:** the body mutations family (`cortex_read` / `cortex_edit` / `cortex_append` / `cortex_write`). Document edits by the Agent run via the regular server-side `doc_*`-Tools since the refactor (`planning/cortex-document-invalidation.md`). Cortex is informed via `DOCUMENT_INVALIDATE`-frames on the Session WS and fetches fresh content via REST — buffer coherence via 3-way-merge on dirty State.

**WS-Frames:**

- Client → Brain: `client-tool-register { tools: ToolSpec[] }`
- Brain → Client: `client-tool-invoke { name, params, correlationId }`
- Client → Brain: `client-tool-result { correlationId, result, error? }`
- Brain → Client: `document-invalidate { documentId, path, kind }` — Side-Channel-Frame, tells the tab that the server has just mutated a Doc of this Session.

Tool set is static per Session — tab switch does not change the registered set, but only shifts the bind pointer resolution internally.

**"AI editing..."-Banner:** is currently derived from the frequency of `DOCUMENT_INVALIDATE`-frames (client-side — no server involvement, no additional LLM contract). Visible as long as frames arrived within the last ~1.5s.

## 8. Save Strategy

- **Auto-Save with debounce ≈ 2 s** per Doc. Watcher on `(id, inlineText.length, dirty)` key tuple.
- **Dirty-Indicator** (`●`) in tab header + in DocumentTabShell toolbar.
- **Flush on**: tab close, tab switch (away from old tab), Cortex close, `beforeunload` handler.
- **Pre-Run-Flush** synchronously in `onRun()` (see §5.1).

`store.saveTab(id)` writes via `PUT /brain/{tenant}/documents/{id}/content` with body as raw text. Content-Type is the current Mime of the Doc; the server reclassifies if necessary.

## 9. Path-Extension-MIME-Bias

The server typically delivers `text/javascript`/`text/x-python`/`text/typescript` for `.js`/`.py`/`.ts`/..., but not every file has this (upload, migration, third-party systems). The Shell derives the **language for syntax highlighting from the file extension**. Server MIME is a fallback for unknown extensions. Map see `effectiveMimeType` in `DocumentTabShell.vue`.

Conversely: the Brain-side `DocumentService.mimeFromPath()` knows the same extension map and sets the correct Mime when creating via `POST /documents` if the client does not provide a Mime.

## 10. Cross-Spec References

| Topic | Where documented |
|---|---|
| MPA Editor Inventory (general) | [web-ui.md](/specs/web-ui) §3 |
| Mandatory Components + Style Guide | [web-ui.md](/specs/web-ui) §7 |
| JavaScript Sandbox (GraalJS) | [script-engine.md](/specs/script-engine) |
| Knowledge Graph + Document Kinds | [knowledge-graph.md](/specs/knowledge-graph) |
| Inbox + Notification Dispatcher | [user-interaction.md](/specs/user-interaction) |
