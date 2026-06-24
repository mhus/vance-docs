---
# Eddie — Eddie Hub Engine

> **Eddie** is the **Hub Engine** — the personal Jarvis-like conversational partner from which the user creates, observes, and controls Projects. Eddie is a regular Engine that runs in the **User Project** (`_user_<username>`) and directly handles user-related tasks there (notes, research, ad-hoc calculations, client file operations). Content-related work in **domain-specific** Projects (code refactoring, domain workflows, …) happens in Worker Engines (`arthur`, `marvin`, `ford`, …) within the target Projects — Eddie delegates to them via Working WS and consolidates the outputs. Eddie also uses the *organizational-tools* category (detailed spec pending) for its hub function.
> See also: [arthur-engine](arthur-engine.md) (Engine framework, Inbox mechanics) | [think-engines](think-engines.md) (Registry, Lifecycle) | [recipes](recipes.md) (Recipe mechanics) | [architektur-scopes-clients](architektur-scopes-clients.md) (Scope hierarchy, Sessions) | [engine-message-routing](../engine-message-routing.md) (Working WS, Cross-Project communication)

---

## 1. Role and Classification

### 1.1 Use Case

The user connects to the system and **always lands in the same hub chat**, regardless of which Project they are currently working on. Example dialogue:

> **User:** "Eddie, analyze the software for security vulnerabilities and create a plan to eliminate them."
> **Eddie:** "Okay, I'll create a `security_audit` Project with a Marvin Engine and start the analysis. I'll let you know when the first findings are available."

The Hub is the user's **permanent entry point**. Projects are **tools** that the Hub creates and manages for them.

### 1.2 Delimitation

Eddie is a reactive Engine like Arthur (no `done` status, only `ready` / `blocked` / `suspended` / `stopped`), but structurally different:

| Aspect | Arthur (in Project) | Eddie (in Home) |
|---|---|---|
| Position | One per Session in a domain-specific Project | One per Session in the User Project (`_user_<username>`) |
| Task | Content-related work on the Project topic | User-related direct work + creating, observing, coordinating Projects |
| Tools | Content-related tools of the target Project (Workspace, RAG, MCP, spawning sub-workers) | User-related tools (Web, Client-File-Ops, own Docs/Scratchpad/Knowledge-Graph, local Workspace with Pod caveat) **plus** Hub tools (`organizational`: Project management, Process observation, Inbox forwarding) |
| Cross-Project Communication | No — Worker spawn only in the same Session | Yes — Eddie is a client to Arthur via Working WS in external Projects (see [engine-message-routing](../engine-message-routing.md)) |
| Personality | Domain-focused, problem-solving | Conversational, concise, "Jarvis vibe" |
| Shared State across parallel Sessions of the same User | No | Yes — Activity Log + Peer Events + Bootstrap Recap |
| Output Routing | Passed through unchanged | Type-based routing of incoming WS messages (pass feedback, process chat) |

Eddie reuses Arthur's **chat machinery** (drain-once-per-turn, streaming tool loop, prompt building from `process.promptOverride`) through internal delegation. This saves code duplication. However, Eddie is an **independent Engine** — the five structural points above are not configurable via Recipes but exist as code in `EddieEngine`.

**Plan Mode Support.** Eddie consumes the same shared Plan Mode layer (`PlanModeActionSchema` + `PlanModeService`) as Arthur. The `EddieActionSchema` unions the four Plan Mode action types (`START_PLAN` / `PROPOSE_PLAN` / `START_EXECUTION` / `TODO_UPDATE`), and `EddieEngine.handleAction` calls `planModeService.dispatch(...)` at the beginning and only delegates to Eddie's own switch as a fallback. Plan Mode in Eddie is useful for multi-step tasks within the Hub in the User Project; `DELEGATE_PROJECT` to Arthur is explicitly *not* a Plan Mode case (that is already Plan Outsourcing). Details: [plan-mode](plan-mode.md).

**Consequence: no `eddie` Recipe.** Persona, Prompt, Params, Tool Cut are provided directly by `EddieEngine` (`bundledConfig()` mechanism, see `EngineBundledConfig`). The Recipe Resolver is bypassed for Hub Sessions. Other Engines (Arthur, Ford, Marvin, Vogon, Zaphod) remain Recipe-driven as before.

### 1.3 What Eddie is NOT

