---
title: "Vance — Fenchurch Image-Generation Service"
parent: Documentation
permalink: /docs/fenchurch-service
---

<!-- AUTO-GENERATED from specification/public/en/fenchurch-service.md — do not edit here. -->

{% raw %}
---
# Vance — Fenchurch Image-Generation Service

> Vance's sole path for **newly generated images**. Persona: Fenchurch (Arthur Dent's great love, *So Long, and Thanks for All the Fish*) — intuition, creative images. Implemented as a **service + tool-set**, not a worker engine: synchronous, single provider call per image, no dedicated `ThinkProcess` lifecycle.
>
> Four tools are in every Engine's default tool inventory: `image_generate` (the main call) and `image_style_set` / `image_style_get` / `image_style_prompt` (persistent style layers). Images are written via the normal `DocumentService` path and are thus available to all Document editors / Markdown renderers / RAG indices without special handling.
>
> See also: [light-llm-service](/docs/light-llm-service) | [llm-resource-management](/docs/llm-resource-management) | [recipes](/docs/recipes) | [user-progress-channel](/docs/user-progress-channel) | [document-versioning](/docs/document-versioning)

---

## 1. Purpose & Scope

**Problem.** Vance needs a clearly defined place that answers "generate a new image":

- Chat user: "Draw me a book cover", "Logo for…", "Sketch of a medieval marketplace".
- Magrathea workflows / Marvin plans: one image per chapter, per slide, per asset.
- Spec/doc pipelines (Hactar): a diagram image for an architecture description.

Image generation is a **single-shot process** without multi-turn reasoning, without a tool-use loop, without streaming. A dedicated worker engine with `ThinkProcessDocument` lifecycle, `pendingMessages` inbox, lane lock, and `drainPending` loop would be overkill. The pattern is the same as for [Discovery](/docs/how-do-i), [Follow-Up](/docs/follow-up), [Fook](/docs/fook-service): a Spring `@Service` that calls an external API with setting cascade context.

**Solution.** Fenchurch is a **system of five collaborating components:**

- `FenchurchService` — the single entry point; orchestrates style merge, title generation, path resolution, provider dispatch, heartbeats, quota recording.
- `FenchurchStyleService` — concatenative style cascade across four Scopes (`tenant → user → project → session`).
- `ImageCallTracker` — persistent audit log + quota gate on MongoDB collection `image_call_records`.
- `AiImageService` + `AiImageModelProvider` — provider dispatch layer, parallel to the chat stack. Concrete providers in v1: OpenAI (`gpt-image-1`), Gemini (`gemini-2.5-flash-image` / `imagen-3.0-generate-002`).
- Recipe `image-title` — internal [LightLlm](/docs/light-llm-service) config profile for title and slug generation from the prompt.

**What it is not:**

- **Not a Worker Engine.** There is no `FenchurchEngine`, no spawn path, no entry in the Session Browser as a separate node. Tool calls appear in the normal tool call history of the caller process.
- **Not an async Workflow.** Every `image_generate` call blocks the caller process's Lane until bytes are written. Bulk generation runs via Marvin Plans (one WORKER child per image — parallelized across Lanes), not via async jobs in the Service.
- **No Image Edit / Variation / Inpainting v1.** Later tools (`image_edit`, `image_variation`) are planned as separate extensions; the provider interface is designed so they can be added without breaking changes.
- **No LLM Prompt Refinement Pass.** A second LLM call between user prompt and image provider is intentionally not built in — setting `ai.fenchurch.refine_prompts` is reserved as a placeholder for v2.

---

## 2. Architecture

