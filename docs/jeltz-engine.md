---
title: "Vance — Jeltz Think Engine"
parent: Documentation
permalink: /docs/jeltz-engine
---

<!-- AUTO-GENERATED from specification/public/en/jeltz-engine.md — do not edit here. -->

---
# Vance — Jeltz Think Engine

> **Jeltz** is the structured single-shot engine of the Vance engine set — the Vogon Constructor Captain who does nothing without a form. It takes a question and a JSON schema, calls an LLM, validates the response against the schema, and returns the validated JSON as a result. In case of schema violations, it retries up to a configurable upper limit; otherwise, it returns a structured error.
>
> See also: [ford-engine](/docs/ford-engine) (single-LLM archetype), [marvin-engine](/docs/marvin-engine) (currently uses a prompt-based variant of the pattern), [think-engines](/docs/think-engines) (registry, lifecycle), [recipes](/docs/recipes)

---

## 1. Purpose

Jeltz answers a **single** question with a **schema-validated** JSON object. One spawn = one question = one result, then terminal `done`. This covers a use case that neither Ford nor Marvin currently handle cleanly:

- **Caller needs machine-readable structure**: a tool or an orchestrator engine wants to extract a list, a record, or a decision object from an LLM response — without free-text parsing.
- **Caller provides the schema at runtime**: the target format is not Recipe-fixed but determined by the specific call context (e.g., "create 5 chapters" → schema with `chapters[]`, "extract user action" → schema with `userId/action/timestamp`).

Marvin's `marvin-worker` solves a related case (structured worker response within a task tree), but with a **fixed** schema in the system prompt and without native provider response format usage. Jeltz is the generalization: dynamic schema + native structured-output path + strict validator loop.

---

## 2. What Jeltz CANNOT do (by design)

- **No chat conversation.** No multi-turn dialogue with the user. Result is returned, Process is `done`. For dialogue, there is Ford/Arthur.
- **No orchestration.** Jeltz does not start sub-processes or build a task tree.
- **No free tool loop.** The default is "no tool" because the goal is structured synthesis, not research. Recipes can activate tools (e.g., `web_search` for "summarize top N search results as JSON"), but this is the exception, not the default.
- **No user interaction.** No Inbox item, no `awaiting_user_input`. Jeltz is auto-terminal — either a schema-compliant result or a schema error.

---

## 3. Caller Contract

### 3.1. Spawn Params

The caller spawns Jeltz via `process_create` / `process_create_delegate` with Recipe `jeltz`. The operational inputs come as **Process Params**:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `prompt` | String | yes | The user-facing question / instruction. Appended as the sole `UserChatInput` to the LLM call. |
| `schema` | Object | yes | JSON Schema (Draft 2020-12 Subset, see §6) of the expected response structure. Top-level must be an object schema. |
| `maxAttempts` | Integer | no (Default 3) | Maximum number of LLM calls, including correction retries. |
| `model` | String | no | Model alias override (e.g., `default:fast`). Otherwise, Recipe default. |

Initial steer is **empty** — Jeltz pulls everything from `context.params()`. An initial `UserChatInput` is synthesized by the engine code (from `prompt`) so that the LLM conversation looks natural (System + User + Assistant).

### 3.2. Result Format

Jeltz writes the final result as a **single `ChatMessage.assistant`** with a structured body. The body is always a JSON object with the following wrapper:

```json
{
  "success": true,
  "attempts": 2,
  "data": { /* schema-compliant payload, determined by caller's schema */ }
}
```

In case of an error:

```json
{
  "success": false,
  "attempts": 3,
  "error": "schema_violation" | "llm_error" | "max_attempts_exceeded",
  "message": "Required field 'timestamp' missing in details object",
  "lastInvalid": { /* last, schema-violating LLM response */ }
}
```

`success` and `attempts` are mandatory fields in the wrapper. `data` only on success, `error`/`message`/`lastInvalid` only on failure. The wrapper is **outside** the caller's schema — the caller's schema only describes the content of `data`.

### 3.3. How the Caller Collects the Result

Since Jeltz has `asyncSteer = false`, the caller (another engine via `process_create_delegate`) can read the result wrapper directly from the steer reply — the tool result contains the `newMessages` of the sub-process. For purely client-side calls (e.g., a future `jeltz_query` tool that spawns a sub-process), the tool handler reads the last chat message of the process after the `done` status transition.