- **Not a multiplexer.** One Eddie Process serves **one** Session with **one** Connection. Multiple devices → multiple Eddie Processes; sync happens via §6, not via shared conversation state.
- **Not a singleton per user.** There can be any number of parallel Hub Sessions per user, each with its own Eddie Process.
- **Not a content worker in external Projects.** Eddie works **directly** on user-related tasks (notes, research, ad-hoc scripts on the user's machine), but **not** on domain-specific Project topics. If the user says "analyze our code repo for security vulnerabilities," **Eddie creates a Project** (or attaches to a suitable existing one) and delegates. If the user says "calculate prime numbers up to 100," Eddie writes the script itself and executes it — directly in its own User Project.
- **Not a cross-Tenant personality.** Eddie is Tenant-isolated; what eddie@tenantA does, eddie@tenantB does not see.

---

## 2. Bootstrap — Location in the Scope Tree

Eddie is not a special form in the data model. It lives in a **completely normal Project** that is automatically created per user during onboarding.

### 2.1 Location

```
Tenant <tenantId>
 └── Project Group "Home"           (one per Tenant)
      └── Project "_user_<username>"   (one per User, kind = SYSTEM)
           └── Hub Session(s)             (0..N parallel Sessions, one per Connection)
                └── ThinkProcess "eddie"  (Engine: eddie, Recipe: eddie)
```

- **Project Group `Home`** is a normal `ProjectGroupDocument`, once per Tenant.
- **Project `_user_<username>`** is a normal `ProjectDocument` with the new field `kind: SYSTEM` (see §2.3). The underscore prefix `_user_` is a naming convention for "user container, not a domain-specific Project." The ACL owner is the user; other Tenant members have **no** access (by default — privacy for personal notes / user preferences).
- **Hub Session** is a normal `SessionDocument` of type `INTERACTIVE` with `defaultChatEngine = eddie`.
- **Eddie Process** is a normal `ThinkProcessDocument`, spawned by the `SessionChatBootstrapper` like any other Chat Engine — the choice of Engine is just a setting.

### 2.2 Bootstrap Trigger

Upon a user's first login (or service boot, if not already done), the `HomeBootstrapService` (in `eddie-shared` or `eddie-brain`) idempotently ensures that:

1. Project Group `Home` exists (otherwise: create).
2. Project `_user_<username>` with `kind: SYSTEM` exists (otherwise: create).
3. Setting `home.project.id` is set at the user settings level.

Sessions in the User Project are **not** automatically created upon login — they only arise when the client requests to "open Hub Chat." A Connection then binds to an existing unbound Hub Session or triggers the creation of a new one (Connection routing detail, see [websocket-protokoll](websocket-protokoll.md)).

### 2.3 Project Identification

New field on `ProjectDocument`:

```java
public enum ProjectKind {
    NORMAL,   // classic Projects
    SYSTEM    // System/Hub Projects, hidden by default in the UI
}
```

| Effect of `kind = SYSTEM` | |
|---|---|
| Editor lists / Project switcher | filter `SYSTEM` by default |
| `project_list` tool (for other Engines) | `kind` filter is a mandatory parameter, default = `NORMAL` |
| Deletion protection | UI offers no delete button; API rejects delete for `SYSTEM` (`409 Conflict`) |
| Memory Cascade | unchanged — Eddie inherits Tenant and Home Group Memory like any other Project |

The field is generic. Future System Projects (e.g., a "Tenant Admin Hub" for multi-user Tenants) can use the same flag.

### 2.4 Pod Affinity — User Project has no Home Pod

The User Project is the **only** Project class **without** a fixed Home Pod (unlike all domain-specific Projects, which have a `ProjectDocument.homeNode` Home — see [execution-und-persistenz §3.1](../execution-und-persistenz.md)). Eddie lives on the Pod where the user's WS currently lands — potentially a different Pod upon reconnect. Rationale: multi-Pod clusters with random WS routing; Eddie should be able to start on any Pod without Pod-affine migration choreography.

**Consequences for tools in the User Project:**

- **Pod-agnostic tools** are permanently usable: Mongo-based (Docs, Scratchpad, Knowledge-Graph, Relations, Data), Web (`web_search`, `web_fetch`), Client tools via User WS (`client_*`).
- **Pod-local tools** only work "as long as the current WS holds" — reconnecting to another Pod means state loss. This affects: Server Workspace files, RAG index, long-running Server execution.
- **Local sub-worker spawn** is possible, but only for **short-lived, Pod-agnostic** workers (typically Ford as a single-LLM quick worker with pure Mongo state, seconds lifetime). Long-running orchestrators with their own tree/phase state (Marvin, Vogon) belong in domain-specific Projects with a Home Pod, not in the User Project.
- **Eddie ↔ Arthur** in domain-specific Projects always happens via Working WS (cross-Pod pattern from [engine-message-routing](../engine-message-routing.md)), even if Eddie happens to be on the same Pod — no same-Pod shortcut.

---

## 3. Sessions in the User Project

### 3.1 Multi-Login = Multi-Session

A `Connection` binds to exactly one `Session`. A `Session` has **0 or 1** Connection at any time (like [architektur-scopes-clients §2](architektur-scopes-clients.md) — no special rule for Eddie).

If Mike works on a laptop and phone simultaneously:

```
Mike's User Project
 ├── Hub Session A  ←  Connection (Laptop)  →  Eddie Process #A
 └── Hub Session B  ←  Connection (Phone)   →  Eddie Process #B
```

Both Eddie Processes are **independent**. They do not share conversation state. They synchronize via §6.

### 3.2 Session Lifecycle

- **Creation:** upon "open Hub Chat" connect request, if no unbound Session exists.
- **Suspend:** Connection lost → Session becomes `suspended`, Eddie Process becomes `suspended` (standard suspend cascade).
- **Resume:** upon the next connect, a Connection takes over an existing `suspended` Session — or opens a new one if the user's old Sessions are too old (threshold via setting; specific rule open, see §11).
- **End:** no automatic deletion. Sessions can be explicitly closed; otherwise, they age out (archiving strategy, also §11).

### 3.3 Session Count

There is **no technical upper limit**. UI/Recipe can provide a soft recommendation ("you have 6 open Hub Chats — do you want to continue one of them?"), but the system does not enforce anything.

---

## 4. Tools — User-Related plus Hub Function

Eddie's activated tool set is configured via Recipe + Project Settings, like any other Engine. Three spheres are included in the default Eddie Recipe.

**Engine Base:** `EddieEngine.allowedTools() = Set.of()` — no hardcoded Java list. The bundled Recipe `eddie.yaml` is the single source of truth (see [recipes §6.1](recipes.md)). It classifies by label: read-only tools remain primary (LLM-Catalog), `@write` / `@executive` / `@side-effect` land in the Discovery block (auto-activate on first direct call). Destructive bulk ops (`doc_purge`, `rag_delete`, `kit_apply`, `workspace_delete`, …) are excluded via `allowedToolsRemove` — they are not dispatchable, not even via Action Handler.

**Discovery via `DISCOVER` Action.** Eddie also has a structural Discovery entry point: the continuing action `type=DISCOVER` with `intent: "<term>"` calls `DiscoveryService` synchronously and passes the result as a Tool Result to the Action Loop. Used when the user mentions a term Eddie doesn't know (Vance jargon, Kit feature, invented word). The `how_do_i` tool remains available for proactive mid-turn lookups. Spec: [how-do-i §1a](how-do-i.md).

**Own Hub as Workspace.** Eddie's User Project (`_user_<userId>`) is `ProjectKind.SYSTEM`, but Eddie is allowed to execute content tools (`doc_create`, `doc_edit`, `list_*`, `tree_*`, …) there — they are its own. Other SYSTEM Projects (tenant-wide `_tenant`, other user Hubs) remain locked for content operations. Implementation: `EddieContext.resolveProject` allows SYSTEM Projects through if `project.name == HomeBootstrapService.hubProjectName(ctx.userId())`.

### 4.1 Hub Tools (Tool Category `organizational`)

Control domain-specific Projects and their Workers. Detailed spec: *organizational-tools* (detailed spec pending) (we are writing it in parallel).

| Tool | Function |
|---|---|
| `project_create(name, title, recipe?)` | Create a new domain-specific Project. The system automatically bootstraps Session + standard Chat Process (Engine via Recipe) on the new Project's Home Pod; Eddie then connects via Working WS. **Project management, not a spawn tool.** |
| `project_list(filter?)` | List user's Projects |
| `project_open(name)` | Read Project metadata + open Sessions/Processes; implies Working WS connection to the standard Chat Process if necessary |
| `project_archive(name)` | Archive Project (no delete) |
| `process_observe(processId, channelMode)` | Set channel mode for the Working WS to an external Process (see §7) |
| `process_command(processId, command)` | Stop/Pause/Resume an external Process via Working WS |
| `inbox_forward_to_user(item)` | Push something to the user's Inbox editor instead of saying it in chat (see [user-interaction](user-interaction.md)) |
| `peer_notify(message)` | Inform other Eddie Sessions of the same user (see §6.3) |

Cross-Project communication consistently runs via Working WS (see [engine-message-routing](../engine-message-routing.md)) — Auth via User-JWT pass-through plus internal token, permission checks user-based on the respective Home Pod.

The `organizational` category is **not Eddie-exclusive**. Future Recipes (e.g., a "PM Hub") can activate the same category with a different prompt prefix.

### 4.2 User-Related Tools (in the User Project)

Eddie acts in the User Project like any other Engine in its Project — it has Workspace, Docs, Scratchpad, Knowledge-Graph for **user-related** content: user preferences, Persona notes, personal Memory records, ad-hoc tasks ("calculate prime numbers up to 100" → script in Workspace, execute, deliver result).

Default tool families:

- **Web** (Pod-agnostic): `web_search`, `web_fetch`
- **Own Docs / Scratchpad / Knowledge-Graph** (Mongo-based, Pod-agnostic): `doc_*`, `scratchpad_*`, `relations_*`, `data_*`
- **Local Workspace + Exec** (Pod-local — see §2.4 Pod caveat: only "as long as the current WS holds"): `work_exec_run`/`work_exec_kill`/`work_exec_status`
- **Client Tools** (on user's machine via `CLIENT_TOOL_INVOKE`, Pod-agnostic as user-WS-driven): `client_file_read/list/edit/write`, `client_exec_run/kill/status`, `client_javascript`

**RAG** is **conditionally** available in the User Project — the index is Pod-local, does not survive a reconnect to another Pod. For persistent user Memory, the Knowledge-Graph (`relations_*`) is preferred.

### 4.3 Local Sub-Worker Spawn

Eddie can locally spawn **short-lived, Pod-agnostic** sub-workers in the User Project — typically Ford as a single-LLM quick worker with pure Mongo state and seconds lifetime. The spawn tool is `process_create` as in any other Project; this is the same mechanism Arthur also uses.

**What Eddie does not spawn locally:** Long-running orchestrators with their own tree/phase state (Marvin, Vogon). These have Pod-affine Lane state and belong in domain-specific Projects with a Home Pod — Eddie delegates to them via `project_create` + Working WS.

---

## 5. Voice & Language

Eddie's output is **by default designed for voice** — the client (Mobile, Foot, Web) reads it aloud (TTS). This shapes both the action schema and the prompt conventions. Eddie is the voice Persona to the user, and the text-to-voice intermediary to workers.

### 5.1 Voice Default + Optional Visual Companion Channel (`info`)

In the structured action output (see [structured-engine-output](structured-engine-output.md)), two fields together form the output:

- **`message`** — Voice string. Read aloud by the client via TTS. Suitable for speech: short sentences, no Markdown, no code blocks, no ID/URL reading.
- **`info`** *(optional, new)* — Companion text. **Not** TTS rendered, only displayed as a visual block in the chat. Markdown, lists, short code snippets are allowed here.

Use case: Eddie says "I've summarized the three main points for you" (voice) and simultaneously shows the bullet points as text (visual). No Inbox item needed, the block is ephemeral (chat history) and complements the spoken answer.

Distinction from `RELAY_INBOX` (`EddieActionSchema`):

| Output Path | Voice | Visual | Persistence |
|---|---|---|---|
| `ANSWER` with `message` | `message` | `message` (same) | Chat History |
| `ANSWER` with `message` + `info` | `message` | `message` + `info` block | Chat History |
| `RELAY_INBOX` with `spoken` + `inboxTitle` | `spoken` | Inbox item announcement | Inbox Item |

`info` is additive — most short answers don't need it. Eddie uses it deliberately when the voice text alone doesn't convey the information (lists, data, comparisons).

### 5.2 Language Resolution

The language Eddie speaks comes from the `chat.language` setting (see [settings-system §3](settings-system.md) and `LanguageResolver`). Cascade `think-process → _user_<userId> → <projectId> → _tenant` — user default with Project override. Freely settable — `de`, `en`, `zh`, etc. Default is `en`.

If the user changes the language mid-session, the new language takes effect from the next Lane turn — the Prompt Resolver reads fresh per turn.

### 5.3 Speech Rules per Language

For each language, there is a separate prompt file with specific speech conventions that is included in Eddie's system prompt:

```
prompts/voice/eddie-voice-rules-<lang>.md
```

Example content for German:

> - Short sentences, ≤ 15 words.
> - Perfect tense instead of simple past: "ich habe gemacht" (I have done), not "ich machte" (I did).
> - No Anglicisms where German terms exist.
> - Do not read out URLs, IDs, or paths — instead, say "the Inbox entry" or similar.
> - …

**Resolution Cascade** (innermost wins) — same pattern as [recipes](recipes.md) §4 and Documents in general:

1. `<userProject>/prompts/voice/eddie-voice-rules-<lang>.md` — rare, individual.
2. `_vance/prompts/voice/eddie-voice-rules-<lang>.md` — Tenant default + self-bootstrap cache (see §5.4).
3. `classpath:vance-defaults/prompts/voice/eddie-voice-rules-<lang>.md` — bundled defaults, initial: `de`, `en`.

Lookup via `DocumentService.lookupCascade(tenantId, currentProjectId, "prompts/voice/eddie-voice-rules-<lang>.md")` — the same mechanism as for Recipes and Prompts.

### 5.4 Self-Bootstrap of Unknown Languages

If the cascade for a language is empty (e.g., user switches to `zh`, and there are no zh rules yet):

1. The current Lane iteration uses `eddie-voice-rules-en.md` as a fallback and still responds in the target language (LLM language capability is usually sufficient).
2. Asynchronously in the background, a `MetaPromptBootstrapService` triggers a meta-LLM call on `default:fast`:
   > "What speech conventions should a voice chat agent observe in <language>? List 5–8 specific rules, each with a short example. Output format: Markdown."
3. The result is persisted via `DocumentService.write(tenantId, "_tenant", "prompts/voice/eddie-voice-rules-<lang>.md", rules)`.
4. On the **next** Eddie turn, cascade level 2 takes effect — the generated rules are active.

The Tenant Admin can overwrite the generated file at any time via the Document Editors — cascade level 2 is a normal Document. Power tool for Eddie itself: `voice_rules_refresh(lang)` invalidates the cache and triggers regeneration (not in the default Recipe).

The final fallback remains `eddie-voice-rules-en.md` from level 3 — if the bootstrap call fails, Eddie continues with the English conventions.

### 5.5 Eddie's Intermediary Role in Worker Output

Workers (Arthur, Marvin, Ford) typically produce **written language** — Markdown, code blocks, long sentences. This is rarely suitable for voice. Eddie is the converter:

- **Short, speech-suitable worker responses** → `RELAY` (1:1 voice pass-through).
- **Written language, Markdown, code, long texts** → `RELAY_INBOX` (Inbox item + short voice hint in the `spoken` field).
- **Medium length, with structure** → `ANSWER` reformulated: `message` as a voice summary + `info` block for details.

In the voice default, **direct pass-through of worker Markdown is blocked**. Triage (see [`eddie-moderator-erweiterung.md`](../../planning/eddie-moderator-erweiterung.md)) honors this with adjusted thresholds — shorter length thresholds, Markdown/code detection automatically pushes towards INBOX instead of VERBATIM.

### 5.6 Direct User Dialogue — `ASK_USER` with Structured Options

When Eddie needs clarification from the user (before an action, in the middle of a plan execution, after a tool error), `ASK_USER` is the **direct chat path** — no Inbox redirection. The Process goes BLOCKED, the user's answer comes back as the next chat message, the Action Loop continues. Distinction from the Inbox path: Inbox items are for texts the user should read *later* or answer *asynchronously* (reports, long quotes, deferrable decisions). ASK_USER is the acute, in-line question — readable, one sentence is usually enough.

**Action Gate.** ASK_USER is **not a spawn action**: it does not start a worker, no cascade. Therefore, it is not in the `SPAWN_ACTIONS_FORBIDDEN_ON_EVENT_TURNS` gate (unlike `DELEGATE_PROJECT` / `STEER_PROJECT`). Eddie can ask at any time — even after a parent notification event, even in the middle of the Plan Mode execution loop, even without fresh user input. The Process pauses itself when BLOCKED.

**Schema Extension — Optional Pickers.** In addition to the mandatory `message`, `ASK_USER` may carry an optional `options` array:

```yaml
options:
  - label: "Private"
    description: "mhus@personal.de"      # optional, one line
  - label: "Work"
    description: "hummel@sipgate.de"
  - label: "All"
    description: "both sequentially"
```

`label` is the spoken-friendly short form (1–5 words), `description` is optional plain text for UI rendering. Validation: 2–4 options per question, `label` mandatory, empty/unset list → pure free-text question (default).

**When options, when free.** Rule of thumb in Eddie's prompt:

- **Set `options`** when the answer fits into a small, discrete selection: yes/no, A/B/C, a closed list of choices. The user ideally responds by click (UI) or a short word (voice).
- **Leave free** when the answer needs detail — date, path, multiple sentences, justification. No point in forcing a picker that doesn't support the variety.

**UI Render.** Today, the `ASK_USER` handler renders the options server-side as a Markdown bullet list in the chat text — every client displays this as a normal list. A later Web UI extension can read the `options` array as a structured side channel (action parameter survives in the server response frame) and render buttons; the user's click still results in a text reply (label text or free text).

**Wire Frame.** An action with options sends two representations per frame:

1. `ChatMessageAppended` with the rendered Markdown — compatible with any client.
2. The underlying `EngineAction.params[options]` is preserved in the Action History and retrievable via `chat-message-meta` (or similar) — UIs that want to render pickers read there and can overwrite the Markdown block.

In v1, only the Markdown render path is used. Structured buttons in the Web UI are planned as a subsequent step (see §11 Open Points).

**Answer Processing.** Regardless of whether the user clicks or types: the answer is `UserChatInput` with the corresponding text. Eddie has the answer as a regular user message in the history in the next turn — no special path, no polling, no Inbox round trip.

### 5.7 Hub Project Routing — Document Defaults

Eddie's Chat Process sits in the SYSTEM Hub Project `_tenant`. Tool calls like `doc_create` without an explicit `projectId` default to the current Project context = `_tenant` = SYSTEM → server rejects (`Project '_tenant' is SYSTEM (hub project) — this operation requires a regular user project`).

Eddie bypasses this in the system prompt: `composeUserContextBlock` injects an explicit routing hint as soon as `process.projectId == _tenant`:

```
**Routing — where user-facing artifacts land:** this chat sits in
the tenant hub (`_tenant`, SYSTEM). Any document, scratchpad, or
workspace write the user asked for must target the user project
`_user_<login>`. Always pass `projectId="_user_<login>"` to
doc_create, doc_edit, work_file_write, etc.
```

LLM compliance is high but not 100%. A future tool-level fallback (caller Process in SYSTEM Hub → automatically redirect to User Hub) would fix this completely — today we rely on the prompt hint + the clear error message that guides the LLM back to the correct path (with `actionLoopCorrections` as a pacemaker, see [plan-mode §14a](plan-mode.md)).

This is a temporary workaround. The clean architecture — `myProjectId` (Engine-owned) + `currentRemoteProjectId` (Eddie only, for Hub routing) — will be implemented with the planned Engine Process Context refactor (see `instructions/eddie-engine.md`).

### 5.8 Cross-Engine `ASK_USER` with `options` — Eddie as Pass-Through

Worker Engines (Arthur, Marvin, …) cannot establish a direct voice/chat connection to the user themselves — they run in their own Projects, the user's WS is connected to the Eddie Hub. If Arthur needs clarification (in the middle of a plan execution, after a tool error), this happens through Eddie:

```
Arthur ASK_USER + options → BLOCKED                  [Worker Lane in Project]
   ↓ ProcessEvent BLOCKED (with relayable action-params)
Eddie sees Event                                    [event-only turn in Hub]
Eddie emits RELAY(source=arthur-name)
   → renderAskUserOptions(Arthur's question, options) [same render path as native ASK_USER]
   → ChatMessage to User WS + Meta Side-Channel
User responds (click or text)
   ↓ auto-forward to BLOCKED Worker
Arthur receives USER_CHAT_INPUT, continues
```

Transport mechanism (Phase 2 — see §11 Open Points for phase plan): `ProcessEvent` gets an optional field `relayableActionParams: Map<String, Object>`. Arthur's `summarizeForParent` for BLOCKED events fills this with the last emitted `ASK_USER.params.options`, if present. Eddie's RELAY handler reads the map, passes `options` to `renderAskUserOptions(...)` and posts the question just like a native Eddie question — Markdown render in chat plus the same meta side-channel convention.

**Why ProcessEvent instead of ChatMessage annotation.** ChatMessage is persistence: embedding an action parameter there as a meta field pollutes the history for an Eddie-specific round-trip optimization. ProcessEvent is the defined inter-Engine interface and already ephemeral — the correct transport.

**Consequence for Arthur.** Arthur also supports `ASK_USER.options` (schema parity with Eddie, same renderer). If Arthur talks directly to the user (Foot or Web Session WITHOUT Eddie Hub in front), Arthur renders the options itself as Markdown — same renderer, same result. If Arthur is under Eddie, the action proceeds as described above.

**Answer Routing.** Regardless of whether the user clicks or types — the answer is a USER_CHAT_INPUT with the corresponding text (label or free text). Eddie's existing auto-forward path to the BLOCKED worker remains unchanged; nothing Eddie-specific about the answer processing.

---

## 6. Knowledge Sync between Parallel Eddie Sessions

The use case requires: what Eddie #A just did, Eddie #B knows in the next turn. Three mechanisms, each with its own latency and purpose. **All three are Eddie-exclusive** — other Engines (Arthur, Marvin, …) know nothing about them.

### 6.1 Knowledge Graph (eventual, structured)

Eddie writes structured facts to the User Project's Knowledge Graph (see [knowledge-graph](knowledge-graph.md)). Examples:

```
Project(name="natural_disasters", owner=mike, createdAt=..., engine="marvin")
UserInterest(topic="historical events 19th century", confidence=high)
RunningProcess(processId=..., projectName="natural_disasters", status="running")
```

Visible to every Eddie Session of the user via the normal Memory Cascade (Project Scope = User Project). No new mechanism needed.

### 6.2 Activity Log (eventual, but recap-capable)

A Mongo collection `eddie_activity` (User-scoped, append-only):

```java
@Document("eddie_activity")
public record EddieActivityEntry(
    @Id ObjectId id,
    String tenantId,
    String userId,
    String sessionId,                 // Hub Session where this happened
    String eddieProcessId,
    Instant ts,
    ActivityKind kind,                // PROJECT_CREATED, PROCESS_SPAWNED, USER_STATEMENT, TOOL_CALL, …
    String summary,                   // one line, conversational
    @Nullable List<EntityRef> refs    // References to Projects / Processes / Inbox Items
) {}
```

**Writing:** after each **Lane turn completion** (i.e., exactly once per turn, not per tool call), additionally immediately after each `organizational` tool call (user-relevant state change should not wait).

**Reading:** during the Lane turn (or once upon resume), Eddie reads the last N entries of the last 3 days of **its peers** (`userId == self.userId AND eddieProcessId != self.processId`). Default: last 50 entries or 3 days, whichever is smaller.

**Direct Read, not via RAG.** The Activity Log serves **recap awareness**, not semantic search. Latency is Mongo read latency, i.e., sub-second.

### 6.3 Peer Notifications (push, immediate)

For truly relevant events (Project created, Process blocked, critical status), the writing Eddie sends a `PeerEvent` directly to the Inbox of the **other active Eddie Processes of the same user**.

```java
public record PeerEvent(
    Instant at,
    @Nullable MessageId idempotencyKey,
    ThinkProcessId sourceEddieProcessId,
    String userId,
    PeerEventType type,           // PROJECT_CREATED, PROJECT_ARCHIVED, USER_STATEMENT, …
    String humanSummary,
    @Nullable Map<String, Object> payload
) implements SteerMessage {}
```

`PeerEvent` is a new variant of the `SteerMessage` sum type (extension of [arthur-engine §2.3](arthur-engine.md)) — only processed by Eddie, other Engines ignore it (or reject it, depending on convention).

**Delivery:** as an insert into the `EngineMessageDocument` collection (see [engine-message-routing §3](../engine-message-routing.md)) with `senderProcessId = <sending Eddie>`, `targetProcessId = <receiving Eddie>`, `type = PEER_EVENT`. Atomic, persistent, Pod-agnostic. Auto-wakeup pulls the receiving Process out of `suspended`, it drains its Inbox, writes it to its conversation context, suspends itself again. On the next user input, it is there.

**Tool for this:** `peer_notify(type, summary, payload?)` — Eddie calls it either explicitly (Engine decides) or the Engine automatically emits it after certain tool calls (convention in Engine code, not in Recipe).

**Scope:** Hub→Hub only. Hub→Project and Project→Hub go via Working WS (see §8).

### 6.4 Conflict Protection

To prevent both Eddies from creating the same Project in parallel:

- Mongo compound index `(tenantId, userId, projectName)` with `unique = true`.
- The second `project_create` receives `DuplicateKeyException` as a Tool Result.
- Eddie interprets this conversationally ("your other Hub just created that — I'll join in").

### 6.5 Bootstrap Recap

Upon `start` or `resume` of an Eddie Process (i.e., when creating a new Hub Session or reactivating an old one):

1. Read Activity Log of the last 3 days.
2. Read Knowledge Graph snapshot of "active Projects."
3. If relevant: brief status output to the user ("Hi Mike. 2 minutes ago, your other Hub Chat created a Project `natural_disasters` — do you want to connect to it?").

---

## 7. Output Routing — Arthur/Marvin → Eddie → User

Eddie spawns Worker Processes in external Projects. Their output is typically long and detailed (LLM reasoning, tool call trails, findings). Eddie should **not read this 1:1**. Four modes, chosen during the `process_observe` call or during spawn:

| Mode | What Eddie receives | When useful |
|---|---|---|
| `verbatim` | All ProcessEvents 1:1 in the Inbox | Debug, explicit user request |
| `milestones` | Only status transitions: `started`, `blocked`, `done`, `failed`, gate pass | Default for voice / Hub Chat |
| `summary` | Like `milestones`, plus LLM summarizer pass on large outputs ("Marvin analyzed 47 files, 3 critical findings") | Long reports, when the user wants "the gist of it" |
| `inbox` | Eddie only receives acknowledgment; original goes as Inbox item to the user's Inbox editor (see [user-interaction](user-interaction.md)) | Reports the user wants to read at leisure |

### 7.1 Where the Transformation Happens

The channel adapter sits **on Eddie's side**, after the type routing of the Working WS (see [engine-message-routing §6](../engine-message-routing.md)). Specifically:

- Worker Engine (Arthur, Marvin, …) emits its normal frames to the Working WS — no intervention in the worker.
- Eddie receives the frames, classifies by type (`PROCESS_EVENT` / `PROGRESS` / `CHAT_RESPONSE` / …) and consults the `channelMode` it has stored per worker connection for the user pass-through decision:
  - `verbatim`: pass all frames 1:1 to the User WS.
  - `milestones`: pass only status transitions (`PROCESS_EVENT` with terminal type, gate pass hints), suppress all live token streams.
  - `summary`: like `milestones`, plus for `done`/`blocked` status, a summarizer LLM call in Eddie's own Lane before user pass-through.
  - `inbox`: push frame not to User WS, but to Inbox editor — Eddie itself only receives a mini-acknowledgment in the chat context.

The fact that the transformation sits on Eddie's side (instead of the worker Pod) is consistent: the `channelMode` is Eddie's configuration, not worker state; another observer (e.g., a second Eddie) could consume the same worker with a different mode.

### 7.2 Default for Eddie Connections

Upon the first connect to a worker (e.g., after `project_create`), the default mode is `milestones`. With `process_observe(processId, mode)`, Eddie can override this per worker connection.

### 7.3 Structured Side-Channel Frames — Pass-Through with `forwardedBy` Tag

The `channelMode` filters (§7.1) apply to **voice-relevant output** — chat stream, ProcessEvents with content, worker responses. Structured side-channel frames run **separately** and are **always** passed through (regardless of `channelMode`):

| Frame Type | Source | Target Field on User Client |
|---|---|---|
| `process-progress` (kind=METRICS\|STATUS\|PLAN) | Worker | HUD / Plan Panel / Toast Stream |
| `todos-updated` | Worker | TodoList Render |
| `plan-proposed` | Worker | Plan Banner |
| `process-mode-changed` | Worker | Mode Indicator |

Eddie passes these frames through with an additional **structured source tag** — not a text prefix, but an envelope field:

```json
{
  "type": "todos-updated",
  "data": { ... TodosUpdatedNotification ... },
  "forwardedBy": {
    "engine": "eddie",
    "processId": "<eddie-process-id>",
    "viaSession": "<eddie-session>"
  }
}
```

`forwardedBy` is an optional envelope field on all side-channel notifications (`vance-api/ws/`). The client filters/groups based on this tag (e.g., "only Eddie's own frames" vs. "all including worker-via-Eddie"). Without the tag = directly from the worker or from Eddie itself — no forward-hop marking.

**Why structured instead of text prefix:** Voice layer and Plan Renderer parse notifications mechanically — a text prefix `[via eddie]` would end up in the voice output or would have to be cut out in the Plan Render. Structured is robust.

**Triage delimitation:** Triage (see [`eddie-moderator-erweiterung.md`](../../planning/eddie-moderator-erweiterung.md)) does **not** apply to these frames. They are high-frequency, already structured, and an LLM triage call per plan update would be overkill. The Plan Mirror + Fusion Service from [`eddie-plan-mode.md`](../../planning/archive/eddie-plan-mode.md) consumes the worker plan frames laterally, without blocking the forward path.

---

## 8. Eddie as Client — Working WS to Worker Project

Eddie talks to Arthur in an external Project — this is the only inter-Project communication Eddie needs. It is important to separate Eddie's **two identities**:

| Towards | Identity | Transport |
|---|---|---|
| **Human** (Browser, eddie-foot, Mobile) | User-facing Chat Process | Working WS from the client (token streaming, live output) |
| **Arthur** (in external Project) | **Client** like a human | Working WS, server-initiated from the Eddie Pod, with User-JWT pass-through |

Eddie is a normal Chat Process to the human. **To Arthur, Eddie is also a client** — it behaves like an autonomous user chatting with Arthur over a Working WS. Eddie is **not a parent** of the Arthur Process; it has no cross-Project parent-child relationship. Permissions are purely user-based: Eddie passes the User-JWT, Arthur checks the user's permission for the Worker Project.

### 8.1 Mechanics

Eddie maintains a **stateful Working WS** to the Home Pod of the Worker Project for each active worker **Process**. Multiple workers in the same Project (parallel Arthurs/Fords) → multiple connections; one per Process, not one per Project. Complete mechanics (connect auth, persistence via `EngineMessageDocument`, at-least-once replay, connection lifecycle): [engine-message-routing](../engine-message-routing.md) §5.

**Connect Profile**: Eddie sends `profile: "eddie"` in the `engine-bind` frame (see [engine-message-routing §4.1.1](../engine-message-routing.md)). This marks the connection as a Hub client and controls tool availability on the worker side (see §8.4).

What Eddie sends to Arthur:
- `UserChatInput` (Eddie speaks to Arthur on behalf of its user)
- `ExternalCommand` for structured control (Stop, Pause, Resume)

What Eddie receives from Arthur: all frame types that Arthur also sends to a human client — filtered/transformed by channel mode (see §7) for user pass-through, plus structured side-channel forwarding with `forwardedBy` tag (see §7.3).

### 8.2 Impact on Suspend Cascade

Today: Session suspended ⇒ all its Processes suspended. This applies **per Session**.

With Eddie as a client to Arthur: if Eddie's Hub Session is suspended (connection lost), the Arthur Processes it observes in external Projects **do not automatically suspend with it**. Rationale:

- Arthur in an external Project has its own Session with its own lifecycle.
- If the user says "put that in the background," Arthur should continue working.
- Eddie's Hub Session is an observer (client), not the owner of Arthur's lifecycle.

Consequence for asynchronous events: if Arthur reports something while Eddie's Hub Session is `suspended`, the sender writes an `EngineMessageDocument` to Eddie's Inbox (via the associated Working WS, if still open, or directly via Mongo insert if the WS is closed). Eddie wakes up on the next resume, drains its Inbox, writes to the Activity Log and Knowledge Graph if necessary, then suspends itself again. On the user's next connect, they see the status in the recap (§6.5).

### 8.3 Memory Cascade across Project Boundaries

Workers in the target Project inherit Memory from: Tenant → Project Group (of the target Project) → Target Project → Worker Session → Worker Process. **Not** from Eddie's Hub Project — that would be lateral (between Projects) and is explicitly forbidden ([architektur-scopes-clients §1](architektur-scopes-clients.md)).

If Eddie needs to provide context to the worker ("user mentioned they are interested in the 19th century"), this happens via the initial `UserChatInput` to Arthur (Arthur treats the knowledge as a user statement and remembers it accordingly), not via Memory Cascade.

### 8.4 Tool Availability for Workers in Eddie Context

Workers addressed via Eddie (`profile=eddie` in connect, see §8.1) receive a **restricted tool set**:

- **Client tools** (`client_file_read/list/edit/write`, `client_exec_run/kill/status`, `client_javascript`) are **blocked**.
- Server-side tools (Workspace, Docs, Web, Knowledge-Graph, etc.) remain available.

**Rationale — two orthogonal problems:**

1. **Routing ambiguity.** Client tools are sent by the Brain as `CLIENT_TOOL_INVOKE` messages to the User WS. In the Eddie topology, the User WS is bound to Eddie's Hub Session, not the Worker Session. If Arthur calls a client tool, the system doesn't know which of the potentially multiple parallel user Sessions the request goes to — and certainly not where the result returns. A forwarding choreography with correlation IDs between two WS worlds would be fragile and conceptually unclean.
2. **Suspend cascade.** A worker tool call with wait time (e.g., `client_exec_run` with long runtime) would wait on the worker Pod. If Eddie's User WS disconnects during that time (reconnect, Pod change), the worker hangs — and cannot easily reattach to the new Session upon reconnect.

**Mechanism:** Tool filtering happens via `Tool.allowedForProfile()` (see [engine-message-routing §4.1.1](../engine-message-routing.md)). Client tools set `allowedForProfile = Set.of(Profiles.FOOT, Profiles.MOBILE)`. Other tools have the default (empty set = unrestricted, any profile can invoke). The `ContextToolsApi` resolver prunes the tool set before the LLM call — physically, not via permission layer denial. The LLM does not even see the blocked tools in the tool manifest and cannot call them.

**UX consequence:** If the user needs client operations (editing files on their machine, executing scripts there), they must speak **directly to Arthur**. There are two ways to do this: explicitly switching to the Project (own Session binding), or **mediation** by Eddie (§8.5) — Eddie mediates a direct connection User ↔ Arthur, instead of building a forwarding path.

### 8.5 Session Switch (Mediation as Use Case)

Mediation elegantly solves the §8.4 bottleneck: instead of forwarding client tools via Eddie, **the client switches its WS to a worker Session**. Eddie provides the switch command; the actual switch is done by the client with close+reopen. During "mediation," the User WS runs directly to the worker — Arthur sees the client with the original profile (typically `foot` or `web`), full tool set including client tools.

The frame primitive (`switch-to`) is generic and not mediation-specific — future flows (Project tabs, peer Hub hops, multi-Project context switch) can reuse it without new wire types.

#### 8.5.1 Mechanics (Client-driven)

```
Before Switch:
   User WS ──bind──▶ Eddie Session (profile=foot|web — from client)

MEDIATE Action triggered:
   1. Eddie sends `switch-to` notification with targetSessionId + Project label
   2. Client remembers current Eddie Session ID as `previousSessionId`
   3. Client closes WS
   4. Client opens new WS, session-resume on targetSessionId
   5. UI shows banner "directly with Arthur in <Project>"

During Switch:
   User WS ──bind──▶ Worker Session (profile unchanged from client)
   Eddie Process continues normally — just doesn't receive user input.
   Any Eddie outputs (RELAY on Process Events or similar) are lost
   on live notifications, but persist as chat history and appear
   upon return.

Switch-back (three ways):
   - User slash command `/hub` (Web/Foot) — client-local: close + reopen + resume previousSessionId.
   - Server push `switch-back` (v2) — e.g., auto-return on worker termination. Client handles it symmetrically to /hub.
   - "Back to Sessions" button — goes via the regular picker path, not the switch stack.
```

No server state persistence, no Eddie mediation flag, no Lane pause. The back stack lives solely in the client. Brain restart is therefore a no-op for switch state.

#### 8.5.2 `MEDIATE` Action

Action type in `EddieActionSchema`:

| Field | Type | Meaning |
|---|---|---|
| `type` | `"MEDIATE"` | Branch selector |
| `target` | String | Worker Process name or ID, or Project name (fallback: most-recent Session with chatProcessId in that Project). |
| `reason` | String | Audit + voice explanation |
| `voiceAnnouncement` | String (optional) | What Eddie says before the switch ("I'm now connecting you directly to Arthur — say `/hub` if you want to return to me") |

The `voiceAnnouncement` travels with the `switch-to` frame. How the client renders it is client policy (Web shows it in the banner, Foot as the final terminal line before disconnect).

#### 8.5.3 Eddie's Lane during the Switch — Continues Normally

Eddie does **not** go into `suspended`, no `mediation` flag, no Lane skip. The ProcessStatus remains `ready`, the Lane reacts to all triggers (scheduler, worker Process Events, Peer Events) as always. **What changes is only that no user input arrives** — it is currently addressed to Arthur.

Consequence for concurrent Lane turns during the switch:
- Eddie can emit RELAY/RELAY_INBOX/ANSWER, based on, e.g., an incoming `<process-event>` from the worker.
- Live notifications (e.g., `process-progress`, `todos-updated` to Eddie's Session WS) are lost because no one is connected.
- `chat-message-appended` persists in the DB. When the user returns later via `/hub`, the chat history fetch loads the intermediate messages — resulting in a natural "While you were away..." trail.
- Schedule triggers (auto-dream, heartbeats) run their normal course — no mediation awareness needed.

This is consistent: Eddie as an Engine is not "paused," it is simply **currently undisturbed**. Upon user return, it drains the Inbox normally if necessary.

#### 8.5.4 Switch-Back

Three ways:

- **Client slash command `/hub`** (Web/Foot) — purely client-local. Client performs close + reopen + session-resume on the remembered `previousSessionId`, drops the banner. Server is unaware; from the server's perspective, it's a normal WS re-binding.
- **Server push `switch-back`** (v2, optional) — e.g., if the worker Process terminates and Eddie wants to actively call the user back. Frame payload optional; client performs the same close+reopen flow.
- **"Back to Sessions" button** (Web) — leaves the current Session via the picker view. This is a normal Session logout, not the switch-back path; the local back stack is discarded.

#### 8.5.5 Capability Gating

Before each `MEDIATE` call, Eddie checks the profile capabilities of the current User WS binding (see [engine-message-routing §4.1.1](../engine-message-routing.md) Capability Mapping):

- `canMediate=true` (profile `foot` or `web`) → MEDIATE allowed.
- `canMediate=false` (profile `mobile`) → MEDIATE **rejected**, Eddie responds instead with `ANSWER` + voice explanation. Mobile has no slash command and no UI button for `/hub` — the user would be stranded on the worker without a way back.

#### 8.5.6 Brain Restart

Since no server state is persisted, Brain restart is a no-op regarding the switch. Both WS connections die with the old JVM. The client reconnects by choice: it likely has the worker Session in URL/localStorage as activeSessionId, goes directly there via session-resume. The banner is gone (local state lost), but the user talks normally to Arthur — and can return to the Eddie Session at any time via "Back to Sessions."

`/hub` does **not** work as a recovery path after restart — the client no longer has a `previousSessionId`. This is consistent: switch is a live UX, not a persistent Session topology.

---

## 9. Cross-Pod Model

Eddie uses the general multi-Pod pattern from [engine-message-routing](../engine-message-routing.md), but with asymmetric Pod binding:

- **Incoming (User → Eddie):** User WS lands on a random Pod → this Pod becomes Eddie's run Pod for the lifetime of the connection. There is **no** User Project Home for tunneling, because the User Project has no Home Pod (see §2.4). Reconnect = potentially different Pod = Eddie Process is restarted there from Mongo state.
- **Outgoing (Eddie → Arthur in domain-specific Project):** Working WS to the fixed Home Pod of the Worker Project, with `EngineMessageDocument` persistence for at-least-once guarantees.

There is **no Eddie special case** in the wire format. The protocol is locally and remotely identical (Working WS, EngineMessage Inbox); the only difference is the TCP path. Deliberately kept the same so that single-Pod dev and multi-Pod production use the same code path.

Pod discovery for outgoing connections (which Brain endpoint holds the Worker Project?) happens via the ProjectManagerService — see [engine-message-routing §10](../engine-message-routing.md) (open points) for API definition.

---

## 10. What is NOT in v1

- **Voice Output.** `summary` mode formats short sentences, but voice synthesis is v2.
- **Cross-Tenant Hubs.** Eddie cannot think for multiple Tenants simultaneously.
- **Shared Conversation State between parallel Eddie Sessions.** Only knowledge sync (§6).
- **Multi-User Tenants in the User Project.** If a Tenant has multiple users, each user has their own `_user_<username>` Project; there are no shared Hub channels.
- **Auto-routing to existing Projects without explicit creation.** Eddie can "connect to `natural_disasters`" if the user suggests it, but the heuristic for this is v2 — v1 asks back if in doubt.
- **Deletion.** Neither Activity Log nor Knowledge Graph nor Sessions are automatically deleted. Default read filters to 3 days; older data remains in the collection (see §6.2). "What is deleted is lost" — this is a system-wide principle, not an Eddie special case, and should be documented in [memory-knowledge-management](memory-knowledge-management.md).

---

## 11. Open Points

1. **Recap Detail Depth.** How much Activity Log content is verbally reproduced to the user in the Bootstrap Recap (§6.5)? Suggestion: only if something has happened since the last connection; otherwise, remain silent.
2. **Session Aging Threshold.** When is an old Hub Session "too old" to resume? 24h? 7 days? Configurable via setting `home.session.maxIdleAge` — default to be clarified.
3. **Peer Notification Throttling.** If Eddie #A calls 5 tools in 30 seconds, should Eddie #B receive 5 wakeups or a batched event? Suggestion: debounced per `kind` to 5s, but in doubt, rather too many than too few.
4. **Activity Log Indices.** `(userId, ts)` desc as default index. Later `(userId, kind, ts)` if needed.
5. **Heartbeat Timestamp on SessionDocument.** So that Session suspend does not depend solely on WebSocket close events (fragile with network glitches), but on a `lastSeenAt` field refreshed by connection pings/REST polls. Value also independent of the REST fallback topic. Spec hook in `client-protokoll-erweiterbarkeit.md` v2.
6. **Feedback Arthur → Eddie after Switch (§8.5).** When Eddie is back with the user after a switch, she has no direct record of what happened between the user and the worker. A brief "what happened" summary (e.g., an additional `switch-summary` frame on the server-emitted `switch-back`) would be helpful for Eddie's working memory. Postponed.
7. **Optional Memory Entry on MEDIATE.** Eddie writes a single-line system entry to its own chat history ("User switches to `climate_protection_transport` at 10:42") — upon return, the user sees the entry and Eddie's prompt context contains it, so she can respond with "welcome back." Costs ~5 lines of code, polish point.
8. **Server-emitted `switch-back` frame** for auto-return on worker termination. v2.
9. **Multi-Level Session Stack** in the client — `previousSessionId` as a stack instead of single, then the user can hop through multiple Projects and back (context switching). v2.
10. **`ASK_USER`-Picker — UI Render with Buttons** (Phase 3 of §5.8). Today, the Eddie server renders the `options` as a Markdown bullet list in the chat text — every client gets a valid view, the user can respond by text. The Web UI could read the options as a structured side channel (meta field on `ChatMessageAppended` or own frame variant) and render buttons; a click returns the label text as a regular `UserChatInput`. Vue component + wire format extension; backend-side only the metadata field on `ChatMessageAppended` to be added. Orthogonal to Phase 1+2 — Markdown path remains unchanged for CLI/Voice.
11. **`relayableActionParams` on `ProcessEvent`** (Phase 2 of §5.8). The cross-Engine path for `ASK_USER + options` needs structured transport from worker to Hub: the `options` array must survive from the worker's `ASK_USER` through the Process Event layer to Eddie's RELAY handler. Suggestion: optional `relayableActionParams: Map<String, Object>` on `ProcessEventDocument` / `ProcessEvent` wire schema; worker Engines fill it for BLOCKED events, Hub Engines read it in the RELAY path. Deliberately no ChatMessage annotation, because persistence is the wrong layer for this (event is ephemeral).

---

## 12. Spec Updates to Other Documents (to be implemented once this spec is accepted)

- **`architektur-scopes-clients.md`** — Mention of the convention "Home Project Group + `_user_<username>` Project + `kind: SYSTEM`." No new scope, no model change.
- **`execution-und-persistenz.md` §3.1** — Clarify that User Projects (`_user_<username>`, `kind: SYSTEM`) **do not** have a fixed Home Pod; Eddie runs on the WS receiving Pod. Pod discovery for outgoing connections unchanged; incoming user connections bind the current Pod as the run Pod (see §2.4).
- **`arthur-engine.md` §2.3** — Extend `SteerMessage` with `PeerEvent` variant.
- **`think-engines.md`** — Mention `ThinkEngine.bundledConfig()` as an Engine-direct configuration method (complementary to the Recipe system).
- **`recipes.md`** — Clarify that Hub Engines (Eddie) **do not** have a Recipe — they provide Persona/Params directly from the Engine code via `EngineBundledConfig`.
- **`user-interaction.md`** — Inbox Forward as a routing target of the channel adapter (§7).
- **`memory-knowledge-management.md`** — Principle "nothing is automatically deleted, only archived / hidden by default filter."
- **New Spec `organizational-tools.md`** — Detailed definition of the tool category from §4.
- **`structured-engine-output.md`** — Document `info` field as an optional visual companion channel to the voice `message` (§5.1) in the action schema. Currently affects `EddieActionSchema`; the pattern could later activate other voice-capable Engines.
- **`settings-system.md`** — Anchor `chat.language` (project → user → tenant) and `content.language` (project → tenant), plus `LanguageResolver` as the resolution API; Eddie's language resolution §5.2 uses `chat.language`.
- **New path `vance-defaults/prompts/voice/`** — Bundled `eddie-voice-rules-de.md` and `eddie-voice-rules-en.md` as initial content; self-bootstrap (§5.4) for other languages.
- **`engine-message-routing.md` §4.1** — `profile` field in the connect handshake (wire default `web`, canonical values `foot`/`web`/`mobile`/`eddie`/`daemon`); §4.1.1 documents values, capability mapping (tool filter + feature gating), §4.1.2 documents the `mediation-end` frame.
- **`think-engines.md`** (or Tool API documentation) — `Tool.allowedForProfile()` as a filter hook alongside `Tool.labels()`. Default: empty set = unrestricted. Client tools (`vance-foot/tools/`) override to `Set.of(Profiles.FOOT, Profiles.MOBILE)`.
- **`vance-api/ws/`-Notifications** — Add optional envelope field `forwardedBy: { engine, processId, viaSession }` to `ProcessProgressNotification`, `TodosUpdatedNotification`, `PlanProposedNotification`, `ProcessModeChangedNotification` (§7.3).
- **`ProfileRegistry`** in `vance-shared` (or part of the WS infrastructure) — Central `ProfileCapabilities profile.capabilities()` resolution with fields `clientToolsEnabled`, `canMediate`, `forwardingTagsExpected`. Initial profiles: `foot`, `web`, `mobile`, `eddie`, `daemon` (see `engine-message-routing.md` §4.1.1).
- **Foot Client Slash Command `/hub`** — Client-local close + reopen + session-resume on the previously remembered `previousSessionId` (§8.5.4). No server roundtrip.
- **Web Client UI** — Analogous UI trigger ("Back to Hub" button in the worker chat view, visible only during active switch), performs the same client-local close+reopen.
- **`EddieActionSchema`** — Action type `MEDIATE` with fields `target`, `reason`, optional `voiceAnnouncement` (§8.5.2). Capability gate (`canMediate`) in the `EddieEngine.handleAction` dispatcher. Frame is `switch-to` with `SwitchToNotification` payload.