```
┌─ Engine (Arthur / Eddie / Marvin-Worker / …) ─────────────────────┐
│                                                                   │
│  Tool-Call image_generate({prompt, path?, title?, aspectRatio?})  │
│       │                                                           │
│       ▼                                                           │
│  ImageGenerateTool ─── delegate ───┐                              │
│                                     │                             │
└─────────────────────────────────────┼─────────────────────────────┘
                                      ▼
┌─ FenchurchService (per Pod) ────────────────────────────────────────┐
│                                                                     │
│  1. validate request, ensure ai.fenchurch.enabled                   │
│  2. ImageCallTracker.checkQuota(...) → reject early on quota_exceeded│
│  3. FenchurchStyleService.mergedPrompt(...) → style prefix          │
│  4. LightLlmService.callForJson(recipe="image-title", {prompt})     │
│       → {title, slug}    (skip if auto_title=false or caller        │
│                           supplied path+title explicitly)           │
│  5. resolve path: caller-supplied OR "images/<uuid8>-<slug>.png"   │
│  6. compose effective prompt: "<styles>\n\n<worker prompt>"         │
│  7. AiModelResolver.resolveOrDefault(alias)                         │
│       → (provider, modelName)                                       │
│  8. ChatBehaviorBuilder.resolveApiKey + resolveBaseUrl              │
│       → AiImageConfig (with timeoutSeconds from ImageModelInfo)     │
│  9. ProgressEmitter.emitStatus(WAITING, "Generating image …")       │
│ 10. start heartbeat scheduler (every N seconds)                     │
│ 11. AiImageService.generate(config, prompt, destinationStream)      │
│       ── DocumentImageDestinationStream commits via                 │
│          DocumentService.createOrReplaceBinary                      │
│ 12. cancel heartbeat, persist ImageCallRecord(success|outcome)      │
│ 13. reload DocumentDocument, return ToolResult                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
            DocumentDocument(path, mime, title, headers, tags)
                                      │
                                      ▼
                       Web-/Foot-/Mobile-UI renders the image
                       via Markdown (`![alt](path)`) through the
                       normal Doc-Update-Push.
```

`ImageCallRecord` is append-only; `ImageCallTracker` counts for quota math via `countByTenantIdAndAtGreaterThanEqual(...)`. Successes and failures are logged equally — quota reflects provider-billable attempts, not just successfully delivered bytes.

---

## 3. Tool API

All four tools are in the default tool inventory and do not need to be whitelisted in the Recipe.

### 3.1 `image_generate`

Generates an image and writes it to the Document Store.

**Parameters:**

| Field | Type | Required | Meaning |
|-------|------|----------|---------|
| `prompt` | string | ✓ | Description of the image content. Only write style tokens here if no persistent style layer is active (see `image_style_prompt`). |
| `path` | string | ✗ | Document path. If set: overwrites an existing file (with Document Versioning archiving according to [document-versioning](/docs/document-versioning)). If empty: `images/<uuid8>-<slug>.png`. |
| `title` | string | ✗ | Override of the automatically generated title. If neither set nor `ai.fenchurch.auto_title_from_prompt = false`: the `image-title` Recipe call generates it. |
| `aspectRatio` | enum | ✗ | `1:1` (Default) / `16:9` / `9:16` / `4:3` / `3:4`. Provider validates against the `supportedAspectRatios` list in `ai-models.yaml`. |

**Success Response:**

```json
{
  "path": "images/a3f9b2c8-watercolor-cat-on-moon.png",
  "mimeType": "image/png",
  "sizeBytes": 524288,
  "modelUsed": "openai:gpt-image-1",
  "durationMs": 18432,
  "title": "Watercolor Cat on Moon"
}
```

**Error Response (typed map, no throw):**

```json
{
  "error": "timeout|content_policy|quota_exceeded|provider_error|cancelled|prompt_too_long|unsupported_aspect_ratio|disabled",
  "message": "User-readable explanation",
  "retryable": true | false
}
```

The `retryable` flag is fixed per `error` value (see §13 — Failure Modes).

### 3.2 `image_style_set`

Writes a persistent style prefix to a Scope.

**Parameters:**

| Field | Type | Required | Meaning |
|-------|------|----------|---------|
| `prefix` | string | ✓ | Style tokens (e.g., `medieval manuscript`, `watercolor, soft tones`). Max 500 characters. Sentinel `__none__` suppresses all outer layers from this Scope. |
| `scope` | enum | ✗ | `session` (Default) / `project` / `user` / `tenant`. Permission check via `SettingService` — narrower scopes (`session`) are writable without special rights, broader ones require the respective Project/Tenant permission. |

**Response (Success):**

```json
{ "scope": "session", "prefix": "watercolor, soft tones" }
```

