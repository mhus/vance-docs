---
title: "Vance — Follow-Up Service"
parent: Documentation
permalink: /docs/follow-up
---

<!-- AUTO-GENERATED from specification/public/en/follow-up.md — do not edit here. -->

---
# Vance — Follow-Up Service

> REST endpoint that generates context-aware follow-up suggestions from a text fragment plus cursor position. Single-shot, no Process-Spawn — built on the [LightLlmService](/docs/light-llm-service) with Recipe `follow-up` as the configuration profile.
>
> Consumed by the chat prompt and text editor in the Web-UI (see [web-ui](/docs/web-ui)); other client surfaces (Mobile, future editors) can use the same endpoint.
>
> See also: [light-llm-service](/docs/light-llm-service) | [recipes](/docs/recipes) | [how-do-i](/docs/how-do-i)

---

## 1. Purpose & Scope

**Problem.** Multiple UI surfaces want to display context-aware "what-could-come-next" suggestions:

- Chat Prompt (Edit Mode): User starts typing, Vance suggests next words/sentence completions at the cursor.
- Chat Reply (Reply Mode): User looks at the last Assistant message, Vance suggests how to respond to it.
- Text Editor (Edit Mode): User writes a document, Vance suggests next sentences or follow-up questions at the cursor.
- Future Surfaces: Inbox Quick-Replies, Wizard Form Free-Text fields, Voice-Mode hints.

Implementing each of these use cases as a separate Engine would be overkill: no lifecycle, no history, no tools — just a single LLM call with text context in, suggestion list out.

**Solution.** A thin `FollowUpService` in `vance-brain` that calls the `follow-up` Recipe via `LightLlmService`. REST endpoint `POST /brain/{tenant}/follow-up/{project}`. The service has two structural modes, controlled by the presence or absence of `cursor`:

- **Edit Mode** (`cursor != null`): Service splits `text` at the cursor position into `textBefore`/`textAfter` and sends both to the prompt.
- **Reply Mode** (`cursor == null`): Service sends the entire `text` as `precedingContext` to the prompt.

An empty result (no suggestions) is a valid response.

**What it is not:**

- Not a dedicated Engine — the entire flow is single-shot. Should FollowUp later become multi-stage (e.g., first RAG, then Generate, then Re-Rank), it can be upgraded to a `mark-ii` Engine — the Recipe name remains stable.
- No Streaming — a complete response is returned.
- No Tool-Use — the LLM is not allowed to call tools in this call.
- No Chat-History entry — Follow-Up is a UI aid, not a conversation-relevant action.

---

## 2. REST Surface

```
POST /brain/{tenant}/follow-up/{project}
Authorization: Bearer <jwt>
Content-Type: application/json
```

**Request — Edit Mode** (User editing text with cursor):

```json
{
  "text": "We should split the migration path ",
  "cursor": 31,
  "count": 3,
  "mode": "chat-prompt"
}
```

**Request — Reply Mode** (User replying to preceding text):

```json
{
  "text": "Hi, how can I help you today?",
  "count": 1,
  "mode": "chat-reply"
}
```

**Response (200 OK):**

```json
{
  "suggestions": [
    { "text": "into multiple phases.", "kind": "completion" },
    { "text": "all at once — what are the risks?", "kind": "continuation" },
    { "text": "coordinate with the Ops team.", "kind": "completion" }
  ]
}
```

**Path Parameters:**

- `tenant` — Tenant slug. Checked against the JWT claim `tid` by the upstream filter.
- `project` — Project name within the Tenant. Auth enforcement: `Resource.Project(tenant, project)` with `Action.READ`. Conventionally: `_tenant` as the default Project if no Project context is desired (see [architektur-scopes-clients](/docs/architektur-scopes-clients)).