---

## 4. What Jeltz Can Do

A Lane turn does exactly this:

1. `context.drainPending()` — discards everything except the first synthetic `UserChatInput` (any further inputs after spawn are programming errors → warning + discarded).
2. Read `prompt` + `schema` from `context.params()`. Fail-fast if missing.
3. Compile schema: `JsonSchemaLight.compile(schema)` (validator) and `Lc4jSchema.toObjectSchema(schema)` (langchain4j tree).
4. Render system prompt from Recipe (Pebble template, with `&#123;{ schema_json }}` available as a variable for inline examples if desired).
5. Validator loop, max `maxAttempts` iterations:
   1. LLM call with `ResponseFormat = JsonSchema(<langchain4j-tree>)` if the provider supports it; otherwise, fallback to prompt forcing (schema in system prompt + plain text mode).
   2. Parse response as JSON.
   3. Validate against `JsonSchemaLight`.
   4. On success → Result wrapper with `success: true, attempts: N, data: <parsed>` → Chat-append → `closeProcess(DONE)` → return.
   5. On error → Append correction message as `system` to conversation (with specific validator errors), continue.
6. If the loop completes without success → Result wrapper with `success: false, error: "max_attempts_exceeded"` → Chat-append → `closeProcess(DONE)`.

Streaming: during LLM calls, token chunks are published via `context.events().publish(CHAT_MESSAGE_STREAM_CHUNK, ...)` — primarily for debugging visibility, as the caller is only interested in the final result anyway.

---

## 5. Lifecycle Behavior

| Method | Behavior |
|--------|----------|
| `start(process, ctx)` | Validates `params.prompt` and `params.schema` (mandatory, form). On errors: write result wrapper with `error: "invalid_params"`, `closeProcess(DONE)`. On OK: executes the validator loop directly and closes with `closeProcess(DONE)` at the end. |
| `resume(process, ctx)` | If the process is already closed: no-op. Otherwise: treated like `start` — the loop is idempotent against re-entry because it only needs the original params. |
| `suspend(process, ctx)` | No cleanup. Chat history persistent. Status → `SUSPENDED`. |
| `steer(process, ctx, msg)` | External `SteerMessage` after spawn is a programming error → warning, discarded. Jeltz is not steerable. |
| `stop(process, ctx)` | `closeProcess(STOPPED)`. Write result wrapper with `error: "stopped"` if no final result is available yet. |

Actual status flow: `INIT` → `RUNNING` → `CLOSED` (with `CloseReason.DONE` in normal cases, `STOPPED` on `stop()`). Jeltz **always** reaches the terminal `CLOSED` status — either with a success or error wrapper in the final Assistant message. Unlike Ford/Arthur, which never close.

`asyncSteer = false` — the caller waits synchronously and receives the result as `newMessages`.

---

## 6. Schema Format

**Wire Format:** JSON Schema (Draft 2020-12 Subset). Industry standard, schemas provided by the caller are directly compatible with external tools (OpenAPI schemas, langchain4j, OpenAI Structured Outputs, Anthropic Tool Schemas).

**Supported Constructs (aligns with `Lc4jSchema`/`JsonSchemaLight`):**

- Primitives: `string`, `integer`, `number`, `boolean`
- Containers: `object` (with `properties` + `required`), `array` (with `items`)
- Constraints: `description`, `enum` (for string enums), `pattern` (regex), `format` (e.g., `date-time` — validator hint, not a hard gate)
- Arbitrarily deep nesting

**Deliberately not in v1 scope:**

- `oneOf` / `anyOf` / `allOf` — can be added later, requires dedicated validator logic in `JsonSchemaLight`.
- `$ref` / `$defs` — avoids recursive schemas. Caller must send flat schemas.
- Numeric constraints (`minimum`, `maximum`, `multipleOf`). If needed: via `description` + prompt.

Schema validation happens at spawn (fail-fast) and with every LLM reply. Compile errors in the schema are reported in the result wrapper as `error: "invalid_schema"` with specific validator output.

### 6.1. Prompt Forcing in v1, Native ResponseFormat as v2

**v1 (initial):** Jeltz runs in prompt-forcing mode — the schema is placed as formatted JSON in the system prompt, along with the instruction "respond exclusively with JSON without Markdown fences". The validator loop catches deviations. Advantage: works identically across all providers, no capability branch, same mechanism as `marvin-worker` today. Disadvantage: a schema violation costs another LLM roundtrip.