**Response (Permission-Denied / Validation Error):**

```json
{ "error": "permission_denied|invalid_argument", "message": "...", "retryable": false }
```

**LLM Contract:** Default scope `session` is intentionally the most local — the LLM may set it without prompting if the user says "remember style X". For `project`/`user`/`tenant`, the Persona's claim is higher; the Engine Manual `image-generation.md` explicitly recommends getting a brief confirmation from the user before the LLM writes to a broader scope.

### 3.3 `image_style_get`

Reads its own (Session) layer.

**Response:**

```json
{ "scope": "session", "prefix": "watercolor, soft tones" }
```

or

```json
{ "scope": "session", "prefix": null }
```

If the LLM only wants to see *what it has set*, this is the tool. For the merged cascade, there is a second one:

### 3.4 `image_style_prompt`

Reads the effective cascade after `__none__` cutoff:

```json
{
  "merged": "clean, professional, watercolor, medieval manuscript",
  "layers": [
    { "scope": "tenant",  "prefix": "clean, professional" },
    { "scope": "user",    "prefix": "watercolor" },
    { "scope": "project", "prefix": "medieval manuscript" }
  ]
}
```

`merged` is exactly the text that will be prepended to the next `image_generate` prompt. `layers` lists the effective layers (after `__none__` cutoff). Tools are **read-only** — they do not change settings.

---

## 4. Provider Abstraction

### 4.1 `AiImageModelProvider`

Parallel to the existing `AiModelProvider` (Chat), in its own sub-tree `vance-brain/.../ai/image/`:

```java
public interface AiImageModelProvider {
    ProviderType getType();
    default String getName() { return getType().wireName(); }
    void generate(AiImageConfig config, String prompt,
                  ImageDestinationStream destination);
}
```

`AiImageService` dispatches via `ProviderType` (same pattern as `AiModelService`):

```java
public void generate(AiImageConfig config, String prompt,
                     ImageDestinationStream destination) {
    ProviderType type = ProviderType.requireWireName(config.provider());
    providers.get(type).generate(config, prompt, destination);
}
```

`AiImageConfig` (Record) carries the typical resolved config: `provider`, `providerInstance`, `modelName`, `apiKey` (plaintext, already decrypted), `baseUrl?`, `aspectRatio`, `timeoutSeconds`. Built in `FenchurchService` via `AiModelResolver` + `ChatBehaviorBuilder.resolveApiKey` / `.resolveBaseUrl` — exactly the helpers the chat stack uses.

### 4.2 `ImageDestinationStream`

The write target is the only abstraction the provider sees — it knows **no** Document model. Located in `vance-shared/document/`:

```java
public abstract class ImageDestinationStream extends OutputStream {
    public abstract void setMimeType(String mime);
    public abstract void setTitle(@Nullable String title);
    public abstract void setMetadata(String key, String value);
    public abstract void setAltText(@Nullable String altText);
    @Override public abstract void close();
    @Override public abstract void write(byte[] b, int off, int len);
}
```

Concrete implementation `DocumentImageDestinationStream` (in the Brain) buffers bytes in a `ByteArrayOutputStream`, accumulates metadata in a `LinkedHashMap`, and commits on `close()` via `DocumentService.createOrReplaceBinary(...)`. This inherits for free: Document Versioning (see [document-versioning](/docs/document-versioning)), Lineage IDs, RAG Eligibility, Storage Backend (inline/blob automatically via `StorageService`).

### 4.3 Concrete Providers in v1

| Provider | Model Examples | Response Form | Aspect Mapping |
|----------|----------------|---------------|----------------|
| `OpenAiImageProvider` | `gpt-image-1` | base64 (`responseFormat: b64_json` enforced) | aspectRatio → size (`1:1` → `1024x1024`, `16:9`/`4:3` → `1536x1024`, `9:16`/`3:4` → `1024x1536`, otherwise `auto`). Quality fixed to `"high"`. |
| `GeminiImageProvider` | `gemini-2.5-flash-image` (nano-banana), `imagen-3.0-generate-002` | base64 (langchain4j `GoogleAiGeminiImageModel`) | aspectRatio native — `.aspectRatio("16:9")` |