**Body Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `text` | string | ✓ | In Edit Mode: the complete text the user is editing. In Reply Mode: the preceding context the user is reacting to (e.g., last Assistant message). Empty string is allowed in Edit Mode; meaningless in Reply Mode. |
| `cursor` | int | ✗ | **If set: Edit Mode.** Cursor position as character offset from the beginning. Must be in `[0, text.length()]` — the service automatically clamps, the controller validates beforehand and returns `400 BAD REQUEST` if out-of-range. **If omitted/null: Reply Mode.** The entire text is considered `precedingContext`. |
| `count` | int | ✓ | Desired number of suggestions (max). Server cap at `FollowUpService.MAX_COUNT` (=10). `<1` is rejected with `400`. |
| `mode` | string | ✗ | Free-form hint indicating the UI surface from which the call originates (e.g., `"chat-prompt"`, `"chat-reply"`, `"text-editor"`). Passed as a Pebble variable to the prompt — orthogonal to the Edit/Reply branch. Reserved for later specialization without contract change. |

**Response Schema:**

| Field | Type | Description |
|-------|------|-------------|
| `suggestions` | `FollowUpSuggestionDto[]` | List of suggestions, capped to the (clamped) `count`. Never `null`. An empty array is permissible. |

**`FollowUpSuggestionDto`:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `text` | string | ✓ | The suggested follow-up text. Never empty (parser filters blank). |
| `kind` | string | ✗ | Optional classification, set by the LLM. Conventional labels: `question`, `clarification`, `completion`, `continuation`. UI may ignore. |

**Error Behavior:**

| Status | Condition |
|--------|-----------|
| 200 + empty `suggestions` | LLM found no meaningful follow-up suggestions — not an error, desired behavior. |
| 400 | `text` null, `cursor` set but outside `[0, text.length()]`, `count < 1`. |
| 401 / 403 | JWT missing/invalid or Project READ denied. |
| 500 | LightLlmService throws `LightLlmException` (Recipe missing, Provider exhausted, Schema-Loop fails). |

---

## 3. Architecture

```
HTTP POST
   │
   ▼
FollowUpController
   │  (Auth.enforce: Resource.Project READ)
   │  (Validation: text, cursor-bounds if set, count >= 1)
   ▼
FollowUpService.suggest(text, cursor?, count, mode, tenantId, projectId)
   │  - count clamp  → [1, MAX_COUNT]
   │  - cursor clamp → [0, text.length()] (Edit Mode) or -1 (Reply)
   │  - cacheKey = sha256(tenant|project|text|cursor|count|mode)
   │  - Caffeine.getIfPresent(cacheKey)  → metric outcome=hit, return
   │  - cache miss                       → metric outcome=miss, continue
   │  - cursor != null → Edit Mode: split text → textBefore, textAfter
   │  - cursor == null → Reply Mode: precedingContext = text
   │  - build pebbleVars
   ▼
LightLlmService.callForJson(LightLlmRequest{ recipeName="follow-up", ... })
   │  - Recipe "follow-up" is loaded from Cascade (project → tenant → bundled)
   │  - Pebble renders promptPrefix with {% if precedingContext %} branch
   │  - ChatModel.chat() → JSON-Parse → Schema-Validate-Loop
   ▼
parseSuggestions(rawJson, limit)
   │  - tolerant to drift: bare-string-array, missing keys, blank text
   │  - drop unusable entries, truncate to limit
   │  - cache.put(cacheKey, parsedList)
   ▼
List<FollowUpSuggestionDto>
   │
   ▼
FollowUpResponseDto { suggestions } → JSON → HTTP 200
```

**Edit Mode** (`cursor != null`): `textBefore = text.substring(0, cursor)`, `textAfter = text.substring(cursor)`. Both are rendered as Pebble variables `{{ textBefore }}` and `{{ textAfter }}` into the system prompt. The LLM thus knows the user's current position and can produce follow-up suggestions at that exact location.

**Reply Mode** (`cursor == null`): The entire `text` is passed as `{{ precedingContext }}` to the prompt. The LLM responds with suggestions on how the user could react to this context (follow-up question, clarification, acknowledgment). The Pebble template branches with `{% if precedingContext %}reply-prompt{% else %}edit-prompt{% endif %}`.