**v2 (planned):** native `ResponseFormat = JsonSchema(...)` support for providers that can do it (OpenAI: `response_format` field; Anthropic: via tool schema). The provider then **guarantees** schema-compliant JSON — the validator loop remains as a safety net. Detection via the `ai-models.yaml` capability list (field `capabilities.structured_output`).

The v1 → v2 transition is additive: providers with `structured_output: true` take the native path, all others remain in prompt-forcing mode. The validator loop remains unchanged in both variants.

---

## 7. Recipe Convention

Recipe `jeltz` lives under `vance-brain/src/main/resources/vance-defaults/recipes/jeltz.yaml`:

```yaml
description: |
  Single-shot structured-query engine. Caller provides a prompt
  and a JSON schema; Jeltz returns one schema-validated JSON
  object as result.
engine: jeltz
params:
  model: default:fast
  maxAttempts: 3
  validation: false   # Jeltz brings its own validator, no generic one
promptPrefix: |
  You are Jeltz. You answer one question with one JSON object
  that conforms to the schema below.

  ## Schema

  &#123;{ schema_json | raw }}

  ## Rules

  - Output a single JSON object that matches the schema exactly.
  - No commentary, no markdown fences, no prose around the JSON.
  - All required fields must be present and well-typed.
  - String fields with a `pattern` must match the regex.
  - String fields with `enum` must use one of the listed values.
  - If you cannot answer with valid data, return a JSON object
    that is still schema-conformant (e.g. empty arrays, the most
    appropriate enum value) rather than commentary.
tags:
  - structured
  - engine-default
```

Pebble variables available in the render context: `schema_json` (formatted JSON schema), `prompt`, as well as the standard variables from `recipes.md` §5 (`tier`, `model`, `provider`, `mode`, …).

Override cascade works as usual (Project → `_tenant` Tenant → Bundled). Tenants can increase `maxAttempts` or provide their own `promptPrefix` variants without touching the engine code.

---

## 8. Use Cases

**As a Sub-Worker from Engine:** Arthur, Marvin, Vogon, Zaphod can spawn Jeltz when a workflow step requires a structured intermediate response. Example: Vogon phase "extract requirements" spawns Jeltz with a `requirements[]` schema; the result is mapped to the next phase input.

**As a Tool Backend:** a future built-in tool `structured_query(prompt, schema)` can internally spawn a Jeltz sub-process and return the result wrapper's `data` field. This provides a clean bridge to structured outputs for free LLM loops (Ford, Arthur) without exposing engine selection to the user.

**As a Top-Level Session:** technically possible (Session.create with Recipe `jeltz`), but practically without added value — the user experience of a single-shot JSON engine is unusable in chat. Not actively supported, but also not strictly blocked.

---

## 9. What This Spec Does **Not** Solve

- **Cost-Bound for long validator loops.** Default `maxAttempts: 3` is a heuristic. Quota consumption per Jeltz call should be factored into LLM resource management (see `llm-resource-management.md`).
- **Streaming API for Caller.** The caller receives the result as a whole — no partial schema result during the loop. Can be added later if UI demands it.
- **Multiple schemas in one call (union-style).** If needed: caller spawns multiple Jeltz sub-processes in parallel, or formulates a wrapper schema with an `outcome` discriminator.
- **Schema output caching.** Identical schema + identical prompt could be cached (hash-based). Not in v1 scope.

---

## 10. Relation to Other Specs

- [ford-engine](/docs/ford-engine) — structurally related (single-LLM engine, no orchestration), but Ford is chat-oriented and free-text. Jeltz does not replace Ford.
- [marvin-engine](/docs/marvin-engine) — `marvin-worker` recipe is currently a prompt-only variant of the Jeltz pattern. In the medium term, Marvin's WORKER node could run Jeltz-based (with Marvin's outcome schema as the caller schema).
- [structured-engine-output](/docs/structured-engine-output) — `respond` tool is orthogonal: it governs the *end* of a chat turn. Jeltz has no `respond` (no chat).
- [recipes](/docs/recipes) — Recipe mechanics, Pebble templating, cascade.
- [think-engines](/docs/think-engines) — Engine registry, lifecycle, status model. Jeltz's terminal `done` transition is regular (unlike Ford/Arthur, which never reach `done`).