Both set `maxRetries = 0` on the langchain4j builder; retry logic belongs to the higher Engine layer, not the provider.

**Self-hosted Providers** (Stable Diffusion via vLLM/ComfyUI/Automatic1111): not in v1, but the `AiImageModelProvider` interface is designed so they can be added later.

---

## 5. Style Cascade

`FenchurchStyleService` implements a **concatenative cascade** across four Scopes — unlike the "innermost wins" default cascade mode of `SettingService`. Rationale: Style builds additively; a Tenant default like "clean, professional" should still apply if the user also sets "watercolor" as a Persona default.

**Scope Mapping to `SettingService`:**

| Scope | `SettingService` Address |
|-------|--------------------------|
| `tenant` | `SCOPE_PROJECT`, Project name `_tenant` |
| `user` | `SCOPE_PROJECT`, Project name `_user_<userId>` |
| `project` | `SCOPE_PROJECT`, Project name = current Project name |
| `session` | `SCOPE_THINK_PROCESS`, Process ID = current Process ID |

**Setting Key:** `ai.fenchurch.style_prefix` (uniform for all scopes).

**Composition Rule:**

1. Read every layer (skip `null`/blank).
2. Find the **innermost** layer with value `__none__`. All layers **before** this sentinel are discarded; the `__none__` token itself is also discarded.
3. Connect remaining layers with `, `.

Example:

```
tenant:  "clean, professional"
user:    "watercolor"
project: "__none__"
session: "for-prod"
─────────────────────────────────
merged: "for-prod"
```

The `project` layer cut off the cascade from above; `session` is within and remains.

**Write Validation in `image_style_set`:**

- `prefix == null || blank` → `invalid_argument` (a dedicated path would need to be created for clearing; not in v1).
- `prefix.length > 500` → `invalid_argument`.
- `scope == USER` without `userId` / `PROJECT` without `projectId` / `SESSION` without `processId` → `invalid_argument`.
- `__none__` as a value is valid — it is a control symbol, not pseudo-clearing.

---

## 6. Title Generation

If the caller provides neither `title` nor `path` and `ai.fenchurch.auto_title_from_prompt = true` (Default), the service calls the internal Recipe `image-title` via [LightLlmService](/docs/light-llm-service) before the actual image provider call. This call is negligible compared to the image call (seconds to minutes) (~1-2 s).

**Recipe `_vance/recipes/image-title.yaml`:**

- `engine: jeltz` (for structured JSON output)
- `internal: true` (ignored by the standard Recipe selector)
- `params.model: default:fast`
- `params.maxAttempts: 2`
- `params.temperature: 0.2` (deterministic)
- `promptPrefix`: Pebble template with variable `{{ prompt }}`. Requires JSON `{title, slug}` with constraints:
  - `title`: 2-6 words, Title Case, max 80 characters
  - `slug`: lowercase kebab-case ASCII, 1-30 characters, without leading/trailing hyphen

In case of `LightLlmException` (schema failure, provider down), the service falls back to slug `"image"` and logs `INFO`. The image is still generated — title generation failure is never fatal.

**Slug Sanitization** in the service additionally: `Normalizer.NFD` + strip combining marks (for `ä → a`), lowercase, kebab, max 30 characters, empty slug → `"image"`.

---

## 7. Path Resolution & Document Storage

**Default Path:** `images/<uuid8>-<slug>.png` — `uuid8` is the first 8-character prefix of a freshly generated UUID. Sufficient for practical uniqueness (≈4 billion combinations per slug variant) without unwieldy long paths.

**Caller-supplied path:** used verbatim; an already existing file is **overwritten**. The normal Document Versioning mechanism archives the previous version (see [document-versioning](/docs/document-versioning)) — image documents are not excluded from archiving, as rollback for AI generation is explicitly desired.

**Path Validation** occurs in `DocumentService` — no path traversal outside the Project scope, no specific extension is enforced (provider delivers PNG by default, this is convention, not a service check).

**Document Metadata on `DocumentDocument`** (set by `DocumentImageDestinationStream`):