This branching is semantically necessary: the two tasks ("what comes after the cursor at this point" vs. "how to react to this text") are semantically different. `mode` remains as an additional free-form hint for UI surface specialization — orthogonal to the Edit/Reply branch.

**Result Cache (Caffeine).** The service maintains an in-memory LRU cache that covers repeated identical requests:

- **Library:** [Caffeine](https://github.com/ben-manes/caffeine) 3.x — already transitive via Spring Boot 4, explicitly declared as a dependency in `vance-brain/pom.xml`.
- **Key:** SHA-256 hex digest over `tenantId | projectId | text | cursor | count | mode` (null separator in between). Compact in the map, does not leak user content into string interns; Reply vs. Edit mode is distinguished by `cursor = -1` vs. `>= 0`.
- **Value:** parsed `List<FollowUpSuggestionDto>` — we cache the **typed result**, not the raw JSON string, so parsing runs only once.
- **Eviction:** `maximumSize = 500` (LRU) + `expireAfterWrite = 30 min` TTL.
- **Metric:** `vance.followup.cache` Counter with tag `outcome` ∈ {`hit`, `miss`}. Hit-ratio is the direct statement on cache effectiveness.
- **What it covers:** Page reload, multi-tab of the same user, multiple users on a shared Hub Project with identical Assistant message, quick re-displays due to focus toggle in the composer.
- **What it does not cover:** Multi-Pod sharing (each Pod has its own cache) — with N Pods, the first call of each Pod instance will still see an LLM miss. Persistent cache via Mongo is v2 if load data shows the need.
- **Consistency under Recipe Reload:** no explicit invalidation — old cache entries expire after a maximum of 30 min. Acceptable because Recipe edits are not hard cuts anyway, and the effect propagates naturally. If force-invalidate is needed later, an `@EventListener` will attach to the Recipe reload event and call `cache.invalidateAll()`.

**Tolerant Parsing Strategy**: The service accepts several drift modes of the LLM response:

- Object form: `[{ "text": "...", "kind": "..." }, ...]` — the canonical form.
- Bare-string form: `["...", "..."]` — occasionally chosen by the LLM, interpreted as `{ text, kind: null }`.
- Missing `suggestions`-key → empty list.
- Items without `text` or with blank `text` → dropped.

This keeps the service robust without bloating the prompt with excessive format reminders.

**Empty-Result as First-Class-Outcome**: The service explicitly returns `200 + []`, not `204` and no error. This simplifies client code (no status check needed) and respects reality: not every cursor context warrants suggestions.

---

## 4. Recipe `follow-up`

`vance-brain/src/main/resources/vance-defaults/_vance/recipes/follow-up.yaml`:

```yaml
description: |
  Internal config profile for the LightLlmService consumed by
  FollowUpService (backend of the follow-up suggestion REST endpoint).
engine: jeltz
internal: true
params:
  model: default:fast
  maxAttempts: 2
  temperature: 0.7
promptPrefix: |
  You are Vance's follow-up suggestion component. Produce up to
  {{ count }} short follow-up suggestions matching the context below.

  {% if precedingContext %}
  ## Preceding text (the user is responding to this)
  {{ precedingContext }}

  ## Task
  Suggest up to {{ count }} short ways the user could **react** —
  follow-up question, clarification, acknowledgement.
  {% else %}
  ## Text before cursor
  {% if textBefore %}{{ textBefore }}{% else %}(empty){% endif %}

  ## Text after cursor
  {% if textAfter %}{{ textAfter }}{% else %}(empty){% endif %}

  ## Task
  Suggest up to {{ count }} short ways the user could **continue**
  typing at the cursor position.
  {% endif %}

  ## Reply format
  Respond with exactly ONE JSON object — { "suggestions": [...] } — no
  prose, no markdown code fences.
tags:
  - internal
  - followup
```

**Engine Choice:** `jeltz` provides the schema validation loop "for free". If the LLM does not provide parseable JSON, the call is retried with a correction hint (up to `maxAttempts`). Error case: `SchemaValidationException` → `500`.

**Pebble Branching:** `{% if precedingContext %}` switches between Reply and Edit prompts. This means the two-mode logic is **fully declarative in the Recipe**; the service only decides which Pebble vars to set.

**Temperature 0.7** — deliberately higher than for Discovery (0.0), because creativity is required here, not deterministic selection from a catalog.

**Model `default:fast`** — Follow-Up is latency-sensitive (user waits in the UI). The economical/fast model per Tenant is resolved via alias cascade (see [llm-resource-management](/docs/llm-resource-management) §3a).

**Tenant Override:** Tenants can place their own `recipes/follow-up.yaml` via the Recipe Cascade under `_vance/recipes/follow-up.yaml`. `internal: true` is retained — otherwise, the Recipe would collide with the standard Recipe selector.

---

## 5. DTO Contracts

**`vance-api/de/mhus/vance/api/followup/`** — `@GenerateTypeScript("followup")` annotated, TS output to `client/packages/generated/src/followup/`:

- `FollowUpRequestDto` — Request body (see §2).
- `FollowUpResponseDto` — Response.
- `FollowUpSuggestionDto` — Single suggestion.

Validation annotations (`@NotNull`, `@Min`) are enforced by the controller via `@Valid`; edge cases (cursor-out-of-range vs. text-length) are checked manually by the controller, as this is a cross-field constraint.

---

## 6. Client Integration

**Web (`vance-face`):**

```ts
import { FollowUpRequestDto, FollowUpResponseDto } from '@vance/generated';
import { restPost } from '@vance/shared/rest';

// Edit mode — user is typing in the chat prompt
const editResp: FollowUpResponseDto = await restPost(
  `/brain/${tenant}/follow-up/${project ?? '_tenant'}`,
  { text, cursor, count: 3, mode: 'chat-prompt' } satisfies FollowUpRequestDto,
);

// Reply mode — user is looking at the last assistant message,
// input is empty, suggest one follow-up reply
const replyResp: FollowUpResponseDto = await restPost(
  `/brain/${tenant}/follow-up/${project ?? '_tenant'}`,
  { text: lastAssistantMessage, count: 1, mode: 'chat-reply' } satisfies FollowUpRequestDto,
);
```

**Chat Editor "Ghost-Bubble"** (Reply Mode, v1):

- Trigger: Assistant message completed (`status: completed`) **and** input field empty **and** composer focused (Fetch-Gate).
- Display: Ghost-bubble below the last Assistant message, muted color + italic, with hint icon (e.g., `↹ Space`).
- Adoption: User presses **Space** → suggestion is written into the input field (plus appended space, shell autosuggestion style). Alternatively **Tab** → without space. Click on bubble → also adopt.
- Hiding: As soon as `input.length > 0` and the first character is not a space, the bubble disappears.
- Reappearance: Input back to empty → bubble re-appears (cached, no new call).
- Invalidation: New Assistant message → old suggestion discarded, new call with the new message.
- **Fetch-Gate (Strategy B):** The REST call runs **only** when the textarea is focused. The client-composable caches per `(projectId, lastAssistantContent)` and re-focusing does not lead to a second call. This way, we don't pay for an LLM call for users who don't want to reply.

**Markdown Document Editor "Tooltip-Suggestion"** (Edit Mode, v1):

- Implementation: `followUpExtension` from `@vance/components` as a CodeMirror extension. Active only if `<CodeEditor :follow-up="…" />` is set; in `DocumentApp.vue` this is only the case for Markdown documents in the Edit tab.
- Trigger: User presses **`Ctrl+.`** (Mac: `Cmd+.`) in the editor. **On-demand**, never automatically while typing — respects that the user decides when they want help. (`Ctrl/Cmd+Space` would be more intuitive, but is reserved by the OS on macOS for Spotlight or the IME switcher; `Mod-.` is platform-neutral free.)
- Display: CodeMirror `showTooltip` directly under the cursor, muted color + italic, with hint label (`↹ Tab`).
- Adoption: **Tab** → suggestion is inserted at the cursor, cursor jumps to the end of the insertion, tooltip disappears.
- Discarding: **Escape** → tooltip disappears without insertion. Any document change or cursor movement also discards the suggestion (anchor position would then be stale).
- Stale-Drop: Pending fetch is discarded via sequence counter if a newer trigger or a document change occurs.
- Other Editors (Code with Java/Python/YAML, Office Editor, Setting Forms): **deliberately no Follow-Up** — code completion is the task of the IDE, not Vance. Only Markdown.

**Other UI Surfaces** (Inbox Quick-Reply, Wizards, Voice): no Follow-Up in v1.

Edit Mode in the Chat Prompt is not v1.

**Mobile (`vance-fingers`):** identical endpoint, same types from `@vance/generated`. Mode can set e.g., `"chat-prompt"` or `"voice-input"`.

**CLI (`vance-foot`):** v1 does not use Follow-Up — Foot is WS-only and has no cursor-based editing flow. If needed, a REPL hint can be built analogously later.

---

## 7. What v1 does not do

- **No RAG.** Suggestions are based solely on the provided text context. As soon as Project Memory is to be included, it's v2: either pre-retrieval (embedding lookup on `textBefore` environment) or upgrade to a real `mark-ii` Engine with Tool-Call-Loop. This breaks the single-shot model — therefore deliberately postponed.
- **No persistent caching.** The service maintains an in-memory Caffeine cache (LRU, 500 entries, 30 min TTL, cache key = SHA-256 over `tenantId + projectId + text + cursor + count + mode`), which covers page reloads, multi-tab, and shared Hubs. Multi-Pod setups lose cross-Pod sharing — Mongo persistence is v2. Hit/miss counts under `vance.followup.cache{outcome=hit|miss}`.
- **No Persona adaptation.** The prompt is generic; Persona-specific suggestions (e.g., technical tone) are v2.
- **No Streaming.** Suggestions appear as a block once the LLM call returns. For `default:fast` (~500ms p50), this is acceptable.
- **No special Rate-Limit handling.** Standard quota cascade (see [llm-resource-management](/docs/llm-resource-management)) applies — excessive calls block like normal LLM calls.

---

## 8. Tests

`vance-brain/src/test/java/de/mhus/vance/brain/followup/FollowUpServiceTest.java`:

- Cursor split (beginning, middle, end, out-of-range).
- Count clamping (MAX_COUNT) and truncation (LLM ignores limit).
- Parser tolerance: object-form, bare-strings, missing-key, blank-text, empty array.
- Mode passthrough (set vs. null/blank → omitted).
- LightLlmService wiring (Recipe name, Tenant/Project Scope, Schema set).
- Validation (null text, blank tenant).

LightLlmService mocked — no real LLM calls in unit tests. End-to-end is tested via `qa/ai-test/` opt-in (see CLAUDE.md section "Tests") when the use case is included in QA.

---

## 9. Extension Paths

- **MarkII-Engine** — If FollowUp becomes multi-stage (RAG → Generate → Re-Rank) or requires Tool-Use (e.g., code lookup in Project files), `mark-ii` will be implemented as a real Engine. The REST contract remains stable; the Recipe `follow-up.yaml` switches to `engine: mark-ii`.
- **Per-Mode-Recipes** — If Chat Prompt and Text Editor require very different suggestions, the service can be extended to `follow-up-${mode}` Recipe lookup with fallback to `follow-up`.
- **Manuals-Hook** — If the model needs to access predefined domain Manuals, this works like Discovery: `SourceCatalogBuilder` for FollowUp-specific Manuals, appended to the Pebble vars.