| Field | Value |
|-------|-------|
| `mimeType` | `image/png` (or reported by provider) |
| `title` | LLM-generated or caller override |
| `name` | Filename portion of the path, e.g., `a3f9b2c8-watercolor-cat-on-moon.png` |
| `tags` | `["image", "ai-generated", "fenchurch"]` (Default; overridable via constructor) |
| `headers.model` | `<provider>:<modelName>` |
| `headers.durationMs` | Provider call duration |
| `headers.aspectRatio` | requested aspect ratio |
| `headers.revisedPrompt` | only if the provider returns a revised prompt (OpenAI does) |
| `headers.altText` | only if explicitly set |
| `storageId` | from `StorageService.store(...)` |

---

## 8. `ai-models.yaml` Extension

Existing chat models remain unchanged. New optional top-level fields:

```yaml
<provider>:
  <modelName>:
    kind: chat | image          # optional; default `chat`
    # ...

    # Image-only fields (apply when kind: image):
    supportedAspectRatios: [...]   # ["1:1", "16:9", ...]
    maxPromptChars: <int>          # provider-side prompt cap
    costPerImage:                  # USD/image, by quality tier
      standard: <float>
      hd: <float>                  # optional, multi-tier vendors
    timeoutSeconds: <int>          # per-call HTTP timeout (default 360)
```

**Lookups via `ModelCatalog`** are disjoint:

- `lookup(...)` / `lookupOrDefault(...)` / `listAll(...)` → only `kind: chat` (Default). Chat lookups do **not** return image entries — no pollution of the model picker.
- `lookupImage(...)` / `listAllImages(...)` → only `kind: image`.

`ImageModelInfo` (Record) carries the image fields; defaults if a field is missing: `supportedAspectRatios` → `["1:1"]`, `maxPromptChars` → 1000, `timeoutSeconds` → 360, `costPerImage` → empty map (tracker then counts the call but cannot price it).

**Bundled Entries** (in the Brain JAR):

```yaml
gemini:
  gemini-2.5-flash-image:
    kind: image
    timeoutSeconds: 90
    supportedAspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4"]
    costPerImage: { standard: 0.005 }
    maxPromptChars: 480
  imagen-3.0-generate-002:
    kind: image
    timeoutSeconds: 360
    supportedAspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4"]
    costPerImage: { standard: 0.04 }
    maxPromptChars: 480

openai:
  gpt-image-1:
    kind: image
    timeoutSeconds: 360
    supportedAspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4"]
    costPerImage: { standard: 0.04, hd: 0.08 }
    maxPromptChars: 4000
```

**Aliases** (Bundled Defaults, overridable in the Tenant):

```yaml
ai.alias.default.image:       gemini:gemini-2.5-flash-image
ai.alias.default.image-high:  openai:gpt-image-1
```

The cascade resolution runs through the existing [`AiModelResolver`](/docs/llm-resource-management) — the resolver knows no image special case, the alias mechanism works for arbitrary keys.

---

## 9. Quota & Tracking

### 9.1 `ImageCallRecord`

Append-only Collection `image_call_records`:

| Field | Meaning |
|-------|---------|
| `tenantId` | scope |
| `accountId` | username; mirrors `UserDocument.name` |
| `projectId` | mirrors `ProjectDocument.name`; `null` for calls without Project context |
| `modelUsed` | resolved `<provider>:<modelName>` |
| `alias` | request-side label, e.g., `default:image-high` |
| `costUsd` | from `ai-models.yaml` `costPerImage[tier]`, can be `null` |
| `qualityTier` | `standard` / `hd` |
| `outcome` | `success` / `timeout` / `provider_error` / `quota_exceeded` / `content_policy` / `cancelled` (fixed vocabulary, Prometheus-cardinality-safe) |
| `at` | wall-clock start of the call |
| `durationMs` | duration including provider + network |

Indices: `(tenantId, at)`, `(tenantId, accountId, at)`, `(tenantId, projectId, at)`. Retention is not implemented in v1 — cleanup is an operational task.

### 9.2 Quota Gate

Before each provider call:

```
verdict = ImageCallTracker.checkQuota(
    tenantId, userId, projectId, processId)
if !verdict.allowed: throw FenchurchException(QUOTA_EXCEEDED, verdict.message)
```

`checkQuota` reads the two settings `ai.fenchurch.daily_images` and `ai.fenchurch.monthly_images` through the cascade `processId → _user_<userId> → projectId → _tenant` (innermost wins, same pattern as `getStringValueUserProjectCascade`). If both values are `<= 0` (or unset): `Verdict.OK`.

If a limit is set, it is counted **tenant-wide**: `countByTenantIdAndAtGreaterThanEqual(tenantId, startOfDay)` or `startOfMonth`. If the measured count `>= limit`: `Verdict(false, "daily"|"monthly", message)`.

**More granular Per-Account Buckets** are v1.1 (separate story). This means: a user who sets a strict `daily_images = 10` setting in the `_user_<self>` scope caps the entire tenant to 10 calls/day while active. Bug workaround: users with their own limits should choose realistic tenant-wide appropriate numbers.

### 9.3 Metrics

Per `MetricService`:

| Metric | Tags | Meaning |
|--------|------|-----------|
| `vance.fenchurch.calls` | `outcome`, `model` (= alias) | Counter; all calls (success + fail) |

Low-Cardinality: `model` is the **alias** (`default:image-high`), not the fully resolved provider string.

---

## 10. Heartbeat Channel

During the blocking provider call, a `ScheduledExecutorService` runs with a default 30 s interval (setting `ai.fenchurch.heartbeat_interval_sec`). At each tick, the service emits a `WAITING` status message via [`PROCESS_PROGRESS`](/docs/user-progress-channel):

```
"Generating image (default:image-high) … 1:30 elapsed"
```

Before the first tick, an initial `WAITING` without a timestamp is pushed (so the UI can immediately see that Fenchurch is active). Upon completion (Success/Failure/Cancel), the ticker is canceled in the `finally` block.

The channel is **ephemeral** (`PROCESS_PROGRESS` convention, see [user-progress-channel](/docs/user-progress-channel)) — no entry in conversation history, no persistence.

If the caller does not provide a `processId` (e.g., REST call without process context), the heartbeat is completely omitted — no silent failure.

---

## 11. Settings

| Key | Type | Default | Cascade |
|-----|------|---------|---------|
| `ai.fenchurch.enabled` | boolean | `true` | Tenant → System |
| `ai.fenchurch.timeout` | int (sec) | from `ImageModelInfo.timeoutSeconds`, otherwise 360 | Process → Project → User → Tenant |
| `ai.fenchurch.default_aspect_ratio` | string | `1:1` | Process → Project → User → Tenant |
| `ai.fenchurch.heartbeat_interval_sec` | int | 30 | Tenant |
| `ai.fenchurch.daily_images` | long | 0 (= unlimited) | Process → User → Project → Tenant |
| `ai.fenchurch.monthly_images` | long | 0 (= unlimited) | Process → User → Project → Tenant |
| `ai.fenchurch.auto_title_from_prompt` | boolean | `true` | Process → Project → User → Tenant |
| `ai.fenchurch.refine_prompts` | boolean | `false` | Process → Project → User → Tenant (v1 placeholder, unread) |
| `ai.fenchurch.style_prefix` | string | empty | Concatenative Cascade (Tenant + User + Project + Session) — see §5 |

**Setting Forms** under `_vance/setting_forms/`:

- `fenchurch.yaml` — Admin tab for configuration settings (enabled, defaults, quotas, timeout, heartbeat).
- `fenchurch-style.yaml` — slim form only for `style_prefix`, reused in every scope editor (Workspace, Project, User Memory).

---

## 12. Failure Modes

All Fenchurch-specific errors are thrown as `FenchurchException(Reason, message)` and mapped by the tool to the JSON error form:

| `Reason` | `error`-Wire | `retryable` | Trigger / Caller Reaction |
|----------|--------------|-------------|---------------------------|
| `QUOTA_EXCEEDED` | `quota_exceeded` | `false` | Daily/monthly limit reached. LLM should inform user about limit, possibly ask admin. |
| `PROVIDER_ERROR` | `provider_error` | `true` | Generic provider 5xx / SDK exception. LLM can retry 1-2 times, then try another alias. |
| `TIMEOUT` | `timeout` | `true` | Provider exceeded `timeoutSeconds`. LLM can retry with `default:image` (fast) or simplify prompt. |
| `CONTENT_POLICY` | `content_policy` | `false` | Provider rejected prompt (persons, brands, NSFW). LLM must rephrase, **not** retry verbatim. |
| `CANCELLED` | `cancelled` | `false` | Process suspended / user cancellation mid-call. Caller lifecycle decides. |
| `PROMPT_TOO_LONG` | `prompt_too_long` | `false` | Effective prompt (style + worker) > `maxPromptChars` of the model. LLM shortens or sets `__none__`. |
| `UNSUPPORTED_ASPECT_RATIO` | `unsupported_aspect_ratio` | `false` | Aspect not in `supportedAspectRatios`. LLM chooses another. |
| `DISABLED` | `disabled` | `false` | `ai.fenchurch.enabled = false` in scope. Hard stop. |

Non-Fenchurch `RuntimeException` (NPE in provider, config mismatch) is wrapped as `PROVIDER_ERROR` with the original message. `IllegalArgumentException` (caller-side validation: empty prompt etc.) is returned to the tool layer as `ToolException` — the error path is separate from provider-side errors.

Provider error classification: the service inspects the exception message lowercase for tokens like `timeout`/`timed out` (→ TIMEOUT), `safety`/`content`/`policy` (→ CONTENT_POLICY), `cancel` (→ CANCELLED). Weaker than a typed provider SDK mapping — but langchain4j does not provide a consistent error taxonomy for image models, so this heuristic is the pragmatic cut.

---

## 13. Engine Manual & Discovery

`_vance/manuals/image-generation.md` is the authoritative Engine Manual:

- Tool contract with examples for all four tools.
- Style layer explanation: when `image_style_set` with default scope `session`, when broader.
- Aspect ratio cheatsheet (use case → ratio).
- Latency expectations (fast 3-10 s, quality 15 s - 5 min).
- Anti-patterns: style tokens in prompt AND layer, aspect ratio in prompt text, loop generation for "better" image, PII/brands in prompts.
- Error mapping with user-facing reactions.

YAML frontmatter `triggers:` contains German and English keywords (Bild erzeugen, generate image, illustration, draw, Logo, …) — the [Discovery Catalog](/docs/how-do-i) finds the manual via `how_do_i('Bild erzeugen')` without special wiring.

**Hooks in Engine Prompts** that point to `manual_read('image-generation')`:

- `arthur-prompt.md` — dedicated "Generating images" block between "Saving files" and "Inbox vs. chat".
- `eddie-prompt.md` — German "Bilder generieren" block at the same point.
- `ford-prompt.md` — entry in the existing `embed-*` list, with explicit note "different problem from `embed-images`".

Marvin Worker Prompts do **not** get the hook — Marvin spawns Workers via Recipes; the Recipes (e.g., `creative_writer.yaml` or similar) decide themselves whether the Worker LLM should access the manual. Generic Worker system remains lean.

---

## 14. What Fenchurch Does NOT Do (v1)

Explicitly excluded from scope to clarify expectations:

- **`image_edit(path, prompt, mask?)`** — Inpainting / Masking. Separate tool later; `ModelCapability.IMAGE_EDIT` will then be added, the `AiImageModelProvider` interface will get a second method. No anticipation in v1 code.
- **`image_variation(path, prompt)`** — Reference image conditioning. Same extension pattern.
- **`n_images > 1`** per tool call. Bulk generation runs via Marvin Plans (one WORKER child per image, parallelized across Lanes).
- **Self-hosted Image Providers** (Stable Diffusion via vLLM/ComfyUI/Automatic1111). Provider interface is open for extension, no provider in v1.
- **LLM Prompt Refinement Pass** between worker prompt and image provider. Setting `ai.fenchurch.refine_prompts` is a reserved placeholder.
- **History Mining for Style.** Style layer is explicit — user or LLM (via tool) sets it. No automatic extraction from last turns.
- **Style Presets** (`logo`, `book-cover`, `diagram` as named bundles). v1 only free text.
- **Embedding Models in `ai-models.yaml`** with `kind: embedding`. Embedding remains external for now; a potential refactor is a separate story.
- **Central `ProgressTickerService`** for Long-Running Operations. Fenchurch uses inline heartbeats; refactor once a second consumer (codegen long-run, workflow external wait) wants to share the pattern.
- **Per-Account Quota Buckets.** v1 counts tenant-wide; per-account math comes with the general quota refactor.
- **Hard-Cap on simultaneous Fenchurch calls per Pod.** Lane lock per Process serializes sufficiently for v1; a pod-wide semaphore with setting `ai.fenchurch.max_concurrent_per_pod` is possible as a later extension.

---

## 15. Status & Phased Rollout

| Phase | Result | Status |
|-------|----------|--------|
| **F1** | Provider Abstraction: `AiImageModelProvider`, `AiImageService`, `AiImageConfig`, `ImageDestinationStream` + `DocumentImageDestinationStream`, `DocumentService.createOrReplaceBinary`, `ModelCatalog` extension (`kind: image`, `ImageModelInfo`, `lookupImage` / `listAllImages`) | completed |
| **F2** | Concrete Providers: `OpenAiImageProvider` + `GeminiImageProvider` (langchain4j `OpenAiImageModel` / `GoogleAiGeminiImageModel`) | completed |
| **F3** | Service Layer: `FenchurchStyleService`, `ImageCallRecord` + Repository + `ImageCallTracker`, `FenchurchService`, Recipe `image-title.yaml`, Tools `image_generate` / `image_style_set` / `image_style_get` / `image_style_prompt` | completed |
| **F4** | UX & Discovery: Setting Forms `fenchurch.yaml` + `fenchurch-style.yaml`, Engine Manual `image-generation.md`, Hooks in Arthur/Eddie/Ford Prompts, Engine Catalog `engines.md` clarified | completed |
| **F5** | Spec (this doc), opt-in E2E test in `qa/ai-test/` against real provider API | Spec completed; E2E open (requires API key setup) |
| **F6** *(v1.1+)* | Bulk optimizations, per-account quota buckets, central `ProgressTickerService`, optional self-hosted provider | open |

**Tests:** 112 Unit tests green; `BundledSettingFormsTest` validates the two forms; `ModelCatalogTest` pins the bundled image models (`gpt-image-1`, `gemini-2.5-flash-image`, `imagen-3.0-generate-002`).

---

## 16. Design Decisions (Clarified)

Recorded for future spec readers:

- **Tool, not Engine** — Single-shot nature does not justify a ThinkProcess lifecycle. Pattern like Discovery / Follow-Up / Fook.
- **Sync, not async** — Vision feedback loops and multi-step pipelines (image → caption) need the image in the same turn. Async would break the sequence; quality latency is made visible via heartbeats.
- **Aliases `default:image` + `default:image-high`** — consistent with `default:fast` / `default:analyze` / `default:deep`. Quality axis exclusively via alias, no additional tool parameter (avoids orthogonal configuration axes that the LLM might combine incorrectly).
- **Concatenative Style Cascade** — Style builds additively, therefore different from the standard setting cascade. The `__none__` sentinel is the escape hatch.
- **Default Scope `session` for `image_style_set`** — safest default, no spillover. Broader scopes via permission check of the `SettingService` layer.
- **Title Generation via LightLlm, not Engine Worker** — Recipe `image-title` is `internal: true`, costs a small extra call (~1-2 s, negligible relative to the image call). Toggle via `ai.fenchurch.auto_title_from_prompt`.
- **Quota: dedicated `ImageCallTracker`, not generic `AiCallTracker`** — Image calls are per-image, not per-token. Generic tracker is a separate refactor story.
- **`kind: chat | image` Discriminator in `ai-models.yaml`** — disjoint lookups, no pollution of the chat model picker by image entries.
- **`ImageDestinationStream` as write target abstraction** — Providers know no Document model. On `close()`, everything commits in a single `DocumentService.createOrReplaceBinary` call.
- **Engine Hook only in user-facing Engines (Arthur, Eddie, Ford)** — Worker Recipes link manuals themselves via `manualPaths`, no mandatory hook in the generic Marvin Worker system.
{% endraw %}
